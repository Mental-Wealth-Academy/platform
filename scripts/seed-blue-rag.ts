import dotenv from 'dotenv';
import { isDbConfigured } from '../lib/db';
import { hasProductionEmbeddingProvider } from '../lib/blue-rag-embeddings';
import { seedBlueRagKnowledgeBase } from '../lib/blue-rag-index';

dotenv.config({ path: '.env.local' });

async function main() {
  if (
    process.argv.includes('--deploy')
    && process.env.VERCEL_ENV !== 'production'
  ) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason: 'non-production-deployment',
    }));
    process.exit(0);
  }

  if (!isDbConfigured()) {
    throw new Error('DATABASE_URL or POSTGRES_* env vars are required to seed Blue RAG.');
  }

  if (!hasProductionEmbeddingProvider() && process.env.BLUE_RAG_ALLOW_HASH_EMBEDDINGS !== '1') {
    throw new Error('Set RAG_EMBEDDING_API_KEY or OPENAI_API_KEY before seeding. Use BLUE_RAG_ALLOW_HASH_EMBEDDINGS=1 only for local tests.');
  }

  const result = await seedBlueRagKnowledgeBase();
  console.log(JSON.stringify({
    ok: true,
    ...result,
  }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
