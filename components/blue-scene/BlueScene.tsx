'use client';

import React, { useState } from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import LivestreamFeed from './LivestreamFeed';
import styles from './BlueScene.module.css';

const bgUrl = dailySceneBackgroundUrl();

export default function BlueScene() {
  const [headerControlsTarget, setHeaderControlsTarget] = useState<HTMLDivElement | null>(null);

  return (
    <section className={styles.scene} aria-label="Live session feed">
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeading}>
          <span className={styles.sceneTitleJa} lang="ja">知識</span>
          <span className={styles.sceneTitle}>Radio</span>
        </div>
        <div ref={setHeaderControlsTarget} className={styles.sceneHeaderControls} />
      </div>

      <LivestreamFeed gardenBackground={bgUrl} headerControlsTarget={headerControlsTarget} />
    </section>
  );
}
