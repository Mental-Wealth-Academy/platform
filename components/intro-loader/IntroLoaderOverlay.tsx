'use client';

import { useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import styles from './IntroLoaderOverlay.module.css';

interface IntroLoaderOverlayProps {
  src: string;
  label?: string;
  durationMs?: number;
  onFinish: () => void;
}

export default function IntroLoaderOverlay({
  src,
  label,
  durationMs = 450,
  onFinish,
}: IntroLoaderOverlayProps) {
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    finishedRef.current = false;
    const timeout = window.setTimeout(finish, durationMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [src, durationMs]);

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.backdrop} />
      <div className={styles.content}>
        <DotLottieReact
          className={styles.animation}
          src={src}
          loop
          autoplay
        />
        {label ? <span className={styles.label}>{label}</span> : null}
      </div>
    </div>
  );
}
