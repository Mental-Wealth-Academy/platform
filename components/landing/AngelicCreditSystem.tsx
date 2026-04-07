'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [showVideo, setShowVideo] = useState(false);
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

  const openVideo = useCallback(() => setShowVideo(true), []);
  const closeVideo = useCallback(() => setShowVideo(false), []);

  useEffect(() => {
    if (!showVideo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVideo();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showVideo, closeVideo]);

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
          <p className={styles.eyebrow}>Our Core Mission</p>
          <h2 className={styles.title}>Benefits Anyone Can Afford</h2>
          <p className={styles.subtitle}>
            our core mission is keeping powerful knowledge, free, available, and low-cost to people everywhere around the world.
          </p>
        </div>

        {/* ── Blue Agent ── */}
        <div className={styles.azuraCard}>
          <div className={styles.azuraBg}>
            <Image
              src="https://i.imgur.com/Ehf0XUt.png"
              alt="Blue Agent"
              fill
              className={styles.azuraBgImg}
              priority
            />
          </div>
          <div className={styles.azuraContent}>
            <div className={styles.azuraContentTop}>
              <div>
                <p className={styles.azuraEyebrow}>How We Help</p>
                <h3 className={styles.azuraName}>Blue Agent</h3>
              </div>
              <div
                className={styles.videoCard}
                onClick={openVideo}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openVideo()}
              >
                <div className={styles.videoThumb}>
                  <Image
                    src="https://i.imgur.com/awTTvxR.jpeg"
                    alt="Blue AI"
                    width={64}
                    height={48}
                    className={styles.thumbImg}
                    unoptimized
                  />
                </div>
                <div className={styles.videoText}>
                  <span className={styles.videoTitle}><strong>This is BLUE</strong></span>
                  <span className={styles.videoSub}>Watch the video</span>
                </div>
              </div>
            </div>
            <p className={styles.azuraSub}>
              A reputation-based ecosystem where earned gems turn into powerful tools during your 12-week course progress with Blue, an emotional, memory driven AI companion with her own wallet.
            </p>
            <div className={styles.azuraStats}>
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Credit Repair</span>
                <span className={styles.azuraStatLabel}>AI-powered</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Governance</span>
                <span className={styles.azuraStatLabel}>Help Funding</span>
              </div>
              <div className={styles.azuraStatDivider} />
              <div className={styles.azuraStat}>
                <span className={styles.azuraStatValue}>Decentralized</span>
                <span className={styles.azuraStatLabel}>Science &amp; Tools</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Video Modal — portaled to body to escape stacking context */}
      {showVideo && createPortal(
        <div className={styles.videoOverlay} onClick={closeVideo}>
          <div className={styles.videoModal} onClick={(e) => e.stopPropagation()}>
            <span className={`${styles.cornerAccent} ${styles.cornerTL}`} />
            <span className={`${styles.cornerAccent} ${styles.cornerTR}`} />
            <span className={`${styles.cornerAccent} ${styles.cornerBL}`} />
            <span className={`${styles.cornerAccent} ${styles.cornerBR}`} />
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <span className={styles.statusDot} />
                <span className={styles.modalLabel}>BLUE AI</span>
              </div>
              <button className={styles.closeButton} onClick={closeVideo} aria-label="Close video">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className={styles.videoEmbed}>
              <iframe
                src="/blue-intro-video.html"
                title="This is BLUE AI"
                allowFullScreen
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
