'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { setStorageItem } from '@/lib/safe-storage';
import { buildAxisAvatarUrl } from '@/lib/axis-avatar';
import { checkBirthdayParts, MIN_SIGNUP_AGE } from '@/lib/birthday';
import { useDevOnboarding, getDevWallet } from '@/components/useDevMode';
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
  forceReady?: boolean;
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete, forceReady = false }) => {
  const { address } = useAccount();
  const { getAccessToken, authenticated, login } = usePrivy();
  const devOnboarding = useDevOnboarding();
  const effectiveAddress = address || (devOnboarding ? getDevWallet() : null);
  const [step, setStep] = useState<'details' | 'avatar' | 'shards'>('details');
  const [hasSession, setHasSession] = useState(false);
  // Gate the onboarding questions behind a confirmed account. The questions
  // must never be answerable before an account exists on the server.
  const [authStatus, setAuthStatus] = useState<'checking' | 'ready' | 'needs-signin'>('checking');

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  // The three date boxes are held separately so a half-typed date can never be
  // mistaken for a complete one (a lone month used to read as a valid value and
  // only failed at the very last step).
  const [birthdayParts, setBirthdayParts] = useState({ month: '', day: '', year: '' });
  const [birthdayTouched, setBirthdayTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkingRef = useRef<string | null>(null);

  const usernameRegex = useMemo(() => /^[a-zA-Z0-9_]{5,32}$/, []);
  const isUsernameValid = usernameRegex.test(username);
  const birthdayCheck = useMemo(() => checkBirthdayParts(birthdayParts), [birthdayParts]);
  const birthday = birthdayCheck.value;
  // Hold the message back until the field has been left alone or filled in, so
  // typing "1" into the month box doesn't shout at anyone mid-keystroke.
  const birthdayError =
    birthdayTouched || birthdayCheck.complete ? birthdayCheck.error : null;
  // Redden only the box at fault; a whole-date problem (future, age) marks all three.
  const birthdayFieldInvalid = (field: 'month' | 'day' | 'year') =>
    !!birthdayError && (birthdayCheck.field === null || birthdayCheck.field === field);
  const isDetailsValid =
    isUsernameValid &&
    usernameAvailable !== false &&
    !checkingUsername &&
    !!gender &&
    !!birthday;

  const setBirthdayField = useCallback((field: 'month' | 'day' | 'year', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, field === 'year' ? 4 : 2);
    setBirthdayParts((prev) => ({ ...prev, [field]: digits }));
    setError(null);
  }, []);

  // On open, confirm an account exists on the server BEFORE showing any
  // questions. If the user is signed in with Privy but has no server account
  // yet, create it now (wallet-signup). Otherwise prompt them to sign in.
  useEffect(() => {
    if (!isOpen) return;

    // Dev onboarding or force-ready preview: skip real auth
    if (devOnboarding || forceReady) {
      setHasSession(true);
      setAuthStatus('ready');
      return;
    }

    let cancelled = false;
    setAuthStatus('checking');

    (async () => {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        let res = await fetch('/api/me', {
          credentials: 'include',
          cache: 'no-store',
          headers: authHeaders,
        });
        let data = await res.json().catch(() => ({ user: null }));

        // Signed in with Privy but no server account row yet — create it.
        if (!data?.user && token) {
          await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders,
          }).catch(() => {});
          res = await fetch('/api/me', {
            credentials: 'include',
            cache: 'no-store',
            headers: authHeaders,
          });
          data = await res.json().catch(() => ({ user: null }));
        }

        if (cancelled) return;
        if (data?.user) {
          setHasSession(true);
          setAuthStatus('ready');
        } else {
          setAuthStatus('needs-signin');
        }
      } catch (err) {
        console.error('Onboarding account check failed:', err);
        if (!cancelled) setAuthStatus('needs-signin');
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, authenticated, getAccessToken, devOnboarding, forceReady]);

  useEffect(() => {
    if (!isOpen || authStatus !== 'ready') return;
    const fetchAvatars = async () => {
      setLoadingAvatars(true);
      setAvatarError(null);
      try {
        if (forceReady) {
          setAvatars(Array.from({ length: 6 }, (_, index) => {
            const id = `preview#${index}`;
            return { id, image_url: buildAxisAvatarUrl(id), metadata_url: '' };
          }));
          setLoadingAvatars(false);
          return;
        }
        const token = await getAccessToken();
        const headers: HeadersInit = devOnboarding
          ? { 'x-dev-bypass': getDevWallet() }
          : token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch('/api/avatars/choices', {
          cache: 'no-store',
          credentials: 'include',
          headers,
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
  }, [isOpen, authStatus, getAccessToken, devOnboarding, forceReady]);

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
    const timer = setTimeout(() => {
      if (username && username.length >= 5 && checkingRef.current !== username) {
        checkUsername(username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [checkUsername, username]);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setError(null);
      if (forceReady) {
        setUsername('preview_user');
        setGender('female');
        setBirthdayParts({ month: '01', day: '15', year: '2000' });
        setSelectedAvatarId('preview#0');
        setUsernameAvailable(true);
        setCheckingUsername(false);
      } else {
        setSelectedAvatarId(null);
        setUsername('');
        setGender('');
        setBirthdayParts({ month: '', day: '', year: '' });
        setUsernameAvailable(null);
        setCheckingUsername(false);
        setBirthdayTouched(false);
      }
      checkingRef.current = null;
    }
  }, [isOpen, forceReady]);

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    setUsernameAvailable(null);
    setError(null);
  };

  const handleSignIn = useCallback(async () => {
    setError(null);
    try {
      await login();
    } catch (err) {
      console.error('Sign-in failed:', err);
      setError('Sign-in failed. Please try again.');
    }
  }, [login]);

  const handleDetailsContinue = () => {
    setError(null);
    if (!isUsernameValid) {
      setError('Username must be 5-32 characters (letters, numbers, underscores)');
      return;
    }
    if (usernameAvailable === false) {
      setError('This username is already taken');
      return;
    }
    if (!gender) {
      setError('Please choose an option for sex.');
      return;
    }
    if (!birthday) {
      setBirthdayTouched(true);
      setError(birthdayCheck.error || 'Please enter your birthday as MM / DD / YYYY.');
      return;
    }
    setStep('avatar');
  };

  const handleAvatarContinue = () => {
    setError(null);
    if (!selectedAvatarId) {
      setError('Choose an avatar to continue.');
      return;
    }
    setStep('shards');
  };

  const handleSubmit = async () => {
    setError(null);

    // Force-ready preview: just close without submitting
    if (forceReady) {
      onClose();
      return;
    }

    if (!isUsernameValid) {
      setError('Username must be 5-32 characters (letters, numbers, underscores)');
      setStep('details');
      return;
    }
    if (usernameAvailable === false) {
      setError('This username is already taken');
      setStep('details');
      return;
    }
    if (!gender) {
      setError('Please choose an option for sex.');
      setStep('details');
      return;
    }
    if (!birthday) {
      setBirthdayTouched(true);
      setError(birthdayCheck.error || 'Please enter your birthday as MM / DD / YYYY.');
      setStep('details');
      return;
    }
    if (!selectedAvatarId) {
      setError('Choose an avatar to continue.');
      setStep('avatar');
      return;
    }
    if (!effectiveAddress && !hasSession) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (devOnboarding) {
        headers['x-dev-bypass'] = getDevWallet();
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          username,
          gender,
          birthday,
          avatar_id: selectedAvatarId,
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
        // Signal the home first-run guide that this user just onboarded. Only
        // freshly onboarded users ever set this, so the Daily Note intro never
        // shows for existing accounts.
        setStorageItem('mwa-home-intro-pending', '1');
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {authStatus === 'checking' && (
          <div className={styles.stepContent}>
            <div className={styles.loadingState}>Setting up your account...</div>
          </div>
        )}

        {authStatus === 'needs-signin' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Create your account</h2>
            <p className={styles.stepDescription}>
              Sign in with your wallet to create your Academy account. You&apos;ll set up your profile right after.
            </p>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.primaryButton} onClick={handleSignIn}>
              Sign in to continue
            </button>
          </div>
        )}

        {authStatus === 'ready' && (
        <>

        {step === 'details' ? (
          <div className={styles.stepContent}>
            <h2 className={`${styles.stepTitle} ${styles.titleAnimated}`}>Character Identifiers</h2>
            <p className={`${styles.stepDescription} ${styles.descAnimated}`}>
            Stay private while staying connected. You control how you show up.
            </p>

            <div className={`${styles.formFields} ${styles.formAnimated}`}>
              <div className={styles.inputGroup}>
                <label htmlFor="onboarding-username" className={styles.inputLabel}>Username</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>@</span>
                  <input
                    id="onboarding-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
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

              <fieldset className={styles.inputGroup}>
                <legend>Sex</legend>
                <div className={styles.radioGroup}>
                  {genderOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`${styles.radioOption} ${gender === option.value ? styles.radioOptionChecked : ''}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={gender === option.value}
                        onChange={(e) => setGender(e.target.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="onboarding-bmonth">Birthday</label>
                <div className={styles.birthdayRow}>
                  <input
                    id="onboarding-bmonth"
                    name="bmonth"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM"
                    maxLength={2}
                    value={birthdayParts.month}
                    onChange={(e) => setBirthdayField('month', e.target.value)}
                    onBlur={() => setBirthdayTouched(true)}
                    aria-invalid={birthdayFieldInvalid('month')}
                    aria-describedby="onboarding-birthday-hint"
                    className={`${styles.birthdayInput} ${birthdayFieldInvalid('month') ? styles.birthdayInputInvalid : ''}`}
                    autoComplete="bday-month"
                  />
                  <span className={styles.birthdaySep}>/</span>
                  <input
                    name="bday"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD"
                    maxLength={2}
                    value={birthdayParts.day}
                    onChange={(e) => setBirthdayField('day', e.target.value)}
                    onBlur={() => setBirthdayTouched(true)}
                    aria-invalid={birthdayFieldInvalid('day')}
                    aria-describedby="onboarding-birthday-hint"
                    className={`${styles.birthdayInput} ${birthdayFieldInvalid('day') ? styles.birthdayInputInvalid : ''}`}
                    autoComplete="bday-day"
                  />
                  <span className={styles.birthdaySep}>/</span>
                  <input
                    name="byear"
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY"
                    maxLength={4}
                    value={birthdayParts.year}
                    onChange={(e) => setBirthdayField('year', e.target.value)}
                    onBlur={() => setBirthdayTouched(true)}
                    aria-invalid={birthdayFieldInvalid('year')}
                    aria-describedby="onboarding-birthday-hint"
                    className={`${styles.birthdayInput} ${styles.birthdayYear} ${birthdayFieldInvalid('year') ? styles.birthdayInputInvalid : ''}`}
                    autoComplete="bday-year"
                  />
                </div>
                <p
                  id="onboarding-birthday-hint"
                  className={birthdayError ? styles.inputError : styles.inputHint}
                  role={birthdayError ? 'alert' : undefined}
                >
                  {birthdayError || `Month / day / year, and you must be at least ${MIN_SIGNUP_AGE}`}
                </p>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={`${styles.primaryButton} ${styles.buttonsAnimated}`}
              onClick={handleDetailsContinue}
              disabled={!isDetailsValid}
            >
              Continue
            </button>
          </div>
        ) : step === 'avatar' ? (
          <div className={styles.stepContent}>
            <h2 className={`${styles.stepTitle} ${styles.titleAnimated}`}>Choose your avatar</h2>
            <p className={`${styles.stepDescription} ${styles.descAnimated}`}>
              This decision is very important.
            </p>

            {loadingAvatars ? (
              <div className={styles.loadingState}>Loading avatars...</div>
            ) : avatarError ? (
              <div className={styles.error}>{avatarError}</div>
            ) : (
              <div className={styles.avatarGrid}>
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    className={`${styles.avatarOption} ${styles.avatarLottery} ${selectedAvatarId === avatar.id ? styles.avatarSelected : ''}`}
                    onClick={() => {
                      setSelectedAvatarId(avatar.id);
                      setError(null);
                    }}
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

            {error && <p className={styles.error}>{error}</p>}

            <div className={`${styles.buttonRow} ${styles.buttonsAnimated}`}>
              <button
                className={styles.secondaryButton}
                onClick={() => setStep('details')}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleAvatarContinue}
                disabled={!selectedAvatarId || loadingAvatars}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.stepContent}>
            <div className={`${styles.shardHero} ${styles.shardHeroAnimated}`}>
              <Image
                src="/icons/ui-diamond.svg"
                alt="Diamonds"
                width={88}
                height={88}
                className={styles.shardIcon}
              />
            </div>
            <h2 className={`${styles.stepTitle} ${styles.titleAnimated}`}>The School of The Future</h2>
            <p className={`${styles.stepDescription} ${styles.descAnimated}`}>
              Welcome to the Next-Gen.
            </p>

            <div className={styles.shardExplainer}>
              <div className={`${styles.explainerCard} ${styles.cardAnimated}`}>
                <h3>Decentralized Quality Education</h3>
                <p>Complete surveys, finish course milestones, build streaks, and submit quests to grow your credit balance.</p>
              </div>
              <div className={`${styles.explainerCard} ${styles.cardAnimated}`}>
                <h3>Real Cash Prizes For Learning</h3>
                <p>Use diamonds inside the AI prediction market to back forecasts and create ways to make real money.</p>
              </div>
              <div className={`${styles.explainerCard} ${styles.cardAnimated}`}>
                <h3>Reach Your Ethereal Horizon</h3>
                <p>VIP members can access research grants and community funds connected to Academy participation.</p>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={`${styles.buttonRow} ${styles.buttonsAnimated}`}>
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
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Enter Academy'}
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
