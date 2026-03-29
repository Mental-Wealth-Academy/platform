import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple IP-based rate limiter for Farcaster signin (max 5 attempts per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/auth/farcaster-signin
 *
 * Accepts a Farcaster FID from the mini-app SDK context, looks up the user's
 * verified ETH address and profile via Neynar, then creates or signs in the
 * account — pre-filling the avatar from the Farcaster pfp.
 *
 * SECURITY: The FID is cross-verified against Neynar's API to ensure it maps
 * to a real Farcaster user. Rate-limited to prevent enumeration. The client-
 * provided username/pfpUrl are treated as hints only — Neynar data takes
 * precedence for wallet address resolution.
 *
 * TODO: Implement SIWF (Sign In With Farcaster) for cryptographic FID proof.
 * Currently relies on the mini-app SDK context being client-only, which is
 * not a cryptographic guarantee. Use sdk.actions.signIn() on the client and
 * verify the signed message here.
 */
export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

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
          'x-api-key': neynarApiKey,
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

      return NextResponse.json({ ok: true, userId, existing: true });
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

    return NextResponse.json({ ok: true, userId, existing: false, username });
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
