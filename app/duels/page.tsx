'use client';

import { useState } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

type DuelStatus = 'live' | 'waiting' | 'completed';

interface Duel {
  id: string;
  challenger: { name: string; avatar: string; rank: number };
  opponent: { name: string; avatar: string; rank: number } | null;
  topic: string;
  stake: number;
  status: DuelStatus;
  timeLeft?: string;
  score?: { challenger: number; opponent: number };
}

const MOCK_DUELS: Duel[] = [
  {
    id: '1',
    challenger: { name: 'NeuroNova', avatar: 'NN', rank: 3 },
    opponent: { name: 'MindForge', avatar: 'MF', rank: 7 },
    topic: 'Cognitive Behavioral Therapy',
    stake: 50,
    status: 'live',
    timeLeft: '1:23',
    score: { challenger: 4, opponent: 3 },
  },
  {
    id: '2',
    challenger: { name: 'SynapseKid', avatar: 'SK', rank: 12 },
    opponent: { name: 'ZenCoder', avatar: 'ZC', rank: 5 },
    topic: 'Stress Response Systems',
    stake: 100,
    status: 'live',
    timeLeft: '0:47',
    score: { challenger: 2, opponent: 5 },
  },
  {
    id: '3',
    challenger: { name: 'PsychPilot', avatar: 'PP', rank: 1 },
    opponent: null,
    topic: 'Neuroplasticity Basics',
    stake: 75,
    status: 'waiting',
  },
  {
    id: '4',
    challenger: { name: 'CortexQ', avatar: 'CQ', rank: 9 },
    opponent: null,
    topic: 'Emotional Intelligence',
    stake: 25,
    status: 'waiting',
  },
  {
    id: '5',
    challenger: { name: 'NeuroNova', avatar: 'NN', rank: 3 },
    opponent: { name: 'PsychPilot', avatar: 'PP', rank: 1 },
    topic: 'Sleep & Memory',
    stake: 200,
    status: 'completed',
    score: { challenger: 7, opponent: 5 },
  },
  {
    id: '6',
    challenger: { name: 'ZenCoder', avatar: 'ZC', rank: 5 },
    opponent: { name: 'SynapseKid', avatar: 'SK', rank: 12 },
    topic: 'Mindfulness Techniques',
    stake: 50,
    status: 'completed',
    score: { challenger: 6, opponent: 3 },
  },
];

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Topic {
  name: string;
  difficulty: Difficulty;
}

const TOPICS: Topic[] = [
  { name: 'Mindfulness Techniques', difficulty: 'beginner' },
  { name: 'Sleep & Memory', difficulty: 'beginner' },
  { name: 'Emotional Intelligence', difficulty: 'intermediate' },
  { name: 'Stress Response Systems', difficulty: 'intermediate' },
  { name: 'Neuroplasticity Basics', difficulty: 'advanced' },
  { name: 'Cognitive Behavioral Therapy', difficulty: 'advanced' },
];

export default function DuelsPage() {
  const [activeTab, setActiveTab] = useState<'arena' | 'history'>('arena');
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const { play } = useSound();

  const liveDuels = MOCK_DUELS.filter((d) => d.status === 'live');
  const waitingDuels = MOCK_DUELS.filter((d) => d.status === 'waiting');
  const completedDuels = MOCK_DUELS.filter((d) => d.status === 'completed');

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.content}>

          {/* Hero Banner */}
          <div className={styles.heroBanner}>
            <div className={styles.heroBannerContent}>
              <span className={styles.heroEyebrow}>PvP Knowledge</span>
              <h1 className={styles.heroTitle}>Duels</h1>
              <p className={styles.heroSubtitle}>
                Challenge another learner to a timed quiz battle. Stake Orbs, test your knowledge, winner takes the pot.
              </p>
            </div>
            {liveDuels.length > 0 && (
              <div className={styles.heroLiveBanner}>
                <span className={styles.heroLiveDot} />
                <span className={styles.heroLiveText}>{liveDuels.length} Live Now</span>
                <button
                  className={styles.heroLiveButton}
                  onClick={() => {
                    play('click');
                    setActiveTab('arena');
                    setTimeout(() => {
                      document.getElementById('live-duels-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  onMouseEnter={() => play('hover')}
                  type="button"
                >
                  Watch
                </button>
              </div>
            )}
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>156</span>
                <span className={styles.heroStatLabel}>Duels Today</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>7,840</span>
                <span className={styles.heroStatLabel}>Orbs Staked</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>3-5%</span>
                <span className={styles.heroStatLabel}>Treasury Fee</span>
              </div>
            </div>
          </div>

          {/* Create Duel CTA */}
          <div className={styles.createDuelCard}>
                  <div className={styles.createDuelHeader}>
                    <h2 className={styles.createDuelTitle}>Create a Challenge</h2>
                    <p className={styles.createDuelDesc}>Pick a topic, set your stake, and wait for an opponent</p>
                  </div>

                  <div className={styles.createDuelForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Topic</label>
                      <div className={styles.topicGrid}>
                        {TOPICS.map((topic) => (
                          <button
                            key={topic.name}
                            className={`${styles.topicChip} ${styles[`topicChip${topic.difficulty.charAt(0).toUpperCase()}${topic.difficulty.slice(1)}`]} ${selectedTopic === topic.name ? styles.topicChipSelected : ''}`}
                            onClick={() => { play('click'); setSelectedTopic(topic.name); }}
                            onMouseEnter={() => play('hover')}
                            type="button"
                          >
                            <span className={styles.topicName}>{topic.name}</span>
                            <span className={`${styles.difficultyBadge} ${styles[`difficulty${topic.difficulty.charAt(0).toUpperCase()}${topic.difficulty.slice(1)}`]}`}>
                              {topic.difficulty}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Stake Amount (Orbs)</label>
                      <div className={styles.stakeOptions}>
                        {[25, 50, 100, 200].map((amount) => (
                          <button
                            key={amount}
                            className={`${styles.stakeChip} ${selectedStake === amount ? styles.stakeChipActive : ''}`}
                            onClick={() => { play('click'); setSelectedStake(amount); }}
                            onMouseEnter={() => play('hover')}
                            type="button"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.stakeBreakdown}>
                      <div className={styles.breakdownRow}>
                        <span className={styles.breakdownLabel}>Your Stake</span>
                        <span className={styles.breakdownValue}>{selectedStake} ORBS</span>
                      </div>
                      <div className={styles.breakdownRow}>
                        <span className={styles.breakdownLabel}>Winner Takes</span>
                        <span className={styles.breakdownValueHighlight}>{Math.floor(selectedStake * 2 * 0.96)} ORBS</span>
                      </div>
                      <div className={styles.breakdownRow}>
                        <span className={styles.breakdownLabel}>Treasury Fee (4%)</span>
                        <span className={styles.breakdownValueMuted}>{Math.ceil(selectedStake * 2 * 0.04)} ORBS</span>
                      </div>
                    </div>

                    <button
                      className={styles.challengeButton}
                      onClick={() => play('click')}
                      onMouseEnter={() => play('hover')}
                      type="button"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Create Duel
                    </button>
                  </div>
                </div>

          {/* Tab Navigation */}
          <section className={styles.tabGrid}>
            <div
              className={`${styles.tabCard} ${activeTab === 'arena' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('arena'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <Image src="/icons/podium.svg" alt="" width={40} height={40} />
              </div>
              <h3 className={styles.tabTitle}>Active Duels</h3>
              <p className={styles.tabDesc}>Live battles & open challenges</p>
            </div>
            <div
              className={`${styles.tabCard} ${activeTab === 'history' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('history'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <Image src="/icons/battle-globe.svg" alt="" width={40} height={40} />
              </div>
              <h3 className={styles.tabTitle}>Battle Log</h3>
              <p className={styles.tabDesc}>Past results & earnings</p>
            </div>
          </section>

          {/* Tab Content */}
          <div className={styles.tabContent}>

            {/* ─── Active Duels Tab ─── */}
            {activeTab === 'arena' && (
              <>
                {/* Live Duels */}
                {liveDuels.length > 0 && (
                  <section id="live-duels-section">
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        <span className={styles.liveDot} />
                        Live Duels
                      </h2>
                      <span className={styles.sectionCount}>{liveDuels.length} active</span>
                    </div>
                    <div className={styles.duelGrid}>
                      {liveDuels.map((duel) => (
                        <div
                          key={duel.id}
                          className={`${styles.duelCard} ${styles.duelCardLive}`}
                          onMouseEnter={() => play('hover')}
                        >
                          <div className={styles.duelTopicRow}>
                            <span className={styles.duelTopic}>{duel.topic}</span>
                            <span className={styles.duelTimer}>{duel.timeLeft}</span>
                          </div>
                          <div className={styles.duelMatchup}>
                            <div className={styles.duelPlayer}>
                              <div className={styles.playerAvatar} style={{ background: 'var(--color-primary)' }}>
                                {duel.challenger.avatar}
                              </div>
                              <span className={styles.playerName}>{duel.challenger.name}</span>
                              <span className={styles.playerScore}>{duel.score?.challenger}</span>
                            </div>
                            <div className={styles.vsBlock}>
                              <span className={styles.vsText}>VS</span>
                              <span className={styles.duelStake}>{duel.stake * 2} ORBS</span>
                            </div>
                            <div className={styles.duelPlayer}>
                              <div className={styles.playerAvatar} style={{ background: 'var(--color-accent)' }}>
                                {duel.opponent?.avatar}
                              </div>
                              <span className={styles.playerName}>{duel.opponent?.name}</span>
                              <span className={styles.playerScore}>{duel.score?.opponent}</span>
                            </div>
                          </div>
                          <button
                            className={styles.spectateButton}
                            onClick={() => play('click')}
                            onMouseEnter={() => play('hover')}
                            type="button"
                          >
                            Spectate
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Open Challenges */}
                {waitingDuels.length > 0 && (
                  <section>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>Open Challenges</h2>
                      <span className={styles.sectionCount}>{waitingDuels.length} waiting</span>
                    </div>
                    <div className={styles.duelGrid}>
                      {waitingDuels.map((duel) => (
                        <div
                          key={duel.id}
                          className={styles.duelCard}
                          onMouseEnter={() => play('hover')}
                        >
                          <div className={styles.duelTopicRow}>
                            <span className={styles.duelTopic}>{duel.topic}</span>
                            <span className={styles.duelStakeBadge}>{duel.stake} ORBS</span>
                          </div>
                          <div className={styles.duelMatchup}>
                            <div className={styles.duelPlayer}>
                              <div className={styles.playerAvatar} style={{ background: 'var(--color-primary)' }}>
                                {duel.challenger.avatar}
                              </div>
                              <span className={styles.playerName}>{duel.challenger.name}</span>
                              <span className={styles.playerRank}>#{duel.challenger.rank}</span>
                            </div>
                            <div className={styles.vsBlock}>
                              <span className={styles.vsText}>VS</span>
                              <span className={styles.vsWaiting}>Waiting...</span>
                            </div>
                            <div className={styles.duelPlayer}>
                              <div className={`${styles.playerAvatar} ${styles.playerAvatarEmpty}`}>?</div>
                              <span className={styles.playerNameEmpty}>Open Slot</span>
                            </div>
                          </div>
                          <button
                            className={styles.acceptButton}
                            onClick={() => play('click')}
                            onMouseEnter={() => play('hover')}
                            type="button"
                          >
                            Accept Challenge
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ─── History Tab ─── */}
            {activeTab === 'history' && (
              <section>
                <div className={styles.duelGrid}>
                  {completedDuels.map((duel) => {
                    const challengerWon = (duel.score?.challenger ?? 0) > (duel.score?.opponent ?? 0);
                    return (
                      <div
                        key={duel.id}
                        className={`${styles.duelCard} ${styles.duelCardCompleted}`}
                        onMouseEnter={() => play('hover')}
                      >
                        <div className={styles.duelTopicRow}>
                          <span className={styles.duelTopic}>{duel.topic}</span>
                          <span className={styles.completedBadge}>Completed</span>
                        </div>
                        <div className={styles.duelMatchup}>
                          <div className={`${styles.duelPlayer} ${challengerWon ? styles.duelPlayerWinner : ''}`}>
                            <div className={styles.playerAvatar} style={{ background: challengerWon ? 'var(--color-tertiary)' : 'var(--color-secondary)' }}>
                              {duel.challenger.avatar}
                            </div>
                            <span className={styles.playerName}>{duel.challenger.name}</span>
                            <span className={styles.playerScore}>{duel.score?.challenger}</span>
                            {challengerWon && <span className={styles.winnerTag}>Winner</span>}
                          </div>
                          <div className={styles.vsBlock}>
                            <span className={styles.vsTextSmall}>VS</span>
                            <span className={styles.duelPot}>
                              {Math.floor(duel.stake * 2 * 0.96)} won
                            </span>
                          </div>
                          <div className={`${styles.duelPlayer} ${!challengerWon ? styles.duelPlayerWinner : ''}`}>
                            <div className={styles.playerAvatar} style={{ background: !challengerWon ? 'var(--color-tertiary)' : 'var(--color-secondary)' }}>
                              {duel.opponent?.avatar}
                            </div>
                            <span className={styles.playerName}>{duel.opponent?.name}</span>
                            <span className={styles.playerScore}>{duel.score?.opponent}</span>
                            {!challengerWon && <span className={styles.winnerTag}>Winner</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Treasury Fee Info */}
                <div className={styles.treasuryInfoCard}>
                  <div className={styles.treasuryInfoIcon}>
                    <Image src="/icons/treasury.svg" alt="" width={32} height={32} />
                  </div>
                  <div className={styles.treasuryInfoText}>
                    <h3 className={styles.treasuryInfoTitle}>Fees Fund the Community</h3>
                    <p className={styles.treasuryInfoDesc}>
                      A 3-5% platform fee from every duel flows directly into the community treasury budget lines visible on the Community screen. Your battles fund wellness, research, and emergency support.
                    </p>
                  </div>
                  <div className={styles.treasuryInfoStat}>
                    <span className={styles.treasuryInfoValue}>312</span>
                    <span className={styles.treasuryInfoLabel}>Orbs to Treasury Today</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
