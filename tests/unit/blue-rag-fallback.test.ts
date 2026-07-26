import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ragMocks = vi.hoisted(() => ({
  ensureReady: vi.fn(),
  sqlQuery: vi.fn(),
}));

vi.mock('@/lib/blue-rag-index', () => ({
  ensureBlueRagReady: ragMocks.ensureReady,
}));

vi.mock('@/lib/db', () => ({
  isDbConfigured: () => true,
  sqlQuery: ragMocks.sqlQuery,
}));

import { runBlueRagGraph } from '@/lib/blue-rag-graph';

describe('Blue RAG authoritative local fallback', () => {
  beforeEach(() => {
    ragMocks.ensureReady.mockReset();
    ragMocks.sqlQuery.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses bundled product knowledge when database retrieval throws', async () => {
    ragMocks.ensureReady.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await runBlueRagGraph({
      message: 'how much is VIP membership and what does it unlock?',
      pathname: '/shop',
      limit: 4,
    });

    expect(result.retrievalMode).toBe('local-fallback');
    expect(result.fallbackReason).toBe('database_error');
    expect(result.entries[0]?.id).toBe('vip-membership');
    expect(result.quality.trusted).toBe(true);
    expect(result.contextText).toContain('VIP Membership');
  });

  it('uses bundled product knowledge when the index manifest is stale', async () => {
    ragMocks.ensureReady.mockResolvedValueOnce({
      ready: false,
      reason: 'manifest_mismatch',
    });
    ragMocks.sqlQuery.mockResolvedValueOnce([{
      published_count: 0,
      latest_update: null,
    }]);

    const result = await runBlueRagGraph({
      message: 'where can i change my profile and username?',
      pathname: '/profile',
      limit: 4,
    });

    expect(result.retrievalMode).toBe('local-fallback');
    expect(result.fallbackReason).toBe('index_unavailable');
    expect(result.entries[0]?.id).toBe('page-profile');
    expect(result.quality.trusted).toBe(true);
  });
});
