import { sqlQuery, sqlQueryWithClient, withTransaction } from './db';
import { ensureGuidesSchema } from './ensureGuidesSchema';
import { simplifyWellnessCriterion } from './guide-criteria';
import {
  cleanDiscoveryTags,
  isEducationLevel,
  isGuideGoal,
  type EducationLevel,
  type GuideGoal,
} from './guide-discovery-filters';
import {
  GUIDE_COMPLETE_REWARD,
  LEVEL_CLEAR_REWARD,
  WALKTHROUGH_COMPLETE_REWARD,
} from './guide-rewards-db';

// ── Types ────────────────────────────────────────────────────────────────────

export type GuideStatus =
  | 'draft'
  | 'pending_verification'
  | 'published'
  | 'unpublished'
  | 'forked';

/**
 * A guide body is an array of course components in the same shape consumed by
 * components/course-renderers/ComponentRenderer.tsx. We keep it loosely typed
 * (Record) so the renderers' own config typing stays the single source of truth.
 */
export type GuideBodyComponent = {
  id: string;
  componentType: string;
  title?: string;
  config: Record<string, unknown>;
  blocks?: Array<Record<string, unknown>>;
};

export interface GuideRecord {
  id: string;
  slug: string;
  topicTitle: string;
  topicAliases: string[];
  summary: string;
  intendedAudience: string;
  educationLevels: EducationLevel[];
  goals: GuideGoal[];
  estimatedMinutes: number | null;
  sourceProvenance: string;
  sourceReviewedAt: string | null;
  body: GuideBodyComponent[];
  status: GuideStatus;
  authorId: string | null;
  canonicalGroupId: string | null;
  subjects: string[];
  subjectIds: string[];
  /**
   * Observable "evidence criteria" — short statements of what a learner can do
   * once they have the topic ("The learner can name three cognitive distortions
   * in their own thinking"). Author-authored guidance; empty when none set.
   */
  evidenceCriteria: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GuideSubjectDefinition {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  sortOrder: number;
}

export interface GuideMethodRecord {
  id: string;
  parentGuideId: string;
  title: string;
  body: GuideBodyComponent[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuideLink {
  id: string;
  slug: string;
  topicTitle: string;
  status: GuideStatus;
}

/** A frontier guide: not yet completed, all direct (published) prereqs done. */
export interface FrontierGuide extends GuideLink {
  prereqCount: number;
  summary: string | null;
  estimatedMinutes: number | null;
  /** Titles of the published prereqs the caller completed, most recent first.
      On the frontier every published prereq is completed, so this is the full
      published prereq list — empty for primitives. */
  unlockedBy: string[];
  /** Most recent completion among those prereqs; null for primitives. */
  lastUnlockAt: string | null;
}

export interface WalkthroughNode extends GuideLink {
  level: number;
  prereqIds: string[];
  completed: boolean;
}

export interface WalkthroughRewardPreview {
  guideComplete: number;
  levelClear: number;
  walkthroughComplete: number;
  spinGranted: boolean;
}

export interface Walkthrough {
  targetId: string;
  levels: number; // total number of levels (max level + 1)
  nodes: WalkthroughNode[];
  rewardPreview: WalkthroughRewardPreview;
}

/**
 * One node in the global knowledge map. A WalkthroughNode (the shape
 * GuideSkillTree already renders) plus its subject tags, so the map can group or
 * tint by subject without a second round-trip.
 */
export interface KnowledgeMapNode extends WalkthroughNode {
  subjects: string[];
  /** Short plain-text lede pulled from the guide body, for map hover cards. */
  summary: string;
}

export interface KnowledgeMap {
  /** Total number of levels (max level + 1); 0 when the graph is empty. */
  levels: number;
  nodes: KnowledgeMapNode[];
}

export interface ForwardRef {
  id: string;
  guideId: string;
  topicTitle: string;
  createdBy: string;
  resolvedGuideId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ── Row types ────────────────────────────────────────────────────────────────

interface GuideRow {
  id: string;
  slug: string;
  topic_title: string;
  summary: string | null;
  intended_audience: string | null;
  education_levels: string[] | null;
  goals: string[] | null;
  estimated_minutes: number | null;
  source_provenance: string | null;
  source_reviewed_at: string | null;
  body: unknown;
  status: string;
  author_id: string | null;
  canonical_group_id: string | null;
  evidence_criteria: unknown;
  created_at: string;
  updated_at: string;
}

interface GuideMethodRow {
  id: string;
  parent_guide_id: string;
  title: string;
  body: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── Parsers / mappers ────────────────────────────────────────────────────────

function parseBody(raw: unknown): GuideBodyComponent[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as GuideBodyComponent[]) : [];
}

/**
 * Coerce the nullable guides.evidence_criteria JSONB into a clean string[]: keep
 * only non-empty trimmed strings, formatted as direct wellness instructions.
 * Tolerates a JSON string or a parsed array.
 */
function parseEvidenceCriteria(raw: unknown): string[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? simplifyWellnessCriterion(v) : ''))
    .filter((v) => v.length > 0);
}

/**
 * Clean an author-supplied criteria list for storage: simplify to direct wellness
 * instructions, trim, drop empties and dedupe (case-insensitive), then clamp to at most 5.
 */
function cleanEvidenceCriteria(criteria: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of criteria) {
    const s = simplifyWellnessCriterion(typeof raw === 'string' ? raw : '');
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length === 5) break;
  }
  return out;
}

function toGuide(
  row: GuideRow,
  subjects: string[] = [],
  subjectIds: string[] = [],
  topicAliases: string[] = [],
): GuideRecord {
  return {
    id: row.id,
    slug: row.slug,
    topicTitle: row.topic_title,
    topicAliases,
    summary: row.summary?.trim() ?? '',
    intendedAudience: row.intended_audience?.trim() ?? '',
    educationLevels: cleanDiscoveryTags(row.education_levels ?? [], isEducationLevel),
    goals: cleanDiscoveryTags(row.goals ?? [], isGuideGoal),
    estimatedMinutes:
      row.estimated_minutes === null || row.estimated_minutes === undefined
        ? null
        : Number(row.estimated_minutes),
    sourceProvenance: row.source_provenance?.trim() ?? '',
    sourceReviewedAt: row.source_reviewed_at ?? null,
    body: parseBody(row.body),
    status: (row.status as GuideStatus) || 'draft',
    authorId: row.author_id,
    canonicalGroupId: row.canonical_group_id,
    subjects,
    subjectIds,
    evidenceCriteria: parseEvidenceCriteria(row.evidence_criteria),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMethod(row: GuideMethodRow): GuideMethodRecord {
  return {
    id: row.id,
    parentGuideId: row.parent_guide_id,
    title: row.title,
    body: parseBody(row.body),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Reduce a guide body to a short, plain-text lede for map hover cards: take the
 * first block's markdown content, strip the lightweight markup (headings, bold,
 * links, list bullets), collapse whitespace, and clamp to ~200 chars on a word
 * boundary. Best-effort and display-only — never used for gating or payouts.
 */
function deriveSummary(body: GuideBodyComponent[]): string {
  const first = body.find((c) => {
    const content = (c.config as { content?: unknown } | undefined)?.content;
    return typeof content === 'string' && content.trim().length > 0;
  });
  let raw = (first?.config as { content?: string } | undefined)?.content ?? '';
  // Legacy seed bodies open with a "# Title" heading that just echoes the topic
  // title; drop that whole first line so the lede starts at the real sentence.
  raw = raw.trimStart();
  if (raw.startsWith('#')) {
    const newline = raw.indexOf('\n');
    raw = newline >= 0 ? raw.slice(newline + 1) : '';
  }
  const text = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= 200) return text;
  const clipped = text.slice(0, 200);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 120 ? lastSpace : 200).trimEnd()}…`;
}

async function getSubjectsForGuides(guideIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (guideIds.length === 0) return map;
  const rows = await sqlQuery<Array<{ guide_id: string; subject: string }>>(
    `SELECT guide_id, subject FROM guide_subjects
     WHERE guide_id = ANY(:ids)
     ORDER BY subject ASC`,
    { ids: guideIds },
  );
  for (const r of rows) {
    const list = map.get(r.guide_id);
    if (list) list.push(r.subject);
    else map.set(r.guide_id, [r.subject]);
  }
  return map;
}

async function getSubjectIdsForGuides(guideIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (guideIds.length === 0) return map;
  const rows = await sqlQuery<Array<{ guide_id: string; subject_id: string }>>(
    `SELECT guide_id, subject_id FROM guide_subjects
     WHERE guide_id = ANY(:ids) AND subject_id IS NOT NULL
     ORDER BY subject ASC`,
    { ids: guideIds },
  );
  for (const row of rows) {
    const list = map.get(row.guide_id);
    if (list) list.push(row.subject_id);
    else map.set(row.guide_id, [row.subject_id]);
  }
  return map;
}

async function getTopicAliasesForGuides(guideIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (guideIds.length === 0) return map;
  const rows = await sqlQuery<Array<{ guide_id: string; alias: string }>>(
    `SELECT guide_id, alias FROM guide_topic_aliases
     WHERE guide_id = ANY(:ids)
     ORDER BY alias ASC`,
    { ids: guideIds },
  );
  for (const row of rows) {
    const list = map.get(row.guide_id);
    if (list) list.push(row.alias);
    else map.set(row.guide_id, [row.alias]);
  }
  return map;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getGuideBySlug(slug: string): Promise<GuideRecord | null> {
  await ensureGuidesSchema();
  const rows = await sqlQuery<GuideRow[]>(
    `SELECT * FROM guides WHERE slug = :slug`,
    { slug },
  );
  if (!rows[0]) return null;
  const [subjects, subjectIds, topicAliases] = await Promise.all([
    getSubjectsForGuides([rows[0].id]),
    getSubjectIdsForGuides([rows[0].id]),
    getTopicAliasesForGuides([rows[0].id]),
  ]);
  return toGuide(
    rows[0],
    subjects.get(rows[0].id) ?? [],
    subjectIds.get(rows[0].id) ?? [],
    topicAliases.get(rows[0].id) ?? [],
  );
}

export async function listGuides(filter?: {
  subject?: string;
  status?: GuideStatus;
  statuses?: GuideStatus[];
  authorId?: string;
}): Promise<GuideRecord[]> {
  await ensureGuidesSchema();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter?.status) {
    clauses.push('g.status = :status');
    params.status = filter.status;
  }
  if (filter?.statuses && filter.statuses.length > 0) {
    clauses.push('g.status = ANY(:statuses)');
    params.statuses = filter.statuses;
  }
  if (filter?.authorId) {
    clauses.push('g.author_id = :authorId');
    params.authorId = filter.authorId;
  }
  if (filter?.subject) {
    clauses.push(
      'EXISTS (SELECT 1 FROM guide_subjects gs WHERE gs.guide_id = g.id AND gs.subject = :subject)',
    );
    params.subject = filter.subject;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await sqlQuery<GuideRow[]>(
    `SELECT g.* FROM guides g ${where} ORDER BY g.topic_title ASC`,
    params,
  );
  const ids = rows.map((row) => row.id);
  const [subjects, subjectIds, topicAliases] = await Promise.all([
    getSubjectsForGuides(ids),
    getSubjectIdsForGuides(ids),
    getTopicAliasesForGuides(ids),
  ]);
  return rows.map((row) =>
    toGuide(
      row,
      subjects.get(row.id) ?? [],
      subjectIds.get(row.id) ?? [],
      topicAliases.get(row.id) ?? [],
    ),
  );
}

export async function listGuideSubjectCatalog(): Promise<GuideSubjectDefinition[]> {
  return sqlQuery<GuideSubjectDefinition[]>(
    `SELECT
       id,
       label,
       description,
       aliases,
       sort_order AS "sortOrder"
     FROM guide_subject_catalog
     ORDER BY sort_order ASC, label ASC`,
  );
}

export async function getGuideMethods(guideId: string): Promise<GuideMethodRecord[]> {
  const rows = await sqlQuery<GuideMethodRow[]>(
    `SELECT * FROM guide_methods WHERE parent_guide_id = :guideId ORDER BY sort_order ASC, created_at ASC`,
    { guideId },
  );
  return rows.map(toMethod);
}

/** Direct prerequisites of a guide (one hop up). */
export async function getDirectPrereqs(guideId: string): Promise<GuideLink[]> {
  return sqlQuery<GuideLink[]>(
    `SELECT g.id, g.slug, g.topic_title AS "topicTitle", g.status
     FROM guide_edges e
     JOIN guides g ON g.id = e.prereq_id
     WHERE e.guide_id = :guideId
     ORDER BY g.topic_title ASC`,
    { guideId },
  );
}

/** Direct dependents of a guide (one hop down). */
export async function getDirectDependents(guideId: string): Promise<GuideLink[]> {
  return sqlQuery<GuideLink[]>(
    `SELECT g.id, g.slug, g.topic_title AS "topicTitle", g.status
     FROM guide_edges e
     JOIN guides g ON g.id = e.guide_id
     WHERE e.prereq_id = :guideId
     ORDER BY g.topic_title ASC`,
    { guideId },
  );
}

/**
 * Returns the "frontier" for a user: PUBLISHED guides they have NOT completed,
 * whose direct prereqs are ALL satisfied. A prereq only gates when it is itself
 * published — draft/unpublished prereqs don't block, mirroring completeGuide's
 * gate above (`p.status = 'published'`) so a guide never appears here that
 * completeGuide would then reject with a 409. Guides with zero published
 * prereqs (primitives) are included — the frontier for a brand-new user.
 *
 * Single query, no N+1: prereqCount is a scalar subquery per row, and the gate
 * itself is a correlated NOT EXISTS, both evaluated by Postgres per candidate
 * guide rather than fetched round-trip by round-trip.
 */
export async function getFrontierGuides(userId: string): Promise<FrontierGuide[]> {
  return sqlQuery<FrontierGuide[]>(
    `SELECT
       g.id,
       g.slug,
       g.topic_title AS "topicTitle",
       g.status,
       g.summary,
       g.estimated_minutes AS "estimatedMinutes",
       (
         SELECT COUNT(*)::int
         FROM guide_edges pe
         JOIN guides pg ON pg.id = pe.prereq_id AND pg.status = 'published'
         WHERE pe.guide_id = g.id
       ) AS "prereqCount",
       COALESCE((
         SELECT array_agg(pg2.topic_title ORDER BY gp3.completed_at DESC)
         FROM guide_edges pe2
         JOIN guides pg2 ON pg2.id = pe2.prereq_id AND pg2.status = 'published'
         JOIN guide_progress gp3
           ON gp3.guide_id = pe2.prereq_id AND gp3.user_id = :userId
         WHERE pe2.guide_id = g.id
       ), ARRAY[]::varchar[]) AS "unlockedBy",
       (
         SELECT MAX(gp4.completed_at)
         FROM guide_edges pe3
         JOIN guides pg3 ON pg3.id = pe3.prereq_id AND pg3.status = 'published'
         JOIN guide_progress gp4
           ON gp4.guide_id = pe3.prereq_id AND gp4.user_id = :userId
         WHERE pe3.guide_id = g.id
       ) AS "lastUnlockAt"
     FROM guides g
     WHERE g.status = 'published'
       AND NOT EXISTS (
         SELECT 1 FROM guide_progress gp
         WHERE gp.user_id = :userId AND gp.guide_id = g.id
       )
       AND NOT EXISTS (
         SELECT 1
         FROM guide_edges e
         JOIN guides pr ON pr.id = e.prereq_id AND pr.status = 'published'
         WHERE e.guide_id = g.id
           AND NOT EXISTS (
             SELECT 1 FROM guide_progress gp2
             WHERE gp2.user_id = :userId AND gp2.guide_id = e.prereq_id
           )
       )
     ORDER BY "prereqCount" ASC, g.topic_title ASC`,
    { userId },
  );
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function createGuide(input: {
  slug: string;
  topicTitle: string;
  topicAliases?: string[];
  summary?: string;
  intendedAudience?: string;
  educationLevels?: EducationLevel[];
  goals?: GuideGoal[];
  estimatedMinutes?: number | null;
  sourceProvenance?: string;
  sourceReviewedAt?: string | null;
  body?: GuideBodyComponent[];
  authorId?: string | null;
  status?: GuideStatus;
  evidenceCriteria?: string[];
  subjectIds?: string[];
}): Promise<GuideRecord> {
  await ensureGuidesSchema();
  // NULL (not an empty array) when no criteria are supplied, keeping the column's
  // "author hasn't set these yet" semantics distinct from "set to none".
  const criteria =
    input.evidenceCriteria !== undefined
      ? cleanEvidenceCriteria(input.evidenceCriteria)
      : null;
  const rows = await sqlQuery<GuideRow[]>(
    `INSERT INTO guides (
       slug,
       topic_title,
       summary,
       intended_audience,
       education_levels,
       goals,
       estimated_minutes,
       source_provenance,
       source_reviewed_at,
       body,
       author_id,
       status,
       evidence_criteria
     )
     VALUES (
       :slug,
       :topicTitle,
       :summary,
       :intendedAudience,
       :educationLevels,
       :goals,
       :estimatedMinutes,
       :sourceProvenance,
       :sourceReviewedAt,
       :body::jsonb,
       :authorId,
       :status,
       :evidenceCriteria::jsonb
     )
     RETURNING *`,
    {
      slug: input.slug,
      topicTitle: input.topicTitle,
      summary: input.summary?.trim() || null,
      intendedAudience: input.intendedAudience?.trim() || null,
      educationLevels: cleanDiscoveryTags(input.educationLevels, isEducationLevel),
      goals: cleanDiscoveryTags(input.goals, isGuideGoal),
      estimatedMinutes: input.estimatedMinutes ?? null,
      sourceProvenance: input.sourceProvenance?.trim() || null,
      sourceReviewedAt: input.sourceReviewedAt ?? null,
      body: JSON.stringify(input.body ?? []),
      authorId: input.authorId ?? null,
      status: input.status ?? 'draft',
      evidenceCriteria: criteria ? JSON.stringify(criteria) : null,
    },
  );
  if (input.subjectIds !== undefined) {
    await setGuideCanonicalSubjects(rows[0].id, input.subjectIds);
  }
  if (input.topicAliases !== undefined) {
    await setGuideTopicAliases(rows[0].id, input.topicAliases, input.topicTitle);
  }
  const [subjects, subjectIds, aliases] = await Promise.all([
    getSubjectsForGuides([rows[0].id]),
    getSubjectIdsForGuides([rows[0].id]),
    getTopicAliasesForGuides([rows[0].id]),
  ]);
  return toGuide(
    rows[0],
    subjects.get(rows[0].id) ?? [],
    subjectIds.get(rows[0].id) ?? [],
    aliases.get(rows[0].id) ?? [],
  );
}

/**
 * Updates a guide's editable content (topic title, body, subjects). Author-only
 * enforcement lives in the route; this function just writes. Subjects, when
 * provided, fully replace the existing set. The slug is intentionally immutable
 * after creation (it's the guide's public URL and canonical identity).
 */
export async function updateGuide(input: {
  id: string;
  topicTitle?: string;
  topicAliases?: string[];
  summary?: string;
  intendedAudience?: string;
  educationLevels?: EducationLevel[];
  goals?: GuideGoal[];
  estimatedMinutes?: number | null;
  sourceProvenance?: string;
  sourceReviewedAt?: string | null;
  body?: GuideBodyComponent[];
  subjects?: string[];
  subjectIds?: string[];
  evidenceCriteria?: string[];
}): Promise<GuideRecord> {
  await ensureGuidesSchema();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id: input.id };

  if (typeof input.topicTitle === 'string') {
    sets.push('topic_title = :topicTitle');
    params.topicTitle = input.topicTitle;
  }
  if (typeof input.summary === 'string') {
    sets.push('summary = :summary');
    params.summary = input.summary.trim() || null;
  }
  if (typeof input.intendedAudience === 'string') {
    sets.push('intended_audience = :intendedAudience');
    params.intendedAudience = input.intendedAudience.trim() || null;
  }
  if (input.educationLevels !== undefined) {
    sets.push('education_levels = :educationLevels');
    params.educationLevels = cleanDiscoveryTags(input.educationLevels, isEducationLevel);
  }
  if (input.goals !== undefined) {
    sets.push('goals = :goals');
    params.goals = cleanDiscoveryTags(input.goals, isGuideGoal);
  }
  if (input.estimatedMinutes !== undefined) {
    sets.push('estimated_minutes = :estimatedMinutes');
    params.estimatedMinutes = input.estimatedMinutes;
  }
  if (typeof input.sourceProvenance === 'string') {
    sets.push('source_provenance = :sourceProvenance');
    params.sourceProvenance = input.sourceProvenance.trim() || null;
  }
  if (input.sourceReviewedAt !== undefined) {
    sets.push('source_reviewed_at = :sourceReviewedAt');
    params.sourceReviewedAt = input.sourceReviewedAt;
  }
  if (input.body !== undefined) {
    sets.push('body = :body::jsonb');
    params.body = JSON.stringify(input.body);
  }
  if (input.evidenceCriteria !== undefined) {
    // An empty list clears the column back to NULL.
    const cleaned = cleanEvidenceCriteria(input.evidenceCriteria);
    sets.push('evidence_criteria = :evidenceCriteria::jsonb');
    params.evidenceCriteria = cleaned.length ? JSON.stringify(cleaned) : null;
  }

  if (sets.length > 0) {
    sets.push('updated_at = CURRENT_TIMESTAMP');
    await sqlQuery(
      `UPDATE guides SET ${sets.join(', ')} WHERE id = :id`,
      params,
    );
  }

  if (input.subjects !== undefined) {
    await setGuideSubjects(input.id, input.subjects);
  }
  if (input.subjectIds !== undefined) {
    await setGuideCanonicalSubjects(input.id, input.subjectIds);
  }
  if (input.topicAliases !== undefined) {
    await setGuideTopicAliases(input.id, input.topicAliases, input.topicTitle);
  }

  const rows = await sqlQuery<GuideRow[]>(`SELECT * FROM guides WHERE id = :id`, { id: input.id });
  if (!rows[0]) {
    throw Object.assign(new Error('Guide not found.'), { status: 404 });
  }
  const [subjects, subjectIds, topicAliases] = await Promise.all([
    getSubjectsForGuides([input.id]),
    getSubjectIdsForGuides([input.id]),
    getTopicAliasesForGuides([input.id]),
  ]);
  return toGuide(
    rows[0],
    subjects.get(input.id) ?? [],
    subjectIds.get(input.id) ?? [],
    topicAliases.get(input.id) ?? [],
  );
}

/**
 * Replaces a guide's subject tags with the given (deduped, trimmed) set.
 */
export async function setGuideSubjects(guideId: string, subjects: string[]): Promise<void> {
  const cleaned = Array.from(
    new Set(subjects.map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 24);

  await sqlQuery(`DELETE FROM guide_subjects WHERE guide_id = :guideId`, { guideId });
  for (const subject of cleaned) {
    await sqlQuery(
      `INSERT INTO guide_subjects (guide_id, subject) VALUES (:guideId, :subject)
       ON CONFLICT (guide_id, subject) DO NOTHING`,
      { guideId, subject },
    );
  }
}

export async function setGuideCanonicalSubjects(
  guideId: string,
  subjectIds: string[],
): Promise<void> {
  const cleaned = Array.from(
    new Set(subjectIds.map((id) => id.trim()).filter(Boolean)),
  ).slice(0, 12);
  await withTransaction(async (client) => {
    const catalog = cleaned.length
      ? await sqlQueryWithClient<Array<{ id: string; label: string }>>(
          client,
          `SELECT id, label
           FROM guide_subject_catalog
           WHERE id = ANY(:ids)`,
          { ids: cleaned },
        )
      : [];
    if (catalog.length !== cleaned.length) {
      throw Object.assign(new Error('One or more subjects are unavailable.'), { status: 400 });
    }

    const byId = new Map(catalog.map((subject) => [subject.id, subject.label]));
    await sqlQueryWithClient(
      client,
      `DELETE FROM guide_subjects WHERE guide_id = :guideId`,
      { guideId },
    );
    for (const subjectId of cleaned) {
      await sqlQueryWithClient(
        client,
        `INSERT INTO guide_subjects (guide_id, subject, subject_id)
         VALUES (:guideId, :subject, :subjectId)
         ON CONFLICT (guide_id, subject) DO UPDATE SET subject_id = EXCLUDED.subject_id`,
        { guideId, subject: byId.get(subjectId), subjectId },
      );
    }
  });
}

export async function setGuideTopicAliases(
  guideId: string,
  aliases: string[],
  topicTitle?: string,
): Promise<void> {
  let canonicalTitle = topicTitle;
  await withTransaction(async (client) => {
    if (!canonicalTitle) {
      const rows = await sqlQueryWithClient<Array<{ topic_title: string }>>(
        client,
        `SELECT topic_title FROM guides WHERE id = :guideId`,
        { guideId },
      );
      canonicalTitle = rows[0]?.topic_title;
    }
    const titleKey = canonicalTitle?.trim().toLowerCase();
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of aliases) {
      const alias = raw.trim().replace(/\s+/g, ' ').slice(0, 255);
      const key = alias.toLowerCase();
      if (!alias || key === titleKey || seen.has(key)) continue;
      seen.add(key);
      cleaned.push(alias);
      if (cleaned.length === 12) break;
    }

    await sqlQueryWithClient(
      client,
      `DELETE FROM guide_topic_aliases WHERE guide_id = :guideId`,
      { guideId },
    );
    for (const alias of cleaned) {
      await sqlQueryWithClient(
        client,
        `INSERT INTO guide_topic_aliases (guide_id, alias)
         VALUES (:guideId, :alias)`,
        { guideId, alias },
      );
    }
  });
}

/**
 * Adds a prerequisite edge (prereqId → guideId). The DB cycle-guard trigger
 * rejects edges that would introduce a cycle by raising a P0001 exception; the
 * calling route catches that and surfaces a clean 400. Idempotent on the unique
 * (prereq_id, guide_id) pair.
 */
export async function addGuidePrereq(guideId: string, prereqId: string): Promise<void> {
  if (guideId === prereqId) {
    throw Object.assign(new Error('A guide cannot be its own prerequisite.'), { status: 400 });
  }
  await sqlQuery(
    `INSERT INTO guide_edges (prereq_id, guide_id) VALUES (:prereqId, :guideId)
     ON CONFLICT (prereq_id, guide_id) DO NOTHING`,
    { guideId, prereqId },
  );
}

/**
 * Removes a prerequisite edge (prereqId → guideId). No-op if the edge is absent.
 */
export async function removeGuidePrereq(guideId: string, prereqId: string): Promise<void> {
  await sqlQuery(
    `DELETE FROM guide_edges WHERE prereq_id = :prereqId AND guide_id = :guideId`,
    { guideId, prereqId },
  );
}

/**
 * Searches PUBLISHED guides by topic title / slug for the prerequisite picker.
 * Excludes the given guide id (a guide can never be its own prereq). Only
 * published guides are eligible prerequisites — a draft can't gate a learner.
 */
export async function searchPublishedGuides(input: {
  query?: string;
  excludeId?: string;
  limit?: number;
}): Promise<GuideLink[]> {
  const clauses: string[] = [`g.status = 'published'`];
  const params: Record<string, unknown> = {};

  if (input.excludeId) {
    clauses.push('g.id != :excludeId');
    params.excludeId = input.excludeId;
  }
  if (input.query && input.query.trim()) {
    clauses.push(`(
      g.topic_title ILIKE :q
      OR g.slug ILIKE :q
      OR EXISTS (
        SELECT 1
        FROM guide_topic_aliases gta
        WHERE gta.guide_id = g.id AND gta.alias ILIKE :q
      )
    )`);
    params.q = `%${input.query.trim()}%`;
  }

  return sqlQuery<GuideLink[]>(
    `SELECT g.id, g.slug, g.topic_title AS "topicTitle", g.status
     FROM guides g
     WHERE ${clauses.join(' AND ')}
     ORDER BY g.topic_title ASC
     LIMIT :limit`,
    { ...params, limit: Math.min(Math.max(input.limit ?? 20, 1), 50) },
  );
}

/** A chat-search match: link fields plus the copy Blue's inline cards show. */
export interface GuideChatMatch extends GuideLink {
  summary: string | null;
  estimatedMinutes: number | null;
}

/**
 * Token-based search over PUBLISHED guides for Blue's chat guide finder.
 * Each token is matched (ILIKE substring) against the topic title, topic
 * aliases, and summary; title/alias hits score double so a guide named for the
 * topic outranks one that only mentions it in passing. Zero tokens returns []
 * — the caller decides what "no query" means (the recommend route falls back
 * to the frontier).
 */
export async function searchGuidesForChat(
  tokens: string[],
  limit = 3,
): Promise<GuideChatMatch[]> {
  const pats = tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `%${t}%`);
  if (pats.length === 0) return [];

  return sqlQuery<GuideChatMatch[]>(
    `SELECT id, slug, "topicTitle", status, summary, "estimatedMinutes"
     FROM (
       SELECT
         g.id,
         g.slug,
         g.topic_title AS "topicTitle",
         g.status,
         g.summary,
         g.estimated_minutes AS "estimatedMinutes",
         (
           SELECT COALESCE(SUM(
             CASE
               WHEN g.topic_title ILIKE pat OR EXISTS (
                 SELECT 1 FROM guide_topic_aliases gta
                 WHERE gta.guide_id = g.id AND gta.alias ILIKE pat
               ) THEN 2
               WHEN COALESCE(g.summary, '') ILIKE pat THEN 1
               ELSE 0
             END
           ), 0)::int
           FROM unnest(:pats::text[]) AS pat
         ) AS score
       FROM guides g
       WHERE g.status = 'published'
     ) scored
     WHERE score > 0
     ORDER BY score DESC, "topicTitle" ASC
     LIMIT :limit`,
    { pats, limit: Math.min(Math.max(limit, 1), 10) },
  );
}

// ── Forward references ─────────────────────────────────────────────────────────

/**
 * Declares a forward reference: "this guide depends on topic X, which does not
 * yet exist as a guide." The ref is unresolved until a guide with a matching
 * topic_title is created (see resolveForwardRefs). Unresolved refs do not
 * participate in DAG level computation or walkthrough gating.
 */
export async function createForwardRef(
  guideId: string,
  topicTitle: string,
  userId: string,
): Promise<ForwardRef> {
  const rows = await sqlQuery<ForwardRef[]>(
    `INSERT INTO guide_forward_refs (guide_id, topic_title, created_by)
     VALUES (:guideId, :topicTitle, :userId)
     RETURNING
       id,
       guide_id AS "guideId",
       topic_title AS "topicTitle",
       created_by AS "createdBy",
       resolved_guide_id AS "resolvedGuideId",
       created_at AS "createdAt",
       resolved_at AS "resolvedAt"`,
    { guideId, topicTitle, userId },
  );
  return rows[0];
}

export async function removeForwardRef(refId: string): Promise<void> {
  await sqlQuery(`DELETE FROM guide_forward_refs WHERE id = :id`, { id: refId });
}

export async function getForwardRefs(guideId: string): Promise<ForwardRef[]> {
  return sqlQuery<ForwardRef[]>(
    `SELECT
       id,
       guide_id AS "guideId",
       topic_title AS "topicTitle",
       created_by AS "createdBy",
       resolved_guide_id AS "resolvedGuideId",
       created_at AS "createdAt",
       resolved_at AS "resolvedAt"
     FROM guide_forward_refs
     WHERE guide_id = :guideId
     ORDER BY created_at ASC`,
    { guideId },
  );
}

/**
 * Called after a guide is created. Finds any unresolved forward refs whose
 * topic_title matches the new guide's title (case-insensitive) and resolves
 * them: inserts an actual guide_edges row and marks the ref as resolved.
 *
 * Returns the number of refs resolved. Edges that would create a cycle are
 * silently skipped (the ref is still marked resolved so it is not re-tried).
 */
export async function resolveForwardRefs(guideId: string): Promise<number> {
  const guide = await sqlQuery<Array<{ topic_title: string }>>(
    `SELECT topic_title FROM guides WHERE id = :id`,
    { id: guideId },
  );
  if (!guide[0]) return 0;

  const refs = await sqlQuery<Array<{ id: string; guide_id: string }>>(
    `SELECT fr.id, fr.guide_id
     FROM guide_forward_refs fr
     WHERE LOWER(fr.topic_title) = LOWER(:topicTitle) AND fr.resolved_guide_id IS NULL`,
    { topicTitle: guide[0].topic_title },
  );

  if (refs.length === 0) return 0;

  for (const ref of refs) {
    try {
      await sqlQuery(
        `INSERT INTO guide_edges (prereq_id, guide_id) VALUES (:prereqId, :guideId)
         ON CONFLICT (prereq_id, guide_id) DO NOTHING`,
        { prereqId: guideId, guideId: ref.guide_id },
      );
    } catch {
      // Cycle guard (P0001) — skip the edge but still mark resolved.
    }
    await sqlQuery(
      `UPDATE guide_forward_refs
       SET resolved_guide_id = :resolvedGuideId, resolved_at = now()
       WHERE id = :id`,
      { resolvedGuideId: guideId, id: ref.id },
    );
  }

  return refs.length;
}

// ── Walkthrough + level computation ──────────────────────────────────────────

/**
 * Returns the full transitive prerequisite closure of `targetGuideId`
 * (including the target itself), with a COMPUTED level for each node.
 *
 * Level = longest path from a primitive (a guide with no prerequisites is
 * level 0; every other node is 1 + the max level of its direct prereqs). Because
 * the graph is a DAG (enforced by the guide_edges cycle trigger), the recursion
 * terminates.
 *
 * Only PUBLISHED prereqs are traversed (the target itself is included whatever
 * its status, so authors can preview a draft's walkthrough). This mirrors
 * completeGuide's gate — non-published guides can't be completed, don't gate,
 * and don't count toward level/walkthrough closure — so the rewards closure in
 * lib/guide-rewards-db.ts must stay in lockstep with this query.
 *
 * Recursive CTE strategy:
 *   1. `closure` collects the set of guides reachable by walking prereq edges
 *      upward from the target (the sub-DAG we care about).
 *   2. `lvl` computes longest-path levels within that closure: seed every node
 *      with a level equal to the count of its prereqs *inside the closure* (0 =
 *      a primitive), then relax — whenever a node is reached via one of its
 *      prereqs, its candidate level is prereq.level + 1. We keep the MAX per
 *      node via a final GROUP BY, which yields the longest path.
 */
export async function getWalkthrough(
  targetGuideId: string,
  userId?: string | null,
): Promise<Walkthrough | null> {
  const targetRows = await sqlQuery<Array<{ id: string }>>(
    `SELECT id FROM guides WHERE id = :id`,
    { id: targetGuideId },
  );
  if (!targetRows[0]) return null;

  const rows = await sqlQuery<
    Array<{
      id: string;
      slug: string;
      topicTitle: string;
      status: string;
      level: number;
    }>
  >(
    `
    WITH RECURSIVE closure AS (
      SELECT :target::char(36) AS id
      UNION
      SELECT e.prereq_id
      FROM guide_edges e
      JOIN closure c ON e.guide_id = c.id
      JOIN guides p ON p.id = e.prereq_id AND p.status = 'published'
    ),
    -- edges that live entirely inside the closure
    sub_edges AS (
      SELECT e.prereq_id, e.guide_id
      FROM guide_edges e
      JOIN closure a ON a.id = e.prereq_id
      JOIN closure b ON b.id = e.guide_id
    ),
    lvl AS (
      -- primitives inside the closure start at level 0
      SELECT c.id, 0 AS level
      FROM closure c
      WHERE NOT EXISTS (
        SELECT 1 FROM sub_edges se WHERE se.guide_id = c.id
      )
      UNION ALL
      -- relax: reaching a node via a prereq gives it prereq.level + 1
      SELECT se.guide_id, l.level + 1
      FROM lvl l
      JOIN sub_edges se ON se.prereq_id = l.id
    )
    SELECT
      g.id,
      g.slug,
      g.topic_title AS "topicTitle",
      g.status,
      MAX(lvl.level) AS level
    FROM lvl
    JOIN guides g ON g.id = lvl.id
    GROUP BY g.id, g.slug, g.topic_title, g.status
    ORDER BY MAX(lvl.level) ASC, g.topic_title ASC
    `,
    { target: targetGuideId },
  );

  const nodeIds = rows.map((r) => r.id);

  // Direct prereqs within the closure, for gate display in the UI.
  const prereqRows = nodeIds.length
    ? await sqlQuery<Array<{ prereq_id: string; guide_id: string }>>(
        `SELECT prereq_id, guide_id FROM guide_edges
         WHERE guide_id = ANY(:ids) AND prereq_id = ANY(:ids)`,
        { ids: nodeIds },
      )
    : [];
  const prereqMap = new Map<string, string[]>();
  for (const r of prereqRows) {
    const list = prereqMap.get(r.guide_id);
    if (list) list.push(r.prereq_id);
    else prereqMap.set(r.guide_id, [r.prereq_id]);
  }

  // Completion state for the viewer.
  const completed = new Set<string>();
  if (userId && nodeIds.length) {
    const doneRows = await sqlQuery<Array<{ guide_id: string }>>(
      `SELECT guide_id FROM guide_progress
       WHERE user_id = :userId AND guide_id = ANY(:ids)`,
      { userId, ids: nodeIds },
    );
    for (const r of doneRows) completed.add(r.guide_id);
  }

  const nodes: WalkthroughNode[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    topicTitle: r.topicTitle,
    status: (r.status as GuideStatus) || 'draft',
    level: Number(r.level) || 0,
    prereqIds: prereqMap.get(r.id) ?? [],
    completed: completed.has(r.id),
  }));

  const maxLevel = nodes.reduce((m, n) => Math.max(m, n.level), 0);
  return {
    targetId: targetGuideId,
    levels: nodes.length ? maxLevel + 1 : 0,
    nodes,
    rewardPreview: {
      guideComplete: GUIDE_COMPLETE_REWARD,
      levelClear: LEVEL_CLEAR_REWARD,
      walkthroughComplete: WALKTHROUGH_COMPLETE_REWARD,
      spinGranted: true,
    },
  };
}

/**
 * The global knowledge map: EVERY published guide, with a level computed by
 * longest prerequisite path across the WHOLE published graph (a primitive — a
 * guide with no published prereqs — is level 0). This is the same longest-path
 * CTE technique getWalkthrough uses, but seeded from the entire published set
 * rather than one target's closure.
 *
 * Only published-to-published edges participate, exactly as getWalkthrough and
 * completeGuide's gate do: a draft prereq never gates and never shifts a level,
 * so a guide whose only prereqs are unpublished reads as a primitive here. The
 * graph is a DAG (guide_edges cycle trigger), so every node has a path back to
 * some primitive and thus appears in the `lvl` recursion.
 *
 * When `userId` is given, each node carries a `completed` flag; "unlocked" is
 * derived client-side the same way GuideSkillTree does (all direct prereqs
 * completed), so it is not duplicated here.
 */
export async function getKnowledgeMap(userId?: string | null): Promise<KnowledgeMap> {
  const rows = await sqlQuery<
    Array<{
      id: string;
      slug: string;
      topicTitle: string;
      status: string;
      level: number;
      summary: string | null;
    }>
  >(
    `
    WITH RECURSIVE pub AS (
      SELECT id FROM guides WHERE status = 'published'
    ),
    -- edges connecting two published guides
    sub_edges AS (
      SELECT e.prereq_id, e.guide_id
      FROM guide_edges e
      JOIN pub a ON a.id = e.prereq_id
      JOIN pub b ON b.id = e.guide_id
    ),
    lvl AS (
      -- primitives (no published prereq) start at level 0
      SELECT p.id, 0 AS level
      FROM pub p
      WHERE NOT EXISTS (
        SELECT 1 FROM sub_edges se WHERE se.guide_id = p.id
      )
      UNION ALL
      -- relax: reaching a node via a prereq gives it prereq.level + 1
      SELECT se.guide_id, l.level + 1
      FROM lvl l
      JOIN sub_edges se ON se.prereq_id = l.id
    )
    SELECT
      g.id,
      g.slug,
      g.topic_title AS "topicTitle",
      g.status,
      g.summary,
      MAX(lvl.level) AS level
    FROM lvl
    JOIN guides g ON g.id = lvl.id
    GROUP BY g.id, g.slug, g.topic_title, g.status, g.summary
    ORDER BY MAX(lvl.level) ASC, g.topic_title ASC
    `,
  );

  const nodeIds = rows.map((r) => r.id);
  if (nodeIds.length === 0) {
    return { levels: 0, nodes: [] };
  }

  const missingSummaryIds = rows.filter((row) => !row.summary?.trim()).map((row) => row.id);

  // Once the published node set is known, these reads are independent. Running
  // them together keeps the public landing map to two database round trips.
  const [prereqRows, doneRows, subjectsMap, bodyRows] = await Promise.all([
    sqlQuery<Array<{ prereq_id: string; guide_id: string }>>(
      `SELECT prereq_id, guide_id FROM guide_edges
       WHERE guide_id = ANY(:ids) AND prereq_id = ANY(:ids)`,
      { ids: nodeIds },
    ),
    userId
      ? sqlQuery<Array<{ guide_id: string }>>(
          `SELECT guide_id FROM guide_progress
           WHERE user_id = :userId AND guide_id = ANY(:ids)`,
          { userId, ids: nodeIds },
        )
      : Promise.resolve([]),
    getSubjectsForGuides(nodeIds),
    missingSummaryIds.length
      ? sqlQuery<Array<{ id: string; body: unknown }>>(
          `SELECT id, body FROM guides WHERE id = ANY(:ids)`,
          { ids: missingSummaryIds },
        )
      : Promise.resolve([]),
  ]);

  // Published-to-published edges among the mapped nodes → prereqIds per node.
  const prereqMap = new Map<string, string[]>();
  for (const r of prereqRows) {
    const list = prereqMap.get(r.guide_id);
    if (list) list.push(r.prereq_id);
    else prereqMap.set(r.guide_id, [r.prereq_id]);
  }

  // Completion state for the viewer.
  const completed = new Set<string>();
  for (const r of doneRows) completed.add(r.guide_id);

  // Prefer the contributor-authored summary, with a body-derived legacy fallback.
  const summaryMap = new Map(
    rows
      .filter((row) => Boolean(row.summary?.trim()))
      .map((row) => [row.id, row.summary!.trim()]),
  );
  for (const r of bodyRows) {
    summaryMap.set(r.id, deriveSummary(parseBody(r.body)));
  }

  const nodes: KnowledgeMapNode[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    topicTitle: r.topicTitle,
    status: (r.status as GuideStatus) || 'draft',
    level: Number(r.level) || 0,
    prereqIds: prereqMap.get(r.id) ?? [],
    completed: completed.has(r.id),
    subjects: subjectsMap.get(r.id) ?? [],
    summary: summaryMap.get(r.id) ?? '',
  }));

  const maxLevel = nodes.reduce((m, n) => Math.max(m, n.level), 0);
  return { levels: maxLevel + 1, nodes };
}

// ── Progress ─────────────────────────────────────────────────────────────────

export async function getUserGuideProgress(userId: string): Promise<Set<string>> {
  const rows = await sqlQuery<Array<{ guide_id: string }>>(
    `SELECT guide_id FROM guide_progress WHERE user_id = :userId`,
    { userId },
  );
  return new Set(rows.map((r) => r.guide_id));
}

export interface GuideProgressStats {
  totalGuides: number;
  completedGuides: number;
  totalDiamondsEarned: number;
  subjects: Array<{ subject: string; total: number; completed: number }>;
  lastCompletedAt: string | null;
}

export async function getGuideProgressStats(userId: string): Promise<GuideProgressStats> {
  const [[totalRow], [diamondRow], subjectRows, [lastRow]] = await Promise.all([
    sqlQuery<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM guides WHERE status = 'published'`,
    ),
    sqlQuery<Array<{ sum: number | null }>>(
      `SELECT SUM(diamonds)::int AS sum FROM guide_diamond_claims WHERE user_id = :userId`,
      { userId },
    ),
    sqlQuery<Array<{ subject: string; total: number; completed: number }>>(
      `SELECT
         gs.subject,
         COUNT(*)::int AS total,
         COUNT(gp.id) FILTER (WHERE gp.user_id = :userId)::int AS completed
       FROM guide_subjects gs
       JOIN guides g ON g.id = gs.guide_id AND g.status = 'published'
       LEFT JOIN guide_progress gp ON gp.guide_id = gs.guide_id AND gp.user_id = :userId2
       GROUP BY gs.subject
       ORDER BY gs.subject ASC`,
      { userId, userId2: userId },
    ),
    sqlQuery<Array<{ completed_at: string | null }>>(
      `SELECT MAX(completed_at)::text AS completed_at
       FROM guide_progress WHERE user_id = :userId`,
      { userId },
    ),
  ]);

  const completedCount = await sqlQuery<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM guide_progress WHERE user_id = :userId`,
    { userId },
  );

  return {
    totalGuides: totalRow?.count ?? 0,
    completedGuides: completedCount[0]?.count ?? 0,
    totalDiamondsEarned: diamondRow?.sum ?? 0,
    subjects: subjectRows,
    lastCompletedAt: lastRow?.completed_at ?? null,
  };
}

export interface AuthorGuideStats {
  totalAuthored: number;
  publishedCount: number;
  draftCount: number;
  inReviewCount: number;
  totalLearnerCompletions: number;
  totalUpvotes: number;
  totalDownvotes: number;
  guides: Array<{
    id: string;
    slug: string;
    topicTitle: string;
    status: string;
    completions: number;
    upvotes: number;
    downvotes: number;
  }>;
}

export async function getAuthorGuideStats(userId: string): Promise<AuthorGuideStats> {
  const guideRows = await sqlQuery<
    Array<{
      id: string;
      slug: string;
      topic_title: string;
      status: string;
      completions: number;
    }>
  >(
    `SELECT
       g.id, g.slug, g.topic_title, g.status,
       COUNT(gp.id)::int AS completions
     FROM guides g
     LEFT JOIN guide_progress gp ON gp.guide_id = g.id
     WHERE g.author_id = :userId
     GROUP BY g.id, g.slug, g.topic_title, g.status
     ORDER BY g.topic_title ASC`,
    { userId },
  );

  const guideIds = guideRows.map((r) => r.id);

  const voteRows = guideIds.length
    ? await sqlQuery<Array<{ guide_id: string; direction: string; count: number }>>(
        `SELECT guide_id, direction, COUNT(*)::int AS count
         FROM guide_votes
         WHERE guide_id = ANY(:ids)
         GROUP BY guide_id, direction`,
        { ids: guideIds },
      )
    : [];

  const voteMap = new Map<string, { up: number; down: number }>();
  for (const v of voteRows) {
    const entry = voteMap.get(v.guide_id) ?? { up: 0, down: 0 };
    if (v.direction === 'up') entry.up += v.count;
    else entry.down += v.count;
    voteMap.set(v.guide_id, entry);
  }

  let totalCompletions = 0;
  let totalUpvotes = 0;
  let totalDownvotes = 0;
  let published = 0;
  let draft = 0;
  let inReview = 0;

  const guides = guideRows.map((r) => {
    const votes = voteMap.get(r.id) ?? { up: 0, down: 0 };
    totalCompletions += r.completions;
    totalUpvotes += votes.up;
    totalDownvotes += votes.down;
    if (r.status === 'published') published++;
    else if (r.status === 'draft') draft++;
    else if (r.status === 'pending_verification') inReview++;
    return {
      id: r.id,
      slug: r.slug,
      topicTitle: r.topic_title,
      status: r.status,
      completions: r.completions,
      upvotes: votes.up,
      downvotes: votes.down,
    };
  });

  return {
    totalAuthored: guideRows.length,
    publishedCount: published,
    draftCount: draft,
    inReviewCount: inReview,
    totalLearnerCompletions: totalCompletions,
    totalUpvotes,
    totalDownvotes,
    guides,
  };
}

/**
 * Marks a guide complete for a user, enforcing two gates:
 *   1. Only PUBLISHED guides can be completed — drafts never pass the verifier
 *      jury, so completing one must not be possible (it feeds the diamond
 *      reward path). Throws a 403 error (with .status) otherwise.
 *   2. Every DIRECT prereq of the guide must already be in guide_progress for
 *      this user. Throws a 409 error (with .status) listing the missing
 *      prereqs otherwise.
 * Idempotent.
 */
export async function completeGuide(
  userId: string,
  guideId: string,
): Promise<{ completedAt: string }> {
  const guideRows = await sqlQuery<Array<{ id: string; topic_title: string; status: string }>>(
    `SELECT id, topic_title, status FROM guides WHERE id = :guideId`,
    { guideId },
  );
  if (!guideRows[0]) {
    throw Object.assign(new Error('Guide not found.'), { status: 404 });
  }
  if (guideRows[0].status !== 'published') {
    throw Object.assign(
      new Error('Only published guides can be completed.'),
      { status: 403 },
    );
  }

  // Direct PREREQs the user has NOT completed yet. Only published prereqs gate
  // completion — draft/unpublished guides (e.g. auto-resolved forward refs)
  // are not blocked.
  const missing = await sqlQuery<Array<{ topic_title: string }>>(
    `SELECT p.topic_title
     FROM guide_edges e
     JOIN guides p ON p.id = e.prereq_id
     WHERE e.guide_id = :guideId
       AND p.status = 'published'
       AND NOT EXISTS (
         SELECT 1 FROM guide_progress gp
         WHERE gp.user_id = :userId AND gp.guide_id = e.prereq_id
       )
     ORDER BY p.topic_title ASC`,
    { guideId, userId },
  );

  if (missing.length > 0) {
    const names = missing.map((m) => m.topic_title).join(', ');
    throw Object.assign(
      new Error(`Complete the prerequisite guide(s) first: ${names}.`),
      { status: 409 },
    );
  }

  const rows = await sqlQuery<Array<{ completed_at: string }>>(
    `INSERT INTO guide_progress (user_id, guide_id)
     VALUES (:userId, :guideId)
     ON CONFLICT (user_id, guide_id) DO UPDATE SET completed_at = guide_progress.completed_at
     RETURNING completed_at`,
    { userId, guideId },
  );
  return { completedAt: rows[0].completed_at };
}
