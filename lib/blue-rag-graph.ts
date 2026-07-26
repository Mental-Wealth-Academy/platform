import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { BLUE_KNOWLEDGE, type BlueKnowledgeEntry } from './blue-knowledge';
import { embedBlueRagQuery, toPgVectorLiteral } from './blue-rag-embeddings';
import { ensureBlueRagReady } from './blue-rag-index';
import { isDbConfigured, sqlQuery } from './db';
import { ensureBlueRagSchema } from './ensureBlueRagSchema';

type RetrievalIntent = 'casual' | 'navigation' | 'factual' | 'account_state' | 'research' | 'creative';
type RetrievalSource = 'knowledge' | 'memory_fact' | 'recent_message';
type RetrievalMode = 'database' | 'local' | 'local-fallback';
type RetrievalFallbackReason =
  | 'database_unconfigured'
  | 'index_unavailable'
  | 'database_empty'
  | 'database_error';

export interface BlueRagMemoryFact {
  category: string;
  summary: string;
  confidence: number;
}

export interface BlueRagRecentMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface BlueRagInput {
  message: string;
  userId?: string | null;
  requestId?: string | null;
  pathname?: string | null;
  recentFacts?: BlueRagMemoryFact[];
  recentMessages?: BlueRagRecentMessage[];
  limit?: number;
  maxContextChars?: number;
  forceLocal?: boolean;
  persistTrace?: boolean;
}

interface QueryRewrite {
  original: string;
  normalized: string;
  intent: RetrievalIntent;
  canonicalTerms: string[];
  expandedTerms: string[];
  expandedQueries: string[];
  route: string;
}

interface RetrievalDocument {
  id: string;
  sourceId?: string;
  chunkId?: string;
  title: string;
  source: RetrievalSource;
  sourceRank: number;
  routes: string[];
  keywords: string[];
  body: string;
  tokens: string[];
  concepts: string[];
  metadata?: Record<string, unknown>;
}

export interface BlueRagEntry {
  id: string;
  sourceId?: string;
  chunkId?: string;
  title: string;
  source: RetrievalSource;
  score: number;
  rerankScore: number;
  components: {
    lexical: number;
    semantic: number;
    phrase: number;
    route: number;
    authority: number;
  };
  matchedTerms: string[];
  routes: string[];
  body: string;
}

export interface BlueRagQuality {
  trusted: boolean;
  label: 'high' | 'medium' | 'low';
  needsGrounding: boolean;
  coverage: number;
  topScore: number;
  margin: number;
  sourceDiversity: number;
  reasons: string[];
}

export interface BlueRagResult {
  query: QueryRewrite;
  entries: BlueRagEntry[];
  quality: BlueRagQuality;
  contextText: string;
  retrievalMode: RetrievalMode;
  fallbackReason?: RetrievalFallbackReason | null;
  traceId?: string | null;
}

interface ScoredDocument extends RetrievalDocument {
  score: number;
  components: BlueRagEntry['components'];
  matchedTerms: string[];
}

interface DbCandidateRow {
  id: string;
  source_id: string;
  source_type: string;
  title: string;
  route: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  lexical_score: number | string | null;
  vector_distance?: number | string | null;
  retrieval_channel: 'lexical' | 'vector';
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'how', 'who', 'why', 'what', 'when',
  'where', 'this', 'that', 'with', 'from', 'they', 'them', 'have', 'will', 'would',
  'could', 'should', 'about', 'into', 'just', 'your', 'mine', 'tell', 'know',
  'doe', 'does', 'doing', 'been', 'being', 'than', 'then', 'some', 'said', 'like', 'please',
  'need', 'want', 'make', 'give', 'show', 'help', 'blue', 'much', 'many', 'find',
  'exact', 'exactly', 'get', 'gets', 'suppo', 'supposed', 'let', 'use', 'used',
  'explain',
]);

const CONCEPT_ALIASES: Record<string, string[]> = {
  company: ['mwa', 'mental wealth', 'academy', 'mission', 'founder', 'james', 'desci', 'decentralized science'],
  credits: ['credits', 'credit', 'currency', 'cost', 'spend', 'earn', 'reward', 'tickets', 'usdc'],
  course: ['course', 'curriculum', 'week', 'seal', 'pathway', 'lesson', 'task', 'inner artist', 'shadow work', 'creativity', 'season'],
  quests: ['quest', 'quests', 'daily', 'mission', 'field notes', 'journal', 'streak', 'usdc rewards'],
  research: ['research', 'grant', 'proposal', 'thesis', 'paper', 'study', 'experiment', 'academic'],
  membership: ['vip', 'membership', 'member', 'card', 'nft', 'lifetime', 'stripe', 'upgrade', 'academic angel', 'staff tier'],
  account: ['profile', 'wallet', 'account', 'username', 'settings', 'on-chain', 'privy'],
  community: ['community', 'farcaster', 'neynar', 'leaderboard', 'people', 'social'],
  surveys: ['survey', 'surveys', 'assessment', 'questionnaire', 'quiz', 'personality', 'badge', 'certificate', 'psychological'],
  blue: ['blue', 'persona', 'assistant', 'daemon', 'agent', 'azura', 'headset', 'brain interface'],
  events: ['events', 'event', 'tickets', 'guest', 'refresh', 'reset', 'paywall'],
  safety: ['safety', 'anonymous', 'anonymity', 'profile picture', 'asynchronous', 'privacy'],
};

const ROUTE_TERMS: Record<string, string[]> = {
  '/home': ['dashboard', 'guides', 'progress', 'streak', 'overview', 'home'],
  '/dao': ['live', 'world', 'broadcast', 'blue'],
  '/shadow-work': ['course', 'curriculum', 'week', 'seal', 'pathway'],
  '/quests': ['quests', 'daily', 'field notes', 'completion'],
  '/community': ['community', 'farcaster', 'social', 'events'],
  '/prompts': ['prompts', 'library', 'reading', 'blog'],
  '/library': ['prompts', 'library', 'reading', 'blog'],
  '/profile': ['profile', 'wallet', 'account', 'username'],
  '/rewards': ['rewards', 'loot', 'credits', 'unlock'],
  '/shop': ['shop', 'vip', 'membership', 'credits'],
  '/surveys': ['surveys', 'assessment', 'questionnaire'],
  '/events': ['events', 'tickets', 'guest', 'refresh', 'reset'],
};

const DEFAULT_CONTEXT_CHAR_BUDGET = 3_600;
const MIN_CONTEXT_CHAR_BUDGET = 600;
const MAX_CONTEXT_CHAR_BUDGET = 6_000;
const RETRIEVAL_CACHE_MAX = 100;
const RETRIEVAL_CACHE_TTL_MS = 60_000;

interface CachedRetrieval {
  expiresAt: number;
  value: ScoredDocument[];
}

const publicRetrievalCache = new Map<string, CachedRetrieval>();

function normalizeRoute(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const stripped = pathname.split('?')[0].split('#')[0].toLowerCase();
  if (stripped === '/') return '/';
  return stripped.replace(/\/+$/, '');
}

function stemToken(token: string): string {
  return token
    .replace(/ies$/, 'y')
    .replace(/ing$/, '')
    .replace(/ed$/, '')
    .replace(/s$/, '');
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [])
    .map((token) => stemToken(token.replace(/'/g, '')))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function conceptsForText(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokenSet = new Set(tokenize(text));
  const concepts: string[] = [];

  for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES)) {
    const matched = aliases.some((alias) => {
      const aliasTokens = tokenize(alias);
      if (aliasTokens.length === 0) return false;
      const escapedAlias = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const phraseMatch = new RegExp(`\\b${escapedAlias}\\b`).test(normalized);
      return phraseMatch || aliasTokens.every((token) => tokenSet.has(token));
    });
    if (matched) concepts.push(concept);
  }

  return concepts;
}

function classifyIntent(message: string, tokens: string[], concepts: string[]): RetrievalIntent {
  const normalized = message.toLowerCase().trim();
  if (/^(hi|hey|hello|yo|thanks|thank you|kk|ok|okay|gm|gn)[.!?\s]*$/.test(normalized)) return 'casual';
  if (concepts.includes('research') || /\b(grant|proposal|thesis|paper|study|experiment|draft)\b/.test(normalized)) return 'research';
  if (concepts.includes('account') || /\b(my|mine|me)\b/.test(normalized) && /\b(progress|wallet|credits|profile|streak|quests?)\b/.test(normalized)) return 'account_state';
  if (/\b(where|open|find|page|screen|tab|go)\b/.test(normalized)) return 'navigation';
  if (/\b(write|draft|caption|post|campaign|rewrite|edit)\b/.test(normalized)) return 'creative';
  return 'factual';
}

function rewriteQuery(input: Pick<BlueRagInput, 'message' | 'pathname'>): QueryRewrite {
  const route = normalizeRoute(input.pathname);
  const original = input.message.trim();
  const normalized = original.toLowerCase().replace(/\s+/g, ' ').trim();
  const originalTokens = tokenize(normalized);
  const routeTerms = ROUTE_TERMS[route] ?? [];
  const concepts = unique(conceptsForText(normalized));
  const aliasTerms = concepts.flatMap((concept) => CONCEPT_ALIASES[concept] ?? []);
  const routeExpansionTerms = originalTokens.length <= 2 ? routeTerms.flatMap(tokenize) : [];
  const canonicalTerms = unique(originalTokens);
  const canonicalTermSet = new Set(canonicalTerms);
  const expandedTerms = unique(aliasTerms.flatMap(tokenize))
    .filter((term) => !canonicalTermSet.has(term));
  const intent = classifyIntent(original, originalTokens, concepts);

  return {
    original,
    normalized,
    intent,
    canonicalTerms,
    expandedTerms,
    expandedQueries: unique([
      normalized,
      [...originalTokens, ...expandedTerms].join(' '),
      [...routeExpansionTerms, ...originalTokens, ...expandedTerms].join(' '),
    ]).filter((query) => query.trim().length > 0),
    route,
  };
}

function buildDocuments(input: BlueRagInput): RetrievalDocument[] {
  const knowledgeDocs = BLUE_KNOWLEDGE.map((entry) => documentFromKnowledge(entry));
  const factDocs = (input.recentFacts ?? []).map((fact, index) => {
    const body = `[${fact.category}] ${fact.summary}`;
    return buildDocument({
      id: `memory-fact-${index}`,
      title: `User memory: ${fact.category}`,
      source: 'memory_fact',
      sourceRank: Math.max(0.2, Math.min(1, Number(fact.confidence) || 0.5)),
      routes: ['*'],
      keywords: [fact.category],
      body,
      metadata: { confidence: fact.confidence },
    });
  });
  const messageDocs = (input.recentMessages ?? []).slice(-6).map((message, index) => buildDocument({
    id: `recent-message-${index}`,
    title: `Recent ${message.role} message`,
    source: 'recent_message',
    sourceRank: message.role === 'user' ? 0.45 : 0.25,
    routes: ['*'],
    keywords: [message.role],
    body: message.text,
  }));

  return [...knowledgeDocs, ...factDocs, ...messageDocs];
}

function documentFromKnowledge(entry: BlueKnowledgeEntry): RetrievalDocument {
  return buildDocument({
    id: entry.id,
    title: entry.title,
    source: 'knowledge',
    sourceRank: 1,
    routes: entry.routes,
    keywords: entry.keywords,
    body: entry.body,
  });
}

function buildDocument(args: Omit<RetrievalDocument, 'tokens' | 'concepts'>): RetrievalDocument {
  const searchableText = [args.title, args.keywords.join(' '), args.body].join(' ');
  return {
    ...args,
    tokens: tokenize(searchableText),
    concepts: conceptsForText(searchableText),
  };
}

function scoreDocuments(query: QueryRewrite, documents: RetrievalDocument[]): ScoredDocument[] {
  const docCount = Math.max(documents.length, 1);
  const documentFrequency = new Map<string, number>();
  for (const doc of documents) {
    for (const token of new Set(doc.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const canonicalTerms = unique(query.canonicalTerms);
  const aliasTerms = unique(query.expandedTerms);
  const queryConcepts = new Set(conceptsForText([
    query.normalized,
    ...query.expandedTerms,
  ].join(' ')));
  const avgLength = documents.reduce((sum, doc) => sum + doc.tokens.length, 0) / docCount || 1;

  const scored = documents.map((doc) => {
    const tokenCounts = new Map<string, number>();
    for (const token of doc.tokens) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);

    let lexical = 0;
    const matchedTerms: string[] = [];
    for (const term of canonicalTerms) {
      const frequency = tokenCounts.get(term) ?? 0;
      if (!frequency) continue;
      matchedTerms.push(term);
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
      const denominator = frequency + 1.2 * (1 - 0.75 + 0.75 * (doc.tokens.length / avgLength));
      lexical += idf * ((frequency * 2.2) / denominator);
    }

    const aliasMatches = aliasTerms.filter((term) => tokenCounts.has(term));
    const aliasRecall = aliasTerms.length ? aliasMatches.length / aliasTerms.length : 0;
    const docConcepts = new Set(doc.concepts);
    const semanticHits = [...queryConcepts].filter((concept) => docConcepts.has(concept)).length;
    const conceptRecall = queryConcepts.size ? semanticHits / queryConcepts.size : 0;
    const semantic = conceptRecall * 0.75 + aliasRecall * 0.25;

    const lowered = `${doc.title} ${doc.keywords.join(' ')} ${doc.body}`.toLowerCase();
    const phrase = exactPhraseScore(query, doc, lowered);

    const exactRoute = query.route && doc.routes.includes(query.route) ? 1 : 0;
    const globalRoute = doc.routes.includes('*') ? 0.35 : 0;
    const route = Math.max(exactRoute, globalRoute);
    const authority = doc.source === 'knowledge' ? 1 : doc.sourceRank;

    return {
      ...doc,
      // Match reporting and trust use exact user terms. Alias hits are candidate
      // recall signals only and never satisfy evidence coverage.
      matchedTerms: unique(matchedTerms),
      score: 0,
      components: {
        lexical,
        semantic,
        phrase,
        route,
        authority,
      },
    };
  });

  const max = {
    lexical: Math.max(1, ...scored.map((doc) => doc.components.lexical)),
  };

  return scored
    .map((doc) => {
      const components = {
        lexical: doc.components.lexical / max.lexical,
        semantic: doc.components.semantic,
        phrase: doc.components.phrase,
        route: doc.components.route,
        authority: doc.components.authority,
      };
      const score =
        components.lexical * 0.58
        + components.phrase * 0.20
        + components.semantic * 0.08
        + components.route * 0.07
        + components.authority * 0.07;

      return { ...doc, components, score };
    })
    .filter((doc) => (
      doc.matchedTerms.length > 0
      || doc.components.phrase > 0
      || doc.components.semantic > 0.12
      || doc.components.route >= 1
    ))
    .sort((a, b) => b.score - a.score);
}

function exactPhraseScore(
  query: QueryRewrite,
  doc: RetrievalDocument,
  loweredDocument: string,
): number {
  if (query.normalized.length >= 4 && loweredDocument.includes(query.normalized)) {
    return 1;
  }

  const queryTokens = query.canonicalTerms;
  if (queryTokens.length === 0) return 0;
  const documentTokens = doc.tokens.join(' ');

  for (let size = Math.min(4, queryTokens.length); size >= 2; size -= 1) {
    for (let index = 0; index <= queryTokens.length - size; index += 1) {
      const phrase = queryTokens.slice(index, index + size).join(' ');
      if (documentTokens.includes(phrase)) {
        return Math.min(1, 0.45 + (size / queryTokens.length) * 0.55);
      }
    }
  }

  return queryTokens.length === 1 && doc.tokens.includes(queryTokens[0]) ? 0.35 : 0;
}

async function retrieveScoredDocuments(args: {
  query: QueryRewrite;
  recentFacts: BlueRagMemoryFact[];
  recentMessages: BlueRagRecentMessage[];
  limit: number;
  forceLocal?: boolean;
}): Promise<{
  scored: ScoredDocument[];
  retrievalMode: RetrievalMode;
  fallbackReason?: RetrievalFallbackReason | null;
}> {
  if (args.query.intent === 'casual') {
    return { scored: [], retrievalMode: 'local' };
  }

  if (!args.forceLocal && isDbConfigured()) {
    try {
      const [ready, guideStateStamp] = await Promise.all([
        ensureBlueRagReady(),
        getPublishedGuideStateStamp(),
      ]);
      if (ready.ready) {
        const cacheKey = [
          ready.corpusHash,
          guideStateStamp,
          args.query.normalized,
          args.query.route,
          args.limit,
        ].join(':');
        let dbScored = getCachedPublicRetrieval(cacheKey);
        if (!dbScored) {
          dbScored = await retrieveDbScoredDocuments(args.query, args.limit * 8);
          setCachedPublicRetrieval(cacheKey, dbScored);
        }
        if (dbScored.length) {
          const memoryScored = scoreDocuments(args.query, buildRuntimeMemoryDocuments({
            recentFacts: args.recentFacts,
            recentMessages: args.recentMessages,
          }));
          return {
            scored: [...dbScored, ...memoryScored].sort((a, b) => b.score - a.score),
            retrievalMode: 'database',
          };
        }
        return buildLocalRetrieval(args, 'database_empty');
      }
      return buildLocalRetrieval(args, 'index_unavailable');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown db rag error';
      console.warn('Blue RAG database retrieval unavailable, falling back to local:', message);
      return buildLocalRetrieval(args, 'database_error');
    }
  }

  const fallbackReason = !args.forceLocal
    && (process.env.NODE_ENV === 'production' || process.env.BLUE_RAG_REQUIRE_DATABASE === '1')
    ? 'database_unconfigured'
    : null;
  if (fallbackReason) return buildLocalRetrieval(args, fallbackReason);

  return {
    scored: scoreDocuments(args.query, buildDocuments({
      message: args.query.original,
      pathname: args.query.route,
      recentFacts: args.recentFacts,
      recentMessages: args.recentMessages,
      limit: args.limit,
    })),
    retrievalMode: 'local',
  };
}

function buildLocalRetrieval(
  args: {
    query: QueryRewrite;
    recentFacts: BlueRagMemoryFact[];
    recentMessages: BlueRagRecentMessage[];
    limit: number;
  },
  fallbackReason: RetrievalFallbackReason,
): {
  scored: ScoredDocument[];
  retrievalMode: 'local-fallback';
  fallbackReason: RetrievalFallbackReason;
} {
  return {
    scored: scoreDocuments(args.query, buildDocuments({
      message: args.query.original,
      pathname: args.query.route,
      recentFacts: args.recentFacts,
      recentMessages: args.recentMessages,
      limit: args.limit,
    })),
    retrievalMode: 'local-fallback',
    fallbackReason,
  };
}

function buildRuntimeMemoryDocuments(input: Pick<BlueRagInput, 'recentFacts' | 'recentMessages'>): RetrievalDocument[] {
  const factDocs = (input.recentFacts ?? []).map((fact, index) => {
    const body = `[${fact.category}] ${fact.summary}`;
    return buildDocument({
      id: `memory-fact-${index}`,
      title: `User memory: ${fact.category}`,
      source: 'memory_fact',
      sourceRank: Math.max(0.2, Math.min(1, Number(fact.confidence) || 0.5)),
      routes: ['*'],
      keywords: [fact.category],
      body,
      metadata: { confidence: fact.confidence },
    });
  });
  const messageDocs = (input.recentMessages ?? []).slice(-6).map((message, index) => buildDocument({
    id: `recent-message-${index}`,
    title: `Recent ${message.role} message`,
    source: 'recent_message',
    sourceRank: message.role === 'user' ? 0.45 : 0.25,
    routes: ['*'],
    keywords: [message.role],
    body: message.text,
  }));

  return [...factDocs, ...messageDocs];
}

async function retrieveDbScoredDocuments(query: QueryRewrite, candidateLimit: number): Promise<ScoredDocument[]> {
  await ensureBlueRagSchema();

  const candidateTerms = unique([...query.canonicalTerms, ...query.expandedTerms]);
  const queryText = candidateTerms.map((term) => `"${term}"`).join(' OR ')
    || query.normalized;
  const lexicalPromise = sqlQuery<DbCandidateRow[]>(
    `WITH q AS (
       SELECT websearch_to_tsquery('english', :queryText) AS query
     )
     SELECT
       c.id,
       c.source_id,
       c.source_type,
       c.title,
       c.route,
       c.content,
       c.metadata,
       ts_rank_cd(c.search_vector, q.query) AS lexical_score,
       NULL::double precision AS vector_distance,
       'lexical' AS retrieval_channel
     FROM blue_rag_chunks c
     JOIN blue_rag_sources s ON s.id = c.source_id
     CROSS JOIN q
     WHERE s.enabled = TRUE
       AND (
         s.source_type <> 'published_guide'
         OR EXISTS (
           SELECT 1
           FROM guides current_guide
           WHERE current_guide.id::text = s.metadata->>'guideId'
             AND current_guide.status = 'published'
             AND current_guide.updated_at::text = s.metadata->>'guideUpdatedAt'
         )
       )
       AND (
         c.search_vector @@ q.query
         OR (:route <> '' AND c.route = :route)
       )
     ORDER BY ts_rank_cd(c.search_vector, q.query) DESC, c.updated_at DESC
     LIMIT :limit`,
    {
      queryText,
      route: query.route,
      limit: candidateLimit,
    }
  );

  // Lexical retrieval and the external embedding request start together. The
  // exact cosine query follows only after its embedding is available.
  const embeddingPromise = embedBlueRagQuery(query.normalized)
    .catch((error: unknown) => {
      console.warn(
        'Blue RAG vector search skipped:',
        error instanceof Error ? error.message : 'unknown embedding error',
      );
      return null;
    });
  const [lexicalRows, embeddingResult] = await Promise.all([
    lexicalPromise,
    embeddingPromise,
  ]);

  let vectorRows: DbCandidateRow[] = [];
  if (embeddingResult) {
    const embedding = toPgVectorLiteral(embeddingResult.embedding);
    vectorRows = await sqlQuery<DbCandidateRow[]>(
      `SELECT
         c.id,
         c.source_id,
         c.source_type,
         c.title,
         c.route,
         c.content,
         c.metadata,
         0::double precision AS lexical_score,
         (c.embedding <=> :embedding::vector) AS vector_distance,
         'vector' AS retrieval_channel
       FROM blue_rag_chunks c
       JOIN blue_rag_sources s ON s.id = c.source_id
       WHERE s.enabled = TRUE
         AND (
           s.source_type <> 'published_guide'
           OR EXISTS (
             SELECT 1
             FROM guides current_guide
             WHERE current_guide.id::text = s.metadata->>'guideId'
               AND current_guide.status = 'published'
               AND current_guide.updated_at::text = s.metadata->>'guideUpdatedAt'
           )
         )
       ORDER BY c.embedding <=> :embedding::vector
       LIMIT :limit`,
      {
        embedding,
        limit: candidateLimit,
      }
    );
  }

  return mergeDbCandidates(query, [...lexicalRows, ...vectorRows]);
}

async function getPublishedGuideStateStamp(): Promise<string> {
  const rows = await sqlQuery<Array<{
    published_count: number | string;
    latest_update: string | null;
  }>>(
    `SELECT
       COUNT(*) AS published_count,
       MAX(updated_at)::text AS latest_update
     FROM guides
     WHERE status = 'published'`,
  );
  return [
    Number(rows[0]?.published_count ?? 0),
    rows[0]?.latest_update ?? 'none',
  ].join(':');
}

function getCachedPublicRetrieval(key: string): ScoredDocument[] | null {
  const cached = publicRetrievalCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    publicRetrievalCache.delete(key);
    return null;
  }
  publicRetrievalCache.delete(key);
  publicRetrievalCache.set(key, cached);
  return cached.value;
}

function setCachedPublicRetrieval(key: string, value: ScoredDocument[]): void {
  publicRetrievalCache.set(key, {
    expiresAt: Date.now() + RETRIEVAL_CACHE_TTL_MS,
    value,
  });
  while (publicRetrievalCache.size > RETRIEVAL_CACHE_MAX) {
    const oldestKey = publicRetrievalCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    publicRetrievalCache.delete(oldestKey);
  }
}

function mergeDbCandidates(query: QueryRewrite, rows: DbCandidateRow[]): ScoredDocument[] {
  const byId = new Map<string, DbCandidateRow & { lexical: number; vectorSimilarity: number }>();

  for (const row of rows) {
    const existing = byId.get(row.id);
    const lexical = Number(row.lexical_score ?? 0);
    const distance = row.vector_distance === null || row.vector_distance === undefined ? null : Number(row.vector_distance);
    const vectorSimilarity = distance === null || Number.isNaN(distance) ? 0 : Math.max(0, 1 - distance);

    if (!existing) {
      byId.set(row.id, { ...row, lexical, vectorSimilarity });
      continue;
    }

    existing.lexical = Math.max(existing.lexical, lexical);
    existing.vectorSimilarity = Math.max(existing.vectorSimilarity, vectorSimilarity);
  }

  const merged = [...byId.values()];
  const maxLexical = Math.max(1, ...merged.map((row) => row.lexical));

  return merged.map((row) => {
    const keywords = metadataStringArray(row.metadata, 'keywords');
    const routes = unique([row.route ?? '', ...metadataStringArray(row.metadata, 'routes')]).filter(Boolean);
    const doc = buildDocument({
      id: row.id,
      sourceId: row.source_id,
      chunkId: row.id,
      title: row.title,
      source: 'knowledge',
      sourceRank: 1,
      routes: routes.length ? routes : ['*'],
      keywords,
      body: row.content,
      metadata: row.metadata ?? {},
    });

    const lowered = `${doc.title} ${doc.keywords.join(' ')} ${doc.body}`.toLowerCase();
    const canonicalMatches = query.canonicalTerms.filter((term) => doc.tokens.includes(term));
    const canonicalCoverage = query.canonicalTerms.length ? canonicalMatches.length / query.canonicalTerms.length : 1;
    const matchedTerms = unique(canonicalMatches);
    const queryConcepts = new Set(conceptsForText([
      query.normalized,
      ...query.expandedTerms,
    ].join(' ')));
    const docConcepts = new Set(doc.concepts);
    const semanticConceptHits = [...queryConcepts].filter((concept) => docConcepts.has(concept)).length;
    const conceptSemantic = queryConcepts.size ? semanticConceptHits / queryConcepts.size : 0;
    const phrase = exactPhraseScore(query, doc, lowered);
    const exactRoute = query.route && doc.routes.includes(query.route) ? 1 : 0;
    const globalRoute = doc.routes.includes('*') ? 0.35 : 0;

    const components = {
      lexical: canonicalCoverage * (0.75 + 0.25 * (row.lexical / maxLexical)),
      semantic: Math.max(
        row.vectorSimilarity * (0.15 + 0.85 * canonicalCoverage),
        conceptSemantic * canonicalCoverage
      ),
      phrase,
      route: Math.max(exactRoute, globalRoute),
      authority: 1,
    };

    const score =
      components.lexical * 0.55
      + components.phrase * 0.20
      + components.semantic * 0.12
      + components.route * 0.06
      + components.authority * 0.07;

    return {
      ...doc,
      matchedTerms,
      components,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

function metadataStringArray(metadata: Record<string, unknown> | null, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function similarity(a: ScoredDocument, b: ScoredDocument): number {
  const aTerms = new Set([...a.tokens, ...a.concepts]);
  const bTerms = new Set([...b.tokens, ...b.concepts]);
  const overlap = [...aTerms].filter((term) => bTerms.has(term)).length;
  const union = new Set([...aTerms, ...bTerms]).size || 1;
  return overlap / union;
}

function rerankDocuments(scored: ScoredDocument[], limit: number): BlueRagEntry[] {
  const selected: Array<ScoredDocument & { rerankScore: number }> = [];
  const remaining = [...scored];

  while (remaining.length && selected.length < limit) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const diversityPenalty = selected.length
        ? Math.max(...selected.map((doc) => similarity(candidate, doc))) * 0.22
        : 0;
      const sourcePenalty = selected.some((doc) => doc.source === candidate.source && doc.source !== 'knowledge') ? 0.04 : 0;
      const rerankScore = candidate.score - diversityPenalty - sourcePenalty;
      if (rerankScore > bestScore) {
        bestScore = rerankScore;
        bestIndex = index;
      }
    }

    const [best] = remaining.splice(bestIndex, 1);
    selected.push({ ...best, rerankScore: bestScore });
  }

  return selected.map((doc) => ({
    id: doc.id,
    sourceId: doc.sourceId,
    chunkId: doc.chunkId,
    title: doc.title,
    source: doc.source,
    score: Number(doc.score.toFixed(4)),
    rerankScore: Number(doc.rerankScore.toFixed(4)),
    components: {
      lexical: Number(doc.components.lexical.toFixed(4)),
      semantic: Number(doc.components.semantic.toFixed(4)),
      phrase: Number(doc.components.phrase.toFixed(4)),
      route: Number(doc.components.route.toFixed(4)),
      authority: Number(doc.components.authority.toFixed(4)),
    },
    matchedTerms: doc.matchedTerms.slice(0, 12),
    routes: doc.routes,
    body: doc.body,
  }));
}

function evaluateQuality(query: QueryRewrite, entries: BlueRagEntry[]): BlueRagQuality {
  if (query.intent === 'casual') {
    return {
      trusted: true,
      label: 'medium',
      needsGrounding: false,
      coverage: 1,
      topScore: 0,
      margin: 0,
      sourceDiversity: 0,
      reasons: [],
    };
  }

  const topScore = entries[0]?.score ?? 0;
  const secondScore = entries[1]?.score ?? 0;
  const margin = Math.max(0, topScore - secondScore);
  // Coverage is derived only from the title and body that survived the context
  // budget. Scoring metadata can describe the full chunk and must not raise
  // trust for evidence the model never receives.
  const selectedTerms = new Set(entries.flatMap((entry) => (
    tokenize([entry.title, entry.body].join(' '))
  )));
  const requiredTerms = query.canonicalTerms.filter((term) => !STOPWORDS.has(term));
  const coveredTerms = requiredTerms.filter((term) => selectedTerms.has(term));
  const coverage = requiredTerms.length ? coveredTerms.length / requiredTerms.length : 1;
  const missingTerms = requiredTerms.filter((term) => !selectedTerms.has(term));
  const acronymTerms = new Set(
    (query.original.match(/\b[A-Z0-9]{2,}\b/g) ?? []).flatMap(tokenize),
  );
  const rareMissingTerms = missingTerms.filter((term) => (
    term.length >= 4 || /\d/.test(term) || acronymTerms.has(term)
  ));
  const sourceDiversity = new Set(entries.map((entry) => entry.source)).size;
  const hasKnowledge = entries.some((entry) => entry.source === 'knowledge');
  const sensitive = /\b(price|cost|contract|wallet|trade|treasury|medical|diagnos|therapy|privacy|consent|payout|funding)\b/i.test(query.original);
  const needsGrounding = query.intent !== 'creative';

  const reasons: string[] = [];
  if (!entries.length) reasons.push('no retrieval candidates survived scoring');
  if (topScore < 0.24) reasons.push('top retrieval score below trust threshold');
  if (coverage < 0.34) reasons.push('query-term coverage below trust threshold');
  if (rareMissingTerms.length) reasons.push(`specific query terms missing from retrieval: ${rareMissingTerms.slice(0, 3).join(', ')}`);
  if (sensitive && !hasKnowledge) reasons.push('sensitive answer lacks authoritative knowledge context');
  if (needsGrounding && margin < 0.025 && topScore < 0.42) reasons.push('top candidate is not clearly separated from alternatives');

  const trusted = !needsGrounding
    || (
      entries.length > 0
      && topScore >= (sensitive ? 0.30 : 0.24)
      && coverage >= 0.34
      && rareMissingTerms.length === 0
      && (!sensitive || hasKnowledge)
    );

  const label: BlueRagQuality['label'] = trusted && topScore >= 0.46 && coverage >= 0.55
    ? 'high'
    : trusted
      ? 'medium'
      : 'low';

  return {
    trusted,
    label,
    needsGrounding,
    coverage: Number(coverage.toFixed(4)),
    topScore,
    margin: Number(margin.toFixed(4)),
    sourceDiversity,
    reasons,
  };
}

function fitEvidenceToBudget(
  query: QueryRewrite,
  entries: BlueRagEntry[],
  requestedBudget: number | undefined,
): { entries: BlueRagEntry[]; maxChars: number } {
  const maxChars = Math.min(
    MAX_CONTEXT_CHAR_BUDGET,
    Math.max(MIN_CONTEXT_CHAR_BUDGET, requestedBudget ?? DEFAULT_CONTEXT_CHAR_BUDGET),
  );
  if (query.intent === 'casual') return { entries: [], maxChars };

  // Reserve enough room for the retrieval instruction. Quality is calculated
  // after this step so excluded text can never satisfy trust.
  let remaining = maxChars - 420;
  const included: BlueRagEntry[] = [];

  for (const entry of entries) {
    const sourceLabel = entry.source === 'knowledge'
      ? 'product knowledge'
      : entry.source === 'memory_fact'
        ? 'user memory'
        : 'recent chat';
    const prefix = `${included.length + 1}. [${sourceLabel}] ${entry.title}: `;
    const fullLength = prefix.length + entry.body.length + 1;
    if (fullLength <= remaining) {
      included.push(entry);
      remaining -= fullLength;
      continue;
    }

    const bodyBudget = remaining - prefix.length - 1;
    if (bodyBudget >= 120) {
      included.push({
        ...entry,
        body: clipAtWordBoundary(entry.body, bodyBudget),
      });
    }
    break;
  }

  return { entries: included, maxChars };
}

function formatContext(
  query: QueryRewrite,
  entries: BlueRagEntry[],
  quality: BlueRagQuality,
  maxChars: number,
): string {
  if (query.intent === 'casual') return '';

  const lines = [
    quality.trusted
      ? 'MWA evidence. Use these facts silently and stay within them for product-specific claims.'
      : 'MWA evidence is incomplete. For product-specific facts, state the gap and ask one focused question.',
    ...entries.map((entry, index) => {
      const sourceLabel = entry.source === 'knowledge'
        ? 'product knowledge'
        : entry.source === 'memory_fact'
          ? 'user memory'
          : 'recent chat';
      return `${index + 1}. [${sourceLabel}] ${entry.title}: ${entry.body}`;
    }),
  ];
  const context = lines.join('\n');
  if (context.length > maxChars) {
    // fitEvidenceToBudget reserves more than this header consumes. Failing
    // closed keeps quality and supplied evidence aligned if that invariant is
    // changed later.
    return 'MWA evidence is incomplete. For product-specific facts, state the gap and ask one focused question.';
  }
  return context;
}

function clipAtWordBoundary(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, Math.max(0, maxChars - 1));
  const boundary = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, boundary > maxChars * 0.7 ? boundary : clipped.length).trimEnd()}…`;
}

async function persistRetrievalTrace(args: {
  userId?: string | null;
  requestId?: string | null;
  query: QueryRewrite;
  entries: BlueRagEntry[];
  quality: BlueRagQuality;
  retrievalMode: RetrievalMode;
  startedAt: number;
  persistTrace?: boolean;
}): Promise<string | null> {
  if (!args.persistTrace || !isDbConfigured()) return null;

  try {
    await ensureBlueRagSchema();
    const rows = await sqlQuery<Array<{ id: string }>>(
      `INSERT INTO blue_rag_retrieval_traces (
         user_id,
         request_id,
         query_original,
         query_rewritten,
         route,
         intent,
         retrieval_mode,
         quality,
         selected_chunk_ids,
         candidates,
         latency_ms
       )
       VALUES (
         :userId,
         :requestId,
         :queryOriginal,
         :queryRewritten,
         :route,
         :intent,
         :retrievalMode,
         :quality::jsonb,
         :selectedChunkIds::text[],
         :candidates::jsonb,
         :latencyMs
       )
       RETURNING id`,
      {
        userId: args.userId ?? null,
        requestId: args.requestId ?? null,
        queryOriginal: args.query.original,
        queryRewritten: args.query.expandedQueries[0] || args.query.normalized,
        route: args.query.route || null,
        intent: args.query.intent,
        retrievalMode: args.retrievalMode,
        quality: JSON.stringify(args.quality),
        selectedChunkIds: args.entries.map((entry) => entry.chunkId || entry.id).filter(Boolean),
        candidates: JSON.stringify(args.entries.map((entry) => ({
          id: entry.id,
          sourceId: entry.sourceId,
          score: entry.score,
          rerankScore: entry.rerankScore,
          matchedTerms: entry.matchedTerms,
          components: entry.components,
        }))),
        latencyMs: Math.max(0, Date.now() - args.startedAt),
      }
    );
    return rows[0]?.id ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown trace error';
    console.warn('Blue RAG trace persistence failed:', message);
    return null;
  }
}

const RagState = Annotation.Root({
  message: Annotation<string>(),
  userId: Annotation<string | null | undefined>(),
  requestId: Annotation<string | null | undefined>(),
  pathname: Annotation<string | null | undefined>(),
  recentFacts: Annotation<BlueRagMemoryFact[]>({ value: (_left, right) => right, default: () => [] }),
  recentMessages: Annotation<BlueRagRecentMessage[]>({ value: (_left, right) => right, default: () => [] }),
  limit: Annotation<number | undefined>(),
  maxContextChars: Annotation<number | undefined>(),
  forceLocal: Annotation<boolean | undefined>(),
  persistTrace: Annotation<boolean | undefined>(),
  startedAt: Annotation<number>(),
  query: Annotation<QueryRewrite | undefined>(),
  scored: Annotation<ScoredDocument[]>({ value: (_left, right) => right, default: () => [] }),
  entries: Annotation<BlueRagEntry[]>({ value: (_left, right) => right, default: () => [] }),
  quality: Annotation<BlueRagQuality | undefined>(),
  retrievalMode: Annotation<RetrievalMode>(),
  fallbackReason: Annotation<RetrievalFallbackReason | null | undefined>(),
  traceId: Annotation<string | null | undefined>(),
  contextMaxChars: Annotation<number>(),
  contextText: Annotation<string>(),
});

const blueRagGraph = new StateGraph(RagState)
  .addNode('rewrite_query', (state: typeof RagState.State) => ({
    query: rewriteQuery({ message: state.message, pathname: state.pathname }),
  }))
  .addNode('hybrid_search', async (state: typeof RagState.State) => {
    if (!state.query) return { scored: [], retrievalMode: 'local' as const };
    const result = await retrieveScoredDocuments({
      query: state.query,
      recentFacts: state.recentFacts,
      recentMessages: state.recentMessages,
      limit: state.limit ?? 6,
      forceLocal: state.forceLocal,
    });
    return result;
  })
  .addNode('rerank', (state: typeof RagState.State) => ({
    entries: rerankDocuments(state.scored, state.limit ?? 6),
  }))
  .addNode('budget_evidence', (state: typeof RagState.State) => {
    if (!state.query) return { entries: [], contextMaxChars: DEFAULT_CONTEXT_CHAR_BUDGET };
    const fitted = fitEvidenceToBudget(
      state.query,
      state.entries,
      state.maxContextChars,
    );
    return {
      entries: fitted.entries,
      contextMaxChars: fitted.maxChars,
    };
  })
  .addNode('evaluate', (state: typeof RagState.State) => ({
    quality: state.query ? evaluateQuality(state.query, state.entries) : undefined,
  }))
  .addNode('assemble_context', (state: typeof RagState.State) => ({
    contextText: state.query && state.quality
      ? formatContext(
          state.query,
          state.entries,
          state.quality,
          state.contextMaxChars ?? DEFAULT_CONTEXT_CHAR_BUDGET,
        )
      : '',
  }))
  .addEdge(START, 'rewrite_query')
  .addEdge('rewrite_query', 'hybrid_search')
  .addEdge('hybrid_search', 'rerank')
  .addEdge('rerank', 'budget_evidence')
  .addEdge('budget_evidence', 'evaluate')
  .addEdge('evaluate', 'assemble_context')
  .addEdge('assemble_context', END)
  .compile();

export async function runBlueRagGraph(input: BlueRagInput): Promise<BlueRagResult> {
  const state = await blueRagGraph.invoke({
    message: input.message,
    userId: input.userId,
    requestId: input.requestId,
    pathname: input.pathname,
    recentFacts: input.recentFacts ?? [],
    recentMessages: input.recentMessages ?? [],
    limit: input.limit ?? 6,
    maxContextChars: input.maxContextChars ?? DEFAULT_CONTEXT_CHAR_BUDGET,
    forceLocal: input.forceLocal,
    persistTrace: input.persistTrace,
    startedAt: Date.now(),
    retrievalMode: 'local',
    fallbackReason: null,
    contextMaxChars: DEFAULT_CONTEXT_CHAR_BUDGET,
    contextText: '',
  });

  if (!state.query || !state.quality) {
    throw new Error('Blue RAG graph failed to produce retrieval state');
  }

  const result: BlueRagResult = {
    query: state.query,
    entries: state.entries,
    quality: state.quality,
    contextText: state.contextText,
    retrievalMode: state.retrievalMode ?? 'local',
    fallbackReason: state.fallbackReason ?? null,
    traceId: null,
  };

  if (input.persistTrace && state.query.intent !== 'casual') {
    void persistRetrievalTrace({
      userId: input.userId,
      requestId: input.requestId,
      query: state.query,
      entries: state.entries,
      quality: state.quality,
      retrievalMode: state.retrievalMode ?? 'local',
      startedAt: state.startedAt,
      persistTrace: true,
    });
  }

  return result;
}
