'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatsCircle,
  House,
  IconProps,
  Images,
  MoonStars,
  User,
} from '@phosphor-icons/react';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/home', icon: User },
  { id: 'lessons', label: 'Lessons', href: '/shadow-work', icon: MoonStars },
  { id: 'home', label: 'Home', href: '/dao', icon: House },
  { id: 'gallery', label: 'Gallery', href: '/genetics', icon: Images },
  { id: 'squads', label: 'Squads', href: '/chat?squad=global', icon: ChatsCircle },
] as const;

const NavIconMark: React.FC<{
  icon: NavIcon;
  isActive?: boolean;
  isCenter?: boolean;
}> = ({ icon: Icon, isActive = false, isCenter = false }) => (
  <span
    className={`${styles.iconWrap} ${isCenter ? styles.centerIconWrap : ''} ${isActive ? styles.iconWrapActive : ''}`}
    aria-hidden="true"
  >
    <Icon
      size={24}
      weight={isActive ? 'fill' : 'regular'}
      className={`${styles.iconSvg} ${isCenter ? styles.centerIconSvg : ''} ${isActive ? styles.iconSvgActive : ''}`}
    />
  </span>
);

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const isActive = (href: string) => {
    if (href === '/home') {
      return (
        pathname === '/home' ||
        pathname === '/profile' ||
        pathname?.startsWith('/home/') ||
        pathname?.startsWith('/profile/')
      );
    }
    if (href === '/genetics') {
      return pathname === '/genetics' || pathname?.startsWith('/genetics/');
    }
    if (href.startsWith('/chat')) {
      return pathname === '/chat' || pathname?.startsWith('/chat/');
    }
    if (href === '/dao') {
      return pathname === '/dao' || pathname?.startsWith('/dao/');
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const handleTabClick = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  };

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const isCenter = item.id === 'home';

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={handleTabClick}
            className={`${styles.tab} ${isCenter ? styles.centerTab : ''} ${active ? styles.tabActive : ''}`}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <NavIconMark icon={item.icon} isActive={active} isCenter={isCenter} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
