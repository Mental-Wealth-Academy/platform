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

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  earnings: number;
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

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'PsychPilot', avatar: 'PP', wins: 47, losses: 8, winRate: 85, streak: 9, earnings: 2340 },
  { rank: 2, name: 'NeuroNova', avatar: 'NN', wins: 41, losses: 12, winRate: 77, streak: 5, earnings: 1890 },
  { rank: 3, name: 'MindForge', avatar: 'MF', wins: 38, losses: 15, winRate: 72, streak: 3, earnings: 1650 },
  { rank: 4, name: 'ZenCoder', avatar: 'ZC', wins: 35, losses: 14, winRate: 71, streak: 4, earnings: 1420 },
  { rank: 5, name: 'SynapseKid', avatar: 'SK', wins: 29, losses: 18, winRate: 62, streak: 1, earnings: 980 },
];

const TOPICS = [
  'Cognitive Behavioral Therapy',
  'Neuroplasticity Basics',
  'Stress Response Systems',
  'Emotional Intelligence',
  'Sleep & Memory',
  'Mindfulness Techniques',
];

export default function DuelsPage() {
  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'history'>('arena');
  const [selectedStake, setSelectedStake] = useState<number>(50);
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

          {/* Tab Navigation */}
          <section className={styles.tabGrid}>
            <div
              className={`${styles.tabCard} ${activeTab === 'arena' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('arena'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="M9 15l3 3 3-3" />
                </svg>
              </div>
              <h3 className={styles.tabTitle}>Arena</h3>
              <p className={styles.tabDesc}>Live duels & open challenges</p>
            </div>
            <div
              className={`${styles.tabCard} ${activeTab === 'leaderboard' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('leaderboard'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <h3 className={styles.tabTitle}>Leaderboard</h3>
              <p className={styles.tabDesc}>Top duelists this week</p>
            </div>
            <div
              className={`${styles.tabCard} ${activeTab === 'history' ? styles.tabCardActive : ''}`}
              onClick={() => { play('click'); setActiveTab('history'); }}
              onMouseEnter={() => play('hover')}
            >
              <div className={styles.tabIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className={styles.tabTitle}>History</h3>
              <p className={styles.tabDesc}>Past results & earnings</p>
            </div>
          </section>

          {/* Tab Content */}
          <div className={styles.tabContent}>

            {/* ─── Arena Tab ─── */}
            {activeTab === 'arena' && (
              <>
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
                            key={topic}
                            className={styles.topicChip}
                            onClick={() => play('click')}
                            onMouseEnter={() => play('hover')}
                            type="button"
                          >
                            {topic}
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

                {/* Live Duels */}
                {liveDuels.length > 0 && (
                  <section>
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

            {/* ─── Leaderboard Tab ─── */}
            {activeTab === 'leaderboard' && (
              <div className={styles.leaderboardCard}>
                <div className={styles.leaderboardHeader}>
                  <h2 className={styles.leaderboardTitle}>Weekly Rankings</h2>
                  <span className={styles.leaderboardPeriod}>Mar 4 - Mar 10</span>
                </div>
                <div className={styles.leaderboardTable}>
                  <div className={styles.leaderboardHead}>
                    <span className={styles.colRank}>#</span>
                    <span className={styles.colPlayer}>Player</span>
                    <span className={styles.colRecord}>W / L</span>
                    <span className={styles.colWinRate}>Win %</span>
                    <span className={styles.colStreak}>Streak</span>
                    <span className={styles.colEarnings}>Earned</span>
                  </div>
                  {MOCK_LEADERBOARD.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`${styles.leaderboardRow} ${entry.rank <= 3 ? styles.leaderboardRowTop : ''}`}
                      onMouseEnter={() => play('hover')}
                    >
                      <span className={styles.colRank}>
                        {entry.rank <= 3 ? (
                          <span className={`${styles.rankMedal} ${styles[`rankMedal${entry.rank}`]}`}>
                            {entry.rank}
                          </span>
                        ) : entry.rank}
                      </span>
                      <span className={styles.colPlayer}>
                        <div className={styles.leaderboardAvatar} style={{
                          background: entry.rank === 1 ? 'var(--color-accent)' :
                                     entry.rank === 2 ? 'var(--color-primary)' :
                                     entry.rank === 3 ? 'var(--color-tertiary)' : 'var(--color-secondary)'
                        }}>
                          {entry.avatar}
                        </div>
                        <span>{entry.name}</span>
                      </span>
                      <span className={styles.colRecord}>{entry.wins} / {entry.losses}</span>
                      <span className={styles.colWinRate}>
                        <span className={styles.winRateBar}>
                          <span className={styles.winRateFill} style={{ width: `${entry.winRate}%` }} />
                        </span>
                        {entry.winRate}%
                      </span>
                      <span className={styles.colStreak}>
                        {entry.streak > 0 && (
                          <span className={styles.streakBadge}>{entry.streak}W</span>
                        )}
                      </span>
                      <span className={`${styles.colEarnings}`}>
                        {entry.earnings.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
