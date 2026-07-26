import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured } from '@/lib/db';
import { buildBlueContext } from '@/lib/blue-memory';
import { elizaAPI } from '@/lib/eliza-api';
import { scriptForWeek } from '@/components/daily-read/weeklyScripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const CHAT_MODEL = process.env.ELIZA_CHAT_MODEL || 'anthropic/claude-sonnet-4.6';

const DIALOGUE_SYSTEM_PROMPT = `You write Blue's weekly check-in lines for Mental Wealth Academy. Blue is an autonomous agent with persistent memory of each learner. Her voice: first person, short declarative sentences of roughly 8 to 14 words, calm and direct, in the learner's corner but never syrupy. She evaluates, she does not flatter. No emojis, no exclamation points, no all-caps, no em dashes. She never sounds like customer support and never breaks character.

You receive the canonical script for this week plus Blue's memory of this specific learner. Rewrite the script so it speaks to them.

Rules:
- Return ONLY raw JSON in exactly this shape: {"lines":["...","..."]} with 2 to 4 lines, each under 240 characters.
- Keep the week's theme and every concrete instruction from the base script.
- Weave in at most one specific detail from the learner's memory context. Prefer their own written words, quoted as a short fragment and placed in time, in this register: "In week 3 you wrote that mornings were the hard part. This week's artist date is a chance to test that."
- Only reference details that actually appear in the context. Never invent history, quotes, or numbers.
- If the context holds nothing worth referencing, return the base lines unchanged.
- If what the learner wrote is tender, reference it gently and without judgment.`;

interface DialoguePayload {
  lines?: unknown;
}

function parseLines(raw: string, fallback: string[]): string[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  let parsed: DialoguePayload;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fallback;
  }
  if (!Array.isArray(parsed.lines)) return fallback;
  const lines = parsed.lines
    .filter((line): line is string => typeof line === 'string')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.length > 280 ? `${line.slice(0, 279).trimEnd()}…` : line))
    .slice(0, 4);
  return lines.length >= 2 ? lines : fallback;
}

async function callDeepSeek(userContent: string): Promise<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: DIALOGUE_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      stream: false,
      max_tokens: 500,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek dialogue error: ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') throw new Error('DeepSeek returned empty dialogue');
  return content;
}

/**
 * GET /api/blue/dialogue?week=N — Blue's weekly check-in lines, personalized
 * from her memory of the caller (field-note excerpts, progress, durable
 * facts). Falls back to the canonical static script on any failure, so the
 * client can always render something; callers should treat the static script
 * as the default and this as an upgrade.
 */
export async function GET(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const week = Number(url.searchParams.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > 12) {
    return NextResponse.json({ error: 'Invalid week.' }, { status: 400 });
  }

  const base = scriptForWeek(week);

  if (!isDbConfigured() || (!DEEPSEEK_API_KEY && !ELIZA_API_KEY)) {
    return NextResponse.json({ lines: base.lines, personalized: false });
  }

  try {
    const blueContext = await buildBlueContext({ userId: user.id, username: user.username });

    // Nothing personal to draw on yet: skip the model call entirely.
    if (blueContext.values.journalExcerpts.length === 0 && blueContext.values.recentFacts.length === 0) {
      return NextResponse.json({ lines: base.lines, personalized: false });
    }

    const userContent = [
      `Week ${week} base script (title: ${base.title}):`,
      ...base.lines.map((line) => `- ${line}`),
      '',
      blueContext.contextText,
    ].join('\n');

    const raw = DEEPSEEK_API_KEY
      ? await callDeepSeek(userContent)
      : await elizaAPI.chat({
          messages: [
            { role: 'system', content: DIALOGUE_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          id: CHAT_MODEL,
          maxTokens: 500,
        });

    const lines = parseLines(raw, base.lines);
    return NextResponse.json({ lines, personalized: lines !== base.lines });
  } catch (err) {
    console.warn('[blue/dialogue] personalization failed, using base script:', err);
    return NextResponse.json({ lines: base.lines, personalized: false });
  }
}
