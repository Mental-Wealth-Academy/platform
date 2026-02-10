import { Contract, providers } from 'ethers';

/**
 * AzuraKillStreak Contract Interface
 * Frontend library for interacting with the on-chain governance contract
 */

// Contract ABI (only the functions we need)
export const AZURA_KILLSTREAK_ABI = [
  // Read functions
  'function getProposal(uint256 _proposalId) external view returns (tuple(uint256 id, address proposer, address recipient, uint256 usdcAmount, string title, string description, uint256 createdAt, uint256 votingDeadline, uint8 status, uint256 forVotes, uint256 againstVotes, uint256 azuraLevel, bool azuraApproved, bool executed))',
  'function getVotingProgress(uint256 _proposalId) external view returns (uint256 forVotes, uint256 againstVotes, uint256 percentageFor)',
  'function hasReachedThreshold(uint256 _proposalId) external view returns (bool)',
  'function getVotingPower(address _voter) external view returns (uint256)',
  'function proposalCount() external view returns (uint256)',
  'function azuraAgent() external view returns (address)',
  
  // Write functions
  'function createProposal(address _recipient, uint256 _usdcAmount, string _title, string _description, uint256 _votingPeriod) external returns (uint256)',
  'function azuraReview(uint256 _proposalId, uint256 _level) external',
  'function vote(uint256 _proposalId, bool _support) external',
  'function executeProposal(uint256 _proposalId) external',
  'function onReport(bytes calldata metadata, bytes calldata report) external',
  'function setKeystoneForwarder(address _forwarder) external',
  'function keystoneForwarder() external view returns (address)',
  
  // Events
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed recipient, uint256 usdcAmount, string title, uint256 votingDeadline)',
  'event AzuraReview(uint256 indexed proposalId, uint256 azuraLevel, bool approved, uint256 voteWeight)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 usdcAmount)',
];

export interface OnChainProposal {
  id: number;
  proposer: string;
  recipient: string;
  usdcAmount: string;
  title: string;
  description: string;
  createdAt: number;
  votingDeadline: number;
  status: ProposalStatus;
  forVotes: string;
  againstVotes: string;
  azuraLevel: number;
  azuraApproved: boolean;
  executed: boolean;
}

export enum ProposalStatus {
  Pending = 0,
  Active = 1,
  Executed = 2,
  Rejected = 3,
  Cancelled = 4,
}

export interface VotingProgress {
  forVotes: string;
  againstVotes: string;
  percentageFor: number;
}

/**
 * Get contract instance
 */
export function getAzuraKillStreakContract(
  contractAddress: string,
  provider: providers.Web3Provider
): Contract {
  return new Contract(contractAddress, AZURA_KILLSTREAK_ABI, provider);
}

/**
 * Get contract instance with signer (for write operations)
 */
export async function getAzuraKillStreakContractWithSigner(
  contractAddress: string,
  provider: providers.Web3Provider
): Promise<Contract> {
  const signer = provider.getSigner();
  return new Contract(contractAddress, AZURA_KILLSTREAK_ABI, signer);
}

/**
 * Fetch a proposal from the contract
 */
export async function fetchProposal(
  contractAddress: string,
  proposalId: number,
  provider: providers.Web3Provider
): Promise<OnChainProposal> {
  const contract = getAzuraKillStreakContract(contractAddress, provider);
  const proposal = await contract.getProposal(proposalId);
  
  return {
    id: Number(proposal.id),
    proposer: proposal.proposer,
    recipient: proposal.recipient,
    usdcAmount: proposal.usdcAmount.toString(),
    title: proposal.title,
    description: proposal.description,
    createdAt: Number(proposal.createdAt),
    votingDeadline: Number(proposal.votingDeadline),
    status: proposal.status,
    forVotes: proposal.forVotes.toString(),
    againstVotes: proposal.againstVotes.toString(),
    azuraLevel: Number(proposal.azuraLevel),
    azuraApproved: proposal.azuraApproved,
    executed: proposal.executed,
  };
}

/**
 * Fetch all proposals from the contract
 */
export async function fetchAllProposals(
  contractAddress: string,
  provider: providers.Web3Provider
): Promise<OnChainProposal[]> {
  const contract = getAzuraKillStreakContract(contractAddress, provider);
  const count = await contract.proposalCount();
  const totalCount = Number(count);
  
  const proposals: OnChainProposal[] = [];
  
  for (let i = 1; i <= totalCount; i++) {
    try {
      const proposal = await fetchProposal(contractAddress, i, provider);
      proposals.push(proposal);
    } catch (error) {
      console.error(`Failed to fetch proposal ${i}:`, error);
    }
  }
  
  return proposals.reverse(); // Newest first
}

/**
 * Get voting progress for a proposal
 */
export async function getVotingProgress(
  contractAddress: string,
  proposalId: number,
  provider: providers.Web3Provider
): Promise<VotingProgress> {
  const contract = getAzuraKillStreakContract(contractAddress, provider);
  const [forVotes, againstVotes, percentageFor] = await contract.getVotingProgress(proposalId);
  
  return {
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    percentageFor: Number(percentageFor),
  };
}

/**
 * Get user's voting power
 */
export async function getUserVotingPower(
  contractAddress: string,
  userAddress: string,
  provider: providers.Web3Provider
): Promise<string> {
  const contract = getAzuraKillStreakContract(contractAddress, provider);
  const power = await contract.getVotingPower(userAddress);
  return power.toString();
}

/**
 * Create a proposal on-chain
 */
export async function createProposalOnChain(
  contractAddress: string,
  recipient: string,
  usdcAmount: string,
  title: string,
  description: string,
  votingPeriodDays: number,
  provider: providers.Web3Provider
): Promise<{ proposalId: number; txHash: string }> {
  const contract = await getAzuraKillStreakContractWithSigner(contractAddress, provider);
  
  const votingPeriodSeconds = votingPeriodDays * 24 * 60 * 60;
  
  const tx = await contract.createProposal(
    recipient,
    usdcAmount,
    title,
    description,
    votingPeriodSeconds
  );
  
  const receipt = await tx.wait();

  // ethers v5: receipt has transactionHash, tx has hash
  const txHash = receipt?.transactionHash || tx.hash;

  if (!receipt || !txHash) {
    throw new Error('Transaction receipt is invalid. Transaction may have failed.');
  }

  // Extract proposal ID from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === 'ProposalCreated';
    } catch {
      return false;
    }
  });

  if (!event) {
    throw new Error(`Could not find ProposalCreated event in transaction ${txHash}. The transaction may not have emitted the expected event.`);
  }

  let parsedEvent;
  try {
    parsedEvent = contract.interface.parseLog(event);
  } catch (parseError: any) {
    throw new Error(`Failed to parse ProposalCreated event: ${parseError.message}`);
  }

  if (!parsedEvent || !parsedEvent.args || parsedEvent.args.proposalId === undefined || parsedEvent.args.proposalId === null) {
    throw new Error('ProposalCreated event does not contain a valid proposalId. Transaction hash: ' + txHash);
  }

  const proposalId = Number(parsedEvent.args.proposalId);

  if (isNaN(proposalId) || proposalId <= 0) {
    throw new Error(`Invalid proposal ID extracted from event: ${parsedEvent.args.proposalId}. Proposal ID must be a positive integer.`);
  }

  return {
    proposalId,
    txHash,
  };
}

/**
 * Cast a vote on a proposal
 */
export async function voteOnProposal(
  contractAddress: string,
  proposalId: number,
  support: boolean,
  provider: providers.Web3Provider
): Promise<string> {
  const contract = await getAzuraKillStreakContractWithSigner(contractAddress, provider);
  
  const tx = await contract.vote(proposalId, support);
  const receipt = await tx.wait();
  
  return receipt.hash;
}

/**
 * Azura reviews a proposal and assigns a level (0-4)
 */
export async function azuraReviewProposal(
  contractAddress: string,
  proposalId: number,
  level: number,
  provider: providers.Web3Provider
): Promise<string> {
  const contract = await getAzuraKillStreakContractWithSigner(contractAddress, provider);

  const tx = await contract.azuraReview(proposalId, level);
  const receipt = await tx.wait();

  return receipt.hash;
}

/**
 * Server-side Azura review using a Wallet signer directly
 * Used by API routes where we have Azura's private key
 */
export async function azuraReviewProposalWithWallet(
  contractAddress: string,
  proposalId: number,
  level: number,
  wallet: providers.JsonRpcSigner | import('ethers').Wallet
): Promise<string> {
  const contract = new Contract(contractAddress, AZURA_KILLSTREAK_ABI, wallet);

  const tx = await contract.azuraReview(proposalId, level);
  const receipt = await tx.wait();

  return receipt.hash;
}

/**
 * Execute an approved proposal
 */
export async function executeProposal(
  contractAddress: string,
  proposalId: number,
  provider: providers.Web3Provider
): Promise<string> {
  const contract = await getAzuraKillStreakContractWithSigner(contractAddress, provider);
  
  const tx = await contract.executeProposal(proposalId);
  const receipt = await tx.wait();
  
  return receipt.hash;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: string, decimals: number = 18): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  return `${whole.toString()}.${fraction.toString().padStart(decimals, '0').slice(0, 2)}`;
}

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: string): string {
  return formatTokenAmount(amount, 6);
}

/**
 * Get Azura level label
 */
export function getAzuraLevelLabel(level: number): string {
  switch (level) {
    case 0: return 'Killed (0%)';
    case 1: return 'Level 1 (10%)';
    case 2: return 'Level 2 (20%)';
    case 3: return 'Level 3 (30%)';
    case 4: return 'Level 4 (40%)';
    default: return 'Unknown';
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: ProposalStatus): string {
  switch (status) {
    case ProposalStatus.Pending: return 'Pending Azura Review';
    case ProposalStatus.Active: return 'Active Voting';
    case ProposalStatus.Executed: return 'Executed ✅';
    case ProposalStatus.Rejected: return 'Rejected ❌';
    case ProposalStatus.Cancelled: return 'Cancelled';
    default: return 'Unknown';
  }
}
