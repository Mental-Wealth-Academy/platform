import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Logout endpoint.
 * Clears the session cookie for backward compatibility.
 * Note: Wallet disconnect is handled client-side via useDisconnect().disconnect()
 */
export async function POST() {
  const user = await getCurrentUserFromRequestCookie();
  
  // If user has a session, delete it from database
  if (user) {
    try {
      await sqlQuery(
        `DELETE FROM sessions WHERE user_id = :userId`,
        { userId: user.id }
      );
    } catch (err) {
      // Ignore errors - session might not exist
      console.warn('Failed to delete session:', err);
    }
  }

  const response = NextResponse.json({ ok: true });
  // Clear session cookie
  response.cookies.set({
    name: 'mwa_session',
    value: '',
    path: '/',
    maxAge: 0,
  });
  // Clear Privy cookies so server-side auth doesn't persist after logout
  response.cookies.set({
    name: 'privy-token',
    value: '',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: 'privy-refresh-token',
    value: '',
    path: '/',
    maxAge: 0,
  });
  return response;
}
