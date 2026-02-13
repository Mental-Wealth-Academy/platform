'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './HomeDashboard.module.css';

const tabs = [
  'Voting & Governance',
  'AI Agent Azura',
  'Weekly Tasks',
  'Quests & Learning',
] as const;

type Tab = (typeof tabs)[number];

const scoreDimensions = [
  { label: 'Clarity', icon: '&#9678;' },
  { label: 'Impact', icon: '&#9733;' },
  { label: 'Feasibility', icon: '&#9881;' },
  { label: 'Budget', icon: '&#9670;' },
  { label: 'Ingenuity', icon: '&#9752;' },
  { label: 'Chaos', icon: '&#10038;' },
] as const;

function ScannerCTA() {
  return (
    <div className={styles.scannerCta}>
      <div className={styles.scannerHeader}>
        <div className={styles.scannerBranding}>
          <div className={styles.scannerAvatarWrap}>
            <Image
              src="https://i.imgur.com/AkflhaJ.png"
              alt="Azura"
              width={44}
              height={44}
              className={styles.scannerAvatar}
            />
            <div className={styles.scannerLive} />
          </div>
          <div>
            <h3 className={styles.scannerTitle}>Academic Scanner</h3>
            <span className={styles.scannerPowered}>Powered by Chainlink DON</span>
          </div>
        </div>
        <span className={styles.scannerBadge}>CRE</span>
      </div>
      <p className={styles.scannerDesc}>
        Submit a funding proposal and Azura will review it across 6 dimensions using decentralized AI consensus on the Chainlink oracle network.
      </p>
      <div className={styles.scannerDimensions}>
        {scoreDimensions.map((d) => (
          <span
            key={d.label}
            className={styles.dimensionChip}
            dangerouslySetInnerHTML={{ __html: `${d.icon} ${d.label}` }}
          />
        ))}
      </div>
      <a href="/voting/create" className={styles.scannerButton}>
        Submit Proposal for Review
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

function VotingPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Azura Power</span>
          <span className={styles.statValue}>2,847 AP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Treasury</span>
          <span className={styles.statValue}>12.4 ETH</span>
        </div>
      </div>
      <div className={styles.proposalCard}>
        <div className={styles.proposalHeader}>
          <span className={styles.badgeActive}>Active</span>
          <span className={styles.proposalId}>#042</span>
        </div>
        <p className={styles.proposalTitle}>Fund peer-led anxiety workshop series</p>
        <div className={styles.voteBar}>
          <div className={styles.voteFor} style={{ width: '72%' }} />
        </div>
        <div className={styles.voteLabels}>
          <span>For 72%</span>
          <span>Against 28%</span>
        </div>
      </div>
      <div className={styles.proposalCard}>
        <div className={styles.proposalHeader}>
          <span className={styles.badgePassed}>Passed</span>
          <span className={styles.proposalId}>#041</span>
        </div>
        <p className={styles.proposalTitle}>Onboard 3 new mental health researchers</p>
        <div className={styles.voteBar}>
          <div className={styles.voteFor} style={{ width: '89%' }} />
        </div>
        <div className={styles.voteLabels}>
          <span>For 89%</span>
          <span>Against 11%</span>
        </div>
      </div>
    </div>
  );
}

function AzuraPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.chatHeader}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>A</div>
          <div className={styles.onlineDot} />
        </div>
        <div>
          <span className={styles.chatName}>Azura</span>
          <span className={styles.chatStatus}>Online</span>
        </div>
      </div>
      <div className={styles.chatBody}>
        <div className={styles.bubbleAzura}>
          Hey! I reviewed your journal entry from yesterday. Your reflection on boundaries was really insightful.
        </div>
        <div className={styles.bubbleUser}>
          Thanks! I&apos;ve been trying to set better limits at work.
        </div>
        <div className={styles.bubbleAzura}>
          That&apos;s great progress. Want me to suggest a micro-task to practice that this week?
        </div>
      </div>
      <div className={styles.chatInput}>
        <span className={styles.chatInputText}>Ask Azura anything...</span>
      </div>
      <div className={styles.soulGems}>
        <span className={styles.gemIcon}>&#9670;</span> 340 Soul Gems earned
      </div>
    </div>
  );
}

function TasksPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.miniTabs}>
        <span className={`${styles.miniTab} ${styles.miniTabActive}`}>Journal</span>
        <span className={styles.miniTab}>Readings</span>
        <span className={styles.miniTab}>Nano</span>
      </div>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Morning Reflection</span>
          <span className={styles.weekBadge}>Week 12</span>
        </div>
        <p className={styles.taskDesc}>Write about a moment this week where you felt truly present.</p>
        <div className={styles.checklistProgress}>
          <div className={styles.checkItem}>
            <span className={styles.checkDone}>&#10003;</span> Draft entry
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkDone}>&#10003;</span> Add reflection tags
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkPending}>&#9675;</span> Submit for review
          </div>
        </div>
      </div>
      <div className={styles.taskCard}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>Assigned Reading</span>
          <span className={styles.weekBadge}>Week 12</span>
        </div>
        <p className={styles.taskDesc}>Chapter 4: Building Emotional Resilience — highlight 3 key takeaways.</p>
      </div>
    </div>
  );
}

function QuestsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.questProgress}>
        <span className={styles.questProgressLabel}>Active Quest</span>
        <div className={styles.questProgressBar}>
          <div className={styles.questProgressFill} style={{ width: '65%' }} />
        </div>
        <span className={styles.questProgressText}>65% complete</span>
      </div>
      <div className={styles.questCard}>
        <div className={styles.questHeader}>
          <span className={styles.questName}>Mindful Observer</span>
          <span className={styles.questReward}>+120 AP</span>
        </div>
        <p className={styles.questDesc}>Complete 5 daily mindfulness exercises and log your observations.</p>
        <div className={styles.questMeta}>3 of 5 tasks done</div>
      </div>
      <div className={styles.questCard}>
        <div className={styles.questHeader}>
          <span className={styles.questName}>Community Builder</span>
          <span className={styles.questReward}>+200 AP</span>
        </div>
        <p className={styles.questDesc}>Participate in 3 group discussions and give feedback to 2 peers.</p>
        <div className={styles.questMeta}>1 of 5 tasks done</div>
      </div>
      <div className={styles.rewardsBar}>
        <span>Season Rewards:</span>
        <span className={styles.rewardHighlight}>520 AP earned</span>
        <span>&#183;</span>
        <span className={styles.rewardHighlight}>2 Badges unlocked</span>
      </div>
    </div>
  );
}

export const HomeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Voting & Governance');

  return (
    <div className={styles.dashboardWrap}>
      <ScannerCTA />
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
        {activeTab === 'Voting & Governance' && <VotingPanel />}
        {activeTab === 'AI Agent Azura' && <AzuraPanel />}
        {activeTab === 'Weekly Tasks' && <TasksPanel />}
        {activeTab === 'Quests & Learning' && <QuestsPanel />}
        </div>
      </div>
    </div>
  );
};
