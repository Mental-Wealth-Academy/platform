import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';
import { providers, Contract } from 'ethers';
import { AZURA_KILLSTREAK_ABI } from '@/lib/azura-contract';

/**
 * POST /api/voting/proposal/review
 *
 * Checks on-chain state for the CRE DON review and syncs to DB.
 * The actual AI review is performed by the Chainlink CRE azura-review workflow
 * running on the DON — this route only reads the result.
 *
 * If the DON hasn't reviewed yet (proposal still Pending on-chain),
 * returns a "pending" response so the client can poll again.
 */

interface ProposalData {
  id: string;
  title: string;
  proposal_markdown: string;
  wallet_address: string;
  on_chain_proposal_id: string | null;
  recipient_address: string | null;
  token_amount: string | null;
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 503 }
    );
  }

  await ensureProposalSchema();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { proposalId } = body;

  if (!proposalId || typeof proposalId !== 'string') {
    return NextResponse.json(
      { error: 'Proposal ID is required.' },
      { status: 400 }
    );
  }

  // Fetch proposal from DB
  let proposal: ProposalData;
  try {
    const proposals = await sqlQuery<ProposalData[]>(
      `SELECT id, title, proposal_markdown, wallet_address, on_chain_proposal_id, recipient_address, token_amount
       FROM proposals
       WHERE id = :proposalId AND status = 'pending_review'
       LIMIT 1`,
      { proposalId }
    );

    if (proposals.length === 0) {
      return NextResponse.json(
        { error: 'Proposal not found or already reviewed.' },
        { status: 404 }
      );
    }

    proposal = proposals[0];
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal.' },
      { status: 500 }
    );
  }

  // Must have an on-chain proposal for CRE to review
  if (!proposal.on_chain_proposal_id) {
    return NextResponse.json(
      { error: 'Proposal has no on-chain ID. CRE review requires an on-chain proposal.' },
      { status: 400 }
    );
  }

  // Read on-chain state to check if DON has reviewed
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    const contractAddress = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
    const provider = new providers.JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, AZURA_KILLSTREAK_ABI, provider);

    const onChainProposal = await contract.getProposal(parseInt(proposal.on_chain_proposal_id));
    const onChainStatus = Number(onChainProposal.status);

    // Status 0 = Pending — DON hasn't reviewed yet
    if (onChainStatus === 0) {
      return NextResponse.json({
        ok: true,
        pending: true,
        message: 'Awaiting Chainlink CRE review. The DON will review this proposal automatically.',
        source: 'cre',
      });
    }

    // DON has reviewed — sync result to DB
    const azuraLevel = Number(onChainProposal.azuraLevel);
    const azuraApproved = onChainProposal.azuraApproved;
    const decision = azuraApproved ? 'approved' : 'rejected';
    const tokenAllocation = azuraApproved ? azuraLevel * 10 : null;

    // Store review in DB
    const reviewId = uuidv4();
    await sqlQuery(
      `INSERT INTO proposal_reviews (id, proposal_id, decision, reasoning, token_allocation_percentage, scores)
       VALUES (:id, :proposalId, :decision, :reasoning, :tokenAllocation, :scores)
       ON CONFLICT (proposal_id) DO NOTHING`,
      {
        id: reviewId,
        proposalId: proposal.id,
        decision,
        reasoning: 'Reviewed by Chainlink CRE decentralized workflow.',
        tokenAllocation,
        scores: JSON.stringify({ clarity: 0, impact: 0, feasibility: 0, budget: 0, ingenuity: 0, chaos: 0 }),
      }
    );

    // Update proposal status
    const newStatus = azuraApproved ? 'active' : 'rejected';
    await sqlQuery(
      `UPDATE proposals SET status = :status WHERE id = :proposalId`,
      { status: newStatus, proposalId: proposal.id }
    );

    return NextResponse.json({
      ok: true,
      decision,
      reasoning: 'Reviewed by Chainlink CRE decentralized workflow.',
      tokenAllocation,
      scores: null,
      azuraLevel,
      source: 'cre',
    });
  } catch (error: any) {
    console.error('Error reading on-chain review state:', error);
    return NextResponse.json(
      { error: 'Failed to read on-chain review state.' },
      { status: 500 }
    );
  }
}
