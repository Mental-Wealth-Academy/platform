'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import CtaButton from '@/components/shared/CtaButton';
import styles from './BlueScene.module.css';

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
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectingLabel, setConnectingLabel] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ChatBubbleMessage | null>(null);

  const conversationRef = useRef<VoiceConversation | null>(null);
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
            const vol = conversation.getOutputVolume();
            companionVolumeRef.current = typeof vol === 'number' && !Number.isNaN(vol) ? vol : 0;
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
      setConnectingLabel(moodOverride ? moodOverride.label : null);

      const openingLine = moodOverride
        ? MOOD_FIRST_MESSAGES[moodOverride.id] || moodOverride.prompt
        : null;

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
            setErrorMessage("Blue couldn't connect right now. Tap below to try again.");
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
              setLastMessage({
                role: payload.role === 'agent' ? 'agent' : 'user',
                text: payload.message,
              });
            }
          },
        });

        conversationRef.current = conversation as VoiceConversation;
        startVolumeSampler(conversation as VoiceConversation);
      } catch (err: unknown) {
        console.error('Error starting conversation:', err);
        let message = "Blue couldn't connect right now. Tap below to try again.";
        if (err instanceof Error) {
          const lower = err.message.toLowerCase();
          if (
            err.name === 'NotAllowedError' ||
            lower.includes('permission') ||
            lower.includes('microphone') ||
            lower.includes('notallowed')
          ) {
            message = 'Microphone access is needed for Blue to hear you. Check your browser settings and try again.';
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

  return (
    <>
      {status === 'idle' && (
        <div className={styles.companionOverlay}>
          <span className={styles.radioTuneInKicker}>Blue Companion</span>
          <p className={styles.radioTuneInText}>
            Talk directly with Blue in real time using your voice.
          </p>
          <CtaButton onClick={() => void startConversation()}>Start conversation</CtaButton>
        </div>
      )}

      {status === 'connecting' && (
        <div className={styles.companionOverlay}>
          <span className={styles.radioTuneInKicker}>Connecting</span>
          <p className={styles.radioTuneInText}>
            {connectingLabel
              ? `Connecting with Blue to talk about ${connectingLabel.toLowerCase()}...`
              : 'Establishing voice connection with Blue...'}
          </p>
          <div className={styles.companionConnectingDot} aria-hidden="true" />
        </div>
      )}

      {status === 'error' && (
        <div className={styles.companionOverlay}>
          <span className={styles.radioTuneInKicker}>Just a moment</span>
          <p className={styles.radioTuneInText}>
            {errorMessage || "Blue couldn't connect right now. Tap below to try again."}
          </p>
          <CtaButton onClick={() => void startConversation()}>Try again</CtaButton>
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
    </>
  );
}
