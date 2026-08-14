'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatCircleDots,
  Compass,
  House,
  IconProps,
  ClipboardText,
  MoonStars,
} from '@phosphor-icons/react';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

/* On phones the home tab lands on the DAO dashboard and the personal tab lands
   on Shadow Work. /home and /profile (the verifier queue) stay desktop
   surfaces — neither earns a slot in a five-tab bar. */
const NAV_ITEMS = [
  { id: 'shadow-work', label: 'Shadow', href: '/shadow-work', icon: MoonStars },
  { id: 'surveys', label: 'Surveys', href: '/surveys', icon: ClipboardText },
  { id: 'home', label: 'DAO', href: '/dao', icon: House },
  { id: 'quests', label: 'Quests', href: '/quests', icon: Compass },
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

      <Link
        href="/chat"
        className={`${styles.tab} ${isActive('/chat') ? styles.tabActive : ''}`}
        aria-label="Chat"
        aria-current={isActive('/chat') ? 'page' : undefined}
      >
        <NavIconMark icon={ChatCircleDots} isActive={isActive('/chat')} />
        <span className={styles.label}>Chat</span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
