'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import classes from './CheckinCard.module.css';

interface GratitudeModalProps {
  onClose: () => void;
  onComplete: () => void;
}

function GratitudeModal({ onClose, onComplete }: GratitudeModalProps) {
  const [gratitudeText, setGratitudeText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gratitudeText.trim()) return;
    onComplete();
  };

  if (!mounted) return null;

  return createPortal(
    <div className={classes.modalOverlay}>
      <div className={classes.modalBackdrop} onClick={onClose} />
      <div className={classes.modal} role="dialog" aria-modal="true" aria-labelledby="gratitude-title">
        <div className={classes.modalCard}>
          <div className={classes.modalHeader}>
            <div className={classes.azuraAvatar}>
              <Image
                src="https://i.imgur.com/3Y3KrnJ.png"
                alt="Azura"
                fill
                className={classes.azuraImage}
                unoptimized
              />
            </div>
            <div className={classes.modalTitleGroup}>
              <h3 id="gratitude-title" className={classes.modalTitle}>
                Azura
              </h3>
              <p className={classes.modalSubtitle}>&quot;What are you grateful for today?&quot;</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={classes.modalBody}>
            <label className={classes.label}>
              <textarea
                className={classes.textarea}
                placeholder="Type a few sentences about what you're grateful for today..."
                value={gratitudeText}
                onChange={(event) => setGratitudeText(event.target.value)}
                rows={4}
              />
            </label>

            <div className={classes.modalFooter}>
              <div className={classes.actions}>
                <button
                  type="button"
                  className={classes.secondaryButton}
                  onClick={onClose}
                >
                  Not now
                </button>
                <button
                  type="submit"
                  className={classes.primaryButton}
                  disabled={!gratitudeText.trim()}
                >
                  Complete
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CheckinCard() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger slide-in animation on mount (delayed to come after calendar)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenGratitude = () => {
    if (isCheckedIn) return;
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isAnimating) return;
    setIsModalOpen(false);
  };

  const handleCompleteGratitude = () => {
    if (isCheckedIn) return;

    setIsAnimating(true);
    setIsCheckedIn(true);
    setIsModalOpen(false);

    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  return (
    <>
      <button
        className={`${classes.card} ${isCheckedIn ? classes.checked : ''} ${isAnimating ? classes.animating : ''} ${isLoaded ? classes.cardLoaded : ''}`}
        onClick={handleOpenGratitude}
        disabled={isCheckedIn}
        type="button"
      >
        <div className={classes.leftSection}>
          <div className={classes.iconCircle}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={classes.icon}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" className={classes.checkmark} />
            </svg>
          </div>
          <span className={classes.text}>
            {isCheckedIn ? 'Daily Gratitude complete' : 'Daily Gratitude'}
          </span>
        </div>

        <div className={classes.rightIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
      </button>

      {isModalOpen && (
        <GratitudeModal onClose={handleCloseModal} onComplete={handleCompleteGratitude} />
      )}
    </>
  );
}
