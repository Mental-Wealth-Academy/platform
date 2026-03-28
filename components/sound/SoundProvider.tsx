'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { SoundEngine, type SoundType } from '@/lib/sound-engine';
import SoundToggle from './SoundToggle';

interface SoundContextValue {
  play: (type: SoundType) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
}

export const SoundContext = createContext<SoundContextValue | null>(null);

const LS_MUTED = 'mwa-sound-muted-v2'; // v2: old key had a bug that saved "true" on mount
const LS_VOLUME = 'mwa-sound-volume';

function readMutedPref(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(LS_MUTED);
  if (saved === null) return false; // default: unmuted
  return saved === 'true';
}

function readVolumePref(): number {
  if (typeof window === 'undefined') return 0.7;
  const saved = localStorage.getItem(LS_VOLUME);
  if (saved === null) return 0.7;
  const v = parseFloat(saved);
  return isNaN(v) ? 0.7 : v;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<SoundEngine | null>(null);
  const initedRef = useRef(false);
  const pathname = usePathname();

  const [muted, setMutedRaw] = useState(readMutedPref);
  const [volume, setVolumeRaw] = useState(readVolumePref);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new SoundEngine();
    }
    return engineRef.current;
  }, []);

  // Init AudioContext — must happen inside a user activation event
  const doInit = useCallback(() => {
    if (initedRef.current) return;
    const engine = getEngine();
    if (engine.init()) {
      initedRef.current = true;
      engine.tempo = 1.0;
      engine.muted = muted;
      engine.volume = volume;
      console.log('[Sound] AudioContext ready, muted:', muted, 'volume:', volume);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getEngine, muted, volume]);

  // Global gesture listeners — capture phase fires BEFORE React handlers,
  // so AudioContext is ready by the time onClick/play() runs in the same event.
  useEffect(() => {
    const handler = () => {
      if (initedRef.current) return;
      doInit();
    };

    window.addEventListener('click', handler, true);
    window.addEventListener('keydown', handler, true);
    window.addEventListener('touchstart', handler, true);
    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('mousemove', handler, { once: true });

    return () => {
      window.removeEventListener('click', handler, true);
      window.removeEventListener('keydown', handler, true);
      window.removeEventListener('touchstart', handler, true);
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('mousemove', handler);
    };
  }, [doInit]);

  // Tempo is fixed at 1.0 — same sound everywhere

  // Sync muted/volume to engine (NOT to localStorage — that happens in setters)
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.muted = muted;
      engine.volume = volume;
    }
  }, [muted, volume]);

  const play = useCallback(
    (type: SoundType) => {
      if (muted) return;
      // If not initialized yet, attempt (works only for click/key/touch, not hover)
      if (!initedRef.current) doInit();
      const engine = engineRef.current;
      if (!engine) return;
      engine.play(type);
    },
    [muted, doInit],
  );

  // Persist ONLY on explicit user toggle — never on mount
  const setMuted = useCallback((m: boolean) => {
    setMutedRaw(m);
    localStorage.setItem(LS_MUTED, String(m));
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeRaw(v);
    localStorage.setItem(LS_VOLUME, String(v));
  }, []);

  useEffect(() => {
    return () => engineRef.current?.destroy();
  }, []);

  return (
    <SoundContext.Provider value={{ play, muted, setMuted, volume, setVolume }}>
      {children}
      <SoundToggle />
    </SoundContext.Provider>
  );
}
