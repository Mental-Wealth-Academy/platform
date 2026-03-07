'use client';

import React, { useState, useEffect } from 'react';
import styles from './SeasonTimer.module.css';

interface SeasonTimerProps {
  activeWeek: number;
  weekEndsAt: string | null;
  seasonActive: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00:00';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function SeasonTimer({ activeWeek, weekEndsAt, seasonActive }: SeasonTimerProps) {
  const [countdown, setCountdown] = useState('');
  const [labels] = useState(['DAYS', 'HRS', 'MIN', 'SEC']);

  useEffect(() => {
    if (!weekEndsAt) return;
    const endTime = new Date(weekEndsAt).getTime();

    const tick = () => {
      const remaining = endTime - Date.now();
      setCountdown(formatCountdown(Math.max(0, remaining)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [weekEndsAt]);

  if (!seasonActive || activeWeek <= 0) return null;

  const parts = countdown.split(':');
  const progress = ((activeWeek) / 12) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.seasonLabel}>SEASON 1</span>
          <span className={styles.weekBadge}>Week {activeWeek} of 12</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.nextLabel}>Next week unlocks in</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.progressSection}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.weekMarkers}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className={`${styles.weekDot} ${i + 1 <= activeWeek ? styles.weekDotActive : ''}`}
                title={`Week ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.countdown}>
          {parts.map((part, i) => (
            <div key={i} className={styles.countdownSegment}>
              <span className={styles.countdownValue}>{part}</span>
              <span className={styles.countdownLabel}>{labels[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
