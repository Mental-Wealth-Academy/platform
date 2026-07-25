'use client';

import type { CSSProperties } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import VerifierBadges from '@/components/guides/VerifierBadges';
import VerifierCredentials from '@/components/guides/VerifierCredentials';
import VerifierPanelQueue from '@/components/guides/VerifierPanelQueue';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

// Same daily scene the quest board and Blue's stage show.
const sceneUrl = dailySceneBackgroundUrl();

export default function ProfilePage() {
  return (
    <div
      className={styles.pageLayout}
      style={{ '--page-scene': `url(${sceneUrl})` } as CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <SideNavigation />
      <main className={styles.page}>
        <section className={styles.shell}>
          <VerifierBadges />
          <VerifierCredentials />
        </section>
        <section className={styles.shell}>
          <VerifierPanelQueue />
        </section>
      </main>
    </div>
  );
}
