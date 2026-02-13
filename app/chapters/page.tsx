'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import ChapterDetail from '@/components/sealed-library/ChapterDetail';
import { ChapterData } from '@/components/sealed-library/ChapterCard';
import { CHAPTERS, PROMPTS } from '@/lib/library-seed-data';
import styles from './page.module.css';

const TAGLINES = [
  'Helping people',
  'gain agency in their lives',
  'fund holistic decisions',
  'control their own destiny',
  'with other humans for a better world',
];

export default function Chapters() {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch chapters');
      const data = await response.json();
      setChapters(data.chapters || []);
      setIsAuthenticated(data.authenticated || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const chapter1 = chapters.find((c) => c.chapter_number === 1);
  const lockedChapters = CHAPTERS.filter((c) => c.chapter_number >= 2);
  const chapter1Prompts = PROMPTS[1] || [];

  const handlePromptClick = () => {
    if (!isAuthenticated || !chapter1) return;
    if (chapter1.status === 'locked' || chapter1.status === 'preview') return;
    setSelectedChapterId(chapter1.id);
  };

  const handleCloseDetail = () => {
    setSelectedChapterId(null);
    fetchChapters();
  };

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Loading your journey...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryButton} onClick={fetchChapters} type="button">
                Try Again
              </button>
            </div>
          ) : (
            <div className={styles.editorial}>
              {/* Left Column - Sticky overview */}
              <div className={styles.leftColumn}>
                <h1 className={styles.storyTitle}>A New Horizon</h1>
                <p className={styles.storyDescription}>
                  Azura finds herself in a new body, on a new planet. Old memories pull her towards
                  a key piece to her past. Osirus research lab finds a clue, but doesn&apos;t like
                  where it leads. Both want something out of reach, what will they do to get it?
                </p>
                <div className={styles.taglineBlock}>
                  {TAGLINES.map((line, i) => (
                    <span key={i} className={styles.taglineLine}>
                      {line}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column - Scrollable content */}
              <div className={styles.rightColumn}>
                {/* Chapter 1 expanded section */}
                <div className={styles.activeChapter}>
                  <div className={styles.chapterHeader}>
                    <span className={styles.chapterNumberSideways}>01</span>
                    <div className={styles.chapterTitleBlock}>
                      <p className={styles.chapterLabel}>Chapter 1</p>
                      <h2 className={styles.chapterTitle}>The First Step</h2>
                      <p className={styles.chapterTheme}>Self-Awareness</p>
                    </div>
                  </div>

                  <p className={styles.chapterDescription}>
                    Begin your journey of self-discovery. This chapter focuses on understanding who
                    you are at your core — your values, beliefs, and the patterns that shape your
                    daily life.
                  </p>

                  {/* 7 Writing Prompts as editorial sections */}
                  <div className={styles.promptSections}>
                    {chapter1Prompts.map((p) => (
                      <div
                        key={p.day}
                        className={styles.promptSection}
                        onClick={handlePromptClick}
                      >
                        <span className={styles.promptDayNumber}>Day {p.day}</span>
                        <div className={styles.promptContent}>
                          <p className={styles.promptText}>{p.prompt}</p>
                          <p className={styles.promptPlaceholder}>{p.placeholder}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locked Chapters Strip */}
                <div className={styles.lockedStrip}>
                  <p className={styles.lockedStripLabel}>Chapters 2–12 — Coming Soon</p>
                  <div className={styles.lockedCards}>
                    {lockedChapters.map((ch) => (
                      <div key={ch.chapter_number} className={styles.lockedCard}>
                        <p className={styles.lockedCardNumber}>
                          Chapter {ch.chapter_number}
                        </p>
                        <p className={styles.lockedCardTitle}>{ch.title}</p>
                        <p className={styles.lockedCardTheme}>{ch.theme}</p>
                        <div className={styles.lockedIcon}>
                          <svg viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                          </svg>
                          Locked
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Chapter Detail Modal */}
      {selectedChapterId && isAuthenticated && (
        <ChapterDetail
          chapterId={selectedChapterId}
          onClose={handleCloseDetail}
          onChapterComplete={fetchChapters}
        />
      )}
    </>
  );
}
