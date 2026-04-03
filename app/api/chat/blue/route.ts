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

  // Call Eliza API
  try {
    const response = await elizaAPI.chat({
      messages: [
        {
          role: 'system',
          parts: [{ type: 'text', text: BLUE_SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          parts: [{ type: 'text', text: body.message }],
        },
      ],
    });

    return NextResponse.json({
      response,
      shardsRemaining: updated[0].shard_count,
      shardsDeducted: SHARD_COST,
    });
  } catch (err: unknown) {
    // Refund shards on API failure
    await sqlQuery(
      'UPDATE users SET shard_count = shard_count + :cost WHERE id = :id',
      { id: user.id, cost: SHARD_COST }
    );

    const msg = err instanceof Error ? err.message : 'Eliza API error';
    console.error('Blue chat Eliza error:', msg);
    return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
  }
}
