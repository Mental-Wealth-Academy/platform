'use client';

import React, { useEffect, useRef } from 'react';
import styles from './InfrastructureMatrixAnimation.module.css';

interface SiloConfig {
  name: string;
  dotClass: string;
  cx: number;
}

const SILOS: SiloConfig[] = [
  { name: 'Blackboard', dotClass: styles.dotBlackboard, cx: 130 },
  { name: 'Moodle', dotClass: styles.dotMoodle, cx: 320 },
  { name: 'Canvas', dotClass: styles.dotCanvas, cx: 510 },
];

// 5 nodes per silo: 3 active, 2 isolated
const LOCAL_NODES = [
  { dx: -34, dy: 60, isolated: false },
  { dx: 34, dy: 60, isolated: true },
  { dx: 0, dy: 110, isolated: false },
  { dx: -34, dy: 160, isolated: true },
  { dx: 34, dy: 160, isolated: false },
];

export const InfrastructureMatrixAnimation: React.FC = () => {
  const packetsRef = useRef<(SVGCircleElement | null)[]>([]);
  const nodesRef = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;

      // Pulse local nodes in each silo
      let nodeIdx = 0;
      SILOS.forEach((silo) => {
        LOCAL_NODES.forEach((local, i) => {
          const el = nodesRef.current[nodeIdx++];
          if (!el) return;
          const floatY = Math.sin(elapsed * 2 + i + silo.cx) * 3;
          const floatX = Math.cos(elapsed * 1.5 + i) * 2;
          el.setAttribute(
            'transform',
            `translate(${(silo.cx + local.dx + floatX).toFixed(1)}, ${(local.dy + floatY).toFixed(1)})`
          );
        });
      });

      // Animate packet attempts between silos that dissolve at barriers
      packetsRef.current.forEach((pkt, idx) => {
        if (!pkt) return;
        const speed = 0.5;
        const progress = (elapsed * speed + idx * 0.5) % 1; // 0 to 1

        let startX = 130;
        let endX = 220;
        let y = 110;

        if (idx === 1) {
          startX = 320;
          endX = 230;
          y = 160;
        } else if (idx === 2) {
          startX = 320;
          endX = 410;
          y = 110;
        } else if (idx === 3) {
          startX = 510;
          endX = 420;
          y = 160;
        }

        const currX = startX + (endX - startX) * progress;
        // Fade out as it nears the silo boundary
        const opacity = progress < 0.75 ? 0.9 : Math.max(0, (1 - progress) * 3.6);

        pkt.setAttribute('cx', currX.toFixed(1));
        pkt.setAttribute('cy', y.toString());
        pkt.setAttribute('opacity', opacity.toFixed(2));
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg className={styles.canvas} viewBox="0 0 640 400" role="presentation">
        {/* Severed Connection Tracks Between Silos */}
        <line x1="195" y1="110" x2="255" y2="110" className={styles.crossLine} />
        <line x1="195" y1="160" x2="255" y2="160" className={styles.crossLine} />

        <line x1="385" y1="110" x2="445" y2="110" className={styles.crossLine} />
        <line x1="385" y1="160" x2="445" y2="160" className={styles.crossLine} />

        {/* Barrier Indicators at Boundaries */}
        <g transform="translate(225, 135)">
          <circle cx="0" cy="0" r="14" className={styles.barrierBadge} />
          {/* Severed / blocked icon */}
          <line x1="-5" y1="-5" x2="5" y2="5" className={styles.barrierIcon} />
          <line x1="5" y1="-5" x2="-5" y2="5" className={styles.barrierIcon} />
        </g>

        <g transform="translate(415, 135)">
          <circle cx="0" cy="0" r="14" className={styles.barrierBadge} />
          <line x1="-5" y1="-5" x2="5" y2="5" className={styles.barrierIcon} />
          <line x1="5" y1="-5" x2="-5" y2="5" className={styles.barrierIcon} />
        </g>

        {/* Data Packets Attempting to Bridge Silos */}
        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            ref={(el) => {
              packetsRef.current[i] = el;
            }}
            r="4"
            className={i % 2 === 0 ? styles.packetActive : styles.packetMoodle}
          />
        ))}

        {/* Silos */}
        {SILOS.map((silo) => (
          <g key={silo.name}>
            {/* Silo Container Shell */}
            <rect
              x={silo.cx - 65}
              y={25}
              width={130}
              height={190}
              className={styles.siloShell}
            />

            {/* Internal Wire Loops */}
            <path
              d={`M ${silo.cx - 34} 60 L ${silo.cx} 110 L ${silo.cx + 34} 60 M ${silo.cx - 34} 160 L ${silo.cx} 110 L ${silo.cx + 34} 160`}
              className={styles.intraLine}
            />

            {/* Silo Nav-style Pill Label */}
            <g transform={`translate(${silo.cx}, 25)`}>
              <rect
                x="-48"
                y="-13"
                width="96"
                height="26"
                rx="13"
                className={styles.siloLabelBg}
              />
              <circle cx="-34" cy="0" r="3.5" className={silo.dotClass} />
              <text x="-24" y="4" className={styles.siloLabelText}>
                {silo.name}
              </text>
            </g>
          </g>
        ))}

        {/* Local Nodes */}
        {SILOS.flatMap((silo, sIdx) =>
          LOCAL_NODES.map((local, nIdx) => {
            const globalIdx = sIdx * LOCAL_NODES.length + nIdx;
            return (
              <g
                key={`${silo.name}-${nIdx}`}
                ref={(el) => {
                  nodesRef.current[globalIdx] = el;
                }}
                transform={`translate(${silo.cx + local.dx}, ${local.dy})`}
              >
                {local.isolated ? (
                  <>
                    <circle r="8" className={styles.nodeIsolatedRing} />
                    <circle r="4.5" className={styles.nodeIsolated} />
                  </>
                ) : (
                  <>
                    <circle r="8" className={styles.nodeNormalRing} />
                    <circle r="4.5" className={styles.nodeNormal} />
                  </>
                )}
              </g>
            );
          })
        )}
      </svg>
      <div className={styles.caption}>
        <span>Legacy platforms isolate learners in stagnant, disconnected silos</span>
      </div>
    </div>
  );
};

export default InfrastructureMatrixAnimation;
