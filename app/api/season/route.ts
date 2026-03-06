import { NextResponse } from 'next/server';
import { getSeasonInfo } from '@/lib/season';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const info = getSeasonInfo();
  return NextResponse.json(info);
}
