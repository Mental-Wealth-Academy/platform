'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNavigation.module.css';

const TopNavigation: React.FC = () => {
  const pathname = usePathname();

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
        <Link
          href="/chapters"
          className={`${styles.link} ${pathname === '/chapters' ? styles.active : ''}`}
        >
          Tools
        </Link>
      </div>
    </nav>
  );
};

export default TopNavigation;
