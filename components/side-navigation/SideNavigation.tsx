'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount, useDisconnect, useReadContract } from 'wagmi';
import { useModal } from 'connectkit';
import styles from './SideNavigation.module.css';
import AzuraChat from '../azura-chat/AzuraChat';
import AvatarSelectorModal from '../avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '../username-change/UsernameChangeModal';
import ProMembershipModal from '../pro-membership-modal/ProMembershipModal';
import InventoryModal from '../inventory-modal/InventoryModal';
import YourAccountsModal from '../nav-buttons/YourAccountsModal';
import OnboardingModal from '../onboarding/OnboardingModal';
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
    label: '',
    items: [
      { id: 'voting', label: 'Home', href: '/home', icon: '/icons/Home Icon.svg' },
      { id: 'community', label: 'Community', href: '/community', icon: '/icons/governance.svg' },
      { id: 'shop', label: 'Shop', href: '/shop', icon: '/icons/shop.svg' },
      { id: 'guidance', label: 'Guidance', href: '/guidance', icon: '/icons/guidance.svg' },
      { id: 'treasury', label: 'Markets', href: '/treasury', icon: '/icons/treasury.svg' },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN TOOLS',
    badge: 'Access With Pro',
    badgeType: 'pro',
    items: [
      { id: 'chapters', label: 'World', href: '/chapters', icon: '/icons/World Icon.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
      { id: 'genetics', label: 'Genetics', href: '/genetics', icon: '/icons/dna.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
      { id: 'research', label: 'Research', href: '/research', icon: '/icons/research.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
    ],
  },
];

const PRO_TOKEN_ADDRESS = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F' as const;
const BALANCE_OF_ABI = [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const;

const SideNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { setOpen: openConnectModal } = useModal();
  const [shardCount, setShardCount] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isUsernameChangeModalOpen, setIsUsernameChangeModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isYourAccountsModalOpen, setIsYourAccountsModalOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const { play } = useSound();
  const sessionCreatedForRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

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
      // Check if we already have a session
      const meResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
      const meData = await meResponse.json().catch(() => ({ user: null }));

      if (meData.user) {
        setUsername(meData.user.username || null);
        setAvatarUrl(meData.user.avatarUrl || null);
        if (meData.user.shardCount !== undefined) setShardCount(meData.user.shardCount);
        sessionCreatedForRef.current = walletAddress;
        // If user still has temp username, they need to complete onboarding
        if (!meData.user.username || meData.user.username.startsWith('user_')) {
          setIsOnboardingOpen(true);
        }
        return;
      }

      // No session yet - create account with wallet address
      const signupResponse = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress }),
      });

      if (signupResponse.ok) {
        const signupData = await signupResponse.json().catch(() => ({}));
        const refreshResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const refreshData = await refreshResponse.json().catch(() => ({ user: null }));
        if (refreshData.user) {
          setUsername(refreshData.user.username || null);
          setAvatarUrl(refreshData.user.avatarUrl || null);
          if (refreshData.user.shardCount !== undefined) setShardCount(refreshData.user.shardCount);
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

  // Auto-create session when wallet connects
  useEffect(() => {
    if (!isConnected || !address) return;
    if (username && !username.startsWith('user_')) return; // Already fully logged in
    if (sessionCreatedForRef.current === address) return;

    const timer = setTimeout(() => createSessionForWallet(address), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, username]);

  // Reset session tracking when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      sessionCreatedForRef.current = null;
    }
  }, [isConnected]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json();
        if (data?.user) {
          if (data.user.shardCount !== undefined) {
            setShardCount(data.user.shardCount);
          }
          setUsername(data.user.username || null);
          setAvatarUrl(data.user.avatarUrl || null);
        } else {
          setShardCount(null);
          setUsername(null);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setShardCount(null);
        setUsername(null);
        setAvatarUrl(null);
      }
    };

    fetchUserData();

    const handleShardsUpdate = () => fetchUserData();
    const handleProfileUpdate = () => fetchUserData();
    window.addEventListener('shardsUpdated', handleShardsUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('shardsUpdated', handleShardsUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

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

    if (isConnected) {
      disconnect();
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to logout:', err);
    }

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
          <span className={styles.mobileLogo}>MWA</span>
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
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.logoText}>{isCollapsed ? 'MWA' : 'Mental Wealth Academy'}</span>
          <button
            className={styles.collapseButton}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapsed}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              ) : (
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
              )}
            </svg>
          </button>
          <button
            className={styles.closeMenuButton}
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className={styles.navSections}>
          {navSections.map((section) => {
            const isAdmin = section.id === 'admin';
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
                  title="Azura Agent"
                >
                  <div className={styles.shinyCardShine} />
                  <div className={styles.shinyCardContent}>
                    <div className={styles.shinyCardIcon}>
                      <Image src="https://i.imgur.com/AkflhaJ.png" alt="Azura" width={36} height={36} unoptimized />
                    </div>
                    {!isCollapsed && (
                      <div className={styles.shinyCardText}>
                        <span className={styles.shinyCardTitle}>Azura Agent</span>
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
                src="/icons/shard.svg"
                alt="Gems"
                width={20}
                height={20}
                className={styles.shardIcon}
              />
              {!isCollapsed && (
                <>
                  <span className={styles.shardsLabel}>Inventory:</span>
                  <span className={styles.shardsValue}>
                    {shardCount !== null ? String(shardCount).padStart(3, '0') : '000'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Account Button or Connect Account */}
          {(isConnected && address) || (username && !username.startsWith('user_')) ? (
            <div className={styles.accountSection} ref={accountMenuRef}>
              <button
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
                    {username && !username.startsWith('user_') ? `@${username}` : address ? truncateAddress(address) : 'Connected'}
                  </span>
                )}
              </button>

              {isAccountMenuOpen && (
                <div className={styles.accountMenu}>
                  <Link
                    href="/voting"
                    className={styles.accountMenuItem}
                    onClick={() => {
                      play('navigation');
                      setIsAccountMenuOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                    onMouseEnter={() => play('hover')}
                  >
                    <span className={styles.accountMenuLabel}>PROFILE</span>
                  </Link>
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
                openConnectModal(true);
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={() => play('hover')}
              disabled={isCreatingSession}
              title="Sign In"
            >
              {isCollapsed ? (
                <Image src="/icons/plug.svg" alt="" width={18} height={18} style={{ filter: 'invert(1)' }} />
              ) : (
                <>
                  <span>{isCreatingSession ? 'Connecting...' : 'Sign In'}</span>
                  <Image src="/icons/plug.svg" alt="" width={16} height={16} style={{ marginLeft: 6, filter: 'invert(1)' }} />
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
