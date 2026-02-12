'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './SwarmsSection.module.css';
import PortfolioModal from './PortfolioModal';

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
        <h2 className={styles.swarmsTitle}>
          Designed to enhance real grassroot projects, funding, and connections
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
                <h3 className={styles.swarmsFeatureTitle}>Building an Academic Foundation</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Presenting the revolutionary Agentic Azura Agent, a cutting-edge computational swarm assistant crafted to explore the complex interactions of tectonic plate movements. This advanced technology leverages collective intelligence, allowing it to analyze and forecast geological changes with remarkable precision. Envision a network of digital minds collaborating seamlessly, each adding to a rich reservoir of knowledge that breaks ignorance. The Agentic Azura Agent is more than just a tool; it&apos;s a gateway to understanding our planet&apos;s dynamics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <img src="/icons/shadow-icon.svg" alt="Daemon Database" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Fully Private Daemon Database</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                Introducing the innovative Daemon Dataset, our latest agentic DeSci model designed to enhance decision-making through engaging role-play and gamification. This cutting-edge technology leverages collective intelligence to create a dynamic environment where users can explore and influence outcomes with thrilling excitement. Picture a network of digital agents collaborating seamlessly, each adding to a rich tapestry of insights that push beyond conventional limits. The Daemon Dataset is more than just a resource; it&apos;s an interactive experience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.swarmsDivider} />
            <div className={styles.swarmsFeatureBlock}>
              <div className={styles.swarmsFeatureHeader}>
                <div className={styles.swarmsFeatureIcon}>
                  <img src="/icons/debate-icon.svg" alt="Oracle Network" width={35} height={35} />
                </div>
                <h3 className={styles.swarmsFeatureTitle}>Decentralized Oracle Network</h3>
              </div>
              <p className={styles.swarmsFeatureText}>
                The decentralized oracle network provides 20 copies of every agentic transaction, only once the oracle has fully verified the swarm are transactions sent from the treasury designed to delve into the intricate dynamics of tectonic plate movements. This innovative technology harnesses the power of collective intelligence, enabling it to analyze and predict geological shifts with unprecedented accuracy. Imagine a network of digital minds working in harmony, each contributing to a vast pool of knowledge that transcends traditional boundaries. The Azura Agent is not just a tool; she is the underpinning system unix that controls the network.
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
          <a href="/home" className={styles.ctaButton}>
            Enter The Academy
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* MWA Logo - bottom right */}
      <div className={styles.sectionLogo}>
        <Image
          src="/icons/mwa-logo-horizontal.png"
          alt="Mental Wealth Academy"
          width={140}
          height={51}
          className={styles.sectionLogoImg}
        />
      </div>

      <PortfolioModal isOpen={portfolioOpen} onClose={() => setPortfolioOpen(false)} />
    </section>
  );
};
