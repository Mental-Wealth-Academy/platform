'use client';

import React, { useState, useEffect } from 'react';
import styles from './LandingPage.module.css';

export const DonationPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('donationPopupDismissed', 'true');
  };

  useEffect(() => {
    if (sessionStorage.getItem('donationPopupDismissed') === 'true') {
      setIsDismissed(true);
      return;
    }

    const checkVisibility = () => {
      if (isDismissed) return;

      if (window.innerWidth < 1024) {
        setIsVisible(false);
        return;
      }

      const logosSection = document.querySelector('[class*="companyLogosSection"]');
      if (!logosSection) {
        setIsVisible(false);
        return;
      }

      const logosRect = logosSection.getBoundingClientRect();
      const logosBottom = logosRect.bottom + window.scrollY;
      const currentScroll = window.scrollY + window.innerHeight;

      setIsVisible(currentScroll > logosBottom);
    };

    checkVisibility();
    window.addEventListener('scroll', checkVisibility);
    window.addEventListener('resize', checkVisibility);
    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [isDismissed]);

  if (!isVisible) return null;

  return (
    <div className={styles.donationPopup}>
      <div className={styles.donationPopupContainer}>
        <div className={styles.donationPopupContent}>
          <div className={styles.donationPopupCorner}>
            <svg width="138" height="130" viewBox="0 0 138 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40.3487 0H0V40.3487H40.3487V0Z" fill="#232323"></path>
              <path d="M137.556 0H97.2068V40.3487H137.556V0Z" fill="#232323"></path>
              <path d="M40.3487 89.6514H0V130H40.3487V89.6514Z" fill="#232323"></path>
              <path d="M88.9712 0H48.5847V130H137.707V89.6513H88.9712V0Z" fill="#232323"></path>
            </svg>
          </div>
          <div className={styles.donationPopupText}>
            <h2 className={styles.donationPopupHeading}>Reshape the future of mental health.</h2>
            <p className={styles.donationPopupDescription}>
              Long-term held cryptocurrency investments can unlock additional funds for charity
            </p>
          </div>
          <a
            className={styles.donationPopupButton}
            href="https://artizen.fund/index/p/mental-wealth-academy?season=6"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support on Artizen
          </a>
          <button
            className={styles.donationPopupClose}
            onClick={handleClose}
            aria-label="Close donation popup"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.41431" width="20" height="2" transform="rotate(45 1.41431 0)" fill="white"></rect>
              <rect x="0.000244141" y="14.3643" width="20" height="2" transform="rotate(-45 0.000244141 14.3643)" fill="white"></rect>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationPopup;
