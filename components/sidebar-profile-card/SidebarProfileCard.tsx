'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './SidebarProfileCard.module.css';

interface SidebarProfileCardProps {
  username: string | null;
  avatarUrl: string | null;
  address: string | undefined;
  isCollapsed: boolean;
  onChangeAvatar: () => void;
  onChangeUsername: () => void;
  onConnections: () => void;
  onSignOut: () => void;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function SidebarProfileCard({
  username,
  avatarUrl,
  address,
  isCollapsed,
  onChangeAvatar,
  onChangeUsername,
  onConnections,
  onSignOut,
}: SidebarProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = username && !username.startsWith('user_') ? username : null;
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : address
    ? address.slice(2, 4).toUpperCase()
    : '??';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (isCollapsed) {
    return (
      <div className={styles.cardCollapsed}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName || 'Profile'} width={36} height={36} className={styles.avatarSm} unoptimized />
        ) : (
          <div className={styles.avatarFallbackSm}>{initials}</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card} ref={menuRef}>
      <div className={styles.row}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName || 'Profile'} width={40} height={40} className={styles.avatar} unoptimized />
        ) : (
          <div className={styles.avatarFallback}>{initials}</div>
        )}

        <div className={styles.info}>
          {displayName ? (
            <span className={styles.name}>@{displayName}</span>
          ) : (
            <span className={styles.nameMuted}>not connected</span>
          )}
          {address && (
            <span className={styles.wallet}>{truncate(address)}</span>
          )}
        </div>

        <button
          className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnOpen : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          type="button"
          aria-label="Profile options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className={styles.menu}>
          <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onChangeAvatar(); }} type="button">Change Avatar</button>
          <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onChangeUsername(); }} type="button">Change Username</button>
          <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onConnections(); }} type="button">Connections</button>
          <div className={styles.menuDivider} />
          <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setMenuOpen(false); onSignOut(); }} type="button">Sign Out</button>
        </div>
      )}
    </div>
  );
}
