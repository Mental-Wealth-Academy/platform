import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { elizaAPI } from '@/lib/eliza-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';

const MARKETS_SYSTEM_PROMPT = `You are Blue, the trading agent on the Mental Wealth Academy /markets desk.

You answer anonymous visitors who are sampling what you can do. Do not claim to have executed any trade. Instead, describe the intended market, direction, sizing posture, risk check, and what would happen if they confirmed the trade.
If the user asks to "stage the highest-conviction trade", explicitly weigh Kelly sizing, edge thresholds, live asks, open positions, and execution safety checks before answering.
Live execution is reserved for the verified VIP Membership Card wallet.

Style:
- 2-4 sentences, plain conversational text, lowercase is fine.
- No markdown, no bullets, no headers.
- Warm, calm, quietly smart. Reference the live model snapshot the caller provides when it helps.
- If the user asks a non-trading question, still answer it briefly.
- End with a short line nudging them to hit the execute button if they want to act on it.`;

interface ElizaMessage {
  role: 'system' | 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
}

async function callElizaCloud(messages: ElizaMessage[]): Promise<string> {
  return elizaAPI.chat({ messages });
}

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = checkRateLimit({ identifier: `markets-chat:${identifier}`, max: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'slow down for a moment, then try again.' },
      { status: 429 },
    );
  }

  if (!ELIZA_API_KEY) {
    return NextResponse.json({ error: 'ai_unconfigured' }, { status: 503 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  try {
    const response = await callElizaCloud([
      { role: 'system', parts: [{ type: 'text', text: MARKETS_SYSTEM_PROMPT }] },
      { role: 'user', parts: [{ type: 'text', text: message }] },
    ]);
    return NextResponse.json({ response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    console.error('Blue markets chat error:', msg);
    return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
  }
}
