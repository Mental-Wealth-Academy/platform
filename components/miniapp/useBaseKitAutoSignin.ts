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
 * Hook to detect BaseKit mini-app context and auto-sign in users
 * Returns the wallet address if available and handles auto-signin
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
        // This prevents infinite reload loops
        try {
          const meResponse = await fetch('/api/me', {
            cache: 'no-store',
            credentials: 'include',
          });
          const meData = await meResponse.json();
          
          if (meData.user) {
            // User is already authenticated, no need to sign in
            console.log('[BaseKit] User already authenticated:', meData.user.username);
            if (isMounted) {
              setState(prev => ({ 
                ...prev, 
                isBaseKit: false, // Not in mini-app sign-in flow
              }));
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

        // Get the Ethereum provider
        const provider = await sdk.wallet.getEthereumProvider();
        
        if (!provider || !provider.request) {
          console.warn('[BaseKit] Ethereum provider not available');
          return;
        }

        // Request accounts (this may prompt user if not already connected)
        let accounts: string[] = [];
        try {
          const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' });
          accounts = Array.isArray(requestedAccounts) ? [...requestedAccounts] : [];
        } catch (error) {
          console.warn('[BaseKit] Failed to request accounts:', error);
          // Try eth_accounts as fallback (won't prompt)
          try {
            const fallbackAccounts = await provider.request({ method: 'eth_accounts' });
            accounts = Array.isArray(fallbackAccounts) ? [...fallbackAccounts] : [];
          } catch (fallbackError) {
            console.warn('[BaseKit] Failed to get accounts:', fallbackError);
            return;
          }
        }

        if (!Array.isArray(accounts) || accounts.length === 0) {
          console.warn('[BaseKit] No accounts available');
          return;
        }

        const walletAddress = accounts[0];
        
        if (!isMounted) return;

        setState(prev => ({ 
          ...prev, 
          walletAddress,
        }));

        // Auto-sign in if we haven't already attempted
        if (!hasAttemptedSignIn.current && walletAddress) {
          hasAttemptedSignIn.current = true;
          
          if (isMounted) {
            setState(prev => ({ ...prev, isSigningIn: true }));
          }

          try {
            // Sign auth message (must match server: lib/wallet-auth.ts)
            const timestamp = Date.now().toString();
            const message = `Sign in to Mental Wealth Academy\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
            let signature: string;
            try {
              signature = await provider.request({
                method: 'personal_sign',
                params: [message, walletAddress],
              }) as string;
            } catch (signErr) {
              console.warn('[BaseKit] User rejected or signing failed:', signErr);
              if (isMounted) setState(prev => ({ ...prev, isSigningIn: false, signInError: 'Signature required to sign in.' }));
              return;
            }
            const authHeader = `Bearer ${walletAddress}:${signature}:${timestamp}`;
            const response = await fetch('/api/auth/wallet-signup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              credentials: 'include',
              body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!isMounted) return;

            if (response.ok) {
              console.log('[BaseKit] Auto-signin successful:', data);
              // Session cookie is now set - no need to reload
              // Just update state to indicate sign-in is complete
              setState(prev => ({ 
                ...prev, 
                isSigningIn: false,
              }));
              
              // Dispatch event to notify other components that user is now signed in
              window.dispatchEvent(new Event('profileUpdated'));
            } else {
              console.error('[BaseKit] Auto-signin failed:', data);
              setState(prev => ({ 
                ...prev, 
                isSigningIn: false,
                signInError: data.error || 'Failed to sign in',
              }));
            }
          } catch (error) {
            console.error('[BaseKit] Auto-signin error:', error);
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
