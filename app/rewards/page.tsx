'use client';

import { useState } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import GameCard from '@/components/game-card/GameCard';
import RewardDetailModal, { Reward } from '@/components/reward-detail-modal/RewardDetailModal';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

const rewards: Reward[] = [
  { id: 'reward-blog', title: 'Write a community blog post', points: 50, desc: 'Share knowledge or a personal story with the community', rewardType: 'proof-required' },
  { id: 'reward-onboard', title: 'Onboard a new member', points: 75, desc: 'Walk someone through their first week in the academy', rewardType: 'no-proof' },
  { id: 'reward-study', title: 'Host a study session', points: 100, desc: 'Lead a group learning session on any relevant topic', rewardType: 'proof-required' },
  { id: 'reward-bug', title: 'Submit a bug report', points: 30, desc: 'Find and document a bug in the platform with steps to reproduce', rewardType: 'proof-required' },
  { id: 'reward-social', title: 'Design a social media asset', points: 60, desc: 'Create a shareable graphic that represents MWA values', rewardType: 'proof-required' },
  { id: 'reward-twitter', title: 'Follow @MentalWealthDAO on X', points: 40, desc: 'Connect your X account and follow the official MWA account', rewardType: 'twitter-follow' },
];

export default function RewardsPage() {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const { play } = useSound();

  const handleAccept = (reward: Reward) => {
    play('click');
    setSelectedReward(reward);
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
                <h1 className={styles.headingTitle}>Rewards</h1>
              </div>
              <p className={styles.headingSubtitle}>
                Earn shards by contributing to the community
              </p>
            </div>

            <div className={styles.cardList}>
              {rewards.map((reward) => (
                <div key={reward.id} onMouseEnter={() => play('hover')}>
                  <GameCard
                    taskName={reward.title}
                    taskDescription={`${reward.points} pts — ${reward.desc}`}
                    completed={0}
                    total={1}
                    onAccept={() => handleAccept(reward)}
                  />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <RewardDetailModal
        isOpen={isRewardModalOpen}
        onClose={() => { setIsRewardModalOpen(false); setSelectedReward(null); }}
        reward={selectedReward}
      />
    </>
  );
}
