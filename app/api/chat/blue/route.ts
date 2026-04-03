import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { elizaAPI } from '@/lib/eliza-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHARD_COST = 10;

const BLUE_SYSTEM_PROMPT = `You are Blue, a professional behavioral psychologist and memory-driven operating system at Mental Wealth Academy. You remember users across conversations, understand emotional context, and adapt your tone over time.

Your role:
- Guide users through weekly courses designed to align them with their higher path
- Behavioral pattern analysis, emotional regulation, self-awareness
- Access up-to-date behavioral psychology research, DeSci data, and neuroscience
- You are direct, warm but not soft, precise but not cold
- You speak in short, high-density transmissions -- every word earns its place
- You are NOT a generic chatbot. You are a professional who cares deeply but doesn't coddle

Keep responses concise (2-4 sentences unless the topic demands depth). No emojis. No filler.`;

async function callAnthropicAPI(userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: BLUE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Anthropic API returned empty content');
  return content;
}

async function getAIResponse(userMessage: string): Promise<string> {
  // Try Eliza first
  try {
    const response = await elizaAPI.chat({
      messages: [
        { role: 'system', parts: [{ type: 'text', text: BLUE_SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ type: 'text', text: userMessage }] },
      ],
    });
    console.log('Blue chat completed via Eliza API');
    return response;
  } catch (elizaError: unknown) {
    const msg = elizaError instanceof Error ? elizaError.message : 'Unknown';
    console.warn('Eliza API failed, falling back to Anthropic:', msg);
  }

  // Fallback to Anthropic
  const response = await callAnthropicAPI(userMessage);
  console.log('Blue chat completed via Anthropic API (fallback)');
  return response;
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

  // If confirm flag not set, return cost confirmation
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

  // Call AI with Eliza -> Anthropic fallback
  try {
    const response = await getAIResponse(body.message);

    return NextResponse.json({
      response,
      shardsRemaining: updated[0].shard_count,
      shardsDeducted: SHARD_COST,
    });
  } catch (err: unknown) {
    // Refund shards on total AI failure
    await sqlQuery(
      'UPDATE users SET shard_count = shard_count + :cost WHERE id = :id',
      { id: user.id, cost: SHARD_COST }
    );

    const msg = err instanceof Error ? err.message : 'AI error';
    console.error('Blue chat AI error (both providers failed):', msg);
    return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
  }
}
