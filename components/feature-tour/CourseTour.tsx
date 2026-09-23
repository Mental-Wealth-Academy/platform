'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/safe-storage';
import styles from './FeatureTour.module.css';

/**
 * The course-page leg of the first-run walkthrough. It picks up where the home
 * guide (FeatureTour) leaves off and runs in two segments:
 *
 *   Intro (on arrival) — spotlights the week's chapter, then the first mission.
 *     The final step opens that mission for them, then steps aside and waits.
 *
 *   Outro (after they finish a mission) — once WeekTasksView fires
 *     `missionCompleted`, Daemon returns to point out the shop (where credits
 *     are spent) and then hand off to Blue, who watches over this pocket world.
 *
 * Targets: `data-tour="course-reading"` and `data-tour="course-mission"` on the
 * course page; `data-tour="shop"` and `data-tour="ask-blue"` in TopNavigation.
 */

// Armed by FeatureTour's Phase B "Go to your course".
const PENDING_KEY = 'mwa-course-tour-pending';
// Set when the intro hands off — we've opened a mission and are waiting for the
// user to finish one before showing the closing (shop + Blue) spotlights.
const AWAIT_KEY = 'mwa-course-tour-await';
// Terminal flag — the whole walkthrough is done; never show it again.
const SEEN_KEY = 'mwa-course-tour-seen';

const BLUE_AVATAR_SRC = '/exxie.png';

type Phase = 'idle' | 'tour';
type Segment = 'intro' | 'outro';

interface TourStep {
  target: string;
  title: string;
  body: string;
  cta: string;
  // When true, finishing this step clicks the spotlighted element after the
  // overlay tears down (opens the mission, or opens Blue's chat).
  opensTarget?: boolean;
}

const INTRO_STEPS: TourStep[] = [
  {
    target: 'course-reading',
    title: "Start with the week's chapter",
    body: 'Every week opens with a short reading or visual story. Read or watch it first — it frames the missions that follow.',
    cta: 'Next',
  },
  {
    target: 'course-mission',
    title: 'Then run your missions',
    body: "Here's where it gets good. Open one and see what it pulls out of you.",
    cta: 'Open a mission',
    opensTarget: true,
  },
];

const OUTRO_STEPS: TourStep[] = [
  {
    target: 'shop',
    title: 'Spend what you earn',
    body: 'Those diamonds are good for more than a number. The shop trades them for custom merch and tools — some physical, some digital, some that live in both worlds.',
    cta: 'Next',
  },
  {
    target: 'ask-blue',
    title: 'When you need more, ask Blue',
    body: "I only keep the gears turning back here — the small things. Anything deeper, ask Blue. She watches over the whole of this pocket world, and little escapes her.",
    cta: 'Meet Blue',
    opensTarget: true,
  },
];

export default function CourseTour() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [segment, setSegment] = useState<Segment>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const calloutRef = useRef<HTMLDivElement>(null);

  const steps = segment === 'intro' ? INTRO_STEPS : OUTRO_STEPS;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const clickTarget = useCallback((target: string) => {
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.click();
    }, 80);
  }, []);

  // Close the whole walkthrough for good.
  const finishAll = useCallback(() => {
    setStorageItem(SEEN_KEY, '1');
    removeStorageItem(PENDING_KEY);
    removeStorageItem(AWAIT_KEY);
    setRect(null);
    setPhase('idle');
  }, []);

  const next = useCallback(() => {
    setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  }, [steps.length]);

  const back = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  const advance = useCallback(() => {
    // Intro's last step opens the mission and parks the tour until the user
    // finishes one — it does NOT mark the walkthrough done.
    if (segment === 'intro' && isLast) {
      setStorageItem(AWAIT_KEY, '1');
      removeStorageItem(PENDING_KEY);
      setRect(null);
      setPhase('idle');
      clickTarget(step.target);
      return;
    }
    if (isLast) {
      // Outro's last step (Blue) hands off into the chat and ends the tour.
      const target = step.target;
      finishAll();
      if (step.opensTarget) clickTarget(target);
      return;
    }
    next();
  }, [segment, isLast, step, next, finishAll, clickTarget]);

  // Decide whether (and what) to run, once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getStorageItem(SEEN_KEY) === '1') return;
    // Mid-walkthrough: a mission was opened but not yet finished. Stay quiet and
    // let the missionCompleted listener bring back the closing spotlights.
    if (getStorageItem(AWAIT_KEY) === '1') return;
    if (getStorageItem(PENDING_KEY) !== '1') return;

    let cancelled = false;
    let tries = 0;
    const poll = () => {
      if (cancelled) return;
      if (document.querySelector(`[data-tour="${INTRO_STEPS[0].target}"]`)) {
        setSegment('intro');
        setStepIndex(0);
        setPhase('tour');
        return;
      }
      if (tries++ > 50) return; // ~20s, then give up quietly
      window.setTimeout(poll, 400);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  // After the user finishes their first mission, bring Daemon back for the
  // closing spotlights (shop → Blue). A short delay lets the reward play.
  useEffect(() => {
    const onMissionCompleted = () => {
      if (getStorageItem(SEEN_KEY) === '1') return;
      if (getStorageItem(AWAIT_KEY) !== '1') return;
      removeStorageItem(AWAIT_KEY);
      window.setTimeout(() => {
        setSegment('outro');
        setStepIndex(0);
        setPhase('tour');
      }, 1400);
    };
    window.addEventListener('missionCompleted', onMissionCompleted);
    return () => window.removeEventListener('missionCompleted', onMissionCompleted);
  }, []);

  // Locate the current target and scroll it into view. Instant scroll so the
  // rect is settled when we read it — capturing it mid-animation jitters.
  useEffect(() => {
    if (phase !== 'tour') return;
    let cancelled = false;
    let tries = 0;
    const locate = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        if (tries++ > 25) return;
        window.setTimeout(locate, 200);
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      if (!cancelled) setRect(el.getBoundingClientRect());
    };
    locate();
    return () => {
      cancelled = true;
    };
  }, [phase, step.target]);

  // Keep the spotlight aligned as the page scrolls or resizes.
  useEffect(() => {
    if (phase !== 'tour') return;
    const sync = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [phase, step.target]);

  // Keyboard controls.
  useEffect(() => {
    if (phase !== 'tour') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishAll();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') advance();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, advance, back, finishAll]);

  // Position the callout near the target, or centered when there is none yet.
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
    }

    top = Math.min(Math.max(margin, top), vh - ch - margin);
    left = Math.min(Math.max(margin, left), vw - cw - margin);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.opacity = '1';
  }, [rect, stepIndex, phase, segment]);

  if (typeof document === 'undefined') return null;

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

  const blueHeader = (extra?: ReactNode) => (
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
      <span className={styles.blueName}>Daemon</span>
      {extra}
    </div>
  );

  const tourNode = phase === 'tour' && (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Course walkthrough">
      <div className={`${styles.scrim} ${rect ? '' : styles.scrimSolid}`} />

      {renderSpotlight(rect)}

      <div ref={calloutRef} className={styles.callout}>
        {blueHeader(
          <span className={styles.stepBadge}>
            {stepIndex + 1} of {steps.length}
          </span>
        )}
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <span className={styles.skipSlot}>
            <button type="button" className={styles.skip} onClick={finishAll}>
              Skip
            </button>
          </span>
          <span className={styles.navBtns}>
            {stepIndex > 0 && (
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
            )}
            <button type="button" className={styles.next} onClick={advance}>
              {step.cta}
            </button>
          </span>
        </div>
      </div>
    </div>
  );

  // Dev-only launcher so the course tour can be triggered on localhost without
  // going through onboarding. Compiled out of production builds.
  const showDevPanel = process.env.NODE_ENV !== 'production';

  const devPanel = (
    <div className={styles.devPanel}>
      <span className={styles.devPanelLabel}>Course tour (dev)</span>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setSegment('intro');
          setStepIndex(0);
          setRect(null);
          setPhase('tour');
        }}
      >
        Intro
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setSegment('outro');
          setStepIndex(0);
          setRect(null);
          setPhase('tour');
        }}
      >
        Outro
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          setStorageItem(PENDING_KEY, '1');
          removeStorageItem(AWAIT_KEY);
          removeStorageItem(SEEN_KEY);
          window.location.reload();
        }}
      >
        Arm + reload
      </button>
      <button
        type="button"
        className={styles.devBtn}
        onClick={() => {
          removeStorageItem(PENDING_KEY);
          removeStorageItem(AWAIT_KEY);
          removeStorageItem(SEEN_KEY);
          setRect(null);
          setPhase('idle');
        }}
      >
        Reset
      </button>
    </div>
  );

  return (
    <>
      {tourNode && createPortal(tourNode, document.body)}
      {showDevPanel && createPortal(devPanel, document.body)}
    </>
  );
}
