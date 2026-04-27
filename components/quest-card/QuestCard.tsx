'use client';

import React from 'react';
import Image from 'next/image';
import { CaretRight, Trash, Lock } from '@phosphor-icons/react';
import styles from './QuestCard.module.css';

export type QuestCardKind = 'course' | 'submit' | 'mission' | 'social' | 'custom';

interface QuestCardProps {
  title: string;
  description: string;
  progressCurrent: number;
  progressTotal: number;
  points: number;
  kind: QuestCardKind;
  badge?: string;
  isLocked?: boolean;
  showDelete?: boolean;
  onOpen?: () => void;
  onDelete?: () => void;
}

const KIND_LABEL: Record<QuestCardKind, string> = {
  course: 'Course',
  submit: 'Submit',
  mission: 'Mission',
  social: 'Social',
  custom: 'Custom',
};

const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  progressCurrent,
  progressTotal,
  points,
  kind,
  badge,
  isLocked = false,
  showDelete = false,
  onOpen,
  onDelete,
}) => {
  const completed = progressCurrent >= progressTotal && progressTotal > 0;
  const progressPct = progressTotal > 0 ? Math.min(100, (progressCurrent / progressTotal) * 100) : 0;

  return (
    <div
      className={`${styles.card} ${completed ? styles.cardComplete : ''} ${isLocked ? styles.cardLocked : ''}`}
      data-kind={kind}
    >
      <button
        type="button"
        className={styles.cardSurface}
        onClick={onOpen}
        disabled={isLocked}
        aria-label={`Open quest: ${title}`}
      >
        <div className={styles.topRow}>
          <span className={styles.kindChip}>
            <span className={styles.kindDot} aria-hidden="true" />
            {KIND_LABEL[kind]}
          </span>
          {badge && <span className={styles.metaBadge}>{badge}</span>}
        </div>

        <span className={styles.pointsChip}>
          <Image src="/icons/ui-shard.svg" alt="" width={14} height={14} className={styles.pointsIcon} />
          <span className={styles.pointsValue}>{points}</span>
        </span>

        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.desc}>{description}</p>
        </div>

        <div className={styles.footer}>
          <div className={styles.progressBlock}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {progressCurrent}/{progressTotal}
            </span>
          </div>

          <span className={`${styles.cta} ${completed ? styles.ctaComplete : ''}`}>
            {isLocked ? (
              <>
                <Lock size={14} weight="fill" />
                Locked
              </>
            ) : completed ? (
              'Done'
            ) : (
              <>
                Open
                <CaretRight size={14} weight="bold" />
              </>
            )}
          </span>
        </div>
      </button>

      {showDelete && onDelete && (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label={`Delete quest: ${title}`}
        >
          <Trash size={14} weight="bold" />
        </button>
      )}
    </div>
  );
};

export default QuestCard;
