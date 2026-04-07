'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './MobileBottomNav.module.css';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const handleMenuOpen = () => {
    window.dispatchEvent(new Event('toggleSidebar'));
  };

  return (
    <nav className={styles.nav}>
      {/* Menu */}
      <button type="button" className={styles.tab} onClick={handleMenuOpen} aria-label="Menu">
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="5" width="18" height="2" rx="1" />
          <rect x="3" y="11" width="18" height="2" rx="1" />
          <rect x="3" y="17" width="18" height="2" rx="1" />
        </svg>
        <span className={styles.label}>Menu</span>
      </button>

      {/* The Course */}
      <Link href="/home" className={`${styles.tab} ${pathname === '/home' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.5 2A2.5 2.5 0 004 4.5v15A2.5 2.5 0 006.5 22H20V2H6.5zM6 19.5a.5.5 0 01.5-.5H18v1H6.5a.5.5 0 01-.5-.5z" />
        </svg>
        <span className={styles.label}>The Course</span>
      </Link>

      {/* Rewards */}
      <Link href="/rewards" className={`${styles.tab} ${pathname === '/rewards' ? styles.tabActive : ''}`}>
        <Image src="/icons/rewards.svg" alt="" width={22} height={22} className={styles.iconImg} />
        <span className={styles.label}>Rewards</span>
      </Link>

      {/* Pet */}
      <Link href="/digipet" className={`${styles.tab} ${pathname === '/digipet' ? styles.tabActive : ''}`}>
        <Image src="/icons/nav-teleport.svg" alt="" width={22} height={22} className={styles.iconImg} />
        <span className={styles.label}>Pet</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
