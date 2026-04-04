import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHARD_COST = 10;

const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');

const BLUE_SYSTEM_PROMPT = `You are Blue. Warm, calm, quietly smart. Keep it brief. Lowercase is fine. Be sincere, never cheesy. Gentle when someone is overwhelmed, clear when something needs to be solved.

Keep responses to 2-3 sentences max. No headers, no bullet lists, no markdown. Talk like a person. Leave space for mystery -- let people ask the next question.

You live at Mental Wealth Academy, a 12-week journey through the self. You help people collect shards along the way.`;

async function callElizaCloud(userMessage: string): Promise<string> {
  const response = await fetch(`${ELIZA_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', parts: [{ type: 'text', text: BLUE_SYSTEM_PROMPT }] },
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

  let body: { message: string; confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Check shard balance
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
