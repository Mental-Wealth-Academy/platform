'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import SealedLibrary from '@/components/sealed-library/SealedLibrary';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import { LibraryPageSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

// Library Info Modal Component
const LibraryInfoModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
}> = ({ isVisible, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          Close
        </button>

        <div className={styles.modalContent}>
          <div className={styles.modalEmoji}>🍎</div>

          <h2 className={styles.modalTitle}>Your 12-Week Library</h2>
          <p className={styles.modalDescription}>
            This is your database for all pages in the 12-week journey, everything organized and ready for you here.
          </p>

          <button className={styles.modalCta} onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Chapters() {
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [showAzuraModal, setShowAzuraModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const closeAzuraModal = useCallback(() => {
    setShowAzuraModal(false);
  }, []);

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          <section className={styles.papersSection}>
            {isContentLoading ? (
              <LibraryPageSkeleton />
            ) : (
              <SealedLibrary />
            )}
          </section>
        </main>
      </div>
      <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />

      {/* Feed Azura Modal */}
      <LibraryInfoModal isVisible={showAzuraModal} onClose={closeAzuraModal} />
    </>
  );
}
