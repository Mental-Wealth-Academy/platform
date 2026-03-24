'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './TestimonialSection.module.css';

const testimonials = [
  {
    quote: 'The weekly flows and peer sessions helped me reclaim my agency. I went from burnt out to building something meaningful — this community actually gets it.',
    name: 'Jordan K.',
    title: 'Common Angel, Cohort 2',
    avatar: '/anbel03.png',
  },
  {
    quote: 'Mental Wealth Academy gave me a space to connect, reflect, and grow on-chain. The governance felt real — my vote actually shaped where funding went. I\'ve never seen anything like this.',
    name: 'Maya T.',
    title: 'Elite Angel, Generation 1',
    avatar: '/anbel07.png',
  },
  {
    quote: 'The gamified quests kept me engaged when traditional support felt draining. Earning tokens for journaling and showing up? That\'s the kind of incentive design that works.',
    name: 'Aisha R.',
    title: 'Common Angel, Cohort 1',
    avatar: '/anbel10.png',
  },
];

export const TestimonialSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.container}>
        <div className={styles.eyebrow}>Hear what academy members have to say</div>
        <div className={styles.grid}>
          {testimonials.map((t, i) => (
            <div key={i} className={`${styles.card} ${i === 1 ? styles.cardFeatured : ''}`} style={{ transitionDelay: `${i * 0.12}s` }}>
              <blockquote className={styles.quote}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className={styles.footer}>
                <Image
                  src={t.avatar}
                  alt={t.name}
                  width={36}
                  height={36}
                  className={styles.avatar}
                  unoptimized
                />
                <div className={styles.attribution}>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorTitle}>{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
