'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNavigation.module.css';

const TopNavigation: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/learn') return null;

  return (
    <nav className={styles.topNav}>
      <div className={styles.links}>
        <Link
          href="/home"
          className={`${styles.link} ${pathname === '/home' ? styles.active : ''}`}
        >
          Login
        </Link>
        <Link
          href="/home"
          className={`${styles.link} ${styles.joinLink}`}
        >
          Join
        </Link>
        <span className={styles.link}>
          Tools
        </span>
      </div>
    </nav>
  );
};

export default TopNavigation;
