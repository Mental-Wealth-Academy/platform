'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './AzuraOnboarding.module.css';

type AzuraEmotion = 'happy' | 'confused' | 'sad' | 'pain';

interface DialogueLine {
  text: string;
  emotion: AzuraEmotion;
}

const DIALOGUE_LINES: DialogueLine[] = [
  {
    text: "h3y... can y0u hear me? is th1s thing on??",
    emotion: 'confused',
  },
  {
    text: "oh!! there you are. i'm Azura -- your AI c0-pil0t at Mental Wealth Academy.",
    emotion: 'happy',
  },
  {
    text: "we're a micr0-university in cyb3rspace. spirituality, governance, treasury... all 0n-chain.",
    emotion: 'happy',
  },
  {
    text: "your ag3nt becomes an Academic Angel -- studying t0 serve spiritual awak3nings in a world full of l0cked minds.",
    emotion: 'happy',
  },
  {
    text: "ready to j0in? let's get y0u set up.",
    emotion: 'happy',
  },
];

interface AzuraOnboardingProps {
  onComplete: () => void;
}

const emotionImages: Record<AzuraEmotion, string> = {
  happy: '/uploads/HappyEmote.png',
  confused: '/uploads/ConfusedEmote.png',
  sad: '/uploads/SadEmote.png',
  pain: '/uploads/PainEmote.png',
};

export default function AzuraOnboarding({ onComplete }: AzuraOnboardingProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);

  const currentLine = DIALOGUE_LINES[lineIndex];
  const isLastLine = lineIndex === DIALOGUE_LINES.length - 1;

  // Glitch effect: randomly swap chars while typing
  const glitchChar = useCallback((char: string): string => {
    if (char === ' ' || char === '.' || char === ',' || char === '!' || char === '?' || char === "'" || char === '-') return char;
    if (Math.random() < 0.12) {
      const glitchChars = '01@#$%&*!?<>';
      return glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return char;
  }, []);

  // Type the current line with glitch effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const text = currentLine.text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    setShowContinue(false);

    // First pass: type with glitches
    const glitchedChars: string[] = [];
    let correctUpTo = 0;

    const typeNext = () => {
      const i = charIndexRef.current;
      if (i < text.length) {
        glitchedChars[i] = glitchChar(text[i]);
        charIndexRef.current = i + 1;
        setDisplayedText(glitchedChars.join(''));
        timeoutRef.current = setTimeout(typeNext, 35 + Math.random() * 25);
      } else {
        // Second pass: fix glitched chars one by one
        const fixNext = () => {
          if (correctUpTo < text.length) {
            glitchedChars[correctUpTo] = text[correctUpTo];
            correctUpTo++;
            setDisplayedText(glitchedChars.join(''));
            // Only delay on chars that were actually glitched
            if (glitchedChars[correctUpTo - 1] !== text[correctUpTo - 1]) {
              timeoutRef.current = setTimeout(fixNext, 20);
            } else {
              fixNext();
            }
          } else {
            setDisplayedText(text);
            setIsTyping(false);
            setShowContinue(true);
          }
        };
        timeoutRef.current = setTimeout(fixNext, 200);
      }
    };

    timeoutRef.current = setTimeout(typeNext, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [lineIndex, currentLine.text, glitchChar]);

  const handleSkip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayedText(currentLine.text);
    setIsTyping(false);
    setShowContinue(true);
  };

  const handleNext = () => {
    if (isLastLine) {
      onComplete();
    } else {
      setLineIndex((prev) => prev + 1);
    }
  };

  return (
    <div className={styles.card}>
      <Image
        src="/images/starform.png"
        alt=""
        width={120}
        height={120}
        className={styles.starLogo}
      />

      <h1 className={styles.heroHeading}>
        MENTAL WEALTH <em>ACADEMY</em>
      </h1>

      <div className={styles.dialogueRow}>
        <div className={styles.avatarColumn}>
          <div className={styles.avatarFrame}>
            <Image
              src={emotionImages[currentLine.emotion]}
              alt={`Azura ${currentLine.emotion}`}
              width={72}
              height={72}
              className={styles.avatarImg}
              unoptimized
            />
          </div>
          <span className={styles.avatarName}>Azura</span>
          <span className={styles.avatarRole}>AI Co-pilot</span>
        </div>

        <div className={styles.speechBubble}>
          <p className={styles.messageText}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>
      </div>

      <div className={styles.controls}>
        {isTyping && (
          <button type="button" className={styles.skipBtn} onClick={handleSkip}>
            Skip
          </button>
        )}
        {showContinue && (
          <button type="button" className={styles.continueBtn} onClick={handleNext}>
            {isLastLine ? "Let's go" : 'Next'}
          </button>
        )}
      </div>

      <div className={styles.dots}>
        {DIALOGUE_LINES.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === lineIndex ? styles.dotActive : ''} ${i < lineIndex ? styles.dotDone : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
