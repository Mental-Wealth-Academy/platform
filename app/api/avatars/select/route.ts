/**
 * POST /api/avatars/select
 * 
 * Allows a user to select one of their 5 assigned avatars.
 * The server RECOMPUTES the user's assigned avatars and validates
 * that the selected avatar_id is in that set - this prevents spoofing.
 */

import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { isAvatarValidForUser, getAvatarByAvatarId } from '@/lib/avatars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SelectAvatarBody {
  avatar_id: string;
}

export async function POST(request: Request) {
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

  // Parse request body
  let body: SelectAvatarBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { avatar_id } = body;

  // Validate avatar_id format
  if (!avatar_id || typeof avatar_id !== 'string') {
    return NextResponse.json(
      { error: 'avatar_id is required and must be a string.' },
      { status: 400 }
    );
  }

  // CRITICAL: Recompute the user's assigned avatars server-side
  // This ensures a client cannot spoof an avatar_id that wasn't assigned to them
  if (!(await isAvatarValidForUser(user.id, avatar_id))) {
    return NextResponse.json(
      { 
        error: 'Invalid avatar selection.',
        message: 'The selected avatar is not in your assigned choices.'
      },
      { status: 403 }
    );
  }

  // Get the full avatar object
  const avatar = await getAvatarByAvatarId(avatar_id);
  if (!avatar) {
    return NextResponse.json(
      { error: 'Avatar not found.' },
      { status: 404 }
    );
  }

  try {
    // Check if user still has temporary username - if so, this is an error state
    // The username should have been set during profile creation
    if (user.username && user.username.startsWith('user_')) {
      console.warn('Avatar selection called but user still has temporary username:', {
        userId: user.id,
        username: user.username,
      });
      // Don't block avatar selection, but log the issue
      // The profile creation should have set the username already
    }

    // Persist the selected avatar to the database
    await sqlQuery(
      `UPDATE users 
       SET avatar_url = :avatarUrl, 
           selected_avatar_id = :avatarId 
       WHERE id = :userId`,
      { 
        avatarUrl: avatar.image_url, 
        avatarId: avatar_id,
        userId: user.id 
      }
    );

    // Update user_avatars table to mark this avatar as selected
    await sqlQuery(
      `UPDATE user_avatars 
       SET is_selected = CASE 
         WHEN avatar_id = :avatarId THEN true 
         ELSE false 
       END
       WHERE user_id = :userId`,
      { avatarId: avatar_id, userId: user.id }
    );

    return NextResponse.json({
      ok: true,
      message: 'Avatar selected successfully.',
      avatar: {
        id: avatar.id,
        image_url: avatar.image_url,
      }
    });
  } catch (error) {
    console.error('Error selecting avatar:', error);
    return NextResponse.json(
      { error: 'Failed to select avatar.' },
      { status: 500 }
    );
  }
}

