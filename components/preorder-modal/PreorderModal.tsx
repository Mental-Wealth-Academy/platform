'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
      <div 
        className={styles.modalContainer} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="preorder-title"
      >
        {/* Title bar - matching Support Portal style */}
        <div className={styles.titleBar}>
          <h2 className={styles.title} id="preorder-title">
            预订 Book Preorder
          </h2>
          <button 
            type="button" 
            className={styles.closeButton} 
            onClick={handleDismiss}
            aria-label="Close preorder window"
          >
            Close
          </button>
        </div>

        {/* Modal body content */}
        <div className={styles.content}>
          <div className={styles.headerGroup}>
            <span className={styles.badge}>Official Release</span>
            <h2 className={styles.heading}>Orbiters of The Horizon</h2>
            <p className={styles.subheading}>By Jhinn Bay</p>
          </div>

          {/* Book Display Container */}
          <div className={styles.bookDisplayContainer}>
            <div className={styles.bookDisplayBg} />
            <div className={styles.bookImageWrapper}>
              <Image
                src="/images/orbits-book-cover.png"
                alt="Orbiters of The Horizon book cover by Jhinn Bay"
                width={140}
                height={190}
                priority
                className={styles.bookImage}
              />
            </div>
          </div>

          {/* Book Metadata details */}
          <div className={styles.details}>
            <p className={styles.preorderBannerText}>
              Preorder now at the Academy Shop
            </p>
            <p className={styles.releaseDate}>
              Estimated release: October 2026
            </p>
          </div>
        </div>

        {/* Footer actions matching Support Portal */}
        <div className={styles.footer}>
          <button 
            type="button"
            className={styles.submitButton}
            onClick={handleBuyNow}
          >
            Buy Now
          </button>
          <button 
            type="button"
            className={styles.dismissButton}
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
