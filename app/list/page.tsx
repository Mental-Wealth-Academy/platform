'use client';

import React, { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import ListsPanel from '@/components/blue-chat/ListsPanel';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function ListPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { play } = useSound();

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    if (!ready || !authenticated) return {};
    const token = await getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authenticated, getAccessToken, ready]);

  return (
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.content}>
        <div className={styles.container}>
          <ListsPanel
            authHeaders={authHeaders}
            isAuthenticated={ready && authenticated}
            onSound={play}
          />
        </div>
      </main>
    </div>
  );
}
