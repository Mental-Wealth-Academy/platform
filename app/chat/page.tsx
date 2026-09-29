'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SquadsHub from '@/components/squads/SquadsHub';
import ChatRoom from '@/components/chat-room/ChatRoom';
import styles from './page.module.css';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const squadParam = searchParams.get('squad');

  // Default to 'global' chat unless explicitly set to browse squads
  const [activeSquad, setActiveSquad] = useState<string | null>(() => {
    if (squadParam === 'browse' || squadParam === 'list') return null;
    return squadParam || 'global';
  });

  useEffect(() => {
    if (squadParam === 'browse' || squadParam === 'list') {
      setActiveSquad(null);
    } else if (squadParam) {
      setActiveSquad(squadParam);
    } else {
      setActiveSquad('global');
    }
  }, [squadParam]);

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
      url.searchParams.set('squad', 'browse');
      window.history.replaceState({}, '', url.toString());
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className={styles.pageLayout} />}>
      <ChatPageContent />
    </Suspense>
  );
}
