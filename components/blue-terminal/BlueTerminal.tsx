'use client';

import React, { useEffect, useRef, useState } from 'react';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
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

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export interface TestQuestion {
  id: number;
  type: 'multiple_choice' | 'short_answer' | 'scale';
  category: string;
  question: string;
  options?: string[];
}

export interface TestData {
  testId?: string;
  shardReward?: number;
  source?: 'openrouter' | 'anthropic' | 'fallback';
  title: string;
  intro: string;
  questions: TestQuestion[];
}

export type TestAnswers = Record<number, string | number>;

export interface TestCompletionResult {
  shardsAwarded: number;
  newShardCount: number | null;
}

interface BlueTerminalProps {
  testData?: TestData | null;
  isGenerating?: boolean;
  errorMessage?: string | null;
  onSubmitQuest?: (answers: TestAnswers) => Promise<TestCompletionResult | null>;
}

export default function BlueTerminal({ testData, isGenerating, errorMessage, onSubmitQuest }: BlueTerminalProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [shortAnswer, setShortAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState<TestCompletionResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot animation — only runs when no test active
  useEffect(() => {
    if (testData || isGenerating) return;
    if (visibleCount >= BOOT_LINES.length) return;
    const { delay } = BOOT_LINES[visibleCount];
    const t = setTimeout(() => setVisibleCount(v => v + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount, testData, isGenerating]);

  // Reset test state when new test loads
  useEffect(() => {
    if (testData) {
      setCurrentQ(0);
      setAnswers({});
      setShortAnswer('');
      setSubmitted(false);
      setIsSubmitting(false);
      setCompletionResult(null);
      setSubmissionError(null);
    }
  }, [testData]);

  const bootDone = visibleCount >= BOOT_LINES.length;
  const question = testData?.questions[currentQ];
  const totalQ = testData?.questions.length ?? 0;
  const isLastQ = currentQ === totalQ - 1;
  const currentHasAnswer = question !== undefined && answers[question.id] !== undefined;

  const selectAnswer = (val: string | number) => {
    if (!question) return;
    setAnswers(prev => ({ ...prev, [question.id]: val }));
    // Auto-advance non-text questions
    if (question.type !== 'short_answer' && !isLastQ) {
      setTimeout(() => {
        setCurrentQ(q => q + 1);
      }, 380);
    }
  };

  const submitShortAnswer = () => {
    if (!question || !shortAnswer.trim()) return;
    setAnswers(prev => ({ ...prev, [question.id]: shortAnswer.trim() }));
    setShortAnswer('');
    if (!isLastQ) {
      setTimeout(() => setCurrentQ(q => q + 1), 200);
    }
  };

  const submitQuest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await onSubmitQuest?.(answers);
      setCompletionResult(result ?? null);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shard award failed.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.terminal}>
      <div className={styles.backgroundViz} aria-hidden="true">
        <CyberpunkDataViz />
      </div>
      <div className={styles.scanlines} aria-hidden="true" />

      {/* ASCII header — always visible */}
      <div className={styles.logoWrapper}>
        <pre className={styles.ascii}>{ASCII_LOGO}</pre>
        <div className={styles.subLabel}>MENTAL WEALTH ACADEMY &mdash; TEST ENGINE v1.0</div>
      </div>

      <div className={styles.divider} />

      {/* ===== GENERATING STATE ===== */}
      {isGenerating && !testData && (
        <div className={styles.bootLines}>
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            INITIALIZING QUEST SEQUENCE...
          </div>
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            CALIBRATING TO DIFFICULTY ENGINE...
          </div>
          <div className={styles.generatingDots} aria-label="Generating">
            <span /><span /><span />
          </div>
        </div>
      )}

      {/* ===== ERROR STATE ===== */}
      {errorMessage && !isGenerating && !testData && (
        <div className={styles.bootLines} role="alert">
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            TEST ENGINE ERROR
          </div>
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* ===== TEST MODE ===== */}
      {testData && !submitted && (
        <div className={styles.testMode}>
          <div className={styles.questMeta}>
            <span className={styles.questTitle}>{testData.title.toUpperCase()}</span>
            <span className={styles.questProgress}>
              {String(currentQ + 1).padStart(2, '0')} / {String(totalQ).padStart(2, '0')}
            </span>
          </div>
          <p className={styles.questIntro}>{testData.intro}</p>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${(currentQ / totalQ) * 100}%` }}
            />
          </div>

          {question && (
            <div className={styles.questionBlock}>
              <div className={styles.questionCategory}>{`// ${question.category}`}</div>

              <div className={styles.questionText}>
                <span className={styles.prompt}>$</span>
                <span>{question.question}</span>
              </div>

              {question.type === 'multiple_choice' && question.options && (
                <div className={styles.optionList}>
                  {question.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`${styles.optionBtn} ${answers[question.id] === opt ? styles.optionSelected : ''}`}
                      onClick={() => selectAnswer(opt)}
                      type="button"
                    >
                      <span className={styles.optionLetter}>[{OPTION_LETTERS[i]}]</span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'scale' && (
                <div className={styles.scaleGroup}>
                  <div className={styles.scaleLabels}>
                    <span>1 &mdash; never true</span>
                    <span>always true &mdash; 5</span>
                  </div>
                  <div className={styles.scaleBtns}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`${styles.scaleBtn} ${answers[question.id] === n ? styles.optionSelected : ''}`}
                        onClick={() => selectAnswer(n)}
                        type="button"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {question.type === 'short_answer' && (
                <div className={styles.shortAnswerGroup}>
                  <div className={styles.inputRow}>
                    <span className={styles.inputPrompt}>&gt;_</span>
                    <input
                      ref={inputRef}
                      className={styles.shortAnswerInput}
                      value={answers[question.id] !== undefined ? String(answers[question.id]) : shortAnswer}
                      onChange={e => setShortAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitShortAnswer(); }}
                      disabled={answers[question.id] !== undefined}
                      placeholder="type your answer and press enter..."
                      autoComplete="off"
                    />
                  </div>
                  {answers[question.id] === undefined && (
                    <button
                      className={styles.confirmBtn}
                      onClick={submitShortAnswer}
                      disabled={!shortAnswer.trim()}
                      type="button"
                    >
                      CONFIRM
                    </button>
                  )}
                </div>
              )}

              {isLastQ && currentHasAnswer && (
                <div className={styles.ctaRow}>
                  <span className={styles.ctaBracket}>[</span>
                  <button className={styles.ctaTextBtn} onClick={submitQuest} disabled={isSubmitting} type="button">
                    {isSubmitting ? 'SUBMITTING...' : 'SUBMIT QUEST'}
                  </button>
                  <span className={styles.ctaBracket}>]</span>
                </div>
              )}

              {submissionError && (
                <div className={styles.submissionError} role="alert">
                  {submissionError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== COMPLETED STATE ===== */}
      {testData && submitted && (
        <div className={styles.bootLines}>
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            QUEST COMPLETE &mdash; ALL RESPONSES RECORDED
          </div>
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            {completionResult
              ? `+${completionResult.shardsAwarded} SHARDS AWARDED`
              : 'RESULTS RECORDED'}
          </div>
          {completionResult?.newShardCount !== null && completionResult?.newShardCount !== undefined && (
            <div className={styles.line}>
              <span className={styles.prompt}>$</span>
              BALANCE: {completionResult.newShardCount} SHARDS
            </div>
          )}
          <div className={styles.ctaRow}>
            <span className={styles.ctaBracket}>[</span>
            <span className={styles.ctaText}>TEST COMPLETE</span>
            <span className={styles.ctaBracket}>]</span>
            <span className={styles.cursor} aria-hidden="true">_</span>
          </div>
        </div>
      )}

      {/* ===== BOOT MODE (idle) ===== */}
      {!testData && !isGenerating && !errorMessage && (
        <>
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

          {bootDone && (
            <div className={styles.ctaRow}>
              <span className={styles.ctaBracket}>[</span>
              <span className={styles.ctaText}>SIGN FORM TO BEGIN YOUR TEST</span>
              <span className={styles.ctaBracket}>]</span>
              <span className={styles.cursor} aria-hidden="true">_</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
