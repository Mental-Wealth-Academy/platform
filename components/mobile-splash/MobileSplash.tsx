'use client';

import { useEffect, useState } from 'react';
import styles from './MobileSplash.module.css';

export default function MobileSplash() {
  const [isHiding, setIsHiding] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setIsHiding(true), 900);
    const removeTimer = window.setTimeout(() => setIsRemoved(true), 1500);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (isRemoved) return null;

  return (
    <div className={`${styles.splash} ${isHiding ? styles.splashHiding : ''}`} aria-hidden="true">
      <div className={styles.glow} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splashlogo.png"
        alt=""
        width={220}
        height={220}
        fetchPriority="high"
        decoding="async"
        className={styles.logo}
      />
    </div>
  );
}
