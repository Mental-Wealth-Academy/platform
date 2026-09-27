/**
 * Seeds the large guide collection from the typed catalog in
 * content/guide-drafts/expansion-150/catalog.ts.
 *
 * The catalog is intentionally data-first: contributors can add a row with a
 * topic, lesson, practice, outcome, subjects, and prerequisite slugs. This
 * script turns each row into a published guide with the same metadata contract
 * used by the smaller expansion, then inserts edges after every guide exists.
 * The database cycle trigger remains authoritative.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-guide-expansion-150.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/seed-guide-expansion-150.ts
 *   npx tsx --env-file=.env.local scripts/seed-guide-expansion-150.ts --refresh
 */
import { isDbConfigured, sqlQuery } from '../lib/db';
import {
  addGuidePrereq,
  createGuide,
  getGuideBySlug,
  updateGuide,
} from '../lib/guides-db';
import { EXPANSION_150_GUIDES } from '../content/guide-drafts/expansion-150/catalog';

const DRY_RUN = process.argv.includes('--dry-run');
const REFRESH = process.argv.includes('--refresh');
const REVIEW_DATE = '2026-07-09';
const MINIMUM_ADDITIONS = 109;
const AUDIENCE = '12+';

const SOURCE_PROVENANCE: Record<string, string> = {
  learning: 'Original MWA synthesis referencing OpenStax Psychology 2e learning, memory, and cognition material: https://openstax.org/books/psychology-2e/pages/6-introduction',
  neuroscience: 'Original MWA synthesis referencing NIH brain education and OpenStax Psychology 2e: https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics',
  emotional: 'Original MWA synthesis referencing NIMH mental health guidance: https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
  coping: 'Original MWA synthesis referencing NIMH and CDC public health guidance: https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
  mindfulness: 'Original MWA synthesis referencing NCCIH meditation and mindfulness guidance: https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety',
  wellness: 'Original MWA synthesis referencing NIMH and CDC wellness guidance: https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
  research: 'Original MWA synthesis referencing OpenStax Psychology 2e research methods and analysis: https://openstax.org/books/psychology-2e/pages/2-2-approaches-to-research',
  communication: 'Original MWA synthesis referencing OpenStax Psychology 2e social psychology material: https://openstax.org/books/psychology-2e/pages/12-introduction',
  decision: 'Original MWA synthesis referencing OpenStax Psychology 2e cognition and research methods: https://openstax.org/books/psychology-2e/pages/7-1-what-is-cognition',
  'public-health': 'Original MWA synthesis referencing CDC public health and social connectedness guidance: https://www.cdc.gov/public-health-gateway/php/about/index.html',
  creativity: 'Original MWA synthesis referencing OpenStax Psychology 2e cognition material: https://openstax.org/books/psychology-2e/pages/7-1-what-is-cognition',
  lifespan: 'Original MWA synthesis referencing OpenStax Psychology 2e development material: https://openstax.org/books/psychology-2e/pages/9-introduction',
  ethics: 'Original MWA synthesis referencing the HHS Belmont Report principles: https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report/index.html',
};

function validateCatalog() {
  if (EXPANSION_150_GUIDES.length < MINIMUM_ADDITIONS) {
    throw new Error(`Catalog has ${EXPANSION_150_GUIDES.length} rows; at least ${MINIMUM_ADDITIONS} are required.`);
  }

  const slugs = new Set<string>();
  const titles = new Set<string>();
  for (const guide of EXPANSION_150_GUIDES) {
    if (slugs.has(guide.slug)) throw new Error(`Duplicate catalog slug: ${guide.slug}`);
    slugs.add(guide.slug);
    const titleKey = guide.title.trim().toLowerCase();
    if (titles.has(titleKey)) throw new Error(`Duplicate catalog title: ${guide.title}`);
    titles.add(titleKey);
    if (!guide.title.trim() || !guide.summary.trim() || !guide.lesson.trim() || !guide.practice.trim()) {
      throw new Error(`Incomplete catalog content: ${guide.slug}`);
    }
    if (guide.subjectIds.length === 0) throw new Error(`Missing subjects: ${guide.slug}`);
    if (guide.prereqSlugs.includes(guide.slug)) {
      throw new Error(`Self prerequisite: ${guide.slug}`);
    }
    if (!SOURCE_PROVENANCE[guide.sourceKey]) {
      throw new Error(`Missing source provenance for ${guide.sourceKey}`);
    }
  }
}

async function preflightDatabase() {
  const subjectIds = [...new Set(EXPANSION_150_GUIDES.flatMap((guide) => guide.subjectIds))];
  const subjects = await sqlQuery<Array<{ id: string }>>(
    `SELECT id FROM guide_subject_catalog WHERE id = ANY(:ids)`,
    { ids: subjectIds },
  );
  const availableSubjects = new Set(subjects.map((subject) => subject.id));
  const missingSubjects = subjectIds.filter((id) => !availableSubjects.has(id));
  if (missingSubjects.length > 0) {
    throw new Error(`Missing canonical subject IDs. Apply the subject migration first: ${missingSubjects.join(', ')}`);
  }

  const existingTitles = await sqlQuery<Array<{ slug: string; topic_title: string }>>(
    `SELECT slug, topic_title FROM guides WHERE topic_title = ANY(:titles)`,
    { titles: EXPANSION_150_GUIDES.map((guide) => guide.title) },
  );
  const slugByTitle = new Map(existingTitles.map((guide) => [guide.topic_title.trim().toLowerCase(), guide.slug]));
  for (const guide of EXPANSION_150_GUIDES) {
    const existingSlug = slugByTitle.get(guide.title.trim().toLowerCase());
    if (existingSlug && existingSlug !== guide.slug) {
      throw new Error(`Topic title collision: ${guide.title} already belongs to ${existingSlug}`);
    }
  }
}

function evidenceCriteria(outcome: string): string[] {
  const cap = outcome.trim().charAt(0).toUpperCase() + outcome.trim().slice(1);
  return [
    cap.endsWith('.') ? cap : `${cap}.`,
    'Apply the idea in the guide practice and record one observation.',
    'Name one context, limit, or follow-up question for further investigation.',
  ];
}

function bodyFor(guide: (typeof EXPANSION_150_GUIDES)[number]) {
  const suffix = `The learner can ${guide.outcome}.`;
  return [
    {
      id: `${guide.slug}-core`,
      componentType: 'rich_text',
      title: 'Core idea',
      config: { format: 'markdown', content: `${guide.summary}\n\n${guide.lesson}` },
    },
    {
      id: `${guide.slug}-practice`,
      componentType: 'rich_text',
      title: 'Try it',
      config: { format: 'markdown', content: guide.practice },
    },
    {
      id: `${guide.slug}-check`,
      componentType: 'rich_text',
      title: 'Check your understanding',
      config: { format: 'markdown', content: suffix },
    },
  ];
}

async function main() {
  validateCatalog();
  if (!isDbConfigured()) {
    throw new Error('DATABASE_URL (or POSTGRES_* vars) not set. Aborting.');
  }
  await preflightDatabase();

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Planning ${EXPANSION_150_GUIDES.length} guide additions...\n`);
  const idBySlug = new Map<string, string>();

  // Pass 1: create every endpoint before adding any edge.
  for (const guide of EXPANSION_150_GUIDES) {
    const existing = await getGuideBySlug(guide.slug);
    if (existing) {
      console.log(`  = ${guide.slug} already exists${REFRESH ? ', refreshing' : ''}`);
      idBySlug.set(guide.slug, existing.id);
      if (REFRESH && !DRY_RUN) {
        await updateGuide({
          id: existing.id,
          topicTitle: guide.title,
          summary: guide.summary,
          intendedAudience: AUDIENCE,
          estimatedMinutes: 10,
          sourceProvenance: SOURCE_PROVENANCE[guide.sourceKey],
          sourceReviewedAt: REVIEW_DATE,
          evidenceCriteria: evidenceCriteria(guide.outcome),
          subjectIds: guide.subjectIds,
          body: bodyFor(guide),
        });
      }
      continue;
    }

    console.log(`  + ${guide.slug}`);
    if (DRY_RUN) {
      idBySlug.set(guide.slug, `dry-run-${guide.slug}`);
      continue;
    }

    const created = await createGuide({
      slug: guide.slug,
      topicTitle: guide.title,
      summary: guide.summary,
      intendedAudience: AUDIENCE,
      estimatedMinutes: 10,
      sourceProvenance: SOURCE_PROVENANCE[guide.sourceKey],
      sourceReviewedAt: REVIEW_DATE,
      evidenceCriteria: evidenceCriteria(guide.outcome),
      subjectIds: guide.subjectIds,
      status: 'published',
      body: bodyFor(guide),
    });
    idBySlug.set(guide.slug, created.id);
  }

  // Pass 2: resolve every prerequisite after all guide rows exist.
  console.log('\nWiring prerequisite edges...');
  for (const guide of EXPANSION_150_GUIDES) {
    const guideId = idBySlug.get(guide.slug);
    if (!guideId) continue;
    for (const prereqSlug of guide.prereqSlugs) {
      let prereqId = idBySlug.get(prereqSlug);
      if (!prereqId) {
        const prereq = await getGuideBySlug(prereqSlug);
        if (!prereq) throw new Error(`${guide.slug}: prerequisite ${prereqSlug} was not found`);
        prereqId = prereq.id;
        idBySlug.set(prereqSlug, prereqId);
      }
      console.log(`  ${prereqSlug} -> ${guide.slug}`);
      if (!DRY_RUN) await addGuidePrereq(guideId, prereqId);
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] Nothing written.' : 'Guide collection complete.'}`);
}

main().catch((error) => {
  console.error('Guide collection failed:', error);
  process.exit(1);
});
