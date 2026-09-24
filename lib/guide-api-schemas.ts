/**
 * Zod API contracts for the guides API family (app/api/guides/**).
 *
 * These schemas DOCUMENT REALITY: every request-body schema mirrors the manual
 * validation the routes performed by hand, and every response schema mirrors the
 * exact JSON envelope the routes return today. They do not change any wire
 * format — a refactor, not a redesign.
 *
 * Rich DB records (GuideRecord, Walkthrough, VerificationLog, credentials,
 * stats, generated tests, disputes) are deliberately modelled as permissive
 * passthrough objects rather than re-derived field-by-field: the DB layer's own
 * exported types remain the single source of truth for those shapes, and the
 * route responses simply forward them. We type the ENVELOPE precisely and let
 * the inner records passthrough, so tightening the response type never risks
 * dropping or reshaping a field the client already consumes.
 */
import { z } from 'zod';
import { EDUCATION_LEVELS, GUIDE_GOALS } from './guide-discovery-filters';
import { RUBRIC_REASONS } from './guide-votes-db';
import type { GuideStatus } from './guides-db';

// ── Shared primitives ─────────────────────────────────────────────────────────

export const guideStatusSchema = z.enum([
  'draft',
  'pending_verification',
  'published',
  'unpublished',
  'forked',
]);
// Compile-time assurance the enum stays in lockstep with the DB union.
type _StatusMatch = GuideStatus extends z.infer<typeof guideStatusSchema>
  ? z.infer<typeof guideStatusSchema> extends GuideStatus
    ? true
    : never
  : never;

/**
 * Passthrough record — the DB layer owns the exact shape.
 *
 * Runtime validation is `z.record(z.unknown())` (accepts any object of unknown
 * values, exactly as the routes forward DB rows). The INFERRED type, however, is
 * widened to a plain `object` rather than `Record<string, unknown>`.
 *
 * Why: TypeScript interfaces (GuideRecord, Walkthrough, GuideLink, …) have no
 * implicit string index signature, so they are NOT assignable to
 * `Record<string, unknown>` under `satisfies`, even though they are perfectly
 * valid objects. Typing the passthrough slot as `object` lets the routes forward
 * their concrete DB interfaces via `satisfies` with no per-call cast, while the
 * runtime schema still validates the envelope. This is a type-level widening
 * only — no wire behavior changes.
 */
const looseRecord = z.record(z.unknown()) as unknown as z.ZodType<object>;
/** A loosely-typed guide body component array (renderers own the shape). */
const guideBodyArray = z.array(z.unknown());

// ── Request bodies ─────────────────────────────────────────────────────────────

/** POST /api/guides — create a guide. */
export const createGuideBodySchema = z.object({
  topicTitle: z.string(),
  slug: z.string().optional(),
  body: z.array(z.unknown()).optional(),
  topicAliases: z.array(z.string()).max(12).optional(),
  summary: z.string().max(280).optional(),
  intendedAudience: z.string().max(280).optional(),
  educationLevels: z.array(z.enum(EDUCATION_LEVELS)).optional(),
  goals: z.array(z.enum(GUIDE_GOALS)).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).nullable().optional(),
  sourceProvenance: z.string().max(4000).optional(),
  sourceReviewedAt: z.string().date().nullable().optional(),
  subjectIds: z.array(z.string()).max(12).optional(),
  // Observable "evidence criteria" — short strings of what a learner can do once
  // they have the topic. The studio offers 2–5; the DB layer trims/dedupes and
  // clamps to 5, so the schema stays permissive here.
  evidenceCriteria: z.array(z.string()).optional(),
});
export type CreateGuideBody = z.infer<typeof createGuideBodySchema>;

/** POST /api/guides/[slug]/vote — cast a vote. */
export const voteBodySchema = z.object({
  direction: z.enum(['up', 'down']),
  rubricReason: z.enum(RUBRIC_REASONS).optional(),
  sectionPointer: z.string().optional(),
});
export type VoteBody = z.infer<typeof voteBodySchema>;

/** POST /api/guides/progress — mark a guide complete. */
export const progressBodySchema = z.object({
  guideId: z.string(),
});
export type ProgressBody = z.infer<typeof progressBodySchema>;

/** POST /api/guides/[slug]/materials — add a material. */
export const addMaterialBodySchema = z.object({
  name: z.string(),
  linkUrl: z.string(),
  linkType: z.enum(['internal_shop', 'external']).optional(),
  rationale: z.string().trim().min(1).max(30),
  imageUrl: z.string().optional(),
  priceLabel: z.string().regex(/^\d+(?:\.\d{1,2})? USDC$/),
  sortOrder: z.number().optional(),
});
export type AddMaterialBody = z.infer<typeof addMaterialBodySchema>;

/** DELETE /api/guides/[slug]/materials — remove a material. */
export const deleteMaterialBodySchema = z.object({
  materialId: z.string(),
});
export type DeleteMaterialBody = z.infer<typeof deleteMaterialBodySchema>;

/** POST /api/guides/disputes — open a dispute. */
export const openDisputeBodySchema = z.object({
  guideId: z.string(),
  disputeType: z.string(),
  evidence: z.string(),
});
export type OpenDisputeBody = z.infer<typeof openDisputeBodySchema>;

/** POST /api/guides/disputes/vote — cast a dispute-panel verdict. */
export const disputeVoteBodySchema = z.object({
  disputeId: z.string(),
  verdict: z.string(),
  justification: z.string(),
  originalSubject: z.string().optional(),
  forkSubject: z.string().optional(),
});
export type DisputeVoteBody = z.infer<typeof disputeVoteBodySchema>;

/** POST /api/guides/verification/submit — submit a draft for verification. */
export const verificationSubmitBodySchema = z.object({
  guideId: z.string(),
});
export type VerificationSubmitBody = z.infer<typeof verificationSubmitBodySchema>;

/** POST /api/guides/verification/vote — cast a rubric-bound panel vote. */
export const verificationVoteBodySchema = z.object({
  panelId: z.string(),
  decision: z.string(),
  rubricItem: z.string(),
  justification: z.string(),
});
export type VerificationVoteBody = z.infer<typeof verificationVoteBodySchema>;

/**
 * POST /api/guides/verification/cre-score — secret-header CRE advisory callback.
 * Two call shapes (DON delivering a score, or a server trigger) share this body;
 * all fields are optional and resolved at runtime, exactly as today.
 */
export const creScoreBodySchema = z.object({
  panelId: z.string().optional(),
  guideId: z.string().optional(),
  score: z.union([z.number(), z.string()]).optional(),
  summary: z.string().optional(),
  sources: z.unknown().optional(),
  donSignature: z.string().optional(),
  trigger: z.unknown().optional(),
});
export type CreScoreBody = z.infer<typeof creScoreBodySchema>;

/** POST /api/guides/verifier-test — request a verifier-qualification test. */
export const verifierTestRequestBodySchema = z.object({
  subject: z.unknown().optional(),
  level: z.unknown().optional(),
});
export type VerifierTestRequestBody = z.infer<typeof verifierTestRequestBodySchema>;

/** POST /api/guides/verifier-test/complete — submit + grade a verifier test. */
export const verifierTestCompleteBodySchema = z.object({
  testId: z.string(),
  answers: z.record(z.unknown()),
});
export type VerifierTestCompleteBody = z.infer<typeof verifierTestCompleteBodySchema>;

// ── Response payloads ───────────────────────────────────────────────────────────

/** Shared error envelope every route emits on failure. */
export const errorResponseSchema = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** GET /api/guides — list. POST /api/guides — create (single `guide`). */
export const guidesListResponseSchema = z.object({ guides: z.array(looseRecord) });
export type GuidesListResponse = z.infer<typeof guidesListResponseSchema>;

export const guideCreateResponseSchema = z.object({ guide: looseRecord });
export type GuideCreateResponse = z.infer<typeof guideCreateResponseSchema>;

export const guideSubjectsResponseSchema = z.object({
  subjects: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    aliases: z.array(z.string()),
    sortOrder: z.number(),
  })),
});
export type GuideSubjectsResponse = z.infer<typeof guideSubjectsResponseSchema>;

/** GET /api/guides/[slug] — guide detail incl. level field. */
export const guideDetailResponseSchema = z.object({
  guide: looseRecord,
  methods: z.array(looseRecord),
  prereqs: z.array(looseRecord),
  dependents: z.array(looseRecord),
  level: z.number(),
  /** Diamonds paid for completing this guide (GUIDE_COMPLETE_REWARD). */
  completeReward: z.number(),
});
export type GuideDetailResponse = z.infer<typeof guideDetailResponseSchema>;

/** GET /api/guides/[slug]/walkthrough. */
export const walkthroughResponseSchema = z.object({
  guide: z.object({
    id: z.string(),
    slug: z.string(),
    topicTitle: z.string(),
  }),
  walkthrough: looseRecord.nullable(),
  authenticated: z.boolean(),
});
export type WalkthroughResponse = z.infer<typeof walkthroughResponseSchema>;

/** GET /api/guides/map — the whole published guide graph, personalized if signed in. */
export const knowledgeMapResponseSchema = z.object({
  map: looseRecord,
  authenticated: z.boolean(),
});
export type KnowledgeMapResponse = z.infer<typeof knowledgeMapResponseSchema>;

/** Vote totals object (also nested in the vote-cast response). */
export const voteTotalsSchema = z.object({ up: z.number(), down: z.number() });
export type VoteTotalsPayload = z.infer<typeof voteTotalsSchema>;

/** GET /api/guides/[slug]/vote — public totals only. */
export const voteTotalsResponseSchema = z.object({ totals: voteTotalsSchema });
export type VoteTotalsResponse = z.infer<typeof voteTotalsResponseSchema>;

/** POST /api/guides/[slug]/vote — cast result. */
export const voteCastResponseSchema = z.object({
  ok: z.literal(true),
  direction: z.enum(['up', 'down']),
  totals: voteTotalsSchema,
});
export type VoteCastResponse = z.infer<typeof voteCastResponseSchema>;

/**
 * GET /api/guides/recommend — Blue-chat guide cards. `mode` says how the cards
 * were chosen: 'search' (matched the caller's topic) or 'frontier' (no topic —
 * the caller's next unlocks). `prereqs` is the still-incomplete published
 * prerequisite closure, shallowest first, so the card can show the path in.
 */
export const guideRecommendCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  topicTitle: z.string(),
  summary: z.string().nullable(),
  estimatedMinutes: z.number().nullable(),
  completed: z.boolean(),
  ready: z.boolean(),
  prereqs: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    topicTitle: z.string(),
  })),
});
export type GuideRecommendCard = z.infer<typeof guideRecommendCardSchema>;

export const guideRecommendResponseSchema = z.object({
  cards: z.array(guideRecommendCardSchema),
  mode: z.enum(['search', 'frontier', 'mood']),
});
export type GuideRecommendResponse = z.infer<typeof guideRecommendResponseSchema>;

/** GET /api/guides/progress — completed guide ids. */
export const progressListResponseSchema = z.object({
  completedGuideIds: z.array(z.string()),
});
export type ProgressListResponse = z.infer<typeof progressListResponseSchema>;

/** GET /api/guides/author-stats — contribution analytics for guide authors. */
export const authorStatsResponseSchema = z.object({
  totalAuthored: z.number(),
  publishedCount: z.number(),
  draftCount: z.number(),
  inReviewCount: z.number(),
  totalLearnerCompletions: z.number(),
  totalUpvotes: z.number(),
  totalDownvotes: z.number(),
  guides: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    topicTitle: z.string(),
    status: z.string(),
    completions: z.number(),
    upvotes: z.number(),
    downvotes: z.number(),
  })),
});
export type AuthorStatsResponse = z.infer<typeof authorStatsResponseSchema>;

/** GET /api/guides/frontier — next-unlock guides for the caller. */
export const frontierGuidesResponseSchema = z.object({
  guides: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    topicTitle: z.string(),
    status: guideStatusSchema,
    prereqCount: z.number(),
    summary: z.string().nullable(),
    estimatedMinutes: z.number().nullable(),
    unlockedBy: z.array(z.string()),
    lastUnlockAt: z.string().nullable(),
  })),
});
export type FrontierGuidesResponse = z.infer<typeof frontierGuidesResponseSchema>;

/** GET /api/guides/progress/stats — aggregate progress stats. */
export const progressStatsResponseSchema = z.object({
  totalGuides: z.number(),
  completedGuides: z.number(),
  totalDiamondsEarned: z.number(),
  subjects: z.array(z.object({
    subject: z.string(),
    total: z.number(),
    completed: z.number(),
  })),
  lastCompletedAt: z.string().nullable(),
});
export type ProgressStatsResponse = z.infer<typeof progressStatsResponseSchema>;

/**
 * POST /api/guides/progress — completion result incl. diamond rewards.
 * `completedAt` mirrors completeGuide's return (a Date serialized to JSON, or a
 * string) — kept permissive to avoid reshaping the wire value.
 */
export const progressCompleteResponseSchema = z.object({
  ok: z.literal(true),
  completedAt: z.unknown(),
  diamonds: z.number(),
  levelCleared: z.boolean(),
  walkthroughComplete: z.boolean(),
  spinGranted: z.boolean(),
});
export type ProgressCompleteResponse = z.infer<typeof progressCompleteResponseSchema>;

/** GET /api/guides/[slug]/materials — list. */
export const materialsListResponseSchema = z.object({
  materials: z.array(looseRecord),
});
export type MaterialsListResponse = z.infer<typeof materialsListResponseSchema>;

/** POST /api/guides/[slug]/materials — add result. */
export const materialAddResponseSchema = z.object({
  ok: z.literal(true),
  material: looseRecord,
});
export type MaterialAddResponse = z.infer<typeof materialAddResponseSchema>;

/** DELETE /api/guides/[slug]/materials — remove result. */
export const okResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof okResponseSchema>;

/** GET /api/guides/disputes — list. */
export const disputesListResponseSchema = z.object({
  disputes: z.array(looseRecord),
});
export type DisputesListResponse = z.infer<typeof disputesListResponseSchema>;

/** POST /api/guides/disputes — open result. */
export const disputeOpenResponseSchema = z.object({
  ok: z.literal(true),
  dispute: looseRecord,
  panelMemberCount: z.number(),
});
export type DisputeOpenResponse = z.infer<typeof disputeOpenResponseSchema>;

/** POST /api/guides/disputes/vote — verdict result. */
export const disputeVoteResponseSchema = z.object({
  ok: z.literal(true),
  resolved: z.boolean(),
  status: z.string(),
  forkGuideId: z.string().nullable(),
});
export type DisputeVoteResponse = z.infer<typeof disputeVoteResponseSchema>;

/** GET /api/guides/verification/[guideId] — audit log. */
export const verificationLogResponseSchema = z.object({ log: looseRecord });
export type VerificationLogResponse = z.infer<typeof verificationLogResponseSchema>;

/** POST /api/guides/verification/submit — submission result. */
export const verificationSubmitResponseSchema = z.object({
  ok: z.literal(true),
  panelId: z.string(),
  memberCount: z.number(),
  status: z.string(),
});
export type VerificationSubmitResponse = z.infer<typeof verificationSubmitResponseSchema>;

/**
 * POST /api/guides/verification/vote — panel-vote result. `guideStatus` mirrors
 * castPanelVote's return (`string | null` — null until the panel resolves).
 */
export const verificationVoteResponseSchema = z.object({
  ok: z.literal(true),
  resolved: z.boolean(),
  panelStatus: z.string(),
  guideStatus: z.string().nullable(),
});
export type VerificationVoteResponse = z.infer<typeof verificationVoteResponseSchema>;

/**
 * POST /api/guides/verification/cre-score — one of three envelopes, depending on
 * the branch taken (DON persist, server-fallback success, or advisory
 * unavailable). Modelled as a union to document every real return shape.
 */
export const creScoreResponseSchema = z.union([
  z.object({ ok: z.literal(true), source: z.literal('don'), panelId: z.string() }),
  z.object({
    ok: z.literal(true),
    source: z.literal('server-fallback'),
    panelId: z.string(),
    score: z.number(),
  }),
  z.object({ ok: z.literal(false), message: z.string() }),
]);
export type CreScoreResponse = z.infer<typeof creScoreResponseSchema>;

/** GET /api/guides/verifier-test — the caller's credentials. */
export const verifierCredentialsResponseSchema = z.object({
  credentials: z.array(looseRecord),
});
export type VerifierCredentialsResponse = z.infer<typeof verifierCredentialsResponseSchema>;

/** POST /api/guides/verifier-test — generated test. */
export const verifierTestResponseSchema = z.object({ test: looseRecord });
export type VerifierTestResponse = z.infer<typeof verifierTestResponseSchema>;

/**
 * POST /api/guides/verifier-test/complete — grade result. The route spreads
 * `...result` (from gradeVerifierTest) alongside `ok`, so we keep the grade
 * fields passthrough and only pin `ok`.
 */
export const verifierTestCompleteResponseSchema = z
  .object({ ok: z.literal(true) })
  .passthrough();
export type VerifierTestCompleteResponse = z.infer<typeof verifierTestCompleteResponseSchema>;

/** GET /api/guides/verifier-test/stats — the caller's prestige stats. */
export const verifierStatsResponseSchema = z.object({ stats: looseRecord });
export type VerifierStatsResponse = z.infer<typeof verifierStatsResponseSchema>;

/**
 * POST|GET /api/guides/revision-check — the auto-revision sweep result.
 * The route returns `{ ok: true, ...result }` where result is runRevisionCheck's
 * shape; kept passthrough since that DB type owns the fields.
 */
export const revisionCheckResponseSchema = z
  .object({ ok: z.literal(true) })
  .passthrough();
export type RevisionCheckResponse = z.infer<typeof revisionCheckResponseSchema>;

// ── Assemble game ────────────────────────────────────────────────────────────

/** POST /api/guides/[slug]/assembly/verdict — record a verdict on one axiom. */
export const assemblyVerdictBodySchema = z.object({
  nodeId: z.string(),
  verdict: z.enum(['approve', 'flag']),
});
export type AssemblyVerdictBody = z.infer<typeof assemblyVerdictBodySchema>;

/** POST /api/guides/[slug]/assembly/suggest — VIP rewrite proposal for one axiom. */
export const assemblySuggestBodySchema = z.object({
  nodeId: z.string(),
  suggestion: z.string().trim().min(10, 'Give the rewrite at least 10 characters.').max(2000),
});
export type AssemblySuggestBody = z.infer<typeof assemblySuggestBodySchema>;

/**
 * GET /api/guides/[slug]/assembly — the guide's decomposition tree plus the
 * caller's run state. `sections` passthrough the AssemblySectionView shape
 * (lib/guide-assembly-db owns it); the envelope is pinned. `available` is false
 * for an unpublished guide or one whose body yields no axioms.
 */
export const assemblyTreeResponseSchema = z.object({
  available: z.boolean(),
  reason: z.string().optional(),
  guide: z.object({ id: z.string(), slug: z.string(), topicTitle: z.string() }),
  reward: z.number(),
  isAuthor: z.boolean(),
  authenticated: z.boolean(),
  contentVersion: z.string(),
  axiomCount: z.number(),
  verdictCount: z.number(),
  started: z.boolean(),
  claimed: z.boolean(),
  sections: z.array(looseRecord),
});
export type AssemblyTreeResponse = z.infer<typeof assemblyTreeResponseSchema>;

/** POST /api/guides/[slug]/assembly/complete — claim the completion reward. */
export const assemblyCompleteResponseSchema = z.object({
  ok: z.literal(true),
  awarded: z.boolean(),
  alreadyClaimed: z.boolean(),
  diamonds: z.number(),
  reason: z.string().optional(),
});
export type AssemblyCompleteResponse = z.infer<typeof assemblyCompleteResponseSchema>;

// ── Helper: flatten a zod error the way the routes surface it ────────────────────

/**
 * Standard 400 body for a failed safeParse. Routes return
 * `{ error, details }` — `error` keeps a stable human string, `details` carries
 * the flattened zod field/form errors for the client to inspect.
 */
export function zodErrorBody(error: z.ZodError): { error: string; details: z.inferFlattenedErrors<z.ZodTypeAny> } {
  return { error: 'Invalid request body.', details: error.flatten() };
}
