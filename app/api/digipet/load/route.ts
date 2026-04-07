import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await sqlQuery<Array<{ save_data: unknown }>>(
      `SELECT save_data FROM chao_garden_saves WHERE user_id = :id LIMIT 1`,
      { id: user.id }
    );

    const data = rows.length > 0 ? JSON.stringify(rows[0].save_data) : null;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error loading digipet data:', err);
    return NextResponse.json({ error: 'Failed to load game data' }, { status: 500 });
  }
}
