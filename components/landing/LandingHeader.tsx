'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import styles from './LandingHeader.module.css';

const LandingAuthButtons = dynamic(
  () => import('./LandingAuthButtons').then((mod) => mod.LandingAuthButtons),
  {
    ssr: false,
    loading: () => (
      <>
        <a href="/community" className={styles.loginButton}>
          <span className={styles.slideWrap}>
            <span className={styles.slideText}>Login</span>
            <span className={`${styles.slideText} ${styles.slideClone}`}>Login</span>
          </span>
        </a>
        <a href="/community" className={styles.joinButton}>
          <span className={styles.slideWrap}>
            <span className={styles.slideText}>Join Now</span>
            <span className={`${styles.slideText} ${styles.slideClone}`}>Join Now</span>
          </span>
        </a>
      </>
    ),
  }
);

export const LandingHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.headerContent}>
        <a href="/" className={styles.logoLink}>
          <Image
            src="/icons/logo-mwa-horizontal.png"
            alt="Mental Wealth Academy"
            width={160}
            height={58}
            className={styles.logo}
            priority
          />
        </a>

        <nav className={styles.nav}>
          <LandingAuthButtons />
        </nav>
      </div>
    </header>
  );
};

export default LandingHeader;
