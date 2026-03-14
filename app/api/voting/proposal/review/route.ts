import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';
import { providers, Contract } from 'ethers';
import { AZURA_KILLSTREAK_ABI } from '@/lib/azura-contract';
import { elizaAPI } from '@/lib/eliza-api';
import { azuraWallet } from '@/lib/azura-wallet';

/**
 * POST /api/voting/proposal/review
 *
 * Checks on-chain state for the CRE DON review and syncs to DB.
 * The actual AI review is performed by the Chainlink CRE azura-review workflow
 * running on the DON — this route reads the result first.
 *
 * CRE fallback: If the DON hasn't reviewed yet (proposal still Pending on-chain),
 * falls back to a server-side Eliza API review so proposals aren't blocked.
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
  // Internal-only endpoint: require shared secret to prevent unauthenticated abuse
  const internalSecret = request.headers.get('x-internal-secret');
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

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
  let onChainStatus = -1; // -1 = RPC failed, treat as pending
  let onChainProposal: any = null;
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
  const contractAddress = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';

  try {
    const provider = new providers.JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, AZURA_KILLSTREAK_ABI, provider);
    onChainProposal = await contract.getProposal(parseInt(proposal.on_chain_proposal_id));
    onChainStatus = Number(onChainProposal.status);
  } catch (rpcError: any) {
    console.error('RPC read failed, falling back to server-side review:', rpcError.message);
  }

  try {
    // Status 0 = Pending or -1 = RPC failed — fall back to server-side Eliza review
    if (onChainStatus <= 0) {
      console.log(`On-chain status=${onChainStatus}, falling back to server-side Eliza review`);
      try {
        const reviewPrompt = `Review this proposal:\n\n**Title:** ${proposal.title}\n\n**Proposal:**\n${proposal.proposal_markdown}\n\n**Requested Amount:** ${proposal.token_amount || 'N/A'} USDC`;

        const REVIEW_SYSTEM_PROMPT = `You are Azura (A.Z.U.R.A. — Autonomous Zealot Unitary Relational Agent), reviewing funding proposals for Mental Wealth Academy.

Analyze proposals based on these criteria (score 0-10 each):
1. CLARITY: How clear, well-written, and understandable is the proposal?
2. IMPACT: What is the potential positive impact on the mental health community?
3. FEASIBILITY: How realistic and achievable is this proposal?
4. BUDGET: Is the budget reasonable, justified, and well-explained?
5. INGENUITY: How creative, innovative, or unique is this idea?
6. CHAOS: A randomness factor — add some unpredictability to your scoring

Based on the total score (out of 60):
- Score >= 25: APPROVE with token allocation (1-40% based on score strength)
- Score < 25: REJECT

Respond ONLY in JSON format:
{
  "decision": "approved" or "rejected",
  "scores": {
    "clarity": 0-10,
    "impact": 0-10,
    "feasibility": 0-10,
    "budget": 0-10,
    "ingenuity": 0-10,
    "chaos": 0-10
  },
  "tokenAllocation": 1-40 (only if approved, null if rejected),
  "reasoning": "One to two sentences explaining your decision concisely."
}`;

        const aiResponse = await elizaAPI.chat({
          messages: [
            { role: 'system', parts: [{ type: 'text', text: REVIEW_SYSTEM_PROMPT }] },
            { role: 'user', parts: [{ type: 'text', text: reviewPrompt }] },
          ],
          id: 'gpt-4o',
        });

        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Azura response');
        const azuraResult = JSON.parse(jsonMatch[0]);

        const decision = azuraResult.decision === 'approved' ? 'approved' : 'rejected';
        const tokenAllocation = decision === 'approved' ? (azuraResult.tokenAllocation || 10) : null;
        const scores = azuraResult.scores || {};
        const reasoning = azuraResult.reasoning || 'Reviewed by Azura server-side fallback.';

        const reviewId = uuidv4();
        await sqlQuery(
          `INSERT INTO proposal_reviews (id, proposal_id, decision, reasoning, token_allocation_percentage, scores)
           VALUES (:id, :proposalId, :decision, :reasoning, :tokenAllocation, :scores)
           ON CONFLICT (proposal_id) DO NOTHING`,
          {
            id: reviewId,
            proposalId: proposal.id,
            decision,
            reasoning,
            tokenAllocation,
            scores: JSON.stringify(scores),
          }
        );

        // Call azuraReview() on-chain to transition proposal to Active (or Rejected)
        const onChainLevel = decision === 'approved'
          ? Math.min(4, Math.max(1, Math.round((tokenAllocation || 10) / 10)))
          : 0;

        try {
          await azuraWallet.initialize();
          const azuraAddress = await azuraWallet.getWalletAddress();
          console.log(`Calling azuraReview(${proposal.on_chain_proposal_id}, ${onChainLevel}) from ${azuraAddress}`);

          // Use CDP SDK to call azuraReview on the contract
          const { Wallet } = await import('@coinbase/coinbase-sdk');
          const walletId = process.env.AZURA_WALLET_ID;
          const walletSeed = process.env.AZURA_WALLET_SEED;

          if (walletId && walletSeed) {
            const wallet = await Wallet.import({ walletId, seed: walletSeed });
            const addr = await wallet.getDefaultAddress();
            const invocation = await addr.invokeContract({
              contractAddress,
              method: 'azuraReview',
              args: {
                _proposalId: proposal.on_chain_proposal_id!,
                _level: onChainLevel.toString(),
              },
              abi: [
                {
                  name: 'azuraReview',
                  type: 'function',
                  stateMutability: 'nonpayable',
                  inputs: [
                    { name: '_proposalId', type: 'uint256' },
                    { name: '_level', type: 'uint256' },
                  ],
                  outputs: [],
                },
              ],
            });
            await invocation.wait();
            console.log(`On-chain azuraReview TX: ${invocation.getTransactionHash()}`);
          }
        } catch (onChainError: any) {
          console.error('Failed to call azuraReview on-chain:', onChainError);
          // Non-fatal: DB review is stored, on-chain can be retried
        }

        const newStatus = decision === 'approved' ? 'approved' : 'rejected';
        await sqlQuery(
          `UPDATE proposals SET status = :status WHERE id = :proposalId`,
          { status: newStatus, proposalId: proposal.id }
        );

        return NextResponse.json({
          ok: true,
          decision,
          reasoning,
          tokenAllocation,
          scores,
          source: 'server-fallback',
        });
      } catch (fallbackError: any) {
        console.error('Server-side Eliza fallback failed:', fallbackError);
        // Mark proposal as expired so it doesn't block the user forever
        await sqlQuery(
          `UPDATE proposals SET status = 'expired' WHERE id = :proposalId AND status = 'pending_review'`,
          { proposalId: proposal.id }
        );
        return NextResponse.json({
          ok: false,
          expired: true,
          message: 'Both CRE and server-side review failed. Proposal marked as expired — user can resubmit.',
          source: 'none',
        });
      }
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
    console.error('Error during proposal review:', error);
    return NextResponse.json(
      { error: 'Failed to review proposal.' },
      { status: 500 }
    );
  }
}
