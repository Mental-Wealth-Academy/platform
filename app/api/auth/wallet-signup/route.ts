import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getWalletAddressFromRequest, getEmailAddressFromRequest } from '@/lib/wallet-auth';
import { sendMeetBlueEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
    }

    try {
      await ensureForumSchema();
    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
        return NextResponse.json({ error: 'Database connection failed.' }, { status: 503 });
      }
    }

    const rawWallet = await getWalletAddressFromRequest();

    if (!rawWallet) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Privy.' },
        { status: 401 }
      );
    }

    // Optional Farcaster profile data from mini-app login
    let farcasterUsername: string | undefined;
    let farcasterPfp: string | undefined;
    try {
      const body = await request.json();
      farcasterUsername = body?.farcasterUsername;
      farcasterPfp = body?.farcasterPfp;
    } catch {
      // No body or invalid JSON — fine, these are optional
    }

    // Normalize: trim whitespace, ensure 0x prefix, lowercase
    const walletAddress = rawWallet.trim().toLowerCase();
    const normalized = walletAddress.startsWith('0x') ? walletAddress : `0x${walletAddress}`;

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      console.error('[Wallet Signup] Invalid wallet format. raw:', JSON.stringify(rawWallet), 'length:', rawWallet.length, 'normalized:', normalized.slice(0, 10));
      return NextResponse.json({ error: 'Invalid wallet address format.' }, { status: 400 });
    }

    // Use the normalized address from here on
    const walletAddressClean = normalized;

    // Check if wallet address already exists
    const existingUser = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(:walletAddress) LIMIT 1`,
      { walletAddress: walletAddressClean }
    );

    if (existingUser.length > 0) {
      // Back-fill avatar from Farcaster pfp if user doesn't have one yet
      if (farcasterPfp) {
        try {
          await sqlQuery(
            `UPDATE users SET avatar_url = COALESCE(avatar_url, :avatarUrl) WHERE id = :userId`,
            { avatarUrl: farcasterPfp, userId: existingUser[0].id }
          );
        } catch {
          // Non-critical
        }
      }
      return NextResponse.json({ ok: true, userId: existingUser[0].id, existing: true });
    }

    // Create new user
    const userId = uuidv4();
    let username = `user_${userId.substring(0, 8)}`;
    if (farcasterUsername) {
      const sanitized = farcasterUsername.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
      if (sanitized.length >= 5) {
        const taken = await sqlQuery<Array<{ id: string }>>(
          `SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1`,
          { username: sanitized.toLowerCase() }
        );
        if (taken.length === 0) username = sanitized;
      }
    }

    await sqlQuery(
      `INSERT INTO users (id, wallet_address, username, avatar_url) VALUES (:id, :walletAddress, :username, :avatarUrl)`,
      { id: userId, walletAddress: walletAddressClean, username, avatarUrl: farcasterPfp || null }
    );

    // Feature 2: welcome email on signup — only fires for genuinely new
    // accounts, and only if the user has an email-based Privy account
    // linked (wallet-only signups have no email to send to, by design).
    // Wrapped so a Resend/Privy hiccup can never fail account creation.
    let signupEmail: string | null = null;
    try {
      signupEmail = await getEmailAddressFromRequest();
      if (signupEmail) {
        await sendMeetBlueEmail(signupEmail);
      }
    } catch (notifyErr) {
      console.error('Welcome email failed (non-blocking):', notifyErr);
    }

    // Feature 3: nurture sequence — separate N8N workflow, fires only if
    // the same email lookup above found an address. Reuses signupEmail
    // rather than calling getEmailAddressFromRequest() a second time.
    // Own env var, own webhook, own workflow — isolated from Feature 1
    // and Feature 2 so none of the three can break another.
    if (signupEmail && process.env.N8N_NURTURE_START_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_NURTURE_START_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupEmail, userId }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (nurtureErr) {
        console.error('Nurture sequence trigger failed (non-blocking):', nurtureErr);
      }
    }

    return NextResponse.json({ ok: true, userId, existing: false });
  } catch (err: any) {
    console.error('Wallet signup error:', err);

    if (err?.code === '23505' || err?.code === 'ER_DUP_ENTRY') {
      const constraint = err?.constraint || '';
      const message = err?.message || '';
      if (constraint.includes('wallet_address') || message.includes('wallet_address')) {
        return NextResponse.json({ error: 'Wallet address already registered.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Account creation failed due to duplicate data.' }, { status: 409 });
    }

    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT') {
      return NextResponse.json({ error: 'Database connection failed. Please try again later.' }, { status: 503 });
    }

    return NextResponse.json(
      { error: 'Failed to create account.', message: process.env.NODE_ENV === 'development' ? err?.message : undefined },
      { status: 500 }
    );
  }
}
