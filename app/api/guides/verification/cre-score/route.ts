import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { recordCreScore, getOpenPanelForGuide } from '@/lib/guide-verification-db';
import { processGuideAdvisoryJob } from '@/lib/ai/guide-advisory';
import { AiGatewayError } from '@/lib/ai';
import {
  creScoreBodySchema,
  zodErrorBody,
  type CreScoreResponse,
} from '@/lib/guide-api-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/guides/verification/cre-score
 *
 * Secret-header authenticated endpoint that writes an advisory score for a
 * guide's verification panel. The route name is retained for compatibility.
 * Two call shapes:
 *
 *   1. Legacy signed-score callback: this dormant compatibility branch accepts
 *      an already-produced score. It does not start or extend the DON workflow.
 *
 *   2. Server trigger: the submit route or an operator calls with
 *      { guideId, panelId, trigger: true }. The task-aware AI gateway scores
 *      published prerequisite evidence and relevant published guides.
 *
 * The score is ADVISORY input shown to the panel — it is NEVER a panel vote and
 * never changes panel or guide status.
 *
 * The Chainlink path remains dormant. This route does not mutate the guide DAG,
 * panel votes, panel status, or any reward ledger.
 */

function timingSafeStringEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const { timingSafeEqual } = require('crypto') as typeof import('crypto');
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  // Secret-header auth. Accept a dedicated CRE secret, fall back to the shared
  // internal secret used by the rest of the pipeline.
  const provided = request.headers.get('x-cre-callback-secret') || '';
  const expected = process.env.CRE_CALLBACK_SECRET || process.env.INTERNAL_API_SECRET || '';
  if (!expected || !timingSafeStringEq(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const parsed = creScoreBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  // Resolve the panel: prefer explicit panelId, else the guide's open panel.
  let panelId = typeof body.panelId === 'string' ? body.panelId : null;
  const guideId = typeof body.guideId === 'string' ? body.guideId : null;
  if (!panelId && guideId) {
    panelId = await getOpenPanelForGuide(guideId);
  }
  if (!panelId) {
    return NextResponse.json(
      { error: 'panelId (or a guideId with an open panel) is required.' },
      { status: 400 },
    );
  }

  try {
    // Path 1: DON delivered a score directly — persist it.
    if (typeof body.score === 'number' || typeof body.score === 'string') {
      await recordCreScore({
        panelId,
        score: Number(body.score),
        summary: typeof body.summary === 'string' ? body.summary : null,
        sources: body.sources ?? null,
        donSignature: typeof body.donSignature === 'string' ? body.donSignature : null,
      });
      return NextResponse.json({ ok: true, source: 'don', panelId } satisfies CreScoreResponse);
    }

    // Path 2: server-side scoring through the task-aware AI gateway.
    // Resolve the guide behind this panel.
    const panelRows = await sqlQuery<Array<{ guide_id: string }>>(
      `SELECT panel.guide_id
       FROM verifier_panels panel
       JOIN guides guide
         ON guide.id = panel.guide_id
        AND guide.status = 'pending_verification'
       WHERE panel.id = :panelId
         AND panel.status = 'open'`,
      { panelId },
    );
    const resolvedGuideId = panelRows[0]?.guide_id;
    if (!resolvedGuideId) {
      return NextResponse.json({ error: 'Open panel not found.' }, { status: 404 });
    }
    try {
      const processed = await processGuideAdvisoryJob({
        panelId,
        guideId: resolvedGuideId,
      });
      if (!processed) {
        return NextResponse.json({
          ok: false,
          message: 'Advisory review is already processing; the panel can continue.',
        } satisfies CreScoreResponse);
      }
      return NextResponse.json(
        {
          ok: true,
          source: 'server-fallback',
          panelId,
          score: processed.score,
        } satisfies CreScoreResponse,
      );
    } catch (aiError) {
      console.error('[guide-advisory] processing_failed', {
        panelId,
        code:
          aiError instanceof AiGatewayError
            ? aiError.code
            : 'guide_advisory_failed',
      });
      return NextResponse.json(
        {
          ok: false,
          message: 'Advisory scoring is unavailable; the panel can continue.',
        } satisfies CreScoreResponse,
        { status: 200 },
      );
    }
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
