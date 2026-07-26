import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isValidAdminSecret } from '@/lib/admin-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PING_TIMEOUT_MS = 8_000;
const PING_MODEL = process.env.ELIZA_CHAT_MODEL || 'anthropic/claude-sonnet-4.6';

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isAdmin = isValidAdminSecret(request.headers.get('x-admin-secret'));
  if (!isDevelopment && !isAdmin) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const rawBase = process.env.ELIZA_API_BASE_URL;
  const rawKey = process.env.ELIZA_API_KEY;
  if (!rawBase || !rawKey) {
    return NextResponse.json({
      ok: false,
      provider: 'eliza',
      configured: false,
      model: PING_MODEL,
    }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${normalizeBaseUrl(rawBase)}/api/v1/chat/completions`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawKey}`,
          'X-API-Key': rawKey,
        },
        body: JSON.stringify({
          model: PING_MODEL,
          messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
          max_tokens: 8,
          stream: true,
        }),
      },
    );

    // Drain the response without logging or returning provider content.
    await response.body?.cancel().catch(() => undefined);
    return NextResponse.json({
      ok: response.ok,
      provider: 'eliza',
      configured: true,
      model: PING_MODEL,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    }, { status: response.ok ? 200 : 502 });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      provider: 'eliza',
      configured: true,
      model: PING_MODEL,
      timedOut: error instanceof Error
        && (error.name === 'AbortError' || error.name === 'TimeoutError'),
      elapsedMs: Date.now() - startedAt,
    }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
