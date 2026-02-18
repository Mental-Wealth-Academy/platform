'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './SoulGemDisplay.module.css';

interface SoulGemDisplayProps {
  amount: string;
  label?: string;
  showLabel?: boolean;
}

/**
 * Soul Gem Icon SVG
 */
const SoulGemIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L3 8L12 14L21 8L12 2Z" 
      fill="url(#gem-gradient-1)" 
      stroke="rgba(139, 92, 246, 0.8)" 
      strokeWidth="1"
    />
    <path 
      d="M3 8L12 22L21 8" 
      fill="url(#gem-gradient-2)" 
      stroke="rgba(99, 102, 241, 0.6)" 
      strokeWidth="1"
    />
    <defs>
      <linearGradient id="gem-gradient-1" x1="12" y1="2" x2="12" y2="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="rgba(139, 92, 246, 0.9)" />
        <stop offset="1" stopColor="rgba(99, 102, 241, 0.9)" />
      </linearGradient>
      <linearGradient id="gem-gradient-2" x1="12" y1="8" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="rgba(99, 102, 241, 0.8)" />
        <stop offset="1" stopColor="rgba(79, 70, 229, 0.9)" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Display Soul Gem count with icon
 */
export const SoulGemDisplay: React.FC<SoulGemDisplayProps> = ({
  amount,
  label,
  showLabel = true,
}) => {
  // Format amount (remove decimals for cleaner display)
  const formatAmount = (amt: string) => {
    const num = parseFloat(amt);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toFixed(0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.gemIcon}>
        <Image src="/icons/shard.svg" alt="DAEMON Shard" width={24} height={24} unoptimized />
      </div>
      <span className={styles.amount}>{formatAmount(amount)}</span>
      {showLabel && <span className={styles.label}>{label || 'Soul Gems'}</span>}
    </div>
  );
};

/**
 * Azura's Power Indicator with link to BaseScan
 */
interface AzuraPowerIndicatorProps {
  soulGems: string;
  walletAddress: string;
  governanceTokenAddress: string;
}

export const AzuraPowerIndicator: React.FC<AzuraPowerIndicatorProps> = ({
  soulGems,
  walletAddress,
  governanceTokenAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.azuraPower}>
      <div>
        <Image
          src="https://i.imgur.com/AkflhaJ.png"
          alt="Azura"
          width={32}
          height={32}
          className={styles.azuraAvatar}
          unoptimized
        />
        <div className={styles.azuraInfo}>
          <h4 className={styles.azuraName}>
            Azura
            <span className={styles.aiTag}>Guardian</span>
            <button
              className={styles.copyButton}
              onClick={handleCopy}
              title={copied ? 'Copied!' : `Copy address: ${walletAddress}`}
              type="button"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </h4>
        </div>
      </div>
      <SoulGemDisplay amount={soulGems} label="Voting Power (40%)" />
    </div>
  );
};

export default SoulGemDisplay;
