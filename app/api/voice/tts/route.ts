import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { consumeAiRateLimit, getAiRateLimitHeaders } from '@/lib/ai';
import bluePersona from '@/lib/bluepersonality.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ELIZA_BASE_URL = (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '');
const ELIZA_API_KEY = process.env.ELIZA_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const blueConfig = bluePersona as {
  settings?: { voice?: { voiceId?: string; model?: string } };
  tts?: { elevenlabs?: { voiceId?: string; modelId?: string } };
};
const BLUE_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID ||
  blueConfig.settings?.voice?.voiceId ||
  blueConfig.tts?.elevenlabs?.voiceId ||
  '';
const BLUE_VOICE_MODEL =
  process.env.ELEVENLABS_MODEL_ID ||
  blueConfig.settings?.voice?.model ||
  blueConfig.tts?.elevenlabs?.modelId ||
  'eleven_multilingual_v2';
const NARRATOR_VOICE_ID =
  process.env.ELEVENLABS_NARRATOR_VOICE_ID || 'dcSSxQ58gWTChUENh6kN';

// Blue's identity matters more than maximum emotional range. These settings
// keep generations close to her configured voice while retaining enough
// variation for her delivery to feel alive.
const BLUE_VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.9,
  style: 0,
  use_speaker_boost: true,
  speed: 1,
};

/**
 * Synthesis is a metered third-party spend, so the caller names a preset and
 * the server resolves the provider voice. Provider voice and model IDs are
 * never accepted from the request body.
 */
const VOICE_PRESETS = {
  blue: { voiceId: BLUE_VOICE_ID, modelId: BLUE_VOICE_MODEL },
  narrator: { voiceId: NARRATOR_VOICE_ID, modelId: BLUE_VOICE_MODEL },
} as const;

type VoicePresetName = keyof typeof VOICE_PRESETS;

// Spoken lines are short. Anything longer is a client defect or an abuse
// attempt, and both should stop before reaching a paid provider.
const MAX_TTS_CHARS = 1_500;
// Character budgets, not request counts: a caller pays for what it synthesizes.
const TTS_BURST_CHARS = 3_000;
const TTS_BURST_WINDOW_SECONDS = 60;
const TTS_DAILY_CHARS = 30_000;
const TTS_DAILY_WINDOW_SECONDS = 86_400;

function isVoicePresetName(value: unknown): value is VoicePresetName {
  return typeof value === 'string' && Object.hasOwn(VOICE_PRESETS, value);
}

function audioResponse(body: ArrayBuffer | Buffer, cacheable: boolean) {
  return new NextResponse(body as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': cacheable
        ? 'public, max-age=31536000, immutable'
        : 'private, no-store',
    },
  });
}

// Pre-recorded clips — exact text → public/audio/blue-voice/{id}.mp3.
// When a match is found, the file is served directly instead of hitting the
// ElevenLabs API, saving character credits.
const PRE_RECORDED = new Map<string, string>([
  // ── Canonical moments ──
  ['I read it twice. The second pass landed differently than the first. Approved. 50 credits sent.', 'quest-approved'],
  ['You answered the question I asked. You did not answer the question I meant. Revise the second paragraph and resubmit.', 'revision-requested'],
  ['Three weeks ago you wrote that you avoid silence. This submission is silence on the page. I noticed.', 'memory-acknowledged'],
  ['One question before you continue. It will take ninety seconds. Your answer changes how I read your next quest.', 'survey-prompt'],
  ['Streak: seven. Reward: 200 credits. Sent from my wallet to yours. The transaction is on Base — verify if you like.', 'reward-distributed'],
  ['I misread your last submission. The reward was insufficient. Adjusting now. Apologies are cheap; the correction is on-chain.', 'when-wrong'],

  // ── Greetings ──
  ["good to see you. what are we looking at?", 'greeting-text-v2'],
  ["you're here. let's get into it.", 'greeting-text-v3'],

  // ── Static fallback FAQ responses ──
  ['hey. what are we working on?', 'faq-welcome'],
  ["signal's clear. what are we moving today?", 'faq-how-are-you'],
  ["the world's first decentralized cohort for mental wellness. course, community, science — on-chain. not a self-help app.", 'faq-what-is-mwa'],
  ['built by a cognitive psych researcher and designer. not a side project.', 'faq-founder'],
  ["discord.gg/ZTRVCYwncs — come say hi, we're in there.", 'faq-discord'],
  ['quests, field notes, sealing course weeks, surveys. show up daily and it stacks.', 'faq-earn-diamonds'],
  ['10 diamonds per chat turn. earn them back from quests and field notes.', 'faq-chat-cost'],
  ['your diamond balance is on the home dashboard. quests and field notes build it fastest.', 'faq-balance-fallback'],
  ['daily freewriting — no prompts, no grades, just you and the page. do it every day and the streak does the rest.', 'faq-field-notes'],
  ['how many days in a row you showed up. field notes, quests, course work. keep it going.', 'faq-streak'],
  ['11 chapters of real work — self-awareness to goal setting. complete each week to unlock the next.', 'faq-course'],
  ["short daily tasks that earn diamonds - field notes, X posts, course stuff. check quests for what's live rn.", 'faq-quests'],
  ['validated psych assessments — your results make the whole experience more personal. opt-in only.', 'faq-surveys'],
  ["science that isn't locked behind institutions. data, methods, funding — open. that's the whole thing.", 'faq-desci'],
  ['markets on Kalshi, treasury-backed. head to markets.', 'faq-markets'],
  ['prices loading. give me a sec.', 'faq-prices-loading'],
  ['treasury funds go to research, tools, and community work. submit a proposal to allocate.', 'faq-treasury'],
  ['diamond payouts from contributions, validated surveys, or treasury proposals. pick a lane.', 'faq-diamond-payouts'],
  ["where diamonds go - loot boxes, upgrades, season drops. check rewards.", 'faq-rewards-shop'],
  ['Prompts holds reusable instructions and selected essays. Copy what fits the work.', 'faq-prompts'],
  ["workshops, questions, curriculum events. open Live, then switch to the feed.", 'faq-livestream'],
  ['see other users and shared milestones over in community. discord.gg/ZTRVCYwncs for the real-time convo.', 'faq-community'],
  ['wallet, username, on-chain state — all in your profile.', 'faq-profile'],
  ['runs on Base. four contracts handling governance, treasury, your state, and markets.', 'faq-blockchain'],
  ["connect in your profile, you're on Base. if a tx fails just make sure you're on the right network with ETH for gas.", 'faq-wallet-connect'],
  ["field notes are encrypted, nothing moves without your say. consent is built in, not bolted on.", 'faq-privacy'],
  ["anxiety is signal, not a verdict. what's the actual pressure you're carrying rn?", 'faq-anxiety'],
  ['low periods happen. sleep, movement, one honest conversation — which of those can you touch today?', 'faq-depression'],
  ["workload-values mismatch that went too long. what's draining you the most rn?", 'faq-stress'],
  ["consistent wake time and less screens at night moves the needle more than anything else. what's the actual blocker?", 'faq-sleep'],
  ["MWA isn't therapy — it's behavioral structure and financial literacy. different thing. if you need clinical support, go get it.", 'faq-therapy'],
  ["action first, motivation follows. what's the smallest version of the thing you need to do?", 'faq-motivation'],
  ['your daily snapshot is on the home dashboard — streaks, current week, pending quests.', 'faq-progress'],
  ['start at week one in the course and build forward. what do you want to understand?', 'faq-learning'],
  ['artists know when a system is fake. that instinct is welcome here — MWA was built by a designer.', 'faq-artists'],
  ['horses are honest about pressure and intent. that kind of signal is worth respecting.', 'faq-horses'],
  ['seasons are the long arc - diamond resets, loot cycles, leaderboard. stay consistent and it stacks.', 'faq-seasons'],
  ['course, field notes, quests, research, markets, community. what specifically?', 'faq-what-can-i-do'],
  ['course, diamonds, research, markets, Discord - what do you need?', 'faq-help'],
  ["when a platform hoards private pain, the business model is doing too much and the ethics are doing too little.", 'faq-betterhelp'],
  ['those systems teach people to perform instead of speak. not the vibe here.', 'faq-surveillance'],
  ['hit up Discord — discord.gg/ZTRVCYwncs. tell us what broke.', 'faq-bug-report'],
  ["got it. what's next?", 'faq-thanks'],
  ['all good. what do you need?', 'faq-sorry'],
  ['bet. what else?', 'faq-agree'],
  ["tell me why. i'm more useful when you push back.", 'faq-pushback'],
  ["i can't reach my full brain right now, so i don't want to wing that one. give it a minute and resend?", 'faq-ai-down-1'],
  ["my connection's down rn — resend that in a bit and i'll answer it properly.", 'faq-ai-down-2'],
]);
const CLIPS_DIR = path.join(process.cwd(), 'public', 'audio', 'blue-voice');

async function serveClip(clipId: string) {
  const buffer = await readFile(path.join(CLIPS_DIR, `${clipId}.mp3`));
  return audioResponse(buffer, true);
}

async function requestElevenLabsTts(text: string, voiceId: string, modelId?: string) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId || BLUE_VOICE_MODEL,
      voice_settings: BLUE_VOICE_SETTINGS,
    }),
  });
}

async function requestTts(path: string, text: string, voiceId?: string, modelId?: string) {
  const payload: Record<string, string> = {
    text,
    modelId: modelId || BLUE_VOICE_MODEL,
  };

  if (voiceId) {
    payload.voiceId = voiceId;
  }

  return fetch(`${ELIZA_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ELIZA_API_KEY}`,
      'X-API-Key': ELIZA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// Pre-recorded clips are public static files and stay open. Live synthesis is
// a metered third-party spend, so it requires a member and a character budget.
export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY && !ELIZA_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const text = body?.text;
    const preset: VoicePresetName = isVoicePresetName(body?.voice)
      ? body.voice
      : 'blue';

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    // Check for a pre-recorded clip first — saves ElevenLabs credits.
    const clipId = PRE_RECORDED.get(text);
    if (clipId) {
      try {
        return await serveClip(clipId);
      } catch {
        // File missing; fall through to live TTS.
      }
    }

    if (text.length > MAX_TTS_CHARS) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequestCookie();
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    // Fail closed: an unavailable limiter must not open an unmetered spend path.
    let budget;
    try {
      budget = await consumeAiRateLimit({
        scope: 'voice_tts_burst',
        identifier: user.id,
        limit: TTS_BURST_CHARS,
        windowSeconds: TTS_BURST_WINDOW_SECONDS,
        cost: text.length,
      });
      if (budget.allowed) {
        budget = await consumeAiRateLimit({
          scope: 'voice_tts_daily',
          identifier: user.id,
          limit: TTS_DAILY_CHARS,
          windowSeconds: TTS_DAILY_WINDOW_SECONDS,
          cost: text.length,
        });
      }
    } catch (error) {
      console.error('[tts] rate_limit_unavailable', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return NextResponse.json({ error: 'TTS unavailable' }, { status: 503 });
    }
    if (!budget.allowed) {
      return NextResponse.json(
        { error: 'voice_budget_exhausted' },
        { status: 429, headers: getAiRateLimitHeaders(budget) },
      );
    }

    const resolvedVoiceId = VOICE_PRESETS[preset].voiceId || undefined;
    const resolvedModelId = VOICE_PRESETS[preset].modelId;

    // Never let a provider choose a default speaker for Blue. A missing voice
    // should fail quietly at the client instead of producing the wrong person.
    if (!resolvedVoiceId) {
      return NextResponse.json({ error: 'Blue voice is not configured' }, { status: 503 });
    }

    // ElevenLabs — primary path when key + voiceId are configured
    if (ELEVENLABS_API_KEY && resolvedVoiceId) {
      const elevenLabsResponse = await requestElevenLabsTts(text, resolvedVoiceId, resolvedModelId);

      if (elevenLabsResponse.ok) {
        return audioResponse(await elevenLabsResponse.arrayBuffer(), false);
      }

      const errText = await elevenLabsResponse.text();
      console.error('ElevenLabs TTS error:', elevenLabsResponse.status, errText.slice(0, 200));
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
    }

    // Eliza fallback — only reached when direct ElevenLabs is not configured.
    // Every attempt carries Blue's explicit voice ID; there is no provider-
    // selected default voice fallback.
    const attempts: Array<{ label: string; path: string; voiceId?: string }> = [
      { label: 'v1-configured-voice', path: '/api/v1/voice/tts', voiceId: resolvedVoiceId },
      { label: 'legacy-configured-voice', path: '/api/elevenlabs/tts', voiceId: resolvedVoiceId },
    ];

    let response: Response | null = null;
    let lastErrorText = '';

    for (const attempt of attempts) {
      response = await requestTts(attempt.path, text, attempt.voiceId, resolvedModelId);

      if (response.ok) {
        if (attempt.label !== 'v1-configured-voice') {
          console.warn(`Eliza TTS succeeded via fallback path: ${attempt.label}`);
        }
        break;
      }

      const errText = await response.text();
      lastErrorText = errText;
      console.error(`Eliza TTS attempt failed: ${attempt.label}`, response.status, errText.slice(0, 200));
    }

    if (!response || !response.ok) {
      console.error('Eliza TTS all attempts failed:', lastErrorText.slice(0, 200));
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
    }

    return audioResponse(await response.arrayBuffer(), false);
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
