'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkle } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './CourseFolderCard.module.css';

const FOLDER_PATH =
  'M0 42 Q0 18 24 18 H224 Q242 18 252 30 L266 48 Q276 60 292 60 H450 Q472 60 472 84 V304 Q472 328 448 328 H24 Q0 328 0 304 Z';

/* Decorative motif: a dotted orbit that replaces the old photo backdrops. */
const polar = (angle: number, radius: number) => ({
  x: 100 + Math.cos(angle) * radius,
  y: 100 + Math.sin(angle) * radius,
});

const ORBIT_DOTS = Array.from({ length: 12 }, (_, i) => polar((i / 12) * Math.PI * 2 - Math.PI / 2, 82));

const SPOKES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
  const inner = polar(angle, 30);
  const outer = polar(angle, 72);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
});

interface CourseFolderCardProps {
  title: string;
  count: number;
  href?: string;
  onOpen?: () => void;
  avatarSrc?: string;
  centerLabel?: string;
  ctaLabel?: string;
  ctaDark?: boolean;
  dark?: boolean;
}

export default function CourseFolderCard({
  href,
  onOpen,
  avatarSrc,
  centerLabel,
  ctaLabel = 'Start Course',
  ctaDark = false,
  dark,
}: CourseFolderCardProps) {
  const { play } = useSound();

  const contents = (
    <>
      <div className={styles.folderSurface}>
        {/* Folder body fill */}
        <svg className={styles.shape} viewBox="0 0 474 330" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} className={styles.shapeFill} />
        </svg>

        {/* Dotted-orbit motif in the folder body */}
        <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="82" className={styles.motifOrbit} />
          <circle cx="100" cy="100" r="62" className={styles.motifDashed} />
          <circle cx="100" cy="100" r="30" className={styles.motifInner} />
          {SPOKES.map((spoke, i) => (
            <line key={`spoke-${i}`} {...spoke} className={styles.motifSpoke} />
          ))}
          {ORBIT_DOTS.map((dot, i) => (
            <circle key={`dot-${i}`} cx={dot.x} cy={dot.y} r={3.5} className={styles.motifDot} />
          ))}
          <circle cx="100" cy="100" r="5.5" className={styles.motifCore} />
        </svg>

        {/* Bottom gradient with progressive blur, under the stroke */}
        <div className={styles.bottomFade} aria-hidden="true" />

        {/* Border stroke on top of gradient */}
        <svg className={styles.shapeStrokeSvg} viewBox="0 0 474 330" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} className={styles.shapeStroke} />
        </svg>
      </div>

      {/* Folder Tab Header Row */}
      <div className={styles.tabHeaderRow}>
        <span
          className={styles.tabIcon}
          aria-hidden="true"
          style={avatarSrc ? { backgroundImage: `url(${JSON.stringify(avatarSrc)})` } : undefined}
        >
          {!avatarSrc && <Sparkle size={12} weight="fill" />}
        </span>
        {centerLabel && <span className={styles.tabTitle}>{centerLabel}</span>}
      </div>

      {/* CTA */}
      <span
        className={`${styles.ctaOuter} ${ctaDark ? styles.ctaOuterDark : ''}`}
        onMouseEnter={(e) => {
          e.stopPropagation();
          play('hover');
        }}
      >
        <span className={`${styles.ctaInner} ${ctaDark ? styles.ctaInnerDark : ''}`}>{ctaLabel}</span>
      </span>
    </>
  );

  const cls = `${styles.folder} ${dark ? styles.folderDark : ''}`;

  if (href) {
    return (
      <Link
        href={href}
        className={cls}
        onMouseEnter={() => play('soft-hover')}
        onClick={() => play('click')}
      >
        {contents}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${cls} ${styles.folderButton}`}
      onMouseEnter={() => play('soft-hover')}
      onClick={() => {
        play('click');
        onOpen?.();
      }}
    >
      {contents}
    </button>
  );
}
