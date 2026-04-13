import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SUGGEST_SYSTEM = `You are a research librarian. Given a topic, return exactly 3 seminal academic works — books, papers, or reports — that are directly relevant. Return ONLY a valid JSON array, no other text, no markdown, no explanation.
Format: [{"title":"...","author":"...","year":1990,"desc":"One sentence on its core contribution to this topic."}]
Requirements: real published works only, accurate titles and authors, works that have shaped the field.`;

export interface ResearchSuggestion {
  title: string;
  author: string;
  year?: number;
  desc: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  let body: { topic: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== 'string') {
    return NextResponse.json({ error: 'Topic required' }, { status: 400 });
  }

  const topic = body.topic.slice(0, 200);

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SUGGEST_SYSTEM,
      messages: [
        { role: 'user', content: `Research topic: ${topic}` },
      ],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Suggest failed' }, { status: 502 });
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text || '';

  let suggestions: ResearchSuggestion[] = [];
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      suggestions = parsed.slice(0, 3).filter(
        (s) => typeof s.title === 'string' && typeof s.author === 'string'
      );
    }
  } catch {
    return NextResponse.json({ error: 'Parse failed' }, { status: 502 });
  }

  return NextResponse.json({ suggestions });
}
