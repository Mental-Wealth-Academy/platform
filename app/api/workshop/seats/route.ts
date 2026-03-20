import { NextRequest, NextResponse } from 'next/server';
import { sqlQuery } from '@/lib/db';

const TOTAL_SEATS = 20;

async function ensureWorkshopSchema() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS workshop_seats (
      id SERIAL PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      seat_index INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(workshop_id, seat_index),
      UNIQUE(workshop_id, wallet_address)
    )
  `);
}

export async function GET(req: NextRequest) {
  const workshopId = req.nextUrl.searchParams.get('workshopId');
  if (!workshopId) {
    return NextResponse.json({ error: 'workshopId required' }, { status: 400 });
  }

  try {
    await ensureWorkshopSchema();

    const rows = await sqlQuery<{ seat_index: number; wallet_address: string }[]>(
      'SELECT seat_index, wallet_address FROM workshop_seats WHERE workshop_id = :workshopId',
      { workshopId }
    );

    const seats = Array.from({ length: TOTAL_SEATS }, (_, i) => {
      const reg = rows.find((r) => r.seat_index === i);
      return { index: i, occupant: reg ? reg.wallet_address : null };
    });

    return NextResponse.json({ seats });
  } catch (err) {
    console.error('Workshop seats error:', err);
    return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 });
  }
}
