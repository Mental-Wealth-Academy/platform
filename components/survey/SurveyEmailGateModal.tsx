'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CtaButton from '@/components/shared/CtaButton';
import { useScrollLock } from '@/hooks/useScrollLock';
import { setStorageItem } from '@/lib/safe-storage';
import styles from './SurveyEmailGateModal.module.css';

interface SurveyEmailGateModalProps {
  isOpen: boolean;
  variant?: 'modal' | 'inline';
  onUnlock: (email: string) => void;
  onSignIn: () => void;
  onClose?: () => void;
  archetypePreviewTitle?: string;
}

export default function SurveyEmailGateModal({
  isOpen,
  variant = 'modal',
  onUnlock,
  onSignIn,
  onClose,
  archetypePreviewTitle,
}: SurveyEmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(isOpen && variant === 'modal');

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Save email locally via safe storage
    setStorageItem('mwa_survey_guest_email', cleanEmail);

    // Subscribe lead in background (non-blocking)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    setIsSubmitting(false);
    onUnlock(cleanEmail);
  }, [email, onUnlock]);

  if (!isOpen) return null;

  const content = (
    <div className={styles.card}>
      <div className={styles.blueprintGlow} aria-hidden="true" />
      {onClose && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      )}

      <div className={styles.header}>
        <div className={styles.badge}>
          <span className={styles.statusDot} />
          <span>Analysis complete</span>
        </div>
        <h2 className={styles.title}>
          {archetypePreviewTitle
            ? `Your ${archetypePreviewTitle} profile is ready`
            : 'Your archetype report is ready'}
        </h2>
        <p className={styles.subtitle}>
          Enter your email to unlock your full psychological report and save your results. An Academy account will be ready for you to sign in anytime.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.inputGroup}>
          <label htmlFor="survey-email-input" className={styles.inputLabel}>
            Email address
          </label>
          <input
            id="survey-email-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            disabled={isSubmitting}
          />
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        <CtaButton
          type="submit"
          variant="primary"
          block
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Unlocking report...' : 'Unlock full report'}
        </CtaButton>
      </form>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.signInLink}
          onClick={onSignIn}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className={styles.modalOverlay} role="dialog" aria-modal="true">
        {content}
      </div>,
      document.body
    );
  }

  return <div className={styles.inlineContainer}>{content}</div>;
}
