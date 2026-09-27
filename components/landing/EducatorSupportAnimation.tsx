'use client';

import React, { useEffect, useRef } from 'react';
import styles from './EducatorSupportAnimation.module.css';

interface LearnerNode {
  baseAngle: number;
  speed: number;
  radius: number;
  isDropout: boolean;
  driftRate: number;
}

const NODES: LearnerNode[] = [
  // 3 connected active learners (30%)
  { baseAngle: 0.3, speed: 0.6, radius: 100, isDropout: false, driftRate: 0 },
  { baseAngle: 2.1, speed: 0.55, radius: 110, isDropout: false, driftRate: 0 },
  { baseAngle: 4.2, speed: 0.65, radius: 105, isDropout: false, driftRate: 0 },
  // 7 dropout / disconnected learners (70%)
  { baseAngle: 1.0, speed: 0.35, radius: 150, isDropout: true, driftRate: 0.8 },
  { baseAngle: 1.6, speed: 0.4, radius: 165, isDropout: true, driftRate: 1.1 },
  { baseAngle: 2.8, speed: 0.3, radius: 155, isDropout: true, driftRate: 0.7 },
  { baseAngle: 3.5, speed: 0.45, radius: 175, isDropout: true, driftRate: 1.2 },
  { baseAngle: 4.9, speed: 0.32, radius: 160, isDropout: true, driftRate: 0.9 },
  { baseAngle: 5.4, speed: 0.38, radius: 170, isDropout: true, driftRate: 1.0 },
  { baseAngle: 6.0, speed: 0.42, radius: 180, isDropout: true, driftRate: 1.3 },
];

export const EducatorSupportAnimation: React.FC = () => {
  const wavesRef = useRef<(SVGCircleElement | null)[]>([]);
  const tethersRef = useRef<(SVGLineElement | null)[]>([]);
  const nodesRef = useRef<(SVGGElement | null)[]>([]);
  const hubRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;

      // Pulse expanding waves from educator hub
      wavesRef.current.forEach((wave, idx) => {
        if (!wave) return;
        const phase = (elapsed * 0.4 + idx * 0.33) % 1;
        const currentR = 25 + phase * 160;
        const opacity = Math.max(0, (1 - phase) * 0.55);
        wave.setAttribute('r', currentR.toFixed(1));
        wave.setAttribute('opacity', opacity.toFixed(2));
      });

      // Hub subtle breath
      if (hubRef.current) {
        const hubScale = 1 + 0.06 * Math.sin(elapsed * 2.5);
        hubRef.current.setAttribute('r', (18 * hubScale).toFixed(1));
      }

      // Orbit and drift nodes
      NODES.forEach((node, idx) => {
        const angle = node.baseAngle + elapsed * node.speed * 0.4;
        const rJitter = node.isDropout
          ? node.radius + Math.sin(elapsed * 1.5 + idx) * 12
          : node.radius + Math.sin(elapsed * 2 + idx) * 5;

        // Elliptical coordinate projection
        const cx = 320 + Math.cos(angle) * rJitter * 1.3;
        const cy = 180 + Math.sin(angle) * rJitter * 0.72;

        const nodeEl = nodesRef.current[idx];
        if (nodeEl) {
          nodeEl.setAttribute('transform', `translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`);
        }

        const tetherEl = tethersRef.current[idx];
        if (tetherEl) {
          tetherEl.setAttribute('x2', cx.toFixed(1));
          tetherEl.setAttribute('y2', cy.toFixed(1));
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg className={styles.canvas} viewBox="0 0 640 400" role="presentation">
        {/* Ambient Orbit Tracks */}
        <ellipse cx="320" cy="180" rx="135" ry="76" className={styles.orbitTrack} />
        <ellipse cx="320" cy="180" rx="215" ry="120" className={styles.orbitTrack} strokeOpacity="0.4" />

        {/* Radiating engagement waves */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            ref={(el) => {
              wavesRef.current[i] = el;
            }}
            cx="320"
            cy="180"
            r="30"
            className={styles.wave}
          />
        ))}

        {/* Connection Tethers */}
        {NODES.map((node, i) => (
          <line
            key={i}
            ref={(el) => {
              tethersRef.current[i] = el;
            }}
            x1="320"
            y1="180"
            x2="320"
            y2="180"
            className={node.isDropout ? styles.tetherBroken : styles.tetherActive}
          />
        ))}

        {/* Central Educator Mentor Beacon */}
        <circle cx="320" cy="180" r="26" className={styles.hubRing} />
        <circle ref={hubRef} cx="320" cy="180" r="18" className={styles.hub} />
        {/* Mentor icon symbol */}
        <circle cx="320" cy="176" r="4.5" className={styles.hubIcon} />
        <path
          d="M312 188 C312 183, 316 182, 320 182 C324 182, 328 183, 328 188 Z"
          className={styles.hubIcon}
        />

        {/* Learner Nodes */}
        {NODES.map((node, i) => (
          <g
            key={i}
            ref={(el) => {
              nodesRef.current[i] = el;
            }}
          >
            {node.isDropout ? (
              <>
                <circle r="9" className={styles.nodeDropoutRing} />
                <circle r="5" className={styles.nodeDropout} />
              </>
            ) : (
              <>
                <circle r="10" className={styles.nodeActiveRing} />
                <circle r="6" className={styles.nodeActive} />
              </>
            )}
          </g>
        ))}

        {/* 70% Disconnected Metric Pill */}
        <g transform="translate(420, 48)">
          <rect x="0" y="0" width="168" height="32" rx="16" className={styles.statBadge} />
          <circle cx="16" cy="16" r="4.5" className={styles.statDot} />
          <text x="28" y="21" className={styles.statText}>
            70% unsupported
          </text>
        </g>
      </svg>
      <div className={styles.caption}>
        <span>Up to 70% of educators report lack of modern engagement tools</span>
      </div>
    </div>
  );
};

export default EducatorSupportAnimation;
