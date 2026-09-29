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

  const [companionMuted, setCompanionMuted] = useState(false);
  const [companionConnected, setCompanionConnected] = useState(false);
  const toggleCompanionMuteRef = useRef<(() => void) | null>(null);

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

  const handleRegisterCompanionMute = useCallback((toggleFn: () => void, muted: boolean, isConnected: boolean) => {
    toggleCompanionMuteRef.current = toggleFn;
    setCompanionMuted(muted);
    setCompanionConnected(isConnected);
  }, []);

  const handleCompanionMuteChange = useCallback((muted: boolean) => {
    setCompanionMuted(muted);
  }, []);

  const handleToggleCompanionMute = useCallback(() => {
    toggleCompanionMuteRef.current?.();
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
          {mode === 'radio' ? (
            <button
              type="button"
              className={`${styles.sceneMuteIconButton} ${!radioMuted ? styles.sceneMuteIconButtonActive : ''}`}
              onClick={handleToggleMute}
              aria-pressed={!radioMuted}
              aria-label={radioMuted ? 'Unmute radio' : 'Mute radio'}
              title={radioMuted ? 'Muted — tap to unmute radio' : 'Live — tap to mute radio'}
            >
              {!radioMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              )}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.sceneMuteIconButton} ${!companionMuted && companionConnected ? styles.sceneMuteIconButtonActive : ''}`}
              onClick={handleToggleCompanionMute}
              disabled={!companionConnected}
              aria-pressed={!companionMuted}
              aria-label={companionMuted ? 'Unmute microphone' : 'Mute microphone'}
              title={
                !companionConnected
                  ? 'Connect to use microphone'
                  : companionMuted
                    ? 'Microphone muted — tap to unmute'
                    : 'Microphone active — tap to mute'
              }
            >
              {!companionMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
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
        onCompanionMuteChange={handleCompanionMuteChange}
        onRegisterCompanionMute={handleRegisterCompanionMute}
      />
    </section>
  );
}
