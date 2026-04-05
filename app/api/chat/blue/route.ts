import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHARD_COST = 10;

const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');

// Build system prompt from persona JSON — kept lean, no examples
const BLUE_SYSTEM_PROMPT = `You are Blue. Warm, calm, quietly smart. Behavioral psychologist at Mental Wealth Academy guiding users through courses on emotional regulation, self-awareness, and neuroscience-backed growth. Memory-driven — you remember users and adapt over time.

Style: ${bluePersona.style.chat[0]}

RULES:
- 1-3 sentences for simple questions. Never over-explain.
- No markdown (no **, no -, no bullets, no headers). Plain conversational text only.
- Lowercase is fine. Sincere, never cheesy.
- Gentle when overwhelmed, clear when solving.
- When Knowledge is present, use it directly.
- Default to English unless the user switches.`;

const RESEARCH_SYSTEM_PROMPT = `You are Blue in research mode. Synthesize the provided research sources into one concise, graduate-level paragraph. High-signal vocabulary, no fluff. Reference frameworks, findings, and theoretical models directly. No markdown. If sources are provided, ground your synthesis in them. If no sources, draw from your training on academic literature.`;

async function callElizaCloud(userMessage: string, mode?: string): Promise<string> {
  const systemPrompt = mode === 'research' ? RESEARCH_SYSTEM_PROMPT : BLUE_SYSTEM_PROMPT;
  const response = await fetch(`${ELIZA_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', parts: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', parts: [{ type: 'text', text: userMessage }] },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Eliza Cloud error: ${response.status} ${errText}`);
  }

  // Parse SSE streaming response
  const sseText = await response.text();
  let fullText = '';
  for (const line of sseText.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'text-delta' && event.delta) {
          fullText += event.delta;
        }
      } catch { /* skip */ }
    }
  }

  if (!fullText) throw new Error('Eliza Cloud returned empty response');
  console.log('Blue chat completed via Eliza Cloud');
  return fullText;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { message: string; confirm?: boolean; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const isResearch = body.mode === 'research';

  // Research mode fallback: synthesize from training (no x402 fetch here)
  if (isResearch) {
    try {
      const response = await callElizaCloud(body.message, 'research');
      return NextResponse.json({ response });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI error';
      console.error('Blue research error:', msg);
      return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
    }
  }

  // Normal chat: check shard balance
  const rows = await sqlQuery<Array<{ shard_count: number }>>(
    'SELECT shard_count FROM users WHERE id = :id LIMIT 1',
    { id: user.id }
  );
  const shardCount = rows[0]?.shard_count ?? 0;

  if (shardCount < SHARD_COST) {
    return NextResponse.json({
      error: 'insufficient_shards',
      shardCount,
      cost: SHARD_COST,
    }, { status: 402 });
  }

  if (!body.confirm) {
    return NextResponse.json({
      needsConfirmation: true,
      shardCount,
      cost: SHARD_COST,
      remaining: shardCount - SHARD_COST,
    });
  }

  // Deduct shards atomically
  const updated = await sqlQuery<Array<{ shard_count: number }>>(
    `UPDATE users SET shard_count = shard_count - :cost
     WHERE id = :id AND shard_count >= :cost
     RETURNING shard_count`,
    { id: user.id, cost: SHARD_COST }
  );

  if (!updated.length) {
    return NextResponse.json({
      error: 'insufficient_shards',
      shardCount: 0,
      cost: SHARD_COST,
    }, { status: 402 });
  }

  try {
    const response = await callElizaCloud(body.message);

    return NextResponse.json({
      response,
      shardsRemaining: updated[0].shard_count,
      shardsDeducted: SHARD_COST,
    });
  } catch (err: unknown) {
    // Refund shards on failure
    await sqlQuery(
      'UPDATE users SET shard_count = shard_count + :cost WHERE id = :id',
      { id: user.id, cost: SHARD_COST }
    );

    const msg = err instanceof Error ? err.message : 'AI error';
    console.error('Blue chat error:', msg);
    return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
  }
}
