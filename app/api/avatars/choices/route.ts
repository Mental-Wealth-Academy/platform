/**
 * GET /api/avatars/choices
 * 
 * Returns exactly 5 deterministically assigned avatars for the authenticated user.
 * These avatars are derived from the user's ID and remain stable across sessions.
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
    // Get deterministically assigned avatars for this user
    // Uses user.id as the seed - this is stable and unique per user
    const choices = await getAssignedAvatars(user.id);

    return NextResponse.json({
      choices,
      // Include user's current avatar if they have one selected
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

