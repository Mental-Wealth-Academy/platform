'use client';

import React from 'react';
import styles from './VoteProgressBar.module.css';

interface VoteProgressBarProps {
  forVotes: string;        // Total Soul Gems voting for
  againstVotes: string;    // Total Soul Gems voting against
  totalSupply: string;     // Total Soul Gems in existence
  threshold: number;       // Threshold percentage (50)
}

const VoteProgressBar: React.FC<VoteProgressBarProps> = ({
  forVotes,
  againstVotes,
  totalSupply,
  threshold = 50,
}) => {
  const forVotesNum = parseFloat(forVotes);
  const againstVotesNum = parseFloat(againstVotes);
  const totalVotes = forVotesNum + againstVotesNum;
  const totalSupplyNum = parseFloat(totalSupply);

  const percentageFor = totalSupplyNum > 0
    ? (forVotesNum / totalSupplyNum) * 100
    : 0;

  const pctOfVotesFor = totalVotes > 0 ? (forVotesNum / totalVotes) * 100 : 0;
  const pctOfVotesAgainst = totalVotes > 0 ? (againstVotesNum / totalVotes) * 100 : 0;

  const thresholdReached = percentageFor >= threshold;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Voting Progress</h4>
        <span className={styles.threshold}>
          Threshold: <span className={styles.thresholdValue}>{threshold}%</span>
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${Math.min(percentageFor, 100)}%` }}
        />
        <div className={styles.progressText}>
          {percentageFor.toFixed(1)}% Approved
        </div>
        {!thresholdReached && (
          <>
            <div className={styles.thresholdLine} />
            <span className={styles.thresholdLabel}>50%</span>
          </>
        )}
      </div>

      <div className={styles.voteBreakdown}>
        <div className={styles.voteItem}>
          <span className={`${styles.voteDot} ${styles.for}`} />
          <span className={styles.voteLabel}>Approve:</span>
          <span className={styles.votePercent}>{pctOfVotesFor.toFixed(1)}%</span>
        </div>

        <div className={styles.voteItem}>
          <span className={`${styles.voteDot} ${styles.against}`} />
          <span className={styles.voteLabel}>Reject:</span>
          <span className={styles.votePercent}>{pctOfVotesAgainst.toFixed(1)}%</span>
        </div>
      </div>

      {thresholdReached && (
        <div className={styles.thresholdReached}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className={styles.thresholdReachedText}>
            🎉 Threshold reached! Proposal can be executed.
          </p>
        </div>
      )}
    </div>
  );
};

export default VoteProgressBar;
