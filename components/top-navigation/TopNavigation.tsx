'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Phone } from '@phosphor-icons/react';
import styles from './TopNavigation.module.css';
import { useSound } from '@/hooks/useSound';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';
import ColorThemePicker from '@/components/theme/ColorThemePicker';
import HoverSlideText from '@/components/shared/HoverSlideText';
import TreasurySwapModal from '@/components/treasury-swap/TreasurySwapModal';

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
  const { login, logout, authenticated, user, getAccessToken } = usePrivy();
  const { address: wagmiAddress } = useAccount();
  const walletAddress = wagmiAddress || user?.wallet?.address;

  const loginTriggered = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Balances fetched when dropdown is open and authenticated
  const {
    diamonds,
    btc,
    btcUsd,
    usdc,
    hasBtc,
    netLabel,
  } = useOnchainBalances(walletAddress, dropdownOpen && authenticated);

  useEffect(() => {
    const handleOpenSwap = () => setSwapModalOpen(true);
    window.addEventListener('openTreasurySwapModal', handleOpenSwap);
    return () => window.removeEventListener('openTreasurySwapModal', handleOpenSwap);
  }, []);

  const [userData, setUserData] = useState<{ username: string | null; avatarUrl: string | null }>({
    username: null,
    avatarUrl: null,
  });
  const [addressCopied, setAddressCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setUserData({ username: null, avatarUrl: null });
      return;
    }

    let cancelled = false;
    const fetchUserData = async () => {
      try {
        const token = await getAccessToken().catch(() => null);
        const res = await fetch('/api/me', {
          credentials: 'include',
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.user) {
          setUserData({
            username: data.user.username || null,
            avatarUrl: data.user.avatarUrl || null,
          });
        }
      } catch {
        // silent
      }
    };

    void fetchUserData();

    const handleUpdate = () => void fetchUserData();
    window.addEventListener('profileUpdated', handleUpdate);
    window.addEventListener('userLoaded', handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('profileUpdated', handleUpdate);
      window.removeEventListener('userLoaded', handleUpdate);
    };
  }, [authenticated, getAccessToken]);

  const displayName = userData.username && !userData.username.startsWith('user_') ? userData.username : null;
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : walletAddress
    ? walletAddress.slice(2, 4).toUpperCase()
    : '??';

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(walletAddress);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = walletAddress;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setAddressCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setAddressCopied(false), 1400);
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
    }
  };

  const handleSignOut = async () => {
    play('click');
    setDropdownOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Server logout failed:', err);
    }
    try {
      await logout();
    } catch (err) {
      console.error('Privy logout failed:', err);
    }
    router.push('/');
  };

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

        <Link
          href="/shop"
          className={styles.mobileJewel}
          aria-label="Shop credits"
          onClick={() => play('navigation')}
        >
          <Image
            src="/icons/ui-diamond.svg"
            alt=""
            width={24}
            height={24}
            className={styles.mobileJewelIcon}
            priority
          />
        </Link>

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
            <div className={styles.dropdownPanel} role="menu" aria-label="Account and balances menu">
              {authenticated ? (
                <>
                  {/* Profile Header */}
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>
                      {userData.avatarUrl ? (
                        <Image
                          src={userData.avatarUrl}
                          alt={displayName || 'Profile'}
                          width={38}
                          height={38}
                          className={styles.dropdownAvatarImg}
                          unoptimized
                        />
                      ) : (
                        <span className={styles.dropdownAvatarInitials}>{initials}</span>
                      )}
                    </div>
                    <div className={styles.dropdownIdentity}>
                      <span className={styles.dropdownDisplayName}>
                        {displayName ? `@${displayName}` : 'Connected'}
                      </span>
                      {walletAddress ? (
                        <button
                          type="button"
                          className={`${styles.dropdownWalletChip} ${addressCopied ? styles.dropdownWalletCopied : ''}`}
                          onClick={() => void handleCopyAddress()}
                          title="Copy address"
                        >
                          <span className={styles.dropdownWalletAddr}>{truncateAddress(walletAddress)}</span>
                          <span className={styles.dropdownCopyHint}>{addressCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      ) : (
                        <span className={styles.dropdownWalletMuted}>No wallet linked</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.dropdownDivider} />

                  {/* Balances Section */}
                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownSectionHead}>
                      <span className={styles.dropdownSectionLabel}>Balances</span>
                      <span className={styles.dropdownNetBadge}>{netLabel}</span>
                    </div>

                    {/* Featured Diamonds (Credits) */}
                    <div className={styles.dropdownBalanceHero}>
                      <div className={styles.dropdownBalanceLeft}>
                        <div className={styles.dropdownDiamondIcon}>
                          <Image src="/icons/ui-diamond.svg" alt="" width={18} height={18} />
                        </div>
                        <div className={styles.dropdownBalanceMeta}>
                          <span className={styles.dropdownBalanceTitle}>Diamonds</span>
                          <span className={styles.dropdownBalanceSub}>Credits</span>
                        </div>
                      </div>
                      <span className={styles.dropdownBalanceHeroValue}>
                        {walletAddress ? (diamonds ?? '—') : '—'}
                      </span>
                    </div>

                    {/* Tokens row (cBTC / cbBTC & USDC) */}
                    <div className={styles.dropdownTokensRow}>
                      {hasBtc && (
                        <button
                          type="button"
                          className={`${styles.dropdownTokenCard} ${styles.dropdownTokenCardInteractive}`}
                          onClick={() => {
                            play('click');
                            setDropdownOpen(false);
                            setSwapModalOpen(true);
                          }}
                          title={btc ? `${btc} cbBTC · Tap to convert or swap` : 'Tap to convert or swap'}
                          aria-label={`cbBTC balance: ${walletAddress ? (btcUsd ?? '$0.00') : 'none'}. Tap to swap or convert.`}
                        >
                          <div className={styles.dropdownTokenLeft}>
                            <Image src="/tokens/cbbtc.webp" alt="" width={15} height={15} className={styles.dropdownTokenIcon} />
                            <span className={styles.dropdownTokenName}>cbBTC</span>
                          </div>
                          <span className={styles.dropdownTokenValue}>
                            {walletAddress ? (btcUsd ?? '$0.00') : '—'}
                          </span>
                        </button>
                      )}
                      <div className={styles.dropdownTokenCard}>
                        <div className={styles.dropdownTokenLeft}>
                          <Image src="/tokens/usdc.webp" alt="" width={15} height={15} className={styles.dropdownTokenIcon} />
                          <span className={styles.dropdownTokenName}>USDC</span>
                        </div>
                        <span className={styles.dropdownTokenValue}>
                          {walletAddress ? (usdc ?? '—') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.dropdownDivider} />

                  {/* Account Actions Section */}
                  <div className={styles.dropdownSection}>
                    <span className={styles.dropdownSectionLabel}>Account</span>

                    <button
                      type="button"
                      className={styles.dropdownActionItem}
                      onClick={() => {
                        play('click');
                        setDropdownOpen(false);
                        window.dispatchEvent(new Event('openAvatarModal'));
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Change profile</span>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownActionItem}
                      onClick={() => {
                        play('click');
                        setDropdownOpen(false);
                        window.dispatchEvent(new Event('openUsernameModal'));
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <span>Change username</span>
                    </button>

                    <Link
                      href="/profile"
                      className={styles.dropdownActionItem}
                      onClick={() => {
                        play('navigation');
                        setDropdownOpen(false);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="3" />
                        <line x1="7" y1="8" x2="13" y2="8" />
                        <line x1="7" y1="12" x2="17" y2="12" />
                      </svg>
                      <span>Profile</span>
                    </Link>

                    <button
                      type="button"
                      className={styles.dropdownActionItem}
                      onClick={() => {
                        play('click');
                        setDropdownOpen(false);
                        window.dispatchEvent(new Event('callBlue'));
                      }}
                    >
                      <Phone size={15} weight="fill" aria-hidden="true" />
                      <span>Call Blue</span>
                    </button>
                  </div>

                  <div className={styles.dropdownDivider} />

                  {/* Sign Out */}
                  <div className={styles.dropdownSection}>
                    <button
                      type="button"
                      className={styles.dropdownSignOutButton}
                      onClick={() => void handleSignOut()}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Unauthenticated View */
                <div className={styles.dropdownAuthWrap}>
                  <div className={styles.dropdownAuthPrompt}>
                    <span className={styles.dropdownAuthTitle}>Account</span>
                    <p className={styles.dropdownAuthText}>
                      Sign in to view your diamonds, cBTC, and profile settings.
                    </p>
                  </div>

                  {/* Preview of Diamonds balance */}
                  <div className={styles.dropdownBalanceHero}>
                    <div className={styles.dropdownBalanceLeft}>
                      <div className={styles.dropdownDiamondIcon}>
                        <Image src="/icons/ui-diamond.svg" alt="" width={18} height={18} />
                      </div>
                      <div className={styles.dropdownBalanceMeta}>
                        <span className={styles.dropdownBalanceTitle}>Diamonds</span>
                        <span className={styles.dropdownBalanceSub}>Credits</span>
                      </div>
                    </div>
                    <span className={styles.dropdownBalanceHeroValue}>—</span>
                  </div>

                  <div className={styles.dropdownAuthButtons}>
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
                </div>
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
      <TreasurySwapModal
        open={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
      />
    </header>
  );
};

export default TopNavigation;
