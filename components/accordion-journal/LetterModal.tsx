'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './LetterModal.module.css';
import { useSound } from '@/hooks/useSound';

interface LetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function LetterModal({ isOpen, onClose, title, content }: LetterModalProps) {
  const { play } = useSound();

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('click');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, play]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={() => { play('click'); onClose(); }} />
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Image
              src="https://i.imgur.com/3Y3KrnJ.png"
              alt="Blue"
              width={28}
              height={28}
              className={styles.blueIcon}
              unoptimized
            />
            <h2 className={styles.title}>{title}</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => { play('click'); onClose(); }}
            type="button"
            aria-label="Close"
            onMouseEnter={() => play('hover')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.content}>{content}</div>
      </div>
    </>,
    document.body
  );
}
