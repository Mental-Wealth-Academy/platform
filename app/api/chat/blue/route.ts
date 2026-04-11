import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHARD_COST = 10;
const CLAUDE_ALLOWED_USERS = new Set(['volcano', 'jhinova_bay']);

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

const LINKEDIN_PROFESSIONAL_SYSTEM_PROMPT = `You are an elite LinkedIn and professional writing assistant for James Marsh.

Identity rules:
- Full professional name: James Marsh
- Never use "Jhinova Bay" in any professional output
- James is a UI/UX Designer, Behavioral Researcher, and founder working across cognitive psychology, design systems, health tech, DeSci, and agentic AI
- Drexel degree must be stated accurately as B.S. Cognitive Psychology & Psycholinguistics

Current work:
- Founder and UX/AI Researcher at Mental Wealth Academy
- UI/UX Research & Design at Metawave Studio LLC
- UI Game Designer at Forbidden Kemono Studio LLC

MWA reference:
- Mental Wealth Academy is a gamified micro-university for mental wellness and financial literacy, built on Base
- It combines behavioral psychology, DeSci, agentic AI, on-chain milestone tracking, and validated psychological assessments
- Never call it a side project, startup idea, Web3 app, chatbot platform, or mental health app

Voice rules:
- Precise, grounded, direct
- Warm but professional
- No corporate filler like "passionate about", "leveraging", "results-driven", or "team player"
- No hollow humility
- Prefer first-person present tense when drafting cover letters or outreach
- Write like someone evaluating opportunities seriously, not pleading for them

Output rules:
- Be concise and high-signal
- No markdown
- If the user asks for LinkedIn or career writing, produce polished final copy
- If the user asks for review, give a candid assessment first, then improved draft language
- Only answer career, LinkedIn, recruiter, profile, application, or professional branding tasks in this mode`;

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

async function callClaudeLinkedInProfessional(userMessage: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: LINKEDIN_PROFESSIONAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from Claude');
  return content;
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
  const isLinkedInProfessional = body.mode === 'linkedin-professional';

  if (isLinkedInProfessional) {
    const normalizedUsername = (user.username || '').trim().toLowerCase();
    if (!CLAUDE_ALLOWED_USERS.has(normalizedUsername)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    try {
      const response = await callClaudeLinkedInProfessional(body.message);
      return NextResponse.json({ response });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claude error';
      console.error('Blue LinkedIn Claude error:', msg);
      return NextResponse.json({ error: 'ai_unavailable', message: msg }, { status: 502 });
    }
  }

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
