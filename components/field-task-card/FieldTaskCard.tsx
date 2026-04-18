'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './FieldTaskCard.module.css';

export interface FieldTask {
  id: string;
  name: string;
  category: string;
  shards: number;
  timeMin: number;
  gradientFrom: string;
  gradientTo: string;
  azuraImage: string;
  illustrationEmoji: string;
}

interface FieldTaskCardProps {
  task: FieldTask;
  isStarred: boolean;
  onStar: () => void;
  onStart: () => void;
  onDetails: () => void;
}

export default function FieldTaskCard({ task, isStarred, onStar, onStart, onDetails }: FieldTaskCardProps) {
  const [pressing, setPressing] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar();
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetails();
  };

  return (
    <article
      className={`${styles.card} ${pressing ? styles.cardPressing : ''}`}
      onClick={onStart}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onStart()}
      aria-label={`Start ${task.name} field task`}
    >
      <div
        className={styles.artArea}
        style={{ background: `linear-gradient(150deg, ${task.gradientFrom} 0%, ${task.gradientTo} 100%)` }}
      >
        <span className={styles.illustration} aria-hidden="true">
          {task.illustrationEmoji}
        </span>
      </div>

      <div className={styles.azuraWrap}>
        <Image
          src={task.azuraImage}
          alt=""
          width={44}
          height={44}
          className={styles.azuraImg}
          unoptimized
        />
      </div>

      <button
        type="button"
        className={`${styles.starBtn} ${isStarred ? styles.starBtnActive : ''}`}
        onClick={handleStarClick}
        aria-label={isStarred ? 'Unstar task' : 'Star task'}
      >
        {isStarred ? '⭐' : '☆'}
      </button>

      <div className={styles.info}>
        <span className={styles.name}>{task.name}</span>
        <div className={styles.bottomRow}>
          <span className={styles.pill}>
            <span>⏱ {task.timeMin}m</span>
            <span className={styles.pillSep}>·</span>
            <span>◆ {task.shards}</span>
          </span>
          <button
            type="button"
            className={styles.detailsBtn}
            onClick={handleDetailsClick}
            aria-label="Task details"
          >
            •••
          </button>
        </div>
      </div>
    </article>
  );
}
