'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './SignFormModal.module.css';

interface SignFormModalProps {
  difficulty: number;
  shardReward: number;
  onLaunch: () => void;
  onClose: () => void;
}

export default function SignFormModal({ difficulty, shardReward, onLaunch, onClose }: SignFormModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canLaunch = agreed && hasSigned;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    setHasSigned(false);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Launch Authorization">
        <div className={styles.scanlines} aria-hidden="true" />
        <span className={styles.cornerBR} aria-hidden="true" />
        <span className={styles.cornerTR} aria-hidden="true" />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerLabel}>
              <span className={styles.statusDot} aria-hidden="true" />
              MWA-TEST-v1.0 // AUTHORIZATION REQUIRED
            </span>
            <span className={styles.headerTitle}>LAUNCH AUTHORIZATION</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <div className={styles.body}>

          {/* Legal content in Blue's voice */}
          <div className={styles.legalBlock}>

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>Your Data</span>
              <p className={styles.legalText}>
                your answers stay yours. we don&apos;t sell responses or share individual results with advertisers. difficulty: {difficulty}/200. reward: {shardReward} shards.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>How We Use It</span>
              <p className={styles.legalText}>
                anonymized patterns help improve tests and research. published findings use aggregate data, not your identity.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>What This Test Is</span>
              <p className={styles.legalText}>
                a research survey about decisions, stress, behavior, and emotional awareness. not a diagnosis, medical advice, or therapy. if something heavy comes up, talk to a qualified professional.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>Your Rights</span>
              <p className={styles.legalText}>
                you can exit any time. request deletion through settings or privacy@mwa.xyz. by continuing, you confirm you are 18 or older.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>Liability</span>
              <p className={styles.legalText}>
                results are informational. don&apos;t treat a score as the final word on a life decision.
              </p>
            </div>

          </div>

          {/* Agree checkbox */}
          <label className={styles.agreeRow}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span className={styles.agreeLabel}>
              i am 18 or older and choose to participate.
            </span>
          </label>

          {/* Signature pad */}
          <div className={styles.signatureSection}>
            <div className={styles.signatureLabel}>
              <span className={styles.signatureLabelText}>Draw Your Signature</span>
              <button className={styles.clearBtn} onClick={clearSignature} type="button">
                CLEAR
              </button>
            </div>
            <div className={styles.canvasWrapper}>
              <canvas
                ref={canvasRef}
                className={styles.signatureCanvas}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasSigned && (
                <div className={styles.signatureHint} aria-hidden="true">
                  <span className={styles.signatureHintText}>sign here</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div className={styles.footer}>
          <button
            className={styles.launchBtn}
            onClick={onLaunch}
            disabled={!canLaunch}
            type="button"
          >
            {canLaunch ? `LAUNCH QUEST +${shardReward} SHARDS` : 'AGREE + SIGN TO LAUNCH'}
          </button>
        </div>
      </div>
    </div>
  );
}
