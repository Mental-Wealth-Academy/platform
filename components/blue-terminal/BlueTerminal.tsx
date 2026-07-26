'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './BlueTerminal.module.css';
import { DotmSquare15 } from '@/components/dot-matrix/DotmSquare15';
import { MIN_SHORT_ANSWER_CHARS } from '@/lib/test-rewards';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

async function speakBlue(text: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new Error('TTS request failed');

  const blob = await res.blob();
  if (!blob.size) throw new Error('No audio data');

  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const el = new Audio(url);
    el.volume = 0.4;
    el.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback error'));
    };
    el.play().catch((error) => {
      URL.revokeObjectURL(url);
      reject(error);
    });
  });
}

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
  idleTitle?: string;
  idleText?: string;
  idleMeta?: string;
  idleNote?: string;
  idleImageSrc?: string;
  onSubmitQuest?: (answers: TestAnswers) => Promise<TestCompletionResult | null>;
}

export default function BlueTerminal({
  testData,
  isGenerating,
  errorMessage,
  idleTitle = 'Pick your quiz',
  idleText = 'Choose a survey on the left. Blue will read the pattern, but the fun part is the answers you give before she gets involved.',
  idleMeta = 'Personality lab',
  idleNote = 'No wrong answers. Only suspiciously revealing ones.',
  idleImageSrc = '/exxies.png',
  onSubmitQuest,
}: BlueTerminalProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [shortAnswer, setShortAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState<TestCompletionResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);

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

  const question = testData?.questions[currentQ];
  const activeQuestionId = question?.id;
  const activeQuestionText = question?.question;
  const activeTestKey = testData?.testId ?? testData?.title ?? null;
  const totalQ = testData?.questions.length ?? 0;
  const isLastQ = currentQ === totalQ - 1;
  const currentHasAnswer = question !== undefined && answers[question.id] !== undefined;
  const progressPercent = totalQ > 0 ? ((currentQ + (currentHasAnswer ? 1 : 0)) / totalQ) * 100 : 0;

  useEffect(() => {
    if (!activeQuestionText || submitted) return;

    voiceAbortRef.current?.abort();
    const controller = new AbortController();
    voiceAbortRef.current = controller;
    speakBlue(activeQuestionText, controller.signal)
      .catch(() => {/* aborted, autoplay-blocked, or TTS unavailable — silent */});

    return () => {
      controller.abort();
    };
  }, [activeQuestionId, activeQuestionText, activeTestKey, submitted]);

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
    if (!question) return;
    const trimmed = shortAnswer.trim();
    if (trimmed.length < MIN_SHORT_ANSWER_CHARS) return;
    setAnswers(prev => ({ ...prev, [question.id]: trimmed }));
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
      const message = error instanceof Error ? error.message : 'Credit award failed.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.terminal}>

      {/* ===== GENERATING STATE ===== */}
      {isGenerating && !testData && (
        <div className={styles.generatingPanel} aria-live="polite">
          <DotmSquare15 speed={0.8} dotSize={7} gap={4} />
          <p className={styles.statusText}>Building your survey…</p>
        </div>
      )}

      {/* ===== ERROR STATE ===== */}
      {errorMessage && !isGenerating && !testData && (
        <div className={styles.errorPanel} role="alert">
          <h3 className={styles.statusTitle}>Survey unavailable</h3>
          <p className={styles.statusText}>{errorMessage}</p>
        </div>
      )}

      {!isGenerating && !errorMessage && !testData && (
        <div className={`${styles.statusPanel} ${styles.idleStatusPanel}`}>
          <div className={styles.idleIntro}>
            <div className={styles.idleCopy}>
              <p className={styles.eyebrow}>{idleMeta}</p>
              <h3 className={styles.statusTitle}>{idleTitle}</h3>
              <p className={styles.statusText}>{idleText}</p>
              {idleNote && <p className={styles.statusNote}>{idleNote}</p>}
            </div>
            <div className={styles.idleImageWrap} aria-hidden="true">
              <Image
                src={idleImageSrc}
                alt=""
                fill
                sizes="100vw"
                className={styles.idleImage}
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== TEST MODE ===== */}
      {testData && !submitted && (
        <div className={styles.testMode}>
          <div className={styles.surveyMeta}>
            <p className={styles.questIntro}>{testData.intro}</p>
            <span className={styles.questProgress}>
              Question {currentQ + 1} of {totalQ}
            </span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {question && (
            <div className={styles.questionBlock}>
              <div className={styles.questionCategory}>{question.category}</div>

              <h3 className={styles.questionText}>{question.question}</h3>

              {question.type === 'multiple_choice' && question.options && (
                <div className={styles.optionList} role="radiogroup" aria-label={question.question}>
                  {question.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`${styles.optionBtn} ${answers[question.id] === opt ? styles.optionSelected : ''}`}
                      onClick={() => selectAnswer(opt)}
                      type="button"
                      role="radio"
                      aria-checked={answers[question.id] === opt}
                    >
                      <span className={styles.optionLetter}>{OPTION_LETTERS[i]}</span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'scale' && (
                <div className={styles.scaleGroup}>
                  <div className={styles.scaleLabels}>
                    <span>1 - never true</span>
                    <span>5 - always true</span>
                  </div>
                  <div className={styles.scaleBtns} role="radiogroup" aria-label={question.question}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`${styles.scaleBtn} ${answers[question.id] === n ? styles.optionSelected : ''}`}
                        onClick={() => selectAnswer(n)}
                        type="button"
                        role="radio"
                        aria-checked={answers[question.id] === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {question.type === 'short_answer' && (
                <div className={styles.shortAnswerGroup}>
                  <label className={styles.fieldLabel} htmlFor={`question-${question.id}`}>
                    Your response
                  </label>
                  <textarea
                    ref={inputRef}
                    id={`question-${question.id}`}
                    className={styles.shortAnswerInput}
                    value={answers[question.id] !== undefined ? String(answers[question.id]) : shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitShortAnswer();
                    }}
                    disabled={answers[question.id] !== undefined}
                    placeholder="Write your response..."
                    rows={5}
                  />
                  {answers[question.id] === undefined && (
                    <div className={styles.shortAnswerFooter}>
                      <span
                        className={styles.charCount}
                        data-met={shortAnswer.trim().length >= MIN_SHORT_ANSWER_CHARS}
                      >
                        {shortAnswer.trim().length < MIN_SHORT_ANSWER_CHARS
                          ? `${shortAnswer.trim().length} / ${MIN_SHORT_ANSWER_CHARS} characters`
                          : `${shortAnswer.trim().length} characters`}
                      </span>
                      <button
                        className={styles.confirmBtn}
                        onClick={submitShortAnswer}
                        disabled={shortAnswer.trim().length < MIN_SHORT_ANSWER_CHARS}
                        type="button"
                      >
                        Save response
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isLastQ && currentHasAnswer && (
                <div className={styles.ctaRow}>
                  <button className={styles.ctaTextBtn} onClick={submitQuest} disabled={isSubmitting} type="button">
                    {isSubmitting ? 'Submitting...' : 'Submit survey'}
                  </button>
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
        <div className={styles.statusPanel}>
          <h3 className={styles.statusTitle}>Survey submitted</h3>
          <p className={styles.statusText}>
            {completionResult
              ? `You earned ${completionResult.shardsAwarded} diamonds for this submission.`
              : 'Your responses were recorded.'}
          </p>
          {completionResult?.newShardCount !== null && completionResult?.newShardCount !== undefined && (
            <p className={styles.statusText}>Current balance: {completionResult.newShardCount} diamonds.</p>
          )}
          <p className={styles.statusNote}>Blue will use this submission to calibrate future reviews.</p>
        </div>
      )}


      <footer className={styles.brandFooter}>
        <span aria-hidden="true" />
        <p>Investing in the human spirit, with the mind of tomorrow.</p>
        <span aria-hidden="true" />
      </footer>
    </section>
  );
}
