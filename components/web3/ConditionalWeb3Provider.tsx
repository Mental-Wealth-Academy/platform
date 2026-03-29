'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { WalletErrorBoundary } from './WalletErrorBoundary';

const Web3Provider = dynamic(
  () => import('./Web3Provider').then(mod => ({ default: mod.Web3Provider })),
  {
    ssr: false,
    loading: () => null,
  }
);

export function ConditionalWeb3Provider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Landing page doesn't need wallet/auth providers
  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <WalletErrorBoundary>
      <Web3Provider>{children}</Web3Provider>
    </WalletErrorBoundary>
  );
}
