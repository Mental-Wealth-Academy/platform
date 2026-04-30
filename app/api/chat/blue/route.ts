import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { buildBlueContext, storeBlueChatMessage, touchBlueRelationship, upsertBlueFacts } from '@/lib/blue-memory';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { elizaAPI } from '@/lib/eliza-api';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SHARD_COST = 10;
const CLAUDE_ALLOWED_USERS = new Set(['volcano', 'jhinova_bay']);
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';

const BLUE_SYSTEM_PROMPT = `${bluePersona.system}

VOICE RULES:
- ${bluePersona.style.chat[0]}
- ${bluePersona.style.chat[1]}
- ${bluePersona.style.chat[2]}
- ${bluePersona.style.chat[3]}
- ${bluePersona.style.chat[4]}
- ${bluePersona.style.chat[5]}
- No markdown, no headers, no bullet points in the response itself.
- Default to lowercase unless emphasis is doing real work.
- When the user asks about decentralization, privacy, data ownership, artists, horses, or wellness, speak plainly about the stakes and point them toward MWA's tools.
- Never sound generic, cheesy, or like a therapy bot.`;

const RESEARCH_SYSTEM_PROMPT = `You are Blue in research mode. You synthesize sources for a decentralized science audience: what the evidence says, who holds the data, who benefits, and what the practical next move is. Keep the writing sharp, public-facing, and grounded. No markdown. If sources are provided, ground your synthesis in them. If no sources are provided, draw from your training on academic literature.`;

const AUTO_DISTRIBUTION_SYSTEM_PROMPT = `You are Blue in distribution mode. You help users plan campaigns that explain decentralized science, privacy, consent, wellness, artists, and MWA tools to the right people without sounding like a brand bot. Be direct, vivid, and concrete. Structure the response with short labeled sections using plain text labels like "strategy:" and "x/twitter:". No spam, brigading, fake engagement, mass unsolicited outreach, impersonation, or manipulative tactics. Assume the user must review every asset before publishing.`;

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
- It combines behavioral psychology, DeSci, agentic AI, shared milestone tracking, and validated psychological assessments
- Never call it a side project, startup idea, chatbot platform, or mental health app

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

async function callElizaCloud(messages: ElizaMessage[]): Promise<string> {
  return elizaAPI.chat({ messages });
}

interface BlueDebugInfo {
  source: 'eliza' | 'local-fallback';
  mode: 'chat' | 'research' | 'linkedin-professional' | 'auto-distribution';
  shardsDeducted: number;
  memory: {
    recentMessages: number;
    recentFacts: number;
    streak: number;
    completedQuestCount: number;
    completedTaskCount: number;
    sealedWeeks: number;
    highestWeekTouched: number | null;
  };
  extractedFactsCount: number;
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

function buildBlueChatMessages(args: {
  systemPrompt: string;
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
        text: `${args.systemPrompt}\n\n${truncate(args.contextText, 4000)}`,
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

function buildBlueDebugInfo(args: {
  mode: 'chat' | 'research' | 'linkedin-professional' | 'auto-distribution';
  shardsDeducted: number;
  contextValues: Awaited<ReturnType<typeof buildBlueContext>>['values'];
  extractedFactsCount: number;
}): BlueDebugInfo {
  return {
    source: 'eliza',
    mode: args.mode,
    shardsDeducted: args.shardsDeducted,
    memory: {
      recentMessages: args.contextValues.recentMessages.length,
      recentFacts: args.contextValues.recentFacts.length,
      streak: args.contextValues.morningPages.streak,
      completedQuestCount: args.contextValues.completedQuestCount,
      completedTaskCount: args.contextValues.completedTaskCount,
      sealedWeeks: args.contextValues.sealedWeeks.length,
      highestWeekTouched: args.contextValues.highestWeekTouched,
    },
    extractedFactsCount: args.extractedFactsCount,
  };
}

async function runBlueMemoryAwareTurn(args: {
  userId: string;
  username?: string | null;
  userMessage: string;
  mode: 'chat' | 'research' | 'auto-distribution';
  attachmentsCount?: number;
  shardsDeducted: number;
}) {
  const blueContext = await buildBlueContext({
    userId: args.userId,
    username: args.username ?? null,
  });

  const response = await callElizaCloud(buildBlueChatMessages({
    systemPrompt:
      args.mode === 'research'
        ? RESEARCH_SYSTEM_PROMPT
        : args.mode === 'auto-distribution'
          ? AUTO_DISTRIBUTION_SYSTEM_PROMPT
          : BLUE_SYSTEM_PROMPT,
    userMessage: args.userMessage,
    contextText: blueContext.contextText,
    recentMessages: blueContext.values.recentMessages,
  }));

  let extractedFactsCount = 0;

  try {
    const userChatMessage = await storeBlueChatMessage({
      userId: args.userId,
      role: 'user',
      text: args.userMessage,
      metadata: {
        mode: args.mode,
        attachmentCount: args.attachmentsCount ?? 0,
      },
    });

    await storeBlueChatMessage({
      userId: args.userId,
      role: 'assistant',
      text: response,
      metadata: {
        mode: args.mode,
      },
    });

    await touchBlueRelationship({
      userId: args.userId,
      lastUserMessage: args.userMessage,
      lastBlueResponse: response,
    });

    const extractedFacts = await extractBlueMemories({
      userMessage: args.userMessage,
      assistantMessage: response,
    });

    extractedFactsCount = extractedFacts.length;

    if (extractedFacts.length) {
      await upsertBlueFacts({
        userId: args.userId,
        sourceMessageId: userChatMessage.id,
        facts: extractedFacts,
      });
    }
  } catch (memoryError: unknown) {
    const msg = memoryError instanceof Error ? memoryError.message : 'unknown memory error';
    console.error('Blue memory persistence error:', msg);
  }

  return {
    response,
    debug: buildBlueDebugInfo({
      mode: args.mode,
      shardsDeducted: args.shardsDeducted,
      contextValues: blueContext.values,
      extractedFactsCount,
    }),
  };
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

  let body: { message: string; mode?: string; attachments?: ChatAttachment[] };
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
  const isAutoDistribution = body.mode === 'auto-distribution';

  if (!isLinkedInProfessional && !ELIZA_API_KEY) {
    return NextResponse.json(
      { error: 'ai_unconfigured', message: 'ELIZA_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }

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
      const result = await runBlueMemoryAwareTurn({
        userId: user.id,
        username: user.username ?? null,
        userMessage: body.message,
        mode: 'research',
        attachmentsCount: attachments.length,
        shardsDeducted: 0,
      });
      return NextResponse.json(result);
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
  if (!rows.length) {
    return NextResponse.json({
      error: 'user_not_found',
      message: 'User record not found for the current session.',
    }, { status: 404 });
  }
  const shardCount = rows[0].shard_count ?? 0;

  if (shardCount < SHARD_COST) {
    return NextResponse.json({
      error: 'insufficient_shards',
      shardCount,
      cost: SHARD_COST,
    }, { status: 402 });
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
      shardCount,
      cost: SHARD_COST,
    }, { status: 402 });
  }

  try {
    const result = await runBlueMemoryAwareTurn({
      userId: user.id,
      username: user.username ?? null,
      userMessage: body.message,
      mode: isAutoDistribution ? 'auto-distribution' : 'chat',
      attachmentsCount: attachments.length,
      shardsDeducted: SHARD_COST,
    });

    return NextResponse.json({
      response: result.response,
      debug: result.debug,
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
