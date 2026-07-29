/**
 * Read-only snapshot of Diamonds v1 holders on Base mainnet.
 *
 * Reconstructs balances from Transfer logs, checks every result against
 * balanceOf at one fixed block, and writes data/blue-v1-snapshot.json.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/snapshot-blue-v2-holders.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  type Address,
} from 'viem';
import { base } from 'viem/chains';

const DEFAULT_V1_TOKEN = '0x4A25Cea1f05C6725dC90849FBaafF00d67342B3f';
const DEFAULT_DEPLOY_BLOCK = 48_102_746n;
const BLUE_ADDRESS = '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const OUTPUT_PATH = resolve(process.cwd(), 'data/blue-v1-snapshot.json');
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const TOKEN_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]);

interface SnapshotHolder {
  address: Address;
  amount: string;
}

function addBalance(balances: Map<string, bigint>, address: Address, delta: bigint): void {
  const key = address.toLowerCase();
  balances.set(key, (balances.get(key) || 0n) + delta);
}

async function main(): Promise<void> {
  const token = getAddress(
    process.env.DIAMONDS_V1_TOKEN_ADDRESS ||
      process.env.NEXT_PUBLIC_DIAMONDS_TOKEN_ADDRESS ||
      DEFAULT_V1_TOKEN,
  );
  if (token.toLowerCase() !== DEFAULT_V1_TOKEN.toLowerCase()) {
    throw new Error(`Snapshot token must be Diamonds v1 at ${DEFAULT_V1_TOKEN}.`);
  }

  const rpcUrl =
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    'https://mainnet-preconf.base.org';
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const chainId = await client.getChainId();
  if (chainId !== base.id) throw new Error(`Expected Base mainnet, received chain ${chainId}.`);

  const snapshotBlock = await client.getBlockNumber();
  const deployBlock = BigInt(
    process.env.DIAMONDS_V1_DEPLOY_BLOCK || DEFAULT_DEPLOY_BLOCK.toString(),
  );
  if (deployBlock > snapshotBlock) throw new Error('V1 deployment block is after snapshot block.');

  const [name, symbol, totalSupply] = await Promise.all([
    client.readContract({
      address: token,
      abi: TOKEN_ABI,
      functionName: 'name',
      blockNumber: snapshotBlock,
    }),
    client.readContract({
      address: token,
      abi: TOKEN_ABI,
      functionName: 'symbol',
      blockNumber: snapshotBlock,
    }),
    client.readContract({
      address: token,
      abi: TOKEN_ABI,
      functionName: 'totalSupply',
      blockNumber: snapshotBlock,
    }),
  ]);
  if (name !== 'Diamonds' || symbol !== 'BLUE') {
    throw new Error(`Unexpected token identity: ${name} (${symbol}).`);
  }

  const balances = new Map<string, bigint>();
  let fromBlock = deployBlock;
  let chunkSize = 25_000n;
  let eventCount = 0;

  console.log(`Diamonds v1: ${token}`);
  console.log(`Snapshot block: ${snapshotBlock}`);
  console.log(`Scanning from deployment block ${deployBlock}...`);

  while (fromBlock <= snapshotBlock) {
    const toBlock =
      fromBlock + chunkSize - 1n > snapshotBlock
        ? snapshotBlock
        : fromBlock + chunkSize - 1n;

    try {
      const logs = await client.getLogs({
        address: token,
        event: TRANSFER_EVENT,
        fromBlock,
        toBlock,
      });
      for (const log of logs) {
        const { from, to, value } = log.args;
        if (!from || !to || value === undefined) {
          throw new Error(`Malformed Transfer log in transaction ${log.transactionHash}.`);
        }
        if (from.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) addBalance(balances, from, -value);
        if (to.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) addBalance(balances, to, value);
      }
      eventCount += logs.length;
      fromBlock = toBlock + 1n;
    } catch (error) {
      if (chunkSize <= 1_000n) throw error;
      chunkSize /= 2n;
    }
  }

  const holders: SnapshotHolder[] = [...balances.entries()]
    .filter(([, amount]) => amount > 0n)
    .map(([address, amount]) => ({
      address: getAddress(address),
      amount: amount.toString(),
    }))
    .sort((a, b) => {
      const first = BigInt(a.amount);
      const second = BigInt(b.amount);
      return first === second ? a.address.localeCompare(b.address) : first > second ? -1 : 1;
    });

  const reconstructedSupply = holders.reduce((sum, holder) => sum + BigInt(holder.amount), 0n);
  if (reconstructedSupply !== totalSupply) {
    throw new Error(
      `Snapshot supply mismatch: ${reconstructedSupply} reconstructed, ${totalSupply} onchain.`,
    );
  }

  const liveBalances = await client.multicall({
    allowFailure: false,
    blockNumber: snapshotBlock,
    contracts: holders.map((holder) => ({
      address: token,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [holder.address],
    })),
  });
  for (let index = 0; index < holders.length; index++) {
    const holder = holders[index];
    const liveBalance = liveBalances[index] as bigint;
    if (liveBalance !== BigInt(holder.amount)) {
      throw new Error(
        `Balance mismatch for ${holder.address}: ${holder.amount} reconstructed, ${liveBalance} onchain.`,
      );
    }
  }

  const blueBalance = holders.find(
    (holder) => holder.address.toLowerCase() === BLUE_ADDRESS.toLowerCase(),
  )?.amount || '0';
  const deadBalance = holders.find(
    (holder) => holder.address.toLowerCase() === DEAD_ADDRESS.toLowerCase(),
  )?.amount || '0';
  const migratableHolders = holders.filter((holder) => {
    const normalized = holder.address.toLowerCase();
    return (
      normalized !== BLUE_ADDRESS.toLowerCase() &&
      normalized !== DEAD_ADDRESS.toLowerCase()
    );
  });

  const snapshot = {
    chainId: base.id,
    token,
    name,
    symbol,
    decimals: 18,
    deployBlock: deployBlock.toString(),
    snapshotBlock: snapshotBlock.toString(),
    capturedAt: new Date().toISOString(),
    transferEventCount: eventCount,
    totalSupply: totalSupply.toString(),
    reconstructedSupply: reconstructedSupply.toString(),
    holderCount: holders.length,
    blueAddress: getAddress(BLUE_ADDRESS),
    blueBalance,
    deadAddress: getAddress(DEAD_ADDRESS),
    deadBalance,
    migratableHolderCount: migratableHolders.length,
    holders,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`Transfer events: ${eventCount}`);
  console.log(`Holders: ${holders.length}; migratable: ${migratableHolders.length}`);
  console.log(`Supply: ${formatUnits(totalSupply, 18)} BLUE`);
  console.log(`Blue: ${formatUnits(BigInt(blueBalance), 18)} BLUE`);
  console.log(`Burn address: ${formatUnits(BigInt(deadBalance), 18)} BLUE`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
