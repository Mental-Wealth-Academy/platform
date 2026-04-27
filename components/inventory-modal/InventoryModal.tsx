'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { providers, Contract } from 'ethers';
import styles from './InventoryModal.module.css';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shardCount: number | null;
  username?: string | null;
  avatarUrl?: string | null;
}

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS ||
  '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const GOV_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS ||
  '0x84939fEc50EfdEDC8522917645AAfABFd5b3EA6F';
const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const KILLSTREAK_ABI = [
  'function getVotingPower(address _voter) external view returns (uint256)',
];

function formatBalance(raw: unknown, decimals: number, maxDecimals = 4): string {
  const num = Number(raw) / 10 ** decimals;
  if (num === 0) return '0.00';
  if (num < 0.0001) return '<0.0001';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function InventoryModal({ isOpen, onClose, shardCount, username, avatarUrl }: InventoryModalProps) {
  const { address } = useAccount();
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [votingPower, setVotingPower] = useState<string | null>(null);
  const [hasAngel, setHasAngel] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      const provider = new providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        setLoading(false);
        return;
      }
      const addr = accounts[0];

      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const killstreak = new Contract(CONTRACT_ADDRESS, KILLSTREAK_ABI, provider);

      const [ethRaw, usdcRaw, usdcDecimals, vpRaw] = await Promise.all([
        provider.getBalance(addr),
        usdc.balanceOf(addr),
        usdc.decimals(),
        killstreak.getVotingPower(addr).catch(() => null),
      ]);

      setEthBalance(formatBalance(ethRaw, 18, 4));
      setUsdcBalance(formatBalance(usdcRaw, Number(usdcDecimals), 2));

      if (vpRaw !== null) {
        const vpNum = Number(vpRaw) / 1e18;
        setVotingPower(vpNum >= 1 ? Math.floor(vpNum).toLocaleString() : vpNum.toFixed(2));
      } else {
        setVotingPower('0');
      }

      try {
        const colRes = await fetch('/api/scatter/collection');
        if (colRes.ok) {
          const colInfo = await colRes.json();
          if (colInfo.address) {
            const nftContract = new Contract(
              colInfo.address,
              ['function balanceOf(address) view returns (uint256)'],
              provider,
            );
            const nftBal = await nftContract.balanceOf(addr);
            setHasAngel(Number(nftBal) > 0);
          } else {
            setHasAngel(false);
          }
        } else {
          setHasAngel(false);
        }
      } catch {
        setHasAngel(false);
      }
    } catch (err) {
      console.error('InventoryModal fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchBalances();
    }
  }, [isOpen, fetchBalances]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayName = username && !username.startsWith('user_') ? username : null;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : address ? address.slice(2, 4).toUpperCase() : '??';

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarRing}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName || 'Profile'} width={72} height={72} className={styles.avatar} unoptimized />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
          </div>
          {displayName && <h2 className={styles.displayName}>@{displayName}</h2>}
          {address && (
            <span className={styles.walletAddress}>{truncateAddress(address)}</span>
          )}
          {hasAngel && (
            <span className={styles.badge}>Academic Angel</span>
          )}
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{shardCount !== null ? shardCount.toLocaleString() : '0'}</span>
            <span className={styles.statLabel}>Shards</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{votingPower ?? '--'}</span>
            <span className={styles.statLabel}>Votes</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{hasAngel ? '1' : '0'}</span>
            <span className={styles.statLabel}>Angels</span>
          </div>
        </div>

        {/* Balances */}
        <div className={styles.balances}>
          <span className={styles.sectionLabel}>Balances</span>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
            </div>
          ) : (
            <div className={styles.balanceList}>
              <div className={styles.balanceRow}>
                <div className={styles.balanceLeft}>
                  <div className={styles.tokenIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L6 12l6 10 6-10L12 2z" fill="#627EEA" />
                      <path d="M12 2v8.5L6 12l6-10z" fill="#627EEA" opacity="0.6" />
                    </svg>
                  </div>
                  <div className={styles.tokenInfo}>
                    <span className={styles.tokenName}>Ethereum</span>
                    <span className={styles.tokenTicker}>ETH</span>
                  </div>
                </div>
                <span className={styles.balanceValue}>{ethBalance ?? '0.00'}</span>
              </div>

              <div className={styles.balanceRow}>
                <div className={styles.balanceLeft}>
                  <div className={`${styles.tokenIcon} ${styles.tokenUsdc}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#2775CA" />
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">$</text>
                    </svg>
                  </div>
                  <div className={styles.tokenInfo}>
                    <span className={styles.tokenName}>USD Coin</span>
                    <span className={styles.tokenTicker}>USDC</span>
                  </div>
                </div>
                <span className={styles.balanceValue}>{usdcBalance ?? '0.00'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
