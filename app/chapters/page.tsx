'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import ChapterDetail from '@/components/sealed-library/ChapterDetail';
import { ChapterData } from '@/components/sealed-library/ChapterCard';
import styles from './page.module.css';

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

  const handleReadMore = () => {
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
              {/* Left Column - Sticky */}
              <div className={styles.leftColumn}>
                <div className={styles.leftContent}>
                  <h1 className={styles.storyTitle}>A New Horizon</h1>
                  <p className={styles.storyDescription}>
                    Azura finds herself in a new body, on a new planet. Old memories pull her
                    towards a key piece to her past. Osirus research lab finds a clue, but
                    doesn&apos;t like where it leads.
                  </p>
                </div>
              </div>

              {/* Chapter 1 Spine */}
              <div className={styles.spine}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>1</span>
                </div>
                <span className={styles.spineTitle}>Return To God</span>
              </div>

              {/* Chapter 1 — Section 1 (Main) */}
              <article className={styles.sectionMain}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionNumber}>Section 1</span>
                  <h2 className={styles.sectionMainTitle}>
                    The Discovery Of The Telepathetic Machine
                  </h2>
                </div>
                <div className={styles.sectionBodyWrapper}>
                  <div className={styles.sectionBody}>
                    <div
                      className={styles.sectionImage}
                      style={{ backgroundImage: 'url(https://i.imgur.com/qQFutfZ.jpeg)' }}
                    />
                    <div className={styles.sectionText}>
                      <p className={styles.sectionDescription}>
                        Every journey begins with a single thought. Before you lies the first
                        seal — one that asks you to look within. Who are you, truly? This chapter
                        focuses on understanding who you are at your core: your values, beliefs,
                        and the patterns that shape your daily life.
                      </p>
                    </div>
                  </div>
                  <div className={styles.sectionActions}>
                    <button className={styles.ctaButton} onClick={handleReadMore} type="button">
                      Collaborate
                    </button>
                    <button className={styles.ctaButton} onClick={handleReadMore} type="button">
                      Read More
                    </button>
                  </div>
                </div>
              </article>

              {/* Chapter 1 — Section 2 */}
              <article className={styles.sectionSmall}>
                <span className={styles.sectionNumber}>Section 2</span>
                <h3 className={styles.sectionSmallTitle}>The Mirror Within</h3>
                <p className={styles.sectionSmallDesc}>
                  A foretaste of this chapter&apos;s &ldquo;Self-Awareness&rdquo; theme.
                </p>
                <div className={styles.sectionSmallSpacer} />
                <button className={styles.ctaButtonBordered} onClick={handleReadMore} type="button">
                  Read More
                </button>
              </article>

              {/* Chapter 1 — Section 3 */}
              <article className={styles.sectionSmall}>
                <span className={styles.sectionNumber}>Section 3</span>
                <h3 className={styles.sectionSmallTitle}>Patterns of Being</h3>
                <p className={styles.sectionSmallDesc}>
                  Examining the routines and beliefs that shape who you are.
                </p>
                <div className={styles.sectionSmallSpacer} />
                <button className={styles.ctaButtonBordered} onClick={handleReadMore} type="button">
                  Read More
                </button>
              </article>

              {/* Chapter 2 Spine */}
              <div className={styles.spine}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>2</span>
                </div>
                <span className={styles.spineTitle}>Emotional Currents</span>
              </div>

              {/* Chapter 2 — Locked Sections */}
              {[1, 2, 3].map((i) => (
                <div key={`ch2-locked-${i}`} className={styles.lockedSection}>
                  <div className={styles.lockIconLarge}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  </div>
                </div>
              ))}

              {/* Chapter 3 Spine */}
              <div className={styles.spine}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>3</span>
                </div>
                <span className={styles.spineTitle}>The Inner Critic</span>
              </div>

              {/* Chapter 3 — Locked Sections */}
              {[1, 2, 3].map((i) => (
                <div key={`ch3-locked-${i}`} className={styles.lockedSection}>
                  <div className={styles.lockIconLarge}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  </div>
                </div>
              ))}
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
