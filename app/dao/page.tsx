'use client';

import { useEffect } from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import HomeBento from '@/components/home-bento/HomeBento';
import WelcomePremiumGate from '@/components/welcome-premium/WelcomePremiumGate';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function DaoPage() {
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    const origBodyHeight = document.body.style.height;
    const origBodyPaddingBottom = document.body.style.paddingBottom;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    document.body.style.paddingBottom = '0px';

    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
      document.body.style.height = origBodyHeight;
      document.body.style.paddingBottom = origBodyPaddingBottom;
    };
  }, []);

  return (
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.content}>
        <HomeBento />
      </main>
      <WelcomePremiumGate />
    </div>
  );
}

