'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useModal } from 'connectkit';
import { providers } from 'ethers';
import { voteOnProposal } from '@/lib/azura-contract';
import styles from './FinalizeButton.module.css';

interface VoteButtonProps {
  onChainProposalId: number;
  contractAddress: string;
  onVoted?: () => void;
}

const VoteButton: React.FC<VoteButtonProps> = ({
  onChainProposalId,
  contractAddress,
  onVoted,
}) => {
  const { address, isConnected } = useAccount();
  const { setOpen } = useModal();
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectWallet = () => {
    setOpen(true);
  };

  const handleVote = async (support: boolean) => {
    if (!isConnected || !address) {
      handleConnectWallet();
      return;
    }

    setVoting(true);
    setError(null);

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected');
      }

      const provider = new providers.Web3Provider(window.ethereum);
      const txHash = await voteOnProposal(
        contractAddress,
        onChainProposalId,
        support,
        provider
      );

      setVoted(true);

      if (onVoted) {
        onVoted();
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      setError(error.message || 'Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  if (voted) {
    return (
      <div className={styles.container}>
        <p className={styles.successText}>Vote submitted</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.voteRow}>
        <button
          className={styles.finalizeButton}
          onClick={() => handleVote(true)}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner}></div>
              <span>Voting...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Vote Yes</span>
            </>
          )}
        </button>
        <button
          className={styles.rejectVoteButton}
          onClick={() => handleVote(false)}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner}></div>
              <span>Voting...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Vote No</span>
            </>
          )}
        </button>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      {!isConnected && (
        <p className={styles.hintText}>Connect wallet to vote</p>
      )}
    </div>
  );
};

export default VoteButton;
