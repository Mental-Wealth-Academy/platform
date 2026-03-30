import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { ensureEventsSchema } from '@/lib/ensureEventsSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { getWalletAddressFromRequest } from '@/lib/wallet-auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ user: null, dbConfigured: false });
  }
  await ensureForumSchema();
  await ensureEventsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    // Return WHY auth failed so the client can act on it
    const wallet = await getWalletAddressFromRequest();
    return NextResponse.json({
      user: null,
      dbConfigured: true,
      authDebug: {
        walletExtracted: !!wallet,
        walletPrefix: wallet ? wallet.slice(0, 6) : null,
        userNotFound: !!wallet, // wallet found but no DB row
      },
    });
  }

  // Get shard count and onboarding status from database
  const userRows = await sqlQuery<Array<{ shard_count: number; selected_avatar_id: string | null }>>(
    `SELECT shard_count, selected_avatar_id FROM users WHERE id = :id LIMIT 1`,
    { id: user.id }
  );
  const shardCount = userRows[0]?.shard_count ?? 0;
  const onboardingComplete = !!userRows[0]?.selected_avatar_id;

  // Get event reservations (event slugs)
  const reservationRows = await sqlQuery<Array<{ slug: string }>>(
    `SELECT e.slug 
     FROM event_reservations er
     JOIN events e ON er.event_id = e.id
     WHERE er.user_id = :userId`,
    { userId: user.id }
  );
  const eventReservations = reservationRows.map(row => row.slug);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      shardCount,
      onboardingComplete,
      eventReservations,
      createdAt: user.createdAt,
    },
    dbConfigured: true,
  });
}

function isValidUsername(username: unknown): username is string {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 5 || trimmed.length > 32) return false;
  return /^[a-zA-Z0-9_]+$/.test(trimmed);
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Get current user from session cookie or wallet auth
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = body?.username;
  const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl : null;

  if (username !== undefined && !isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          'Invalid username. Use 5-32 chars, letters/numbers/underscore only.',
      },
      { status: 400 }
    );
  }

  try {
    await sqlQuery(
      `UPDATE users
       SET username = COALESCE(:username, username),
           avatar_url = :avatarUrl
       WHERE id = :id`,
      {
        id: user.id,
        username: username === undefined ? null : String(username).trim(),
        avatarUrl,
      }
    );
  } catch (err: any) {
    // PostgreSQL error code 23505 for unique constraint violations
    if (err?.code === '23505' || err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
