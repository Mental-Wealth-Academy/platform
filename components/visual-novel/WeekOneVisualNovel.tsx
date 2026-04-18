'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './WeekOneVisualNovel.module.css';

interface WeekOneVisualNovelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Scene {
  id: string;
  chapter: string;
  title: string;
  body: string;
  cue: string;
  image: string;
}

const SCENES: Scene[] = [
  {
    id: 'threshold',
    chapter: 'Scene 01',
    title: 'Safety Before Expression',
    body: 'Your creativity does not open under pressure. It opens when your nervous system feels safe enough to tell the truth.',
    cue: 'This week is about lowering the threat level around your art.',
    image: '/stories/week-01/scene-01.png',
  },
  {
    id: 'artist-child',
    chapter: 'Scene 02',
    title: 'Protect The Inner Artist',
    body: 'Think of your artist like a child. If the room feels harsh, judged, or rushed, that part of you goes quiet.',
    cue: 'Build conditions your artist wants to return to.',
    image: '/stories/week-01/scene-02.png',
  },
  {
    id: 'watch-the-voices',
    chapter: 'Scene 03',
    title: 'Notice What Feels Unsafe',
    body: 'Some danger is obvious. Some sounds like perfectionism, mockery, comparison, or the feeling that you have to prove yourself before you begin.',
    cue: 'Name the voices that make your work clamp shut.',
    image: '/stories/week-01/scene-03.png',
  },
  {
    id: 'safe-circle',
    chapter: 'Scene 04',
    title: 'Make A Safety Map',
    body: 'Put supportive people, places, and practices inside the circle. Put draining dynamics, overexposure, and false urgency outside it.',
    cue: 'Your boundaries are part of the art practice.',
    image: '/stories/week-01/scene-04.png',
  },
  {
    id: 'pages-as-shelter',
    chapter: 'Scene 05',
    title: 'Use Morning Pages As Shelter',
    body: 'Morning pages are not performance. They are private ground where your mind can stop posing and start revealing what is actually there.',
    cue: 'Write first. Edit later. Explain nothing.',
    image: '/stories/week-01/scene-03.png',
  },
  {
    id: 'week-one-vow',
    chapter: 'Scene 06',
    title: 'Gentle Consistency',
    body: 'Week 1 is not about being impressive. It is about becoming trustworthy to yourself by showing up without violence.',
    cue: 'Protect the channel, and the signal gets stronger.',
    image: '/stories/week-01/scene-04.png',
  },
];

export default function WeekOneVisualNovel({ isOpen, onClose }: WeekOneVisualNovelProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && sceneIndex < SCENES.length - 1) {
        setSceneIndex((c) => c + 1);
      }
      if (event.key === 'ArrowLeft' && sceneIndex > 0) {
        setSceneIndex((c) => c - 1);
      }
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

  return (
    <>
      <div
        className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />

      <div className={`${styles.modal} ${isAnimating ? styles.modalOpen : ''}`}>
        {/* Full-screen background image */}
        <Image
          key={scene.image}
          src={scene.image}
          alt={scene.title}
          fill
          priority
          className={styles.bgImage}
          sizes="100vw"
        />

        {/* Gradient overlays for readability */}
        <div className={styles.shade} />

        {/* Close button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close story"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Text overlay — top-left, well-inset */}
        <div className={styles.overlay}>
          <p className={styles.chapter}>{scene.chapter}</p>
          <h2 className={styles.title}>{scene.title}</h2>
          <p className={styles.body}>{scene.body}</p>
          <p className={styles.cue}>{scene.cue}</p>
        </div>

        {/* Bottom nav: dots + prev/next tap zones */}
        <div className={styles.bottomBar}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setSceneIndex((c) => Math.max(0, c - 1))}
            disabled={sceneIndex === 0}
            aria-label="Previous scene"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={styles.dots} role="tablist">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === sceneIndex}
                aria-label={`Go to ${s.title}`}
                className={`${styles.dot} ${i === sceneIndex ? styles.dotActive : ''}`}
                onClick={() => setSceneIndex(i)}
              />
            ))}
          </div>

          {isLast ? (
            <button type="button" className={styles.navBtn} onClick={onClose} aria-label="Finish">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setSceneIndex((c) => Math.min(SCENES.length - 1, c + 1))}
              aria-label="Next scene"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
