'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import styles from './TopNavigation.module.css';
import { useSound } from '@/hooks/useSound';
import { useTheme } from '@/components/theme/ThemeProvider';

const TOOLS_ITEMS = [
  { label: 'What is Wealth?', href: '/learn#wealth' },
  { label: 'Community DAO', href: '/learn#community' },
  { label: 'Cognitive Benefits', href: '/learn#cognitive' },
  { label: 'Treasury Management', href: 'https://azura-theta.vercel.app/' },
];

const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
  const { play } = useSound();
  const { theme, toggleTheme } = useTheme();
  const toolsRef = useRef<HTMLDivElement>(null);
  const { login, authenticated } = usePrivy();
  const loginTriggered = useRef(false);

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

  // After Privy login succeeds, redirect to /home
  useEffect(() => {
    if (authenticated && loginTriggered.current) {
      loginTriggered.current = false;
      router.push('/home');
    }
  }, [authenticated, router]);

  if (pathname === '/' || pathname === '/learn') return null;

  const handleMenuToggle = () => {
    window.dispatchEvent(new Event('toggleSidebar'));
  };

  const handleLogin = () => {
    loginTriggered.current = true;
    login();
  };

  const handleJoinNow = () => {
    login();
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.leftSection}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={handleMenuToggle}
            onMouseEnter={() => play('hover')}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

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
          <button
            type="button"
            className={styles.themeToggle}
            onClick={() => {
              play('toggle-on');
              toggleTheme();
            }}
            onMouseEnter={() => play('hover')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
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

export default TopNavigation;
