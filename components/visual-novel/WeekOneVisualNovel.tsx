'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './WeekOneVisualNovel.module.css';

interface WeekOneVisualNovelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Scene {
  id: string;
  body: string;
  image: string;
}

const SCENES: Scene[] = [
  {
    id: 'shadow-artist',
    body: 'Edwin made money. Real money. He traded, accumulated, built a life that looked like the one you were supposed to want. He filled every corner of his apartment with other people\'s paintings. He went to galleries the way other men went to church. He had learned, somewhere young, that making things was not for people like him. So he stayed close to art. Just not in it.',
    image: '/stories/week-01/scene-01.png',
  },
  {
    id: 'artist-child',
    body: 'Your artist is still in there. Young, quiet, waiting to see if the room is safe. Every time you said not yet — every time you sat through someone else\'s mockery, or your own — that part of you went a little further back. It didn\'t die. But it learned to hide. The question is not whether you can make something. It\'s whether you\'ve built a room it wants to walk back into.',
    image: '/stories/week-01/scene-02.png',
  },
  {
    id: 'the-monsters',
    body: 'At some point someone said it. It might have sounded like advice. It might have come from a teacher, a parent, a partner who loved you — someone afraid for you, or afraid of you. Somewhere inside, you converted it into law. You can\'t. Not you. It\'s too late. That is not a fact. That is a wound wearing the costume of wisdom.',
    image: '/stories/week-01/scene-03.png',
  },
  {
    id: 'the-censor',
    body: 'Here is the thing about affirmations: they feel stupid because your censor is paying attention. The moment you write "I am a brilliant and prolific painter," something in you will say, who do you think you are? Good. Write that down too. That blurt has a name, a face, a year it was planted. When you find it — really look at it — it loses most of its power.',
    image: '/stories/week-01/scene-04.png',
  },
  {
    id: 'morning-pages',
    body: 'Every morning, three pages. Longhand. Stream of consciousness. No rereading. No showing anyone. This is not writing — it is drainage. The mind offloading everything it picked up overnight: the anxiety, the leftover argument, the thing you didn\'t say. You do it before you have time to perform. That\'s the point. Morning pages don\'t ask you to be good. They ask you to be honest.',
    image: '/stories/week-01/scene-05.png',
  },
  {
    id: 'the-vow',
    body: 'This week is not about talent. It\'s about showing up once, small, without violence toward yourself. You are not trying to be impressive. You are trying to become someone your artist can trust. That trust is built one kept appointment at a time. Show up. Let it be bad. Keep the channel open. The signal gets stronger on its own.',
    image: '/stories/week-01/scene-06.png',
  },
  {
    id: 'shadow-careers',
    body: 'Erin was a children\'s therapist. Gifted, genuinely. For two decades she poured everything she had into other people\'s children — their drawings, their stories, their play. It took her that long to see it. She had been feeding her artist through everyone else\'s work. Pouring into a borrowed vessel because she didn\'t believe she was allowed her own. The art was always there. It just wasn\'t allowed to be hers.',
    image: '/stories/week-01/scene-07.png',
  },
  {
    id: 'artist-date',
    body: 'Once a week, take yourself somewhere. Not productive. Not useful. A five-and-dime store. A matinee alone. A hardware store just to look at the colors of paint chips. Your artist is a child, and children need to play without purpose. The artist date is not a reward for good work. It is the work. You are restocking the well you draw from. Go alone. Let yourself be delighted by something small.',
    image: '/stories/week-01/scene-08.png',
  },
  {
    id: 'imaginary-lives',
    body: 'If you could have five other lives, what would they be? A jazz singer in a small room. A marine biologist. A woman who makes furniture by hand. Write them down. Don\'t explain or justify. Then pick one — just one — and do a single small thing connected to it this week. Buy the field guide. Learn one chord. Walk into the woodshop and smell the sawdust. The life you didn\'t live is still trying to tell you something.',
    image: '/stories/week-01/scene-09.png',
  },
];

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait' | 'any' | 'natural' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary') => Promise<void>;
};

export default function WeekOneVisualNovel({ isOpen, onClose }: WeekOneVisualNovelProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Letter-by-letter animation
  useEffect(() => {
    if (!shouldRender) return;

    const fullText = SCENES[sceneIndex].body;
    setDisplayedText('');
    setIsTyping(true);

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(intervalRef.current!);
        setIsTyping(false);
      }
    }, 22);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sceneIndex, shouldRender]);

  // Orientation detection + landscape lock
  useEffect(() => {
    if (!isOpen) return;

    const syncOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    const lockLandscape = async () => {
      try {
        const orientation = typeof screen !== 'undefined' && 'orientation' in screen
          ? (screen.orientation as ScreenOrientationWithLock)
          : null;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } catch {
        // Rejected outside fullscreen/PWA — portrait overlay handles this case
      }
    };

    syncOrientation();
    lockLandscape();
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);

    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
    };
  }, [isOpen]);

  // Keyboard nav + open/close lifecycle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && sceneIndex < SCENES.length - 1) setSceneIndex((c) => c + 1);
      if (e.key === 'ArrowLeft' && sceneIndex > 0) setSceneIndex((c) => c - 1);
    };

    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(true)));
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setSceneIndex(0);
      }, 250);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, sceneIndex]);

  if (!shouldRender) return null;

  const scene = SCENES[sceneIndex];
  const isLast = sceneIndex === SCENES.length - 1;

  const goNext = () => {
    if (isTyping) {
      // Skip animation on tap if still typing
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedText(scene.body);
      setIsTyping(false);
    } else if (!isLast) {
      setSceneIndex((c) => c + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (sceneIndex > 0) setSceneIndex((c) => c - 1);
  };

  return (
    <>
      <div
        className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />

      <div className={`${styles.modal} ${isAnimating ? styles.modalOpen : ''}`}>
        {/* Background image */}
        <Image
          key={scene.image}
          src={scene.image}
          alt=""
          fill
          priority
          className={styles.bgImage}
          sizes="100vw"
        />

        {/* Shading gradients */}
        <div className={styles.shade} />

        {/* Close */}
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Story text overlay — top-left, well inset */}
        <div className={styles.overlay}>
          <p className={styles.body}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>

        {/* Invisible tap zones for prev / next */}
        <button type="button" className={styles.tapPrev} onClick={goPrev} aria-label="Previous scene" disabled={sceneIndex === 0} />
        <button type="button" className={styles.tapNext} onClick={goNext} aria-label="Next scene" />

        {/* Bottom bar: dots only */}
        <div className={styles.bottomBar}>
          <div className={styles.dots} role="tablist">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === sceneIndex}
                aria-label={`Scene ${i + 1}`}
                className={`${styles.dot} ${i === sceneIndex ? styles.dotActive : ''}`}
                onClick={() => setSceneIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Portrait hard-block overlay */}
        {isPortrait && (
          <div className={styles.portraitOverlay}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className={styles.rotateIcon}>
              <path d="M4 9V5a1 1 0 0 1 1-1h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 15v4a1 1 0 0 1-1 1h-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 8a8 8 0 0 0-13.66-5.66L4 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16a8 8 0 0 0 13.66 5.66L20 19" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className={styles.portraitText}>Rotate your phone to continue.</p>
          </div>
        )}
      </div>
    </>
  );
}
