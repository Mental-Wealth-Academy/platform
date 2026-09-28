'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardText,
  IconProps,
  MoonStars,
  Sparkle,
  User,
  Users,
} from '@phosphor-icons/react';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/home', icon: User },
  { id: 'lessons', label: 'Lessons', href: '/shadow-work', icon: MoonStars },
  { id: 'blue', label: 'Blue', href: '/chat', icon: Sparkle },
  { id: 'group', label: 'Group', href: '/dao', icon: Users },
  { id: 'surveys', label: 'Surveys', href: '/surveys', icon: ClipboardText },
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
    if (href === '/chat') {
      return pathname === '/chat' || pathname?.startsWith('/chat/');
    }
    if (href === '/dao') {
      return pathname === '/dao' || pathname?.startsWith('/dao/');
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const isCenter = item.id === 'blue';

        return (
          <Link
            key={item.id}
            href={item.href}
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
