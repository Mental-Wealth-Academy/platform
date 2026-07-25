'use client';

import Image from 'next/image';
import React from 'react';
import CtaButton from '@/components/shared/CtaButton';
import styles from './HowItWorksSection.module.css';

const introCopy =
  'MWA started an IRB-study idea for new age education governance for higher institutions. Where AI-assisted learning can still coincide interpersonal connections and friendships online. Our infrastructure helps you create curriculums worth logging into. Join the next gen.';

export const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" className={styles.section} aria-label="How it works">
    <div className={styles.container}>
      <div className={styles.copy}>
        <h2 className={styles.heading}>
          Your education deserves{' '}
          <span className={styles.headingHighlight}>new solutions</span>
        </h2>
        <p className={styles.lead}>{introCopy}</p>
        <div className={styles.actions}>
          <CtaButton href="/home" size="lg">Explore the Academy</CtaButton>
          <CtaButton href="#membership" variant="secondary" size="lg" className={styles.lightCta}>
            View memberships
          </CtaButton>
        </div>
      </div>

      <Image
        className={styles.image}
        src="/landing/blue-learning-companion.png"
        alt="Blue, the Mental Wealth Academy learning companion"
        width={1536}
        height={1024}
        sizes="(max-width: 900px) 100vw, 50vw"
      />
    </div>
  </section>
);

export default HowItWorksSection;
