'use client';

import React, { useState, useEffect } from 'react';
import BlueDialogue, { BlueEmotion } from '@/components/blue-dialogue/BlueDialogue';
import { useSound } from '@/hooks/useSound';
import { useScrollLock } from '@/hooks/useScrollLock';
import styles from './DailyReadPopup.module.css';

const PRINCIPLES = [
  'Creativity is divine life force.',
  'You are created and creator.',
  'Creativity moves through all.',
  'Dreams become sacred form.',
];

const MAX_DIALOGUE_CHARS = 120;

function limitCopy(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

const WEEK_INTROS: Record<number, { title: string; body: string }> = {
  5: {
    title: 'Recovering a Sense of Possibility',
    body: 'This week you are being asked to examine your payoffs in remaining stuck. You will explore how you curtail your own possibilities by placing limits on the good you can receive. You will examine the cost of settling for appearing good instead of being authentic. You may find yourself thinking about radical changes, no longer ruling out your growth by making others the cause of your constriction.',
  },
  6: {
    title: 'Recovering a Sense of Abundance',
    body: 'This week you confront a deep creative block\u2014your relationship with money. You will examine the inherited stories you carry about scarcity, worth, and what you are allowed to receive. The exercises will surface the ways your attitudes toward abundance and luxury quietly starve your creative life. You will begin counting\u2014a practice of radical clarity around how you spend, what you value, and where the two diverge. This week may feel volatile.',
  },
  7: {
    title: 'CHECK-IN',
    body:
      'How many days this week did you do your morning pages? Have you\nallowed yourself to daydream a few creative risks? Are you coddling\nyour artist child with childhood loves?\n\nDid you do your artist date this week? Did you use it to take any risks?\nWhat did you do? How did it feel?\n\nDid you experience any synchronicity this week? What was it?\n\nWere there any other issues this week that you consider significant for\nyour recovery? Describe them.',
  },
};

const STORAGE_KEY = 'dailyReadLastSeenWeek';
const WEEK_DIALOGUES: Record<number, { emotion: BlueEmotion; message: string }> = {
  0: {
    emotion: 'happy',
    message:
      "Before you move, I want to ground this week in ten principles. Read them slowly. Let them set the tone for your morning pages before the rest of the day starts talking over you.",
  },
  5: {
    emotion: 'confused',
    message:
      "Week 5 asks for honesty. Notice where you've made small cages out of old limits, and bring that tension into your morning pages instead of smoothing it over.",
  },
  6: {
    emotion: 'sad',
    message:
      "Week 6 tends to stir things up. Money stories, scarcity, and self-worth all surface here. Stay close to your morning pages this week. They will help you hear what's actually yours.",
  },
};

interface DailyReadPopupProps {
  activeWeek: number;
  onDismiss?: () => void;
}

export default function DailyReadPopup({ activeWeek, onDismiss }: DailyReadPopupProps) {
  const { play } = useSound();
  const [visible, setVisible] = useState(false);

  useScrollLock(visible);

  useEffect(() => {
    if (activeWeek <= 0) return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== String(activeWeek)) {
      setVisible(true);
      play('navigation');
    }
  }, [activeWeek, play]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    play('success');
    localStorage.setItem(STORAGE_KEY, String(activeWeek));
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  const weekIntro = WEEK_INTROS[activeWeek];
  const weekDialogue = WEEK_DIALOGUES[activeWeek] ?? {
    emotion: 'happy' as BlueEmotion,
    message: `Week ${activeWeek} is open. Carry one strong thread into your morning pages before the day crowds it out.`,
  };
  const dialogueMessage = limitCopy(weekDialogue.message, MAX_DIALOGUE_CHARS);

  return (
    <div className={styles.overlay} onClick={handleDismiss}>
      <div
        className={styles.card}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-read-popup-title"
      >
        <div className={styles.dialogueWrap}>
          <BlueDialogue
            key={activeWeek}
            message={dialogueMessage}
            emotion={weekDialogue.emotion}
            variant="overlay"
            fixedHeight
            showSkip={false}
          />
        </div>

        <div className={`${styles.header} ${styles.headerVisible}`}>
          <p className={styles.eyebrow}>Week {activeWeek}</p>
          <h2 id="daily-read-popup-title" className={styles.title}>{weekIntro ? weekIntro.title : 'Basic Principles'}</h2>
          <p className={styles.subtitle}>
            {weekIntro
              ? 'Let this frame the week, then keep the thread alive in your morning pages.'
              : 'These are the core ideas underneath the work. Read them once before you begin.'}
          </p>
        </div>

        <div className={`${styles.principlesWrap} ${styles.principlesWrapVisible}`}>
          {weekIntro ? (
            <p className={styles.weekIntroBody}>{weekIntro.body}</p>
          ) : (
            <ol className={styles.principlesList}>
              {PRINCIPLES.map((text, i) => (
                <li key={i} className={styles.principleItem}>
                  <span className={styles.principleNumber}>{i + 1}</span>
                  <p className={styles.principleText}>{text}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={`${styles.footer} ${styles.footerVisible}`}>
          <button type="button" className={styles.ctaButton} onClick={handleDismiss} onMouseEnter={() => play('hover')}>
            <span className={styles.checkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
            Open Morning Pages
          </button>
        </div>
      </div>
    </div>
  );
}
