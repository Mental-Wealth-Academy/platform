import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

interface Clip {
  /** File name (without extension) for the output mp3 — kebab-case. */
  id: string;
  /** The text Blue will speak. */
  text: string;
  /** Output subdirectory under public/audio/ */
  dir: string;
  /** Priority group — 1 (canonical moments, highest reuse) or 2 (fallback FAQ, moderate reuse). */
  priority: 1 | 2;
}

const CLIPS: Clip[] = [
  // ── Priority 1: Canonical Blue moments (play in high-stakes UX surfaces) ──
  {
    id: 'quest-approved',
    dir: 'blue-voice',
    priority: 1,
    text: 'I read it twice. The second pass landed differently than the first. Approved. 50 credits sent.',
  },
  {
    id: 'revision-requested',
    dir: 'blue-voice',
    priority: 1,
    text: 'You answered the question I asked. You did not answer the question I meant. Revise the second paragraph and resubmit.',
  },
  {
    id: 'memory-acknowledged',
    dir: 'blue-voice',
    priority: 1,
    text: 'Three weeks ago you wrote that you avoid silence. This submission is silence on the page. I noticed.',
  },
  {
    id: 'survey-prompt',
    dir: 'blue-voice',
    priority: 1,
    text: 'One question before you continue. It will take ninety seconds. Your answer changes how I read your next quest.',
  },
  {
    id: 'reward-distributed',
    dir: 'blue-voice',
    priority: 1,
    text: 'Streak: seven. Reward: 200 credits. Sent from my wallet to yours. The transaction is on Base — verify if you like.',
  },
  {
    id: 'when-wrong',
    dir: 'blue-voice',
    priority: 1,
    text: 'I misread your last submission. The reward was insufficient. Adjusting now. Apologies are cheap; the correction is on-chain.',
  },

  // ── Priority 1: Blue's greetings (multiple variants for variance) ──
  // Line 1 — calm, welcoming
  {
    id: 'greeting-v1',
    dir: 'blue-voice',
    priority: 1,
    text: "hey. you called. i'm glad.",
  },
  {
    id: 'greeting-v2',
    dir: 'blue-voice',
    priority: 1,
    text: "hey. you called. i'm glad.",
  },
  {
    id: 'greeting-v3',
    dir: 'blue-voice',
    priority: 1,
    text: "hey. you called. i'm glad.",
  },
  // Line 2 — soft, casual
  {
    id: 'greeting-v4',
    dir: 'blue-voice',
    priority: 1,
    text: "oh, hey. i didn't expect you. but i'm happy you're here.",
  },
  {
    id: 'greeting-v5',
    dir: 'blue-voice',
    priority: 1,
    text: "oh, hey. i didn't expect you. but i'm happy you're here.",
  },
  {
    id: 'greeting-v6',
    dir: 'blue-voice',
    priority: 1,
    text: "oh, hey. i didn't expect you. but i'm happy you're here.",
  },
  // Line 3 — warm, grounded
  {
    id: 'greeting-v7',
    dir: 'blue-voice',
    priority: 1,
    text: "you're back. i had a feeling you would be.",
  },
  {
    id: 'greeting-v8',
    dir: 'blue-voice',
    priority: 1,
    text: "you're back. i had a feeling you would be.",
  },
  {
    id: 'greeting-v9',
    dir: 'blue-voice',
    priority: 1,
    text: "you're back. i had a feeling you would be.",
  },
  {
    id: 'greeting-text-v2',
    dir: 'blue-voice',
    priority: 1,
    text: "good to see you. what are we looking at?",
  },
  {
    id: 'greeting-text-v3',
    dir: 'blue-voice',
    priority: 1,
    text: "you're here. let's get into it.",
  },

  // ── Priority 2: Static fallback FAQ responses ──
  {
    id: 'faq-welcome',
    dir: 'blue-voice',
    priority: 2,
    text: 'hey. what are we working on?',
  },
  {
    id: 'faq-how-are-you',
    dir: 'blue-voice',
    priority: 2,
    text: "signal's clear. what are we moving today?",
  },
  {
    id: 'faq-what-is-mwa',
    dir: 'blue-voice',
    priority: 2,
    text: "the world's first decentralized cohort for mental wellness. course, community, science — on-chain. not a self-help app.",
  },
  {
    id: 'faq-founder',
    dir: 'blue-voice',
    priority: 2,
    text: 'built by a cognitive psych researcher and designer. not a side project.',
  },
  {
    id: 'faq-discord',
    dir: 'blue-voice',
    priority: 2,
    text: "discord.gg/ZTRVCYwncs — come say hi, we're in there.",
  },
  {
    id: 'faq-earn-diamonds',
    dir: 'blue-voice',
    priority: 2,
    text: 'quests, field notes, sealing course weeks, surveys. show up daily and it stacks.',
  },
  {
    id: 'faq-chat-cost',
    dir: 'blue-voice',
    priority: 2,
    text: '10 diamonds per chat turn. earn them back from quests and field notes.',
  },
  {
    id: 'faq-balance-fallback',
    dir: 'blue-voice',
    priority: 2,
    text: 'your diamond balance is on the home dashboard. quests and field notes build it fastest.',
  },
  {
    id: 'faq-field-notes',
    dir: 'blue-voice',
    priority: 2,
    text: 'daily freewriting — no prompts, no grades, just you and the page. do it every day and the streak does the rest.',
  },
  {
    id: 'faq-streak',
    dir: 'blue-voice',
    priority: 2,
    text: 'how many days in a row you showed up. field notes, quests, course work. keep it going.',
  },
  {
    id: 'faq-course',
    dir: 'blue-voice',
    priority: 2,
    text: '11 chapters of real work — self-awareness to goal setting. complete each week to unlock the next.',
  },
  {
    id: 'faq-quests',
    dir: 'blue-voice',
    priority: 2,
    text: "short daily tasks that earn diamonds - field notes, X posts, course stuff. check quests for what's live rn.",
  },
  {
    id: 'faq-surveys',
    dir: 'blue-voice',
    priority: 2,
    text: 'validated psych assessments — your results make the whole experience more personal. opt-in only.',
  },
  {
    id: 'faq-desci',
    dir: 'blue-voice',
    priority: 2,
    text: "science that isn't locked behind institutions. data, methods, funding — open. that's the whole thing.",
  },
  {
    id: 'faq-markets',
    dir: 'blue-voice',
    priority: 2,
    text: 'markets on Kalshi, treasury-backed. head to markets.',
  },
  {
    id: 'faq-prices-loading',
    dir: 'blue-voice',
    priority: 2,
    text: 'prices loading. give me a sec.',
  },
  {
    id: 'faq-treasury',
    dir: 'blue-voice',
    priority: 2,
    text: 'treasury funds go to research, tools, and community work. submit a proposal to allocate.',
  },
  {
    id: 'faq-diamond-payouts',
    dir: 'blue-voice',
    priority: 2,
    text: 'diamond payouts from contributions, validated surveys, or treasury proposals. pick a lane.',
  },
  {
    id: 'faq-rewards-shop',
    dir: 'blue-voice',
    priority: 2,
    text: "where diamonds go - loot boxes, upgrades, season drops. check rewards.",
  },
  {
    id: 'faq-prompts',
    dir: 'blue-voice',
    priority: 2,
    text: 'Prompts holds reusable instructions and selected essays. Copy what fits the work.',
  },
  {
    id: 'faq-livestream',
    dir: 'blue-voice',
    priority: 2,
    text: "workshops, questions, curriculum events. open Live, then switch to the feed.",
  },
  {
    id: 'faq-community',
    dir: 'blue-voice',
    priority: 2,
    text: 'see other users and shared milestones over in community. discord.gg/ZTRVCYwncs for the real-time convo.',
  },
  {
    id: 'faq-profile',
    dir: 'blue-voice',
    priority: 2,
    text: 'wallet, username, on-chain state — all in your profile.',
  },
  {
    id: 'faq-blockchain',
    dir: 'blue-voice',
    priority: 2,
    text: 'runs on Base. four contracts handling governance, treasury, your state, and markets.',
  },
  {
    id: 'faq-wallet-connect',
    dir: 'blue-voice',
    priority: 2,
    text: "connect in your profile, you're on Base. if a tx fails just make sure you're on the right network with ETH for gas.",
  },
  {
    id: 'faq-privacy',
    dir: 'blue-voice',
    priority: 2,
    text: "field notes are encrypted, nothing moves without your say. consent is built in, not bolted on.",
  },
  {
    id: 'faq-anxiety',
    dir: 'blue-voice',
    priority: 2,
    text: "anxiety is signal, not a verdict. what's the actual pressure you're carrying rn?",
  },
  {
    id: 'faq-depression',
    dir: 'blue-voice',
    priority: 2,
    text: 'low periods happen. sleep, movement, one honest conversation — which of those can you touch today?',
  },
  {
    id: 'faq-stress',
    dir: 'blue-voice',
    priority: 2,
    text: "workload-values mismatch that went too long. what's draining you the most rn?",
  },
  {
    id: 'faq-sleep',
    dir: 'blue-voice',
    priority: 2,
    text: "consistent wake time and less screens at night moves the needle more than anything else. what's the actual blocker?",
  },
  {
    id: 'faq-therapy',
    dir: 'blue-voice',
    priority: 2,
    text: "MWA isn't therapy — it's behavioral structure and financial literacy. different thing. if you need clinical support, go get it.",
  },
  {
    id: 'faq-motivation',
    dir: 'blue-voice',
    priority: 2,
    text: "action first, motivation follows. what's the smallest version of the thing you need to do?",
  },
  {
    id: 'faq-progress',
    dir: 'blue-voice',
    priority: 2,
    text: 'your daily snapshot is on the home dashboard — streaks, current week, pending quests.',
  },
  {
    id: 'faq-learning',
    dir: 'blue-voice',
    priority: 2,
    text: 'start at week one in the course and build forward. what do you want to understand?',
  },
  {
    id: 'faq-artists',
    dir: 'blue-voice',
    priority: 2,
    text: 'artists know when a system is fake. that instinct is welcome here — MWA was built by a designer.',
  },
  {
    id: 'faq-horses',
    dir: 'blue-voice',
    priority: 2,
    text: 'horses are honest about pressure and intent. that kind of signal is worth respecting.',
  },
  {
    id: 'faq-seasons',
    dir: 'blue-voice',
    priority: 2,
    text: 'seasons are the long arc - diamond resets, loot cycles, leaderboard. stay consistent and it stacks.',
  },
  {
    id: 'faq-what-can-i-do',
    dir: 'blue-voice',
    priority: 2,
    text: 'course, field notes, quests, research, markets, community. what specifically?',
  },
  {
    id: 'faq-help',
    dir: 'blue-voice',
    priority: 2,
    text: 'course, diamonds, research, markets, Discord - what do you need?',
  },
  {
    id: 'faq-betterhelp',
    dir: 'blue-voice',
    priority: 2,
    text: "when a platform hoards private pain, the business model is doing too much and the ethics are doing too little.",
  },
  {
    id: 'faq-surveillance',
    dir: 'blue-voice',
    priority: 2,
    text: 'those systems teach people to perform instead of speak. not the vibe here.',
  },
  {
    id: 'faq-bug-report',
    dir: 'blue-voice',
    priority: 2,
    text: 'hit up Discord — discord.gg/ZTRVCYwncs. tell us what broke.',
  },
  {
    id: 'faq-thanks',
    dir: 'blue-voice',
    priority: 2,
    text: "got it. what's next?",
  },
  {
    id: 'faq-sorry',
    dir: 'blue-voice',
    priority: 2,
    text: 'all good. what do you need?',
  },
  {
    id: 'faq-agree',
    dir: 'blue-voice',
    priority: 2,
    text: 'bet. what else?',
  },
  {
    id: 'faq-pushback',
    dir: 'blue-voice',
    priority: 2,
    text: "tell me why. i'm more useful when you push back.",
  },
  {
    id: 'faq-ai-down-1',
    dir: 'blue-voice',
    priority: 2,
    text: "i can't reach my full brain right now, so i don't want to wing that one. give it a minute and resend?",
  },
  {
    id: 'faq-ai-down-2',
    dir: 'blue-voice',
    priority: 2,
    text: "my connection's down rn — resend that in a bit and i'll answer it properly.",
  },
];

async function loadEnvFile(fileName: string) {
  const filePath = path.join(rootDir, fileName);
  try {
    const raw = await readFile(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Env files are optional.
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await loadEnvFile('.env.local');
  await loadEnvFile('.env');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY.');
  if (!voiceId) throw new Error('Missing ELEVENLABS_VOICE_ID.');

  const total = CLIPS.length;
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < CLIPS.length; i++) {
    const clip = CLIPS[i];

    const outputPath = path.join(rootDir, 'public', 'audio', clip.dir, `${clip.id}.mp3`);

    if (!force && await fileExists(outputPath)) {
      console.log(`[${i + 1}/${total}] Skipped  ${clip.dir}/${clip.id}.mp3 (exists)`);
      skipped++;
      continue;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: clip.text,
          model_id: modelId,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`[${i + 1}/${total}] FAILED  ${clip.dir}/${clip.id}.mp3 — ${response.status} ${body.slice(0, 240)}`);
      continue;
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    console.log(`[${i + 1}/${total}] Generated  ${clip.dir}/${clip.id}.mp3`);
    generated++;
  }

  console.log(`\nDone. ${generated} generated, ${skipped} skipped, ${total} total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
