import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { simulateNextChatTurn } from '@/lib/chat-simulator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  try {
    const posted = await simulateNextChatTurn();
    return NextResponse.json({ ok: true, posted });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Simulation failed';
    return NextResponse.json({ error }, { status: 500 });
  }
}
