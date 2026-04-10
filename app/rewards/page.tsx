'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import GameCard from '@/components/game-card/GameCard';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
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
  const [showMintModal, setShowMintModal] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
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
              <div className={styles.headingContent}>
                <div className={styles.headingCopy}>
                  <div className={styles.headingInner}>
                    <h1 className={styles.headingTitle}>QUESTS</h1>
                  </div>
                  <p className={styles.headingSubtitle}>
                    Finish quests. Earn shards.
                  </p>
                  <div className={styles.headingTimerRow}>
                    <span className={styles.headingTimerLabel}>time until finished</span>
                    <span className={styles.headingTimer}>{countdown}</span>
                  </div>
                </div>

                <div className={styles.headingArt} aria-hidden="true">
                  <div className={styles.headingFrame}></div>
                  <div className={styles.headingPanel}></div>
                  <div className={`${styles.headingAccent} ${styles.headingAccentOne}`}></div>
                  <div className={`${styles.headingAccent} ${styles.headingAccentTwo}`}></div>
                  <div className={`${styles.headingAccent} ${styles.headingAccentThree}`}></div>
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
