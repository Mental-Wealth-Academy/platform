import Image from 'next/image';
import { LandingScene } from './LandingScene';
import { LandingHeader } from './LandingHeader';
import { HeroSection } from './HeroSection';
import { DonationPopup } from './DonationPopup';
import { PatternTextSection } from './PatternTextSection';
import { FeaturesSection } from './FeaturesSection';
import { KeyFiguresSection } from './KeyFiguresSection';
import { TestimonialSection } from './TestimonialSection';
import { SwarmsSection } from './SwarmsSection';
import { FAQSection } from './FAQSection';
import { LandingFooter } from './LandingFooter';
import styles from './LandingPage.module.css';

// Server Component - Static content is server-rendered for fast LCP
const LandingPage = () => {
  return (
    <div className={styles.container}>
      {/* Header - Logo and CTAs */}
      <LandingHeader />

      {/* 3D Scene - Client component, loads after LCP */}
      <LandingScene />

      {/* Hero Section - Centered headline and CTA */}
      <HeroSection />

      {/* Company Logos Section - Server rendered */}
      <div className={styles.companyLogosSection}>
        <p className={styles.trustedByText}>Ecosystem & Research Foundations</p>
        <div className={styles.logosGrid}>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/full-ethereum-logo.webp"
              alt="Ethereum logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/OP_vertical_1200px.webp"
              alt="Optimism logo"
              width={120}
              height={80}
              className={`${styles.logoImage} ${styles.optimismLogo}`}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/Base-Logo-New-1.png"
              alt="Base logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/chainlink.svg"
              alt="Chainlink logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/full-aragon-logo.webp"
              alt="Aragon logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/gitcoin.webp"
              alt="Gitcoin logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/Logo_ElizaOS_Blue_RGB.webp"
              alt="ElizaOS logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/ieee_logo_icon_169993.webp"
              alt="IEEE logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/American_Psychological_Association_logo.webp"
              alt="American Psychological Association logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/World_Health_Organization_Logo.webp"
              alt="World Health Organization logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/partner-1.webp"
              alt="Partner logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
          <div className={styles.logoItem}>
            <Image
              src="/companylogos/partner-2.webp"
              alt="Partner logo"
              width={120}
              height={80}
              className={styles.logoImage}
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Swarms Section - Server rendered */}
      <SwarmsSection />

      {/* Features Section - Server rendered */}
      <FeaturesSection />

      {/* Testimonial Section - Server rendered */}
      <TestimonialSection />

      {/* Key Figures Section - Server rendered */}
      <KeyFiguresSection />

      {/* Pattern Background Section - Contains client component for animation */}
      <PatternTextSection />

      {/* FAQ Section - Client component for accordion */}
      <FAQSection />

      {/* Footer - Server rendered */}
      <LandingFooter />

      {/* Donation Popup - Client component */}
      <DonationPopup />
    </div>
  );
};

export default LandingPage;
