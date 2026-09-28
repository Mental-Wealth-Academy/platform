'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import CtaButton from '@/components/shared/CtaButton';
import styles from './BlueScene.module.css';

interface BlueCompanionProps {
  companionVolumeRef: MutableRefObject<number>;
  companionMode: 'idle' | 'listening' | 'speaking';
  onModeChange: (mode: 'idle' | 'listening' | 'speaking') => void;
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
}: BlueCompanionProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const startConversation = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(null);
    setLastMessage(null);

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
        onConnect: () => {
          setStatus('connected');
          setIsMicMuted(false);
        },
        onDisconnect: () => {
          setStatus('idle');
          onModeChange('idle');
          companionVolumeRef.current = 0;
        },
        onError: (err) => {
          const detail = typeof err === 'string' ? err : 'Connection error occurred';
          setErrorMessage(detail);
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
      const message =
        err instanceof Error ? err.message : 'Could not establish connection with Blue.';
      setErrorMessage(message);
      setStatus('error');
      await cleanupSession();
    }
  }, [cleanupSession, onModeChange, companionVolumeRef, startVolumeSampler]);

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
          <CtaButton onClick={startConversation}>Start conversation</CtaButton>
        </div>
      )}

      {status === 'connecting' && (
        <div className={styles.companionOverlay}>
          <span className={styles.radioTuneInKicker}>Connecting</span>
          <p className={styles.radioTuneInText}>
            Establishing voice connection with Blue...
          </p>
          <div className={styles.companionConnectingDot} aria-hidden="true" />
        </div>
      )}

      {status === 'error' && (
        <div className={styles.companionOverlay}>
          <span className={styles.companionErrorKicker}>Connection issue</span>
          <p className={styles.radioTuneInText}>
            {errorMessage || 'Unable to start voice session. Check microphone access.'}
          </p>
          <CtaButton onClick={startConversation}>Try again</CtaButton>
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
