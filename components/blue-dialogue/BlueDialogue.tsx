'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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

const emotionImages: Record<BlueEmotion, string> = {
  happy: 'https://i.imgur.com/3Y3KrnJ.png',
  confused: 'https://i.imgur.com/ePrWP7A.png',
  sad: 'https://i.imgur.com/XIe1jZy.png',
  pain: 'https://i.imgur.com/ZYpNkse.png',
};

const DEFAULT_BLUE_AVATAR = '/uploads/blueagent.png';

const BlueDialogue: React.FC<BlueDialogueProps> = ({
  message,
  emotion = 'happy',
  onComplete,
  speed = 30, // milliseconds per character
  autoStart = true,
  showSkip = true,
  onSkip,
  avatarSrc,
  fixedHeight = false,
  variant = 'default',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<BlueEmotion>(emotion);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);
  const lastMessageRef = useRef<string>('');

  useEffect(() => {
    // Update emotion when prop changes
    setCurrentEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if message changed - if so, we need to restart
    const messageChanged = lastMessageRef.current !== message;
    
    if (messageChanged) {
      // Message changed, update ref
      lastMessageRef.current = message;
      // Reset completion state for new message
      isCompleteRef.current = false;
    }

    // If message changed, we should restart typing (if autoStart is true)
    // If message didn't change but autoStart became false after completion, keep the text
    if (!autoStart) {
      // Only clear if message changed or we haven't completed yet
      if (messageChanged || !isCompleteRef.current) {
        setDisplayedText('');
        setIsTyping(false);
      }
      // Otherwise, keep the displayed text (don't clear it after completion)
      return;
    }

    // Only start typing if autoStart is true AND (message changed OR we haven't completed)
    if (messageChanged || !isCompleteRef.current) {
      // Reset state for new message
      setDisplayedText('');
      setIsTyping(true);
      isCompleteRef.current = false;

      let currentIndex = 0;
      let isCancelled = false;

      const typeNextChar = () => {
        if (isCancelled) return;
        
        if (currentIndex < message.length) {
          setDisplayedText(message.slice(0, currentIndex + 1));
          currentIndex++;
          timeoutRef.current = setTimeout(typeNextChar, speed);
        } else {
          setIsTyping(false);
          isCompleteRef.current = true;
          if (onComplete) {
            onComplete();
          }
        }
      };

      // Start typing after a brief delay
      timeoutRef.current = setTimeout(typeNextChar, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [message, autoStart, speed, onComplete]);

  const handleSkip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(message);
    setIsTyping(false);
    isCompleteRef.current = true;
    if (onComplete) {
      onComplete();
    }
    if (onSkip) {
      onSkip();
    }
  };


  const isOverlayVariant = variant === 'overlay';

  return (
    <div className={`${styles.container} ${isOverlayVariant ? styles.containerOverlay : ''}`}>
      <div className={`${styles.avatarWrapper} ${isOverlayVariant ? styles.avatarWrapperOverlay : ''}`}>
        <Image
          src={avatarSrc ?? DEFAULT_BLUE_AVATAR}
          alt={`Blue ${currentEmotion}`}
          width={80}
          height={80}
          className={styles.avatar}
          unoptimized
        />
      </div>
      <div
        className={`${styles.dialogueContent} ${fixedHeight ? styles.dialogueContentFixed : ''} ${isOverlayVariant ? styles.dialogueContentOverlay : ''}`}
      >
        <p
          className={`${styles.message} ${fixedHeight ? styles.messageScrollable : ''} ${isOverlayVariant ? styles.messageOverlay : ''}`}
        >
          {displayedText}
          {isTyping && <span className={styles.cursor}>|</span>}
        </p>
        {showSkip && isTyping && (
          <button className={styles.skipButton} onClick={handleSkip} type="button">
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default BlueDialogue;
