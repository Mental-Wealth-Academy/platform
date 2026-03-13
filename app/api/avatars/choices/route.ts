/**
 * GET /api/avatars/choices
 *
 * Returns 6 deterministically assigned Noun avatars for the authenticated user.
 * All avatars are generated locally — no network calls, instant response.
 */

import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured } from '@/lib/db';
import { getAssignedAvatars } from '@/lib/avatars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Database check
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Authentication check
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Not signed in. Please authenticate first.' },
      { status: 401 }
    );
  }

  try {
    const choices = getAssignedAvatars(user.id);

    return NextResponse.json({
      choices,
      currentAvatar: user.avatarUrl || null,
    });
  } catch (error) {
    console.error('Error fetching avatar choices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch avatar choices.' },
      { status: 500 }
    );
  }
}
