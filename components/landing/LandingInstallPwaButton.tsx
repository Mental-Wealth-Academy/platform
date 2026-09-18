'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  DeviceMobile,
  Export,
  PlusSquare,
  DotsThreeVertical,
  CheckCircle,
  X,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useSound } from '@/hooks/useSound';
import styles from './LandingPage.module.css';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function LandingInstallPwaButton() {
  const { play } = useSound();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detect standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleClick = async () => {
    play('click');

    if (isInstalled) {
      router.push('/home');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install prompt error', err);
        setIsOpen(true);
      }
      return;
    }

    // iOS or browser without programmatic install prompt: open visual guide
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => play('hover')}
        className={`${styles.fancyButton} ${styles.fancyButtonPwa}`}
        aria-label={isInstalled ? 'Open Mental Wealth Academy' : 'Install Mental Wealth Academy app'}
      >
        <span className={styles.fancyButtonInner}>
          <span className={styles.fancyButtonIcon} aria-hidden="true">
            <DeviceMobile size={20} weight="regular" />
          </span>
          <span className={styles.heroSlideWrap}>
            <span className={styles.heroSlideText}>
              {isInstalled ? 'Launch App' : 'Install App'}
            </span>
            <span className={`${styles.heroSlideText} ${styles.heroSlideClone}`}>
              {isInstalled ? 'Launch App' : 'Install App'}
            </span>
          </span>
        </span>
      </button>

      {isOpen && mounted && createPortal(
        <div
          className={styles.pwaOverlay}
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add to home screen"
        >
          <div className={styles.pwaModal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.pwaClose}
              onClick={() => {
                play('click');
                setIsOpen(false);
              }}
              aria-label="Close dialog"
            >
              <X size={18} weight="bold" />
            </button>

            <div className={styles.pwaHeader}>
              <div className={styles.pwaAppCard}>
                <div className={styles.pwaAppIconWrap}>
                  <Image
                    src="/icons/mwa-mascot-logo.png"
                    alt="Mental Wealth Academy emblem"
                    width={52}
                    height={52}
                    className={styles.pwaAppIcon}
                    priority
                  />
                </div>
                <div className={styles.pwaAppMeta}>
                  <p className={styles.pwaAppName}>Mental Wealth Academy</p>
                  <p className={styles.pwaAppDomain}>mentalwealthacademy.world · Web App</p>
                </div>
              </div>
            </div>

            <div className={styles.pwaBody}>
              <h2 className={styles.pwaTitle}>Add to your home screen</h2>
              <p className={styles.pwaSubtitle}>
                Install Mental Wealth Academy for instant offline-ready access, faster loading, and a full-screen experience.
              </p>

              <div className={styles.pwaSteps}>
                {isIos ? (
                  <>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>1</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Tap the <span className={styles.pwaHighlight}><Export size={16} weight="bold" /> Share</span> button in the Safari navigation bar at the bottom.
                        </p>
                      </div>
                    </div>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>2</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Scroll down in the action list and select <span className={styles.pwaHighlight}><PlusSquare size={16} weight="bold" /> Add to Home Screen</span>.
                        </p>
                      </div>
                    </div>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>3</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Tap <span className={styles.pwaHighlight}>Add</span> in the top-right corner to finish.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>1</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Tap the browser menu <span className={styles.pwaHighlight}><DotsThreeVertical size={16} weight="bold" /></span> in the top right corner.
                        </p>
                      </div>
                    </div>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>2</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Select <span className={styles.pwaHighlight}><PlusSquare size={16} weight="bold" /> Install app</span> or <span className={styles.pwaHighlight}>Add to Home screen</span>.
                        </p>
                      </div>
                    </div>
                    <div className={styles.pwaStepRow}>
                      <span className={styles.pwaStepNumber}>3</span>
                      <div className={styles.pwaStepContent}>
                        <p className={styles.pwaStepText}>
                          Confirm installation to place the app on your home screen.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.pwaActions}>
                <button
                  type="button"
                  className={styles.pwaConfirmBtn}
                  onClick={() => {
                    play('click');
                    setIsOpen(false);
                  }}
                >
                  <CheckCircle size={18} weight="fill" />
                  <span>Got it</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
