'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useModal } from 'connectkit';
import styles from './SideNavigation.module.css';
import AudioPlayer from '../audio-player/AudioPlayer';
import AzuraChat from '../azura-chat/AzuraChat';
import AvatarSelectorModal from '../avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '../username-change/UsernameChangeModal';
import ProMembershipModal from '../pro-membership-modal/ProMembershipModal';

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
    id: 'featured',
    label: 'Featured',
    items: [
      { id: 'home', label: 'Home', href: '/home', icon: '/icons/Home Icon.svg' },
    ],
  },
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'courses', label: 'Courses', href: '/courses', icon: '/icons/Graduate.svg' },
      { id: 'tasks', label: 'Tasks', href: '/tasks', icon: '/icons/Survey.svg' },
      { id: 'chapters', label: 'Chapters', href: '/chapters', icon: '/icons/Library Icon.svg' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'quests', label: 'Quests', href: '/quests', icon: '/icons/World Icon.svg' },
      { id: 'livestream', label: 'Livestream', href: '/livestream', icon: '/icons/livestream.svg' },
      { id: 'agents', label: 'Agents', href: '/agents', icon: '/icons/daemon.svg' },
      { id: 'ai-coach', label: 'Azura AI', href: '/coach', icon: '/icons/ai-coach.png', badge: 'New', badgeType: 'green' },
      { id: 'podcasts', label: 'Podcasts', href: '/podcasts', icon: '/icons/Library Icon.svg' },
      { id: 'voting', label: 'Treasury', href: '/voting', icon: '/icons/Vote Icon (1).svg' },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN',
    badge: 'Access With Pro',
    badgeType: 'pro',
    items: [
      { id: 'squads', label: 'Squads', href: '/squads', icon: '/icons/Venetian carnival.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
      { id: 'videos', label: 'Videos', href: '/videos', icon: '/icons/Eye.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
      { id: 'files', label: 'Files', href: '/files', icon: '/icons/bookicon.svg', badge: 'Pro', badgeType: 'pro', requiresPro: true },
      { id: 'newsletter', label: 'Newsletter', href: 'https://mentalwealthacademy.net', icon: '/icons/newsletter.svg' },
    ],
  },
];

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
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
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
        className={`${styles.sideNav} ${isMobileMenuOpen ? styles.sideNavOpen : ''}`}
        ref={mobileMenuRef}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.logoText}>Mental Wealth Academy</span>
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

        {/* Music Player */}
        <div className={styles.topMusicPlayer}>
          <AudioPlayer />
        </div>

        {/* User Account Section - Top (only when logged in) */}
        {username && !username.startsWith('user_') && (
          <div className={styles.topAccountSection}>
            <div className={styles.accountSection} ref={accountMenuRef}>
              <button
                className={styles.accountButton}
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              >
                {avatarUrl && (
                  <Image
                    src={avatarUrl}
                    alt={username}
                    width={32}
                    height={32}
                    className={styles.accountAvatar}
                    unoptimized
                  />
                )}
                <span className={styles.accountUsername}>@{username}</span>
              </button>

              {isAccountMenuOpen && (
                <div className={styles.accountMenu}>
                  <button
                    className={styles.accountMenuItem}
                    onClick={handleAvatarClick}
                  >
                    <span className={styles.accountMenuLabel}>Change Avatar</span>
                  </button>
                  <button
                    className={styles.accountMenuItem}
                    onClick={handleUsernameClick}
                  >
                    <span className={styles.accountMenuLabel}>Change Username</span>
                  </button>
                  <div className={styles.accountMenuDivider} />
                  <button
                    className={styles.accountMenuItem}
                    onClick={handleSignOut}
                  >
                    <span className={styles.accountMenuLabel}>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className={styles.navSections}>
          {navSections.map((section) => (
            <div key={section.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>{section.label}</span>
                {section.badge && (
                  <span className={`${styles.sectionBadge} ${section.badgeType === 'pro' ? styles.sectionBadgePro : ''}`}>
                    {section.badge}
                  </span>
                )}
              </div>
              <div className={styles.sectionItems}>
                {section.items.map((item) => (
                  item.id === 'ai-coach' ? (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsChatOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`${styles.navItem} ${styles.navItemButton}`}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className={styles.navItemIcon}
                      />
                      <span className={styles.navItemLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={`${styles.badge} ${item.badgeType === 'highlight' ? styles.badgeHighlight : item.badgeType === 'green' ? styles.badgeGreen : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ) : item.requiresPro ? (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsProModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`${styles.navItem} ${styles.navItemButton}`}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className={styles.navItemIcon}
                      />
                      <span className={styles.navItemLabel}>{item.label}</span>
                      {item.badge && (
                        <span className={`${styles.badge} ${styles.badgePro}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ) : item.disabled ? (
                    <div
                      key={item.id}
                      className={`${styles.navItem} ${styles.navItemDisabled}`}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className={styles.navItemIcon}
                      />
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
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className={styles.navItemIcon}
                      />
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
          ))}
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          {/* Connect Wallet Button (when not logged in) */}
          {(!username || username.startsWith('user_')) && (
            <button
              className={styles.connectWalletButton}
              onClick={() => {
                openConnectModal(true);
                setIsMobileMenuOpen(false);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M17 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="13" y="9" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="15" cy="11" r="1" fill="currentColor"/>
              </svg>
              <span>Connect Wallet</span>
            </button>
          )}

          {/* Daemon Shards Counter */}
          <div className={styles.shardsCounter}>
            <Image
              src="/icons/shard.svg"
              alt="Daemon"
              width={20}
              height={20}
              className={styles.shardIcon}
            />
            <span className={styles.shardsLabel}>Daemon:</span>
            <span className={styles.shardsValue}>
              {shardCount !== null ? String(shardCount).padStart(3, '0') : '000'}
            </span>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <AzuraChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <ProMembershipModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
      {isAvatarSelectorOpen && (
        <AvatarSelectorModal
          onClose={() => setIsAvatarSelectorOpen(false)}
          onAvatarSelected={handleAvatarSelected}
        />
      )}
      {isUsernameChangeModalOpen && username && (
        <UsernameChangeModal
          onClose={() => setIsUsernameChangeModalOpen(false)}
          currentUsername={username}
          onUsernameChanged={handleUsernameChanged}
        />
      )}
    </>
  );
};

export default SideNavigation;
