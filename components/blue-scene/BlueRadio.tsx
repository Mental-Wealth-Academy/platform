'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CtaButton from '@/components/shared/CtaButton';
import manifest from '@/lib/blue-radio-manifest.json';
import styles from './BlueScene.module.css';

const BlueVrmStage = dynamic(() => import('./BlueVrmStage'), { ssr: false });

type Playback = 'connecting' | 'live' | 'blocked';
type AvatarState = 'loading' | 'ready' | 'fallback';

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

export default function BlueRadio({ gardenBackground }: { gardenBackground: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [playback, setPlayback] = useState<Playback>('connecting');
  const [muted, setMuted] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('loading');
  const [segmentIndex, setSegmentIndex] = useState(() => livePosition().index);

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
    audio.volume = Math.min(1, Math.max(0, segment.playbackGain ?? 1));
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
  }, [syncToLive]);

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
    const audio = audioRef.current;
    if (!audio) return;
    syncToLive(audio.muted).catch(() => setPlayback('blocked'));
  }, [syncToLive]);

  const handleError = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) syncToLive(audio.muted).catch(() => setPlayback('blocked'));
    }, 4000);
  }, [syncToLive]);

  // Coming back to the tab rejoins the broadcast at its current moment.
  useEffect(() => {
    const onVisible = () => {
      const audio = audioRef.current;
      if (document.hidden || !audio || audio.paused === false) return;
      if (playback === 'live') {
        syncToLive(audio.muted).catch(() => setPlayback('blocked'));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [playback, syncToLive]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
    void ensureAudioAnalyser();
  }, [ensureAudioAnalyser]);

  const tuneIn = useCallback(() => {
    syncToLive(false).catch(() => setPlayback('blocked'));
  }, [syncToLive]);

  const segment = SEGMENTS[segmentIndex];
  const onAir = playback === 'live';
  const handleAvatarReady = useCallback(() => setAvatarState('ready'), []);
  const handleAvatarError = useCallback(() => setAvatarState('fallback'), []);

  return (
    <div className={styles.radioStage} style={{ backgroundImage: `url(${gardenBackground})` }}>
      <div className={styles.radioBlueWrap}>
        <Image
          src="/blue/blue-home.png"
          alt="Blue, broadcasting live"
          width={742}
          height={705}
          priority
          className={`${styles.radioBlue} ${avatarState === 'ready' ? styles.radioBlueHidden : ''}`}
        />
        {avatarState !== 'fallback' && (
          <BlueVrmStage
            active={onAir}
            analyserRef={analyserRef}
            audioRef={audioRef}
            onError={handleAvatarError}
            onReady={handleAvatarReady}
          />
        )}
      </div>

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
          <span className={styles.radioSegmentTitle}>{segment.title}</span>
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
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </span>
        )}
      </div>

      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
        hidden
      />
    </div>
  );
}
