'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useSound } from '@/hooks/useSound';
import { useScrollLock } from '@/hooks/useScrollLock';
import styles from './DailyNotes.module.css';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import { getLocalDateKey } from '@/lib/date-key';

const DiamondReward = dynamic(() => import('@/components/rewards/DiamondReward').then(mod => mod.DiamondReward), {
  ssr: false,
  loading: () => null,
});
const ConfettiCelebration = dynamic(() => import('@/components/quests/ConfettiCelebration').then(mod => mod.ConfettiCelebration), {
  ssr: false,
  loading: () => null,
});
const CyberpunkDataViz = dynamic(() => import('@/components/cyberpunk-data-viz/CyberpunkDataViz'), {
  ssr: false,
  loading: () => null,
});

interface FieldNoteEntry {
  day: number;
  date: string;
  content: string;
  submittedAt: number;
}

interface DailyNotesProps {
  enablePersistence?: boolean;
  compact?: boolean;
  compactLabel?: string;
  onCompactClick?: () => void;
  panelMode?: boolean;
  onPanelClose?: () => void;
}

const MOBILE_PROMPT_MESSAGE = 'Dumping out my brain...';

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
  'var(--color-primary)', // Week 11 — brand
  '#9333EA', // Week 12 — purple
];

export default function DailyNotes({
  enablePersistence = false,
  compact = false,
  compactLabel = 'Field Notes',
  onCompactClick,
  panelMode = false,
  onPanelClose,
}: DailyNotesProps) {
  const { play } = useSound();
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [allWeekPages, setAllWeekPages] = useState<Record<number, FieldNoteEntry[]>>({});
  const [previousWeekCounts, setPreviousWeekCounts] = useState<Record<number, number>>({});
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(900);
  const [timerText, setTimerText] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const isExpanded = true;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardData, setRewardData] = useState<{ shards: number } | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadedWeeksRef = useRef<Set<number>>(new Set());
  const saveConfirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [dataReady, setDataReady] = useState(false);
  const [queuedCompactStart, setQueuedCompactStart] = useState(false);
  // Reset dataReady when enablePersistence changes
  useEffect(() => {
    if (enablePersistence) {
      setDataReady(false);
      loadedWeeksRef.current.clear();
      setAllWeekPages({});
      setPreviousWeekCounts({});
    } else {
      setDataReady(true);
    }
  }, [enablePersistence]);

  useEffect(() => {
    if (enablePersistence) {
      setShowAuthPrompt(false);
    }
  }, [enablePersistence]);

  useEffect(() => {
    if (!showAuthPrompt) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAuthPrompt(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuthPrompt]);

  const fieldNotes = allWeekPages[currentWeek] ?? [];
  const todayDateStr = getLocalDateKey();
  const weekColor = WEEK_COLORS[(currentWeek - 1) % WEEK_COLORS.length];
  const authPending = authenticated && !enablePersistence;

  // Dev-only bypass: append ?devnotes to the URL to open the writing component
  // without auth (nothing persists to the server). Ignored in production builds.
  const [devBypass, setDevBypass] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    try {
      if (new URLSearchParams(window.location.search).has('devnotes')) {
        setDevBypass(true);
      }
    } catch {
      /* no-op */
    }
  }, []);
  // Gate that controls whether a writing session can start (auth OR dev bypass).
  const gateOpen = enablePersistence || devBypass;

  useScrollLock(showAuthPrompt || timerActive);

  const previousWeekCount = currentWeek === 1
    ? 7
    : previousWeekCounts[currentWeek] ?? allWeekPages[currentWeek - 1]?.length ?? 0;
  const isWeekUnlocked = previousWeekCount >= 7;

  const availableDayIndex = (() => {
    if (!isWeekUnlocked) return -1;
    if (fieldNotes.length === 0) return 0;
    if (fieldNotes.length >= 7) return -1;
    const last = fieldNotes[fieldNotes.length - 1];
    return last.date < todayDateStr ? fieldNotes.length : -1;
  })();

  const [localDoneToday, setLocalDoneToday] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getStorageItem(`fieldNotesSavedToday_${todayDateStr}`) === '1';
  });

  useEffect(() => {
    const handleCompleted = () => {
      setLocalDoneToday(true);
    };
    window.addEventListener('dailyNoteCompleted', handleCompleted);
    return () => window.removeEventListener('dailyNoteCompleted', handleCompleted);
  }, [todayDateStr]);

  const serverDoneToday = Object.values(allWeekPages).some(pages =>
    Array.isArray(pages) && pages.some((e: any) => e.date === todayDateStr)
  );

  const todayDone = localDoneToday || serverDoneToday;
  const weekComplete = fieldNotes.length >= 7;
  const totalCompleted = Object.values(allWeekPages).reduce((sum, pages) => sum + pages.length, 0);

  const panelBlueMessage = !dataReady
    ? 'I am checking your saved pages. Hold the line for a moment.'
    : todayDone
      ? 'I already have today’s page. Come back tomorrow for the next writing session.'
      : weekComplete
        ? 'This week is complete. Seven entries are on the record.'
        : !isWeekUnlocked
          ? 'Finish the previous week first. The next page opens after seven completed entries.'
          : 'Your next field note opens tomorrow.';

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

  const beginWritingSession = useCallback((dayIndex: number) => {
    setSubmitError(null);
    setActiveDayIndex(dayIndex);
    setTimerSeconds(900);
    setTimerText('');
    setTimerActive(true);
    setIsPaused(false);
    startTimerInterval();
  }, [startTimerInterval]);

  const resumeTimer = () => {
    setIsPaused(false);
    setShowConfirmDialog(false);
    startTimerInterval();
  };

  const closeSession = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSubmitError(null);
    setIsSubmitting(false);
    setTimerActive(false);
    setIsPaused(false);
    setShowConfirmDialog(false);
    setActiveDayIndex(null);
    setTimerSeconds(900);
    setTimerText('');
  };

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsPaused(true);
    setShowConfirmDialog(true);
  }, [isSubmitting]);

  const submitMorningPages = async () => {
    if (activeDayIndex === null || isSubmitting) return;
    if (!enablePersistence) {
      closeSession();
      if (!devBypass) setShowAuthPrompt(true);
      return;
    }
    const newEntry: FieldNoteEntry = {
      day: activeDayIndex + 1,
      date: todayDateStr,
      content: timerText,
      submittedAt: Date.now(),
    };
    const nextEntries = [...(allWeekPages[currentWeek] ?? []), newEntry];

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/daily-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          weekNumber: currentWeek,
          entries: nextEntries,
        }),
      });
      if (!res.ok) {
        throw new Error(`Daily note save failed: ${res.status}`);
      }
    } catch {
      setIsSubmitting(false);
      setSubmitError('Your note could not be saved. Please try again.');
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setAllWeekPages(prev => ({
      ...prev,
      [currentWeek]: nextEntries,
    }));
    setPreviousWeekCounts(prev => ({
      ...prev,
      [currentWeek + 1]: (allWeekPages[currentWeek]?.length ?? 0) + 1,
    }));
    setTimerActive(false);
    setIsPaused(false);
    setShowConfirmDialog(false);
    setActiveDayIndex(null);
    setTimerSeconds(900);
    setTimerText('');
    setIsSubmitting(false);

    play('success');

    if (enablePersistence) {
      const saveKey = `fieldNotesSavedToday_${todayDateStr}`;
      const alreadyShown = getStorageItem(saveKey);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!alreadyShown && !reducedMotion) {
        setStorageItem(saveKey, '1');
        setShowSaveConfirm(true);
        if (saveConfirmTimerRef.current) clearTimeout(saveConfirmTimerRef.current);
        saveConfirmTimerRef.current = setTimeout(() => setShowSaveConfirm(false), 2500);
      }
    }

    if (enablePersistence) {
      setRewardData({ shards: 100 });
      setShowRewardAnimation(true);

      // First successful note ever: let the home first-run guide pick it up and
      // point the user to the course. Fires once per browser.
      window.dispatchEvent(new Event('globalChatUpdate'));
      if (getStorageItem('mwa-first-daily-note-done') !== '1') {
        setStorageItem('mwa-first-daily-note-done', '1');
        window.dispatchEvent(new CustomEvent('dailyNoteCompleted'));
      }

      const dayIndex = activeDayIndex;
      (async () => {
        try {
          const token = await getAccessToken();
          const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const questId = `daily-notes-w${currentWeek}-d${dayIndex + 1}`;
          const res = await fetch('/api/quests/complete', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ questId, shards: 100 }),
          });
          const data = await res.json();
          if (data.ok && data.shardsAwarded > 0) {
            window.dispatchEvent(new Event('shardsUpdated'));
          }
        } catch (err) {
          console.error('[DailyNotes] Credit award error:', err);
        }
      })();
    }
  };

  const loadWeek = useCallback(async (weekNumber: number, mode: 'week' | 'current' = 'week') => {
    if (!enablePersistence) return;

    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        mode === 'current' ? '/api/daily-notes?mode=current' : `/api/daily-notes?week=${weekNumber}`,
        {
        credentials: 'include',
        headers: authHeaders,
        }
      );
      if (!res.ok) return;

      const data = await res.json();
      const resolvedWeekNumber = typeof data.weekNumber === 'number' ? data.weekNumber : weekNumber;
      setAllWeekPages(prev => ({
        ...prev,
        [resolvedWeekNumber]: Array.isArray(data.entries) ? data.entries : [],
      }));
      setPreviousWeekCounts(prev => ({
        ...prev,
        [resolvedWeekNumber]: typeof data.previousWeekCount === 'number' ? data.previousWeekCount : prev[resolvedWeekNumber] ?? 0,
      }));
      loadedWeeksRef.current.add(resolvedWeekNumber);
      if (resolvedWeekNumber !== currentWeek) {
        setCurrentWeek(resolvedWeekNumber);
      }
    } catch {
      // silent
    }
  }, [currentWeek, enablePersistence, getAccessToken]);

  useEffect(() => {
    if (!enablePersistence) return;

    let cancelled = false;
    setDataReady(false);

    (async () => {
      if (loadedWeeksRef.current.size === 0) {
        await loadWeek(currentWeek, 'current');
      } else if (!loadedWeeksRef.current.has(currentWeek)) {
        await loadWeek(currentWeek);
      }
      if (!cancelled) {
        setDataReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentWeek, enablePersistence, loadWeek]);

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
  }, [timerActive, isPaused, requestClose]);

  // Warn on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerActive]);

  // Cleanup
  useEffect(() => () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (saveConfirmTimerRef.current) clearTimeout(saveConfirmTimerRef.current);
  }, []);


  const handleAttemptStart = useCallback((dayIndex: number) => {
    if (!gateOpen) {
      play('click');
      setShowAuthPrompt(true);
      return;
    }

    play('click');
    beginWritingSession(dayIndex);
  }, [gateOpen, play, beginWritingSession]);

  const canStart = dataReady && isWeekUnlocked && !weekComplete && !todayDone && availableDayIndex >= 0;
  const cardSubLabel = 'daily reflection and notes';

  const handleGuestCta = useCallback(() => {
    if (!ready || authPending) return;

    play('click');
    setShowAuthPrompt(false);
    login();
  }, [authPending, login, play, ready]);

  useEffect(() => {
    if (!queuedCompactStart || !gateOpen || !dataReady) return;

    setQueuedCompactStart(false);
    if (canStart) {
      handleAttemptStart(availableDayIndex);
    }
  }, [availableDayIndex, canStart, dataReady, gateOpen, handleAttemptStart, queuedCompactStart]);

  useEffect(() => {
    if (!panelMode || !gateOpen || !dataReady) return;
    if (timerActive || activeDayIndex !== null) return;
    if (!canStart) return;

    beginWritingSession(availableDayIndex);
  }, [
    activeDayIndex,
    availableDayIndex,
    beginWritingSession,
    canStart,
    dataReady,
    gateOpen,
    panelMode,
    timerActive,
  ]);

  const handleCompactClick = () => {
    if (!compact) return;

    if (onCompactClick) {
      if (!gateOpen) {
        play('click');
        setShowAuthPrompt(true);
        return;
      }

      play('click');
      onCompactClick();
      return;
    }

    if (!gateOpen) {
      play('click');
      setShowAuthPrompt(true);
      return;
    }

    if (!dataReady) {
      play('click');
      setQueuedCompactStart(true);
      return;
    }

    if (canStart) {
      handleAttemptStart(availableDayIndex);
    }
  };

  const renderTimerSession = (embedded: boolean) => {
    const sessionContent = (
      <div
        className={`${styles.modal} ${embedded ? styles.panelModal : ''}`}
        role="dialog"
        aria-modal={embedded ? undefined : true}
        aria-labelledby="field-notes-session-title"
      >
        <h3 id="field-notes-session-title" className={styles.srOnly}>Field Notes</h3>

        <div className={styles.modalMain}>
          <div className={styles.modalHeader}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              disabled={isSubmitting}
              onClick={() => {
                play('click');
                if (embedded && onPanelClose) {
                  closeSession();
                  onPanelClose();
                  return;
                }
                requestClose();
              }}
              onMouseEnter={() => play('hover')}
              aria-label={embedded ? 'Close field notes panel' : 'Back'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{embedded ? 'Close' : 'Back'}</span>
            </button>
            <span className={`${styles.timerCount} ${styles.timerCountHeader} ${isPaused ? styles.timerPaused : ''} ${timerSeconds <= 300 && !isPaused ? styles.timerWarning : ''}`}>
              {isPaused ? 'paused' : formatTimer(timerSeconds)}
            </span>
            <span className={styles.modalHeaderEnd} aria-hidden="true" />
          </div>

          <div className={styles.writeArea}>
            <textarea
              className={styles.textarea}
              placeholder="Every word is a step closer to the new you."
              value={timerText}
              onChange={(e) => setTimerText(e.target.value)}
              onClick={() => play('input-focus')}
              onKeyDown={() => play('click')}
              autoFocus
              disabled={isPaused || isSubmitting}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
          <button
            type="button"
            className={styles.submitBtn}
            disabled={isSubmitting}
            onClick={() => submitMorningPages()}
            onMouseEnter={() => play('hover')}
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    );

    if (embedded) {
      return (
        <div className={styles.panelSession} style={{ '--week-color': weekColor } as React.CSSProperties}>
          {sessionContent}
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
                      onClick={() => {
                        play('click');
                        closeSession();
                        onPanelClose?.();
                      }}
                      onMouseEnter={() => play('hover')}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return typeof window !== 'undefined' && createPortal(
      <div className={styles.modalOverlay} style={{ '--week-color': weekColor } as React.CSSProperties}>
        <div className={styles.modalBackdrop} onClick={requestClose} />
        {sessionContent}
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
    );
  };

  if (panelMode) {
    return (
      <div className={styles.panelWrapper} style={{ '--week-color': weekColor } as React.CSSProperties}>
        {!timerActive && (
          <div className={styles.panelStatusCard}>
            <div className={styles.panelStatusHeader}>
              <button
                type="button"
                className={styles.panelStatusClose}
                onClick={() => {
                  play('click');
                  onPanelClose?.();
                }}
                onMouseEnter={() => play('hover')}
                aria-label="Close field notes panel"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {timerActive && renderTimerSession(true)}

        {showAuthPrompt && typeof window !== 'undefined' && createPortal(
          <div className={styles.authPromptOverlay} onClick={() => setShowAuthPrompt(false)}>
            <div
              className={styles.authPromptDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="field-notes-auth-title"
              onClick={event => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.authPromptClose}
                onClick={() => setShowAuthPrompt(false)}
                aria-label="Close account prompt"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className={styles.authPromptContent}>
                <div className={styles.authPromptHero} aria-hidden="true">
                  <div className={styles.authPromptGlowOrb} />
                  <div className={styles.authPromptBubble}>
                    <span className={styles.authPromptBubbleSender}>Blue</span>
                    <p className={styles.authPromptBubbleText}>
                      {authPending
                        ? 'I’m getting your space ready so your pages save properly.'
                        : 'Create your account and I’ll keep your Field Notes, streak, and weekly progress in one place.'}
                    </p>
                  </div>
                  <div className={styles.authPromptAvatarStage}>
                    <div className={styles.authPromptAvatarHalo} />
                    <div className={styles.authPromptAvatarBase} />
                    <Image
                      src="/exxie.png"
                      alt=""
                      width={220}
                      height={260}
                      className={styles.authPromptAvatar}
                    />
                  </div>
                </div>
                <h3 id="field-notes-auth-title" className={styles.authPromptTitle}>
                  {authPending ? 'Your account is almost ready.' : 'Create an account to continue.'}
                </h3>
                <p className={styles.authPromptCopy}>
                  {authPending
                    ? 'We are finishing your setup so Field Notes can save to your account.'
                    : 'Field Notes saves your progress to your course account. Sign in to start writing and keep your progress.'}
                </p>

                <div className={styles.authPromptActions}>
                  {!authPending && (
                    <button
                      type="button"
                      className={styles.authPromptPrimary}
                      onClick={handleGuestCta}
                      disabled={!ready}
                    >
                      {ready ? 'Create account' : 'Loading sign-in...'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.authPromptSecondary}
                    onClick={() => setShowAuthPrompt(false)}
                  >
                    {authPending ? 'Close' : 'Not now'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showRewardAnimation && rewardData && typeof window !== 'undefined' && createPortal(
          <>
            <ConfettiCelebration trigger={true} />
            <DiamondReward
              amount={rewardData.shards}
              onComplete={() => setShowRewardAnimation(false)}
            />
          </>,
          document.body
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.card} ${compact ? styles.cardCompact : ''} ${compact && todayDone ? styles.cardDone : ''}`}
        style={{ '--week-color': weekColor } as React.CSSProperties}
        data-daily-note-status={!dataReady ? 'loading' : todayDone ? 'done' : 'pending'}
      >
        <div className={styles.cardBorder} aria-hidden="true" />
        <div className={styles.cardSurface} aria-hidden="true" />
        {!compact && (
          <div className={styles.vizBg}>
            <CyberpunkDataViz />
          </div>
        )}
        <button
          type="button"
          className={styles.cardButton}
          onClick={handleCompactClick}
          onMouseEnter={() => !todayDone && play('hover')}
          aria-label={todayDone ? 'Journal Entry Completed' : 'Open Journal'}
          disabled={todayDone}
        >
          <Image
            className={styles.icon}
            src={todayDone ? "/icons/ui-check.svg" : "/icons/notebook-writing.svg"}
            alt={todayDone ? "Completed icon" : "Notebook writing icon"}
            width={36}
            height={36}
          />
          <div className={styles.cardText}>
            <span className={`${styles.label} ${compact ? styles.labelCompact : ''}`}>
              {compact ? (todayDone ? 'Completed Today' : compactLabel) : 'Field Notes'}
            </span>
            {!compact && (
              <span className={`${styles.sublabel} ${compact ? styles.sublabelCompact : ''}`}>
                {todayDone ? 'Great work on today’s reflection' : cardSubLabel}
              </span>
            )}
          </div>
          <div className={styles.cardRight}>
            {compact && todayDone ? (
              <div className={styles.compactCheck}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <span className={styles.shardBadge} title="Earn 100 diamonds per day completed">
                <Image src="/icons/ui-diamond.svg" alt="diamonds" width={14} height={14} />
                +100 daily
              </span>
            )}
          </div>
        </button>

        {!compact && isExpanded && (
          <div className={styles.expandedContent}>
            {showSaveConfirm && (
              <p className={styles.saveConfirm} aria-live="polite">Saved</p>
            )}
          </div>
        )}
      </div>

      {showAuthPrompt && typeof window !== 'undefined' && createPortal(
        <div className={styles.authPromptOverlay} onClick={() => setShowAuthPrompt(false)}>
          <div
            className={styles.authPromptDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-notes-auth-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.authPromptClose}
              onClick={() => setShowAuthPrompt(false)}
              aria-label="Close account prompt"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.authPromptContent}>
              <div className={styles.authPromptHero} aria-hidden="true">
                <div className={styles.authPromptGlowOrb} />
                <div className={styles.authPromptBubble}>
                  <span className={styles.authPromptBubbleSender}>Blue</span>
                  <p className={styles.authPromptBubbleText}>
                    {authPending
                      ? 'I’m getting your space ready so your pages save properly.'
                      : 'Create your account and I’ll keep your Field Notes, streak, and weekly progress in one place.'}
                  </p>
                </div>
                <div className={styles.authPromptAvatarStage}>
                  <div className={styles.authPromptAvatarHalo} />
                  <div className={styles.authPromptAvatarBase} />
                  <Image
                    src="/exxie.png"
                    alt=""
                    width={220}
                    height={260}
                    className={styles.authPromptAvatar}
                  />
                </div>
              </div>
              <h3 id="field-notes-auth-title" className={styles.authPromptTitle}>
                {authPending ? 'Your account is almost ready.' : 'Create an account to continue.'}
              </h3>
              <p className={styles.authPromptCopy}>
                {authPending
                  ? 'We are finishing your setup so Field Notes can save to your account.'
                  : 'Field Notes saves your progress to your course account. Sign in to start writing and keep your progress.'}
              </p>

              <div className={styles.authPromptActions}>
                {!authPending && (
                  <button
                    type="button"
                    className={styles.authPromptPrimary}
                    onClick={handleGuestCta}
                    disabled={!ready}
                  >
                    {ready ? 'Create account' : 'Loading sign-in...'}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.authPromptSecondary}
                  onClick={() => setShowAuthPrompt(false)}
                >
                  {authPending ? 'Close' : 'Not now'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {timerActive && renderTimerSession(false)}

      {showRewardAnimation && rewardData && typeof window !== 'undefined' && createPortal(
        <>
          <ConfettiCelebration trigger={true} />
          <DiamondReward
            amount={rewardData.shards}
            onComplete={() => setShowRewardAnimation(false)}
          />
        </>,
        document.body
      )}
    </>
  );
}
