'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  orbsStaked: number;
  weeklyXp: number;
  streakWeeks: number;
  tier: 'gold' | 'silver' | 'bronze' | 'iron';
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: 'luminara.eth', avatarUrl: null, orbsStaked: 4200, weeklyXp: 9840, streakWeeks: 11, tier: 'gold' },
  { rank: 2, username: 'quietstorm', avatarUrl: null, orbsStaked: 3800, weeklyXp: 8720, streakWeeks: 10, tier: 'gold' },
  { rank: 3, username: 'dreamweaver', avatarUrl: null, orbsStaked: 3100, weeklyXp: 7650, streakWeeks: 12, tier: 'gold' },
  { rank: 4, username: 'solace.base', avatarUrl: null, orbsStaked: 2600, weeklyXp: 6200, streakWeeks: 9, tier: 'silver' },
  { rank: 5, username: 'mindforge', avatarUrl: null, orbsStaked: 2100, weeklyXp: 5480, streakWeeks: 8, tier: 'silver' },
  { rank: 6, username: 'zenith404', avatarUrl: null, orbsStaked: 1800, weeklyXp: 4900, streakWeeks: 7, tier: 'silver' },
  { rank: 7, username: 'calmcode', avatarUrl: null, orbsStaked: 1500, weeklyXp: 4100, streakWeeks: 6, tier: 'bronze' },
  { rank: 8, username: 'wellspring', avatarUrl: null, orbsStaked: 1200, weeklyXp: 3600, streakWeeks: 5, tier: 'bronze' },
  { rank: 9, username: 'innerlight', avatarUrl: null, orbsStaked: 900, weeklyXp: 2900, streakWeeks: 4, tier: 'bronze' },
  { rank: 10, username: 'novamind', avatarUrl: null, orbsStaked: 600, weeklyXp: 2100, streakWeeks: 3, tier: 'iron' },
];

const PAYOUT_TIERS = [
  { label: 'Gold', range: 'Top 3', payout: '50%', color: '#FFB800', desc: 'Split 50% of the prize pool' },
  { label: 'Silver', range: '4th - 6th', payout: '30%', color: '#A8B4C2', desc: 'Split 30% of the prize pool' },
  { label: 'Bronze', range: '7th - 9th', payout: '15%', color: '#CD7F32', desc: 'Split 15% of the prize pool' },
  { label: 'Iron', range: '10th+', payout: '5%', color: '#6B7280', desc: 'Split remaining 5% among all' },
];

const TIER_COLORS: Record<string, string> = {
  gold: '#FFB800',
  silver: '#A8B4C2',
  bronze: '#CD7F32',
  iron: '#6B7280',
};

function getRankDisplay(rank: number) {
  if (rank === 1) return { emoji: '', label: '1st' };
  if (rank === 2) return { emoji: '', label: '2nd' };
  if (rank === 3) return { emoji: '', label: '3rd' };
  return { emoji: '', label: `${rank}th` };
}

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default function LeaderboardPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'rankings' | 'stakes' | 'tiers'>('rankings');
  const { play } = useSound();

  // Mock season data
  const seasonNumber = 3;
  const currentWeek = 8;
  const totalWeeks = 12;
  const totalPool = 24600;
  const totalStakers = 47;
  const seasonEnd = 'Apr 28, 2026';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.content}>
          {/* Season Header */}
          <div className={`${styles.seasonHeader} ${isLoaded ? styles.loaded : ''}`}>
            <div className={styles.seasonBadge}>Season {seasonNumber}</div>
            <h1 className={styles.pageTitle}>Leaderboard</h1>
            <p className={styles.pageSubtitle}>
              Lock Orbs into the prize pool at the start of each 12-week cohort.
              Final rankings determine your payout tier.
            </p>
          </div>

          {/* Season Stats Row */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalPool.toLocaleString()}</span>
              <span className={styles.statLabel}>Orbs in Pool</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalStakers}</span>
              <span className={styles.statLabel}>Stakers</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Wk {currentWeek}/{totalWeeks}</span>
              <span className={styles.statLabel}>Progress</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{seasonEnd}</span>
              <span className={styles.statLabel}>Season Ends</span>
            </div>
          </div>

          {/* Season Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
              />
            </div>
            <div className={styles.progressLabels}>
              {Array.from({ length: totalWeeks }, (_, i) => (
                <span
                  key={i}
                  className={`${styles.weekDot} ${i < currentWeek ? styles.weekDotActive : ''} ${i === currentWeek - 1 ? styles.weekDotCurrent : ''}`}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabRow}>
            <button
              className={`${styles.tab} ${activeTab === 'rankings' ? styles.tabActive : ''}`}
              onClick={() => { play('click'); setActiveTab('rankings'); }}
              onMouseEnter={() => play('hover')}
              type="button"
            >
              Rankings
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'stakes' ? styles.tabActive : ''}`}
              onClick={() => { play('click'); setActiveTab('stakes'); }}
              onMouseEnter={() => play('hover')}
              type="button"
            >
              Stake Orbs
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'tiers' ? styles.tabActive : ''}`}
              onClick={() => { play('click'); setActiveTab('tiers'); }}
              onMouseEnter={() => play('hover')}
              type="button"
            >
              Payout Tiers
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'rankings' && (
              <>
                {/* Podium — Top 3 */}
                <div className={styles.podium}>
                  {[MOCK_LEADERBOARD[1], MOCK_LEADERBOARD[0], MOCK_LEADERBOARD[2]].map((entry, i) => {
                    const isFirst = i === 1;
                    return (
                      <div
                        key={entry.rank}
                        className={`${styles.podiumCard} ${isFirst ? styles.podiumFirst : ''}`}
                        onMouseEnter={() => play('hover')}
                      >
                        <div className={styles.podiumRank} style={{ color: TIER_COLORS[entry.tier] }}>
                          {getRankDisplay(entry.rank).label}
                        </div>
                        <div
                          className={styles.podiumAvatar}
                          style={{ borderColor: TIER_COLORS[entry.tier] }}
                        >
                          {getInitials(entry.username)}
                        </div>
                        <span className={styles.podiumName}>{entry.username}</span>
                        <span className={styles.podiumXp}>{entry.weeklyXp.toLocaleString()} XP</span>
                        <div className={styles.podiumStake}>
                          <Image src="/icons/shard.svg" alt="Orbs" width={14} height={14} />
                          <span>{entry.orbsStaked.toLocaleString()}</span>
                        </div>
                        <span className={styles.podiumStreak}>{entry.streakWeeks}wk streak</span>
                      </div>
                    );
                  })}
                </div>

                {/* Full Rankings Table */}
                <div className={styles.rankingsTable}>
                  <div className={styles.tableHeader}>
                    <span className={styles.colRank}>Rank</span>
                    <span className={styles.colUser}>Learner</span>
                    <span className={styles.colXp}>XP</span>
                    <span className={styles.colStake}>Staked</span>
                    <span className={styles.colStreak}>Streak</span>
                    <span className={styles.colTier}>Tier</span>
                  </div>
                  {MOCK_LEADERBOARD.map((entry) => (
                    <div
                      key={entry.rank}
                      className={styles.tableRow}
                      onMouseEnter={() => play('hover')}
                    >
                      <span className={styles.colRank}>
                        <span className={styles.rankNumber}>{entry.rank}</span>
                      </span>
                      <span className={styles.colUser}>
                        <div
                          className={styles.tableAvatar}
                          style={{ borderColor: TIER_COLORS[entry.tier] }}
                        >
                          {getInitials(entry.username)}
                        </div>
                        <span className={styles.tableUsername}>{entry.username}</span>
                      </span>
                      <span className={styles.colXp}>{entry.weeklyXp.toLocaleString()}</span>
                      <span className={styles.colStake}>
                        <Image src="/icons/shard.svg" alt="Orbs" width={12} height={12} />
                        {entry.orbsStaked.toLocaleString()}
                      </span>
                      <span className={styles.colStreak}>{entry.streakWeeks}w</span>
                      <span className={styles.colTier}>
                        <span
                          className={styles.tierBadge}
                          style={{
                            background: `${TIER_COLORS[entry.tier]}20`,
                            color: TIER_COLORS[entry.tier],
                            borderColor: TIER_COLORS[entry.tier],
                          }}
                        >
                          {entry.tier}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'stakes' && (
              <div className={styles.stakeSection}>
                <div className={styles.stakeCard}>
                  <div className={styles.stakeHeader}>
                    <h2 className={styles.stakeTitle}>Lock Orbs</h2>
                    <span className={styles.stakeMeta}>Available at season start</span>
                  </div>
                  <p className={styles.stakeDesc}>
                    At the beginning of each 12-week cohort, you can optionally lock Orbs into the
                    communal prize pool. Your final ranking determines which payout tier you fall into.
                    Azura tracks progress and distributes rewards via Chainlink CRE at season end.
                  </p>
                  <div className={styles.stakeInputGroup}>
                    <label className={styles.stakeLabel}>Amount to stake</label>
                    <div className={styles.stakeInputRow}>
                      <div className={styles.stakeInputWrapper}>
                        <Image src="/icons/shard.svg" alt="Orbs" width={16} height={16} />
                        <input
                          type="number"
                          className={styles.stakeInput}
                          placeholder="0"
                          min={0}
                          disabled
                        />
                        <span className={styles.stakeUnit}>ORBS</span>
                      </div>
                      <button
                        className={styles.stakeButton}
                        disabled
                        type="button"
                      >
                        Season Locked
                      </button>
                    </div>
                    <span className={styles.stakeHint}>
                      Staking opens at the start of Season {seasonNumber + 1}. Current season is in progress.
                    </span>
                  </div>
                </div>

                <div className={styles.stakeInfoGrid}>
                  <div className={styles.stakeInfoCard}>
                    <h3 className={styles.stakeInfoTitle}>How it works</h3>
                    <ol className={styles.stakeSteps}>
                      <li>Lock Orbs during the first week of a new cohort</li>
                      <li>Learn, engage, and climb the rankings over 12 weeks</li>
                      <li>Azura calculates final standings at season end</li>
                      <li>Prize pool is distributed to payout tiers via CRE</li>
                    </ol>
                  </div>
                  <div className={styles.stakeInfoCard}>
                    <h3 className={styles.stakeInfoTitle}>What counts</h3>
                    <ul className={styles.stakeFactors}>
                      <li><strong>Weekly XP</strong> from completing readings and reflections</li>
                      <li><strong>Streak</strong> bonus for consecutive active weeks</li>
                      <li><strong>Community</strong> points from proposals and rewards</li>
                      <li><strong>Consistency</strong> matters more than cramming</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tiers' && (
              <div className={styles.tiersSection}>
                {PAYOUT_TIERS.map((tier) => (
                  <div
                    key={tier.label}
                    className={styles.tierCard}
                    onMouseEnter={() => play('hover')}
                  >
                    <div className={styles.tierAccent} style={{ background: tier.color }} />
                    <div className={styles.tierLeft}>
                      <div className={styles.tierPayout} style={{ color: tier.color }}>
                        {tier.payout}
                      </div>
                      <span className={styles.tierName} style={{ color: tier.color }}>
                        {tier.label}
                      </span>
                    </div>
                    <div className={styles.tierRight}>
                      <span className={styles.tierRange}>{tier.range}</span>
                      <p className={styles.tierDesc}>{tier.desc}</p>
                    </div>
                  </div>
                ))}

                <div className={styles.tierDisclaimer}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor"/>
                    <path d="M3 17L12 22L21 17" fill="currentColor" fillOpacity="0.6"/>
                    <path d="M3 12L12 17L21 12" fill="currentColor" fillOpacity="0.8"/>
                  </svg>
                  <span>
                    Distributions are automated by Azura via Chainlink CRE.
                    All payouts are verifiable on-chain.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
