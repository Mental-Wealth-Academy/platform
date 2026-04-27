import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProposalWithReview {
  id: string;
  user_id: string;
  wallet_address: string;
  title: string;
  proposal_markdown: string;
  status: string;
  created_at: string;
  updated_at: string;
  on_chain_proposal_id: string | null;
  on_chain_tx_hash: string | null;
  username: string | null;
  avatar_url: string | null;
  review_decision: string | null;
  review_reasoning: string | null;
  review_token_allocation: number | null;
  review_scores: string | null;
  review_reviewed_at: string | null;
  blue_review_tx_hash: string | null;
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 503 }
    );
  }

  await ensureProposalSchema();

  try {
    // Fetch only proposals that have been reviewed (rejected or created on-chain)
    // This means they have a review decision (rejected) or on_chain_proposal_id (created)
    // Try to include on_chain_proposal_id, but fall back if column doesn't exist
    let proposals: ProposalWithReview[];
    try {
      proposals = await sqlQuery<ProposalWithReview[]>(
        `SELECT 
          p.id,
          p.user_id,
          p.wallet_address,
          p.title,
          p.proposal_markdown,
          p.status,
          p.created_at,
          p.updated_at,
          p.on_chain_proposal_id,
          p.on_chain_tx_hash,
          u.username,
          u.avatar_url,
          pr.decision as review_decision,
          pr.reasoning as review_reasoning,
          pr.token_allocation_percentage as review_token_allocation,
          pr.scores as review_scores,
          pr.reviewed_at as review_reviewed_at,
          pr.blue_review_tx_hash
         FROM proposals p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN proposal_reviews pr ON p.id = pr.proposal_id
         WHERE pr.decision IS NOT NULL
         ORDER BY p.created_at DESC`
      );
    } catch (queryError: any) {
      // If on_chain fields don't exist, try without them
      if (queryError.message?.includes('on_chain') || queryError.code === '42703') {
        console.warn('on_chain columns not found, querying without them');
        proposals = await sqlQuery<ProposalWithReview[]>(
          `SELECT 
            p.id,
            p.user_id,
            p.wallet_address,
            p.title,
            p.proposal_markdown,
            p.status,
            p.created_at,
            p.updated_at,
            NULL as on_chain_proposal_id,
            NULL as on_chain_tx_hash,
            u.username,
            u.avatar_url,
            pr.decision as review_decision,
            pr.reasoning as review_reasoning,
            pr.token_allocation_percentage as review_token_allocation,
            pr.scores as review_scores,
            pr.reviewed_at as review_reviewed_at,
            NULL as blue_review_tx_hash
           FROM proposals p
           LEFT JOIN users u ON p.user_id = u.id
           LEFT JOIN proposal_reviews pr ON p.id = pr.proposal_id
           WHERE pr.decision IS NOT NULL
           ORDER BY p.created_at DESC`
        );
      } else {
        throw queryError;
      }
    }

    // Format the response
    const formattedProposals = proposals.map(p => ({
      id: p.id,
      userId: p.user_id,
      walletAddress: p.wallet_address,
      title: p.title,
      proposalMarkdown: p.proposal_markdown,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      onChainProposalId: p.on_chain_proposal_id || null,
      onChainTxHash: p.on_chain_tx_hash || null,
      user: {
        username: p.username,
        avatarUrl: p.avatar_url,
      },
      review: p.review_decision ? {
        decision: p.review_decision,
        reasoning: p.review_reasoning,
        tokenAllocation: p.review_token_allocation,
        scores: p.review_scores ? (() => {
          try {
            return typeof p.review_scores === 'string' ? JSON.parse(p.review_scores) : p.review_scores;
          } catch (e) {
            console.error('Error parsing review scores:', e);
            return null;
          }
        })() : null,
        reviewedAt: p.review_reviewed_at,
        onChainProposalId: p.on_chain_proposal_id || null,
        blueReviewTxHash: p.blue_review_tx_hash || null,
      } : null,
    }));

    return NextResponse.json({
      ok: true,
      proposals: formattedProposals,
    });
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch proposals.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
