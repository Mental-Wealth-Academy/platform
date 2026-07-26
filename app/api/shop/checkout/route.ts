import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured } from '@/lib/db';
import { getShopItem } from '@/lib/shop-catalog';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/shop/checkout
 * Body: { itemId: string }
 * Creates a Stripe Checkout Session for purchasing a shop item with fiat currency.
 */
export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe payments not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in to purchase items.' }, { status: 401 });
  }

  const rl = checkRateLimit({
    max: 20,
    windowMs: 60 * 60 * 1000,
    identifier: `shop-checkout:${user.id}`,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  let body: { itemId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  const item = getShopItem(itemId);

  if (!item) {
    return NextResponse.json({ error: 'Unknown item.' }, { status: 400 });
  }

  if (item.badge === 'sold-out') {
    return NextResponse.json({ error: 'This item is sold out.' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const imageUrl = item.image.startsWith('http')
    ? item.image
    : item.image.startsWith('/')
    ? `${origin}${item.image}`
    : undefined;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: item.priceCents,
            product_data: {
              name: item.title,
              description: item.sub ? `${item.sub} — ${item.desc}` : item.desc,
              images: imageUrl ? [imageUrl] : undefined,
            },
          },
        },
      ],
      metadata: {
        itemId: item.id,
        userId: user.id,
      },
      success_url: `${origin}/shop?success=true&item=${encodeURIComponent(item.id)}`,
      cancel_url: `${origin}/shop?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to generate checkout session URL.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[shop checkout] Failed to create Stripe checkout session:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create checkout session.' },
      { status: 500 }
    );
  }
}
