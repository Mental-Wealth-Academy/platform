'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Cohort {
  id: string;
  title: string;
  detail: string;
  description: string;
  seats: number;
  shardReward: number;
}

const COHORTS: Cohort[] = [
  {
    id: 'make-art',
    title: 'Make Art Again',
    detail: '12 weeks // Zoom // Wednesdays',
    description: 'Morning pages, weekly calls, accountability partners.',
    seats: 12,
    shardReward: 200,
  },
  {
    id: 'clear-mind',
    title: 'Get Your Head Right',
    detail: '8 weeks // 1-on-1 // Saturdays',
    description: 'Patterns, triggers, emotional regulation.',
    seats: 8,
    shardReward: 150,
  },
  {
    id: 'ship-together',
    title: 'Build Something Real',
    detail: '6 weeks // Discord // Mondays',
    description: 'Governance, proposals, treasury. Hands-on.',
    seats: 16,
    shardReward: 300,
  },
  {
    id: 'write-daily',
    title: 'Write Every Day',
    detail: 'Ongoing // Async // Rolling',
    description: 'Daily prompts, peer feedback, voice notes.',
    seats: 24,
    shardReward: 100,
  },
];

const WISDOM_CARDS = [
  { quote: 'Perfectionism is procrastination in a three-piece suit.', source: 'The Courage to Ship', week: 'Week 3' },
  { quote: 'There is a limit to how much light you will let in, and you built that limit yourself.', source: 'Recovering Possibility', week: 'Week 5' },
  { quote: 'Your emotions are messengers, not enemies.', source: 'Emotional Intelligence', week: 'Week 2' },
  { quote: 'The creative process is not a lightning bolt. It is a slow burn.', source: 'How to Make Something Great', week: 'Week 8' },
  { quote: 'Going sane feels just like going crazy at first.', source: 'Going Sane', week: 'Week 2' },
  { quote: 'Every great thing is defined by what its maker had the courage to leave out.', source: 'Creative Curation', week: 'Week 11' },
  { quote: 'When you know where your money goes, you know where your energy goes.', source: 'Counting', week: 'Week 6' },
  { quote: 'Anger is a map. It shows you where your boundaries are.', source: 'The Virtue Trap', week: 'Week 3' },
  { quote: 'Presence is a practice, not a destination.', source: 'Mindfulness', week: 'Week 9' },
  { quote: 'Your own healing is the greatest message of hope for others.', source: 'Creative Recovery', week: 'Week 1' },
  { quote: 'Your artist, like a small child, is happiest when feeling safe. Protect it.', source: 'Creative Safety', week: 'Week 1' },
  { quote: 'What would you try if it weren\'t too crazy?', source: 'Forbidden Joys', week: 'Week 5' },
];

const CHARACTER_IMAGES = [
  '/images/courses-1.png',
  '/images/courses-2.png',
  '/images/courses-4.png',
];

const AUTO_INTERVAL = 5000;

export default function CoursesPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');
  const [joinedCohorts, setJoinedCohorts] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [shardToast, setShardToast] = useState<{ amount: number; id: string } | null>(null);
  const [blueReact, setBlueReact] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const { play } = useSound();
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => { requestAnimationFrame(() => setIsLoaded(true)); }, []);

  // Cycle character images
  useEffect(() => {
    const timer = setInterval(() => {
      setCharIndex(i => (i + 1) % CHARACTER_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const resetAuto = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      setSwipeAnim('left');
      setTimeout(() => { setCurrentCardIndex(i => (i + 1) % WISDOM_CARDS.length); setSwipeAnim('none'); }, 150);
    }, AUTO_INTERVAL);
  }, []);

  useEffect(() => { resetAuto(); return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); }; }, [resetAuto]);

  const goCard = (dir: 'prev' | 'next') => {
    resetAuto();
    setSwipeAnim(dir === 'next' ? 'left' : 'right');
    setTimeout(() => {
      setCurrentCardIndex(i => dir === 'next' ? (i + 1) % WISDOM_CARDS.length : (i === 0 ? WISDOM_CARDS.length - 1 : i - 1));
      setSwipeAnim('none');
    }, 150);
    play('click');
  };

  const jumpCard = (i: number) => {
    resetAuto();
    setSwipeAnim(i > currentCardIndex ? 'left' : 'right');
    setTimeout(() => { setCurrentCardIndex(i); setSwipeAnim('none'); }, 150);
    play('click');
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; isSwiping.current = true; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goCard(diff > 0 ? 'next' : 'prev');
  };

  const handleJoin = (cohort: Cohort) => {
    if (joinedCohorts.has(cohort.id) || joiningId) return;

    setJoiningId(cohort.id);
    play('click');

    // Blue reacts
    setBlueReact(true);
    setTimeout(() => setBlueReact(false), 1200);

    // Simulate join confirmation
    setTimeout(() => {
      setJoinedCohorts(prev => new Set(prev).add(cohort.id));
      setJoiningId(null);

      // Shard reward toast
      setShardToast({ amount: cohort.shardReward, id: cohort.id });
      setTimeout(() => setShardToast(null), 2500);
    }, 600);
  };

  const w = WISDOM_CARDS[currentCardIndex];

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>

        {/* Character + Surface side-by-side */}
        <div className={styles.splitLayout}>

          {/* Blue character panel */}
          <div className={`${styles.characterPanel} ${isLoaded ? styles.loaded : ''} ${blueReact ? styles.blueReact : ''}`}>
            <div className={styles.characterWrap}>
              {CHARACTER_IMAGES.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt="Blue"
                  fill
                  className={styles.characterImage}
                  style={{ opacity: i === charIndex ? 1 : 0 }}
                  unoptimized
                  priority={i === 0}
                />
              ))}
              <div className={styles.characterGlow} />
            </div>
          </div>

          {/* Surface panel */}
          <div className={`${styles.surface} ${isLoaded ? styles.loaded : ''}`}>

            {/* Header */}
            <div className={styles.header}>
              <h1 className={styles.pageTitle}>Courses</h1>
              <p className={styles.pageSub}>Learn with people, not just screens.</p>
            </div>

          {/* Wisdom notecard */}
          <div className={styles.wisdomSection}>
            <div
              className={`${styles.wisdomWrap} ${swipeAnim === 'left' ? styles.swipeLeft : swipeAnim === 'right' ? styles.swipeRight : ''}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.wisdomCard}>
                <blockquote className={styles.wisdomQuote}>{w.quote}</blockquote>
                <div className={styles.wisdomFoot}>
                  <span className={styles.wisdomSource}>{w.source}</span>
                  <span className={styles.wisdomWeek}>{w.week}</span>
                </div>
              </div>
            </div>
            <div className={styles.wisdomControls}>
              <button className={styles.wisdomArrow} onClick={() => goCard('prev')} onMouseEnter={() => play('hover')} type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className={styles.wisdomDots}>
                {WISDOM_CARDS.map((_, i) => (
                  <button key={i} className={`${styles.dot} ${i === currentCardIndex ? styles.dotActive : ''}`} onClick={() => jumpCard(i)} type="button" />
                ))}
              </div>
              <button className={styles.wisdomArrow} onClick={() => goCard('next')} onMouseEnter={() => play('hover')} type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          {/* Cohort grid */}
          <div className={styles.cohortGrid}>
            {COHORTS.map((c, i) => {
              const isJoined = joinedCohorts.has(c.id);
              const isJoining = joiningId === c.id;
              return (
                <button
                  key={c.id}
                  className={`${styles.cohortCard} ${isJoined ? styles.cohortJoined : ''} ${isJoining ? styles.cohortJoining : ''}`}
                  onClick={() => handleJoin(c)}
                  onMouseEnter={() => play('hover')}
                  type="button"
                  style={{ animationDelay: `${i * 60}ms` }}
                  disabled={isJoined}
                >
                  <div className={styles.cardGlow} />
                  <h2 className={styles.cohortTitle}>{c.title}</h2>
                  <p className={styles.cohortDesc}>{c.description}</p>
                  <span className={styles.cohortDetail}>{c.detail}</span>
                  <div className={styles.cohortFooter}>
                    <span className={styles.cohortSeats}>{c.seats} seats</span>
                    <span className={isJoined ? styles.cohortJoinedBadge : styles.cohortJoin}>
                      {isJoining ? 'Joining...' : isJoined ? 'Joined' : 'Join'}
                    </span>
                  </div>
                  {isJoined && (
                    <div className={styles.joinedCheck}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Shard reward toast */}
          {shardToast && (
            <div className={styles.shardToast}>
              <Image src="/icons/ui-shard.svg" alt="" width={16} height={16} />
              <span>+{shardToast.amount} shards earned</span>
            </div>
          )}

          </div>
        </div>
      </main>
    </div>
  );
}
