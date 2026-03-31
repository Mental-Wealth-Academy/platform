'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './AzuraGatekeeper.module.css';

interface AzuraGatekeeperProps {
  message: string;
  status: 'locked' | 'in_progress' | 'unsealed';
  writingsCompleted: number;
}

const TYPING_SPEED = 30; // ms per character

const AzuraGatekeeper: React.FC<AzuraGatekeeperProps> = ({
  message,
  status,
  writingsCompleted,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Determine emotion based on status and progress
  const getEmotion = () => {
    if (status === 'unsealed') return 'happy';
    if (writingsCompleted >= 5) return 'happy';
    if (writingsCompleted >= 3) return 'happy';
    if (writingsCompleted > 0) return 'happy';
    return 'confused';
  };

  const emotion = getEmotion();

  const emotionImages: Record<string, string> = {
    happy: 'https://i.imgur.com/3Y3KrnJ.png',
    confused: 'https://i.imgur.com/ePrWP7A.png',
    sad: 'https://i.imgur.com/XIe1jZy.png',
    pain: 'https://i.imgur.com/ZYpNkse.png',
  };

  // Typing effect
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, TYPING_SPEED);

    return () => clearInterval(typingInterval);
  }, [message]);

  return (
    <div className={styles.container}>
      <div className={styles.avatarSection}>
        <div className={`${styles.avatarWrapper} ${status === 'unsealed' ? styles.avatarUnsealed : ''}`}>
          <Image
            src={emotionImages[emotion]}
            alt="Azura"
            width={64}
            height={64}
            className={styles.avatar}
            unoptimized
          />
        </div>
        <div className={styles.nameTag}>
          <span className={styles.name}>Azura</span>
          <span className={styles.role}>Gatekeeper</span>
        </div>
      </div>

      <div className={styles.dialogueSection}>
        <div className={styles.dialogueBubble}>
          <p className={styles.dialogueText}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AzuraGatekeeper;
