import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/guide-api-auth';
import { isDbConfigured } from '@/lib/db';
import { gradeVerifierTest } from '@/lib/verifier-tests-db';
import {
  verifierTestCompleteBodySchema,
  zodErrorBody,
  type VerifierTestCompleteResponse,
} from '@/lib/guide-api-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/guides/verifier-test/complete — submit answers for a verifier test,
 * grade it, and (on a pass) upsert the verifier credential.
 *
 * Body: { testId: string, answers: Record<questionId, string | number> }
 *
 * Grading is delegated to gradeVerifierTest in lib/verifier-tests-db. The score
 * behind a credential comes from answer-keyed items only; written answers are
 * recorded for the panel and carry no score. A pass on an ungrounded fallback
 * test returns credentialWithheldReason instead of a credential. The credential
 * upsert and the completed_at write happen in one transaction there.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }
  let userId: string;
  try {
    ({ userId } = await requireUser(request));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 });
  }

  const parsed = verifierTestCompleteBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(zodErrorBody(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  // testId format is a semantic rule beyond the schema (must look like a UUID).
  if (!UUID_RE.test(body.testId)) {
    return NextResponse.json({ error: 'A valid testId is required.' }, { status: 400 });
  }

  try {
    const result = await gradeVerifierTest(body.testId, userId, body.answers);
    return NextResponse.json({ ok: true, ...result } satisfies VerifierTestCompleteResponse);
  } catch (err: any) {
    const status = err.status ?? 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
