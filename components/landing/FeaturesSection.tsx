'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './FeaturesSection.module.css';

interface TreeNode {
  label: string;
  avatar?: string;
  icon?: string;
  disabled?: boolean;
  children?: TreeNode[];
}

const agentTree: TreeNode[] = [
  {
    label: 'Azura Agent Configuration',
    avatar: 'https://i.imgur.com/HFjHyUZ.png',
    children: [
      {
        label: 'Personality Module',
        icon: '&#9672;',
        children: [
          { label: 'Tone: Empathetic & Direct' },
          { label: 'Response Style: Conversational' },
          { label: 'Creativity: 0.7' },
          { label: 'Language: Multi-lingual' },
        ],
      },
      {
        label: 'Memory & Context',
        icon: '&#9683;',
        children: [
          { label: 'Session Memory: Enabled' },
          { label: 'Long-term Recall: Active' },
          { label: 'Context Window: 128k tokens' },
          { label: 'RAG Pipeline: Connected' },
        ],
      },
      {
        label: 'Skills & Capabilities',
        icon: '&#9733;',
        children: [
          { label: 'Journal Review' },
          { label: 'Quest Generation' },
          { label: 'Governance Advisor' },
          { label: 'Meditation Guide' },
          { label: 'Crisis Detection' },
        ],
      },
      {
        label: 'Wallet Integration',
        icon: '&#9670;',
        children: [
          { label: 'Auto-distribute Rewards' },
          { label: 'Treasury Monitoring' },
          { label: 'Gas Optimization: On' },
          { label: 'Network: Base Mainnet' },
        ],
      },
      {
        label: 'Safety & Moderation',
        icon: '&#9888;',
        children: [
          { label: 'Content Filtering: Strict' },
          { label: 'Escalation Protocol: Active' },
          { label: 'Audit Logging: Enabled' },
        ],
      },
      {
        label: 'Scheduling & Automation',
        icon: '&#8635;',
        disabled: true,
        children: [
          { label: 'Cron Jobs: Paused' },
          { label: 'Event Triggers: Disabled' },
          { label: 'Batch Processing: Off' },
        ],
      },
    ],
  },
];

function TreeNodeRow({ node, depth, expanded, onToggle }: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (label: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.label);

  return (
    <>
      <div
        className={`${styles.treeRow} ${node.disabled ? styles.treeRowDisabled : ''}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && !node.disabled && onToggle(node.label)}
        role={hasChildren ? 'button' : undefined}
      >
        {hasChildren && (
          <span className={styles.treeArrow}>
            {isExpanded ? '\u25BE' : '\u25B8'}
          </span>
        )}
        {!hasChildren && <span className={styles.treeSpacer} />}
        {node.avatar && (
          <Image
            src={node.avatar}
            alt="Azura"
            width={24}
            height={24}
            className={styles.treeAvatar}
            unoptimized
          />
        )}
        {node.icon && !node.avatar && (
          <span
            className={styles.treeIcon}
            dangerouslySetInnerHTML={{ __html: node.icon }}
          />
        )}
        <span className={styles.treeLabel}>{node.label}</span>
        {node.disabled && <span className={styles.treeBadgeDisabled}>Paused</span>}
      </div>
      {hasChildren && isExpanded && node.children!.map((child) => (
        <TreeNodeRow
          key={child.label}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

const tabs = [
  'Activities',
  'Voting & Governance',
  'AI Agent Azura',
  'Quests & Learning',
] as const;

type Tab = (typeof tabs)[number];

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
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['Azura Agent Configuration', 'Skills & Capabilities', 'Personality Module'])
  );

  const onToggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.treeHeader}>
        <span className={styles.treeHeaderLabel}>Modular Agent Settings</span>
        <span className={styles.treeHeaderVersion}>v1.3</span>
      </div>
      <div className={styles.treeContainer}>
        {agentTree.map((node) => (
          <TreeNodeRow
            key={node.label}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
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

export const FeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Activities');

  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Interactive Dashboard</p>
          <h2 className={styles.title}>
            Personalized agentic organization for community mental wealth
          </h2>
          <p className={styles.description}>
            Agentic Co-pilot has its own wallet. No need to split the bill, Azura works tirelessly to bring the best peer-governed system for transparent wealth management, structured by weekly challenges and accountability, turn ambition into academia.
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
            {activeTab === 'Activities' && <TasksPanel />}
            {activeTab === 'Voting & Governance' && <VotingPanel />}
            {activeTab === 'AI Agent Azura' && <AzuraPanel />}
            {activeTab === 'Quests & Learning' && <QuestsPanel />}
          </div>
        </div>
      </div>
    </section>
  );
};
