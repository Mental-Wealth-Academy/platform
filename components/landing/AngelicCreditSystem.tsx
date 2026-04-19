'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './AngelicCreditSystem.module.css';

const FLOATING_ANGELS = [
  { src: '/anbel01.png', top: '8%',  left: '0%',   size: 64 },
  { src: '/anbel02.png', top: '5%',  left: '12%',  size: 72 },
  { src: '/anbel03.png', top: '30%', left: '6%',   size: 56 },
  { src: '/anbel04.png', top: '35%', left: '20%',  size: 52 },
  { src: '/anbel05.png', top: '55%', left: '3%',   size: 68 },
  { src: '/anbel06.png', top: '70%', left: '14%',  size: 60 },
  { src: '/anbel07.png', top: '2%',  right: '12%', size: 70 },
  { src: '/anbel08.png', top: '2%',  right: '0%',  size: 64 },
  { src: '/anbel09.png', top: '20%', right: '5%',  size: 56 },
  { src: '/anbel10.png', top: '25%', right: '18%', size: 52 },
  { src: '/anbel11.png', top: '50%', right: '2%',  size: 68 },
  { src: '/anbel12.png', top: '55%', right: '15%', size: 60 },
];


export default function AngelicCreditSystem() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}>
      {/* Floating angel images */}
      {FLOATING_ANGELS.map((angel, i) => (
        <div
          key={i}
          className={styles.floatingAngel}
          style={{
            top: angel.top,
            left: angel.left,
            right: (angel as any).right,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          <Image
            src={angel.src}
            alt="Angel"
            width={angel.size}
            height={angel.size}
            className={styles.angelImg}
            unoptimized
          />
        </div>
      ))}

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Conscious Momentum</h2>
          <p className={styles.subtitle}>
            Simple tools and lessons that make growth feel fun.
          </p>
        </div>

        {/* ── Companions ── */}
        <div className={styles.azuraCard}>
          <div className={styles.azuraBg}>
            <Image
              src="/starboard-card.png"
              alt="Blue Agent"
              fill
              className={styles.azuraBgImg}
            />
          </div>
          <div className={styles.azuraContent}>
            <div className={styles.azuraContentTop}>
              <div>
                <p className={styles.azuraEyebrow}>How We Help</p>
                <h3 className={styles.azuraName}>Support Tools</h3>
              </div>
            </div>
            <p className={styles.azuraSub}>
              Smart tools that help you stay organized, build momentum, and make better progress.
            </p>
            <div className={styles.azuraStats}>
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Wellness</span>
                <span className={styles.azuraStatLabel}>Support</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Fitness</span>
                <span className={styles.azuraStatLabel}>Funding</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Change</span>
                <span className={styles.azuraStatLabel}>Tools</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
