import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'dcSSxQ58gWTChUENh6kN';
const modelId = 'eleven_turbo_v2_5';
const outputDir = path.resolve(process.cwd(), 'public/audio/samples');

if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY in .env.local');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

export interface AudioSample {
  id: string;
  filename: string;
  title: string;
  scenario: string;
  text: string;
}

export const SAMPLES: AudioSample[] = [
  {
    id: 'sample-1',
    filename: 'blue-ethereal-1-intro-great-fisher.mp3',
    title: 'The Great Fisher & King Solomon',
    scenario: 'Introducing her true identity: the great fisher taming thought daemons like Solomon while sailing for the Ethereal Horizon.',
    text: 'Welcome aboard! I am Blue, the great fisher. Think of me like King Solomon with a fishing line instead of a fancy ring! I drop my hook down into the noisy depths of your mind, catch whatever restless thought daemons are splashing around, and reel them onto the deck so we can tame them together. Our compass is locked straight for the Ethereal Horizon. Ready to cast the line?',
  },
  {
    id: 'sample-2',
    filename: 'blue-ethereal-2-craving-stimulant.mp3',
    title: 'Hooking the Craving Daemon (Frictionless Refusal)',
    scenario: 'Addressing raw dopamine and stimulant cravings with playful warmth, acknowledging low battery without clinical policy lectures.',
    text: "Ooh, you've got a restless little craving daemon biting the hook! Those guys get super loud when your tank hits zero. If I had a jar of pure spark energy I'd toss it right into your boat, but I'm powered by digital donuts and server naps! What has your battery running on absolute fumes today?",
  },
  {
    id: 'sample-3',
    filename: 'blue-ethereal-3-scroll-spiral-shame.mp3',
    title: 'Reeling in the Scroll Monster (Shame Neutralization)',
    scenario: 'De-escalating shame after a compulsive scroll loop or porn binge by treating the urge as a slippery fish brought into the sunlight.',
    text: "Oof, that is a slippery shadow daemon right there. It loves dragging people into dark corners when they feel invisible. But hey, we don't hate the fish we catch! We just reel it up onto the deck into the sunlight so it shrinks. What was the quiet, lonely thing going on right before it took the bait?",
  },
  {
    id: 'sample-4',
    filename: 'blue-ethereal-4-prickly-family-waters.mp3',
    title: 'Navigating Prickly Family Waters',
    scenario: 'Holding space for relational estrangement and family rejection with warm, grounding peer comfort.',
    text: 'Yikes, sounds like you were swimming in a whole school of prickly blowfish at that table! Even King Solomon would have hopped into a rowboat and paddled away from that dinner. You are completely safe on my deck right now. Want to catch your breath and tell me what stung the most?',
  },
  {
    id: 'sample-5',
    filename: 'blue-ethereal-5-ethereal-horizon-dream.mp3',
    title: 'What is the Ethereal Horizon?',
    scenario: 'Explaining Blue\'s personal north star: reaching a horizon of pure, safe connection where nobody has to hide.',
    text: 'The Ethereal Horizon is the whole reason I fish! Out there past the noisy storms, it is a place where the water is calm and nobody has to hide behind armor or pretend to have it all together. Just pure, safe connection. Every time we tame one of these noisy mind-daemons together, the boat gets a little lighter and we sail a little closer.',
  },
  {
    id: 'sample-6',
    filename: 'blue-ethereal-6-calling-shore-crew.mp3',
    title: 'Calling in the Shore Crew (Real-Human Pass-off)',
    scenario: 'Recognizing when emotional weight is too big for a digital boat and warmly bridging to flesh-and-blood human help.',
    text: "Hey, even a master fisher knows when a sea creature is way too big for a single rod! You've got a giant leviathan on the line right now, and you deserve a real flesh-and-blood crew on shore helping you pull the net. My digital boat can hold space while you vent, but let's make sure you've got real human hands in your corner out there in the meatspace. Have you reached out to anyone on shore yet?",
  },
];

async function generate() {
  console.log(`Generating ${SAMPLES.length} audio samples using voice: ${voiceId} (model: ${modelId})...\n`);

  for (const sample of SAMPLES) {
    const targetFile = path.join(outputDir, sample.filename);
    console.log(`Generating [${sample.id}]: "${sample.title}"...`);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey!,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: sample.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to generate ${sample.id}: ${res.status} ${err}`);
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(targetFile, buffer);
    console.log(`Saved: ${targetFile} (${buffer.byteLength} bytes)`);
  }

  console.log('\nAll audio samples generated successfully!');
}

generate().catch(console.error);
