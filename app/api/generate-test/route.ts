import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { elizaAPI } from '@/lib/eliza-api';
import { ensureGeneratedTestsSchema } from '@/lib/ensureGeneratedTestsSchema';
import { clampTestDifficulty, getTestShardReward } from '@/lib/test-rewards';

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

interface TestQuestion {
  id: number;
  type: 'multiple_choice' | 'short_answer' | 'scale';
  category: string;
  question: string;
  options?: string[];
}

interface TestData {
  testId?: string;
  shardReward?: number;
  source?: 'openrouter' | 'eliza' | 'anthropic' | 'fallback';
  title: string;
  intro: string;
  questions: TestQuestion[];
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface AnthropicMessagesResponse {
  content?: Array<{
    text?: string;
  }>;
}

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

function isValidTestData(value: unknown): value is TestData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<TestData>;
  if (typeof data.title !== 'string' || typeof data.intro !== 'string' || !Array.isArray(data.questions)) {
    return false;
  }

  return data.questions.length === 8 && data.questions.every((question, index) => {
    if (!question || typeof question !== 'object') return false;
    const q = question as Partial<TestQuestion>;
    if (typeof q.id !== 'number' || q.id !== index + 1) return false;
    if (!['multiple_choice', 'short_answer', 'scale'].includes(String(q.type))) return false;
    if (typeof q.category !== 'string' || typeof q.question !== 'string') return false;
    if (q.type === 'multiple_choice') {
      return Array.isArray(q.options) && q.options.length === 4 && q.options.every((opt) => typeof opt === 'string');
    }
    return q.options === undefined || q.options.length === 0;
  });
}

function buildFallbackTest(difficulty: number, persona: string): TestData {
  const band = difficulty < 110 ? 'Signal Check' : difficulty < 155 ? 'Pattern Audit' : 'Cognition Stress Test';
  const depth = difficulty < 110
    ? 'simple, direct choices'
    : difficulty < 155
      ? 'behavioral tradeoffs'
      : 'high-friction self-modeling';

  return {
    title: band,
    intro: `This run uses ${depth} to map how you decide, recover, and notice yourself under pressure.`,
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        category: 'DECISION MAKING',
        question: `When ${persona} gives you incomplete information, what do you do first?`,
        options: [
          'Pick the safest option and move',
          'Ask for one missing fact before acting',
          'Compare two paths and choose the cleaner risk',
          'Wait until the picture feels complete',
        ],
      },
      {
        id: 2,
        type: 'multiple_choice',
        category: 'STRESS RESPONSE',
        question: 'A plan breaks in public. What is your default response?',
        options: [
          'Get quiet and repair the next step',
          'Explain what happened so people stay calm',
          'Look for who can help immediately',
          'Freeze until the pressure drops',
        ],
      },
      {
        id: 3,
        type: 'scale',
        category: 'SELF-ASSESSMENT',
        question: 'How often do you notice the difference between what you intended and what you actually did?',
      },
      {
        id: 4,
        type: 'multiple_choice',
        category: 'COGNITIVE PATTERN',
        question: 'Which thought loop costs you the most time?',
        options: [
          'Trying to make the perfect choice',
          'Replaying conversations after they end',
          'Starting new ideas before finishing old ones',
          'Assuming one bad signal means the whole plan is bad',
        ],
      },
      {
        id: 5,
        type: 'multiple_choice',
        category: 'SOCIAL DYNAMICS',
        question: 'When a group disagrees with you, what usually happens inside your head?',
        options: [
          'I update fast if their evidence is better',
          'I hold my view but listen for useful details',
          'I get sharper and defend my position',
          'I pull back even when I still disagree',
        ],
      },
      {
        id: 6,
        type: 'scale',
        category: 'EMOTIONAL AWARENESS',
        question: 'How often can you name the emotion driving a decision before you act on it?',
      },
      {
        id: 7,
        type: 'multiple_choice',
        category: 'MENTAL AGILITY',
        question: 'A better explanation appears after you already committed. What do you do?',
        options: [
          'Switch quickly and say why',
          'Test it against the current plan first',
          'Keep both models open until one wins',
          'Stay committed to avoid looking inconsistent',
        ],
      },
      {
        id: 8,
        type: 'short_answer',
        category: 'BEHAVIORAL TENDENCY',
        question: 'Describe one recent moment where your behavior revealed a truth your self-image had been avoiding.',
      },
    ],
  };
}

async function persistGeneratedTest(args: {
  userId: string | null;
  difficulty: number;
  persona: string;
  title: string;
  shardReward: number;
  source: NonNullable<TestData['source']>;
}): Promise<string> {
  const testId = crypto.randomUUID();
  if (!isDbConfigured() || !args.userId) return testId;

  try {
    await ensureGeneratedTestsSchema();
    await sqlQuery(
      `INSERT INTO generated_tests (id, user_id, difficulty, persona, title, shard_reward, source)
       VALUES (:id, :userId, :difficulty, :persona, :title, :shardReward, :source)`,
      {
        id: testId,
        userId: args.userId,
        difficulty: args.difficulty,
        persona: args.persona,
        title: args.title.slice(0, 80),
        shardReward: args.shardReward,
        source: args.source,
      }
    );
  } catch (error) {
    console.error('generate-test: failed to persist generated test', error);
  }

  return testId;
}

function buildUserPrompt(difficulty: number, persona: string): string {
  return `Generate a psychological survey for:
- Difficulty: ${difficulty}/200
- Persona: ${persona}

Scale all complexity, vocabulary, and conceptual depth to difficulty ${difficulty}.
The persona ${persona} shapes the thematic framing of the questions.
Return the JSON only.`;
}

async function callOpenRouter(userPrompt: string): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) throw new Error('OPENROUTER_API_KEY not configured');

  const model = process.env.OPENROUTER_TEST_MODEL || process.env.OPENROUTER_MODEL || 'openrouter/free';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://mentalwealthacademy.world',
      'X-OpenRouter-Title': 'Mental Wealth Academy',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const responseText = await response.text();
  let data: OpenRouterChatResponse | null = null;
  try {
    data = JSON.parse(responseText) as OpenRouterChatResponse;
  } catch {
    // The caller logs and falls back if OpenRouter returns a non-JSON gateway error.
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || responseText || `OpenRouter error: ${response.status}`);
  }

  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error(`OpenRouter returned empty response: ${responseText.slice(0, 200)}`);
  return rawText;
}

async function callEliza(userPrompt: string): Promise<string> {
  return elizaAPI.chat({
    messages: [
      { role: 'system', parts: [{ type: 'text', text: SYSTEM_PROMPT }] },
      { role: 'user', parts: [{ type: 'text', text: userPrompt }] },
    ],
  });
}

async function callAnthropic(userPrompt: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || `Anthropic error: ${response.status}`);
  }

  let data: AnthropicMessagesResponse;
  try {
    data = JSON.parse(responseText) as AnthropicMessagesResponse;
  } catch {
    throw new Error(`Anthropic returned non-JSON response: ${responseText.slice(0, 200)}`);
  }

  const rawText = data.content?.[0]?.text;
  if (!rawText) throw new Error(`Anthropic returned empty response: ${responseText.slice(0, 200)}`);
  return rawText;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequestCookie();

  let body: { difficulty?: number; persona?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const difficulty = clampTestDifficulty(body.difficulty);
  const persona = typeof body.persona === 'string' ? body.persona.slice(0, 60) : 'B.L.U.E.';
  const shardReward = getTestShardReward(difficulty);

  const userPrompt = buildUserPrompt(difficulty, persona);

  let rawText: string | null = null;
  let source: NonNullable<TestData['source']> = 'openrouter';
  try {
    rawText = await callOpenRouter(userPrompt);
  } catch (openRouterError) {
    console.error('generate-test: OpenRouter error', openRouterError);
    source = 'eliza';

    try {
      rawText = await callEliza(userPrompt);
    } catch (elizaError) {
      console.error('generate-test: Eliza fallback error', elizaError);
      source = 'anthropic';

      try {
        rawText = await callAnthropic(userPrompt);
      } catch (anthropicError) {
        console.error('generate-test: Anthropic fallback error', anthropicError);
        source = 'fallback';
        const fallback = buildFallbackTest(difficulty, persona);
        fallback.testId = await persistGeneratedTest({
          userId: user?.id ?? null,
          difficulty,
          persona,
          title: fallback.title,
          shardReward,
          source,
        });
        fallback.shardReward = shardReward;
        fallback.source = source;
        return NextResponse.json(fallback);
      }
    }
  }

  if (!rawText) {
    console.error('generate-test: empty AI response');
    source = 'fallback';
    const fallback = buildFallbackTest(difficulty, persona);
    fallback.testId = await persistGeneratedTest({
      userId: user?.id ?? null,
      difficulty,
      persona,
      title: fallback.title,
      shardReward,
      source,
    });
    fallback.shardReward = shardReward;
    fallback.source = source;
    return NextResponse.json(fallback);
  }

  const testData = tryParseJson(rawText);
  if (!isValidTestData(testData)) {
    console.error('generate-test: failed to parse response', rawText.slice(0, 200));
    source = 'fallback';
    const fallback = buildFallbackTest(difficulty, persona);
    fallback.testId = await persistGeneratedTest({
      userId: user?.id ?? null,
      difficulty,
      persona,
      title: fallback.title,
      shardReward,
      source,
    });
    fallback.shardReward = shardReward;
    fallback.source = source;
    return NextResponse.json(fallback);
  }

  testData.testId = await persistGeneratedTest({
    userId: user?.id ?? null,
    difficulty,
    persona,
    title: testData.title,
    shardReward,
    source,
  });
  testData.shardReward = shardReward;
  testData.source = source;

  return NextResponse.json(testData);
}
