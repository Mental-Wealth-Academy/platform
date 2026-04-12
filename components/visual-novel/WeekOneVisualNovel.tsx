'use client';

import React, { useEffect, useState } from 'react';
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
  palette: 'indigo' | 'gold' | 'teal' | 'rose' | 'violet';
}

const SCENES: Scene[] = [
  {
    id: 'threshold',
    chapter: 'Scene 01',
    title: 'Safety Before Expression',
    body: 'Your creativity does not open under pressure. It opens when your nervous system feels safe enough to tell the truth.',
    cue: 'This week is about lowering the threat level around your art.',
    palette: 'indigo',
  },
  {
    id: 'artist-child',
    chapter: 'Scene 02',
    title: 'Protect The Inner Artist',
    body: 'Think of your artist like a child. If the room feels harsh, judged, or rushed, that part of you goes quiet.',
    cue: 'Build conditions your artist wants to return to.',
    palette: 'gold',
  },
  {
    id: 'watch-the-voices',
    chapter: 'Scene 03',
    title: 'Notice What Feels Unsafe',
    body: 'Some danger is obvious. Some sounds like perfectionism, mockery, comparison, or the feeling that you have to prove yourself before you begin.',
    cue: 'Name the voices that make your work clamp shut.',
    palette: 'rose',
  },
  {
    id: 'safe-circle',
    chapter: 'Scene 04',
    title: 'Make A Safety Map',
    body: 'Put supportive people, places, and practices inside the circle. Put draining dynamics, overexposure, and false urgency outside it.',
    cue: 'Your boundaries are part of the art practice.',
    palette: 'teal',
  },
  {
    id: 'pages-as-shelter',
    chapter: 'Scene 05',
    title: 'Use Morning Pages As Shelter',
    body: 'Morning pages are not performance. They are private ground where your mind can stop posing and start revealing what is actually there.',
    cue: 'Write first. Edit later. Explain nothing.',
    palette: 'violet',
  },
  {
    id: 'week-one-vow',
    chapter: 'Scene 06',
    title: 'Gentle Consistency',
    body: 'Week 1 is not about being impressive. It is about becoming trustworthy to yourself by showing up without violence.',
    cue: 'Protect the channel, and the signal gets stronger.',
    palette: 'indigo',
  },
];

export default function WeekOneVisualNovel({ isOpen, onClose }: WeekOneVisualNovelProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const syncOrientation = () => {
      if (typeof window === 'undefined') return;
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    const lockLandscape = async () => {
      try {
        if (typeof screen !== 'undefined' && 'orientation' in screen && typeof screen.orientation.lock === 'function') {
          await screen.orientation.lock('landscape');
        }
      } catch {
        // Mobile browsers often reject orientation locking outside fullscreen/app contexts.
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && sceneIndex < SCENES.length - 1) {
        setSceneIndex((current) => current + 1);
      }
      if (event.key === 'ArrowLeft' && sceneIndex > 0) {
        setSceneIndex((current) => current - 1);
      }
    };

    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
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
  const progress = ((sceneIndex + 1) / SCENES.length) * 100;

  return (
    <>
      <div className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`} onClick={onClose} />
      <div className={`${styles.modal} ${styles[`palette${scene.palette[0].toUpperCase()}${scene.palette.slice(1)}`]} ${isAnimating ? styles.modalOpen : ''}`}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close week 1 visual novel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className={styles.chrome}>
          <div className={styles.kicker}>Week 1 Test</div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.counter}>{sceneIndex + 1} / {SCENES.length}</div>
        </div>

        <div className={styles.stage}>
          <section className={styles.mediaPanel} aria-hidden="true">
            <div className={styles.mediaGlow} />
            <div className={styles.mediaGrid} />
            <video
              className={styles.mediaVideo}
              src="https://i.imgur.com/sRcnrJB.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className={styles.mediaShade} />
            <div className={styles.mediaCaption}>
              <span className={styles.mediaLabel}>Recovering A Sense Of Safety</span>
              <span className={styles.mediaSubtle}>A condensed visual novel prototype for mobile landscape.</span>
            </div>
          </section>

          <section className={styles.dialoguePanel}>
            <div className={styles.dialogueFrame}>
              <p className={styles.chapter}>{scene.chapter}</p>
              <h2 className={styles.title}>{scene.title}</h2>
              <p className={styles.body}>{scene.body}</p>
              <p className={styles.cue}>{scene.cue}</p>
            </div>

            <div className={styles.sceneRail} aria-label="Scene selection">
              {SCENES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.sceneDot} ${index === sceneIndex ? styles.sceneDotActive : ''}`}
                  onClick={() => setSceneIndex(index)}
                  aria-label={`Go to ${item.title}`}
                />
              ))}
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setSceneIndex((current) => Math.max(0, current - 1))}
                disabled={sceneIndex === 0}
              >
                Previous
              </button>
              {sceneIndex < SCENES.length - 1 ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setSceneIndex((current) => Math.min(SCENES.length - 1, current + 1))}
                >
                  Next Scene
                </button>
              ) : (
                <button type="button" className={styles.primaryButton} onClick={onClose}>
                  Back To Week 1
                </button>
              )}
            </div>
          </section>
        </div>

        {isPortrait ? (
          <div className={styles.rotateOverlay}>
            <div className={styles.rotateCard}>
              <div className={styles.rotateIcon}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M4 9V5a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 15v4a1 1 0 0 1-1 1h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 8a8 8 0 0 0-13.66-5.66L4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16a8 8 0 0 0 13.66 5.66L20 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.rotateTitle}>Rotate your phone</h3>
              <p className={styles.rotateText}>This week 1 test is designed for landscape so the visuals and dialogue can share the screen.</p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
