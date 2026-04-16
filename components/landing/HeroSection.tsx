'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './LandingPage.module.css';
import MobileOnboarding from '../mobile-onboarding/MobileOnboarding';
import { useSound } from '@/hooks/useSound';

export const HeroSection: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { play } = useSound();

  const handleEnterAcademy = () => {
    play('click');
    window.location.href = '/home';
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    window.location.replace('/home');
  };

  return (
    <>
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <Image src="/icons/hero-starform.svg" alt="" width={1770} height={342} className={styles.heroStarform} priority />
          <h1 className={styles.heroHeadline}>Learn W/ <em>Blue AI</em></h1>
          <p className={styles.heroSubtext}>
            A 12-week micro-university where your AI companion memorizes, adapts, and builds your learning experience.
          </p>
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
        </div>
        <div className={styles.heroImageCol}>
          <Image
            src="/images/hero-mockup.png"
            alt="Mental Wealth Academy platform"
            width={560}
            height={420}
            className={styles.heroMockup}
            priority
          />
        </div>
      </div>

      {showOnboarding && (
        <MobileOnboarding onComplete={handleOnboardingComplete} />
      )}
    </>
  );
};

export default HeroSection;
