'use client';

import React from 'react';
import Image from 'next/image';
import ProposalStages from '@/components/proposal-stages/ProposalStages';
import { useSound } from '@/hooks/useSound';
import styles from './ProposalCard.module.css';

const REVIEW_LIMIT = 120;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}…`;
}

function shortenWallet(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatVoteCount(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return Math.round(n).toLocaleString();
}

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
  /** @deprecated author byline is always shown now */
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
  onChainProposalId,
  onChainData,
}) => {
  const { play } = useSound();

  const reviewFallback = 'Blue scores every proposal across six dimensions before it goes to vote.';
  const reviewDisplay = truncate(review?.reasoning || reviewFallback, REVIEW_LIMIT);

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

  const isExpired = !!onChainData && onChainData.votingDeadline > 0 && Date.now() / 1000 > onChainData.votingDeadline && !onChainData.executed;

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
      if (isExpired) {
        const totalVotes = forVotes + againstVotes;
        if (totalVotes === 0) return 'expired';
        return forVotes > againstVotes ? 'completed' : 'defeated';
      }
    }
    return 'waiting';
  };

  const isDefeated = getStage3Variant() === 'defeated';
  const isExpiredState = getStage3Variant() === 'expired';

  const getStatusLabel = () => {
    if (isExpiredState) return 'Expired';
    if (isDefeated) return 'Defeated';
    switch (status) {
      case 'pending_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Failed';
      case 'active':
        return isExpired ? 'Expired' : 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = () => {
    if (isExpiredState) return 'expired';
    if (isDefeated) return 'rejected';
    switch (status) {
      case 'pending_review':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'active':
        return isExpired ? 'expired' : 'active';
      case 'completed':
        return 'approved';
      default:
        return 'pending';
    }
  };

  const statusLabel = getStatusLabel();
  const statusClass = getStatusClass();
  const authorName = user.username ? `@${user.username}` : shortenWallet(walletAddress);
  const authorInitial = (user.username?.[0] || walletAddress?.replace(/^0x/i, '')[0] || '?').toUpperCase();
  const timestamp = relativeTime(createdAt);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>Proposal</span>
              <span className={`${styles.statusPill} ${styles[`status_${statusClass}`]}`}>
                <span className={styles.statusDot} aria-hidden="true" />
                {statusLabel}
              </span>
            </div>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <Image
            src="/icons/badge-academy.png"
            alt="Shard"
            width={44}
            height={44}
            className={`${styles.headerGem} ${styles[`gem_${statusClass}`]}`}
            unoptimized
          />
        </div>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username || 'Proposer'}
                width={24}
                height={24}
                className={styles.avatarImage}
                unoptimized
              />
            ) : (
              <div className={styles.avatar}>{authorInitial}</div>
            )}
            <strong>{authorName}</strong>
          </div>
          {timestamp && (
            <span className={styles.metaTime} title={new Date(createdAt).toLocaleString()}>
              {timestamp}
            </span>
          )}
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

      {onChainData && (() => {
        const forVotes = parseFloat(onChainData.forVotes);
        const againstVotes = parseFloat(onChainData.againstVotes);
        const totalVotes = forVotes + againstVotes;
        const yesPct = totalVotes > 0 ? Math.round((forVotes / totalVotes) * 100) : 0;
        const noPct = totalVotes > 0 ? 100 - yesPct : 0;
        return (
          <div className={styles.voteBarSection}>
            <div className={styles.voteBarHead}>
              <span className={styles.voteBarTitle}>Community vote</span>
              <span className={styles.voteBarTotal}>
                {totalVotes > 0 ? `${formatVoteCount(onChainData.forVotes)} for · ${formatVoteCount(onChainData.againstVotes)} against` : 'No votes yet'}
              </span>
            </div>
            <div className={styles.voteBarTrack} role="img" aria-label={`Yes ${yesPct} percent, No ${noPct} percent`}>
              <div className={styles.voteBarYes} style={{ width: `${yesPct}%` }} />
              <div className={styles.voteBarNo} style={{ width: `${noPct}%` }} />
            </div>
            <div className={styles.voteBarLabels}>
              <span className={styles.voteBarYesLabel}>Yes {yesPct}%</span>
              <span className={styles.voteBarNoLabel}>No {noPct}%</span>
            </div>
          </div>
        );
      })()}

      <div className={styles.reviewSection}>
        <p className={styles.reviewLabel}>Blue&apos;s review</p>
        <p className={styles.reviewText}>{reviewDisplay}</p>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerMeta} title={new Date(createdAt).toLocaleString()}>
          Submitted {timestamp || 'recently'}
        </span>
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
