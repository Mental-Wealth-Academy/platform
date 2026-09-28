'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { type InitialMoodData } from './BlueCompanion';
import LivestreamFeed from './LivestreamFeed';
import styles from './BlueScene.module.css';

const bgUrl = dailySceneBackgroundUrl();

export default function BlueScene() {
  const [mode, setMode] = useState<'radio' | 'companion'>('companion');
  const [initialMood, setInitialMood] = useState<InitialMoodData | null>(null);

  useEffect(() => {
    const handleStartCompanion = (e: Event) => {
      const ce = e as CustomEvent<{
        id?: string;
        mood?: string;
        label: string;
        prompt: string;
        topic: string;
      }>;
      if (ce.detail) {
        setMode('companion');
        setInitialMood({
          id: ce.detail.id || ce.detail.mood || 'notsure',
          label: ce.detail.label,
          prompt: ce.detail.prompt,
          topic: ce.detail.topic,
        });

        const section = document.getElementById('blue-scene-section');
        section?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    window.addEventListener('startBlueCompanion', handleStartCompanion);
    return () => window.removeEventListener('startBlueCompanion', handleStartCompanion);
  }, []);

  const handleInitialMoodHandled = useCallback(() => {
    setInitialMood(null);
  }, []);

  return (
    <section id="blue-scene-section" className={styles.scene} aria-label="Live session feed">
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeading}>
          <span className={styles.sceneTitleJa} lang="ja">
            {mode === 'radio' ? '知識' : '対話'}
          </span>
          <span className={styles.sceneTitle}>
            {mode === 'radio' ? 'Radio' : 'Companion'}
          </span>
        </div>
        <div className={styles.sceneHeaderControls}>
          <div className={styles.sceneSwitch} role="tablist" aria-label="Mode selection">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'radio'}
              className={`${styles.sceneSwitchButton} ${
                mode === 'radio' ? styles.sceneSwitchButtonActive : ''
              }`}
              onClick={() => setMode('radio')}
            >
              Radio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'companion'}
              className={`${styles.sceneSwitchButton} ${
                mode === 'companion' ? styles.sceneSwitchButtonActive : ''
              }`}
              onClick={() => setMode('companion')}
            >
              Companion
            </button>
          </div>
        </div>
      </div>

      <LivestreamFeed
        gardenBackground={bgUrl}
        mode={mode}
        initialMood={initialMood}
        onInitialMoodHandled={handleInitialMoodHandled}
      />
    </section>
  );
}
