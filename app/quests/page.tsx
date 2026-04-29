'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useReadContract } from 'wagmi';
import Image from 'next/image';
import { Trophy, Sparkle, Plus } from '@phosphor-icons/react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import QuestCard, { QuestCardKind } from '@/components/quest-card/QuestCard';
import QuestAuthorPanel from '@/components/quest-author-panel/QuestAuthorPanel';
import RewardDetailModal, { Quest } from '@/components/reward-detail-modal/RewardDetailModal';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import { useSound } from '@/hooks/useSound';
import { QUEST_DEFINITIONS, QuestType } from '@/lib/quest-definitions';
import styles from './page.module.css';

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
}

interface PlayerProfile {
  username: string | null;
  avatarUrl: string | null;
  shardCount: number;
}

interface CustomQuest {
  id: string;
  title: string;
  description: string;
  points: number;
  questType: 'no-proof' | 'proof-required';
  targetCount: number;
  creatorWallet: string;
  creatorHandle: string | null;
  assigneeWallet: string | null;
  expiresAt: string | null;
  createdAt: string;
  progressCount: number;
}

const SOUL_KEY_ADDRESS = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F' as const;
const BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function questKindFromType(type: QuestType | 'custom'): QuestCardKind {
  switch (type) {
    case 'sealed-week':
      return 'course';
    case 'proof-required':
      return 'submit';
    case 'no-proof':
      return 'mission';
    case 'twitter-follow':
    case 'follow-and-own':
      return 'social';
    default:
      return 'custom';
  }
}

export default function QuestsPage() {
  const { ready, authenticated, getAccessToken, user: privyUser } = usePrivy();
  const walletAddress = useMemo(() => {
    const wallets = ((privyUser?.linkedAccounts ?? []) as any[]).filter((a) => a?.type === 'wallet');
    return wallets[0]?.address as `0x${string}` | undefined;
  }, [privyUser]);

  const { data: proTokenBalance } = useReadContract({
    address: SOUL_KEY_ADDRESS,
    abi: BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });
  const isPro = !!proTokenBalance && proTokenBalance > 0n;

  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([]);
  const [authoredQuests, setAuthoredQuests] = useState<CustomQuest[]>([]);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [countdown, setCountdown] = useState('--:--:--');
  const [authorPanelOpen, setAuthorPanelOpen] = useState(false);
  const { play } = useSound();

  const fetchWithAuth = useCallback(async (url: string) => {
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    return fetch(url, { credentials: 'include', cache: 'no-store', headers });
  }, [getAccessToken]);

  const refreshQuestData = useCallback(async () => {
    if (!ready || !authenticated) {
      setWeekStatuses([]);
      setQuestCounts({});
      setCustomQuests([]);
      setAuthoredQuests([]);
      return;
    }

    try {
      const [weeksRes, countsRes, meRes, visibleRes] = await Promise.all([
        fetchWithAuth('/api/ethereal-progress/all'),
        fetchWithAuth('/api/quests/progress'),
        fetchWithAuth('/api/me'),
        fetchWithAuth('/api/admin/quests/visible'),
      ]);

      if (weeksRes.ok) {
        const weekData = await weeksRes.json();
        setWeekStatuses(weekData.weeks ?? []);
      }

      if (countsRes.ok) {
        const countData = await countsRes.json();
        setQuestCounts(countData.counts ?? {});
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setPlayerProfile({
            username: meData.user.username ?? null,
            avatarUrl: meData.user.avatarUrl ?? null,
            shardCount: meData.user.shardCount ?? 0,
          });
        }
      }

      if (visibleRes.ok) {
        const data = await visibleRes.json();
        setCustomQuests(data.quests ?? []);
      }
    } catch {
      setWeekStatuses([]);
      setQuestCounts({});
      setCustomQuests([]);
      setPlayerProfile(null);
    }
  }, [ready, authenticated, fetchWithAuth]);

  const refreshAuthoredQuests = useCallback(async () => {
    if (!ready || !authenticated || !isPro) {
      setAuthoredQuests([]);
      return;
    }
    try {
      const res = await fetchWithAuth('/api/admin/quests?mine=true');
      if (res.ok) {
        const data = await res.json();
        setAuthoredQuests(data.quests ?? []);
      }
    } catch {
      setAuthoredQuests([]);
    }
  }, [ready, authenticated, isPro, fetchWithAuth]);

  useEffect(() => {
    refreshQuestData();
  }, [refreshQuestData]);

  useEffect(() => {
    refreshAuthoredQuests();
  }, [refreshAuthoredQuests]);

  useEffect(() => {
    const handler = () => {
      refreshQuestData();
      refreshAuthoredQuests();
    };
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    window.addEventListener('shardsUpdated', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('shardsUpdated', handler);
    };
  }, [refreshQuestData, refreshAuthoredQuests]);

  useEffect(() => {
    const seasonStart = new Date(
      process.env.NEXT_PUBLIC_SEASON_START_DATE || '2026-03-02T00:00:00Z'
    ).getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - seasonStart;
      if (elapsed < 0) {
        const remaining = Math.abs(elapsed);
        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / 3_600_000);
        const minutes = Math.floor((remaining % 3_600_000) / 60_000);
        setCountdown(`${days}D ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        return;
      }
      const weekIndex = Math.floor(elapsed / weekMs);
      const nextBoundary = seasonStart + (weekIndex + 1) * weekMs;
      const remaining = Math.max(0, nextBoundary - now);
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setCountdown(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const builtInQuests = useMemo<Quest[]>(() => {
    return QUEST_DEFINITIONS.map((quest) => {
      const claimedCount = Math.min(questCounts[quest.key] ?? 0, quest.targetCount);
      const progressCount = quest.questType === 'sealed-week'
        ? (weekStatuses.find((week) => week.weekNumber === quest.weekNumber)?.isSealed ? 1 : 0)
        : claimedCount;

      return {
        id: quest.key,
        title: quest.title,
        points: quest.points,
        desc: quest.desc,
        rewardType: quest.questType,
        targetCount: quest.targetCount,
        progressCount,
        claimedCount,
        weekNumber: quest.weekNumber,
        icon: quest.icon,
      };
    });
  }, [questCounts, weekStatuses]);

  const customQuestsAsModal = useMemo<Quest[]>(() => {
    return customQuests.map((q) => ({
      id: q.id,
      title: q.title,
      points: q.points,
      desc: q.description,
      rewardType: q.questType,
      targetCount: q.targetCount,
      progressCount: q.progressCount,
      claimedCount: q.progressCount,
    }));
  }, [customQuests]);

  const totalQuestCount = builtInQuests.length + customQuests.length;
  const completedQuestCount = useMemo(() => {
    const builtIn = builtInQuests.filter((q) => (q.claimedCount ?? 0) >= (q.targetCount ?? 1)).length;
    const custom = customQuests.filter((q) => q.progressCount >= q.targetCount).length;
    return builtIn + custom;
  }, [builtInQuests, customQuests]);

  const playerName = playerProfile?.username?.trim() || 'Player One';
  const playerInitial = playerName.charAt(0).toUpperCase();

  const handleAccept = (quest: Quest) => {
    play('click');
    setSelectedQuest(quest);
    setIsRewardModalOpen(true);
  };

  const handleQuestAuthored = useCallback(() => {
    refreshAuthoredQuests();
    refreshQuestData();
  }, [refreshAuthoredQuests, refreshQuestData]);

  const handleDeleteAuthored = useCallback(async (id: string) => {
    if (!window.confirm('Archive this quest? It will stop appearing for users.')) return;
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/admin/quests/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers,
    });
    if (res.ok) {
      handleQuestAuthored();
    }
  }, [getAccessToken, handleQuestAuthored]);

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          <div className={styles.content}>
            <section className={styles.hero} aria-label="Quest overview">
              <div className={styles.heroProfile}>
                <div className={styles.heroAvatar}>
                  {playerProfile?.avatarUrl ? (
                    <Image
                      src={playerProfile.avatarUrl}
                      alt={playerName}
                      width={48}
                      height={48}
                      className={styles.heroAvatarImg}
                    />
                  ) : (
                    <span className={styles.heroAvatarFallback}>{playerInitial}</span>
                  )}
                </div>
                <div className={styles.heroNameBlock}>
                  <span className={styles.heroEyebrow}>QUESTS</span>
                  <h1 className={styles.heroName}>{playerName}</h1>
                </div>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>Shards</span>
                  <span className={styles.heroStatValueRow}>
                    <Image src="/icons/ui-shard.svg" alt="" width={16} height={16} />
                    <span className={styles.heroStatValue}>{playerProfile?.shardCount ?? 0}</span>
                  </span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>Cleared</span>
                  <span className={styles.heroStatValueRow}>
                    <Trophy size={15} weight="fill" className={styles.heroStatTrophy} />
                    <span className={styles.heroStatValue}>
                      {completedQuestCount}
                      <span className={styles.heroStatMuted}>/{totalQuestCount}</span>
                    </span>
                  </span>
                </div>
                <div className={`${styles.heroStat} ${styles.heroTimerStat}`}>
                  <span className={styles.heroStatLabel}>Next week</span>
                  <span className={styles.heroTimer} aria-live="polite">{countdown}</span>
                </div>
              </div>
            </section>

            {isPro && (
              <section className={styles.adminSection} aria-label="Quest authoring">
                <button
                  type="button"
                  className={styles.adminToggle}
                  onClick={() => setAuthorPanelOpen((v) => !v)}
                  aria-expanded={authorPanelOpen}
                >
                  <span className={styles.adminToggleIcon} aria-hidden="true">
                    <Sparkle size={14} weight="fill" />
                  </span>
                  <span className={styles.adminToggleLabel}>
                    {authorPanelOpen ? 'Hide quest authoring' : 'Author a quest'}
                  </span>
                  <span className={styles.adminToggleHint}>Soul Key</span>
                  <span className={styles.adminToggleChevron} aria-hidden="true">
                    <Plus size={14} weight="bold" style={{ transform: authorPanelOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                  </span>
                </button>

                {authorPanelOpen && (
                  <QuestAuthorPanel
                    fetchWithAuth={fetchWithAuth}
                    authoredQuests={authoredQuests}
                    onCreated={handleQuestAuthored}
                    onDelete={handleDeleteAuthored}
                  />
                )}
              </section>
            )}

            <section className={styles.questList} aria-label="Quests">
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>Active quests</h2>
                <span className={styles.sectionMeta}>{totalQuestCount} total</span>
              </div>

              <div className={styles.questListScroll}>
                <div className={styles.cardList}>
                  {builtInQuests.map((quest) => {
                    const completed = (quest.claimedCount ?? 0) >= (quest.targetCount ?? 1);
                    return (
                      <div key={quest.id} onMouseEnter={() => play('hover')}>
                        <QuestCard
                          title={quest.title}
                          description={quest.desc}
                          progressCurrent={quest.progressCount ?? 0}
                          progressTotal={quest.targetCount ?? 1}
                          points={quest.points}
                          kind={questKindFromType((quest.rewardType ?? 'no-proof') as QuestType)}
                          badge={quest.weekNumber ? `Week ${quest.weekNumber}` : undefined}
                          onOpen={() => handleAccept(quest)}
                        />
                        {completed ? null : null}
                      </div>
                    );
                  })}

                  {customQuestsAsModal.map((quest) => {
                    const original = customQuests.find((c) => c.id === quest.id);
                    const handleLabel = original?.creatorHandle
                      ? `By @${original.creatorHandle}`
                      : original?.creatorWallet
                        ? `By ${original.creatorWallet.slice(0, 6)}…${original.creatorWallet.slice(-4)}`
                        : undefined;
                    return (
                      <div key={quest.id} onMouseEnter={() => play('hover')}>
                        <QuestCard
                          title={quest.title}
                          description={quest.desc}
                          progressCurrent={quest.progressCount ?? 0}
                          progressTotal={quest.targetCount ?? 1}
                          points={quest.points}
                          kind="custom"
                          badge={handleLabel}
                          onOpen={() => handleAccept(quest)}
                        />
                      </div>
                    );
                  })}

                  {customQuests.length === 0 && (
                    <p className={styles.emptyHint}>
                      {isPro
                        ? 'Open quest authoring to create your first one.'
                        : 'Soul Key holders can author additional quests for the community.'}
                    </p>
                  )}
                </div>

                <div className={styles.questListFooter}>
                  <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
      <RewardDetailModal
        isOpen={isRewardModalOpen}
        onClose={() => { setIsRewardModalOpen(false); setSelectedQuest(null); }}
        reward={selectedQuest}
      />
    </>
  );
}
