'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;
}

// Arrow Icon Component
const ArrowIcon = () => (
  <Image
    src="/icons/ui-arrow.svg"
    alt="Arrow"
    width={24}
    height={24}
    className={styles.arrowIconImage}
  />
);

interface SearchResultProps {
  title: string;
  description: string;
  imageUrl?: string;
  buttonVariant?: 'light' | 'dark';
}

const SearchResult: React.FC<SearchResultProps> = ({ 
  title, 
  description, 
  imageUrl = '/icons/favicon.png',
  buttonVariant = 'light' 
}) => {
  return (
    <div className={styles.resultItem}>
      <div className={styles.logomark}>
        <Image
          src={imageUrl}
          alt={title}
          width={80}
          height={80}
          className={styles.logomarkImage}
          unoptimized
        />
      </div>
      <div className={styles.resultContent}>
        <h3 className={styles.resultTitle}>{title}</h3>
        <p className={styles.resultDescription}>{description}</p>
      </div>
      <div className={styles.buttonWrapper}>
        <button className={`${styles.resultButton} ${styles[`button${buttonVariant.charAt(0).toUpperCase() + buttonVariant.slice(1)}`]}`}>
          <span className={styles.buttonLabel}>View</span>
          <div className={`${styles.arrowIcon} ${buttonVariant === 'light' ? styles.arrowIconBlack : ''}`}>
            <ArrowIcon />
          </div>
        </button>
      </div>
    </div>
  );
};

export function SearchModal({ isOpen, onClose, searchContainerRef }: SearchModalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (searchContainerRef.current) {
        const rect = searchContainerRef.current.getBoundingClientRect();
        const MODAL_WIDTH = 720; // fixed dropdown width (prevents "squish" when search bar resizes)
        const VIEWPORT_PADDING = 16;

        const maxWidth = window.innerWidth - VIEWPORT_PADDING * 2;
        const width = Math.min(MODAL_WIDTH, Math.max(320, maxWidth));

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Align to search bar left edge, but clamp into viewport
        const desiredLeft = rect.left + scrollX;
        const minLeft = scrollX + VIEWPORT_PADDING;
        const maxLeft = scrollX + window.innerWidth - width - VIEWPORT_PADDING;
        const left = Math.max(minLeft, Math.min(desiredLeft, maxLeft));

        setPosition({
          top: rect.bottom + scrollY + 8,
          left,
          width,
        });
      }
    };

    const handleScroll = () => {
      onClose();
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose, searchContainerRef]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest(`.${styles.modal}`)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, searchContainerRef]);

  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.modal} ${isOpen ? styles.modalOpen : ''}`} 
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.modalContent}>
        <SearchResult
          title="Company Data: Policy"
          description="Analysis of educational bridge data. Daemon-mirror S1, portable node."
          imageUrl="/icons/logo-company-1.png"
          buttonVariant="light"
        />
        <SearchResult
          title="Foundational Blockchain"
          description="Enables stablecoins, agentkit data. CCTP-based, cross-chain swap auction protocol."
          imageUrl="/icons/logo-company-2.png"
          buttonVariant="dark"
        />
      </div>
    </div>
  );
}

