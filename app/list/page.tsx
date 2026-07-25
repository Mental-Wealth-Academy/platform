'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';

import { usePrivy } from '@privy-io/react-auth';
import ListsPanel from '@/components/blue-chat/ListsPanel';
import { LandingScene } from '@/components/landing/LandingScene';
import { useSound } from '@/hooks/useSound';
import landing from '@/components/landing/LandingPage.module.css';
import styles from './page.module.css';

export default function ListPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { play } = useSound();

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    if (!ready || !authenticated) return {};
    const token = await getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authenticated, getAccessToken, ready]);

  return (
    <main className={styles.page}>
      {/* Background — mirrors the landing hero: WebGL scene, starfield, earth. */}
      <div className={styles.background} aria-hidden="true">
        <LandingScene />
        <Image
          src="/images/landing-starfield.jpg"
          alt=""
          fill
          sizes="100vw"
          className={landing.heroSpace}
          priority
        />
        <Image
          src="/images/landing-earth.png"
          alt=""
          width={1024}
          height={1024}
          className={landing.heroEarth}
          priority
        />
      </div>

      <div className={styles.layout}>
        {/* Blue character behind the lists — same image as landing hero */}
        <Image
          src="/images/blueastro.png"
          alt=""
          width={400}
          height={400}
          className={styles.blueCharacter}
          priority
          aria-hidden="true"
        />

        {/* Lists in front */}
        <div className={styles.listsWrapper}>
          <ListsPanel
            authHeaders={authHeaders}
            isAuthenticated={ready && authenticated}
            onSound={play}
            showHeader={false}
          />
        </div>
      </div>
    </main>
  );
}
