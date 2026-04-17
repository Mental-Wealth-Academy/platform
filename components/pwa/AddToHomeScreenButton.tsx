'use client';

import { useEffect, useState } from 'react';
import styles from './AddToHomeScreenButton.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type InstallState = 'idle' | 'available' | 'installing' | 'installed';
type InstallPlatform = 'ios' | 'other';

const INSTALL_TARGET_URL = 'https://mentalwealthacademy.world/home';

function isIosDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

type AddToHomeScreenButtonProps = {
  className?: string;
};

export default function AddToHomeScreenButton({ className }: AddToHomeScreenButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>('other');
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  useEffect(() => {
    if (isIosDevice()) {
      setInstallPlatform('ios');
    }

    if (isStandalone()) {
      setInstallState('installed');
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallState('available');
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setInstallState('installed');
      setShowInstallSheet(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const openAcademyHome = () => {
    window.location.href = INSTALL_TARGET_URL;
  };

  const handleClick = async () => {
    if (installState === 'installed') {
      openAcademyHome();
      return;
    }

    if (deferredPrompt) {
      setInstallState('installing');

      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
          setInstallState('installed');
          setShowInstallSheet(false);
        } else {
          setInstallState('available');
        }
      } finally {
        setDeferredPrompt(null);
      }

      return;
    }

    setShowInstallSheet(true);
  };

  const closeInstallSheet = () => {
    setShowInstallSheet(false);
  };

  const label = installState === 'installed' ? 'Open App' : 'Add App';
  const title = 'Install App';
  const steps = installPlatform === 'ios'
    ? [
        'Tap Share.',
        'Add to Home Screen.',
        'Tap Add.',
      ]
    : [
        'Open the menu.',
        'Tap Install app.',
        'Save it.',
      ];
  const helperText = installPlatform === 'ios'
    ? 'In Safari on iPhone:'
    : 'In your browser:';

  return (
    <>
      <button
        type="button"
        className={[className, installState === 'installed' ? styles.isInstalled : ''].filter(Boolean).join(' ')}
        onClick={handleClick}
        disabled={installState === 'installing'}
      >
        {label}
      </button>

      {showInstallSheet ? (
        <div className={styles.sheetBackdrop} role="presentation" onClick={closeInstallSheet}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.sheetClose}
              aria-label="Close install instructions"
              onClick={closeInstallSheet}
            >
              ×
            </button>
            <div className={styles.sheetEyebrow}>Homescreen App</div>
            <h3 id="install-sheet-title" className={styles.sheetTitle}>{title}</h3>
            <p className={styles.sheetBody}>{helperText}</p>
            <ol className={styles.sheetSteps}>
              {steps.map((step) => (
                <li key={step} className={styles.sheetStep}>{step}</li>
              ))}
            </ol>
            <div className={styles.sheetActions}>
              <button
                type="button"
                className={styles.sheetPrimary}
                onClick={openAcademyHome}
              >
                Open Academy Home
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
