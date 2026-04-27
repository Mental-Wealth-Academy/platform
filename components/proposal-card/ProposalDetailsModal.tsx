'use client';

import React, { useEffect, useState } from 'react';
import VoteButton from './FinalizeButton';
import { useSound } from '@/hooks/useSound';
import styles from './ProposalDetailsModal.module.css';

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

interface ProposalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChainProposalId?: number | null;
  contractAddress?: string;
  onVoted?: () => void;
  proposal: {
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
    onChainTxHash?: string | null;
    onChainData?: {
      forVotes: string;
      againstVotes: string;
      votingDeadline: number;
      blueLevel: number;
      executed: boolean;
    };
  };
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const { play } = useSound();
  return (
    <div className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={() => { play(open ? 'toggle-off' : 'toggle-on'); setOpen((v) => !v); }}
        onMouseEnter={() => play('hover')}
        aria-expanded={open}
      >
        <h3 className={styles.sectionTitle}>{title}</h3>
        <svg
          className={`${styles.accordionChevron} ${open ? styles.accordionChevronOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className={`${styles.accordionBody} ${open ? styles.accordionBodyOpen : ''}`}>
        <div className={styles.accordionInner}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProposalDetailsModal({
  isOpen,
  onClose,
  onChainProposalId,
  contractAddress,
  onVoted,
  proposal,
}: ProposalDetailsModalProps) {
  const { play } = useSound();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={() => { play('click'); onClose(); }} onMouseEnter={() => play('hover')} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Fixed top: header + txn + created date */}
        <div className={styles.topSection}>
          <div className={styles.header}>
            <h2 className={styles.title}>{proposal.title}</h2>
            <div className={styles.meta}>
              {proposal.onChainTxHash ? (
                <a
                  href={`https://basescan.org/tx/${proposal.onChainTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.metaItem} ${styles.metaLink}`}
                  onClick={() => play('navigation')}
                  onMouseEnter={() => play('hover')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {proposal.walletAddress.slice(0, 6)}...{proposal.walletAddress.slice(-4)}
                </a>
              ) : (
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {proposal.walletAddress.slice(0, 6)}...{proposal.walletAddress.slice(-4)}
                </span>
              )}
              <span className={styles.metaItem}>
                Created {formatDate(proposal.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable middle: proposal content (accordion) */}
        <div className={styles.scrollArea}>
          <Accordion title="Proposal">
            <div className={styles.markdownContent}>
              <pre className={styles.markdownPre}>{proposal.proposalMarkdown}</pre>
            </div>
          </Accordion>
        </div>

        {/* Fixed bottom: Vote Yes / Vote No */}
        {onChainProposalId && contractAddress && proposal.onChainData && !proposal.onChainData.executed && (
          <div className={styles.bottomSection}>
            <VoteButton
              onChainProposalId={onChainProposalId}
              contractAddress={contractAddress}
              onVoted={onVoted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
