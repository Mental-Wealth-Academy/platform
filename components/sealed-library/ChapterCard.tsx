'use client';

import React from 'react';
import Image from 'next/image';
import styles from './ChapterCard.module.css';

export interface ChapterData {
  id: number;
  chapter_number: number;
  title: string;
  description: string;
  theme: string;
  image_url: string;
  status: 'locked' | 'in_progress' | 'unsealed' | 'preview';
  writingsCompleted: number;
  totalWritings: number;
  azura?: {
    intro: string;
    encouragement: string;
    unseal: string;
  };
}

interface ChapterCardProps {
  chapter: ChapterData;
  onClick: () => void;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onClick }) => {
  const isLocked = chapter.status === 'locked';
  const isInProgress = chapter.status === 'in_progress';
  const isUnsealed = chapter.status === 'unsealed';
  const isPreview = chapter.status === 'preview';

  const progressDots = Array.from({ length: 7 }, (_, i) => (
    <div
      key={i}
      className={`${styles.progressDot} ${i < chapter.writingsCompleted ? styles.progressDotFilled : ''}`}
    />
  ));

  return (
    <button
      className={`${styles.card} ${isLocked ? styles.cardLocked : ''} ${isInProgress ? styles.cardInProgress : ''} ${isUnsealed ? styles.cardUnsealed : ''} ${isPreview ? styles.cardPreview : ''}`}
      onClick={onClick}
      type="button"
    >
      {/* Seal overlay for locked/in-progress/preview states (not unsealed) */}
      {(isLocked || isInProgress || isPreview) && (
        <div className={`${styles.sealOverlay} ${isInProgress ? styles.sealCracking : ''} ${isPreview ? styles.sealPreview : ''}`}>
          <Image
            src="/uploads/AzuraSeal.svg"
            alt="Azura's Seal"
            width={80}
            height={80}
            className={styles.sealImage}
            unoptimized
          />
          {isLocked && (
            <div className={styles.lockBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Unsealed checkmark */}
      {isUnsealed && (
        <div className={styles.unsealedBadge}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}

      <div className={styles.cardContent}>
        <div className={styles.chapterNumber}>Chapter {chapter.chapter_number}</div>
        <h3 className={styles.title}>{chapter.title}</h3>
        <div className={styles.theme}>{chapter.theme}</div>

        {(isInProgress || isUnsealed || isPreview) && (
          <div className={styles.progressSection}>
            <div className={styles.progressDots}>{progressDots}</div>
            <div className={styles.progressText}>
              {chapter.writingsCompleted}/{chapter.totalWritings} days
            </div>
          </div>
        )}

        {isLocked && (
          <div className={styles.lockedText}>Complete previous chapter to unlock</div>
        )}

        {isPreview && (
          <div className={styles.previewText}>Sign in to begin your journey</div>
        )}
      </div>
    </button>
  );
};

export default ChapterCard;
