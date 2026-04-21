'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import styles from './LandingPage.module.css';

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => null,
});

export const LandingScene: React.FC = () => {
  const [showScene, setShowScene] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const canRenderScene = window.matchMedia('(min-width: 960px)').matches
      && window.matchMedia('(pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!canRenderScene) {
      return;
    }

    let hasActivated = false;
    const activateScene = () => {
      if (!hasActivated) {
        setShowScene(true);
        hasActivated = true;
      }
    };

    const onMouseMove = () => activateScene();
    window.addEventListener('mousemove', onMouseMove, { once: true });

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(activateScene, { timeout: 2000 });
      return () => {
        window.cancelIdleCallback(idleId);
        window.removeEventListener('mousemove', onMouseMove);
      };
    }

    const timeoutId = window.setTimeout(activateScene, 2000);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!showScene || typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const onMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [showScene]);

  return (
    <div className={styles.canvas}>
      {showScene && (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      )}
      {showScene ? (
        <div ref={cursorRef} className={styles.crosshair}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="rgba(81,104,255,0.5)" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="2" fill="rgba(81,104,255,0.7)" />
            <line x1="14" y1="0" x2="14" y2="8" stroke="rgba(81,104,255,0.3)" strokeWidth="1" />
            <line x1="14" y1="20" x2="14" y2="28" stroke="rgba(81,104,255,0.3)" strokeWidth="1" />
            <line x1="0" y1="14" x2="8" y2="14" stroke="rgba(81,104,255,0.3)" strokeWidth="1" />
            <line x1="20" y1="14" x2="28" y2="14" stroke="rgba(81,104,255,0.3)" strokeWidth="1" />
          </svg>
        </div>
      ) : null}
    </div>
  );
};

export default LandingScene;
