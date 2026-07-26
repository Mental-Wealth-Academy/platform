-- Version Blue's retrieval corpus as one deploy-time artifact.
-- Exact cosine search is intentional while the corpus remains small.

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
);

ALTER TABLE blue_rag_index_manifests ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_blue_rag_chunks_embedding;
