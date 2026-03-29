'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './MobileBottomNav.module.css';

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuOpen }) => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {/* Menu */}
      <button type="button" className={styles.tab} onClick={onMenuOpen} aria-label="Menu">
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className={styles.label}>Menu</span>
      </button>

      {/* Leaderboard */}
      <Link href="/community" className={`${styles.tab} ${pathname === '/community' ? styles.tabActive : ''}`}>
        <svg className={styles.icon} width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="12" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <rect x="8.5" y="5" width="5" height="15" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <rect x="15" y="9" width="5" height="11" rx="1" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
        <span className={styles.label}>Board</span>
      </Link>

      {/* Center star button */}
      <Link href="/home" className={styles.centerTab}>
        <div className={styles.centerBubble}>
          <svg className={styles.starIcon} width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 0C14.6 7.4 20.6 13.4 28 14C20.6 14.6 14.6 20.6 14 28C13.4 20.6 7.4 14.6 0 14C7.4 13.4 13.4 7.4 14 0Z"
              fill="#D4A843"
            />
          </svg>
        </div>
      </Link>

      {/* Teleport */}
      <Link href="/learn" className={`${styles.tab} ${pathname === '/learn' ? styles.tabActive : ''}`}>
        <Image src="/icons/Teleport.svg" alt="" width={22} height={22} className={styles.iconImg} />
        <span className={styles.label}>Teleport</span>
      </Link>

      {/* World */}
      <Link href="/research" className={`${styles.tab} ${pathname === '/research' ? styles.tabActive : ''}`}>
        <Image src="/icons/World Icon.svg" alt="" width={22} height={22} className={styles.iconImg} />
        <span className={styles.label}>World</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
