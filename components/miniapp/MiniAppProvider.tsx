'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const hasAttempted = useRef(false);

  // Hide splash screen ASAP
  useLayoutEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  // Auto-sign in mini-app users via Farcaster SDK context
  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    (async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) return;

        // Already authenticated?
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (meData?.user) {
          window.dispatchEvent(new Event('profileUpdated'));
          return;
        }

        // Get FID from SDK context (it's a Promise)
        const context = await sdk.context;
        const fid = context?.user?.fid;
        if (!fid) {
          console.error('[MiniApp] No FID in SDK context');
          return;
        }

        const res = await fetch('/api/auth/farcaster-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fid,
            username: context.user.username || undefined,
            pfpUrl: context.user.pfpUrl || (context.user as any).pfp_url || undefined,
          }),
        });

        if (res.ok) {
          console.log('[MiniApp] Auto-signed in via Farcaster');
          window.dispatchEvent(new Event('profileUpdated'));
        } else {
          console.error('[MiniApp] Farcaster auto-signin failed:', res.status);
        }
      } catch (err) {
        console.error('[MiniApp] Auto-signin error:', err);
      }
    })();
  }, []);

  return <>{children}</>;
}
