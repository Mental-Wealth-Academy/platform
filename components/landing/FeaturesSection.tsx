'use client';

import { useState } from 'react';
import styles from './FeaturesSection.module.css';

const tabs = [
  'Your Weekly Flow',
  'What You Earn',
] as const;

type Tab = (typeof tabs)[number];

function WeeklyFlowPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.miniTabs}>
        <span className={`${styles.miniTab} ${styles.miniTabActive}`}>Journal</span>
        <span className={styles.miniTab}>Games</span>
        <span className={styles.miniTab}>Activities</span>
      </div>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Morning Pages</span>
          <span className={styles.weekBadge}>Week 4</span>
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
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Discuss and Debate</span>
          <span className={styles.weekBadge}>Week 4</span>
        </div>
        <p className={styles.taskDesc}>Spot cognitive distortions in real scenarios. You sharpen your self-awareness and earn points while you play.</p>
      </div>
    </div>
  );
}

function EarningsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.questProgress}>
        <span className={styles.questProgressLabel}>Your Season</span>
        <div className={styles.questProgressBar}>
          <div className={styles.questProgressFill} style={{ width: '33%' }} />
        </div>
        <span className={styles.questProgressText}>Week 4 of 12</span>
      </div>
      <div className={styles.questCard}>
        <div className={styles.questHeader}>
          <span className={styles.questName}>Journal Streak</span>
          <span className={styles.questReward}>+150 pts</span>
        </div>
        <p className={styles.questDesc}>You wrote 7 days in a row. That consistency compounds — your reflection depth score just jumped.</p>
        <div className={styles.questMeta}>7-day streak active</div>
      </div>
      <div className={styles.questCard}>
        <div className={styles.questHeader}>
          <span className={styles.questName}>Peer Feedback</span>
          <span className={styles.questReward}>+80 pts</span>
        </div>
        <p className={styles.questDesc}>You gave feedback to 2 cohort members this week. The community grows when you show up for others.</p>
        <div className={styles.questMeta}>2 of 3 reviews done</div>
      </div>
      <div className={styles.rewardsBar}>
        <span>Your total:</span>
        <span className={styles.rewardHighlight}>430 points earned</span>
        <span>&#183;</span>
        <span className={styles.rewardHighlight}>3 badges unlocked</span>
      </div>
    </div>
  );
}

export const FeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Your Weekly Flow');

  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Your Course</p>
          <h2 className={styles.title}>
            Seasonal Creative Writing
          </h2>
          <p className={styles.description}>
            Tackle 12-weeks completely at your own pace, weeks are sealed as you complete them, fully private, and unlocked with prizes after course completion.
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
            {activeTab === 'Your Weekly Flow' && <WeeklyFlowPanel />}
            {activeTab === 'What You Earn' && <EarningsPanel />}

          </div>
        </div>
      </div>
    </section>
  );
};
