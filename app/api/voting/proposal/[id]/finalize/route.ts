import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureProposalSchema } from '@/lib/ensureProposalSchema';
import { getUserFromRequest } from '@/lib/auth';
import { blueWallet } from '@/lib/blue-wallet';
import { providers, Contract } from 'ethers';
import { BLUE_KILLSTREAK_ABI } from '@/lib/blue-contract';

interface ProposalData {
  id: string;
  user_id: string;
  wallet_address: string;
  title: string;
  status: string;
  token_allocation_percentage: number | null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 503 }
    );
  }

  await ensureProposalSchema();

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const proposalId = params.id;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { userWalletAddress } = body;

  if (!userWalletAddress || typeof userWalletAddress !== 'string') {
    return NextResponse.json(
      { error: 'User wallet address is required.' },
      { status: 400 }
    );
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(userWalletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address format.' },
      { status: 400 }
    );
  }

  try {
    // Fetch proposal with review data
    const proposals = await sqlQuery<ProposalData[]>(
      `SELECT 
        p.id,
        p.user_id,
        p.wallet_address,
        p.title,
        p.status,
        pr.token_allocation_percentage
       FROM proposals p
       LEFT JOIN proposal_reviews pr ON p.id = pr.proposal_id
       WHERE p.id = :proposalId
       LIMIT 1`,
      { proposalId }
    );

    if (proposals.length === 0) {
      return NextResponse.json(
        { error: 'Proposal not found.' },
        { status: 404 }
      );
    }

    const proposal = proposals[0];

    // Verify proposal is approved
    if (proposal.status !== 'approved') {
      return NextResponse.json(
        { error: `Proposal must be approved before finalization. Current status: ${proposal.status}` },
        { status: 400 }
      );
    }

    // Verify token allocation exists
    if (!proposal.token_allocation_percentage) {
      return NextResponse.json(
        { error: 'No token allocation found for this proposal.' },
        { status: 400 }
      );
    }

    // Verify user is the proposal owner
    if (proposal.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the proposal owner can finalize it.' },
        { status: 403 }
      );
    }

    // Verify wallet address matches
    if (proposal.wallet_address.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Wallet address does not match proposal submitter.' },
        { status: 403 }
      );
    }

    // Check if already finalized
    const existingTransactions = await sqlQuery<Array<{ id: string }>>(
      `SELECT id FROM proposal_transactions 
       WHERE proposal_id = :proposalId 
       AND transaction_status IN ('pending', 'confirmed')
       LIMIT 1`,
      { proposalId }
    );

    if (existingTransactions.length > 0) {
      return NextResponse.json(
        { error: 'Proposal has already been finalized.' },
        { status: 409 }
      );
    }

    // Initialize Blue wallet
    await blueWallet.initialize();

    // Check if Blue can allocate the tokens
    const canAllocate = await blueWallet.canAllocate(proposal.token_allocation_percentage);
    if (!canAllocate.canAllocate) {
      return NextResponse.json(
        { error: `Cannot allocate tokens: ${canAllocate.reason}` },
        { status: 400 }
      );
    }

    // Execute token allocation
    console.log(`Finalizing proposal ${proposalId} with ${proposal.token_allocation_percentage}% allocation`);
    
    const allocation = await blueWallet.allocateTokens(
      userWalletAddress,
      proposal.token_allocation_percentage,
      proposalId
    );

    // Record transaction in database
    const transactionId = uuidv4();
    await sqlQuery(
      `INSERT INTO proposal_transactions (
        id, 
        proposal_id, 
        transaction_hash, 
        transaction_status, 
        token_amount, 
        gas_used
      )
       VALUES (:id, :proposalId, :txHash, 'pending', :tokenAmount, :gasUsed)`,
      {
        id: transactionId,
        proposalId,
        txHash: allocation.txHash,
        tokenAmount: allocation.amount.toString(),
        gasUsed: allocation.estimatedGas,
      }
    );

    // Update proposal status to 'active' (now on blockchain)
    await sqlQuery(
      `UPDATE proposals 
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = :proposalId`,
      { proposalId }
    );

    console.log(`✅ Proposal ${proposalId} finalized. TX: ${allocation.txHash}`);

    return NextResponse.json({
      ok: true,
      transactionHash: allocation.txHash,
      tokenAmount: allocation.amount.toString(),
      tokenPercentage: proposal.token_allocation_percentage,
      estimatedConfirmationTime: 15, // Base network ~2 seconds, but we add buffer
      gasEstimate: allocation.estimatedGas,
      message: 'Proposal finalized successfully. Tokens are being transferred on-chain.',
    });
  } catch (error: any) {
    console.error('Error finalizing proposal:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('CDP API credentials')) {
      return NextResponse.json(
        { error: 'Blockchain service not configured. Please contact support.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('Insufficient balance')) {
      return NextResponse.json(
        { error: 'Insufficient token balance in Blue wallet. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to finalize proposal.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check finalization status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured.' },
      { status: 503 }
    );
  }

  await ensureProposalSchema();

  const proposalId = params.id;

  // Sync on-chain state: if CRE auto-executed the proposal, update DB
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    const contractAddress = process.env.NEXT_PUBLIC_BLUE_KILLSTREAK_ADDRESS || '0x2cbb90a761ba64014b811be342b8ef01b471992d';
    const provider = new providers.JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, BLUE_KILLSTREAK_ABI, provider);

    // Look up the on-chain proposal ID for this DB proposal
    const proposalRows = await sqlQuery<Array<{ on_chain_proposal_id: string | null; status: string }>>(
      `SELECT on_chain_proposal_id, status FROM proposals WHERE id = :proposalId LIMIT 1`,
      { proposalId }
    );

    if (proposalRows.length > 0 && proposalRows[0].on_chain_proposal_id) {
      const onChainId = parseInt(proposalRows[0].on_chain_proposal_id);
      const onChainProposal = await contract.getProposal(onChainId);

      // Status 2 = Executed on-chain
      if (Number(onChainProposal.status) === 2 && proposalRows[0].status !== 'completed') {
        console.log(`CRE auto-executed proposal ${onChainId} on-chain, syncing DB status.`);
        await sqlQuery(
          `UPDATE proposals SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :proposalId`,
          { proposalId }
        );
      }
    }
  } catch (syncError) {
    console.warn('CRE on-chain sync check failed:', syncError);
    // Non-fatal — continue with normal flow
  }

  try {
    const transactions = await sqlQuery<Array<{
      id: string;
      transaction_hash: string;
      transaction_status: string;
      token_amount: string;
      gas_used: string;
      created_at: string;
      confirmed_at: string | null;
    }>>(
      `SELECT 
        id,
        transaction_hash,
        transaction_status,
        token_amount,
        gas_used,
        created_at,
        confirmed_at
       FROM proposal_transactions
       WHERE proposal_id = :proposalId
       ORDER BY created_at DESC
       LIMIT 1`,
      { proposalId }
    );

    if (transactions.length === 0) {
      return NextResponse.json({
        ok: true,
        finalized: false,
        message: 'Proposal has not been finalized yet.',
      });
    }

    const transaction = transactions[0];

    return NextResponse.json({
      ok: true,
      finalized: true,
      transaction: {
        hash: transaction.transaction_hash,
        status: transaction.transaction_status,
        tokenAmount: transaction.token_amount,
        gasUsed: transaction.gas_used,
        createdAt: transaction.created_at,
        confirmedAt: transaction.confirmed_at,
      },
    });
  } catch (error) {
    console.error('Error fetching finalization status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finalization status.' },
      { status: 500 }
    );
  }
}
