'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatCircleDots,
  House,
  IconProps,
  Microscope,
  UserCircle,
} from '@phosphor-icons/react';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/profile', icon: UserCircle },
  { id: 'library', label: 'Library', href: '/library', icon: Microscope },
  { id: 'home', label: 'Home', href: '/home', icon: House },
] as const;

const NavIconMark: React.FC<{
  icon: NavIcon;
  isActive?: boolean;
}> = ({ icon: Icon, isActive = false }) => (
  <span className={`${styles.iconWrap} ${isActive ? styles.iconWrapActive : ''}`} aria-hidden="true">
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

  const handleAgentOpen = () => {
    window.dispatchEvent(new Event('toggleBlueChat'));
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

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

      <button type="button" className={styles.tab} onClick={handleAgentOpen} aria-label="Open chat">
        <NavIconMark icon={ChatCircleDots} />
        <span className={styles.label}>Chat</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
