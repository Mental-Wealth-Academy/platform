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
  diamondsEarned?: number;
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
  diamondsEarned,
  creditsEarned = 100,
  timeSpentSeconds = 320,
  streakDays = 10,
  focusAccuracy = 100,
}: DailyNoteCelebrationProps) {
  const diamonds = diamondsEarned ?? creditsEarned;
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

  const handleClaimDiamonds = () => {
    play('success');
    triggerConfetti();
    setStep('milestone');
  };

  const handleContinue = () => {
    play('click');
    onClose();
  };

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

function drawFlameShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.bezierCurveTo(cx + size * 0.7, cy - size * 0.4, cx + size * 0.9, cy + size * 0.2, cx + size * 0.5, cy + size * 0.7);
  ctx.bezierCurveTo(cx + size * 0.2, cy + size * 0.95, cx - size * 0.5, cy + size * 0.8, cx - size * 0.5, cy + size * 0.3);
  ctx.bezierCurveTo(cx - size * 0.5, cy - size * 0.2, cx - size * 0.15, cy - size * 0.6, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

function drawDiamondShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.8, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.8, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCheckShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.4, cy);
  ctx.lineTo(cx - size * 0.05, cy + size * 0.35);
  ctx.lineTo(cx + size * 0.45, cy - size * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawClockShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.55);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + size * 0.4, cy);
  ctx.stroke();
  ctx.restore();
}

async function generateStreakCardBlob({
  streakDays,
  diamonds,
  focusAccuracy,
  timeFormatted,
}: {
  streakDays: number;
  diamonds: number;
  focusAccuracy: number;
  timeFormatted: string;
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 860;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 860);
  bgGrad.addColorStop(0, '#f0f4ff');
  bgGrad.addColorStop(1, '#e6edfc');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 720, 860);

  // Main white card with shadow
  ctx.save();
  ctx.shadowColor = 'rgba(26, 29, 51, 0.12)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  drawRoundedRect(ctx, 40, 40, 640, 780, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // Card border
  ctx.save();
  drawRoundedRect(ctx, 40, 40, 640, 780, 36);
  ctx.strokeStyle = 'rgba(81, 104, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Badge pill (top left)
  const pillX = 76;
  const pillY = 76;
  const pillW = 184;
  const pillH = 40;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 20);
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Flame icon inside pill
  drawFlameShape(ctx, pillX + 22, pillY + 20, 11, '#0284c7');

  // Pill text
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Day ${streakDays} streak`, pillX + 42, pillY + 20);

  // Title text (two lines)
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText("I'm acing my daily", 76, 162);
  ctx.fillText("check-in!", 76, 200);

  // Mascot graphic (top right)
  try {
    const mascotImg = await loadImage('/images/celebration/blue-celebration.png');
    ctx.drawImage(mascotImg, 480, 64, 160, 160);
  } catch {
    // Graceful fallback if image load fails
  }

  // Stats Box
  const boxX = 76;
  const boxY = 246;
  const boxW = 568;
  const boxH = 270;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 24);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Row 1: Diamonds earned
  const r1Y = boxY + 54;
  drawDiamondShape(ctx, boxX + 32, r1Y, 11, '#5168ff');
  ctx.fillStyle = '#475569';
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Diamonds earned', boxX + 54, r1Y);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`+${diamonds}`, boxX + boxW - 28, r1Y);

  // Divider 1
  ctx.beginPath();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.moveTo(boxX + 28, boxY + 90);
  ctx.lineTo(boxX + boxW - 28, boxY + 90);
  ctx.stroke();

  // Row 2: Focus accuracy
  const r2Y = boxY + 135;
  drawCheckShape(ctx, boxX + 32, r2Y, 11, '#10b981');
  ctx.fillStyle = '#475569';
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Focus accuracy', boxX + 54, r2Y);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${focusAccuracy}%`, boxX + boxW - 28, r2Y);

  // Divider 2
  ctx.beginPath();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.moveTo(boxX + 28, boxY + 180);
  ctx.lineTo(boxX + boxW - 28, boxY + 180);
  ctx.stroke();

  // Row 3: Time spent
  const r3Y = boxY + 225;
  drawClockShape(ctx, boxX + 32, r3Y, 11, '#38bdf8');
  ctx.fillStyle = '#475569';
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Time spent', boxX + 54, r3Y);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(timeFormatted, boxX + boxW - 28, r3Y);

  // Logo / Footer
  ctx.fillStyle = '#4338ca';
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Mental Wealth Academy', 360, 765);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('mentalwealthacademy.world', 360, 792);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export to blob failed'));
    }, 'image/png');
  });
}

  const shareText = `I completed today's Field Note and earned ${diamonds} diamonds on Mental Wealth Academy! Streak: ${streakDays} days.`;
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

  const handleSaveCard = async () => {
    play('click');
    try {
      const blob = await generateStreakCardBlob({
        streakDays,
        diamonds,
        focusAccuracy,
        timeFormatted: formatElapsed(timeSpentSeconds),
      });

      const fileName = `mental-wealth-streak-day-${streakDays}.png`;
      let file: File | null = null;
      try {
        file = new File([blob], fileName, { type: 'image/png' });
      } catch {}

      // Priority 1: Mobile Web Share API with file (iOS Safari, Android Chrome)
      // On iOS Safari, this opens the native sheet with "Save Image" option, saving
      // directly to the Photos library without navigating away from the web app.
      if (
        file &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'Mental Wealth Academy',
            text: shareText,
          });
          showToast('Card saved');
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            // User closed native share sheet without saving; keep modal intact
            return;
          }
        }
      }

      // Priority 2: Clipboard API (copy image to clipboard)
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          showToast('Card copied to clipboard');
          return;
        } catch {}
      }

      // Priority 3: Safe object URL download (desktop browsers)
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);
      showToast('Card downloaded');
    } catch (err) {
      console.error('[CelebrationModal] Failed to save card:', err);
      showToast('Could not save card');
    }
  };

  const handleMoreShare = async () => {
    play('click');
    try {
      const blob = await generateStreakCardBlob({
        streakDays,
        diamonds,
        focusAccuracy,
        timeFormatted: formatElapsed(timeSpentSeconds),
      });
      const file = new File([blob], `mental-wealth-streak-day-${streakDays}.png`, { type: 'image/png' });
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: 'Mental Wealth Academy',
          text: shareText,
          url: shareUrl,
        });
        return;
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Mental Wealth Academy',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

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
                {/* Metric 1: Total Diamonds */}
                <div className={`${styles.metricCard} ${styles.metricCardGold}`}>
                  <div className={styles.metricHeader}>Total diamonds</div>
                  <div className={styles.metricContent}>
                    <Image
                      src="/icons/ui-diamond.svg"
                      alt=""
                      width={20}
                      height={20}
                      className={styles.metricDiamondIcon}
                    />
                    <span className={styles.metricValue}>+{diamonds}</span>
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
                onClick={handleClaimDiamonds}
              >
                Claim Diamonds
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
                    <span className={styles.shareCardTitle}>{"I'm acing my daily check-in!"}</span>
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
                      <Image
                        src="/icons/ui-diamond.svg"
                        alt=""
                        width={16}
                        height={16}
                        className={styles.shareDiamondIcon}
                      />
                      Diamonds earned
                    </span>
                    <span className={styles.shareStatVal}>+{diamonds}</span>
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

                <button
                  type="button"
                  className={styles.shareClaimButton}
                  onClick={() => {
                    setShowShare(false);
                    if (step === 'progress') {
                      handleClaimDiamonds();
                    } else {
                      handleContinue();
                    }
                  }}
                >
                  {step === 'progress' ? 'Claim Diamonds' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
