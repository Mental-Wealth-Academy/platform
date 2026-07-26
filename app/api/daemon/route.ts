import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Mode = 'rewrite' | 'tone' | 'critique' | 'summarize';

type Tone = 'concise' | 'warm' | 'formal' | 'friendly' | 'direct';

function systemPrompt(mode: Mode, tone: Tone) {
  const base = `You are Daemon, an expert editor and UX-minded writing assistant.
Output only the final answer text (no markdown fences).`;

  const modeLine =
    mode === 'rewrite'
      ? 'Rewrite the input into a polished, high-quality result.'
      : mode === 'tone'
        ? 'Rewrite the input preserving meaning while changing tone.'
        : mode === 'critique'
          ? 'Provide a concise critique with specific, actionable bullet points.'
          : 'Summarize the input into key points and action items.';

  const toneLine = mode === 'critique' || mode === 'summarize'
    ? ''
    : `Target tone: ${tone}.`;

  return `${base}

Task: ${modeLine}
${toneLine}`.trim();
}

export async function POST(request: Request) {
  // SECURITY: Require authentication and rate limiting
  const { getCurrentUserFromRequestCookie } = await import('@/lib/auth');
  const { checkRateLimit, getClientIdentifier, getRateLimitHeaders } = await import('@/lib/rate-limit');
  
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  
  // Rate limit: 20 requests per hour per user
  const rateLimitResult = checkRateLimit({
    max: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    identifier: getClientIdentifier(request, user.id),
  });
  
  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetAt);
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}` },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode as Mode;
  const tone = body?.tone as Tone;
  const input = typeof body?.input === 'string' ? body.input : '';
  const contextEmail = typeof body?.contextEmail === 'string' ? body.contextEmail : '';

  if (!input.trim()) {
    return NextResponse.json({ error: 'Input is required.' }, { status: 400 });
  }
  
  // SECURITY: Limit input length to prevent abuse
  if (input.length > 5000) {
    return NextResponse.json({ error: 'Input too long. Maximum 5000 characters.' }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'DEEPSEEK_API_KEY is not set. Add it to .env.local to enable DeepSeek.',
      },
      { status: 501 }
    );
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt(mode, tone) },
    {
      role: 'user',
      content:
        (contextEmail.trim()
          ? `EMAIL YOU ARE RESPONDING TO:\n${contextEmail.trim()}\n\n`
          : '') + `INPUT:\n${input.trim()}`,
    },
  ];

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      max_tokens: 900,
      temperature: 0.4,
      messages,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || 'DeepSeek request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const text =
    data?.choices?.[0]?.message?.content
      ? String(data.choices[0].message.content)
      : '';

  // Add rate limit headers to successful response
  return NextResponse.json(
    { output: text || '' },
    { headers: getRateLimitHeaders(rateLimitResult) }
  );
}
