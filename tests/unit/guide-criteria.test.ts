import { describe, it, expect } from 'vitest';
import {
  simplifyWellnessCriterion,
  simplifyWellnessCriteria,
} from '@/lib/guide-criteria';

describe('guide criteria simplification', () => {
  it('strips "The learner can" and capitalizes the action verb', () => {
    expect(
      simplifyWellnessCriterion(
        'The learner can explain what attention is and why noticing where it points comes before other skills.'
      )
    ).toBe(
      'Explain what attention is and why noticing where it points comes before other skills.'
    );

    expect(
      simplifyWellnessCriterion(
        'The learner can complete a one-minute anchor drill and record what pulled attention away.'
      )
    ).toBe(
      'Complete a one-minute anchor drill and record what pulled attention away.'
    );

    expect(
      simplifyWellnessCriterion(
        'The learner can name one limit of attention training and one question worth investigating next.'
      )
    ).toBe(
      'Name one limit of attention training and one question worth investigating next.'
    );
  });

  it('handles variations like "Learners can", "The user can", "The learner will", "You can"', () => {
    expect(
      simplifyWellnessCriterion('Learners can catch an automatic thought.')
    ).toBe('Catch an automatic thought.');

    expect(
      simplifyWellnessCriterion('The user can rewrite a distorted thought.')
    ).toBe('Rewrite a distorted thought.');

    expect(
      simplifyWellnessCriterion('The learner will identify when boundaries are needed.')
    ).toBe('Identify when boundaries are needed.');

    expect(
      simplifyWellnessCriterion('You can replace a low-resolution feeling word.')
    ).toBe('Replace a low-resolution feeling word.');

    expect(
      simplifyWellnessCriterion('The learner is able to distinguish sleep from recovery.')
    ).toBe('Distinguish sleep from recovery.');
  });

  it('preserves already-direct wellness instructions', () => {
    expect(
      simplifyWellnessCriterion('Be yourself and answer honestly to find out your archetype.')
    ).toBe('Be yourself and answer honestly to find out your archetype.');

    expect(
      simplifyWellnessCriterion('Practice 2 minutes of box breathing daily.')
    ).toBe('Practice 2 minutes of box breathing daily.');
  });

  it('handles empty or malformed inputs cleanly', () => {
    expect(simplifyWellnessCriterion('')).toBe('');
    expect(simplifyWellnessCriteria([])).toEqual([]);
    expect(
      simplifyWellnessCriteria([
        'The learner can notice wandering.',
        '',
        '   ',
        'The learner can return focus.',
      ])
    ).toEqual(['Notice wandering.', 'Return focus.']);
  });
});
