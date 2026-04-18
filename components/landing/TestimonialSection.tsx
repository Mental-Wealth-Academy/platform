'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './TestimonialSection.module.css';

const testimonials = [
  {
    quote: 'The weekly sessions helped me get out of a pretty burnt-out place. I feel more clear, more consistent, and more connected to what I actually want to make.',
    name: 'Jordan K.',
    title: 'Product designer',
    avatar: '/anbel03.png',
  },
  {
    quote: 'I joined because I wanted more structure and support in my life. What surprised me most was how thoughtful the community felt and how much people actually listened to each other.',
    name: 'Maya T.',
    title: 'Graduate student',
    avatar: '/anbel07.png',
  },
  {
    quote: 'I usually fall off with programs like this, but the small prompts and check-ins kept me engaged. It made taking care of myself feel easier to come back to.',
    name: 'Aisha R.',
    title: 'UX researcher',
    avatar: '/anbel10.png',
  },
  {
    quote: 'I came for the wellness tools, but I stayed because it felt like a real community. People support each other here in a way that feels practical, not performative.',
    name: 'Ezra M.',
    title: 'Community organizer',
    avatar: '/anbel04.png',
  },
  {
    quote: 'The morning journaling practice genuinely changed my routine. It gave me a calmer start to the day and helped me notice patterns I normally ignore.',
    name: 'Priya S.',
    title: 'College student',
    avatar: '/anbel09.png',
  },
];

const SPEED_NORMAL = 0.5;  // px per frame
const SPEED_SLOW = 0.15;   // px per frame on hover
const LERP = 0.04;         // how fast speed transitions (lower = smoother)

export const TestimonialSection: React.FC = () => {
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isInView, setIsInView] = useState(false);
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
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasEnteredView(true);
        }
      },
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
    if (!isInView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isInView, tick]);

  const handleMouseEnter = () => { targetSpeedRef.current = SPEED_SLOW; };
  const handleMouseLeave = () => { targetSpeedRef.current = SPEED_NORMAL; };

  // Duplicate for seamless loop
  const items = [...testimonials, ...testimonials];

  return (
    <section ref={sectionRef} className={`${styles.section} ${hasEnteredView ? styles.sectionVisible : ''}`}>
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
