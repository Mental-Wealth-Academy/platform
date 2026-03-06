'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './LandingHeader.module.css';
import { useSound } from '@/hooks/useSound';

const TOOLS_ITEMS = [
  { label: 'What is Wealth?', href: '/learn#wealth' },
  { label: 'Community DAO', href: '/learn#community' },
  { label: 'Cognitive Benefits', href: '/learn#cognitive' },
  { label: 'Treasury Management', href: 'https://azura-theta.vercel.app/' },
];

export const LandingHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { play } = useSound();
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [toolsOpen]);

  const handleLogin = () => {
    window.location.href = '/home';
  };

  const handleJoinNow = () => {
    window.location.href = '/home';
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.headerContent}>
        <a href="/" className={styles.logoLink}>
          <Image
            src="/icons/mwa-logo-horizontal.png"
            alt="Mental Wealth Academy"
            width={160}
            height={58}
            className={styles.logo}
            priority
          />
        </a>

        <nav className={styles.nav}>
          <div className={styles.dropdownWrapper} ref={toolsRef}>
            <button
              type="button"
              className={styles.researchButton}
              onClick={() => {
                play(toolsOpen ? 'toggle-off' : 'toggle-on');
                setToolsOpen(!toolsOpen);
              }}
              onMouseEnter={() => play('hover')}
              aria-expanded={toolsOpen}
            >
              Tools
              <svg
                className={`${styles.researchChevron} ${toolsOpen ? styles.researchChevronOpen : ''}`}
                width="12"
                height="12"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 7.5L10 12.5L15 7.5" />
              </svg>
            </button>
            {toolsOpen && (
              <div className={styles.dropdown}>
                {TOOLS_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className={styles.dropdownItem}
                    onMouseEnter={() => play('hover')}
                    onClick={() => {
                      play('navigation');
                      setToolsOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogin}
            onMouseEnter={() => play('hover')}
            className={styles.loginButton}
          >
            Login
          </button>
          <button
            type="button"
            onClick={handleJoinNow}
            onMouseEnter={() => play('hover')}
            className={styles.joinButton}
          >
            Join Now
          </button>
        </nav>
      </div>
    </header>
  );
};

export default LandingHeader;
