'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import styles from './LottieLoader.module.css';

interface LottieLoaderProps {
  src: string;
  label?: string;
  className?: string;
  size?: number;
}

export default function LottieLoader({ src, label, className, size = 88 }: LottieLoaderProps) {
  return (
    <div className={`${styles.wrap} ${className ?? ''}`} style={{ '--loader-size': `${size}px` } as React.CSSProperties}>
      <DotLottieReact
        className={styles.animation}
        src={src}
        loop
        autoplay
      />
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );
}
