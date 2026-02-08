'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './AzuraStoryReveal.module.css';
import { StoryScene } from '@/lib/library-seed-data';

type AzuraEmotion = 'happy' | 'confused' | 'sad' | 'pain';

interface AzuraStoryRevealProps {
  scenes: StoryScene[];
  onComplete: () => void;
}

const TYPING_SPEED = 30;

const emotionImages: Record<AzuraEmotion, string> = {
  happy: '/uploads/HappyEmote.png',
  confused: '/uploads/ConfusedEmote.png',
  sad: '/uploads/SadEmote.png',
  pain: '/uploads/PainEmote.png',
};

const AzuraStoryReveal: React.FC<AzuraStoryRevealProps> = ({
  scenes,
  onComplete,
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'visible'>('in');
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scene = scenes[currentSceneIndex];
  const isLastScene = currentSceneIndex === scenes.length - 1;

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    setFadeState('in');

    const startDelay = setTimeout(() => {
      setFadeState('visible');
      let currentIndex = 0;
      typingIntervalRef.current = setInterval(() => {
        if (currentIndex < scene.text.length) {
          setDisplayedText(scene.text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
          }
          setIsTyping(false);
        }
      }, TYPING_SPEED);
    }, 500);

    return () => {
      clearTimeout(startDelay);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [currentSceneIndex, scene.text]);

  const handleSkipTyping = useCallback(() => {
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      setDisplayedText(scene.text);
      setIsTyping(false);
    }
  }, [isTyping, scene.text]);

  const handleContinue = useCallback(() => {
    if (isTyping) {
      handleSkipTyping();
      return;
    }

    if (isLastScene) {
      setFadeState('out');
      setTimeout(() => {
        onComplete();
      }, 500);
    } else {
      setFadeState('out');
      setTimeout(() => {
        setCurrentSceneIndex(prev => prev + 1);
      }, 400);
    }
  }, [isTyping, isLastScene, handleSkipTyping, onComplete]);

  const fadeClass = fadeState === 'in'
    ? styles.fadeIn
    : fadeState === 'out'
      ? styles.fadeOut
      : styles.fadeVisible;

  return (
    <div
      className={styles.overlay}
      style={{ background: scene.backgroundColor }}
    >
      <div className={`${styles.sceneContainer} ${fadeClass}`}>
        <div className={styles.sceneIndicator}>
          {scenes.map((_, i) => (
            <div
              key={i}
              className={`${styles.sceneDot} ${i === currentSceneIndex ? styles.sceneDotActive : ''} ${i < currentSceneIndex ? styles.sceneDotCompleted : ''}`}
            />
          ))}
        </div>

        <h2 className={styles.sceneTitle}>{scene.title}</h2>

        <div className={styles.avatarWrapper}>
          <Image
            src={emotionImages[scene.azuraEmotion]}
            alt={`Azura - ${scene.azuraEmotion}`}
            width={96}
            height={96}
            className={styles.avatar}
            unoptimized
          />
        </div>

        <div className={styles.narrativeBox}>
          <p className={styles.narrativeText}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>

        <button
          className={styles.continueButton}
          onClick={handleContinue}
          type="button"
        >
          {isTyping
            ? 'Skip'
            : isLastScene
              ? 'Begin Chapter'
              : 'Continue'}
        </button>

        <div className={styles.sceneCounter}>
          {currentSceneIndex + 1} / {scenes.length}
        </div>
      </div>
    </div>
  );
};

export default AzuraStoryReveal;
