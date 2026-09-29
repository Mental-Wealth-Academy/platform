'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import type { VoiceConversation } from '@elevenlabs/client';
import CtaButton from '@/components/shared/CtaButton';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import styles from './BlueScene.module.css';

const DailyNotes = dynamic(() => import('@/components/daily-notes/DailyNotes'), { ssr: false });

export interface InitialMoodData {
  id: string;
  label: string;
  prompt: string;
  topic: string;
}

export const MOOD_FIRST_MESSAGES: Record<string, string> = {
  worry: "I hear you're dealing with worry and anxious thoughts right now. Take a steady breath. What's on your mind?",
  stress: "I hear you're feeling really stressed out today. Let's work through it together. What's weighing on you most?",
  heartbreak: "Heartbreak is really heavy, and I'm glad you came here. I'm listening. What's hurting right now?",
  notsure: "It's completely okay to feel off without knowing exactly why. Let's unpack it together. How are you feeling in your body right now?",
};

export const COMPANION_HISTORY_KEY = 'mwa_blue_companion_history';

interface BlueCompanionProps {
  companionVolumeRef: MutableRefObject<number>;
  companionMode: 'idle' | 'listening' | 'speaking';
  onModeChange: (mode: 'idle' | 'listening' | 'speaking') => void;
  initialMood?: InitialMoodData | null;
  onInitialMoodHandled?: () => void;
  onMuteChange?: (muted: boolean) => void;
  onRegisterMute?: (toggleFn: () => void, muted: boolean, isConnected: boolean) => void;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface ChatBubbleMessage {
  role: 'user' | 'agent';
  text: string;
}

export default function BlueCompanion({
  companionVolumeRef,
  companionMode,
  onModeChange,
  initialMood,
  onInitialMoodHandled,
  onMuteChange,
  onRegisterMute,
}: BlueCompanionProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [alwaysAllowMic, setAlwaysAllowMic] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getStorageItem('mwa_mic_always_allow') === 'true';
  });
  const autoStartedRef = useRef(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicError, setIsMicError] = useState(false);
  const [fieldNotesOpen, setFieldNotesOpen] = useState(false);
  const [connectingLabel, setConnectingLabel] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ChatBubbleMessage | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = getStorageItem(COMPANION_HISTORY_KEY, 'local');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const latest = parsed[parsed.length - 1];
          if (latest?.text) {
            return { role: latest.role === 'user' ? 'user' : 'agent', text: latest.text };
          }
        }
      }
    } catch {}
    return null;
  });

  const conversationRef = useRef<VoiceConversation | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'agent'; text: string; timestamp: number }>>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = getStorageItem(COMPANION_HISTORY_KEY, 'local');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          conversationHistoryRef.current = parsed.slice(-50);
        }
      }
    } catch {}
  }, []);

  const cleanupSession = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    companionVolumeRef.current = 0;
    onModeChange('idle');

    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
      } catch {
        // Ignored during shutdown
      }
      conversationRef.current = null;
    }
  }, [companionVolumeRef, onModeChange]);

  const startVolumeSampler = useCallback(
    (conversation: VoiceConversation) => {
      const sample = () => {
        if (conversationRef.current) {
          try {
            let level = 0;
            // Check frequency data first for sharp vowel/phoneme tracking
            if (typeof conversation.getOutputByteFrequencyData === 'function') {
              const freqData = conversation.getOutputByteFrequencyData();
              if (freqData && freqData.length > 0) {
                // Focus on human speech formant range (bins 2..120, ~80Hz - 4000Hz)
                const maxBin = Math.min(freqData.length, 120);
                let peak = 0;
                let sum = 0;
                for (let i = 2; i < maxBin; i++) {
                  const val = freqData[i];
                  if (val > peak) peak = val;
                  sum += val;
                }
                const avg = sum / (maxBin - 2);
                // Dynamic scaling mapping speech energy to fluid 0..1 range
                level = Math.max(avg / 75, peak / 160);
              }
            }

            // Fallback to getOutputVolume if frequency data is zero or unavailable
            if (level === 0 && typeof conversation.getOutputVolume === 'function') {
              const rawVol = conversation.getOutputVolume();
              if (typeof rawVol === 'number' && !Number.isNaN(rawVol)) {
                level = Math.max(0, (rawVol - 0.008) * 9.5);
              }
            }

            companionVolumeRef.current = Math.min(1, Math.max(0, level));
          } catch {
            companionVolumeRef.current = 0;
          }
          rafRef.current = requestAnimationFrame(sample);
        } else {
          companionVolumeRef.current = 0;
        }
      };
      rafRef.current = requestAnimationFrame(sample);
    },
    [companionVolumeRef],
  );

  const startConversation = useCallback(
    async (moodOverride?: InitialMoodData | null) => {
      await cleanupSession();

      setStatus('connecting');
      setErrorMessage(null);
      setIsMicError(false);
      setConnectingLabel(moodOverride ? moodOverride.label : null);

      const openingLine = moodOverride
        ? MOOD_FIRST_MESSAGES[moodOverride.id] || moodOverride.prompt
        : conversationHistoryRef.current.length > 0
          ? "Welcome back. I'm right here with you. What's on your mind now?"
          : null;

      if (openingLine) {
        conversationHistoryRef.current.push({ role: 'agent', text: openingLine, timestamp: Date.now() });
        setStorageItem(
          COMPANION_HISTORY_KEY,
          JSON.stringify(conversationHistoryRef.current.slice(-50)),
          'local',
        );
      }

      try {
        const res = await fetch('/api/voice/conversation-url');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to initialize companion credentials');
        }
        const { signedUrl } = await res.json();
        if (!signedUrl) {
          throw new Error('No signed URL returned from server');
        }

        const { Conversation } = await import('@elevenlabs/client');

        const conversation = await Conversation.startSession({
          signedUrl,
          overrides: openingLine
            ? {
                agent: {
                  firstMessage: openingLine,
                },
              }
            : undefined,
          dynamicVariables: moodOverride
            ? {
                user_mood: moodOverride.label,
                user_topic: moodOverride.topic,
                user_issue: moodOverride.prompt,
              }
            : undefined,
          onConnect: () => {
            setStatus('connected');
            setIsMicMuted(false);
            if (openingLine) {
              setLastMessage({
                role: 'agent',
                text: openingLine,
              });
            }
            if (conversationRef.current && conversationHistoryRef.current.length > 1) {
              const pastTurns = conversationHistoryRef.current.slice(-6);
              const summary = pastTurns
                .map((t) => `${t.role === 'user' ? 'User' : 'Blue'}: "${t.text.replace(/\s+/g, ' ').slice(0, 100)}"`)
                .join('; ');
              try {
                conversationRef.current.sendContextualUpdate(`Prior conversation earlier today: ${summary}`);
              } catch {}
            }
          },
          onDisconnect: () => {
            setStatus('idle');
            onModeChange('idle');
            companionVolumeRef.current = 0;
          },
          onError: (err) => {
            console.error('Conversation error:', err);
            setErrorMessage('Could not reach Blue right now.');
            setIsMicError(false);
            setStatus('error');
            onModeChange('idle');
            companionVolumeRef.current = 0;
          },
          onModeChange: ({ mode }) => {
            onModeChange(mode);
            if (mode === 'listening') {
              companionVolumeRef.current = 0;
            }
          },
          onStatusChange: ({ status: convStatus }) => {
            if (convStatus === 'connected') {
              setStatus('connected');
            } else if (convStatus === 'disconnected') {
              setStatus('idle');
              onModeChange('idle');
              companionVolumeRef.current = 0;
            } else if (convStatus === 'connecting') {
              setStatus('connecting');
            }
          },
          onMessage: (payload) => {
            if (payload?.message) {
              const role = payload.role === 'agent' ? 'agent' : 'user';
              conversationHistoryRef.current.push({
                role,
                text: payload.message,
                timestamp: Date.now(),
              });
              if (conversationHistoryRef.current.length > 50) {
                conversationHistoryRef.current = conversationHistoryRef.current.slice(-50);
              }
              setStorageItem(
                COMPANION_HISTORY_KEY,
                JSON.stringify(conversationHistoryRef.current),
                'local',
              );
              setLastMessage({
                role,
                text: payload.message,
              });
            }
          },
        });

        conversationRef.current = conversation as VoiceConversation;
        startVolumeSampler(conversation as VoiceConversation);
      } catch (err: unknown) {
        console.error('Error starting conversation:', err);
        let isMic = false;
        let message = 'Could not reach Blue right now.';
        if (err instanceof Error) {
          const lower = err.message.toLowerCase();
          if (
            err.name === 'NotAllowedError' ||
            lower.includes('permission') ||
            lower.includes('microphone') ||
            lower.includes('notallowed')
          ) {
            isMic = true;
            message = 'Microphone access needed.';
          } else if (
            err.message &&
            !lower.includes('failed to') &&
            !lower.includes('error') &&
            !lower.includes('500') &&
            !lower.includes('400') &&
            !lower.includes('status')
          ) {
            message = err.message;
          }
        }
        setIsMicError(isMic);
        setErrorMessage(message);
        setStatus('error');
        await cleanupSession();
      }
    },
    [cleanupSession, onModeChange, companionVolumeRef, startVolumeSampler],
  );

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;

    // Explicit interaction from MoodSelector: connect immediately
    if (initialMood) {
      void startConversation(initialMood);
      onInitialMoodHandled?.();
      return;
    }

    // Check user preference
    const userPrefersAlwaysAllow = getStorageItem('mwa_mic_always_allow');
    // If not opted in or explicitly disabled, do not auto-connect
    if (userPrefersAlwaysAllow !== 'true') {
      setStatus('idle');
      return;
    }

    // Check browser permission status if supported
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permission) => {
          // ONLY auto-connect if the browser has already granted permission,
          // ensuring we NEVER trigger an unsolicited permission prompt.
          if (permission.state === 'granted') {
            void startConversation(null);
          } else {
            setStatus('idle');
          }
        })
        .catch(() => {
          setStatus('idle');
        });
    } else {
      setStatus('idle');
    }
  }, [startConversation, initialMood, onInitialMoodHandled]);

  const endConversation = useCallback(async () => {
    await cleanupSession();
    setStatus('idle');
    setLastMessage(null);
  }, [cleanupSession]);

  const toggleMic = useCallback(() => {
    if (!conversationRef.current) return;
    const nextMuted = !isMicMuted;
    try {
      conversationRef.current.setMicMuted(nextMuted);
      setIsMicMuted(nextMuted);
      onMuteChange?.(nextMuted);
    } catch {
      // Ignored
    }
  }, [isMicMuted, onMuteChange]);

  useEffect(() => {
    onRegisterMute?.(toggleMic, isMicMuted, status === 'connected');
  }, [toggleMic, isMicMuted, status, onRegisterMute]);

  useEffect(() => {
    return () => {
      void cleanupSession();
    };
  }, [cleanupSession]);

  const handleOpenInChat = useCallback(
    async (agentText: string = '') => {
      await cleanupSession();
      const history = [...conversationHistoryRef.current];

      // Save complete voice conversation history so BlueChat can hydrate it immediately
      if (history.length > 0) {
        setStorageItem(
          'blue_companion_handoff',
          JSON.stringify({
            history,
            lastAgentText: agentText,
            timestamp: Date.now(),
          }),
          'session',
        );
      }

      if (agentText) {
        const lower = agentText.toLowerCase();
        let promptQuery = '';
        if (/\b(breathe|breathing|nervous system|somatic|grounding)\b/i.test(lower)) {
          promptQuery = 'show me guides on nervous system regulation';
        } else if (/\b(stress|burnout|overwhelm)\b/i.test(lower)) {
          promptQuery = 'show me guides on stress relief';
        } else if (/\b(anxiety|worry|panic)\b/i.test(lower)) {
          promptQuery = 'show me guides on anxiety';
        } else if (/\b(heartbreak|grief|sadness)\b/i.test(lower)) {
          promptQuery = 'show me guides on heartbreak and healing';
        } else if (/\b(shadow work|inner child)\b/i.test(lower)) {
          promptQuery = 'show me guides on shadow work';
        } else if (/\b(sleep|rest|insomnia)\b/i.test(lower)) {
          promptQuery = 'show me guides on sleep';
        } else if (/\b(prayer|bible|scripture|gratitude)\b/i.test(lower)) {
          promptQuery = 'give me a prayer and scripture on peace';
        } else if (/\b(guide|lesson|exercise|practice|technique|step|tool)\b/i.test(lower)) {
          promptQuery = 'show me guides and tools for this';
        } else {
          promptQuery = `Let's keep chatting about this: "${agentText.slice(0, 140)}"`;
        }

        router.push(`/blue?prompt=${encodeURIComponent(promptQuery)}`);
      } else {
        router.push('/blue');
      }
    },
    [cleanupSession, router],
  );

  return (
    <>
      {status === 'idle' && (
        <div className={styles.companionOverlay}>
          <div className={styles.companionCard}>
            <p className={styles.companionText}>Experience Therapeutic Intelligence</p>
            <CtaButton className={styles.companionCtaButton} onClick={() => void startConversation()}>
              Connect Now
            </CtaButton>
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className={styles.companionOverlay}>
          <div className={styles.companionCard}>
            <span className={styles.companionKicker}>Connecting</span>
            <p className={styles.companionText}>
              {connectingLabel
                ? `Talking about ${connectingLabel.toLowerCase()}...`
                : 'Connecting to Blue...'}
            </p>
            <div className={styles.companionConnectingDot} aria-hidden="true" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.companionOverlay}>
          <div className={styles.companionCard}>
            <span className={styles.companionKicker}>{isMicError ? 'Microphone' : 'Connection'}</span>
            <p className={styles.companionText}>
              {errorMessage || 'Could not reach Blue right now.'}
            </p>
            {isMicError && (
              <label className={styles.alwaysAllowLabel}>
                <input
                  type="checkbox"
                  checked={alwaysAllowMic}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAlwaysAllowMic(checked);
                    setStorageItem('mwa_mic_always_allow', checked ? 'true' : '0');
                  }}
                  className={styles.alwaysAllowCheckbox}
                />
                <span>Always allow microphone access</span>
              </label>
            )}
            <div className={styles.companionErrorActions}>
              <CtaButton
                onClick={async () => {
                  if (isMicError && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
                    try {
                      await navigator.mediaDevices.getUserMedia({ audio: true });
                      setStorageItem('mwa_mic_always_allow', 'true');
                      setAlwaysAllowMic(true);
                    } catch {}
                  }
                  void startConversation();
                }}
              >
                {isMicError ? 'Allow & Connect' : 'Try again'}
              </CtaButton>
              <button
                type="button"
                className={styles.dismissErrorBtn}
                onClick={() => {
                  if (isMicError) {
                    setAlwaysAllowMic(false);
                    setStorageItem('mwa_mic_always_allow', '0');
                  }
                  setStatus('idle');
                  setIsMicError(false);
                  setErrorMessage(null);
                }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <>
          {lastMessage && (
            <div className={styles.companionSubtitleBubble} aria-live="polite">
              <span className={styles.companionSubtitleSpeaker}>
                {lastMessage.role === 'agent' ? 'Blue' : 'You'}
              </span>
              <p className={styles.companionSubtitleText}>{lastMessage.text}</p>
            </div>
          )}

          <div className={styles.companionFooter}>
            <span
              className={`${styles.companionStatusChip} ${
                companionMode === 'speaking'
                  ? styles.companionStatusChipSpeaking
                  : isMicMuted
                    ? styles.companionStatusChipMuted
                    : styles.companionStatusChipListening
              }`}
            >
              {companionMode === 'speaking' ? (
                <>
                  <span className={styles.radioBars} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Blue is speaking
                </>
              ) : (
                <>
                  <span
                    className={`${styles.companionDot} ${
                      isMicMuted ? styles.companionDotMuted : styles.companionDotActive
                    }`}
                    aria-hidden="true"
                  />
                  {isMicMuted ? 'Mic muted' : 'Listening'}
                </>
              )}
            </span>

            <div className={styles.companionControls}>
              <button
                type="button"
                className={`${styles.companionMuteIconButton} ${isMicMuted ? styles.companionMuteIconButtonMuted : ''}`}
                onClick={toggleMic}
                aria-pressed={isMicMuted}
                aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                title={isMicMuted ? 'Microphone muted — tap to unmute' : 'Microphone active — tap to mute'}
              >
                {!isMicMuted ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={styles.companionOpenChatBtn}
                onClick={() => void handleOpenInChat(lastMessage?.text || '')}
                aria-label="Prefer typing? Open chat with Blue"
              >
                Prefer Typing?
              </button>
            </div>
          </div>
        </>
      )}

      {status !== 'connected' && (
        <div className={styles.companionIdleFooter}>
          <button
            type="button"
            className={styles.companionOpenChatBtn}
            onClick={() => void handleOpenInChat(lastMessage?.text || '')}
            aria-label="Prefer typing? Open chat with Blue"
          >
            Prefer Typing?
          </button>
        </div>
      )}

      {fieldNotesOpen && typeof document !== 'undefined' && createPortal(
        <div className={styles.fieldNotesModalOverlay} onClick={() => setFieldNotesOpen(false)}>
          <div className={styles.fieldNotesModalStage} onClick={(e) => e.stopPropagation()}>
            <DailyNotes
              enablePersistence={true}
              panelMode={true}
              onPanelClose={() => setFieldNotesOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
