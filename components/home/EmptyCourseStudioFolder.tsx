'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSound } from '@/hooks/useSound';
import dynamic from 'next/dynamic';
import styles from './EmptyCourseStudioFolder.module.css';

const AngelUpsellModal = dynamic(() => import('@/components/angel-upsell-modal/AngelUpsellModal'), { ssr: false });

interface EmptyCourseStudioFolderProps {
  /** Holding an Academic Angel unlocks the course builder; without one the
      upsell gate opens instead of navigating. */
  hasAngel?: boolean;
}

export default function EmptyCourseStudioFolder({ hasAngel = false }: EmptyCourseStudioFolderProps) {
  const router = useRouter();
  const { play } = useSound();
  const [angelGateOpen, setAngelGateOpen] = useState(false);

  const handleAction = () => {
    play('click');
    if (!hasAngel) {
      setAngelGateOpen(true);
      return;
    }
    router.push('/course-builder');
  };

  return (
    <section
      className={styles.container}
      aria-labelledby="course-studio-empty-title"
      onMouseEnter={() => play('soft-hover')}
    >
      <div className={styles.card}>
        {/* Modules stacking onto a dotted plot: the sibling folders' dotted
            language, animated so the empty state reads as "under construction". */}
        <div className={styles.illustration} aria-hidden="true">
          <svg className={styles.buildSvg} viewBox="0 0 120 90">
            <rect className={styles.plot} x="9" y="7" width="102" height="76" rx="12" />
            <line className={styles.baseline} x1="22" y1="73" x2="98" y2="73" />
            <rect className={`${styles.block} ${styles.blockOne}`} x="28" y="58" width="64" height="12" rx="4" />
            <rect className={`${styles.block} ${styles.blockTwo}`} x="34" y="43" width="52" height="12" rx="4" />
            <rect className={`${styles.block} ${styles.blockThree}`} x="40" y="28" width="40" height="12" rx="4" />
            <g className={styles.spark}>
              <line x1="60" y1="14" x2="60" y2="22" />
              <line x1="56" y1="18" x2="64" y2="18" />
            </g>
          </svg>
        </div>

        <h3 id="course-studio-empty-title" className={styles.title}>
          Course Studio
        </h3>

        <p className={styles.description}>
          Your custom syllabus workspace is currently empty.
        </p>

        <button
          type="button"
          className={styles.actionButton}
          onClick={handleAction}
        >
          Build a Course
        </button>
      </div>

      <AngelUpsellModal isOpen={angelGateOpen} onClose={() => setAngelGateOpen(false)} />
    </section>
  );
}
