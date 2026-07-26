import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runAiStructured } from '@/lib/ai';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { walletHasMembershipAccess } from '@/lib/membership-access';
import {
  FORGE_LIMITS,
  FORGE_TYPES,
  roundUsdc,
  type QuestForgeType,
  type RewardKind,
} from '@/lib/quest-forge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface QuestDraft {
  title: string;
  description: string;
  questType: QuestForgeType;
  rewardKind: RewardKind;
  rewardAmount: number;
  targetCount: number;
}

const DRAFT_SYSTEM_PROMPT = `You turn a member's plain-language request into a single structured community quest for Mental Wealth Academy. A quest is a short task other members complete to earn a reward the requester is funding.

Return raw JSON only, with no prose, in exactly this shape:
{"title":"string","description":"string","questType":"no-proof"|"proof-required","rewardKind":"credits"|"usdc","rewardAmount":number,"targetCount":number}

Rules:
- title: a short, concrete imperative (max 80 chars). No emojis, no quotes, no all-caps.
- description: 1-3 plain sentences telling the completer exactly what to do (max 600 chars).
- questType: "proof-required" if completion needs evidence (a screenshot, link, photo, written submission); otherwise "no-proof".
- rewardKind: "usdc" only if the user clearly means real money or dollars; otherwise "credits".
- rewardAmount: the reward PER completion. Credits are whole numbers ${FORGE_LIMITS.creditsMin}-${FORGE_LIMITS.creditsMax}. USDC is ${FORGE_LIMITS.usdcMin}-${FORGE_LIMITS.usdcMax} dollars. If the user gives no amount, use 50 credits.
- targetCount: how many completions are wanted, ${FORGE_LIMITS.targetMin}-${FORGE_LIMITS.targetMax}. Default 1.
- Never invent a USDC reward the user did not ask for. When in doubt, use credits.`;

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Last-resort parser when no LLM is configured or the call fails. */
function heuristicDraft(prompt: string): QuestDraft {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  const wantsUsdc = /\b(usdc|dollar|\$\s*\d|\d+\s*(?:bucks|usd))\b/.test(lower);
  const proof = /\b(proof|screenshot|photo|picture|link|submit|upload|evidence|show)\b/.test(lower);

  const firstSentence = text.split(/(?<=[.!?])\s/)[0] || text;
  const title = (firstSentence.length > 80 ? firstSentence.slice(0, 77) + '…' : firstSentence) || 'Community quest';

  let rewardKind: RewardKind = wantsUsdc ? 'usdc' : 'credits';
  let rewardAmount: number;
  if (rewardKind === 'usdc') {
    const dollar = lower.match(/\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:usdc|usd|dollars?)/);
    const found = dollar ? Number(dollar[1] ?? dollar[2]) : NaN;
    rewardAmount = Number.isFinite(found)
      ? roundUsdc(Math.min(FORGE_LIMITS.usdcMax, Math.max(FORGE_LIMITS.usdcMin, found)))
      : 1;
  } else {
    const credits = lower.match(/(\d+)\s*(?:credits?|points?|shards?)/);
    const found = credits ? Number(credits[1]) : NaN;
    rewardAmount = clampInt(found, FORGE_LIMITS.creditsMin, FORGE_LIMITS.creditsMax, 50);
  }

  const targetMatch = lower.match(/(?:x|times|up to|first)\s*(\d{1,2})|(\d{1,2})\s*(?:people|members|completions?|users?)/);
  const targetCount = clampInt(
    targetMatch ? Number(targetMatch[1] ?? targetMatch[2]) : 1,
    FORGE_LIMITS.targetMin,
    FORGE_LIMITS.targetMax,
    1,
  );

  return {
    title,
    description: text.length > 600 ? text.slice(0, 597) + '…' : text,
    questType: proof ? 'proof-required' : 'no-proof',
    rewardKind,
    rewardAmount,
    targetCount,
  };
}

function questDraftSchema(prompt: string): z.ZodType<QuestDraft> {
  const fallback = heuristicDraft(prompt);
  const schema = z.object({
    title: z.unknown().optional(),
    description: z.unknown().optional(),
    questType: z.unknown().optional(),
    rewardKind: z.unknown().optional(),
    rewardAmount: z.unknown().optional(),
    targetCount: z.unknown().optional(),
  }).passthrough().transform((parsed): QuestDraft => {
    const title = typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, FORGE_LIMITS.titleMax)
      : fallback.title;
    const description = typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim().slice(0, FORGE_LIMITS.descMax)
      : fallback.description;
    const questType: QuestForgeType = FORGE_TYPES.has(parsed.questType as QuestForgeType)
      ? (parsed.questType as QuestForgeType)
      : fallback.questType;
    // The local parser is the authority for the money rail. This prevents a
    // model from turning a credits request into a real-money draft.
    const rewardKind: RewardKind = fallback.rewardKind;
    const targetCount = clampInt(
      Number(parsed.targetCount),
      FORGE_LIMITS.targetMin,
      FORGE_LIMITS.targetMax,
      fallback.targetCount,
    );

    const rawReward = Number(parsed.rewardAmount);
    const rewardAmount = rewardKind === 'usdc'
      ? Number.isFinite(rawReward)
        ? roundUsdc(Math.min(FORGE_LIMITS.usdcMax, Math.max(FORGE_LIMITS.usdcMin, rawReward)))
        : roundUsdc(Math.min(
            FORGE_LIMITS.usdcMax,
            Math.max(FORGE_LIMITS.usdcMin, fallback.rewardAmount),
          ))
      : clampInt(
          rawReward,
          FORGE_LIMITS.creditsMin,
          FORGE_LIMITS.creditsMax,
          fallback.rewardAmount,
        );

    return { title, description, questType, rewardKind, rewardAmount, targetCount };
  });
  return schema as unknown as z.ZodType<QuestDraft>;
}

function configuredAiProviderExists(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.ELIZA_API_KEY);
}

/**
 * POST /api/quests/draft  { prompt }
 * VIP-membership-gated. Drafts a fundable quest from a plain-language request
 * so Blue can pre-fill the in-chat forge. Does NOT create anything.
 */
export async function POST(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const hasMembership = await walletHasMembershipAccess(user.walletAddress);
  if (!hasMembership) {
    return NextResponse.json(
      { error: 'A membership NFT is required to forge quests.', code: 'vip_required' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ error: 'Tell Blue what the quest should be.' }, { status: 400 });
  }

  let draft: QuestDraft;
  try {
    if (configuredAiProviderExists()) {
      const result = await runAiStructured<QuestDraft>({
        task: 'structured_extract',
        messages: [
          { role: 'system', content: DRAFT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        schema: questDraftSchema(prompt),
        schemaName: 'quest_draft',
        schemaDescription:
          'One quest with a title, description, quest type, reward kind, per-completion reward amount, and target completion count.',
        signal: request.signal,
      });
      draft = result.data;
    } else {
      draft = heuristicDraft(prompt);
    }
  } catch (err) {
    console.warn('[quests/draft] LLM draft failed, using heuristic:', err);
    draft = heuristicDraft(prompt);
  }

  return NextResponse.json({ draft });
}
