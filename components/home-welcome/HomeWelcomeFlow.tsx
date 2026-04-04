'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLoginToMiniApp } from '@privy-io/react-auth/farcaster';
import { sdk } from '@farcaster/miniapp-sdk';
import OnboardingModal from '@/components/onboarding/OnboardingModal';

interface HomeWelcomeFlowProps {
  children: React.ReactNode;
  onAuthenticated?: () => void;
}

/**
 * Wraps the home page content.
 * - Checks server session (which now also reads Privy cookie on the server).
 * - Mini-app: auto-signs in via Privy useLoginToMiniApp (SIWF).
 * - Privy-authenticated: auto-creates server session via wallet-signup.
 * - No auth: renders page content (no redirect).
 */
export default function HomeWelcomeFlow({ children, onAuthenticated }: HomeWelcomeFlowProps) {
  const router = useRouter();
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();

  const [authState, setAuthState] = useState<'checking' | 'needs-onboarding' | 'ready'>('checking');
  const farcasterAttempted = useRef(false);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      try {
        // 1. If Privy says authenticated, check existing user via server
        if (authenticated) {
          const token = await getAccessToken();
          const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch('/api/me', {
            credentials: 'include',
            cache: 'no-store',
            headers: authHeaders,
          });
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
        }

        // 2. Farcaster mini-app auto-sign-in via Privy SIWF
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp && !authenticated && !farcasterAttempted.current) {
          farcasterAttempted.current = true;
          try {
            const { nonce } = await initLoginToMiniApp();
            const result = await sdk.actions.signIn({ nonce });
            if (result?.message && result?.signature) {
              await loginToMiniApp({
                message: result.message,
                signature: result.signature,
              });
              // Privy is now authenticated -- fall through to step 3
            }
          } catch (err) {
            console.error('[HomeWelcomeFlow] Farcaster SIWF login failed:', err);
          }
        }

        // 3. Privy-authenticated — create server session automatically
        if (authenticated || farcasterAttempted.current) {
          const token = await getAccessToken();
          if (!token) {
            setAuthState('ready');
            return;
          }
          const authHeaders: HeadersInit = { Authorization: `Bearer ${token}` };

          // Back-fill Farcaster profile data on the server session
          const fcProfile = user?.farcaster;
          const signupRes = await fetch('/api/auth/wallet-signup', {
            method: 'POST',
            credentials: 'include',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              farcasterUsername: fcProfile?.username || undefined,
              farcasterPfp: fcProfile?.pfp || undefined,
            }),
          });

          if (signupRes.ok) {
            window.dispatchEvent(new Event('profileUpdated'));
            const meRes = await fetch('/api/me', {
              credentials: 'include',
              cache: 'no-store',
              headers: authHeaders,
            });
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
  }, [ready, authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

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
