'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { Trophy } from '@phosphor-icons/react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import GameCard from '@/components/game-card/GameCard';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import RewardDetailModal, { Quest } from '@/components/reward-detail-modal/RewardDetailModal';
import IntroLoaderOverlay from '@/components/intro-loader/IntroLoaderOverlay';
import { useSound } from '@/hooks/useSound';
import { QUEST_DEFINITIONS } from '@/lib/quest-definitions';
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

export default function RewardsPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const [countdown, setCountdown] = useState('12:41:32');
  const { play } = useSound();

  const refreshQuestData = useCallback(async () => {
    if (!ready || !authenticated) {
      setWeekStatuses([]);
      setQuestCounts({});
      return;
    }

    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [weeksRes, countsRes, meRes] = await Promise.all([
        fetch('/api/ethereal-progress/all', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
        fetch('/api/quests/progress', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
        fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
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
    } catch {
      setWeekStatuses([]);
      setQuestCounts({});
      setPlayerProfile(null);
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    refreshQuestData();
  }, [refreshQuestData]);

  useEffect(() => {
    const handler = () => refreshQuestData();
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    window.addEventListener('shardsUpdated', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('shardsUpdated', handler);
    };
  }, [refreshQuestData]);

  useEffect(() => {
    const targetTime = Date.now() + ((12 * 60 * 60) + (41 * 60) + 32) * 1000;

    const tick = () => {
      const remaining = Math.max(0, targetTime - Date.now());
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

  const quests = useMemo<Quest[]>(() => {
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

  const completedQuestCount = useMemo(
    () => quests.filter((quest) => (quest.claimedCount ?? 0) >= (quest.targetCount ?? 1)).length,
    [quests]
  );

  const playerName = playerProfile?.username?.trim() || 'Player One';
  const playerInitial = playerName.charAt(0).toUpperCase();

  const handleAccept = (quest: Quest) => {
    play('click');
    setSelectedQuest(quest);
    setIsRewardModalOpen(true);
  };

  return (
    <>
      {showIntroLoader && (
        <IntroLoaderOverlay
          src="/loaders/shine_rotate.lottie"
          label="Opening quests"
          onFinish={() => setShowIntroLoader(false)}
        />
      )}

      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          <div className={styles.content}>
            <section className={styles.playerBar} aria-label="Quest stats">
              <div className={styles.playerBarTrack}>
                <div className={styles.statChip}>
                  <div className={styles.statIconShell}>
                    <Image src="/icons/ui-shard.svg" alt="" width={18} height={18} className={styles.statShardIcon} />
                  </div>
                  <div className={styles.statCopy}>
                    <span className={styles.statLabel}>Shards</span>
                    <span className={styles.statValue}>{playerProfile?.shardCount ?? 0}</span>
                  </div>
                </div>

                <div className={styles.statChip}>
                  <div className={styles.statIconShell}>
                    <Trophy size={18} weight="fill" className={styles.statTrophyIcon} />
                  </div>
                  <div className={styles.statCopy}>
                    <span className={styles.statLabel}>Cleared</span>
                    <span className={styles.statValue}>{completedQuestCount}</span>
                  </div>
                </div>

                <div className={`${styles.statChip} ${styles.profileChip}`}>
                  <div className={styles.profileAvatarShell}>
                    {playerProfile?.avatarUrl ? (
                      <Image
                        src={playerProfile.avatarUrl}
                        alt={playerName}
                        width={40}
                        height={40}
                        className={styles.profileAvatar}
                      />
                    ) : (
                      <div className={styles.profileFallbackAvatar}>{playerInitial}</div>
                    )}
                  </div>
                  <div className={styles.statCopy}>
                    <span className={styles.statLabel}>Player</span>
                    <span className={styles.profileName}>{playerName}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.heading}>
              <div className={styles.headingHudLine} aria-hidden="true" />
              <div className={styles.headingContent}>
                <div className={styles.headingCopy}>
                  <div className={styles.headingMetaRow}>
                    <span className={styles.headingMetaTag}>Blue-linked rewards</span>
                    <span className={styles.headingMetaTag}>Daily task board</span>
                  </div>
                  <div className={styles.headingInner}>
                    <h1 className={styles.headingTitle}>QUESTS</h1>
                  </div>
                  <p className={styles.headingSubtitle}>
                    Finish quests, claim shards, and keep your momentum visible.
                  </p>
                </div>
                <div className={styles.headingTimerPanel}>
                  <span className={styles.headingTimerLabel}>Next refresh</span>
                  <span className={styles.headingTimer}>{countdown}</span>
                  <span className={styles.headingTimerHint}>Board sync countdown</span>
                </div>
              </div>
            </div>

            <div className={styles.cardList}>
              {quests.map((quest) => (
                <div key={quest.id} onMouseEnter={() => play('hover')}>
                  <GameCard
                    questName={quest.title}
                    questDescription={quest.desc}
                    progressCurrent={quest.progressCount ?? 0}
                    progressTotal={quest.targetCount ?? 1}
                    onOpenQuest={() => handleAccept(quest)}
                  />
                </div>
              ))}
            </div>

            <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
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
