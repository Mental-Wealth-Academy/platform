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

interface DailyReadProps {
  readings: Reading[];
  onReadClick: (index: number) => void;
}

export default function DailyRead({ readings, onReadClick }: DailyReadProps) {
  const { play } = useSound();
  const [isExpanded, setIsExpanded] = useState(true);
  const [readingIndex, setReadingIndex] = useState(0);
  const currentReading = readings[readingIndex];

  return (
    <div className={styles.card}>
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
            <span className={styles.label}>Daily Read</span>
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
            <div
              className={styles.readingImage}
              style={{ backgroundImage: `url(${currentReading.imageUrl})` }}
            />
            <div className={styles.readingInfo}>
              <p className={styles.readingCategory}>{currentReading.category}</p>
              <h4 className={styles.readingTitle}>{currentReading.title}</h4>
              <p className={styles.readingAuthor}>{currentReading.author}</p>
              <p className={styles.readingDesc}>{currentReading.description}</p>
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
