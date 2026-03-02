import { Contract, providers, Wallet } from 'ethers';

/**
 * EtherealHorizonPathway Contract Interface
 * On-chain seal system for the 14-milestone journey
 */

export const PATHWAY_ABI = [
  // Read functions
  'function TOTAL_WEEKS() external view returns (uint256)',
  'function isWeekSealed(address user, uint256 week) external view returns (bool)',
  'function getSealedWeekCount(address user) external view returns (uint256)',
  'function hasCompletedPathway(address user) external view returns (bool)',
  'function getSeal(address user, uint256 week) external view returns (bool sealed, bytes32 contentHash, uint256 timestamp)',

  // Write functions
  'function sealWeek(address user, uint256 week, bytes32 contentHash) external',

  // Events
  'event WeekSealed(address indexed user, uint256 indexed week, bytes32 contentHash, uint256 timestamp)',
  'event PathwayCompleted(address indexed user, uint256 timestamp)',
];

export const PATHWAY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PATHWAY_CONTRACT_ADDRESS || '';

/**
 * Get a read-only contract instance
 */
export function getPathwayContract(providerOrRpcUrl?: string | providers.Provider): Contract {
  const provider =
    typeof providerOrRpcUrl === 'string'
      ? new providers.JsonRpcProvider(providerOrRpcUrl)
      : providerOrRpcUrl || new providers.JsonRpcProvider(process.env.BASE_RPC_URL);

  return new Contract(PATHWAY_CONTRACT_ADDRESS, PATHWAY_ABI, provider);
}

/**
 * Get a contract instance with the owner wallet for write operations (server-side only)
 */
export function getPathwayContractWithOwner(): Contract {
  const privateKey = process.env.PATHWAY_OWNER_PRIVATE_KEY;
  if (!privateKey) throw new Error('PATHWAY_OWNER_PRIVATE_KEY not set');

  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) throw new Error('BASE_RPC_URL not set');

  const provider = new providers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  return new Contract(PATHWAY_CONTRACT_ADDRESS, PATHWAY_ABI, wallet);
}

/**
 * Check if a specific week is sealed for a user
 */
export async function checkWeekSealed(userAddress: string, week: number): Promise<boolean> {
  const contract = getPathwayContract();
  return contract.isWeekSealed(userAddress, week);
}

/**
 * Get the number of sealed weeks for a user
 */
export async function getUserSealedCount(userAddress: string): Promise<number> {
  const contract = getPathwayContract();
  const count = await contract.getSealedWeekCount(userAddress);
  return Number(count);
}

/**
 * Check if a user has completed the full pathway
 */
export async function checkPathwayCompleted(userAddress: string): Promise<boolean> {
  const contract = getPathwayContract();
  return contract.hasCompletedPathway(userAddress);
}

/**
 * Seal a week for a user (server-side only, owner pays gas)
 */
export async function sealWeekOnChain(
  userAddress: string,
  week: number,
  contentHash: string
): Promise<{ txHash: string }> {
  const contract = getPathwayContractWithOwner();

  // Ensure contentHash is bytes32 format
  const hash = contentHash.startsWith('0x') ? contentHash : `0x${contentHash}`;

  const tx = await contract.sealWeek(userAddress, week, hash);
  const receipt = await tx.wait();

  return { txHash: receipt.transactionHash || tx.hash };
}
