import { NextResponse } from 'next/server';
import { optionalUser } from '@/lib/guide-api-auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getFrontierGuides, getWalkthrough, getGuideBySlug, searchGuidesForChat } from '@/lib/guides-db';
import type { GuideRecommendCard, GuideRecommendResponse } from '@/lib/guide-api-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CARDS = 3;

const MOOD_TOPIC_PATHS: Record<string, string[]> = {
  worry: ['mindful-breathing', 'cognitive-reframing', 'attention-basics'],
  stress: ['mindful-breathing', 'building-a-daily-practice', 'attention-basics'],
  heartbreak: ['journaling-practice', 'emotional-vocabulary'],
  notsure: ['emotional-vocabulary', 'attention-basics'],
};

/** Filler words dropped before matching, so "i want to learn about breathing"
    searches on "breathing" and phrasing never dilutes the score. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'about', 'with', 'into', 'from', 'that', 'this',
  'what', 'how', 'can', 'could', 'would', 'should', 'want', 'wanna', 'like',
  'learn', 'learning', 'study', 'studying', 'understand', 'understanding',
  'know', 'knowing', 'guide', 'guides', 'better', 'more', 'some', 'any',
  'please', 'you', 'your', 'them', 'they', 'get', 'getting', 'start',
  'starting', 'help', 'need',
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 8);
}

async function getPrimitiveGuides(limit = MAX_CARDS): Promise<GuideRecommendCard[]> {
  const rows = await sqlQuery<Array<{
    id: string;
    slug: string;
    topicTitle: string;
    summary: string | null;
    estimatedMinutes: number | null;
  }>>(
    `SELECT g.id, g.slug, g.topic_title AS "topicTitle", g.summary, g.estimated_minutes AS "estimatedMinutes"
     FROM guides g
     WHERE g.status = 'published'
       AND NOT EXISTS (
         SELECT 1 FROM guide_edges pe
         JOIN guides pg ON pg.id = pe.prereq_id AND pg.status = 'published'
         WHERE pe.guide_id = g.id
       )
     ORDER BY g.topic_title ASC
     LIMIT :limit`,
    { limit },
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    topicTitle: r.topicTitle,
    summary: r.summary,
    estimatedMinutes: r.estimatedMinutes,
    completed: false,
    ready: true,
    prereqs: [],
  }));
}

/**
 * GET /api/guides/recommend — knowledge-node cards for Blue's chat.
 *
 * Guarantees that Blue only recommends unlocked, accessible nodes so the user
 * is never navigated to a non-completed/locked node.
 * - With `?mood=`: recommends unlocked nodes for that emotion (or the unlocked
 *   groundwork node required to reach the target).
 * - With `?q=`: token-search the published DAG, recommending unlocked entry points
 *   if the matched guide has pending prerequisites.
 * - Without `q` or `mood`: returns caller's frontier guides (or primitives if unauthenticated).
 */
export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await optionalUser(request);
  const userId = user?.userId ?? null;

  const url = new URL(request.url);
  const mood = url.searchParams.get('mood')?.trim().toLowerCase() ?? '';
  const q = url.searchParams.get('q')?.trim() ?? '';

  // 1. Mood recommendation: returns unlocked learning nodes for the selected emotion
  if (mood && MOOD_TOPIC_PATHS[mood]) {
    const candidateSlugs = MOOD_TOPIC_PATHS[mood];
    const cards: GuideRecommendCard[] = [];
    const seenIds = new Set<string>();

    for (const slug of candidateSlugs) {
      if (cards.length >= 2) break;
      const guide = await getGuideBySlug(slug);
      if (!guide || guide.status !== 'published') continue;

      const walkthrough = userId ? await getWalkthrough(guide.id, userId) : await getWalkthrough(guide.id);
      const nodes = walkthrough?.nodes ?? [];
      const completed = nodes.find((n) => n.id === guide.id)?.completed ?? false;
      const uncompletedPrereqs = nodes
        .filter((n) => n.id !== guide.id && n.status === 'published' && !n.completed)
        .sort((a, b) => a.level - b.level);

      if (!completed && uncompletedPrereqs.length === 0) {
        // Node is unlocked and ready to study!
        if (!seenIds.has(guide.id)) {
          seenIds.add(guide.id);
          cards.push({
            id: guide.id,
            slug: guide.slug,
            topicTitle: guide.topicTitle,
            summary: guide.summary,
            estimatedMinutes: guide.estimatedMinutes,
            completed: false,
            ready: true,
            prereqs: [],
          });
        }
      } else if (!completed && uncompletedPrereqs.length > 0) {
        // Target node is locked: Blue recommends the entry-level unlocked prerequisite instead.
        const entryPrereq = uncompletedPrereqs[0];
        if (!seenIds.has(entryPrereq.id)) {
          seenIds.add(entryPrereq.id);
          const prereqGuide = await getGuideBySlug(entryPrereq.slug);
          if (prereqGuide && prereqGuide.status === 'published') {
            cards.push({
              id: prereqGuide.id,
              slug: prereqGuide.slug,
              topicTitle: prereqGuide.topicTitle,
              summary: prereqGuide.summary,
              estimatedMinutes: prereqGuide.estimatedMinutes,
              completed: false,
              ready: true,
              prereqs: [],
            });
          }
        }
      }
    }

    if (cards.length === 0) {
      const primitives = await getPrimitiveGuides(2);
      cards.push(...primitives);
    }

    return NextResponse.json({ cards, mode: 'mood' } satisfies GuideRecommendResponse);
  }

  // 2. Search query: returns unlocked nodes matching or gating the query
  if (q) {
    const matches = await searchGuidesForChat(tokenize(q), MAX_CARDS);
    const cards: GuideRecommendCard[] = [];
    const seenIds = new Set<string>();

    for (const match of matches) {
      const walkthrough = userId ? await getWalkthrough(match.id, userId) : await getWalkthrough(match.id);
      const nodes = walkthrough?.nodes ?? [];
      const completed = nodes.find((n) => n.id === match.id)?.completed ?? false;
      const uncompletedPrereqs = nodes
        .filter((n) => n.id !== match.id && n.status === 'published' && !n.completed)
        .sort((a, b) => a.level - b.level);

      if (!completed && uncompletedPrereqs.length > 0) {
        // Matched guide is locked: recommend the first unlocked prerequisite on the path
        const entryPrereq = uncompletedPrereqs[0];
        if (!seenIds.has(entryPrereq.id)) {
          seenIds.add(entryPrereq.id);
          const prereqGuide = await getGuideBySlug(entryPrereq.slug);
          if (prereqGuide && prereqGuide.status === 'published') {
            cards.push({
              id: prereqGuide.id,
              slug: prereqGuide.slug,
              topicTitle: prereqGuide.topicTitle,
              summary: prereqGuide.summary || `Groundwork required before ${match.topicTitle}.`,
              estimatedMinutes: prereqGuide.estimatedMinutes,
              completed: false,
              ready: true,
              prereqs: [],
            });
          }
        }
      } else if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        cards.push({
          id: match.id,
          slug: match.slug,
          topicTitle: match.topicTitle,
          summary: match.summary,
          estimatedMinutes: match.estimatedMinutes,
          completed,
          ready: !completed && uncompletedPrereqs.length === 0,
          prereqs: [],
        });
      }
    }

    return NextResponse.json({ cards, mode: 'search' } satisfies GuideRecommendResponse);
  }

  // 3. Default: return frontier guides (or primitives for guest users)
  if (userId) {
    const frontier = await getFrontierGuides(userId);
    const cards: GuideRecommendCard[] = frontier.slice(0, MAX_CARDS).map((g) => ({
      id: g.id,
      slug: g.slug,
      topicTitle: g.topicTitle,
      summary: g.summary,
      estimatedMinutes: g.estimatedMinutes,
      completed: false,
      ready: true,
      prereqs: [],
    }));
    return NextResponse.json({ cards, mode: 'frontier' } satisfies GuideRecommendResponse);
  }

  const primitives = await getPrimitiveGuides(MAX_CARDS);
  return NextResponse.json({ cards: primitives, mode: 'frontier' } satisfies GuideRecommendResponse);
}
