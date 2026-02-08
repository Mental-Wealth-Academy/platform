import Image from 'next/image';
import { LandingScene } from './LandingScene';
import { LandingHeader } from './LandingHeader';
import { HeroSection } from './HeroSection';
import { DonationPopup } from './DonationPopup';
import { PatternTextSection } from './PatternTextSection';
import { FeaturesSection } from './FeaturesSection';
import { KeyFiguresSection } from './KeyFiguresSection';
import { TestimonialSection } from './TestimonialSection';
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

      {/* Features Section - Server rendered */}
      <FeaturesSection />

      {/* Key Figures Section - Server rendered */}
      <KeyFiguresSection />

      {/* Testimonial Section - Server rendered */}
      <TestimonialSection />

      {/* Pattern Background Section - Contains client component for animation */}
      <PatternTextSection />

      {/* The Opportunity Section - Server rendered */}
      <section id="opportunity" className={styles.opportunitySection}>
        <div className={styles.opportunityContainer}>
          <div className={styles.opportunityGrid}>
            <div className={styles.opportunityLeft}>
              <h1 className={styles.opportunityTitle}>The Opportunity</h1>
              <div className={styles.opportunityTextTop}>
                <p>Over 60% of students report feeling disengaged from traditional education systems, while 85% of knowledge workers say they learned more from peer networks than formal institutions. The current model is failing.</p>
              </div>
              <div className={styles.opportunityImageWrapper}>
                <div className={styles.opportunityImageContainer}>
                  <Image
                    src="/uploads/opportunity.webp"
                    alt="Mental health opportunity"
                    fill
                    className={styles.opportunityImage}
                    loading="lazy"
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 384px, 384px"
                  />
                </div>
              </div>
            </div>
            <div className={styles.opportunityRight}>
              <ul className={styles.opportunityList}>
                <li className={styles.opportunityListItem}>
                  <div className={styles.opportunityListItemIcon}>
                    <div className={styles.opportunityListItemIconContainer}>
                      <Image
                        src="/icons/Clinical Icon.svg"
                        alt="Clinical Care"
                        fill
                        className={styles.opportunityListItemIconImage}
                      />
                    </div>
                  </div>
                  <div className={styles.opportunityListItemContent}>
                    <h5 className={styles.opportunityListItemTitle}>Personalized Learning Paths</h5>
                    <div className={styles.opportunityListItemText}>
                      <p>Traditional education systems plant the same seeds in every garden, expecting uniform growth. We cultivate personalized learning ecosystems where each mind blooms at its own pace, nourished by adaptive curricula that respond to individual needs rather than standardized tests.</p>
                    </div>
                  </div>
                </li>
                <li className={styles.opportunityListItem}>
                  <div className={styles.opportunityListItemIcon}>
                    <div className={styles.opportunityListItemIconContainer}>
                      <Image
                        src="/icons/Mental Health Icon.svg"
                        alt="Community Support"
                        fill
                        className={styles.opportunityListItemIconImage}
                      />
                    </div>
                  </div>
                  <div className={styles.opportunityListItemContent}>
                    <h5 className={styles.opportunityListItemTitle}>Collaborative Learning Networks</h5>
                    <div className={styles.opportunityListItemText}>
                      <p>Knowledge grows stronger when shared. Like a forest where trees communicate through underground networks, we&apos;re building peer learning ecosystems where students teach students, ideas cross-pollinate, and wisdom flows through decentralized networks that strengthen the entire community.</p>
                    </div>
                  </div>
                </li>
                <li className={styles.opportunityListItem}>
                  <div className={styles.opportunityListItemIcon}>
                    <div className={styles.opportunityListItemIconContainer}>
                      <Image
                        src="/icons/Mental Health Icon (1).svg"
                        alt="Prevention & Early Intervention"
                        fill
                        className={styles.opportunityListItemIconImage}
                      />
                    </div>
                  </div>
                  <div className={styles.opportunityListItemContent}>
                    <h5 className={styles.opportunityListItemTitle}>Foundational Knowledge Building</h5>
                    <div className={styles.opportunityListItemText}>
                      <p>Strong foundations support towering structures. Rather than patching gaps after they appear, we plant seeds of understanding early—building cognitive frameworks that grow into robust knowledge trees, preventing learning gaps before they become chasms that block future growth.</p>
                    </div>
                  </div>
                </li>
                <li className={styles.opportunityListItem}>
                  <div className={styles.opportunityListItemIcon}>
                    <div className={styles.opportunityListItemIconContainer}>
                      <Image
                        src="/icons/Mental Health Icon (3).svg"
                        alt="AI-Governance"
                        fill
                        className={styles.opportunityListItemIconImage}
                      />
                    </div>
                  </div>
                  <div className={styles.opportunityListItemContent}>
                    <h5 className={styles.opportunityListItemTitle}>AI-Enhanced Learning</h5>
                    <div className={styles.opportunityListItemText}>
                      <p>Imagine a learning companion that never sleeps, remembers every lesson, and adapts in real-time. Our AI systems act as intelligent tutors that amplify human wisdom—guiding curriculum decisions, personalizing pathways, and optimizing educational resources so every learner receives exactly what they need to flourish.</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Server rendered */}
      <LandingFooter />

      {/* Donation Popup - Client component */}
      <DonationPopup />
    </div>
  );
};

export default LandingPage;
