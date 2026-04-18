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
    body: 'The paintings have no signatures. Azura notices this in the second room, or maybe the third. Every frame hung too high \u2014 you\u2019d need to stand on something to see them properly. She picks up a small one leaning against the baseboard. A harbor, grey and careful. Someone\u2019s brushwork, thick at the edges where the paint was running out. She sets it back down. There is a man here who knows every piece by name. He can tell you who made them, when, what was said about them. He has spent years learning to hold other people\u2019s fire. She walks to the window. Outside: the same grey harbor the painting was made from. She wonders if he ever stands here in the dark. If the wanting still comes. \u201cWhat would you have made,\u201d she says quietly, \u201cif you\u2019d believed you were allowed to?\u201d',
    image: '/stories/week-01/scene-01.png',
  },
  {
    id: 'artist-child',
    body: 'The child is drawing on the floor. Azura finds her through a doorway she wasn\u2019t looking for \u2014 she stands at the threshold, doesn\u2019t cross it. The room smells like chalk dust and something closed. The child doesn\u2019t look up. She is drawing a bird, or trying to. The lines keep going wrong and she keeps going anyway. There is someone else in the room, near the far wall. Not moving. Azura doesn\u2019t look at them directly. She watches the child\u2019s hands instead. How carefully they move. How quietly \u2014 like the drawing is something that has to stay secret to stay safe. The chalk makes a small sound against the floor. The bird is still wrong. The child doesn\u2019t stop. Azura thinks: she has been waiting a long time for someone to come and not say anything. She stays in the doorway. The light from the drawing is enough.',
    image: '/stories/week-01/scene-02.png',
  },
  {
    id: 'the-monsters',
    body: 'The figure near the wall speaks. Not to the child \u2014 not exactly. It\u2019s more like the room has a temperature. Azura hears the shape of it: the particular certainty, the weight that lands on you and stays. She has heard it before, in different voices. It always sounds like someone who loved you. That\u2019s the part that makes it difficult. The child\u2019s hand goes still. The chalk rests on the floor. Azura crosses the room and crouches beside her. She doesn\u2019t say anything. She picks up a piece of chalk \u2014 a blunter one \u2014 and holds it out. The child looks at it for a long time. The voice hasn\u2019t stopped. It keeps going, patient, the way things go when they\u2019ve had years to practice. The child takes the chalk. Makes one careful line. Then another. The voice is still there. But the lines are also there. \u201cIt had a year it started,\u201d Azura says. \u201cIt wasn\u2019t always yours.\u201d',
    image: '/stories/week-01/scene-03.png',
  },
  {
    id: 'the-censor',
    body: 'The page has one sentence on it. Or most of one \u2014 it breaks off in the middle, pressure marks where the pen lifted. Azura sits across from it. She can see what it was trying to say: I am \u2014 and then nothing. She knows what happened at that word. The moment it lands on the page, something else wakes up. Something that has been waiting for exactly this, and now leans in with a different ending. She picks up the pen. She writes what the page was trying to say. Then she writes what came after \u2014 the interruption, the specific words, the tone, the year it probably started. When she\u2019s done the page is full. She reads it back. It looks ordinary. Smaller than it sounded in the room. \u201cWrite the interruption down too,\u201d she says. \u201cIt has less power once you can see the whole shape of it.\u201d',
    image: '/stories/week-01/scene-04.png',
  },
  {
    id: 'morning-pages',
    body: 'The corridor is still. Azura is here before any of the doors open \u2014 before the day has started talking. She takes out the notebook. Not because she has something to say. Because she has everything to say, all of it tangled: the leftover argument, the thing she almost wrote yesterday and didn\u2019t, the version of herself she performed last night and how tired that made her. She writes all of it. Badly, quickly, without looking back. Somewhere in the second page something loosens. Not fixed \u2014 nothing is fixed. But the weight of it changes when it\u2019s outside her. It starts looking like what it actually is, which is just weather. Things that passed through. She closes the notebook. One of the doors is brighter than the others now. She wasn\u2019t sure which one she\u2019d choose \u2014 now she is. \u201cBefore the day starts,\u201d she says. \u201cWrite first. Before you have time to perform.\u201d',
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
