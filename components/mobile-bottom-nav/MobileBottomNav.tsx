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

  const handleAzuraChat = () => {
    window.dispatchEvent(new Event('toggleAzuraChat'));
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

      {/* Prayers */}
      <Link href="/home" className={`${styles.tab} ${pathname === '/home' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C12 2 9 6 9 9c0 1.5.7 2.8 1.8 3.6L8 21h8l-2.8-8.4C14.3 11.8 15 10.5 15 9c0-3-3-7-3-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        </svg>
        <span className={styles.label}>PRAYERS</span>
      </Link>

      {/* Ask (Azura Chat) */}
      <button type="button" className={styles.tab} onClick={handleAzuraChat} aria-label="Ask">
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="0.5" fill="currentColor" />
          <path d="M12 7v0a2 2 0 012 2c0 .7-.4 1.4-1 1.7L12 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className={styles.label}>ASK</span>
      </button>

      {/* Pet */}
      <Link href="/digipet" className={`${styles.tab} ${pathname === '/digipet' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="3" r="2" fill="currentColor" opacity="0.7" />
          <line x1="11" y1="5" x2="11" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <ellipse cx="11" cy="11" rx="5" ry="4.5" fill="currentColor" />
          <circle cx="9" cy="10" r="1" fill="#111" />
          <circle cx="13" cy="10" r="1" fill="#111" />
          <ellipse cx="11" cy="17" rx="4" ry="3.5" fill="currentColor" opacity="0.85" />
          <rect x="7" y="19" width="3" height="2" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="12" y="19" width="3" height="2" rx="1" fill="currentColor" opacity="0.7" />
        </svg>
        <span className={styles.label}>Pet</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
