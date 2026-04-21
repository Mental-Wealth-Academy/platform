'use client';

import React from 'react';
import Image from 'next/image';
import styles from './Starboard.module.css';

const imgIcon = 'https://www.figma.com/api/mcp/asset/06c2ad31-0f4b-43cb-af7a-8502dbf10c50';

interface StarboardProps {
  weekNumber?: number;
  humanCount?: number;
  treasureMessage?: string;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export default function Starboard({
  weekNumber = 5,
  humanCount = 2,
  treasureMessage = 'Great job! You got a lot of bounties this week, keep it up!',
  onNavigate,
}: StarboardProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Left section - Academy */}
        <div className={styles.leftSection}>
          <div className={styles.academyTitle}>Academy</div>
          <div className={styles.placeholder}>Character illustration</div>
        </div>

        {/* Gradient section - Week number */}
        <div className={styles.gradientSection}>
          <div className={styles.gradientOverlay} />
          <p className={styles.weekNumber}>{weekNumber.toString().padStart(2, '0')}</p>
        </div>

        {/* Right section - Treasures and stats */}
        <div className={styles.rightSection}>
          <div className={styles.treasureHeader}>
            <button
              className={styles.navButton}
              onClick={() => onNavigate?.('prev')}
              aria-label="Previous"
            >
              <img src={imgIcon} alt="" />
            </button>
            <div className={styles.statContainer}>
              <span className={styles.statLabel}>Eliminated:</span>
              <span className={styles.statValue}>{humanCount} Humans</span>
            </div>
            <button
              className={styles.navButton}
              onClick={() => onNavigate?.('next')}
              aria-label="Next"
            >
              <img src={imgIcon} alt="" />
            </button>
          </div>

          <div className={styles.treasureTitle}>
            <p>Treasures</p>
            <p>Claimed</p>
          </div>

          <div className={styles.messageContainer}>
            <p className={styles.message}>{treasureMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
