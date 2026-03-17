'use client';

import Image from 'next/image';
import styles from './TheseAreAngels.module.css';

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

export default function TheseAreAngels() {
  return (
    <section className={styles.section}>
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

      {/* Center content */}
      <div className={styles.centerContent}>
        <h2 className={styles.headline}>These are Angels</h2>
        <p className={styles.description}>
          Angels are unique digital art pieces. Each unlocks your digital game piece inside the world of Mental Wealth Academy.
        </p>

        {/* Video card */}
        <div className={styles.videoCard}>
          <div className={styles.videoThumb}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className={styles.videoText}>
            <span className={styles.videoTitle}><strong>This is Azura AI</strong></span>
            <span className={styles.videoSub}>Watch the video</span>
          </div>
        </div>
      </div>
    </section>
  );
}
