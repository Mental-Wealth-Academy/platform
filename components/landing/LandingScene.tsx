'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import styles from './LandingPage.module.css';

// Dynamically import Scene - preload immediately
const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => null,
});

export const LandingScene: React.FC = () => {
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    // Load scene quickly - just wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      setShowScene(true);
    });
  }, []);

  return (
    <div className={styles.canvas}>
      {showScene && (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      )}
    </div>
  );
};

export default LandingScene;
