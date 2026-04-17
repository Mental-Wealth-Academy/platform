'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import BookReaderModal from '@/components/book-reader/BookReaderModal';
import WeekOneVisualNovel from '@/components/visual-novel/WeekOneVisualNovel';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import WeekTasksView from '@/components/week-tasks/WeekTasksView';
import DailyReadPopup from '@/components/daily-read/DailyReadPopup';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

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
  { title: 'Recovering a Sense of Safety', author: '', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: 'https://i.imgur.com/sRcnrJB.mp4', slug: 'recovering-safety', markdownPath: '/readings/recovering-safety.md' },
  { title: 'Recovering a Sense of Identity', author: '', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: 'https://i.imgur.com/0gghyGS.jpeg', slug: 'week-two', markdownPath: '/readings/week-two.md' },
  { title: 'Recovering a Sense of Power', author: '', description: 'Anger, synchronicity, and shame surface here. This week asks you to reclaim your power and act on it.', category: 'Week 3', imageUrl: 'https://i.imgur.com/MMb9MTw.png', slug: 'recovering-power', markdownPath: '/readings/recovering-power.md' },
  { title: 'Recovering a Sense of Integrity', author: '', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: 'https://i.imgur.com/sRNfQyg.png', slug: 'recovering-integrity', markdownPath: '/readings/recovering-integrity.md' },
  { title: 'Recovering a Sense of Possibility', author: '', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: 'https://i.imgur.com/rHLvipb.mp4', slug: 'recovering-possibility', markdownPath: '/readings/recovering-possibility.md' },
  { title: 'Recovering a Sense of Abundance', author: '', description: 'Scarcity is a story. Rewrite it. True abundance flows from creative alignment.', category: 'Week 6', imageUrl: 'https://i.imgur.com/DqnZ4P5.jpeg', slug: 'recovering-abundance', markdownPath: '/readings/recovering-abundance.md' },
  { title: 'Recovering a Sense of Connection', author: '', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: 'https://i.imgur.com/Nk7ppHa.mp4', slug: 'recovering-connection', markdownPath: '/readings/recovering-connection.md' },
  { title: 'Recovering a Sense of Strength', author: '', description: 'Surviving loss of faith. The creative life demands resilience — this week you build it.', category: 'Week 8', imageUrl: 'https://i.imgur.com/6x026dv.jpeg', slug: 'recovering-strength', markdownPath: '/readings/recovering-strength.md' },
  { title: 'Recovering a Sense of Compassion', author: '', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: 'https://i.imgur.com/Wiv0PnM.png', slug: 'recovering-compassion', markdownPath: '/readings/recovering-compassion.md' },
  { title: 'Recovering a Sense of Self-Protection', author: '', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: 'https://i.imgur.com/86MQLAz.jpeg', slug: 'recovering-self-protection', markdownPath: '/readings/recovering-self-protection.md' },
  { title: 'Recovering a Sense of Autonomy', author: '', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: 'https://i.imgur.com/RAs9HJk.png', slug: 'recovering-autonomy', markdownPath: '/readings/recovering-autonomy.md' },
  { title: 'Recovering a Sense of Faith', author: '', description: 'Trust the path. Faith is what remains when the evidence hasn\'t arrived yet.', category: 'Week 12', imageUrl: 'https://i.imgur.com/Gd2fbry.png', slug: 'recovering-faith', markdownPath: '/readings/recovering-faith.md' },
];

const WEEK_TITLES = [
  'Introduction', 'Safety', 'Identity', 'Power', 'Integrity',
  'Possibility', 'Abundance', 'Connection', 'Strength',
  'Compassion', 'Protection', 'Autonomy', 'Faith', 'Epilogue',
];

export default function HomePage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [isLoaded, setIsLoaded] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isWeekOneNovelOpen, setIsWeekOneNovelOpen] = useState(false);
  const [readerIndex, setReaderIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [seasonActive, setSeasonActive] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');
  const [showMintModal, setShowMintModal] = useState(false);
  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];

  // Swipe refs
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
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
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!ready || !authenticated) return;
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
      const meData = await meRes.json().catch(() => ({ user: null }));
      if (!meData?.user) return;
      setIsAuthenticated(true);
      const uname = meData.user.username;
      if (uname && !uname.startsWith('user_')) setDisplayName(uname.charAt(0).toUpperCase() + uname.slice(1));
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
    if (!ready || !authenticated) return;
    (async () => {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      fetch('/api/daily-notes/streak', { credentials: 'include', headers: authHeaders }).then(r => r.json()).then(d => setStreakCount(d.streak ?? 0)).catch(() => {});
    })();
  }, [ready, authenticated, getAccessToken]);

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
    (async () => {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (meData?.user) {
          setIsAuthenticated(true);
            const uname = meData.user.username;
          if (uname && !uname.startsWith('user_')) setDisplayName(uname.charAt(0).toUpperCase() + uname.slice(1));
          const res = await fetch('/api/ethereal-progress/all', { credentials: 'include', headers: authHeaders });
          if (res.ok) {
            const data = await res.json();
            setWeekStatuses(data.weeks);
          }
        }
      } catch {}
    })();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    if (displayName) return `Good ${timeOfDay}, ${displayName}`;
    return `Good ${timeOfDay}`;
  };

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
  const isReadingVideo = weekReading.imageUrl.endsWith('.mp4');
  const handleOpenReading = useCallback((index: number) => {
    const reading = WEEKLY_READINGS[index];
    if (reading?.slug === 'recovering-safety') {
      setReaderIndex(index);
      setIsWeekOneNovelOpen(true);
      return;
    }

    setReaderIndex(index);
    setIsReaderOpen(true);
  }, []);

  return (
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated}>
    <DailyReadPopup activeWeek={activeWeek} />
    <div className={styles.pageLayout}>
      <div className={styles.bgViz}><CyberpunkDataViz /></div>
      <SideNavigation />
      <main className={styles.content} onFocus={handleFocus}>

        {/* ===== GREETING + STREAK + LEADERBOARD (compact row) ===== */}
        <section className={`${styles.hero} ${isLoaded ? styles.heroLoaded : ''}`}>
          <div className={styles.heroLeft}>
            <p className={styles.greeting}>{getGreeting()}</p>
            <div className={styles.streakRow}>
              <span className={styles.streakNumber}>{streakCount}</span>
              <span className={styles.streakUnit}>day streak</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.topLeaderboard}
            onClick={() => { play('click'); setShowLeaderboard(true); }}
          >
            <div className={styles.topLeaderboardPodium}>
              {leaderboardLoading ? (
                [1, 2, 3].map(rank => (
                  <div
                    key={rank}
                    className={`${styles.podiumSlot} ${rank === 1 ? styles.podiumFirst : rank === 2 ? styles.podiumSecond : styles.podiumThird}`}
                  >
                    <div className={`${styles.podiumAvatarRing} ${styles.skeletonBlock}`}>
                      <div className={`${styles.podiumAvatar} ${styles.skeletonBlock}`} />
                    </div>
                    <span className={`${styles.podiumName} ${styles.skeletonText} ${styles.skeletonBlock}`} />
                  </div>
                ))
              ) : (
                leaderboard.slice(0, 3).map(u => (
                  <div key={u.rank} className={`${styles.podiumSlot} ${u.rank === 1 ? styles.podiumFirst : u.rank === 2 ? styles.podiumSecond : styles.podiumThird}`}>
                    <div className={styles.podiumAvatarRing}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.username} className={styles.podiumAvatarImg} />
                      ) : (
                        <div className={styles.podiumAvatar} style={{ background: avatarColor(u.username) }}>
                          {u.username[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                    <span className={styles.podiumName}>{u.username}</span>
                  </div>
                ))
              )}
            </div>
          </button>
        </section>

        {/* ===== MORNING PAGE CARD — inline on desktop, hidden on mobile (floats above bottom nav) ===== */}
        <div className={styles.morningPagesInline}>
          <DailyNotes enablePersistence={isAuthenticated} compact />
        </div>

        {/* ===== MORNING PAGE CARD — fixed above bottom nav on mobile ===== */}
        <div className={styles.morningPagesFloat}>
          <div className={styles.morningPagesGradient} />
          <DailyNotes enablePersistence={isAuthenticated} compact />
        </div>

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
              <>
                <span className={`${styles.weekLabel} ${styles.skeletonText} ${styles.skeletonBlock}`} />
                <span className={`${styles.weekTitle} ${styles.skeletonTextWide} ${styles.skeletonBlock}`} />
              </>
            ) : (
              <>
                <span className={styles.weekLabel}>WEEK {resolvedViewWeek}</span>
                <span className={styles.weekTitle}>{WEEK_TITLES[resolvedViewWeek]}</span>
              </>
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
                <div className={`${styles.readingMedia} ${styles.skeletonBlock}`} />
                <div className={styles.readingInfo}>
                  <span className={`${styles.readingCategory} ${styles.skeletonText} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingTitle} ${styles.skeletonTextWide} ${styles.skeletonBlock}`} />
                  <span className={`${styles.readingAuthor} ${styles.skeletonTextShort} ${styles.skeletonBlock}`} />
                </div>
              </div>
              <div className={styles.weekTasksSkeleton}>
                <div className={`${styles.weekTaskBar} ${styles.skeletonBlock}`} />
                <div className={`${styles.weekTaskPanel} ${styles.skeletonBlock}`} />
                <div className={`${styles.weekTaskPanel} ${styles.skeletonBlock}`} />
                <div className={`${styles.weekTaskButton} ${styles.skeletonBlock}`} />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.readingCard}
                onClick={() => { play('click'); handleOpenReading(Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1)); }}
                onMouseEnter={() => play('hover')}
              >
                <div className={styles.readingMedia}>
                  {isReadingVideo ? (
                    <video src={weekReading.imageUrl} autoPlay loop muted playsInline className={styles.readingImg} />
                  ) : (
                    <img src={weekReading.imageUrl} alt={weekReading.title} className={styles.readingImg} />
                  )}
                </div>
                <div className={styles.readingInfo}>
                  <span className={styles.readingCategory}>{weekReading.category}</span>
                  <span className={styles.readingTitle}>{weekReading.title}</span>
                  <span className={styles.readingAuthor}>{weekReading.author}</span>
                </div>
                <svg className={styles.readingArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

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
                <strong className={styles.modalTitle}>TOP ACADEMICS</strong>
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
                    <img src={u.avatarUrl} alt={u.username} className={styles.leagueAvatarImg} />
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

      <BookReaderModal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        title={currentReading.title}
        author={currentReading.author}
        markdownPath={currentReading.markdownPath}
        slug={currentReading.slug}
      />
      <WeekOneVisualNovel
        isOpen={isWeekOneNovelOpen}
        onClose={() => setIsWeekOneNovelOpen(false)}
      />
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />

    </div>
    </HomeWelcomeFlow>
  );
}
