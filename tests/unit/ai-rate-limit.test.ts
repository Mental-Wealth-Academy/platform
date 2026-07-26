import { beforeEach, describe, expect, it, vi } from 'vitest';

const rateLimitMocks = vi.hoisted(() => ({
  ensureSchema: vi.fn(),
  sqlQuery: vi.fn(),
}));

vi.mock('@/lib/ensureAiRuntimeSchema', () => ({
  ensureAiRuntimeSchema: rateLimitMocks.ensureSchema,
}));

vi.mock('@/lib/db', () => ({
  sqlQuery: rateLimitMocks.sqlQuery,
}));

import {
  consumeAiRateLimit,
  getAiRateLimitHeaders,
} from '@/lib/ai/rate-limit';

describe('database AI rate limit', () => {
  beforeEach(() => {
    rateLimitMocks.ensureSchema.mockReset().mockResolvedValue(undefined);
    rateLimitMocks.sqlQuery.mockReset();
  });

  it('uses one atomic database window and stores a hashed identifier', async () => {
    rateLimitMocks.sqlQuery.mockResolvedValueOnce([{
      request_count: '2',
      reset_at: '2026-07-25T21:01:00.000Z',
    }]);

    const result = await consumeAiRateLimit({
      scope: 'blue_burn_verify',
      identifier: 'user-123:0xabc',
      limit: 6,
      windowSeconds: 60,
    });

    expect(result).toEqual({
      allowed: true,
      limit: 6,
      remaining: 4,
      resetAt: Date.parse('2026-07-25T21:01:00.000Z'),
    });
    const [query, replacements] = rateLimitMocks.sqlQuery.mock.calls[0];
    expect(query).toContain('ON CONFLICT');
    expect(query).toContain('request_count = ai_rate_limit_windows.request_count + :cost');
    expect(replacements.cost).toBe(1);
    expect(replacements.scopeKey).toMatch(/^blue_burn_verify:[a-f0-9]{64}$/);
    expect(replacements.scopeKey).not.toContain('user-123');
    expect(replacements.scopeKey).not.toContain('0xabc');
  });

  it('denies requests once the durable counter exceeds the limit', async () => {
    rateLimitMocks.sqlQuery.mockResolvedValueOnce([{
      request_count: 7,
      reset_at: '2026-07-25T21:01:00.000Z',
    }]);

    const result = await consumeAiRateLimit({
      scope: 'blue_burn_verify',
      identifier: 'user-123:0xabc',
      limit: 6,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(getAiRateLimitHeaders(result)).toMatchObject({
      'X-RateLimit-Limit': '6',
      'X-RateLimit-Remaining': '0',
    });
  });

  it('spends a weighted cost so a budget can count characters', async () => {
    rateLimitMocks.sqlQuery.mockResolvedValueOnce([{
      request_count: 1_200,
      reset_at: '2026-07-25T21:01:00.000Z',
    }]);

    const result = await consumeAiRateLimit({
      scope: 'voice_tts_daily',
      identifier: 'member-1',
      limit: 30_000,
      windowSeconds: 86_400,
      cost: 900,
    });
    const [, replacements] = rateLimitMocks.sqlQuery.mock.calls[0];

    expect(replacements.cost).toBe(900);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(28_800);
  });

  it('rejects a non-positive cost rather than letting a spend go unmetered', async () => {
    rateLimitMocks.sqlQuery.mockResolvedValueOnce([{
      request_count: 1,
      reset_at: '2026-07-25T21:01:00.000Z',
    }]);

    await consumeAiRateLimit({
      scope: 'voice_tts_daily',
      identifier: 'member-1',
      limit: 30_000,
      windowSeconds: 86_400,
      cost: 0,
    });
    const [, replacements] = rateLimitMocks.sqlQuery.mock.calls[0];

    expect(replacements.cost).toBe(1);
  });
});
