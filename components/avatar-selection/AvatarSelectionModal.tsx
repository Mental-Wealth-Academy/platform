'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './AvatarSelectionModal.module.css';

interface Avatar {
  id: string;
  image_url: string;
  metadata_url: string;
}

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarSelected?: () => void;
}

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({ 
  isOpen, 
  onClose,
  onAvatarSelected 
}) => {
  const [avatarChoices, setAvatarChoices] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatarChoices = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const response = await fetch('/api/avatars/choices', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.choices) {
        setAvatarChoices(data.choices);
      } else {
        setError(data.error || 'Failed to load avatars');
      }
    } catch (err) {
      console.error('Failed to fetch avatars:', err);
      setError('Failed to load avatars. Please try again.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Fetch avatar choices when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvatarChoices();
    }
  }, [isOpen, fetchAvatarChoices]);

  const handleSelectAvatar = async () => {
    if (!selectedAvatar) {
      setError('Please select an avatar');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use session-based auth - no wallet signature needed
      const response = await fetch('/api/avatars/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          avatar_id: selectedAvatar.id,
        }),
      });

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        console.error('Failed to parse response:', err);
        setError('Failed to save avatar. Please try again.');
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        // Dispatch event to notify navbar of profile update
        window.dispatchEvent(new Event('profileUpdated'));
        if (onAvatarSelected) {
          onAvatarSelected();
        }
        onClose();
      } else {
        setError(data.error || 'Failed to save avatar');
      }
    } catch (err) {
      console.error('Avatar selection error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          {isFetching ? (
            <div className={styles.loading}>Loading avatars...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              <div className={styles.avatarGrid} role="radiogroup" aria-label="Avatar options">
                {avatarChoices.map((avatar, index) => (
                  <button
                    key={avatar.id}
                    id={`avatar-option-${index}`}
                    name="avatar-selection"
                    type="button"
                    className={`${styles.avatarOption} ${selectedAvatar?.id === avatar.id ? styles.avatarSelected : ''}`}
                    onClick={() => setSelectedAvatar(avatar)}
                    aria-label={`Select avatar ${index + 1}`}
                    aria-pressed={selectedAvatar?.id === avatar.id}
                  >
                    <Image
                      src={avatar.image_url}
                      alt={avatar.id}
                      width={100}
                      height={100}
                      className={styles.avatarImage}
                      unoptimized
                    />
                    {selectedAvatar?.id === avatar.id && (
                      <div className={styles.avatarCheckmark}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="12" fill="var(--color-primary)"/>
                          <path d="M17 9L10 16L7 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {error && <p className={styles.errorMessage}>{error}</p>}

              <button 
                className={styles.primaryButton}
                onClick={handleSelectAvatar}
                disabled={!selectedAvatar || isLoading}
              >
                {isLoading ? 'Saving...' : 'Select Avatar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectionModal;
