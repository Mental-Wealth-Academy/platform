'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import styles from './ShardAnimation.module.css';

interface ShardAnimationProps {
  shards: number;
  startingShards?: number;
  onComplete?: () => void;
}

export const ShardAnimation: React.FC<ShardAnimationProps> = ({ 
  shards, 
  startingShards = 0,
  onComplete 
}) => {
  const { play } = useSound();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayShards, setDisplayShards] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(startingShards);
  const [showMeter, setShowMeter] = useState(false);
  const frameRef = useRef<number | null>(null);
  const meterSoundPlayedRef = useRef(false);

  useEffect(() => {
    setIsAnimating(true);
    play('celebration');
    setDisplayShards(0);
    setDisplayTotal(startingShards);
    setShowMeter(false);
    meterSoundPlayedRef.current = false;

    const finalTotal = startingShards + shards;
    const earnedDuration = 900;
    const meterDelay = 240;
    const meterDuration = 920;
    const outroDelay = 620;
    const start = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - start;
      const earnedProgress = Math.min(elapsed / earnedDuration, 1);
      const easedEarned = easeOutCubic(earnedProgress);
      setDisplayShards(Math.round(shards * easedEarned));

      if (elapsed >= meterDelay) {
        if (!meterSoundPlayedRef.current) {
          setShowMeter(true);
          play('success');
          meterSoundPlayedRef.current = true;
        }

        const meterProgress = Math.min((elapsed - meterDelay) / meterDuration, 1);
        const easedMeter = easeOutCubic(meterProgress);
        setDisplayTotal(Math.round(startingShards + shards * easedMeter));

        if (earnedProgress === 1 && meterProgress === 1) {
          window.setTimeout(() => {
            setIsAnimating(false);
            onComplete?.();
          }, outroDelay);
          return;
        }
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [shards, startingShards, onComplete, play]);

  if (!isAnimating) return null;

  const finalTotal = startingShards + shards;
  const meterProgress = showMeter ? (displayTotal - startingShards) / shards : 0;

  return (
    <div className={styles.shardAnimation}>
      <div className={styles.shardBubble}>
        <div className={styles.shardIconContainer}>
          <Image
            src="/icons/ui-shard.svg"
            alt="Shard"
            width={48}
            height={48}
            className={styles.shardIcon}
          />
        </div>
        <div className={styles.shardText}>
          <div className={styles.shardLabel}>+{displayShards}</div>
          <div className={styles.shardSubtext}>Shards Earned!</div>
        </div>
      </div>
      
      {showMeter && (
        <div className={styles.meterContainer}>
          <div className={styles.meterHeader}>
            <span className={styles.meterLabel}>Total Shards</span>
            <span className={styles.meterIconWrap}>
              <Image
                src="/icons/ui-shard.svg"
                alt=""
                width={18}
                height={18}
                className={styles.meterIcon}
              />
            </span>
          </div>
          <div className={styles.meterBar}>
            <div 
              className={styles.meterFill}
              style={{ width: `${meterProgress * 100}%` }}
            />
            <div className={styles.meterValue}>
              {String(displayTotal).padStart(3, '0')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
