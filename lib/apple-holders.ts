/**
 * APPLE Token Holder Snapshot
 *
 * Indexes Transfer events from the APPLE token contract on Base
 * to build an address → balance map for pro-rata distribution.
 */

import { providers, Contract, utils } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const APPLE_TOKEN_ADDRESS = process.env.APPLE_TOKEN_ADDRESS || '0xE8a48daB9d307d74aBC8657421f8a2803661FB07';

// Addresses to exclude from distribution
const EXCLUDED_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000', // zero address
  APPLE_TOKEN_ADDRESS.toLowerCase(),              // token contract itself
]);

const ERC20_TRANSFER_TOPIC = utils.id('Transfer(address,address,uint256)');

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export interface HolderBalance {
  address: string;
  balance: bigint;
  share: number; // pro-rata share (0-1)
}

export interface HolderSnapshot {
  holders: HolderBalance[];
  totalEligibleSupply: bigint;
  totalHolders: number;
  blockNumber: number;
  timestamp: number;
}

/**
 * Index all Transfer events to build the current balance map.
 * Uses eth_getLogs in chunks to avoid RPC limits.
 */
export async function getAppleHolders(): Promise<HolderSnapshot> {
  if (!APPLE_TOKEN_ADDRESS) {
    throw new Error('APPLE_TOKEN_ADDRESS not configured');
  }

  const provider = new providers.JsonRpcProvider(RPC_URL);
  const token = new Contract(APPLE_TOKEN_ADDRESS, ERC20_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const decimals = await token.decimals();

  // Uniswap V3 pool address — exclude from distribution
  // This gets set after deployment; add to EXCLUDED_ADDRESSES
  const uniswapPoolAddress = process.env.APPLE_UNISWAP_POOL?.toLowerCase();
  if (uniswapPoolAddress) EXCLUDED_ADDRESSES.add(uniswapPoolAddress);

  // Azura vault address — exclude from distribution
  const azuraVault = process.env.AZURA_VAULT_ADDRESS?.toLowerCase();
  if (azuraVault) EXCLUDED_ADDRESSES.add(azuraVault);

  // Build balance map from Transfer events
  const balances = new Map<string, bigint>();
  const CHUNK_SIZE = 10_000;

  // Start from a recent block or the deployment block
  const startBlock = parseInt(process.env.APPLE_DEPLOY_BLOCK || '0');

  for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
    const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);

    const logs = await provider.getLogs({
      address: APPLE_TOKEN_ADDRESS,
      topics: [ERC20_TRANSFER_TOPIC],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const fromAddr = '0x' + log.topics[1].slice(26).toLowerCase();
      const toAddr = '0x' + log.topics[2].slice(26).toLowerCase();
      const value = BigInt(log.data);

      // Debit sender
      if (fromAddr !== '0x0000000000000000000000000000000000000000') {
        const prev = balances.get(fromAddr) || 0n;
        balances.set(fromAddr, prev - value);
      }

      // Credit receiver
      const prev = balances.get(toAddr) || 0n;
      balances.set(toAddr, prev + value);
    }
  }

  // Filter out excluded addresses and zero/negative balances
  const eligibleHolders: { address: string; balance: bigint }[] = [];
  let totalEligibleSupply = 0n;

  for (const [address, balance] of balances) {
    if (balance <= 0n) continue;
    if (EXCLUDED_ADDRESSES.has(address)) continue;

    eligibleHolders.push({ address, balance });
    totalEligibleSupply += balance;
  }

  // Calculate pro-rata shares
  const holders: HolderBalance[] = eligibleHolders
    .map(h => ({
      address: h.address,
      balance: h.balance,
      share: totalEligibleSupply > 0n
        ? Number((h.balance * 10000n) / totalEligibleSupply) / 10000
        : 0,
    }))
    .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));

  return {
    holders,
    totalEligibleSupply,
    totalHolders: holders.length,
    blockNumber: currentBlock,
    timestamp: Date.now(),
  };
}
