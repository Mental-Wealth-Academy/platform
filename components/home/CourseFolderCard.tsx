'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkle } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import FolderMotifArt, { type FolderMotif } from './folderMotifs';
import styles from './CourseFolderCard.module.css';

const FOLDER_PATH =
  'M0 42 Q0 18 24 18 H224 Q242 18 252 30 L266 48 Q276 60 292 60 H450 Q472 60 472 84 V304 Q472 328 448 328 H24 Q0 328 0 304 Z';

interface CourseFolderCardProps {
  /** Accessible name for the folder; the visible label is centerLabel. */
  title: string;
  href?: string;
  onOpen?: () => void;
  avatarSrc?: string;
  centerLabel?: string;
  ctaLabel?: string;
  ctaDark?: boolean;
  dark?: boolean;
  /** Dotted line-art filling the folder body. */
  motif?: FolderMotif;
}

export default function CourseFolderCard({
  title,
  href,
  onOpen,
  avatarSrc,
  centerLabel,
  ctaLabel = 'Start Course',
  ctaDark = false,
  dark,
  motif = 'orbit',
}: CourseFolderCardProps) {
  const { play } = useSound();

  const contents = (
    <>
      <div className={styles.folderSurface}>
        {/* Folder body fill */}
        <svg className={styles.shape} viewBox="0 0 474 330" preserveAspectRatio="none" aria-hidden="true">
          <path d={FOLDER_PATH} className={styles.shapeFill} />
        </svg>

        {/* Dotted line-art in the folder body */}
        <FolderMotifArt motif={motif} />

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

  // Nothing to open: a placeholder folder, so it stays out of the tab order
  // rather than shipping a button that does nothing.
  if (!onOpen) {
    return (
      <div className={cls} role="group" aria-label={title}>
        {contents}
      </div>
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
