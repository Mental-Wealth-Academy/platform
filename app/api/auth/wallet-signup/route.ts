import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getWalletAddressFromRequest } from '@/lib/wallet-auth';

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
      return NextResponse.json({ ok: true, userId: existingUser[0].id, existing: true });
    }

    // Create new user
    const userId = uuidv4();
    const tempUsername = `user_${userId.substring(0, 8)}`;

    await sqlQuery(
      `INSERT INTO users (id, wallet_address, username) VALUES (:id, :walletAddress, :username)`,
      { id: userId, walletAddress: walletAddressClean, username: tempUsername }
    );

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
