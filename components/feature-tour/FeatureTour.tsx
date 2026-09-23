'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/safe-storage';
import CtaButton from '@/components/shared/CtaButton';
import styles from './FeatureTour.module.css';

/**
 * The home first-run guide. A focused, two-phase walkthrough that runs after
 * onboarding on every device:
 *
 *   Phase A ("intro")  — right after onboarding, walk through the profile,
 *     learning folders, and Daily Notes on the current /home dashboard.
 *   Phase B ("course") — after the user finishes their first note, a centered
 *     Blue card points them to the course (weekly tasks + seasonal activities)
 *     and reminds them they can ask Blue anything about the Academy.
 *
 * Spotlight targets are marked with `data-tour` attributes on /home.
 */

// Set by OnboardingModal the moment a profile is created — the only signal that
// a user *just* onboarded, so the guide never shows for existing accounts.
const PENDING_KEY = 'mwa-home-intro-pending';
// Set once Phase A is skipped, finished, or the user taps Start.
const INTRO_SEEN_KEY = 'mwa-home-intro-seen';
// Set by DailyNotes on the user's first successful note save.
const FIRST_NOTE_KEY = 'mwa-first-daily-note-done';
// Set once Phase B is dismissed/finished.
const COURSE_NUDGE_KEY = 'mwa-home-course-nudge-seen';
// Armed when the user accepts the Phase B nudge — tells the course page's
// CourseTour to pick the walkthrough back up the moment they land there.
const COURSE_TOUR_PENDING_KEY = 'mwa-course-tour-pending';
// Recurring daily-note nudge: shown once per calendar day, on the first /home
// visit of the day, regardless of time of day (no "morning only" gate).
const DAILY_SPOTLIGHT_PREFIX = 'mwa-daily-spotlight-shown';
const dailySpotlightKey = () =>
  `${DAILY_SPOTLIGHT_PREFIX}-${new Date().toISOString().split('T')[0]}`;

const DAILY_NOTE_TARGET = 'daily-note';
const BLUE_AVATAR_SRC = '/blue/blue-home.png';

type Phase = 'idle' | 'intro' | 'course' | 'remind';
type RemindMode = 'reminder' | 'done';

interface IntroStep {
  target: string;
  title: string;
  body: string;
}

const INTRO_STEPS: IntroStep[] = [
  {
    target: 'home-profile',
    title: 'Your Academy record',
    body: 'Your profile keeps your learning status and current streak together. Select your avatar or name to update them.',
  },
  {
    target: 'home-courses',
    title: 'Choose a learning path',
    body: 'Continue Blue\'s Quest, browse Academy courses, open your personal course, or build a new one.',
  },
  {
    target: DAILY_NOTE_TARGET,
    title: 'Record a Daily Note',
    body: 'Capture one observation, question, or pattern each day. Saving the note adds it to your field-note record.',
  },
];

export interface FeatureTourProps {
  suppressed?: boolean;
}

export default function FeatureTour({ suppressed = false }: FeatureTourProps = {}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [remindMode, setRemindMode] = useState<RemindMode>('reminder');
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const calloutRef = useRef<HTMLDivElement>(null);

  const introStep = INTRO_STEPS[stepIndex];
  const isLastIntro = stepIndex === INTRO_STEPS.length - 1;
  const activeTarget = phase === 'intro' ? introStep.target : DAILY_NOTE_TARGET;

  // ── Phase A controls ──
  const finishIntro = useCallback(() => {
    setStorageItem(INTRO_SEEN_KEY, '1');
    removeStorageItem(PENDING_KEY);
    setRect(null);
    setPhase('idle');
  }, []);

  const startFirstNote = useCallback(() => {
    setStorageItem(INTRO_SEEN_KEY, '1');
    removeStorageItem(PENDING_KEY);
    setRect(null);
    setPhase('idle');
    // Open the writing session by activating the card's button. A short delay
    // lets the overlay tear down first so focus lands cleanly in the editor.
    window.setTimeout(() => {
      const btn = document.querySelector<HTMLElement>(`[data-tour="${DAILY_NOTE_TARGET}"] button`);
      btn?.click();
    }, 80);
  }, []);

  const nextIntro = useCallback(() => {
    setStepIndex((s) => Math.min(s + 1, INTRO_STEPS.length - 1));
  }, []);

  const backIntro = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  // ── Phase B controls ──
  const finishCourseNudge = useCallback(() => {
    setStorageItem(COURSE_NUDGE_KEY, '1');
    setPhase('idle');
  }, []);

  const goToCourse = useCallback(() => {
    setStorageItem(COURSE_NUDGE_KEY, '1');
    // Hand the walkthrough off to the course page so the spotlight continues
    // there (chapter → first mission) instead of ending at the door.
    setStorageItem(COURSE_TOUR_PENDING_KEY, '1');
    setPhase('idle');
    router.push('/shadow-work');
  }, [router]);

  // ── Daily reminder controls ──
  const dismissRemind = useCallback(() => {
    setRect(null);
    setPhase('idle');
  }, []);

  const writeTodayNote = useCallback(() => {
    setRect(null);
    setPhase('idle');
    // Open the writing session by activating the card's button, after the
    // overlay tears down so focus lands cleanly in the editor.
    window.setTimeout(() => {
      const btn = document.querySelector<HTMLElement>(`[data-tour="${DAILY_NOTE_TARGET}"] button`);
      btn?.click();
    }, 80);
  }, []);

  // Tear down if suppressed becomes true while a phase is active
  useEffect(() => {
    if (suppressed && phase !== 'idle') {
      setPhase('idle');
      setRect(null);
    }
  }, [suppressed, phase]);

  // Decide what (if anything) to show, once on mount.
  const initPhase = useCallback(() => {
    if (typeof window === 'undefined' || suppressed) return;

    const introPending = getStorageItem(PENDING_KEY) === '1';
    const introSeen = getStorageItem(INTRO_SEEN_KEY) === '1';
    const firstNoteDone = getStorageItem(FIRST_NOTE_KEY) === '1';
    const courseNudgeSeen = getStorageItem(COURSE_NUDGE_KEY) === '1';
    const dailyKey = dailySpotlightKey();

    // Phase A — a brand-new onboarded user who hasn't seen the intro yet.
    if (introPending && !introSeen) {
      // The intro already spotlights the note, so don't stack the daily nudge today.
      setStorageItem(dailyKey, '1');
      let cancelled = false;
      let tries = 0;
      const poll = () => {
        if (cancelled) return;
        if (document.querySelector(`[data-tour="${INTRO_STEPS[0].target}"]`)) {
          setStepIndex(0);
          setPhase('intro');
          return;
        }
        if (tries++ > 50) return; // ~20s, then give up quietly
        window.setTimeout(poll, 400);
      };
      poll();
      return () => {
        cancelled = true;
      };
    }

    // Phase B fallback — they saw the intro and already wrote their first note
    // (possibly elsewhere); nudge them toward the course now.
    if (introSeen && firstNoteDone && !courseNudgeSeen) {
      setStorageItem(dailyKey, '1');
      setPhase('course');
      return;
    }

    // Daily reminder — once per calendar day, on the first /home visit. Waits
    // for the Daily Note card to resolve its status, then spotlights it with a
    // reminder (note still pending) or a brief confirmation (already done).
    if (getStorageItem(dailyKey) !== '1') {
      let cancelled = false;
      let tries = 0;
      const poll = () => {
        if (cancelled) return;
        const el = document.querySelector(
          `[data-tour="${DAILY_NOTE_TARGET}"] [data-daily-note-status]`,
        );
        const stat = el?.getAttribute('data-daily-note-status');
        if (stat === 'done' || stat === 'pending') {
          setStorageItem(dailyKey, '1');
          setRemindMode(stat === 'done' ? 'done' : 'reminder');
          setPhase('remind');
          return;
        }
        if (tries++ > 50) return; // ~20s, then give up quietly
        window.setTimeout(poll, 400);
      };
      poll();
      return () => {
        cancelled = true;
      };
    }
  }, [suppressed]);

  useEffect(() => {
    initPhase();
  }, [initPhase]);

  // Re-run when profile is updated (e.g., onboarding completes)
  useEffect(() => {
    const onProfileUpdated = () => {
      window.setTimeout(() => initPhase(), 600);
    };
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => window.removeEventListener('profileUpdated', onProfileUpdated);
  }, [initPhase]);

  // Live Phase B trigger: fired by DailyNotes on the first completed note. A
  // small delay lets the credit/reward animation play before Blue chimes in.
  useEffect(() => {
    const onCompleted = () => {
      if (getStorageItem(INTRO_SEEN_KEY) !== '1') return;
      if (getStorageItem(COURSE_NUDGE_KEY) === '1') return;
      window.setTimeout(() => setPhase('course'), 1600);
    };
    window.addEventListener('dailyNoteCompleted', onCompleted);
    return () => window.removeEventListener('dailyNoteCompleted', onCompleted);
  }, []);

  // Locate the spotlight target and scroll it into view (spotlight phases).
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'remind') return;
    let cancelled = false;
    const locate = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${activeTarget}"]`);
      if (!el) return;
      // Instant scroll so the rect is settled when we read it — capturing it
      // mid-smooth-scroll is what makes the spotlight jitter into place.
      el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      if (!cancelled) setRect(el.getBoundingClientRect());
    };
    locate();
    return () => {
      cancelled = true;
    };
  }, [activeTarget, phase]);

  // Keep the spotlight aligned as the page scrolls or resizes (spotlight phases).
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'remind') return;
    const sync = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${activeTarget}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [activeTarget, phase]);

  // Keyboard controls for the intro phase.
  useEffect(() => {
    if (phase !== 'intro') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishIntro();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastIntro) startFirstNote();
        else nextIntro();
      } else if (e.key === 'ArrowLeft') backIntro();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isLastIntro, finishIntro, startFirstNote, nextIntro, backIntro]);

  // Keyboard controls for the daily reminder phase.
  useEffect(() => {
    if (phase !== 'remind') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissRemind();
      else if ((e.key === 'Enter') && remindMode === 'reminder') writeTodayNote();
      else if (e.key === 'Enter') dismissRemind();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, remindMode, dismissRemind, writeTodayNote]);

  // Position the callout near the target, or centered when there is none.
  useEffect(() => {
    if (phase === 'idle') return;
    const el = calloutRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 600;
    const margin = isMobile ? 22 : 16;
    const gap = 14;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;

    let top: number;
    let left: number;

    if (!rect) {
      top = Math.max(margin, (vh - ch) / 2);
      left = Math.max(margin, (vw - cw) / 2);
    } else if (vw - rect.right >= cw + gap + margin) {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - ch / 2;
    } else if (rect.left >= cw + gap + margin) {
      left = rect.left - gap - cw;
      top = rect.top + rect.height / 2 - ch / 2;
    } else if (rect.top >= ch + gap + margin) {
      top = rect.top - gap - ch;
      left = rect.left + rect.width / 2 - cw / 2;
    } else {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - cw / 2;
      // If there isn't enough room below the target, the viewport clamp
      // would push the callout back up over the target, overlapping it.
      // Try above instead (the top clamp handles overflow at the top edge).
      if (rect.bottom + gap + ch + margin > vh) {
        top = rect.top - gap - ch;
        if (top < margin) {
          top = Math.max(margin, (vh - ch) / 2);
          left = Math.max(margin, (vw - cw) / 2);
        }
      }
    }

    top = Math.min(Math.max(margin, top), vh - ch - margin);
    left = Math.min(Math.max(margin, left), vw - cw - margin);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.opacity = '1';
  }, [rect, stepIndex, phase]);

  if (suppressed || typeof document === 'undefined') return null;

  const renderSpotlight = (targetRect: DOMRect | null) => {
    if (!targetRect || typeof window === 'undefined') return null;
    const pad = 6;
    const minEdgeMargin = 10;
    const spotLeft = Math.max(minEdgeMargin, targetRect.left - pad);
    const spotRight = Math.min(window.innerWidth - minEdgeMargin, targetRect.right + pad);
    const spotWidth = Math.max(0, spotRight - spotLeft);
    return (
      <div
        className={styles.spotlight}
        style={{
          top: targetRect.top - pad,
          left: spotLeft,
          width: spotWidth,
          height: targetRect.height + pad * 2,
        }}
      />
    );
  };

  const blueHeader = (extra?: ReactNode, name: string = 'Blue') => (
    <div className={styles.blueHead}>
      <span className={styles.blueAvatar}>
        <Image
          className={styles.blueAvatarImg}
          src={BLUE_AVATAR_SRC}
          alt=""
          width={36}
          height={36}
          unoptimized
        />
      </span>
      <span className={styles.blueName}>{name}</span>
      {extra}
    </div>
  );

  const courseNode = (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="What's next">
      <div className={`${styles.scrim} ${styles.scrimSolid}`} />
      <div ref={calloutRef} className={`${styles.callout} ${styles.calloutCentered}`}>
        {blueHeader()}
        <h3 className={styles.title}>First signal archived</h3>
        <p className={styles.body}>
          I saved the entry. Your course turns one observation into a pattern you can test.
        </p>
        <p className={styles.bodyFaint}>
          Choose one mission. I will remember the result.
        </p>
        <div className={styles.actions}>
          <span className={styles.skipSlot}>
            <button type="button" className={styles.skip} onClick={finishCourseNudge}>
              Maybe later
            </button>
          </span>
          <span className={styles.navBtns}>
            <CtaButton size="sm" className={styles.next} onClick={goToCourse}>
              Go to your course
            </CtaButton>
          </span>
        </div>
      </div>
    </div>
  );

  const introNode = (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Daily Note intro">
      <div className={`${styles.scrim} ${rect ? '' : styles.scrimSolid}`} />

      {renderSpotlight(rect)}

      <div ref={calloutRef} className={styles.callout}>
        {blueHeader(
          INTRO_STEPS.length > 1 ? (
            <span className={styles.stepBadge}>
              {stepIndex + 1} of {INTRO_STEPS.length}
            </span>
          ) : undefined
        )}
        <h3 className={styles.title}>{introStep.title}</h3>
        <p className={styles.body}>{introStep.body}</p>
        <div className={styles.actions}>
          <span className={styles.skipSlot}>
            <button type="button" className={styles.skip} onClick={finishIntro}>
              Skip
            </button>
          </span>
          <span className={styles.navBtns}>
            {stepIndex > 0 && (
              <CtaButton variant="secondary" size="sm" className={styles.back} onClick={backIntro}>
                Back
              </CtaButton>
            )}
            {isLastIntro ? (
              <CtaButton size="sm" className={styles.next} onClick={startFirstNote}>
                Start your first note
              </CtaButton>
            ) : (
              <CtaButton size="sm" className={styles.next} onClick={nextIntro}>
                Next
              </CtaButton>
            )}
          </span>
        </div>
      </div>
    </div>
  );

  const remindNode = (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Daily Note reminder">
      <div className={`${styles.scrim} ${rect ? '' : styles.scrimSolid}`} />

      {renderSpotlight(rect)}

      <div ref={calloutRef} className={styles.callout}>
        {blueHeader()}
        {remindMode === 'done' ? (
          <>
            <h3 className={styles.title}>Record sealed</h3>
            <p className={styles.body}>
              Today&rsquo;s signal is in the archive. Your streak holds. Return when the world gives you another anomaly.
            </p>
            <div className={styles.actions}>
              <span className={styles.skipSlot} />
              <span className={styles.navBtns}>
                <CtaButton size="sm" className={styles.next} onClick={dismissRemind}>
                  Got it
                </CtaButton>
              </span>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>The archive is listening</h3>
            <p className={styles.body}>
              Bring me one pattern, question, or anomaly from today. I will keep it beside the rest of your work.
            </p>
            <div className={styles.actions}>
              <span className={styles.skipSlot}>
                <button type="button" className={styles.skip} onClick={dismissRemind}>
                  Later
                </button>
              </span>
              <span className={styles.navBtns}>
                <CtaButton size="sm" className={styles.next} onClick={writeTodayNote}>
                  Get started
                </CtaButton>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const overlayNode =
    phase === 'course'
      ? courseNode
      : phase === 'intro'
        ? introNode
        : phase === 'remind'
          ? remindNode
          : null;

  // Dev-only launcher so the guide can be triggered on localhost without going
  // through onboarding/auth. Compiled out of production builds.
  const showDevPanel = process.env.NODE_ENV !== 'production';

  const armAndReload = () => {
    setStorageItem(PENDING_KEY, '1');
    removeStorageItem(INTRO_SEEN_KEY);
    removeStorageItem(FIRST_NOTE_KEY);
    removeStorageItem(COURSE_NUDGE_KEY);
    removeStorageItem(COURSE_TOUR_PENDING_KEY);
    window.location.reload();
  };

  const resetGuide = () => {
    removeStorageItem(PENDING_KEY);
    removeStorageItem(INTRO_SEEN_KEY);
    removeStorageItem(FIRST_NOTE_KEY);
    removeStorageItem(COURSE_NUDGE_KEY);
    removeStorageItem(COURSE_TOUR_PENDING_KEY);
    removeStorageItem(dailySpotlightKey());
    setRect(null);
    setPhase('idle');
  };

  const devPanel = (
    <div className={styles.devPanel}>
      <span className={styles.devPanelLabel}>First-run guide (dev)</span>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setStepIndex(0);
          setRect(null);
          setPhase('intro');
        }}
      >
        Intro
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setRect(null);
          setPhase('course');
        }}
      >
        Course
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setRemindMode('reminder');
          setRect(null);
          setPhase('remind');
        }}
      >
        Remind
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setRemindMode('done');
          setRect(null);
          setPhase('remind');
        }}
      >
        Done note
      </button>
      <button type="button" className={styles.devBtn} onClick={armAndReload}>
        Arm + reload
      </button>
      <button type="button" className={styles.devBtn} onClick={resetGuide}>
        Reset
      </button>
    </div>
  );

  return (
    <>
      {overlayNode && createPortal(overlayNode, document.body)}
      {showDevPanel && createPortal(devPanel, document.body)}
    </>
  );
}
