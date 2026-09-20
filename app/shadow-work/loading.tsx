import React from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function CourseLoading() {
  return (
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={`${styles.content} ${styles.contentSimple}`}>
        <section className={`${styles.weeklyShell} ${styles.weeklyShellSimple}`} aria-label="Loading course">
          <div className={`${styles.leftCol} ${styles.leftColSimple}`}>
            <nav className={styles.weekNav} aria-label="Loading week">
              <div className={styles.weekNavCenter}>
                <span className={styles.weekNavKicker}>Creative Healing</span>
                <span className={styles.weekNavLabel}>Loading course</span>
              </div>
            </nav>

            <div className={styles.weekContent}>
              <div className={styles.readingCardSkeleton}>
                <div className={`${styles.readingMediaSkeleton} ${styles.skeletonBlock}`} />
                <div className={styles.readingInfo}>
                  <span className={`${styles.readingCategorySkeletonLine} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingTitleSkeletonLine} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingAuthorSkeletonLine} ${styles.skeletonBlock}`} />
                </div>
              </div>

              <div className={styles.missionsHeadingRow}>
                <span className={styles.missionsDivider} />
                <h2 className={styles.missionsHeading}>Coursework</h2>
                <span className={styles.missionsDivider} />
              </div>

              <div className={styles.weekTasksSkeleton}>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={`${styles.taskCardSkeleton} ${styles.skeletonBlock}`} />
                ))}
                <div className={`${styles.sealButtonSkeleton} ${styles.skeletonBlock}`} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
