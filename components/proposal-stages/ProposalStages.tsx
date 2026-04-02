'use client';

import React from 'react';
import Image from 'next/image';
import styles from './ProposalStages.module.css';

type Stage1Variant = 'waiting' | 'analyzing' | 'approved' | 'rejected';
type Stage2Variant = 'waiting' | 'processing' | 'success' | 'failed';
type Stage3Variant = 'waiting' | 'active' | 'completed' | 'defeated' | 'expired';

interface ProposalStagesProps {
  stage1: Stage1Variant;
  stage2: Stage2Variant;
  stage3: Stage3Variant;
  azuraReasoning?: string | null;
  tokenAllocation?: number | null;
}

const ProposalStages: React.FC<ProposalStagesProps> = ({
  stage1,
  stage2,
  stage3,
}) => {
  const getStage1Label = () => {
    switch (stage1) {
      case 'waiting': return 'Waiting...';
      case 'analyzing': return 'Analyzing...';
      case 'approved': return 'Approved.';
      case 'rejected': return 'Rejected.';
      default: return 'Unknown';
    }
  };

  const getStage2Label = () => {
    switch (stage2) {
      case 'waiting': return 'Awaiting';
      case 'processing': return 'Processing...';
      case 'success':
        return (stage3 === 'defeated' || stage3 === 'completed' || stage3 === 'expired') ? 'Vote ended' : 'Voting';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getStage3Label = () => {
    switch (stage3) {
      case 'waiting': return 'Pending';
      case 'active': return 'Active';
      case 'completed': return 'Approved';
      case 'defeated': return 'Defeated';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  const getStage1Image = () => {
    switch (stage1) {
      case 'approved': return 'https://i.imgur.com/3Y3KrnJ.png';
      case 'rejected': return 'https://i.imgur.com/XIe1jZy.png';
      case 'analyzing': return 'https://i.imgur.com/ePrWP7A.png';
      default: return 'https://i.imgur.com/ePrWP7A.png';
    }
  };

  const getStage2Image = () => {
    if (stage2 === 'success') return 'https://i.imgur.com/3Y3KrnJ.png';
    if (stage2 === 'failed') return 'https://i.imgur.com/ZYpNkse.png';
    return 'https://i.imgur.com/ePrWP7A.png';
  };

  const getStage3Image = () => {
    if (stage3 === 'completed') return 'https://i.imgur.com/3Y3KrnJ.png';
    if (stage3 === 'defeated' || stage3 === 'expired') return 'https://i.imgur.com/XIe1jZy.png';
    return 'https://i.imgur.com/ePrWP7A.png';
  };

  const isStage1Done = stage1 === 'approved' || stage1 === 'rejected';
  const isStage2Done = stage2 === 'success' || stage2 === 'failed';

  return (
    <div className={styles.container}>
      {/* Stage 1: Azura Review */}
      <div className={`${styles.stage} ${styles[stage1]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage1Image()}
            alt="Azura"
            width={100}
            height={100}
            className={styles.stageImage}
            unoptimized
          />
        </div>
        <p className={styles.stageLabel}>
          Stage 1: {getStage1Label()}
        </p>
      </div>

      {/* Connector 1 */}
      <div className={`${styles.connector} ${isStage1Done ? styles.connectorActive : ''}`}>
        <div className={styles.connectorLine} />
      </div>

      {/* Stage 2: Vote */}
      <div className={`${styles.stage} ${styles[stage2]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage2Image()}
            alt="Vote"
            width={100}
            height={100}
            className={styles.stageImage}
            unoptimized
          />
        </div>
        <p className={styles.stageLabel}>
          Stage 2: {getStage2Label()}
        </p>
      </div>

      {/* Connector 2 */}
      <div className={`${styles.connector} ${isStage2Done ? styles.connectorActive : ''}`}>
        <div className={styles.connectorLine} />
      </div>

      {/* Stage 3: Outcome */}
      <div className={`${styles.stage} ${styles[stage3]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage3Image()}
            alt="Outcome"
            width={100}
            height={100}
            className={styles.stageImage}
            unoptimized
          />
        </div>
        <p className={styles.stageLabel}>
          Stage 3: {getStage3Label()}
        </p>
      </div>
    </div>
  );
};

export default ProposalStages;
