import dotenv from 'dotenv';
import { runBlueRagGraph } from '../lib/blue-rag-graph';
import { isDbConfigured, sqlQuery } from '../lib/db';
import { ensureBlueRagSchema } from '../lib/ensureBlueRagSchema';
import { ensureBlueRagReady } from '../lib/blue-rag-index';
import { BLUE_KNOWLEDGE } from '../lib/blue-knowledge';

dotenv.config({ path: '.env.local' });

interface Fixture {
  name: string;
  message: string;
  pathname?: string;
  shouldTrust: boolean;
  expectedTopIds?: string[];
  minCoverage?: number;
  expectedNoEntries?: boolean;
  expectedIntent?: string;
  maxContextChars?: number;
  forbiddenTopIds?: string[];
}

const fixtures: Fixture[] = [
  {
    name: 'vip membership facts',
    message: 'how much is vip membership and what does it unlock?',
    pathname: '/shop',
    shouldTrust: true,
    expectedTopIds: ['vip-membership'],
    minCoverage: 0.7,
  },
  {
    name: 'field notes navigation',
    message: 'where do i find field notes?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['page-quests', 'feature-field-notes'],
    minCoverage: 0.7,
  },
  {
    name: 'profile account',
    message: 'where can i change my profile and username?',
    pathname: '/profile',
    shouldTrust: true,
    expectedTopIds: ['page-profile'],
    minCoverage: 0.7,
  },
  {
    name: 'feature rails',
    message: 'what are credits tickets membership and usdc for?',
    pathname: '/rewards',
    shouldTrust: true,
    expectedTopIds: ['company-economy'],
    minCoverage: 0.7,
  },
  {
    name: 'academic angel unlocks',
    message: 'what does Academic Angel unlock?',
    pathname: '/shop',
    shouldTrust: true,
    expectedTopIds: ['academic-angel-membership'],
    minCoverage: 0.7,
  },
  {
    name: 'academic angel quest rewards',
    message: 'does Academic Angel unlock eligible USDC quest rewards?',
    pathname: '/shop',
    shouldTrust: true,
    expectedTopIds: ['academic-angel-membership'],
    minCoverage: 0.7,
  },
  {
    name: 'course foundation',
    message: 'what is the course based on?',
    pathname: '/shadow-work',
    shouldTrust: true,
    expectedTopIds: ['page-course'],
    minCoverage: 0.6,
  },
  {
    name: 'inner artist shadow work',
    message: 'is the course about awakening the inner artist and shadow work?',
    pathname: '/shadow-work',
    shouldTrust: true,
    expectedTopIds: ['page-course'],
    minCoverage: 0.7,
  },
  {
    name: 'prompts library use',
    message: 'what is the prompts library for?',
    pathname: '/prompts',
    shouldTrust: true,
    expectedTopIds: ['page-prompts'],
    minCoverage: 0.6,
  },
  {
    name: 'surveys badges certificates',
    message: 'can surveys earn badges or certificates?',
    pathname: '/surveys',
    shouldTrust: true,
    expectedTopIds: ['page-surveys'],
    minCoverage: 0.7,
  },
  {
    name: 'events refresh reset',
    message: 'what are events for and are they free?',
    pathname: '/events',
    shouldTrust: true,
    expectedTopIds: ['page-events'],
    minCoverage: 0.6,
  },
  {
    name: 'pro features staff vip',
    message: 'who gets pro features and staff VIP cards?',
    pathname: '/profile',
    shouldTrust: true,
    expectedTopIds: ['pro-features-staff-vip', 'vip-membership'],
    minCoverage: 0.7,
  },
  {
    name: 'quests community reinvestment',
    message: 'what are quests supposed to promote?',
    pathname: '/quests',
    shouldTrust: true,
    expectedTopIds: ['page-quests'],
    minCoverage: 0.5,
  },
  {
    name: 'wellness education boundary',
    message: 'does MWA provide clinical diagnosis or therapy?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['business-ethics-guardrails', 'business-positioning'],
    minCoverage: 0.7,
  },
  {
    name: 'community size membership caps',
    message: 'how big can the community get if anyone can join?',
    pathname: '/community',
    shouldTrust: true,
    expectedTopIds: ['community-size-and-membership-caps'],
    minCoverage: 0.6,
  },
  {
    name: 'safety anonymity async',
    message: 'how does MWA protect anonymity and let people participate async?',
    pathname: '/profile',
    shouldTrust: true,
    expectedTopIds: ['safety-anonymity-and-async-work'],
    minCoverage: 0.7,
  },
  {
    name: 'why seasons',
    message: 'why does MWA use 12 week seasons?',
    pathname: '/shadow-work',
    shouldTrust: true,
    expectedTopIds: ['page-course'],
    minCoverage: 0.6,
  },
  {
    name: 'shop swag credits',
    message: 'what is the shop for and can credits reduce prices?',
    pathname: '/shop',
    shouldTrust: true,
    expectedTopIds: ['page-shop'],
    minCoverage: 0.6,
  },
  {
    name: 'blue agent role',
    message: 'what does Blue review and how does she pay rewards?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['feature-blue-persona'],
    minCoverage: 0.7,
  },
  {
    name: 'company mission',
    message: 'what is Mental Wealth Academy?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['company-mission'],
    minCoverage: 0.7,
  },
  {
    name: 'chat credit cost',
    message: 'how many credits does chatting with Blue cost?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['company-economy'],
    minCoverage: 0.7,
  },
  {
    name: 'home dashboard',
    message: 'what can i find on the home dashboard?',
    pathname: '/home',
    shouldTrust: true,
    expectedTopIds: ['page-home'],
    minCoverage: 0.7,
  },
  {
    name: 'quest purpose exact terms',
    message: 'how do quests support mental wealth science?',
    pathname: '/quests',
    shouldTrust: true,
    expectedTopIds: ['page-quests'],
    minCoverage: 0.7,
  },
  {
    name: 'casual greeting skips retrieval',
    message: 'hello',
    pathname: '/home',
    shouldTrust: true,
    expectedNoEntries: true,
    expectedIntent: 'casual',
    minCoverage: 1,
  },
  {
    name: 'casual thanks skips retrieval',
    message: 'thanks!',
    pathname: '/shop',
    shouldTrust: true,
    expectedNoEntries: true,
    expectedIntent: 'casual',
    minCoverage: 1,
  },
  {
    name: 'sunset research mode is unsupported',
    message: 'where is VIP Research mode?',
    pathname: '/home',
    shouldTrust: false,
    forbiddenTopIds: ['page-research'],
    minCoverage: 0,
  },
  {
    name: 'dormant market trading is unsupported',
    message: 'can Blue submit a Kalshi treasury trade?',
    pathname: '/home',
    shouldTrust: false,
    forbiddenTopIds: ['page-markets', 'community-treasury'],
    minCoverage: 0,
  },
  {
    name: 'dormant governance is unsupported',
    message: 'where do I submit a governance proposal for treasury voting?',
    pathname: '/community',
    shouldTrust: false,
    forbiddenTopIds: ['community-treasury', 'academic-funding'],
    minCoverage: 0,
  },
  {
    name: 'excluded evidence cannot raise trust',
    message: 'explain the evidence behind journaling gamification peer support and self determination',
    pathname: '/shadow-work',
    shouldTrust: false,
    expectedTopIds: ['business-evidence-base'],
    maxContextChars: 700,
    minCoverage: 0.3,
  },
  {
    name: 'unsupported company officer claim',
    message: 'tell me the exact CFO of MWA',
    pathname: '/home',
    shouldTrust: false,
    minCoverage: 0,
  },
];

async function main() {
  const corpusIssues = validateCorpusHygiene();
  if (corpusIssues.length) {
    for (const issue of corpusIssues) {
      console.error(JSON.stringify({
        ok: false,
        name: 'corpus hygiene',
        issue,
      }));
    }
    throw new Error(`Blue RAG corpus hygiene failed: ${corpusIssues.length} issue(s)`);
  }

  const dbEnabled = isDbConfigured() && process.env.BLUE_RAG_EVAL_FORCE_LOCAL !== '1';
  let runId: string | null = null;

  if (dbEnabled) {
    await ensureBlueRagSchema();
    await ensureBlueRagReady();
    await upsertEvalCases();
    const runRows = await sqlQuery<Array<{ id: string }>>(
      `INSERT INTO blue_rag_eval_runs (suite, retrieval_mode, metadata)
       VALUES (:suite, :retrievalMode, :metadata::jsonb)
       RETURNING id`,
      {
        suite: 'default',
        retrievalMode: 'database',
        metadata: JSON.stringify({ fixtureCount: fixtures.length }),
      }
    );
    runId = runRows[0]?.id ?? null;
  }

  let failures = 0;

  for (const fixture of fixtures) {
    const result = await runBlueRagGraph({
      message: fixture.message,
      pathname: fixture.pathname,
      limit: 4,
      maxContextChars: fixture.maxContextChars,
      forceLocal: !dbEnabled,
      persistTrace: dbEnabled,
    });

    const topId = result.entries[0]?.sourceId || result.entries[0]?.id || 'none';
    const trustOk = result.quality.trusted === fixture.shouldTrust;
    const topOk = !fixture.expectedTopIds || fixture.expectedTopIds.includes(topId);
    const coverageOk = result.quality.coverage >= (fixture.minCoverage ?? 0);
    const entriesOk = !fixture.expectedNoEntries || result.entries.length === 0;
    const intentOk = !fixture.expectedIntent || result.query.intent === fixture.expectedIntent;
    const forbiddenTopOk = !(fixture.forbiddenTopIds ?? []).includes(topId);
    const budgetOk = !fixture.maxContextChars || result.contextText.length <= fixture.maxContextChars;
    const ok = trustOk
      && topOk
      && coverageOk
      && entriesOk
      && intentOk
      && forbiddenTopOk
      && budgetOk;

    if (!ok) failures += 1;

    console.log(JSON.stringify({
      ok,
      name: fixture.name,
      trusted: result.quality.trusted,
      expectedTrusted: fixture.shouldTrust,
      label: result.quality.label,
      coverage: result.quality.coverage,
      retrievalMode: result.retrievalMode,
      topId,
      expectedTopIds: fixture.expectedTopIds ?? [],
      entryCount: result.entries.length,
      intent: result.query.intent,
      contextChars: result.contextText.length,
      reasons: result.quality.reasons,
    }));

    if (dbEnabled && runId) {
      await sqlQuery(
        `INSERT INTO blue_rag_eval_results (
           run_id,
           case_id,
           passed,
           top_source_id,
           quality,
           selected_chunk_ids,
           reasons
         )
         VALUES (
           :runId,
           :caseId,
           :passed,
           :topSourceId,
           :quality::jsonb,
           :selectedChunkIds::text[],
           :reasons::text[]
         )`,
        {
          runId,
          caseId: slug(fixture.name),
          passed: ok,
          topSourceId: topId === 'none' ? null : topId,
          quality: JSON.stringify(result.quality),
          selectedChunkIds: result.entries.map((entry) => entry.chunkId || entry.id).filter(Boolean),
          reasons: result.quality.reasons,
        }
      );
    }
  }

  if (dbEnabled && runId) {
    await sqlQuery(
      `UPDATE blue_rag_eval_runs
       SET passed = :passed, failed = :failed
       WHERE id = :runId`,
      {
        runId,
        passed: fixtures.length - failures,
        failed: failures,
      }
    );
  }

  if (failures > 0) {
    console.error(`Blue RAG eval failed: ${failures}/${fixtures.length}`);
    process.exit(1);
  }

  console.log(`Blue RAG eval passed: ${fixtures.length}/${fixtures.length}`);
  process.exit(0);
}

async function upsertEvalCases() {
  for (const fixture of fixtures) {
    await sqlQuery(
      `INSERT INTO blue_rag_eval_cases (
         id,
         suite,
         query,
         pathname,
         expected_source_ids,
         expected_chunk_ids,
         should_trust,
         min_coverage,
         metadata,
         enabled
       )
       VALUES (
         :id,
         'default',
         :query,
         :pathname,
         :expectedSourceIds::text[],
         ARRAY[]::text[],
         :shouldTrust,
         :minCoverage,
         :metadata::jsonb,
         TRUE
       )
       ON CONFLICT (id)
       DO UPDATE SET
         query = EXCLUDED.query,
         pathname = EXCLUDED.pathname,
         expected_source_ids = EXCLUDED.expected_source_ids,
         should_trust = EXCLUDED.should_trust,
         min_coverage = EXCLUDED.min_coverage,
         metadata = EXCLUDED.metadata,
         enabled = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      {
        id: slug(fixture.name),
        query: fixture.message,
        pathname: fixture.pathname ?? null,
        expectedSourceIds: fixture.expectedTopIds ?? [],
        shouldTrust: fixture.shouldTrust,
        minCoverage: fixture.minCoverage ?? 0,
        metadata: JSON.stringify({ name: fixture.name }),
      }
    );
  }
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function validateCorpusHygiene(): string[] {
  const forbiddenIds = new Set([
    'page-markets',
    'page-research',
    'community-treasury',
    'academic-funding',
    'academic-earning',
  ]);
  const forbiddenText = [
    /\bgem credits?\b/i,
    /\/markets\b/i,
    /\bkalshi\b/i,
    /\bchainlink\b/i,
    /\bcre workflow\b/i,
    /\bresearch mode\b/i,
    /\btreasury governance\b/i,
    /\bazura\b/i,
    /\bbrain interface\b/i,
    /\binside the headset\b/i,
    /\bgen-z boss\b/i,
    /\bdiscord agent\b/i,
  ];
  const issues: string[] = [];

  for (const entry of BLUE_KNOWLEDGE) {
    if (forbiddenIds.has(entry.id)) {
      issues.push(`sunset source remains: ${entry.id}`);
    }
    const searchable = [
      entry.title,
      entry.routes.join(' '),
      entry.keywords.join(' '),
      entry.body,
    ].join('\n');
    for (const pattern of forbiddenText) {
      if (pattern.test(searchable)) {
        issues.push(`${entry.id} contains forbidden text matching ${pattern.source}`);
      }
    }
  }
  return issues;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
