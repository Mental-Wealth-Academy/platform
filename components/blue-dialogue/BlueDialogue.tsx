'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import { useScrollLock } from '@/hooks/useScrollLock';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import CtaButton from '@/components/shared/CtaButton';
import styles from './BlueDialogue.module.css';

// ── Blue Voice TTS ──────────────────────────────────────────
// A persisted preference gates an ElevenLabs-backed read-aloud of each spoken
// line. New members begin with Blue's voice enabled.
const VOICE_PREF_KEY = 'blueDialogue.voiceEnabled';

/** Strip single-letter hotkey brackets (e.g. "[E]nd" → "End") before speaking. */
function sanitizeForSpeech(text: string): string {
  return text.replace(/\[([A-Za-z0-9])\]/g, '$1').trim();
}

/** Fetch ElevenLabs audio for a line and return a ready-to-play element. */
async function fetchBlueAudio(
  text: string,
  signal: AbortSignal,
): Promise<HTMLAudioElement> {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new Error('TTS request failed');
  const blob = await res.blob();
  if (!blob.size) throw new Error('No audio data');

  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  el.volume = 0.5;
  el.addEventListener('ended', () => URL.revokeObjectURL(url));
  return el;
}

export type BlueEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'confused'
  | 'pain'
  | 'calm';

export interface BlueChatback {
  /** Placeholder shown in the empty reply field (deprecated, chat input removed). */
  placeholder?: string;
  /** Receives each sent reply along with the index of the line it answered. */
  onSubmit?: (reply: string, lineIndex: number) => void;
}

export interface BlueDialogueProps {
  /** Controls whether the dialogue modal is mounted and visible. */
  open: boolean;
  /** Ordered dialogue lines. Advancing progresses through them; the last closes. */
  lines: string[];
  /** Sets the emotional family Blue varies through as the dialogue advances. */
  emotion?: BlueEmotion;
  /** Fired on close (last line advance, ESC, backdrop click, or close button). */
  onClose: () => void;
  /** Milliseconds per typewritten character. */
  speed?: number;
  /** Diamond credit amount to present as a reward chip above the dialogue text. */
  reward?: number;
  /** Heading rendered above Blue's line, e.g. "Check-in [Week 7]". */
  title?: string;
  /** Supporting line rendered under the title. */
  subtitle?: string;
  /** Retained for call-site compatibility. */
  placement?: 'bottom' | 'center';
  /** Deprecated: chat input is removed per design specifications. */
  chatback?: BlueChatback;
  /** Keep centered popup without dimming background backdrop. */
  clearBackdrop?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 8 individual forward-facing Grok-bot styled emotion assets */
const EMOTION_IMAGES: Record<BlueEmotion, string> = {
  neutral: '/images/blue-emotes/neutral.png',
  happy: '/images/blue-emotes/happy.png',
  sad: '/images/blue-emotes/sad.png',
  angry: '/images/blue-emotes/angry.png',
  surprised: '/images/blue-emotes/surprised.png',
  confused: '/images/blue-emotes/confused.png',
  pain: '/images/blue-emotes/pain.png',
  calm: '/images/blue-emotes/calm.png',
};

/**
 * Each script keeps its intended emotional tone while Blue's face changes with
 * the conversation. The first expression always matches the caller's choice;
 * subsequent lines move through nearby reactions instead of choosing randomly.
 */
const EXPRESSION_SEQUENCE: Record<BlueEmotion, BlueEmotion[]> = {
  neutral: ['neutral', 'calm', 'happy', 'surprised'],
  happy: ['happy', 'surprised', 'calm', 'happy'],
  sad: ['sad', 'pain', 'calm', 'neutral'],
  angry: ['angry', 'confused', 'calm', 'angry'],
  surprised: ['surprised', 'happy', 'confused', 'calm'],
  confused: ['confused', 'surprised', 'neutral', 'calm'],
  pain: ['pain', 'sad', 'calm', 'neutral'],
  calm: ['calm', 'neutral', 'happy', 'calm'],
};

const BlueDialogue: React.FC<BlueDialogueProps> = ({
  open,
  lines,
  emotion = 'happy',
  onClose,
  speed = 22,
  reward,
  title,
  subtitle,
}) => {
  const { play } = useSound();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeLines = useMemo(
    () => (lines.length > 0 ? lines : ['']),
    [lines],
  );

  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayReward, setDisplayReward] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // The centered modal overlay freezes the background page.
  useScrollLock(open);

  // Count the reward chip up from zero when the overlay opens.
  useEffect(() => {
    if (!open || !reward) return;
    if (prefersReducedMotion()) {
      setDisplayReward(reward);
      return;
    }
    setDisplayReward(0);
    const duration = 900;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayReward(Math.round(reward * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [open, reward]);

  const safeIndex = lineIndex >= safeLines.length ? safeLines.length - 1 : lineIndex;
  const activeLine = safeLines[safeIndex] ?? '';
  const isLastLine = safeIndex >= safeLines.length - 1;

  // Stop any in-flight fetch and pause any playing audio.
  const stopVoice = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  // Load an explicit off preference. With no saved choice, voice starts on.
  useEffect(() => {
    const enabled = getStorageItem(VOICE_PREF_KEY) !== '0';
    setVoiceEnabled(enabled);
  }, []);

  const toggleVoice = useCallback(() => {
    play('click');
    setVoiceEnabled((prev) => {
      const next = !prev;
      setStorageItem(VOICE_PREF_KEY, next ? '1' : '0');
      if (!next) stopVoice();
      return next;
    });
  }, [play, stopVoice]);

  // Read the active line aloud when voice is on. Fires as the line becomes
  // active (in parallel with the typewriter) and cancels previous line audio.
  useEffect(() => {
    if (!open || !voiceEnabled) return;
    const line = sanitizeForSpeech(activeLine);
    if (!line) return;

    stopVoice();
    const controller = new AbortController();
    voiceAbortRef.current = controller;
    fetchBlueAudio(line, controller.signal)
      .then((el) => {
        if (controller.signal.aborted) return;
        currentAudioRef.current = el;
        el.play().catch(() => {});
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn('[BlueDialogue] TTS failed:', err);
      });

    return () => controller.abort();
  }, [open, voiceEnabled, activeLine, safeIndex, stopVoice]);

  // Cut audio when the dialogue closes.
  useEffect(() => {
    if (!open) stopVoice();
  }, [open, stopVoice]);

  // Reset to the first line whenever the overlay opens or the script changes.
  useEffect(() => {
    if (!open) return;
    setLineIndex(0);
  }, [open, safeLines]);

  const clearTyping = useCallback(() => {
    if (typeTimer.current) {
      clearTimeout(typeTimer.current);
      typeTimer.current = null;
    }
  }, []);

  // Typewriter reveal for the active line (instant under reduced-motion).
  useEffect(() => {
    if (!open) return;
    clearTyping();

    if (prefersReducedMotion() || speed <= 0) {
      setDisplayed(activeLine);
      setIsTyping(false);
      return;
    }

    setDisplayed('');
    setIsTyping(true);
    let i = 0;
    const step = () => {
      if (i < activeLine.length) {
        setDisplayed(activeLine.slice(0, i + 1));
        i += 1;
        typeTimer.current = setTimeout(step, speed);
      } else {
        setIsTyping(false);
      }
    };
    typeTimer.current = setTimeout(step, 80);

    return clearTyping;
  }, [open, activeLine, speed, clearTyping]);

  const finishTyping = useCallback(() => {
    clearTyping();
    setDisplayed(activeLine);
    setIsTyping(false);
  }, [activeLine, clearTyping]);

  const close = useCallback(() => {
    play('navigation');
    stopVoice();
    onClose();
  }, [onClose, play, stopVoice]);

  // Advance to next line if more lines remain, otherwise close.
  const handleAdvance = useCallback(() => {
    play('click');
    if (isTyping) {
      finishTyping();
      return;
    }
    if (safeIndex < safeLines.length - 1) {
      setLineIndex((n) => n + 1);
    } else {
      close();
    }
  }, [play, isTyping, finishTyping, safeIndex, safeLines.length, close]);

  // Skip: finish line typing; if already typed, close.
  const handleSkip = useCallback(() => {
    play('click');
    if (isTyping) {
      finishTyping();
    } else {
      close();
    }
  }, [play, isTyping, finishTyping, close]);

  // Keyboard navigation: Escape closes; Space/Enter advances.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdvance();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, handleAdvance]);

  if (!open) return null;

  const expressionSequence = EXPRESSION_SEQUENCE[emotion];
  const activeEmotion = expressionSequence[safeIndex % expressionSequence.length];
  const emoteSrc = EMOTION_IMAGES[activeEmotion];

  return (
    <div
      ref={overlayRef}
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Blue dialogue'}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.headerBadgeJa}>対話</span>
            <div>
              <h2 className={styles.headerTitle}>{title || 'Blue'}</h2>
              {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.voiceButton} ${voiceEnabled ? styles.voiceButtonActive : ''}`}
              onClick={toggleVoice}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? 'Turn off voice readout' : 'Turn on voice readout'}
              title={voiceEnabled ? 'Voice readout on' : 'Voice readout off'}
            >
              {voiceEnabled ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.voiceIcon}
                  aria-hidden="true"
                >
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.voiceIcon}
                  aria-hidden="true"
                >
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={close}
              aria-label="Close dialogue"
            >
              ✕
            </button>
          </div>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.dialogueCol}>
            <div className={styles.dialogueContent} onClick={handleAdvance}>
              {typeof reward === 'number' && reward > 0 && (
                <div className={styles.rewardChip} role="status">
                  <Image
                    src="/icons/ui-diamond.svg"
                    alt=""
                    width={16}
                    height={16}
                    className={styles.rewardIcon}
                  />
                  <span>+{displayReward} credits</span>
                </div>
              )}
              <p className={styles.speechText} aria-live="polite">
                <span className={styles.quoteMark}>&ldquo;</span>
                {displayed}
                {isTyping && <span className={styles.cursor} aria-hidden="true" />}
                {!isTyping && <span className={styles.quoteMark}>&rdquo;</span>}
              </p>
            </div>

            <div className={styles.bottomRow}>
              <div className={styles.progressGroup}>
                <button
                  type="button"
                  className={styles.skipBtn}
                  onClick={handleSkip}
                >
                  Skip
                </button>
                {safeLines.length > 1 && (
                  <div
                    className={styles.stepIndicators}
                    aria-label={`Line ${safeIndex + 1} of ${safeLines.length}`}
                  >
                    {safeLines.map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.stepDot} ${i === safeIndex ? styles.stepDotActive : ''}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <CtaButton
                variant="primary"
                size="sm"
                onClick={handleAdvance}
              >
                {isTyping ? 'Continue' : isLastLine ? 'Done' : 'Next'}
              </CtaButton>
            </div>
          </div>

          <div className={styles.screenCol}>
            <div className={styles.screenFrame}>
              <div className={styles.screenStatusTag}>
                <span className={styles.statusDot} />
                <span>Online</span>
              </div>
              <Image
                src={emoteSrc}
                alt={`Blue, ${activeEmotion}`}
                width={240}
                height={240}
                priority
                className={styles.screenImage}
              />
              <div className={styles.screenBottomLabel}>
                Blue
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueDialogue;
