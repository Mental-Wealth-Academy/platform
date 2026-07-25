'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import GuideWalkthrough from '@/components/guides/GuideWalkthrough';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from '../page.module.css';

const sceneUrl = dailySceneBackgroundUrl();

type PageProps = { params: { slug: string } };

export default function GuideWalkthroughPage({ params }: PageProps) {
  return (
    <div className={styles.layout} style={{ '--page-scene': `url(${sceneUrl})` } as CSSProperties}>
      <div className={styles.scene} aria-hidden="true" />
      <div className={styles.guideWrapper}>
        <div className={`${styles.guideLayout} ${styles.singleColumn}`}>
          <div className={styles.globalPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitleJa}>知識</span>
              <span className={styles.panelTitle}>Learn anything</span>
            </div>
            <main className={styles.page}>
              <header className={styles.header}>
                <div className={styles.titleRow}>
                  <Link
                    href={`/learn/guides/${params.slug}`}
                    className={styles.backIcon}
                    aria-label="Back to guide"
                  >
                    <ArrowLeft size={22} weight="bold" />
                  </Link>
                  <h1 className={styles.title}>Walkthrough</h1>
                </div>
              </header>
              <section className={styles.walkthroughPanel}>
                <GuideWalkthrough slug={params.slug} />
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
