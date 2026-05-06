'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './SignFormModal.module.css';

interface SignFormModalProps {
  difficulty: number;
  onLaunch: () => void;
  onClose: () => void;
}

export default function SignFormModal({ difficulty, onLaunch, onClose }: SignFormModalProps) {
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
                what you answer here stays yours. we don&apos;t sell your responses. we don&apos;t share individual results with advertisers, third parties, or anyone outside the mwa research team. your answers are encrypted in transit and at rest. difficulty level selected: {difficulty}/200.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>How We Use It</span>
              <p className={styles.legalText}>
                at the aggregate level, anonymized patterns from test data help us improve the engine and publish behavioral research. you as an individual are never the unit of analysis — only patterns across thousands of responses. your identity is never attached to published findings.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>What This Test Is</span>
              <p className={styles.legalText}>
                these questions measure cognitive load, stress response, behavioral tendencies, and emotional awareness. they are research instruments, not clinical assessments. this is not a diagnosis. not medical advice. not a replacement for professional support.
              </p>
              <p className={styles.legalText}>
                if something in the test surfaces something heavy — reach out to someone qualified. mwa is a tool for growth, not a substitute for care.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>Your Rights</span>
              <p className={styles.legalText}>
                you can exit at any time. your data can be deleted — request it through settings or email privacy@mwa.xyz. you can view your own results whenever you want. by continuing, you confirm you are 18 or older.
              </p>
            </div>

            <div className={styles.legalDivider} />

            <div className={styles.legalSection}>
              <span className={styles.legalHeading}>Liability</span>
              <p className={styles.legalText}>
                mwa research labs is not responsible for decisions you make based on your scores. test results are informational only — one input among many, not a final word on anything.
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
              i have read and understand the above. i am 18 or older and i am choosing to participate voluntarily. no tricks. no hidden terms. just science and consent.
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
            {canLaunch ? 'LAUNCH QUEST' : 'AGREE + SIGN TO LAUNCH'}
          </button>
        </div>
      </div>
    </div>
  );
}
