'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import GameCard from '@/components/game-card/GameCard';
import RewardDetailModal, { Quest } from '@/components/reward-detail-modal/RewardDetailModal';
import { useSound } from '@/hooks/useSound';
import { QUEST_DEFINITIONS } from '@/lib/quest-definitions';
import styles from './page.module.css';

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
}

export default function RewardsPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
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

      const [weeksRes, countsRes] = await Promise.all([
        fetch('/api/ethereal-progress/all', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
        fetch('/api/quests/progress', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
      ]);

      if (weeksRes.ok) {
        const weekData = await weeksRes.json();
        setWeekStatuses(weekData.weeks ?? []);
      }

      if (countsRes.ok) {
        const countData = await countsRes.json();
        setQuestCounts(countData.counts ?? {});
      }
    } catch {
      setWeekStatuses([]);
      setQuestCounts({});
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

  const handleAccept = (quest: Quest) => {
    play('click');
    setSelectedQuest(quest);
    setIsRewardModalOpen(true);
  };

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          <div className={styles.content}>
            <div className={styles.heading}>
              <div className={styles.headingInner}>
                <Image
                  src="/icons/ui-shard.svg"
                  alt=""
                  width={36}
                  height={36}
                  className={styles.headingIcon}
                />
                <h1 className={styles.headingTitle}>Quests</h1>
              </div>
              <p className={styles.headingSubtitle}>
                Track quest requirements and claim shards for finished work
              </p>
            </div>

            <div className={styles.cardList}>
              {quests.map((quest) => (
                <div key={quest.id} onMouseEnter={() => play('hover')}>
                  <GameCard
                    questName={quest.title}
                    questDescription={`${quest.points} pts — ${quest.desc}`}
                    progressCurrent={quest.progressCount ?? 0}
                    progressTotal={quest.targetCount ?? 1}
                    onOpenQuest={() => handleAccept(quest)}
                  />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <RewardDetailModal
        isOpen={isRewardModalOpen}
        onClose={() => { setIsRewardModalOpen(false); setSelectedQuest(null); }}
        reward={selectedQuest}
      />
    </>
  );
}
