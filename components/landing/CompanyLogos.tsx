'use client';

import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import styles from './LandingPage.module.css';

const LOGOS = [
  { src: '/companylogos/ethereum-logo-dark.svg', alt: 'Ethereum logo', width: 50 },
  { src: '/companylogos/chainlink.svg', alt: 'Chainlink logo', width: 120 },
  { src: '/companylogos/charmverse.png', alt: 'CharmVerse logo', width: 120 },
  { src: '/companylogos/artizen.svg', alt: 'Artizen logo', width: 120 },
  { src: '/companylogos/Logo_ElizaOS_Blue_RGB.webp', alt: 'ElizaOS logo', width: 120 },
  { src: '/companylogos/ieee_logo_icon_169993.webp', alt: 'IEEE logo', width: 120 },
  { src: '/companylogos/American_Psychological_Association_logo.webp', alt: 'American Psychological Association logo', width: 120 },
  { src: '/companylogos/World_Health_Organization_Logo.webp', alt: 'World Health Organization logo', width: 120 },
  { src: '/companylogos/partner-1.webp', alt: 'Partner logo', width: 120 },
  { src: '/companylogos/partner-2.webp', alt: 'Partner logo', width: 120 },
  { src: '/companylogos/Base-Logo-New-1.png', alt: 'Base logo', width: 120 },
  { src: '/companylogos/OP_vertical_1200px.webp', alt: 'Optimism logo', width: 120, className: styles.optimismLogo },
];

export default function CompanyLogos() {
  const { play } = useSound();

  return (
    <div className={styles.companyLogosSection}>
      <p className={styles.trustedByText}>Ecosystem & Research Foundations</p>
      <div className={styles.logosGrid}>
        {LOGOS.map((logo) => (
          <div
            key={logo.src}
            className={styles.logoItem}
            onMouseEnter={() => play('hover')}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={80}
              className={`${styles.logoImage} ${logo.className || ''}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
