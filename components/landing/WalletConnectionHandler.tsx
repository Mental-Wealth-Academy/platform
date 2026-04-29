'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import styles from './WalletConnectionHandler.module.css';

interface WalletConnectionHandlerProps {
  onWalletConnected?: (address: string) => void;
  buttonText?: string;
}

export function WalletConnectionHandler({ onWalletConnected, buttonText = 'Connect Wallet' }: WalletConnectionHandlerProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef(false);

  const handleConnection = useCallback(async () => {
    if (processedRef.current || isProcessing) return;
    processedRef.current = true;
    setIsProcessing(true);

    try {
      // Get fresh Privy access token for Authorization header
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Check if user already exists
      const meResponse = await fetch('/api/me', {
        credentials: 'include',
        headers: authHeaders,
      });
      if (meResponse.status >= 500) {
        alert('Server error. Please try again later.');
        return;
      }

      const meData = await meResponse.json().catch(() => ({ user: null }));

      if (meData.user) {
        window.location.replace('/community');
        return;
      }

      // Create account with fresh token
      const signupResponse = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders,
      });

      if (signupResponse.ok) {
        window.location.replace('/community');
      } else {
        const errorData = await signupResponse.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create account. Please try again.');
        processedRef.current = false;
      }
    } catch (error) {
      alert(`An error occurred. Please try again.\n\nError: ${error instanceof Error ? error.message : String(error)}`);
      processedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // When authenticated via Privy, process the connection
  useEffect(() => {
    if (!authenticated || processedRef.current) return;
    handleConnection();
  }, [authenticated, handleConnection]);

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
