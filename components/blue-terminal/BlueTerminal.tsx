'use client';

import React, { useEffect, useState } from 'react';
import styles from './BlueTerminal.module.css';

const ASCII_LINES = [
  "88\"\"Yb    db    88 8888b.      .dP\"Y8 88   88 88\"\"Yb Yb    dP 888888 Yb  dP .dP\"Y8 ",
  "88__dP   dPYb   88  8I  Yb     `Ybo.\" 88   88 88__dP  Yb  dP  88__    YbdP  `Ybo.\" ",
  "88\"\"\"   dP__Yb  88  8I  dY     o.`Y8b Y8   8P 88\"Yb    YbdP   88\"\"     8P   o.`Y8b ",
  "88     dP\"\"\"\"Yb 88 8888Y\"      8bodP' `YbodP' 88  Yb    YP    888888  dP    8bodP' ",
];

const ASCII_LOGO = ASCII_LINES.join('\n');

const BOOT_LINES = [
  { text: '> POWER ON', delay: 300 },
  { text: '> CHECKING SYSTEMS... OK', delay: 500 },
  { text: '> LOADING MENTAL WEALTH ACADEMY', delay: 450 },
  { text: '> CONNECTING TO THE BLUE NETWORK...', delay: 600 },
  { text: '> USER PROFILE FOUND', delay: 400 },
  { text: '> BRAIN SCAN: READY', delay: 450 },
  { text: '', delay: 250 },
  { text: '> YOUR TEST IS STANDING BY', delay: 400 },
  { text: '> ALL SYSTEMS GO', delay: 350 },
];

export default function BlueTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= BOOT_LINES.length) return;
    const { delay } = BOOT_LINES[visibleCount];
    const t = setTimeout(() => setVisibleCount(v => v + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount]);

  const done = visibleCount >= BOOT_LINES.length;

  return (
    <div className={styles.terminal}>
      <div className={styles.scanlines} aria-hidden="true" />

      <div className={styles.logoWrapper}>
        <pre className={styles.ascii}>{ASCII_LOGO}</pre>
        <div className={styles.subLabel}>MENTAL WEALTH ACADEMY &mdash; TEST ENGINE v1.0</div>
      </div>

      <div className={styles.divider} />

      <div className={styles.bootLines} aria-live="polite">
        {BOOT_LINES.slice(0, visibleCount).map((entry, i) =>
          entry.text === '' ? (
            <div key={i} className={styles.gap} />
          ) : (
            <div key={i} className={styles.line}>
              <span className={styles.prompt}>$</span>
              {entry.text.replace('> ', '')}
            </div>
          )
        )}
      </div>

      {done && (
        <div className={styles.ctaRow}>
          <span className={styles.ctaBracket}>[</span>
          <span className={styles.ctaText}>PRESS START TO BEGIN YOUR TEST</span>
          <span className={styles.ctaBracket}>]</span>
          <span className={styles.cursor} aria-hidden="true">_</span>
        </div>
      )}
    </div>
  );
}
