import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { createSessionForUser, setSessionCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { getWalletAddressFromRequest } from '@/lib/wallet-auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'Database is not configured on the server.' },
        { status: 503 }
      );
    }

    // Rate limit wallet signup to prevent abuse
    const rateLimitResult = checkRateLimit({
      max: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      identifier: getClientIdentifier(request),
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // SECURITY: Require wallet from Authorization header with valid signature only.
    // Do not trust wallet from request body — it would allow anyone to claim any address.
    const walletAddress = await getWalletAddressFromRequest();
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet signature required. Send Authorization: Bearer <address>:<signature>:<timestamp> with a recent signed message.' },
        { status: 401 }
      );
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format.' },
        { status: 400 }
      );
    }

    // Ensure schema is set up
    try {
      await ensureForumSchema();
    } catch (error: any) {
      console.error('Schema setup error:', error);
      // Continue with signup even if schema setup has warnings
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { error: 'Database connection failed.' },
          { status: 503 }
        );
      }
    }

    // Explicitly ensure password_hash is nullable for wallet signups
    // This migration is critical and must run before inserting wallet accounts
    try {
      await sqlQuery(`
        ALTER TABLE users 
        ALTER COLUMN password_hash DROP NOT NULL
      `);
      console.log('Wallet signup - Successfully ensured password_hash is nullable');
    } catch (migrationError: any) {
      const errorMessage = migrationError?.message || String(migrationError || '');
      // If column is already nullable, that's fine - continue
      if (!errorMessage.includes('does not exist') && 
          !errorMessage.includes('cannot be cast') &&
          !errorMessage.includes('constraint') && 
          !errorMessage.includes('does not exist')) {
        console.warn('Wallet signup - Could not make password_hash nullable (may already be nullable):', errorMessage);
      }
      // Continue anyway - if migration fails, we'll get a clear error on INSERT
    }

    // Check if wallet address already exists
    const existingUser = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(:walletAddress) LIMIT 1`,
      { walletAddress: walletAddress.toLowerCase() }
    );

    if (existingUser.length > 0) {
      const userId = existingUser[0].id;
      
      // Clear any existing sessions for this user to prevent conflicts
      try {
        await sqlQuery(
          `DELETE FROM sessions WHERE user_id = :userId`,
          { userId }
        );
      } catch (err) {
        // Ignore errors - sessions might not exist
        console.warn('Failed to clear existing sessions:', err);
      }
      
      const session = await createSessionForUser(userId);
      const response = NextResponse.json({ ok: true, userId, existing: true });
      setSessionCookie(response, session.token);
      console.log('Wallet signup - Session created for existing user');
      return response;
    }

    // Check if there's an active session (user signed in via email/password)
    // If so, link the wallet address to their existing account
    try {
      const { getSessionTokenFromCookies } = await import('@/lib/auth');
      const sessionToken = await getSessionTokenFromCookies();
      
      if (sessionToken) {
        const sessionUser = await sqlQuery<Array<{ id: string; wallet_address: string | null }>>(
          `SELECT u.id, u.wallet_address
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token = :token AND s.expires_at > NOW()
           LIMIT 1`,
          { token: sessionToken }
        );

        if (sessionUser.length > 0 && !sessionUser[0].wallet_address) {
          // Check if this wallet is already linked to another user
          const walletInUse = await sqlQuery<Array<{ id: string }>>(
            `SELECT id FROM users 
             WHERE LOWER(wallet_address) = LOWER(:walletAddress) AND id != :userId 
             LIMIT 1`,
            { walletAddress: walletAddress.toLowerCase(), userId: sessionUser[0].id }
          );

          if (walletInUse.length > 0) {
            console.warn('Wallet signup - Wallet address already linked to another user');
            return NextResponse.json(
              { error: 'This wallet address is already linked to another account.' },
              { status: 409 }
            );
          }

          // User has active session but no wallet address - link it
          const userId = sessionUser[0].id;
          console.log('Wallet signup - Linking wallet address to existing user session:', userId);
          
          await sqlQuery(
            `UPDATE users 
             SET wallet_address = :walletAddress,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :userId`,
            { 
              walletAddress: walletAddress.toLowerCase(), 
              userId 
            }
          );

          const response = NextResponse.json({ ok: true, userId, existing: true, linked: true });
          console.log('Wallet signup - Wallet address linked to existing account');
          return response;
        }
      }
    } catch (linkError) {
      // If linking fails, continue with creating new account
      console.warn('Wallet signup - Failed to link to existing session, creating new account:', linkError);
    }
    
    console.log('Wallet signup - Creating new user with wallet address:', walletAddress);

    // Create new user with wallet address only (no email/password required)
    // Note: Username will be set during onboarding - we use a temporary username here
    const userId = uuidv4();
    const tempUsername = `user_${userId.substring(0, 8)}`;

    // Use a placeholder email to satisfy unique constraint if email is still NOT NULL
    // In PostgreSQL, we can use a unique value based on wallet address
    const placeholderEmail = `wallet_${walletAddress.toLowerCase()}@wallet.local`;

    console.log('Wallet signup - Inserting new user:', {
      userId,
      walletAddress: walletAddress.toLowerCase(),
      username: tempUsername,
      email: placeholderEmail,
    });

    try {
      await sqlQuery(
        `INSERT INTO users (id, wallet_address, username, email, password_hash)
         VALUES (:id, :walletAddress, :username, :email, :passwordHash)`,
        { 
          id: userId, 
          walletAddress: walletAddress.toLowerCase(),
          username: tempUsername,
          email: placeholderEmail, // Placeholder email for wallet signup
          passwordHash: null, // No password required for wallet signup
        }
      );
      console.log('Wallet signup - User created successfully:', userId);
    } catch (insertError: any) {
      console.error('Wallet signup - Failed to insert user:', {
        error: insertError,
        code: insertError?.code,
        message: insertError?.message,
        constraint: insertError?.constraint,
      });
      throw insertError;
    }

    // Clear any existing sessions before creating new one (safety measure)
    try {
      await sqlQuery(
        `DELETE FROM sessions WHERE user_id = :userId`,
        { userId }
      );
    } catch (err) {
      // Ignore errors - this is a new user, so no sessions should exist
    }

    // Create session
    console.log('Wallet signup - Creating session for new user:', userId);
    const session = await createSessionForUser(userId);
    const response = NextResponse.json({ ok: true, userId, existing: false });
    setSessionCookie(response, session.token);
    console.log('Wallet signup - Account created successfully for:', walletAddress);
    return response;
  } catch (err: any) {
    console.error('Wallet signup error:', err);
    console.error('Error details:', {
      code: err?.code,
      message: err?.message,
      constraint: err?.constraint,
      stack: err?.stack,
    });
    
    // Duplicate wallet address or other constraint violation
    if (err?.code === '23505' || err?.code === 'ER_DUP_ENTRY') {
      const constraint = err?.constraint || '';
      const message = err?.message || '';
      
      if (constraint.includes('wallet_address') || message.includes('wallet_address')) {
        return NextResponse.json({ error: 'Wallet address already registered.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Account creation failed due to duplicate data.' }, { status: 409 });
    }
    
    // Handle database connection errors
    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create account.',
        message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          code: err?.code,
          constraint: err?.constraint,
        } : undefined
      },
      { status: 500 }
    );
  }
}
