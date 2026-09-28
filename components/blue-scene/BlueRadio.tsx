'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import CtaButton from '@/components/shared/CtaButton';
import manifest from '@/lib/blue-radio-manifest.json';
import BlueCompanion from './BlueCompanion';
import styles from './BlueScene.module.css';

const BlueVrmStage = dynamic(() => import('./BlueVrmStage'), { ssr: false });

type Playback = 'connecting' | 'live' | 'blocked';

interface RadioSegment {
  id: string;
  title: string;
  file: string;
  playbackGain?: number;
  seconds: number;
}

const SEGMENTS = manifest.segments as RadioSegment[];
const TOTAL_SECONDS = manifest.totalSeconds as number;

// The broadcast position is derived from the wall clock, so every listener
// is on the same moment of the loop — tune in, no pause, no seek.
function livePosition(): { index: number; offset: number } {
  const pos = (Date.now() / 1000) % TOTAL_SECONDS;
  let acc = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (pos < acc + SEGMENTS[i].seconds) {
      return { index: i, offset: pos - acc };
    }
    acc += SEGMENTS[i].seconds;
  }
  return { index: 0, offset: 0 };
}

export default function BlueRadio({
  gardenBackground,
  mode = 'radio',
}: {
  gardenBackground: string;
  mode?: 'radio' | 'companion';
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const companionVolumeRef = useRef<number>(0);
  const [companionMode, setCompanionMode] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [playback, setPlayback] = useState<Playback>('connecting');
  const [muted, setMuted] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(() => livePosition().index);
  const isChatOpenRef = useRef(false);

  useEffect(() => {
    const handleBlueChatToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      isChatOpenRef.current = customEvent.detail;
      const audio = audioRef.current;
      if (!audio) return;
      
      const { index } = livePosition();
      const segment = SEGMENTS[index];
      const baseVolume = Math.min(1, Math.max(0, segment.playbackGain ?? 1));
      
      audio.volume = isChatOpenRef.current ? baseVolume * 0.15 : baseVolume;
    };
    window.addEventListener('blueChatToggle', handleBlueChatToggle);
    return () => window.removeEventListener('blueChatToggle', handleBlueChatToggle);
  }, []);

  const ensureAudioAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || analyserRef.current || typeof window === 'undefined') return;

    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;

    if (context.state !== 'running') {
      try {
        await context.resume();
      } catch {
        return;
      }
    }
    if (context.state !== 'running' || analyserRef.current) return;

    try {
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      source.connect(analyser);
      analyser.connect(context.destination);
      audioSourceRef.current = source;
      analyserRef.current = analyser;
    } catch {
      // Playback remains usable if this browser cannot expose a media source.
    }
  }, []);

  const syncToLive = useCallback(async (wantMuted: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    const { index, offset } = livePosition();
    const segment = SEGMENTS[index];
    setSegmentIndex(index);

    audio.muted = wantMuted;
    const baseVolume = Math.min(1, Math.max(0, segment.playbackGain ?? 1));
    audio.volume = isChatOpenRef.current ? baseVolume * 0.15 : baseVolume;
    if (!audio.src.endsWith(segment.file)) {
      audio.src = segment.file;
    }
    try {
      audio.currentTime = Math.min(offset, Math.max(0, segment.seconds - 0.4));
    } catch {
      // Metadata not ready yet; onLoadedMetadata below re-seeks.
    }
    await audio.play();
    void ensureAudioAnalyser();
    setMuted(wantMuted);
    setPlayback('live');
  }, [ensureAudioAnalyser]);

  // Tuning in on arrival, per the app-wide auto-narration default. Browsers
  // that refuse sound without a gesture get a muted broadcast plus a loud
  // unmute button; ones that refuse even that get the tune-in overlay.
  useEffect(() => {
    if (mode === 'companion') {
      audioRef.current?.pause();
      return;
    }
    const audio = audioRef.current;
    let cancelled = false;
    (async () => {
      try {
        await syncToLive(false);
      } catch {
        try {
          if (!cancelled) await syncToLive(true);
        } catch {
          if (!cancelled) setPlayback('blocked');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      audio?.pause();
    };
  }, [mode, syncToLive]);

  useEffect(() => {
    return () => {
      audioSourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  // Re-seek once the segment's metadata is in, so the first audible moment
  // matches the broadcast clock instead of the segment's opening line.
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const { index, offset } = livePosition();
    if (audio.src.endsWith(SEGMENTS[index].file)) {
      audio.currentTime = Math.min(offset, Math.max(0, SEGMENTS[index].seconds - 0.4));
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (mode === 'companion') return;
    const audio = audioRef.current;
    if (!audio) return;
    syncToLive(audio.muted).catch(() => setPlayback('blocked'));
  }, [mode, syncToLive]);

  const handleError = useCallback(() => {
    if (mode === 'companion') return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) syncToLive(audio.muted).catch(() => setPlayback('blocked'));
    }, 4000);
  }, [mode, syncToLive]);

  // Coming back to the tab rejoins the broadcast at its current moment.
  useEffect(() => {
    const onVisible = () => {
      if (mode === 'companion') return;
      const audio = audioRef.current;
      if (document.hidden || !audio || audio.paused === false) return;
      if (playback === 'live') {
        syncToLive(audio.muted).catch(() => setPlayback('blocked'));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [mode, playback, syncToLive]);

  const toggleMute = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {}
    }

    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);

    if (!nextMuted) {
      if (audio.paused) {
        try {
          await audio.play();
          setPlayback('live');
        } catch {
          await syncToLive(false).catch(() => {});
        }
      }
      void ensureAudioAnalyser();
    }
  }, [ensureAudioAnalyser, syncToLive]);

  const tuneIn = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {}
    }
    try {
      await syncToLive(false);
    } catch {
      try {
        await syncToLive(true);
      } catch {
        setPlayback('blocked');
      }
    }
  }, [syncToLive]);

  // Unlock audio on first user gesture across the document if initially blocked/muted by autoplay policy
  useEffect(() => {
    const unlock = async () => {
      if (mode === 'companion') return;
      const audio = audioRef.current;
      if (!audio) return;
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch {}
      }
      if (audio.muted) {
        audio.muted = false;
        setMuted(false);
      }
      if (audio.paused) {
        try {
          await audio.play();
          setPlayback('live');
        } catch {
          syncToLive(false).catch(() => {});
        }
      }
      void ensureAudioAnalyser();
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensureAudioAnalyser, mode, syncToLive]);

  const onAir = playback === 'live';

  return (
    <div className={styles.radioStage} style={{ backgroundImage: `url(${gardenBackground})` }}>
      <div className={styles.radioBlueWrap}>
        <BlueVrmStage
          active={mode === 'companion' ? companionMode === 'speaking' : onAir}
          analyserRef={analyserRef}
          audioRef={audioRef}
          companionVolumeRef={mode === 'companion' ? companionVolumeRef : undefined}
          companionMode={mode === 'companion' ? companionMode : undefined}
        />
      </div>

      {mode === 'companion' ? (
        <BlueCompanion
          companionVolumeRef={companionVolumeRef}
          companionMode={companionMode}
          onModeChange={setCompanionMode}
        />
      ) : (
        <>
          {playback === 'blocked' && (
            <div className={styles.radioTuneIn}>
              <span className={styles.radioTuneInKicker}>Blue Radio</span>
              <p className={styles.radioTuneInText}>
                Live from the Academy, day and night.
              </p>
              <CtaButton onClick={tuneIn}>Tune in</CtaButton>
            </div>
          )}

          <div className={styles.radioFooter}>
            <span className={styles.radioLiveChip}>
              <span className={`${styles.radioLiveDot} ${onAir ? styles.radioLiveDotOn : ''}`} aria-hidden="true" />
              Live
            </span>
            <div className={styles.radioNowPlaying}>
              <span className={styles.radioShowName}>Blue Radio</span>
            </div>
            {onAir && (
              <span className={styles.radioControls}>
                {!muted && (
                  <span className={styles.radioBars} aria-hidden="true">
                    <span /><span /><span />
                  </span>
                )}
                <button
                  type="button"
                  className={`${styles.radioMuteButton} ${muted ? styles.radioMuteButtonLoud : ''}`}
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute radio' : 'Mute radio'}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
              </span>
            )}
          </div>
        </>
      )}

      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
        playsInline
        hidden
      />
    </div>
  );
}
