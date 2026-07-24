'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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
    onClose();
    router.push('/shop');
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
            ATTN: ACADEMY BOOK PREORDER
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
                src="/images/orbits-book-cover.png"
                alt="Orbiters of The Horizon book cover by Jhinn Bay"
                width={150}
                height={200}
                priority
                className={styles.bookImage}
              />
            </div>
          </div>

          {/* Book Metadata details */}
          <div className={styles.details}>
            <p className={styles.bookTitle}>
              ORBITERS OF THE HORIZON
            </p>
            <p className={styles.bookAuthor}>
              BY JHINN BAY
            </p>
            <p className={styles.preorderBannerText}>
              PREORDER NOW AT THE ACADEMY SHOP
            </p>
            <p className={styles.releaseDate}>
              ESTIMATED RELEASE OCTOBER 2026
            </p>
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
