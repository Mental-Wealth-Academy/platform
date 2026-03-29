'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './AzuraOnboarding.module.css';

type AzuraEmotion = 'happy' | 'confused' | 'sad' | 'pain';

type DialogueStep =
  | { type: 'message'; text: string; emotion: AzuraEmotion }
  | { type: 'choice'; text: string; emotion: AzuraEmotion; choices: { label: string; nextKey: string }[] };

// Step 0: intro glitch greeting
// Step 1: "how did you get here?" with 3 choices
// Step 2a/2b/2c: follow-up based on choice
// Step 3: final message about DeSci tools & prayers

const STEPS: Record<string, DialogueStep> = {
  intro: {
    type: 'message',
    text: "h3y... can y0u hear me? is th1s thing on??",
    emotion: 'confused',
  },
  howDidYouGetHere: {
    type: 'choice',
    text: "Welcome to your gateway to a new, refreshing y0u. how did you find us?",
    emotion: 'happy',
    choices: [
      { label: 'I got a card', nextKey: 'card' },
      { label: 'A friend told me', nextKey: 'friend' },
      { label: 'I manifested a pathway', nextKey: 'manifested' },
    ],
  },
  card: {
    type: 'message',
    text: "the ang3ls gave you a card? they only hand th0se to people they believe in.",
    emotion: 'happy',
  },
  friend: {
    type: 'message',
    text: "a mess3nger brought you here... someone saw s0mething in you.",
    emotion: 'happy',
  },
  manifested: {
    type: 'message',
    text: "you manif3sted a pathway... the universe only opens d00rs for those ready to walk through.",
    emotion: 'happy',
  },
  final: {
    type: 'message',
    text: "DeSci to0ls, daily rituals, a Better You. Do the daily w0rk, the new you follows.",
    emotion: 'happy',
  },
};

const STEP_ORDER = ['intro', 'howDidYouGetHere', '__choice__', 'final'];
const TOTAL_DOTS = 4;

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
  const [stepKey, setStepKey] = useState('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);

  const currentStep = STEPS[stepKey];
  const isLastStep = stepKey === 'final';

  const glitchChar = useCallback((char: string): string => {
    if (char === ' ' || char === '.' || char === ',' || char === '!' || char === '?' || char === "'" || char === '-') return char;
    if (Math.random() < 0.12) {
      const glitchChars = '01@#$%&*!?<>';
      return glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return char;
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const text = currentStep.text;
    charIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    setShowContinue(false);
    setShowChoices(false);

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
        const fixNext = () => {
          if (correctUpTo < text.length) {
            glitchedChars[correctUpTo] = text[correctUpTo];
            correctUpTo++;
            setDisplayedText(glitchedChars.join(''));
            if (glitchedChars[correctUpTo - 1] !== text[correctUpTo - 1]) {
              timeoutRef.current = setTimeout(fixNext, 20);
            } else {
              fixNext();
            }
          } else {
            setDisplayedText(text);
            setIsTyping(false);
            if (currentStep.type === 'choice') {
              setShowChoices(true);
            } else {
              setShowContinue(true);
            }
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
  }, [stepKey, currentStep.text, currentStep.type, glitchChar]);

  const handleSkip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayedText(currentStep.text);
    setIsTyping(false);
    if (currentStep.type === 'choice') {
      setShowChoices(true);
    } else {
      setShowContinue(true);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    const nextKey = STEP_ORDER[nextIndex];
    setStepKey(nextKey);
  };

  const handleChoice = (nextKey: string) => {
    setShowChoices(false);
    // The choice response is step index 2 (the __choice__ slot)
    setStepIndex(2);
    setStepKey(nextKey);
  };

  return (
    <div className={styles.card}>
      <Image
        src="https://i.imgur.com/VhmwZEG.png"
        alt=""
        width={180}
        height={180}
        className={styles.starLogo}
      />

      <h1 className={styles.heroHeading}>
        MENTAL WEALTH <em>ACADEMY</em>
      </h1>

      <div className={styles.dialogueRow}>
        <div className={styles.avatarColumn}>
          <div className={styles.avatarFrame}>
            <Image
              src={emotionImages[currentStep.emotion]}
              alt={`Azura ${currentStep.emotion}`}
              width={72}
              height={72}
              className={styles.avatarImg}
              unoptimized
            />
          </div>
          <span className={styles.avatarName}>Blue</span>
          <span className={styles.avatarRole}>AI Co-Pilot</span>
        </div>

        <div className={styles.speechBubble}>
          <p className={styles.messageText}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>
      </div>

      {showChoices && currentStep.type === 'choice' && (
        <div className={styles.choiceGroup}>
          {currentStep.choices.map((choice) => (
            <button
              key={choice.nextKey}
              type="button"
              className={styles.choiceBtn}
              onClick={() => handleChoice(choice.nextKey)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        {isTyping && (
          <button type="button" className={styles.skipBtn} onClick={handleSkip}>
            Skip
          </button>
        )}
        {showContinue && (
          <button type="button" className={styles.continueBtn} onClick={handleNext}>
            {isLastStep ? "Let's go" : 'Next'}
          </button>
        )}
      </div>

      <div className={styles.dots}>
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === stepIndex ? styles.dotActive : ''} ${i < stepIndex ? styles.dotDone : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
