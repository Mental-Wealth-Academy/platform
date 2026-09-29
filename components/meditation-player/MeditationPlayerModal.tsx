'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks/useScrollLock';
import styles from './MeditationPlayerModal.module.css';

export type MeditationTrackKey = 'twenty-minute-reset' | 'meditation-ocean-432hz';

interface TrackMeta {
  key: MeditationTrackKey;
  label: string;
  title: string;
  subtitle: string;
  file: string;
  defaultDuration: number;
}

const TRACKS: Record<MeditationTrackKey, TrackMeta> = {
  'twenty-minute-reset': {
    key: 'twenty-minute-reset',
    label: 'Voice Reset',
    title: '20-Minute Reset',
    subtitle: 'Voice-guided meditation with Blue',
    file: '/audio/blue-radio/twenty-minute-reset.mp3',
    defaultDuration: 1200,
  },
  'meditation-ocean-432hz': {
    key: 'meditation-ocean-432hz',
    label: 'Ocean 432Hz',
    title: 'Ocean 432Hz Soundscape',
    subtitle: 'Restorative alpha-frequency wave immersion',
    file: '/audio/blue-radio/meditation-ocean-432hz.mp3',
    defaultDuration: 1200,
  },
};

interface MeditationPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrack?: MeditationTrackKey;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MeditationPlayerModal({
  isOpen,
  onClose,
  initialTrack = 'twenty-minute-reset',
}: MeditationPlayerModalProps) {
  useScrollLock(isOpen);

  const [activeTrackKey, setActiveTrackKey] = useState<MeditationTrackKey>(initialTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(TRACKS[initialTrack].defaultDuration);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack = TRACKS[activeTrackKey] || TRACKS['twenty-minute-reset'];

  // Sync initial track when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTrackKey(initialTrack);
    }
  }, [isOpen, initialTrack]);

  // Audio loading & auto-play on open or track switch
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = activeTrack.file;
    audio.volume = isMuted ? 0 : volume;
    setCurrentTime(0);

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isOpen, activeTrackKey, activeTrack.file, isMuted, volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.volume = nextMuted ? 0 : volume;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === 'undefined') return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Meditation Player"
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.headerIcon} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6a6 6 0 0 0-6 6c0 3.31 2.69 6 6 6s6-2.69 6-6" />
              </svg>
            </div>
            <div>
              <span className={styles.kicker}>Mental Wealth Academy</span>
              <h2 className={styles.title}>Meditation Space</h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close meditation player"
          >
            ✕
          </button>
        </header>

        {/* Track Selection Tabs */}
        <div className={styles.trackTabs} role="tablist" aria-label="Meditation tracks">
          <button
            type="button"
            role="tab"
            aria-selected={activeTrackKey === 'twenty-minute-reset'}
            className={`${styles.trackTab} ${activeTrackKey === 'twenty-minute-reset' ? styles.trackTabActive : ''}`}
            onClick={() => setActiveTrackKey('twenty-minute-reset')}
          >
            20-Min Reset
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTrackKey === 'meditation-ocean-432hz'}
            className={`${styles.trackTab} ${activeTrackKey === 'meditation-ocean-432hz' ? styles.trackTabActive : ''}`}
            onClick={() => setActiveTrackKey('meditation-ocean-432hz')}
          >
            Ocean 432Hz
          </button>
        </div>

        {/* Player Body */}
        <div className={styles.body}>
          {/* Breathing Aura */}
          <div className={styles.auraWrapper} aria-hidden="true">
            <div className={styles.auraRingOuter} />
            <div className={styles.auraPulse}>
              <span className={styles.breathLabel}>Breathe</span>
              <span className={styles.breathCue}>Steady</span>
            </div>
          </div>

          {/* Track Details */}
          <div className={styles.trackInfo}>
            <h3 className={styles.trackTitle}>{activeTrack.title}</h3>
            <p className={styles.trackSubtitle}>{activeTrack.subtitle}</p>
          </div>

          {/* Timeline & Scrubber */}
          <div className={styles.timeline}>
            <div
              className={styles.sliderTrack}
              onClick={handleSeek}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-label="Seek time"
            >
              <div
                className={styles.sliderFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className={styles.timeRow}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className={styles.controlsRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleSkip(-15)}
              aria-label="Rewind 15 seconds"
              title="Rewind 15s"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                <text x="12" y="15" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">15</text>
              </svg>
            </button>

            <button
              type="button"
              className={styles.playPauseBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause meditation' : 'Play meditation'}
            >
              {isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
                  <path d="M5 3.87v16.26a1 1 0 0 0 1.52.85l13.14-8.13a1 1 0 0 0 0-1.7L6.52 3.02A1 1 0 0 0 5 3.87z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleSkip(15)}
              aria-label="Skip ahead 15 seconds"
              title="Skip ahead 15s"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                <text x="12" y="15" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">15</text>
              </svg>
            </button>
          </div>

          {/* Volume Control */}
          <div className={styles.volumeRow}>
            <button
              type="button"
              className={styles.volumeBtn}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {!isMuted && volume > 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className={styles.volumeSlider}
              aria-label="Volume slider"
            />
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
          playsInline
        />
      </div>
    </div>,
    document.body
  );
}
