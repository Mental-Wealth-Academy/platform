'use client';

import { useContext } from 'react';
import { SoundContext } from '@/components/sound/SoundProvider';
import type { SoundType } from '@/lib/sound-engine';

export function useSound() {
  const ctx = useContext(SoundContext);
  // Return no-op when outside provider (SSR-safe)
  if (!ctx) {
    return {
      play: (() => {}) as (type: SoundType) => void,
      muted: true,
      setMuted: (() => {}) as (m: boolean) => void,
      volume: 0,
      setVolume: (() => {}) as (v: number) => void,
    };
  }
  return ctx;
}
