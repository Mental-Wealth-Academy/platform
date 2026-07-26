import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Legacy Kalshi endpoint — redirects to the provider-neutral /api/treasury/markets route.
 * Kept so cached frontend requests and bookmarks do not 404 during rollout.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/api/treasury/markets';
  return NextResponse.redirect(url, 308);
}
