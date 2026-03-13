'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useModal } from 'connectkit';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './HomeWelcomeFlow.module.css';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content.
 * - Mini-app: no overlay — MiniAppProvider auto-signs in via Farcaster SDK context.
 * - Browser: shows wallet connect overlay for unauthenticated users.
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const { address, isConnected } = useAccount();
  const { setOpen: openConnectModal } = useModal();

  const [authState, setAuthState] = useState<'checking' | 'needs-wallet' | 'connecting' | 'ready'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const processedRef = useRef<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    (async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp) {
          setIsMiniApp(true);
          // Mini-app users are auto-signed in by MiniAppProvider — skip overlay
          setAuthState('ready');
          return;
        }

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

  // Listen for profileUpdated (dispatched by MiniAppProvider after auto-signin)
  useEffect(() => {
    if (!isMiniApp) return;

    const handleProfileUpdated = () => {
      setAuthState('ready');
      onAuthenticated?.();
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, [isMiniApp, onAuthenticated]);

  // When wallet connects (browser flow), authenticate the user
  useEffect(() => {
    if (isMiniApp) return;
    if (!isConnected || !address || authState === 'ready' || authState === 'checking') return;
    if (processedRef.current === address || isProcessing) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return;

    (async () => {
      if (processedRef.current === address || isProcessing) return;
      processedRef.current = address;
      setIsProcessing(true);

      try {
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));

        if (meData?.user) {
          setAuthState('ready');
          const hasUsername = meData.user.username && !meData.user.username.startsWith('user_');
          if (hasUsername) {
            onAuthenticated?.();
          }
        } else {
          const signupRes = await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ walletAddress: address }),
          });

          if (signupRes.ok) {
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
  }, [isMiniApp, isConnected, address, authState, isProcessing, onAuthenticated]);

  const handleConnectClick = useCallback(() => {
    setAuthState('connecting');
    openConnectModal(true);
  }, [openConnectModal]);

  // Mini-app: always render children (no overlay ever)
  if (isMiniApp) {
    return <>{children}</>;
  }

  // Browser: authenticated or checking
  if (authState === 'ready' || authState === 'checking' || isConnected) {
    return <>{children}</>;
  }

  // Browser: needs wallet connect — show welcome overlay
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
            <Image src="/icons/family.svg" alt="Family" width={44} height={44} />
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Connect Family Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
