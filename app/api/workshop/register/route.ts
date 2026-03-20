import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { sqlQuery } from '@/lib/db';

const TOTAL_SEATS = 20;
const VALID_WORKSHOPS = ['creative-recovery', 'onchain-basics', 'mental-wealth-circle'];

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

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { workshopId, seatIndex } = body;

  if (!workshopId || !VALID_WORKSHOPS.includes(workshopId)) {
    return NextResponse.json({ error: 'Invalid workshop' }, { status: 400 });
  }

  if (typeof seatIndex !== 'number' || seatIndex < 0 || seatIndex >= TOTAL_SEATS) {
    return NextResponse.json({ error: 'Invalid seat' }, { status: 400 });
  }

  try {
    await ensureWorkshopSchema();

    // Check if user already registered for this workshop
    const existing = await sqlQuery<{ id: number }[]>(
      'SELECT id FROM workshop_seats WHERE workshop_id = :workshopId AND wallet_address = :wallet',
      { workshopId, wallet: user.walletAddress }
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already registered for this workshop' }, { status: 409 });
    }

    // Try to claim the seat
    await sqlQuery(
      'INSERT INTO workshop_seats (workshop_id, seat_index, wallet_address) VALUES (:workshopId, :seatIndex, :wallet)',
      { workshopId, seatIndex, wallet: user.walletAddress }
    );

    // Return updated seats
    const rows = await sqlQuery<{ seat_index: number; wallet_address: string }[]>(
      'SELECT seat_index, wallet_address FROM workshop_seats WHERE workshop_id = :workshopId',
      { workshopId }
    );

    const seats = Array.from({ length: TOTAL_SEATS }, (_, i) => {
      const reg = rows.find((r) => r.seat_index === i);
      return { index: i, occupant: reg ? reg.wallet_address : null };
    });

    return NextResponse.json({ seats });
  } catch (err: unknown) {
    // Unique constraint violation — seat already taken
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return NextResponse.json({ error: 'Seat already taken' }, { status: 409 });
    }
    console.error('Workshop register error:', err);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
