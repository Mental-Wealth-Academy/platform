'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Brain,
  UsersThree,
  Scales,
  Wallet,
  IconProps,
  Star,
} from '@phosphor-icons/react';
import Image from 'next/image';
import styles from './MobileOnboarding.module.css';

interface StandardScreen {
  type: 'standard';
  title: string;
  description: string;
  icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
}

interface WelcomeScreen {
  type: 'welcome';
}

interface MoodScreen {
  type: 'mood';
}

type Screen = WelcomeScreen | MoodScreen | StandardScreen;

const MOOD_OPTIONS = [
  'Angry', 'Anxious', 'Good', 'Calm',
  'Content', 'Cranky', 'Confused',
  'Confident', 'Energized', 'Emotional',
  'Exhausted', 'Frustrated', 'Focused',
  'Happy', 'Irritable', 'Mood swings',
  'Motivated', 'Optimistic', 'Sensitive',
  'Worried', 'Indifferent',
];

const screens: Screen[] = [
  {
    type: 'welcome',
  },
  {
    type: 'mood',
  },
  {
    type: 'standard',
    title: 'Collaborative Networks',
    description:
      'Join learning communities where ideas connect and wisdom strengthens the entire network.',
    icon: UsersThree,
  },
  {
    type: 'standard',
    title: 'Transparent Governance',
    description:
      'Participate in decisions. Vote on proposals and help shape the future of the Academy.',
    icon: Scales,
  },
  {
    type: 'standard',
    title: 'Ready to Begin?',
    description:
      'Connect your wallet to join, or continue as a guest to explore.',
    icon: Wallet,
  },
];

const STORAGE_KEY = 'hasSeenMobileOnboarding_v2';

interface MobileOnboardingProps {
  onComplete: () => void;
}

// Welcome Screen Component
const WelcomeScreenContent: React.FC = () => {
  return (
    <div className={`${styles.screen} ${styles.welcomeScreen}`}>
      {/* Mascot */}
      <div className={styles.mascotContainer}>
        <Image
          src="/icons/logo-mwa.png"
          alt="Mental Wealth Academy"
          width={64}
          height={64}
          className={styles.mascotImage}
        />
      </div>

      {/* Title */}
      <div className={styles.welcomeTitle}>
        <p className={styles.welcomeSubtitle}>Welcome to</p>
        <h1 className={styles.welcomeHeading}>Mental Wealth Academy</h1>
      </div>

      {/* Message */}
      <div className={styles.welcomeMessage}>
        <p className={styles.congratsText}>
          Congrats on taking the first step towards a mentally refreshed you.
        </p>
        <p className={styles.personalizeText}>
          Let&apos;s get started! Just a few questions to{' '}
          <strong>personalize</strong> your experience.
        </p>
      </div>

      {/* Membership Card */}
      <div className={styles.membershipCard}>
        <div className={styles.cardHeader}>
          <Image
            src="/icons/logo-mwa.png"
            alt=""
            width={20}
            height={20}
            className={styles.cardLogo}
          />
          <p className={styles.cardTitle}>Mental Wealth Academy</p>
        </div>
        <p className={styles.cardSubtitle}>A Digital Academy for Mental Wealth & Education</p>

        <div className={styles.cardContent}>
          <div className={styles.cardLeft}>
            <div className={styles.cardChip} />
            <div className={styles.cardStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} weight="fill" className={styles.star} size={12} />
              ))}
            </div>
          </div>

          <div className={styles.cardCenter}>
            <div className={styles.cardGem} />
          </div>

          <div className={styles.cardRight}>
            <p className={styles.cardLabel}>Member</p>
            <p className={styles.cardLabel}>Card</p>
          </div>
        </div>
      </div>

      {/* Did You Know */}
      <div className={styles.didYouKnow}>
        <p className={styles.didYouKnowLabel}>Did you know?</p>
        <p className={styles.didYouKnowText}>
          <span className={styles.statHighlight}>84%</span> of Mental Wealth Academy members
          who use the app 5x a week have seen great improvement in their mental health.
        </p>
      </div>
    </div>
  );
};

// Mood Screen Component
const MoodScreenContent: React.FC<{
  selectedMoods: string[];
  onToggleMood: (mood: string) => void;
}> = ({ selectedMoods, onToggleMood }) => {
  return (
    <div className={`${styles.screen} ${styles.moodScreen}`}>
      {/* Cat Logo */}
      <div className={styles.moodLogo}>
        <Image
          src="/icons/logo-mwa.png"
          alt="Mental Wealth Academy"
          width={56}
          height={56}
        />
      </div>

      {/* Title */}
      <h1 className={styles.moodTitle}>Mood</h1>

      {/* Oval Shape */}
      <div className={styles.moodOval} />

      {/* Question */}
      <p className={styles.moodQuestion}>How do you feel today?</p>

      {/* Mood Chips */}
      <div className={styles.moodChips}>
        {MOOD_OPTIONS.map((mood) => (
          <button
            key={mood}
            type="button"
            className={`${styles.moodChip} ${selectedMoods.includes(mood) ? styles.moodChipSelected : ''}`}
            onClick={() => onToggleMood(mood)}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
};

// Standard Screen Component
const StandardScreenContent: React.FC<{ screen: StandardScreen; isLastScreen: boolean; onConnectWallet: () => void; onContinueAsGuest: () => void }> = ({
  screen,
  isLastScreen,
  onConnectWallet,
  onContinueAsGuest,
}) => {
  const Icon = screen.icon;

  return (
    <div className={`${styles.screen} ${styles.standardScreen}`}>
      <div className={styles.iconContainer}>
        <Icon size={48} weight="duotone" />
      </div>
      <h1 className={styles.title}>{screen.title}</h1>
      <p className={styles.description}>{screen.description}</p>

      {isLastScreen && (
        <div className={styles.walletActions}>
          <button
            type="button"
            className={`${styles.walletButton} ${styles.connectWalletButton}`}
            onClick={onConnectWallet}
          >
            Connect Wallet
          </button>
          <button
            type="button"
            className={`${styles.walletButton} ${styles.guestButton}`}
            onClick={onContinueAsGuest}
          >
            Continue as Guest
          </button>
        </div>
      )}
    </div>
  );
};

export const MobileOnboarding: React.FC<MobileOnboardingProps> = ({
  onComplete,
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : [...prev, mood]
    );
  };

  // Lock body scroll when mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const markAsComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleSkip = () => {
    markAsComplete();
  };

  const handleContinue = () => {
    if (currentScreen < screens.length - 1) {
      setDirection(1);
      setCurrentScreen((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setDirection(1);
      setCurrentScreen((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setDirection(-1);
      setCurrentScreen((prev) => prev - 1);
    }
  };

  const handleConnectWallet = () => {
    markAsComplete();
  };

  const handleContinueAsGuest = () => {
    markAsComplete();
  };

  const handleDotClick = (index: number) => {
    setDirection(index > currentScreen ? 1 : -1);
    setCurrentScreen(index);
  };

  const currentScreenData = screens[currentScreen];
  const isWelcomeScreen = currentScreen === 0;
  const isMoodScreen = currentScreenData?.type === 'mood';
  const isLastScreen = currentScreen === screens.length - 1;

  // Animation variants
  const slideVariants = prefersReducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) => ({
          x: dir > 0 ? 100 : -100,
          opacity: 0,
        }),
        center: {
          x: 0,
          opacity: 1,
        },
        exit: (dir: number) => ({
          x: dir < 0 ? 100 : -100,
          opacity: 0,
        }),
      };

  const getTransition = () => {
    if (prefersReducedMotion) {
      return { duration: 0.15, ease: [0, 0, 0.2, 1] as const };
    }
    return {
      duration: direction > 0 ? 0.28 : 0.32,
      ease: direction > 0
        ? ([0.34, 1.56, 0.64, 1] as const)
        : ([0, 0, 0.2, 1] as const),
    };
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.screenWrapper}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentScreen}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={getTransition()}
            >
              {currentScreenData.type === 'welcome' ? (
                <WelcomeScreenContent />
              ) : currentScreenData.type === 'mood' ? (
                <MoodScreenContent
                  selectedMoods={selectedMoods}
                  onToggleMood={handleToggleMood}
                />
              ) : (
                <StandardScreenContent
                  screen={currentScreenData}
                  isLastScreen={isLastScreen}
                  onConnectWallet={handleConnectWallet}
                  onContinueAsGuest={handleContinueAsGuest}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {screens.map((_, index) => (
            <motion.button
              key={index}
              type="button"
              className={styles.dot}
              onClick={() => handleDotClick(index)}
              animate={{
                width: index === currentScreen ? 24 : 8,
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 500, damping: 30 }
              }
              aria-label={`Go to screen ${index + 1}`}
              aria-current={index === currentScreen ? 'step' : undefined}
            />
          ))}
        </div>

        {/* Bottom Section - Different for each screen type */}
        {isWelcomeScreen ? (
          <div className={styles.bottomSection}>
            <button
              type="button"
              className={styles.continueButton}
              onClick={handleContinue}
            >
              Continue
            </button>
            <button
              type="button"
              className={styles.skipLink}
              onClick={handleSkip}
            >
              Skip for now
            </button>
          </div>
        ) : isMoodScreen ? (
          <div className={styles.bottomSection}>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleNext}
            >
              Confirm
            </button>
          </div>
        ) : !isLastScreen ? (
          <div className={styles.navigation}>
            <button
              type="button"
              className={`${styles.navButton} ${styles.backButton}`}
              onClick={handleBack}
              disabled={currentScreen === 0}
            >
              Back
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={handleNext}
            >
              Next
            </button>
          </div>
        ) : (
          <div className={styles.navigation} style={{ visibility: 'hidden' }}>
            <button type="button" className={`${styles.navButton} ${styles.backButton}`}>
              Back
            </button>
            <button type="button" className={`${styles.navButton} ${styles.nextButton}`}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOnboarding;
