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
    body: 'Every painting in the room is hung just too high to see properly. She picks one up from the baseboard \u2014 a grey harbor, someone\u2019s careful brushwork \u2014 and sets it back down. \u201cWhat would you have made,\u201d Azura says to the empty room, \u201cif you\u2019d believed you were allowed to?\u201d',
    image: '/stories/week-01/scene-01.png',
  },
  {
    id: 'artist-child',
    body: 'The child is drawing a bird on the floor \u2014 the lines keep going wrong and she keeps going anyway. Azura stands at the threshold and doesn\u2019t go in. She has been waiting a long time for someone to come and not say anything.',
    image: '/stories/week-01/scene-02.png',
  },
  {
    id: 'the-monsters',
    body: 'The voice in the room sounds like someone who loved you \u2014 that\u2019s what makes it difficult. Azura puts the chalk back in the child\u2019s hand without a word. \u201cIt had a year it started,\u201d she says. \u201cIt wasn\u2019t always yours.\u201d',
    image: '/stories/week-01/scene-03.png',
  },
  {
    id: 'the-censor',
    body: 'The page says \u201cI am \u2014\u201d and then nothing, pressure marks where the pen lifted. Azura writes it out in full \u2014 the claim, then the interruption, then the year it probably started \u2014 until the page is full and the whole thing looks ordinary. \u201cWrite the blurt down too,\u201d she says. \u201cIt\u2019s smaller once you can see it.\u201d',
    image: '/stories/week-01/scene-04.png',
  },
  {
    id: 'morning-pages',
    body: 'Azura opens the notebook before any of the doors open \u2014 before the day has started talking. She writes badly, quickly, all of it: the leftover argument, the thing she didn\u2019t say, the version of herself she performed yesterday. \u201cWrite before you have time to perform,\u201d she says. \u201cThe rest follows.\u201d',
    image: '/stories/week-01/scene-05.png',
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
