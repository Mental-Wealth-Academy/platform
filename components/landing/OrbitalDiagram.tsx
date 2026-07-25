'use client';

import React from 'react';
import DiamondTransferDiagram from './DiamondTransferDiagram';
import styles from './LandingPage.module.css';

type Activity = {
  label: string;
  color: string;
};

const ACTIVITIES: Activity[] = [
  { label: 'Quests',      color: '#5168FF' },
  { label: 'Courses',     color: '#6A7CFF' },
  { label: 'Surveys',     color: '#8B6BFF' },
  { label: 'Trade',        color: '#B65BFF' },
  { label: 'Donations',   color: '#FF6BB6' },
  { label: 'Library',     color: '#FF8A4C' },
  { label: 'Community',   color: '#3CC9B4' },
  { label: 'Shop',        color: '#6EE7B7' },
];

const VIEWBOX = 760;
const CENTER = VIEWBOX / 2;
const ORBIT_R = 248;
const HUB_R = 96;
const PILL_W = 168;
const PILL_H = 46;
const WHEEL_DUR = 54;

export default function OrbitalDiagram() {
  const startAngle = -Math.PI / 2;
  const step = (Math.PI * 2) / ACTIVITIES.length;

  return (
    <section className={styles.orbitalSection}>
      <div className={styles.orbitalContainer}>
        <div className={styles.orbitalWrap} aria-hidden="true">
      <svg
        className={styles.orbitalCanvas}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <defs>
          {/* Base: forest green → MWA blue — matches fancyButton bottom layer */}
          <linearGradient id="hubFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#37A375" />
            <stop offset="100%" stopColor="#5168FF" />
          </linearGradient>
          {/* Highlight: bright cyan → violet — matches fancyButton top radial layer */}
          <radialGradient id="hubHighlight" cx="38%" cy="42%" r="70%">
            <stop offset="0%"  stopColor="#45FED6" stopOpacity="0.55" />
            <stop offset="78%" stopColor="#837DFA" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#5168FF" stopOpacity="0" />
          </radialGradient>
        </defs>


        <circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT_R}
          fill="none"
          stroke="rgba(81,104,255,0.16)"
          strokeWidth="1"
          strokeDasharray="3 7"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${CENTER} ${CENTER}`}
            to={`360 ${CENTER} ${CENTER}`}
            dur="120s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Ferris wheel: spokes and cars orbit together, the hub below stays put */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${CENTER} ${CENTER}`}
            to={`360 ${CENTER} ${CENTER}`}
            dur={`${WHEEL_DUR}s`}
            repeatCount="indefinite"
          />

        {ACTIVITIES.map((act, i) => {
          const angle = startAngle + step * i;
          const nx = CENTER + Math.cos(angle) * ORBIT_R;
          const ny = CENTER + Math.sin(angle) * ORBIT_R;
          const dx = CENTER - nx;
          const dy = CENTER - ny;
          const dist = Math.hypot(dx, dy);
          const ux = dx / dist;
          const uy = dy / dist;
          const startInset = Math.max(PILL_W, PILL_H) * 0.34;
          const x1 = nx + ux * startInset;
          const y1 = ny + uy * startInset;
          const x2 = CENTER - ux * HUB_R;
          const y2 = CENTER - uy * HUB_R;

          return (
            <line
              key={`line-${act.label}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={act.color}
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeDasharray="4 7"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-44"
                dur={`${2.8 + (i % 3) * 0.4}s`}
                repeatCount="indefinite"
              />
            </line>
          );
        })}

        {/* Cars ride the wheel but stay level, so the labels never turn upside down */}
        {ACTIVITIES.map((act, i) => {
          const angle = startAngle + step * i;
          const cx = CENTER + Math.cos(angle) * ORBIT_R;
          const cy = CENTER + Math.sin(angle) * ORBIT_R;
          const rx = -PILL_W / 2;
          const ry = -PILL_H / 2;

          return (
            <g key={act.label} transform={`translate(${cx} ${cy})`}>
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="-360 0 0"
                  dur={`${WHEEL_DUR}s`}
                  repeatCount="indefinite"
                />
                <rect
                  x={rx - 4}
                  y={ry - 4}
                  width={PILL_W + 8}
                  height={PILL_H + 8}
                  rx={(PILL_H + 8) / 2}
                  fill={act.color}
                  opacity="0.10"
                />
                <rect
                  x={rx}
                  y={ry}
                  width={PILL_W}
                  height={PILL_H}
                  rx={PILL_H / 2}
                  fill="#ffffff"
                  stroke={act.color}
                  strokeWidth="2"
                />
                <circle cx={rx + PILL_H / 2} cy={0} r={6} fill={act.color}>
                  <animate
                    attributeName="opacity"
                    values="0.55;1;0.55"
                    dur={`${2.4 + i * 0.18}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <text
                  x={rx + PILL_H + 4}
                  y={6}
                  textAnchor="start"
                  fontFamily="var(--font-primary)"
                  fontSize="17"
                  fontWeight="700"
                  fill="#11131B"
                >
                  {act.label}
                </text>
              </g>
            </g>
          );
        })}
        </g>

        {/* Outer border ring — near-white like fancyButton outer border */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_R + 5}
          fill="none"
          stroke="#FCFFFE"
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />
        {/* Filled hub with inner mint stroke — like fancyButtonInner border */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_R}
          fill="url(#hubFill)"
          stroke="#ABE8C2"
          strokeWidth="1.5"
        />
        {/* Cyan→violet highlight overlay — matches fancyButton top radial layer */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_R}
          fill="url(#hubHighlight)"
          stroke="none"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={HUB_R}
          fill="none"
          stroke="rgba(81,104,255,0.35)"
          strokeWidth="1"
        >
          <animate attributeName="r" values={`${HUB_R};${HUB_R + 14};${HUB_R}`} dur="3.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.22;0;0.22" dur="3.6s" repeatCount="indefinite" />
        </circle>

        <image
          href="/icons/ui-diamond.svg"
          x={CENTER - HUB_R * 0.62}
          y={CENTER - HUB_R * 0.62}
          width={HUB_R * 1.24}
          height={HUB_R * 1.24}
          style={{ filter: 'drop-shadow(0 2px 6px rgba(255, 57, 151, 0.18))' }}
        />
      </svg>
      </div>

        <div className={styles.orbitalCopy}>
          <h2 className={styles.orbitalHeadline}>Earn While You Learn</h2>
          <p className={styles.orbitalSubtext}>
            Quality work, deserves real rewards. Diamonds power the platform&apos;s game engine.
            Learn while you earn! And if the work is good, you get rewarded for it, straight
            from Blue&apos;s Agentic stash.
          </p>
          <DiamondTransferDiagram />
        </div>
    </div>
    </section>
  );
}
