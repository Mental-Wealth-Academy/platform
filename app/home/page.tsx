'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import BookReaderModal from '@/components/book-reader/BookReaderModal';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import WeeklyRead from '@/components/daily-read/DailyRead';
import DailyReadPopup from '@/components/daily-read/DailyReadPopup';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

type ActivityCard = 'daily' | 'weekly' | 'tasks';

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
  'Introduction: Reading',
  'Recovering a Sense of Safety',
  'Recovering a Sense of Identity',
  'Recovering a Sense of Power',
  'Recovering a Sense of Integrity',
  'Recovering a Sense of Possibility',
  'Recovering a Sense of Abundance',
  'Recovering a Sense of Connection',
  'Recovering a Sense of Strength',
  'Recovering a Sense of Compassion',
  'Recovering a Sense of Self-Protection',
  'Recovering a Sense of Autonomy',
  'Recovering a Sense of Faith',
  'Epilogue',
];

// Labels for the 5-day streak display (last 5 days, dynamically computed)
function getStreakDayLabels(): string[] {
  const labels: string[] = [];
  const dayNames = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];
  const today = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(dayNames[d.getDay()]);
  }
  return labels;
}

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerIndex, setReaderIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [seasonActive, setSeasonActive] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [shardCount, setShardCount] = useState(0);
  const [activeCard, setActiveCard] = useState<ActivityCard>('daily');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [streakDays, setStreakDays] = useState<boolean[]>([false, false, false, false, false]);
  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];
  const streakLabels = getStreakDayLabels();

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    fetch('/api/season', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setActiveWeek(data.currentWeek ?? 0);
        setWeekEndsAt(data.weekEndsAt ?? null);
        setSeasonActive(data.seasonActive ?? false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (!meData?.user) return;

        setIsAuthenticated(true);
        setShardCount(meData.user.shardCount ?? 0);
        const uname = meData.user.username;
        if (uname && !uname.startsWith('user_')) setDisplayName(uname.charAt(0).toUpperCase() + uname.slice(1));
        const res = await fetch('/api/ethereal-progress/all', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setWeekStatuses(data.weeks);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data.users ?? []))
      .catch(() => {});
    fetch('/api/daily-notes/streak', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStreakCount(data.streak ?? 0);
        if (Array.isArray(data.completedDays)) setStreakDays(data.completedDays);
      })
      .catch(() => {});
  }, []);

  const handleSealComplete = useCallback((weekNumber: number, txHash: string) => {
    setWeekStatuses(prev =>
      prev.map(w =>
        w.weekNumber === weekNumber ? { ...w, isSealed: true, sealTxHash: txHash } : w
      )
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
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (meData?.user) {
          setIsAuthenticated(true);
          setShardCount(meData.user.shardCount ?? 0);
          const uname = meData.user.username;
          if (uname && !uname.startsWith('user_')) setDisplayName(uname.charAt(0).toUpperCase() + uname.slice(1));
          const res = await fetch('/api/ethereal-progress/all', { credentials: 'include' });
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

  const weekReading = WEEKLY_READINGS[Math.min(activeWeek, WEEKLY_READINGS.length - 1)];
  const weekTitle = activeWeek > 0 && activeWeek <= 12 ? WEEK_TITLES[activeWeek] : WEEK_TITLES[0];

  // Avatar color from initial
  const avatarColor = (name: string) => {
    const colors = ['#5168FF', '#E85D3A', '#62BE8F', '#9B7ED9', '#F5A623'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated}>
    <DailyReadPopup activeWeek={activeWeek} />
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content} onFocus={handleFocus}>
        <h2 className={`${styles.greeting} ${isLoaded ? styles.greetingLoaded : ''}`}>{getGreeting()}</h2>

        <div className={styles.twoCol}>
          {/* ===== LEFT COLUMN ===== */}
          <div className={`${styles.leftCol} ${isLoaded ? styles.leftColLoaded : ''}`}>

            {/* Streak Card */}
            <div className={styles.streakCard}>
              <div className={styles.streakHeader}>
                <span className={styles.streakNumber}>{streakCount}</span>
                <Image src="/icons/shard.svg" alt="Shards" width={22} height={22} />
              </div>
              <p className={styles.streakSubtext}>
                {streakCount === 0 ? 'Write daily to start a streak' : `${streakCount} day streak`}
              </p>
              <div className={styles.streakDays}>
                {streakLabels.map((day, i) => (
                  <div key={`${day}-${i}`} className={styles.streakDay}>
                    <div className={`${styles.streakDot} ${streakDays[i] ? styles.streakDotActive : ''}`}>
                      {streakDays[i] && (
                        <Image src="/icons/shard.svg" alt="" width={16} height={16} />
                      )}
                    </div>
                    <span className={styles.streakDayLabel}>{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium CTA */}
            <div className={styles.premiumCard}>
              <div className={styles.premiumInner}>
                <div className={styles.premiumText}>
                  <strong>Unlock all learning with Premium</strong>
                  <span>to get smarter, faster</span>
                </div>
                <Link href="/community#angels" className={styles.premiumCta}>
                  Explore Premium
                </Link>
              </div>
            </div>

            {/* Mini Leaderboard */}
            <div
              className={styles.leagueCard}
              onClick={() => { play('click'); setShowLeaderboard(true); }}
            >
              <div className={styles.leagueHeader}>
                <Image src="/icons/shard.svg" alt="" width={20} height={20} />
                <div>
                  <strong className={styles.leagueTitle}>IVY LEAGUE</strong>
                  <span className={styles.leagueSub}>
                    {seasonActive ? `Week ${activeWeek} of 12` : 'Season inactive'}
                  </span>
                </div>
              </div>
              <div className={styles.leagueList}>
                {(leaderboard.length > 0 ? leaderboard.slice(0, 3) : [
                  { rank: 1, username: '---', avatarUrl: null, shards: 0 },
                  { rank: 2, username: '---', avatarUrl: null, shards: 0 },
                  { rank: 3, username: '---', avatarUrl: null, shards: 0 },
                ]).map(u => (
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
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className={`${styles.rightCol} ${isLoaded ? styles.rightColLoaded : ''}`}>

            {/* Expressive Activity Card */}
            <div className={styles.activityCard}>
              {activeCard === 'daily' && (
                <>
                  <span className={styles.activityBadge}>DAILY</span>
                  <h1 className={styles.activityTitle}>Morning Pages</h1>
                  <p className={styles.activityTopic}>15 minutes of freewriting</p>
                  <div className={styles.stickerWrap}>
                    <Image src="/azura-sticker.png" alt="Azura" width={160} height={160} className={styles.sticker} unoptimized />
                  </div>
                  <button
                    className={styles.activityCta}
                    onClick={() => {
                      play('click');
                      // Scroll to the DailyNotes below
                      document.getElementById('activity-content')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Start Writing
                  </button>
                </>
              )}

              {activeCard === 'weekly' && (
                <>
                  <span className={styles.activityBadge}>WEEKLY</span>
                  <h1 className={styles.activityTitle}>{weekReading.title}</h1>
                  <p className={styles.activityTopic}>{weekTitle}</p>
                  <div className={styles.stickerWrap}>
                    <Image src="/azura-sticker.png" alt="Azura" width={160} height={160} className={styles.sticker} unoptimized />
                  </div>
                  <button
                    className={styles.activityCta}
                    onClick={() => {
                      play('click');
                      setReaderIndex(Math.min(activeWeek, WEEKLY_READINGS.length - 1));
                      setIsReaderOpen(true);
                    }}
                  >
                    Start Reading
                  </button>
                </>
              )}

              {activeCard === 'tasks' && (
                <>
                  <span className={styles.activityBadge}>WEEKLY</span>
                  <h1 className={styles.activityTitle}>Journal</h1>
                  <p className={styles.activityTopic}>{weekTitle}</p>
                  <div className={styles.stickerWrap}>
                    <Image src="/azura-sticker.png" alt="Azura" width={160} height={160} className={styles.sticker} unoptimized />
                  </div>
                  <button
                    className={styles.activityCta}
                    onClick={() => {
                      play('click');
                      document.getElementById('activity-content')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Open Journal
                  </button>
                </>
              )}

              {/* Tab buttons */}
              <div className={styles.cardTabs}>
                {(['daily', 'weekly', 'tasks'] as ActivityCard[]).map(tab => (
                  <button
                    key={tab}
                    className={`${styles.cardTab} ${activeCard === tab ? styles.cardTabActive : ''}`}
                    onClick={() => { play('click'); setActiveCard(tab); }}
                  >
                    {tab === 'daily' ? 'Notes' : tab === 'weekly' ? 'Read' : 'Journal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Embedded content below card */}
            <div id="activity-content" className={styles.activityContent}>
              {activeCard === 'daily' && (
                <DailyNotes enablePersistence={isAuthenticated} />
              )}

              {activeCard === 'weekly' && (
                <WeeklyRead
                  readings={WEEKLY_READINGS}
                  onReadClick={(index) => { setReaderIndex(index); setIsReaderOpen(true); }}
                  activeWeek={activeWeek}
                />
              )}

              {activeCard === 'tasks' && (
                <div className={styles.journalCards}>
                  {WEEK_TITLES.map((title, i) => {
                    if (i === 0 || i === WEEK_TITLES.length - 1) return null;
                    const status = getWeekStatus(i);
                    const isLocked = i > activeWeek;
                    return (
                      <AccordionJournalCard
                        key={i}
                        weekNumber={i}
                        weekTitle={title}
                        initialIsSealed={status?.isSealed}
                        initialSealTxHash={status?.sealTxHash}
                        onSealComplete={handleSealComplete}
                        enablePersistence={isAuthenticated}
                        isLocked={isLocked}
                        weekEndsAt={i === activeWeek ? weekEndsAt : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className={styles.modalOverlay} onClick={() => setShowLeaderboard(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowLeaderboard(false)}>&times;</button>
            <div className={styles.modalHeader}>
              <Image src="/icons/shard.svg" alt="" width={28} height={28} />
              <div>
                <strong className={styles.modalTitle}>IVY LEAGUE</strong>
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
