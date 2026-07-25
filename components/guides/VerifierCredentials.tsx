'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  SealCheck,
  CircleNotch,
  Trophy,
  ArrowRight,
} from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import styles from './VerifierCredentials.module.css';

// Mirrors VerifierCredential from lib/verifier-tests-db (kept in-file so this
// stays a lean client bundle — no server-lib import).
interface Credential {
  subject: string;
  maxLevel: number;
  earnedVia: string;
  createdAt: string;
  updatedAt: string;
}

interface VerifierTestQuestion {
  id: number;
  type: 'multiple_choice' | 'short_answer' | 'scale';
  category: string;
  question: string;
  options?: string[];
}

interface ReviewItem {
  id: number;
  correct: boolean;
  correctAnswer: string | null;
  explanation: string | null;
}

interface VerifierTest {
  testId: string;
  subject: string;
  level: number;
  title: string;
  intro: string;
  questions: VerifierTestQuestion[];
}

const MAX_LEVEL = 5;

/**
 * Small self-contained panel: shows the signed-in user's verifier credentials
 * and a "Become a verifier" form that requests a tiered qualification test for a
 * chosen subject + level, then lets them sit and submit it.
 *
 * Self-fetching and NOT wired into any page here — the reviewer places it.
 * Subjects are derived from the published-guide list (/api/guides). If that is
 * empty or unavailable the subject field falls back to free text.
 */
export default function VerifierCredentials() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const { play } = useSound();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);

  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [test, setTest] = useState<VerifierTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; passThreshold: number } | null>(null);
  // Snapshot of the just-graded test + per-question feedback, shown after submit.
  const [reviewData, setReviewData] = useState<{ questions: VerifierTestQuestion[]; review: ReviewItem[] } | null>(null);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadCredentials = useCallback(async () => {
    setLoadingCreds(true);
    try {
      const res = await fetch('/api/guides/verifier-test', {
        cache: 'no-store',
        headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.credentials)) setCredentials(data.credentials);
      }
    } catch {
      /* non-fatal — the form still works */
    } finally {
      setLoadingCreds(false);
    }
  }, [authHeaders]);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/guides?status=published', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const guides: Array<{ subjects?: string[] }> = Array.isArray(data.guides) ? data.guides : [];
      const distinct = Array.from(
        new Set(guides.flatMap((g) => (Array.isArray(g.subjects) ? g.subjects : []))),
      ).sort((a, b) => a.localeCompare(b));
      setSubjectOptions(distinct);
    } catch {
      /* fall back to free-text subject */
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) loadCredentials();
    else setLoadingCreds(false);
    loadSubjects();
  }, [ready, authenticated, loadCredentials, loadSubjects]);

  const useFreeText = subjectOptions.length === 0;

  const requestTest = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }
    const trimmed = subject.trim();
    if (trimmed.length < 2) {
      play('error');
      setError('Choose or enter a subject first.');
      return;
    }
    setRequesting(true);
    setError(null);
    setResult(null);
    setReviewData(null);
    try {
      const res = await fetch('/api/guides/verifier-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ subject: trimmed, level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        play('error');
        setError(data.error ?? 'Could not start the verifier test.');
        return;
      }
      play('navigation');
      setTest(data.test ?? null);
      setAnswers({});
    } finally {
      setRequesting(false);
    }
  }, [ready, authenticated, login, subject, level, authHeaders, play]);

  const submitTest = useCallback(async () => {
    if (!test) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guides/verifier-test/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ testId: test.testId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        play('error');
        setError(data.error ?? 'Could not submit your answers.');
        return;
      }
      setResult({ score: data.score, passed: data.passed, passThreshold: data.passThreshold });
      if (Array.isArray(data.review) && test) {
        setReviewData({ questions: test.questions, review: data.review as ReviewItem[] });
      }
      if (data.passed) {
        play('celebration');
        setTest(null);
        setAnswers({});
        await loadCredentials();
      } else {
        play('error');
      }
    } finally {
      setSubmitting(false);
    }
  }, [test, answers, authHeaders, loadCredentials, play]);

  const levelOptions = useMemo(
    () => Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i),
    [],
  );

  return (
    <section className={styles.wrapper} aria-label="Verifier credentials">
      {/* ── Held credentials ── */}
      {loadingCreds ? (
        <div className={styles.state}>
          <CircleNotch size={16} className={styles.spinner} />
          <span>Loading your credentials…</span>
        </div>
      ) : credentials.length === 0 ? null : (
        <ul className={styles.creds}>
          {credentials.map((c) => (
            <li key={c.subject} className={styles.cred}>
              <span className={styles.credSubject}>{c.subject}</span>
              <span className={styles.levelBadge}>
                <Trophy size={12} weight="fill" />
                Level {c.maxLevel}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Become a verifier ── */}
      {!test && (
        <div className={styles.form}>
          <span className={styles.formTitle}>
            <SealCheck size={18} weight="fill" className={styles.headerIcon} />
            Become a verifier
          </span>
          <p className={styles.formIntro}>
            Pass a short quiz or get approval from an admin to be marked an expert. Questions come from the subject itself, so answer from what you actually know.
          </p>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Subject</span>
            {useFreeText ? (
              <input
                className={styles.input}
                type="text"
                value={subject}
                placeholder="e.g. Cognitive behavioural therapy"
                maxLength={120}
                onChange={(e) => setSubject(e.target.value)}
              />
            ) : (
              <select
                className={styles.select}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select a subject…</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Level</span>
            <select
              className={styles.select}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              {levelOptions.map((l) => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {result && !result.passed && (
            <p className={styles.error}>
              Scored {result.score}%. You need {result.passThreshold}% to qualify — try again.
            </p>
          )}
          {result && result.passed && (
            <p className={styles.success}>Passed with {result.score}%. Credential granted.</p>
          )}

          <button
            type="button"
            className={styles.primaryBtn}
            onMouseEnter={() => play('soft-hover')}
            onClick={requestTest}
            disabled={requesting}
          >
            {requesting ? (
              <>
                <CircleNotch size={16} className={styles.spinner} /> Preparing test…
              </>
            ) : (
              'Start qualification test'
            )}
          </button>
        </div>
      )}

      {/* ── Sit the test ── */}
      {test && (
        <div className={styles.test}>
          <div className={styles.testHead}>
            <span className={styles.testTitle}>{test.title}</span>
            <span className={styles.testMeta}>
              {test.subject} · Level {test.level}
            </span>
          </div>
          <p className={styles.testIntro}>{test.intro}</p>

          <ol className={styles.questions}>
            {test.questions.map((q) => (
              <li key={q.id} className={styles.question}>
                <span className={styles.questionCategory}>{q.category}</span>
                <p className={styles.questionText}>{q.question}</p>

                {q.type === 'multiple_choice' && q.options ? (
                  <div className={styles.options}>
                    {q.options.map((opt) => (
                      <label key={opt} className={styles.option}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === 'scale' ? (
                  <div className={styles.scale}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className={styles.scaleItem}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={n}
                          checked={answers[q.id] === String(n)}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                        />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={answers[q.id] ?? ''}
                    placeholder="Write at least a few sentences…"
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
              </li>
            ))}
          </ol>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="button"
            className={styles.primaryBtn}
            onMouseEnter={() => play('soft-hover')}
            onClick={submitTest}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <CircleNotch size={16} className={styles.spinner} /> Grading…
              </>
            ) : (
              'Submit answers'
            )}
          </button>
        </div>
      )}

      {/* ── Post-submit review: what was right, and why ── */}
      {reviewData && (
        <div className={styles.review}>
          <span className={styles.reviewTitle}>Answer review</span>
          <ol className={styles.reviewList}>
            {reviewData.questions.map((q) => {
              const item = reviewData.review.find((r) => r.id === q.id);
              if (!item) return null;
              return (
                <li key={q.id} className={styles.reviewItem}>
                  <p className={styles.reviewQuestion}>{q.question}</p>
                  <span className={item.correct ? styles.reviewCorrect : styles.reviewIncorrect}>
                    {item.correct ? 'Correct' : 'Not quite'}
                  </span>
                  {item.correctAnswer && !item.correct && (
                    <p className={styles.reviewAnswer}>Best answer: {item.correctAnswer}</p>
                  )}
                  {item.explanation && <p className={styles.reviewWhy}>{item.explanation}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
