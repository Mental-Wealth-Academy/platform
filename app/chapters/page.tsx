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
              {/* Row 1: Header bars */}
              <div className={styles.bookBar}>
                <div className={styles.bookBarText}>
                  <span className={styles.bookBarTitle}>Book</span>
                  <span className={styles.bookBarSub}>The full collection</span>
                </div>
                <button className={styles.bookBarPlus} type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              </div>
              <div className={styles.storyBar}>
                <div className={styles.storyBarLeft}>
                  <svg className={styles.storyBarIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <div className={styles.storyBarMeta}>
                    <span className={styles.storyBarName}>Return to God</span>
                    <span className={styles.storyBarAuthor}>by Jhinn Bay</span>
                  </div>
                </div>
                <button className={styles.storyBarPlus} type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              </div>

              {/* Ethereal Bar — above Chapter 1 sections */}
              <div className={styles.etherealBar}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>The Ethereal Horizon</span>
              </div>

              {/* Row 3: Content */}
              <div className={styles.leftColumn}>
                <div className={styles.leftContent}>
                  <h1 className={styles.storyTitle}>://Ethereal 00</h1>
                  <p className={styles.storyDescription}>
                    Vesper wakes in a cryostasis cell with fragmented memories. Any contact
                    with the outside denied. Only one person is capable of being reached — the question
                    is, where are they?
                  </p>
                </div>
                <div
                  className={styles.leftCharacter}
                  style={{ backgroundImage: 'url(https://i.imgur.com/CcMDrCp.png)' }}
                />
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
                    Telepathic Machines
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
                        Reality runs on 100Hz. The machine runs on 100GHz.
                        Who devours whom?
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
                <button className={styles.ctaButtonBordered} onClick={handleReadMore} type="button">
                  Read More
                </button>
              </article>

              {/* Chapter 2 Spine */}
              <div className={`${styles.spine} ${styles.spineCh2}`}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>2</span>
                </div>
                <span className={styles.spineTitle}>Emotional Currents</span>
              </div>

              {/* Ethereal Bar — above Chapter 2 sections */}
              <div className={`${styles.etherealBar} ${styles.etherealBarCh2}`}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>Telepathic Weaponry &amp; Cold War</span>
              </div>

              {/* Chapter 2 — Locked Sections */}
              {[
                { num: 1, title: 'The Tidal Pull' },
                { num: 2, title: 'Beneath the Surface' },
                { num: 3, title: "The Current\u2019s Edge" },
              ].map((s) => (
                <article key={`ch2-${s.num}`} className={`${styles.lockedSection} ${styles.lockedSectionCh2}`}>
                  <span className={styles.sectionNumber}>Section {s.num}</span>
                  <h3 className={styles.lockedTitle}>{s.title}</h3>
                  <p className={styles.lockedDesc}>
                    Complete Chapter 1 to unlock.
                  </p>
                  <button className={styles.ctaButtonLocked} type="button" disabled>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    Locked
                  </button>
                </article>
              ))}

              {/* Chapter 3 Spine */}
              <div className={`${styles.spine} ${styles.spineCh3}`}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>3</span>
                </div>
                <span className={styles.spineTitle}>The Inner Critic</span>
              </div>

              {/* Ethereal Bar — above Chapter 3 sections */}
              <div className={`${styles.etherealBar} ${styles.etherealBarCh3}`}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>The Scary Shapeshifter</span>
              </div>

              {/* Chapter 3 — Locked Sections */}
              {[
                { num: 1, title: 'The Silent Judge' },
                { num: 2, title: 'Echoes of Doubt' },
                { num: 3, title: 'Breaking the Mirror' },
              ].map((s) => (
                <article key={`ch3-${s.num}`} className={`${styles.lockedSection} ${styles.lockedSectionCh3}`}>
                  <span className={styles.sectionNumber}>Section {s.num}</span>
                  <h3 className={styles.lockedTitle}>{s.title}</h3>
                  <p className={styles.lockedDesc}>
                    Complete Chapter 2 to unlock.
                  </p>
                  <button className={styles.ctaButtonLocked} type="button" disabled>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    Locked
                  </button>
                </article>
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
