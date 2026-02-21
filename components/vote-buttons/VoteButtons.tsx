'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { providers } from 'ethers';
import { voteOnProposal, getUserVotingPower, formatTokenAmount, ensureBaseNetwork } from '@/lib/azura-contract';
import styles from './VoteButtons.module.css';

interface VoteButtonsProps {
  proposalId: number;
  contractAddress: string;
  onVoted?: () => void;
  hasVoted?: boolean;
  userVote?: boolean | null;
}

const VoteButtons: React.FC<VoteButtonsProps> = ({
  proposalId,
  contractAddress,
  onVoted,
  hasVoted = false,
  userVote = null,
}) => {
  const { address, isConnected } = useAccount();
  const [voting, setVoting] = useState(false);
  const [votingPower, setVotingPower] = useState<string>('0');
  const [userHasVoted, setUserHasVoted] = useState(hasVoted);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check for connected wallet via window.ethereum
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkWalletConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const loadVotingPower = useCallback(async () => {
    const addr = address || walletAddress;
    if (!addr) return;
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new providers.Web3Provider(window.ethereum);
        const power = await getUserVotingPower(contractAddress, addr, provider);
        setVotingPower(power);
      }
    } catch (error) {
      console.error('Error loading voting power:', error);
    }
  }, [address, walletAddress, contractAddress]);

  useEffect(() => {
    const addr = address || walletAddress;
    if (addr) {
      loadVotingPower();
    }
  }, [address, walletAddress, loadVotingPower]);

  const handleConnectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet to vote.');
      return;
    }

    try {
      // Request account access - works with MetaMask, Coinbase Wallet, etc.
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (error: any) {
      if (error.code === 4001) {
        alert('Please connect your wallet to vote.');
      } else {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
      }
    }
  };

  const handleVote = async (support: boolean) => {
    const addr = address || walletAddress;
    
    if (!addr) {
      // Connect wallet
      await handleConnectWallet();
      return;
    }

    if (parseFloat(votingPower) === 0) {
      alert('You need $MWG tokens to vote!');
      return;
    }

    setVoting(true);

    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new providers.Web3Provider(window.ethereum);
        await ensureBaseNetwork(provider);
        // Re-create provider after potential chain switch
        const baseProvider = new providers.Web3Provider(window.ethereum);

        const txHash = await voteOnProposal(
          contractAddress,
          proposalId,
          support,
          baseProvider
        );
        
        alert(`Vote submitted!\n\nTransaction: ${txHash.slice(0, 10)}...\n\nYour ${formatTokenAmount(votingPower)} $MWG tokens have been counted!`);
        
        setUserHasVoted(true);
        
        if (onVoted) {
          onVoted();
        }
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      const msg = error.message || 'Unknown error';
      if (msg.includes('user rejected') || msg.includes('denied') || error.code === 4001) {
        alert('Vote cancelled.');
      } else if (msg.includes('switch') && msg.includes('Base')) {
        alert('Please switch your wallet to Base network and try again.');
      } else if (msg.includes('ProposalNotActive') || msg.includes('proposal') && msg.includes('active')) {
        alert('This proposal is not currently open for voting.');
      } else if (msg.includes('AlreadyVoted')) {
        alert('You have already voted on this proposal.');
      } else if (msg.includes('VotingEnded')) {
        alert('The voting period for this proposal has ended.');
      } else if (msg.includes('cannot estimate gas')) {
        alert('Transaction would fail. Make sure your wallet is on Base network and the proposal is open for voting.');
      } else {
        alert(`Failed to vote: ${msg.slice(0, 150)}`);
      }
    } finally {
      setVoting(false);
    }
  };

  if (userHasVoted) {
    return (
      <div className={styles.votedIndicator}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>You voted {userVote ? 'Approve' : 'Reject'}</span>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <button
          className={`${styles.voteButton} ${styles.approveButton}`}
          onClick={() => handleVote(true)}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner} />
              <span>Voting...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Approve</span>
            </>
          )}
        </button>

        <button
          className={`${styles.voteButton} ${styles.rejectButton}`}
          onClick={() => handleVote(false)}
          disabled={voting}
          type="button"
        >
          {voting ? (
            <>
              <div className={styles.spinner} />
              <span>Voting...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Reject</span>
            </>
          )}
        </button>
      </div>

      {(isConnected || walletAddress) && parseFloat(votingPower) > 0 && (
        <div className={styles.votingPower}>
          <span className={styles.votingPowerLabel}>Your Voting Power:</span>
          <span className={styles.votingPowerAmount}>{formatTokenAmount(votingPower)} $MWG</span>
        </div>
      )}

      {(isConnected || walletAddress) && parseFloat(votingPower) === 0 && (
        <div className={styles.votingPower}>
          <span className={styles.votingPowerLabel}>You need $MWG tokens to vote</span>
        </div>
      )}
    </>
  );
};

export default VoteButtons;
