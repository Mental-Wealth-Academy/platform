'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSound } from '@/hooks/useSound';
import styles from './DailyNotes.module.css';

interface MorningPageEntry {
  day: number;
  date: string;
  content: string;
  submittedAt: number;
}

interface DailyNotesProps {
  enablePersistence?: boolean;
}

const WEEK_COLORS: Record<number, string> = {
  1: '#FF6B6B',   // Red
  2: '#FF8E53',   // Orange
  3: '#FFB347',   // Amber
  4: '#FFD93D',   // Yellow
  5: '#6BCB77',   // Green
  6: '#4ECDC4',   // Teal
  7: '#45B7D1',   // Cyan
  8: '#5168FF',   // Blue
  9: '#7C3AED',   // Violet
  10: '#A855F7',  // Purple
  11: '#D946EF',  // Magenta
  12: '#EC4899',  // Pink
};

export default function DailyNotes({ enablePersistence = false }: DailyNotesProps) {
  const { play } = useSound();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [allWeekPages, setAllWeekPages] = useState<Record<number, MorningPageEntry[]>>({});
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [timerText, setTimerText] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const morningPages = allWeekPages[currentWeek] ?? [];
  const todayDateStr = new Date().toISOString().split('T')[0];
  const weekColor = WEEK_COLORS[currentWeek] || '#5168FF';

  // Check if previous week is complete (week 1 is always unlocked)
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

  const startTimer = (dayIndex: number) => {
    setActiveDayIndex(dayIndex);
    setTimerSeconds(1800);
    setTimerText('');
    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) { clearInterval(timerIntervalRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const submitMorningPages = () => {
    if (activeDayIndex === null) return;
    clearInterval(timerIntervalRef.current!);
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
    setActiveDayIndex(null);
    setTimerSeconds(1800);
    setTimerText('');
  };

  // Load all weeks from DB
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/daily-notes', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.allWeekPages) setAllWeekPages(data.allWeekPages);
      } catch {
        // silent
      }
    })();
  }, [enablePersistence]);

  // Debounced auto-save
  const save = useCallback(() => {
    return { allWeekPages };
  }, [allWeekPages]);

  useEffect(() => {
    if (!hasLoadedRef.current || !enablePersistence) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/daily-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(save()),
        });
      } catch {
        // silent
      }
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [allWeekPages, enablePersistence, save]);

  // Reset timer if user leaves tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!timerActive) return;
      if (document.visibilityState === 'hidden') {
        clearInterval(timerIntervalRef.current!);
        setTimerSeconds(1800);
        setTimerText('');
      } else {
        timerIntervalRef.current = setInterval(() => {
          setTimerSeconds(prev => {
            if (prev <= 1) { clearInterval(timerIntervalRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [timerActive]);

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

  const getSubLabel = () => {
    if (!isWeekUnlocked) return `Complete Week ${currentWeek - 1} first`;
    if (weekComplete) return `Week ${currentWeek} complete`;
    if (todayDone) return 'Done for today';
    if (availableDayIndex >= 0) return `Day ${availableDayIndex + 1} of 7 — 30 min writing`;
    return 'Return tomorrow';
  };

  return (
    <>
      <div className={styles.card} style={{ '--week-color': weekColor } as React.CSSProperties}>
        <button
          type="button"
          className={styles.cardButton}
          onClick={() => { play(isExpanded ? 'toggle-off' : 'toggle-on'); setIsExpanded(!isExpanded); }}
          onMouseEnter={() => play('hover')}
        >
          <div className={styles.cardLeft}>
            <div className={styles.icon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <span className={styles.label}>Daily Notes</span>
              <span className={styles.sublabel}>
                Week {currentWeek} — {getSubLabel()}
              </span>
            </div>
          </div>
          <div className={styles.cardRight}>
            <span className={styles.counter}>{totalCompleted}/84</span>
            <div className={styles.dayDots}>
              {Array.from({ length: 7 }, (_, i) => {
                const done = morningPages.find(e => e.day === i + 1);
                return (
                  <div
                    key={i}
                    className={`${styles.dayDot} ${done ? styles.dayDotDone : ''}`}
                    title={done ? `Day ${i + 1} — ${done.date}` : `Day ${i + 1}`}
                  />
                );
              })}
            </div>
            <svg
              className={`${styles.chevron} ${isExpanded ? styles.chevronRotated : ''}`}
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        <div className={styles.privacyNotice}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          All daily journals are private.
        </div>

        {isExpanded && (
          <div className={styles.expandedContent}>
            <p className={styles.instructions}>
              Write freely for 30 minutes each day. Let your thoughts flow without judgment.
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
      {timerActive && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} style={{ '--week-color': weekColor } as React.CSSProperties}>
          <div className={styles.modalBackdrop} />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalDayBadge}>Week {currentWeek} — Day {(activeDayIndex ?? 0) + 1} of 7</span>
              <h3 className={styles.modalTitle}>Morning Pages</h3>
              <p className={styles.modalSubtitle}>Write freely for 30 minutes. Tab switching resets the timer.</p>
            </div>

            <div className={styles.timerDisplay}>
              <div className={`${styles.timerCount} ${timerSeconds <= 300 ? styles.timerWarning : ''}`}>
                {formatTimer(timerSeconds)}
              </div>
              <div className={styles.timerBar}>
                <div
                  className={styles.timerBarFill}
                  style={{ width: `${((1800 - timerSeconds) / 1800) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.writeArea}>
              <textarea
                className={styles.textarea}
                placeholder="Start writing. Let your thoughts flow freely..."
                value={timerText}
                onChange={(e) => setTimerText(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalFooter}>
              <p className={styles.modalNote}>
                {timerSeconds > 0
                  ? `${formatTimer(timerSeconds)} remaining — keep writing!`
                  : 'Time is up! Submit when ready.'}
              </p>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => { play('success'); submitMorningPages(); }}
                onMouseEnter={() => play('hover')}
              >
                Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
