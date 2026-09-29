'use client';

import React, { useEffect, useState } from 'react';
import SquadsHub from '@/components/squads/SquadsHub';
import ChatRoom from '@/components/chat-room/ChatRoom';
import styles from './page.module.css';

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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
    setActiveSquad(squadId);
  };

  const handleBackToSquads = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
    setActiveSquad(null);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('squad');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  return (
    <div
      className={`${styles.pageLayout} ${activeSquad ? styles.pageLayoutChatRoom : ''}`}
    >
      <main className={`${styles.content} ${activeSquad ? styles.contentChatRoom : ''}`}>
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
