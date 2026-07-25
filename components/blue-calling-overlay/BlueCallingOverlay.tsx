'use client';

import React, { useEffect, useRef } from 'react';
import { Phone, X } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './BlueCallingOverlay.module.css';

interface BlueCallingOverlayProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function BlueCallingOverlay({ onAccept, onDecline }: BlueCallingOverlayProps) {
  const { play } = useSound();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    // Start ringing
    play('ring');
    intervalRef.current = setInterval(() => play('ring'), 1600);

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onDecline, play]);

  return (
    <div className={styles.overlay} onClick={onDecline}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <h3 className={styles.title}>INCOMING VOICE CALL</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onDecline}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatarCircle}>
              <Phone size={32} weight="fill" />
            </div>
            <div className={styles.pingRing} />
          </div>

          <div className={styles.callerInfo}>
            <span className={styles.badge}>VOICE SESSION</span>
            <h2 className={styles.name}>Blue</h2>
            <p className={styles.callingText}>is calling your terminal...</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.declineButton} onClick={onDecline} type="button">
              <X size={18} weight="bold" />
              <span>Decline</span>
            </button>
            <button className={styles.acceptButton} onClick={onAccept} type="button">
              <Phone size={18} weight="fill" />
              <span>Accept Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
