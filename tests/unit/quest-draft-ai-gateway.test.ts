import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  runAiStructured: vi.fn(),
  walletHasMembershipAccess: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  runAiStructured: mocks.runAiStructured,
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromRequestCookie: mocks.getCurrentUser,
}));
vi.mock('@/lib/membership-access', () => ({
  walletHasMembershipAccess: mocks.walletHasMembershipAccess,
}));

import { POST } from '@/app/api/quests/draft/route';

const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
const originalElizaKey = process.env.ELIZA_API_KEY;

function request(prompt: string): Request {
  return new Request('https://academy.example/api/quests/draft', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

describe('POST /api/quests/draft AI gateway migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    delete process.env.ELIZA_API_KEY;
    mocks.getCurrentUser.mockResolvedValue({
      id: 'member-1',
      walletAddress: '0x1234',
    });
    mocks.walletHasMembershipAccess.mockResolvedValue(true);
  });

  afterAll(() => {
    if (originalDeepSeekKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    if (originalElizaKey === undefined) delete process.env.ELIZA_API_KEY;
    else process.env.ELIZA_API_KEY = originalElizaKey;
  });

  it('checks authentication and membership before AI work', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const unauthenticated = await POST(request('Take a ten-minute walk.'));

    expect(unauthenticated.status).toBe(401);
    expect(mocks.walletHasMembershipAccess).not.toHaveBeenCalled();
    expect(mocks.runAiStructured).not.toHaveBeenCalled();

    mocks.getCurrentUser.mockResolvedValue({
      id: 'member-1',
      walletAddress: '0x1234',
    });
    mocks.walletHasMembershipAccess.mockResolvedValue(false);

    const nonMember = await POST(request('Take a ten-minute walk.'));

    expect(nonMember.status).toBe(403);
    expect(await nonMember.json()).toEqual({
      error: 'A membership NFT is required to forge quests.',
      code: 'vip_required',
    });
    expect(mocks.runAiStructured).not.toHaveBeenCalled();
  });

  it('uses structured extraction and preserves field-level fallback and clamps', async () => {
    mocks.runAiStructured.mockImplementation(async (input) => ({
      data: input.schema.parse({
        title: '  Share one useful study note  ',
        description: 'Post one note and include a screenshot.',
        questType: 'unknown',
        rewardKind: 'credits',
        rewardAmount: 5_000,
        targetCount: 99,
      }),
    }));

    const response = await POST(
      request('Upload a screenshot for 3 people and pay 250 credits.'),
    );
    const input = mocks.runAiStructured.mock.calls[0][0];

    expect(input.task).toBe('structured_extract');
    expect(input.schemaName).toBe('quest_draft');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      draft: {
        title: 'Share one useful study note',
        description: 'Post one note and include a screenshot.',
        questType: 'proof-required',
        rewardKind: 'credits',
        rewardAmount: 1_000,
        targetCount: 50,
      },
    });
  });

  it('uses the bounded heuristic when the gateway fails', async () => {
    mocks.runAiStructured.mockRejectedValue(new Error('provider unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const response = await POST(
      request('Upload a screenshot for 3 people and pay 250 credits.'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      draft: {
        title: 'Upload a screenshot for 3 people and pay 250 credits.',
        description: 'Upload a screenshot for 3 people and pay 250 credits.',
        questType: 'proof-required',
        rewardKind: 'credits',
        rewardAmount: 250,
        targetCount: 3,
      },
    });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('keeps the reward rail bound to explicit user intent and re-clamps fallbacks', async () => {
    mocks.runAiStructured.mockImplementation(async (input) => ({
      data: input.schema.parse({
        title: 'Share one useful study note',
        description: 'Post one note.',
        questType: 'no-proof',
        rewardKind: 'usdc',
        rewardAmount: 'missing',
        targetCount: 1,
      }),
    }));

    const creditsResponse = await POST(
      request('Share one note and pay 250 credits.'),
    );
    expect((await creditsResponse.json()).draft).toMatchObject({
      rewardKind: 'credits',
      rewardAmount: 250,
    });

    const usdcResponse = await POST(
      request('Share one note and pay 250 USDC.'),
    );
    expect((await usdcResponse.json()).draft).toMatchObject({
      rewardKind: 'usdc',
      rewardAmount: 25,
    });
  });

  it('uses the same heuristic when no provider is configured', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.ELIZA_API_KEY;

    const response = await POST(
      request('Show proof to the first 2 members for 3.50 usdc.'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      draft: {
        title: 'Show proof to the first 2 members for 3.50 usdc.',
        description: 'Show proof to the first 2 members for 3.50 usdc.',
        questType: 'proof-required',
        rewardKind: 'usdc',
        rewardAmount: 3.5,
        targetCount: 2,
      },
    });
    expect(mocks.runAiStructured).not.toHaveBeenCalled();
  });
});
