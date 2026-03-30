'use client';

import React, { useState, useEffect } from 'react';
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
};

const STORAGE_KEY = 'dailyReadLastSeenWeek';

interface DailyReadPopupProps {
  activeWeek: number;
  onDismiss?: () => void;
}

export default function DailyReadPopup({ activeWeek, onDismiss }: DailyReadPopupProps) {
  const { play } = useSound();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeWeek <= 0) return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== String(activeWeek)) {
      setVisible(true);
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

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Week {activeWeek}</p>
          <h2 className={styles.title}>{weekIntro ? weekIntro.title : 'Basic Principles'}</h2>
        </div>

        <div className={styles.principlesWrap}>
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

        <div className={styles.footer}>
          <button type="button" className={styles.ctaButton} onClick={handleDismiss} onMouseEnter={() => play('hover')}>
            <span className={styles.checkIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Finished Reading
          </button>
        </div>
      </div>
    </div>
  );
}
