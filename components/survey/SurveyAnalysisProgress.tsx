'use client';

import React, { useEffect, useState } from 'react';
import styles from './SurveyAnalysisProgress.module.css';

interface SurveyAnalysisProgressProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const ANALYSIS_STAGES = [
  'Compiling response patterns...',
  'Mapping cognitive & emotional dimensions...',
  'Calibrating psychological traits against clinical norm...',
  'Synthesizing archetype profile & signature insights...',
];

export default function SurveyAnalysisProgress({
  onComplete,
  minDurationMs = 2800,
}: SurveyAnalysisProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDurationMs) * 100), 100);
      setProgress(pct);

      if (pct < 30) setStageIndex(0);
      else if (pct < 60) setStageIndex(1);
      else if (pct < 88) setStageIndex(2);
      else setStageIndex(3);

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete?.();
        }, 300);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  return (
    <div className={styles.container} role="status" aria-live="polite">
      {/* Title */}
      <h2 className={styles.heading}>Your archetype analysis is in progress</h2>

      {/* Hero Visual Display (Matching Image 3) */}
      <div className={styles.visualStage}>
        {/* Floating background ambient data nodes */}
        <span className={`${styles.dataNode} ${styles.dataNode1}`} aria-hidden="true">◎</span>
        <span className={`${styles.dataNode} ${styles.dataNode2}`} aria-hidden="true">⬡</span>
        <span className={`${styles.dataNode} ${styles.dataNode3}`} aria-hidden="true">✦</span>
        <span className={`${styles.dataNode} ${styles.dataNode4}`} aria-hidden="true">⌘</span>

        {/* Stacked background report cards */}
        <div className={styles.cardBack} aria-hidden="true">
          <div className={styles.cardBackHeader}>
            <span className={styles.miniPill} />
            <span className={styles.miniPill} />
            <span className={styles.miniPill} />
          </div>
          <div className={styles.cardBackLines}>
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '70%' }} />
          </div>
        </div>

        <div className={styles.cardMid} aria-hidden="true">
          {/* Radar spider chart SVG */}
          <div className={styles.radarWrapper}>
            <svg viewBox="0 0 160 160" className={styles.radarSvg}>
              {/* Concentric polygons */}
              <polygon points="80,15 145,55 145,115 80,150 15,115 15,55" className={styles.radarRing} />
              <polygon points="80,35 125,65 125,105 80,130 35,105 35,65" className={styles.radarRing} />
              <polygon points="80,55 105,72 105,95 80,110 55,95 55,72" className={styles.radarRing} />
              {/* Axes */}
              <line x1="80" y1="15" x2="80" y2="150" className={styles.radarAxis} />
              <line x1="15" y1="55" x2="145" y2="115" className={styles.radarAxis} />
              <line x1="15" y1="115" x2="145" y2="55" className={styles.radarAxis} />
              {/* Active data fill */}
              <polygon
                points="80,25 135,70 120,110 80,138 25,100 40,60"
                className={styles.radarDataPoly}
              />
              <circle cx="80" cy="25" r="3.5" className={styles.radarDot} />
              <circle cx="135" cy="70" r="3.5" className={styles.radarDot} />
              <circle cx="120" cy="110" r="3.5" className={styles.radarDot} />
              <circle cx="80" cy="138" r="3.5" className={styles.radarDot} />
              <circle cx="25" cy="100" r="3.5" className={styles.radarDot} />
              <circle cx="40" cy="60" r="3.5" className={styles.radarDot} />
            </svg>
          </div>
        </div>

        {/* Foreground console plate with circular arc gauge and scanner */}
        <div className={styles.consolePlate}>
          {/* Side dot status indicators */}
          <div className={styles.consoleLeftPins} aria-hidden="true">
            <span className={`${styles.pinDot} ${styles.pinDotCyan}`} />
            <span className={`${styles.pinDot} ${styles.pinDotWhite}`} />
            <span className={`${styles.pinDot} ${styles.pinDotPurple}`} />
            <span className={`${styles.pinDot} ${styles.pinDotRose}`} />
          </div>

          {/* Central circular arc gauge */}
          <div className={styles.gaugeContainer} aria-hidden="true">
            <svg viewBox="0 0 100 100" className={styles.gaugeSvg}>
              {/* Background circle */}
              <circle cx="50" cy="50" r="40" className={styles.gaugeBgCircle} />
              {/* Animated progress arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className={styles.gaugeArc}
                style={{
                  strokeDasharray: '251.2',
                  strokeDashoffset: `${251.2 - (251.2 * progress) / 100}`,
                }}
              />
              {/* Center readout */}
              <text x="50" y="55" textAnchor="middle" className={styles.gaugePercent}>
                {progress}%
              </text>
            </svg>
          </div>

          <div className={styles.consoleRightPins} aria-hidden="true">
            <span className={`${styles.pinDot} ${styles.pinDotCyan}`} />
            <span className={`${styles.pinDot} ${styles.pinDotWhite}`} />
            <span className={`${styles.pinDot} ${styles.pinDotPurple}`} />
            <span className={`${styles.pinDot} ${styles.pinDotRose}`} />
          </div>

          {/* Live scanner text bubble */}
          <div className={styles.scannerBadge}>
            <span className={styles.scannerPulse} />
            <span className={styles.scannerLabel}>{ANALYSIS_STAGES[stageIndex]}</span>
          </div>

          {/* Horizontal progress bar */}
          <div className={styles.progressBarWrapper} aria-hidden="true">
            <div className={styles.progressBarFill} style={{ width: `${progress}%` }}>
              <span className={styles.progressBarGlow} />
            </div>
          </div>
        </div>
      </div>

      <p className={styles.subtext}>
        Blue is decoding your psychological baseline and synthesizing your archetype report.
      </p>
    </div>
  );
}
