/**
 * POST /api/profile/create
 * 
 * Creates a new user profile during onboarding.
 * This is the primary entry point for new users.
 * 
 * Expected body:
 * {
 *   username: string (5-32 chars, alphanumeric + underscores)
 *   email?: string (optional, for email notifications)
 *   gender: string
 *   birthday: string (YYYY-MM-DD)
 *   avatar_id: string (must be from assigned choices)
 * }
 */

import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { isDbConfigured, sqlQuery, withTransaction, sqlQueryWithClient } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isAvatarValidForUser, getAvatarByAvatarId, getAssignedAvatars } from '@/lib/avatars';
import { deliverDiamondsOnchain } from '@/lib/diamonds-onchain';
import { checkBirthdayValue } from '@/lib/birthday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateProfileBody {
  username: string;
  avatar_id: string;
  wallet_address?: string;
  gender?: 'female' | 'male' | 'nonbinary' | 'private';
  birthday?: string;
}

// Username validation regex: 5-32 chars, alphanumeric + underscores
const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;
const ALLOWED_GENDERS = new Set(['female', 'male', 'nonbinary', 'private']);
const BIRTHDAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  // Database check
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }

  // Ensure schema is set up, handle connection errors gracefully
  try {
  await ensureForumSchema();
  } catch (error: any) {
    // Check if this is a database connection error
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connection')) {
      console.error('Database connection error:', error);
      
      // Extract troubleshooting info from error message if available
      const errorMessage = error?.message || 'Unknown connection error';
      const troubleshootingMatch = errorMessage.match(/Troubleshooting:\s*([\s\S]*?)(?:\n\nOriginal error|$)/);
      const troubleshooting = troubleshootingMatch ? troubleshootingMatch[1].trim() : null;
      
      return NextResponse.json(
        { 
          error: 'Database connection failed.',
          message: 'Unable to connect to the database. Please check your database configuration and ensure the server is running.',
          troubleshooting: process.env.NODE_ENV === 'development' && troubleshooting ? troubleshooting : undefined,
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 503 }
      );
    }
    // Re-throw other errors
    throw error;
  }

  // Parse request body
  let body: CreateProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { username, avatar_id, wallet_address, gender, birthday } = body;

  // Validate username
  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { 
        error: 'Invalid username.',
        message: 'Username must be 5-32 characters and contain only letters, numbers, and underscores.'
      },
      { status: 400 }
    );
  }

  if (!gender || typeof gender !== 'string' || !ALLOWED_GENDERS.has(gender)) {
    return NextResponse.json(
      {
        error: 'Invalid gender.',
        message: 'Please select a valid gender option.',
      },
      { status: 400 }
    );
  }

  if (!birthday || typeof birthday !== 'string' || !BIRTHDAY_REGEX.test(birthday)) {
    return NextResponse.json(
      {
        error: 'Invalid birthday.',
        message: 'Birthday must be a valid date.',
      },
      { status: 400 }
    );
  }

  // Same rule the onboarding form shows inline: a real date, not in the
  // future, and inside the allowed age range.
  const birthdayCheck = checkBirthdayValue(birthday);
  if (!birthdayCheck.value) {
    return NextResponse.json(
      {
        error: 'Invalid birthday.',
        message: birthdayCheck.error || 'Birthday must be a real date that is not in the future.',
      },
      { status: 400 }
    );
  }

  if (!avatar_id || typeof avatar_id !== 'string') {
    return NextResponse.json(
      { error: 'avatar_id is required.' },
      { status: 400 }
    );
  }

  // Get current user from session (created via signup)
  const currentUser = await getCurrentUserFromRequestCookie();
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Not authenticated. Please sign up first.' },
      { status: 401 }
    );
  }

  const userId = currentUser.id;

  // Check if user already has a profile (not just temporary username)
  const userRows = await sqlQuery<Array<{ username: string; avatar_url: string | null; avatar_reroll_count: number }>>(
    `SELECT username, avatar_url, avatar_reroll_count FROM users WHERE id = :userId LIMIT 1`,
    { userId }
  );
  const existingUser = userRows[0] || { username: null, avatar_url: null };
  const avatarRerollCount = userRows[0]?.avatar_reroll_count ?? 0;
  const hasExistingProfile = existingUser.username && 
    !existingUser.username.startsWith('user_');

  try {
    // Avatar selection is now optional - user selects avatar on homepage
    // Only validate if avatar_id is provided
    let avatar = null;
    if (avatar_id) {
      // Validate avatar is in assigned choices for this user
      // Skip validation if user already has a profile (allowing updates)
      if (!hasExistingProfile && !(await isAvatarValidForUser(userId, avatar_id, avatarRerollCount))) {
        // Since this is a new user, we need to get their choices based on the new ID
        // and check if the avatar is valid
        const assignedAvatars = await getAssignedAvatars(userId, avatarRerollCount);
        const validIds = assignedAvatars.map(a => a.id);
        
        return NextResponse.json(
          { 
            error: 'Invalid avatar selection.',
            message: 'Please select from your assigned avatar choices.',
            validChoices: validIds
          },
          { status: 400 }
        );
      }

      // Get the full avatar object
      // If user has existing profile, we can update directly without strict validation
      if (hasExistingProfile) {
        // For existing profiles, try to get avatar but allow updating even if not in assigned choices
        avatar = await getAvatarByAvatarId(avatar_id);
        if (!avatar) {
          // If avatar_id is invalid, still allow update but log it
          console.warn(`Avatar ${avatar_id} not found for existing profile update`);
          // Use a default or existing avatar_url
          const existingAvatarUrl = existingUser.avatar_url;
          avatar = existingAvatarUrl ? { id: avatar_id, image_url: existingAvatarUrl, metadata_url: '' } : null;
        }
      } else {
        // For new profiles, avatar must be valid
        avatar = await getAvatarByAvatarId(avatar_id);
        if (!avatar) {
          return NextResponse.json(
            { error: 'Avatar not found.' },
            { status: 404 }
          );
        }
      }
    }

    // Check if username is already taken by another user
    const existingUsername = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE username = :username AND id != :userId LIMIT 1`,
      { username, userId }
    );

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { 
          error: 'Username already taken.',
          message: 'Please choose a different username.'
        },
        { status: 409 }
      );
    }

    // Update the user profile and store all avatar choices
    const WELCOME_SHARDS = hasExistingProfile ? undefined : 10; // Don't reset credits for existing profiles
    await withTransaction(async (client) => {
      // Update user profile
      const updateParams: any = {
        userId,
        username,
        selectedAvatarId: avatar_id || null,
        avatarUrl: avatar?.image_url || null,
        gender: gender || null,
        birthday: birthday || null,
      };
      
      if (WELCOME_SHARDS !== undefined) {
        updateParams.shardCount = WELCOME_SHARDS;
      }
      
      // Update user profile - ensure username is always set
      await sqlQueryWithClient(
        client,
        `UPDATE users
         SET username = :username,
             selected_avatar_id = :selectedAvatarId,
             avatar_url = :avatarUrl,
             gender = :gender,
             birthday = :birthday${WELCOME_SHARDS !== undefined ? ', shard_count = :shardCount' : ''}
         WHERE id = :userId`,
        updateParams
      );

      // Log the update for debugging
      console.log('Profile updated:', {
        userId,
        username,
        hasAvatar: !!avatar,
        avatarId: avatar_id || null,
        gender,
        birthday,
        shardCount: WELCOME_SHARDS,
      });

      // Store all 6 avatar choices for this user.
      if (!hasExistingProfile) {
        const assignedAvatarsForDb = await getAssignedAvatars(userId, avatarRerollCount);
        for (const assignedAvatar of assignedAvatarsForDb) {
          await sqlQueryWithClient(
            client,
            `INSERT INTO user_avatars (id, user_id, avatar_id, avatar_url, is_selected)
             VALUES (:id, :userId, :avatarId, :avatarUrl, :isSelected)
             ON CONFLICT (user_id, avatar_id) DO UPDATE SET
               avatar_url = EXCLUDED.avatar_url,
               is_selected = EXCLUDED.is_selected`,
            {
              id: uuidv4(),
              userId,
              avatarId: assignedAvatar.id,
              avatarUrl: assignedAvatar.image_url,
              isSelected: avatar_id ? (assignedAvatar.id === avatar_id) : false,
            }
          );
        }
      }
    });

    // Welcome diamonds go out onchain too — a one-time p2p transfer from Blue,
    // deduped by the diamond_onchain_rewards ledger (fail-soft, never blocks
    // profile creation).
    if (WELCOME_SHARDS !== undefined) {
      await deliverDiamondsOnchain({
        userId,
        walletAddress: currentUser.walletAddress,
        source: 'welcome',
        refId: 'signup',
        amount: WELCOME_SHARDS,
        delivery: 'blue_transfer',
      });
    }

    // Note: Session was already created during signup, so we don't need to create a new one
    // The session cookie is already set from the signup step

    return NextResponse.json({
      ok: true,
      message: 'Profile created successfully!',
      user: {
        id: userId,
        username,
        avatarUrl: avatar?.image_url || null,
        shardCount: WELCOME_SHARDS,
      }
    });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      constraint: error?.constraint,
      stack: error?.stack,
    });
    
    // Handle duplicate key errors (PostgreSQL error code 23505)
    if (error?.code === '23505' || error?.code === 'ER_DUP_ENTRY') {
      const constraint = error?.constraint || '';
      const message = error?.message || '';
      
      if (constraint.includes('username') || message.includes('username')) {
        return NextResponse.json(
          { error: 'Username already taken.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Username already exists.' },
        { status: 409 }
      );
    }

    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error?.message || 'Failed to create profile.')
      : 'Failed to create profile.';

    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error?.stack : undefined },
      { status: 500 }
    );
  }
}
