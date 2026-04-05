'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import styles from './SideNavigation.module.css';
import AzuraChat from '../azura-chat/AzuraChat';
import AvatarSelectorModal from '../avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '../username-change/UsernameChangeModal';
import ProMembershipModal from '../pro-membership-modal/ProMembershipModal';
import InventoryModal from '../inventory-modal/InventoryModal';
import YourAccountsModal from '../nav-buttons/YourAccountsModal';
import OnboardingModal from '../onboarding/OnboardingModal';
import LootBoxModal from '../loot-box/LootBoxModal';
import { useSound } from '@/hooks/useSound';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
  badgeType?: 'default' | 'highlight' | 'muted' | 'green' | 'pro';
  disabled?: boolean;
  requiresPro?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  badge?: string;
  badgeType?: 'default' | 'highlight' | 'muted' | 'pro';
}

const navSections: NavSection[] = [
  {
    id: 'main',
    label: 'SPIRITUAL WORK',
    items: [
      { id: 'voting', label: 'Prayers', href: '/home', icon: '/icons/nav-home.svg' },
      { id: 'gallery', label: 'Gallery', href: '/gallery', icon: '/icons/nav-gallery.svg' },
    ],
  },
  {
    id: 'network',
    label: 'THE NETWORK',
    items: [
      { id: 'community', label: 'Community', href: '/community', icon: '/icons/nav-community.svg' },
      { id: 'credit-builder', label: 'Credit Builder', href: '/credit-builder', icon: '/icons/nav-markets.svg' },
      { id: 'shop', label: 'Shop', href: '/shop', icon: '/icons/nav-shop.svg' },
{ id: 'research', label: 'DeSci Tools', href: '/research', icon: '/icons/nav-research.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
    ],
  },
];

const PRO_TOKEN_ADDRESS = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F' as const;
const BALANCE_OF_ABI = [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const;

interface SideNavigationProps {
  externalMobileOpen?: boolean;
  onExternalMobileClose?: () => void;
}

const SideNavigation: React.FC<SideNavigationProps> = ({ externalMobileOpen, onExternalMobileClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { login, logout: privyLogout, authenticated, ready, getAccessToken } = usePrivy();
  const [shardCount, setShardCount] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isUsernameChangeModalOpen, setIsUsernameChangeModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpenInternal] = useState(false);

  const setIsMobileMenuOpen = (open: boolean) => {
    setIsMobileMenuOpenInternal(open);
    if (!open && onExternalMobileClose) onExternalMobileClose();
  };

  useEffect(() => {
    if (externalMobileOpen) setIsMobileMenuOpenInternal(true);
  }, [externalMobileOpen]);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isYourAccountsModalOpen, setIsYourAccountsModalOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLootBoxOpen, setIsLootBoxOpen] = useState(false);
  const [userLoadComplete, setUserLoadComplete] = useState(false);
  const { play } = useSound();
  const sessionCreatedForRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [accountMenuStyle, setAccountMenuStyle] = useState<React.CSSProperties>({});

  // Load collapsed state from localStorage and sync CSS variable
  useEffect(() => {
    const saved = localStorage.getItem('sideNavCollapsed');
    const collapsed = saved === 'true';
    setIsCollapsed(collapsed);
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '72px' : '265px');
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    play(next ? 'toggle-off' : 'toggle-on');
    setIsCollapsed(next);
    localStorage.setItem('sideNavCollapsed', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '72px' : '265px');
  };

  // Listen for toggle from TopNavigation / MobileBottomNav menu button
  useEffect(() => {
    const handler = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setIsMobileMenuOpenInternal(prev => {
          const next = !prev;
          if (!next && onExternalMobileClose) onExternalMobileClose();
          return next;
        });
      } else {
        toggleCollapsed();
      }
    };
    window.addEventListener('toggleSidebar', handler);

    const azuraHandler = () => setIsChatOpen(true);
    window.addEventListener('toggleAzuraChat', azuraHandler);

    return () => {
      window.removeEventListener('toggleSidebar', handler);
      window.removeEventListener('toggleAzuraChat', azuraHandler);
    };
  });

  const { data: proTokenBalance } = useReadContract({
    address: PRO_TOKEN_ADDRESS,
    abi: BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const isPro = !!proTokenBalance && proTokenBalance > 0n;

  // Create server session after wallet connects via ConnectKit
  const createSessionForWallet = async (walletAddress: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return;
    setIsCreatingSession(true);
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Check if we already have a session
      const meResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
      const meData = await meResponse.json().catch(() => ({ user: null }));

      if (meData.user) {
        setUsername(meData.user.username || null);
        setAvatarUrl(meData.user.avatarUrl || null);
        if (meData.user.shardCount !== undefined) setShardCount(meData.user.shardCount);
        setUserLoadComplete(true);
        window.dispatchEvent(new Event('userLoaded'));
        sessionCreatedForRef.current = walletAddress;
        // If user still has temp username, they need to complete onboarding
        if (!meData.user.username || meData.user.username.startsWith('user_')) {
          setIsOnboardingOpen(true);
        }
        return;
      }

      // No session yet — pass fresh Privy token for wallet auth
      const signupResponse = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders,
      });

      if (signupResponse.ok) {
        const signupData = await signupResponse.json().catch(() => ({}));
        const refreshResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store', headers: authHeaders });
        const refreshData = await refreshResponse.json().catch(() => ({ user: null }));
        if (refreshData.user) {
          setUsername(refreshData.user.username || null);
          setAvatarUrl(refreshData.user.avatarUrl || null);
          if (refreshData.user.shardCount !== undefined) setShardCount(refreshData.user.shardCount);
          setUserLoadComplete(true);
          window.dispatchEvent(new Event('userLoaded'));
          window.dispatchEvent(new Event('userLoggedIn'));
        }
        sessionCreatedForRef.current = walletAddress;
        // Open onboarding for new users or users who haven't completed setup
        if (!signupData.existing || !refreshData.user?.username || refreshData.user?.username?.startsWith('user_')) {
          setIsOnboardingOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to create session after wallet connect:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Auto-create session when wallet connects (only if Privy says ready + authenticated)
  useEffect(() => {
    if (!ready || !authenticated || !isConnected || !address) return;
    if (username && !username.startsWith('user_')) return; // Already fully logged in
    if (sessionCreatedForRef.current === address) return;

    const timer = setTimeout(() => createSessionForWallet(address), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, isConnected, address, username]);

  // Reset session tracking when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      sessionCreatedForRef.current = null;
    }
  }, [isConnected]);

  // Fetch user data (wait for Privy ready + authenticated, retry on failure)
  useEffect(() => {
    if (!ready || !authenticated) {
      setShardCount(null);
      setUsername(null);
      setAvatarUrl(null);
      setUserLoadComplete(false);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const fetchUserData = async (attempt = 1) => {
      if (cancelled) return;
      try {
        const token = await getAccessToken();
        if (!token && attempt <= 3) {
          // Privy token not ready yet — retry after delay
          console.warn('[SideNav] getAccessToken returned null, retry', attempt);
          retryTimer = setTimeout(() => fetchUserData(attempt + 1), attempt * 1500);
          return;
        }
        const response = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (cancelled) return;
        if (data?.user) {
          if (data.user.shardCount !== undefined) setShardCount(data.user.shardCount);
          setUsername(data.user.username || null);
          setAvatarUrl(data.user.avatarUrl || null);
          setUserLoadComplete(true);
          window.dispatchEvent(new Event('userLoaded'));
        } else {
          // Auth debug info from server
          if (data?.authDebug) {
            console.warn('[SideNav] /api/me returned no user.', data.authDebug);
            // Wallet extracted but no DB row — try creating the account
            if (data.authDebug.walletExtracted && data.authDebug.userNotFound && attempt <= 2) {
              console.warn('[SideNav] Wallet found but no user row — calling wallet-signup');
              await fetch('/api/auth/wallet-signup', {
                method: 'POST',
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              retryTimer = setTimeout(() => fetchUserData(attempt + 1), 1000);
              return;
            }
          }
          setShardCount(null);
          setUsername(null);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('[SideNav] Failed to fetch user data:', error);
        if (!cancelled && attempt <= 3) {
          retryTimer = setTimeout(() => fetchUserData(attempt + 1), attempt * 1500);
        }
      }
    };

    fetchUserData();

    const handleShardsUpdate = () => fetchUserData();
    const handleProfileUpdate = () => fetchUserData();
    window.addEventListener('shardsUpdated', handleShardsUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      window.removeEventListener('shardsUpdated', handleShardsUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [ready, authenticated, getAccessToken]);

  // Position account menu above the button on mobile (fixed positioning to escape overflow)
  useEffect(() => {
    if (isAccountMenuOpen && accountButtonRef.current && window.innerWidth <= 900) {
      const rect = accountButtonRef.current.getBoundingClientRect();
      setAccountMenuStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setAccountMenuStyle({});
    }
  }, [isAccountMenuOpen]);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAccountMenuOpen]);

  // Close mobile menu when clicking outside (but not on the hamburger button)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = '';
      };
    }
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleAvatarClick = () => {
    setIsAccountMenuOpen(false);
    setIsAvatarSelectorOpen(true);
  };

  const handleAvatarSelected = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handleUsernameClick = () => {
    setIsAccountMenuOpen(false);
    setIsUsernameChangeModalOpen(true);
  };

  const handleUsernameChanged = (newUsername: string) => {
    setUsername(newUsername);
  };

  const handleOnboardingComplete = (newUsername: string, newAvatarUrl: string | null) => {
    setUsername(newUsername);
    setAvatarUrl(newAvatarUrl);
    setIsOnboardingOpen(false);
    window.dispatchEvent(new Event('userLoggedIn'));
  };

  const handleSignOut = async () => {
    setIsAccountMenuOpen(false);

    // Clear server session + Privy cookies first (always runs)
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (err) { console.error('Server logout failed:', err); }
    // Then disconnect Privy client state
    try { await privyLogout(); } catch (err) { console.error('Privy logout failed:', err); }

    sessionCreatedForRef.current = null;
    setShardCount(null);
    setUsername(null);
    setAvatarUrl(null);

    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={styles.mobileTopBar}>
        <Link href="/home" className={styles.mobileLogoLink}>
          <span className={styles.mobileLogo}>Mental Wealth Academy</span>
        </Link>
        <button
          ref={hamburgerRef}
          className={`${styles.hamburgerButton} ${isMobileMenuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Side Navigation / Mobile Drawer */}
      <nav
        className={`${styles.sideNav} ${isMobileMenuOpen ? styles.sideNavOpen : ''} ${isCollapsed ? styles.sideNavCollapsed : ''}`}
        ref={mobileMenuRef}
      >

        {/* Navigation Sections */}
        <div className={styles.navSections}>
          {navSections.map((section) => {
            const isAdmin = section.id === 'network';
            const isExpanded = isAdmin ? adminExpanded : true;
            return (
            <React.Fragment key={section.id}>
            <div className={styles.section}>
              {section.label && (
              <button
                className={`${styles.sectionHeader} ${isAdmin ? styles.sectionHeaderToggle : ''}`}
                onClick={isAdmin ? () => setAdminExpanded(!adminExpanded) : undefined}
                type="button"
              >
                <span className={styles.sectionLabel}>{section.label}</span>
                {section.badge && (
                  <span className={`${styles.sectionBadge} ${section.badgeType === 'pro' ? styles.sectionBadgePro : ''}`}>
                    {section.badge}
                  </span>
                )}
                {isAdmin && (
                  <svg
                    className={`${styles.sectionChevron} ${adminExpanded ? styles.sectionChevronOpen : ''}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </button>
              )}
              <div className={`${styles.sectionItems} ${!isExpanded ? styles.sectionItemsCollapsed : ''}`}>
                {section.items.map((item) => (
                  item.requiresPro && !isPro ? (
                    <button
                      key={item.id}
                      onClick={() => {
                        play('click');
                        setIsProModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      onMouseEnter={() => play('hover')}
                      className={`${styles.navItem} ${styles.navItemButton}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {item.icon && (
                        <Image
                          src={item.icon}
                          alt=""
                          width={20}
                          height={20}
                          className={styles.navItemIcon}
                        />
                      )}
                      <span className={styles.navItemLabel}>{item.label}</span>
                      <span className={`${styles.badge} ${styles.badgePro}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3, verticalAlign: '-1px' }}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Pro
                      </span>
                    </button>
                  ) : item.disabled ? (
                    <div
                      key={item.id}
                      className={`${styles.navItem} ${styles.navItemDisabled}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {item.icon && (
                        <Image
                          src={item.icon}
                          alt=""
                          width={20}
                          height={20}
                          className={styles.navItemIcon}
                        />
                      )}
                      <span className={styles.navItemLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={`${styles.badge} ${item.badgeType === 'muted' ? styles.badgeMuted : item.badgeType === 'highlight' ? styles.badgeHighlight : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                      {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      onClick={() => {
                        play('navigation');
                        setIsMobileMenuOpen(false);
                      }}
                      onMouseEnter={() => play('hover')}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {item.icon && (
                        <Image
                          src={item.icon}
                          alt=""
                          width={20}
                          height={20}
                          className={styles.navItemIcon}
                        />
                      )}
                      <span className={styles.navItemLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={`${styles.badge} ${item.badgeType === 'highlight' ? styles.badgeHighlight : item.badgeType === 'green' ? styles.badgeGreen : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                ))}
              </div>
            </div>
            {/* Shiny card spacer between Featured and Tools */}
            {section.id === 'main' && (
              <div className={styles.shinyCardSpacer}>
                <button
                  className={styles.shinyCard}
                  onClick={() => {
                    play('click');
                    setIsChatOpen(true);
                  }}
                  onMouseEnter={() => play('hover')}
                  type="button"
                  title="Blue Agent"
                >
                  <div className={styles.shinyCardShine} />
                  <div className={styles.shinyCardContent}>
                    <div className={styles.shinyCardIcon}>
                      <Image src="https://i.imgur.com/3Y3KrnJ.png" alt="Azura" width={36} height={36} unoptimized />
                    </div>
                    {!isCollapsed && (
                      <div className={styles.shinyCardText}>
                        <span className={styles.shinyCardTitle}>Blue Agent</span>
                        <span className={styles.shinyCardSub}>Funds, Votes, Chat</span>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            )}
            </React.Fragment>
            );
          })}
        </div>

        {/* Bottom Section - Inventory, Wallet */}
        <div className={styles.bottomSection}>
          {/* Gems Counter */}
          <div className={styles.gemsRow}>
            <button
              className={styles.shardsCounter}
              onClick={() => { play('click'); setIsInventoryOpen(true); }}
              onMouseEnter={() => play('hover')}
              type="button"
              title="Inventory"
            >
              <Image
                src="/icons/ui-shard.svg"
                alt="Gems"
                width={20}
                height={20}
                className={styles.shardIcon}
              />
              {!isCollapsed && (
                <>
                  <span className={styles.shardsLabel}>Inventory:</span>
                  <span className={styles.shardsValue}>
                    <span className={styles.slideTextWrap}>
                      <span className={styles.slideText}>{shardCount !== null ? String(shardCount).padStart(3, '0') : '000'}</span>
                      <span className={`${styles.slideText} ${styles.slideTextClone}`}>{shardCount !== null ? String(shardCount).padStart(3, '0') : '000'}</span>
                    </span>
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Account Button or Connect Account */}
          {((isConnected && address) || (username && !username.startsWith('user_'))) && userLoadComplete ? (
            <div className={styles.accountSection} ref={accountMenuRef}>
              <button
                ref={accountButtonRef}
                className={styles.accountButton}
                onClick={() => {
                  play('click');
                  setIsAccountMenuOpen(!isAccountMenuOpen);
                }}
                onMouseEnter={() => play('hover')}
                title={username && !username.startsWith('user_') ? `@${username}` : address ? truncateAddress(address) : 'Connected'}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username || 'Account'}
                    width={32}
                    height={32}
                    className={styles.accountAvatar}
                    unoptimized
                  />
                ) : (
                  <div className={styles.accountAvatar} style={{ width: 32, height: 32, background: '#5168FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                    {address ? address.slice(2, 4).toUpperCase() : '?'}
                  </div>
                )}
                {!isCollapsed && (
                  <span className={styles.accountUsername}>
                    <span className={styles.slideTextWrap}>
                      <span className={styles.slideText}>{username && !username.startsWith('user_') ? `@${username}` : address ? truncateAddress(address) : 'Connected'}</span>
                      <span className={`${styles.slideText} ${styles.slideTextClone}`}>{username && !username.startsWith('user_') ? `@${username}` : address ? truncateAddress(address) : 'Connected'}</span>
                    </span>
                  </span>
                )}
              </button>

              {isAccountMenuOpen && (
                <div className={styles.accountMenu} style={accountMenuStyle}>
                  <button
                    className={styles.accountMenuItem}
                    onClick={() => {
                      play('click');
                      setIsAccountMenuOpen(false);
                      setIsInventoryOpen(true);
                    }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>PROFILE</span>
                  </button>
                  <button
                    className={styles.accountMenuItem}
                    onClick={() => {
                      play('click');
                      setIsAccountMenuOpen(false);
                      setIsYourAccountsModalOpen(true);
                    }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>Connections</span>
                  </button>
                  <div className={styles.accountMenuDivider} />
                  <button
                    className={styles.accountMenuItem}
                    onClick={() => { play('click'); handleAvatarClick(); }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>Change Avatar</span>
                  </button>
                  <button
                    className={styles.accountMenuItem}
                    onClick={() => { play('click'); handleUsernameClick(); }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>Change Username</span>
                  </button>
                  <div className={styles.accountMenuDivider} />
                  <button
                    className={styles.accountMenuItem}
                    onClick={() => { play('click'); handleSignOut(); }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className={styles.connectWalletButton}
              onClick={() => {
                play('click');
                login();
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={() => play('hover')}
              disabled={isCreatingSession}
              title="Sign In"
            >
              {isCollapsed ? (
                <Image src="/icons/ui-plug.svg" alt="" width={18} height={18} style={{ filter: 'invert(1)' }} />
              ) : (
                <>
                  <span className={styles.slideTextWrap}>
                    <span className={styles.slideText}>{isCreatingSession ? 'Connecting...' : 'Sign In'}</span>
                    <span className={`${styles.slideText} ${styles.slideTextClone}`}>{isCreatingSession ? 'Connecting...' : 'Sign In'}</span>
                  </span>
                  <Image src="/icons/ui-plug.svg" alt="" width={16} height={16} style={{ marginLeft: 6, filter: 'invert(1)' }} />
                </>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      <AzuraChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        shardCount={shardCount}
        username={username}
        avatarUrl={avatarUrl}
      />
      <LootBoxModal
        isOpen={isLootBoxOpen}
        onClose={() => setIsLootBoxOpen(false)}
        shardCount={shardCount}
        onShardsSpent={(newCount) => setShardCount(newCount)}
      />
      <ProMembershipModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
      {isYourAccountsModalOpen && (
        <YourAccountsModal onClose={() => setIsYourAccountsModalOpen(false)} />
      )}
      {isAvatarSelectorOpen && (
        <AvatarSelectorModal
          onClose={() => setIsAvatarSelectorOpen(false)}
          onAvatarSelected={handleAvatarSelected}
        />
      )}
      {isUsernameChangeModalOpen && (
        <UsernameChangeModal
          onClose={() => setIsUsernameChangeModalOpen(false)}
          currentUsername={username || ''}
          onUsernameChanged={handleUsernameChanged}
        />
      )}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />

    </>
  );
};

export default SideNavigation;
