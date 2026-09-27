'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import ModalShell from '@/components/shared/ModalShell';
import styles from './AvatarSelectorModal.module.css';

interface Avatar {
  id: string;
  image_url: string;
  metadata_url: string;
}

interface AvatarSelectorModalProps {
  onClose: () => void;
  onAvatarSelected: (avatarUrl: string) => void;
}

const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({ onClose, onAvatarSelected }) => {
  const { getAccessToken } = usePrivy();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_UPLOAD = 10 * 1024 * 1024; // matches /api/upload

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch('/api/avatars/choices', {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load avatars');
        }

        setAvatars(data.choices || []);
        setSelectedAvatar(null);
      } catch (err: any) {
        console.error('Failed to fetch avatars:', err);
        setError(err?.message || 'Failed to load avatars');
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, [getAccessToken]);

  const handleSelectAvatar = async () => {
    if (!selectedAvatar) {
      setError('Please select an avatar');
      return;
    }

    // Find the avatar ID from the image URL
    const avatar = avatars.find(a => a.image_url === selectedAvatar);
    if (!avatar) {
      setError('Invalid avatar selection');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/avatars/select', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ avatar_id: avatar.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to select avatar');
      }

      // Notify parent component and trigger profile update
      onAvatarSelected(selectedAvatar);
      window.dispatchEvent(new Event('profileUpdated'));
      onClose();
    } catch (err: any) {
      console.error('Failed to select avatar:', err);
      setError(err?.message || 'Failed to select avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (PNG, JPEG, GIF, or WebP).');
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setError('Image is larger than 10MB. Pick a smaller one.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        headers: authHeader,
        body: form,
      });
      const uploaded = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Upload failed.');

      const saveRes = await fetch('/api/avatars/custom', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ url: uploaded.url }),
      });
      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saved.error || 'Could not save your photo.');

      onAvatarSelected(uploaded.url);
      window.dispatchEvent(new Event('profileUpdated'));
      onClose();
    } catch (err: any) {
      console.error('Custom avatar upload failed:', err);
      setError(err?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell isOpen={true} onClose={onClose} title="Select Your Avatar" maxWidth="md">
          {loading ? (
            <div className={styles.loading}>Loading avatars...</div>
          ) : error && avatars.length === 0 ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              <p className={styles.description}>
                Choose one of your unique avatars
              </p>
              <div className={styles.avatarGrid}>
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    className={`${styles.avatarOption} ${
                      selectedAvatar === avatar.image_url ? styles.selected : ''
                    }`}
                    onClick={() => {
                      setSelectedAvatar(avatar.image_url);
                      setError(null);
                    }}
                    type="button"
                  >
                    <div className={styles.avatarImageWrapper}>
                      <Image
                        src={avatar.image_url}
                        alt={avatar.id}
                        width={120}
                        height={120}
                        className={styles.avatarImage}
                        unoptimized
                      />
                    </div>
                  </button>
                ))}
              </div>
              {error && <div className={styles.errorMessage}>{error}</div>}
            </>
          )}

        <div className={styles.modalFooter}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className={styles.uploadButton}
            onClick={handleUploadClick}
            disabled={uploading || saving}
            type="button"
          >
            {uploading ? 'Uploading...' : 'Upload your own'}
          </button>
          <div className={styles.footerActions}>
            <button
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving || uploading}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.selectButton}
              onClick={handleSelectAvatar}
              disabled={saving || uploading || loading || !selectedAvatar}
              type="button"
            >
              {saving ? 'Selecting...' : 'Select Avatar'}
            </button>
          </div>
        </div>
    </ModalShell>
  );
};

export default AvatarSelectorModal;
