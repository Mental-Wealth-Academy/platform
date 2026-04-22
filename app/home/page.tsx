'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import WeekTasksView from '@/components/week-tasks/WeekTasksView';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import MobileSplash from '@/components/mobile-splash/MobileSplash';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

const CyberpunkDataViz = dynamic(() => import('@/components/cyberpunk-data-viz/CyberpunkDataViz'), {
  ssr: false,
  loading: () => null,
});
const DailyReadPopup = dynamic(() => import('@/components/daily-read/DailyReadPopup'), {
  ssr: false,
  loading: () => null,
});
const BookReaderModal = dynamic(() => import('@/components/book-reader/BookReaderModal'), {
  ssr: false,
});
const WeekOneVisualNovel = dynamic(() => import('@/components/visual-novel/WeekOneVisualNovel'), {
  ssr: false,
});
const AngelMintSection = dynamic(() => import('@/components/angel-mint-section/AngelMintSection'), {
  ssr: false,
  loading: () => null,
});
const MintModal = dynamic(() => import('@/components/mint-modal/MintModal'), {
  ssr: false,
});
const CreditScore = dynamic(() => import('@/components/credit-score/CreditScore'), {
  ssr: false,
  loading: () => null,
});

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
  sealTxHash: string | null;
}

interface LeaderboardUser {
  rank: number;
  username: string;
  avatarUrl: string | null;
  shards: number;
}

const WEEKLY_READINGS = [
  { title: 'Art is a Spiritual Warfare', author: '', description: 'This week initiates your creative recovery.', category: 'Introduction', imageUrl: 'https://i.imgur.com/KkpN9as.png', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md' },
  { title: 'A Sense of Safety', author: '', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: '/stories/week-01/scene-02.png', slug: 'sense-of-safety', markdownPath: '/readings/sense-of-safety.md' },
  { title: 'A Sense of Identity', author: '', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: 'https://i.imgur.com/0gghyGS.jpeg', slug: 'sense-of-identity', markdownPath: '/readings/sense-of-identity.md' },
  { title: 'A Sense of Power', author: '', description: 'Anger, synchronicity, and shame surface here. This week asks you to reclaim your power and act on it.', category: 'Week 3', imageUrl: 'https://i.imgur.com/MMb9MTw.png', slug: 'sense-of-power', markdownPath: '/readings/sense-of-power.md' },
  { title: 'A Sense of Integrity', author: '', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: 'https://i.imgur.com/sRNfQyg.png', slug: 'sense-of-integrity', markdownPath: '/readings/sense-of-integrity.md' },
  { title: 'A Sense of Possibility', author: '', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: '/stories/week-01/scene-04.png', slug: 'sense-of-possibility', markdownPath: '/readings/sense-of-possibility.md' },
  { title: 'A Sense of Abundance', author: '', description: 'Scarcity is a story. Rewrite it. True abundance flows from creative alignment.', category: 'Week 6', imageUrl: 'https://i.imgur.com/DqnZ4P5.jpeg', slug: 'sense-of-abundance', markdownPath: '/readings/sense-of-abundance.md' },
  { title: 'A Sense of Connection', author: '', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: '/stories/week-01/scene-05.png', slug: 'sense-of-connection', markdownPath: '/readings/sense-of-connection.md' },
  { title: 'A Sense of Strength', author: '', description: 'Surviving loss of faith. The creative life demands resilience — this week you build it.', category: 'Week 8', imageUrl: 'https://i.imgur.com/6x026dv.jpeg', slug: 'sense-of-strength', markdownPath: '/readings/sense-of-strength.md' },
  { title: 'A Sense of Compassion', author: '', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: 'https://i.imgur.com/Wiv0PnM.png', slug: 'sense-of-compassion', markdownPath: '/readings/sense-of-compassion.md' },
  { title: 'A Sense of Self-Protection', author: '', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: 'https://i.imgur.com/86MQLAz.jpeg', slug: 'sense-of-self-protection', markdownPath: '/readings/sense-of-self-protection.md' },
  { title: 'A Sense of Autonomy', author: '', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: 'https://i.imgur.com/RAs9HJk.png', slug: 'sense-of-autonomy', markdownPath: '/readings/sense-of-autonomy.md' },
  { title: 'A Sense of Faith', author: '', description: 'Trust the path. Faith is what remains when the evidence hasn\'t arrived yet.', category: 'Week 12', imageUrl: 'https://i.imgur.com/Gd2fbry.png', slug: 'sense-of-faith', markdownPath: '/readings/sense-of-faith.md' },
];

const WEEK_TITLES = [
  'Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4',
  'Week 5', 'Week 6', 'Week 7', 'Week 8',
  'Week 9', 'Week 10', 'Week 11', 'Week 12', 'Week 13',
];

export default function HomePage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAmbientViz, setShowAmbientViz] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authFlowSettled, setAuthFlowSettled] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isWeekOneNovelOpen, setIsWeekOneNovelOpen] = useState(false);
  const [readerIndex, setReaderIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [seasonActive, setSeasonActive] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');
  const [showMintModal, setShowMintModal] = useState(false);
  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];
  const canPersistMorningPages = isAuthenticated || (authFlowSettled && ready && authenticated);

  // Swipe refs
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const revealAmbientViz = () => setShowAmbientViz(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(revealAmbientViz, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(revealAmbientViz, 300);
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    fetch('/api/season', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const week = data.currentWeek ?? 0;
        setActiveWeek(week);
        setViewWeek(Math.max(week, 1));
        setWeekEndsAt(data.weekEndsAt ?? null);
        setSeasonActive(data.seasonActive ?? false);
      })
      .catch(() => {
        setViewWeek(1);
      })
      .finally(() => {
        setSeasonLoading(false);
      });
  }, [getAccessToken]);

  const refreshAuth = useCallback(async () => {
    if (!ready || !authenticated) return;
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
      const meData = await meRes.json().catch(() => ({ user: null }));
      if (!meData?.user) return;
      setIsAuthenticated(true);
      const res = await fetch('/api/ethereal-progress/all', { credentials: 'include', headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setWeekStatuses(data.weeks);
      }
    } catch {}
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Re-fetch auth when SideNavigation finishes loading user (fixes race where
  // wallet connects before Privy token is ready, leaving isAuthenticated false)
  useEffect(() => {
    const handler = () => refreshAuth();
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
    };
  }, [refreshAuth]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => setLeaderboard(d.users ?? []))
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    if (!showLeaderboard) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocumentOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
    };
  }, [showLeaderboard]);

  const handleSealComplete = useCallback((weekNumber: number, txHash: string | null) => {
    setWeekStatuses(prev => {
      const hasWeek = prev.some(w => w.weekNumber === weekNumber);
      if (!hasWeek) {
        return [...prev, { weekNumber, isSealed: true, sealTxHash: txHash }].sort((a, b) => a.weekNumber - b.weekNumber);
      }

      return prev.map(w =>
        w.weekNumber === weekNumber ? { ...w, isSealed: true, sealTxHash: txHash } : w
      );
    });
  }, []);

  const getWeekStatus = (week: number) => weekStatuses.find(w => w.weekNumber === week);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') play('hover');
  }, [play]);

  const handleWelcomeAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
    (async () => {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (meData?.user) {
          const res = await fetch('/api/ethereal-progress/all', { credentials: 'include', headers: authHeaders });
          if (res.ok) {
            const data = await res.json();
            setWeekStatuses(data.weeks);
          }
        }
      } catch {}
    })();
  }, [getAccessToken]);

  const avatarColor = (name: string) => {
    const colors = ['#5168FF', '#E85D3A', '#62BE8F', '#9B7ED9', '#F5A623'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    if (viewWeek === null) return;
    const currentWeek = viewWeek;
    const diff = touchStartX.current - touchCurrentX.current;
    const threshold = 60;

    if (diff > threshold && currentWeek < 12) {
      setSwipeAnim('left');
      setTimeout(() => {
        setViewWeek(w => (w ?? 1) + 1);
        setSwipeAnim('none');
      }, 150);
      play('click');
    } else if (diff < -threshold && currentWeek > 1) {
      setSwipeAnim('right');
      setTimeout(() => {
        setViewWeek(w => (w ?? 2) - 1);
        setSwipeAnim('none');
      }, 150);
      play('click');
    }
  };

  const goToWeek = (dir: 'prev' | 'next') => {
    if (viewWeek === null) return;
    const currentWeek = viewWeek;
    if (dir === 'next' && currentWeek < 12) {
      setSwipeAnim('left');
      setTimeout(() => { setViewWeek(w => (w ?? 1) + 1); setSwipeAnim('none'); }, 150);
      play('click');
    } else if (dir === 'prev' && currentWeek > 1) {
      setSwipeAnim('right');
      setTimeout(() => { setViewWeek(w => (w ?? 2) - 1); setSwipeAnim('none'); }, 150);
      play('click');
    }
  };

  const resolvedViewWeek = viewWeek ?? 1;
  const weekReading = WEEKLY_READINGS[Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1)];
  const handleOpenReading = useCallback((index: number) => {
    const reading = WEEKLY_READINGS[index];
    if (reading?.slug === 'sense-of-safety') {
      setReaderIndex(index);
      setIsWeekOneNovelOpen(true);
      return;
    }

    setReaderIndex(index);
    setIsReaderOpen(true);
  }, []);

  return (
    <>
    <MobileSplash />
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated} onSettled={() => setAuthFlowSettled(true)}>
    {authFlowSettled && activeWeek > 0 && <DailyReadPopup activeWeek={activeWeek} />}
    <div className={styles.pageLayout}>
      {showAmbientViz && (
        <div className={styles.bgViz}>
          <CyberpunkDataViz />
        </div>
      )}
      <SideNavigation />
      <main className={styles.content} onFocus={handleFocus}>

        {/* ===== TOP LEADERBOARD ===== */}
        <section className={`${styles.hero} ${isLoaded ? styles.heroLoaded : ''}`}>
          <button
            type="button"
            className={styles.topLeaderboard}
            onClick={() => { play('click'); setShowLeaderboard(true); }}
          >
            <div className={styles.topLeaderboardHeader}>
              <Image src="/icons/ui-shard.svg" alt="" width={12} height={12} className={styles.topLeaderboardIcon} />
              <span className={styles.topLeaderboardTitle}>WEEKLY LEADERBOARD</span>
            </div>
            <div className={styles.topLeaderboardPodium}>
              {leaderboardLoading ? (
                [1, 2, 3, 4, 5].map(rank => (
                  <div key={rank} className={styles.podiumSlot}>
                    <div className={styles.podiumAvatarRing}>
                      <div className={`${styles.podiumAvatar} ${styles.skeletonBlock}`} />
                    </div>
                  </div>
                ))
              ) : (
                leaderboard.slice(0, 5).map(u => (
                  <div
                    key={u.rank}
                    className={`${styles.podiumSlot} ${u.rank === 1 ? styles.podiumFirst : u.rank === 2 ? styles.podiumSecond : u.rank === 3 ? styles.podiumThird : ''}`}
                  >
                    <div className={styles.podiumAvatarRing}>
                      {u.avatarUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u.avatarUrl} alt={u.username} className={styles.podiumAvatarImg} />
                        </>
                      ) : (
                        <div className={styles.podiumAvatar} style={{ background: avatarColor(u.username) }}>
                          {u.username[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </button>
        </section>

        <div className={styles.morningPagesShell}>
          <div className={styles.morningPagesGradient} />
          <DailyNotes enablePersistence={canPersistMorningPages} compact />
        </div>

        <CreditScore showLoader={false} />

        {/* ===== WEEK HEADER ===== */}
        <div className={styles.weekHeader}>
          <button
            className={styles.weekArrow}
            onClick={() => goToWeek('prev')}
            onMouseEnter={() => play('hover')}
            disabled={seasonLoading || resolvedViewWeek <= 1}
            aria-label="Previous week"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className={styles.weekHeaderCenter}>
            {seasonLoading ? (
              <span className={`${styles.weekTitle} ${styles.skeletonTextWide} ${styles.skeletonBlock}`} />
            ) : (
              <span className={styles.weekTitle}>{WEEK_TITLES[resolvedViewWeek]}</span>
            )}
          </div>
          <button
            className={styles.weekArrow}
            onClick={() => goToWeek('next')}
            onMouseEnter={() => play('hover')}
            disabled={seasonLoading || resolvedViewWeek >= 12}
            aria-label="Next week"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Week dots */}
        <div className={styles.weekDots}>
          {Array.from({ length: 12 }, (_, i) => {
            const w = i + 1;
            const status = getWeekStatus(w);
            return (
              <button
                key={w}
                className={`${styles.weekDot} ${!seasonLoading && w === resolvedViewWeek ? styles.weekDotActive : ''} ${status?.isSealed ? styles.weekDotSealed : ''} ${seasonLoading ? styles.weekDotLoading : ''}`}
                onClick={() => { play('click'); setViewWeek(w); }}
                title={`Week ${w}: ${WEEK_TITLES[w]}`}
                disabled={seasonLoading}
              />
            );
          })}
        </div>

        {/* ===== SWIPEABLE WEEK CONTENT ===== */}
        <div
          className={`${styles.weekContent} ${swipeAnim === 'left' ? styles.weekContentSwipeLeft : swipeAnim === 'right' ? styles.weekContentSwipeRight : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {seasonLoading || viewWeek === null ? (
            <>
              <div className={styles.readingCardSkeleton}>
                <div className={`${styles.readingMediaSkeleton} ${styles.skeletonBlock}`} />
                <div className={styles.readingInfo}>
                  <span className={`${styles.readingCategorySkeletonLine} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingTitleSkeletonLine} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingAuthorSkeletonLine} ${styles.skeletonBlock}`} />
                </div>
              </div>
              <div className={styles.weekTasksSkeleton}>
                <div className={`${styles.taskCardSkeleton} ${styles.skeletonBlock}`} />
                <div className={`${styles.taskCardSkeleton} ${styles.skeletonBlock}`} />
                <div className={`${styles.taskCardSkeleton} ${styles.skeletonBlock}`} />
                <div className={`${styles.sealButtonSkeleton} ${styles.skeletonBlock}`} />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.readingCard}
                style={{ '--reading-card-bg': `url(${JSON.stringify(weekReading.imageUrl)})` } as React.CSSProperties}
                onClick={() => { play('click'); handleOpenReading(Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1)); }}
                onMouseEnter={() => play('hover')}
              >
                <div className={styles.readingInfo}>
                  <span className={styles.readingTitle}>{weekReading.title}</span>
                  <span className={styles.readingAuthor}>{weekReading.author}</span>
                </div>
                <svg className={styles.readingArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <div className={styles.missionsHeadingRow} aria-hidden="true">
                <span className={styles.missionsDivider} />
                <h2 className={styles.missionsHeading}>Missions</h2>
                <span className={styles.missionsDivider} />
              </div>

              <WeekTasksView
                key={resolvedViewWeek}
                weekNumber={resolvedViewWeek}
                enablePersistence={isAuthenticated}
                isLocked={resolvedViewWeek > activeWeek}
                initialIsSealed={getWeekStatus(resolvedViewWeek)?.isSealed}
                initialSealTxHash={getWeekStatus(resolvedViewWeek)?.sealTxHash}
                onSealComplete={handleSealComplete}
              />
            </>
          )}
        </div>

        <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />

      </main>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className={styles.modalOverlay} onClick={() => setShowLeaderboard(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowLeaderboard(false)}>&times;</button>
            <div className={styles.modalHeader}>
              <Image src="/icons/ui-shard.svg" alt="" width={28} height={28} />
              <div>
                <strong className={styles.modalTitle}>Leaderboard</strong>
                <span className={styles.modalSub}>
                  {seasonActive ? `Week ${activeWeek} of 12` : 'Season inactive'}
                </span>
              </div>
            </div>
            <div className={styles.modalList}>
              {leaderboardLoading ? (
                Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className={styles.leagueRow}>
                    <span className={`${styles.leagueRank} ${styles.skeletonTextShort} ${styles.skeletonBlock}`} />
                    <div className={`${styles.leagueAvatar} ${styles.skeletonBlock}`} />
                    <span className={`${styles.leagueName} ${styles.skeletonTextWide} ${styles.skeletonBlock}`} />
                    <span className={`${styles.leagueShards} ${styles.skeletonText} ${styles.skeletonBlock}`} />
                  </div>
                ))
              ) : leaderboard.map(u => (
                <div key={u.rank} className={styles.leagueRow}>
                  <span className={styles.leagueRank}>{u.rank}</span>
                  {u.avatarUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.avatarUrl} alt={u.username} className={styles.leagueAvatarImg} />
                    </>
                  ) : (
                    <div className={styles.leagueAvatar} style={{ background: avatarColor(u.username) }}>
                      {u.username[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <span className={styles.leagueName}>{u.username}</span>
                  <span className={styles.leagueShards}>{u.shards} Shards</span>
                </div>
              ))}
              {!leaderboardLoading && leaderboard.length === 0 && (
                <p className={styles.emptyText}>No rankings yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isReaderOpen && (
        <BookReaderModal
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          title={currentReading.title}
          author={currentReading.author}
          markdownPath={currentReading.markdownPath}
          slug={currentReading.slug}
        />
      )}
      {isWeekOneNovelOpen && (
        <WeekOneVisualNovel
          isOpen={isWeekOneNovelOpen}
          onClose={() => setIsWeekOneNovelOpen(false)}
        />
      )}
      {showMintModal && <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />}

    </div>
    </HomeWelcomeFlow>
    </>
  );
}
