import crypto from 'crypto';

export const BLUE_RAG_EMBEDDING_DIM = 1536;
const QUERY_EMBEDDING_CACHE_MAX = 128;
const QUERY_EMBEDDING_CACHE_TTL_MS = 10 * 60 * 1000;
const EMBEDDING_TIMEOUT_MS = 12_000;

interface CachedQueryEmbedding {
  expiresAt: number;
  value: {
    embedding: number[];
    model: string;
    dimension: number;
    provider: BlueRagEmbeddingConfig['provider'];
  };
}

const queryEmbeddingCache = new Map<string, CachedQueryEmbedding>();

export interface BlueRagEmbeddingConfig {
  baseUrl: string;
  path: string;
  apiKey: string;
  model: string;
  dimension: number;
  provider: 'eliza' | 'openai-compatible' | 'hash-dev';
}

function isElizaHost(config: BlueRagEmbeddingConfig): boolean {
  return config.provider === 'eliza'
    || config.baseUrl.toLowerCase().includes('elizacloud.ai');
}

export function getBlueRagEmbeddingConfig(): BlueRagEmbeddingConfig | null {
  const explicitEmbeddingKey = process.env.RAG_EMBEDDING_API_KEY || process.env.RAB_EMBEDDING_API_KEY || '';
  const elizaKey = process.env.ELIZA_API_KEY || '';
  const openAiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small';

  if (explicitEmbeddingKey) {
    return {
      apiKey: explicitEmbeddingKey,
      model,
      baseUrl: (process.env.RAG_EMBEDDING_BASE_URL || process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '').replace(/\/api\/v1$/, ''),
      path: process.env.RAG_EMBEDDING_BASE_URL ? '/embeddings' : '/api/v1/embeddings',
      dimension: BLUE_RAG_EMBEDDING_DIM,
      provider: 'openai-compatible',
    };
  }

  if (elizaKey) {
    return {
      apiKey: elizaKey,
      model,
      baseUrl: (process.env.ELIZA_API_BASE_URL || 'https://www.elizacloud.ai').replace(/\/+$/, '').replace(/\/api\/v1$/, ''),
      path: '/api/v1/embeddings',
      dimension: BLUE_RAG_EMBEDDING_DIM,
      provider: 'eliza',
    };
  }

  if (openAiKey) {
    return {
      apiKey: openAiKey,
      model,
      baseUrl: (process.env.RAG_EMBEDDING_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '').replace(/\/api\/v1$/, ''),
      path: '/embeddings',
      dimension: BLUE_RAG_EMBEDDING_DIM,
      provider: 'openai-compatible',
    };
  }

  if (process.env.BLUE_RAG_ALLOW_HASH_EMBEDDINGS === '1' || process.env.NODE_ENV !== 'production') {
    return {
      apiKey: '',
      model: 'hash-dev-1536',
      baseUrl: '',
      path: '',
      dimension: BLUE_RAG_EMBEDDING_DIM,
      provider: 'hash-dev',
    };
  }

  return null;
}

export function hasProductionEmbeddingProvider() {
  const config = getBlueRagEmbeddingConfig();
  return Boolean(config && config.provider !== 'hash-dev');
}

export async function embedBlueRagTexts(texts: string[]): Promise<{
  embeddings: number[][];
  model: string;
  dimension: number;
  provider: BlueRagEmbeddingConfig['provider'];
}> {
  const config = getBlueRagEmbeddingConfig();
  if (!config) {
    throw new Error('No RAG embedding provider configured. Set ELIZA_API_KEY, RAG_EMBEDDING_API_KEY, or OPENAI_API_KEY.');
  }

  if (config.provider === 'hash-dev') {
    return {
      embeddings: texts.map((text) => hashEmbedding(text, config.dimension)),
      model: config.model,
      dimension: config.dimension,
      provider: config.provider,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${config.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        // Eliza Cloud redirects www to its apex host, and fetch drops
        // Authorization across a host change, so the request would arrive
        // unauthenticated. X-API-Key survives the redirect, which is why the
        // chat client has always sent both.
        ...(isElizaHost(config)
          ? { 'X-API-Key': config.apiKey }
          : {}),
      },
      body: JSON.stringify({
        model: config.model,
        input: texts,
        dimensions: config.dimension,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`RAG embedding request timed out after ${EMBEDDING_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RAG embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const embeddings = Array.isArray(data?.data)
    ? data.data
      .sort((a: { index?: number }, b: { index?: number }) => Number(a.index ?? 0) - Number(b.index ?? 0))
      .map((item: { embedding?: unknown }) => item.embedding)
    : [];

  if (embeddings.length !== texts.length || embeddings.some((embedding: unknown) => !Array.isArray(embedding))) {
    throw new Error('RAG embedding API returned an invalid embedding payload');
  }

  return {
    embeddings: embeddings as number[][],
    model: config.model,
    dimension: config.dimension,
    provider: config.provider,
  };
}

/**
 * Query-only embedding cache. Corpus embeddings deliberately bypass this path:
 * seed jobs must always produce one complete, model-consistent index.
 */
export async function embedBlueRagQuery(text: string): Promise<{
  embedding: number[];
  model: string;
  dimension: number;
  provider: BlueRagEmbeddingConfig['provider'];
}> {
  const config = getBlueRagEmbeddingConfig();
  if (!config) {
    throw new Error('No RAG embedding provider configured. Set ELIZA_API_KEY, RAG_EMBEDDING_API_KEY, or OPENAI_API_KEY.');
  }

  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const key = `${config.provider}:${config.model}:${config.dimension}:${normalized}`;
  const now = Date.now();
  const cached = queryEmbeddingCache.get(key);
  if (cached && cached.expiresAt > now) {
    queryEmbeddingCache.delete(key);
    queryEmbeddingCache.set(key, cached);
    return cached.value;
  }
  if (cached) queryEmbeddingCache.delete(key);

  const result = await embedBlueRagTexts([normalized]);
  const value = {
    embedding: result.embeddings[0],
    model: result.model,
    dimension: result.dimension,
    provider: result.provider,
  };
  queryEmbeddingCache.set(key, {
    expiresAt: now + QUERY_EMBEDDING_CACHE_TTL_MS,
    value,
  });

  while (queryEmbeddingCache.size > QUERY_EMBEDDING_CACHE_MAX) {
    const oldestKey = queryEmbeddingCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    queryEmbeddingCache.delete(oldestKey);
  }

  return value;
}

export function toPgVectorLiteral(embedding: number[]) {
  if (embedding.length !== BLUE_RAG_EMBEDDING_DIM) {
    throw new Error(`Expected ${BLUE_RAG_EMBEDDING_DIM}-dimensional embedding, got ${embedding.length}`);
  }

  return `[${embedding.map((value) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toFixed(8);
  }).join(',')}]`;
}

function hashEmbedding(text: string, dimension: number) {
  const vector = new Array<number>(dimension).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const token of tokens) {
    const hash = crypto.createHash('sha256').update(token).digest();
    for (let index = 0; index < 8; index += 1) {
      const slot = hash.readUInt16BE(index * 2) % dimension;
      const sign = hash[index + 16] % 2 === 0 ? 1 : -1;
      vector[slot] += sign;
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}
