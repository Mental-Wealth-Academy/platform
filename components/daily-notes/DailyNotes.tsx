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

export default function DailyNotes({ enablePersistence = false }: DailyNotesProps) {
  const { play } = useSound();
  const [morningPages, setMorningPages] = useState<MorningPageEntry[]>([]);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [timerText, setTimerText] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const availableDayIndex = (() => {
    if (morningPages.length === 0) return 0;
    if (morningPages.length >= 7) return -1;
    const last = morningPages[morningPages.length - 1];
    return last.date < todayDateStr ? morningPages.length : -1;
  })();

  const todayDone = morningPages.some(e => e.date === todayDateStr);

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
    setMorningPages(prev => [...prev, {
      day: activeDayIndex + 1,
      date: todayDateStr,
      content: timerText,
      submittedAt: Date.now(),
    }]);
    setTimerActive(false);
    setActiveDayIndex(null);
    setTimerSeconds(1800);
    setTimerText('');
  };

  // Load from DB (uses week_number = 99 as dedicated daily notes slot)
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/daily-notes', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.morningPages) setMorningPages(data.morningPages);
      } catch {
        // silent
      }
    })();
  }, [enablePersistence]);

  // Debounced auto-save
  const save = useCallback(() => {
    return { morningPages };
  }, [morningPages]);

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
  }, [morningPages, enablePersistence, save]);

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

  return (
    <>
      <div className={styles.card}>
        <button
          type="button"
          className={styles.cardButton}
          onClick={() => { play('toggle-on'); setIsExpanded(!isExpanded); }}
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
                {todayDone
                  ? 'Done for today'
                  : availableDayIndex >= 0
                    ? `Day ${availableDayIndex + 1} of 7 — 30 min writing`
                    : 'Return tomorrow'}
              </span>
            </div>
          </div>
          <div className={styles.cardRight}>
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
          </div>
        )}
      </div>

      {/* Timer Modal */}
      {timerActive && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalDayBadge}>Day {(activeDayIndex ?? 0) + 1} of 7</span>
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
