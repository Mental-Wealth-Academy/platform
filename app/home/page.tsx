'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import BookReaderModal from '@/components/book-reader/BookReaderModal';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import WeekTasksView from '@/components/week-tasks/WeekTasksView';
import DailyReadPopup from '@/components/daily-read/DailyReadPopup';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
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
  { title: 'Art is a Spiritual Warfare', author: 'By: Jhinova Bay, PhD', description: 'This week initiates your creative recovery.', category: 'Introduction', imageUrl: 'https://i.imgur.com/KkpN9as.png', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md' },
  { title: 'Recovering a Sense of Safety', author: 'By: Jhinova Bay, PhD', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: 'https://i.imgur.com/sRcnrJB.mp4', slug: 'recovering-safety', markdownPath: '/readings/recovering-safety.md' },
  { title: 'Awaken The Creativity Sleeping Inside You', author: 'By: Jhinova Bay, PhD', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: 'https://i.imgur.com/0gghyGS.jpeg', slug: 'week-two', markdownPath: '/readings/week-two.md' },
  { title: 'The Absolute', author: 'By: Jhinova Bay, PhD', description: '500 seats, 12 weeks, one treasury. How small sovereign communities outlearn institutions.', category: 'Week 3', imageUrl: 'https://i.imgur.com/MMb9MTw.png', slug: 'micro-university', markdownPath: '/readings/micro-university.md' },
  { title: 'Oblivious Horizon', author: 'By: Jhinova Bay, PhD', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: 'https://i.imgur.com/sRNfQyg.png', slug: 'recovering-integrity', markdownPath: '/readings/recovering-integrity.md' },
  { title: 'Recovering a Sense of Possibility', author: 'By: Jhinova Bay, PhD', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: 'https://i.imgur.com/rHLvipb.mp4', slug: 'recovering-possibility', markdownPath: '/readings/recovering-possibility.md' },
  { title: 'Recovering a Sense of Abundance', author: 'By: Jhinova Bay, PhD', description: 'Scarcity is a story. Rewrite it. True abundance flows from creative alignment.', category: 'Week 6', imageUrl: 'https://i.imgur.com/DqnZ4P5.jpeg', slug: 'recovering-abundance', markdownPath: '/readings/recovering-abundance.md' },
  { title: 'Recovering a Sense of Connection', author: 'By: Jhinova Bay, PhD', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: 'https://i.imgur.com/Nk7ppHa.mp4', slug: 'recovering-connection', markdownPath: '/readings/recovering-connection.md' },
  { title: 'Recovering a Sense of Strength', author: 'By: Jhinova Bay, PhD', description: 'Surviving loss of faith. The creative life demands resilience — this week you build it.', category: 'Week 8', imageUrl: 'https://i.imgur.com/6x026dv.jpeg', slug: 'recovering-strength', markdownPath: '/readings/recovering-strength.md' },
  { title: 'Recovering a Sense of Compassion', author: 'By: Jhinova Bay, PhD', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: 'https://i.imgur.com/Wiv0PnM.png', slug: 'recovering-compassion', markdownPath: '/readings/recovering-compassion.md' },
  { title: 'Recovering a Sense of Self-Protection', author: 'By: Jhinova Bay, PhD', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: 'https://i.imgur.com/86MQLAz.jpeg', slug: 'recovering-self-protection', markdownPath: '/readings/recovering-self-protection.md' },
  { title: 'Recovering a Sense of Autonomy', author: 'By: Jhinova Bay, PhD', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: 'https://i.imgur.com/RAs9HJk.png', slug: 'recovering-autonomy', markdownPath: '/readings/recovering-autonomy.md' },
  { title: 'Recovering a Sense of Faith', author: 'By: Jhinova Bay, PhD', description: 'Trust the path. Faith is what remains when the evidence hasn\'t arrived yet.', category: 'Week 12', imageUrl: 'https://i.imgur.com/Gd2fbry.png', slug: 'recovering-faith', markdownPath: '/readings/recovering-faith.md' },
];

const WEEK_TITLES = [
  'Introduction', 'Safety', 'Identity', 'Power', 'Integrity',
  'Possibility', 'Abundance', 'Connection', 'Strength',
  'Compassion', 'Protection', 'Autonomy', 'Faith', 'Epilogue',
];

export default function HomePage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [isLoaded, setIsLoaded] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerIndex, setReaderIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [viewWeek, setViewWeek] = useState<number>(1);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [seasonActive, setSeasonActive] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');
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
      .catch(() => {});
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
    fetch('/api/leaderboard').then(r => r.json()).then(d => setLeaderboard(d.users ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    (async () => {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      fetch('/api/daily-notes/streak', { credentials: 'include', headers: authHeaders }).then(r => r.json()).then(d => setStreakCount(d.streak ?? 0)).catch(() => {});
    })();
  }, [ready, authenticated, getAccessToken]);

  const handleSealComplete = useCallback((weekNumber: number, txHash: string) => {
    setWeekStatuses(prev =>
      prev.map(w => w.weekNumber === weekNumber ? { ...w, isSealed: true, sealTxHash: txHash } : w)
    );
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
    const diff = touchStartX.current - touchCurrentX.current;
    const threshold = 60;

    if (diff > threshold && viewWeek < 12) {
      setSwipeAnim('left');
      setTimeout(() => {
        setViewWeek(w => w + 1);
        setSwipeAnim('none');
      }, 150);
      play('click');
    } else if (diff < -threshold && viewWeek > 1) {
      setSwipeAnim('right');
      setTimeout(() => {
        setViewWeek(w => w - 1);
        setSwipeAnim('none');
      }, 150);
      play('click');
    }
  };

  const goToWeek = (dir: 'prev' | 'next') => {
    if (dir === 'next' && viewWeek < 12) {
      setSwipeAnim('left');
      setTimeout(() => { setViewWeek(w => w + 1); setSwipeAnim('none'); }, 150);
      play('click');
    } else if (dir === 'prev' && viewWeek > 1) {
      setSwipeAnim('right');
      setTimeout(() => { setViewWeek(w => w - 1); setSwipeAnim('none'); }, 150);
      play('click');
    }
  };

  const weekReading = WEEKLY_READINGS[Math.min(viewWeek, WEEKLY_READINGS.length - 1)];
  const isReadingVideo = weekReading.imageUrl.endsWith('.mp4');

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
              {(leaderboard.length > 0 ? leaderboard.slice(0, 3) : [
                { rank: 1, username: '---', avatarUrl: null, shards: 0 },
                { rank: 2, username: '---', avatarUrl: null, shards: 0 },
                { rank: 3, username: '---', avatarUrl: null, shards: 0 },
              ]).map(u => (
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
              ))}
            </div>
          </button>
        </section>

        {/* ===== MORNING PAGE CARD ===== */}
        <DailyNotes enablePersistence={isAuthenticated} compact />

        {/* ===== WEEK HEADER ===== */}
        <div className={styles.weekHeader}>
          <button
            className={styles.weekArrow}
            onClick={() => goToWeek('prev')}
            onMouseEnter={() => play('hover')}
            disabled={viewWeek <= 1}
            aria-label="Previous week"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className={styles.weekHeaderCenter}>
            <span className={styles.weekLabel}>WEEK {viewWeek}</span>
            <span className={styles.weekTitle}>{WEEK_TITLES[viewWeek]}</span>
          </div>
          <button
            className={styles.weekArrow}
            onClick={() => goToWeek('next')}
            onMouseEnter={() => play('hover')}
            disabled={viewWeek >= 12}
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
                className={`${styles.weekDot} ${w === viewWeek ? styles.weekDotActive : ''} ${status?.isSealed ? styles.weekDotSealed : ''}`}
                onClick={() => { play('click'); setViewWeek(w); }}
                title={`Week ${w}: ${WEEK_TITLES[w]}`}
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
          {/* Reading Card */}
          <button
            type="button"
            className={styles.readingCard}
            onClick={() => { play('click'); setReaderIndex(Math.min(viewWeek, WEEKLY_READINGS.length - 1)); setIsReaderOpen(true); }}
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

          {/* Task Cards */}
          <WeekTasksView
            key={viewWeek}
            weekNumber={viewWeek}
            enablePersistence={isAuthenticated}
            isLocked={viewWeek > activeWeek}
            initialIsSealed={getWeekStatus(viewWeek)?.isSealed}
            initialSealTxHash={getWeekStatus(viewWeek)?.sealTxHash}
            onSealComplete={handleSealComplete}
          />
        </div>

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
              {leaderboard.map(u => (
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
              {leaderboard.length === 0 && (
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

    </div>
    </HomeWelcomeFlow>
  );
}
