'use client';

import React, { useState } from 'react';
import { useSound } from '@/hooks/useSound';
import styles from './DailyRead.module.css';

interface Reading {
  title: string;
  author: string;
  description: string;
  category: string;
  imageUrl: string;
  slug: string;
  markdownPath: string;
}

interface WeeklyReadProps {
  readings: Reading[];
  onReadClick: (index: number) => void;
  activeWeek: number;
}

const READING_COLORS = [
  '#5168FF', // Intro — primary
  '#4A7AFF', // Week 1
  '#3D8EF7', // Week 2
  '#2FA3E8', // Week 3
  '#22B8D6', // Week 4
  '#1CC9C4', // Week 5
  '#20D4A8', // Week 6
  '#2ADBA0', // Week 7 (shifted from the earlier teal toward a bit of a different hue, and starting from here it gets into cooler tones)
  '#34C7B8', // Week 8
  '#3BADD0', // Week 9
  '#4B8FDB', // Week 10
  '#6B6FE0', // Week 11
  '#8B5CE5', // Week 12
];

export default function WeeklyRead({ readings, onReadClick, activeWeek }: WeeklyReadProps) {
  const { play } = useSound();
  const [isExpanded, setIsExpanded] = useState(true);
  const [readingIndex, setReadingIndex] = useState(0);
  const currentReading = readings[readingIndex];
  const readingColor = READING_COLORS[readingIndex] || READING_COLORS[0];
  // Index 0 = Introduction (always unlocked), index 1 = Week 1, etc.
  const isReadingLocked = readingIndex > activeWeek;

  return (
    <div className={styles.card} style={{ '--week-color': readingColor } as React.CSSProperties}>
      <button
        type="button"
        className={styles.cardButton}
        onClick={() => { play(isExpanded ? 'toggle-off' : 'toggle-on'); setIsExpanded(!isExpanded); }}
        onMouseEnter={() => play('hover')}
      >
        <div className={styles.cardLeft}>
          <div className={styles.icon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <span className={styles.label}>Weekly Read</span>
            <span className={styles.sublabel}>{currentReading.category} — {currentReading.title}</span>
          </div>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.counter}>{readingIndex + 1}/{readings.length}</span>
          <svg
            className={`${styles.chevron} ${isExpanded ? styles.chevronRotated : ''}`}
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.readingCard}>
            {currentReading.imageUrl.endsWith('.mp4') ? (
              <video
                className={styles.readingVideo}
                src={currentReading.imageUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <div
                className={styles.readingImage}
                style={{ backgroundImage: `url(${currentReading.imageUrl})` }}
              />
            )}
            <div className={styles.readingInfo}>
              <p className={styles.readingCategory}>{currentReading.category}</p>
              <h4 className={styles.readingTitle}>{currentReading.title}</h4>
              <p className={styles.readingAuthor}>{currentReading.author}</p>
              <p className={styles.readingDesc}>{currentReading.description}</p>
              {isReadingLocked ? (
                <span className={styles.lockedBadge}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Unlocks Week {readingIndex}
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.readBtn}
                  onClick={() => { play('click'); onReadClick(readingIndex); }}
                  onMouseEnter={() => play('hover')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Read Article
                </button>
              )}
            </div>
          </div>

          <div className={styles.readingNav}>
            <button
              className={styles.navBtn}
              disabled={readingIndex === 0}
              onClick={() => { play('click'); setReadingIndex(i => i - 1); }}
              onMouseEnter={() => play('hover')}
              aria-label="Previous reading"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className={styles.navLabel}>{readingIndex + 1} / {readings.length}</span>
            <button
              className={styles.navBtn}
              disabled={readingIndex === readings.length - 1}
              onClick={() => { play('click'); setReadingIndex(i => i + 1); }}
              onMouseEnter={() => play('hover')}
              aria-label="Next reading"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
