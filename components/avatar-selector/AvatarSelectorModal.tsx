'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowsClockwise, Sparkle, UploadSimple } from '@phosphor-icons/react';
import ModalShell from '@/components/shared/ModalShell';
import { safeStorage } from '@/lib/safe-storage';
import {
  BACKGROUND_TRAITS,
  BACKGROUND_COLORS,
  SKIN_TONE_TRAITS,
  SKIN_PALETTES,
  HAIRSTYLE_TRAITS,
  HAIR_COLOR_TRAITS,
  HAIR_PALETTES,
  HEADSET_TRAITS,
  OUTFIT_TRAITS,
  ACCESSORY_TRAITS,
  getAxisAvatarParams,
  buildCustomAvatarSeed,
  buildAxisAvatarUrl,
  renderAxisAvatarSvg,
  type AxisAvatarParams,
} from '@/lib/axis-avatar';
import styles from './AvatarSelectorModal.module.css';

interface AvatarSelectorModalProps {
  onClose: () => void;
  onAvatarSelected: (avatarUrl: string) => void;
  currentAvatarUrl?: string | null;
}

interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'sage', name: 'Sage', url: '/archetypes/sage.png' },
  { id: 'empath', name: 'Empath', url: '/archetypes/empath.png' },
  { id: 'visionary', name: 'Visionary', url: '/archetypes/visionary.png' },
  { id: 'anchor', name: 'Anchor', url: '/archetypes/anchor.png' },
  { id: 'daemon', name: 'Blue Daemon', url: '/archetypes/blue_daemon.png' },
  { id: 'strategist', name: 'Strategist', url: '/archetypes/strategist.png' },
  { id: 'academic', name: 'Academic Angel', url: '/academic-angels.webp' },
  { id: 'anbel01', name: 'Angel Alpha', url: '/anbel01.png' },
  { id: 'anbel02', name: 'Angel Sol', url: '/anbel02.png' },
  { id: 'anbel05', name: 'Angel Luna', url: '/anbel05.png' },
  { id: 'anbel06', name: 'Angel Astra', url: '/anbel06.png' },
  { id: 'anbel09', name: 'Angel Nova', url: '/anbel09.png' },
];

type CategoryKey = 'presets' | 'skin' | 'background' | 'hairstyle' | 'hairColor' | 'headset' | 'outfit' | 'accessory';

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: 'presets', label: 'Presets' },
  { key: 'skin', label: 'Skin' },
  { key: 'background', label: 'Backdrop' },
  { key: 'hairstyle', label: 'Hair' },
  { key: 'hairColor', label: 'Color' },
  { key: 'headset', label: 'Gear' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'accessory', label: 'Accessory' },
];

export default function AvatarSelectorModal({
  onClose,
  onAvatarSelected,
  currentAvatarUrl,
}: AvatarSelectorModalProps) {
  const { getAccessToken } = usePrivy();

  // Initialize trait indices from current avatar if it has a seed, or default
  const initialParams = useMemo(() => {
    if (currentAvatarUrl && currentAvatarUrl.includes('seed=')) {
      try {
        const url = new URL(currentAvatarUrl, 'https://mentalwealthacademy.world');
        const seed = url.searchParams.get('seed');
        if (seed) {
          return getAxisAvatarParams(seed);
        }
      } catch { /* ignore */ }
    }
    return {
      backgroundIndex: 0,
      skinToneIndex: 1,
      hairstyleIndex: 0,
      hairColorIndex: 0,
      headsetIndex: 0,
      outfitIndex: 0,
      accessoryIndex: 0,
    };
  }, [currentAvatarUrl]);

  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(() => {
    if (currentAvatarUrl && !currentAvatarUrl.includes('seed=')) {
      return currentAvatarUrl;
    }
    return null;
  });
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(() => {
    return currentAvatarUrl && !currentAvatarUrl.includes('seed=') ? 'presets' : 'presets';
  });
  const [backgroundIndex, setBackgroundIndex] = useState(initialParams.backgroundIndex);
  const [skinToneIndex, setSkinToneIndex] = useState(initialParams.skinToneIndex);
  const [hairstyleIndex, setHairstyleIndex] = useState(initialParams.hairstyleIndex);
  const [hairColorIndex, setHairColorIndex] = useState(initialParams.hairColorIndex);
  const [headsetIndex, setHeadsetIndex] = useState(initialParams.headsetIndex);
  const [outfitIndex, setOutfitIndex] = useState(initialParams.outfitIndex);
  const [accessoryIndex, setAccessoryIndex] = useState(initialParams.accessoryIndex);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_UPLOAD = 10 * 1024 * 1024;

  // Build the current avatar parameters
  const currentParams: AxisAvatarParams = useMemo(() => ({
    backgroundIndex,
    skinToneIndex,
    hairstyleIndex,
    hairColorIndex,
    headsetIndex,
    outfitIndex,
    accessoryIndex,
    chassisIndex: hairstyleIndex,
    visorIndex: hairColorIndex,
    headgearIndex: headsetIndex,
    traits: {
      background: BACKGROUND_TRAITS[backgroundIndex],
      skinTone: SKIN_TONE_TRAITS[skinToneIndex],
      hairstyle: HAIRSTYLE_TRAITS[hairstyleIndex],
      hairColor: HAIR_COLOR_TRAITS[hairColorIndex],
      headset: HEADSET_TRAITS[headsetIndex],
      outfit: OUTFIT_TRAITS[outfitIndex],
      accessory: ACCESSORY_TRAITS[accessoryIndex],
      chassis: HAIRSTYLE_TRAITS[hairstyleIndex],
      visor: HAIR_COLOR_TRAITS[hairColorIndex],
      headgear: HEADSET_TRAITS[headsetIndex],
    },
  }), [backgroundIndex, skinToneIndex, hairstyleIndex, hairColorIndex, headsetIndex, outfitIndex, accessoryIndex]);

  // Generate the live preview SVG string (instant in-memory, 0 network calls)
  const previewSvg = useMemo(() => {
    return renderAxisAvatarSvg(currentParams);
  }, [currentParams]);

  const handleRandomize = () => {
    setSelectedPresetUrl(null);
    setBackgroundIndex(Math.floor(Math.random() * BACKGROUND_TRAITS.length));
    setSkinToneIndex(Math.floor(Math.random() * SKIN_TONE_TRAITS.length));
    setHairstyleIndex(Math.floor(Math.random() * HAIRSTYLE_TRAITS.length));
    setHairColorIndex(Math.floor(Math.random() * HAIR_COLOR_TRAITS.length));
    setHeadsetIndex(Math.floor(Math.random() * HEADSET_TRAITS.length));
    setOutfitIndex(Math.floor(Math.random() * OUTFIT_TRAITS.length));
    setAccessoryIndex(Math.floor(Math.random() * ACCESSORY_TRAITS.length));
    setError(null);
  };

  const handleSaveAvatar = async () => {
    setSaving(true);
    setError(null);

    // If user picked a preset avatar, save it via /api/avatars/custom
    if (selectedPresetUrl) {
      try {
        const token = await getAccessToken();
        const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch('/api/avatars/custom', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader,
          },
          body: JSON.stringify({ url: selectedPresetUrl }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to select avatar');
        }

        safeStorage.setItem('mwa:cached_avatar', selectedPresetUrl);
        onAvatarSelected(selectedPresetUrl);
        window.dispatchEvent(new Event('profileUpdated'));
        onClose();
      } catch (err: any) {
        console.error('Failed to select preset avatar:', err);
        setError(err?.message || 'Failed to select avatar');
      } finally {
        setSaving(false);
      }
      return;
    }

    const customSeed = buildCustomAvatarSeed({
      backgroundIndex,
      skinToneIndex,
      hairstyleIndex,
      hairColorIndex,
      headsetIndex,
      outfitIndex,
      accessoryIndex,
    });
    const avatarUrl = buildAxisAvatarUrl(customSeed);

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/avatars/select', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ avatar_id: customSeed }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to select avatar');
      }

      // Immediately cache in safeStorage for 0ms initial load on next refresh
      safeStorage.setItem('mwa:cached_avatar', avatarUrl);

      // Notify parent component and trigger profile update
      onAvatarSelected(avatarUrl);
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
    e.target.value = '';
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

      safeStorage.setItem('mwa:cached_avatar', uploaded.url);
      onAvatarSelected(uploaded.url);
      window.dispatchEvent(new Event('profileUpdated'));
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell isOpen={true} onClose={onClose} title="Select Your Avatar" maxWidth="md">
      <div className={styles.builderContainer}>
        {/* Live Preview & Randomize */}
        <div className={styles.previewSection}>
          <div className={styles.previewAvatarRing}>
            <div className={styles.previewAvatarInner}>
              {selectedPresetUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedPresetUrl} alt="Selected avatar preset" className={styles.previewImage} />
              ) : (
                <div
                  className={styles.previewSvgWrapper}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              )}
            </div>
          </div>
          <button
            type="button"
            className={styles.randomizeButton}
            onClick={handleRandomize}
            title="Randomize traits"
          >
            <Sparkle size={15} weight="fill" />
            <span>Randomize</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className={styles.categoryTabs} role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.key}
              className={`${styles.categoryTab} ${activeCategory === cat.key ? styles.categoryTabActive : ''}`}
              onClick={() => { setActiveCategory(cat.key); setError(null); }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Options Grid based on Active Category */}
        <div className={styles.optionsWrap}>
          {activeCategory === 'presets' && (
            <div className={styles.presetsGrid}>
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedPresetUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(preset.url);
                      setError(null);
                    }}
                  >
                    <div className={styles.presetThumbWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className={styles.presetThumb} />
                    </div>
                    <span className={styles.presetLabel}>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'skin' && (
            <div className={styles.colorGrid}>
              {SKIN_TONE_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && skinToneIndex === idx;
                const palette = SKIN_PALETTES[idx];
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.colorOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setSkinToneIndex(idx);
                    }}
                  >
                    <span
                      className={styles.swatch}
                      style={{ background: palette.base, border: `2px solid ${palette.shadow}` }}
                    />
                    <span className={styles.optionLabel}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'background' && (
            <div className={styles.colorGrid}>
              {BACKGROUND_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && backgroundIndex === idx;
                const color = BACKGROUND_COLORS[idx];
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.colorOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setBackgroundIndex(idx);
                    }}
                  >
                    <span
                      className={styles.swatch}
                      style={{ background: color }}
                    />
                    <span className={styles.optionLabel}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'hairstyle' && (
            <div className={styles.textOptionsGrid}>
              {HAIRSTYLE_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && hairstyleIndex === idx;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.textOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setHairstyleIndex(idx);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'hairColor' && (
            <div className={styles.colorGrid}>
              {HAIR_COLOR_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && hairColorIndex === idx;
                const palette = HAIR_PALETTES[idx];
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.colorOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setHairColorIndex(idx);
                    }}
                  >
                    <span
                      className={styles.swatch}
                      style={{ background: palette.main, border: `2px solid ${palette.shadow}` }}
                    />
                    <span className={styles.optionLabel}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'headset' && (
            <div className={styles.textOptionsGrid}>
              {HEADSET_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && headsetIndex === idx;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.textOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setHeadsetIndex(idx);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'outfit' && (
            <div className={styles.textOptionsGrid}>
              {OUTFIT_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && outfitIndex === idx;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.textOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setOutfitIndex(idx);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {activeCategory === 'accessory' && (
            <div className={styles.textOptionsGrid}>
              {ACCESSORY_TRAITS.map((label, idx) => {
                const isSelected = !selectedPresetUrl && accessoryIndex === idx;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.textOption} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => {
                      setSelectedPresetUrl(null);
                      setAccessoryIndex(idx);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={handleUploadClick}
            disabled={uploading || saving}
          >
            <UploadSimple size={15} />
            <span>{uploading ? 'Uploading...' : 'Upload photo'}</span>
          </button>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving || uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.selectButton}
              onClick={handleSaveAvatar}
              disabled={saving || uploading}
            >
              {saving ? 'Saving...' : 'Select Avatar'}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
