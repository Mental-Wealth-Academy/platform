'use client';

import { useEffect, useRef, useState } from 'react';
import { DotLottieReact, DotLottie } from '@lottiefiles/dotlottie-react';
import styles from './IntroLoaderOverlay.module.css';

interface IntroLoaderOverlayProps {
  src: string;
  label?: string;
  loops?: number;
  onFinish: () => void;
}

export default function IntroLoaderOverlay({
  src,
  label,
  loops = 2,
  onFinish,
}: IntroLoaderOverlayProps) {
  const loopCountRef = useRef(0);
  const finishedRef = useRef(false);
  const [player, setPlayer] = useState<DotLottie | null>(null);

  useEffect(() => {
    loopCountRef.current = 0;
    finishedRef.current = false;
  }, [src, loops]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    if (!player) return;

    const handleLoop = () => {
      loopCountRef.current += 1;
      if (loopCountRef.current >= loops) {
        finish();
      }
    };

    const handleComplete = () => {
      finish();
    };

    player.addEventListener('loop', handleLoop);
    player.addEventListener('complete', handleComplete);

    return () => {
      player.removeEventListener('loop', handleLoop);
      player.removeEventListener('complete', handleComplete);
    };
  }, [player, loops]);

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.backdrop} />
      <div className={styles.card}>
        <DotLottieReact
        className={styles.animation}
        src={src}
        loop
        autoplay
        dotLottieRefCallback={setPlayer}
      />
        {label ? <span className={styles.label}>{label}</span> : null}
      </div>
    </div>
  );
}
