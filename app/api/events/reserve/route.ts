import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureEventsSchema } from '@/lib/ensureEventsSchema';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rlResult = checkRateLimit({
    max: 10,
    windowMs: 60 * 1000,
    identifier: `events-reserve:${getClientIdentifier(request)}`,
  });
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rlResult) }
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }

  await ensureEventsSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const eventSlug = body?.eventSlug;

    if (!eventSlug || typeof eventSlug !== 'string') {
      return NextResponse.json(
        { error: 'Event slug is required.' },
        { status: 400 }
      );
    }

    // Check if event exists
    const eventRows = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM events WHERE slug = :slug LIMIT 1`,
      { slug: eventSlug }
    );

    if (eventRows.length === 0) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 }
      );
    }

    const eventId = eventRows[0].id;

    // Check if user already has a reservation
    const existingReservation = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM event_reservations 
       WHERE user_id = :userId AND event_id = :eventId LIMIT 1`,
      { userId: user.id, eventId }
    );

    if (existingReservation.length > 0) {
      return NextResponse.json(
        { error: 'You have already reserved a seat for this event.' },
        { status: 409 }
      );
    }

    // Create reservation
    await sqlQuery(
      `INSERT INTO event_reservations (user_id, event_id)
       VALUES (:userId, :eventId)`,
      { userId: user.id, eventId }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Failed to create event reservation:', err);
    
    // Handle unique constraint violation (shouldn't happen due to check above, but just in case)
    if (err?.code === '23505') {
      return NextResponse.json(
        { error: 'You have already reserved a seat for this event.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reserve seat. Please try again.' },
      { status: 500 }
    );
  }
}
