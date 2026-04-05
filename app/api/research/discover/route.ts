import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { discoverSources, getPayToAddress } from '@/lib/x402-research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { topic: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== 'string') {
    return NextResponse.json({ error: 'Topic required' }, { status: 400 });
  }

  const sources = await discoverSources(body.topic);
  const payTo = getPayToAddress();

  return NextResponse.json({ sources, payTo });
}
