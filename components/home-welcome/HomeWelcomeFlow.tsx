'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import OnboardingModal from '@/components/onboarding/OnboardingModal';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content.
 * - Mini-app: auto-signs in via Farcaster SDK context, shows onboarding for new users.
 * - Browser: redirects unauthenticated users to /join.
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [authState, setAuthState] = useState<'checking' | 'needs-onboarding' | 'ready'>('checking');
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
            setAuthState('needs-onboarding');
          }
          return;
        }

        // Check if we're in a Farcaster mini-app
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) {
          // Browser user without session — send to /join
          router.replace('/join');
          return;
        }

        // Mini-app: auto-sign in via SDK context
        if (farcasterAttempted.current) return;
        farcasterAttempted.current = true;

        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (!fid) {
          console.error('[MiniApp] No FID in SDK context');
          router.replace('/join');
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
            setAuthState('ready');
            onAuthenticated?.();
          } else {
            setAuthState('needs-onboarding');
          }
        } else {
          console.error('[MiniApp] Auto-signin failed:', signInRes.status);
          router.replace('/join');
        }
      } catch (err) {
        console.error('[HomeWelcomeFlow] Auth check error:', err);
        router.replace('/join');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            setAuthState('ready');
            onAuthenticated?.();
          }}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  // Checking or ready — show children
  if (authState === 'ready' || authState === 'checking' || isConnected) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
