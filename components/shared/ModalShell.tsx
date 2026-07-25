'use client';

import React, { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks/useScrollLock';
import styles from './ModalShell.module.css';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  hideHeader?: boolean;
}

export default function ModalShell({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  className = '',
  hideHeader = false,
}: ModalShellProps) {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${styles.dialog} ${styles[maxWidth]} ${className}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {!hideHeader && (
          <header className={styles.header}>
            {typeof title === 'string' ? <h2 className={styles.title}>{title}</h2> : title || <div />}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </header>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
