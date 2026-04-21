'use client';

import React, { useState, useEffect } from 'react';
import styles from './CreditScore.module.css';

interface CreditScoreData {
  score: number;
  tier: string;
  percentile: number;
  nextMilestone: number;
  change: number;
}

interface CreditScoreProps {
  showLoader?: boolean;
}

export default function CreditScore({ showLoader = true }: CreditScoreProps) {
  const [scoreData, setScoreData] = useState<CreditScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await fetch('/api/credit-score', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setScoreData(data);
        }
      } catch (error) {
        console.error('Failed to fetch credit score:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, []);

  if (loading) {
    if (!showLoader) return null;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
          <span className={`${styles.skeletonLine} ${styles.skeletonChange}`} />
        </div>
        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <span className={`${styles.skeletonLine} ${styles.skeletonValue}`} />
          </div>
          <div className={styles.infoRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <span className={`${styles.skeletonLine} ${styles.skeletonValue}`} />
          </div>
          <div className={styles.infoRow}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLabelWide}`} />
            <span className={`${styles.skeletonLine} ${styles.skeletonValue}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!scoreData) return null;

  const scorePercentage = (scoreData.score / 1000) * 100;
  const isPositive = scoreData.change >= 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Credit Score</h3>
        <span className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? '+' : ''}{scoreData.change}
        </span>
      </div>

      <div className={styles.scoreCircle}>
        <svg className={styles.circleRing} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(81, 104, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#5168FF"
            strokeWidth="8"
            strokeDasharray={`${scorePercentage * 2.827} 282.7`}
            strokeDashoffset="0"
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
          />
        </svg>
        <div className={styles.scoreValue}>
          <span className={styles.score}>{scoreData.score}</span>
          <span className={styles.max}>/ 1000</span>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Tier</span>
          <span className={styles.value}>{scoreData.tier}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Percentile</span>
          <span className={styles.value}>{scoreData.percentile}%</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Next Milestone</span>
          <span className={styles.value}>{scoreData.nextMilestone}</span>
        </div>
      </div>
    </div>
  );
}
