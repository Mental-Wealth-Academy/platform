'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import { useScrollLock } from '@/hooks/useScrollLock';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
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

export interface DialogueChoice {
  label: string;
  onSelect: () => void;
}

export interface BlueDialogueProps {
  /** Controls whether the dialogue modal is mounted and visible. */
  open: boolean;
  /** Ordered dialogue lines. Automatically plays through them start to finish. */
  lines: string[];
  /** Sets the emotional family Blue varies through as the dialogue advances. */
  emotion?: BlueEmotion;
  /** Fired on close (all lines complete, ESC, backdrop click, or close button). */
  onClose: () => void;
  /** Milliseconds per typewritten character. */
  speed?: number;
  /** Diamond credit amount to present as a reward chip above the dialogue text. */
  reward?: number;
  /** Heading rendered above Blue's line, e.g. "Blue Superintelligence". */
  title?: string;
  /** Supporting line rendered under the title. */
  subtitle?: string;
  /** Retained for call-site compatibility. */
  placement?: 'bottom' | 'center';
  /** Deprecated: chat input is removed per design specifications. */
  chatback?: BlueChatback;
  /** Keep centered popup without dimming background backdrop. */
  clearBackdrop?: boolean;
  /** Optional interactive decision choices rendered as circular pill buttons at the bottom */
  choices?: DialogueChoice[];
  /** When true or when choices are present, prevents dialogue from closing automatically */
  disableAutoClose?: boolean;
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
  title = 'Blue Superintelligence',
  subtitle,
  choices,
  disableAutoClose = false,
}) => {
  const { play } = useSound();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeLines = useMemo(
    () => (lines.length > 0 ? lines : ['']),
    [lines],
  );

  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayReward, setDisplayReward] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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

  // Stop any in-flight fetch and pause any playing audio.
  const stopVoice = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    setIsPlayingAudio(false);
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

  // Read the active line aloud when voice is on.
  useEffect(() => {
    if (!open || !voiceEnabled) return;
    const line = sanitizeForSpeech(activeLine);
    if (!line) return;

    stopVoice();
    const controller = new AbortController();
    voiceAbortRef.current = controller;
    setIsPlayingAudio(true);
    fetchBlueAudio(line, controller.signal)
      .then((el) => {
        if (controller.signal.aborted) return;
        currentAudioRef.current = el;
        const handleEnded = () => setIsPlayingAudio(false);
        el.addEventListener('ended', handleEnded, { once: true });
        el.addEventListener('pause', handleEnded, { once: true });
        el.play().catch(() => {
          setIsPlayingAudio(false);
        });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setIsPlayingAudio(false);
        console.warn('[BlueDialogue] TTS failed:', err);
      });

    return () => {
      controller.abort();
      setIsPlayingAudio(false);
    };
  }, [open, voiceEnabled, activeLine, safeIndex, stopVoice]);

  // Cut audio when the dialogue closes.
  useEffect(() => {
    if (!open) stopVoice();
  }, [open, stopVoice]);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  // Reset to first line when opening or script lines change.
  useEffect(() => {
    if (!open) return;
    setLineIndex(0);
    clearAutoAdvance();
  }, [open, safeLines, clearAutoAdvance]);

  const clearTyping = useCallback(() => {
    if (typeTimer.current) {
      clearTimeout(typeTimer.current);
      typeTimer.current = null;
    }
  }, []);

  // Typewriter reveal for the active line.
  useEffect(() => {
    if (!open) return;
    clearTyping();
    clearAutoAdvance();

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
    typeTimer.current = setTimeout(step, 70);

    return clearTyping;
  }, [open, activeLine, speed, clearTyping, clearAutoAdvance]);

  const finishTyping = useCallback(() => {
    clearTyping();
    setDisplayed(activeLine);
    setIsTyping(false);
  }, [activeLine, clearTyping]);

  const close = useCallback(() => {
    play('navigation');
    stopVoice();
    clearAutoAdvance();
    onClose();
  }, [onClose, play, stopVoice, clearAutoAdvance]);

  // Advance automatically start to finish through the chats.
  useEffect(() => {
    if (!open || isTyping || isPlayingAudio) {
      clearAutoAdvance();
      return;
    }

    const hasChoices = Boolean(choices && choices.length > 0);
    const isLastLine = safeIndex >= safeLines.length - 1;

    // When choices exist or auto-close is disabled, stop at the last line so user can decide
    if (isLastLine && (disableAutoClose || hasChoices)) {
      clearAutoAdvance();
      return;
    }

    const readingDelay = Math.max(1600, activeLine.length * 32);

    const proceed = () => {
      if (safeIndex < safeLines.length - 1) {
        setLineIndex((n) => n + 1);
      } else if (!disableAutoClose && !hasChoices) {
        // Complete the dialogue automatically
        close();
      }
    };

    autoAdvanceTimer.current = setTimeout(proceed, readingDelay);
    return clearAutoAdvance;
  }, [open, isTyping, isPlayingAudio, safeIndex, safeLines.length, activeLine, close, clearAutoAdvance, disableAutoClose, choices]);

  // Click on dialogue allows user to fast-forward typing or advance early.
  const handleDialogueTap = useCallback(() => {
    play('click');
    clearAutoAdvance();
    if (isTyping) {
      finishTyping();
      return;
    }
    const hasChoices = Boolean(choices && choices.length > 0);
    if (safeIndex < safeLines.length - 1) {
      setLineIndex((n) => n + 1);
    } else if (!disableAutoClose && !hasChoices) {
      close();
    }
  }, [play, clearAutoAdvance, isTyping, finishTyping, safeIndex, safeLines.length, disableAutoClose, choices, close]);

  // Keyboard navigation: Escape closes; Space/Enter advances early.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDialogueTap();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, handleDialogueTap]);

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
      aria-label={title || 'Blue Superintelligence'}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.headerBadgeJa}>対話</span>
            <div>
              <h2 className={styles.headerTitle}>{title}</h2>
              {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.voiceButton} ${voiceEnabled ? styles.voiceButtonActive : ''}`}
              onClick={toggleVoice}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? 'Mute voice readout' : 'Enable voice readout'}
              title={voiceEnabled ? 'Voice readout on' : 'Voice readout muted'}
            >
              {voiceEnabled ? (
                /* Futuristic science beaker icon */
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
                  <path d="M9 3h6" />
                  <path d="M10 3v5.2L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 8.2V3" />
                  <path d="M7 15.5h10" />
                  <circle cx="10" cy="12.5" r="0.9" fill="currentColor" />
                  <circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" />
                </svg>
              ) : (
                /* Futuristic science beaker icon with mute slash */
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
                  <path d="M9 3h6" />
                  <path d="M10 3v5.2L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 8.2V3" />
                  <path d="M7 15.5h10" />
                  <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2.2" />
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
            <div className={styles.dialogueWrapper} onClick={handleDialogueTap}>
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

            {choices && choices.length > 0 && safeIndex === safeLines.length - 1 && (
              <div className={styles.choicesRow} role="group" aria-label="Dialogue decisions">
                {choices.slice(0, 2).map((choice, idx) => (
                  <button
                    key={`${choice.label}-${idx}`}
                    type="button"
                    className={`${styles.choicePill} ${idx === 0 ? styles.choicePillLeft : styles.choicePillRight}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      choice.onSelect();
                    }}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.characterCol}>
            <Image
              src={emoteSrc}
              alt={`Blue, ${activeEmotion}`}
              width={844}
              height={1004}
              priority
              className={styles.characterImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueDialogue;
