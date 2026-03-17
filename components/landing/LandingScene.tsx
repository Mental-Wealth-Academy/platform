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
      {/* SVG filter for liquid glass distortion */}
      <svg className={styles.svgFilters} aria-hidden="true">
        <defs>
          <filter id="liquid-glass">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="3"
              seed="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {showScene && (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      )}
      <div className={styles.liquidGlassOverlay} />
    </div>
  );
};

export default LandingScene;
