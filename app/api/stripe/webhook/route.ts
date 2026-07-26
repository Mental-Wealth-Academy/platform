import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { sqlQuery } from '@/lib/db';
import { ensureMembershipSchema } from '@/lib/ensureMembershipSchema';
import { ensureShopFiatPurchasesSchema } from '@/lib/ensureShopFiatPurchasesSchema';
import { deliverMembershipOrder } from '@/lib/membership-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler for both shop fiat purchases and VIP Membership orders/subscriptions.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Shop item checkout session
    if (session.metadata?.itemId && session.metadata?.userId) {
      await ensureShopFiatPurchasesSchema();
      const itemId = session.metadata.itemId;
      const userId = session.metadata.userId;
      const amountCents = session.amount_total ?? 0;
      const sessionId = session.id;

      try {
        await sqlQuery(
          `INSERT INTO shop_fiat_purchases (user_id, item_id, amount_cents, stripe_session_id)
           VALUES (:userId, :itemId, :amountCents, :sessionId)
           ON CONFLICT (stripe_session_id) DO NOTHING`,
          { userId, itemId, amountCents, sessionId }
        );
      } catch (err) {
        console.error('[shop webhook] Failed to record fiat purchase:', err);
      }
      return NextResponse.json({ received: true });
    }

    // Membership subscription checkout session
    const recordId = session.metadata?.membershipSubscriptionId;
    if (recordId && session.mode === 'subscription') {
      await ensureMembershipSchema();
      await sqlQuery(
        `UPDATE membership_subscriptions
            SET stripe_customer_id=:customerId,
                stripe_subscription_id=:subscriptionId,
                updated_at=CURRENT_TIMESTAMP
          WHERE id=:id`,
        {
          id: recordId,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
        },
      );
    }
    return NextResponse.json({ received: true });
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const recordId = subscription.metadata?.membershipSubscriptionId;
    if (recordId) {
      await ensureMembershipSchema();
      const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
      await sqlQuery(
        `UPDATE membership_subscriptions
            SET stripe_customer_id=:customerId,
                stripe_subscription_id=:subscriptionId,
                status=:status,
                current_period_end=:periodEnd,
                updated_at=CURRENT_TIMESTAMP
          WHERE id=:id`,
        {
          id: recordId,
          customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          subscriptionId: subscription.id,
          status: subscription.status,
          periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      );
    }
    return NextResponse.json({ received: true });
  }

  // A payment that never cleared — release the slot.
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      await ensureMembershipSchema();
      await sqlQuery(
        `UPDATE membership_orders
            SET status='failed', error=:err, updated_at=CURRENT_TIMESTAMP
          WHERE id=:id AND stripe_payment_intent_id=:paymentIntentId
            AND status IN ('pending', 'paid')`,
        {
          id: orderId,
          paymentIntentId: pi.id,
          err: pi.last_payment_error?.message ?? 'Payment failed',
        },
      );
    }
    return NextResponse.json({ received: true });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true });
  }

  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata?.orderId;
  const buyerWallet = pi.metadata?.buyerWallet;

  if (!orderId || !buyerWallet) {
    console.error('[membership webhook] payment intent missing metadata:', pi.id);
    return NextResponse.json({ received: true });
  }

  await ensureMembershipSchema();

  // Record that payment cleared. The conditional update keeps this idempotent
  // and lets a payment that lands after the reservation lapsed still deliver.
  await sqlQuery(
    `UPDATE membership_orders
        SET status='paid', updated_at=CURRENT_TIMESTAMP
      WHERE id=:id AND stripe_payment_intent_id=:paymentIntentId
        AND status IN ('pending', 'paid', 'expired')`,
    { id: orderId, paymentIntentId: pi.id },
  );

  // Hand off to the shared delivery path. If it fails, the order is left as
  // `failed` and the reconcile cron retries — no need to fail the webhook.
  const result = await deliverMembershipOrder(orderId);
  return NextResponse.json({ received: true, status: result.status, txHash: result.txHash });
}
