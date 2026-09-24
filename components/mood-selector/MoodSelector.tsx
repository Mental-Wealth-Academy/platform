'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import styles from './MoodSelector.module.css';

export interface MoodOption {
  id: 'worry' | 'stress' | 'heartbreak' | 'notsure';
  label: string;
  imageSrc: string;
  prompt: string;
  topic: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'worry',
    label: 'Worry',
    imageSrc: '/images/mood-worry.png',
    prompt: "I'm dealing with worry and anxious thoughts.",
    topic: 'anxiety',
  },
  {
    id: 'stress',
    label: 'Stress',
    imageSrc: '/images/mood-stress.png',
    prompt: "I'm feeling really stressed out.",
    topic: 'stress',
  },
  {
    id: 'heartbreak',
    label: 'Heartbreak',
    imageSrc: '/images/mood-heartbreak.png',
    prompt: "I'm going through heartbreak and emotional pain.",
    topic: 'coping',
  },
  {
    id: 'notsure',
    label: 'Not Sure',
    imageSrc: '/images/mood-notsure.png',
    prompt: "I'm feeling off, but I'm not sure what I'm feeling.",
    topic: 'emotional-vocabulary',
  },
];

export default function MoodSelector() {
  const { play } = useSound();

  const handleSelectMood = useCallback((mood: MoodOption) => {
    play('click');
    window.dispatchEvent(
      new CustomEvent('openBlueChat', {
        detail: {
          mood: mood.id,
          label: mood.label,
          prompt: mood.prompt,
          topic: mood.topic,
        },
      }),
    );
  }, [play]);

  return (
    <section className={styles.container} aria-label="Mood selector">
      <div className={styles.header}>
        <div className={styles.eyeIconWrap} aria-hidden="true">
          <svg
            className={styles.eyeSvg}
            viewBox="0 0 32 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 10C5.5 3 11 0.5 16 0.5C21 0.5 26.5 3 31 10C26.5 17 21 19.5 16 19.5C11 19.5 5.5 17 1 10Z"
              stroke="#e0e7ff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="10" r="5.5" fill="#42e8cf" />
            <circle cx="16" cy="10" r="2.5" fill="#131627" />
            <circle cx="17.2" cy="8.8" r="1" fill="#ffffff" />
          </svg>
        </div>
        <h2 className={styles.title}>Mood Selector</h2>
        <span className={styles.subtitle}>Identify Problems</span>
      </div>

      <div className={styles.grid} role="group" aria-label="Select your current mood">
        {MOOD_OPTIONS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className={styles.moodCard}
            onClick={() => handleSelectMood(mood)}
            aria-label={`Select mood: ${mood.label}`}
          >
            <div className={styles.imageWrap}>
              <Image
                src={mood.imageSrc}
                alt=""
                width={123}
                height={123}
                className={styles.artwork}
              />
            </div>
            <span className={styles.label}>{mood.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
