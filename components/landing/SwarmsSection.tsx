'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './SwarmsSection.module.css';
import PortfolioModal from './PortfolioModal';
import { useSound } from '@/hooks/useSound';

const AZURA_WALLET = '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const AZURA_WALLET_TRUNCATED = '0x2cbb...992d';

const PieChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F6F8ED" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3V12L5.5 17.5" />
    <path d="M12 12L21 12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5.333" y="5.333" width="8" height="8" rx="1" />
    <rect x="2.667" y="2.667" width="8" height="8" rx="1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#62BE8F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

export const SwarmsSection = () => {
  const [copied, setCopied] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const { play } = useSound();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AZURA_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = AZURA_WALLET;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className={styles.swarmsSection}>
      <div className={styles.swarmsContainer}>
        {/* Title */}
        <p className={styles.swarmsEyebrow}>Benefits</p>
        <h2 className={styles.swarmsTitle}>
          Wealth, Community, & Purpose
        </h2>

        {/* Portfolio Button */}
        <button
          className={styles.portfolioButton}
          onClick={() => setPortfolioOpen(true)}
          type="button"
        >
          <span className={styles.portfolioButtonText}>Total Portfolio Breakdown</span>
          <PieChartIcon />
        </button>

        {/* Wallet Address */}
        <div className={styles.walletGroup}>
          <div className={styles.walletAvatar}>
            <Image
              src="https://i.imgur.com/AkflhaJ.png"
              alt="Azura"
              width={50}
              height={50}
              className={styles.walletAvatarImg}
            />
          </div>
          <div className={styles.walletPill}>
            <div className={styles.walletAddressInner}>
              <span className={styles.walletAddress}>{AZURA_WALLET_TRUNCATED}</span>
              <button
                className={styles.copyButton}
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy wallet address'}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid  */}
        <div className={styles.swarmsContentGrid}>
          {/* Left: Features */}
          <div className={styles.swarmsFeatures}>
            {/* Feature 1 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <img src="/icons/atom-icon.svg" alt="Academic Foundation" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Community Public Goods</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                A structured course that walks you through self-reflection, behavioral science, and mental wellness — one week at a time. Each chapter builds on the last, designed by a psychologist with 12 years of research experience. No fluff, no filler. Just the material that actually moves the needle.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <img src="/icons/refreshment-icon.svg" alt="Intellectual Refreshment" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Intellectual Refreshment</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                We re-imagined what a mental health network would look and feel like from the perspective of a game for a younger audience. Notes, journaling, and activities replace lectures. No private data collected, completely async — you move at your own pace and keep what&apos;s yours.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <img src="/icons/debate-icon.svg" alt="Oracle Network" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Gamified Social Network</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Earn points, unlock quests, and level up through the system like an MMO. A seed community building the new territory for mental wellness — with on-chain governance, an AI co-pilot, and statistical dashboards tracking real progress. Think less app, more academy.
              </p>
            </div>
          </div>

          {/* Right: Decorative diamonds */}
          <div className={styles.swarmsDiamonds}>
            <Image
              src="https://i.imgur.com/nKONEi3.png"
              alt="Decorative diamonds"
              width={500}
              height={600}
              className={styles.diamondsImg}
            />
          </div>
        </div>
        {/* CTA */}
        <div className={styles.ctaWrapper}>
          <a href="/home" className={styles.ctaButton} onClick={() => play('click')} onMouseEnter={() => play('hover')}>
            Enter The Academy
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      <PortfolioModal isOpen={portfolioOpen} onClose={() => setPortfolioOpen(false)} />
    </section>
  );
};
