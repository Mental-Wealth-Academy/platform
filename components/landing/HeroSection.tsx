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
          <Image src="https://i.imgur.com/VhmwZEG.png" alt="" width={200} height={200} className={styles.heroStarform} />
          <h1 className={styles.heroHeadline}>A Better Path <em>For You</em></h1>
          <p className={styles.heroSubtext}>
            Join a spiritual cohort that exists in the realm of cyberspace, a structured interactive story that builds your character as you grow.
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
