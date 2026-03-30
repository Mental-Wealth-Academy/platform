'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import styles from './UsernameChangeModal.module.css';

interface UsernameChangeModalProps {
  onClose: () => void;
  currentUsername: string;
  onUsernameChanged: (newUsername: string) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;

const UsernameChangeModal: React.FC<UsernameChangeModalProps> = ({ 
  onClose, 
  currentUsername,
  onUsernameChanged 
}) => {
  const { getAccessToken } = usePrivy();
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [isValid, setIsValid] = useState(true);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef<string | null>(null);

  // Check username availability
  const checkUsername = useCallback(async (name: string) => {
    // Don't check if it's the current username
    if (name === currentUsername) {
      setIsAvailable(true);
      setCheckingUsername(false);
      return;
    }

    // Prevent duplicate checks for the same username
    if (checkingRef.current === name) {
      return;
    }

    if (!USERNAME_REGEX.test(name)) {
      setIsAvailable(null);
      setCheckingUsername(false);
      checkingRef.current = null;
      return;
    }
    
    checkingRef.current = name;
    setCheckingUsername(true);
    setIsAvailable(null); // Reset while checking
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
          setIsAvailable(data.available);
        } else {
          setIsAvailable(null);
        }
      } else {
        if (typeof data.available === 'boolean') {
          setIsAvailable(data.available);
        } else {
          setIsAvailable(null);
        }
      }
    } catch (err) {
      console.error('Username check error:', err);
      if (checkingRef.current === name) {
        setIsAvailable(null);
      }
    } finally {
      if (checkingRef.current === name) {
        setCheckingUsername(false);
        checkingRef.current = null;
      }
    }
  }, [currentUsername]);

  // Debounced username check
  useEffect(() => {
    const trimmed = newUsername.trim();
    
    // Validate format
    if (trimmed.length === 0) {
      setIsValid(false);
      setIsAvailable(null);
      return;
    }

    if (!USERNAME_REGEX.test(trimmed)) {
      setIsValid(false);
      setIsAvailable(null);
      return;
    }

    setIsValid(true);

    // Debounce the availability check
    const timeoutId = setTimeout(() => {
      checkUsername(trimmed);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (checkingRef.current === trimmed) {
        checkingRef.current = null;
      }
    };
  }, [newUsername, checkUsername]);

  const handleSave = async () => {
    const trimmed = newUsername.trim();
    
    if (!USERNAME_REGEX.test(trimmed)) {
      setError('Invalid username. Use 5-32 chars, letters/numbers/underscore only.');
      return;
    }

    if (trimmed === currentUsername) {
      onClose();
      return;
    }

    if (isAvailable === false) {
      setError('Username is already taken.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update username');
      }

      // Notify parent component and trigger profile update
      onUsernameChanged(trimmed);
      window.dispatchEvent(new Event('profileUpdated'));
      onClose();
    } catch (err: any) {
      console.error('Failed to update username:', err);
      setError(err?.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const canSave = isValid && 
                  newUsername.trim() !== currentUsername && 
                  (isAvailable === true || (isAvailable === null && !checkingUsername));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close" disabled={saving}>
          ×
        </button>

        <div className={styles.content}>
          <h2 className={styles.title}>Change Username</h2>
          <p className={styles.description}>
            Choose a new username (5-32 characters, letters, numbers, and underscores only)
          </p>
          
          <div className={styles.inputContainer}>
            <label htmlFor="username-input" className={styles.inputLabel}>
              Username
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.atSymbol}>@</span>
              <input
                id="username-input"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={`${styles.usernameInput} ${
                  !isValid && newUsername.trim().length > 0 ? styles.inputError : ''
                } ${
                  isAvailable === true ? styles.inputAvailable : ''
                } ${
                  isAvailable === false ? styles.inputUnavailable : ''
                }`}
                placeholder="username"
                disabled={saving}
                autoFocus
              />
            </div>
            
            {checkingUsername && (
              <div className={styles.statusMessage}>
                <span className={styles.checking}>Checking availability...</span>
              </div>
            )}
            
            {!checkingUsername && newUsername.trim() !== currentUsername && (
              <div className={styles.statusMessage}>
                {!isValid && newUsername.trim().length > 0 && (
                  <span className={styles.errorText}>
                    Invalid format. Use 5-32 chars, letters/numbers/underscore only.
                  </span>
                )}
                {isValid && isAvailable === true && (
                  <span className={styles.successText}>✓ Username available</span>
                )}
                {isValid && isAvailable === false && (
                  <span className={styles.errorText}>✗ Username already taken</span>
                )}
                {isValid && isAvailable === null && newUsername.trim().length >= 5 && (
                  <span className={styles.neutralText}>Checking...</span>
                )}
              </div>
            )}
            
            {newUsername.trim() === currentUsername && (
              <div className={styles.statusMessage}>
                <span className={styles.neutralText}>This is your current username</span>
              </div>
            )}
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || !canSave}
            type="button"
          >
            {saving ? 'Saving...' : 'Save Username'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsernameChangeModal;
