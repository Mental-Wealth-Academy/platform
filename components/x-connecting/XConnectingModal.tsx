'use client';

import React, { useEffect, useState } from 'react';
import ModalShell from '@/components/shared/ModalShell';
import styles from './XConnectingModal.module.css';

interface XConnectingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const XConnectingModal: React.FC<XConnectingModalProps> = ({ isOpen, onClose = () => {} }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} hideHeader maxWidth="sm">
      <div className={styles.modalContent}>
        <div className={styles.animationContainer}>
          <div className={styles.xIconContainer}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.xIcon}
            >
              <path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
        <h2 className={styles.title}>Connecting to X</h2>
        <p className={styles.message}>
          Opening X to authorize connection{dots}
        </p>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      </div>
    </ModalShell>
  );
};
