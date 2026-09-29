'use client';

import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const AuthenticatedAppShell = dynamic(() =>
  import('./AuthenticatedAppShell').then((mod) => mod.AuthenticatedAppShell)
);

interface RouteShellProps {
  children: ReactNode;
  initialCollapsed?: boolean;
}

export function RouteShell({ children, initialCollapsed = true }: RouteShellProps) {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    // Disable browser's auto scroll restoration on route changes so pages always mount at top
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    resetScroll();

    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      resetScroll();
      raf2 = requestAnimationFrame(resetScroll);
    });

    const t1 = setTimeout(resetScroll, 0);
    const t2 = setTimeout(resetScroll, 25);
    const t3 = setTimeout(resetScroll, 100);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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
