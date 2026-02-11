/**
 * GET /api/profile/check-username
 * 
 * Checks if a username is available.
 * Used during onboarding to provide real-time feedback.
 */

import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimitResult = checkRateLimit({
    max: 30,
    windowMs: 60 * 1000, // 1 minute
    identifier: getClientIdentifier(request),
  });
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  // Validate username parameter
  if (!username || username.length < 5) {
    return NextResponse.json(
      { error: 'Username must be at least 5 characters.' },
      { status: 400 }
    );
  }

  // Database check
  if (!isDbConfigured()) {
    // If DB not configured, assume available (will fail on create anyway)
    return NextResponse.json({ available: true, username });
  }

  try {
    // Ensure schema is set up, handle connection errors gracefully
    try {
      await ensureForumSchema();
    } catch (error: any) {
      // Check if this is a database connection error
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connection')) {
        // If database is not available, assume username is available (will be validated on create)
        console.warn('Database connection error in username check, assuming available:', error?.message);
        return NextResponse.json({ available: true, username });
      }
      // Handle pooler authentication errors - these are expected and we can continue
      if (error?.code === 'XX000' || error?.message?.includes('Tenant or user not found')) {
        // Pooler connections may have auth issues with extension creation, but schema should still work
        console.warn('Schema setup warning (pooler connection), continuing:', error?.message);
        // Continue - the schema tables should still be accessible
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Check if username exists
    const existing = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM users WHERE username = :username LIMIT 1`,
      { username: username.toLowerCase() }
    );

    return NextResponse.json({
      available: existing.length === 0,
      username,
    });
  } catch (error: any) {
    console.error('Error checking username:', error);
    // If it's a connection error, assume available (will be validated on create)
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connection')) {
      return NextResponse.json({ available: true, username });
    }
    // Handle pooler authentication errors - assume available (will be validated on create)
    if (error?.code === 'XX000' || error?.message?.includes('Tenant or user not found')) {
      console.warn('Pooler authentication error in username check, assuming available:', error?.message);
      return NextResponse.json({ available: true, username });
    }
    // For other errors, return error response
    return NextResponse.json(
      { error: 'Failed to check username.', available: null },
      { status: 500 }
    );
  }
}

