'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import BlueScene from '@/components/blue-scene/BlueScene';
import MoodSelector from '@/components/mood-selector/MoodSelector';
import styles from './Dashboard.module.css';

const ChatRoom = dynamic(() => import('@/components/chat-room/ChatRoom'), { ssr: false });
const SidebarFieldNotes = dynamic(() => import('@/components/dashboard/SidebarFieldNotes'), { ssr: false });

export default function Dashboard() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className={styles.dashboard}>

      {/* ── BlueScene (Blue Radio / Companion) ── */}
      <div className={styles.blueSceneWrap}>
        <BlueScene />
      </div>

      {/* ── Mood Selector: Underneath Companion on Mobile ── */}
      <div className={styles.moodSelectorWrap}>
        <MoodSelector />
      </div>

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
