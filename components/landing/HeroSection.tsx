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
          <h1 className={styles.heroHeadline}>MENTAL WEALTH ACADEMY</h1>
          <h2 className={styles.heroSubheadline}>Micro-University For Communal Wealth</h2>
          <p className={styles.heroSubtext}>
            We refuse to let lazy people or the government steal our achievements, we believe that everyone should only work for their own happiness and not be forced to serve others.
          </p>
          <button
            type="button"
            onClick={handleEnterAcademy}
            onMouseEnter={() => play('hover')}
            className={styles.heroButton}
          >
            Start Now
          </button>

        </div>
      </div>
      <Image
        src="https://i.imgur.com/cFzSBbq.png"
        alt="Hero illustration"
        width={400}
        height={400}
        className={styles.heroImage}
        priority
      />

      {showOnboarding && (
        <MobileOnboarding onComplete={handleOnboardingComplete} />
      )}
    </>
  );
};

export default HeroSection;
