'use client';

import React, { useState, useEffect } from 'react';
import BlueDialogue, { BlueEmotion } from '../blue-dialogue/BlueDialogue';
import styles from './StillTutorial.module.css';

export interface TutorialStep {
  message: string;
  emotion: BlueEmotion;
  targetElement?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface StillTutorialProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  title?: string;
  showProgress?: boolean;
}

const StillTutorial: React.FC<StillTutorialProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  title = 'Welcome Guide',
  showProgress = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setIsTyping(false);
      return;
    }

    // Reset to first step when opened
    setCurrentStep(0);
    setIsTyping(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    const step = steps[currentStep];
    if (step.targetElement) {
      const element = document.querySelector(step.targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Calculate highlight area
        const highlightStyle: React.CSSProperties = {
          position: 'absolute',
          top: `${rect.top + scrollY}px`,
          left: `${rect.left + scrollX}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          borderRadius: '8px',
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 4px var(--color-primary, #5168FF)`,
          pointerEvents: 'none',
          zIndex: 9998,
        };

        setOverlayStyle(highlightStyle);
      }
    } else {
      setOverlayStyle({});
    }
  }, [currentStep, isOpen, steps]);

  const handleDialogueComplete = () => {
    setIsTyping(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsTyping(true);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setIsTyping(true);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen || steps.length === 0) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Highlight overlay for target element */}
      {currentStepData.targetElement && (
        <div style={overlayStyle} className={styles.highlight} />
      )}

      {/* Tutorial Container */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {showProgress && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <button className={styles.closeButton} onClick={handleSkip} type="button" aria-label="Close tutorial">
            ×
          </button>
        </div>

        <div className={styles.content}>
          <BlueDialogue
            key={currentStep}
            message={currentStepData.message}
            emotion={currentStepData.emotion}
            onComplete={handleDialogueComplete}
            autoStart={isTyping}
            showSkip={false}
          />
        </div>

        <div className={styles.footer}>
          <div className={styles.stepIndicator}>
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className={styles.actions}>
            {currentStep > 0 && (
              <button
                className={styles.prevButton}
                onClick={handlePrevious}
                type="button"
              >
                ← Previous
              </button>
            )}
            <div className={styles.spacer} />
            {currentStep < steps.length - 1 ? (
              <button
                className={styles.nextButton}
                onClick={handleNext}
                type="button"
                disabled={isTyping}
              >
                Next →
              </button>
            ) : (
              <button
                className={styles.completeButton}
                onClick={handleComplete}
                type="button"
                disabled={isTyping}
              >
                Got it!
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StillTutorial;
