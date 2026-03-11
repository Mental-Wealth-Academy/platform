'use client';

import React, { useState, useEffect } from 'react';
import styles from './SeasonTimer.module.css';

interface SeasonTimerProps {
  activeWeek: number;
  weekEndsAt: string | null;
  seasonActive: boolean;
}

function formatCountdown(ms: number): { d: string; h: string; m: string; s: string } {
  if (ms <= 0) return { d: '00', h: '00', m: '00', s: '00' };
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  return {
    d: d.toString().padStart(2, '0'),
    h: h.toString().padStart(2, '0'),
    m: m.toString().padStart(2, '0'),
    s: s.toString().padStart(2, '0'),
  };
}

export default function SeasonTimer({ activeWeek, weekEndsAt, seasonActive }: SeasonTimerProps) {
  const [time, setTime] = useState({ d: '--', h: '--', m: '--', s: '--' });

  useEffect(() => {
    if (!weekEndsAt) return;
    const endTime = new Date(weekEndsAt).getTime();

    const tick = () => {
      const remaining = endTime - Date.now();
      setTime(formatCountdown(Math.max(0, remaining)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [weekEndsAt]);

  if (!seasonActive || activeWeek <= 0) return null;

  const progress = ((activeWeek) / 12) * 100;

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <div className={styles.topRow}>
          <span className={styles.weekLabel}>Week {activeWeek}</span>
          <span className={styles.ofTotal}>of 12</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className={styles.countdown}>
        <span className={styles.time}>{time.d}<small>d</small></span>
        <span className={styles.sep}>:</span>
        <span className={styles.time}>{time.h}<small>h</small></span>
        <span className={styles.sep}>:</span>
        <span className={styles.time}>{time.m}<small>m</small></span>
      </div>
    </div>
  );
}
