'use client';

import { ReactNode, useLayoutEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  useLayoutEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  return <>{children}</>;
}
