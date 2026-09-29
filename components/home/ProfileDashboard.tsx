'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrivy } from '@privy-io/react-auth';
import { NotePencil, SealCheck } from '@phosphor-icons/react';

import AvatarSelectorModal from '@/components/avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '@/components/username-change/UsernameChangeModal';
import { useSound } from '@/hooks/useSound';
import styles from './ProfileDashboard.module.css';

/** Tier names by credential level, mirroring VerifierBadges. */
function tierName(level: number): string {
  if (level >= 3) return 'Arbiter';
  if (level === 2) return 'Verifier';
  return 'Verifier';
}

export default function ProfileDashboard() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { play } = useSound();
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [verifierLevel, setVerifierLevel] = useState<number | null>(null);
  const [guidesDone, setGuidesDone] = useState<number | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const filledStreakDays = Math.min(Math.max(streak, 0), 7);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadMe = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/me', { cache: 'no-store', credentials: 'include', headers });
      const data = await res.json().catch(() => ({}));
      if (data?.user) {
        setUsername(data.user.username ?? null);
        setAvatarUrl(data.user.avatarUrl ?? null);
      }
    } catch { /* ignore */ }
  }, [authHeaders]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadMe();

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/daily-notes/streak?tz=${encodeURIComponent(timeZone)}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStreak(d?.streak ?? 0))
      .catch(() => {});

    // Verifier standing: once the user passes a qualification test they hold a
    // credential — surface it as a "Verifier" badge in place of "Learner".
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
        } else {
          setVerifierLevel(null);
        }
      } catch { /* non-fatal — falls back to the Learner badge */ }
    })();

    // Blue's notes: what she can honestly say she remembers about this
    // learner, backed by real completion data.
    (async () => {
      try {
        const res = await fetch('/api/guides/progress/stats', {
          cache: 'no-store',
          headers: await authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.completedGuides === 'number') setGuidesDone(data.completedGuides);
      } catch { /* non-fatal — the badge simply doesn't render */ }
    })();
  }, [ready, authenticated, loadMe, authHeaders]);

  const memoryNote = (() => {
    if (guidesDone === null || guidesDone <= 0) return null;
    const guidesPart = `${guidesDone} guide${guidesDone === 1 ? '' : 's'} finished`;
    return streak > 0
      ? `Blue remembers: ${guidesPart}, ${streak}-day streak.`
      : `Blue remembers: ${guidesPart}.`;
  })();

  return (
    <section
      className={styles.panel}
      onMouseEnter={() => play('soft-hover')}
      onClick={() => { if (!authenticated) login(); }}
      onKeyDown={(e) => {
        if (authenticated) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          login();
        }
      }}
      role={!authenticated ? 'button' : undefined}
      tabIndex={!authenticated ? 0 : undefined}
      aria-label={!authenticated ? 'Log in to set up your profile' : undefined}
      data-signed-out={!authenticated ? '' : undefined}
    >
      <div className={styles.dither} aria-hidden="true" />
      <button
        type="button"
        className={styles.avatar}
        style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl)})` } : undefined}
        onClick={(e) => { if (authenticated) { e.stopPropagation(); setEditingAvatar(true); } }}
        aria-label="Change avatar"
      >
        {!avatarUrl && (username?.slice(0, 1).toUpperCase() ?? '?')}
      </button>

      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <button
            type="button"
            className={styles.nameButton}
            onClick={(e) => { if (authenticated) { e.stopPropagation(); setEditingUsername(true); } }}
          >
            {username ?? 'Your profile'}
          </button>
          {verifierLevel !== null ? (
            <button
              type="button"
              className={`${styles.learnerBadge} ${styles.verifierBadge}`}
              onClick={() => play('click')}
              aria-label={`Verifier status: ${tierName(verifierLevel)}`}
            >
              <SealCheck size={12} weight="fill" aria-hidden="true" />
              {tierName(verifierLevel)}
            </button>
          ) : (
            <button
              type="button"
              className={styles.learnerBadge}
              onClick={() => play('click')}
              aria-label="Learner status"
            >
              Learner
            </button>
          )}
        </div>
        <div className={styles.streak} aria-label={`Current streak: ${streak} days`}>
          <span className={styles.streakLabel}>Current Streak</span>
          <span className={styles.streakDays} aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={index}
                className={`${styles.streakDay} ${index < filledStreakDays ? styles.streakDayFilled : ''}`}
              />
            ))}
          </span>
        </div>
      </div>

      {memoryNote && (
        <button
          type="button"
          className={`${styles.learnerBadge} ${styles.memoryBadge}`}
          title={memoryNote}
          onClick={() => play('click')}
          aria-label="Blue's notes"
        >
          <NotePencil size={12} weight="fill" aria-hidden="true" />
          Blue&apos;s notes
        </button>
      )}

      {typeof window !== 'undefined' && createPortal(
        <>
          {editingAvatar && (
            <AvatarSelectorModal
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

    </section>
  );
}
