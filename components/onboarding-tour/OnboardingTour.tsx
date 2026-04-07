'use client';

import { useEffect, useState } from 'react';
import BlueDialogue, { BlueEmotion } from '../blue-dialogue/BlueDialogue';
import styles from './OnboardingTour.module.css';

interface OnboardingTourProps {
  isBlocked?: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isBlocked = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const messages: Array<{ message: string; emotion: BlueEmotion }> = [
    {
      message: "Hey there! I'm Blue, and I'll be here whenever you need me. Welcome to Mental Wealth Academy — a place to learn, reflect, and grow together.",
      emotion: 'happy',
    },
    {
      message: "This is your home base. You can check in daily, join events, take surveys, and explore what the community is building. Take your time and look around!",
      emotion: 'happy',
    },
    {
      message: "Ready when you are. If you ever need help or just want to chat, I'm always here. Let's get started!",
      emotion: 'happy',
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't show if blocked (profile incomplete, other modals open, etc.)
    if (isBlocked) {
      setIsOpen(false);
      return;
    }
    
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    
    if (!hasSeenTour) {
      // Show after a brief delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isBlocked]);

  // Close tour if it becomes blocked while showing
  useEffect(() => {
    if (isBlocked && isOpen) {
      setIsOpen(false);
    }
  }, [isBlocked, isOpen]);

  const handleMessageComplete = () => {
    setIsTyping(false);
    
    // Move to next message after a short delay
    if (currentMessageIndex < messages.length - 1) {
      setTimeout(() => {
        setCurrentMessageIndex(currentMessageIndex + 1);
        setIsTyping(true);
      }, 1500);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboardingTour', 'true');
  };

  if (!isOpen) return null;

  const currentMessage = messages[currentMessageIndex];

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} type="button" aria-label="Close">
          ×
        </button>
        <div className={styles.content}>
          <BlueDialogue
            key={currentMessageIndex}
            message={currentMessage.message}
            emotion={currentMessage.emotion}
            onComplete={handleMessageComplete}
            autoStart={isTyping}
            showSkip={true}
            onSkip={() => {
              if (currentMessageIndex < messages.length - 1) {
                setCurrentMessageIndex(currentMessageIndex + 1);
                setIsTyping(true);
              } else {
                handleClose();
              }
            }}
          />
          {!isTyping && currentMessageIndex === messages.length - 1 && (
            <button className={styles.doneButton} onClick={handleClose} type="button">
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
