'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import styles from './LandingPage.module.css';

const SwarmsCubes = dynamic(() => import('./SwarmsCubes'), {
  ssr: false,
  loading: () => null,
});

export const LandingScene: React.FC = () => {
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const canRenderScene = window.matchMedia('(min-width: 960px)').matches
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

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(activateScene, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(activateScene, 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className={styles.canvas}>
      {showScene && (
        <Suspense fallback={null}>
          <SwarmsCubes inverted />
        </Suspense>
      )}
    </div>
  );
};

export default LandingScene;
