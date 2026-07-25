'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { getPrivyAuthHeaders } from '@/lib/wallet-api';
import ModalShell from '@/components/shared/ModalShell';
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => { if (!isSyncing) onClose(); }}
      title="Link Blockchain Account"
      maxWidth="sm"
    >
      <div className={styles.content}>
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
    </ModalShell>
  );
}
