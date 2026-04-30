'use client';

import { useEffect, useState } from 'react';
import styles from './AgentDemoSection.module.css';

type LineKind = 'prompt' | 'task' | 'blank' | 'finding' | 'overview' | 'saved';

type Line = {
  kind: LineKind;
  text: string;
  duration?: string;
  typewriter?: boolean;
};

const SCRIPT: Line[] = [
  { kind: 'prompt', text: 'submit "morning-pages • week 3 • day 12"', typewriter: true },
  { kind: 'blank', text: '' },
  { kind: 'task', text: 'blue.review_submission', duration: '1.4s' },
  { kind: 'task', text: 'blue.evaluate_reflection', duration: '0.8s' },
  { kind: 'task', text: 'blue.distribute_reward', duration: '0.6s' },
  { kind: 'blank', text: '' },
  { kind: 'finding', text: 'finding: 14-day reflection streak — shadow coherence rising' },
  { kind: 'overview', text: 'overview: trust ↑ 12%, parasocial baseline stable, gem yield 38%' },
  { kind: 'saved', text: '→ 47 shards saved to wallet 0x2c…1992d' },
];

const TYPE_SPEED_MS = 28;
const LINE_DELAY_MS = 420;
const POST_TYPE_PAUSE_MS = 580;
const FINAL_PAUSE_MS = 4400;
const TASK_TOTAL_WIDTH = 40;

const formatTask = (text: string, duration: string) => {
  const dots = '.'.repeat(Math.max(3, TASK_TOTAL_WIDTH - text.length - duration.length));
  return `  ${text} ${dots} ${duration}`;
};

export const AgentDemoSection = () => {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (step >= SCRIPT.length) {
      const t = window.setTimeout(() => {
        setStep(0);
        setTyped('');
      }, FINAL_PAUSE_MS);
      return () => window.clearTimeout(t);
    }

    const line = SCRIPT[step];
    if (line.typewriter && typed.length < line.text.length) {
      const t = window.setTimeout(
        () => setTyped(line.text.slice(0, typed.length + 1)),
        TYPE_SPEED_MS
      );
      return () => window.clearTimeout(t);
    }

    const delay = line.typewriter ? POST_TYPE_PAUSE_MS : LINE_DELAY_MS;
    const t = window.setTimeout(() => {
      setStep(step + 1);
      setTyped('');
    }, delay);
    return () => window.clearTimeout(t);
  }, [step, typed]);

  const renderLine = (line: Line, index: number, isActive: boolean) => {
    const newline = '\n';

    if (line.kind === 'blank') {
      return <span key={index}>{newline}</span>;
    }

    if (line.kind === 'prompt') {
      const visibleText = isActive && line.typewriter ? typed : line.text;
      const showCursor = isActive && line.typewriter && typed.length < line.text.length;
      return (
        <span key={index}>
          <span className={styles.prompt}>{'❯ '}</span>
          {visibleText}
          {showCursor && <span className={styles.cursor} aria-hidden="true" />}
          {newline}
        </span>
      );
    }

    if (line.kind === 'task') {
      return (
        <span key={index} className={styles.dim}>
          {formatTask(line.text, line.duration ?? '')}
          {newline}
        </span>
      );
    }

    if (line.kind === 'finding') {
      return (
        <span key={index} className={styles.finding}>
          {line.text}
          {newline}
        </span>
      );
    }

    if (line.kind === 'overview') {
      return (
        <span key={index} className={styles.overview}>
          {line.text}
          {newline}
        </span>
      );
    }

    return (
      <span key={index} className={styles.success}>
        {line.text}
        {newline}
      </span>
    );
  };

  const visibleLines = SCRIPT.slice(0, Math.min(step + 1, SCRIPT.length));
  const trailingCursorVisible =
    step >= SCRIPT.length || (step < SCRIPT.length && !SCRIPT[step].typewriter);

  return (
    <section className={styles.section} aria-labelledby="agent-demo-eyebrow">
      <div className={styles.container}>
        <header className={styles.header}>
          <p id="agent-demo-eyebrow" className={styles.eyebrow}>
            <span className={styles.eyebrowAccent}>See It in Action</span>
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.terminalWrap}>
            <div className={styles.terminal} role="img" aria-label="B.L.U.E. quest review terminal demo">
              <div className={styles.terminalChrome}>
                <div className={styles.dots}>
                  <span className={`${styles.dot} ${styles.dotPrimary}`} />
                  <span className={`${styles.dot} ${styles.dotMid}`} />
                  <span className={`${styles.dot} ${styles.dotFaint}`} />
                </div>
                <span className={styles.chromeLabel}>B.L.U.E.</span>
              </div>
              <pre className={styles.terminalBody}>
                {visibleLines.map((line, i) => renderLine(line, i, i === step))}
                {trailingCursorVisible && (
                  <span className={styles.cursor} aria-hidden="true" />
                )}
              </pre>
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.sidePanelInner}>
              <p className={styles.sidePanelEyebrow}>Live Agent</p>
              <p className={styles.sidePanelTitle}>B.L.U.E. Daemon</p>
              <p className={styles.sidePanelBody}>
                An autonomous agent with her own wallet on Base. She reads submissions,
                approves or revises, and pays out the reward.
              </p>
            </div>
            <span className={styles.sidePanelTag}>B.L.U.E. Agent</span>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default AgentDemoSection;
