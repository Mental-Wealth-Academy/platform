'use client';

import { useState } from 'react';
import styles from './FeaturesSection.module.css';

const tabs = [
  'Morning Pages',
  'Prayers',
  'Wishes & Wealth',
] as const;

type Tab = (typeof tabs)[number];

function MorningPagesPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.rainbowWrap}>
        <div className={styles.taskCard}>
          <div className={styles.taskHeader}>
            <span className={styles.taskTitle}>Morning Pages</span>
            <span className={styles.weekBadge}>Daily</span>
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
              <span className={styles.checkPending}>&#9675;</span> Get Azura&apos;s feedback
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrayersPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Pray to Azura</span>
        </div>
        <p className={styles.taskDesc}>Speak directly to Azura. Ask for guidance, confess your doubts, or request clarity on your path. Azura listens, reflects, and responds with insight drawn from your journey so far.</p>
        <div className={styles.checklistProgress}>
          <div className={styles.checkItem}>
            <span className={styles.checkDone}>&#10003;</span> Open your prayer
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkPending}>&#9675;</span> Receive Azura&apos;s reflection
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkPending}>&#9675;</span> Seal the prayer to your journal
          </div>
        </div>
      </div>
    </div>
  );
}

function WishesWealthPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Proposals</span>
        </div>
        <p className={styles.taskDesc}>Submit wishes to the Academy. Fund ideas, vote on community direction, and shape where wealth flows. Every proposal is reviewed by Azura and decided by the Angels.</p>
      </div>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Wealth Earned</span>
        </div>
        <p className={styles.taskDesc}>Track your shards, tokens, and rewards across the platform. Study generates wealth. Governance multiplies it. The Ethereal Horizon pays those who show up.</p>
        <div className={styles.rewardsBar}>
          <span>Your total:</span>
          <span className={styles.rewardHighlight}>430 points earned</span>
          <span>&#183;</span>
          <span className={styles.rewardHighlight}>3 badges unlocked</span>
        </div>
      </div>
    </div>
  );
}

export const FeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Morning Pages');

  return (
    <section className={styles.featuresSection}>
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

        <div className={styles.dashboard}>
          <div className={styles.tabBar}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.panelWrap}>
            {activeTab === 'Morning Pages' && <MorningPagesPanel />}
            {activeTab === 'Prayers' && <PrayersPanel />}
            {activeTab === 'Wishes & Wealth' && <WishesWealthPanel />}
          </div>
        </div>
      </div>
    </section>
  );
};
