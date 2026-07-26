import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countKeyedQuestions,
  MIN_KEYED_QUESTIONS_FOR_CREDENTIAL,
  PASS_THRESHOLD,
  scoreAnswers,
} from '@/lib/verifier-tests-db';
import { MIN_SHORT_ANSWER_CHARS } from '@/lib/test-rewards';

function keyedQuestion(id: number, answer: number) {
  return {
    id,
    type: 'multiple_choice' as const,
    category: 'SUBJECT',
    question: `question ${id}`,
    options: ['A text', 'B text', 'C text', 'D text'],
    answer,
  };
}

function writtenQuestion(id: number) {
  return {
    id,
    type: 'short_answer' as const,
    category: 'SUBJECT',
    question: `written ${id}`,
  };
}

describe('verifier credential scoring', () => {
  it('gives a long written answer no credit toward a credential', () => {
    const questions = [
      keyedQuestion(1, 0),
      writtenQuestion(2),
      writtenQuestion(3),
    ];
    const padding = 'a'.repeat(MIN_SHORT_ANSWER_CHARS + 40);

    const completeness = scoreAnswers(questions, {
      1: 'A text',
      2: padding,
      3: padding,
    });
    const credentialScore = scoreAnswers(
      questions,
      { 1: 'A text', 2: padding, 3: padding },
      { keyedOnly: true },
    );

    expect(completeness).toBe(100);
    expect(credentialScore).toBe(100);

    // The distinction shows up as soon as a keyed answer is wrong: padding can
    // no longer carry the score back over the pass mark.
    const paddedFailure = scoreAnswers(
      questions,
      { 1: 'B text', 2: padding, 3: padding },
      { keyedOnly: true },
    );
    expect(scoreAnswers(questions, { 1: 'B text', 2: padding, 3: padding })).toBe(67);
    expect(paddedFailure).toBe(0);
    expect(paddedFailure).toBeLessThan(PASS_THRESHOLD);
  });

  it('cannot be passed by repeated characters alone', () => {
    const questions = [writtenQuestion(1), writtenQuestion(2)];
    const junk = 'x'.repeat(MIN_SHORT_ANSWER_CHARS);

    expect(scoreAnswers(questions, { 1: junk, 2: junk })).toBe(100);
    expect(scoreAnswers(questions, { 1: junk, 2: junk }, { keyedOnly: true })).toBe(0);
  });

  it('scores a full keyed test the same way in both modes', () => {
    const questions = Array.from({ length: 6 }, (_, index) => keyedQuestion(index + 1, 1));
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, 'B text']),
    );

    expect(scoreAnswers(questions, answers, { keyedOnly: true })).toBe(100);
    expect(countKeyedQuestions(questions)).toBe(MIN_KEYED_QUESTIONS_FOR_CREDENTIAL);
  });

  it('counts only questions carrying a usable answer key', () => {
    const questions = [
      keyedQuestion(1, 0),
      writtenQuestion(2),
      { id: 3, type: 'multiple_choice' as const, category: 'X', question: 'no key', options: ['A', 'B'] },
      { id: 4, type: 'multiple_choice' as const, category: 'X', question: 'out of range', options: ['A'], answer: 5 },
    ];

    expect(countKeyedQuestions(questions)).toBe(1);
    expect(countKeyedQuestions([])).toBe(0);
  });

  it('withholds a credential when a test carries too few keyed questions', () => {
    const questions = [keyedQuestion(1, 0), keyedQuestion(2, 1)];

    expect(countKeyedQuestions(questions))
      .toBeLessThan(MIN_KEYED_QUESTIONS_FOR_CREDENTIAL);
  });
});

describe('verifier credential gates in the grading source', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/verifier-tests-db.ts'),
    'utf8',
  );

  it('grades credentials with keyed items only', () => {
    expect(source).toContain('scoreAnswers(questions, answers, { keyedOnly: true })');
  });

  it('refuses to issue a credential from an ungrounded fallback test', () => {
    expect(source).toContain("UNGROUNDED_TEST_SOURCES = new Set(['fallback'])");
    expect(source).toContain('UNGROUNDED_TEST_SOURCES.has(String(row.source ?? \'\'))');
    expect(source).toContain('if (passed && !credentialWithheldReason)');
  });

  it('requires an explicitly named generation model', () => {
    expect(source).toContain("if (!model || model === 'openrouter/free')");
    expect(source).not.toContain("|| 'openrouter/free';");
  });
});
