'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './FeaturesSection.module.css';

const featureCards = [
  {
    number: '01',
    title: 'Decentralized Science Lab',
    badge: 'DeSci',
    description:
      'You are the subject and the scientist. Twelve weeks of live behavioral study — real research instruments, publishing collaborators, and an AI co-investigator who reviews your work.',
    details: ['IRB-style research design', 'You co-own the dataset', 'Credentials that compound'],
    footerLabel: 'Season 1 cohort',
    footerValue: '12 weeks',
  },
  {
    number: '02',
    title: 'Weekly Quests',
    badge: 'Weekly',
    description:
      'Each week drops a new case-study challenge. B.L.U.E. reads your submission, decides if you pass, and pays out from her own blockchain wallet. No grade inflation. No participation trophies.',
    details: ['Complete the reading', 'Submit to B.L.U.E.', 'Earn shards on-chain'],
    footerLabel: 'Week one reward',
    footerValue: '382 shards',
  },
  {
    number: '03',
    title: 'Universal Credit System',
    badge: 'Yours Forever',
    description:
      "Shards don't live on our servers — they live in your wallet. Earn while you study, spend across every MWA lab, or convert to real value. Your credits survive even when apps retire.",
    details: ['Earn while you study', 'Credits in your wallet', 'Convert to real cash'],
    footerLabel: 'On Base blockchain',
    footerValue: 'User-owned',
  },
];

export const FeaturesSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ''}`}
    >
      <div className={styles.container}>
        <div className={styles.board}>

          <div className={styles.boardHeader}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowAccent}>The Lab</span>
            </p>
          </div>

          <div className={styles.topPanel}>
            <div className={styles.phonePanel}>
              <div className={styles.phoneStack}>
                <div className={`${styles.phoneMockup} ${styles.phoneRear}`}>
                  <Image
                    src="/uploads/mockup-app-landing-2.png"
                    alt="Course reading screen on phone"
                    fill
                    sizes="140px"
                    className={styles.phoneImage}
                  />
                </div>
                <div className={`${styles.phoneMockup} ${styles.phoneFront}`}>
                  <Image
                    src="/uploads/mockup-app-landing.png"
                    alt="Week one tasks screen on phone"
                    fill
                    sizes="155px"
                    className={styles.phoneImage}
                  />
                </div>
              </div>
            </div>

            <div className={styles.headlinePanel}>
              <h2 className={styles.title}>&ldquo;Intellectually Refreshing&rdquo;</h2>
              <p className={styles.description}>
                New apps each week and point systems turned to real cash.
              </p>
              <a href="/community" className={styles.ctaButton}>
                Start Now
              </a>
            </div>
          </div>

          <div className={styles.cardGrid}>
            {featureCards.map((card) => (
              <article key={card.number} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardNumber}>{card.number}</span>
                  <span className={styles.badge}>{card.badge}</span>
                </div>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDescription}>{card.description}</p>
                <div className={styles.cardList}>
                  {card.details.map((detail) => (
                    <div key={detail} className={styles.cardListItem}>
                      <span className={styles.listDot} />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <span>{card.footerLabel}</span>
                  <strong>{card.footerValue}</strong>
                </div>
              </article>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
