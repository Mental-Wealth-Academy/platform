'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './LandingPage.module.css';
import MobileOnboarding from '../mobile-onboarding/MobileOnboarding';

export const HeroSection: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleEnterAcademy = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    window.location.replace('/home');
  };

  return (
    <>
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeadline}>A Micro-University Designed For Intellectual Refreshment.</h1>
          <p className={styles.heroSubtext}>
            For 12 weeks, you&apos;ll build habits that unlock your full potential. Connect with others, build mental wealth habits through tasks and grow.
          </p>
          <button
            type="button"
            onClick={handleEnterAcademy}
            className={styles.heroButton}
          >
            Enter Academy
          </button>
        </div>
      </div>
      <Image
        src="https://i.imgur.com/a3NDLoN.png"
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
