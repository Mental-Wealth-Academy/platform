'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getTestShardReward, TEST_DIFFICULTY_MAX, TEST_DIFFICULTY_MIN } from '@/lib/test-rewards';
import styles from './SurveyController.module.css';

interface SurveyControllerProps {
  userName?: string;
  version?: string;
  characterImageSrc?: string;
  difficulty?: number;
  persona?: string;
  onSignForm?: () => void;
  onDifficultyChange?: (value: number) => void;
  onPersonaChange?: (persona: string) => void;
}

export default function SurveyController({
  userName = 'B.L.U.E. System Form',
  version = 'V.e1-MWA36B',
  characterImageSrc = '/ImageBlueTV.png',
  difficulty: initialDifficulty = 101,
  persona = 'B.L.U.E. (default persona)',
  onSignForm,
  onDifficultyChange,
}: SurveyControllerProps) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const shardReward = getTestShardReward(difficulty);

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDifficulty(value);
    onDifficultyChange?.(value);
  };

  const min = TEST_DIFFICULTY_MIN;
  const max = TEST_DIFFICULTY_MAX;
  const progress = ((difficulty - min) / (max - min)) * 100;

  const sliderColor = (() => {
    const p = (difficulty - min) / (max - min);
    if (p < 0.4) return '#22c55e';
    if (p < 0.7) return '#eab308';
    return '#ef4444';
  })();

  return (
    <div className={styles.controller}>
      <div className={styles.topWrapper}>
        <div className={styles.headerRow}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.version}>{version}</span>
        </div>
        <div className={styles.subtitleRow}>
          <span className={styles.subtitle}>Complete User Form</span>
        </div>
        <button className={styles.ctaButton} onClick={onSignForm} type="button">
          Sign Form To Begin
        </button>
      </div>

      <div className={styles.imagePanel}>
        <div className={styles.imageWrapper}>
          {characterImageSrc ? (
            <Image
              src={characterImageSrc}
              alt="Character"
              fill
              sizes="397px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Test scale</span>
          <div className={styles.controlMetrics}>
            <span className={styles.controlLabel}>{difficulty}</span>
            <div className={styles.shardRewardBox} aria-label={`${shardReward} shards earned for this test`}>
              <Image src="/icons/ui-shard.svg" alt="" width={18} height={18} className={styles.shardIcon} />
              <div className={styles.shardRewardText}>
                <span className={styles.shardRewardValue}>+{shardReward} reward</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.scaler}>
          <div className={styles.sliderWrapper}>
            <input
              type="range"
              min={min}
              max={max}
              value={difficulty}
              onChange={handleDifficultyChange}
              className={styles.slider}
              style={{ '--progress': `${progress}%`, '--slider-color': sliderColor } as React.CSSProperties}
            />
          </div>
          <p className={styles.helperText}>
            Higher difficulty means harder questions and a larger shard payout.
          </p>
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Character set</span>
          <span className={styles.controlLabel}>Persona</span>
        </div>

        <div className={styles.dropdownOuter}>
          <div className={styles.dropdownInner}>
            <span className={styles.dropdownText}>{persona}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={styles.chevronIcon}
              aria-hidden="true"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
