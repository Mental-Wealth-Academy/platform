'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { sdk } from '@farcaster/miniapp-sdk';
import { getPrivyAuthHeaders } from '@/lib/wallet-api';
import AzuraOnboarding from '@/components/azura-onboarding/AzuraOnboarding';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import styles from './page.module.css';

type JoinState = 'checking' | 'intro' | 'sign-in' | 'connecting' | 'needs-onboarding' | 'done';

export default function JoinPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { login, getAccessToken } = usePrivy();

  const [state, setState] = useState<JoinState>('checking');
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef<string | null>(null);
  const farcasterAttempted = useRef(false);

  // On mount: check if already authenticated
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          if (data.user.onboardingComplete) {
            router.replace('/home');
            return;
          }
          setState('needs-onboarding');
          return;
        }

        // Check for Farcaster mini-app auto-sign-in
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp && !farcasterAttempted.current) {
          farcasterAttempted.current = true;
          const context = await sdk.context;
          const fid = context?.user?.fid;
          if (fid) {
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
              window.dispatchEvent(new Event('profileUpdated'));
              if (signInData.existing) {
                router.replace('/home');
                return;
              }
              setState('needs-onboarding');
              return;
            }
          }
        }

        // Show Azura intro for new users
        setState('intro');
      } catch (err) {
        console.error('[JoinPage] Auth check error:', err);
        setState('intro');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When wallet connects after Privy login, create account
  useEffect(() => {
    if (!isConnected || !address || state === 'done' || state === 'checking' || state === 'intro') return;
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
            router.replace('/home');
          } else {
            setState('needs-onboarding');
          }
        } else {
          const authHeaders = await getPrivyAuthHeaders(getAccessToken);
          const signupRes = await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            credentials: 'include',
            body: JSON.stringify({ walletAddress: address }),
          });

          if (signupRes.ok) {
            setState('needs-onboarding');
          } else {
            console.error('Wallet signup failed:', signupRes.status);
            setState('intro');
          }
        }
      } catch (err) {
        console.error('Auth flow error:', err);
        setState('intro');
      } finally {
        setIsProcessing(false);
      }
    })();
  }, [isConnected, address, state, isProcessing, router]);

  const handleIntroComplete = useCallback(() => {
    setState('sign-in');
    login();
  }, [login]);

  const handleOnboardingComplete = useCallback((username: string) => {
    setState('done');
    window.dispatchEvent(new Event('profileUpdated'));
    router.replace('/home');
  }, [router]);

  // Checking — blank
  if (state === 'checking' || state === 'done') {
    return <div className={styles.page} />;
  }

  // Azura intro dialogue
  if (state === 'intro') {
    return (
      <div className={styles.page}>
        <AzuraOnboarding onComplete={handleIntroComplete} />
      </div>
    );
  }

  // Onboarding modal (avatar + username)
  if (state === 'needs-onboarding') {
    return (
      <div className={styles.page}>
        <OnboardingModal
          isOpen={true}
          onClose={() => {
            router.replace('/home');
          }}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  // sign-in / connecting — Privy modal is open, show waiting state
  return (
    <div className={styles.page}>
      <div className={styles.waitingCard}>
        <div className={styles.spinner} />
        <p className={styles.waitingText}>Connecting...</p>
      </div>
    </div>
  );
}
