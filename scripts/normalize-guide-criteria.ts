/**
 * Script to normalize guide evidence_criteria in Supabase Postgres.
 *
 * Removes "The learner can" and third-person phrasing, replacing them with
 * simplified, direct wellness instructions across all guides in the database.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/normalize-guide-criteria.ts [--dry-run]
 */

import { isDbConfigured, sqlQuery } from '../lib/db';
import { simplifyWellnessCriterion } from '../lib/guide-criteria';

const DRY_RUN = process.argv.includes('--dry-run');

interface GuideRow {
  id: string;
  slug: string;
  evidence_criteria: unknown;
}

function parseCriteria(raw: unknown): string[] {
  if (!raw) return [];
  let val = raw;
  if (typeof raw === 'string') {
    try {
      val = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(val)) return [];
  return val.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
}

async function run() {
  if (!isDbConfigured()) {
    console.error('Database is not configured. Check .env.local.');
    process.exit(1);
  }

  console.log(`Starting guide criteria normalization (${DRY_RUN ? 'DRY RUN' : 'LIVE'})...`);

  const guides = await sqlQuery<GuideRow[]>(
    'SELECT id, slug, evidence_criteria FROM guides WHERE evidence_criteria IS NOT NULL'
  );

  console.log(`Found ${guides.length} guides with evidence_criteria.`);

  let updatedCount = 0;

  for (const g of guides) {
    const original = parseCriteria(g.evidence_criteria);
    if (!original.length) continue;

    const simplified = original.map(simplifyWellnessCriterion);

    // Check if any criterion actually changed
    const hasDiff = original.some((item, i) => item !== simplified[i]);

    if (hasDiff) {
      updatedCount++;
      if (updatedCount <= 5 || g.slug === 'attention-basics') {
        console.log(`\nGuide: ${g.slug}`);
        console.log('  Original  :', original);
        console.log('  Simplified:', simplified);
      }

      if (!DRY_RUN) {
        await sqlQuery(
          'UPDATE guides SET evidence_criteria = $1::jsonb, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(simplified), g.id]
        );
      }
    }
  }

  console.log(`\nNormalization complete! ${updatedCount} guides ${DRY_RUN ? 'would be' : 'were'} updated.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error normalizing guide criteria:', err);
  process.exit(1);
});
