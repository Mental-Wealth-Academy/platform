'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePrivy } from '@privy-io/react-auth';
import { NotePencil, SealCheck } from '@phosphor-icons/react';
import CtaButton from '@/components/shared/CtaButton';
import AvatarSelectorModal from '@/components/avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '@/components/username-change/UsernameChangeModal';
import { useSound } from '@/hooks/useSound';
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

/** Retro illustrated stamp banner matching the indie collectible visual strip */
function StampBanner() {
  return (
    <div className={styles.stampBanner} aria-hidden="true">
      {/* 1. Dolores / Sun Stamp */}
      <div className={styles.stamp}>
        <svg viewBox="0 0 68 56" className={styles.stampSvg}>
          <rect x="2" y="2" width="64" height="52" rx="6" className={styles.stampDoloresBg} strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M14 44 C20 36, 28 38, 34 44" fill="none" className={styles.stampDoloresTree} strokeWidth="2" />
          <path d="M24 44 L24 26 C24 26, 21 20, 16 22" fill="none" className={styles.stampDoloresTree} strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="20" r="3.5" className={styles.stampDoloresSun} />
          <circle cx="48" cy="18" r="6.5" className={styles.stampDoloresSun} />
          <rect x="10" y="8" width="48" height="9" rx="3" className={styles.stampDoloresBg} opacity="0.5" />
          <text x="34" y="14.5" textAnchor="middle" fontSize="6" fontWeight="800" className={styles.stampDoloresText} letterSpacing="0.06em">DOLORES</text>
        </svg>
      </div>

      {/* 2. York Street Collective Seal */}
      <div className={styles.stamp}>
        <svg viewBox="0 0 58 58" className={styles.stampSvg}>
          <circle cx="29" cy="29" r="27" className={styles.stampYorkBg} strokeWidth="2" />
          <circle cx="29" cy="29" r="23" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
          <text x="29" y="22" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="currentColor" letterSpacing="0.04em">YORK</text>
          <text x="29" y="30" textAnchor="middle" fontSize="7" fontWeight="900" fill="currentColor" letterSpacing="0.06em">STREET</text>
          <text x="29" y="38" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" letterSpacing="0.08em">COLLECTIVE</text>
        </svg>
      </div>

      {/* 3. Pink Mascot Stamp */}
      <div className={styles.stamp}>
        <svg viewBox="0 0 56 56" className={styles.stampSvg}>
          <rect x="2" y="2" width="52" height="52" rx="8" className={styles.stampPinkBg} strokeWidth="1.5" />
          <path d="M16 20 L12 9 L22 15" fill="none" className={styles.stampPinkLine} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 20 L44 9 L34 15" fill="none" className={styles.stampPinkLine} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="28" cy="30" r="14" className={styles.stampPinkFace} strokeWidth="2" />
          <circle cx="23" cy="28" r="2.5" className={styles.stampPinkEye} />
          <circle cx="33" cy="28" r="2.5" className={styles.stampPinkEye} />
          <path d="M25 35 Q28 39 31 35" fill="none" className={styles.stampPinkEye} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* 4. Tadaima Forest Green Stamp */}
      <div className={styles.stamp}>
        <svg viewBox="0 0 56 56" className={styles.stampSvg}>
          <rect x="2" y="2" width="52" height="52" rx="8" className={styles.stampTadaimaBg} strokeWidth="1.5" />
          <text x="14" y="20" fontSize="10" fontWeight="700" className={styles.stampTadaimaText} fontFamily="serif">ta</text>
          <text x="14" y="32" fontSize="10" fontWeight="700" className={styles.stampTadaimaText} fontFamily="serif">da</text>
          <text x="14" y="44" fontSize="10" fontWeight="700" className={styles.stampTadaimaText} fontFamily="serif">ima</text>
          <rect x="36" y="12" width="8" height="32" rx="2" fill="none" stroke="currentColor" strokeDasharray="2 2" opacity="0.3" />
        </svg>
      </div>

      {/* 5. Press Dog & Book Cyan Stamp */}
      <div className={styles.stamp}>
        <svg viewBox="0 0 68 56" className={styles.stampSvg}>
          <rect x="2" y="2" width="64" height="52" rx="6" className={styles.stampBookBg} strokeWidth="1.5" />
          <rect x="5" y="5" width="58" height="46" rx="4" fill="none" className={styles.stampBookBg} strokeWidth="1" strokeDasharray="3 2" />
          <path d="M18 33 L22 25 L28 25 L32 21 L38 21 L42 27 L50 27 L48 33 L40 33 L36 37 L32 37 L30 33 Z" className={styles.stampBookDog} />
          <circle cx="36" cy="23" r="1.5" fill="currentColor" opacity="0.8" />
          <rect x="20" y="37" width="28" height="5" rx="1.5" className={styles.stampBookDog} />
          <text x="34" y="48.5" textAnchor="middle" fontSize="5" fontWeight="700" className={styles.stampBookText} letterSpacing="0.08em">MWA PRESS</text>
        </svg>
      </div>
    </div>
  );
}

export default function HomeTopCard({}: HomeTopCardProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { play } = useSound();

  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/me', { cache: 'no-store', credentials: 'include', headers });
        const data = await res.json().catch(() => ({}));
        if (data?.user) {
          setUsername(data.user.username ?? null);
          setAvatarUrl(data.user.avatarUrl ?? null);
        }
      } catch { /* ignore */ }
    })();

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
  }, [ready, authenticated, authHeaders]);

  const filledStreakDays = Math.min(Math.max(streak, 0), 7);

  const memoryNote = (() => {
    if (guidesDone === null || guidesDone <= 0) return null;
    const guidesPart = `${guidesDone} guide${guidesDone === 1 ? '' : 's'} finished`;
    return streak > 0
      ? `Blue remembers: ${guidesPart}, ${streak}-day streak.`
      : `Blue remembers: ${guidesPart}.`;
  })();

  const topKicker = streak > 0
    ? `Active streak · ${streak} day${streak === 1 ? '' : 's'}`
    : 'Daily practice · Resets at midnight';

  return (
    <div className={styles.wrapper} data-tour="home-profile">
      {/* Subtle status kicker above the card */}
      <div className={styles.kickerTop}>{topKicker}</div>

      {/* Main card */}
      <div className={styles.card}>
        <div className={styles.profileSlide}>
          {/* Retro badges strip */}
          <StampBanner />

          {/* Profile details underneath the badges */}
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
                  {username ?? (authenticated ? 'Your profile' : 'Sign in')}
                </button>
                {verifierLevel !== null ? (
                  <span className={styles.pillBadge}>
                    <SealCheck size={12} weight="fill" aria-hidden="true" />
                    {tierName(verifierLevel)}
                  </span>
                ) : (
                  <span className={styles.pillBadge}>Learner</span>
                )}
              </div>

              <div className={styles.streakTracker} aria-label={`Current streak: ${streak} days`}>
                <span className={styles.metadataKicker}>Current Streak</span>
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

          {memoryNote && (
            <div className={styles.desc} style={{ margin: 0 }}>
              <NotePencil size={13} weight="fill" style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {memoryNote}
            </div>
          )}

          <div className={styles.cardFooter}>
            <div className={styles.footerLeft}>
              <span className={styles.metadataKicker}>
                {authenticated ? 'Tap name or avatar to edit' : 'Sign in to save progress'}
              </span>
            </div>

            {authenticated ? (
              <CtaButton
                variant="ghost"
                size="sm"
                className={styles.ctaBtn}
                onClick={() => setEditingAvatar(true)}
              >
                Edit profile
              </CtaButton>
            ) : (
              <CtaButton
                variant="ghost"
                size="sm"
                className={styles.ctaBtn}
                onClick={() => login()}
              >
                Sign in
              </CtaButton>
            )}
          </div>
        </div>
      </div>

      {/* Modals for avatar & username editing */}
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
    </div>
  );
}
