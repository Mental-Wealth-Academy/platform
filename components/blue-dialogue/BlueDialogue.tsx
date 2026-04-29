'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BlueDialogue.module.css';

export type BlueEmotion = 'happy' | 'confused' | 'sad' | 'pain';

interface BlueDialogueProps {
  message: string;
  emotion?: BlueEmotion;
  onComplete?: () => void;
  speed?: number; // Characters per interval (lower = faster)
  autoStart?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  avatarSrc?: string;
  fixedHeight?: boolean;
  variant?: 'default' | 'overlay';
}

function getPageCharacterLimit(variant: 'default' | 'overlay', isCompactViewport: boolean): number {
  if (isCompactViewport) {
    return variant === 'overlay' ? 135 : 150;
  }

  return variant === 'overlay' ? 220 : 260;
}

function paginateMessage(message: string, pageCharacterLimit: number): string[] {
  const trimmedMessage = message.replace(/\r\n/g, '\n').trim();

  if (!trimmedMessage) {
    return [''];
  }

  const paragraphs = trimmedMessage
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const pages: string[] = [];
  let currentPage = '';

  const pushCurrentPage = () => {
    if (currentPage.trim()) {
      pages.push(currentPage.trim());
      currentPage = '';
    }
  };

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    for (const word of words) {
      const candidate = currentPage ? `${currentPage} ${word}` : word;

      if (candidate.length > pageCharacterLimit && currentPage) {
        pushCurrentPage();
        currentPage = word;
      } else {
        currentPage = candidate;
      }
    }

    if (!currentPage) continue;

    if (currentPage.length + 2 <= pageCharacterLimit) {
      currentPage = `${currentPage}\n\n`;
    } else {
      pushCurrentPage();
    }
  }

  pushCurrentPage();

  return pages.length > 0 ? pages : [''];
}

const BlueDialogue: React.FC<BlueDialogueProps> = ({
  message,
  onComplete,
  speed = 20, // milliseconds per character
  autoStart = true,
  showSkip = true,
  onSkip,
  fixedHeight = false,
  variant = 'default',
}) => {
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);
  const lastPageKeyRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      setIsCompactViewport(window.innerWidth <= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  const pageCharacterLimit = getPageCharacterLimit(variant, isCompactViewport);
  const pages = paginateMessage(message, pageCharacterLimit);
  const safeCurrentPage = currentPage >= pages.length ? 0 : currentPage;
  const activePage = pages[safeCurrentPage] ?? '';
  const pageKey = `${message}::${pageCharacterLimit}::${safeCurrentPage}`;
  const isOverlayVariant = variant === 'overlay';

  useEffect(() => {
    setCurrentPage(0);
  }, [message, pageCharacterLimit]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const pageChanged = lastPageKeyRef.current !== pageKey;

    if (pageChanged) {
      lastPageKeyRef.current = pageKey;
      isCompleteRef.current = false;
    }

    if (!autoStart) {
      if (pageChanged || !isCompleteRef.current) {
        setDisplayedText('');
        setIsTyping(false);
      }
      return;
    }

    if (pageChanged || !isCompleteRef.current) {
      setDisplayedText('');
      setIsTyping(true);
      isCompleteRef.current = false;

      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex < activePage.length) {
          setDisplayedText(activePage.slice(0, currentIndex + 1));
          currentIndex++;
          timeoutRef.current = setTimeout(typeNextChar, speed);
        } else {
          setIsTyping(false);
          isCompleteRef.current = true;
          if (safeCurrentPage === pages.length - 1 && onComplete) {
            onComplete();
          }
        }
      };

      timeoutRef.current = setTimeout(typeNextChar, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activePage, autoStart, onComplete, pageKey, pages.length, safeCurrentPage, speed]);

  const completeCurrentPage = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setDisplayedText(activePage);
    setIsTyping(false);
    isCompleteRef.current = true;

    if (safeCurrentPage === pages.length - 1 && onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    completeCurrentPage();

    if (onSkip) {
      onSkip();
    }
  };

  const handleNextPage = () => {
    if (isTyping) {
      completeCurrentPage();
      return;
    }

    if (safeCurrentPage < pages.length - 1) {
      setCurrentPage((page) => page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (isTyping || safeCurrentPage === 0) {
      return;
    }

    setCurrentPage((page) => page - 1);
  };

  return (
    <div className={`${styles.container} ${isOverlayVariant ? styles.containerOverlay : ''}`}>
      <div
        className={`${styles.dialogueContent} ${fixedHeight ? styles.dialogueContentFixed : ''} ${isOverlayVariant ? styles.dialogueContentOverlay : ''}`}
      >
        <div className={styles.screenHeader}>
          <div className={styles.screenBadge}>Blue Terminal</div>
          <div className={styles.pageStatus}>
            {safeCurrentPage + 1}/{pages.length}
          </div>
        </div>

        <div
          className={`${styles.viewport} ${isOverlayVariant ? styles.viewportOverlay : ''}`}
        >
          <div
            className={`${styles.message} ${fixedHeight ? styles.messageFixed : ''} ${isOverlayVariant ? styles.messageOverlay : ''}`}
          >
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsLeft}>
            {showSkip && isTyping && (
              <button className={styles.skipButton} onClick={handleSkip} type="button">
                Skip
              </button>
            )}
          </div>

          {pages.length > 1 && (
            <div className={styles.pager}>
              <button
                className={styles.pageButton}
                onClick={handlePreviousPage}
                type="button"
                disabled={isTyping || safeCurrentPage === 0}
              >
                &lt;
              </button>
              <button
                className={styles.pageButton}
                onClick={handleNextPage}
                type="button"
                disabled={!isTyping && safeCurrentPage === pages.length - 1}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlueDialogue;
