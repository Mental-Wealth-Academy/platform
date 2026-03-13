'use client';

import { ReactNode, useLayoutEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  // Use useLayoutEffect to call ready() synchronously before paint
  // This ensures the splash screen is hidden as early as possible
  useLayoutEffect(() => {
    // Call ready() immediately to hide the splash screen
    // This must be called as soon as the app is ready to be displayed
    const readyPromise = sdk.actions.ready();
    
    // Await the promise to ensure it completes
    (async () => {
      try {
        await readyPromise;
      } catch (error) {
        // Silently fail if not in mini app context (expected behavior)
        // Only log in development for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('[MiniApp] SDK ready() called (may fail if not in mini app context):', error);
        }
      }
    })();
  }, []);

  return <>{children}</>;
}
