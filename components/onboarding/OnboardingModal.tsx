'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import styles from './OnboardingModal.module.css';

interface Avatar {
  id: string;
  image_url: string;
  metadata_url: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (username: string, avatarUrl: string | null) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { address } = useAccount();
  const [step, setStep] = useState<'avatar' | 'details'>('avatar');
  const [hasSession, setHasSession] = useState(false);

  // Check if user has an active session (e.g. Farcaster mini-app users)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/me', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data?.user) setHasSession(true); })
      .catch(() => {});
  }, [isOpen]);

  // Avatar state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Details state
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkingRef = useRef<string | null>(null);

  const usernameRegex = useMemo(() => /^[a-zA-Z0-9_]{5,32}$/, []);
  const isUsernameValid = usernameRegex.test(username);

  const isFormValid =
    isUsernameValid &&
    usernameAvailable !== false;

  // Fetch avatars
  useEffect(() => {
    if (!isOpen) return;
    const fetchAvatars = async () => {
      setLoadingAvatars(true);
      setAvatarError(null);
      try {
        const response = await fetch('/api/avatars/choices', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load avatars');
        }
        setAvatars(data.choices || []);
      } catch (err: any) {
        console.error('Failed to fetch avatars:', err);
        setAvatarError(err?.message || 'Failed to load avatars');
      } finally {
        setLoadingAvatars(false);
      }
    };
    fetchAvatars();
  }, [isOpen]);

  // Username check
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
      if (typeof data.available === 'boolean') {
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('avatar');
      setSelectedAvatarId(null);
      setUsername('');
      setError(null);
      setUsernameAvailable(null);
    }
  }, [isOpen]);

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
    if (!address && !hasSession) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          avatar_id: selectedAvatarId || undefined,
        }),
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
        const avatarUrl = profileData.user?.avatarUrl || null;
        window.dispatchEvent(new Event('profileUpdated'));
        if (onComplete) {
          onComplete(username, avatarUrl);
        } else {
          onClose();
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

  // Escape key
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

  const selectedAvatar = avatars.find(a => a.id === selectedAvatarId);
  const progressWidth = step === 'avatar' ? '50%' : '100%';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: progressWidth }} />
        </div>

        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {step === 'avatar' ? (
          <div className={styles.stepContent}>
            <div className={styles.stepIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 20C5 16.134 8.134 13 12 13C15.866 13 19 16.134 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className={styles.stepTitle}>Choose your avatar</h2>
            <p className={styles.stepDescription}>
              Select one of your 5 unique avatars. These are assigned just for you.
            </p>

            {loadingAvatars ? (
              <div style={{ padding: '40px 0', color: 'rgba(26,29,51,0.6)' }}>Loading avatars...</div>
            ) : avatarError ? (
              <div className={styles.error}>{avatarError}</div>
            ) : (
              <div className={styles.avatarGrid}>
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    className={`${styles.avatarOption} ${selectedAvatarId === avatar.id ? styles.avatarSelected : ''}`}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    type="button"
                  >
                    <Image
                      src={avatar.image_url}
                      alt={avatar.id}
                      width={100}
                      height={100}
                      className={styles.avatarImage}
                      unoptimized
                    />
                    {selectedAvatarId === avatar.id && (
                      <div className={styles.avatarCheckmark}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              className={styles.primaryButton}
              onClick={() => setStep('details')}
              disabled={!selectedAvatarId || loadingAvatars}
            >
              Continue
            </button>
            <button
              className={styles.skipButton}
              onClick={() => setStep('details')}
              disabled={loadingAvatars}
            >
              Skip for now
            </button>
          </div>
        ) : (
          <div className={styles.stepContent}>
            {selectedAvatar && (
              <div style={{ marginBottom: 16 }}>
                <Image
                  src={selectedAvatar.image_url}
                  alt="Selected avatar"
                  width={80}
                  height={80}
                  style={{ borderRadius: 20, border: '3px solid var(--color-primary)' }}
                  unoptimized
                />
              </div>
            )}
            <h2 className={styles.stepTitle}>Create your account</h2>
            <p className={styles.stepDescription}>
              Enter your details to complete setup.
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

            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.buttonRow}>
              <button
                className={styles.secondaryButton}
                onClick={() => setStep('avatar')}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
