'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import CtaButton from '@/components/shared/CtaButton';
import manifest from '@/lib/blue-radio-manifest.json';
import BlueCompanion, { type InitialMoodData } from './BlueCompanion';
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
  onModeChange,
  initialMood,
  onInitialMoodHandled,
  onMuteChange,
  onRegisterMute,
  onRegisterRadioStart,
  onCompanionMuteChange,
  onRegisterCompanionMute,
}: {
  gardenBackground: string;
  mode?: 'radio' | 'companion';
  onModeChange?: (mode: 'radio' | 'companion') => void;
  initialMood?: InitialMoodData | null;
  onInitialMoodHandled?: () => void;
  onMuteChange?: (muted: boolean) => void;
  onRegisterMute?: (toggleFn: () => void, muted: boolean) => void;
  onRegisterRadioStart?: (startFn: () => void) => void;
  onCompanionMuteChange?: (muted: boolean) => void;
  onRegisterCompanionMute?: (toggleFn: () => void, muted: boolean, isConnected: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Update MediaSession metadata for native background playback, lock screen, and Dynamic Island controls
  const updateMediaSession = useCallback((segment: RadioSegment) => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: segment.title,
        artist: 'Blue Radio',
        album: 'Mental Wealth Academy',
        artwork: [
          { src: '/images/blue-radio-cover.png', sizes: '1024x1024', type: 'image/png' },
          { src: '/blue/blue-radio-cover.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (audio) void audio.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = audioRef.current;
        if (audio) audio.pause();
      });
    } catch {
      // mediaSession is a progressive enhancement
    }
  }, []);

  // Drive avatar mouth visemes procedurally during radio playback while tab is active
  useEffect(() => {
    if (mode === 'companion') return;
    let rafId: number;

    const updateSpeechViseme = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.muted && audio.volume > 0) {
        const t = performance.now() / 1000;
        const phraseCycle = (Math.sin(t * 0.8) + 1) * 0.5;
        const syllable = Math.sin(t * 18.0) * Math.cos(t * 7.5);
        const phoneme = Math.abs(Math.sin(t * 26.0));
        const raw = (syllable * 0.5 + 0.5) * phoneme * phraseCycle;
        const level = raw > 0.15 ? Math.min(1, (raw - 0.15) * 1.5) : 0;
        companionVolumeRef.current = level;
      } else {
        companionVolumeRef.current = 0;
      }
      rafId = requestAnimationFrame(updateSpeechViseme);
    };

    rafId = requestAnimationFrame(updateSpeechViseme);
    return () => {
      cancelAnimationFrame(rafId);
      companionVolumeRef.current = 0;
    };
  }, [mode]);

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

    updateMediaSession(segment);

    await audio.play();
    setMuted(wantMuted);
    onMuteChange?.(wantMuted);
    setPlayback('live');
  }, [onMuteChange, updateMediaSession]);

  // Tuning in on arrival, per the app-wide auto-narration default. Browsers
  // that refuse sound without a gesture get a muted broadcast plus a loud
  // unmute button; ones that refuse even that get the tune-in overlay.
  useEffect(() => {
    if (mode === 'companion') {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.muted = true;
      }
      return;
    }

    const audio = audioRef.current;
    if (audio && !audio.paused && !audio.muted) {
      return;
    }

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

  // Re-seek once the segment's metadata is in, so the first audible moment
  // matches the broadcast clock instead of the segment's opening line.
  const handleLoadedMetadata = useCallback(() => {
    if (mode === 'companion') return;
    const audio = audioRef.current;
    if (!audio) return;
    const { index, offset } = livePosition();
    if (audio.src.endsWith(SEGMENTS[index].file)) {
      audio.currentTime = Math.min(offset, Math.max(0, SEGMENTS[index].seconds - 0.4));
    }
  }, [mode]);

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

  // Coming back to the tab rejoins the broadcast at its current moment if paused
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

    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
    onMuteChange?.(nextMuted);

    if (!nextMuted) {
      if (audio.paused) {
        try {
          await audio.play();
          setPlayback('live');
        } catch {
          await syncToLive(false).catch(() => {});
        }
      }
    }
  }, [onMuteChange, syncToLive]);

  useEffect(() => {
    onRegisterMute?.(toggleMute, muted);
  }, [onRegisterMute, toggleMute, muted]);

  const tuneIn = useCallback(async () => {
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

  const startRadio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = false;
    setMuted(false);
    onMuteChange?.(false);

    try {
      await syncToLive(false);
    } catch {
      try {
        await syncToLive(true);
      } catch {
        setPlayback('blocked');
      }
    }
  }, [onMuteChange, syncToLive]);

  useEffect(() => {
    onRegisterRadioStart?.(startRadio);
  }, [onRegisterRadioStart, startRadio]);

  // Unlock audio on first user gesture across the document if initially blocked/muted by autoplay policy
  useEffect(() => {
    if (mode === 'companion') return;

    const unlock = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.muted) {
        audio.muted = false;
        setMuted(false);
        onMuteChange?.(false);
      }
      if (audio.paused) {
        try {
          await audio.play();
          setPlayback('live');
        } catch {
          syncToLive(false).catch(() => {});
        }
      }
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [mode, onMuteChange, syncToLive]);

  const onAir = playback === 'live';

  return (
    <div className={styles.radioStage} style={{ backgroundImage: `url(${gardenBackground})` }}>
      <div className={styles.radioBlueWrap}>
        <BlueVrmStage
          active={mode === 'companion' ? companionMode === 'speaking' : onAir}
          audioRef={audioRef}
          companionVolumeRef={companionVolumeRef}
          companionMode={mode === 'companion' ? companionMode : undefined}
        />
      </div>

      {mode === 'companion' ? (
        <BlueCompanion
          companionVolumeRef={companionVolumeRef}
          companionMode={companionMode}
          onModeChange={setCompanionMode}
          initialMood={initialMood}
          onInitialMoodHandled={onInitialMoodHandled}
          onMuteChange={onCompanionMuteChange}
          onRegisterMute={onRegisterCompanionMute}
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
