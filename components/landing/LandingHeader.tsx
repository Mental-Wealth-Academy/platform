'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { WifiHigh, Headphones, Bluetooth } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './LandingHeader.module.css';

const formatClock = (date: Date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const HeaderStatusCluster: React.FC = () => {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.statusCluster} aria-hidden="true">
      <WifiHigh size={18} weight="bold" />
      <Headphones size={16} weight="fill" />
      <Bluetooth size={15} weight="bold" />
      <svg
        className={styles.statusBattery}
        width="26"
        height="12"
        viewBox="0 0 26 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0.5" y="0.5" width="21" height="11" rx="3" className={styles.statusBatteryShell} />
        <rect x="23" y="3.5" width="2.4" height="5" rx="1.2" className={styles.statusBatteryNub} />
        <rect x="2" y="2" width="14" height="8" rx="1.5" className={styles.statusBatteryCharge} />
      </svg>
      <span className={styles.statusTime}>{clock}</span>
    </div>
  );
};

export const LandingHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { play } = useSound();
  const sectionLinks = [
    {
      href: '/#community-education',
      label: 'Learn',
      scrollTarget: '#community-education',
    },
    {
      href: '/#cohort-learning',
      label: 'Cohorts',
      scrollTarget: '#cohort-learning',
    },
    { href: '/products-and-services', label: 'Pricing' },
    { href: '/faq', label: 'FAQs' },
  ];

  const smoothScrollToSection = (target: HTMLElement) => {
    if (typeof window === 'undefined') return;

    const header = document.querySelector<HTMLElement>('header');
    const headerOffset = header ? header.getBoundingClientRect().height + 28 : 120;
    const targetY = window.scrollY + target.getBoundingClientRect().top - headerOffset;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 700;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) => (
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    );

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo({
        top: startY + distance * easedProgress,
        behavior: 'auto',
      });

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  const handleSectionLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    scrollTarget?: string
  ) => {
    play('click');
    setMobileMenuOpen(false);

    const target = scrollTarget
      ? document.querySelector<HTMLElement>(scrollTarget)
      : null;

    if (target) {
      event.preventDefault();
      smoothScrollToSection(target);
    }
  };

  const handleMobileMenuToggle = () => {
    play(mobileMenuOpen ? 'toggle-off' : 'toggle-on');
    setMobileMenuOpen((open) => !open);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header
      className={`${styles.header} ${scrolled ? styles.headerScrolled : ''} ${mobileMenuOpen ? styles.headerMenuOpen : ''}`}
    >
      <div className={styles.headerContent}>
        <a
          href="/"
          className={styles.logoLink}
          onMouseEnter={() => play('hover')}
          onClick={() => play('click')}
          aria-label="Mental Wealth Academy Home"
        >
          <span className={styles.jewel}>
            <Image
              src="/icons/ui-diamond.svg"
              alt=""
              width={24}
              height={24}
              className={styles.jewelIcon}
              priority
            />
          </span>
        </a>

        <nav className={styles.sectionNav} aria-label="Section shortcuts">
          {sectionLinks.map(({ href, label, scrollTarget }) => (
            <a
              key={href}
              href={href}
              className={styles.sectionNavLink}
              onClick={(event) => handleSectionLinkClick(event, scrollTarget)}
              onMouseEnter={() => play('hover')}
            >
              <span className={styles.slideWrap}>
                <span className={styles.slideText}>{label}</span>
                <span className={`${styles.slideText} ${styles.slideClone}`}>{label}</span>
              </span>
            </a>
          ))}
        </nav>

        <nav className={styles.nav}>
          <div className={styles.desktopActions}>
            <HeaderStatusCluster />
          </div>
          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onMouseEnter={() => play('hover')}
            onClick={handleMobileMenuToggle}
          >
            <span className={styles.mobileMenuBar} />
            <span className={styles.mobileMenuBar} />
            <span className={styles.mobileMenuBar} />
          </button>
        </nav>
      </div>
      {mobileMenuOpen ? (
        <div className={styles.mobileMenuPanel}>
          <nav className={styles.mobileSectionNav} aria-label="Mobile section shortcuts">
            {sectionLinks.map(({ href, label, scrollTarget }) => (
              <a
                key={href}
                href={href}
                className={styles.mobileSectionNavLink}
                onClick={(event) => handleSectionLinkClick(event, scrollTarget)}
                onMouseEnter={() => play('hover')}
              >
                {label}
              </a>
            ))}
          </nav>
          <HeaderStatusCluster />
        </div>
      ) : null}
    </header>
  );
};

export default LandingHeader;
