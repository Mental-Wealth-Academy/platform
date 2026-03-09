'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setIsAnimating(true);
    play('celebration');
    setDisplayShards(0);
    setDisplayTotal(startingShards);
    
    // First phase: show the earned shards animation
    const duration = 1500;
    const steps = 30;
    const increment = shards / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(shards, current + increment);
      setDisplayShards(Math.floor(current));

      if (step >= steps) {
        setDisplayShards(shards);
        clearInterval(interval);
        
        // Second phase: show the meter filling animation
        setTimeout(() => {
          setShowMeter(true);
          play('success');
          
          // Animate total from starting to final
          const finalTotal = startingShards + shards;
          const meterDuration = 1200;
          const meterSteps = 40;
          const meterIncrement = shards / meterSteps;
          let meterCurrent = startingShards;
          let meterStep = 0;

          const meterInterval = setInterval(() => {
            meterStep++;
            meterCurrent = Math.min(finalTotal, meterCurrent + meterIncrement);
            setDisplayTotal(Math.floor(meterCurrent));

            if (meterStep >= meterSteps) {
              setDisplayTotal(finalTotal);
              clearInterval(meterInterval);
              setTimeout(() => {
                setIsAnimating(false);
                onComplete?.();
              }, 800);
            }
          }, meterDuration / meterSteps);
        }, 300);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [shards, startingShards, onComplete, play]);

  if (!isAnimating) return null;

  const finalTotal = startingShards + shards;
  const meterProgress = showMeter ? (displayTotal - startingShards) / shards : 0;

  return (
    <div className={styles.shardAnimation}>
      <div className={styles.shardBubble}>
        <div className={styles.shardIconContainer}>
          <Image
            src="/icons/Coin Poly.svg"
            alt="Daemon"
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
          <div className={styles.meterLabel}>Total Shards</div>
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

