import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const data = body?.data;

  if (!data || typeof data !== 'string') {
    return NextResponse.json({ error: 'Invalid save data' }, { status: 400 });
  }

  // Validate that the string is valid JSON before storing
  try {
    JSON.parse(data);
  } catch {
    return NextResponse.json({ error: 'Save data is not valid JSON' }, { status: 400 });
  }

  try {
    await sqlQuery(
      `INSERT INTO chao_garden_saves (user_id, save_data, updated_at)
       VALUES (:id, :saveData::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET save_data = :saveData::jsonb, updated_at = NOW()`,
      { id: user.id, saveData: data }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error saving digipet data:', err);
    return NextResponse.json({ error: 'Failed to save game data' }, { status: 500 });
  }
}
