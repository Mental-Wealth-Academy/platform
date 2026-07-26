import { beforeEach, describe, expect, it, vi } from 'vitest';

const ttsMocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getCurrentUser: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  consumeAiRateLimit: ttsMocks.consumeRateLimit,
  getAiRateLimitHeaders: () => ({ 'Retry-After': '60' }),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromRequestCookie: ttsMocks.getCurrentUser,
}));
vi.mock('node:fs/promises', () => ({
  readFile: ttsMocks.readFile,
}));

process.env.ELEVENLABS_API_KEY = 'test-key';
process.env.ELEVENLABS_VOICE_ID = 'blue-voice';
process.env.ELEVENLABS_NARRATOR_VOICE_ID = 'narrator-voice';

const { POST } = await import('@/app/api/voice/tts/route');

function ttsRequest(body: unknown) {
  return new Request('https://example.test/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function providerAudio() {
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}

describe('POST /api/voice/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    ttsMocks.getCurrentUser.mockResolvedValue({ id: 'member-1' });
    ttsMocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      limit: 30_000,
      remaining: 29_000,
      resetAt: Date.now() + 60_000,
    });
    ttsMocks.readFile.mockRejectedValue(new Error('no clip'));
  });

  it('requires a member before spending on live synthesis', async () => {
    ttsMocks.getCurrentUser.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({ text: 'an unscripted line' }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ttsMocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it('ignores a client-supplied provider voice and model', async () => {
    const fetchMock = vi.fn(async () => providerAudio());
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({
      text: 'an unscripted line',
      voiceId: 'attacker-voice',
      modelId: 'attacker-model',
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('blue-voice');
    expect(url).not.toContain('attacker-voice');
    expect(String(init.body)).not.toContain('attacker-model');
  });

  it('resolves a named preset server-side', async () => {
    const fetchMock = vi.fn(async () => providerAudio());
    vi.stubGlobal('fetch', fetchMock);

    await POST(ttsRequest({ text: 'a narrated line', voice: 'narrator' }));

    expect(String(fetchMock.mock.calls[0][0])).toContain('narrator-voice');
  });

  it('falls back to Blue for an unknown preset name', async () => {
    const fetchMock = vi.fn(async () => providerAudio());
    vi.stubGlobal('fetch', fetchMock);

    await POST(ttsRequest({ text: 'a line', voice: 'constructor' }));

    expect(String(fetchMock.mock.calls[0][0])).toContain('blue-voice');
  });

  it('rejects oversized text before reaching the provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({ text: 'x'.repeat(1_501) }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('spends characters rather than requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => providerAudio()));
    const text = 'y'.repeat(120);

    await POST(ttsRequest({ text }));

    expect(ttsMocks.consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'member-1', cost: 120 }),
    );
  });

  it('stops once the budget is exhausted', async () => {
    ttsMocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      limit: 30_000,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({ text: 'a line' }));

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the durable limiter is unavailable', async () => {
    ttsMocks.consumeRateLimit.mockRejectedValue(new Error('database down'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({ text: 'a line' }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves a pre-recorded clip without a session or provider call', async () => {
    ttsMocks.getCurrentUser.mockResolvedValue(null);
    ttsMocks.readFile.mockResolvedValue(Buffer.from([4, 5, 6]));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(ttsRequest({ text: 'hey. what are we working on?' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ttsMocks.consumeRateLimit).not.toHaveBeenCalled();
  });
});
