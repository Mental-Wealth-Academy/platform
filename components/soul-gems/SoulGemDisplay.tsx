'use client';

import React from 'react';
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
        <Image src="/icons/ui-shard.svg" alt="DAEMON Shard" width={24} height={24} unoptimized />
      </div>
      <span className={styles.amount}>{formatAmount(amount)}</span>
      {showLabel && <span className={styles.label}>{label || 'Soul Gems'}</span>}
    </div>
  );
};

/**
 * Blue's Power Indicator with treasury display
 */
interface BluePowerIndicatorProps {
  soulGems: string;
  walletAddress: string;
  governanceTokenAddress: string;
  memberAvatars?: Array<{
    src: string | null;
    alt: string;
    fallback: string;
  }>;
}

export const BluePowerIndicator: React.FC<BluePowerIndicatorProps> = ({
  soulGems,
  walletAddress,
  governanceTokenAddress,
  memberAvatars = [],
}) => {
  const heroAvatars = [
    { src: 'https://i.imgur.com/Y6YNtam.png', alt: 'Blue', fallback: 'B' },
    ...memberAvatars,
  ].slice(0, 12);
  const leadAvatar = heroAvatars[0];
  const rosterAvatars = heroAvatars.slice(1);
  const communityCount = rosterAvatars.length;

  return (
    <div className={styles.bluePower}>
      <div className={styles.leadCard}>
        <div className={styles.leadAvatarFrame}>
          {leadAvatar?.src ? (
            <Image
              src={leadAvatar.src}
              alt={leadAvatar.alt}
              width={250}
              height={250}
              className={styles.leadAvatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarFallback} aria-label={leadAvatar?.alt ?? 'Blue'}>
              {leadAvatar?.fallback ?? 'B'}
            </div>
          )}
        </div>
        <div className={styles.leadMeta}>
          <span className={styles.leadEyebrow}>Host Node</span>
          <strong className={styles.leadName}>Blue</strong>
          <p className={styles.leadCopy}>Holding the room while members surface ideas, vote, and move resources with intent.</p>
        </div>
      </div>

      <div className={styles.rosterPanel}>
        <div className={styles.rosterHeader}>
          <div>
            <span className={styles.rosterEyebrow}>Active Faces</span>
            <h3 className={styles.rosterTitle}>Community roster</h3>
          </div>
          <span className={styles.rosterCount}>{communityCount}+ live</span>
        </div>

        <div className={styles.avatarStrip} aria-label="Blue and community avatars">
          {rosterAvatars.map((avatar, index) => (
            <div key={`${avatar.alt}-${index}`} className={styles.avatarTile}>
              {avatar.src ? (
                <Image
                  src={avatar.src}
                  alt={avatar.alt}
                  width={250}
                  height={250}
                  className={styles.blueAvatar}
                  unoptimized
                />
              ) : (
                <div className={styles.avatarFallback} aria-label={avatar.alt}>
                  {avatar.fallback}
                </div>
              )}
              <span className={styles.avatarName}>{avatar.alt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SoulGemDisplay;
