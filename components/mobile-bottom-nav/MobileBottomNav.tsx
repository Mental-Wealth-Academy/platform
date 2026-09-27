'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChatCircleDots,
  IconProps,
  ClipboardText,
  MoonStars,
  User,
} from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './MobileBottomNav.module.css';

type NavIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const LEFT_ITEMS = [
  { id: 'profile', label: 'Profile', href: '/home', icon: User },
  { id: 'lessons', label: 'Lessons', href: '/shadow-work', icon: MoonStars },
] as const;

const RIGHT_ITEMS = [
  { id: 'surveys', label: 'Surveys', href: '/surveys', icon: ClipboardText },
  { id: 'chat', label: 'Chat', href: '/chat', icon: ChatCircleDots },
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
  const { play } = useSound();

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
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const isHomeActive = pathname === '/dao' || pathname?.startsWith('/dao/');

  return (
    <nav className={styles.nav}>
      {LEFT_ITEMS.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => play('navigation')}
          >
            <NavIconMark icon={item.icon} isActive={active} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}

      {/* Big center design: Diamond with swirling color */}
      <Link
        href="/dao"
        className={`${styles.centerTab} ${isHomeActive ? styles.centerTabActive : ''}`}
        aria-label="Home"
        aria-current={isHomeActive ? 'page' : undefined}
        onClick={() => play('navigation')}
      >
        <div className={styles.centerJewel}>
          <Image
            src="/icons/ui-diamond.svg"
            alt=""
            width={26}
            height={26}
            className={styles.centerJewelIcon}
            priority
          />
        </div>
      </Link>

      {RIGHT_ITEMS.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => play('navigation')}
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

