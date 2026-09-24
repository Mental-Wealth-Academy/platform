'use client';

import React from 'react';
import Image from 'next/image';
import { Check, Lock, Trash, Sparkle } from '@phosphor-icons/react';
import QuestIcon from '@/components/quest-icon/QuestIcon';
import CtaButton from '@/components/shared/CtaButton';
import styles from './QuestCard.module.css';

export type QuestCardKind = 'course' | 'submit' | 'mission' | 'social' | 'custom';

interface QuestCardProps {
  title: string;
  description: string;
  progressCurrent: number;
  progressTotal: number;
  points: number;
  kind: QuestCardKind;
  usdcReward?: number;
  angelGated?: boolean;
  isLocked?: boolean;
  showDelete?: boolean;
  onOpen?: () => void;
  onDelete?: () => void;
}

const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  progressCurrent,
  progressTotal,
  points,
  kind,
  usdcReward = 0,
  angelGated = false,
  isLocked = false,
  showDelete = false,
  onOpen,
  onDelete,
}) => {
  const completed = progressCurrent >= progressTotal && progressTotal > 0;

  return (
    <div
      className={`${styles.card} ${completed ? styles.cardComplete : ''} ${isLocked ? styles.cardLocked : ''}`}
      data-kind={kind}
    >
      <div className={styles.cardContent}>
        <div
          className={styles.cardSurface}
          onClick={isLocked ? undefined : onOpen}
          role="button"
          tabIndex={isLocked ? -1 : 0}
          onKeyDown={(e) => {
            if (!isLocked && onOpen && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onOpen();
            }
          }}
          aria-label={`Open quest: ${title}`}
        >
          <QuestIcon seedOrIndex={title} size={48} iconSize={24} />

          <span className={styles.info}>
            <span className={styles.title}>{title}</span>
            <span className={styles.preview}>{description}</span>
            {angelGated && (
              <span className={styles.angelTag} title="Academic Angels only">
                <Sparkle size={11} weight="fill" />
                Academic Angels
              </span>
            )}
          </span>

          <span className={styles.right}>
            {completed ? (
              <span className={styles.checkDone}>
                <Check size={15} weight="bold" />
              </span>
            ) : isLocked ? (
              <span className={styles.lockChip}>
                <Lock size={13} weight="fill" />
              </span>
            ) : usdcReward > 0 ? (
              <span className={styles.usdcBadge}>
                <Image src="/icons/usdc-logo.svg" alt="USDC" width={14} height={14} />
                <span className={styles.usdcValue}>{usdcReward}</span>
              </span>
            ) : (
              <span className={styles.points}>
                <Image src="/icons/ui-diamond.svg" alt="" width={13} height={13} />
                <span className={styles.pointsValue}>{points}</span>
              </span>
            )}
          </span>
        </div>

        <div className={styles.actionRow}>
          <CtaButton
            variant={completed ? 'secondary' : 'primary'}
            size="lg"
            block
            disabled={isLocked}
            onClick={onOpen}
          >
            {completed ? 'Quest Cleared • View Details' : isLocked ? 'Quest Locked' : 'View Goal & Details'}
          </CtaButton>
        </div>
      </div>

      {showDelete && onDelete && (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label={`Delete quest: ${title}`}
        >
          <Trash size={13} weight="bold" />
        </button>
      )}
    </div>
  );
};

export default QuestCard;
