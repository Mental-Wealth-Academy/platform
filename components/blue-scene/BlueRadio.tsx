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

// In-memory cache of decoded PCM channel buffers for true speech-envelope viseme sync
const segmentPcmCache = new Map<string, { channelData: Float32Array; sampleRate: number }>();
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
}

async function loadSegmentPcm(file: string): Promise<{ channelData: Float32Array; sampleRate: number } | null> {
  if (segmentPcmCache.has(file)) {
    return segmentPcmCache.get(file)!;
  }
  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  try {
    const res = await fetch(file);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      const promise = ctx.decodeAudioData(arrayBuffer, resolve, reject);
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    });
    const data = {
      channelData: audioBuffer.getChannelData(0),
      sampleRate: audioBuffer.sampleRate,
    };
    segmentPcmCache.set(file, data);
    return data;
  } catch {
    return null;
  }
}

export default function BlueRadio({
  gardenBackground,
  mode = 'companion',
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
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segmentIndexRef = useRef(0);
  const isChatOpenRef = useRef(false);

  useEffect(() => {
    void loadSegmentPcm(SEGMENTS[0]?.file);
  }, []);

  useEffect(() => {
    const handleBlueChatToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      isChatOpenRef.current = customEvent.detail;
      const audio = audioRef.current;
      if (!audio) return;

      const segment = SEGMENTS[segmentIndexRef.current];
      const baseVolume = Math.min(1, Math.max(0, segment?.playbackGain ?? 1));

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

  // Drive avatar mouth visemes directly from audio waveform energy or speech cadence fallback
  useEffect(() => {
    if (mode === 'companion') return;
    let rafId: number;

    const updateSpeechViseme = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.muted && audio.volume > 0) {
        const currentSegment = SEGMENTS[segmentIndexRef.current];
        const pcm = currentSegment ? segmentPcmCache.get(currentSegment.file) : null;
        if (pcm && pcm.channelData) {
          const sampleIdx = Math.floor(audio.currentTime * pcm.sampleRate);
          const windowSize = 512;
          const start = Math.max(0, sampleIdx - (windowSize >> 1));
          const end = Math.min(pcm.channelData.length, start + windowSize);
          let sum = 0;
          for (let i = start; i < end; i++) {
            const s = pcm.channelData[i];
            sum += s * s;
          }
          const rms = Math.sqrt(sum / (end - start || 1));
          // Speech RMS in normalized voice tracks sits around 0.02 - 0.22; silence is < 0.012
          const level = rms > 0.012 ? Math.min(1, (rms - 0.012) * 6.5) : 0;
          companionVolumeRef.current = level;
        } else {
          // Procedural speech cadence while audio PCM is decoding
          const t = audio.currentTime;
          const phraseCycle = (Math.sin(t * 1.5) + 1) * 0.5;
          const syllable = (Math.sin(t * 12.0) + 1) * 0.5;
          const level = phraseCycle > 0.2 ? Math.min(0.85, phraseCycle * syllable * 0.9) : 0;
          companionVolumeRef.current = level;
        }
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

  const playSegment = useCallback(
    async (index: number, startTime = 0, wantMuted = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      const safeIndex = Math.max(0, Math.min(index, SEGMENTS.length - 1));
      segmentIndexRef.current = safeIndex;
      setSegmentIndex(safeIndex);

      const segment = SEGMENTS[safeIndex];
      audio.muted = wantMuted;
      const baseVolume = Math.min(1, Math.max(0, segment.playbackGain ?? 1));
      audio.volume = isChatOpenRef.current ? baseVolume * 0.15 : baseVolume;

      if (!audio.src.endsWith(segment.file)) {
        audio.src = segment.file;
      }
      try {
        audio.currentTime = startTime;
      } catch {
        // Metadata not ready yet; onLoadedMetadata below re-seeks if needed
      }

      updateMediaSession(segment);

      // Preload current and next segment PCM
      void loadSegmentPcm(segment.file);
      const nextIndex = (safeIndex + 1) % SEGMENTS.length;
      void loadSegmentPcm(SEGMENTS[nextIndex].file);

      await audio.play();
      setMuted(wantMuted);
      onMuteChange?.(wantMuted);
      setPlayback('live');
    },
    [onMuteChange, updateMediaSession],
  );

  // Tuning in on arrival: start at segment 0 from the very beginning.
  // Browsers that refuse unmuted autoplay get muted playback plus unmute button;
  // browsers that refuse even muted get the tune-in overlay.
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
        await playSegment(0, 0, false);
      } catch {
        try {
          if (!cancelled) await playSegment(0, 0, true);
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
  }, [mode, playSegment]);

  const handleLoadedMetadata = useCallback(() => {
    if (mode === 'companion') return;
  }, [mode]);

  const handleEnded = useCallback(() => {
    if (mode === 'companion') return;
    const nextIndex = (segmentIndexRef.current + 1) % SEGMENTS.length;
    const audio = audioRef.current;
    const isMuted = audio ? audio.muted : false;
    playSegment(nextIndex, 0, isMuted).catch(() => setPlayback('blocked'));
  }, [mode, playSegment]);

  const handleError = useCallback(() => {
    if (mode === 'companion') return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        playSegment(segmentIndexRef.current, audio.currentTime || 0, audio.muted).catch(() =>
          setPlayback('blocked'),
        );
      }
    }, 4000);
  }, [mode, playSegment]);

  // Returning to tab resumes playback if paused
  useEffect(() => {
    const onVisible = () => {
      if (mode === 'companion') return;
      const audio = audioRef.current;
      if (document.hidden || !audio || audio.paused === false) return;
      if (playback === 'live') {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [mode, playback]);

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
          await playSegment(segmentIndexRef.current, audio.currentTime || 0, false).catch(() => {});
        }
      }
    }
  }, [onMuteChange, playSegment]);

  useEffect(() => {
    onRegisterMute?.(toggleMute, muted);
  }, [onRegisterMute, toggleMute, muted]);

  const tuneIn = useCallback(async () => {
    try {
      await playSegment(0, 0, false);
    } catch {
      try {
        await playSegment(0, 0, true);
      } catch {
        setPlayback('blocked');
      }
    }
  }, [playSegment]);

  // Start radio handler called when user clicks the Radio tab
  const startRadio = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
    }
    setMuted(false);
    onMuteChange?.(false);

    try {
      await playSegment(0, 0, false);
    } catch {
      try {
        await playSegment(0, 0, true);
      } catch {
        setPlayback('blocked');
      }
    }
  }, [onMuteChange, playSegment]);

  useEffect(() => {
    onRegisterRadioStart?.(startRadio);
  }, [onRegisterRadioStart, startRadio]);

  // Unlock audio on first user gesture across document if initially blocked by autoplay policy
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
          playSegment(0, 0, false).catch(() => {});
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
  }, [mode, onMuteChange, playSegment]);

  const onAir = playback === 'live';

  return (
    <div className={styles.radioStage} style={{ backgroundImage: `url(${gardenBackground})` }}>
      <div className={styles.radioBlueWrap}>
        <BlueVrmStage
          active={
            mode === 'companion'
              ? companionMode === 'speaking'
              : Boolean(audioRef.current && !audioRef.current.paused)
          }
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
