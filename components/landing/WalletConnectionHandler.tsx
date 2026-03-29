'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import styles from './WalletConnectionHandler.module.css';

interface WalletConnectionHandlerProps {
  onWalletConnected?: (address: string) => void;
  buttonText?: string;
}

export function WalletConnectionHandler({ onWalletConnected, buttonText = 'Connect Wallet' }: WalletConnectionHandlerProps) {
  const { ready, authenticated, login } = usePrivy();

  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef(false);

  const handleConnection = useCallback(async () => {
    if (processedRef.current || isProcessing) return;
    processedRef.current = true;
    setIsProcessing(true);

    try {
      // Check if user already exists (server reads Privy cookie automatically)
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

      // Create account — server reads Privy cookie for wallet auth
      const signupResponse = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        credentials: 'include',
      });

      if (signupResponse.ok) {
        window.location.replace('/home');
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
