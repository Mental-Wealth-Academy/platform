'use client';

import Image from 'next/image';
import styles from './AngelicCreditSystem.module.css';

export default function AngelicCreditSystem() {
  return (
    <section className={styles.section} aria-label="Mental Wealth Academy">
      <Image
        src="/images/angelic-credit-bg.webp"
        alt=""
        fill
        className={styles.bgImage}
        priority={false}
        aria-hidden="true"
      />
      <div className={styles.logoWrap}>
        <Image
          src="/icons/mwa-dark-outline-logo.png"
          alt="Mental Wealth Academy"
          width={2516}
          height={1677}
          className={styles.logoImage}
          priority={false}
        />
      </div>
    </section>
  );
}
