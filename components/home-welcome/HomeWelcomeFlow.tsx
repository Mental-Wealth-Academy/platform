'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useModal } from 'connectkit';
import styles from './HomeWelcomeFlow.module.css';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content. For first-time users arriving from the landing page:
 * 1. Shows a wallet connect prompt
 * 2. After wallet connects, authenticates the user
 * 3. Reveals the home page (SideNavigation handles onboarding modal)
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const { address, isConnected } = useAccount();
  const { setOpen: openConnectModal } = useModal();

  const [authState, setAuthState] = useState<'checking' | 'needs-wallet' | 'connecting' | 'ready'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          setAuthState('ready');
          const hasUsername = data.user.username && !data.user.username.startsWith('user_');
          if (hasUsername) {
            onAuthenticated?.();
          }
        } else {
          setAuthState('needs-wallet');
        }
      } catch {
        setAuthState('needs-wallet');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When wallet connects, authenticate the user
  useEffect(() => {
    if (!isConnected || !address || authState === 'ready' || authState === 'checking') return;
    if (processedRef.current === address || isProcessing) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return;

    (async () => {
      if (processedRef.current === address || isProcessing) return;
      processedRef.current = address;
      setIsProcessing(true);

      try {
        // Check if user exists
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));

        if (meData?.user) {
          setAuthState('ready');
          const hasUsername = meData.user.username && !meData.user.username.startsWith('user_');
          if (hasUsername) {
            onAuthenticated?.();
          }
        } else {
          // Create account
          const signupRes = await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ walletAddress: address }),
          });

          if (signupRes.ok) {
            // SideNavigation will detect the temp username and show OnboardingModal
            setAuthState('ready');
          } else {
            console.error('Wallet signup failed');
            setAuthState('needs-wallet');
            processedRef.current = null;
          }
        }
      } catch (err) {
        console.error('Auth flow error:', err);
        setAuthState('needs-wallet');
        processedRef.current = null;
      } finally {
        setIsProcessing(false);
      }
    })();
  }, [isConnected, address, authState, isProcessing, onAuthenticated]);

  const handleConnectClick = useCallback(() => {
    setAuthState('connecting');
    openConnectModal(true);
  }, [openConnectModal]);

  // Already authenticated or needs onboarding (SideNavigation handles the modal)
  if (authState === 'ready') {
    return <>{children}</>;
  }

  // Checking auth — show nothing (brief flash)
  if (authState === 'checking') {
    return <>{children}</>;
  }

  // Wallet already connected but session not yet established — show content while auth processes
  if (isConnected) {
    return <>{children}</>;
  }

  // Needs wallet connect — show welcome overlay
  return (
    <>
      {children}
      <div className={styles.overlay}>
        <div className={styles.welcomeCard}>
          {/* Scrolling angel preview */}
          <div className={styles.angelScroll}>
            <div className={styles.angelTrack}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <Image
                  key={`a-${num}`}
                  src={`/anbel${String(num).padStart(2, '0')}.png`}
                  alt=""
                  width={72}
                  height={72}
                  className={styles.angelThumb}
                  unoptimized
                />
              ))}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <Image
                  key={`b-${num}`}
                  src={`/anbel${String(num).padStart(2, '0')}.png`}
                  alt=""
                  width={72}
                  height={72}
                  className={styles.angelThumb}
                  unoptimized
                />
              ))}
            </div>
          </div>

          <div className={styles.welcomeIcon}>
            <Image src="/icons/wallet-key.svg" alt="Wallet" width={40} height={40} />
          </div>

          <h2 className={styles.welcomeTitle}>Welcome to Mental Wealth Academy</h2>
          <p className={styles.welcomeDesc}>
            Connect your family wallet to begin your journey. Your wallet is your identity — no passwords, no emails.
          </p>

          <button
            className={styles.connectButton}
            onClick={handleConnectClick}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className={styles.spinner} />
                Connecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
                </svg>
                Connect Family Wallet
              </>
            )}
          </button>

          <p className={styles.footnote}>
            Base network &middot; Powered by WalletConnect
          </p>
        </div>
      </div>
    </>
  );
}
