'use client';

import React from 'react';
import { useSound } from '@/hooks/useSound';
import styles from './ScrollingBanner.module.css';

interface ScrollingBannerProps {
  onClick: () => void;
}

export default function ScrollingBanner({ onClick }: ScrollingBannerProps) {
  const { play } = useSound();
  const text = 'BIG ANNOUNCEMENT!!!! ACADEMY BOOK PREORDER!!! • ';
  // Repeat the text enough times to cover screen widths and loop seamlessly
  const repeatedText = Array(12).fill(text).join('');

  return (
    <div 
      className={styles.banner} 
      onClick={onClick}
      onMouseEnter={() => play('soft-hover')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label="Academy book preorder announcement banner. Click to view details."
    >
      <div className={styles.marqueeContainer}>
        <div className={styles.marquee}>
          <span>{repeatedText}</span>
          <span>{repeatedText}</span>
        </div>
      </div>
    </div>
  );
}
