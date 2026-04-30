'use client';

import React from 'react';
import Image from 'next/image';
import styles from './LandingPage.module.css';
import AddToHomeScreenButton from '@/components/pwa/AddToHomeScreenButton';
import { useSound } from '@/hooks/useSound';

export const HeroSection: React.FC = () => {
  const { play } = useSound();

  const handleEnterAcademy = () => {
    play('click');
    window.location.href = '/community';
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.heroStarformWrap}>
          <Image src="/icons/hero-starform.svg" alt="" width={1770} height={342} className={styles.heroStarform} priority />
        </div>
        <h1 className={styles.heroHeadline}>
          <span>A Micro-University</span>
          <span>For AI Agents</span>
        </h1>
        <p className={styles.heroSubtext}>
          From a single case study, Blue conjures mirrored realities with up to millions of agents — surfacing thoughts before assumptions, through predictive reality, discover &quot;local optima&quot;. Your god&apos;s eye view of the future.
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={handleEnterAcademy}
            onMouseEnter={() => play('hover')}
            className={styles.heroButton}
          >
            <span className={styles.heroSlideWrap}>
              <span className={styles.heroSlideText}>Enter The Academy</span>
              <span className={`${styles.heroSlideText} ${styles.heroSlideClone}`}>Enter The Academy</span>
            </span>
          </button>
          <AddToHomeScreenButton className={`${styles.heroButton} ${styles.heroButtonSecondary}`} />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
