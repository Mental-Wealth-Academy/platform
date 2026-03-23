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
import CompanyLogos from './CompanyLogos';
import { RotatingTextSection } from './RotatingTextSection';
import { AcademicAngels } from './AcademicAngels';
import AngelicCreditSystem from './AngelicCreditSystem';
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

      {/* Company Logos Section */}
      <CompanyLogos />

      {/* Helping people — rotating text */}
      <RotatingTextSection />

      {/* Angelic Credit System — governance explainer */}
      <AngelicCreditSystem />

      {/* Academic Angels — Scatter mint stepper */}
      <AcademicAngels />

      {/* Features Section - Server rendered */}
      <FeaturesSection />

      {/* Key Figures Section - Server rendered */}
      <KeyFiguresSection />

      {/* Pattern Background Section - Contains client component for animation */}
      <PatternTextSection />

      {/* Testimonial Section - Server rendered */}
      <TestimonialSection />

      {/* Swarms Section - Server rendered */}
      <SwarmsSection />

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
