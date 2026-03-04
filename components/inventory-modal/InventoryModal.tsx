'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { providers, Contract } from 'ethers';
import styles from './InventoryModal.module.css';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shardCount: number | null;
}

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS ||
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
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

export default function InventoryModal({ isOpen, onClose, shardCount }: InventoryModalProps) {
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
      const address = accounts[0];

      // Fetch ETH, USDC, voting power in parallel
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const killstreak = new Contract(CONTRACT_ADDRESS, KILLSTREAK_ABI, provider);

      const [ethRaw, usdcRaw, usdcDecimals, vpRaw] = await Promise.all([
        provider.getBalance(address),
        usdc.balanceOf(address),
        usdc.decimals(),
        killstreak.getVotingPower(address).catch(() => null),
      ]);

      setEthBalance(formatBalance(ethRaw, 18, 4));
      setUsdcBalance(formatBalance(usdcRaw, Number(usdcDecimals), 2));

      if (vpRaw !== null) {
        const vpNum = Number(vpRaw) / 1e18;
        setVotingPower(vpNum >= 1 ? Math.floor(vpNum).toLocaleString() : vpNum.toFixed(2));
      } else {
        setVotingPower('0');
      }

      // Check Academic Angel NFT via Scatter collection
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
            const nftBal = await nftContract.balanceOf(address);
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

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Inventory</h2>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading balances...</div>
          ) : (
            <>
              {/* Balances Grid */}
              <div className={styles.grid}>
                <div className={styles.item}>
                  <div className={styles.itemIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L6 12l6 10 6-10L12 2z" fill="#627EEA" />
                      <path d="M12 2v8.5L6 12l6-10z" fill="#627EEA" opacity="0.6" />
                      <path d="M12 2v8.5l6 1.5-6-10z" fill="#627EEA" opacity="0.8" />
                    </svg>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>ETH</span>
                    <span className={styles.itemValue}>{ethBalance ?? '--'}</span>
                  </div>
                </div>

                <div className={styles.item}>
                  <div className={`${styles.itemIcon} ${styles.iconUsdc}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#2775CA" />
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">$</text>
                    </svg>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>USDC</span>
                    <span className={styles.itemValue}>{usdcBalance ?? '--'}</span>
                  </div>
                </div>

                <div className={styles.item}>
                  <div className={styles.itemIcon}>
                    <Image src="/icons/Coin Poly.svg" alt="Voting Power" width={24} height={24} />
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>Voting Power</span>
                    <span className={styles.itemValue}>{votingPower ?? '--'}</span>
                  </div>
                </div>

                <div className={styles.item}>
                  <div className={styles.itemIcon}>
                    <Image src="/icons/shard.svg" alt="Shards" width={24} height={24} />
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>Shards</span>
                    <span className={styles.itemValue}>{shardCount !== null ? shardCount.toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>

              {/* Eligible Members */}
              <div className={styles.nftSection}>
                <div className={styles.nftHeader}>
                  <span className={styles.nftLabel}>Eligible Members</span>
                  {hasAngel !== null && (
                    <span className={hasAngel ? styles.nftOwned : styles.nftNotOwned}>
                      {hasAngel ? 'Owned' : 'Not Owned'}
                    </span>
                  )}
                </div>
                <div className={styles.nftRow}>
                  <div className={styles.nftCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://i.imgur.com/GXA3DBV.gif"
                      alt="Academic Angel"
                      className={styles.nftImage}
                    />
                  </div>
                  <div className={`${styles.nftCard} ${styles.nftCardNouns}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://www.lilnouns.wtf/app-icon.jpeg"
                      alt="Lil Nouns"
                      className={styles.nftImage}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
