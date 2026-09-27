'use client';

import { useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const AuthenticatedAppShell = dynamic(() =>
  import('./AuthenticatedAppShell').then((mod) => mod.AuthenticatedAppShell)
);

interface RouteShellProps {
  children: ReactNode;
  initialCollapsed?: boolean;
}

export function RouteShell({ children, initialCollapsed = true }: RouteShellProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Disable browser's auto scroll restoration on route changes so pages always mount at top
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    const timeoutId = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  if (
    pathname === '/' ||
    pathname === '/faq' ||
    pathname === '/products-and-services'
  ) {
    return <>{children}</>;
  }

  return (
    <AuthenticatedAppShell initialCollapsed={initialCollapsed}>
      {children}
    </AuthenticatedAppShell>
  );
}
