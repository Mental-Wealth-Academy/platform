'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './LandingPage.module.css';
import MobileOnboarding from '../mobile-onboarding/MobileOnboarding';
import { useSound } from '@/hooks/useSound';

export const HeroSection: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const { play } = useSound();

  const handleEnterAcademy = () => {
    play('click');
    setShowPassword(true);
    setPassword('');
    setPasswordError(false);
  };

  const handlePasswordSubmit = () => {
    if (password === 'letmein') {
      play('click');
      window.location.href = '/home';
    } else {
      setPasswordError(true);
      play('error');
    }
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

      {showPassword && (
        <div className={styles.passwordOverlay} onClick={() => setShowPassword(false)}>
          <div className={styles.passwordModal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.passwordLabel}>Enter the password</p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
              className={`${styles.passwordInput} ${passwordError ? styles.passwordInputError : ''}`}
              placeholder="Password"
              autoFocus
            />
            {passwordError && <p className={styles.passwordError}>Wrong password</p>}
            <button
              type="button"
              className={styles.passwordSubmit}
              onClick={handlePasswordSubmit}
            >
              Enter
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;
