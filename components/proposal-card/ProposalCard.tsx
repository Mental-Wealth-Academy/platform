'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ProposalStages from '@/components/proposal-stages/ProposalStages';
import FinalizeButton from './FinalizeButton';
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
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFinalized = () => {
    // Refresh the component to show updated status
    setRefreshKey(prev => prev + 1);
    // Optionally refresh the entire proposals list
    window.location.reload();
  };
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
    if (status === 'approved') {
      return 'waiting'; // Approved but not yet on blockchain
    }
    if (status === 'active' || status === 'completed') {
      return 'success'; // On blockchain
    }
    return 'waiting';
  };

  const getStage3Variant = () => {
    if (status === 'active') {
      return 'active';
    }
    if (status === 'completed') {
      return 'completed';
    }
    return 'waiting';
  };

  const getStatusLabel = () => {
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

  const getPreviewText = () => {
    // Remove markdown formatting for preview
    const plainText = proposalMarkdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
      .trim();
    
    return plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
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

      <div className={styles.preview}>
        <p className={styles.previewLabel}>Preview</p>
        <p className={styles.previewText}>{getPreviewText()}</p>
      </div>

      {/* Show finalize button for approved proposals */}
      {status === 'approved' && review?.tokenAllocation && (
        <div className={styles.finalizeSection}>
          <FinalizeButton
            proposalId={id}
            tokenAllocation={review.tokenAllocation}
            onFinalized={handleFinalized}
          />
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.timestamp}>{formatTimestamp(createdAt)}</span>
        <button
          className={styles.viewButton}
          onClick={() => onViewDetails?.(id)}
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
