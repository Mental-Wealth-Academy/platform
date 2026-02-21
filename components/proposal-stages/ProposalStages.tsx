'use client';

import React from 'react';
import Image from 'next/image';
import styles from './ProposalStages.module.css';

type Stage1Variant = 'waiting' | 'analyzing' | 'approved' | 'rejected';
type Stage2Variant = 'waiting' | 'processing' | 'success' | 'failed';
type Stage3Variant = 'waiting' | 'active' | 'completed' | 'defeated';

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
  azuraReasoning,
  tokenAllocation,
}) => {
  const getStage1Status = () => {
    switch (stage1) {
      case 'waiting':
        return 'Waiting for review...';
      case 'analyzing':
        return 'Analyzing proposal...';
      case 'approved':
        return 'Approved by Azura';
      case 'rejected':
        return 'Killed by Azura';
      default:
        return 'Unknown';
    }
  };

  const getStage2Status = () => {
    switch (stage2) {
      case 'waiting':
        return 'Awaiting vote';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Community voting open';
      case 'failed':
        return 'Vote failed';
      default:
        return 'Unknown';
    }
  };

  const getStage3Status = () => {
    switch (stage3) {
      case 'waiting':
        return 'Pending';
      case 'active':
        return 'Pending';
      case 'completed':
        return 'Approved';
      case 'defeated':
        return 'Defeated';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={styles.container}>
      {/* Stage 1: Azura Review */}
      <div className={`${styles.stage} ${styles.stage1} ${styles[stage1]}`}>
        <div className={styles.stageIcon}>
          {stage1 === 'approved' || stage1 === 'rejected' || stage1 === 'analyzing' ? (
            <Image
              src="/uploads/HappyEmote.png"
              alt="Azura"
              width={40}
              height={40}
              className={styles.azuraAvatar}
              unoptimized
            />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor"/>
              <circle cx="8" cy="6" r="1" fill="currentColor"/>
              <circle cx="16" cy="6" r="1" fill="currentColor"/>
            </svg>
          )}
          {(azuraReasoning && (stage1 === 'approved' || stage1 === 'rejected')) && (
            <div className={styles.tooltip}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className={styles.tooltipContent}>
                {azuraReasoning}
                {tokenAllocation && stage1 === 'approved' && (
                  <div className={styles.tokenAllocation}>
                    Token Allocation: {tokenAllocation}%
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles.stageContent}>
          <h4 className={styles.stageName}>Azura</h4>
          <p className={styles.stageStatus}>{getStage1Status()}</p>
        </div>
      </div>

      <div className={`${styles.divider} ${stage1 === 'approved' ? styles.active : ''}`} />

      {/* Stage 2: Blockchain Transaction */}
      <div className={`${styles.stage} ${styles.stage2} ${styles[stage2]}`}>
        <div className={styles.stageIcon}>
          {stage2 === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : stage2 === 'failed' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : stage2 === 'processing' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor"/>
              <path d="M3 17L12 22L21 17" fill="currentColor" fillOpacity="0.6"/>
              <path d="M3 12L12 17L21 12" fill="currentColor" fillOpacity="0.8"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
          )}
        </div>
        <div className={styles.stageContent}>
          <h4 className={styles.stageName}>Vote</h4>
          <p className={styles.stageStatus}>{getStage2Status()}</p>
        </div>
      </div>

      <div className={`${styles.divider} ${stage2 === 'success' ? styles.active : ''}`} />

      {/* Stage 3: Success */}
      <div className={`${styles.stage} ${styles.stage3} ${styles[stage3]}`}>
        <div className={styles.stageIcon}>
          {stage3 === 'completed' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : stage3 === 'defeated' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div className={styles.stageContent}>
          <h4 className={styles.stageName}>Outcome</h4>
          <p className={styles.stageStatus}>{getStage3Status()}</p>
        </div>
      </div>
    </div>
  );
};

export default ProposalStages;
