'use client';

import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import styles from './LandingPage.module.css';

const LOGOS = [
  { src: '/companylogos/ethereum-logo-dark.svg', alt: 'Ethereum logo', width: 50 },
  { src: '/companylogos/American_Psychological_Association_logo.svg.png', alt: 'American Psychological Association logo', width: 240, className: styles.apaLogo },
  { src: '/companylogos/charmverse.png', alt: 'CharmVerse logo', width: 120 },
  { src: '/companylogos/artizen.svg', alt: 'Artizen logo', width: 96 },
  { src: '/companylogos/foundation-dark.webp', alt: 'Foundation logo', width: 120 },
  { src: '/companylogos/full-aragon-logo.webp', alt: 'Aragon logo', width: 120 },
  { src: '/companylogos/gitcoin.webp', alt: 'Gitcoin logo', width: 120 },
  { src: '/companylogos/Logo_ElizaOS_Blue_RGB.webp', alt: 'ElizaOS logo', width: 120 },
  { src: '/companylogos/ndW713QDOQJJBgB-aJvrIJ8U2HfKTYL4-h3RRtYNgX9DMzlziKfCVRdTnq4mHGltuCtutlq37GKdfB90YKodWg.webp', alt: 'Arbitrum logo', width: 130 },
  { src: '/companylogos/Base-Logo-New-1.png', alt: 'Base logo', width: 120 },
  { src: '/companylogos/OP_vertical_1200px.webp', alt: 'Optimism logo', width: 120, className: styles.optimismLogo },
  { src: '/companylogos/chainlink.png', alt: 'Chainlink logo', width: 120 },
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
