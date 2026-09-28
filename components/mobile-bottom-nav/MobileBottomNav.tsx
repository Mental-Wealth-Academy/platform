'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatsCircle,
  Dna,
  IconProps,
  MoonStars,
  Robot,
  User,
} from '@phosphor-icons/react';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/home', icon: User },
  { id: 'squads', label: 'Squads', href: '/chat', icon: ChatsCircle },
  { id: 'dna', label: 'DNA', href: '/genetics', icon: Dna },
  { id: 'buddy', label: 'Buddy', href: '/blue', icon: Robot },
  { id: 'lessons', label: 'Lessons', href: '/shadow-work', icon: MoonStars },
] as const;

const NavIconMark: React.FC<{
  icon: NavIcon;
  isActive?: boolean;
}> = ({ icon: Icon, isActive = false }) => (
  <span
    className={`${styles.iconWrap} ${isActive ? styles.iconWrapActive : ''}`}
    aria-hidden="true"
  >
    <Icon
      size={24}
      weight={isActive ? 'fill' : 'regular'}
      className={`${styles.iconSvg} ${isActive ? styles.iconSvgActive : ''}`}
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
    if (href === '/genetics') {
      return pathname === '/genetics' || pathname?.startsWith('/genetics/');
    }
    if (href === '/blue') {
      return pathname === '/blue' || pathname?.startsWith('/blue/');
    }
    if (href === '/shadow-work') {
      return (
        pathname === '/shadow-work' ||
        pathname === '/course' ||
        pathname?.startsWith('/shadow-work/') ||
        pathname?.startsWith('/course/')
      );
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <NavIconMark icon={item.icon} isActive={active} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
