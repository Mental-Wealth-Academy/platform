'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { ShardAnimation } from '@/components/quests/ShardAnimation';
import { ConfettiCelebration } from '@/components/quests/ConfettiCelebration';
import { useSound } from '@/hooks/useSound';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import IntroLoaderOverlay from '@/components/intro-loader/IntroLoaderOverlay';
import styles from './DailyNotes.module.css';

interface MorningPageEntry {
  day: number;
  date: string;
  content: string;
  submittedAt: number;
}

interface DailyNotesProps {
  enablePersistence?: boolean;
  compact?: boolean;
}

const WEEK_COLORS = [
  '#5168FF', // Week 1 — indigo
  '#7C3AED', // Week 2 — violet
  '#2563EB', // Week 3 — blue
  '#0891B2', // Week 4 — cyan
  '#059669', // Week 5 — emerald
  '#16A34A', // Week 6 — green
  '#65A30D', // Week 7 — lime
  '#CA8A04', // Week 8 — yellow
  '#EA580C', // Week 9 — orange
  '#DC2626', // Week 10 — red
  '#DB2777', // Week 11 — pink
  '#9333EA', // Week 12 — purple
];

export default function DailyNotes({ enablePersistence = false, compact = false }: DailyNotesProps) {
  const { play } = useSound();
  const { getAccessToken } = usePrivy();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [allWeekPages, setAllWeekPages] = useState<Record<number, MorningPageEntry[]>>({});
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(900);
  const [timerText, setTimerText] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const isExpanded = true;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardData, setRewardData] = useState<{ shards: number; startingShards: number } | null>(null);
  const [introDayIndex, setIntroDayIndex] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [dataReady, setDataReady] = useState(false);

  // Reset dataReady when enablePersistence changes
  useEffect(() => {
    if (enablePersistence) {
      setDataReady(false);
    } else {
      setDataReady(true);
    }
  }, [enablePersistence]);

  const morningPages = allWeekPages[currentWeek] ?? [];
  const todayDateStr = new Date().toISOString().split('T')[0];
  const weekColor = WEEK_COLORS[(currentWeek - 1) % WEEK_COLORS.length];

  const isWeekUnlocked = currentWeek === 1 || (allWeekPages[currentWeek - 1]?.length ?? 0) >= 7;

  const availableDayIndex = (() => {
    if (!isWeekUnlocked) return -1;
    if (morningPages.length === 0) return 0;
    if (morningPages.length >= 7) return -1;
    const last = morningPages[morningPages.length - 1];
    return last.date < todayDateStr ? morningPages.length : -1;
  })();

  const todayDone = morningPages.some(e => e.date === todayDateStr);
  const weekComplete = morningPages.length >= 7;
  const totalCompleted = Object.values(allWeekPages).reduce((sum, pages) => sum + pages.length, 0);

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) { clearInterval(timerIntervalRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const beginWritingSession = (dayIndex: number) => {
    setActiveDayIndex(dayIndex);
    setTimerSeconds(900);
    setTimerText('');
    setTimerActive(true);
    setIsPaused(false);
    startTimerInterval();
  };

  const startTimer = (dayIndex: number) => {
    setIntroDayIndex(dayIndex);
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsPaused(false);
    setShowConfirmDialog(false);
    startTimerInterval();
  };

  const closeSession = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerActive(false);
    setIsPaused(false);
    setShowConfirmDialog(false);
    setActiveDayIndex(null);
    setTimerSeconds(900);
    setTimerText('');
  };

  const requestClose = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsPaused(true);
    setShowConfirmDialog(true);
  };

  const submitMorningPages = async () => {
    if (activeDayIndex === null) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const newEntry: MorningPageEntry = {
      day: activeDayIndex + 1,
      date: todayDateStr,
      content: timerText,
      submittedAt: Date.now(),
    };
    setAllWeekPages(prev => ({
      ...prev,
      [currentWeek]: [...(prev[currentWeek] ?? []), newEntry],
    }));
    setTimerActive(false);
    setIsPaused(false);
    setShowConfirmDialog(false);
    setActiveDayIndex(null);
    setTimerSeconds(900);
    setTimerText('');

    play('success');

    // Award shards via API
    if (enablePersistence) {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const meRes = await fetch('/api/me', { cache: 'no-store', credentials: 'include', headers: authHeaders });
        const meData = await meRes.json();
        const startingShards = meData?.user?.shardCount ?? 0;

        const questId = `daily-notes-w${currentWeek}-d${activeDayIndex + 1}`;
        const res = await fetch('/api/quests/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ questId, shards: 100 }),
        });
        const data = await res.json();

        if (data.ok && data.shardsAwarded > 0) {
          setRewardData({
            shards: data.shardsAwarded,
            startingShards: data.newShardCount - data.shardsAwarded,
          });
          setShowRewardAnimation(true);
          window.dispatchEvent(new Event('shardsUpdated'));
        } else {
          // Quest already completed or other issue — still show reward for the effort
          setRewardData({ shards: 100, startingShards });
          setShowRewardAnimation(true);
        }
      } catch (err) {
        console.error('[DailyNotes] Shard award error:', err);
      }
    }
  };

  // Load all weeks from DB
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/daily-notes', { credentials: 'include', headers: authHeaders });
        if (!res.ok) return;
        const data = await res.json();
        if (data.allWeekPages) setAllWeekPages(data.allWeekPages);
      } catch {
        // silent
      } finally {
        setDataReady(true);
      }
    })();
  }, [enablePersistence, getAccessToken]);

  // Debounced auto-save
  const save = useCallback(() => {
    return { allWeekPages };
  }, [allWeekPages]);

  useEffect(() => {
    if (!dataReady || !enablePersistence) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getAccessToken();
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        await fetch('/api/daily-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          credentials: 'include',
          body: JSON.stringify(save()),
        });
      } catch {
        // silent
      }
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [allWeekPages, enablePersistence, dataReady, save, getAccessToken]);

  // Pause timer and show confirm dialog when user leaves tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!timerActive || isPaused) return;
      if (document.visibilityState === 'hidden') {
        requestClose();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [timerActive, isPaused]);

  // Warn on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerActive]);

  // Cleanup
  useEffect(() => () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); }, []);

  const canStart = dataReady && isWeekUnlocked && !weekComplete && !todayDone && availableDayIndex >= 0;

  const handleCompactClick = () => {
    if (compact && canStart) {
      play('click');
      startTimer(availableDayIndex);
    }
  };

  return (
    <>
      <div
        className={`${styles.card} ${compact ? styles.cardCompact : ''} ${compact && todayDone ? styles.cardDone : ''}`}
        style={{ '--week-color': weekColor } as React.CSSProperties}
        onMouseEnter={() => play('hum')}
      >
        <div className={styles.vizBg}><CyberpunkDataViz /></div>
        <div className={styles.cardButton} onClick={handleCompactClick}>
          <div className={styles.cardLeft}>
            <div className={styles.icon}>
              <Image
                src="/icons/notebook-writing.svg"
                alt="Notebook writing icon"
                width={40}
                height={40}
              />
            </div>
            <div>
              <span className={styles.label}>Morning Pages</span>
              <span className={styles.sublabel}>
                {compact && !dataReady ? 'Loading...' : compact && todayDone ? 'Completed today' : compact && canStart ? 'Tap to start' : 'All entries are encrypted.'}
              </span>
            </div>
          </div>
          <div className={styles.cardRight}>
            {compact && todayDone ? (
              <div className={styles.compactCheck}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <span className={styles.shardBadge} title="Earn 100 shards per day completed">
                <Image src="/icons/ui-shard.svg" alt="shard" width={14} height={14} />
                +100
              </span>
            )}
          </div>
        </div>

        {!compact && isExpanded && (
          <div className={styles.expandedContent}>
            <p className={styles.instructions}>
              Write freely for 15 minutes each day. Let your thoughts flow without judgment.
              Morning pages clear your mind and unlock your creative self.
            </p>
            <div className={styles.dayButtons}>
              {Array.from({ length: 7 }, (_, i) => {
                const done = morningPages.find(e => e.day === i + 1);
                const isAvailable = availableDayIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.dayBtn} ${done ? styles.dayBtnDone : isAvailable ? styles.dayBtnAvailable : styles.dayBtnLocked}`}
                    onClick={() => { if (isAvailable) { play('click'); startTimer(i); } }}
                    disabled={!isAvailable}
                    title={done ? `Day ${i + 1} complete — ${done.date}` : isAvailable ? `Start Day ${i + 1}` : `Day ${i + 1} locked`}
                  >
                    {done ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={styles.weekNav}>
              <button
                className={styles.weekNavBtn}
                disabled={currentWeek === 1}
                onClick={() => { play('click'); setCurrentWeek(w => w - 1); }}
                onMouseEnter={() => play('hover')}
                aria-label="Previous week"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className={styles.weekNavLabel}>Week {currentWeek} / 12</span>
              <button
                className={styles.weekNavBtn}
                disabled={currentWeek === 12}
                onClick={() => { play('click'); setCurrentWeek(w => w + 1); }}
                onMouseEnter={() => play('hover')}
                aria-label="Next week"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timer Modal */}
      {introDayIndex !== null && (
        <IntroLoaderOverlay
          src="/loaders/Sandy%20Loading.lottie"
          label="Opening morning pages"
          onFinish={() => {
            const dayIndex = introDayIndex;
            setIntroDayIndex(null);
            if (dayIndex !== null) {
              beginWritingSession(dayIndex);
            }
          }}
        />
      )}

      {timerActive && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} style={{ '--week-color': weekColor } as React.CSSProperties}>
          <div className={styles.modalBackdrop} onClick={requestClose} />
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="morning-pages-session-title">
            <h3 id="morning-pages-session-title" className={styles.srOnly}>Morning Pages</h3>

            <div className={styles.modalMain}>
              <div className={styles.timerDisplay}>
                <div className={styles.sessionHeader}>
                  <div className={styles.sessionBadgeFrame}>
                    <div className={styles.sessionBadgeGraphic} aria-hidden="true">
                      <Image
                        src="/uploads/blueagent.png"
                        alt=""
                        width={92}
                        height={92}
                        className={styles.sessionBadgeImage}
                      />
                    </div>
                  </div>
                  <div className={styles.sessionMeta}>
                    <div className={styles.promptPill}>Write for 15 min. Think of this as your art. ✍️🌱</div>
                  </div>
                  <div className={styles.timerFrame}>
                    <div className={`${styles.timerCount} ${styles.timerCountCompact} ${isPaused ? styles.timerPaused : ''} ${timerSeconds <= 300 && !isPaused ? styles.timerWarning : ''}`}>
                      {isPaused ? 'PAUSED' : formatTimer(timerSeconds)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.writeArea}>
                <textarea
                  className={styles.textarea}
                  placeholder="Write for 15 min. Think of this as your art."
                  value={timerText}
                  onChange={(e) => setTimerText(e.target.value)}
                  autoFocus
                  disabled={isPaused}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.footerTimer}>
                <div className={styles.timerBar}>
                  <div
                    className={styles.timerBarFill}
                    style={{ width: `${((900 - timerSeconds) / 900) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className={styles.pauseBtn}
                onClick={() => { play('click'); isPaused ? resumeTimer() : pauseTimer(); }}
                onMouseEnter={() => play('hover')}
              >
                {isPaused ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Resume
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    Pause
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => submitMorningPages()}
                onMouseEnter={() => play('hover')}
              >
                Submit
              </button>
            </div>
          </div>

          {/* Confirm Close Dialog */}
          {showConfirmDialog && (
            <div className={styles.confirmOverlay}>
              <div className={styles.confirmDialog}>
                <div className={styles.confirmTitleBar}>
                  <span className={styles.confirmTitleText}>session.pause</span>
                </div>
                <div className={styles.confirmBody}>
                  <div className={styles.confirmIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p className={styles.confirmMessage}>
                    Are you sure you want to close? Your writing progress will be lost.
                  </p>
                  <div className={styles.confirmButtons}>
                    <button
                      type="button"
                      className={styles.confirmBtnResume}
                      onClick={() => { play('click'); resumeTimer(); }}
                      onMouseEnter={() => play('hover')}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className={styles.confirmBtnClose}
                      onClick={() => { play('click'); closeSession(); }}
                      onMouseEnter={() => play('hover')}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {showRewardAnimation && rewardData && (
        <>
          <ConfettiCelebration trigger={true} />
          <ShardAnimation
            shards={rewardData.shards}
            startingShards={rewardData.startingShards}
            onComplete={() => setShowRewardAnimation(false)}
          />
        </>
      )}
    </>
  );
}
