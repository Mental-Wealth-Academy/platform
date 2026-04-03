'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './FeaturesSection.module.css';

export const FeaturesSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Your Course</p>
          <h2 className={styles.title}>
            Study Daily, Earn Wealth
          </h2>
          <p className={styles.description}>
            Tackle 12-weeks of intensive study, a spiritual chiropracticing that massages the soul, pays you in gold, and transforms you towards self-actualization.
          </p>
        </div>

        <div className={styles.cardRow}>
          <div className={activeCard === 0 ? styles.rainbowWrap : styles.cardSlot}>
            <div className={styles.taskCard}>
              <span className={styles.cardNumber}>01</span>
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>Morning Pages</span>
                {activeCard === 0 && <span className={styles.weekBadge}>Daily</span>}
              </div>
              <p className={styles.taskDesc}>You write for 15 minutes. No prompts, no pressure — just you and the page. Your entry stays private unless you choose to share it.</p>
              <div className={styles.checklistProgress}>
                <div className={styles.checkItem}>
                  <span className={styles.checkDone}>&#10003;</span> Write your entry
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkDone}>&#10003;</span> Tag your mood
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkPending}>&#9675;</span> Get Azura&#39;s feedback
                </div>
              </div>
            </div>
          </div>

          <div className={activeCard === 1 ? styles.rainbowWrap : styles.cardSlot}>
            <div className={styles.taskCard}>
              <span className={styles.cardNumber}>02</span>
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>Weekly Tasks</span>
                {activeCard === 1 && <span className={styles.weekBadge}>Weekly</span>}
              </div>
              <p className={styles.taskDesc}>Each week brings a new challenge. Complete readings, reflections, and quests to earn points and unlock the next stage. Miss a week and you fall behind — consistency is the currency.</p>
            </div>
          </div>

          <div className={activeCard === 2 ? styles.rainbowWrap : styles.cardSlot}>
            <div className={styles.taskCard}>
              <span className={styles.cardNumber}>03</span>
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>Wishes &amp; Wealth</span>
                {activeCard === 2 && <span className={styles.weekBadge}>Seasonal</span>}
              </div>
              <p className={styles.taskDesc}>Submit wishes to the Academy, vote on community direction, and track your shards, tokens, and rewards. Every proposal is reviewed by Azura and decided by the Angels. Study generates wealth. Governance multiplies it.</p>
              <div className={styles.rewardsBar}>
                <span>Your total:</span>
                <span className={styles.rewardHighlight}>430 points exchanged</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <a href="#membership" className={styles.purchaseBtn}>
            View Membership
          </a>
        </div>
      </div>
    </section>
  );
};
