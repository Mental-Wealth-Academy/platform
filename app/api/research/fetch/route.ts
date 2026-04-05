import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { fetchSelectedSources, encodeForLLM } from '@/lib/x402-research';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');

const RESEARCH_PROMPT = `You are Blue in research mode. Synthesize the provided research into one concise, graduate-level paragraph. High-signal vocabulary, no fluff. Reference frameworks, findings, and theoretical models directly. No markdown. Ground your synthesis in the sources provided.`;

async function synthesize(topic: string, sourceContext: string): Promise<string> {
  const userMessage = sourceContext
    ? `Topic: ${topic}\n\n${sourceContext}\n\nSynthesize the above into one paragraph.`
    : `Topic: ${topic}\n\nProvide a graduate-level synthesis on this topic.`;

  const res = await fetch(`${ELIZA_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', parts: [{ type: 'text', text: RESEARCH_PROMPT }] },
        { role: 'user', parts: [{ type: 'text', text: userMessage }] },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Eliza error: ${res.status}`);

  const sseText = await res.text();
  let fullText = '';
  for (const line of sseText.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'text-delta' && event.delta) fullText += event.delta;
      } catch { /* skip */ }
    }
  }

  if (!fullText) throw new Error('Empty research response');
  return fullText;
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    topic: string;
    sources: { id: string; url: string; title: string }[];
    txHash?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.topic || !body.sources?.length) {
    return NextResponse.json({ error: 'Topic and sources required' }, { status: 400 });
  }

  try {
    // Fetch paid content via x402
    const fetched = await fetchSelectedSources(body.sources);
    console.log(`x402 research: fetched ${fetched.length}/${body.sources.length} sources for "${body.topic}"`);

    // Encode fetched content in TOON format for token efficiency
    const sourceContext = encodeForLLM(fetched);

    // Synthesize into one paragraph
    const synthesis = await synthesize(body.topic, sourceContext);

    return NextResponse.json({
      synthesis,
      sourcesFetched: fetched.length,
      sourcesRequested: body.sources.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Research fetch failed';
    console.error('Research fetch error:', msg);
    return NextResponse.json({ error: 'research_failed', message: msg }, { status: 502 });
  }
}
