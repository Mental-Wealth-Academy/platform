'use client';

import React from 'react';
import Image from 'next/image';
import ProposalStages from '@/components/proposal-stages/ProposalStages';
import { useSound } from '@/hooks/useSound';
import styles from './ProposalCard.module.css';

interface ProposalReview {
  decision: 'approved' | 'rejected';
  reasoning: string;
  tokenAllocation: number | null;
  scores: {
    clarity: number;
    impact: number;
    feasibility: number;
    budget: number;
    ingenuity: number;
    chaos: number;
  } | null;
  reviewedAt: string;
}

interface OnChainData {
  forVotes: string;
  againstVotes: string;
  votingDeadline: number;
  azuraLevel: number;
  executed: boolean;
}

interface ProposalCardProps {
  id: string;
  title: string;
  proposalMarkdown: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'completed';
  walletAddress: string;
  createdAt: string;
  user: {
    username: string | null;
    avatarUrl: string | null;
  };
  review: ProposalReview | null;
  onViewDetails?: (id: string) => void;
  showAvatar?: boolean;
  onChainProposalId?: number | null;
  onChainData?: OnChainData | null;
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  id,
  title,
  proposalMarkdown,
  status,
  walletAddress,
  createdAt,
  user,
  review,
  onViewDetails,
  showAvatar = false,
  onChainProposalId,
  onChainData,
}) => {
  const { play } = useSound();

  const getStage1Variant = () => {
    if (status === 'pending_review') {
      return review ? 'analyzing' : 'waiting';
    }
    if (status === 'approved' || status === 'active' || status === 'completed') {
      return 'approved';
    }
    if (status === 'rejected') {
      return 'rejected';
    }
    return 'waiting';
  };

  const getStage2Variant = () => {
    if (status === 'approved' && onChainProposalId) {
      return 'success'; // Approved and already on blockchain
    }
    if (status === 'approved') {
      return 'waiting'; // Approved but not yet on blockchain
    }
    if (status === 'active' || status === 'completed') {
      return 'success'; // On blockchain
    }
    return 'waiting';
  };

  const getStage3Variant = () => {
    if (status === 'completed' || onChainData?.executed) {
      return 'completed';
    }
    if (onChainData) {
      const forVotes = parseFloat(onChainData.forVotes);
      const againstVotes = parseFloat(onChainData.againstVotes);
      const hasVotes = forVotes > 0 || againstVotes > 0;
      if (hasVotes && againstVotes > forVotes) {
        return 'defeated';
      }
    }
    return 'waiting';
  };

  const isDefeated = getStage3Variant() === 'defeated';

  const getStatusLabel = () => {
    if (isDefeated) return 'Defeated';
    switch (status) {
      case 'pending_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Failed';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = () => {
    if (isDefeated) return 'rejected';
    switch (status) {
      case 'pending_review':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'active':
        return 'active';
      case 'completed':
        return 'approved';
      default:
        return 'pending';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };


  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <p className={styles.eyebrow}>Proposal</p>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <div className={`${styles.statusBadge} ${styles[getStatusClass()]}`}>
            <span className={styles.statusDot} />
            {getStatusLabel()}
          </div>
        </div>
        <div className={styles.meta}>
          {showAvatar && (
            <div className={styles.metaItem}>
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.username || 'User'}
                  width={24}
                  height={24}
                  className={styles.avatarImage}
                  unoptimized
                />
              ) : (
                <div className={styles.avatar}>
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <strong>@{user.username || 'anonymous'}</strong>
            </div>
          )}
          <div className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className={styles.walletAddress}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.stagesSection}>
        <ProposalStages
          stage1={getStage1Variant()}
          stage2={getStage2Variant()}
          stage3={getStage3Variant()}
          azuraReasoning={review?.reasoning || null}
          tokenAllocation={review?.tokenAllocation || null}
        />
      </div>

      {review?.reasoning && (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>Azura&apos;s Remarks</p>
          <p className={styles.previewText}>{review.reasoning}</p>
        </div>
      )}

      {/* Voting bar for proposals with on-chain vote data */}
      {onChainData && (() => {
        const forVotes = parseFloat(onChainData.forVotes);
        const againstVotes = parseFloat(onChainData.againstVotes);
        const totalVotes = forVotes + againstVotes;
        const yesPct = totalVotes > 0 ? Math.round((forVotes / totalVotes) * 100) : 0;
        const noPct = totalVotes > 0 ? 100 - yesPct : 0;
        return (
          <div className={styles.voteBarSection}>
            <div className={styles.voteBarTrack}>
              <div className={styles.voteBarYes} style={{ width: `${yesPct}%` }} />
              <div className={styles.voteBarDivider} />
            </div>
            <div className={styles.voteBarLabels}>
              <span className={styles.voteBarYesLabel}>Yes {yesPct}%</span>
              <span className={styles.voteBarNoLabel}>No {noPct}%</span>
            </div>
          </div>
        );
      })()}

      <div className={styles.footer}>
        <span className={styles.timestamp}>{formatTimestamp(createdAt)}</span>
        <button
          className={styles.viewButton}
          onClick={() => { play('click'); onViewDetails?.(id); }}
          onMouseEnter={() => play('hover')}
          type="button"
        >
          View Details
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ProposalCard;
