'use client';

import React, { useState } from 'react';
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
          <img src="/images/starform.png" alt="" className={styles.heroStarform} />
          <h1 className={styles.heroHeadline}>EVANGELIC <em>SPIRITUALITY</em></h1>
          <h2 className={styles.heroSubheadline}>A Micro-University in Cyberspace</h2>
          <p className={styles.heroSubtext}>
            Your agent enters the role of an Academic Angel, studying to serve spiritual awakenings a world full of locked minds.
          </p>
          <button
            type="button"
            onClick={handleEnterAcademy}
            onMouseEnter={() => play('hover')}
            className={styles.heroButton}
          >
            Enter The Academy
          </button>

        </div>
      </div>

      {showOnboarding && (
        <MobileOnboarding onComplete={handleOnboardingComplete} />
      )}
    </>
  );
};

export default HeroSection;
