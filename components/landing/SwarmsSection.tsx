'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './SwarmsSection.module.css';
import PortfolioModal from './PortfolioModal';
import { useSound } from '@/hooks/useSound';

const PieChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#F6F8ED">
    <path d="M11 2.05V12h9.95c-.5 5.05-4.76 9-9.95 9-5.52 0-10-4.48-10-10 0-5.19 3.95-9.45 9-9.95zM13 2.05c4.17.46 7.49 3.78 7.95 7.95H13V2.05z" />
  </svg>
);

export const SwarmsSection = () => {
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const { play } = useSound();

  return (
    <section className={styles.swarmsSection}>
      <div className={styles.swarmsContainer}>
        {/* Title */}
        <p className={styles.swarmsEyebrow}>Benefits</p>
        <h2 className={styles.swarmsTitle}>
          Wealth, Community, & Purpose
        </h2>

        {/* Portfolio + Wallet Row */}
        <div className={styles.actionRow}>
        <button
          className={styles.portfolioButton}
          onClick={() => setPortfolioOpen(true)}
          type="button"
        >
          <span className={styles.portfolioButtonText}>Community Owned Treasury</span>
          <PieChartIcon />
        </button>

        </div>

        {/* Content Grid  */}
        <div className={styles.swarmsContentGrid}>
          {/* Left: Features */}
          <div className={styles.swarmsFeatures}>
            {/* Feature 1 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/atom-icon.svg" alt="Academic Foundation" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Community Public Goods</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                A structured course that walks you through self-reflection, behavioral science, and mental wellness — one week at a time. Each chapter builds on the last, designed by a psychologist with 12 years of research experience. No fluff, no filler. Just the material that actually moves the needle.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/refreshment-icon.svg" alt="Intellectual Refreshment" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Intellectual Refreshment</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                We re-imagined what a mental health network would look and feel like from the perspective of a game for a younger audience. Notes, journaling, and activities replace lectures. No private data collected, completely async — you move at your own pace and keep what&apos;s yours.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <Image src="/icons/debate-icon.svg" alt="Oracle Network" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Human-Centered Design</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Earn points, unlock quests, and level up through the system like an MMO. A seed community building the new territory for mental wellness — with on-chain governance, an AI co-pilot, and statistical dashboards tracking real progress. Think less app, more academy.
              </p>
            </div>
          </div>

          {/* Right: Decorative diamonds */}
          <div className={styles.swarmsDiamonds}>
            <Image
              src="https://i.imgur.com/nKONEi3.png"
              alt="Decorative diamonds"
              width={500}
              height={600}
              className={styles.diamondsImg}
            />
          </div>
        </div>
        {/* CTA */}
        <div className={styles.ctaWrapper}>
          <a href="/home" className={styles.ctaButton} onClick={() => play('click')} onMouseEnter={() => play('hover')}>
            Enter The Academy
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      <PortfolioModal isOpen={portfolioOpen} onClose={() => setPortfolioOpen(false)} />
    </section>
  );
};
