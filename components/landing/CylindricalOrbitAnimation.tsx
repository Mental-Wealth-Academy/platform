'use client';

import React, { useEffect, useRef } from 'react';
import styles from './CylindricalOrbitAnimation.module.css';

const round1 = (val: number) => Math.round(10 * val) / 10;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// Generate elliptical arc path string with 49 sampled points
const createArc = (startDeg: number, endDeg: number) => {
  const points = Array.from({ length: 49 }, (_, i) => {
    const rad = ((startDeg + ((endDeg - startDeg) * i) / 48) * Math.PI) / 180;
    return `${round1(320 + 196 * Math.cos(rad))} ${round1(250 + 78 * Math.sin(rad))}`;
  });
  return `M${points.join('L')}`;
};

// 4 vertical orbit levels
const LEVELS = Array.from({ length: 4 }, (_, t) => ({
  blue: createArc(90 + 90 * t, 90 + (t + 1) * 90),
  lift: 1.5 - t,
  depth: 1 - t / 3,
}));

const FULL_ELLIPSE = createArc(0, 360);

const getLevel = (index: number) => {
  const lvl = LEVELS[index];
  if (!lvl) throw new Error(`Level index out of range: ${index}`);
  return lvl;
};

const getRingTransform = (lift: number, depth: number, progress: number) => {
  const scale = 1 + (0.5 - depth) * 0 * progress;
  return `translate(${round1(320 * (1 - scale))} ${round1(250 * (1 - scale) + 62 * lift * progress)}) scale(${Math.round(1e3 * scale) / 1e3})`;
};

const getRingOpacity = (depth: number, progress: number) => round1(1 - 0.65 * depth * Math.min(1, progress));

const SEAM_ANGLES = [90, 210, 330];

const getSeamCoords = (levelIndex: number, angleDeg: number, progress: number) => {
  const lvl = getLevel(levelIndex);
  const scale = 1 + (0.5 - lvl.depth) * 0 * progress;
  const liftY = 62 * lvl.lift * progress;
  const rad = (angleDeg * Math.PI) / 180;
  const y = 250 + 78 * Math.sin(rad);
  return {
    x: round1(320 + 196 * Math.cos(rad)),
    y: round1(y * scale + 250 * (1 - scale) + liftY),
  };
};

// 20 orbital nodes distributed across the 4 levels
const NODES = Array.from({ length: 20 }, (_, t) => ({
  level: t % 4,
  speed: 0.55 + ((5 * t) % 4) * 0.09,
  phase: 1.63 * t,
  wb: 0.35 + ((7 * t) % 4) * 0.11,
  pb: 1.3 * t,
  wj: 0.8 + ((3 * t) % 3) * 0.25,
  pj: 2.4 * t,
}));

const getNodeCoords = (levelIndex: number, angleRad: number, progress: number, jitter = 0) => {
  const lvl = getLevel(levelIndex);
  const scale = 1 + (0.5 - lvl.depth) * 0 * progress;
  const liftY = 62 * lvl.lift * progress;
  const x = 320 + 196 * (1 + jitter) * Math.cos(angleRad);
  const y = 250 + 78 * (1 + jitter) * Math.sin(angleRad);
  return {
    x: round1(x * scale + 320 * (1 - scale)),
    y: round1(y * scale + 250 * (1 - scale) + liftY),
    s: scale,
  };
};

const TRACK_ROTATION_SPEEDS = [-4.3, 1.4, -1.4, 4.3];

const getCoreFill = (progress: number) => {
  const t = smoothstep(Math.min(1, progress));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(37, 154)} ${lerp(99, 166)} ${lerp(235, 192)})`;
};

const easeCubic = (val: number) => (val < 0.5 ? 4 * val * val * val : 1 - (-2 * val + 2) ** 3 / 2);

const computeProgress = (timeSec: number) => {
  const t = ((timeSec % 10) + 10) % 10;
  return t < 2 ? 0 : t < 3.6 ? easeCubic((t - 2) / 1.6) : t < 8 ? 1 : t < 9.6 ? 1 - easeCubic((t - 8) / 1.6) : 0;
};

export const CylindricalOrbitAnimation: React.FC = () => {
  const ringGroupsRef = useRef<(SVGGElement | null)[]>([]);
  const ringPathsRef = useRef<(SVGPathElement | null)[]>([]);
  const blueArcsRef = useRef<(SVGPathElement | null)[]>([]);
  const nodesRef = useRef<(SVGCircleElement | null)[]>([]);
  const spokesRef = useRef<(SVGLineElement | null)[]>([]);
  const pulseLinesRef = useRef<(SVGLineElement | null)[]>([]);
  const seamsRef = useRef<(SVGLineElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const captionSyncRef = useRef<HTMLSpanElement | null>(null);
  const captionSiloRef = useRef<HTMLSpanElement | null>(null);
  const inSiloState = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Static expanded state for reduced motion
      const pInit = 1;
      LEVELS.forEach((lvl, i) => {
        ringGroupsRef.current[i]?.setAttribute('transform', getRingTransform(lvl.lift, lvl.depth, pInit));
        ringGroupsRef.current[i]?.setAttribute('opacity', String(getRingOpacity(lvl.depth, pInit)));
        ringPathsRef.current[i]?.setAttribute('stroke-opacity', '0.9');
      });
      SEAM_ANGLES.forEach((angle, i) => {
        const topPt = getSeamCoords(3, angle, pInit);
        const btmPt = getSeamCoords(0, angle, pInit);
        const el = seamsRef.current[i];
        if (el) {
          el.setAttribute('x1', String(topPt.x));
          el.setAttribute('y1', String(topPt.y));
          el.setAttribute('x2', String(btmPt.x));
          el.setAttribute('y2', String(btmPt.y));
          el.setAttribute('stroke-opacity', '0.8');
        }
      });
      return;
    }

    let animFrame = 0;
    let lastTime = performance.now();
    const startTime = lastTime;
    const phases = NODES.map((n) => n.phase);
    const ringOffsets = LEVELS.map(() => 0);
    const inContact = NODES.map(() => true);
    const lastSwitchTimes = NODES.map(() => -10);

    const tick = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const deltaSec = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const progress = computeProgress(elapsedSec);

      if (progress >= 0.999) {
        inSiloState.current = true;
      } else if (progress <= 0.001) {
        inSiloState.current = false;
      }

      if (captionSyncRef.current) {
        captionSyncRef.current.style.opacity = inSiloState.current ? '0' : '1';
      }
      if (captionSiloRef.current) {
        captionSiloRef.current.style.opacity = inSiloState.current ? '1' : '0';
      }

      // 1. Update rings
      LEVELS.forEach((lvl, s) => {
        const groupEl = ringGroupsRef.current[s];
        if (groupEl) {
          groupEl.setAttribute('transform', getRingTransform(lvl.lift, lvl.depth, progress));
          groupEl.setAttribute('opacity', String(getRingOpacity(lvl.depth, progress)));
        }
        ringPathsRef.current[s]?.setAttribute('stroke-opacity', String(round1(0.9 * Math.min(1, 8 * progress))));

        if (progress > 0) {
          ringOffsets[s] = (ringOffsets[s] ?? 0) + (TRACK_ROTATION_SPEEDS[s] ?? 0) * deltaSec * progress;
          const offset = (ringOffsets[s] ?? 0) * progress;
          blueArcsRef.current[s]?.setAttribute('d', createArc(90 + 90 * s + offset, 90 + (s + 1) * 90 + offset));
        } else if (ringOffsets[s] !== 0) {
          ringOffsets[s] = 0;
          blueArcsRef.current[s]?.setAttribute('d', lvl.blue);
        }
      });

      // 2. Update seam vertical guidelines
      SEAM_ANGLES.forEach((angle, t) => {
        const seamEl = seamsRef.current[t];
        if (!seamEl) return;
        const topPt = getSeamCoords(3, angle, progress);
        const btmPt = getSeamCoords(0, angle, progress);
        seamEl.setAttribute('x1', String(topPt.x));
        seamEl.setAttribute('y1', String(topPt.y));
        seamEl.setAttribute('x2', String(btmPt.x));
        seamEl.setAttribute('y2', String(btmPt.y));
        seamEl.setAttribute('stroke-opacity', String(round1(0.8 * Math.min(1, 1.2 * Math.max(0, progress)))));
      });

      // 3. Update nodes and spokes
      const speedScale = 1.4 - 1.28 * smoothstep(Math.min(1, 1.3 * progress));

      NODES.forEach((node, t) => {
        const breath = 0.35 + 2.2 * Math.max(0, Math.sin(node.wb * elapsedSec + node.pb)) ** 2;
        const phase = (phases[t] ?? 0) + node.speed * speedScale * breath * deltaSec;
        phases[t] = phase;

        const jitter = 0.006 * Math.sin(node.wj * elapsedSec + node.pj);
        const coords = getNodeCoords(node.level, phase, progress, jitter);

        const circleEl = nodesRef.current[t];
        if (circleEl) {
          circleEl.setAttribute('transform', `translate(${coords.x} ${coords.y})`);
          circleEl.setAttribute('r', String(round1(2.2 * coords.s)));
          circleEl.setAttribute('opacity', String(getRingOpacity(getLevel(node.level).depth, progress)));
        }

        const threshold = (Math.abs(getLevel(node.level).lift) > 1 ? 0.24 : 0.5) + ((7 * t) % 5) * 0.02;

        if (inContact[t] && progress > threshold) {
          inContact[t] = false;
          lastSwitchTimes[t] = elapsedSec;
        } else if (!inContact[t] && progress < threshold - 0.1) {
          inContact[t] = true;
          lastSwitchTimes[t] = elapsedSec;
        }

        const spokeEl = spokesRef.current[t];
        const pulseEl = pulseLinesRef.current[t];
        const timeSinceSwitch = elapsedSec - (lastSwitchTimes[t] ?? 0);

        if (inContact[t]) {
          const spokeCycle = ((3 * t) % NODES.length) * 0.5;
          const targetTime = spokeCycle + 10 * Math.round((elapsedSec - spokeCycle) / 10);
          let spokeAlpha = 0;
          if (elapsedSec > targetTime - 0.3 && elapsedSec < targetTime + 1.3) {
            spokeAlpha =
              elapsedSec < targetTime
                ? (elapsedSec - (targetTime - 0.3)) / 0.3
                : elapsedSec < targetTime + 0.9
                  ? 1
                  : 1 - (elapsedSec - (targetTime + 0.9)) / 0.4;
          }
          const spokeExtend = Math.min(1, timeSinceSwitch / 0.25);

          if (spokeEl) {
            spokeEl.setAttribute('stroke', '#aeb9d2');
            spokeEl.setAttribute('stroke-opacity', String(round1(0.5 * Math.max(0, spokeAlpha))));
            spokeEl.setAttribute('stroke-dashoffset', String(round1((t % 2 === 0 ? -1 : 1) * elapsedSec * 8)));
            spokeEl.setAttribute('x1', '320');
            spokeEl.setAttribute('y1', '250');
            spokeEl.setAttribute('x2', String(round1(320 + (coords.x - 320) * spokeExtend)));
            spokeEl.setAttribute('y2', String(round1(250 + (coords.y - 250) * spokeExtend)));
          }

          let pulsePacket: { u: number; out: boolean } | null = null;
          const packetSlot = Math.floor(elapsedSec / 0.5);
          for (const slot of [packetSlot - 1, packetSlot]) {
            if ((((7 * slot) % NODES.length) + NODES.length) % NODES.length === t) {
              const u = (elapsedSec - 0.5 * slot) / 0.9;
              if (u >= 0 && u < 1) {
                pulsePacket = { u, out: slot % 2 === 0 };
              }
            }
          }

          if (pulseEl) {
            if (pulsePacket) {
              const segStart = 0.85 * pulsePacket.u;
              const segEnd = segStart + 0.15;
              const xStartPct = pulsePacket.out ? segStart : 1 - segEnd;
              const xEndPct = pulsePacket.out ? segEnd : 1 - segStart;
              pulseEl.style.strokeDasharray = 'none';
              pulseEl.setAttribute('stroke', '#2563eb');
              pulseEl.setAttribute('stroke-opacity', '0.9');
              pulseEl.setAttribute('x1', String(round1(320 + (coords.x - 320) * xStartPct)));
              pulseEl.setAttribute('y1', String(round1(250 + (coords.y - 250) * xStartPct)));
              pulseEl.setAttribute('x2', String(round1(320 + (coords.x - 320) * xEndPct)));
              pulseEl.setAttribute('y2', String(round1(250 + (coords.y - 250) * xEndPct)));
            } else {
              pulseEl.setAttribute('stroke-opacity', '0');
            }
          }
        } else if (timeSinceSwitch < 0.4 && (((elapsedSec - ((3 * t) % NODES.length) * 0.5) % 10) + 10) % 10 < 2.2) {
          const dissolve = 1 - (1 - timeSinceSwitch / 0.4) ** 3;
          const dx = coords.x - 320;
          const dy = coords.y - 250;
          const alpha = round1(0.55 * (1 - 0.5 * dissolve));

          if (spokeEl) {
            spokeEl.setAttribute('stroke', '#aeb9d2');
            spokeEl.setAttribute('stroke-opacity', String(alpha));
            spokeEl.setAttribute('x1', '320');
            spokeEl.setAttribute('y1', '250');
            spokeEl.setAttribute('x2', String(round1(320 + 0.34 * dx * (1 - dissolve))));
            spokeEl.setAttribute('y2', String(round1(250 + 0.34 * dy * (1 - dissolve))));
          }
          if (pulseEl) {
            pulseEl.style.strokeDasharray = '';
            pulseEl.setAttribute('stroke', '#aeb9d2');
            pulseEl.setAttribute('stroke-opacity', String(alpha));
            pulseEl.setAttribute('x1', String(round1(coords.x - 0.3 * dx * (1 - dissolve))));
            pulseEl.setAttribute('y1', String(round1(coords.y - 0.3 * dy * (1 - dissolve))));
            pulseEl.setAttribute('x2', String(coords.x));
            pulseEl.setAttribute('y2', String(coords.y));
          }
        } else {
          spokeEl?.setAttribute('stroke-opacity', '0');
          pulseEl?.setAttribute('stroke-opacity', '0');
        }
      });

      // 4. Update central core circle
      if (coreRef.current) {
        coreRef.current.setAttribute('r', String(round1(9 + (1 - progress) * 0.7 * Math.sin(2 * elapsedSec))));
        coreRef.current.setAttribute('fill', getCoreFill(progress));
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.canvas}
        viewBox="-40 58 720 377"
        fill="none"
        role="img"
        aria-label="Cylindrical orbital rings representing isolated silos connecting into a unified network"
      >
        {/* Seam guidelines connecting levels */}
        {SEAM_ANGLES.map((angle, i) => {
          const topPt = getSeamCoords(3, angle, 1);
          const btmPt = getSeamCoords(0, angle, 1);
          return (
            <line
              key={angle}
              ref={(el) => {
                seamsRef.current[i] = el;
              }}
              x1={topPt.x}
              y1={topPt.y}
              x2={btmPt.x}
              y2={btmPt.y}
              strokeOpacity={0.8}
              className={styles.seam}
            />
          );
        })}

        {/* 4 orbital level rings */}
        {LEVELS.map((lvl, i) => (
          <g
            key={i}
            ref={(el) => {
              ringGroupsRef.current[i] = el;
            }}
            transform={getRingTransform(lvl.lift, lvl.depth, 1)}
            opacity={getRingOpacity(lvl.depth, 1)}
          >
            <path
              ref={(el) => {
                ringPathsRef.current[i] = el;
              }}
              d={FULL_ELLIPSE}
              strokeOpacity={0.9}
              className={styles.levelRing}
            />
            <path
              ref={(el) => {
                blueArcsRef.current[i] = el;
              }}
              d={lvl.blue}
              className={styles.piece}
            />
          </g>
        ))}

        {/* Node spokes and pulses */}
        {NODES.map((node, i) => {
          const coords = getNodeCoords(node.level, node.phase, 1);
          return (
            <g key={i}>
              <line
                ref={(el) => {
                  spokesRef.current[i] = el;
                }}
                x1={320}
                y1={250}
                x2={coords.x}
                y2={coords.y}
                stroke="#aeb9d2"
                strokeOpacity={0}
                className={styles.spoke}
              />
              <line
                ref={(el) => {
                  pulseLinesRef.current[i] = el;
                }}
                x1={coords.x}
                y1={coords.y}
                x2={coords.x}
                y2={coords.y}
                strokeOpacity={0}
                className={styles.spoke}
              />
            </g>
          );
        })}

        {/* Central core sphere */}
        <circle
          ref={coreRef}
          cx={320}
          cy={250}
          r={9}
          fill={getCoreFill(1)}
          className={styles.core}
        />

        {/* Orbiting particles */}
        {NODES.map((node, i) => {
          const coords = getNodeCoords(node.level, node.phase, 1);
          return (
            <circle
              key={i}
              ref={(el) => {
                nodesRef.current[i] = el;
              }}
              transform={`translate(${coords.x} ${coords.y})`}
              r={round1(2.2 * coords.s)}
              opacity={getRingOpacity(getLevel(node.level).depth, 1)}
              className={styles.node}
            />
          );
        })}
      </svg>

      <div className={styles.caption} aria-live="polite">
        <span ref={captionSyncRef} style={{ opacity: 0 }}>
          Working well together means staying connected and closing the loop...
        </span>
        <span ref={captionSiloRef} style={{ opacity: 1 }}>
          But today, people go off and work with their agents in silos
        </span>
      </div>
    </div>
  );
};

export default CylindricalOrbitAnimation;
