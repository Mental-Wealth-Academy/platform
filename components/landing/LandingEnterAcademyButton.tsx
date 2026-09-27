'use client';

import { useRouter } from 'next/navigation';
import { useSound } from '@/hooks/useSound';
import styles from './LandingPage.module.css';

const BrainIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 18V5" />
    <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
    <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
    <path d="M18 18a4 4 0 0 0 2-7.464" />
    <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
    <path d="M6 18a4 4 0 0 1-2-7.464" />
    <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
  </svg>
);

export default function LandingEnterAcademyButton({ showIcon = true, dark = false }: { showIcon?: boolean; dark?: boolean }) {
  const { play } = useSound();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => { play('click'); router.push('/dao'); }}
      onMouseEnter={() => play('hover')}
      className={`${styles.fancyButton} ${styles.fancyButtonHero}`}
    >
      <span className={styles.fancyButtonInner}>
        {showIcon && (
          <span className={styles.fancyButtonIcon} aria-hidden="true">
            <BrainIcon size={18} />
          </span>
        )}
        <span className={styles.heroSlideWrap}>
          <span className={styles.heroSlideText}>Start your Journey</span>
          <span className={`${styles.heroSlideText} ${styles.heroSlideClone}`}>Start your Journey</span>
        </span>
      </span>
    </button>
  );
}
