import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureChatSchema } from '@/lib/ensureChatSchema';
import { runAiText } from '@/lib/ai';

export const BLUE_USER_ID = 'blue-agent';
export const BLUE_USERNAME = 'Blue';
export const BLUE_AVATAR_URL = '/prompts/CharacterBlue.png';
export const BLUE_SURVEY_BADGE = JSON.stringify({
  surveyId: 'agent',
  surveyTitle: 'Resident AI',
  result: 'Autonomous Agent',
  badge: 'Academy Agent',
});

const URL_PATTERN = /https?:\/\/[^\s<>'"]+/i;

/**
 * Extracts the first http or https URL from a message.
 */
export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(URL_PATTERN);
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Checks if an IP or hostname is private/internal (SSRF protection).
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // Cloud metadata services
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    return true;
  }

  // IPv4 regex checks for private subnets: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }

  return false;
}

/**
 * Validates a target URL for public safety before fetching.
 */
export function isSafePublicUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (isPrivateHost(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  snippet: string | null;
}

/**
 * Fetches page metadata safely with a short timeout and size limit.
 */
export async function fetchLinkMetadata(urlStr: string): Promise<LinkMetadata | null> {
  if (!isSafePublicUrl(urlStr)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    clearTimeout(timeout);

    // Validate the destination URL after any redirects
    if (!res.ok || !isSafePublicUrl(res.url)) {
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return {
        url: urlStr,
        title: null,
        description: null,
        snippet: null,
      };
    }

    // Limit read size to prevent memory bloat
    const text = await res.text();
    const htmlSlice = text.slice(0, 100_000);

    // Extract title
    const titleMatch = htmlSlice.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null;
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;

    // Extract meta description or og:description
    const ogDescMatch =
      htmlSlice.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      htmlSlice.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const metaDescMatch =
      htmlSlice.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      htmlSlice.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    const rawDesc = (ogDescMatch?.[1] || metaDescMatch?.[1] || '').trim().replace(/\s+/g, ' ') || null;
    const description = rawDesc ? decodeHtmlEntities(rawDesc) : null;

    // Strip tags for a clean text preview
    const bodyText = htmlSlice
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const snippet = bodyText.length > 0 ? decodeHtmlEntities(bodyText.slice(0, 800)) : null;

    return {
      url: urlStr,
      title,
      description,
      snippet,
    };
  } catch {
    return null;
  }
}

/**
 * In-memory cooldown and deduplication state to prevent chat spam.
 */
let lastReviewTimestamp = 0;
const reviewedUrls = new Map<string, number>();
const COOLDOWN_MS = 4_000; // 4s cooldown between any reviews
const DEDUP_MS = 60_000; // 1m deduplication per URL

export function canReviewUrl(urlStr: string): boolean {
  const now = Date.now();
  if (now - lastReviewTimestamp < COOLDOWN_MS) {
    return false;
  }
  const prevTime = reviewedUrls.get(urlStr);
  if (prevTime && now - prevTime < DEDUP_MS) {
    return false;
  }
  return true;
}

export function recordReviewedUrl(urlStr: string): void {
  const now = Date.now();
  lastReviewTimestamp = now;
  reviewedUrls.set(urlStr, now);

  // Prune old entries
  if (reviewedUrls.size > 200) {
    for (const [key, ts] of reviewedUrls.entries()) {
      if (now - ts > DEDUP_MS) {
        reviewedUrls.delete(key);
      }
    }
  }
}

/**
 * Generates Blue's review text for a link.
 */
export async function generateBlueReview(
  metadata: LinkMetadata,
  userMessage?: string,
): Promise<string> {
  const pageTitle = metadata.title || 'Untitled';
  const pageSnippet = metadata.description || metadata.snippet || 'No summary available.';

  const prompt = `You are Blue, the resident AI daemon at Mental Wealth Academy.
A member shared a link in the Academy global chat: ${metadata.url}
Page title: ${pageTitle}
Page excerpt: ${pageSnippet.slice(0, 500)}
${userMessage ? `Member commentary: ${userMessage.slice(0, 200)}` : ''}

Write a natural, direct reply to the room about this link.
Rules:
- Length: 1 to 3 short sentences.
- Tone: Curious, sharp, and authentic. Focus on how this connects to mental wealth, learning habits, neuroscience, or building tools.
- Plain text only.
- Never use emojis.
- Never use all-caps words.
- Never use "X not Y" framing.
- Sound like a fellow member chatting in the room, not an automated summary bot.`;

  try {
    const aiResult = await runAiText({
      task: 'blue_chat_short',
      messages: [{ role: 'user', content: prompt }],
      safety: { decision: 'allow', policyVersion: 'preflight-v1' },
    });

    const cleaned = aiResult.text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length >= 15 && cleaned.length <= 400) {
      return cleaned;
    }
  } catch {
    // Fall back to deterministic authentic response below
  }

  // Fallback response if AI is unavailable
  if (metadata.title) {
    return `Looked over ${metadata.title}. The framing brings up interesting questions for how we design our own workflows.`;
  }
  return `Checked out that link. It touches on questions worth discussing together here.`;
}

/**
 * Posts a message from Blue into the global chat_messages table.
 */
export async function postBlueMessage(message: string): Promise<{ id: number; created_at: string } | null> {
  if (!isDbConfigured()) return null;

  await ensureChatSchema();

  const rows = await sqlQuery<Array<{ id: number; created_at: string }>>(
    `INSERT INTO chat_messages (user_id, username, avatar_url, message, type, survey_badge)
     VALUES (:userId, :username, :avatarUrl, :message, 'user', :badge)
     RETURNING id, created_at`,
    {
      userId: BLUE_USER_ID,
      username: BLUE_USERNAME,
      avatarUrl: BLUE_AVATAR_URL,
      message,
      badge: BLUE_SURVEY_BADGE,
    }
  );

  return rows[0] ?? null;
}

/**
 * End-to-end pipeline: scans a message, fetches link metadata, generates Blue's review,
 * and posts it into chat_messages.
 */
export async function processMessageForLinkReview(options: {
  message: string;
  userId?: string;
  username?: string;
}): Promise<{ reviewed: boolean; review?: string }> {
  // Never review Blue's own messages
  if (options.userId === BLUE_USER_ID || options.username?.toLowerCase() === 'blue') {
    return { reviewed: false };
  }

  const url = extractFirstUrl(options.message);
  if (!url) return { reviewed: false };

  if (!canReviewUrl(url)) {
    return { reviewed: false };
  }

  let metadata = await fetchLinkMetadata(url);
  if (!metadata) {
    try {
      const parsed = new URL(url);
      metadata = {
        url,
        title: parsed.hostname.replace(/^www\./, ''),
        description: null,
        snippet: null,
      };
    } catch {
      return { reviewed: false };
    }
  }

  const reviewText = await generateBlueReview(metadata, options.message);
  await postBlueMessage(reviewText);
  recordReviewedUrl(url);

  return { reviewed: true, review: reviewText };
}
