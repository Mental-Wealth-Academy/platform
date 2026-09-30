import { NextRequest, NextResponse } from 'next/server';
import { sendGuidanceBookingInviteEmail, isEmailConfigured } from '@/lib/email';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rate = checkRateLimit({
    max: 6,
    windowMs: 60 * 1000,
    identifier: `guidance-email:${getClientIdentifier(request)}`,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: getRateLimitHeaders(rate) }
    );
  }

  let body: { email?: string; name?: string; focusArea?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json', message: 'Malformed JSON payload.' }, { status: 400 });
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
    return NextResponse.json(
      { error: 'invalid_email', message: 'A valid email address is required.' },
      { status: 400 }
    );
  }

  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const focusArea = typeof body.focusArea === 'string' ? body.focusArea.trim() : undefined;

  if (!isEmailConfigured()) {
    console.warn('[guidance-email] RESEND_API_KEY is not configured on this environment.');
    return NextResponse.json({
      success: true,
      delivered: false,
      message: 'Email service simulated (RESEND_API_KEY not configured). Booking link generated.',
    });
  }

  const sent = await sendGuidanceBookingInviteEmail(rawEmail, name, focusArea);
  if (!sent) {
    return NextResponse.json(
      { error: 'send_failed', message: 'Unable to deliver email via provider.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    delivered: true,
    message: `Consultation booking invitation sent to ${rawEmail}.`,
  });
}
