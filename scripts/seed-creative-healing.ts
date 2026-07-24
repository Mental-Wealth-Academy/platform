/**
 * Seed script: Migrate the hardcoded "Creative Healing" 12-week course
 * from weekSections.tsx / AccordionJournalCard.tsx / course/page.tsx
 * into the new vip_courses / course_weeks / course_components DB tables.
 *
 * Usage: npx tsx scripts/seed-creative-healing.ts
 *
 * Each component's config includes a `legacyType` field so that
 * WeekTasksView and AccordionJournalCard can reconstruct the exact
 * old JournalSection[] format from the DB records.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();
import { sqlQuery, isDbConfigured } from '../lib/db';
import { ensureVipCourseSchema } from '../lib/ensureVipCourseSchema';

// ── Types ──

type SeedComponentType =
  | 'rich_text' | 'multiple_choice' | 'media_embed' | 'image_embed'
  | 'video_embed' | 'file_upload' | 'text_input' | 'rating_scale'
  | 'reflection_journal' | 'quiz_block' | 'nft_gate';

type LegacyType =
  | 'text' | 'list' | 'blurts' | 'lives' | 'checklist' | 'time-map'
  | 'enjoy-list' | 'life-pie' | 'numbered-list' | 'affirmations';

interface SeedComponent {
  componentType: SeedComponentType;
  title: string;
  config: Record<string, unknown>;
  required?: boolean;
}

interface SeedWeek {
  weekNumber: number;
  title: string;
  theme: string;
  readingFile?: { title: string; markdownPath: string; imageUrl: string; description: string };
  components: SeedComponent[];
}

// ── Legacy-type inference ──
// Determines the old JournalSection.type from the new component data.

function inferLegacyType(comp: SeedComponent): LegacyType {
  const t = comp.title.toLowerCase();
  const ct = comp.componentType;
  const cfg = comp.config as Record<string, unknown>;

  if (t.includes('blurts')) return 'blurts';
  if (t.includes('time map')) return 'time-map';

  if (ct === 'multiple_choice') return 'checklist';
  if (ct === 'rating_scale') return 'life-pie';
  if (ct === 'reflection_journal') return 'text';
  if (ct === 'rich_text') return 'text';

  if (ct === 'text_input') {
    const labels = cfg.labels as string[] | undefined;
    const count = cfg.count as number | undefined;
    const multiple = cfg.multiple as boolean | undefined;

    if (multiple) {
      // Check for special sub-types
      if (count === 20 || labels?.[0]?.includes('Activity + last date')) return 'enjoy-list';
      if (labels?.[0]?.includes('Affirmation') || t.includes('daily affirm')) return 'affirmations';
      if (labels?.[0]?.startsWith('Life') || t.includes('imaginary lives')) return 'lives';
      return 'list';
    }

    // Single text_input with labels → numbered-list
    if (labels && labels.length > 0) return 'numbered-list';
    return 'text';
  }

  return 'text';
}

function withLegacyType(comp: SeedComponent): SeedComponent {
  const legacyType = inferLegacyType(comp);
  return { ...comp, config: { ...comp.config, legacyType } };
}

// ── Weekly reading markdown paths ──

const WEEKLY_READINGS: Array<{
  title: string; description: string; slug: string; markdownPath: string; imageUrl: string;
}> = [
  { title: 'Art as Creative Practice', description: 'This week introduces the habits behind creative recovery.', slug: 'art-is-spiritual-warfare', markdownPath: '/readings/art-is-spiritual-warfare.md', imageUrl: 'https://i.imgur.com/KkpN9as.png' },
  { title: 'A Sense of Safety', description: 'Establish a foundation of safety to explore your creativity without fear.', slug: 'sense-of-safety', markdownPath: '/readings/sense-of-safety.md', imageUrl: '/stories/week-01/creative-recovery-butterflies.png' },
  { title: 'A Sense of Identity', description: 'The gap between human perception and machine processing.', slug: 'sense-of-identity', markdownPath: '/readings/sense-of-identity.md', imageUrl: '/stories/week-01/blue-research-log.png' },
  { title: 'A Sense of Power', description: 'Anger, shame, and useful signals surface here.', slug: 'sense-of-power', markdownPath: '/readings/sense-of-power.md', imageUrl: '/stories/week-01/shadow-breaking-free.png' },
  { title: 'A Sense of Integrity', description: 'Align your actions with your deepest values.', slug: 'sense-of-integrity', markdownPath: '/readings/sense-of-integrity.md', imageUrl: '/stories/week-01/shadow-breaking-free.png' },
  { title: 'A Sense of Possibility', description: 'Dismantle the limits you inherited.', slug: 'sense-of-possibility', markdownPath: '/readings/sense-of-possibility.md', imageUrl: '/stories/week-01/trapped-shade-chamber.png' },
  { title: 'A Sense of Abundance', description: 'Study the money stories shaping your creative choices.', slug: 'sense-of-abundance', markdownPath: '/readings/sense-of-abundance.md', imageUrl: 'https://i.imgur.com/DqnZ4P5.jpeg' },
  { title: 'A Sense of Connection', description: 'Creativity is not solitary.', slug: 'sense-of-connection', markdownPath: '/readings/sense-of-connection.md', imageUrl: '/stories/week-01/healer-creative-reflection.png' },
  { title: 'A Sense of Strength', description: 'Surviving discouragement.', slug: 'sense-of-strength', markdownPath: '/readings/sense-of-strength.md', imageUrl: 'https://i.imgur.com/6x026dv.jpeg' },
  { title: 'A Sense of Compassion', description: 'Fear disguises itself as laziness.', slug: 'sense-of-compassion', markdownPath: '/readings/sense-of-compassion.md', imageUrl: 'https://i.imgur.com/Wiv0PnM.png' },
  { title: 'A Sense of Self-Protection', description: 'Guard your creative energy.', slug: 'sense-of-self-protection', markdownPath: '/readings/sense-of-self-protection.md', imageUrl: 'https://i.imgur.com/86MQLAz.jpeg' },
  { title: 'A Sense of Autonomy', description: 'Own your process.', slug: 'sense-of-autonomy', markdownPath: '/readings/sense-of-autonomy.md', imageUrl: 'https://i.imgur.com/RAs9HJk.png' },
  { title: 'A Sense of Trust', description: 'Choose the next concrete action.', slug: 'sense-of-faith', markdownPath: '/readings/sense-of-faith.md', imageUrl: 'https://i.imgur.com/Gd2fbry.png' },
];

// ── Helper: component factory functions ──
// Note: `simpleText` and `multiText` already inject `legacyType` via withLegacyType.

function richText(title: string, content: string): SeedComponent {
  return { componentType: 'rich_text', title, config: { content, format: 'markdown' } };
}

function simpleText(title: string, instructions: string, placeholder?: string): SeedComponent {
  return {
    componentType: 'text_input',
    title,
    config: { placeholder: placeholder ?? '', inputType: 'text', maxLength: 2000, validation: { required: false } },
  };
}

function multiText(title: string, instructions: string, labels: string[], type: 'text' | 'textarea' = 'text'): SeedComponent {
  return {
    componentType: 'text_input',
    title,
    config: { placeholder: instructions, inputType: type, maxLength: 2000, labels, multiple: true },
  };
}

function numberedList(title: string, instructions: string, count: number, prefix = ''): SeedComponent {
  const labels = Array.from({ length: count }, (_, i) => `${prefix || 'Item'} ${i + 1}`);
  return { componentType: 'text_input', title, config: { placeholder: instructions, inputType: 'text', maxLength: 2000, labels, multiple: true } };
}

function checklist(title: string, instructions: string, items: string[]): SeedComponent {
  return {
    componentType: 'multiple_choice',
    title,
    config: {
      question: instructions,
      options: items.map((text, i) => ({ id: `check-${i}`, text, isCorrect: true })),
      allowMultiple: true,
      showFeedback: false,
    },
  };
}

function reflection(title: string, prompt: string, minWords = 0): SeedComponent {
  return {
    componentType: 'reflection_journal',
    title,
    config: { prompt, minWords, saveEnabled: true },
  };
}

// ── Week task definitions ──

const WEEKS: SeedWeek[] = [
  // Week 0 — Introduction
  {
    weekNumber: 0,
    title: 'Week 0',
    theme: 'Introduction',
    readingFile: { title: WEEKLY_READINGS[0].title, markdownPath: WEEKLY_READINGS[0].markdownPath, imageUrl: WEEKLY_READINGS[0].imageUrl, description: WEEKLY_READINGS[0].description },
    components: [
      simpleText('What Are You Building Toward?', 'Name the version of your creative life you want to build. Be concrete: what changes, what habits support it, and what evidence would prove you are moving.', 'Write what you are building toward...'),
    ],
  },

  // Week 1 — Safety
  {
    weekNumber: 1,
    title: 'Week 1',
    theme: 'A Sense of Safety',
    readingFile: { title: WEEKLY_READINGS[1].title, markdownPath: WEEKLY_READINGS[1].markdownPath, imageUrl: WEEKLY_READINGS[1].imageUrl, description: WEEKLY_READINGS[1].description },
    components: [
      { componentType: 'reflection_journal', title: 'Blurts → Affirmations', config: { prompt: 'This week, work with your affirmations of choice and your blurts at the end of each day\'s field notes. Convert all negative blurts into positive affirmations. Example: "I\'m stupid" → "I\'m always learning"', minWords: 0, saveEnabled: true } },
      reflection('Artist Date', 'Take yourself on an artist date this week. A sample: take five dollars and go to your local five-and-dime. Buy silly things like gold stick-em stars, tiny dinosaurs, postcards, sparkly sequins, glue, kid\'s scissors, crayons.', 20),
      numberedList('Time Travel: Monsters', 'List three old enemies of your creative self-worth. Be specific. Your historic monsters are building blocks of your core negative beliefs. Then select one and write out its horror story.', 4, 'Enemy'),
      numberedList('Time Travel: Champions', 'List three old champions of your creative self-worth. Be specific. Every encouraging word counts.', 3, 'Champion'),
      numberedList('Letters to Self', 'Write two letters: (1) A letter to the editor in your defense—mail it to yourself. (2) A thank-you letter to a long-lost mentor or to yourself.', 2, 'Letter'),
      { componentType: 'text_input', title: 'Five Imaginary Lives', config: { placeholder: 'If you had five other lives to lead, what would you do?', inputType: 'text', maxLength: 2000, labels: ['Life 1', 'Life 2', 'Life 3', 'Life 4', 'Life 5', 'This week I will try:'], multiple: true } },
      checklist('Artist Walk', 'Take your artist for a walk. A brisk twenty-minute walk can shift attention and clear stuck thinking.', [
        'Completed 20-minute walk', 'Walked mindfully (no phone)', 'Noticed something new or inspiring',
      ]),
    ],
  },

  // Week 2 — Identity
  {
    weekNumber: 2,
    title: 'Week 2',
    theme: 'A Sense of Identity',
    readingFile: { title: WEEKLY_READINGS[2].title, markdownPath: WEEKLY_READINGS[2].markdownPath, imageUrl: WEEKLY_READINGS[2].imageUrl, description: WEEKLY_READINGS[2].description },
    components: [
      { componentType: 'rich_text', title: 'Time Map', config: { content: 'Where does your time go? List your five major activities this week. How much time did you give to each one? Which were what you wanted to do and which were shoulds? How much of your time is spent helping others and ignoring your own desires? Create a safety map: inside the circle, place topics you need to protect and supportive people. Outside, place names of those you must be self-protective around.', format: 'markdown' } },
      { componentType: 'text_input', title: 'List 20 Things You Enjoy', config: { placeholder: 'List twenty things you enjoy doing', inputType: 'text', maxLength: 500, multiple: true, count: 20, labels: Array.from({ length: 20 }, (_, i) => `${i + 1}. Activity + last date`) } },
      numberedList('Do Two of Your 20 Things', 'From your 20 things you enjoy, write down two favorite things that you\'ve avoided that could be this week\'s goals.', 2, 'Favorite thing'),
      { componentType: 'text_input', title: 'Daily Affirmations', config: { placeholder: 'Write three chosen affirmations five times each day in your field notes', inputType: 'text', maxLength: 500, labels: ['Chosen Affirmation 1', 'Chosen Affirmation 2', 'Chosen Affirmation 3'], multiple: true } },
      { componentType: 'text_input', title: 'Five More Imaginary Lives', config: { placeholder: 'Return to the list of imaginary lives from last week. Add five more lives.', inputType: 'text', maxLength: 2000, labels: ['Life 6', 'Life 7', 'Life 8', 'Life 9', 'Life 10'], multiple: true } },
      { componentType: 'rating_scale', title: 'Draw a Life Pie', config: { min: 0, max: 100, step: 1, labels: { 0: 'Values', 20: 'Exercise', 40: 'Play', 60: 'Work', 80: 'Friends', 100: 'Romance/Adventure' } } },
      numberedList('Ten Tiny Changes', 'List ten changes you\'d like to make for yourself, from the significant to the small.', 10, 'I would like to'),
      numberedList('Make & Do a Goal', 'Select one small item from your Ten Tiny Changes and make it a goal for this week. Then do it!', 2, 'Goal'),
    ],
  },

  // Week 3 — Power
  {
    weekNumber: 3,
    title: 'Week 3',
    theme: 'A Sense of Power',
    readingFile: { title: WEEKLY_READINGS[3].title, markdownPath: WEEKLY_READINGS[3].markdownPath, imageUrl: WEEKLY_READINGS[3].imageUrl, description: WEEKLY_READINGS[3].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week. Set aside about two hours for creative attention.', 20),
      checklist('Artist Walk', 'Take your artist for a walk.', [
        'Completed 20-minute walk', 'Walked mindfully (no phone)', 'Noticed something new or inspiring',
      ]),
      numberedList('Anger Exercise', 'Anger is fuel. It tells us what we want. List situations, people, or events that make you angry.', 5, 'Anger'),
      reflection('Useful Timing Log', 'Record any coincidences, lucky breaks, or useful openings you notice this week.', 30),
      numberedList('Deferred Joys List', 'List ten things you love and would love to do but have postponed, dismissed, or ruled out.', 10),
      numberedList('Wish List', 'Write down your wishes quickly — don\'t overthink. Eighteen wishes minimum.', 18),
    ],
  },

  // Week 4 — Integrity
  {
    weekNumber: 4,
    title: 'Week 4',
    theme: 'A Sense of Integrity',
    readingFile: { title: WEEKLY_READINGS[4].title, markdownPath: WEEKLY_READINGS[4].markdownPath, imageUrl: WEEKLY_READINGS[4].imageUrl, description: WEEKLY_READINGS[4].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      checklist('Artist Walk', 'Take your artist for a walk.', ['Completed 20-minute walk', 'Walked mindfully (no phone)', 'Noticed something new or inspiring']),
      checklist('Reading Deprivation', 'This week, abstain from reading.', [
        'Avoided reading books/magazines', 'Avoided scrolling social media feeds', 'Used freed time for creative activity', 'Noticed what came up during the deprivation',
      ]),
      numberedList('Buried Dreams List', 'List five dreams that have been buried.', 5, 'Dream'),
      reflection('Inventory of Creative Injuries', 'Write about a time your creativity was crushed. Who said what? How old were you?', 50),
      reflection('Life Is What?', 'Complete the sentence "Life is..." with as many endings as you can think of. Then complete "If I had more integrity, I would..." five times.', 30),
    ],
  },

  // Week 5 — Possibility
  {
    weekNumber: 5,
    title: 'Week 5',
    theme: 'A Sense of Possibility',
    readingFile: { title: WEEKLY_READINGS[5].title, markdownPath: WEEKLY_READINGS[5].markdownPath, imageUrl: WEEKLY_READINGS[5].imageUrl, description: WEEKLY_READINGS[5].description },
    components: [
      numberedList('Support Beliefs', 'List five reasons you struggle to believe support will show up when you take creative risks.', 5, 'Reason'),
      numberedList('List 5 Desires', 'If I had either trust or money I would try... List five desires.', 5, 'Desire'),
      numberedList('List 5 Imaginary Lives', 'One more time, list five imaginary lives.', 5, 'Life'),
      numberedList('List 5 Adventures', 'If I were twenty and had money... List five adventures.', 5, 'Adventure'),
      numberedList('List 5 Postponed Pleasures', 'List postponed pleasures.', 5, 'Pleasure'),
      reflection('Mirror Exercise', 'Five minutes in front of a mirror. Say "I love you" aloud to yourself. Notice what comes up.', 20),
    ],
  },

  // Week 6 — Abundance
  {
    weekNumber: 6,
    title: 'Week 6',
    theme: 'A Sense of Abundance',
    readingFile: { title: WEEKLY_READINGS[6].title, markdownPath: WEEKLY_READINGS[6].markdownPath, imageUrl: WEEKLY_READINGS[6].imageUrl, description: WEEKLY_READINGS[6].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      numberedList('Money Beliefs', 'List five core beliefs you have about money.', 5, 'Belief'),
      numberedList('Money History', 'List ten significant events in your money history.', 10, 'Event'),
      reflection('Creative Investment', 'What would you do with your creativity if money were not a concern?', 30),
      reflection('Abundance Inventory', 'List all the non-monetary abundance in your life.', 30),
    ],
  },

  // Week 7 — Connection
  {
    weekNumber: 7,
    title: 'Week 7',
    theme: 'A Sense of Connection',
    readingFile: { title: WEEKLY_READINGS[7].title, markdownPath: WEEKLY_READINGS[7].markdownPath, imageUrl: WEEKLY_READINGS[7].imageUrl, description: WEEKLY_READINGS[7].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      numberedList('Creative Community', 'List five people who support your creative growth.', 5, 'Person'),
      numberedList('Creative Envy Inventory', 'Envy is a map. List three people you envy.', 3, 'Envy'),
      checklist('Reach Out', 'Connect with your creative community.', [
        'Reached out to a creative friend', 'Shared my work with someone', 'Attended a creative event', 'Offered encouragement to another creator',
      ]),
      reflection('Solo Date Debrief', 'What came up during your solo artist date? What surprised you?', 30),
    ],
  },

  // Week 8 — Strength
  {
    weekNumber: 8,
    title: 'Week 8',
    theme: 'A Sense of Strength',
    readingFile: { title: WEEKLY_READINGS[8].title, markdownPath: WEEKLY_READINGS[8].markdownPath, imageUrl: WEEKLY_READINGS[8].imageUrl, description: WEEKLY_READINGS[8].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      checklist('Artist Walk', 'Take your artist for a walk.', ['Completed 20-minute walk', 'Walked mindfully (no phone)', 'Noticed something new or inspiring']),
      numberedList('Creative Strengths', 'List five creative strengths you have.', 5, 'Strength'),
      numberedList('Overcoming Obstacles', 'List three obstacles you\'ve overcome in your creative life.', 3, 'Obstacle'),
      reflection('Resilience Reflection', 'Write about a time you faced creative rejection or discouragement and kept going.', 40),
      numberedList('Support System', 'List five people or resources that help you stay strong.', 5, 'Support'),
    ],
  },

  // Week 9 — Compassion
  {
    weekNumber: 9,
    title: 'Week 9',
    theme: 'A Sense of Compassion',
    readingFile: { title: WEEKLY_READINGS[8].title, markdownPath: WEEKLY_READINGS[8].markdownPath, imageUrl: WEEKLY_READINGS[8].imageUrl, description: WEEKLY_READINGS[8].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      reflection('Resentments', 'List any resentments (anger) you have in connection with this project, it doesn\'t matter how petty, picky, or irrational. To your shade, they are big deals: grudges.', 30),
      reflection('Fears', 'Ask your shade to list any and all fears about the projected piece of work and/or anyone connected to it. Again, these fears can be as dumb as any baby\'s. It does not matter that they are groundless to your organic eye. What matters is that they are big scary daemons to your higher self.', 30),
      reflection('Remaining Fears & Anger', 'Ask yourself if that is all, have you left out any baby fear? Have you suppressed any "stupid" anger? Get it on the page.', 20),
      reflection('Gains of Inaction', 'Ask yourself what you stand to gain by not doing this piece of work.', 30),
      reflection('The Contract', 'Make your contract. The contract is: "Okay, orbiter, you take care of the quality, I\'ll take care of the quantity" Sign your contract and log it.', 10),
      checklist('Morning Pages Review', 'Practice morning pages review.', [
        'Read your morning pages', 'Highlight the insights', 'Highlight the actions',
      ]),
      reflection('Visualization & Collage', 'Imagine you have your goal accomplished. Spend enough time to fill in all the crazy weird details that would really make the experience wonderful for you. Create a collage of this, as seeing is believing.', 30),
      reflection('Priorities', 'Use a list to create all your creative goals for the year, for the month, and for the week.', 30),
      reflection('U-Turns', 'We\'ve all made U-turns, name one of yours, then three more. Name the one that just kills you.', 35),
      reflection('Forgiveness & Affirmations', 'Forgive yourself for all failures, devise a personalized list of affirmations to help you do better in the future.', 30),
      reflection('Rescuing Shades', 'Very gently, consider whether any aborted, discarded, savaged, or sabotaged shades can be rescued. Remember, you are not alone. All of us have taken U-turns.', 30),
      reflection('Creative Resistance', 'Do not take a creative U-turn now. Instead, notice your resistance. Field notes seeming difficult? Stupid? Pointless? Do them anyway.', 25),
      reflection('Frightening Dreams', 'What dreams are lurching toward possibility? Admit they frighten you.', 25),
      reflection('The Totem', 'Choose a totem. It could be a doll, a stuffed animal, a carved figure, or toy. Choose something you feel protective fondness toward. Give your totem a place of honor and then honor it by not beating up on your programmed clones.', 20),
    ],
  },

  // Week 10 — Self-Protection
  {
    weekNumber: 10,
    title: 'Week 10',
    theme: 'A Sense of Self-Protection',
    readingFile: { title: WEEKLY_READINGS[9].title, markdownPath: WEEKLY_READINGS[9].markdownPath, imageUrl: WEEKLY_READINGS[9].imageUrl, description: WEEKLY_READINGS[9].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      numberedList('Energy Drains', 'List five people, situations, or commitments that drain your creative energy.', 5, 'Drain'),
      numberedList('Boundaries to Set', 'List three boundaries you need to set to protect your creative time.', 3, 'Boundary'),
      checklist('Boundary Practice', 'Practice setting boundaries this week.', [
        'Said no to something that drains me', 'Protected my creative time from interruption',
        'Set a boundary with a person who diminishes my creativity', 'Chose rest over productivity',
      ]),
      reflection('Self-Protection Plan', 'What does a healthy self-protection plan look like for your creativity?', 40),
    ],
  },

  // Week 11 — Autonomy
  {
    weekNumber: 11,
    title: 'Week 11',
    theme: 'A Sense of Autonomy',
    readingFile: { title: WEEKLY_READINGS[10].title, markdownPath: WEEKLY_READINGS[10].markdownPath, imageUrl: WEEKLY_READINGS[10].imageUrl, description: WEEKLY_READINGS[10].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      numberedList('Autonomy Inventory', 'List five areas where you feel creatively autonomous. List five where you don\'t.', 10, 'Area'),
      reflection('Creative Declaration', 'Write a creative declaration of independence. What rules are you releasing?', 40),
      numberedList('Personal Creative Values', 'List five core values that guide your creative life.', 5, 'Value'),
      checklist('Autonomy Action', 'Take autonomous action this week.', [
        'Made a creative decision without seeking approval', 'Started a project just for me',
        'Said no to an expectation that doesn\'t serve me', 'Followed my curiosity somewhere unexpected',
      ]),
    ],
  },

  // Week 12 — Trust
  {
    weekNumber: 12,
    title: 'Week 12',
    theme: 'A Sense of Trust',
    readingFile: { title: WEEKLY_READINGS[11].title, markdownPath: WEEKLY_READINGS[11].markdownPath, imageUrl: WEEKLY_READINGS[11].imageUrl, description: WEEKLY_READINGS[11].description },
    components: [
      reflection('Artist Date', 'Take yourself on a solo artist date this week.', 20),
      numberedList('Trust Inventory', 'List five things you trust about yourself creatively. List five things you\'re learning to trust.', 10, 'Trust'),
      reflection('Letting Go', 'What control do you need to release to trust the creative process more?', 40),
      checklist('Trust Practice', 'Practice trusting your creative instincts.', [
        'Followed a creative impulse without overthinking', 'Shared unfinished work with someone',
        'Trusted my intuition on a creative decision', 'Let go of a perfectionist standard',
      ]),
      reflection('Trust Reflection', 'How does trusting yourself change your creative practice?', 30),
    ],
  },

  // Week 13 — Epilogue
  {
    weekNumber: 13,
    title: 'Week 13',
    theme: 'Epilogue',
    readingFile: { title: WEEKLY_READINGS[12].title, markdownPath: WEEKLY_READINGS[12].markdownPath, imageUrl: WEEKLY_READINGS[12].imageUrl, description: WEEKLY_READINGS[12].description },
    components: [
      reflection('Course Reflection', 'This is your epilogue. Reflect on the entire course.', 100),
      numberedList('Key Learnings', 'List your top five learnings or breakthroughs from this course.', 5, 'Learning'),
      reflection('Letter to Future Self', 'Write a letter to your future self about what you\'ve discovered and want to remember.', 50),
      numberedList('Continuing Practices', 'List five practices from this course you want to continue.', 5, 'Practice'),
    ],
  },
];

// ── Inject legacyType into every component ──

for (const week of WEEKS) {
  week.components = week.components.map(withLegacyType);
}

// ── Main seed function ──

async function main() {
  if (!isDbConfigured()) {
    console.error('Database not configured. Set DATABASE_URL or POSTGRES_* env vars.');
    process.exit(1);
  }

  await ensureVipCourseSchema();
  console.log('✓ Schema ensured');

  // Drop existing course data so we can re-seed cleanly
  const existing = await sqlQuery<Array<{ id: string }>>(
    `SELECT id FROM vip_courses WHERE slug = 'creative-healing' LIMIT 1`,
  );
  if (existing.length > 0) {
    // Cascade delete via FK + ON DELETE CASCADE (or manual)
    await sqlQuery(`DELETE FROM course_components WHERE week_id IN (SELECT id FROM course_weeks WHERE course_id = :id)`, { id: existing[0].id });
    await sqlQuery(`DELETE FROM course_weeks WHERE course_id = :id`, { id: existing[0].id });
    await sqlQuery(`DELETE FROM vip_courses WHERE id = :id`, { id: existing[0].id });
    console.log('→ Dropped existing "Creative Healing" course');
  }

  // Create the course
  const courseRows = await sqlQuery<Array<{ id: string }>>(
    `INSERT INTO vip_courses (user_id, slug, title, focus, cover_image_url, status)
     VALUES ('seed', 'creative-healing', 'Creative Healing', 'Healing', 'https://i.imgur.com/KkpN9as.png', 'published')
     RETURNING id`,
  );
  const courseId = courseRows[0].id;
  console.log(`✓ Created course "Creative Healing" (id=${courseId})`);

  // Insert each week
  let totalComponents = 0;
  for (const week of WEEKS) {
    const weekRows = await sqlQuery<Array<{ id: string }>>(
      `INSERT INTO course_weeks (course_id, week_number, title, theme, status, sort_order)
       VALUES (:courseId, :weekNumber, :title, :theme, 'published', :weekNumber)
       RETURNING id`,
      { courseId, weekNumber: week.weekNumber, title: week.title, theme: week.theme },
    );
    const weekId = weekRows[0].id;

    // Add reading component
    if (week.readingFile) {
      await sqlQuery(
        `INSERT INTO course_components (week_id, sort_order, component_type, title, config, required)
         VALUES (:weekId, 0, 'rich_text', :title, :config, false)`,
        {
          weekId,
          title: week.readingFile.title,
          config: JSON.stringify({
            content: week.readingFile.description,
            url: week.readingFile.markdownPath,
            originalName: week.readingFile.title,
            imageUrl: week.readingFile.imageUrl,
            description: week.readingFile.description,
          }),
        },
      );
    }

    // Add task components
    for (let i = 0; i < week.components.length; i++) {
      const comp = week.components[i];
      await sqlQuery(
        `INSERT INTO course_components (week_id, sort_order, component_type, title, config, required)
         VALUES (:weekId, :sortOrder, :componentType, :title, :config, :required)`,
        {
          weekId,
          sortOrder: i + 1,
          componentType: comp.componentType,
          title: comp.title,
          config: JSON.stringify(comp.config),
          required: comp.required ?? false,
        },
      );
    }

    totalComponents += week.components.length;
    console.log(`  ✓ Week ${week.weekNumber}: ${week.components.length} components`);
  }

  console.log(`\n✓ Seeded "Creative Healing" with ${WEEKS.length} weeks and ${totalComponents} components.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
