'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './FeaturesSection.module.css';

const featureCards = [
  {
    number: '01',
    title: 'Morning Pages',
    badge: 'Daily',
    description:
      'Fifteen minutes of writing. No prompts, no pressure. Just you and the page. Private by default. The habit that changes everything.',
    details: ['Write your entry', 'Tag your mood', "Get Blue's feedback"],
    footerLabel: 'Private by default',
    footerValue: '15 minutes'
  },
  {
    number: '02',
    title: 'Weekly Tasks',
    badge: 'Weekly',
    description:
      'Each week unlocks a new challenge. Complete readings, reflections, and quests to earn shards and level up. Consistency is the main currency.',
    details: ['Complete the reading', 'Finish the quest', 'Claim your shards'],
    footerLabel: 'Week one reward',
    footerValue: '382 shards'
  },
  {
    number: '03',
    title: 'Agentic Tools',
    badge: 'Always On',
    description:
      'Blue researches for you, builds your credit, and manages governance proposals. AI tools that pay for themselves through on-chain actions.',
    details: ['Ask hard questions', 'Get real guidance', 'Cash out progress'],
    footerLabel: 'Companion status',
    footerValue: 'Online'
  }
];

const getCardPosition = (activeCard: number, index: number) => {
  const offset = (index - activeCard + featureCards.length) % featureCards.length;

  if (offset === 0) return styles.cardFront;
  if (offset === 1) return styles.cardMiddle;
  return styles.cardBack;
};

export const FeaturesSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % featureCards.length);
    }, 4200);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ''}`}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Your Course</p>
          <h2 className={styles.title}>A Real Wellness Game That&apos;s Actually Fun.</h2>
          <p className={styles.description}>
            Earning shards with the AI companions makes the course enjoyable and earns you
            real cash.
          </p>
          <a href="#membership" className={styles.ctaButton}>
            View Membership
          </a>
        </div>

        <div className={styles.showcase}>
          <div className={styles.companionTop}>
            <div className={styles.companionFrame}>
              <Image
                src="/azurabeauty.png"
                alt="AI companion portrait"
                fill
                sizes="(max-width: 768px) 96px, 132px"
                className={styles.companionImageAlt}
              />
            </div>
          </div>

          <div className={styles.companionBottom}>
            <div className={styles.companionFrame}>
              <Image
                src="/anbel01.png"
                alt="AI companion portrait"
                fill
                sizes="(max-width: 768px) 96px, 132px"
                className={styles.companionImage}
              />
            </div>
          </div>

          <div className={styles.mockupColumn}>
            <div className={styles.phoneStack}>
              <div className={`${styles.phoneMockup} ${styles.phoneRear}`}>
                <Image
                  src="/uploads/chat1.png"
                  alt="Course reading screen on phone"
                  fill
                  sizes="(max-width: 768px) 42vw, 320px"
                  className={styles.phoneImage}
                  priority
                />
              </div>

              <div className={`${styles.phoneMockup} ${styles.phoneFront}`}>
                <Image
                  src="/uploads/chat2.png"
                  alt="Week one tasks screen on phone"
                  fill
                  sizes="(max-width: 768px) 46vw, 360px"
                  className={styles.phoneImage}
                  priority
                />
              </div>
            </div>
          </div>

          <div className={styles.stageColumn}>
            <div className={styles.cardStage}>
              <div className={styles.stageGlow} />

              {featureCards.map((card, index) => (
                <article
                  key={card.number}
                  className={`${styles.stageCard} ${getCardPosition(activeCard, index)}`}
                >
                  <div className={styles.cardChrome} />
                  <div className={styles.cardInner}>
                    <span className={styles.cardNumber}>{card.number}</span>

                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.cardEyebrow}>Academy mode</p>
                        <h3 className={styles.cardTitle}>{card.title}</h3>
                      </div>
                      <span className={styles.badge}>{card.badge}</span>
                    </div>

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
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.pagination}>
              {featureCards.map((card, index) => (
                <button
                  key={card.number}
                  type="button"
                  aria-label={`Show card ${card.number}`}
                  className={`${styles.paginationDot} ${
                    index === activeCard ? styles.paginationDotActive : ''
                  }`}
                  onClick={() => setActiveCard(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
