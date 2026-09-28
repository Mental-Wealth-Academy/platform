import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { isDbConfigured } from '@/lib/db';
import { seedDummyHistoryIfSparse } from '@/lib/chat-simulator';

async function main() {
  if (!isDbConfigured()) {
    console.error('Database is not configured.');
    process.exit(1);
  }

  console.log('[Seed Chat Dummies] Seeding lively chat messages and completions...');
  const count = await seedDummyHistoryIfSparse(20, true);
  console.log(`[Seed Chat Dummies] Successfully seeded ${count} dummy messages and completions.`);
}

main().catch((err) => {
  console.error('[Seed Chat Dummies] Failed:', err);
  process.exit(1);
});
