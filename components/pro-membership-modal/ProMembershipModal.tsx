'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import styles from './ProMembershipModal.module.css';

interface ProMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProMembershipModal: React.FC<ProMembershipModalProps> = ({ isOpen, onClose }) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const features = [
    'One payment, lifetime access',
    'Build & deploy your own AI agent squads',
    'Design your personalized learning path',
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.content}>
          <div className={styles.imageWrapper}>
            <Image
              src="/uploads/soul-key-membership.png"
              alt="Soul Key Membership Card"
              width={1050}
              height={655}
              className={styles.membershipImage}
              priority
            />
          </div>

          <div className={styles.textContent}>
            <h2 className={styles.title}>Become a Member</h2>
            <p className={styles.description}>
              Get access to exclusive tools and features.
            </p>

            <ul className={styles.featureList}>
              {features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://opensea.io/collection/soul-key"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton}
            >
              <span>Unlock Everything</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProMembershipModal;
