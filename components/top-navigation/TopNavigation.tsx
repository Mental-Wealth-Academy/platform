'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Phone } from '@phosphor-icons/react';
import styles from './TopNavigation.module.css';
import { useSound } from '@/hooks/useSound';
import ColorThemePicker from '@/components/theme/ColorThemePicker';
import HoverSlideText from '@/components/shared/HoverSlideText';
interface NavLink {
  label: string;
  href: string;
  icon?: string;
  comingSoon?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Live', href: '/dao', icon: '/icons/nav-world-v2.svg' },
  { label: 'Quests', href: '/quests', icon: '/icons/nav-quests-v3.svg' },
  { label: 'Trades', href: '/trades', icon: '/icons/nav-trades-v1.svg' },
];

const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { play } = useSound();
  const { login, authenticated } = usePrivy();
  const loginTriggered = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // After Privy login succeeds, redirect to /home.
  useEffect(() => {
    if (authenticated && loginTriggered.current) {
      loginTriggered.current = false;
      router.push('/home');
    }
  }, [authenticated, router]);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDropdownOpen(false);
      dropdownTriggerRef.current?.focus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  if (pathname === '/') return null;

  const handleMenuToggle = () => {
    window.dispatchEvent(new Event('toggleSidebar'));
  };

  const handleLogin = () => {
    if (authenticated) {
      router.push('/home');
      return;
    }
    loginTriggered.current = true;
    login();
  };

  const handleJoinNow = () => {
    if (authenticated) {
      router.push('/home');
      return;
    }
    loginTriggered.current = true;
    login();
  };

  const renderNavLink = ({ label, href, icon, comingSoon }: NavLink, inDropdown?: boolean) => {
    const active = pathname === href || pathname?.startsWith(href + '/');

    if (comingSoon) {
      return (
        <span
          key={href}
          className={`${styles.navLink} ${styles.navLinkDisabled} ${inDropdown ? styles.dropdownNavLink : ''}`}
          aria-disabled="true"
        >
          {icon && (
            <span className={styles.navLinkIconWrap}>
              <Image
                src={icon}
                alt=""
                width={16}
                height={16}
                className={styles.navLinkIcon}
              />
            </span>
          )}
          {icon && <span className={styles.navDivider} />}
          <span className={styles.navLinkLabel}>
            <span className={styles.navLinkBadge}>Coming soon</span>
          </span>
        </span>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        className={`${styles.navLink} hover-slide-trigger ${active ? styles.navLinkActive : ''} ${!icon ? styles.navLinkTextOnly : ''} ${inDropdown ? styles.dropdownNavLink : ''}`}
        onMouseEnter={() => play('hover')}
        onClick={() => { play('navigation'); setDropdownOpen(false); }}
        aria-current={active ? 'page' : undefined}
      >
        {icon && (
          <>
            <span className={styles.navLinkIconWrap}>
              <Image
                src={icon}
                alt=""
                width={16}
                height={16}
                className={styles.navLinkIcon}
              />
            </span>
            <span className={styles.navDivider} />
          </>
        )}
        <span className={styles.navLinkLabel}>
          <HoverSlideText>{label}</HoverSlideText>
        </span>
      </Link>
    );
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
          <a href="/" className={styles.logoLink} onMouseEnter={() => play('logo-hover')}>
            <Image
              src="/icons/logo-mwa-horizontal.png"
              alt="Mental Wealth Academy"
              width={160}
              height={58}
              className={styles.logo}
              priority
            />
          </a>
        </div>

        <div className={styles.searchWrapper}>
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search Academy"
              onClick={() => play('input-focus')}
              onKeyDown={() => play('click')}
            />
            <MagnifyingGlass size={20} weight="bold" className={styles.searchIcon} />
          </div>
        </div>
        <nav className={styles.centerNav} aria-label="Main navigation">
          {NAV_LINKS.map((link) => renderNavLink(link))}
        </nav>

        <nav className={styles.nav}>
          <Link
            href="/shop"
            data-tour="shop"
            className={`${styles.shopLink} ${pathname === '/shop' || pathname?.startsWith('/shop/') ? styles.shopLinkActive : ''}`}
            onClick={() => play('navigation')}
            onMouseEnter={() => play('hover')}
            aria-label="Shop"
            aria-current={pathname === '/shop' || pathname?.startsWith('/shop/') ? 'page' : undefined}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }} aria-hidden="true">🛒</span>
          </Link>
          <ColorThemePicker />
          <button
            type="button"
            className={styles.callBlueButton}
            data-tour="ask-blue"
            onClick={() => { play('click'); window.dispatchEvent(new Event('callBlue')); }}
            onMouseEnter={() => play('hover')}
            title="Call Blue"
            aria-label="Call Blue"
          >
            <Phone size={16} weight="fill" className={styles.callBlueIcon} />
            <span className={styles.callBlueLabel}>Call Blue</span>
          </button>

          {!authenticated && (
            <>
              <button
                type="button"
                onClick={handleLogin}
                onMouseEnter={() => play('hover')}
                className={`${styles.loginButton} hover-slide-trigger`}
              >
                <HoverSlideText>Login</HoverSlideText>
              </button>
              <button
                type="button"
                onClick={handleJoinNow}
                onMouseEnter={() => play('hover')}
                className={`${styles.joinButton} hover-slide-trigger`}
              >
                <HoverSlideText>Join Now</HoverSlideText>
              </button>
            </>
          )}
          {/* Profile card slot — SideNavigation portals the profile card here */}
          <div id="topnav-profile-slot" className={styles.profileSlot} />
        </nav>

        {/* Compact dropdown — replaces centerNav + nav at <= 1380px */}
        <div className={styles.compactMenuWrap} ref={dropdownRef}>
          <button
            ref={dropdownTriggerRef}
            type="button"
            className={styles.compactMenuButton}
            onClick={() => setDropdownOpen((prev) => !prev)}
            onMouseEnter={() => play('hover')}
            aria-label={dropdownOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={dropdownOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownPanel}>
              <div className={styles.dropdownSection}>
                <span className={styles.dropdownSectionLabel}>Navigate</span>
                {NAV_LINKS.map((link) => renderNavLink(link, true))}
              </div>
              <div className={styles.dropdownDivider} />
              <div className={styles.dropdownSection}>
                <span className={styles.dropdownSectionLabel}>Actions</span>
                <Link
                  href="/shop"
                  className={`${styles.dropdownActionLink} ${pathname === '/shop' || pathname?.startsWith('/shop/') ? styles.dropdownActionActive : ''}`}
                  onClick={() => { play('navigation'); setDropdownOpen(false); }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden="true">🛒</span>
                  Shop
                </Link>
                <button
                  type="button"
                  className={styles.dropdownActionLink}
                  onClick={() => { play('click'); setDropdownOpen(false); window.dispatchEvent(new Event('callBlue')); }}
                >
                  <Phone size={16} weight="fill" aria-hidden="true" />
                  Call Blue
                </button>
                <div className={styles.dropdownThemeRow}>
                  <ColorThemePicker />
                </div>
              </div>
              {!authenticated && (
                <>
                  <div className={styles.dropdownDivider} />
                  <div className={styles.dropdownSection}>
                    <button
                      type="button"
                      onClick={() => { handleLogin(); setDropdownOpen(false); }}
                      className={styles.dropdownAuthLink}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleJoinNow(); setDropdownOpen(false); }}
                      className={styles.dropdownJoinButton}
                    >
                      Join Now
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile-only action — replaces the search bar on small screens */}
        <div className={styles.mobileActions}>
          {authenticated ? (
            <button
              type="button"
              className={styles.mobileIconButton}
              onClick={() => { play('click'); window.dispatchEvent(new Event('openWalletDrawer')); }}
              onMouseEnter={() => play('hover')}
              aria-label="Open wallet and profile"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12V8a2 2 0 0 0-2-2H6a2 2 0 0 1 0-4h12" />
                <path d="M4 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
                <circle cx="16" cy="14" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className={styles.mobileIconButton}
              onClick={handleLogin}
              onMouseEnter={() => play('hover')}
              aria-label="Login"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;
