'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  {
    quote: 'I came for the mental health tools and stayed for the on-chain governance. Proposing funding for a peer-led breathwork circle and watching it pass — that changed how I see community power.',
    name: 'Ezra M.',
    title: 'Rare Angel, Cohort 2',
    avatar: '/anbel04.png',
  },
  {
    quote: 'The Morning Pages ritual rewired my mornings. Combining journaling with token rewards made consistency feel natural instead of forced. This is what Web3 wellness should look like.',
    name: 'Priya S.',
    title: 'Common Angel, Cohort 3',
    avatar: '/anbel09.png',
  },
];

const SPEED_NORMAL = 0.5;  // px per frame
const SPEED_SLOW = 0.15;   // px per frame on hover
const LERP = 0.04;         // how fast speed transitions (lower = smoother)

export const TestimonialSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const speedRef = useRef(SPEED_NORMAL);
  const targetSpeedRef = useRef(SPEED_NORMAL);
  const rafRef = useRef<number>(0);

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

  const tick = useCallback(() => {
    const track = trackRef.current;
    if (!track) { rafRef.current = requestAnimationFrame(tick); return; }

    // Lerp current speed toward target
    speedRef.current += (targetSpeedRef.current - speedRef.current) * LERP;

    offsetRef.current += speedRef.current;

    // Reset at half-width for seamless loop
    const halfWidth = track.scrollWidth / 2;
    if (offsetRef.current >= halfWidth) {
      offsetRef.current -= halfWidth;
    }

    track.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const handleMouseEnter = () => { targetSpeedRef.current = SPEED_SLOW; };
  const handleMouseLeave = () => { targetSpeedRef.current = SPEED_NORMAL; };

  // Duplicate for seamless loop
  const items = [...testimonials, ...testimonials];

  return (
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.container}>
        <div className={styles.eyebrow}>Hear what academy members have to say</div>
        <div
          className={styles.scrollWrapper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div ref={trackRef} className={styles.scrollTrack}>
            {items.map((t, i) => (
              <div key={i} className={styles.card}>
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
      </div>
    </section>
  );
};

export default TestimonialSection;
