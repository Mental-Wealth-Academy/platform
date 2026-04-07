'use client';

import React from 'react';
import Image from 'next/image';
import styles from './GameCard.module.css';

interface GameCardProps {
  taskName: string;
  taskDescription: string;
  completed: number;
  total: number;
  onAccept?: () => void;
  shardIcon?: string;
}

const GameCard: React.FC<GameCardProps> = ({
  taskName,
  taskDescription,
  completed,
  total,
  onAccept,
  shardIcon = '/icons/ui-shard.svg',
}) => {
  return (
    <div className={styles.card}>
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
        <h3 className={styles.taskName}>{taskName}</h3>
        <p className={styles.taskDescription}>{taskDescription}</p>
      </div>

      <div className={styles.actionContainer}>
        <div className={styles.completionTicker}>
          <span className={styles.tickerText}>
            {completed}/{total}
          </span>
        </div>

        <button className={styles.acceptButton} onClick={onAccept}>
          <div className={styles.acceptGlow} />
          <div className={styles.acceptBody}>
            <div className={styles.scanlines} />
            <span className={styles.acceptText}>ACCEPT</span>
          </div>
          <div className={styles.acceptBorder} />
        </button>
      </div>
    </div>
  );
};

export default GameCard;
