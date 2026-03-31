'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './AzuraDialogue.module.css';

export type AzuraEmotion = 'happy' | 'confused' | 'sad' | 'pain';

interface AzuraDialogueProps {
  message: string;
  emotion?: AzuraEmotion;
  onComplete?: () => void;
  speed?: number; // Characters per interval (lower = faster)
  autoStart?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

const emotionImages: Record<AzuraEmotion, string> = {
  happy: 'https://i.imgur.com/3Y3KrnJ.png',
  confused: 'https://i.imgur.com/ePrWP7A.png',
  sad: 'https://i.imgur.com/XIe1jZy.png',
  pain: 'https://i.imgur.com/ZYpNkse.png',
};

const AzuraDialogue: React.FC<AzuraDialogueProps> = ({
  message,
  emotion = 'happy',
  onComplete,
  speed = 30, // milliseconds per character
  autoStart = true,
  showSkip = true,
  onSkip,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<AzuraEmotion>(emotion);
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


  return (
    <div className={styles.container}>
      <div className={styles.avatarContainer}>
        <div className={styles.avatarWrapper}>
          <Image
            src={emotionImages[currentEmotion]}
            alt={`Azura ${currentEmotion}`}
            width={80}
            height={80}
            className={styles.avatar}
            unoptimized
          />
        </div>
        <div className={styles.nameTag}>
          <span className={styles.name}>Azura</span>
          <span className={styles.role}>AI Co-pilot</span>
        </div>
      </div>
      <div className={styles.dialogueBox}>
        <div className={styles.dialogueContent}>
          <p className={styles.message}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>
        {showSkip && isTyping && (
          <button className={styles.skipButton} onClick={handleSkip} type="button">
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default AzuraDialogue;
