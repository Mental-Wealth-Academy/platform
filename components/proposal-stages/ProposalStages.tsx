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
  blueReasoning?: string | null;
  tokenAllocation?: number | null;
}

const EMOTE_ASSETS = {
  happy: '/uploads/HappyEmote.png',
  confused: '/uploads/ConfusedEmote.png',
  sad: '/uploads/SadEmote.png',
  pain: '/uploads/PainEmote.png',
} as const;

const ProposalStages: React.FC<ProposalStagesProps> = ({
  stage1,
  stage2,
  stage3,
}) => {
  const stage1Title = 'Review';
  const stage2Title = 'Vote';
  const stage3Title = 'Result';

  const getStage1Label = () => {
    switch (stage1) {
      case 'waiting': return 'Queued';
      case 'analyzing': return 'Scanning';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const getStage2Label = () => {
    switch (stage2) {
      case 'waiting': return 'Awaiting';
      case 'processing': return 'Opening';
      case 'success':
        return (stage3 === 'defeated' || stage3 === 'completed' || stage3 === 'expired') ? 'Closed' : 'Live';
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
      case 'approved': return EMOTE_ASSETS.happy;
      case 'rejected': return EMOTE_ASSETS.sad;
      case 'analyzing': return EMOTE_ASSETS.confused;
      default: return EMOTE_ASSETS.confused;
    }
  };

  const getStage2Image = () => {
    if (stage2 === 'success') return EMOTE_ASSETS.happy;
    if (stage2 === 'failed') return EMOTE_ASSETS.pain;
    return EMOTE_ASSETS.confused;
  };

  const getStage3Image = () => {
    if (stage3 === 'completed') return EMOTE_ASSETS.happy;
    if (stage3 === 'defeated' || stage3 === 'expired') return EMOTE_ASSETS.sad;
    return EMOTE_ASSETS.confused;
  };

  const isStage1Done = stage1 === 'approved' || stage1 === 'rejected';
  const isStage2Done = stage2 === 'success' || stage2 === 'failed';
  const isStage1Waiting = stage1 === 'waiting' || stage1 === 'analyzing';
  const isStage2Waiting = stage2 === 'waiting' || stage2 === 'processing';

  return (
    <div className={styles.container}>
      {/* Stage 1: Blue Review */}
      <div className={`${styles.stage} ${styles[stage1]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage1Image()}
            alt="Blue"
            width={72}
            height={72}
            className={styles.stageImage}
          />
        </div>
        <div className={styles.stageCopy}>
          <p className={styles.stageTitle}>{stage1Title}</p>
          <p className={styles.stageLabel}>{getStage1Label()}</p>
        </div>
      </div>

      {/* Connector 1 */}
      <div className={`${styles.connector} ${isStage1Done ? styles.connectorDone : ''} ${isStage1Waiting ? styles.connectorAnimated : ''}`}>
        <div className={styles.connectorLine}>
          {isStage1Waiting && (
            <Image
              src="/icons/bluescanner.png"
              alt="Blue"
              width={32}
              height={32}
              className={styles.blueRunner}
              unoptimized
            />
          )}
        </div>
      </div>

      {/* Stage 2: Vote */}
      <div className={`${styles.stage} ${styles[stage2]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage2Image()}
            alt="Vote"
            width={72}
            height={72}
            className={styles.stageImage}
          />
        </div>
        <div className={styles.stageCopy}>
          <p className={styles.stageTitle}>{stage2Title}</p>
          <p className={styles.stageLabel}>{getStage2Label()}</p>
        </div>
      </div>

      {/* Connector 2 */}
      <div className={`${styles.connector} ${isStage2Done ? styles.connectorDone : ''} ${isStage2Waiting ? styles.connectorAnimated : ''}`}>
        <div className={styles.connectorLine}>
          {isStage2Waiting && (
            <Image
              src="/icons/bluescanner.png"
              alt="Blue"
              width={32}
              height={32}
              className={styles.blueRunner}
              unoptimized
            />
          )}
        </div>
      </div>

      {/* Stage 3: Outcome */}
      <div className={`${styles.stage} ${styles[stage3]}`}>
        <div className={styles.imageWrap}>
          <Image
            src={getStage3Image()}
            alt="Outcome"
            width={72}
            height={72}
            className={styles.stageImage}
          />
        </div>
        <div className={styles.stageCopy}>
          <p className={styles.stageTitle}>{stage3Title}</p>
          <p className={styles.stageLabel}>{getStage3Label()}</p>
        </div>
      </div>
    </div>
  );
};

export default ProposalStages;
