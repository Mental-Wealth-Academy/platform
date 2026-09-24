'use client';

import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import HomeBento from '@/components/home-bento/HomeBento';
import WelcomePremiumGate from '@/components/welcome-premium/WelcomePremiumGate';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function DaoPage() {
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
