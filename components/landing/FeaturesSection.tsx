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
    title: 'Weekly Rewards',
    badge: 'Weekly',
    description:
      'Each week unlocks a new challenge. Complete readings, reflections, and quests to earn shards and level up. Consistency is the main currency.',
    details: ['Complete the reading', 'Finish the quest', 'Claim your shards'],
    footerLabel: 'Week one reward',
    footerValue: '382 shards'
  },
  {
    number: '03',
    title: 'AI Companions',
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
    }, 5600);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ''}`}
    >
      <div className={styles.container}>
        <div className={styles.showcase}>
          <div className={styles.companionTop}>
            <div className={styles.companionFrame}>
              <Image
                src="/uploads/vesper-landing-avatar.png"
                alt="AI companion portrait"
                fill
                sizes="(max-width: 768px) 96px, 132px"
                className={styles.companionImage}
              />
            </div>
          </div>

          <div className={styles.companionBottom}>
            <div className={styles.companionFrame}>
              <Image
                src="/uploads/blue-landing-avatar.png"
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
                  src="/uploads/mockup-app-landing-2.png"
                  alt="Course reading screen on phone"
                  fill
                  sizes="(max-width: 768px) 42vw, 320px"
                  className={styles.phoneImage}
                  priority
                />
              </div>

              <div className={`${styles.phoneMockup} ${styles.phoneFront}`}>
                <Image
                  src="/uploads/mockup-app-landing.png"
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
            <div className={styles.header}>
              <p className={styles.eyebrow}>Your Course</p>
              <h2 className={styles.title}>A Wellness Game That&apos;s Actually Fun.</h2>
              <p className={styles.description}>
                Hang with your AI companions, stack shards, and turn your daily wellness
                routine into something playful, motivating, and worth showing up for.
              </p>
              <a
                href="https://github.com/Mental-Wealth-Academy/platform"
                target="_blank"
                rel="noreferrer"
                className={styles.ctaButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={styles.ctaIcon}
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.477 2 2 6.589 2 12.25c0 4.529 2.865 8.372 6.839 9.728.5.096.682-.223.682-.496 0-.245-.009-.894-.014-1.755-2.782.617-3.369-1.375-3.369-1.375-.455-1.183-1.11-1.498-1.11-1.498-.908-.637.069-.624.069-.624 1.004.072 1.532 1.055 1.532 1.055.892 1.566 2.341 1.114 2.91.852.091-.665.349-1.114.635-1.37-2.221-.26-4.555-1.14-4.555-5.074 0-1.121.39-2.038 1.029-2.756-.103-.262-.446-1.316.098-2.744 0 0 .84-.277 2.75 1.052A9.303 9.303 0 0 1 12 6.851a9.27 9.27 0 0 1 2.504.35c1.909-1.329 2.748-1.052 2.748-1.052.546 1.428.202 2.482.099 2.744.641.718 1.028 1.635 1.028 2.756 0 3.944-2.337 4.811-4.565 5.066.359.319.678.948.678 1.91 0 1.379-.012 2.492-.012 2.831 0 .275.18.596.688.495C19.138 20.619 22 16.777 22 12.25 22 6.589 17.523 2 12 2Z"
                  />
                </svg>
                Check Github
              </a>
            </div>

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
