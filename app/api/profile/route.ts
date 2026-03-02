/**
 * GET /api/profile
 * 
 * Returns the current user's profile information.
 * Requires authentication.
 */

import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LinkedAccount {
  type: 'x' | 'wallet' | 'linkedin' | 'whatsapp';
  identifier: string;
  connectedAt?: string;
}

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
      { error: 'Not signed in.' },
      { status: 401 }
    );
  }

  try {
    // Get full user profile including gender and birthday
    const userProfile = await sqlQuery<Array<{ gender: string | null; birthday: string | null }>>(
      `SELECT gender, birthday FROM users WHERE id = :userId LIMIT 1`,
      { userId: user.id }
    );
    
    const profile = userProfile[0] || { gender: null, birthday: null };

    // Get linked accounts
    const linkedAccounts: LinkedAccount[] = [];

    // Check for X account
    const xAccounts = await sqlQuery<Array<{ x_username: string; created_at: string }>>(
      `SELECT x_username, created_at FROM x_accounts WHERE user_id = :userId`,
      { userId: user.id }
    );
    if (xAccounts.length > 0) {
      linkedAccounts.push({
        type: 'x',
        identifier: `@${xAccounts[0].x_username}`,
        connectedAt: xAccounts[0].created_at,
      });
    }

    // Wallet is always linked if user has one
    if (user.walletAddress && !user.walletAddress.startsWith('0x00000000')) {
      linkedAccounts.push({
        type: 'wallet',
        identifier: user.walletAddress,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        shardCount: user.shardCount,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        gender: profile.gender,
        birthday: profile.birthday,
      },
      linkedAccounts,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile.' },
      { status: 500 }
    );
  }
}

