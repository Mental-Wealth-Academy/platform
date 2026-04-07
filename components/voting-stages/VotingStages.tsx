'use client';

import React from 'react';
import Image from 'next/image';
import styles from './VotingStages.module.css';
import { BlueEmotion } from '@/components/blue-dialogue/BlueDialogue';

export type Stage1Variant = 'waiting' | 'authenticated' | 'success';
export type Stage2Variant = 'waiting' | 'in-progress' | 'failed-quorum' | 'pass';
export type Stage3Variant = 'waiting' | 'execute' | 'success';

interface VotingStageProps {
  stage: 1 | 2 | 3;
  variants: Stage1Variant[] | Stage2Variant[] | Stage3Variant[];
}

const emotionMap: Record<Stage1Variant, BlueEmotion> = {
  waiting: 'confused',
  authenticated: 'happy',
  success: 'happy',
};

const emotionImages: Record<BlueEmotion, string> = {
  happy: 'https://i.imgur.com/3Y3KrnJ.png',
  confused: 'https://i.imgur.com/ePrWP7A.png',
  sad: 'https://i.imgur.com/XIe1jZy.png',
  pain: 'https://i.imgur.com/ZYpNkse.png',
};

const stage1Config: Record<Stage1Variant, { title: string; description: string }> = {
  waiting: {
    title: 'Waiting',
    description: 'Awaiting authentication from community members. Vote will proceed once quorum is met.',
  },
  authenticated: {
    title: 'Authenticated',
    description: 'Community has authenticated the submission. Proceeding to voting phase.',
  },
  success: {
    title: 'Success',
    description: 'Submission approved! Funding will be distributed to the address listed in the proposal.',
  },
};

const stage2Config: Record<Stage2Variant, { title: string; description: string }> = {
  waiting: {
    title: 'Waiting',
    description: 'Awaiting start of voting period. All members are being notified.',
  },
  'in-progress': {
    title: 'In Progress',
    description: 'Voting is currently active. Members can cast their votes and debate the submission.',
  },
  'failed-quorum': {
    title: 'Failed Quorum',
    description: 'Voting period ended without reaching minimum quorum. This vote cannot pass.',
  },
  pass: {
    title: 'Pass',
    description: 'Vote has passed with sufficient quorum and majority approval. Moving to execution phase.',
  },
};

const stage3Config: Record<Stage3Variant, { title: string; description: string }> = {
  waiting: {
    title: 'Waiting',
    description: 'Awaiting execution. Vote has passed and is queued for blockchain execution.',
  },
  execute: {
    title: 'Execute',
    description: 'Transaction is being executed on-chain. This may take several minutes to confirm.',
  },
  success: {
    title: 'Outcome',
    description: 'Transaction successfully executed on-chain. The vote outcome has been finalized.',
  },
};

const VotingStages: React.FC<VotingStageProps> = ({ stage, variants }) => {
  const renderStage1Item = (variant: Stage1Variant, index: number) => {
    const config = stage1Config[variant];
    const emotion = emotionMap[variant];
    const emoteSrc = emotionImages[emotion];

    return (
      <div key={`stage1-${variant}-${index}`} className={styles.stageItem}>
        <div className={styles.baseItem}>
          <div className={styles.itemHeader}>
            <div className={styles.iconContainer}>
              <Image
                src={emoteSrc}
                alt={`${emotion} emote`}
                width={24}
                height={24}
                className={styles.emoteIcon}
                unoptimized
              />
            </div>
            <span className={styles.itemTitle}>{config.title}</span>
            <div className={styles.itemLine} />
          </div>
          <div className={styles.descriptionContainer}>
            <p className={styles.itemDescription}>{config.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderStage2Item = (variant: Stage2Variant, index: number) => {
    const config = stage2Config[variant];
    const stageNumber = index + 1;

    return (
      <div key={`stage2-${variant}-${index}`} className={styles.stageItem}>
        <div className={styles.baseItem}>
          <div className={styles.itemHeader}>
            <div className={styles.badgeContainer}>
              <div className={styles.badgeCircle}>
                <span className={styles.badgeNumber}>{stageNumber}</span>
              </div>
            </div>
            <span className={styles.itemTitle}>{config.title}</span>
            <div className={styles.itemLine} />
          </div>
          <div className={styles.descriptionContainer}>
            <p className={styles.itemDescription}>{config.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderStage3Item = (variant: Stage3Variant, index: number) => {
    const config = stage3Config[variant];
    const stageNumber = index + 1;

    return (
      <div key={`stage3-${variant}-${index}`} className={styles.stageItem}>
        <div className={styles.baseItem}>
          <div className={styles.itemHeader}>
            <div className={styles.badgeContainer}>
              <div className={styles.badgeCircle}>
                <span className={styles.badgeNumber}>{stageNumber}</span>
              </div>
            </div>
            <span className={styles.itemTitle}>{config.title}</span>
            <div className={styles.itemLine} />
          </div>
          <div className={styles.descriptionContainer}>
            <p className={styles.itemDescription}>{config.description}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {stage === 1 &&
          (variants as Stage1Variant[]).map((variant, index) => renderStage1Item(variant, index))}
        {stage === 2 &&
          (variants as Stage2Variant[]).map((variant, index) => renderStage2Item(variant, index))}
        {stage === 3 &&
          (variants as Stage3Variant[]).map((variant, index) => renderStage3Item(variant, index))}
      </div>
    </div>
  );
};

export default VotingStages;
