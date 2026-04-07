'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChaoBridge, GameSave } from '@/lib/digipet/types';
import styles from './Digipet.module.css';

/** Default blank save for first-time players */
const DEFAULT_SAVE: GameSave = {
  version: 1,
  chao: [],
  eggs: [],
  inventory: { food: {}, items: {} },
  purchasedColors: [],
  gardenItems: [],
  totalPlayTime: 0,
  lastSaveTime: Date.now(),
  settings: { musicEnabled: true, sfxEnabled: true },
};

export default function DigipetGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        // --- Build the ChaoBridge that calls MWA API routes ---
        const bridge: ChaoBridge = {
          async getShards(): Promise<number> {
            const res = await fetch('/api/me');
            if (!res.ok) return 0;
            const json = await res.json();
            return json.user?.shardCount ?? 0;
          },

          async spendShards(amount: number, reason: string) {
            const res = await fetch('/api/digipet/spend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount, reason }),
            });
            const json = await res.json();
            if (res.ok && json.ok) {
              window.dispatchEvent(new Event('shardsUpdated'));
              return { ok: true, newBalance: json.newBalance as number };
            }
            return { ok: false, newBalance: 0 };
          },

          async earnShards(amount: number, reason: string) {
            const res = await fetch('/api/digipet/reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount, reason }),
            });
            const json = await res.json();
            if (res.ok && json.ok) {
              window.dispatchEvent(new Event('shardsUpdated'));
              return { ok: true, newBalance: json.newBalance as number };
            }
            return { ok: false, newBalance: 0 };
          },

          async saveGame(data: string) {
            await fetch('/api/digipet/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data }),
            });
          },

          async loadGame(): Promise<string | null> {
            const res = await fetch('/api/digipet/load');
            if (!res.ok) return null;
            const json = await res.json();
            return json.data ?? null;
          },
        };

        // --- Load initial data in parallel ---
        const [shards, savedDataStr] = await Promise.all([
          bridge.getShards(),
          bridge.loadGame(),
        ]);

        let initialSave: GameSave;
        if (savedDataStr) {
          try {
            initialSave = JSON.parse(savedDataStr) as GameSave;
          } catch {
            initialSave = { ...DEFAULT_SAVE };
          }
        } else {
          initialSave = { ...DEFAULT_SAVE };
        }

        if (destroyed) return;

        // --- Dynamically import Phaser + game factory (SSR-safe) ---
        const { createDigipetGame } = await import('@/lib/digipet/game');

        if (destroyed || !containerRef.current) return;

        const game = createDigipetGame(containerRef.current, bridge, initialSave, shards);
        gameRef.current = game;
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize Chao Garden:', err);
        if (!destroyed) setError('Failed to load Chao Garden');
      }
    }

    init();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading Chao Garden...</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.container}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}
