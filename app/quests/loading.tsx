import React from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function QuestsLoading() {
  return (
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.content} />
    </div>
  );
}
