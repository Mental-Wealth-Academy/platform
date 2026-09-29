'use client';

import React, { useEffect, useState, type CSSProperties } from 'react';
import SquadsHub from '@/components/squads/SquadsHub';
import ChatRoom from '@/components/chat-room/ChatRoom';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function ChatPage() {
  const [activeSquad, setActiveSquad] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const squadParam = params.get('squad');
    if (squadParam) {
      setActiveSquad(squadParam);
    }
  }, []);

  const handleSelectSquad = (squadId: string) => {
    setActiveSquad(squadId);
  };

  const handleBackToSquads = () => {
    setActiveSquad(null);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('squad');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  return (
    <div
      className={styles.pageLayout}
      style={{ '--chat-scene': `url(${sceneUrl})` } as CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.content}>
        {activeSquad ? (
          <ChatRoom
            fullPage
            onBack={handleBackToSquads}
            title={activeSquad === 'global' ? 'Global Community' : 'Squad Room'}
          />
        ) : (
          <SquadsHub onSelectSquad={handleSelectSquad} />
        )}
      </main>
    </div>
  );
}
