'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWalletSignup?: boolean;
}

type Step = 'account';

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, isWalletSignup = false }) => {
  const router = useRouter();
  const { address } = useAccount();
  const [currentStep, setCurrentStep] = useState<Step>('account');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const checkingRef = useRef<string | null>(null); // Track which username we're currently checking
  const [userId, setUserId] = useState<string | null>(null); // Store userId after signup

  // Username validation (minimum 5 characters) - memoized to prevent re-renders
  const usernameRegex = useMemo(() => /^[a-zA-Z0-9_]{5,32}$/, []);
  const isUsernameValid = usernameRegex.test(username);
  
  // Email validation (required only for non-wallet signup)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = isWalletSignup ? true : (email && emailRegex.test(email));
  
  // Password validation (required only for non-wallet signup)
  const isPasswordValid = isWalletSignup ? true : (password.length >= 8);
  
  // Calculate max date (18 years ago from today) - memoized to prevent recalculation
  const maxDate = useMemo(() => {
    const today = new Date();
    const max = new Date(today);
    max.setFullYear(today.getFullYear() - 18);
    return max.toISOString().split('T')[0];
  }, []);
  
  // Calculate min date (120 years ago from today) - for validation
  const minDate = useMemo(() => {
    const today = new Date();
    const min = new Date(today);
    min.setFullYear(today.getFullYear() - 120);
    return min.toISOString().split('T')[0];
  }, []);

  // Birthday validation (must be at least 18 years old) - reactive
  const isBirthdayValid = useMemo(() => {
    if (!birthday) return false;
    
    // Check if date is valid
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return false;
    
    // Check if date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);
    if (birthDate > today) return false;
    
    // Check if date is not too far in the past (reasonable limit: 120 years)
    const minDateObj = new Date(minDate);
    if (birthDate < minDateObj) return false;
    
    // Calculate exact age
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    let exactAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      exactAge = age - 1;
    }
    
    return exactAge >= 18;
  }, [birthday, minDate]);
  
  // Account step validation (email, username, password, birthday) - FIRST STEP
  const isAccountStepValid = 
    isEmailValid &&
    isUsernameValid && 
    usernameAvailable !== false && // Only block if explicitly unavailable
    isPasswordValid &&
    isBirthdayValid;

  // Check username availability
  const checkUsername = useCallback(async (name: string) => {
    // Prevent duplicate checks for the same username
    if (checkingRef.current === name) {
      return;
    }

    if (!usernameRegex.test(name)) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      checkingRef.current = null;
      return;
    }
    
    checkingRef.current = name;
    setCheckingUsername(true);
    setUsernameAvailable(null); // Reset while checking
    try {
      const response = await fetch(`/api/profile/check-username?username=${encodeURIComponent(name)}`);
      const data = await response.json();
      
      // Only update state if this is still the current check
      if (checkingRef.current !== name) {
        return;
      }
      
      // Handle both success and error responses
      if (response.ok) {
        if (typeof data.available === 'boolean') {
          setUsernameAvailable(data.available);
        } else {
          // If available is not a boolean, assume null (unknown)
          setUsernameAvailable(null);
        }
      } else {
        // If there's an error in the response, check if available is still provided
        if (typeof data.available === 'boolean') {
          setUsernameAvailable(data.available);
        } else {
          // If request failed and no availability info, don't set availability
          setUsernameAvailable(null);
        }
      }
    } catch (err) {
      console.error('Username check error:', err);
      // On network error, don't set availability (will be validated on server)
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

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 5) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      checkingRef.current = null;
      return;
    }

    // Don't re-check if we're already checking this exact username
    if (checkingRef.current === username) {
      return;
    }

    // Don't re-check if we already confirmed it's available (and not currently checking)
    if (usernameAvailable === true && checkingRef.current === null) {
      return;
    }

    const timer = setTimeout(() => {
      // Double-check username hasn't changed during debounce and we're not already checking it
      if (username && username.length >= 5 && checkingRef.current !== username) {
        checkUsername(username);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]); // Only depend on username - checkUsername is stable, and we use refs to prevent loops

  // Clear error when changing steps
  useEffect(() => {
    setError(null);
  }, [currentStep]);

  // Handle step transitions
  const handleNextStep = async () => {
    setError(null);

    if (currentStep === 'account') {
      // Skip email/password validation for wallet signups
      if (!isWalletSignup) {
        if (!isEmailValid) {
          setError('Please enter a valid email address');
          return;
        }
        if (!isPasswordValid) {
          setError('Password must be at least 8 characters');
          return;
        }
      }
      
      // Username validation applies to both wallet and email signups
      if (!isUsernameValid) {
        setError('Username must be 5-32 characters (letters, numbers, underscores)');
        return;
      }
      if (usernameAvailable === false) {
        setError('This username is already taken');
        return;
      }
      
      // Birthday validation applies to both wallet and email signups
      if (!birthday) {
        setError('Please enter your birthday');
        return;
      }
      if (!isBirthdayValid) {
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) {
          setError('Please enter a valid birthday');
        } else if (birthDate > new Date()) {
          setError('Birthday cannot be in the future');
        } else {
          setError('You must be at least 18 years old to create an account');
        }
        return;
      }
      
      // For wallet signup, account is already created, just create profile
      if (isWalletSignup) {
        if (!address) {
          setError('Wallet not connected. Please connect your wallet first.');
          setIsLoading(false);
          return;
        }
        // Account already exists from wallet connection, just create profile
        setIsLoading(true);
        await createProfile();
        return;
      }

      // Create the account now so we can use userId for avatar generation (email/password signup)
      setIsLoading(true);
      try {
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        let signupData;
        try {
          const text = await signupResponse.text();
          signupData = text ? JSON.parse(text) : {};
        } catch (err) {
          console.error('Failed to parse signup response:', err);
          setError('Failed to create account. Please try again.');
          setIsLoading(false);
          return;
        }

        if (!signupResponse.ok) {
          // If account already exists, we can't proceed - user needs to sign in instead
          if (signupResponse.status === 409) {
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setError(signupData.error || 'Failed to create account');
          }
          setIsLoading(false);
          return;
        }

        // Store userId for profile creation
        if (signupData.userId) {
          setUserId(signupData.userId);
          // Create profile with username, birthday (no avatar yet)
          await createProfile();
        } else {
          setError('Account creation failed. Please try again.');
        }
      } catch (err) {
        console.error('Signup error:', err);
        setError('An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrevStep = () => {
    setError(null);
    // No previous step now - account is the only step
  };

  const createProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Account was already created in the account step, just create/update the profile
      // Note: avatar_id is not included - user will select avatar on homepage
      // Use session-based auth (no wallet signing required) - session was established during account creation
      const headers: HeadersInit = { 
        'Content-Type': 'application/json'
      };

      const requestBody: any = {
        username,
        birthday,
        // No avatar_id - user selects avatar on homepage
      };
      
      // Only include email for non-wallet signups
      if (!isWalletSignup && email) {
        requestBody.email = email;
      }

      const profileResponse = await fetch('/api/profile/create', {
        method: 'POST',
        headers,
        credentials: 'include', // Use session cookie for authentication
        body: JSON.stringify(requestBody),
      });

      let profileData;
      try {
        const text = await profileResponse.text();
        profileData = text ? JSON.parse(text) : {};
      } catch (err) {
        console.error('Failed to parse profile response:', err);
        setError('Failed to create profile. Please try again.');
        setIsLoading(false);
        return;
      }

      if (profileResponse.ok) {
        // Dispatch event to notify navbar of profile update
        window.dispatchEvent(new Event('profileUpdated'));
        // Close modal first
        onClose();
        // If we're already on the home page, just refresh user data
        // Otherwise redirect to home
        if (window.location.pathname === '/voting') {
          // Already on dashboard page - profileUpdated event will trigger avatar modal if needed
          // No need to redirect
        } else {
          // Use window.location.replace for reliable redirect (ensures full page reload with new session)
          // This ensures cookies are properly sent and session is recognized
          window.location.replace('/voting');
        }
      } else {
        // Log detailed error for debugging
        console.error('Profile creation failed:', {
          status: profileResponse.status,
          statusText: profileResponse.statusText,
          data: profileData,
          username,
        });
        const errorMessage = profileData.message || profileData.error || 'Failed to create profile';
        setError(`${errorMessage}${profileData.validChoices ? ` Valid choices: ${profileData.validChoices.join(', ')}` : ''}`);
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Progress indicator */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ 
              width: currentStep === 'account' ? '100%' 
                : '100%' 
            }} 
          />
        </div>

        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Step 1: Account Details (Email, Username, Password)
            Note: For wallet signups, email and password are skipped, but username is still required */}
        {currentStep === 'account' && (
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

              {!isWalletSignup && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="onboarding-email" className={styles.inputLabel}>Email Address</label>
                    <input
                      id="onboarding-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                      className={styles.input}
                      autoComplete="email"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="onboarding-password" className={styles.inputLabel}>Password</label>
                    <input
                      id="onboarding-password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                      className={styles.input}
                      autoComplete="new-password"
                    />
                    <p className={styles.inputHint}>
                      At least 8 characters
                    </p>
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="onboarding-birthday" className={styles.inputLabel}>Birthday</label>
                <input
                  id="onboarding-birthday"
                  name="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => {
                    // Simply set the value without validation - allow user to type freely
                    // Validation will happen on blur and before form submission
                    const selectedDate = e.target.value;
                    setBirthday(selectedDate);
                    // Clear any existing birthday errors when user types
                    if (error && error.includes('birthday')) {
                      setError(null);
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur - check if date is valid and meets age requirement
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
                        // Check age requirement (must be at least 18 years old)
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

            {error && currentStep === 'account' && <p className={styles.error}>{error}</p>}

            <button 
              className={styles.primaryButton}
              onClick={handleNextStep}
              disabled={!isAccountStepValid || isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Avatar selection moved to homepage - see AvatarSelectionModal component */}
      </div>
    </div>
  );
};

export default OnboardingModal;

