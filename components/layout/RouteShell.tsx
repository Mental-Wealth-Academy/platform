'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const AuthenticatedAppShell = dynamic(() =>
  import('./AuthenticatedAppShell').then((mod) => mod.AuthenticatedAppShell)
);

interface RouteShellProps {
  children: ReactNode;
  initialCollapsed: boolean;
}

export function RouteShell({ children, initialCollapsed }: RouteShellProps) {
  const pathname = usePathname();

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <AuthenticatedAppShell initialCollapsed={initialCollapsed}>
      {children}
    </AuthenticatedAppShell>
  );
}
