'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDifficulty(value);
    onDifficultyChange?.(value);
  };

  const min = 80;
  const max = 200;
  const progress = ((difficulty - min) / (max - min)) * 100;

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
          <span className={styles.controlLabel}>Test scale difficulty</span>
          <span className={styles.controlLabel}>{difficulty}</span>
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
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            />
          </div>
          <div className={styles.valueBox}>
            <span className={styles.valueText}>{difficulty}</span>
          </div>
          <p className={styles.helperText}>
            80–140 recommended. Higher difficulty = harder tests + more rewards.
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
