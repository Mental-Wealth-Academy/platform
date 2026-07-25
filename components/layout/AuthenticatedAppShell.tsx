'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarStateProvider } from '@/components/side-navigation/SidebarStateProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ConditionalWeb3Provider } from '@/components/web3/ConditionalWeb3Provider';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import TopNavigation from '@/components/top-navigation/TopNavigation';
import MobileBottomNav from '@/components/mobile-bottom-nav/MobileBottomNav';
import AcademyAccessGate from '@/components/auth/AcademyAccessGate';
import ScrollingBanner from '@/components/banner/ScrollingBanner';
import PreorderModal from '@/components/preorder-modal/PreorderModal';
import SupportTab from '@/components/support/SupportTab';

interface AuthenticatedAppShellProps {
  children: ReactNode;
  initialCollapsed: boolean;
}

/* Internal surfaces that have never carried the left rail. Everything else
   under the shell gets the one persistent SideNavigation instance below. */
const SIDE_NAV_EXCLUDED_PREFIXES = ['/admin', '/dev', '/guidebook', '/style-guide'];

export function AuthenticatedAppShell({
  children,
  initialCollapsed,
}: AuthenticatedAppShellProps) {
  const [preorderOpen, setPreorderOpen] = useState(false);
  const pathname = usePathname();

  const showSideNav = !SIDE_NAV_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(prefix + '/')
  );

  useEffect(() => {
    document.documentElement.style.setProperty('--banner-height', '38px');
    return () => {
      document.documentElement.style.removeProperty('--banner-height');
    };
  }, []);

  return (
    <SidebarStateProvider initialCollapsed={initialCollapsed}>
      <ConditionalWeb3Provider>
        <ThemeProvider>
          <ScrollingBanner onClick={() => setPreorderOpen(true)} />
          <TopNavigation />
          {showSideNav && <SideNavigation />}
          <div style={{ marginTop: 'var(--banner-height, 0px)' }}>
            <AcademyAccessGate>{children}</AcademyAccessGate>
          </div>
          <MobileBottomNav />
          <PreorderModal isOpen={preorderOpen} onClose={() => setPreorderOpen(false)} />
          <SupportTab />
        </ThemeProvider>
      </ConditionalWeb3Provider>
    </SidebarStateProvider>
  );
}
