import { NextRequest, NextResponse } from 'next/server';
import { sqlQuery, isDbConfigured } from '@/lib/db';
import { ensureGuidanceSchema } from '@/lib/ensureGuidanceSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_PRICE_CENTS = 12000; // $120 for 50-minute clinical session

export async function POST(request: NextRequest) {
  const rate = checkRateLimit({
    max: 10,
    windowMs: 60 * 1000,
    identifier: `guidance:${getClientIdentifier(request)}`,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: getRateLimitHeaders(rate) }
    );
  }

  let body: {
    name?: string;
    email?: string;
    contact?: string;
    focusArea?: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const user = await getCurrentUserFromRequestCookie().catch(() => null);
  const userId = user?.id ?? null;

  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim()
    : (user?.username ? `@${user.username}` : (user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Academy Member'));
  const email = typeof body.email === 'string' && body.email.trim()
    ? body.email.trim().toLowerCase()
    : 'in-app-message';
  const contact = typeof body.contact === 'string' && body.contact.trim()
    ? body.contact.trim()
    : 'In-App Message';
  const focusArea = typeof body.focusArea === 'string' && body.focusArea.trim()
    ? body.focusArea.trim()
    : 'General Mental Wealth';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';

  let consultationId: string | null = null;

  if (isDbConfigured()) {
    try {
      await ensureGuidanceSchema();
      const rows = await sqlQuery<Array<{ id: string }>>(
        `INSERT INTO practitioner_consultations (user_id, name, email, contact, focus_area, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [userId, name, email, contact, focusArea, notes]
      );
      consultationId = rows[0]?.id ?? null;
    } catch (err) {
      console.error('[Guidance] DB error:', err);
    }
  }

  // Attempt Stripe Checkout Session if STRIPE_SECRET_KEY is configured
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      const origin = request.nextUrl.origin;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email !== 'in-app-message' ? email : undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: SESSION_PRICE_CENTS,
              product_data: {
                name: '1-on-1 Session with Lead Practitioner',
                description: `50-minute clinical mental wealth consultation (${focusArea})`,
                images: [`${origin}/icons/professional-guidance.png`],
              },
            },
          },
        ],
        metadata: {
          consultationId: consultationId ?? '',
          name,
          email,
          contact,
          focusArea,
        },
        success_url: `${origin}/home?guidance=success`,
        cancel_url: `${origin}/home?guidance=canceled`,
      });

      if (consultationId && session.id && isDbConfigured()) {
        try {
          await sqlQuery(
            `UPDATE practitioner_consultations SET stripe_session_id = $1 WHERE id = $2`,
            [session.id, consultationId]
          );
        } catch {
          // non-fatal
        }
      }

      if (session.url) {
        return NextResponse.json({ success: true, checkoutUrl: session.url });
      }
    } catch (err) {
      console.error('[Guidance] Stripe checkout creation failed:', err);
      // Fall through to returning booked confirmation so client intake is preserved
    }
  }

  return NextResponse.json({
    success: true,
    booked: true,
    message: 'Your intake was received. A Lead Practitioner will contact you to confirm timing and session credentials.',
  });
}
