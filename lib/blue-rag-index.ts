import crypto from 'crypto';
import {
  BLUE_KNOWLEDGE,
  BLUE_KNOWLEDGE_VERSION,
  type BlueKnowledgeEntry,
} from './blue-knowledge';
import {
  getPool,
  isDbConfigured,
  sqlQuery,
  sqlQueryWithClient,
} from './db';
import { ensureBlueRagSchema } from './ensureBlueRagSchema';
import {
  embedBlueRagTexts,
  getBlueRagEmbeddingConfig,
  toPgVectorLiteral,
} from './blue-rag-embeddings';

export const BLUE_RAG_MANIFEST_ID = 'blue-rag-v2';
export const BLUE_RAG_CHUNK_VERSION = 'sentence-900-v2';

const PRODUCT_ADAPTER_ID = 'product-config';
const PRODUCT_ADAPTER_VERSION = `product-${BLUE_KNOWLEDGE_VERSION}`;
const GUIDE_ADAPTER_ID = 'published-guides';
const GUIDE_ADAPTER_VERSION = 'published-guides-v1';
const SEED_LOCK_KEY = 'mwa:blue-rag-seed:v2';
const READINESS_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_GUIDE_TEXT_LENGTH = 24_000;

export interface BlueRagSeedResult {
  sources: number;
  chunks: number;
  corpusHash: string;
  chunkVersion: string;
  embeddingModel: string;
  embeddingProvider: string;
  embeddingDimension: number;
  embeddedChunks: number;
  reusedChunks: number;
}

interface VersionedSource {
  id: string;
  sourceType: 'product_config' | 'published_guide';
  title: string;
  route: string | null;
  body: string;
  revisionHash: string;
  metadata: Record<string, unknown>;
}

interface SourceChunk {
  sourceId: string;
  sourceType: VersionedSource['sourceType'];
  title: string;
  route: string | null;
  chunkIndex: number;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
}

interface CorpusSnapshot {
  sources: VersionedSource[];
  chunks: SourceChunk[];
  corpusHash: string;
}

interface PublishedGuideRow {
  id: string;
  slug: string;
  topic_title: string;
  summary: string | null;
  body: unknown;
  status: string;
  updated_at: string;
  aliases: string[] | null;
  subjects: string[] | null;
}

interface ManifestRow {
  corpus_hash: string;
  embedding_provider: string;
  embedding_model: string;
  embedding_dim: number | string;
  chunk_version: string;
  source_count: number | string;
  chunk_count: number | string;
  metadata: unknown;
  actual_source_count: number | string;
  actual_chunk_count: number | string;
}

interface ExistingChunkRow {
  source_id: string;
  chunk_index: number | string;
  content_hash: string;
  embedding_model: string;
  embedding_dim: number | string;
  chunk_version: string | null;
}

type BlueRagReadyResult =
  | {
      ready: true;
      seeded: boolean;
      sourceCount: number;
      chunkCount: number;
      corpusHash: string;
    }
  | {
      ready: false;
      reason:
        | 'db_unconfigured'
        | 'embedding_provider_unconfigured'
        | 'manifest_missing'
        | 'manifest_mismatch';
    };

let readinessCache:
  | {
      configKey: string;
      expiresAt: number;
      result: BlueRagReadyResult;
    }
  | undefined;
let corpusSnapshotCache:
  | {
      expiresAt: number;
      snapshot: CorpusSnapshot;
    }
  | undefined;

/**
 * Readiness verifies the deploy manifest, adapter versions, embedding contract,
 * and stored row counts. Published-guide status and revision are rechecked by
 * retrieval queries so a normal publish/edit/unpublish does not disable the
 * product index between deployments.
 */
export async function ensureBlueRagReady(): Promise<BlueRagReadyResult> {
  if (!isDbConfigured()) return { ready: false, reason: 'db_unconfigured' };

  const embeddingConfig = getBlueRagEmbeddingConfig();
  if (!embeddingConfig) {
    return { ready: false, reason: 'embedding_provider_unconfigured' };
  }

  await ensureBlueRagSchema();
  const configKey = [
    embeddingConfig.provider,
    embeddingConfig.model,
    embeddingConfig.dimension,
    BLUE_RAG_CHUNK_VERSION,
    PRODUCT_ADAPTER_VERSION,
    GUIDE_ADAPTER_VERSION,
  ].join(':');
  if (
    readinessCache
    && readinessCache.configKey === configKey
    && readinessCache.expiresAt > Date.now()
  ) {
    return readinessCache.result;
  }

  const rows = await sqlQuery<ManifestRow[]>(
    `SELECT
       m.corpus_hash,
       m.embedding_provider,
       m.embedding_model,
       m.embedding_dim,
       m.chunk_version,
       m.source_count,
       m.chunk_count,
       m.metadata,
       (SELECT COUNT(*)
         FROM blue_rag_sources
         WHERE enabled = TRUE
           AND source_type IN ('blue_knowledge', 'product_config', 'published_guide')) AS actual_source_count,
       (SELECT COUNT(*)
          FROM blue_rag_chunks c
         JOIN blue_rag_sources s ON s.id = c.source_id
         WHERE s.enabled = TRUE
           AND s.source_type IN ('blue_knowledge', 'product_config', 'published_guide')) AS actual_chunk_count
     FROM blue_rag_index_manifests m
     WHERE m.id = :id
     LIMIT 1`,
    { id: BLUE_RAG_MANIFEST_ID },
  );

  const manifest = rows[0];
  const adapterVersions = new Map(
    (
      manifest?.metadata
      && typeof manifest.metadata === 'object'
      && Array.isArray((manifest.metadata as { adapters?: unknown }).adapters)
        ? (manifest.metadata as {
            adapters: Array<{ id?: unknown; version?: unknown }>;
          }).adapters
        : []
    )
      .filter((adapter) => (
        typeof adapter?.id === 'string'
        && typeof adapter?.version === 'string'
      ))
      .map((adapter) => [String(adapter.id), String(adapter.version)]),
  );
  const ready = Boolean(
    manifest
    && manifest.corpus_hash
    && manifest.embedding_provider === embeddingConfig.provider
    && manifest.embedding_model === embeddingConfig.model
    && Number(manifest.embedding_dim) === embeddingConfig.dimension
    && manifest.chunk_version === BLUE_RAG_CHUNK_VERSION
    && adapterVersions.get(PRODUCT_ADAPTER_ID) === PRODUCT_ADAPTER_VERSION
    && adapterVersions.get(GUIDE_ADAPTER_ID) === GUIDE_ADAPTER_VERSION
    && Number(manifest.actual_source_count) === Number(manifest.source_count)
    && Number(manifest.actual_chunk_count) === Number(manifest.chunk_count)
  );

  if (ready) {
    const result: BlueRagReadyResult = {
      ready: true,
      seeded: false,
      sourceCount: Number(manifest.source_count),
      chunkCount: Number(manifest.chunk_count),
      corpusHash: manifest.corpus_hash,
    };
    readinessCache = {
      configKey,
      expiresAt: Date.now() + READINESS_CACHE_TTL_MS,
      result,
    };
    return result;
  }

  if (process.env.BLUE_RAG_AUTO_SEED === '1') {
    const seeded = await seedBlueRagKnowledgeBase();
    return {
      ready: true,
      seeded: true,
      sourceCount: seeded.sources,
      chunkCount: seeded.chunks,
      corpusHash: seeded.corpusHash,
    };
  }

  const result: BlueRagReadyResult = {
    ready: false,
    reason: manifest ? 'manifest_mismatch' : 'manifest_missing',
  };
  readinessCache = {
    configKey,
    expiresAt: Date.now() + READINESS_CACHE_TTL_MS,
    result,
  };
  return result;
}

/**
 * Publish one complete corpus under a database advisory lock. Embeddings are
 * produced before the write transaction, then sources, chunks, reconciliation,
 * and the manifest commit atomically.
 */
export async function seedBlueRagKnowledgeBase(): Promise<BlueRagSeedResult> {
  if (!isDbConfigured()) {
    throw new Error('Database is not configured; cannot seed Blue RAG index');
  }

  const embeddingConfig = getBlueRagEmbeddingConfig();
  if (!embeddingConfig) {
    throw new Error('No RAG embedding provider is configured');
  }

  await ensureBlueRagSchema();
  const lockClient = await getPool().connect();
  let lockAcquired = false;

  try {
    const lockRows = await lockClient.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired`,
      [SEED_LOCK_KEY],
    );
    lockAcquired = lockRows.rows[0]?.acquired === true;
    if (!lockAcquired) {
      throw new Error('A Blue RAG seed is already in progress');
    }

    const snapshot = await getCorpusSnapshot({ force: true });
    const existingChunks = await sqlQueryWithClient<ExistingChunkRow[]>(
      lockClient,
      `SELECT
         c.source_id,
         c.chunk_index,
         c.content_hash,
         c.embedding_model,
         c.embedding_dim,
         c.metadata->>'chunkVersion' AS chunk_version
       FROM blue_rag_chunks c
       WHERE c.source_id = ANY(:sourceIds::text[])`,
      { sourceIds: snapshot.sources.map((source) => source.id) },
    );
    const existingManifest = await sqlQueryWithClient<Array<{
      embedding_provider: string;
    }>>(
      lockClient,
      `SELECT embedding_provider
       FROM blue_rag_index_manifests
       WHERE id = :id
       LIMIT 1`,
      { id: BLUE_RAG_MANIFEST_ID },
    );
    const providerCompatible = (
      existingManifest[0]?.embedding_provider === embeddingConfig.provider
    );
    const existingByKey = new Map(existingChunks.map((chunk) => [
      chunkKey(chunk.source_id, Number(chunk.chunk_index)),
      chunk,
    ]));
    const chunksToEmbed = snapshot.chunks.filter((chunk) => {
      const existing = existingByKey.get(chunkKey(chunk.sourceId, chunk.chunkIndex));
      return !existing
        || !providerCompatible
        || existing.content_hash !== chunk.contentHash
        || existing.embedding_model !== embeddingConfig.model
        || Number(existing.embedding_dim) !== embeddingConfig.dimension
        || existing.chunk_version !== BLUE_RAG_CHUNK_VERSION;
    });
    const chunkKeysToEmbed = new Set(chunksToEmbed.map((chunk) => (
      chunkKey(chunk.sourceId, chunk.chunkIndex)
    )));
    const reusableChunks = snapshot.chunks.filter((chunk) => (
      !chunkKeysToEmbed.has(chunkKey(chunk.sourceId, chunk.chunkIndex))
    ));
    const embeddingResult = chunksToEmbed.length
      ? await embedBlueRagTexts(chunksToEmbed.map((chunk) => (
          [chunk.title, chunk.content].join('\n\n')
        )))
      : {
          embeddings: [] as number[][],
          model: embeddingConfig.model,
          dimension: embeddingConfig.dimension,
          provider: embeddingConfig.provider,
        };
    const {
      embeddings,
      model,
      dimension,
      provider,
    } = embeddingResult;

    if (
      provider !== embeddingConfig.provider
      || model !== embeddingConfig.model
      || dimension !== embeddingConfig.dimension
    ) {
      throw new Error('Embedding provider configuration changed during Blue RAG seed');
    }

    const sourceRows = snapshot.sources.map((source) => ({
      id: source.id,
      source_type: source.sourceType,
      title: source.title,
      route: source.route,
      url: source.route,
      content_hash: source.revisionHash,
      metadata: source.metadata,
    }));
    const embeddedChunkRows = chunksToEmbed.map((chunk, index) => ({
      source_id: chunk.sourceId,
      source_type: chunk.sourceType,
      title: chunk.title,
      route: chunk.route,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      content_hash: chunk.contentHash,
      token_count: approximateTokenCount(chunk.content),
      metadata: chunk.metadata,
      embedding_text: toPgVectorLiteral(embeddings[index]),
      embedding_model: model,
      embedding_dim: dimension,
    }));
    const reusableChunkRows = reusableChunks.map((chunk) => ({
      source_id: chunk.sourceId,
      source_type: chunk.sourceType,
      title: chunk.title,
      route: chunk.route,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      content_hash: chunk.contentHash,
      token_count: approximateTokenCount(chunk.content),
      metadata: chunk.metadata,
    }));
    const sourceIds = snapshot.sources.map((source) => source.id);
    const desiredChunkKeys = snapshot.chunks.map((chunk) => (
      chunkKey(chunk.sourceId, chunk.chunkIndex)
    ));

    await lockClient.query('BEGIN');
    try {
      await sqlQueryWithClient(
        lockClient,
        `INSERT INTO blue_rag_sources (
           id, source_type, title, route, url, content_hash, metadata, enabled
         )
         SELECT
           row.id,
           row.source_type,
           row.title,
           row.route,
           row.url,
           row.content_hash,
           row.metadata,
           TRUE
         FROM jsonb_to_recordset(:rows::jsonb) AS row(
           id TEXT,
           source_type VARCHAR(48),
           title TEXT,
           route TEXT,
           url TEXT,
           content_hash TEXT,
           metadata JSONB
         )
         ON CONFLICT (id)
         DO UPDATE SET
           source_type = EXCLUDED.source_type,
           title = EXCLUDED.title,
           route = EXCLUDED.route,
           url = EXCLUDED.url,
           content_hash = EXCLUDED.content_hash,
           metadata = EXCLUDED.metadata,
           enabled = TRUE,
           updated_at = CURRENT_TIMESTAMP`,
        { rows: JSON.stringify(sourceRows) },
      );

      await sqlQueryWithClient(
        lockClient,
        `DELETE FROM blue_rag_sources
         WHERE source_type = ANY(:managedTypes::text[])
           AND NOT (id = ANY(:sourceIds::text[]))`,
        {
          managedTypes: ['blue_knowledge', 'product_config', 'published_guide'],
          sourceIds,
        },
      );

      await sqlQueryWithClient(
        lockClient,
        `DELETE FROM blue_rag_chunks
         WHERE source_id = ANY(:sourceIds::text[])
           AND NOT (
             (source_id || ':' || chunk_index::text) = ANY(:desiredChunkKeys::text[])
           )`,
        { sourceIds, desiredChunkKeys },
      );

      if (reusableChunkRows.length) {
        await sqlQueryWithClient(
          lockClient,
          `UPDATE blue_rag_chunks AS chunk
           SET
             source_type = row.source_type,
             title = row.title,
             route = row.route,
             content = row.content,
             content_hash = row.content_hash,
             token_count = row.token_count,
             metadata = row.metadata,
             updated_at = CURRENT_TIMESTAMP
           FROM jsonb_to_recordset(:rows::jsonb) AS row(
             source_id TEXT,
             source_type VARCHAR(48),
             title TEXT,
             route TEXT,
             chunk_index INTEGER,
             content TEXT,
             content_hash TEXT,
             token_count INTEGER,
             metadata JSONB
           )
           WHERE chunk.source_id = row.source_id
             AND chunk.chunk_index = row.chunk_index`,
          { rows: JSON.stringify(reusableChunkRows) },
        );
      }

      if (embeddedChunkRows.length) {
        await sqlQueryWithClient(
          lockClient,
          `INSERT INTO blue_rag_chunks (
             source_id,
             source_type,
             title,
             route,
             chunk_index,
             content,
             content_hash,
             token_count,
             metadata,
             embedding,
             embedding_model,
             embedding_dim
           )
           SELECT
             row.source_id,
             row.source_type,
             row.title,
             row.route,
             row.chunk_index,
             row.content,
             row.content_hash,
             row.token_count,
             row.metadata,
             row.embedding_text::vector,
             row.embedding_model,
             row.embedding_dim
           FROM jsonb_to_recordset(:rows::jsonb) AS row(
             source_id TEXT,
             source_type VARCHAR(48),
             title TEXT,
             route TEXT,
             chunk_index INTEGER,
             content TEXT,
             content_hash TEXT,
             token_count INTEGER,
             metadata JSONB,
             embedding_text TEXT,
             embedding_model TEXT,
             embedding_dim INTEGER
           )
           ON CONFLICT (source_id, chunk_index)
           DO UPDATE SET
             source_type = EXCLUDED.source_type,
             title = EXCLUDED.title,
             route = EXCLUDED.route,
             content = EXCLUDED.content,
             content_hash = EXCLUDED.content_hash,
             token_count = EXCLUDED.token_count,
             metadata = EXCLUDED.metadata,
             embedding = EXCLUDED.embedding,
             embedding_model = EXCLUDED.embedding_model,
             embedding_dim = EXCLUDED.embedding_dim,
             updated_at = CURRENT_TIMESTAMP`,
          { rows: JSON.stringify(embeddedChunkRows) },
        );
      }

      await sqlQueryWithClient(
        lockClient,
        `INSERT INTO blue_rag_index_manifests (
           id,
           corpus_hash,
           embedding_provider,
           embedding_model,
           embedding_dim,
           chunk_version,
           source_count,
           chunk_count,
           metadata,
           seeded_at
         )
         VALUES (
           :id,
           :corpusHash,
           :provider,
           :model,
           :dimension,
           :chunkVersion,
           :sourceCount,
           :chunkCount,
           :metadata::jsonb,
           CURRENT_TIMESTAMP
         )
         ON CONFLICT (id)
         DO UPDATE SET
           corpus_hash = EXCLUDED.corpus_hash,
           embedding_provider = EXCLUDED.embedding_provider,
           embedding_model = EXCLUDED.embedding_model,
           embedding_dim = EXCLUDED.embedding_dim,
           chunk_version = EXCLUDED.chunk_version,
           source_count = EXCLUDED.source_count,
           chunk_count = EXCLUDED.chunk_count,
           metadata = EXCLUDED.metadata,
           seeded_at = CURRENT_TIMESTAMP`,
        {
          id: BLUE_RAG_MANIFEST_ID,
          corpusHash: snapshot.corpusHash,
          provider,
          model,
          dimension,
          chunkVersion: BLUE_RAG_CHUNK_VERSION,
          sourceCount: snapshot.sources.length,
          chunkCount: snapshot.chunks.length,
          metadata: JSON.stringify({
            adapters: [
              { id: PRODUCT_ADAPTER_ID, version: PRODUCT_ADAPTER_VERSION },
              { id: GUIDE_ADAPTER_ID, version: GUIDE_ADAPTER_VERSION },
            ],
          }),
        },
      );

      await lockClient.query('COMMIT');
    } catch (error) {
      await lockClient.query('ROLLBACK');
      throw error;
    }

    readinessCache = undefined;
    corpusSnapshotCache = {
      expiresAt: Date.now() + READINESS_CACHE_TTL_MS,
      snapshot,
    };
    return {
      sources: snapshot.sources.length,
      chunks: snapshot.chunks.length,
      corpusHash: snapshot.corpusHash,
      chunkVersion: BLUE_RAG_CHUNK_VERSION,
      embeddingModel: model,
      embeddingProvider: provider,
      embeddingDimension: dimension,
      embeddedChunks: chunksToEmbed.length,
      reusedChunks: reusableChunks.length,
    };
  } finally {
    if (lockAcquired) {
      try {
        await lockClient.query(
          `SELECT pg_advisory_unlock(hashtextextended($1, 0))`,
          [SEED_LOCK_KEY],
        );
      } catch (error) {
        console.warn(
          'Blue RAG seed lock release failed:',
          error instanceof Error ? error.message : 'unknown lock error',
        );
      }
    }
    lockClient.release();
  }
}

async function getCorpusSnapshot(options?: { force?: boolean }): Promise<CorpusSnapshot> {
  if (
    !options?.force
    && corpusSnapshotCache
    && corpusSnapshotCache.expiresAt > Date.now()
  ) {
    return corpusSnapshotCache.snapshot;
  }

  const snapshot = await buildCorpusSnapshot();
  corpusSnapshotCache = {
    expiresAt: Date.now() + READINESS_CACHE_TTL_MS,
    snapshot,
  };
  return snapshot;
}

async function buildCorpusSnapshot(): Promise<CorpusSnapshot> {
  const sources = [
    ...adaptProductConfiguration(BLUE_KNOWLEDGE),
    ...await loadPublishedGuideSources(),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const chunks = sources.flatMap((source) => {
    const parts = chunkText(source.body, 900);
    return parts.map((content, chunkIndex): SourceChunk => {
      const contentHash = hashText([source.title, content].join('\n\n'));
      return {
        sourceId: source.id,
        sourceType: source.sourceType,
        title: source.title,
        route: source.route,
        chunkIndex,
        content,
        contentHash,
        metadata: {
          ...source.metadata,
          revisionHash: source.revisionHash,
          chunkVersion: BLUE_RAG_CHUNK_VERSION,
        },
      };
    });
  });
  const corpusHash = hashText(sources.map((source) => (
    `${source.id}:${source.revisionHash}`
  )).join('\n'));

  return { sources, chunks, corpusHash };
}

function adaptProductConfiguration(entries: BlueKnowledgeEntry[]): VersionedSource[] {
  return entries.map((entry) => {
    const revisionHash = hashText(JSON.stringify({
      version: PRODUCT_ADAPTER_VERSION,
      id: entry.id,
      title: entry.title,
      routes: entry.routes,
      keywords: entry.keywords,
      body: entry.body,
    }));
    return {
      id: entry.id,
      sourceType: 'product_config',
      title: entry.title,
      route: entry.routes.find((route) => route !== '*') ?? null,
      body: entry.body,
      revisionHash,
      metadata: {
        adapter: PRODUCT_ADAPTER_ID,
        adapterVersion: PRODUCT_ADAPTER_VERSION,
        canonicalId: entry.id,
        revisionHash,
        status: 'published',
        routes: entry.routes,
        keywords: entry.keywords,
      },
    };
  });
}

/**
 * The guide adapter is strictly read-only and status-locked. It never reads
 * drafts, traverses edges, computes levels, or mutates any guide-owned table.
 */
async function loadPublishedGuideSources(): Promise<VersionedSource[]> {
  if (!isDbConfigured()) return [];

  const relations = await sqlQuery<Array<{
    guides: string | null;
    aliases: string | null;
    subjects: string | null;
  }>>(
    `SELECT
       to_regclass('public.guides')::text AS guides,
       to_regclass('public.guide_topic_aliases')::text AS aliases,
       to_regclass('public.guide_subjects')::text AS subjects`,
  );
  if (!relations[0]?.guides) return [];

  const aliasExpression = relations[0]?.aliases
    ? `COALESCE(
         (SELECT array_agg(gta.alias ORDER BY gta.alias)
            FROM guide_topic_aliases gta
           WHERE gta.guide_id = g.id),
         ARRAY[]::text[]
       )`
    : `ARRAY[]::text[]`;
  const subjectExpression = relations[0]?.subjects
    ? `COALESCE(
         (SELECT array_agg(gs.subject ORDER BY gs.subject)
            FROM guide_subjects gs
           WHERE gs.guide_id = g.id),
         ARRAY[]::text[]
       )`
    : `ARRAY[]::text[]`;

  const rows = await sqlQuery<PublishedGuideRow[]>(
    `SELECT
       g.id,
       g.slug,
       g.topic_title,
       g.summary,
       g.body,
       g.status,
       g.updated_at::text AS updated_at,
       ${aliasExpression} AS aliases,
       ${subjectExpression} AS subjects
     FROM guides g
     WHERE g.status = 'published'
     ORDER BY g.id ASC`,
  );

  return rows
    .filter((row) => row.status === 'published')
    .map((row) => {
      const aliases = cleanStringArray(row.aliases);
      const subjects = cleanStringArray(row.subjects);
      const visibleBody = extractGuideText(row.body).slice(0, MAX_GUIDE_TEXT_LENGTH);
      const content = uniqueStrings([
        row.summary?.trim() ?? '',
        visibleBody,
      ]).join('\n\n');
      const revisionHash = hashText(JSON.stringify({
        version: GUIDE_ADAPTER_VERSION,
        id: row.id,
        slug: row.slug,
        topicTitle: row.topic_title,
        summary: row.summary,
        body: row.body,
        aliases,
        subjects,
        updatedAt: row.updated_at,
        status: 'published',
      }));
      return {
        id: `guide:${row.id}`,
        sourceType: 'published_guide' as const,
        title: row.topic_title,
        route: `/home/guides/${row.slug}`,
        body: content || row.topic_title,
        revisionHash,
        metadata: {
          adapter: GUIDE_ADAPTER_ID,
          adapterVersion: GUIDE_ADAPTER_VERSION,
          canonicalId: `guide:${row.id}`,
          guideId: row.id,
          guideSlug: row.slug,
          guideUpdatedAt: row.updated_at,
          revisionHash,
          status: 'published',
          routes: [`/home/guides/${row.slug}`],
          keywords: uniqueStrings([row.topic_title, ...aliases, ...subjects]),
          aliases,
          subjects,
        },
      };
    });
}

function extractGuideText(value: unknown): string {
  const values: string[] = [];
  const ignoredKeys = new Set([
    'id',
    'url',
    'href',
    'src',
    'image',
    'imageurl',
    'image_url',
    'icon',
    'componenttype',
  ]);

  const visit = (current: unknown, key = '') => {
    if (typeof current === 'string') {
      const trimmed = current.replace(/\s+/g, ' ').trim();
      if (trimmed && !ignoredKeys.has(key.toLowerCase())) values.push(trimmed);
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item, key);
      return;
    }
    if (current && typeof current === 'object') {
      for (const [childKey, child] of Object.entries(current)) {
        visit(child, childKey);
      }
    }
  };

  visit(value);
  return uniqueStrings(values).join('\n');
}

function chunkText(text: string, maxLength: number): string[] {
  const trimmed = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (trimmed.length <= maxLength) return [trimmed];

  const sentences = trimmed.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || [trimmed];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) continue;
    const next = current ? `${current} ${cleanSentence}` : cleanSentence;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = cleanSentence;
    } else if (cleanSentence.length > maxLength) {
      for (let offset = 0; offset < cleanSentence.length; offset += maxLength) {
        chunks.push(cleanSentence.slice(offset, offset + maxLength));
      }
      current = '';
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function cleanStringArray(value: string[] | null | undefined): string[] {
  return uniqueStrings((value ?? []).filter((item): item is string => typeof item === 'string'));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function approximateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function chunkKey(sourceId: string, chunkIndex: number): string {
  return `${sourceId}:${chunkIndex}`;
}
