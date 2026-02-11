'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount, useDisconnect, useConnect, useSignMessage } from 'wagmi';
import { getWalletAuthHeaders } from '@/lib/wallet-api';
import styles from './WalletConnectionHandler.module.css';

interface WalletConnectionHandlerProps {
  onWalletConnected?: (address: string) => void;
  buttonText?: string;
}

/**
 * Handles wallet connection, user authentication, and account creation.
 * This component manages the full flow from wallet connection to onboarding.
 */
export function WalletConnectionHandler({ onWalletConnected, buttonText = 'Connect Wallet' }: WalletConnectionHandlerProps) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAddress, setProcessedAddress] = useState<string | null>(null);
  const [hasTriggeredOnboarding, setHasTriggeredOnboarding] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null); // null = checking, true/false = known
  const processingRef = useRef<string | null>(null); // Track which address is currently being processed

  // Handle wallet connection and user check/creation
  useEffect(() => {
    // Don't process if not connected, already processing, no address, or already processed
    if (!isConnected) {
      return;
    }
    
    if (isProcessing) {
      return;
    }
    
    if (!address) {
      return;
    }
    
    if (processedAddress === address) {
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return;
    }
    
    if (processingRef.current === address) {
      return;
    }
    
    // Wait for connection to be fully established before processing
    (async () => {
      // Double-check we're not already processing (race condition protection)
      if (isProcessing || processedAddress === address || processingRef.current === address) {
        return;
      }
      
      // Wait for wallet to fully initialize after connection
      const delay = 500;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Verify wallet is still connected and address is still available after wait
      if (!isConnected || !address || processedAddress === address) {
        return;
      }
      
      // Final validation before processing
      if (address && /^0x[a-fA-F0-9]{40}$/.test(address) && processedAddress !== address && !isProcessing) {
        handleWalletConnection(address);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isProcessing, processedAddress]);

  // Check if user has an account on mount
  useEffect(() => {
    const checkAccount = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({ user: null }));
        setHasAccount(!!data.user);
      } catch (error) {
        console.error('Failed to check account:', error);
        setHasAccount(false);
      }
    };
    checkAccount();

    const handleLogin = () => {
      setTimeout(checkAccount, 500);
    };
    window.addEventListener('userLoggedIn', handleLogin);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleLogin);
    };
  }, []);

  // Reset processed address when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setProcessedAddress(null);
      setHasTriggeredOnboarding(false);
      setIsProcessing(false);
      processingRef.current = null;
    }
  }, [isConnected]);

  // Listen for profile updates to re-check if profile is now complete
  useEffect(() => {
    const handleProfileUpdate = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isConnected && address && !isProcessing) {
        setProcessedAddress(null);
        setTimeout(() => {
          if (address) {
            handleWalletConnection(address);
          }
        }, 100);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isProcessing]);

  const handleWalletConnection = async (walletAddress: string) => {
    // Prevent duplicate processing
    if (processingRef.current === walletAddress || isProcessing) {
      return;
    }
    
    // Mark as processing immediately to prevent duplicate calls
    processingRef.current = walletAddress;
    setIsProcessing(true);
    
    // Validate wallet address format before proceeding
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      processingRef.current = null;
      setIsProcessing(false);
      if (isConnected) {
        // Retry once if address not available yet
        const currentAddress = address;
        setTimeout(() => {
          if (currentAddress && /^0x[a-fA-F0-9]{40}$/.test(currentAddress) && currentAddress !== processedAddress) {
            handleWalletConnection(currentAddress);
          } else {
            alert('Wallet address not available. Please disconnect and reconnect your wallet.');
          }
        }, 1000);
      } else {
        alert('Invalid wallet address. Please reconnect your wallet.');
      }
      return;
    }
    
    setProcessedAddress(walletAddress);
    
    try {
      // Check if user exists with this wallet address (no signature required)
      const meResponse = await fetch('/api/me', {
        credentials: 'include',
      });
      
      // Handle server errors (5xx) - don't proceed with signup, show error
      if (meResponse.status >= 500) {
        alert('Server error. Please try again later. If this persists, the database may not be configured.');
        processingRef.current = null;
        setIsProcessing(false);
        return;
      }
      
      const meData = await meResponse.json().catch(() => ({ user: null }));
      
      if (meData.user) {
        // User exists - check profile completeness
        const hasUsername = meData.user.username && !meData.user.username.startsWith('user_');
        const profileResponse = await fetch('/api/profile', {
          credentials: 'include',
        });
        
        // Only username is required for complete profile - birthday/gender are optional
        const hasCompleteProfile = hasUsername;
        console.log('Profile completeness check:', { hasUsername, hasCompleteProfile });
        
        // User exists - redirect to home page
        window.location.replace('/home');
      } else {
        // User doesn't exist - create account; require signed message for auth
        const authHeaders = await getWalletAuthHeaders(address ?? undefined, signMessageAsync);
        const signupResponse = await fetch('/api/auth/wallet-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        
        if (signupResponse.ok) {
          // Verify account was actually created
          const verifyResponse = await fetch('/api/me', {
            credentials: 'include',
          });
          const verifyData = await verifyResponse.json().catch(() => ({ user: null }));
          
          if (verifyData.user) {
            window.location.replace('/home');
          } else {
            processingRef.current = null;
            alert('Account creation may have failed. Please disconnect and reconnect your wallet to try again.');
          }
        } else {
          processingRef.current = null;
          let errorMessage = 'Failed to create account. Please disconnect and reconnect your wallet to try again.';
          try {
            const errorData = await signupResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            try {
              const text = await signupResponse.text();
              errorMessage = `Failed to create account (${signupResponse.status}): ${text.substring(0, 200)}`;
            } catch (e) {
              errorMessage = `Failed to create account (${signupResponse.status} ${signupResponse.statusText})`;
            }
          }
          
          alert(errorMessage);
        }
      }
    } catch (error) {
      processingRef.current = null;
      const errorMessage = `An error occurred. Please disconnect your wallet and try again.\n\nError: ${error instanceof Error ? error.message : String(error)}`;
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
      processingRef.current = null;
    }
  };

  const handleConnectClick = () => {
    if (hasAccount === null) {
      return;
    }

    // Connect with WalletConnect
    const walletConnector = connectors[0];
    if (walletConnector) {
      connect({ connector: walletConnector });
    }
  };

  return (
    <div className={styles.walletButtonWrapper}>
      <button
        type="button"
        className={styles.connectWallet}
        onClick={handleConnectClick}
        disabled={isProcessing || hasAccount === null}
      >
        {isProcessing ? 'Processing...' : hasAccount === null ? 'Checking...' : buttonText}
      </button>
    </div>
  );
}
