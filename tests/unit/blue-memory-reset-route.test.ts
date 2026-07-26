import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetMocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  ensureSchema: vi.fn(),
  getCurrentUser: vi.fn(),
  isDbConfigured: vi.fn(),
  sqlQueryWithClient: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  consumeAiRateLimit: resetMocks.consumeRateLimit,
  getAiRateLimitHeaders: () => ({ 'Retry-After': '60' }),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromRequestCookie: resetMocks.getCurrentUser,
}));
vi.mock('@/lib/db', () => ({
  isDbConfigured: resetMocks.isDbConfigured,
  sqlQueryWithClient: resetMocks.sqlQueryWithClient,
  withTransaction: resetMocks.withTransaction,
}));
vi.mock('@/lib/ensureBlueMemorySchema', () => ({
  ensureBlueMemorySchema: resetMocks.ensureSchema,
}));

import { DELETE } from '@/app/api/chat/blue/memory/route';

describe('DELETE /api/chat/blue/memory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks.isDbConfigured.mockReturnValue(true);
    resetMocks.getCurrentUser.mockResolvedValue({ id: 'member-1' });
    resetMocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      limit: 3,
      remaining: 2,
      resetAt: Date.now() + 60_000,
    });
    resetMocks.ensureSchema.mockResolvedValue(undefined);
    resetMocks.sqlQueryWithClient.mockResolvedValue([]);
    resetMocks.withTransaction.mockImplementation(async (callback) => (
      callback({ query: vi.fn() })
    ));
  });

  it('requires an authenticated member', async () => {
    resetMocks.getCurrentUser.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(resetMocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(resetMocks.withTransaction).not.toHaveBeenCalled();
  });

  it('deletes private memory tables together and leaves burn records alone', async () => {
    const response = await DELETE();
    const statements = resetMocks.sqlQueryWithClient.mock.calls
      .map((call) => String(call[1]));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(statements).toHaveLength(4);
    expect(statements.join('\n')).toContain('DELETE FROM blue_memory_outbox');
    expect(statements.join('\n')).toContain('DELETE FROM blue_memory_facts');
    expect(statements.join('\n')).toContain('DELETE FROM blue_chat_messages');
    expect(statements.join('\n')).toContain('DELETE FROM blue_relationship_state');
    expect(statements.join('\n')).not.toContain('diamond_burns');
    expect(resetMocks.sqlQueryWithClient.mock.calls.every(
      (call) => call[2]?.userId === 'member-1',
    )).toBe(true);
  });

  it('fails closed when the durable limiter is unavailable', async () => {
    resetMocks.consumeRateLimit.mockRejectedValue(new Error('database down'));

    const response = await DELETE();

    expect(response.status).toBe(503);
    expect(resetMocks.withTransaction).not.toHaveBeenCalled();
  });
});
