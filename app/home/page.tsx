'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import BookReaderModal from '@/components/book-reader/BookReaderModal';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import DailyRead from '@/components/daily-read/DailyRead';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
  sealTxHash: string | null;
}


const WEEKLY_READINGS = [
  { title: 'Art is a Spiritual Warfare', author: 'By: Jhinova Bay, PhD', description: 'This week initiates your creative recovery.', category: 'Introduction', imageUrl: 'https://i.imgur.com/KkpN9as.png', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md' },
  { title: 'Recovering a Sense of Safety', author: 'By: Jhinova Bay, PhD', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: 'https://i.imgur.com/JKJwkEp.png', slug: 'recovering-safety', markdownPath: '/readings/recovering-safety.md' },
  { title: 'The Electric Universe', author: 'By: Jhinova Bay, PhD', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: 'https://i.imgur.com/RO4dvel.png', slug: 'electric-universe', markdownPath: '/readings/electric-universe.md' },
  { title: 'The Micro University', author: 'By: Jhinova Bay, PhD', description: '500 seats, 12 weeks, one treasury. How small sovereign communities outlearn institutions.', category: 'Week 3', imageUrl: 'https://i.imgur.com/HQfzBXM.png', slug: 'micro-university', markdownPath: '/readings/micro-university.md' },
  { title: 'Recovering a Sense of Integrity', author: 'By: Jhinova Bay, PhD', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: 'https://i.imgur.com/lY3qO5z.png', slug: 'recovering-integrity', markdownPath: '/readings/recovering-integrity.md' },
  { title: 'Recovering a Sense of Possibility', author: 'By: Jhinova Bay, PhD', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: 'https://i.imgur.com/UB0u63C.png', slug: 'recovering-possibility', markdownPath: '/readings/recovering-possibility.md' },
  { title: 'Recovering a Sense of Abundance', author: 'By: Jhinova Bay, PhD', description: 'Scarcity is a story. Rewrite it. True abundance flows from creative alignment.', category: 'Week 6', imageUrl: 'https://i.imgur.com/IdPxQ2A.png', slug: 'recovering-abundance', markdownPath: '/readings/recovering-abundance.md' },
  { title: 'Recovering a Sense of Connection', author: 'By: Jhinova Bay, PhD', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: 'https://i.imgur.com/Gcr3GcK.png', slug: 'recovering-connection', markdownPath: '/readings/recovering-connection.md' },
  { title: 'Recovering a Sense of Strength', author: 'By: Jhinova Bay, PhD', description: 'Surviving loss of faith. The creative life demands resilience — this week you build it.', category: 'Week 8', imageUrl: 'https://i.imgur.com/Jk7FZeL.png', slug: 'recovering-strength', markdownPath: '/readings/recovering-strength.md' },
  { title: 'Recovering a Sense of Compassion', author: 'By: Jhinova Bay, PhD', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: 'https://i.imgur.com/EPifdzE.png', slug: 'recovering-compassion', markdownPath: '/readings/recovering-compassion.md' },
  { title: 'Recovering a Sense of Self-Protection', author: 'By: Jhinova Bay, PhD', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: 'https://i.imgur.com/8Dume59.png', slug: 'recovering-self-protection', markdownPath: '/readings/recovering-self-protection.md' },
  { title: 'Recovering a Sense of Autonomy', author: 'By: Jhinova Bay, PhD', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: 'https://i.imgur.com/Dgzl1D3.png', slug: 'recovering-autonomy', markdownPath: '/readings/recovering-autonomy.md' },
  { title: 'Recovering a Sense of Faith', author: 'By: Jhinova Bay, PhD', description: 'Trust the path. Faith is what remains when the evidence hasn\'t arrived yet.', category: 'Week 12', imageUrl: 'https://i.imgur.com/P2Si3rR.png', slug: 'recovering-faith', markdownPath: '/readings/recovering-faith.md' },
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
  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

  // Fetch season info (universal timer)
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

  // Check auth first, then fetch week statuses only if authenticated
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (!meData?.user) return;

        setIsAuthenticated(true);
        const uname = meData.user.username;
        if (uname && !uname.startsWith('user_')) setDisplayName(uname.charAt(0).toUpperCase() + uname.slice(1));
        const res = await fetch('/api/ethereal-progress/all', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setWeekStatuses(data.weeks);
        }
      } catch {
        // Not authenticated — use empty defaults
      }
    })();
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

  const sealedCount = weekStatuses.filter(w => w.isSealed && w.weekNumber >= 1 && w.weekNumber <= 12).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    if (displayName) return `Good ${timeOfDay}, ${displayName}`;
    return `Good ${timeOfDay}`;
  };

  const getProgressDesc = () => {
    if (sealedCount === 0) return 'Your journey starts here... It may seem long, but so did everything in the beginning.';
    if (sealedCount <= 3) return `${sealedCount} week${sealedCount > 1 ? 's' : ''} sealed. You're building momentum. Keep showing up.`;
    if (sealedCount <= 6) return `${sealedCount} weeks down. You're past the point where most people quit. That says something.`;
    if (sealedCount <= 9) return `${sealedCount} weeks sealed. Your brain is literally rewiring itself right now. Stay with it.`;
    if (sealedCount <= 11) return `${sealedCount} weeks. You can see the finish line. Don't coast. The last stretch matters most.`;
    return 'All 12 weeks sealed. You did the work. Every milestone, permanently on Base.';
  };

  const handleWelcomeAuthenticated = useCallback(() => {
    // Re-fetch auth state after onboarding completes
    (async () => {
      try {
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (meData?.user) {
          setIsAuthenticated(true);
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

  return (
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated}>
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content} onFocus={handleFocus}>
            {/* Aquarium Pill */}
            <div className={`${styles.heroPill} ${isLoaded ? styles.heroPillLoaded : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.imgur.com/ACKcust.gif"
                alt="Aquarium"
                className={styles.heroPillGif}
              />
            </div>

            {/* 12-Week Timeline */}
            <div className={`${styles.calendarSection} ${isLoaded ? styles.calendarSectionLoaded : ''}`}>
              <div className={styles.journalHeader}>
                <span className={styles.courseLabel}>DIVINE WORK</span>
                <h2 className={styles.courseTitle}>{getGreeting()}</h2>
                <p className={styles.courseDesc}>
                  {getProgressDesc()}
                </p>
              </div>
              <div className={styles.timeline}>
                <div className={styles.timelineTrack}>
                  <div
                    className={styles.timelineFill}
                    style={{ width: `${(weekStatuses.filter(w => w.isSealed && w.weekNumber > 0 && w.weekNumber < WEEK_TITLES.length - 1).length / (WEEK_TITLES.length - 2)) * 100}%` }}
                  />
                </div>
                <div className={styles.timelineMarkers}>
                  {WEEK_TITLES.map((title, i) => {
                    if (i === 0 || i === WEEK_TITLES.length - 1) return null;
                    const status = getWeekStatus(i);
                    const isSealed = status?.isSealed ?? false;
                    return (
                      <div key={i} className={styles.timelineMarker} title={title}>
                        <div className={`${styles.timelineDot} ${isSealed ? styles.timelineDotSealed : ''}`}>
                          {isSealed && <span className={styles.timelineDotCheck}>&#10003;</span>}
                        </div>
                        <span className={styles.timelineLabel}>{i}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Journal Section */}
            <div className={`${styles.journalSection} ${isLoaded ? styles.journalSectionLoaded : ''}`}>
              <div className={styles.journalCards}>
                <DailyRead
                  readings={WEEKLY_READINGS}
                  onReadClick={(index) => { setReaderIndex(index); setIsReaderOpen(true); }}
                />
                <DailyNotes enablePersistence={isAuthenticated} />
                <hr className={styles.sectionDivider} />
                {WEEK_TITLES.map((title, i) => {
                  if (i === 0 || i === WEEK_TITLES.length - 1) return null;
                  const status = getWeekStatus(i);
                  const isLocked = seasonActive && i > activeWeek;
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
            </div>


            {/* Course Banner */}
            <div className={`${styles.courseBanner} ${isLoaded ? styles.courseIntroLoaded : ''}`}>
              <Image
                src="https://i.imgur.com/ckhi8jC.jpeg"
                alt="Discover Your Ethereal Horizon"
                width={900}
                height={240}
                className={styles.courseBannerImg}
                unoptimized
              />
            </div>
      </main>
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
