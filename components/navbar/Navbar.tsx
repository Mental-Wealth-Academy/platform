'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import YourAccountsModal from '@/components/nav-buttons/YourAccountsModal';
import AvatarSelectorModal from '@/components/avatar-selector/AvatarSelectorModal';
import UsernameChangeModal from '@/components/username-change/UsernameChangeModal';
import AzuraChat from '@/components/azura-chat/AzuraChat';
import styles from './Navbar.module.css';

// Menu Icon Component - Chunky Y2K style
const MenuIcon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.menuIcon}>
      <rect x="3" y="5" width="18" height="3" rx="1" fill="currentColor"/>
      <rect x="3" y="10.5" width="18" height="3" rx="1" fill="currentColor"/>
      <rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor"/>
    </svg>
  );
};

// Home Icon - Using home.svg
const HomeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g>
        <g>
          <polygon points="256,152.96 79.894,288.469 79.894,470.018 221.401,470.018 221.401,336.973 296.576,336.973 296.576,470.018 432.107,470.018 432.107,288.469" fill="currentColor"/>
        </g>
      </g>
      <g>
        <g>
          <polygon points="439.482,183.132 439.482,90.307 365.316,90.307 365.316,126.077 256,41.982 0,238.919 35.339,284.855 256,115.062 476.662,284.856 512,238.92" fill="currentColor"/>
        </g>
      </g>
    </svg>
  );
};

// Quests Icon - Using world/globe icon from provided SVG
const QuestsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="m269.858 510.34c278.493-15.983 330.268-408.194 66.017-496.268-73.122-24.472-156.963-13.341-220.934 29.812h.018a254.731 254.731 0 0 0 -110.89 174.438l-.016-.011c-25.063 157.176 106.821 302.423 265.805 292.029zm206.117-161.425a237.421 237.421 0 0 1 -36.261 59.542c-1.055-6.293 1.857-13.582-2.482-19.455-4.708-9.179-9.069-18.543-13.975-27.613-1.824-3.373-1.321-5.311 1.367-7.739 28.792-25.263 3.125-11.831 5.953-47.938a4.9 4.9 0 0 0 -2.6-4.85c-13.648-8.714-31.465-11.707-45.569-2.023-17.578 8.308-42.651 1.953-48.337-18.223-5.029-13.411-4.412-26.954-4.544-40.65.811-7.386 10.943-8.626 9.3-17.163.39-10.84-3.143-22.283 7.108-29.358a6.737 6.737 0 0 1 5.833-1.545 40.084 40.084 0 0 0 26.732-6.234c8.377-5.311 18.72-1.873 28-3.082 4.423-.315 7.7.984 10.423 4.427 5.354 6.76 13.729 8.745 20.765 12.851 2.367 1.381 3.638-.36 4.748-1.792 5.911-7.626 14.97-10.188 22.913-14.573 4.326-2.479 13 6.985 20.384 7.321 14.715 51.506 11.3 108.843-9.758 158.097zm-3.459-193.579c-8.818 1.16-2.888-7.217-7.439-11.6a170.463 170.463 0 0 1 -13.022-12.946c-2.125-2.27-3.5-2.635-5.957-.21-6.6 6.53-6.229 5.837 1.467 13.64 8.986 9.878 15.759 9.713-.5 16.577-3.7 1.666-7.194 5.462-11.232-.023-2.444-3.319-5.771-5.549-5.376-10.662.607-7.884-5.408-13.6-8.191-20.407-.831-2.031-2.3-.6-3.083.4-5.855 7.528-14.7 10.438-22.712 14.62-13.839 12.1-10.68 10.782-29.044 10.256-1.7.073-2.2-1.977-2.938-3.175-9.247-15.138-7.454-18.828 2.126-33.119 3.524-2.114 19.094.326 22.037 3.4 1.323 1.38 2.409 2.988 4.318 5.394 1.467-5.86.724-10.35.876-14.773 2.482-18.149 17.732-9.97 28.558-13.912 5.117-3.911 7.217-5.858 6.132-7.777a237.687 237.687 0 0 1 43.98 64.317zm-45.461-65.836c-7.389-4.811-23.805-9.883-24.242-21.771a236.705 236.705 0 0 1 24.242 21.771zm-339.846-2.3a238.841 238.841 0 0 1 45.891-35.9c5.681 2.9 9.734 13.569 16.86 9.778 7.6-3.988 15.7-7.151 21.156-14.282 3.091-3.755 8.5-.881 12.537-2.02 15.872-2.149 20.163 15.923 26.1 26.674-.524.441-.8.864-1.028.838-13.772-1.554-26.4 2.868-38.881 7.674-4.1 1.579-7.26 1.713-9.825-2.235-3.17-4.882-7.243-5.023-12.3-2.917-4.684 3.311-21.513 3.883-20.35 10.528 1.142 6.243-3.787 16.884 7.419 14.757 5.251-1.827 9.765 13.69 12.974 4.769 6.886-27.9 35.916-3.553 58.3-21.38 8.235-4.886 15.008 11.208 18.208 16.877 2.432 5.319 4.191 11.581 12.742 9.726-5.362 5.364-10.761 10.692-16.063 16.114-1.538 1.573-2.936 1.069-4.663.469-6.666-2.314-13.423-4.371-20.066-6.75-3.169-1.135-4.689-1.246-4.617 3 5.424 29.2-19.451 1.038-36.726 22.936-21.556 21.664-4.874 39.844-34.5 62.619-1.771 1.626-3.242 1.822-4.993.536-12.87-9.136-41.786-14.1-51.4.834a3.1 3.1 0 0 0 .422 2.683c5.149 8.253 5.553 22.138 15.329 8.294 2.91-2.48 6.328-1.645 9.308-1.15 3.135.521 1.578 3.841 1.5 5.772.443 7.7 11.519 9.072 9.34 17.74-1.243 6.271 6.656 2.805 10.127 3.857 5.611.809 9.868-1.068 13.465-5.45 2.728-3.323 18.387-5.581 21.993-3.443 2.859 2.881 4.06 7.382 6.111 10.9 3.409 6.84 3.556 6.978 8.574 1.572 11.53-9.051 27.737-1.89 38.708 4.395 8.619 4.828 5.772 22.064 18.611 19.587 2.466-.582 3.8 1.519 5.152 3.042 9.326 11.409 24.384 10.044 29.9 25.689 3.554 6.525 3.174 12.244.154 18.7-2.146 12.126-8.109 21.061-20.7 24.457-9.984 3.586 6.86 19.876-15.993 26.372-5.861 1.276-6.62 5.765-5.861 11.029 2.424 13.558-.868 23.79-15.78 27.362-4.41 1.457-3.624 7.321-5.717 10.663-10.288 18.75-.936 32.429 12.166 45.56-11.5.679-23.963 1.849-27.938-10.532-4.966-14.423-9.46-28.971-16.824-42.455-2.473-4.528-.881-9.789-.945-14.7-1.795-20.093-22.313-35.132-18.459-56.541 1.494-10.723-13.8 4.59-29.635-14.925-5.278-6.261-17.559-21.393-15.438-29.236 4.335-10.806 4.792-23.841 14.8-31.341 4.263-3.314 4.651-13.648-3.3-11.644-20.424 3.417-16.06-11.93-28.022-9.016-8.1.862-13.947-1.793-20.242-7.46-18.886-17.37-24.3-4.5-35.121-17.378a238.052 238.052 0 0 1 67.54-135.048z" fill="currentColor"/>
    </svg>
  );
};

// Voting Icon - Using provided voting SVG design
const VotingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="m163.508 372.218h77.492v-113h-89.637c.073 38.712 4.33 77.506 12.145 113z" fill="currentColor"/>
      <path d="m340.798 402.218h-69.798v109.782c19.936-8.42 39.669-33.147 55.821-70.691 5.216-12.122 9.886-25.238 13.977-39.091z" fill="currentColor"/>
      <path d="m185.179 441.31c16.152 37.543 35.886 62.271 55.821 70.69v-109.782h-69.797c4.091 13.853 8.761 26.969 13.976 39.092z" fill="currentColor"/>
      <path d="m271 372.218h77.492c7.816-35.493 12.073-74.288 12.145-113h-89.637z" fill="currentColor"/>
      <path d="m140.041 402.218h-96.407c33.778 50.064 84.798 87.524 144.538 103.899-11.179-14.098-21.463-31.826-30.551-52.951-6.728-15.641-12.612-32.78-17.58-50.948z" fill="currentColor"/>
      <path d="m354.379 453.165c-9.088 21.125-19.372 38.853-30.551 52.951 59.74-16.375 110.76-53.834 144.538-103.899h-96.406c-4.968 18.169-10.852 35.308-17.581 50.948z" fill="currentColor"/>
      <path d="m121.364 259.217h-121.364c0 40.565 9.45 78.917 26.245 113h106.622c-7.414-35.874-11.435-74.53-11.503-113z" fill="currentColor"/>
      <path d="m390.637 259.217c-.068 38.469-4.089 77.126-11.503 113h106.622c16.795-34.083 26.245-72.436 26.245-113z" fill="currentColor"/>
      <path d="m266.829 95.298c21.458-4.913 37.475-24.093 37.51-47.032-.041-26.663-21.666-48.266-48.339-48.266s-48.298 21.603-48.338 48.266c.036 22.939 16.052 42.118 37.51 47.031-5.357.619-10.549 1.773-15.536 3.383l26.364 56.967 26.365-56.966c-4.987-1.61-10.179-2.764-15.536-3.383z" fill="currentColor"/>
      <path d="m462.345 191.36v-4.68c0-31.073-22.899-56.791-52.74-61.216 15.617-4.054 27.152-18.233 27.177-35.112-.031-20.041-16.284-36.278-36.332-36.278s-36.302 16.237-36.332 36.278c.026 16.879 11.56 31.058 27.177 35.112-29.842 4.425-52.74 30.144-52.74 61.216v-10.814c0-25.323-11.617-47.914-29.798-62.785l-36.229 78.28h189.817z" fill="currentColor"/>
      <path d="m203.244 113.081c-18.181 14.872-29.798 37.462-29.798 62.785v10.814c0-31.073-22.899-56.791-52.74-61.216 15.617-4.054 27.152-18.234 27.177-35.114-.031-20.04-16.285-36.276-36.332-36.276-20.048 0-36.302 16.237-36.332 36.278.026 16.879 11.56 31.058 27.177 35.112-29.842 4.425-52.74 30.144-52.74 61.216v4.68h189.817z" fill="currentColor"/>
    </svg>
  );
};

// Library Icon - Using Library Icon.svg
const LibraryIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16.933333 16.933334" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g transform="translate(0 -280.067)">
        <path d="m3.7036508 280.59476c-.146169.00053-.2641097.11945-.2635514.26562v1.3224h2.1171854v-1.32241c.0005291-.14616-.1173798-.26509-.2635489-.26561zm7.9401062 0c-.146931-.00053-.266179.11868-.265616.26561v6.08646h2.116644v-6.08594c.000529-.14692-.119202-.26618-.266133-.26561zm-5.5573056 1.05885v5.29322h2.1151163v-5.29322c-.0005292-.14531-.118237-.26297-.2635515-.26355h-1.6006763c-.148627 0-.2510234.12753-.2508885.26355zm2.9104167.52917c-.1471295-.0008-.2666947.11848-.2661338.26561v1.3224h2.1177217v-1.3224c.000529-.14612-.11743-.26503-.263549-.26561zm-5.5567687.52968v.52917l2.1171854-.00001v-.52916zm-2.118217.52917c-.43516023 0-.79271553.35755-.79271553.79271v9.52552c0 .43516.3575553.79323.79271553.79323h14.2875006c.43516 0 .794785-.35807.794785-.79323v-9.52552c0-.43516-.359625-.79271-.794785-.79271h-1.586466v1.05678h1.056783c.146929-.00053.266179.11869.265618.26562v7.40781c-.000264.14633-.119295.26463-.265618.26407h-13.2281324c-.1457166-.00026-.2637684-.11835-.2640674-.26407v-7.40781c-.0005291-.14632.1177449-.26532.2640674-.26562h1.0588492v-1.05678zm2.118217.52916-.00106 5.82084 2.1171828-.00001.00106-5.82083zm5.2906349.52917v.52917l2.1177217-.00001v-.52916zm0 1.05885-.00106 4.23282 2.1177247-.00001.0011-4.23281zm-2.6442829 2.11718v.5271h2.1151163v-.52709zm5.2916896 0v.5271h2.116644v-.52709zm-5.2916896 1.05627-.00106 1.05936 2.1151162.00001.00106-1.05937zm5.2916896 0-.0011 1.05936 2.116668.00001.0011-1.05937zm-8.4672083 1.58802c-.1471295-.0008-.2666946.11848-.2661337.26561v.52969c.0005291.14632.1198138.26439.2661337.26355h11.1109503c.146119.00053.265033-.11743.265618-.26355v-.52969c.000529-.14693-.11869-.26617-.265618-.26561zm5.0265676 2.6448h1.0583333c.3449452.008.3449452.52142 0 .52916h-1.0583333c-.3449453-.008-.3449453-.52142 0-.52916zm-1.2609037 2.11718c-.082563.18332-.1789774.36045-.2821543.51521-.1923124.28847-.3480197.46071-.4252965.54312h-.6909144c-.3655616.0169-.3404579.54662.012409.52969h6.3499996c.352867 0 .352867-.52969 0-.52969h-.676444c-.07728-.0824-.232985-.25465-.425297-.54312-.103201-.1548-.199581-.33184-.282154-.51521z" fill="currentColor"/>
      </g>
    </svg>
  );
};


const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { logout: privyLogout, getAccessToken, ready, authenticated } = usePrivy();
  // Removed isMobileMenuOpen - bottom nav is always visible on mobile
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isYourAccountsModalOpen, setIsYourAccountsModalOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isUsernameChangeModalOpen, setIsUsernameChangeModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [shardCount, setShardCount] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user data - wait for Privy ready + authenticated
  useEffect(() => {
    if (!ready || !authenticated) return;

    let retryTimer: ReturnType<typeof setTimeout>;

    const fetchUserData = async (attempt = 1) => {
      try {
        const token = await getAccessToken();
        if (!token && attempt <= 3) {
          retryTimer = setTimeout(() => fetchUserData(attempt + 1), attempt * 1500);
          return;
        }
        const response = await fetch('/api/me', {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (data?.user) {
          if (data.user.shardCount !== undefined) setShardCount(data.user.shardCount);
          setUsername(data.user.username || null);
          setAvatarUrl(data.user.avatarUrl || null);
        } else {
          setShardCount(null);
          setUsername(null);
          setAvatarUrl(null);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        if (attempt <= 3) {
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
      clearTimeout(retryTimer);
      window.removeEventListener('shardsUpdated', handleShardsUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [ready, authenticated, getAccessToken]);

  const isActive = (path: string) => {
    if (path === '/home') {
      return pathname === '/home' || pathname === '/';
    }
    return pathname === path || pathname?.startsWith(path + '/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isProfileDropdownOpen]);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleYourAccountsClick = () => {
    setIsProfileDropdownOpen(false);
    setIsYourAccountsModalOpen(true);
  };

  const handleAvatarClick = () => {
    setIsProfileDropdownOpen(false);
    setIsAvatarSelectorOpen(true);
  };

  const handleAvatarSelected = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handleUsernameClick = () => {
    setIsProfileDropdownOpen(false);
    setIsUsernameChangeModalOpen(true);
  };

  const handleUsernameChanged = (newUsername: string) => {
    setUsername(newUsername);
  };

  const handleSignOut = async () => {
    setIsProfileDropdownOpen(false);
    
    // Disconnect via Privy
    try { await privyLogout(); } catch {}
    
    // Clear session
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Failed to logout:', err);
    }
    
    // Clear local state
    setShardCount(null);
    setUsername(null);
    setAvatarUrl(null);
    
    // Redirect to landing page
    router.push('/');
  };


  return (
    <nav className={styles.navbar}>
      {/* Top Section */}
      <div className={styles.topSection}>
        <div className={styles.leftContent}>
          <Link href="/home" className={styles.brandLink} aria-label="Mental Wealth Academy">
            <div className={styles.logoWrapper}>
              <Image
                src="/icons/mentalwealth-academy-logo.png"
                alt="Mental Wealth Academy"
                fill
                priority
                sizes="(max-width: 250px) 140px, 180px"
                className={styles.logo}
              />
            </div>
          </Link>
        </div>


        <div className={styles.rightContent}>
          {/* Desktop Navigation Links */}
          <div className={styles.linksContainer}>
            {/* Home Button */}
            <Link href="/home" className={`${styles.navButton} ${isActive('/home') ? styles.navButtonActive : ''}`}>
              <HomeIcon size={20} className={styles.homeIcon} />
              <span className={isActive('/home') ? styles.buttonLabelActive : styles.buttonLabel}>
                <span className={styles.slideWrap}><span className={styles.slideText}>Home</span><span className={`${styles.slideText} ${styles.slideClone}`}>Home</span></span>
              </span>
            </Link>

            {/* Story Button */}
            <Link href="/chapters" className={`${styles.navButton} ${isActive('/chapters') ? styles.navButtonActive : ''}`}>
              <LibraryIcon size={20} className={styles.questIcon} />
              <span className={isActive('/chapters') ? styles.buttonLabelActive : styles.buttonLabel}>
                <span className={styles.slideWrap}><span className={styles.slideText}>Story</span><span className={`${styles.slideText} ${styles.slideClone}`}>Story</span></span>
              </span>
            </Link>

            {/* Quests Button */}
            <Link href="/quests" className={`${styles.navButton} ${isActive('/quests') ? styles.navButtonActive : ''}`}>
              <QuestsIcon size={20} className={styles.questIcon} />
              <span className={isActive('/quests') ? styles.buttonLabelActive : styles.buttonLabel}>
                <span className={styles.slideWrap}><span className={styles.slideText}>Quests</span><span className={`${styles.slideText} ${styles.slideClone}`}>Quests</span></span>
              </span>
            </Link>

            {/* Proposals Button */}
            <Link href="/voting" className={`${styles.navButton} ${isActive('/voting') ? styles.navButtonActive : ''}`}>
              <VotingIcon size={20} className={styles.questIcon} />
              <span className={isActive('/voting') ? styles.buttonLabelActive : styles.buttonLabel}>
                <span className={styles.slideWrap}><span className={styles.slideText}>Proposals</span><span className={`${styles.slideText} ${styles.slideClone}`}>Proposals</span></span>
              </span>
            </Link>
          </div>

          {/* Right Icons */}
          <div className={styles.rightIcons}>
            {/* Message Button */}
            <button 
              className={styles.messageButton} 
              onClick={() => setIsChatOpen(true)}
              aria-label="Messages"
              type="button"
            >
              <div className={styles.messageIcon}>
                <span className={styles.notificationDot}></span>
              </div>
            </button>
            {/* User Info Dropdown */}
            {username && !username.startsWith('user_') && (
              <div className={styles.profileDropdownWrapper} ref={profileDropdownRef}>
                <div 
                  className={`${styles.profileDropdownDimmer} ${isProfileDropdownOpen ? styles.active : ''}`}
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                <button 
                  className={`${styles.userInfo} ${isProfileDropdownOpen ? styles.userInfoOpen : ''}`}
                  onClick={handleProfileClick}
                  type="button"
                >
                  {avatarUrl && (
                    <div className={styles.userAvatarContainer}>
                      <Image
                        src={avatarUrl}
                        alt={username}
                        width={32}
                        height={32}
                        className={styles.userAvatar}
                        unoptimized
                      />
                      <Image
                        src={avatarUrl}
                        alt={username}
                        width={32}
                        height={32}
                        className={styles.userAvatarClone}
                        unoptimized
                      />
                    </div>
                  )}
                  <span className={styles.username}>
                    <span className={styles.slideWrap}><span className={styles.slideText}>@{username}</span><span className={`${styles.slideText} ${styles.slideClone}`}>@{username}</span></span>
                  </span>
                </button>
                {isProfileDropdownOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileDropdownContent}>
                      <Link 
                        href="/home" 
                        className={styles.profileLink}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <div className={styles.miniProfileCard}>
                          {avatarUrl && (
                            <div className={styles.miniProfilePicture}>
                              <Image
                                src={avatarUrl}
                                alt={username}
                                width={48}
                                height={48}
                                className={styles.miniProfileImage}
                                unoptimized
                              />
                            </div>
                          )}
                          <div className={styles.miniProfileInfo}>
                            <span className={styles.miniProfileName}>{username}</span>
                            <span className={styles.miniProfileLabel}>view profile</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                    <div className={styles.profileDropdownMenu}>
                      {/* Mobile Shards Counter in Dropdown */}
                      <div className={styles.mobileShardsInDropdown}>
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
                      <div className={styles.dropdownDivider} />
                      <button 
                        className={styles.dropdownItem}
                        onClick={handleUsernameClick}
                        type="button"
                      >
                        <div className={styles.dropdownItemInfo}>
                          <span className={styles.dropdownItemTitle}>username</span>
                          <span className={styles.dropdownItemLabel}>change your username</span>
                        </div>
                      </button>
                      <div className={styles.dropdownDivider} />
                      <button 
                        className={styles.dropdownItem}
                        onClick={handleAvatarClick}
                        type="button"
                      >
                        <div className={styles.dropdownItemInfo}>
                          <span className={styles.dropdownItemTitle}>avatar</span>
                          <span className={styles.dropdownItemLabel}>select your avatar</span>
                        </div>
                      </button>
                      <div className={styles.dropdownDivider} />
                      <button 
                        className={styles.dropdownItem}
                        onClick={handleYourAccountsClick}
                        type="button"
                      >
                        <div className={styles.dropdownItemInfo}>
                          <span className={styles.dropdownItemTitle}>accounts</span>
                          <span className={styles.dropdownItemLabel}>manage connections</span>
                        </div>
                      </button>
                      <div className={styles.dropdownDivider} />
                      <button 
                        className={styles.dropdownItem}
                        onClick={handleSignOut}
                        type="button"
                      >
                        <div className={styles.dropdownItemInfo}>
                          <span className={styles.dropdownItemTitle}>sign out</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Show incomplete profile message if username is temporary */}
            {username && username.startsWith('user_') && (
              <button
                className={styles.incompleteProfile}
                onClick={() => {
                  // Dispatch event to open onboarding modal (works if already on home page)
                  window.dispatchEvent(new Event('openOnboarding'));
                  // Navigate to home with query param to trigger onboarding
                  router.push('/voting?onboarding=true');
                }}
                type="button"
              >
                <span className={styles.slideWrap}><span className={styles.slideText}>Complete Profile</span><span className={`${styles.slideText} ${styles.slideClone}`}>Complete Profile</span></span>
              </button>
            )}
            {/* Show unregistered button if no username (unregistered user) */}
            {!username && (
              <button
                className={styles.incompleteProfile}
                onClick={() => {
                  // Dispatch event to open onboarding modal (works if already on home page)
                  window.dispatchEvent(new Event('openOnboarding'));
                  // Navigate to home with query param to trigger onboarding
                  router.push('/voting?onboarding=true');
                }}
                type="button"
              >
                <span className={styles.slideWrap}><span className={styles.slideText}>Get Started</span><span className={`${styles.slideText} ${styles.slideClone}`}>Get Started</span></span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className={styles.mobileBottomNav}>
        <Link
          href="/home"
          className={`${styles.mobileBottomNavButton} ${isActive('/home') ? styles.mobileBottomNavButtonActive : ''}`}
        >
          <HomeIcon size={24} className={styles.homeIcon} />
          <span className={styles.mobileBottomNavLabel}>Home</span>
        </Link>
        <Link
          href="/chapters"
          className={`${styles.mobileBottomNavButton} ${isActive('/chapters') ? styles.mobileBottomNavButtonActive : ''}`}
        >
          <LibraryIcon size={24} className={styles.questIcon} />
          <span className={styles.mobileBottomNavLabel}>Story</span>
        </Link>
        <Link
          href="/quests"
          className={`${styles.mobileBottomNavButton} ${isActive('/quests') ? styles.mobileBottomNavButtonActive : ''}`}
        >
          <QuestsIcon size={24} className={styles.questIcon} />
          <span className={styles.mobileBottomNavLabel}>Quests</span>
        </Link>
        <Link
          href="/voting"
          className={`${styles.mobileBottomNavButton} ${isActive('/voting') ? styles.mobileBottomNavButtonActive : ''}`}
        >
          <VotingIcon size={24} className={styles.questIcon} />
          <span className={styles.mobileBottomNavLabel}>Proposals</span>
        </Link>
      </div>

      {isYourAccountsModalOpen && (
        <YourAccountsModal onClose={() => setIsYourAccountsModalOpen(false)} />
      )}
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
      <AzuraChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </nav>
  );
};

export default Navbar;

