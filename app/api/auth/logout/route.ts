import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Logout endpoint.
 * Clears all auth cookies. Privy disconnect is handled client-side.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Clear all auth cookies
  for (const name of ['mwa_session', 'session_token', 'privy-token', 'privy-refresh-token']) {
    response.cookies.set({ name, value: '', path: '/', maxAge: 0 });
  }

  return response;
}
