import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureCreditBuilderSchema } from '@/lib/ensureCreditBuilderSchema';
import { generateDisputeLetter } from '@/lib/credit-builder-ai';
import type { DisputeTypeId, DisputeStatus } from '@/types/credit-builder';

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const disputes = await sqlQuery<Array<{
    id: string;
    dispute_type: DisputeTypeId;
    target_bureau: string | null;
    target_entity: string | null;
    account_ref: string | null;
    letter_content: string;
    status: DisputeStatus;
    sent_at: string | null;
    response_due: string | null;
    resolved_at: string | null;
    resolution_note: string | null;
    created_at: string;
    updated_at: string;
  }>>(
    `SELECT id, dispute_type, target_bureau, target_entity, account_ref, letter_content,
            status, sent_at, response_due, resolved_at, resolution_note, created_at, updated_at
     FROM credit_disputes
     WHERE user_id = :userId
     ORDER BY created_at DESC`,
    { userId: user.id }
  );

  return NextResponse.json({
    disputes: disputes.map(d => ({
      id: d.id,
      disputeType: d.dispute_type,
      targetBureau: d.target_bureau,
      targetEntity: d.target_entity,
      accountRef: d.account_ref,
      letterContent: d.letter_content,
      status: d.status,
      sentAt: d.sent_at,
      responseDue: d.response_due,
      resolvedAt: d.resolved_at,
      resolutionNote: d.resolution_note,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      daysRemaining: d.response_due ? Math.ceil((new Date(d.response_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    })),
  });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const body = await request.json();
  const { disputeType, targetBureau, targetEntity, accountRef, itemDetails } = body as {
    disputeType: DisputeTypeId;
    targetBureau?: string;
    targetEntity?: string;
    accountRef?: string;
    itemDetails?: string;
  };

  if (!disputeType) {
    return NextResponse.json({ error: 'disputeType is required' }, { status: 400 });
  }

  // Get profile
  const profiles = await sqlQuery<Array<{ id: string }>>(
    'SELECT id FROM credit_profiles WHERE user_id = :userId',
    { userId: user.id }
  );

  if (profiles.length === 0) {
    return NextResponse.json({ error: 'No credit profile found' }, { status: 404 });
  }

  try {
    const letterContent = await generateDisputeLetter({
      disputeType,
      targetBureau,
      targetEntity,
      accountRef,
      itemDetails,
      userName: user.username,
    });

    const rows = await sqlQuery<Array<{ id: string }>>(
      `INSERT INTO credit_disputes (id, user_id, profile_id, dispute_type, target_bureau, target_entity, account_ref, letter_content)
       VALUES (gen_random_uuid()::text, :userId, :profileId, :disputeType, :targetBureau, :targetEntity, :accountRef, :letterContent)
       RETURNING id`,
      {
        userId: user.id,
        profileId: profiles[0].id,
        disputeType,
        targetBureau: targetBureau || null,
        targetEntity: targetEntity || null,
        accountRef: accountRef || null,
        letterContent,
      }
    );

    // Advance step to disputes
    await sqlQuery(
      `UPDATE credit_profiles SET current_step = 'disputes' WHERE id = :profileId AND current_step IN ('intake', 'audit')`,
      { profileId: profiles[0].id }
    );

    return NextResponse.json({ disputeId: rows[0].id, letterContent });
  } catch (err) {
    console.error('[CreditBuilder] Dispute generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate dispute letter. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const body = await request.json();
  const { disputeId, status, resolutionNote } = body as {
    disputeId: string;
    status: DisputeStatus;
    resolutionNote?: string;
  };

  if (!disputeId || !status) {
    return NextResponse.json({ error: 'disputeId and status are required' }, { status: 400 });
  }

  const updates: string[] = ['status = :status'];
  const params: Record<string, unknown> = { disputeId, userId: user.id, status };

  if (status === 'sent') {
    updates.push('sent_at = CURRENT_TIMESTAMP');
    updates.push("response_due = CURRENT_TIMESTAMP + INTERVAL '30 days'");
  }

  if (status === 'resolved_positive' || status === 'resolved_negative') {
    updates.push('resolved_at = CURRENT_TIMESTAMP');
  }

  if (resolutionNote) {
    updates.push('resolution_note = :resolutionNote');
    params.resolutionNote = resolutionNote;
  }

  await sqlQuery(
    `UPDATE credit_disputes SET ${updates.join(', ')} WHERE id = :disputeId AND user_id = :userId`,
    params
  );

  return NextResponse.json({ success: true });
}
