/**
 * POST /api/profile/preview-avatars
 *
 * Returns 6 deterministically assigned Noun avatars for a NEW user during onboarding.
 * This endpoint does NOT require authentication as it's used during signup.
 *
 * Body:
 * { seed: string }
 */

import { NextResponse } from 'next/server';
import { getAssignedAvatars } from '@/lib/avatars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PreviewAvatarsBody {
  seed: string;
}

export async function POST(request: Request) {
  // Parse request body
  let body: PreviewAvatarsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { seed } = body;

  // Validate seed
  if (!seed || typeof seed !== 'string' || seed.length < 3) {
    return NextResponse.json(
      { error: 'A valid seed is required (min 3 characters).' },
      { status: 400 }
    );
  }

  try {
    const choices = getAssignedAvatars(seed);

    return NextResponse.json({
      choices,
      seed,
    });
  } catch (error) {
    console.error('Error generating avatar preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate avatar choices.' },
      { status: 500 }
    );
  }
}
