import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';

/**
 * CDP Webhook Handler
 * Receives real-time notifications from Coinbase Developer Platform
 * for on-chain events related to AzuraKillStreak contract
 * 
 * Setup at: https://portal.cdp.coinbase.com/products/data/node
 */

interface CDPWebhookEvent {
  type: string;
  network: string;
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  eventName: string;
  eventData: any;
  timestamp: string;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 503 }
    );
  }

  await ensureProposalSchema();

  // Verify webhook signature (Coinbase CDP provides this)
  const signature = request.headers.get('x-cdp-signature');
  const webhookSecret = process.env.CDP_WEBHOOK_SECRET;

  // SECURITY: Always require webhook secret in production
  if (!webhookSecret) {
    console.error('CDP_WEBHOOK_SECRET not configured - rejecting webhook');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  // SECURITY: Always require signature
  if (!signature) {
    console.error('Missing webhook signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

    // Verify signature
    const body = await request.text();
    const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Re-parse body after verification
    const event: CDPWebhookEvent = JSON.parse(body);
    await processEvent(event);

  return NextResponse.json({ ok: true, received: true });
}

/**
 * Verify CDP webhook signature
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const key = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Buffer.from(signatureBuffer).toString('hex');

    // SECURITY: Use constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) return false;
    const { timingSafeEqual } = await import('crypto');
    return timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Process CDP webhook event
 */
async function processEvent(event: CDPWebhookEvent): Promise<void> {
  console.log('CDP Webhook received:', {
    type: event.type,
    eventName: event.eventName,
    txHash: event.transactionHash,
  });

  try {
    switch (event.eventName) {
      case 'ProposalCreated':
        await handleProposalCreated(event);
        break;
      
      case 'AzuraReview':
        await handleAzuraReview(event);
        break;
      
      case 'VoteCast':
        await handleVoteCast(event);
        break;
      
      case 'ProposalExecuted':
        await handleProposalExecuted(event);
        break;
      
      case 'ProposalRejected':
        await handleProposalRejected(event);
        break;
      
      default:
        console.log('Unhandled event:', event.eventName);
    }
  } catch (error) {
    console.error('Error processing event:', error);
    throw error;
  }
}

/**
 * Handle ProposalCreated event
 */
async function handleProposalCreated(event: CDPWebhookEvent): Promise<void> {
  const { proposalId, proposer, recipient, usdcAmount, title } = event.eventData;
  
  console.log(`Proposal #${proposalId} created by ${proposer}`);
  
  // Update proposal status in database to track on-chain state
  await sqlQuery(
    `UPDATE proposals
     SET status = 'on_chain_pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id FROM proposals
       WHERE LOWER(wallet_address) = LOWER(:proposer)
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    { proposer }
  );
}

/**
 * Handle AzuraReview event
 */
async function handleAzuraReview(event: CDPWebhookEvent): Promise<void> {
  const { proposalId, azuraLevel, approved, voteWeight } = event.eventData;
  
  console.log(`Azura reviewed proposal #${proposalId}: Level ${azuraLevel}, Approved: ${approved}`);
  
  // Update proposal with Azura's review from on-chain
  if (approved) {
    await sqlQuery(
      `UPDATE proposals 
       SET status = 'on_chain_active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM proposals 
         WHERE status IN ('pending_review', 'approved', 'on_chain_pending')
         ORDER BY created_at DESC 
         LIMIT 1
       )`,
      {}
    );
  } else {
    await sqlQuery(
      `UPDATE proposals 
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM proposals 
         WHERE status IN ('pending_review', 'approved', 'on_chain_pending')
         ORDER BY created_at DESC 
         LIMIT 1
       )`,
      {}
    );
  }
}

/**
 * Handle VoteCast event
 */
async function handleVoteCast(event: CDPWebhookEvent): Promise<void> {
  const { proposalId, voter, support, weight } = event.eventData;
  
  console.log(`Vote cast on proposal #${proposalId} by ${voter}: ${support ? 'For' : 'Against'} (${weight} weight)`);
  
  // Could store vote history in database if needed, but not required
  // Blockchain is the source of truth
}

/**
 * Handle ProposalExecuted event
 */
async function handleProposalExecuted(event: CDPWebhookEvent): Promise<void> {
  const { proposalId, recipient, usdcAmount } = event.eventData;
  
  console.log(`✅ Proposal #${proposalId} executed! ${usdcAmount} USDC sent to ${recipient}`);
  
  // Update proposal status to executed
  await sqlQuery(
    `UPDATE proposals
     SET status = 'executed',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id FROM proposals
       WHERE status = 'on_chain_active'
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    {}
  );

  // Record transaction if we have the proposal in our database
  await sqlQuery(
    `UPDATE proposal_transactions
     SET transaction_status = 'confirmed',
         transaction_hash = :txHash,
         confirmed_at = CURRENT_TIMESTAMP
     WHERE proposal_id IN (
       SELECT id FROM proposals
       WHERE status = 'executed'
       ORDER BY updated_at DESC
       LIMIT 1
     )`,
    { txHash: event.transactionHash }
  );
}

/**
 * Handle ProposalRejected event
 */
async function handleProposalRejected(event: CDPWebhookEvent): Promise<void> {
  const { proposalId } = event.eventData;
  
  console.log(`❌ Proposal #${proposalId} rejected`);
  
  await sqlQuery(
    `UPDATE proposals
     SET status = 'rejected',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = (
       SELECT id FROM proposals
       WHERE status IN ('on_chain_pending', 'on_chain_active')
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    {}
  );
}
