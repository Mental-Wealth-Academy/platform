'use client';

import React from 'react';
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
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className={styles.label}>Menu</span>
      </button>

      {/* The Course */}
      <Link href="/home" className={`${styles.tab} ${pathname === '/home' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13zM6.5 17H20v2.5H6.5a.5.5 0 010-1H20" />
          <path d="M8 7h8v2H8z" opacity="0.7" />
        </svg>
        <span className={styles.label}>The Course</span>
      </Link>

      {/* Pet */}
      <Link href="/digipet" className={`${styles.tab} ${pathname === '/digipet' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.5 9.5C4.5 7 6 5 6 5s1.5 2 1.5 4.5S6 14 6 14s-1.5-2-1.5-4.5z" />
          <path d="M16.5 9.5C16.5 7 18 5 18 5s1.5 2 1.5 4.5S18 14 18 14s-1.5-2-1.5-4.5z" />
          <circle cx="12" cy="14" r="6" />
          <circle cx="10" cy="13" r="1.2" fill="#111" />
          <circle cx="14" cy="13" r="1.2" fill="#111" />
          <ellipse cx="12" cy="15.5" rx="1.5" ry="0.8" fill="#111" opacity="0.4" />
        </svg>
        <span className={styles.label}>Pet</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
