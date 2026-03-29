'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { getPrivyAuthHeaders } from '@/lib/wallet-api';
import styles from './BlockchainAccountModal.module.css';

interface BlockchainAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSynced?: () => void;
}

export function BlockchainAccountModal({
  isOpen,
  onClose,
  onAccountSynced,
}: BlockchainAccountModalProps) {
  const { address, isConnected } = useAccount();
  const { login, getAccessToken } = usePrivy();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSyncing) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSyncing, onClose]);

  const handleConnectWallet = () => {
    setError(null);
    login();
  };

  const handleSyncAccount = async () => {
    if (!isConnected || !address) return;

    setIsSyncing(true);
    setError(null);

    try {
      const headers = await getPrivyAuthHeaders(getAccessToken);
      const response = await fetch('/api/account/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sync blockchain account');

      if (onAccountSynced) onAccountSynced();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error('Error syncing account:', err);
      setError(err.message || 'Failed to sync blockchain account. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`${styles.overlay} ${isAnimating ? styles.open : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget && !isSyncing) onClose();
    }}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} disabled={isSyncing} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={styles.content}>
          <h2 className={styles.title}>Link Blockchain Account</h2>
          <p className={styles.description}>
            Connect a blockchain account to receive rewards and participate in platform features.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          {isConnected && address ? (
            <div className={styles.syncingContainer}>
              <div className={styles.syncingMessage}>
                {isSyncing ? 'Syncing account...' : `Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`}
              </div>
              {!isSyncing && (
                <button className={styles.primaryButton} onClick={handleSyncAccount}>
                  Sync Account
                </button>
              )}
            </div>
          ) : (
            <div className={styles.actions}>
              <p className={styles.helpText}>
                Sign in to connect your blockchain account:
              </p>
              <button className={styles.primaryButton} onClick={handleConnectWallet} disabled={isSyncing}>
                Connect Wallet
              </button>
            </div>
          )}

          <button className={styles.cancelButton} onClick={onClose} disabled={isSyncing}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
