'use client';

import { useEffect, useState, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface BaseKitAutoSigninState {
  isBaseKit: boolean;
  walletAddress: string | null;
  isSigningIn: boolean;
  signInError: string | null;
}

/**
 * Hook to detect BaseKit mini-app context and auto-sign in users.
 *
 * Primary path: uses sdk.context to get the user's FID, then calls
 * /api/auth/farcaster-signin which looks up their verified ETH address
 * via Neynar and creates/signs in the account with their Farcaster pfp.
 *
 * Fallback path: if context is unavailable, tries the old
 * eth_requestAccounts → wallet-signup flow.
 */
export function useBaseKitAutoSignin(): BaseKitAutoSigninState {
  const [state, setState] = useState<BaseKitAutoSigninState>({
    isBaseKit: false,
    walletAddress: null,
    isSigningIn: false,
    signInError: null,
  });
  const hasAttemptedSignIn = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkAndSignIn = async () => {
      try {
        // First, check if user already has a valid session
        try {
          const meResponse = await fetch('/api/me', {
            cache: 'no-store',
            credentials: 'include',
          });
          const meData = await meResponse.json();

          if (meData.user) {
            console.log('[BaseKit] User already authenticated:', meData.user.username);
            if (isMounted) {
              setState(prev => ({ ...prev, isBaseKit: false }));
            }
            return;
          }
        } catch (error) {
          console.log('[BaseKit] No existing session, proceeding with auto-signin');
        }

        // Check if we're in a mini-app context
        const isInMiniApp = await sdk.isInMiniApp();

        if (!isInMiniApp) {
          if (isMounted) {
            setState(prev => ({ ...prev, isBaseKit: false }));
          }
          return;
        }

        if (isMounted) {
          setState(prev => ({ ...prev, isBaseKit: true }));
        }

        if (hasAttemptedSignIn.current) return;
        hasAttemptedSignIn.current = true;

        if (isMounted) {
          setState(prev => ({ ...prev, isSigningIn: true }));
        }

        // Primary path: use SDK context to get FID and sign in via Neynar
        let signedIn = false;
        try {
          const context = (sdk as any).context;
          const fid = context?.user?.fid;

          if (fid) {
            console.log('[BaseKit] Got FID from context:', fid);
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
              const data = await response.json();
              console.log('[BaseKit] Farcaster signin successful:', data);
              signedIn = true;

              if (isMounted) {
                setState(prev => ({
                  ...prev,
                  walletAddress: null,
                  isSigningIn: false,
                }));
                window.dispatchEvent(new Event('profileUpdated'));
              }
              return;
            }
            console.warn('[BaseKit] Farcaster signin failed, trying wallet fallback');
          }
        } catch (err) {
          console.warn('[BaseKit] SDK context not available, trying wallet fallback:', err);
        }

        // Fallback path: get wallet via Ethereum provider
        if (!signedIn) {
          try {
            const provider = await sdk.wallet.getEthereumProvider();
            if (!provider || !provider.request) {
              throw new Error('Ethereum provider not available');
            }

            let accounts: string[] = [];
            try {
              const requested = await provider.request({ method: 'eth_requestAccounts' });
              accounts = Array.isArray(requested) ? [...requested] : [];
            } catch {
              const fallback = await provider.request({ method: 'eth_accounts' });
              accounts = Array.isArray(fallback) ? [...fallback] : [];
            }

            if (!accounts.length) throw new Error('No accounts available');

            const walletAddress = accounts[0];
            if (!isMounted) return;

            setState(prev => ({ ...prev, walletAddress }));

            const response = await fetch('/api/auth/wallet-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ walletAddress }),
            });

            const data = await response.json();
            if (!isMounted) return;

            if (response.ok) {
              console.log('[BaseKit] Wallet auto-signin successful:', data);
              setState(prev => ({ ...prev, isSigningIn: false }));
              window.dispatchEvent(new Event('profileUpdated'));
            } else {
              setState(prev => ({
                ...prev,
                isSigningIn: false,
                signInError: data.error || 'Failed to sign in',
              }));
            }
          } catch (error) {
            console.error('[BaseKit] Wallet fallback failed:', error);
            if (isMounted) {
              setState(prev => ({
                ...prev,
                isSigningIn: false,
                signInError: error instanceof Error ? error.message : 'Failed to sign in',
              }));
            }
          }
        }
      } catch (error) {
        console.error('[BaseKit] Error checking mini-app context:', error);
        if (isMounted) {
          setState(prev => ({ ...prev, isBaseKit: false }));
        }
      }
    };

    // Small delay to ensure SDK is ready
    const timer = setTimeout(() => {
      checkAndSignIn();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
