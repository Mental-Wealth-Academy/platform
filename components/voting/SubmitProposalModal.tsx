'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import Image from 'next/image';
import { providers } from 'ethers';
import { createProposalOnChain } from '@/lib/azura-contract';
import ProposalSuccessModal from './ProposalSuccessModal';
import { useSound } from '@/hooks/useSound';
import styles from './SubmitProposalModal.module.css';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';

interface SubmitProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SubmitProposalModal: React.FC<SubmitProposalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { play } = useSound();
  const { address, isConnected, connector } = useAccount();
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('0.00');
  const [amountMessage, setAmountMessage] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<'idle' | 'blockchain' | 'database'>('idle');
  const [charCount, setCharCount] = useState(0);
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; txHash: string; proposalId: number }>({
    isOpen: false,
    txHash: '',
    proposalId: 0,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const data = await response.json();
        if (data?.user) {
          setUsername(data.user.username || null);
          setAvatarUrl(data.user.avatarUrl || null);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  useEffect(() => {
    setCharCount(proposal.length);
  }, [proposal]);

  useEffect(() => {
    const amount = parseFloat(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      setAmountMessage('');
    } else if (amount >= 100000) {
      setAmountMessage("thats just silly");
    } else if (amount >= 10000) {
      setAmountMessage("slow your horses buddy we're not made out of money");
    } else if (amount > 999) {
      setAmountMessage("that's a lot of cheese for a mouse like you");
    } else if (amount > 99) {
      setAmountMessage("you sure about that?");
    } else if (amount > 9) {
      setAmountMessage("wow big spender");
    } else {
      setAmountMessage('');
    }
  }, [tokenAmount]);

  const handleSubmit = async () => {
    // Validation
    if (!title.trim() || !proposal.trim()) {
      alert('Please fill in both title and proposal');
      return;
    }

    if (!recipientAddress.trim()) {
      alert('Please provide the recipient wallet address');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
      alert('Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)');
      return;
    }

    if (!tokenAmount.trim()) {
      alert('Please provide the token amount');
      return;
    }

    const tokenAmountNum = parseFloat(tokenAmount.trim());
    if (isNaN(tokenAmountNum) || tokenAmountNum <= 0) {
      alert('Please enter a valid token amount (must be greater than 0)');
      return;
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet using the "Connect Wallet" button to submit your proposal.');
      return;
    }

    if (!connector) {
      alert('Wallet connector not available. Please reconnect your wallet.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // STEP 1: Create proposal on-chain (user pays gas)
      setSubmissionStep('blockchain');
      console.log('Creating proposal on-chain...');
      
      // Convert token amount to USDC format (6 decimals)
      const usdcAmount = Math.floor(tokenAmountNum * 1e6).toString();
      
      // Get the provider from the connector
      const provider = await connector.getProvider();
      if (!provider) {
        throw new Error('Provider not available from connector');
      }
      
      // Convert EIP1193 provider to ethers Web3Provider
      const ethersProvider = new providers.Web3Provider(provider);
      const { proposalId: onChainProposalId, txHash } = await createProposalOnChain(
        CONTRACT_ADDRESS,
        recipientAddress.trim(),
        usdcAmount,
        title.trim(),
        proposal.trim(),
        7, // 7 days voting period
        ethersProvider
      );

      // Validate the proposal ID before proceeding
      if (!onChainProposalId || onChainProposalId <= 0 || isNaN(onChainProposalId)) {
        throw new Error(`Invalid proposal ID received from blockchain: ${onChainProposalId}. Please contact support with transaction hash: ${txHash}`);
      }
      if (!txHash || !txHash.startsWith('0x')) {
        throw new Error(`Invalid transaction hash received: ${txHash}`);
      }

      console.log('✅ On-chain proposal created!', { onChainProposalId, txHash });

      // STEP 2: Save to database with on-chain ID
      setSubmissionStep('database');

      const response = await fetch('/api/voting/proposal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          proposalMarkdown: proposal.trim(),
          walletAddress: address,
          recipientAddress: recipientAddress.trim(),
          tokenAmount: tokenAmount.trim(),
          onChainProposalId: onChainProposalId.toString(),
          onChainTxHash: txHash,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server returned invalid response (status ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to save proposal to database (HTTP ${response.status})`);
      }

      // Reset form
      setTitle('');
      setProposal('');
      setRecipientAddress('');
      setTokenAmount('0.00');
      setAmountMessage('');

      // Close form modal, show success modal
      onClose();
      setSuccessModal({ isOpen: true, txHash, proposalId: onChainProposalId });
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to submit proposal. ';
      
      if (error.code === 4001) {
        errorMessage += 'You rejected the transaction.';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient funds for gas. Please add more ETH to your wallet.';
      } else if (error.message?.includes('user rejected')) {
        errorMessage += 'Transaction was rejected.';
      } else if (error.message?.includes('gas')) {
        errorMessage += 'Gas estimation failed. Please check your wallet balance.';
      } else if (submissionStep === 'blockchain') {
        errorMessage += 'Blockchain transaction failed: ' + (error.message || 'Unknown error');
      } else if (submissionStep === 'database') {
        errorMessage += 'Proposal created on-chain but failed to save to database. Please contact support with transaction hash: ' + error.txHash;
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setSubmissionStep('idle');
    }
  };

  const handleSuccessClose = () => {
    setSuccessModal({ isOpen: false, txHash: '', proposalId: 0 });
    if (onSuccess) {
      onSuccess();
    }
  };

  const modalContent = (
    <>
      <ProposalSuccessModal
        isOpen={successModal.isOpen}
        onClose={handleSuccessClose}
        txHash={successModal.txHash}
        proposalId={successModal.proposalId}
      />
      {!isOpen ? null : (
      <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Submit Proposal</h2>
          <button className={styles.closeButton} onClick={() => { play('click'); onClose(); }} onMouseEnter={() => play('hover')} aria-label="Close" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* User Info */}
          <div className={styles.userCard}>
            <div className={styles.userInfo}>
              {avatarUrl ? (
                <div className={styles.avatar}>
                  <Image
                    src={avatarUrl}
                    alt={username || 'User'}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                    unoptimized
                  />
                </div>
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span>?</span>
                </div>
              )}
              <div className={styles.userDetails}>
                <span className={styles.userLabel}>Submitting as</span>
                <span className={styles.username}>
                  @{username || 'anonymous'}
                </span>
              </div>
            </div>
            <ConnectKitButton.Custom>
              {({ isConnected, isConnecting, show, address }) => (
                isConnected ? (
                  <div className={styles.connectedBadge}>
                    <span className={styles.connectedDot} />
                    <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                ) : (
                  <button
                    className={styles.connectButton}
                    onClick={() => { play('click'); show?.(); }}
                    onMouseEnter={() => play('hover')}
                    disabled={isConnecting}
                    type="button"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )
              )}
            </ConnectKitButton.Custom>
          </div>

          {/* Title Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelText}>Proposal Title</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter your proposal title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
            <div className={styles.inputFooter}>
              <span className={styles.charCount}>{title.length}/120</span>
            </div>
          </div>

          {/* Recipient Address Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelText}>Send funds to</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className={styles.input}
                style={{ flex: 1 }}
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
              {address && (
                <button
                  type="button"
                  className={styles.templateButton}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setRecipientAddress(address)}
                >
                  My wallet
                </button>
              )}
            </div>
          </div>

          {/* Token Amount Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelText}>Amount (USDC)</span>
            </label>
            <input
              type="number"
              className={styles.input}
              placeholder="0.00"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              step="0.01"
              min="0"
            />
            {amountMessage && (
              <div className={`${styles.amountMessage} ${parseFloat(tokenAmount) >= 100000 ? styles.amountMessageWarning : ''}`}>
                {amountMessage}
              </div>
            )}
          </div>

          {/* Markdown Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelText}>Proposal Details</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Describe your proposal, objectives, budget, and timeline..."
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={12}
            />
            <div className={styles.inputFooter}>
              <span className={styles.charCount}>{charCount.toLocaleString()} chars</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className={styles.submitRow}>
            <button
              className={styles.submitButton}
              onClick={() => { play('click'); handleSubmit(); }}
              onMouseEnter={() => play('hover')}
              disabled={isSubmitting || !title.trim() || !proposal.trim()}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner}></div>
                  <span>
                    {submissionStep === 'blockchain' && 'Creating (sign transaction)...'}
                    {submissionStep === 'database' && 'Saving to database...'}
                    {submissionStep === 'idle' && 'Submitting...'}
                  </span>
                </>
              ) : (
                <span>Submit Proposal</span>
              )}
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};

export default SubmitProposalModal;
