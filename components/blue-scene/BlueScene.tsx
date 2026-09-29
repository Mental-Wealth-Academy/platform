'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { type InitialMoodData } from './BlueCompanion';
import LivestreamFeed from './LivestreamFeed';
import styles from './BlueScene.module.css';

const bgUrl = dailySceneBackgroundUrl();

export default function BlueScene() {
  const [mode, setMode] = useState<'radio' | 'companion'>('radio');
  const [initialMood, setInitialMood] = useState<InitialMoodData | null>(null);
  const [radioMuted, setRadioMuted] = useState(false);
  const toggleRadioMuteRef = useRef<(() => void) | null>(null);

  const handleRegisterMute = useCallback((toggleFn: () => void, muted: boolean) => {
    toggleRadioMuteRef.current = toggleFn;
    setRadioMuted(muted);
  }, []);

  const handleMuteChange = useCallback((muted: boolean) => {
    setRadioMuted(muted);
  }, []);

  const handleToggleMute = useCallback(() => {
    toggleRadioMuteRef.current?.();
  }, []);

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
          {mode === 'radio' && (
            <button
              type="button"
              className={`${styles.sceneMuteIconButton} ${radioMuted ? styles.sceneMuteIconButtonMuted : ''}`}
              onClick={handleToggleMute}
              aria-label={radioMuted ? 'Unmute radio' : 'Mute radio'}
              title={radioMuted ? 'Unmute radio' : 'Mute radio'}
            >
              {radioMuted ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <LivestreamFeed
        gardenBackground={bgUrl}
        mode={mode}
        onModeChange={setMode}
        initialMood={initialMood}
        onInitialMoodHandled={handleInitialMoodHandled}
        onMuteChange={handleMuteChange}
        onRegisterMute={handleRegisterMute}
      />
    </section>
  );
}
