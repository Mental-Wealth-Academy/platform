import { NextResponse } from 'next/server';
import { requireVip } from '@/lib/guide-api-auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { submitGuideForVerification } from '@/lib/guide-verification-db';
import { processGuideAdvisoryJob } from '@/lib/ai/guide-advisory';
import { AiGatewayError } from '@/lib/ai';
import {
  verificationSubmitBodySchema,
  zodErrorBody,
  type VerificationSubmitResponse,
} from '@/lib/guide-api-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/guides/verification/submit
 * Author submits their own DRAFT guide for verification. Draws an odd-numbered
 * verifier panel and flips the guide to `pending_verification`.
 *
 * Auth mirrors the guide-authoring routes (requireVip). Ownership is
 * enforced here: a user may only submit a guide they authored.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  try {
    const { userId } = await requireVip(request);

    const parsed = verificationSubmitBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
    }
    const body = parsed.data;

    // Ownership check — only the author may submit their draft.
    const rows = await sqlQuery<Array<{ author_id: string | null }>>(
      `SELECT author_id FROM guides WHERE id = :guideId`,
      { guideId: body.guideId },
    );
    if (!rows[0]) {
      return NextResponse.json({ error: 'Guide not found.' }, { status: 404 });
    }
    if (rows[0].author_id !== userId) {
      return NextResponse.json(
        { error: 'Only the author can submit this guide for verification.' },
        { status: 403 },
      );
    }

    const panel = await submitGuideForVerification(body.guideId);

    // Advisory generation has a durable idempotent job record. We wait for the
    // bounded task here so serverless shutdown cannot silently discard it.
    // Failure remains non-fatal because only the human panel resolves a guide.
    await triggerGuideAdvisory(body.guideId, panel.id);

    return NextResponse.json(
      {
        ok: true,
        panelId: panel.id,
        memberCount: panel.memberIds.length,
        status: panel.status,
      } satisfies VerificationSubmitResponse,
      { status: 201 },
    );
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

/**
 * Run one bounded advisory job. Job state and failures are persisted by the
 * shared service, so an operator can safely retry the legacy callback endpoint.
 */
async function triggerGuideAdvisory(guideId: string, panelId: string): Promise<void> {
  try {
    await processGuideAdvisoryJob({
      guideId,
      panelId,
    });
  } catch (error) {
    console.error('[guide-advisory] submit_processing_failed', {
      panelId,
      code:
        error instanceof AiGatewayError
          ? error.code
          : 'guide_advisory_failed',
    });
  }
}
