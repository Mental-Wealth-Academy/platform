import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { createSessionForUser, setSessionCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/farcaster-signin
 *
 * Accepts a Farcaster FID from the mini-app SDK context, looks up the user's
 * verified ETH address and profile via Neynar, then creates or signs in the
 * account — pre-filling the avatar from the Farcaster pfp.
 */
export async function POST(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    try {
      await ensureForumSchema();
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
        return NextResponse.json({ error: 'Database connection failed.' }, { status: 503 });
      }
    }

    const body = await request.json();
    const { fid, username: fcUsername, pfpUrl } = body;

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json({ error: 'Farcaster FID is required.' }, { status: 400 });
    }

    // Look up verified addresses from Neynar
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      return NextResponse.json({ error: 'Neynar API key not configured.' }, { status: 500 });
    }

    const neynarRes = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          accept: 'application/json',
          api_key: neynarApiKey,
        },
      }
    );

    if (!neynarRes.ok) {
      console.error('Neynar bulk user lookup failed:', neynarRes.status);
      return NextResponse.json({ error: 'Failed to look up Farcaster user.' }, { status: 502 });
    }

    const neynarData = await neynarRes.json();
    const fcUser = neynarData?.users?.[0];

    if (!fcUser) {
      return NextResponse.json({ error: 'Farcaster user not found.' }, { status: 404 });
    }

    // Get the first verified ETH address, or fall back to custody address
    const verifiedEth = fcUser.verified_addresses?.eth_addresses?.[0];
    const custodyAddress = fcUser.custody_address;
    const walletAddress = verifiedEth || custodyAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'No Ethereum address found for this Farcaster account.' },
        { status: 400 }
      );
    }

    // Use Farcaster pfp — prefer what the client sent (from SDK context), fall back to Neynar
    const avatarUrl = pfpUrl || fcUser.pfp_url || null;
    // Use Farcaster display name for username hint
    const displayName = fcUsername || fcUser.username || null;

    // Check if user already exists with this wallet address
    const existingUser = await sqlQuery<Array<{ id: string; avatar_url: string | null }>>(
      `SELECT id, avatar_url FROM users WHERE LOWER(wallet_address) = LOWER(:walletAddress) LIMIT 1`,
      { walletAddress: walletAddress.toLowerCase() }
    );

    if (existingUser.length > 0) {
      const userId = existingUser[0].id;

      // Back-fill avatar from Farcaster pfp if user doesn't have one yet
      if (!existingUser[0].avatar_url && avatarUrl) {
        try {
          await sqlQuery(
            `UPDATE users SET avatar_url = :avatarUrl WHERE id = :userId`,
            { avatarUrl, userId }
          );
        } catch (err) {
          console.warn('Failed to back-fill avatar:', err);
        }
      }

      // Clear old sessions and create new one
      try {
        await sqlQuery(`DELETE FROM sessions WHERE user_id = :userId`, { userId });
      } catch (err) {
        console.warn('Failed to clear existing sessions:', err);
      }

      const session = await createSessionForUser(userId);
      const response = NextResponse.json({ ok: true, userId, existing: true });
      setSessionCookie(response, session.token);
      return response;
    }

    // Create new user with wallet address + Farcaster profile data
    const userId = uuidv4();
    // Sanitize Farcaster username for our 5-32 char alphanumeric+underscore constraint
    let username: string;
    if (displayName) {
      const sanitized = displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
      username = sanitized.length >= 5 ? sanitized : `user_${userId.substring(0, 8)}`;
    } else {
      username = `user_${userId.substring(0, 8)}`;
    }

    // Check if sanitized username is already taken
    const usernameTaken = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1`,
      { username: username.toLowerCase() }
    );
    if (usernameTaken.length > 0) {
      // Append short random suffix
      username = `${username.slice(0, 26)}_${userId.substring(0, 4)}`;
    }

    await sqlQuery(
      `INSERT INTO users (id, wallet_address, username, avatar_url)
       VALUES (:id, :walletAddress, :username, :avatarUrl)`,
      {
        id: userId,
        walletAddress: walletAddress.toLowerCase(),
        username,
        avatarUrl,
      }
    );

    const session = await createSessionForUser(userId);
    const response = NextResponse.json({ ok: true, userId, existing: false, username });
    setSessionCookie(response, session.token);
    return response;
  } catch (err: any) {
    console.error('Farcaster signin error:', err);

    if (err?.code === '23505' || err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Account already exists.' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to sign in with Farcaster.' },
      { status: 500 }
    );
  }
}
