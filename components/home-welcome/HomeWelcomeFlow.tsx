'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { sdk } from '@farcaster/miniapp-sdk';
import OnboardingModal from '@/components/onboarding/OnboardingModal';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content.
 * - Checks server session (which now also reads Privy cookie on the server).
 * - Mini-app: auto-signs in via Farcaster SDK context.
 * - Privy-authenticated: auto-creates server session via wallet-signup.
 * - No auth: renders page content (no redirect).
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  const [authState, setAuthState] = useState<'checking' | 'needs-onboarding' | 'ready'>('checking');
  const farcasterAttempted = useRef(false);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      try {
        // 1. Check existing server session (also reads Privy cookie on server)
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({ user: null }));
        if (data?.user) {
          if (data.user.onboardingComplete) {
            setAuthState('ready');
            onAuthenticated?.();
          } else {
            setAuthState('needs-onboarding');
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
                setAuthState('ready');
                onAuthenticated?.();
              } else {
                setAuthState('needs-onboarding');
              }
              return;
            }
          }
        }

        // 3. Privy-authenticated — create server session automatically
        if (authenticated) {
          const signupRes = await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            credentials: 'include',
          });

          if (signupRes.ok) {
            const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
            const meData = await meRes.json().catch(() => ({ user: null }));
            if (meData?.user?.onboardingComplete) {
              setAuthState('ready');
              onAuthenticated?.();
            } else {
              setAuthState('needs-onboarding');
            }
            return;
          }
        }

        // 4. No auth — still render the page (let individual components handle auth)
        setAuthState('ready');
      } catch (err) {
        console.error('[HomeWelcomeFlow] Auth check error:', err);
        setAuthState('ready');
      }
    })();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOnboardingComplete = useCallback((username: string) => {
    setAuthState('ready');
    window.dispatchEvent(new Event('profileUpdated'));
    onAuthenticated?.();
  }, [onAuthenticated]);

  if (authState === 'needs-onboarding') {
    return (
      <>
        {children}
        <OnboardingModal
          isOpen={true}
          onClose={() => {
            setAuthState('ready');
            onAuthenticated?.();
          }}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  return <>{children}</>;
}
