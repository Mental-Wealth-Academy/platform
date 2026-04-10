'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './MobileBottomNav.module.css';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/home', icon: '/icons/nav-home.svg' },
  { id: 'quests', label: 'Quests', href: '/rewards', icon: '/icons/rewards.svg' },
  { id: 'community', label: 'Community', href: '/community', icon: '/icons/nav-community.svg' },
  { id: 'gallery', label: 'Gallery', href: '/gallery', icon: '/icons/nav-gallery.svg' },
] as const;

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const handleAgentOpen = () => {
    window.dispatchEvent(new Event('toggleBlueChat'));
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className={styles.nav}>
      <button type="button" className={styles.tab} onClick={handleAgentOpen} aria-label="Open Blue agent">
        <Image src="/icons/daemon.svg" alt="" width={24} height={24} className={styles.iconImg} aria-hidden="true" />
        <span className={styles.label}>Blue Chat</span>
      </button>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`${styles.tab} ${isActive(item.href) ? styles.tabActive : ''}`}
          aria-label={item.label}
        >
          <Image src={item.icon} alt="" width={24} height={24} className={styles.iconImg} aria-hidden="true" />
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
