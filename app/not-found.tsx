'use client';

import Link from 'next/link';
import Image from 'next/image';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import { Footer } from '@/components/footer/Footer';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.bgViz}>
        <CyberpunkDataViz />
      </div>
      <section className={styles.heroSection}>
        <div className={styles.contentCol}>
          <div className={styles.content}>
            <h1 className={styles.heading}>404 Lost</h1>
            <p className={styles.paragraph}>
              &ldquo;The hardest thing of all is to find a black cat in a dark room, especially if there is no cat.&rdquo;
            </p>
          </div>
          <Link href="/home" className={styles.cta}>
            Return to Safety
          </Link>
        </div>
        <div className={styles.imageWrapper}>
          <Image
            src="/BlueTriModel.png"
            alt="404 Not Found"
            width={1200}
            height={600}
            className={styles.image}
            priority
            unoptimized
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
