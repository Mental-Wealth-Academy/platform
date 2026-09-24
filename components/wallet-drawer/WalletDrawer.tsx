'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useOnchainBalances } from '@/hooks/useOnchainBalances';
import styles from './WalletDrawer.module.css';

interface WalletDrawerProps {
  open: boolean;
  onClose: () => void;
  displayName: string | null;
  initials: string;
  avatarUrl: string | null;
  address: string | undefined;
  onChangeAvatar: () => void;
  onChangeUsername: () => void;
  onConnections: () => void;
  onSignOut: () => void;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletDrawer({
  open,
  onClose,
  displayName,
  initials,
  avatarUrl,
  address,
  onChangeAvatar,
  onChangeUsername,
  onConnections,
  onSignOut,
}: WalletDrawerProps) {
  const router = useRouter();
  const [addressCopied, setAddressCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Onchain wallet balances
  const {
    diamonds: onchainDiamonds,
    btc: onchainBtc,
    btcUsd: onchainBtcUsd,
    usdc: onchainUsdc,
    hasBtc,
    netLabel,
  } = useOnchainBalances(address, open);

  // Escape to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = address;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setAddressCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setAddressCopied(false), 1400);
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
    }
  };


  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Wallet and profile"
        aria-hidden={!open}
      >
        {/* Header / identity */}
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName || 'Profile'} width={48} height={48} className={styles.avatarImg} unoptimized />
              ) : (
                <span className={styles.avatarInitials}>{initials}</span>
              )}
            </div>
            <div className={styles.identityText}>
              <span className={styles.name}>
                {displayName ? `@${displayName}` : 'Connected'}
              </span>
              {address ? (
                <button
                  type="button"
                  className={`${styles.walletChip} ${addressCopied ? styles.walletChipCopied : ''}`}
                  onClick={() => void handleCopyAddress()}
                  title="Copy wallet address"
                >
                  <span className={styles.walletAddr}>{truncate(address)}</span>
                  <span className={styles.copyHint}>{addressCopied ? 'Copied' : 'Copy'}</span>
                </button>
              ) : (
                <span className={styles.nameMuted}>No wallet linked</span>
              )}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className={styles.body}>
          {/* Balances */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Balances</h3>
              <span className={styles.netBadge}>{netLabel}</span>
            </div>

            {/* Featured — Diamonds */}
            <div className={styles.heroCard}>
              <div className={styles.heroLeft}>
                <div className={styles.heroIcon}>
                  <Image src="/icons/ui-diamond.svg" alt="" width={22} height={22} />
                </div>
                <div className={styles.heroMeta}>
                  <span className={styles.heroName}>Diamonds</span>
                  <span className={styles.heroSub}>Credits balance</span>
                </div>
              </div>
              <span className={styles.heroValue}>
                {address ? (onchainDiamonds ?? '—') : '—'}
              </span>
            </div>

            {/* Other tokens */}
            <div className={styles.tokenGrid}>
              <div className={styles.tokenCard}>
                <div className={styles.tokenTop}>
                   <div className={styles.tokenIcon}>
                     <Image src="/tokens/usdc.webp" alt="" width={14} height={14} />
                   </div>
                  <span className={styles.tokenName}>USDC</span>
                </div>
                <span className={styles.tokenValue}>{address ? (onchainUsdc ?? '—') : '—'}</span>
              </div>

              {hasBtc && (
                <button
                  type="button"
                  className={`${styles.tokenCard} ${styles.tokenCardInteractive}`}
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new Event('openTreasurySwapModal'));
                  }}
                  title={onchainBtc ? `${onchainBtc} cbBTC · Tap to convert or swap` : 'Tap to convert or swap'}
                  aria-label={`cbBTC balance: ${address ? (onchainBtcUsd ?? '$0.00') : 'none'}. Tap to swap or convert.`}
                >
                  <div className={styles.tokenTop}>
                    <div className={styles.tokenIcon}>
                      <Image src="/tokens/cbbtc.webp" alt="" width={14} height={14} />
                    </div>
                    <span className={styles.tokenName}>cbBTC</span>
                  </div>
                  <span className={styles.tokenValue}>{address ? (onchainBtcUsd ?? '$0.00') : '—'}</span>
                </button>
              )}
            </div>
          </section>

          {/* Account actions */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Account</h3>
            <div className={styles.menu}>
              <button className={styles.menuItem} type="button" onClick={() => { onClose(); router.push('/home'); }}>
                <span>Profile</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button className={styles.menuItem} type="button" onClick={() => { onClose(); onChangeAvatar(); }}>
                <span>Change avatar</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button className={styles.menuItem} type="button" onClick={() => { onClose(); onChangeUsername(); }}>
                <span>Change username</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button className={styles.menuItem} type="button" onClick={() => { onClose(); onConnections(); }}>
                <span>Connections</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </section>

          <button
            className={styles.signOut}
            type="button"
            onClick={() => { onClose(); onSignOut(); }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
