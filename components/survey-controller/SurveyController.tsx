'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Button from '@/components/button/Button';
import { getTestShardReward, TEST_DIFFICULTY_MAX, TEST_DIFFICULTY_MIN } from '@/lib/test-rewards';
import styles from './SurveyController.module.css';

const OPTION_COLORS = [
  'var(--color-survey-tab-attachment)',
  'var(--color-survey-tab-strengths)',
  'var(--color-survey-tab-bigfive)',
  'var(--color-survey-tab-moral)',
];

const SURVEY_TYPES = [
  {
    id: 'attachment-style',
    label: 'Attachment Style',
    sub: 'Secure, anxious, or avoidant',
    shortDesc: 'Decode how you connect, build trust, and respond under relational pressure.',
  },
  {
    id: 'via-character-strengths',
    label: 'Character Strengths',
    sub: '240-item VIA inventory',
    shortDesc: "Discover your signature strengths across 24 virtues with UPenn's validated inventory.",
  },
  {
    id: 'big-five',
    label: 'Big Five Personality',
    sub: 'Validated OCEAN model',
    shortDesc: 'Map your OCEAN traits to see how you operate across five core scientific dimensions.',
  },
  {
    id: 'moral-foundations',
    label: 'Moral Foundations',
    sub: "Haidt's 5-foundation model",
    shortDesc: 'Uncover the intuitive values and ethics that drive your sense of right and wrong.',
  },
] as const;

type SurveyType = (typeof SURVEY_TYPES)[number];

function getSurveyTypeById(id?: string): SurveyType {
  return SURVEY_TYPES.find((survey) => survey.id === id) ?? SURVEY_TYPES[0];
}

interface SurveyControllerProps {
  userName?: string;
  version?: string;
  characterImageSrc?: string;
  characterPosterSrc?: string;
  deferVideo?: boolean;
  difficulty?: number;
  showDifficulty?: boolean;
  ctaLabel?: string;
  onSignForm?: () => void;
  onStartSurvey?: () => void;
  onDifficultyChange?: (value: number) => void;
  selectedSurveyId?: string;
  onSurveyTypeChange?: (surveyId: string) => void;
}

export default function SurveyController({
  userName = 'You Toxic or Fun Type Shi?',
  version = 'V.e1-MWA36B',
  characterImageSrc = '/exxies.png',
  difficulty: initialDifficulty = 101,
  showDifficulty = true,
  ctaLabel = 'Sign form to begin',
  onSignForm,
  onStartSurvey,
  onDifficultyChange,
  selectedSurveyId,
  onSurveyTypeChange,
}: SurveyControllerProps) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyType>(() => getSurveyTypeById(selectedSurveyId));
  const shardReward = getTestShardReward(difficulty);

  useEffect(() => {
    setSelectedSurvey(getSurveyTypeById(selectedSurveyId));
  }, [selectedSurveyId]);

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDifficulty(value);
    onDifficultyChange?.(value);
  };

  const handleSelectSurvey = (survey: SurveyType) => {
    setSelectedSurvey(survey);
    onSurveyTypeChange?.(survey.id);
  };

  const min = TEST_DIFFICULTY_MIN;
  const max = TEST_DIFFICULTY_MAX;
  const progress = ((difficulty - min) / (max - min)) * 100;

  return (
    <div className={styles.controller}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Assessment engine</span>
          <h1 className={styles.heroTitle}>{userName}</h1>
        </div>
        <span className={styles.heroVersion}>
          <Image src="/icons/ui-diamond.svg" alt="" width={10} height={10} className={styles.shardIcon} />
          {version}
        </span>
      </section>

      {/* Character image banner & short description */}
      <div className={styles.imagePanel}>
        <div className={styles.imageWrapper}>
          <Image
            src={characterImageSrc && !characterImageSrc.endsWith('.mp4') ? characterImageSrc : '/exxies.png'}
            alt="Academy characters"
            fill
            sizes="(max-width: 900px) 100vw, 420px"
            className={styles.characterBannerImage}
            priority
          />
        </div>
        <div className={styles.videoReview}>
          <div className={styles.videoReviewEyebrow}>{selectedSurvey.label} · overview</div>
          <p className={styles.videoReviewText}>
            {selectedSurvey.shortDesc}
          </p>
        </div>
      </div>

      {/* Survey type selector - vertical tabs */}
      <div className={styles.persona}>
        <span className={styles.eyebrow}>Survey type</span>
        <div className={styles.surveyList} role="tablist" aria-orientation="vertical">
          {SURVEY_TYPES.map((survey, i) => (
            <button
              type="button"
              key={survey.id}
              role="tab"
              aria-selected={survey.id === selectedSurvey.id}
              className={`${styles.surveyItem} ${survey.id === selectedSurvey.id ? styles.surveyItemActive : ''}`}
              style={{ '--accent': OPTION_COLORS[i] } as React.CSSProperties}
              onClick={() => handleSelectSurvey(survey)}
            >
              <span className={styles.surveyItemIndicator} aria-hidden="true" />
              <div className={styles.surveyItemContent}>
                <span className={styles.surveyItemLabel}>{survey.label}</span>
                <span className={styles.surveyItemSub}>{survey.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty scale */}
      {showDifficulty && (
        <section className={styles.scaleCard}>
          <div className={styles.row}>
            <span className={styles.eyebrow}>Test scale</span>
            <div className={styles.shardBadge} aria-label={`${shardReward} diamonds earned for this test`}>
              <Image src="/icons/ui-diamond.svg" alt="" width={14} height={14} className={styles.shardIcon} />
              +{shardReward} diamonds
            </div>
          </div>

          <div className={styles.scaleStatRow}>
            <span className={styles.scaleStat}>{difficulty}</span>
            <span className={styles.scaleStatUnit}>difficulty</span>
          </div>

          <input
            type="range"
            min={min}
            max={max}
            value={difficulty}
            onChange={handleDifficultyChange}
            className={styles.slider}
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />
          <p className={styles.helperText}>
            Higher difficulty means harder questions and a larger credit payout.
          </p>
        </section>
      )}

      <Button fullWidth onClick={onStartSurvey ?? onSignForm} className={styles.cta}>
        {ctaLabel}
      </Button>
    </div>
  );
}
