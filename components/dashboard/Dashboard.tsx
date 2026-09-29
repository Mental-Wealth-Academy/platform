'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import BlueScene from '@/components/blue-scene/BlueScene';
import MoodSelector from '@/components/mood-selector/MoodSelector';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/safe-storage';
import styles from './Dashboard.module.css';

const ChatRoom = dynamic(() => import('@/components/chat-room/ChatRoom'), { ssr: false });
const SidebarFieldNotes = dynamic(() => import('@/components/dashboard/SidebarFieldNotes'), { ssr: false });

export default function Dashboard() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [moodSelectorDismissed, setMoodSelectorDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const dismissed = getStorageItem('mwa_mood_selector_dismissed', 'session');
    if (dismissed === '1') {
      setMoodSelectorDismissed(true);
    }
  }, []);

  const handleDismissMood = () => {
    setMoodSelectorDismissed(true);
    setStorageItem('mwa_mood_selector_dismissed', '1', 'session');
  };

  const handleRestoreMood = () => {
    setMoodSelectorDismissed(false);
    removeStorageItem('mwa_mood_selector_dismissed', 'session');
  };

  return (
    <div className={styles.dashboard}>

      {/* ── BlueScene (Blue Radio / Companion) ── */}
      <div className={`${styles.blueSceneWrap} ${moodSelectorDismissed ? styles.blueSceneWrapFull : ''}`}>
        <BlueScene />
      </div>

      {/* ── Mood Selector: Underneath Companion on Mobile ── */}
      {!moodSelectorDismissed ? (
        <div className={styles.moodSelectorWrap}>
          <MoodSelector onClose={handleDismissMood} />
        </div>
      ) : (
        !isDesktop && (
          <div className={styles.restoreMoodWrap}>
            <button
              type="button"
              className={styles.restoreMoodBtn}
              onClick={handleRestoreMood}
              aria-label="Open Mood Selector"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Mood selector</span>
            </button>
          </div>
        )
      )}

      {/* ── Sidebar: Field Notes + Global Chat ── */}
      {isDesktop && (
        <aside className={styles.sidebarWrap}>
          <div className={styles.fieldNotesWrapper}>
            <SidebarFieldNotes />
          </div>
          <div className={styles.chatRoomDesktopOnly}><ChatRoom fullPage /></div>
        </aside>
      )}
    </div>
  );
}
