'use client';

import React from 'react';
import Image from 'next/image';
import styles from './GameCard.module.css';

interface GameCardProps {
  questName: string;
  questDescription: string;
  progressCurrent: number;
  progressTotal: number;
  onOpenQuest?: () => void;
  shardIcon?: string;
}

const GameCard: React.FC<GameCardProps> = ({
  questName,
  questDescription,
  progressCurrent,
  progressTotal,
  onOpenQuest,
  shardIcon = '/icons/ui-shard.svg',
}) => {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onOpenQuest}
      aria-label={`Open quest: ${questName}`}
    >
      <div className={styles.shardContainer}>
        <div className={styles.shardBox}>
          <Image
            src={shardIcon}
            alt="Shard"
            width={65}
            height={65}
            className={styles.shardIcon}
          />
        </div>
      </div>

      <div className={styles.textContainer}>
        <h3 className={styles.taskName}>{questName}</h3>
        <p className={styles.taskDescription}>{questDescription}</p>
      </div>

      <div className={styles.actionContainer}>
        <div className={styles.completionTicker}>
          <span className={styles.tickerText}>
            {progressCurrent}/{progressTotal}
          </span>
        </div>

        <div className={styles.acceptButton} aria-hidden="true">
          <div className={styles.acceptGlow} />
          <div className={styles.acceptBody}>
            <div className={styles.scanlines} />
            <span className={styles.acceptText}>OPEN QUEST</span>
          </div>
          <div className={styles.acceptBorder} />
        </div>
      </div>
    </button>
  );
};

export default GameCard;
