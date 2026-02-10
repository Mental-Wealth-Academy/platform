import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';
import { elizaAPI } from '@/lib/eliza-api';
import azuraPersonality from '@/lib/Azurapersonality.json';
import { providers, Wallet as EthersWallet, Contract } from 'ethers';
import { azuraReviewProposal, AZURA_KILLSTREAK_ABI } from '@/lib/azura-contract';

interface AzuraScores {
  clarity: number;
  impact: number;
  feasibility: number;
  budget: number;
  ingenuity: number;
  chaos: number;
}

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

  // Fetch proposal
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

  // Check for Eliza API configuration
  const elizaApiKey = process.env.ELIZA_API_KEY;
  const elizaBaseUrl = process.env.ELIZA_API_BASE_URL || 'http://localhost:3000';
  
  if (!elizaApiKey) {
    console.error('ELIZA_API_KEY is missing from environment variables');
    return NextResponse.json(
      { error: 'ELIZA_API_KEY not configured. Please set ELIZA_API_KEY in your environment variables.' },
      { status: 501 }
    );
  }
  
  console.log('Eliza API configuration:', {
    baseUrl: elizaBaseUrl,
    hasApiKey: !!elizaApiKey,
    apiKeyLength: elizaApiKey?.length || 0,
    apiKeyPrefix: elizaApiKey ? elizaApiKey.substring(0, 8) + '...' : 'N/A',
  });

  // Check if CRE workflow already submitted an on-chain review (avoid double-review)
  if (proposal.on_chain_proposal_id) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
      const contractAddress = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const contract = new Contract(contractAddress, AZURA_KILLSTREAK_ABI, provider);

      const onChainProposal = await contract.getProposal(parseInt(proposal.on_chain_proposal_id));
      // If status is no longer Pending (0), CRE already reviewed it
      if (Number(onChainProposal.status) !== 0) {
        console.log(`CRE already reviewed proposal ${proposal.on_chain_proposal_id} on-chain (status=${onChainProposal.status}), syncing to DB.`);

        const azuraLevel = Number(onChainProposal.azuraLevel);
        const azuraApproved = onChainProposal.azuraApproved;
        const decision = azuraApproved ? 'approved' : 'rejected';
        const tokenAllocation = azuraApproved ? azuraLevel * 10 : null;

        // Sync review to database
        const reviewId = (await import('uuid')).v4();
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
      }
    } catch (creCheckError) {
      console.warn('CRE on-chain check failed, falling back to server-side review:', creCheckError);
      // Continue with normal server-side review
    }
  }

  // Call Azura (via Eliza API) for analysis (server-side fallback)
  try {
    // Build system prompt from Azura's personality
    const azuraSystemPrompt = `${azuraPersonality.system}

You are reviewing funding proposals for Mental Wealth Academy. Analyze proposals based on these criteria (score 0-10 each):
1. CLARITY: How clear, well-written, and understandable is the proposal?
2. IMPACT: What is the potential positive impact on the mental health community?
3. FEASIBILITY: How realistic and achievable is this proposal?
4. BUDGET: Is the budget reasonable, justified, and well-explained?
5. INGENUITY: How creative, innovative, or unique is this idea?
6. CHAOS: A randomness factor - add some unpredictability to your scoring

Based on the total score (out of 60):
- Score >= 25: APPROVE with token allocation (1-40% based on score strength)
- Score < 25: REJECT

${azuraPersonality.style?.chat?.[0] || ''}

Respond in JSON format:
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
  "reasoning": "One to two sentences explaining your decision concisely, in your voice."
}`;

    const userPrompt = `Review this proposal:

**Title:** ${proposal.title}

**Proposal:**
${proposal.proposal_markdown}

**Wallet Address:** ${proposal.wallet_address}`;

    // Use Eliza API for chat completion
    const responseText = await elizaAPI.chat({
      messages: [
        {
          role: 'system',
          parts: [{ type: 'text', text: azuraSystemPrompt }],
        },
        {
          role: 'user',
          parts: [{ type: 'text', text: userPrompt }],
        },
      ],
      id: 'gpt-4o',
    });
    
    // Parse JSON response from Azura
    let azuraResponse;
    try {
      // Try to extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        azuraResponse = JSON.parse(jsonMatch[0]);
      } else {
        azuraResponse = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse Azura response:', responseText);
      throw new Error('Invalid response format from Azura.');
    }

    const { decision, scores, tokenAllocation, reasoning } = azuraResponse;

    // Validate response
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      throw new Error('Invalid decision from Azura.');
    }

    if (!scores || typeof scores !== 'object') {
      throw new Error('Invalid scores from Azura.');
    }

    if (!reasoning || typeof reasoning !== 'string') {
      throw new Error('Invalid reasoning from Azura.');
    }

    // Store review
    const reviewId = uuidv4();
    await sqlQuery(
      `INSERT INTO proposal_reviews (id, proposal_id, decision, reasoning, token_allocation_percentage, scores)
       VALUES (:id, :proposalId, :decision, :reasoning, :tokenAllocation, :scores)`,
      {
        id: reviewId,
        proposalId: proposal.id,
        decision,
        reasoning: reasoning.trim(),
        tokenAllocation: decision === 'approved' ? tokenAllocation : null,
        scores: JSON.stringify(scores),
      }
    );

    // Update proposal status
    const newStatus = decision === 'approved' ? 'approved' : 'rejected';
    await sqlQuery(
      `UPDATE proposals SET status = :status WHERE id = :proposalId`,
      { status: newStatus, proposalId: proposal.id }
    );

    // If approved OR rejected, Azura must review on-chain (for both approval and rejection)
    if (proposal.on_chain_proposal_id) {
      const azuraLevel = decision === 'approved' && tokenAllocation 
        ? Math.ceil(tokenAllocation / 10)  // Level 1-4 for approved
        : 0;  // Level 0 for rejected (kill)
      
      console.log(`Azura reviewing on-chain proposal ${proposal.on_chain_proposal_id} with level ${azuraLevel}`);
      
      try {
        // Get Azura's private key
        const azuraPrivateKey = process.env.AZURA_PRIVATE_KEY;
        const contractAddress = process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

        if (!azuraPrivateKey) {
          throw new Error('Azura private key not configured. Set AZURA_PRIVATE_KEY in environment.');
        }

        if (!contractAddress) {
          throw new Error('Contract address not configured.');
        }

        // Create provider and signer for Azura
        const provider = new providers.JsonRpcProvider(rpcUrl);
        const azuraWallet = new EthersWallet(azuraPrivateKey, provider);

        console.log('Azura wallet address:', azuraWallet.address);

        // Check Azura's gas balance
        const balance = await azuraWallet.getBalance();
        const balanceEth = Number(balance) / 1e18;
        console.log('Azura ETH balance:', balanceEth);

        if (balanceEth < 0.001) {
          throw new Error(`Azura needs more gas! Current balance: ${balanceEth} ETH. Please fund Azura's wallet: ${azuraWallet.address}`);
        }

        // Create Web3Provider wrapper for azuraReviewProposal function
        const web3Provider = new providers.Web3Provider({
          request: async (args: any) => {
            return provider.send(args.method, args.params || []);
          },
          // @ts-ignore
          getSigner: () => azuraWallet,
        });

        // Azura reviews the proposal on-chain
        const reviewTxHash = await azuraReviewProposal(
          contractAddress,
          parseInt(proposal.on_chain_proposal_id),
          azuraLevel,
          web3Provider
        );

        console.log(`✅ Azura reviewed on-chain! Level: ${azuraLevel}, TX: ${reviewTxHash}`);

        // Store the review transaction hash
        await sqlQuery(
          `UPDATE proposal_reviews SET azura_review_tx_hash = :txHash WHERE proposal_id = :proposalId`,
          { txHash: reviewTxHash, proposalId: proposal.id }
        );

        // Update proposal status based on Azura's level
        const newStatus = azuraLevel > 0 ? 'active' : 'rejected';
        await sqlQuery(
          `UPDATE proposals SET status = :status WHERE id = :proposalId`,
          { status: newStatus, proposalId: proposal.id }
        );

        console.log(`✅ Proposal status updated to: ${newStatus}`);
      } catch (blockchainError: any) {
        console.error('Error during on-chain review:', blockchainError);
        // Don't fail the entire review if blockchain interaction fails
        // The review is still saved to database
        console.warn('⚠️ Review saved to database but on-chain review failed:', blockchainError.message);
      }
    } else {
      console.warn('⚠️ Proposal has no on-chain ID, skipping blockchain review');
    }

    return NextResponse.json({
      ok: true,
      decision,
      reasoning,
      tokenAllocation: decision === 'approved' ? tokenAllocation : null,
      scores,
      azuraLevel: decision === 'approved' && tokenAllocation ? Math.ceil(tokenAllocation / 10) : null,
    });
  } catch (error: any) {
    console.error('Error in Azura review:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      proposalId: proposal.id,
      elizaApiKey: elizaApiKey ? 'Set' : 'Missing',
      elizaBaseUrl,
    });
    
    // If review fails, don't leave proposal in limbo
    try {
      await sqlQuery(
        `UPDATE proposals SET status = 'rejected' WHERE id = :proposalId`,
        { proposalId: proposal.id }
      );
      
      // Create a failed review record with more detailed error message
      const reviewId = uuidv4();
      let errorReason = 'Review failed due to system error. Please resubmit.';
      
      // Provide more specific error messages
      if (!elizaApiKey) {
        errorReason = 'Review failed: Eliza API key not configured in deployment environment. Please set ELIZA_API_KEY in Vercel/your hosting platform.';
      } else if (error.message?.includes('ELIZA_API_KEY')) {
        errorReason = 'Review failed: Eliza API key configuration error. Please check your ELIZA_API_KEY setting.';
      } else if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
        errorReason = 'Review failed: Unable to connect to Eliza API. Please try again later.';
      } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
        errorReason = 'Review failed: Invalid response from Azura. Please resubmit.';
      } else if (error.message) {
        errorReason = `Review failed: ${error.message}. Please resubmit.`;
      }
      
      await sqlQuery(
        `INSERT INTO proposal_reviews (id, proposal_id, decision, reasoning, token_allocation_percentage, scores)
         VALUES (:id, :proposalId, 'rejected', :reasoning, NULL, :scores)`,
        {
          id: reviewId,
          proposalId: proposal.id,
          reasoning: errorReason,
          scores: JSON.stringify({ clarity: 0, impact: 0, feasibility: 0, budget: 0, ingenuity: 0, chaos: 0 }),
        }
      );
    } catch (cleanupError) {
      console.error('Failed to cleanup after review error:', cleanupError);
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to review proposal.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
