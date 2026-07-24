'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import CtaButton from '@/components/shared/CtaButton';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useSound } from '@/hooks/useSound';
import styles from './PreorderModal.module.css';

interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreorderModal({ isOpen, onClose }: PreorderModalProps) {
  const [mounted, setMounted] = useState(false);
  const { play } = useSound();

  useScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleDismiss = () => {
    play('click');
    onClose();
  };

  const handleBuyNow = () => {
    play('click');
    window.open('https://passage.press', '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div 
      className={styles.overlay} 
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section 
        className={styles.modal} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="preorder-title"
      >
        {/* Title bar - Brutalist design system style */}
        <header className={styles.titleBar}>
          <span className={styles.title} id="preorder-title">
            公告 ATTN: ACADEMY BOOK PREORDER
          </span>
          <button 
            type="button" 
            className={styles.titleBarClose} 
            onClick={handleDismiss}
            aria-label="Close preorder window"
          >
            CLOSE
          </button>
        </header>

        {/* Modal body content */}
        <div className={styles.content}>
          <h2 className={styles.heading}>ACADEMY BOOK PREORDER</h2>
          
          {/* Custom background container behind the book cover */}
          <div className={styles.bookDisplayContainer}>
            <div className={styles.bookDisplayBg} />
            <div className={styles.bookImageWrapper}>
              <Image
                src="/images/preorder-book.png"
                alt="The Exegesis of Miya Black Hearted Cyber Angel Baby book cover"
                width={160}
                height={190}
                priority
                className={styles.bookImage}
              />
            </div>
          </div>

          {/* Book Metadata details */}
          <div className={styles.details}>
            <p className={styles.bookTitle}>
              THE EXEGESIS OF MIYA BLACK HEARTED CYBER ANGEL BABY (2016-2020)
            </p>
            <p className={styles.preorderBannerText}>
              PREORDER NOW AT PASSAGE.PRESS
            </p>
            <p className={styles.releaseDate}>
              FULL RELEASE OCTOBER 2026
            </p>
            
            <div className={styles.editions}>
              <span className={styles.editionTag}>STANDARD EDITION</span>
              <span className={styles.editionTag}>LEGACY EDITION</span>
            </div>
          </div>

          {/* Footer action buttons */}
          <div className={styles.actions}>
            <CtaButton variant="primary" onClick={handleBuyNow} className={styles.buyBtn}>
              BUY NOW
            </CtaButton>
            <CtaButton variant="secondary" onClick={handleDismiss} className={styles.dismissBtn}>
              DISMISS
            </CtaButton>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
