'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { address } = useAccount();
  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkingRef = useRef<string | null>(null);

  const usernameRegex = useMemo(() => /^[a-zA-Z0-9_]{5,32}$/, []);
  const isUsernameValid = usernameRegex.test(username);

  const maxDate = useMemo(() => {
    const today = new Date();
    const max = new Date(today);
    max.setFullYear(today.getFullYear() - 18);
    return max.toISOString().split('T')[0];
  }, []);

  const minDate = useMemo(() => {
    const today = new Date();
    const min = new Date(today);
    min.setFullYear(today.getFullYear() - 120);
    return min.toISOString().split('T')[0];
  }, []);

  const isBirthdayValid = useMemo(() => {
    if (!birthday) return false;
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);
    if (birthDate > today) return false;
    const minDateObj = new Date(minDate);
    if (birthDate < minDateObj) return false;
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    let exactAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      exactAge = age - 1;
    }
    return exactAge >= 18;
  }, [birthday, minDate]);

  const isFormValid =
    isUsernameValid &&
    usernameAvailable !== false &&
    isBirthdayValid;

  const checkUsername = useCallback(async (name: string) => {
    if (checkingRef.current === name) return;
    if (!usernameRegex.test(name)) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      checkingRef.current = null;
      return;
    }
    checkingRef.current = name;
    setCheckingUsername(true);
    setUsernameAvailable(null);
    try {
      const response = await fetch(`/api/profile/check-username?username=${encodeURIComponent(name)}`);
      const data = await response.json();
      if (checkingRef.current !== name) return;
      if (response.ok && typeof data.available === 'boolean') {
        setUsernameAvailable(data.available);
      } else if (typeof data.available === 'boolean') {
        setUsernameAvailable(data.available);
      } else {
        setUsernameAvailable(null);
      }
    } catch (err) {
      console.error('Username check error:', err);
      if (checkingRef.current === name) {
        setUsernameAvailable(null);
      }
    } finally {
      if (checkingRef.current === name) {
        setCheckingUsername(false);
        checkingRef.current = null;
      }
    }
  }, [usernameRegex]);

  useEffect(() => {
    if (!username || username.length < 5) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      checkingRef.current = null;
      return;
    }
    if (checkingRef.current === username) return;
    if (usernameAvailable === true && checkingRef.current === null) return;
    const timer = setTimeout(() => {
      if (username && username.length >= 5 && checkingRef.current !== username) {
        checkUsername(username);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    setError(null);
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!isUsernameValid) {
      setError('Username must be 5-32 characters (letters, numbers, underscores)');
      return;
    }
    if (usernameAvailable === false) {
      setError('This username is already taken');
      return;
    }
    if (!birthday) {
      setError('Please enter your birthday');
      return;
    }
    if (!isBirthdayValid) {
      setError('You must be at least 18 years old to create an account');
      return;
    }
    if (!address) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, birthday }),
      });

      let profileData;
      try {
        const text = await profileResponse.text();
        profileData = text ? JSON.parse(text) : {};
      } catch {
        setError('Failed to create profile. Please try again.');
        setIsLoading(false);
        return;
      }

      if (profileResponse.ok) {
        window.dispatchEvent(new Event('profileUpdated'));
        onClose();
        if (window.location.pathname !== '/voting') {
          window.location.replace('/voting');
        }
      } else {
        const errorMessage = profileData.message || profileData.error || 'Failed to create profile';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '100%' }} />
        </div>

        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.stepContent}>
          <div className={styles.stepIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M22 7L13.03 12.7C12.7213 12.8934 12.3643 12.996 12 12.996C11.6357 12.996 11.2787 12.8934 10.97 12.7L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className={styles.stepTitle}>Create your account</h2>
          <p className={styles.stepDescription}>
            Enter your account details to continue.
          </p>

          <div className={styles.formFields}>
            <div className={styles.inputGroup}>
              <label htmlFor="onboarding-username" className={styles.inputLabel}>Username</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>@</span>
                <input
                  id="onboarding-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className={styles.input}
                  maxLength={32}
                  autoComplete="username"
                  autoFocus
                />
                {checkingUsername && (
                  <span className={styles.inputSuffix}>
                    <div className={styles.spinner} />
                  </span>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <span className={`${styles.inputSuffix} ${styles.available}`}>✓</span>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <span className={`${styles.inputSuffix} ${styles.taken}`}>✗</span>
                )}
              </div>
              <p className={styles.inputHint}>
                5-32 characters, letters, numbers, and underscores
              </p>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="onboarding-birthday" className={styles.inputLabel}>Birthday</label>
              <input
                id="onboarding-birthday"
                name="birthday"
                type="date"
                value={birthday}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  if (error && error.includes('birthday')) setError(null);
                }}
                onBlur={(e) => {
                  const selectedDate = e.target.value;
                  if (selectedDate) {
                    const birthDate = new Date(selectedDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    birthDate.setHours(0, 0, 0, 0);
                    if (isNaN(birthDate.getTime())) {
                      setError('Please enter a valid birthday');
                      setBirthday('');
                    } else if (birthDate > today) {
                      setError('Birthday cannot be in the future');
                      setBirthday('');
                    } else {
                      const age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      const dayDiff = today.getDate() - birthDate.getDate();
                      let exactAge = age;
                      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        exactAge = age - 1;
                      }
                      if (exactAge < 18 || selectedDate > maxDate) {
                        setError('You must be at least 18 years old to create an account');
                        setBirthday('');
                      }
                    }
                  }
                }}
                className={styles.input}
                min={minDate}
                max={maxDate}
                autoComplete="bday"
              />
              <p className={styles.inputHint}>
                You must be at least 18 years old
              </p>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
