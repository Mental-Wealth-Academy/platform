import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const retentionMocks = vi.hoisted(() => ({
  ensureAiSchema: vi.fn(),
  ensureSchema: vi.fn(),
  isDbConfigured: vi.fn(),
  sqlQueryWithClient: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  isDbConfigured: retentionMocks.isDbConfigured,
  sqlQueryWithClient: retentionMocks.sqlQueryWithClient,
  withTransaction: retentionMocks.withTransaction,
}));
vi.mock('@/lib/ensureBlueMemorySchema', () => ({
  ensureBlueMemorySchema: retentionMocks.ensureSchema,
}));
vi.mock('@/lib/ensureAiRuntimeSchema', () => ({
  ensureAiRuntimeSchema: retentionMocks.ensureAiSchema,
}));

import { GET } from '@/app/api/cron/blue-memory-retention/route';

const originalCronSecret = process.env.CRON_SECRET;

function request(secret = 'test-cron-secret'): Request {
  return new Request('https://academy.example/api/cron/blue-memory-retention', {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe('Blue memory retention cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    retentionMocks.isDbConfigured.mockReturnValue(true);
    retentionMocks.ensureAiSchema.mockResolvedValue(undefined);
    retentionMocks.ensureSchema.mockResolvedValue(undefined);
    retentionMocks.sqlQueryWithClient.mockResolvedValue([]);
    retentionMocks.withTransaction.mockImplementation(async (callback) => (
      callback({ query: vi.fn() })
    ));
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('requires the cron bearer secret', async () => {
    const response = await GET(request('wrong'));

    expect(response.status).toBe(401);
    expect(retentionMocks.ensureSchema).not.toHaveBeenCalled();
  });

  it('applies each documented retention window in one transaction', async () => {
    const response = await GET(request());
    const statements = retentionMocks.sqlQueryWithClient.mock.calls
      .map((call) => String(call[1]))
      .join('\n');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(retentionMocks.withTransaction).toHaveBeenCalledOnce();
    expect(statements).toContain("window_started_at < NOW() - INTERVAL '2 days'");
    expect(statements).toContain("completed_at < NOW() - INTERVAL '7 days'");
    expect(statements).toContain("superseded_at < NOW() - INTERVAL '30 days'");
    expect(statements).toContain("created_at < NOW() - INTERVAL '90 days'");
    expect(statements).toContain("updated_at < NOW() - INTERVAL '365 days'");
    expect(statements).toContain("last_interaction_at < NOW() - INTERVAL '365 days'");
  });
});
