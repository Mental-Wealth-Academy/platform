'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Clock,
  Sparkle,
  Flame,
  ShareNetwork,
  X,
  ChatDots,
  WhatsappLogo,
  XLogo,
  DownloadSimple,
  DotsThree,
} from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './DailyNoteCelebrationModal.module.css';

export interface DailyNoteCelebrationProps {
  open: boolean;
  onClose: () => void;
  creditsEarned?: number;
  timeSpentSeconds?: number;
  streakDays?: number;
  focusAccuracy?: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function DailyNoteCelebrationModal({
  open,
  onClose,
  creditsEarned = 100,
  timeSpentSeconds = 320,
  streakDays = 10,
  focusAccuracy = 100,
}: DailyNoteCelebrationProps) {
  const { play } = useSound();
  const [step, setStep] = useState<'progress' | 'milestone'>('progress');
  const [showShare, setShowShare] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2400);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'],
        zIndex: 10005,
      });
    } catch {}
  };

  // Play celebration sound and initial burst when opened
  useEffect(() => {
    if (open) {
      setStep('progress');
      setShowShare(false);
      play('celebration');
      triggerConfetti();
    }
  }, [open, play]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showShare) {
          setShowShare(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, showShare, onClose]);

  if (!open) return null;

  const handleClaimCredits = () => {
    play('success');
    triggerConfetti();
    setStep('milestone');
  };

  const handleContinue = () => {
    play('click');
    onClose();
  };

  const shareText = `I completed today's Field Note and earned ${creditsEarned} credits on Mental Wealth Academy! Streak: ${streakDays} days.`;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mentalwealthacademy.world';

  const handleShareMessages = () => {
    play('click');
    window.open(`sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    play('click');
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
  };

  const handleShareX = () => {
    play('click');
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleSaveCard = () => {
    play('click');
    // Save image: download the mascot celebration graphic with high resolution
    const link = document.createElement('a');
    link.href = '/images/celebration/blue-celebration.jpg';
    link.download = `mental-wealth-streak-day-${streakDays}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Card image downloaded');
  };

  const handleMoreShare = async () => {
    play('click');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Mental Wealth Academy',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    // Fallback: copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast('Share link copied to clipboard');
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Reflection celebration">
      <div className={styles.container}>
        {toastMessage && <div className={styles.copyToast}>{toastMessage}</div>}

        {/* ── STEP 1: Stellar Progress ── */}
        {step === 'progress' && (
          <>
            <div className={styles.screenBody}>
              <div className={styles.mascotWrap}>
                <div className={styles.mascotGlow} />
                <Image
                  src="/images/celebration/blue-celebration.png"
                  alt="Blue celebrating"
                  width={220}
                  height={220}
                  className={styles.mascotImg}
                  priority
                />
              </div>

              <h1 className={styles.titleText}>Stellar progress!</h1>
              <p className={styles.subtitleText}>Your mental clarity is compounding</p>

              <div className={styles.metricsRow}>
                {/* Metric 1: Total Credits */}
                <div className={`${styles.metricCard} ${styles.metricCardGold}`}>
                  <div className={styles.metricHeader}>Total credits</div>
                  <div className={styles.metricContent}>
                    <Sparkle size={18} weight="fill" className={styles.metricIcon} />
                    <span className={styles.metricValue}>+{creditsEarned}</span>
                  </div>
                </div>

                {/* Metric 2: Focus */}
                <div className={`${styles.metricCard} ${styles.metricCardGreen}`}>
                  <div className={styles.metricHeader}>Focus</div>
                  <div className={styles.metricContent}>
                    <CheckCircle size={18} weight="bold" className={styles.metricIcon} />
                    <span className={styles.metricValue}>{focusAccuracy}%</span>
                  </div>
                </div>

                {/* Metric 3: Committed Time */}
                <div className={`${styles.metricCard} ${styles.metricCardCyan}`}>
                  <div className={styles.metricHeader}>Committed</div>
                  <div className={styles.metricContent}>
                    <Clock size={18} weight="fill" className={styles.metricIcon} />
                    <span className={styles.metricValue}>{formatElapsed(timeSpentSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bottomActionRow}>
              <button
                type="button"
                className={styles.shareIconButton}
                onClick={() => {
                  play('click');
                  setShowShare(true);
                }}
                aria-label="Share your progress"
              >
                <ShareNetwork size={24} weight="bold" />
              </button>
              <button
                type="button"
                className={styles.mainCtaButton}
                onClick={handleClaimCredits}
              >
                Claim credits
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Streak / Progress Milestone ── */}
        {step === 'milestone' && (
          <>
            <div className={styles.screenBody}>
              <div className={styles.mascotWrap}>
                <div className={`${styles.mascotGlow} ${styles.mascotGlowGold}`} />
                <Image
                  src="/images/celebration/blue-streak.png"
                  alt="Blue streak milestone"
                  width={220}
                  height={220}
                  className={styles.mascotImg}
                  priority
                />
              </div>

              <div className={styles.milestoneCard}>
                <div className={styles.milestoneBadge}>
                  <div className={styles.milestoneIconWrap}>
                    <Flame size={28} weight="fill" />
                  </div>
                  <span className={styles.milestoneCount}>{streakDays}</span>
                </div>

                <div className={styles.progressBarContainer}>
                  <span className={`${styles.progressLabel} ${styles.progressLabelActive}`}>{streakDays}</span>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill}>
                      <Sparkle size={14} weight="fill" className={styles.progressSparkle} />
                    </div>
                  </div>
                  <span className={styles.progressLabel}>{streakDays + 1}</span>
                </div>

                <p className={styles.kickerText}>
                  {"You're building unstoppable consistency with daily field notes!"}
                </p>
              </div>
            </div>

            <div className={styles.bottomActionRow}>
              <button
                type="button"
                className={styles.shareIconButton}
                onClick={() => {
                  play('click');
                  setShowShare(true);
                }}
                aria-label="Share your milestone"
              >
                <ShareNetwork size={24} weight="bold" />
              </button>
              <button
                type="button"
                className={styles.mainCtaButton}
                onClick={handleContinue}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Share Modal Drawer ── */}
        {showShare && (
          <div className={styles.shareDrawerBackdrop} onClick={() => setShowShare(false)}>
            <div className={styles.shareDrawerContent} onClick={(e) => e.stopPropagation()}>
              {/* Share Card Graphic */}
              <div className={styles.shareCard}>
                <div className={styles.shareCardHeader}>
                  <div className={styles.shareCardTitleWrap}>
                    <span className={styles.shareCardPill}>
                      <Flame size={12} weight="fill" />
                      Day {streakDays} streak
                    </span>
                    <span className={styles.shareCardTitle}>{"I'm acing my daily reflections!"}</span>
                  </div>
                  <Image
                    src="/images/celebration/blue-celebration.png"
                    alt="Blue"
                    width={72}
                    height={72}
                    className={styles.shareCardMascot}
                  />
                </div>

                <div className={styles.shareCardStatsList}>
                  <div className={styles.shareStatRow}>
                    <span className={styles.shareStatLeft}>
                      <Sparkle size={16} weight="fill" style={{ color: '#f59e0b' }} />
                      Credits earned
                    </span>
                    <span className={styles.shareStatVal}>+{creditsEarned}</span>
                  </div>
                  <div className={styles.shareStatRow}>
                    <span className={styles.shareStatLeft}>
                      <CheckCircle size={16} weight="bold" style={{ color: '#10b981' }} />
                      Focus accuracy
                    </span>
                    <span className={styles.shareStatVal}>{focusAccuracy}%</span>
                  </div>
                  <div className={styles.shareStatRow}>
                    <span className={styles.shareStatLeft}>
                      <Clock size={16} weight="fill" style={{ color: '#38bdf8' }} />
                      Time spent
                    </span>
                    <span className={styles.shareStatVal}>{formatElapsed(timeSpentSeconds)}</span>
                  </div>
                </div>

                <div className={styles.shareCardFooter}>
                  <span className={styles.shareCardLogo}>Mental Wealth Academy</span>
                </div>
              </div>

              {/* Share Options Section */}
              <div className={styles.shareOptionsSection}>
                <div className={styles.shareOptionsHeader}>
                  <button
                    type="button"
                    className={styles.shareCloseBtn}
                    onClick={() => {
                      play('click');
                      setShowShare(false);
                    }}
                    aria-label="Close share sheet"
                  >
                    <X size={20} weight="bold" />
                  </button>
                  <span className={styles.shareOptionsTitle}>Share</span>
                  <div style={{ width: 20 }} />
                </div>

                <div className={styles.shareButtonsGrid}>
                  <button type="button" className={styles.shareItemBtn} onClick={handleShareMessages}>
                    <div className={`${styles.shareItemIconWrap} ${styles.shareIconMessages}`}>
                      <ChatDots size={24} weight="fill" />
                    </div>
                    <span className={styles.shareItemLabel}>Messages</span>
                  </button>

                  <button type="button" className={styles.shareItemBtn} onClick={handleShareWhatsApp}>
                    <div className={`${styles.shareItemIconWrap} ${styles.shareIconWhatsApp}`}>
                      <WhatsappLogo size={24} weight="fill" />
                    </div>
                    <span className={styles.shareItemLabel}>WhatsApp</span>
                  </button>

                  <button type="button" className={styles.shareItemBtn} onClick={handleShareX}>
                    <div className={`${styles.shareItemIconWrap} ${styles.shareIconX}`}>
                      <XLogo size={22} weight="bold" />
                    </div>
                    <span className={styles.shareItemLabel}>X</span>
                  </button>

                  <button type="button" className={styles.shareItemBtn} onClick={handleSaveCard}>
                    <div className={`${styles.shareItemIconWrap} ${styles.shareIconSave}`}>
                      <DownloadSimple size={24} weight="bold" />
                    </div>
                    <span className={styles.shareItemLabel}>Save</span>
                  </button>

                  <button type="button" className={styles.shareItemBtn} onClick={handleMoreShare}>
                    <div className={`${styles.shareItemIconWrap} ${styles.shareIconMore}`}>
                      <DotsThree size={24} weight="bold" />
                    </div>
                    <span className={styles.shareItemLabel}>More</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
