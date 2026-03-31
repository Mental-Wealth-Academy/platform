'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SubmitProposalModal from '@/components/voting/SubmitProposalModal';
import styles from './HomeDashboard.module.css';

const tabs = [
  'Your Impact',
  'Activities',
  'Quests & Learning',
  'Voting & Governance',
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

function ScannerCTA({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className={styles.scannerCta}>
      <div className={styles.scannerHeader}>
        <div className={styles.scannerBranding}>
          <div className={styles.scannerAvatarWrap}>
            <Image
              src="https://i.imgur.com/3Y3KrnJ.png"
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
      <button onClick={onSubmit} className={styles.scannerButton} type="button">
        Submit Proposal for Review
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
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

function ImpactPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.impactBanner}>
        <span className={styles.impactBannerText}>
          Every vote is on-chain. Every dollar is tracked. No backroom decisions.
        </span>
      </div>
      <div className={styles.impactGrid}>
        <div className={styles.impactCard}>
          <div className={styles.impactCardHeader}>
            <span className={styles.impactIcon}>&#9878;</span>
            <span className={styles.impactCardTitle}>Transparent Governance</span>
          </div>
          <p className={styles.impactCardDesc}>
            Traditional orgs hide how money moves. Here, proposals are AI-reviewed, community-voted, and executed on-chain.
          </p>
          <div className={styles.impactStats}>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>3</span>
              <span className={styles.statLabel}>Proposals Voted</span>
            </div>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>$2.1k</span>
              <span className={styles.statLabel}>Funds Guided</span>
            </div>
          </div>
          <div className={styles.impactTags}>
            <span className={styles.impactTag}>On-chain</span>
            <span className={styles.impactTag}>Auditable</span>
          </div>
        </div>

        <div className={styles.impactCard}>
          <div className={styles.impactCardHeader}>
            <span className={styles.impactIcon}>&#9733;</span>
            <span className={styles.impactCardTitle}>Your Voice Matters</span>
          </div>
          <p className={styles.impactCardDesc}>
            No token-gated whale dominance. Azura Power scales with contribution, not capital. Do the work, earn the weight.
          </p>
          <div className={styles.impactStats}>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>2</span>
              <span className={styles.statLabel}>Themes Shaped</span>
            </div>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>Active</span>
              <span className={styles.statLabel}>Agent Memory</span>
            </div>
          </div>
          <div className={styles.impactTags}>
            <span className={styles.impactTag}>Access</span>
            <span className={styles.impactTag}>Prevention</span>
          </div>
        </div>

        <div className={styles.impactCard}>
          <div className={styles.impactCardHeader}>
            <span className={styles.impactIcon}>&#9670;</span>
            <span className={styles.impactCardTitle}>System Integrity</span>
          </div>
          <p className={styles.impactCardDesc}>
            Azura reviews every proposal across 6 dimensions before it reaches a vote. No spam, no manipulation, no wasted treasury.
          </p>
          <div className={styles.impactStats}>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>High</span>
              <span className={styles.statLabel}>Signal Quality</span>
            </div>
            <div className={styles.impactStat}>
              <span className={styles.impactStatValue}>0</span>
              <span className={styles.statLabel}>Disputes</span>
            </div>
          </div>
          <div className={styles.impactTags}>
            <span className={styles.impactTagGreen}>Healthy</span>
            <span className={styles.impactTag}>No urgency</span>
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState<Tab>('Your Impact');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  return (
    <div className={styles.dashboardWrap}>
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
        {activeTab === 'Your Impact' && <ImpactPanel />}
        {activeTab === 'Activities' && <TasksPanel />}
        {activeTab === 'Quests & Learning' && <QuestsPanel />}
        </div>
      </div>
      <ScannerCTA onSubmit={() => setIsSubmitModalOpen(true)} />
      <Link href="/home" className={styles.viewTreasuryCta}>
        View Treasury
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
      <SubmitProposalModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
};
