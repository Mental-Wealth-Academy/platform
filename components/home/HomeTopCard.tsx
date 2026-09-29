'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePrivy } from '@privy-io/react-auth';
import { SealCheck } from '@phosphor-icons/react';
import AvatarSelectorModal from '@/components/avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '@/components/username-change/UsernameChangeModal';
import { useSound } from '@/hooks/useSound';
import { safeStorage } from '@/lib/safe-storage';
import styles from './HomeTopCard.module.css';

export interface HomeTopCardProps {
  activeCourseTitle?: string;
  activeCourseHref?: string;
  activeCourseKicker?: string;
  activeCourseDesc?: string;
  onOpenLeaderboard?: () => void;
  onOpenFieldNotes?: () => void;
}

function tierName(level: number): string {
  if (level >= 3) return 'Arbiter';
  if (level === 2) return 'Verifier';
  return 'Verifier';
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const PROFILE_BADGES = [
  { id: 'heart-gem', src: '/icons/badges/badge-heart-gem.svg', alt: 'Heart gem badge' },
  { id: 'student', src: '/icons/badges/badge-student.svg', alt: 'Student badge' },
  { id: 'scholar', src: '/icons/badges/badge-scholar.svg', alt: 'Scholar badge' },
  { id: 'books', src: '/icons/badges/badge-books.svg', alt: 'Books badge' },
  { id: 'terminal', src: '/icons/badges/badge-terminal.svg', alt: 'Terminal badge' },
];

/** Illustrated badge strip matching the indie collectible visual strip */
function StampBanner({ onPlaySound }: { onPlaySound: () => void }) {
  return (
    <div className={styles.stampBanner} role="group" aria-label="Profile badges">
      {PROFILE_BADGES.map((b) => (
        <button
          key={b.id}
          type="button"
          className={styles.stamp}
          onClick={() => onPlaySound()}
          aria-label={b.alt}
        >
          <Image
            src={b.src}
            alt={b.alt}
            width={48}
            height={48}
            className={styles.stampSvg}
            unoptimized={b.src.endsWith('.gif')}
          />
        </button>
      ))}
    </div>
  );
}

export default function HomeTopCard({}: HomeTopCardProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { play } = useSound();

  const [username, setUsername] = useState<string | null>(() => safeStorage.getItem('mwa:cached_username'));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => safeStorage.getItem('mwa:cached_avatar'));
  const [streak, setStreak] = useState(0);
  const [verifierLevel, setVerifierLevel] = useState<number | null>(null);
  const [guidesDone, setGuidesDone] = useState<number | null>(null);
  const [creditsEarned, setCreditsEarned] = useState<number>(0);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    // Load profile
    const loadProfile = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/me', { cache: 'no-store', credentials: 'include', headers });
        const data = await res.json().catch(() => ({}));
        if (data?.user) {
          if (data.user.username) {
            setUsername(data.user.username);
            safeStorage.setItem('mwa:cached_username', data.user.username);
          }
          if (data.user.avatarUrl) {
            setAvatarUrl(data.user.avatarUrl);
            safeStorage.setItem('mwa:cached_avatar', data.user.avatarUrl);
          }
        }
      } catch { /* ignore */ }
    };
    loadProfile();

    const onProfileUpdated = () => {
      const cached = safeStorage.getItem('mwa:cached_avatar');
      if (cached) setAvatarUrl(cached);
      const cachedUser = safeStorage.getItem('mwa:cached_username');
      if (cachedUser) setUsername(cachedUser);
      loadProfile();
    };
    window.addEventListener('profileUpdated', onProfileUpdated);

    // Load streak
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/daily-notes/streak?tz=${encodeURIComponent(timeZone)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStreak(d?.streak ?? 0))
      .catch(() => {});

    // Load verifier credentials
    (async () => {
      try {
        const res = await fetch('/api/guides/verifier-test/stats', {
          cache: 'no-store',
          headers: await authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        const creds: Array<{ maxLevel: number }> = data?.stats?.credentials ?? [];
        if (creds.length > 0) {
          setVerifierLevel(Math.max(...creds.map((c) => c.maxLevel)));
        }
      } catch { /* ignore */ }
    })();

    // Load progress
    (async () => {
      try {
        const res = await fetch('/api/guides/progress/stats', {
          cache: 'no-store',
          headers: await authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.completedGuides === 'number') setGuidesDone(data.completedGuides);
        if (typeof data?.totalDiamondsEarned === 'number') setCreditsEarned(data.totalDiamondsEarned);
      } catch { /* ignore */ }
    })();

    return () => {
      window.removeEventListener('profileUpdated', onProfileUpdated);
    };
  }, [ready, authenticated, authHeaders]);


  return (
    <div className={styles.wrapper} data-tour="home-profile">
      {/* Main card */}
      <div className={styles.card}>
        <div className={styles.profileSlide}>
          {/* Profile details */}
          <div className={styles.profileHeader}>
            <button
              type="button"
              className={styles.avatarBtn}
              style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl)})` } : undefined}
              onClick={() => {
                if (authenticated) {
                  setEditingAvatar(true);
                } else {
                  login();
                }
              }}
              aria-label="Change avatar"
            >
              {!avatarUrl && (username?.slice(0, 1).toUpperCase() ?? '?')}
            </button>

            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <button
                  type="button"
                  className={styles.userName}
                  onClick={() => {
                    if (authenticated) {
                      setEditingUsername(true);
                    } else {
                      login();
                    }
                  }}
                >
                  {username ?? 'Your profile'}
                </button>
                {verifierLevel !== null ? (
                  <button
                    type="button"
                    className={styles.pillBadge}
                    onClick={() => play('click')}
                    aria-label={`Verifier status: ${tierName(verifierLevel)}`}
                  >
                    <SealCheck size={12} weight="fill" aria-hidden="true" />
                    {tierName(verifierLevel)}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.pillBadge}
                    onClick={() => play('click')}
                    aria-label="Level 3 learner status"
                  >
                    <SealCheck size={12} weight="fill" aria-hidden="true" />
                    Level-3
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <Image src="/icons/ui-diamond.svg" alt="" width={13} height={13} />
              <span>{formatCredits(creditsEarned)} credits</span>
            </div>
            <div className={styles.statItem}>
              <span>{guidesDone ?? 0} guides completed</span>
            </div>
          </div>

          {/* Retro badges strip at bottom */}
          <StampBanner onPlaySound={() => play('click')} />
        </div>
      </div>

      {/* Modals for avatar & username editing */}
      {typeof window !== 'undefined' && createPortal(
        <>
          {editingAvatar && (
            <AvatarSelectorModal
              currentAvatarUrl={avatarUrl}
              onClose={() => setEditingAvatar(false)}
              onAvatarSelected={(url) => {
                setAvatarUrl(url);
                setEditingAvatar(false);
              }}
            />
          )}
          {editingUsername && username && (
            <UsernameChangeModal
              currentUsername={username}
              onClose={() => setEditingUsername(false)}
              onUsernameChanged={(name) => {
                setUsername(name);
                setEditingUsername(false);
              }}
            />
          )}
        </>,
        document.body,
      )}
    </div>
  );
}
