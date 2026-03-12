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
 * Wraps the home page content. For first-time users arriving from the landing page:
 * 1. Shows a wallet connect prompt
 * 2. After wallet connects, authenticates the user
 * 3. Reveals the home page (SideNavigation handles onboarding modal)
 *
 * In mini-app context, waits for useBaseKitAutoSignin (in MiniAppProvider) to
 * complete auto-signin before showing any wallet connect overlay.
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const { address, isConnected } = useAccount();
  const { setOpen: openConnectModal } = useModal();

  const [authState, setAuthState] = useState<'checking' | 'needs-wallet' | 'connecting' | 'ready'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const processedRef = useRef<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    (async () => {
      try {
        // Check if we're in a mini-app context — if so, useBaseKitAutoSignin
        // in MiniAppProvider is handling auth, so don't show wallet overlay yet
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp) {
          setIsMiniApp(true);
        }

        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          setAuthState('ready');
          const hasUsername = data.user.username && !data.user.username.startsWith('user_');
          if (hasUsername) {
            onAuthenticated?.();
          }
        } else if (inMiniApp) {
          // In mini-app: stay in 'checking' state — useBaseKitAutoSignin will
          // dispatch 'profileUpdated' when it finishes, which we listen for below
          setAuthState('checking');
        } else {
          setAuthState('needs-wallet');
        }
      } catch {
        setAuthState('needs-wallet');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for profileUpdated event (dispatched by useBaseKitAutoSignin on success)
  useEffect(() => {
    const handleProfileUpdated = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          setAuthState('ready');
          const hasUsername = data.user.username && !data.user.username.startsWith('user_');
          if (hasUsername) {
            onAuthenticated?.();
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, [onAuthenticated]);

  // Fallback: if mini-app auto-signin hasn't completed after 5s, show wallet overlay
  useEffect(() => {
    if (!isMiniApp || authState !== 'checking') return;
    const timeout = setTimeout(() => {
      if (authState === 'checking') {
        console.warn('[HomeWelcomeFlow] Mini-app auto-signin timed out, falling back to wallet connect');
        setAuthState('needs-wallet');
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isMiniApp, authState]);

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

  const handleFarcasterConnect = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Get FID from SDK context
      const context = (sdk as any).context;
      const fid = context?.user?.fid;

      if (!fid) {
        // Not in mini-app or context unavailable — fall back to wallet connect
        console.warn('[HomeWelcomeFlow] No FID in SDK context, falling back to wallet connect');
        openConnectModal(true);
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/auth/farcaster-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fid,
          username: context.user.username || undefined,
          pfpUrl: context.user.pfpUrl || context.user.pfp_url || undefined,
        }),
      });

      if (response.ok) {
        setAuthState('ready');
        window.dispatchEvent(new Event('profileUpdated'));
        onAuthenticated?.();
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('[HomeWelcomeFlow] Farcaster signin failed:', data);
        // Fall back to wallet connect
        openConnectModal(true);
      }
    } catch (err) {
      console.error('[HomeWelcomeFlow] Farcaster connect error:', err);
      openConnectModal(true);
    } finally {
      setIsProcessing(false);
    }
  }, [openConnectModal, onAuthenticated]);

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

          {isMiniApp && (
            <button
              className={styles.farcasterButton}
              onClick={handleFarcasterConnect}
              disabled={isProcessing}
            >
              <svg width="18" height="18" viewBox="0 0 1000 1000" fill="currentColor">
                <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/>
                <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
                <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"/>
              </svg>
              Connect with Farcaster
            </button>
          )}

          {isMiniApp && (
            <p className={styles.footnote}>Your Farcaster identity — no extra steps</p>
          )}
        </div>
      </div>
    </>
  );
}
