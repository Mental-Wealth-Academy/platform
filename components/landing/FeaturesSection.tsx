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
    }, 5000);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Your Course</p>
          <h2 className={styles.title}>
            Something Fun With Real Results
          </h2>
          <p className={styles.description}>
            Notes, tasks, fun challenges helping you get more creative and evolve, turn twenty minutes a day into a world of wealth and self-actualization.
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
              <p className={styles.taskDesc}>Fifteen minutes of writing. No prompts, no pressure. Just you and the page. Private by default. The habit that changes everything.</p>
              <div className={styles.checklistProgress}>
                <div className={styles.checkItem}>
                  <span className={styles.checkDone}>&#10003;</span> Write your entry
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkDone}>&#10003;</span> Tag your mood
                </div>
                <div className={styles.checkItem}>
                  <span className={styles.checkPending}>&#9675;</span> Get Blue&#39;s feedback
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
              <p className={styles.taskDesc}>Each week unlocks a new challenge. Complete readings, reflections, and quests to earn shards and level up. Consistency is the main currency.</p>
            </div>
          </div>

          <div className={activeCard === 2 ? styles.rainbowWrap : styles.cardSlot}>
            <div className={styles.taskCard}>
              <span className={styles.cardNumber}>03</span>
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>Agentic Tools</span>
                {activeCard === 2 && <span className={styles.weekBadge}>Always On</span>}
              </div>
              <p className={styles.taskDesc}>Blue researches for you, builds your credit, and manages governance proposals. AI tools that pay for themselves through on-chain actions. Your agent works while you learn.</p>
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
