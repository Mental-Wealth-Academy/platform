'use client';

import React, { useState, useEffect } from 'react';
import BlueDialogue, { BlueEmotion } from '@/components/blue-dialogue/BlueDialogue';
import { useSound } from '@/hooks/useSound';
import styles from './DailyReadPopup.module.css';

const PRINCIPLES = [
  'Creativity is the natural order of life. Life is energy: pure creative energy.',
  'There is an underlying, in-dwelling creative force infusing all of life\u2014including ourselves.',
  'When we open ourselves to our creativity, we open ourselves to the creator\u2019s creativity within us and our lives.',
  'We are, ourselves, creations. And we, in turn, are meant to continue creativity by being creative ourselves.',
  'Creativity is God\u2019s gift to us. Using our creativity is our gift back to God.',
  'The refusal to be creative is self-will and is counter to our true nature.',
  'When we open ourselves to exploring our creativity, we open ourselves to God: good orderly direction.',
  'As we open our creative channel to the creator, many gentle but powerful changes are to be expected.',
  'It is safe to open ourselves up to greater and greater creativity.',
  'Our creative dreams and yearnings come from a divine source. As we move toward our dreams, we move toward our divinity.',
];

const WEEK_INTROS: Record<number, { title: string; body: string }> = {
  5: {
    title: 'Recovering a Sense of Possibility',
    body: 'This week you are being asked to examine your payoffs in remaining stuck. You will explore how you curtail your own possibilities by placing limits on the good you can receive. You will examine the cost of settling for appearing good instead of being authentic. You may find yourself thinking about radical changes, no longer ruling out your growth by making others the cause of your constriction.',
  },
  6: {
    title: 'Recovering a Sense of Abundance',
    body: 'This week you confront a deep creative block\u2014your relationship with money. You will examine the inherited stories you carry about scarcity, worth, and what you are allowed to receive. The exercises will surface the ways your attitudes toward abundance and luxury quietly starve your creative life. You will begin counting\u2014a practice of radical clarity around how you spend, what you value, and where the two diverge. This week may feel volatile.',
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
  const [dialogueComplete, setDialogueComplete] = useState(false);

  useEffect(() => {
    if (activeWeek <= 0) return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== String(activeWeek)) {
      setVisible(true);
      setDialogueComplete(false);
      play('navigation');
    }
  }, [activeWeek, play]);

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
    message: `Week ${activeWeek} is open. Read this slowly, then carry the strongest thread into your morning pages before the day starts crowding it out.`,
  };

  return (
    <div className={styles.overlay} onClick={handleDismiss}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogueWrap}>
          <BlueDialogue
            key={activeWeek}
            message={weekDialogue.message}
            emotion={weekDialogue.emotion}
            onComplete={() => setDialogueComplete(true)}
            showSkip
          />
        </div>

        <div className={`${styles.header} ${dialogueComplete ? styles.headerVisible : ''}`}>
          <p className={styles.eyebrow}>Week {activeWeek}</p>
          <h2 className={styles.title}>{weekIntro ? weekIntro.title : 'Basic Principles'}</h2>
          <p className={styles.subtitle}>
            {weekIntro
              ? 'Let this frame the week, then keep the thread alive in your morning pages.'
              : 'These are the core ideas underneath the work. Read them once before you begin.'}
          </p>
        </div>

        <div className={`${styles.principlesWrap} ${dialogueComplete ? styles.principlesWrapVisible : ''}`}>
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

        <div className={`${styles.footer} ${dialogueComplete ? styles.footerVisible : ''}`}>
          <button type="button" className={styles.ctaButton} onClick={handleDismiss} onMouseEnter={() => play('hover')}>
            <span className={styles.checkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Continue To Morning Pages
          </button>
        </div>
      </div>
    </div>
  );
}
