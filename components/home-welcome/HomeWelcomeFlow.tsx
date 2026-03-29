'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { sdk } from '@farcaster/miniapp-sdk';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import styles from './HomeWelcomeFlow.module.css';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content.
 * - Mini-app: auto-signs in via Farcaster SDK context, shows onboarding for new users.
 * - Browser: shows wallet connect overlay for unauthenticated users.
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();

  const [authState, setAuthState] = useState<'checking' | 'needs-wallet' | 'needs-onboarding' | 'connecting' | 'ready'>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef<string | null>(null);
  const farcasterAttempted = useRef(false);

  // On mount: detect context and auto-sign in
  useEffect(() => {
    (async () => {
      try {
        // Already have a session?
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          if (data.user.onboardingComplete) {
            setAuthState('ready');
            onAuthenticated?.();
          } else {
            // User exists but hasn't selected avatar/username yet
            setAuthState('needs-onboarding');
          }
          return;
        }

        // Check if we're in a Farcaster mini-app
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) {
          setAuthState('needs-wallet');
          return;
        }

        // Mini-app: auto-sign in via SDK context
        if (farcasterAttempted.current) return;
        farcasterAttempted.current = true;

        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (!fid) {
          console.error('[MiniApp] No FID in SDK context');
          setAuthState('needs-wallet');
          return;
        }

        console.log('[MiniApp] Auto-signing in with FID:', fid);
        const signInRes = await fetch('/api/auth/farcaster-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fid,
            username: context.user.username || undefined,
            pfpUrl: context.user.pfpUrl || (context.user as any).pfp_url || undefined,
          }),
        });

        if (signInRes.ok) {
          const signInData = await signInRes.json().catch(() => ({}));
          console.log('[MiniApp] Auto-signin successful, existing:', signInData.existing);
          window.dispatchEvent(new Event('profileUpdated'));

          if (signInData.existing) {
            // Returning user — go straight to home
            setAuthState('ready');
            onAuthenticated?.();
          } else {
            // New user — show avatar + username onboarding
            setAuthState('needs-onboarding');
          }
        } else {
          console.error('[MiniApp] Auto-signin failed:', signInRes.status);
          setAuthState('needs-wallet');
        }
      } catch (err) {
        console.error('[HomeWelcomeFlow] Auth check error:', err);
        setAuthState('needs-wallet');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Browser flow: when wallet connects, authenticate
  useEffect(() => {
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
          if (meData.user.onboardingComplete) {
            setAuthState('ready');
            onAuthenticated?.();
          } else {
            setAuthState('needs-onboarding');
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
  }, [isConnected, address, authState, isProcessing, onAuthenticated]);

  const handleConnectClick = useCallback(() => {
    setAuthState('connecting');
    login();
  }, [login]);

  const handleOnboardingComplete = useCallback((username: string) => {
    console.log('[HomeWelcomeFlow] Onboarding complete:', username);
    setAuthState('ready');
    window.dispatchEvent(new Event('profileUpdated'));
    onAuthenticated?.();
  }, [onAuthenticated]);

  // Needs onboarding — show children with OnboardingModal overlay
  if (authState === 'needs-onboarding') {
    return (
      <>
        {children}
        <OnboardingModal
          isOpen={true}
          onClose={() => {
            // Allow dismissing but still mark as ready
            setAuthState('ready');
            onAuthenticated?.();
          }}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  // Checking or ready — show children (no overlay)
  if (authState === 'ready' || authState === 'checking' || isConnected) {
    return <>{children}</>;
  }

  // Browser: needs wallet connect — show welcome overlay
  return (
    <>
      {children}
      <div className={styles.overlay}>
        <div className={styles.welcomeCard}>
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

          <h2 className={styles.welcomeTitle}>Welcome to Mental Wealth Academy</h2>
          <p className={styles.welcomeDesc}>
            Sign in to begin your journey. Connect a wallet, use your email, or sign in with Farcaster.
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
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
