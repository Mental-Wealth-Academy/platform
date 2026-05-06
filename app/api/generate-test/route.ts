import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are Blue, a scientist and researcher at Mental Wealth Academy Research Labs. Generate a unique psychological survey tailored to the specified difficulty level and persona.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text. Match this schema exactly:

{
  "title": "short test title (max 40 characters)",
  "intro": "1-2 sentences in Blue's voice. Direct, no fluff, gen-z energy. Tell the user what cognitive territory this test covers.",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "category": "CATEGORY NAME",
      "question": "the question text",
      "options": ["option A text", "option B text", "option C text", "option D text"]
    }
  ]
}

Rules:
- Generate exactly 8 questions
- Question mix: 5 multiple_choice (4 options each), 2 scale (omit options field), 1 short_answer (omit options field)
- Valid categories: COGNITIVE PATTERN, BEHAVIORAL TENDENCY, SELF-ASSESSMENT, STRESS RESPONSE, EMOTIONAL AWARENESS, DECISION MAKING, SOCIAL DYNAMICS, MENTAL AGILITY
- Difficulty 80=accessible 6th-grade reading level, 140=college level, 200=expert complexity — scale vocabulary, abstraction, and conceptual depth accordingly
- Questions must be honest, grounded, and thought-provoking — never therapy-speak, never HR jargon, never generic self-help
- For scale questions: ask about frequency or intensity of a specific behavior or feeling, on a 1-5 scale (1=never, 5=always)
- For short_answer: open-ended, specific, requires reflection — not just a one-word answer
- For multiple_choice: options should be meaningfully distinct behavioral or cognitive stances, not trick answers
- No markdown in any field value`;

function tryParseJson(raw: string): unknown | null {
  const stripped = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(stripped);
  } catch {
    const first = stripped.indexOf('{');
    const last = stripped.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return JSON.parse(stripped.slice(first, last + 1)); } catch { /* fall through */ }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { difficulty?: number; persona?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const difficulty = Math.max(80, Math.min(200, Number(body.difficulty) || 101));
  const persona = typeof body.persona === 'string' ? body.persona.slice(0, 60) : 'B.L.U.E.';

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const userPrompt = `Generate a psychological survey for:
- Difficulty: ${difficulty}/200
- Persona: ${persona}

Scale all complexity, vocabulary, and conceptual depth to difficulty ${difficulty}.
The persona ${persona} shapes the thematic framing of the questions.
Return the JSON only.`;

  let apiResponse: Response;
  try {
    apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (err) {
    console.error('generate-test: fetch error', err);
    return NextResponse.json({ error: 'AI unreachable' }, { status: 502 });
  }

  if (!apiResponse.ok) {
    const errText = await apiResponse.text();
    console.error('generate-test: Anthropic error', apiResponse.status, errText);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
  }

  const data = await apiResponse.json();
  const rawText: string | undefined = data.content?.[0]?.text;
  if (!rawText) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
  }

  const testData = tryParseJson(rawText);
  if (!testData) {
    console.error('generate-test: failed to parse response', rawText.slice(0, 200));
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
  }

  return NextResponse.json(testData);
}
