import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { buildBlueContext, storeBlueChatMessage, touchBlueRelationship, upsertBlueFacts } from '@/lib/blue-memory';
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

const BLUE_MEMORY_EXTRACTION_PROMPT = `Extract only durable, high-signal memories about the user from this exchange.

Return raw JSON only in this shape:
{"facts":[{"category":"preference|goal|theme|follow_up|identity|habit","summary":"string","confidence":0.0}]}

Rules:
- Only include memories likely to matter in future conversations.
- Keep summaries short, concrete, and reusable.
- Do not store transient moods, raw private journal text, or broad psychological labels.
- If nothing durable should be stored, return {"facts":[]}.`;

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

interface ChatAttachment {
  url: string;
  mime: string;
  name?: string;
  extractedText?: string | null;
}

interface ElizaMessage {
  role: 'system' | 'user' | 'assistant';
  parts: Array<{
    type: 'text';
    text: string;
  }>;
}

function isClaudeImageMime(mime: string) {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime);
}

function isSafeUploadUrl(url: string) {
  return typeof url === 'string' && /^\/uploads\/[A-Za-z0-9._-]+$/.test(url);
}

async function readUploadedImageAsBase64(url: string): Promise<string | null> {
  if (!isSafeUploadUrl(url)) return null;

  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''));
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(uploadsRoot)) {
    return null;
  }

  try {
    const bytes = await readFile(normalizedPath);
    return bytes.toString('base64');
  } catch {
    return null;
  }
}

async function buildLinkedInClaudeMessage(
  userMessage: string,
  attachments: ChatAttachment[]
) {
  const content: Array<Record<string, unknown>> = [];
  const attachmentNotes: string[] = [];

  for (const attachment of attachments.slice(0, 4)) {
    if (!isSafeUploadUrl(attachment.url)) continue;

    const label = attachment.name || attachment.url.split('/').pop() || 'attachment';
    if (attachment.mime === 'application/pdf') {
      attachmentNotes.push(
        attachment.extractedText?.trim()
          ? `PDF: ${label}\n${attachment.extractedText.trim()}`
          : `PDF: ${label}\nNo extractable text was available from this file.`
      );
      continue;
    }

    if (isClaudeImageMime(attachment.mime)) {
      const base64 = await readUploadedImageAsBase64(attachment.url);
      if (base64) {
        attachmentNotes.push(`Image attached: ${label}`);
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.mime,
            data: base64,
          },
        });
      }
    }
  }

  const textBlock = [
    `User request:\n${userMessage}`,
    attachmentNotes.length > 0
      ? `Attachment context:\n${attachmentNotes.join('\n\n')}`
      : null,
  ].filter(Boolean).join('\n\n');

  return [
    { type: 'text', text: textBlock },
    ...content,
  ];
}

async function callElizaCloud(messages: ElizaMessage[]): Promise<string> {
  const response = await fetch(`${ELIZA_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
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

function buildBlueChatMessages(args: {
  userMessage: string;
  contextText: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; text: string }>;
}): ElizaMessage[] {
  const truncate = (text: string, maxLength: number) => (
    text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
  );

  const historyMessages: ElizaMessage[] = args.recentMessages.map((message) => ({
    role: message.role,
    parts: [{ type: 'text', text: truncate(message.text, 320) }],
  }));

  return [
    {
      role: 'system',
      parts: [{
        type: 'text',
        text: `${BLUE_SYSTEM_PROMPT}\n\n${truncate(args.contextText, 4000)}`,
      }],
    },
    ...historyMessages,
    {
      role: 'user',
      parts: [{ type: 'text', text: args.userMessage }],
    },
  ];
}

function tryParseJsonObject<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(withoutFences) as T;
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function extractBlueMemories(args: {
  userMessage: string;
  assistantMessage: string;
}) {
  const extractionInput = [
    `User message: ${args.userMessage}`,
    `Blue response: ${args.assistantMessage}`,
  ].join('\n');

  const response = await callElizaCloud([
    {
      role: 'system',
      parts: [{ type: 'text', text: BLUE_MEMORY_EXTRACTION_PROMPT }],
    },
    {
      role: 'user',
      parts: [{ type: 'text', text: extractionInput }],
    },
  ]);

  const parsed = tryParseJsonObject<{ facts?: Array<{ category?: string; summary?: string; confidence?: number }> }>(response);
  const facts = Array.isArray(parsed?.facts) ? parsed.facts : [];

  return facts
    .map((fact) => ({
      category: fact.category,
      summary: typeof fact.summary === 'string' ? fact.summary.trim() : '',
      confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.5,
    }))
    .filter((fact) => (
      fact.summary
      && ['preference', 'goal', 'theme', 'follow_up', 'identity', 'habit'].includes(String(fact.category))
    )) as Array<{
      category: 'preference' | 'goal' | 'theme' | 'follow_up' | 'identity' | 'habit';
      summary: string;
      confidence: number;
    }>;
}

async function callClaudeLinkedInProfessional(
  userMessage: string,
  attachments: ChatAttachment[] = []
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const messageContent = await buildLinkedInClaudeMessage(userMessage, attachments);

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
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const responseText = data.content?.[0]?.text;
  if (!responseText) throw new Error('Empty response from Claude');
  return responseText;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { message: string; confirm?: boolean; mode?: string; attachments?: ChatAttachment[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((attachment) => (
      attachment
      && typeof attachment.url === 'string'
      && typeof attachment.mime === 'string'
      && isSafeUploadUrl(attachment.url)
    ))
    : [];

  const isResearch = body.mode === 'research';
  const isLinkedInProfessional = body.mode === 'linkedin-professional';

  if (isLinkedInProfessional) {
    const normalizedUsername = (user.username || '').trim().toLowerCase();
    if (!CLAUDE_ALLOWED_USERS.has(normalizedUsername)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    try {
      const response = await callClaudeLinkedInProfessional(body.message, attachments);
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
      const response = await callElizaCloud([
        { role: 'system', parts: [{ type: 'text', text: RESEARCH_SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ type: 'text', text: body.message }] },
      ]);
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
    const blueContext = await buildBlueContext({
      userId: user.id,
      username: user.username ?? null,
    });

    const response = await callElizaCloud(buildBlueChatMessages({
      userMessage: body.message,
      contextText: blueContext.contextText,
      recentMessages: blueContext.values.recentMessages,
    }));

    try {
      const userChatMessage = await storeBlueChatMessage({
        userId: user.id,
        role: 'user',
        text: body.message,
        metadata: {
          mode: 'chat',
          attachmentCount: attachments.length,
        },
      });

      await storeBlueChatMessage({
        userId: user.id,
        role: 'assistant',
        text: response,
        metadata: {
          mode: 'chat',
        },
      });

      await touchBlueRelationship({
        userId: user.id,
        lastUserMessage: body.message,
        lastBlueResponse: response,
      });

      const extractedFacts = await extractBlueMemories({
        userMessage: body.message,
        assistantMessage: response,
      });

      if (extractedFacts.length) {
        await upsertBlueFacts({
          userId: user.id,
          sourceMessageId: userChatMessage.id,
          facts: extractedFacts,
        });
      }
    } catch (memoryError: unknown) {
      const msg = memoryError instanceof Error ? memoryError.message : 'unknown memory error';
      console.error('Blue memory persistence error:', msg);
    }

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
