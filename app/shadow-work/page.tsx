'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import WeekTasksView from '@/components/week-tasks/WeekTasksView';
import HomeWelcomeFlow from '@/components/home-welcome/HomeWelcomeFlow';
import { useSound } from '@/hooks/useSound';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

const BlueDialogue = dynamic(() => import('@/components/blue-dialogue/BlueDialogue'), {
  ssr: false,
});
const CourseTour = dynamic(() => import('@/components/feature-tour/CourseTour'), {
  ssr: false,
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
  { title: 'Art as Creative Practice', author: 'Blue', description: 'This week introduces the habits behind creative recovery.', category: 'Introduction', imageUrl: '/images/blue-cards/task-reminder.jpg', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md' },
  { title: 'A Sense of Safety', author: 'Blue', description: 'Establish a foundation of safety to explore your creativity without fear.', category: 'Week 1', imageUrl: '/images/blue-cards/task-reminder.jpg', slug: 'sense-of-safety', markdownPath: '/readings/sense-of-safety.md' },
  { title: 'A Sense of Identity', author: 'Blue', description: 'The gap between human perception and machine processing. What lives in that space, and how to close it.', category: 'Week 2', imageUrl: '/images/blue-cards/therapy-chat.jpg', slug: 'sense-of-identity', markdownPath: '/readings/sense-of-identity.md' },
  { title: 'A Sense of Power', author: 'Blue', description: 'Anger, shame, and useful signals surface here. This week asks you to reclaim your power and act on it.', category: 'Week 3', imageUrl: '/images/blue-cards/soundscape.jpg', slug: 'sense-of-power', markdownPath: '/readings/sense-of-power.md' },
  { title: 'A Sense of Integrity', author: 'Blue', description: 'Align your actions with your deepest values. Integrity is the bridge between vision and reality.', category: 'Week 4', imageUrl: '/images/blue-cards/task-reminder.jpg', slug: 'sense-of-integrity', markdownPath: '/readings/sense-of-integrity.md' },
  { title: 'A Sense of Possibility', author: 'Blue', description: 'Dismantle the limits you inherited. Possibility is not given — it is reclaimed.', category: 'Week 5', imageUrl: '/images/blue-cards/soundscape.jpg', slug: 'sense-of-possibility', markdownPath: '/readings/sense-of-possibility.md' },
  { title: 'A Sense of Abundance', author: 'Blue', description: 'Study the money stories shaping your creative choices, then test better ones.', category: 'Week 6', imageUrl: '/images/blue-cards/task-reminder.jpg', slug: 'sense-of-abundance', markdownPath: '/readings/sense-of-abundance.md' },
  { title: 'A Sense of Connection', author: 'Blue', description: 'Creativity is not solitary. Learn to receive support and give it without losing yourself.', category: 'Week 7', imageUrl: '/images/blue-cards/therapy-chat.jpg', slug: 'sense-of-connection', markdownPath: '/readings/sense-of-connection.md' },
  { title: 'A Sense of Strength', author: 'Blue', description: 'Surviving discouragement. The creative life demands resilience, and this week you build it.', category: 'Week 8', imageUrl: '/images/blue-cards/soundscape.jpg', slug: 'sense-of-strength', markdownPath: '/readings/sense-of-strength.md' },
  { title: 'A Sense of Compassion', author: 'Blue', description: 'Fear disguises itself as laziness. Compassion for yourself is the antidote to creative block.', category: 'Week 9', imageUrl: '/images/blue-cards/therapy-chat.jpg', slug: 'sense-of-compassion', markdownPath: '/readings/sense-of-compassion.md' },
  { title: 'A Sense of Self-Protection', author: 'Blue', description: 'Guard your creative energy. Not every critique deserves a response, not every door needs opening.', category: 'Week 10', imageUrl: '/images/blue-cards/task-reminder.jpg', slug: 'sense-of-self-protection', markdownPath: '/readings/sense-of-self-protection.md' },
  { title: 'A Sense of Autonomy', author: 'Blue', description: 'Own your process. Autonomy is the quiet power that lets your art speak without permission.', category: 'Week 11', imageUrl: '/images/blue-cards/soundscape.jpg', slug: 'sense-of-autonomy', markdownPath: '/readings/sense-of-autonomy.md' },
  { title: 'A Sense of Trust', author: 'Blue', description: 'Choose the next concrete action before the full outcome is visible.', category: 'Week 12', imageUrl: '/images/blue-cards/therapy-chat.jpg', slug: 'sense-of-faith', markdownPath: '/readings/sense-of-faith.md' },
];

function getReadingCardTheme(url?: string): 'sunrise' | 'purple' | 'midnight' | 'default' {
  if (!url) return 'default';
  if (url.includes('task-reminder') || url.includes('sunrise')) return 'sunrise';
  if (url.includes('soundscape') || url.includes('purple')) return 'purple';
  if (url.includes('therapy-chat') || url.includes('midnight') || url.includes('blue-bot-icon')) return 'midnight';
  return 'default';
}

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
  backLabel?: string;
  footer?: React.ReactNode;
}

function CourseInlineReader({
  reading,
  onBack,
  backLabel = '← Back to journal',
  footer,
}: CourseInlineReaderProps) {
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
        {backLabel}
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
      {!loading && footer}
    </div>
  );
}

const sceneUrl = dailySceneBackgroundUrl();

export default function CoursePage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authFlowSettled, setAuthFlowSettled] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isCourseModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCourseModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCourseModalOpen]);

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
  const [viewWeek, setViewWeek] = useState<number>(1);
  const [weekEndsAt, setWeekEndsAt] = useState<string | null>(null);
  const [swipeAnim, setSwipeAnim] = useState<'none' | 'left' | 'right'>('none');

  // Restore remembered view week from safe-storage on mount
  useEffect(() => {
    const saved = getStorageItem('mwa-shadow-work-view-week');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 12) {
        setViewWeek(parsed);
      }
    }
  }, []);

  // Save current view week to safe-storage
  useEffect(() => {
    if (viewWeek != null) {
      setStorageItem('mwa-shadow-work-view-week', String(viewWeek));
    }
  }, [viewWeek]);

  const { play } = useSound();
  const currentReading = WEEKLY_READINGS[readerIndex];

  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    fetch('/api/season', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const week = data.currentWeek ?? 0;
        setActiveWeek(week);
        setWeekEndsAt(data.weekEndsAt ?? null);
      })
      .catch(() => {})
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

  const goToWeek = useCallback((direction: 'prev' | 'next') => {
    play('click');
    if (direction === 'prev') {
      if (resolvedViewWeek > 1) {
        setSwipeAnim('right');
        setTimeout(() => {
          setViewWeek(w => Math.max(1, (w ?? 1) - 1));
          setSwipeAnim('none');
        }, 150);
      }
    } else {
      if (resolvedViewWeek < 12) {
        setSwipeAnim('left');
        setTimeout(() => {
          setViewWeek(w => Math.min(12, (w ?? 1) + 1));
          setSwipeAnim('none');
        }, 150);
      }
    }
  }, [resolvedViewWeek, play]);

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
    <HomeWelcomeFlow onAuthenticated={handleWelcomeAuthenticated} onSettled={() => setAuthFlowSettled(true)}>
    <div
      className={styles.pageLayout}
      style={{ '--quests-scene': `url(${sceneUrl})` } as React.CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={`${styles.content} ${styles.contentSimple}`} onFocus={handleFocus}>
        <section className={`${styles.weeklyShell} ${styles.weeklyShellSimple}`} aria-label="Course materials">
          <div className={`${styles.leftCol} ${styles.leftColSimple}`}>
            <button
              type="button"
              className={styles.courseSwitcherBtn}
              onClick={() => {
                play('click');
                setIsCourseModalOpen(true);
              }}
              onMouseEnter={() => play('hover')}
              aria-label="Select course. Current: Creative Healing"
            >
              <span className={styles.courseSwitcherLeft}>
                <span className={styles.courseSwitcherDot} aria-hidden="true" />
                <span className={styles.courseSwitcherLabel}>Creative Healing</span>
              </span>
              <span className={styles.courseSwitcherRight}>
                <span className={styles.courseSwitcherBadge}>12-Week Track</span>
                <svg className={styles.courseSwitcherChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            <nav className={styles.weekNav} aria-label="Week navigation">
              <button
                type="button"
                className={styles.weekNavArrow}
                onClick={() => goToWeek('prev')}
                onMouseEnter={() => play('hover')}
                disabled={resolvedViewWeek <= 1}
                aria-label="Previous week"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className={styles.weekNavCenter}>
                <span className={styles.weekNavLabel}>Week {resolvedViewWeek} of 12</span>
              </div>

              <button
                type="button"
                className={styles.weekNavArrow}
                onClick={() => goToWeek('next')}
                onMouseEnter={() => play('hover')}
                disabled={resolvedViewWeek >= 12}
                aria-label="Next week"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </nav>

            <div
              className={`${styles.weekContent} ${swipeAnim === 'left' ? styles.weekContentSwipeLeft : swipeAnim === 'right' ? styles.weekContentSwipeRight : ''}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <button
                type="button"
                data-tour="course-reading"
                data-card-theme={getReadingCardTheme(weekReading.imageUrl)}
                className={`${styles.readingCard} ${rightContent === 'reading' ? styles.readingCardActive : ''}`}
                aria-expanded={!isDesktop ? rightContent === 'reading' : undefined}
                onClick={() => {
                  play('click');
                  const idx = Math.min(resolvedViewWeek, WEEKLY_READINGS.length - 1);
                  setReaderIndex(idx);
                  setSelectedTaskId(null);
                  // Desktop opens the reading in the side panel; on phones it
                  // unfolds as plain text right here, above the coursework,
                  // instead of throwing a full-screen modal over the page.
                  setRightContent(prev => (prev === 'reading' ? null : 'reading'));
                }}
                onMouseEnter={() => play('hover')}
              >
                <div className={styles.readingBannerWrap} aria-hidden="true">
                  <Image
                    src={weekReading.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 880px"
                    priority
                    className={styles.readingBannerImg}
                  />
                  <div className={styles.readingBannerScrim} />
                </div>
                <div className={styles.readingInfo}>
                  <div className={styles.readingHeaderRow}>
                    <span className={styles.readingCategory}>{weekReading.category}</span>
                    <span className={styles.readingAuthorTag}>by {weekReading.author}</span>
                  </div>
                  <h3 className={styles.readingTitle}>{weekReading.title}</h3>
                  {weekReading.description && (
                    <p className={styles.readingDescription}>{weekReading.description}</p>
                  )}
                  <div className={styles.readingCtaRow}>
                    <span className={styles.readingCtaPill}>
                      <span className={styles.readingCtaText}>
                        {rightContent === 'reading' ? 'Close reading' : 'Read chapter'}
                      </span>
                      <svg className={styles.readingArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>

              {!isDesktop && rightContent === 'reading' && (
                <div className={styles.inlineReaderMobile}>
                  <CourseInlineReader
                    reading={WEEKLY_READINGS[readerIndex]}
                    onBack={() => setRightContent(null)}
                    backLabel="← Close reading"
                    footer={
                      <button
                        type="button"
                        className={styles.inlineReaderDiscuss}
                        onClick={() => { play('click'); setIsReaderOpen(true); }}
                      >
                        Join the discussion
                      </button>
                    }
                  />
                </div>
              )}

              <div className={styles.missionsHeadingRow}>
                <span className={styles.missionsDivider} />
                <h2 className={styles.missionsHeading}>Coursework</h2>
                <span className={styles.missionsDivider} />
              </div>

              <WeekTasksView
                key={resolvedViewWeek}
                weekNumber={resolvedViewWeek}
                enablePersistence={isAuthenticated}
                isLocked={resolvedViewWeek > activeWeek && activeWeek > 0}
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
            </div>
          </div>

        {/* ── Right panel — desktop reading and mission detail ── */}
        <aside className={`${styles.rightPanel} ${styles.rightPanelSimple}`} aria-label="Course detail">
          {isDesktop && rightContent === 'reading' && (
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

      {isMounted && isCourseModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.courseModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Course selection"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCourseModalOpen(false);
          }}
        >
          <div className={styles.courseModal}>
            <div className={styles.courseModalHeader}>
              <div className={styles.courseModalHeaderCenter}>
                <h2 className={styles.courseHeaderTitle}>Select Course</h2>
                <p className={styles.courseHeaderDesc}>
                  Switch between available learning paths. Weekly progression and diamonds sync automatically across tracks.
                </p>
              </div>
              <button
                type="button"
                className={styles.courseModalClose}
                onClick={() => setIsCourseModalOpen(false)}
                aria-label="Close course selector"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.courseCarousel} role="region" aria-label="Available courses">
              {/* Card 1: Creative Healing (Active) */}
              <div className={`${styles.courseVerticalCard} ${styles.courseCardActive}`}>
                <div className={styles.courseCardVectorWrap}>
                  <Image
                    src="/images/blue-cards/creative-healing.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 480px) 85vw, 360px"
                    className={styles.courseCardVectorImg}
                  />
                  <div className={styles.courseCardPillActive}>Active</div>
                </div>
                <div className={styles.courseCardBody}>
                  <h3 className={styles.courseCardName}>Creative Healing</h3>
                  <span className={styles.courseCardTrack}>12-Week Track</span>
                  <button
                    type="button"
                    className={styles.courseBtnActive}
                    onClick={() => {
                      play('click');
                      setIsCourseModalOpen(false);
                    }}
                  >
                    Current
                  </button>
                </div>
              </div>

              {/* Card 2: Inner Alchemy (Diamonds) */}
              <div className={`${styles.courseVerticalCard} ${styles.courseCardLocked}`}>
                <div className={styles.courseCardVectorWrap}>
                  <Image
                    src="/images/blue-cards/inner-alchemy.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 480px) 85vw, 360px"
                    className={styles.courseCardVectorImg}
                  />
                  <div className={styles.courseCardPillDiamonds}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2L2 9l10 13 10-13-10-7z" />
                    </svg>
                    500 Diamonds
                  </div>
                </div>
                <div className={styles.courseCardBody}>
                  <h3 className={styles.courseCardName}>Inner Alchemy</h3>
                  <span className={styles.courseCardTrack}>Somatic Integration</span>
                  <div className={styles.courseBtnLocked}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    500 Diamonds
                  </div>
                </div>
              </div>

              {/* Card 3: Sovereign Mind (VIP) */}
              <div className={`${styles.courseVerticalCard} ${styles.courseCardVip}`}>
                <div className={styles.courseCardVectorWrap}>
                  <Image
                    src="/images/blue-cards/sovereign-mind.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 480px) 85vw, 360px"
                    className={styles.courseCardVectorImg}
                  />
                  <div className={styles.courseCardPillVip}>VIP Pass</div>
                </div>
                <div className={styles.courseCardBody}>
                  <h3 className={styles.courseCardName}>Sovereign Mind</h3>
                  <span className={styles.courseCardTrack}>Daemon Protocol</span>
                  <div className={styles.courseBtnVip}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    VIP Pass
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
    </HomeWelcomeFlow>
    </>
  );
}
