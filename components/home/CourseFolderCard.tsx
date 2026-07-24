'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Sparkle } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './CourseFolderCard.module.css';

const FOLDER_PATH =
  'M0 42 Q0 18 24 18 H224 Q242 18 252 30 L266 48 Q276 60 292 60 H450 Q472 60 472 84 V304 Q472 328 448 328 H24 Q0 328 0 304 Z';

interface CourseFolderCardProps {
  title: string;
  count: number;
  href?: string;
  onOpen?: () => void;
  images: string[];
  avatarSrc?: string;
  centerLabel?: string;
  ctaLabel?: string;
  ctaDark?: boolean;
  dark?: boolean;
}

export default function CourseFolderCard({
  href,
  onOpen,
  images,
  avatarSrc,
  centerLabel,
  ctaLabel = 'Start Course',
  ctaDark = false,
  dark,
}: CourseFolderCardProps) {
  const slots = images.slice(0, 4);
  const { play } = useSound();

  const contents = (
    <>
      <div className={styles.folderSurface}>
        {/* Folder body fill */}
        <svg className={styles.shape} viewBox="0 0 474 330" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} className={styles.shapeFill} />
        </svg>

        {/* Folder background image */}
        {images.length > 0 && (
          <div
            className={styles.folderBgImage}
            style={{ backgroundImage: `url(${JSON.stringify(images[0])})` }}
          />
        )}

        {/* Bottom gradient with progressive blur, under the stroke */}
        <div className={styles.bottomFade} aria-hidden="true" />

        {/* Border stroke on top of gradient */}
        <svg className={styles.shapeStrokeSvg} viewBox="0 0 474 330" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} className={styles.shapeStroke} />
        </svg>
      </div>

      {/* Folder Tab Header Row */}
      <div className={styles.tabHeaderRow}>
        <span className={styles.tabIcons} aria-hidden="true">
          <span
            className={styles.tabIcon}
            style={avatarSrc ? { backgroundImage: `url(${JSON.stringify(avatarSrc)})` } : undefined}
          >
            {!avatarSrc && <Sparkle size={12} weight="fill" />}
          </span>
          <span className={`${styles.tabIcon} ${styles.tabIconGlyph}`}>
            <BookOpen size={12} weight="bold" />
          </span>
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
