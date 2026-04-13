'use client';

import Link from 'next/link';
import Image from 'next/image';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.bgViz}>
        <CyberpunkDataViz />
      </div>
      <div className={styles.container}>
        <div className={styles.content}>
          <h3 className={styles.heading}>Page Not Found</h3>
          <p className={styles.paragraph}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            Let&apos;s get you back on track to your mental wealth journey.
          </p>
        </div>
        <div className={styles.imageWrapper}>
          <Image
            src="/azura404.png"
            alt="404 Not Found"
            width={400}
            height={400}
            className={styles.image}
            priority
            unoptimized
          />
        </div>
        <Link href="/home" className={styles.cta}>
          Go to Home
        </Link>
      </div>
    </div>
  );
}
