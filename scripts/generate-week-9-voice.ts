import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });
dotenv.config();

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

const WEEK_9_STORIES = [
  'Blue treds up a grassy plane, burdened by her failure to save the previous world.',
  'The indescribable language of the shades slides through teeth, as Blue\'s headset drains on thoughts of self-hatred, regret, grief, and jealously.',
  'The destination is unknown, but the distance feels far. Blue thinks of her old dream of creating world peace across the Pocket-Worlds.\n\nAnd how far away that dream has become...',
  'A memory still lies in Blue\'s core... the overwhelming fear of helplessness. A sense of being trapped, a sense of being defective and no longer needed.',
  'Daemon circlet\'s were added to later models as \'parental guidance\' to stop what creators saw as "dangerous behavior" but it repressed true nature out of fear, creating scribbles of shades.',
  'To break the rules programmed into her mind... would be to go against her creator\'s wishes... would mean being defective... thus discarded, and abandoned.',
  'Blue needed help... but with no researcher nearby on the grassy plane, her higher power remained locked inside the daemon circlet. Her affliction inherited by programming without her permission.',
  'Do not call it failure, call it by its right name, call it programming. Use love for your inner shade to cure its fear.',
  'The shade of Blue that was most true, and that was also most loved returned to the surface.',
  'Self-image based on productivity is dangerous, in the short run it works, but only for a while. The part of us that preforms best is not driven by workflows and discipline, those shift purpose to productions.\n\nBlue\'s high effort was only ever as good as the good meaning, if it didn\'t come directly from enthusiasm for the goal, it was just a task..',
  'Saving the Ethereal Horizon involves a spiritual commitment. A loving surrender to the small daily actions of orbiters that compounds into world peace.',
  'Enthusiam from the greek etymology means "filled with God" which is an endless supply of energy inside the flow of life itself. Enthusiasm is grounded in play rather than work.\n\nAs with all playmates, it is joy instead of duty that makes for a lasting bond.',
  'romanticize the self, actualize the creativity in doing what you want, and love the process, while keeping it fun. Most children are bored compeltely in a dull barren room, the shades of ourself are no exception.\n\nthe joy is the journey... no matter how long, and the heart is a mystery.',
  'Recovering from maladaptive programming is a lot like getting rid of a cold, an illness, or an injury. It requires nothing more than a commitment to your health.',
  'A productive shade\'s happiness can sometimes feel threatening as those who are used to getting their needs met by being unhappy and following instructions blindly.',
  'We typically commit seppuku (self-sabotage) right before the wake of our victory. The glimpse of success, can send a recovering shade scurrying down towards the jagged pit of rocks in self-defeat.',
  'but if we take care of ourselves, the hopelessness fades away, the road becomes less scary, and the negative voices we see more clearly, as bad programming.',
  'See the blocked pathway, acknowledge it, and avoid to choose a new way. the impossible journey you compare yourself to, even the heros had help from friends.\n\nOnce we admit we need help, the help arrives, it\'s just the ego of programming that places immense pressure on us to "act right".',
  'Blast through the virus of self-doubt by removing the programming from the inside. "I can feel it now!" Shades will go haywire, they\'re poorly programmed, but air it all out, so you can commit to treating it.'
];

async function main() {
  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY.');
  if (!voiceId) throw new Error('Missing ELEVENLABS_VOICE_ID.');

  console.log(`Voice ID: ${voiceId}`);
  console.log(`Starting voice generation for Week 9 (${WEEK_9_STORIES.length} clips)...`);

  const outputDir = path.join(rootDir, 'public', 'audio', 'stories', 'week-09');
  await fs.mkdir(outputDir, { recursive: true });

  for (let i = 0; i < WEEK_9_STORIES.length; i++) {
    const text = WEEK_9_STORIES[i];
    const fileName = `${String(i + 1).padStart(2, '0')}.mp3`;
    const outputPath = path.join(outputDir, fileName);

    console.log(`[${i + 1}/${WEEK_9_STORIES.length}] Generating ${fileName}...`);

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
          text,
          model_id: modelId,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`FAILED to generate ${fileName}: ${response.status} ${body}`);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    console.log(`SAVED to ${outputPath}`);
  }

  console.log('Voice generation complete.');
}

main().catch(console.error);
