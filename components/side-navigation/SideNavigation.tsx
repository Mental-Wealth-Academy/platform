'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import type { IconProps } from '@phosphor-icons/react';
import styles from './SideNavigation.module.css';
import { useSound } from '@/hooks/useSound';
import { useInitialSidebarCollapsed } from './SidebarStateProvider';
import HoverSlideText from '@/components/shared/HoverSlideText';

const BlueChat = dynamic(() => import('../blue-chat/BlueChat'), { ssr: false });
const BlueCallingOverlay = dynamic(() => import('../blue-calling-overlay/BlueCallingOverlay'), { ssr: false });
const SidebarProfileCard = dynamic(() => import('../sidebar-profile-card/SidebarProfileCard'), { ssr: false });
const WalletDrawer = dynamic(() => import('../wallet-drawer/WalletDrawer'), { ssr: false });
const AvatarSelectorModal = dynamic(() => import('../avatar-selector/AvatarSelectorModal'), { ssr: false });
const UsernameChangeModal = dynamic(() => import('../username-change/UsernameChangeModal'), { ssr: false });
const ProMembershipModal = dynamic(() => import('../pro-membership-modal/ProMembershipModal'), { ssr: false });
const AngelUpsellModal = dynamic(() => import('../angel-upsell-modal/AngelUpsellModal'), { ssr: false });

const YourAccountsModal = dynamic(() => import('../nav-buttons/YourAccountsModal'), { ssr: false });
const SubmitProposalModal = dynamic(() => import('../voting/SubmitProposalModal'), { ssr: false });

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  iconSrc?: string;
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

const proFeaturesSection: NavSection = {
  id: 'extras',
  label: 'Pro Features',
  badge: 'Pro',
  badgeType: 'pro',
  items: [
    { id: 'simulations', label: 'Simulations', href: '/simulation', iconSrc: '/icons/nav-simulations-v2.svg?v=4' },
    { id: 'lists', label: 'Lists', href: '/list', iconSrc: '/icons/nav-journal-v3.svg' },
  ],
};

const desktopNavSections: NavSection[] = [proFeaturesSection];

const mobileNavSections: NavSection[] = [proFeaturesSection];

const primaryNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Profile',
    href: '/home',
    iconSrc: '/icons/nav-profile.svg',
  },
  {
    id: 'learn',
    label: 'Library',
    href: '/learn',
    iconSrc: '/icons/daemon.svg?v=4',
  },
  {
    id: 'genetics',
    label: 'Genetics',
    href: '/genetics',
    iconSrc: '/icons/genetics.svg?v=4',
  },
];

const bottomNavItems: NavItem[] = [
  { 
    id: 'surveys',
    label: 'Surveys',
    href: '/surveys',
    iconSrc: '/icons/nav-surveys-v5.svg?v=4',
  },
];

interface SideNavigationProps {
  externalMobileOpen?: boolean;
  onExternalMobileClose?: () => void;
}

const SIDEBAR_EXPANDED_WIDTH = '245px';
const SIDEBAR_COLLAPSED_WIDTH = '72px';

function syncSidebarPreference(collapsed: boolean) {
  if (typeof document === 'undefined') return;

  const value = collapsed ? 'true' : 'false';
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
  document.documentElement.setAttribute('data-sidebar-collapsed', value);
  document.documentElement.style.setProperty('--sidebar-width', width);

  try {
    localStorage.setItem('sideNavCollapsed', value);
  } catch {
    // Ignore unavailable storage and still keep the in-memory layout stable.
  }

  document.cookie = `sideNavCollapsed=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

const NavIconMark: React.FC<{
  icon?: NavItem['icon'];
  iconSrc?: string;
  isActive?: boolean;
  preserveColor?: boolean;
}> = ({ icon: Icon, iconSrc, isActive = false, preserveColor = false }) => {
  if (iconSrc) {
    return (
      <span className={`${styles.navItemIconWrap} ${isActive ? styles.navItemIconWrapActive : ''}`} aria-hidden="true">
        <Image
          src={iconSrc}
          alt=""
          width={20}
          height={20}
          unoptimized
          className={`${styles.navItemImageIcon} ${preserveColor ? styles.navItemImageIconOriginal : ''} ${isActive ? styles.navItemImageIconActive : ''}`}
        />
      </span>
    );
  }

  if (!Icon) return null;

  return (
    <span className={`${styles.navItemIconWrap} ${isActive ? styles.navItemIconWrapActive : ''}`} aria-hidden="true">
      <Icon
        size={20}
        weight={isActive ? 'fill' : 'regular'}
        className={`${styles.navItemIcon} ${isActive ? styles.navItemIconActive : ''}`}
      />
    </span>
  );
};

function getPersistedSidebarState(): boolean {
  try {
    const saved = localStorage.getItem('sideNavCollapsed');
    if (saved === 'false') return false;
    if (saved === 'true') return true;
  } catch {}
  const attr = document.documentElement.getAttribute('data-sidebar-collapsed');
  if (attr === 'false') return false;
  return true;
}

const SideNavigation: React.FC<SideNavigationProps> = ({ externalMobileOpen, onExternalMobileClose }) => {
  const initialCollapsed = useInitialSidebarCollapsed();
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { login, logout: privyLogout, authenticated, ready, getAccessToken } = usePrivy();
  const [shardCount, setShardCount] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallingBlue, setIsCallingBlue] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isUsernameChangeModalOpen, setIsUsernameChangeModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpenInternal] = useState(false);

  const setIsMobileMenuOpen = useCallback((open: boolean) => {
    setIsMobileMenuOpenInternal(open);
    if (!open && onExternalMobileClose) onExternalMobileClose();
  }, [onExternalMobileClose]);

  useEffect(() => {
    if (externalMobileOpen) setIsMobileMenuOpenInternal(true);
  }, [externalMobileOpen]);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isAngelModalOpen, setIsAngelModalOpen] = useState(false);

  // Pro Features starts open so the links moved out of the top nav stay visible.
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [isYourAccountsModalOpen, setIsYourAccountsModalOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sideNavCollapsed');
      if (saved === 'false') return false;
      if (saved === 'true') return true;
    } catch {}
    return initialCollapsed;
  });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [userLoadComplete, setUserLoadComplete] = useState(false);
  const [hasVipMembershipCard, setHasVipMembershipCard] = useState<boolean | null>(null);
  const { play } = useSound();
  const sessionCreatedForRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [accountMenuStyle, setAccountMenuStyle] = useState<React.CSSProperties>({});
  const [profileSlot, setProfileSlot] = useState<HTMLElement | null>(null);
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false);

  // Locate the top-nav slot the profile card portals into.
  useEffect(() => {
    const timer = setTimeout(() => {
      setProfileSlot(document.getElementById('topnav-profile-slot'));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // The mobile top-nav profile icon opens the wallet drawer via a window event.
  useEffect(() => {
    const open = () => setWalletDrawerOpen(true);
    window.addEventListener('openWalletDrawer', open);
    return () => window.removeEventListener('openWalletDrawer', open);
  }, []);


  // Sync CSS variable + data attribute on mount to match persisted preference
  useEffect(() => {
    syncSidebarPreference(isCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = useCallback(() => {
    const next = !isCollapsed;
    play(next ? 'toggle-off' : 'toggle-on');
    setIsCollapsed(next);
    syncSidebarPreference(next);
  }, [isCollapsed, play]);

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

    const blueChatHandler = () => setIsCallingBlue(true);
    window.addEventListener('toggleBlueChat', blueChatHandler);
    window.addEventListener('callBlue', blueChatHandler);

    const openProHandler = () => setIsProModalOpen(true);
    window.addEventListener('openProModal', openProHandler);

    return () => {
      window.removeEventListener('toggleSidebar', handler);
      window.removeEventListener('toggleBlueChat', blueChatHandler);
      window.removeEventListener('callBlue', blueChatHandler);
      window.removeEventListener('openProModal', openProHandler);
    };
  }, [onExternalMobileClose, toggleCollapsed]);

  const refreshVipMembershipStatus = useCallback(async () => {
    if (!ready || !authenticated) {
      setHasVipMembershipCard(false);
      return;
    }

    try {
      const token = await getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const urls = address
        ? [`/api/account/status?walletAddress=${encodeURIComponent(address)}`, '/api/account/status']
        : ['/api/account/status'];
      const statuses = await Promise.all(
        urls.map((url) => window.fetch(url, {
          cache: 'no-store',
          credentials: 'include',
          headers,
        })
          .then((response) => (response.ok ? response.json().catch(() => null) : null))
          .catch(() => null)),
      );
      setHasVipMembershipCard(statuses.some((status) => Boolean(status?.hasVipMembershipCard)));
    } catch {
      setHasVipMembershipCard(false);
    }
  }, [address, authenticated, getAccessToken, ready]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setHasVipMembershipCard(false);
      return;
    }

    void refreshVipMembershipStatus();
  }, [authenticated, ready, refreshVipMembershipStatus]);

  useEffect(() => {
    const handler = () => {
      void refreshVipMembershipStatus();
    };

    window.addEventListener('vipMembershipUpdated', handler);
    return () => window.removeEventListener('vipMembershipUpdated', handler);
  }, [refreshVipMembershipStatus]);

  useEffect(() => {
    const handler = () => setIsAngelModalOpen(true);
    window.addEventListener('openAngelModal', handler);
    return () => window.removeEventListener('openAngelModal', handler);
  }, []);

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
          window.dispatchEvent(new Event('openOnboarding'));
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
          window.dispatchEvent(new Event('openOnboarding'));
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
        if (!token && attempt <= 5) {
          // Privy token not ready yet — poll responsively (it usually
          // arrives within a few hundred ms once Privy is authenticated).
          console.warn('[SideNav] getAccessToken returned null, retry', attempt);
          retryTimer = setTimeout(() => fetchUserData(attempt + 1), attempt * 400);
          return;
        }
        const response = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || `/api/me request failed (${response.status})`);
        }
        if (!data) {
          throw new Error('/api/me returned a non-JSON response.');
        }
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
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, setIsMobileMenuOpen]);

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

  const navSections = isMobileMenuOpen ? mobileNavSections : desktopNavSections;
  const extrasSection = navSections.find((section) => section.id === 'extras');
  const hasDisplayProfile = !!(username && !username.startsWith('user_'));
  const hasConnectedWallet = !!(isConnected && address);
  const shouldShowProfileCards = hasConnectedWallet || hasDisplayProfile;

  const renderSection = (section: NavSection) => {
    const isExtras = section.id === 'extras';
    const isExpanded = isExtras ? adminExpanded : true;

    return (
      <div className={styles.section}>
        {section.label && (
          <button
            className={`${styles.sectionHeader} hover-slide-trigger ${isExtras ? styles.sectionHeaderToggle : ''}`}
            onClick={isExtras ? () => setAdminExpanded(!adminExpanded) : undefined}
            type="button"
          >
            <span className={styles.sectionLabel}><HoverSlideText>{section.label}</HoverSlideText></span>
            {section.badge && (
              <span className={`${styles.sectionBadge} ${section.badgeType === 'pro' ? styles.sectionBadgePro : ''}`}>
                {section.badge}
              </span>
            )}
            {isExtras && (
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
          {section.items.map((item) => {
            const active = isActive(item.href);
            const proState = !item.requiresPro
              ? 'public'
              : hasVipMembershipCard === true
                ? 'unlocked'
                : hasVipMembershipCard === false
                  ? 'locked'
                  : 'checking';

            return proState === 'checking' ? (
              <div
                key={item.id}
                className={`${styles.navItem} ${styles.navItemDisabled}`}
                title={isCollapsed ? item.label : undefined}
                aria-busy="true"
                data-tour={item.id === 'markets' ? 'markets' : undefined}
              >
                <NavIconMark icon={item.icon} iconSrc={item.iconSrc} />
                <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
              </div>
            ) : proState === 'locked' ? (
              <button
                key={item.id}
                onClick={() => {
                  play('error');
                  setIsProModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                onMouseEnter={() => play('soft-hover')}
                className={`${styles.navItem} ${styles.navItemButton} hover-slide-trigger`}
                title={isCollapsed ? item.label : undefined}
                aria-label={`${item.label}, locked; VIP membership required`}
                data-tour={item.id === 'markets' ? 'markets' : undefined}
              >
                <NavIconMark icon={item.icon} iconSrc={item.iconSrc} />
                <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
              </button>
            ) : item.disabled ? (
              <div
                key={item.id}
                className={`${styles.navItem} ${styles.navItemDisabled}`}
                title={isCollapsed ? item.label : undefined}
                data-tour={item.id === 'markets' ? 'markets' : undefined}
              >
                <NavIconMark icon={item.icon} iconSrc={item.iconSrc} />
                <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
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
                className={`${styles.navItem} hover-slide-trigger ${active ? styles.navItemActive : ''}`}
                {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => {
                  play('soft-hover');
                  setIsMobileMenuOpen(false);
                }}
                onMouseEnter={() => play('soft-hover')}
                title={isCollapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                data-tour={item.id === 'markets' ? 'markets' : undefined}
              >
                <NavIconMark icon={item.icon} iconSrc={item.iconSrc} isActive={active} />
                <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
                {item.badge && (
                  <span className={`${styles.badge} ${item.requiresPro ? styles.badgeUnlocked : item.badgeType === 'highlight' ? styles.badgeHighlight : item.badgeType === 'green' ? styles.badgeGreen : item.badgeType === 'pro' ? styles.badgePro : ''}`}>
                    {item.requiresPro ? 'VIP' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProfileCard = (collapsed: boolean) => {
    if (!shouldShowProfileCards) return null;
    return (
      <SidebarProfileCard
        username={username}
        avatarUrl={avatarUrl}
        address={address}
        isCollapsed={collapsed}
        onOpenWallet={() => setWalletDrawerOpen(true)}
      />
    );
  };

  const walletDisplayName = username && !username.startsWith('user_') ? username : null;
  const walletInitials = walletDisplayName
    ? walletDisplayName.slice(0, 2).toUpperCase()
    : address
    ? address.slice(2, 4).toUpperCase()
    : '??';

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

        {/* Profile card — mobile drawer only; desktop renders it in the top nav */}
        <div className={styles.mobileProfileSlot}>
          {renderProfileCard(false)}
        </div>

        {/* Navigation Sections */}
        <div className={styles.navSections}>
          <div className={styles.navPrimaryGroup}>
            {primaryNavItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${styles.navItem} hover-slide-trigger ${active ? styles.navItemActive : ''}`}
                  onClick={() => {
                    play('soft-hover');
                    setIsMobileMenuOpen(false);
                  }}
                  onMouseEnter={() => play('soft-hover')}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                <NavIconMark
                  icon={item.icon}
                  iconSrc={item.iconSrc}
                  isActive={active}
                  preserveColor={item.id === 'shop'}
                />
                <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
              </Link>
              );
            })}

            {/* Bottom group: Surveys */}
            <div className={styles.navBottomGroup}>
              {bottomNavItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`${styles.navItem} hover-slide-trigger ${active ? styles.navItemActive : ''}`}
                    data-tour={item.id === 'quests' || item.id === 'events' ? 'quests' : undefined}
                    onClick={() => {
                      play('soft-hover');
                      setIsMobileMenuOpen(false);
                    }}
                    onMouseEnter={() => play('soft-hover')}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <NavIconMark
                      icon={item.icon}
                      iconSrc={item.iconSrc}
                      isActive={active}
                      preserveColor={item.id === 'shop'}
                    />
                    <span className={styles.navItemLabel}><HoverSlideText>{item.label}</HoverSlideText></span>
                  </Link>
                );
              })}
            </div>
          </div>

          {extrasSection && (
            <div className={styles.navExtrasGroup}>
              {renderSection(extrasSection)}
            </div>
          )}
        </div>

        {/* Navigation Footer / Social Links */}
        {!isCollapsed && (
          <div className={styles.sidebarFooter}>
            {/* Social Icons row */}
            <div className={styles.socialIconsRow}>
              <a href="https://x.com/MentalWealthDAO" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="X (Twitter)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                </svg>
              </a>
              <a href="https://discord.gg/ZTRVCYwncs" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Discord">
                <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2a75.58,75.58,0,0,0,73,0c.83.71,1.68,1.4,2.58,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.61-18.83C129.87,50.75,124,27.93,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                </svg>
              </a>
              <a href="https://github.com/mental-Wealth-Academy/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/mentalwealthacademy" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="LinkedIn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>

            {/* Text Links rows */}
            <div className={styles.footerLinksRow}>
              <Link href="/guidebook" className={styles.footerLink}>Guidebook</Link>
              <span className={styles.footerDot}>•</span>
              <Link href="/style-guide" className={`${styles.footerLink} ${styles.changelogLink}`}>Style Guide</Link>
            </div>
            <div className={styles.footerLinksRow}>
              <span className={styles.footerLink} style={{ pointerEvents: 'none', cursor: 'default' }}>Terms</span>
              <span className={styles.footerLink} style={{ pointerEvents: 'none', cursor: 'default' }}>Privacy</span>
              <span className={styles.footerLink} style={{ pointerEvents: 'none', cursor: 'default' }}>Support</span>
            </div>
          </div>
        )}

      </nav>

      {/* Profile card portaled into the top nav far-right slot (desktop) */}
      {profileSlot && createPortal(renderProfileCard(false), profileSlot)}



      {/* Modals */}
      {isChatOpen && <BlueChat isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setStartWithVoice(false); }} startWithVoice={startWithVoice} />}
      {isCallingBlue && (
        <BlueCallingOverlay
          onAccept={() => { setIsCallingBlue(false); setStartWithVoice(true); setIsChatOpen(true); }}
          onDecline={() => setIsCallingBlue(false)}
        />
      )}
      {isProModalOpen && (
        <ProMembershipModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
      )}
      {isAngelModalOpen && (
        <AngelUpsellModal
          isOpen={isAngelModalOpen}
          onClose={() => setIsAngelModalOpen(false)}
        />
      )}
      {isYourAccountsModalOpen && (
        <YourAccountsModal onClose={() => setIsYourAccountsModalOpen(false)} />
      )}
      {shouldShowProfileCards && (
        <WalletDrawer
          open={walletDrawerOpen}
          onClose={() => setWalletDrawerOpen(false)}
          displayName={walletDisplayName}
          initials={walletInitials}
          avatarUrl={avatarUrl}
          address={address}
          onChangeAvatar={handleAvatarClick}
          onChangeUsername={handleUsernameClick}
          onConnections={() => setIsYourAccountsModalOpen(true)}
          onSignOut={handleSignOut}
        />
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
      {isSubmitModalOpen && (
        <SubmitProposalModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          mode="experiment"
        />
      )}

    </>
  );
};

export default SideNavigation;
