import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaBlueRagSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaBlueRagSchemaLock: Promise<void> | undefined;
}

export async function ensureBlueRagSchema() {
  if (globalThis.__mwaBlueRagSchemaEnsured) return;

  if (globalThis.__mwaBlueRagSchemaLock) {
    await globalThis.__mwaBlueRagSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await _ensureBlueRagSchemaImpl();
      globalThis.__mwaBlueRagSchemaEnsured = true;
    } finally {
      globalThis.__mwaBlueRagSchemaLock = undefined;
    }
  })();

  globalThis.__mwaBlueRagSchemaLock = lockPromise;
  await lockPromise;
}

async function _ensureBlueRagSchemaImpl() {
  await sqlQuery(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await sqlQuery(`CREATE EXTENSION IF NOT EXISTS vector`);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_sources (
      id TEXT PRIMARY KEY,
      source_type VARCHAR(48) NOT NULL,
      title TEXT NOT NULL,
      route TEXT NULL,
      url TEXT NULL,
      content_hash TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_chunks (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      source_id TEXT NOT NULL REFERENCES blue_rag_sources(id) ON DELETE CASCADE,
      source_type VARCHAR(48) NOT NULL,
      title TEXT NOT NULL,
      route TEXT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      token_count INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      embedding vector(1536) NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding_dim INTEGER NOT NULL DEFAULT 1536,
      search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
      ) STORED,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (source_id, chunk_index)
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_retrieval_traces (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id CHAR(36) NULL,
      request_id TEXT NULL,
      query_original TEXT NOT NULL,
      query_rewritten TEXT NOT NULL,
      route TEXT NULL,
      intent VARCHAR(48) NOT NULL,
      retrieval_mode VARCHAR(32) NOT NULL,
      quality JSONB NOT NULL DEFAULT '{}'::jsonb,
      selected_chunk_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_index_manifests (
      id TEXT PRIMARY KEY,
      corpus_hash TEXT NOT NULL,
      embedding_provider VARCHAR(48) NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding_dim INTEGER NOT NULL,
      chunk_version TEXT NOT NULL,
      source_count INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      seeded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_eval_cases (
      id TEXT PRIMARY KEY,
      suite TEXT NOT NULL DEFAULT 'default',
      query TEXT NOT NULL,
      pathname TEXT NULL,
      expected_source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      expected_chunk_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      should_trust BOOLEAN NOT NULL DEFAULT TRUE,
      min_coverage NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_eval_runs (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      suite TEXT NOT NULL DEFAULT 'default',
      retrieval_mode VARCHAR(32) NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS blue_rag_eval_results (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      run_id CHAR(36) NOT NULL REFERENCES blue_rag_eval_runs(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL REFERENCES blue_rag_eval_cases(id) ON DELETE CASCADE,
      passed BOOLEAN NOT NULL,
      top_source_id TEXT NULL,
      quality JSONB NOT NULL DEFAULT '{}'::jsonb,
      selected_chunk_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_sources_type ON blue_rag_sources(source_type)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_sources_enabled ON blue_rag_sources(enabled)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_chunks_source ON blue_rag_chunks(source_id)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_chunks_route ON blue_rag_chunks(route)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_chunks_search ON blue_rag_chunks USING GIN(search_vector)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_traces_created ON blue_rag_retrieval_traces(created_at DESC)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_traces_user_created ON blue_rag_retrieval_traces(user_id, created_at DESC)`);
  await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_blue_rag_eval_cases_suite ON blue_rag_eval_cases(suite, enabled)`);

  // The corpus is deliberately small. Exact cosine ordering is more accurate
  // and avoids an IVFFlat index whose old 100-list configuration exceeded the
  // useful partition count by a wide margin.
  await sqlQuery(`DROP INDEX IF EXISTS idx_blue_rag_chunks_embedding`);

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_blue_rag_sources_updated_at ON blue_rag_sources`);
    await sqlQuery(`
      CREATE TRIGGER update_blue_rag_sources_updated_at BEFORE UPDATE ON blue_rag_sources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating blue_rag_sources updated_at trigger:', err?.message);
  }

  try {
    await sqlQuery(`DROP TRIGGER IF EXISTS update_blue_rag_chunks_updated_at ON blue_rag_chunks`);
    await sqlQuery(`
      CREATE TRIGGER update_blue_rag_chunks_updated_at BEFORE UPDATE ON blue_rag_chunks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  } catch (err: any) {
    console.warn('Error creating blue_rag_chunks updated_at trigger:', err?.message);
  }

  await sqlQuery(`ALTER TABLE blue_rag_sources ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_chunks ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_retrieval_traces ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_index_manifests ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_eval_cases ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_eval_runs ENABLE ROW LEVEL SECURITY`);
  await sqlQuery(`ALTER TABLE blue_rag_eval_results ENABLE ROW LEVEL SECURITY`);
}
