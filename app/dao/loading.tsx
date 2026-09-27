import React from 'react';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import pageStyles from './page.module.css';
import bentoStyles from '@/components/home-bento/HomeBento.module.css';
import styles from './loading.module.css';

const sceneUrl = dailySceneBackgroundUrl();

export default function DaoLoading() {
  return (
    <div
      className={pageStyles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={pageStyles.scene} aria-hidden="true" />
      <main className={pageStyles.content}>
        <div className={`${bentoStyles.bentoScroll} ${bentoStyles.bentoScrollWithMorningNote}`}>
          <div className={styles.dashboardSkeleton} aria-label="Loading dashboard" role="status">
            {/* Mood selector skeleton (mobile only) */}
            <div className={styles.moodSkeleton} aria-hidden="true">
              <div className={styles.moodHeadSkeleton}>
                <div className={`${styles.skeletonPill} ${styles.skeletonShimmer}`} />
                <div className={`${styles.skeletonTag} ${styles.skeletonShimmer}`} />
              </div>
              <div className={styles.moodGridSkeleton}>
                <div className={`${styles.moodCardSkeleton} ${styles.skeletonShimmer}`} />
                <div className={`${styles.moodCardSkeleton} ${styles.skeletonShimmer}`} />
                <div className={`${styles.moodCardSkeleton} ${styles.skeletonShimmer}`} />
                <div className={`${styles.moodCardSkeleton} ${styles.skeletonShimmer}`} />
              </div>
            </div>

            {/* BlueScene card skeleton */}
            <div className={`${styles.heroSkeleton} ${styles.skeletonShimmer}`} aria-hidden="true">
              <div className={styles.heroHeadSkeleton}>
                <div className={styles.heroTitleSkeleton} />
                <div className={styles.heroTabsSkeleton} />
              </div>
            </div>

            {/* Sidebar skeleton (desktop only) */}
            <div className={styles.sidebarSkeleton} aria-hidden="true">
              <div className={`${styles.sidebarCardSkeleton} ${styles.skeletonShimmer}`} />
              <div className={`${styles.sidebarCardSkeletonLarge} ${styles.skeletonShimmer}`} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
