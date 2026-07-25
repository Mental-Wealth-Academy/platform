'use client';

import React from 'react';
import { buildAxisAvatarUrl } from '@/lib/axis-avatar';
import styles from './LandingPage.module.css';

const TRACK_W = 300;
const TRACK_H = 72;
const TRACK_Y = TRACK_H / 2;
const DIAMOND = 26;
const CBBTC = 30;
/* Staggered launches so the payout reads as a stream rather than one hop */
const SPACING = 1.1;
const TRIP_DUR = 3.3;
/* Seven diamonds, then the cbBTC reflection they earn — one full convoy per cycle */
const CONVOY = [0, 1, 2, 3, 4, 5, 6, 'cbbtc'] as const;
const CYCLE = CONVOY.length * SPACING;
/* Fraction of the cycle each payload spends crossing the track */
const TRIP_END = TRIP_DUR / CYCLE;

export default function DiamondTransferDiagram() {
  return (
    <div className={styles.transferDiagram} aria-hidden="true">
      <figure className={styles.transferNode}>
        <span className={styles.transferPuck}>
          <img
            className={styles.transferSprite}
            src="/images/blue-guide-sprites/breathing-idle.gif"
            alt=""
            width={68}
            height={68}
          />
        </span>
        <figcaption className={styles.transferLabel}>Blue</figcaption>
      </figure>

      <svg
        className={styles.transferTrack}
        viewBox={`0 0 ${TRACK_W} ${TRACK_H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <line
          x1="0"
          y1={TRACK_Y}
          x2={TRACK_W}
          y2={TRACK_Y}
          stroke="#5168FF"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="4 7"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-44"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </line>

        {CONVOY.map((slot, i) => {
          const isReflection = slot === 'cbbtc';
          const size = isReflection ? CBBTC : DIAMOND;
          const from = -size / 2;
          const to = TRACK_W - size / 2;

          return (
            <image
              key={String(slot)}
              href={isReflection ? '/tokens/cbbtc.webp' : '/icons/ui-diamond.svg'}
              x={from}
              y={TRACK_Y - size / 2}
              width={size}
              height={size}
              opacity="0"
            >
              <animate
                attributeName="x"
                values={`${from};${to};${to}`}
                keyTimes={`0;${TRIP_END};1`}
                dur={`${CYCLE}s`}
                begin={`${i * SPACING}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes={`0;${TRIP_END * 0.12};${TRIP_END * 0.82};${TRIP_END};1`}
                dur={`${CYCLE}s`}
                begin={`${i * SPACING}s`}
                repeatCount="indefinite"
              />
            </image>
          );
        })}
      </svg>

      <figure className={styles.transferNode}>
        <span className={`${styles.transferPuck} ${styles.transferPuckUser}`}>
          <img
            className={styles.transferAvatar}
            src={buildAxisAvatarUrl('mwa-landing-learner')}
            alt=""
            width={68}
            height={68}
          />
        </span>
        <figcaption className={styles.transferLabel}>Your wallet</figcaption>
      </figure>
    </div>
  );
}
