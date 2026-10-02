'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import { MagnifyingGlass, Phone, Play } from '@phosphor-icons/react';
import styles from './TopNavigation.module.css';
import { useSound } from '@/hooks/useSound';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';
import ColorThemePicker from '@/components/theme/ColorThemePicker';
import HoverSlideText from '@/components/shared/HoverSlideText';
import ModalShell from '@/components/shared/ModalShell';
import TreasurySwapModal from '@/components/treasury-swap/TreasurySwapModal';

const MeditationPlayerModal = dynamic(
  () => import('@/components/meditation-player/MeditationPlayerModal'),
  { ssr: false }
);



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

const PAGE_LINKS: NavLink[] = [
  { label: 'Quests', href: '/quests', icon: '/icons/nav-quests-v3.svg' },
  { label: 'Trades', href: '/trades', icon: '/icons/nav-trades-v1.svg' },
  { label: 'Hallway', href: '/genetics', icon: '/icons/genetics.svg' },
  { label: 'Library', href: '/learn', icon: '/icons/daemon.svg?v=4' },
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
  const [meditationModalOpen, setMeditationModalOpen] = useState(false);
  const [godJarOpen, setGodJarOpen] = useState(false);
  const [jarNote, setJarNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReleased, setIsReleased] = useState(false);

  const handleOpenGodJar = () => {
    play('click');
    setIsReleased(false);
    setGodJarOpen(true);
  };

  const handleReleaseAnother = () => {
    play('click');
    setIsReleased(false);
    setJarNote('');
  };

  const handleSendToGod = async () => {
    const trimmed = jarNote.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    play('click');

    try {
      await fetch('/api/god-jar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
    } catch (err) {
      console.error('[GodJar] submission error:', err);
    } finally {
      setIsSubmitting(false);
      setIsReleased(true);
      setJarNote('');
      play('celebration');
    }
  };

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

  useEffect(() => {
    const handleOpenMeditation = () => setMeditationModalOpen(true);
    window.addEventListener('openMeditationModal', handleOpenMeditation);
    return () => window.removeEventListener('openMeditationModal', handleOpenMeditation);
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

  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fetchStreak = () => {
      fetch(`/api/daily-notes/streak?tz=${encodeURIComponent(timeZone)}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (typeof d?.streak === 'number') {
            setStreak(d.streak);
          }
        })
        .catch(() => {});
    };

    fetchStreak();
    window.addEventListener('dailyNoteCompleted', fetchStreak);
    window.addEventListener('userLoggedIn', fetchStreak);
    window.addEventListener('profileUpdated', fetchStreak);
    return () => {
      window.removeEventListener('dailyNoteCompleted', fetchStreak);
      window.removeEventListener('userLoggedIn', fetchStreak);
      window.removeEventListener('profileUpdated', fetchStreak);
    };
  }, []);

  const handleMobileStreakClick = () => {
    play('click');
    if (pathname === '/home' || pathname === '/shadow-work') {
      window.dispatchEvent(new Event('openFieldNotes'));
    } else {
      router.push('/home?fieldNotes=1');
    }
  };

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

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
          <button
            type="button"
            className={styles.mobileStreakBtn}
            onClick={handleMobileStreakClick}
            aria-label={`Field notes streak: ${streak} days. Tap to continue streak.`}
          >
            <Image
              src="/icons/field-notes-streak.svg"
              alt=""
              width={26}
              height={26}
              className={styles.mobileStreakIcon}
              priority
            />
            <span className={styles.mobileStreakCount}>{streak}</span>
          </button>
          <Link
            href="/course"
            className={styles.mobileStudyBtn}
            aria-label="Courses and guide"
            onClick={() => play('navigation')}
            onMouseEnter={() => play('hover')}
          >
            <Image
              src="/icons/nav-study-icon.svg"
              alt=""
              width={28}
              height={28}
              className={styles.mobileStudyIcon}
              priority
            />
          </Link>
        </div>

        <Link
          href="/shop"
          className={styles.mobileJewel}
          aria-label="Shop diamonds"
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

        <button
          type="button"
          className={styles.mobileGodJarBtn}
          onClick={handleOpenGodJar}
          aria-label="Give It to God Jar"
        >
          <Image
            src="/icons/god-jar.png"
            alt="Give It to God"
            width={28}
            height={28}
            className={styles.mobileGodJarIcon}
            priority
          />
        </button>

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

        {/* Compact dropdown — unified mobile/tablet hamburger navigation */}
        <div className={styles.compactMenuWrap} ref={dropdownRef}>
          <button
            ref={dropdownTriggerRef}
            type="button"
            className={`${styles.compactMenuButton} ${dropdownOpen ? styles.compactMenuButtonActive : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            onMouseEnter={() => play('hover')}
            aria-label={dropdownOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={dropdownOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {dropdownOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownPanel} role="menu" aria-label="Navigation and account menu">
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

                  {/* Quick Actions at top above credits */}
                  <div className={styles.dropdownTopActions}>
                    <button
                      type="button"
                      className={styles.dropdownMeditationButton}
                      onClick={() => {
                        play('click');
                        setDropdownOpen(false);
                        setMeditationModalOpen(true);
                      }}
                      aria-label="Start Morning Meditation"
                    >
                      <div className={styles.dropdownMeditationLeft}>
                        <span className={styles.dropdownMeditationIconWrap} aria-hidden="true">
                          <Play size={14} weight="fill" />
                        </span>
                        <div className={styles.dropdownMeditationMeta}>
                          <span className={styles.dropdownMeditationTitle}>Morning Meditation</span>
                          <span className={styles.dropdownMeditationSub}>Guided meditation with Blue</span>
                        </div>
                      </div>
                      <span className={styles.dropdownMeditationBadge}>20 min</span>
                    </button>

                    <Link
                      href="/lists"
                      className={styles.dropdownTodoCard}
                      onClick={() => {
                        play('navigation');
                        setDropdownOpen(false);
                      }}
                      aria-label="To-do lists"
                    >
                      <div className={styles.dropdownMeditationLeft}>
                        <span className={styles.dropdownTodoIconWrap} aria-hidden="true">
                          <Image
                            src="/icons/icon-lists.svg"
                            alt=""
                            width={17}
                            height={17}
                            className={styles.dropdownTodoIcon}
                          />
                        </span>
                        <div className={styles.dropdownMeditationMeta}>
                          <span className={styles.dropdownMeditationTitle}>To-do lists</span>
                          <span className={styles.dropdownMeditationSub}>Track daily goals and habits</span>
                        </div>
                      </div>
                      <span className={styles.dropdownTodoArrow} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </span>
                    </Link>
                  </div>

                  {/* Divider label: Balances */}
                  <div className={styles.dropdownDividerLabel}>
                    <span className={styles.dropdownDividerLine} />
                    <span className={styles.dropdownDividerText}>Balances</span>
                    <span className={styles.dropdownDividerLine} />
                  </div>

                  {/* Balances Section */}
                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownSectionHead}>
                      <span className={styles.dropdownSectionSub}>Credits</span>
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
                            <Image src="/tokens/cbbtc.webp" alt="" width={16} height={16} className={styles.dropdownTokenIcon} />
                            <span className={styles.dropdownTokenName}>cbBTC</span>
                          </div>
                          <span className={styles.dropdownTokenValue}>
                            {walletAddress ? (btcUsd ?? '$0.00') : '—'}
                          </span>
                        </button>
                      )}
                      <div className={styles.dropdownTokenCard}>
                        <div className={styles.dropdownTokenLeft}>
                          <Image src="/tokens/usdc.webp" alt="" width={16} height={16} className={styles.dropdownTokenIcon} />
                          <span className={styles.dropdownTokenName}>USDC</span>
                        </div>
                        <span className={styles.dropdownTokenValue}>
                          {walletAddress ? (usdc ?? '—') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider label: Pages */}
                  <div className={styles.dropdownDividerLabel}>
                    <span className={styles.dropdownDividerLine} />
                    <span className={styles.dropdownDividerText}>Pages</span>
                    <span className={styles.dropdownDividerLine} />
                  </div>

                  {/* Pages 2-Column Grid with 8 multiple px spacing */}
                  <div className={styles.dropdownNavGrid}>
                    {PAGE_LINKS.map((page) => {
                      const active = pathname === page.href || pathname?.startsWith(page.href + '/');
                      return (
                        <Link
                          key={page.href}
                          href={page.href}
                          className={`${styles.dropdownGridItem} ${active ? styles.dropdownGridItemActive : ''}`}
                          onClick={() => {
                            play('navigation');
                            setDropdownOpen(false);
                          }}
                          aria-current={active ? 'page' : undefined}
                        >
                          {page.icon && (
                            <span className={styles.dropdownGridIconWrap}>
                              <Image
                                src={page.icon}
                                alt=""
                                width={16}
                                height={16}
                                unoptimized
                                className={styles.dropdownGridIcon}
                              />
                            </span>
                          )}
                          <span className={styles.dropdownGridLabel}>{page.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className={styles.dropdownDivider} />

                  {/* Sign Out */}
                  <div className={styles.dropdownSection}>
                    <button
                      type="button"
                      className={styles.dropdownSignOutButton}
                      onClick={() => void handleSignOut()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                      Sign in to view your diamonds, cbBTC, and profile settings.
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

                  {/* Divider label: Pages */}
                  <div className={styles.dropdownDividerLabel}>
                    <span className={styles.dropdownDividerLine} />
                    <span className={styles.dropdownDividerText}>Pages</span>
                    <span className={styles.dropdownDividerLine} />
                  </div>

                  {/* Pages 2-Column Grid for unauthenticated visitors */}
                  <div className={styles.dropdownNavGrid}>
                    {PAGE_LINKS.map((page) => {
                      const active = pathname === page.href || pathname?.startsWith(page.href + '/');
                      return (
                        <Link
                          key={page.href}
                          href={page.href}
                          className={`${styles.dropdownGridItem} ${active ? styles.dropdownGridItemActive : ''}`}
                          onClick={() => {
                            play('navigation');
                            setDropdownOpen(false);
                          }}
                          aria-current={active ? 'page' : undefined}
                        >
                          {page.icon && (
                            <span className={styles.dropdownGridIconWrap}>
                              <Image
                                src={page.icon}
                                alt=""
                                width={16}
                                height={16}
                                unoptimized
                                className={styles.dropdownGridIcon}
                              />
                            </span>
                          )}
                          <span className={styles.dropdownGridLabel}>{page.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <TreasurySwapModal
        open={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
      />
      <MeditationPlayerModal
        isOpen={meditationModalOpen}
        onClose={() => setMeditationModalOpen(false)}
        initialTrack="twenty-minute-reset"
      />
      <ModalShell
        isOpen={godJarOpen}
        onClose={() => setGodJarOpen(false)}
        title={
          <div className={styles.godJarHeaderTitle}>
            <span className={styles.godJarKanji} lang="ja">奉納</span>
            <span className={styles.godJarTitleText}>Give It to God</span>
          </div>
        }
        className={styles.godJarModalDialog}
        maxWidth="sm"
      >
        <div className={styles.godJarModalContent}>
          <div className={styles.godJarVisual}>
            <Image
              src="/icons/god-jar.png"
              alt="Give It to God Jar"
              width={68}
              height={68}
              className={styles.godJarImg}
              priority
            />
          </div>

          {isReleased ? (
            <div className={styles.godJarReleasedWrap}>
              <div className={styles.godJarReleasedKanji} lang="ja">安寧</div>
              <h3 className={styles.godJarReleasedTitle}>Released into the Horizon</h3>
              <p className={styles.godJarReleasedText}>
                Your note has been received by the Ethereal Horizon. May your thoughts find quiet and your spirit find rest.
              </p>
              <div className={styles.godJarButtonRow}>
                <button
                  type="button"
                  className={styles.godJarSecondaryBtn}
                  onClick={handleReleaseAnother}
                >
                  Release another note
                </button>
                <button
                  type="button"
                  className={styles.godJarCta}
                  onClick={() => setGodJarOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.godJarFormWrap}>
              <p className={styles.godJarPrompt}>
                Surrender what is beyond your control. Place a worry, prayer, or intention into the jar. Once released, it is held anonymously in the quiet expanse of the Ethereal Horizon.
              </p>
              <div className={styles.godJarSlip}>
                <textarea
                  className={styles.godJarTextarea}
                  placeholder="Write what you wish to surrender..."
                  value={jarNote}
                  onChange={(e) => setJarNote(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  aria-label="Your note or prayer"
                />
                <div className={styles.godJarSlipFooter}>
                  <span className={styles.godJarAnonymousTag}>Anonymous · Encrypted</span>
                  <span className={styles.godJarCharCount}>{jarNote.length}/1000</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.godJarCta}
                onClick={() => void handleSendToGod()}
                disabled={!jarNote.trim() || isSubmitting}
              >
                {isSubmitting ? 'Releasing...' : 'Give it to God'}
              </button>
            </div>
          )}
        </div>
      </ModalShell>
    </header>
  );
};

export default TopNavigation;
