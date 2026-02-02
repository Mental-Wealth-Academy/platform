'use client';

import React, { useState, useEffect } from 'react';
import ChapterCard, { ChapterData } from './ChapterCard';
import ChapterDetail from './ChapterDetail';
import styles from './SealedLibrary.module.css';

const SealedLibrary: React.FC = () => {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
  const [gridLoaded, setGridLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }

      const data = await response.json();
      setChapters(data.chapters || []);
      setIsAuthenticated(data.authenticated || false);

      // Trigger grid animation after data loads
      setTimeout(() => setGridLoaded(true), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleChapterClick = (chapter: ChapterData) => {
    if (!isAuthenticated || chapter.status === 'locked' || chapter.status === 'preview') {
      return;
    }
    setSelectedChapter(chapter);
  };

  const handleCloseDetail = () => {
    setSelectedChapter(null);
    // Refresh chapters to get updated progress
    fetchChapters();
  };

  const handleChapterComplete = () => {
    // Refresh chapters when a chapter is unsealed
    fetchChapters();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading your journey...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.retryButton} onClick={fetchChapters} type="button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isAuthenticated ? (
        <div className={styles.sectionHeader}>
          <div
            className={styles.heroBg}
            style={{ backgroundImage: 'url(https://i.imgur.com/HwN5d9B.jpeg)' }}
          />
          <div className={styles.heroGradient} />
          <h2 className={styles.sectionTitle}>A New Horizon</h2>
          <p className={styles.sectionDescription}>
            Complete 7 days of writing to unseal each chapter. Your journey of self-discovery awaits.
          </p>
        </div>
      ) : (
        <div className={styles.signInBanner}>
          <div
            className={styles.heroBg}
            style={{ backgroundImage: 'url(https://i.imgur.com/HwN5d9B.jpeg)' }}
          />
          <div className={styles.heroGradient} />
          <h2 className={styles.bannerTitle}>A New Horizon</h2>
          <p className={styles.bannerDescription}>Azura finds herself in a new body, on a new planet. Old memories pull her towards a key piece to her past. Osirus research lab finds a clue, but doesn&apos;t like where it leads. Both want something out of reach, what will they do to get it?</p>
        </div>
      )}

      <div className={`${styles.chaptersGrid} ${gridLoaded ? styles.gridLoaded : ''}`}>
        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className={styles.cardWrapper}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <ChapterCard
              chapter={chapter}
              onClick={() => handleChapterClick(chapter)}
            />
          </div>
        ))}
      </div>

      {/* Chapter Detail Modal */}
      {selectedChapter && isAuthenticated && (
        <ChapterDetail
          chapterId={selectedChapter.id}
          onClose={handleCloseDetail}
          onChapterComplete={handleChapterComplete}
        />
      )}
    </div>
  );
};

export default SealedLibrary;
