'use client';

import React, { useState } from 'react';
import { providers } from 'ethers';
import { voteOnProposal } from '@/lib/azura-contract';
import { useSound } from '@/hooks/useSound';
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
  const { play } = useSound();
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (support: boolean) => {
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
      const code = error?.error?.data?.originalError?.data || error?.data || '';
      if (code === '0x7becc13f' || error.message?.includes('ProposalNotActive')) {
        setError('Proposal is not active for voting');
      } else if (error.message?.includes('AlreadyVoted')) {
        setError('You have already voted');
      } else if (error.message?.includes('VotingEnded')) {
        setError('Voting period has ended');
      } else if (error.message?.includes('InsufficientVotingPower')) {
        setError('No voting power');
      } else if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        setError('Transaction cancelled');
      } else {
        setError('Vote failed — check console for details');
      }
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
          className={styles.yesButton}
          onClick={() => { play('click'); handleVote(true); }}
          onMouseEnter={() => play('hover')}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner}></div>
              <span>Voting...</span>
            </>
          ) : (
            <span>Vote Yes</span>
          )}
        </button>
        <button
          className={styles.noButton}
          onClick={() => { play('click'); handleVote(false); }}
          onMouseEnter={() => play('hover')}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner}></div>
              <span>Voting...</span>
            </>
          ) : (
            <span>Vote No</span>
          )}
        </button>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
};

export default VoteButton;
