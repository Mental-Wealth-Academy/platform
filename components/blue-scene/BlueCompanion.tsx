'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import type { VoiceConversation } from '@elevenlabs/client';
import CtaButton from '@/components/shared/CtaButton';
import { setStorageItem } from '@/lib/safe-storage';
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

interface BlueCompanionProps {
  companionVolumeRef: MutableRefObject<number>;
  companionMode: 'idle' | 'listening' | 'speaking';
  onModeChange: (mode: 'idle' | 'listening' | 'speaking') => void;
  initialMood?: InitialMoodData | null;
  onInitialMoodHandled?: () => void;
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
}: BlueCompanionProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicError, setIsMicError] = useState(false);
  const [fieldNotesOpen, setFieldNotesOpen] = useState(false);
  const [connectingLabel, setConnectingLabel] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ChatBubbleMessage | null>(null);

  const conversationRef = useRef<VoiceConversation | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'agent'; text: string; timestamp: number }>>([]);
  const rafRef = useRef<number | null>(null);

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
        : null;

      conversationHistoryRef.current = openingLine
        ? [{ role: 'agent', text: openingLine, timestamp: Date.now() }]
        : [];

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
    if (initialMood) {
      void startConversation(initialMood);
      onInitialMoodHandled?.();
    }
  }, [initialMood, startConversation, onInitialMoodHandled]);

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
    } catch {
      // Ignored
    }
  }, [isMicMuted]);

  useEffect(() => {
    return () => {
      void cleanupSession();
    };
  }, [cleanupSession]);

  const handleOpenInChat = useCallback(
    async (agentText: string) => {
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
    },
    [cleanupSession, router],
  );

  return (
    <>
      {status === 'idle' && (
        <div className={styles.companionOverlay}>
          <div className={styles.companionCard}>
            <span className={styles.companionKicker}>Companion</span>
            <p className={styles.companionText}>Voice chat with Blue.</p>
            <CtaButton onClick={() => void startConversation()}>Talk with Blue</CtaButton>
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
            <CtaButton onClick={() => void startConversation()}>Try again</CtaButton>
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
              {lastMessage.role === 'agent' && (
                <div className={styles.companionSubtitleActions}>
                  {/\bfield\s*notes?\b/i.test(lastMessage.text) && (
                    <button
                      type="button"
                      className={styles.companionFieldNoteAction}
                      onClick={() => setFieldNotesOpen(true)}
                    >
                      Write Field Note
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.companionChatAction}
                    onClick={() => void handleOpenInChat(lastMessage.text)}
                  >
                    View in Chat
                  </button>
                </div>
              )}
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
                className={`${styles.companionButton} ${
                  isMicMuted ? styles.companionButtonMuted : ''
                }`}
                onClick={toggleMic}
                aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMicMuted ? 'Unmute mic' : 'Mute mic'}
              </button>

              <button
                type="button"
                className={styles.companionEndButton}
                onClick={endConversation}
                aria-label="End conversation session"
              >
                End
              </button>
            </div>
          </div>
        </>
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
