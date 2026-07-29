'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import BlueDialogue from '@/components/blue-dialogue/BlueDialogue';
import WeekTasksView from '@/components/week-tasks/WeekTasksView';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import MobileSplash from '@/components/mobile-splash/MobileSplash';
import CourseTour from '@/components/feature-tour/CourseTour';
import { useSound } from '@/hooks/useSound';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import styles from './page.module.css';

const TexturedBackground = dynamic(() => import('@/components/textured-background/TexturedBackground'), {
  ssr: false,
  loading: () => null,
});
const BookReaderModal = dynamic(() => import('@/components/book-reader/BookReaderModal'), {
  ssr: false,
});

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
  sealTxHash: string | null;
}

const WEEKLY_READINGS = [
  { title: 'Art as Creative Practice', author: 'Blue', description: 'This week introduces the habits behind creative recovery.', category: 'Introduction', imageUrl: 'https://i.imgur.com/KkpN9as.png', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md' },
  { title: 'A Sense of Safety', author: 'Blue', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: '/stories/week-01/creative-recovery-butterflies.png', slug: 'sense-of-safety', markdownPath: '/readings/sense-of-safety.md' },
  { title: 'A Sense of Identity', author: 'Blue', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: '/stories/week-01/blue-research-log.png', slug: 'sense-of-identity', markdownPath: '/readings/sense-of-identity.md' },
  { title: 'A Sense of Power', author: 'Blue', description: 'Anger, shame, and useful signals surface here. This week asks you to reclaim your power and act on it.', category: 'Week 3', imageUrl: '/stories/week-01/shadow-breaking-free.png', slug: 'sense-of-power', markdownPath: '/readings/sense-of-power.md' },
  { title: 'A Sense of Integrity', author: 'Blue', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: '/stories/week-01/shadow-breaking-free.png', slug: 'sense-of-integrity', markdownPath: '/readings/sense-of-integrity.md' },
  { title: 'A Sense of Possibility', author: 'Blue', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: '/stories/week-01/trapped-shade-chamber.png', slug: 'sense-of-possibility', markdownPath: '/readings/sense-of-possibility.md' },
  { title: 'A Sense of Abundance', author: 'Blue', description: 'Study the money stories shaping your creative choices, then test better ones.', category: 'Week 6', imageUrl: 'https://i.imgur.com/DqnZ4P5.jpeg', slug: 'sense-of-abundance', markdownPath: '/readings/sense-of-abundance.md' },
  { title: 'A Sense of Connection', author: 'Blue', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: '/stories/week-01/healer-creative-reflection.png', slug: 'sense-of-connection', markdownPath: '/readings/sense-of-connection.md' },
  { title: 'A Sense of Strength', author: 'Blue', description: 'Surviving discouragement. The creative life demands resilience, and this week you build it.', category: 'Week 8', imageUrl: 'https://i.imgur.com/6x026dv.jpeg', slug: 'sense-of-strength', markdownPath: '/readings/sense-of-strength.md' },
  { title: 'A Sense of Compassion', author: 'Blue', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: 'https://i.imgur.com/Wiv0PnM.png', slug: 'sense-of-compassion', markdownPath: '/readings/sense-of-compassion.md' },
  { title: 'A Sense of Self-Protection', author: 'Blue', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: 'https://i.imgur.com/86MQLAz.jpeg', slug: 'sense-of-self-protection', markdownPath: '/readings/sense-of-self-protection.md' },
  { title: 'A Sense of Autonomy', author: 'Blue', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: 'https://i.imgur.com/RAs9HJk.png', slug: 'sense-of-autonomy', markdownPath: '/readings/sense-of-autonomy.md' },
  { title: 'A Sense of Trust', author: 'Blue', description: 'Choose the next concrete action before the full outcome is visible.', category: 'Week 12', imageUrl: 'https://i.imgur.com/Gd2fbry.png', slug: 'sense-of-faith', markdownPath: '/readings/sense-of-faith.md' },
];

function parseMarkdownSimple(md: string): string {
  let html = md
    .replace(/^---$/gm, '<hr />')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.split('\n\n').map(p => {
    const t = p.trim();
    if (!t) return '';
    if (/^<[h1-6hr]/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');
  return html;
}

interface CourseInlineReaderProps {
  reading: typeof WEEKLY_READINGS[0];
  onBack: () => void;
}

function CourseInlineReader({ reading, onBack }: CourseInlineReaderProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setContent('');
    fetch(reading.markdownPath)
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reading.markdownPath]);

  return (
    <div className={styles.inlineReader}>
      <button type="button" className={styles.inlineReaderBack} onClick={onBack}>
        ← Back to journal
      </button>
      <div className={styles.inlineReaderHeader}>
        <span className={styles.inlineReaderCategory}>{reading.category}</span>
        <h2 className={styles.inlineReaderTitle}>{reading.title}</h2>
      </div>
      {loading ? (
        <div className={styles.inlineReaderLoading}>
          <div className={`${styles.skeletonBlock}`} style={{ height: 16, borderRadius: 8, marginBottom: 8 }} />
          <div className={`${styles.skeletonBlock}`} style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
          <div className={`${styles.skeletonBlock}`} style={{ height: 16, borderRadius: 8, width: '60%' }} />
        </div>
      ) : (
        <div
          className={styles.inlineReaderBody}
          dangerouslySetInnerHTML={{ __html: parseMarkdownSimple(content) }}
        />
      )}
    </div>
  );
}

export default function CoursePage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [showAmbientViz, setShowAmbientViz] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authFlowSettled, setAuthFlowSettled] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = getStorageItem('mwa-shadow-work-intro-seen');
    if (!seen) {
      const timer = setTimeout(() => setIntroOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleIntroClose = () => {
    setIntroOpen(false);
    setStorageItem('mwa-shadow-work-intro-seen', 'true');
  };
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerIndex, setReaderIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');

  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];

  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

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

  useEffect(() => {
    const handler = () => refreshAuth();
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
    };
  }, [refreshAuth]);

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
    if (tag === 'TEXTAREA' || tag === 'INPUT') play('click');
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

  const resolvedViewWeek = viewWeek ?? 1;
  const weekReading = WEEKLY_READINGS[Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1)];

  const [rightContent, setRightContent] = useState<'reading' | 'task' | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskPanelTarget, setTaskPanelTarget] = useState<HTMLDivElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setSelectedTaskId(null);
    setRightContent(null);
  }, [resolvedViewWeek]);

  return (
    <>
    <MobileSplash />
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated} onSettled={() => setAuthFlowSettled(true)}>
    <div className={styles.pageLayout}>
      {showAmbientViz && (
        <div className={styles.bgViz}>
          <TexturedBackground />
        </div>
      )}
      <main className={`${styles.content} ${styles.contentSimple}`} onFocus={handleFocus}>
        <section className={`${styles.weeklyShell} ${styles.weeklyShellSimple}`} aria-label="Course materials">
          <div className={`${styles.leftCol} ${styles.leftColSimple}`}>
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
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={`${styles.taskCardSkeleton} ${styles.skeletonBlock}`} />
                  ))}
                  <div className={`${styles.sealButtonSkeleton} ${styles.skeletonBlock}`} />
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  data-tour="course-reading"
                  className={`${styles.readingCard} ${isDesktop && rightContent === 'reading' ? styles.readingCardActive : ''}`}
                  onClick={() => {
                    play('click');
                    const idx = Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1);
                    setReaderIndex(idx);
                    setSelectedTaskId(null);
                    if (isDesktop) {
                      setRightContent('reading');
                    } else {
                      setRightContent(null);
                      setIsReaderOpen(true);
                    }
                  }}
                  onMouseEnter={() => play('hover')}
                >
                  <span className={styles.readingAccent} aria-hidden="true" />
                  <span
                    className={styles.readingThumb}
                    style={{ backgroundImage: `url(${JSON.stringify(weekReading.imageUrl)})` }}
                    aria-hidden="true"
                  />
                  <div className={styles.readingInfo}>
                    <span className={styles.readingTitle}>{weekReading.title}</span>
                  </div>
                  <svg className={styles.readingArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>

                <div className={styles.missionsHeadingRow}>
                  <span className={styles.missionsDivider} />
                  <h2 className={styles.missionsHeading}>Coursework</h2>
                  <span className={styles.missionsDivider} />
                </div>

                <WeekTasksView
                  key={resolvedViewWeek}
                  weekNumber={resolvedViewWeek}
                  enablePersistence={isAuthenticated}
                  isLocked={resolvedViewWeek > activeWeek}
                  initialIsSealed={getWeekStatus(resolvedViewWeek)?.isSealed}
                  initialSealTxHash={getWeekStatus(resolvedViewWeek)?.sealTxHash}
                  onSealComplete={(weekNumber, txHash) => {
                    setSelectedTaskId(null);
                    setRightContent(null);
                    handleSealComplete(weekNumber, txHash);
                  }}
                  selectedSectionId={selectedTaskId}
                  onSectionSelect={(sectionId) => {
                    setSelectedTaskId(sectionId);
                    setRightContent(sectionId ? 'task' : null);
                  }}
                  renderDetailInPanel={isDesktop}
                  detailPortalTarget={taskPanelTarget}
                />
              </>
            )}
            </div>
          </div>

        {/* ── Right panel — desktop reading and mission detail ── */}
        <aside className={`${styles.rightPanel} ${styles.rightPanelSimple}`} aria-label="Course detail">
          {rightContent === 'reading' && (
            <div className={styles.popupCard}>
              <div className={styles.inlineReaderInner}>
                <CourseInlineReader
                  reading={WEEKLY_READINGS[readerIndex]}
                  onBack={() => setRightContent(null)}
                />
              </div>
            </div>
          )}
          {isDesktop && rightContent === 'task' && selectedTaskId && (
            <div ref={setTaskPanelTarget} className={styles.taskPanelHost} />
          )}
        </aside>
        </section>
      </main>

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
      <CourseTour />

      <BlueDialogue
        open={introOpen}
        lines={[
          "Shadow work. Heavy name, lighter than it sounds once you're in it.",
          "This one runs on the season's clock, not yours. Join mid-week and you have not missed anything that will not circle back around.",
          "Start at week one if you can. The story only makes its full shape by the [E]nd.",
        ]}
        emotion="happy"
        onClose={handleIntroClose}
      />

    </div>
    </HomeWelcomeFlow>
    </>
  );
}
