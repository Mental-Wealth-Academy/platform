'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { sdk } from '@farcaster/miniapp-sdk';
import AzuraOnboarding from '@/components/azura-onboarding/AzuraOnboarding';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import styles from './page.module.css';

type JoinState = 'loading' | 'intro' | 'sign-in' | 'needs-onboarding' | 'done';

export default function JoinPage() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();

  const [state, setState] = useState<JoinState>('loading');
  const farcasterAttempted = useRef(false);
  const signupAttempted = useRef(false);

  // Create server-side account/session using Privy cookie auth.
  // The backend reads the privy-token cookie automatically — no explicit headers needed.
  const createAccountAndRoute = useCallback(async () => {
    if (signupAttempted.current) return false;
    signupAttempted.current = true;

    try {
      const signupRes = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        credentials: 'include',
      });

      if (!signupRes.ok) {
        console.error('Wallet signup failed:', signupRes.status);
        signupAttempted.current = false;
        return false;
      }

      // Session created — check onboarding status
      const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
      const meData = await meRes.json().catch(() => ({ user: null }));

      if (meData?.user?.onboardingComplete) {
        router.replace('/home');
      } else {
        setState('needs-onboarding');
      }
      return true;
    } catch (err) {
      console.error('Account creation error:', err);
      signupAttempted.current = false;
      return false;
    }
  }, [router]);

  // Primary auth check — runs once Privy SDK is ready
  useEffect(() => {
    if (!ready) return;

    (async () => {
      try {
        // 1. Check for existing server session (also reads Privy cookie on server)
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          if (data.user.onboardingComplete) {
            router.replace('/home');
          } else {
            setState('needs-onboarding');
          }
          return;
        }

        // 2. Farcaster mini-app auto-sign-in
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
              } else {
                setState('needs-onboarding');
              }
              return;
            }
          }
        }

        // 3. Already Privy-authenticated — create account directly (skip intro)
        if (authenticated) {
          const ok = await createAccountAndRoute();
          if (ok) return;
        }

        // 4. Not authenticated — show intro for new users
        setState('intro');
      } catch (err) {
        console.error('[JoinPage] Auth check error:', err);
        setState('intro');
      }
    })();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // After Privy login completes (user went through intro → sign-in), create account
  useEffect(() => {
    if (state !== 'sign-in' || !authenticated) return;
    createAccountAndRoute();
  }, [state, authenticated, createAccountAndRoute]);

  const handleIntroComplete = useCallback(() => {
    setState('sign-in');
    login();
  }, [login]);

  const handleOnboardingComplete = useCallback((username: string) => {
    setState('done');
    window.dispatchEvent(new Event('profileUpdated'));
    router.replace('/home');
  }, [router]);

  if (state === 'loading' || state === 'done') {
    return <div className={styles.page} />;
  }

  if (state === 'intro') {
    return (
      <div className={styles.page}>
        <AzuraOnboarding onComplete={handleIntroComplete} />
      </div>
    );
  }

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

  // sign-in state — Privy modal is open, waiting for auth
  return (
    <div className={styles.page}>
      <div className={styles.waitingCard}>
        <div className={styles.spinner} />
        <p className={styles.waitingText}>Connecting...</p>
      </div>
    </div>
  );
}
