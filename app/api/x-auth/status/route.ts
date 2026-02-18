import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Get our internal user record (authenticated via wallet address)
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get user's X account
    const xAccountRows = await sqlQuery<Array<{
      x_user_id: string;
      x_username: string;
      created_at: string;
    }>>(
      `SELECT x_user_id, x_username, created_at
       FROM x_accounts
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: user.id }
    );

    if (xAccountRows.length === 0) {
      return NextResponse.json(
        { 
          connected: false,
          xAccount: null
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return NextResponse.json(
      { 
        connected: true,
        xAccount: {
          username: xAccountRows[0].x_username,
          userId: xAccountRows[0].x_user_id,
          connectedAt: xAccountRows[0].created_at,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('X account status error:', error);
    return NextResponse.json(
      { error: 'Failed to get X account status.' }, 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

