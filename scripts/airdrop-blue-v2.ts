/**
 * Migrate the reconciled Diamonds v1 snapshot into a deployed V2 contract.
 *
 * Safety properties:
 *   - Base mainnet only.
 *   - Requires an explicit V2 address and --execute for writes.
 *   - Refuses if v1 moved after the snapshot.
 *   - Transfers holder balances from Blue's constructor allocation.
 *   - Burns only the exact constructor/snapshot supply correction after transfers.
 *   - Idempotent while balances remain at either zero or their exact target.
 *   - Pins Base fees and manages the nonce explicitly.
 *
 * Check:
 *   DIAMONDS_V2_TOKEN_ADDRESS=0x... npx tsx --env-file=.env.local scripts/airdrop-blue-v2.ts
 *
 * Execute:
 *   DIAMONDS_V2_TOKEN_ADDRESS=0x... npx tsx --env-file=.env.local scripts/airdrop-blue-v2.ts --execute
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const SNAPSHOT_PATH = resolve(process.cwd(), 'data/blue-v1-snapshot.json');
const V1_TOKEN = '0x4A25Cea1f05C6725dC90849FBaafF00d67342B3f';
const BLUE_ADDRESS = '0x0920553CcA188871b146ee79f562B4Af46aB4f8a';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const CONSTRUCTOR_ALLOCATION = 200_000_000n * 10n ** 18n;
const PRIORITY_FEE = 1_000_000n;
const MAX_FEE = 100_000_000n;
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const TOKEN_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function owner() view returns (address)',
  'function vault() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function burn(uint256)',
  'function transfer(address,uint256) returns (bool)',
]);
const VAULT_ABI = parseAbi([
  'function token() view returns (address)',
  'function rewardToken() view returns (address)',
  'function excluded(address) view returns (bool)',
]);

interface Snapshot {
  chainId: number;
  token: Address;
  snapshotBlock: string;
  totalSupply: string;
  blueAddress: Address;
  blueBalance: string;
  deadAddress: Address;
  deadBalance: string;
  holders: Array<{ address: Address; amount: string }>;
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const configuredV2 = process.env.DIAMONDS_V2_TOKEN_ADDRESS;
  if (!configuredV2) {
    throw new Error('DIAMONDS_V2_TOKEN_ADDRESS is required.');
  }
  const v2Token = getAddress(configuredV2);
  if (v2Token.toLowerCase() === V1_TOKEN.toLowerCase()) {
    throw new Error('V2 token address points to Diamonds v1.');
  }

  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')) as Snapshot;
  if (snapshot.chainId !== base.id || snapshot.token.toLowerCase() !== V1_TOKEN.toLowerCase()) {
    throw new Error('Snapshot is not the canonical Diamonds v1 deployment on Base mainnet.');
  }
  if (
    snapshot.blueAddress.toLowerCase() !== BLUE_ADDRESS.toLowerCase() ||
    snapshot.deadAddress.toLowerCase() !== DEAD_ADDRESS.toLowerCase()
  ) {
    throw new Error('Snapshot uses unexpected Blue or burn addresses.');
  }

  const rawKey = process.env.BLUE_PRIVATE_KEY || process.env.AZURA_PRIVATE_KEY;
  if (!rawKey) throw new Error('BLUE_PRIVATE_KEY or AZURA_PRIVATE_KEY is required.');
  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const blue = privateKeyToAccount(privateKey);
  if (blue.address.toLowerCase() !== BLUE_ADDRESS.toLowerCase()) {
    throw new Error(`Configured signer is ${blue.address}; expected Blue at ${BLUE_ADDRESS}.`);
  }

  const rpcUrl =
    process.env.BASE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    'https://mainnet-preconf.base.org';
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account: blue,
    chain: base,
    transport: http(rpcUrl),
  });
  if (await publicClient.getChainId() !== base.id) {
    throw new Error('Airdrop RPC is not Base mainnet.');
  }
  if (!(await publicClient.getBytecode({ address: v2Token }))) {
    throw new Error(`No contract code at ${v2Token}.`);
  }

  const [symbol, owner, vault, v2Supply, blueV2Balance] = await Promise.all([
    publicClient.readContract({ address: v2Token, abi: TOKEN_ABI, functionName: 'symbol' }),
    publicClient.readContract({ address: v2Token, abi: TOKEN_ABI, functionName: 'owner' }),
    publicClient.readContract({ address: v2Token, abi: TOKEN_ABI, functionName: 'vault' }),
    publicClient.readContract({ address: v2Token, abi: TOKEN_ABI, functionName: 'totalSupply' }),
    publicClient.readContract({
      address: v2Token,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [blue.address],
    }),
  ]);
  if (symbol !== 'BLUE') throw new Error(`Unexpected V2 symbol: ${symbol}.`);
  if (owner.toLowerCase() !== blue.address.toLowerCase()) {
    throw new Error(`V2 owner is ${owner}; expected Blue.`);
  }
  const vaultAddress = getAddress(vault);
  const [vaultToken, rewardToken, blueExcluded] = await Promise.all([
    publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'token',
    }),
    publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'rewardToken',
    }),
    publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'excluded',
      args: [blue.address],
    }),
  ]);
  if (vaultToken.toLowerCase() !== v2Token.toLowerCase()) {
    throw new Error(`Vault token is ${vaultToken}; expected ${v2Token}.`);
  }
  if (rewardToken.toLowerCase() !== CBBTC_ADDRESS.toLowerCase()) {
    throw new Error(`Vault reward token is ${rewardToken}; expected Base cbBTC.`);
  }
  if (!blueExcluded) throw new Error('Blue is not excluded from V2 reflections.');

  const snapshotBlock = BigInt(snapshot.snapshotBlock);
  const latestBlock = await publicClient.getBlockNumber();
  let driftFromBlock = snapshotBlock + 1n;
  while (driftFromBlock <= latestBlock) {
    const driftToBlock =
      driftFromBlock + 9_999n > latestBlock ? latestBlock : driftFromBlock + 9_999n;
    const logs = await publicClient.getLogs({
      address: getAddress(V1_TOKEN),
      event: TRANSFER_EVENT,
      fromBlock: driftFromBlock,
      toBlock: driftToBlock,
    });
    if (logs.length > 0) {
      throw new Error(
        `Diamonds v1 moved after snapshot block ${snapshotBlock}. Re-run the snapshot before migrating.`,
      );
    }
    driftFromBlock = driftToBlock + 1n;
  }

  const blueTarget = BigInt(snapshot.blueBalance);
  const deadBalance = BigInt(snapshot.deadBalance);
  const snapshotSupply = BigInt(snapshot.totalSupply);
  const expectedSupply = snapshotSupply - deadBalance;

  const recipients = snapshot.holders.filter((holder) => {
    const normalized = holder.address.toLowerCase();
    return (
      normalized !== BLUE_ADDRESS.toLowerCase() &&
      normalized !== DEAD_ADDRESS.toLowerCase() &&
      BigInt(holder.amount) > 0n
    );
  });
  const recipientTotal = recipients.reduce(
    (total, holder) => total + BigInt(holder.amount),
    0n,
  );
  const constructorBurn = CONSTRUCTOR_ALLOCATION - recipientTotal - blueTarget;
  if (constructorBurn < 0n) {
    throw new Error('Snapshot allocations exceed the V2 constructor allocation.');
  }
  const recipientBalances = await publicClient.multicall({
    allowFailure: false,
    contracts: recipients.map((holder) => ({
      address: v2Token,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [holder.address],
    })),
  });
  const pendingRecipients = recipients.filter((holder, index) => {
    const balance = recipientBalances[index] as bigint;
    const target = BigInt(holder.amount);
    if (balance !== 0n && balance !== target) {
      throw new Error(
        `${holder.address} has ${balance} V2 base units; expected zero or exact target ${target}.`,
      );
    }
    return balance === 0n;
  });

  const completedRecipientTotal = recipients.reduce((total, holder, index) => {
    const balance = recipientBalances[index] as bigint;
    return total + (balance === BigInt(holder.amount) ? balance : 0n);
  }, 0n);
  const expectedBlueBeforeBurn = CONSTRUCTOR_ALLOCATION - completedRecipientTotal;
  const allTransfersComplete = pendingRecipients.length === 0;
  const expectedBlueAfterBurn = expectedBlueBeforeBurn - constructorBurn;
  const burnComplete =
    allTransfersComplete &&
    constructorBurn > 0n &&
    blueV2Balance === expectedBlueAfterBurn;
  if (
    blueV2Balance !== expectedBlueBeforeBurn &&
    !(allTransfersComplete && blueV2Balance === expectedBlueAfterBurn)
  ) {
    throw new Error(
      `Blue V2 balance is ${blueV2Balance}; expected ${expectedBlueBeforeBurn}` +
        (allTransfersComplete ? ` or ${expectedBlueAfterBurn}.` : '.'),
    );
  }
  const burnPending = constructorBurn > 0n && !burnComplete;

  console.log(`V2 token: ${v2Token}`);
  console.log(`Reflection vault: ${vaultAddress}`);
  console.log(`Blue gas balance: ${formatEther(await publicClient.getBalance({ address: blue.address }))} ETH`);
  console.log(`Current V2 supply: ${formatUnits(v2Supply, 18)} BLUE`);
  console.log(`Constructor correction burn: ${formatUnits(constructorBurn, 18)} BLUE${burnPending ? '' : ' (complete)'}`);
  console.log(`Recipient transfers pending: ${pendingRecipients.length}/${recipients.length}`);
  console.log(`Final supply target: ${formatUnits(expectedSupply, 18)} BLUE`);

  if (!execute) {
    console.log('Check complete. Re-run with --execute to broadcast the migration.');
    return;
  }

  let nonce = await publicClient.getTransactionCount({
    address: blue.address,
    blockTag: 'pending',
  });
  let finalReceiptBlock: bigint | undefined;
  const send = async (
    label: string,
    request:
      | { functionName: 'burn'; args: readonly [bigint] }
      | { functionName: 'transfer'; args: readonly [Address, bigint] },
  ): Promise<void> => {
    const txNonce = nonce++;
    const hash = request.functionName === 'burn'
      ? await walletClient.writeContract({
          address: v2Token,
          abi: TOKEN_ABI,
          functionName: 'burn',
          args: request.args,
          nonce: txNonce,
          gas: 250_000n,
          maxPriorityFeePerGas: PRIORITY_FEE,
          maxFeePerGas: MAX_FEE,
        })
      : await walletClient.writeContract({
          address: v2Token,
          abi: TOKEN_ABI,
          functionName: 'transfer',
          args: request.args,
          nonce: txNonce,
          gas: 250_000n,
          maxPriorityFeePerGas: PRIORITY_FEE,
          maxFeePerGas: MAX_FEE,
        });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} reverted: ${hash}`);
    finalReceiptBlock = receipt.blockNumber;
    console.log(`${label}: ${hash}`);
  };

  for (const holder of pendingRecipients) {
    await send(`Transfer ${formatUnits(BigInt(holder.amount), 18)} BLUE to ${holder.address}`, {
      functionName: 'transfer',
      args: [holder.address, BigInt(holder.amount)],
    });
  }
  if (constructorBurn > 0n && !burnComplete) {
    await send(`Burn ${formatUnits(constructorBurn, 18)} BLUE from Blue`, {
      functionName: 'burn',
      args: [constructorBurn],
    });
  }

  const finalReadBlock = finalReceiptBlock ? { blockNumber: finalReceiptBlock } : {};
  const [finalSupply, finalBlueBalance, finalDeadBalance, finalRecipientBalances] =
    await Promise.all([
      publicClient.readContract({
        address: v2Token,
        abi: TOKEN_ABI,
        functionName: 'totalSupply',
        ...finalReadBlock,
      }),
      publicClient.readContract({
        address: v2Token,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [blue.address],
        ...finalReadBlock,
      }),
      publicClient.readContract({
        address: v2Token,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [getAddress(DEAD_ADDRESS)],
        ...finalReadBlock,
      }),
      publicClient.multicall({
        allowFailure: false,
        ...finalReadBlock,
        contracts: recipients.map((holder) => ({
          address: v2Token,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [holder.address],
        })),
      }),
    ]);
  if (finalSupply !== expectedSupply) {
    throw new Error(`Final V2 supply is ${finalSupply}; expected ${expectedSupply}.`);
  }
  if (finalBlueBalance !== blueTarget) {
    throw new Error(`Final Blue balance is ${finalBlueBalance}; expected ${blueTarget}.`);
  }
  if (finalDeadBalance !== 0n) {
    throw new Error(`V2 burn address received ${finalDeadBalance} base units.`);
  }
  for (let index = 0; index < recipients.length; index++) {
    const target = BigInt(recipients[index].amount);
    if ((finalRecipientBalances[index] as bigint) !== target) {
      throw new Error(`Final migration balance mismatch for ${recipients[index].address}.`);
    }
  }

  console.log('V2 migration reconciled exactly.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
