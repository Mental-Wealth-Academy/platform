'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { providers, Contract } from 'ethers';
import styles from './SidebarInventoryCard.module.css';

interface SidebarInventoryCardProps {
  shardCount: number | null;
  address: string | undefined;
  isCollapsed: boolean;
}

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS ||
  '0x2cbb90a761ba64014b811be342b8ef01b471992d';
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

function fmt(raw: unknown, decimals: number, max = 4): string {
  const n = Number(raw) / 10 ** decimals;
  if (n === 0) return '0.00';
  if (n < 0.0001) return '<0.001';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: max });
}

export default function SidebarInventoryCard({ shardCount, address, isCollapsed }: SidebarInventoryCardProps) {
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [votingPower, setVotingPower] = useState<string | null>(null);
  const [hasVip, setHasVip] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const status = await window.fetch('/api/account/status', { cache: 'no-store', credentials: 'include' })
        .then(r => r.ok ? r.json().catch(() => null) : null)
        .catch(() => null);
      setHasVip(Boolean(status?.hasVipMembershipCard));

      if (typeof window === 'undefined' || !window.ethereum) return;
      const provider = new providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (!accounts.length) return;
      const addr = accounts[0];

      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const ks = new Contract(CONTRACT_ADDRESS, KILLSTREAK_ABI, provider);

      const [ethRaw, usdcRaw, usdcDec, vpRaw] = await Promise.all([
        provider.getBalance(addr),
        usdc.balanceOf(addr),
        usdc.decimals(),
        ks.getVotingPower(addr).catch(() => null),
      ]);

      setEthBalance(fmt(ethRaw, 18, 4));
      setUsdcBalance(fmt(usdcRaw, Number(usdcDec), 2));
      if (vpRaw !== null) {
        const vp = Number(vpRaw) / 1e18;
        setVotingPower(vp >= 1 ? Math.floor(vp).toLocaleString() : vp.toFixed(2));
      } else {
        setVotingPower('0');
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) fetch();
  }, [address, fetch]);

  const shardDisplay = shardCount !== null ? String(shardCount).padStart(3, '0') : '000';

  if (isCollapsed) {
    return (
      <div className={styles.cardCollapsed}>
        <Image src="/icons/ui-shard.svg" alt="Shards" width={18} height={18} className={styles.shardIconSm} />
        <span className={styles.shardCountSm}>{shardDisplay}</span>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{shardDisplay}</span>
          <span className={styles.statLabel}>Shards</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{loading ? '--' : (votingPower ?? '0')}</span>
          <span className={styles.statLabel}>Votes</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{hasVip === null ? '--' : hasVip ? 'YES' : 'NO'}</span>
          <span className={styles.statLabel}>VIP</span>
        </div>
      </div>

      {/* Balances */}
      <div className={styles.balanceDivider} />
      <div className={styles.balanceList}>
        {loading ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} /><span className={styles.loadingDot} /><span className={styles.loadingDot} />
          </div>
        ) : (
          <>
            <div className={styles.balanceRow}>
              <div className={styles.tokenLeft}>
                <div className={styles.tokenIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L6 12l6 10 6-10L12 2z" fill="#627EEA" />
                    <path d="M12 2v8.5L6 12l6-10z" fill="#627EEA" opacity="0.6" />
                  </svg>
                </div>
                <span className={styles.tokenName}>ETH</span>
              </div>
              <span className={styles.balanceVal}>{ethBalance ?? '0.00'}</span>
            </div>
            <div className={styles.balanceRow}>
              <div className={styles.tokenLeft}>
                <div className={`${styles.tokenIcon} ${styles.tokenUsdc}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#2775CA" />
                    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
                  </svg>
                </div>
                <span className={styles.tokenName}>USDC</span>
              </div>
              <span className={styles.balanceVal}>{usdcBalance ?? '0.00'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
