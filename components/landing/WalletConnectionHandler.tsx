'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getPrivyAuthHeaders } from '@/lib/wallet-api';
import styles from './WalletConnectionHandler.module.css';

interface WalletConnectionHandlerProps {
  onWalletConnected?: (address: string) => void;
  buttonText?: string;
}

export function WalletConnectionHandler({ onWalletConnected, buttonText = 'Connect Wallet' }: WalletConnectionHandlerProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAddress, setProcessedAddress] = useState<string | null>(null);
  const processingRef = useRef<string | null>(null);

  const address = wallets[0]?.address;

  const handleWalletConnection = useCallback(async (walletAddress: string) => {
    if (processingRef.current === walletAddress || isProcessing) return;
    processingRef.current = walletAddress;
    setIsProcessing(true);

    try {
      // Check if user exists
      const meResponse = await fetch('/api/me', { credentials: 'include' });
      if (meResponse.status >= 500) {
        alert('Server error. Please try again later.');
        return;
      }

      const meData = await meResponse.json().catch(() => ({ user: null }));

      if (meData.user) {
        window.location.replace('/home');
        return;
      }

      // Create account with Privy auth
      const headers = await getPrivyAuthHeaders(getAccessToken);
      const signupResponse = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify({ walletAddress }),
      });

      if (signupResponse.ok) {
        window.location.replace('/home');
      } else {
        const errorData = await signupResponse.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      alert(`An error occurred. Please try again.\n\nError: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = null;
    }
  }, [isProcessing, getAccessToken]);

  // When authenticated with a wallet, process the connection
  useEffect(() => {
    if (!authenticated || !address || processedAddress === address) return;
    setProcessedAddress(address);
    handleWalletConnection(address);
  }, [authenticated, address, processedAddress, handleWalletConnection]);

  const handleClick = () => {
    if (!ready || isProcessing) return;
    login();
  };

  return (
    <div className={styles.walletButtonWrapper}>
      <button
        type="button"
        className={styles.connectWallet}
        onClick={handleClick}
        disabled={isProcessing || !ready}
      >
        {isProcessing ? 'Processing...' : !ready ? 'Loading...' : buttonText}
      </button>
    </div>
  );
}
