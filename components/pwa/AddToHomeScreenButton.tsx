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

type InstallState = 'idle' | 'available' | 'installing' | 'installed' | 'unsupported';

function isIosSafari() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return isIos && isSafari;
}

function isStandalone() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

type AddToHomeScreenButtonProps = {
  className?: string;
};

export default function AddToHomeScreenButton({ className }: AddToHomeScreenButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstallState('installed');
      return;
    }

    if (isIosSafari()) {
      setInstallState('unsupported');
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
      setShowInstructions(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (installState === 'installed') {
      return;
    }

    if (isIosSafari()) {
      setShowInstructions((current) => !current);
      return;
    }

    if (!deferredPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    setInstallState('installing');

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setInstallState('installed');
        setShowInstructions(false);
      } else {
        setInstallState('available');
      }
    } finally {
      setDeferredPrompt(null);
    }
  };

  const label = installState === 'installed' ? 'App Added' : 'Add App';
  const instructions = isIosSafari()
    ? 'On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen.'
    : 'If your browser does not show the install prompt, open the browser menu and choose Install app or Create shortcut.';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={[className, installState === 'installed' ? styles.isInstalled : ''].filter(Boolean).join(' ')}
        onClick={handleClick}
        aria-expanded={showInstructions}
        aria-controls="add-to-home-screen-help"
        disabled={installState === 'installing'}
      >
        {label}
      </button>
      {showInstructions && installState !== 'installed' ? (
        <p id="add-to-home-screen-help" className={styles.instructions}>
          {instructions} No App Store required.
        </p>
      ) : null}
    </div>
  );
}
