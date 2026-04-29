'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import styles from './LandingPage.module.css';

export const LandingAuthCard: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleProfileUpdate = () => {
      if (showOnboarding) {
        setShowOnboarding(false);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [showOnboarding]);

  const handleEnterAcademy = () => {
    window.location.replace('/community');
  };

  return (
    <>
      <div className={`${styles.loginCard} ${styles.loginCardMinimal}`}>
        <div className={styles.cardContent}>
          <div className={styles.loginHeader}>
            <div className={styles.logoContainer}>
              <Image
                src="/icons/logo-spacey2k.png"
                alt="Logo"
                width={150}
                height={138}
                className={styles.logoImage}
              />
            </div>
          </div>

          <div className={styles.loginForm}>
            {message && (
              <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
                {message.text}
              </div>
            )}

            <div className={styles.actions}>
              <div className={styles.walletSectionPrimary}>
                <button
                  type="button"
                  onClick={handleEnterAcademy}
                  className={styles.enterButton}
                >
                  <span className={styles.enterButtonTextDesktop}>Enter Academy</span>
                  <span className={styles.enterButtonTextMobile}>Enter</span>
                </button>
              </div>

              <div className={styles.termsText}>
                By joining Mental Wealth Academy, I confirm that I have read and agree to the{' '}
                <a href="#" className={styles.link}>terms and services</a>,{' '}
                <a href="#" className={styles.link}>privacy policy</a>.
              </div>
            </div>
          </div>
        </div>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
};

export default LandingAuthCard;
