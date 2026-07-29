/**
 * Grant the Polymarket exchange contracts spending rights over Blue's collateral.
 *
 * Required once per trading wallet when POLYMARKET_SIGNATURE_TYPE=0 (EOA mode).
 * The Polymarket web UI does this on first deposit; an agent wallet that never
 * touches the site has to send the approvals itself. The CLOB's
 * updateBalanceAllowance only refreshes its cached view of chain state, so
 * without these transactions every BUY is rejected for missing allowance.
 *
 * Safety properties:
 *   - Polygon mainnet only.
 *   - Read-only without --execute.
 *   - Skips any approval that is already set, so it is idempotent.
 *   - Signs with POLYMARKET_WALLET_PRIVATE_KEY (or AZURA_PRIVATE_KEY) and refuses
 *     if that key does not
 *     match POLYMARKET_PROXY_WALLET (EOA mode requires signer === funder).
 *
 * Check:
 *   npx tsx --env-file=.env.local scripts/polymarket-approve.ts
 *
 * Execute:
 *   npx tsx --env-file=.env.local scripts/polymarket-approve.ts --execute
 */
import { getContractConfig } from '@polymarket/clob-client-v2';
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  maxUint256,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { resolvePolymarketSignerKey } from '../lib/polymarket-signer';

const POLYGON_RPC_URL =
  process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
const PUSD_DECIMALS = 6;

const erc20Abi = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

const ctfAbi = [
  {
    name: 'isApprovedForAll',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }, { type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'setApprovalForAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'bool' }],
    outputs: [],
  },
] as const;

async function main() {
  const execute = process.argv.includes('--execute');

  const account = privateKeyToAccount(resolvePolymarketSignerKey());

  const signatureType = process.env.POLYMARKET_SIGNATURE_TYPE?.trim() || '2';
  const funder = process.env.POLYMARKET_PROXY_WALLET?.trim();
  if (!funder) throw new Error('POLYMARKET_PROXY_WALLET is missing.');

  if (signatureType === '0' && getAddress(funder) !== account.address) {
    throw new Error(
      `EOA mode requires signer === funder, but the signer is ${account.address} ` +
        `and the funder is ${getAddress(funder)}. Approving from here would leave ` +
        'the funding wallet unapproved.',
    );
  }
  if (signatureType !== '0') {
    throw new Error(
      `POLYMARKET_SIGNATURE_TYPE is ${signatureType}. A proxy or Safe funder must be ` +
        'approved through the wallet that owns it, not by this script.',
    );
  }

  const contracts = getContractConfig(polygon.id);
  const collateral = getAddress(contracts.collateral) as Address;
  const conditionalTokens = getAddress(contracts.conditionalTokens) as Address;

  const spenders: Array<{ name: string; address: Address }> = [
    { name: 'exchange', address: getAddress(contracts.exchange) as Address },
    { name: 'negRiskExchange', address: getAddress(contracts.negRiskExchange) as Address },
    { name: 'negRiskAdapter', address: getAddress(contracts.negRiskAdapter) as Address },
    { name: 'exchangeV2', address: getAddress(contracts.exchangeV2) as Address },
    { name: 'negRiskExchangeV2', address: getAddress(contracts.negRiskExchangeV2) as Address },
  ];

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });

  const [pol, pusd] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: collateral,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  ]);

  console.log(`Wallet     ${account.address}`);
  console.log(`Collateral ${collateral} (pUSD)`);
  console.log(`POL        ${formatUnits(pol, 18)}`);
  console.log(`pUSD       ${formatUnits(pusd, PUSD_DECIMALS)}`);
  console.log(`Mode       ${execute ? 'EXECUTE' : 'check only (pass --execute to send)'}`);
  console.log('');

  if (pol === 0n) {
    throw new Error('The wallet holds no POL, so it cannot pay gas for approvals.');
  }

  const pending: Array<() => Promise<void>> = [];

  for (const spender of spenders) {
    const current = await publicClient.readContract({
      address: collateral,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, spender.address],
    });
    const approved = current > 0n;
    console.log(
      `pUSD -> ${spender.name.padEnd(18)} ${approved ? 'already approved' : 'NEEDS APPROVAL'}`,
    );
    if (approved) continue;
    pending.push(async () => {
      const wallet = createWalletClient({
        account,
        chain: polygon,
        transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
      });
      const hash = await wallet.writeContract({
        address: collateral,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender.address, maxUint256],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  approved pUSD for ${spender.name}: ${hash} (${receipt.status})`);
    });
  }

  for (const spender of spenders) {
    const approved = await publicClient.readContract({
      address: conditionalTokens,
      abi: ctfAbi,
      functionName: 'isApprovedForAll',
      args: [account.address, spender.address],
    });
    console.log(
      `CTF  -> ${spender.name.padEnd(18)} ${approved ? 'already approved' : 'NEEDS APPROVAL'}`,
    );
    if (approved) continue;
    pending.push(async () => {
      const wallet = createWalletClient({
        account,
        chain: polygon,
        transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
      });
      const hash = await wallet.writeContract({
        address: conditionalTokens,
        abi: ctfAbi,
        functionName: 'setApprovalForAll',
        args: [spender.address, true],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  approved CTF for ${spender.name}: ${hash} (${receipt.status})`);
    });
  }

  console.log('');
  if (pending.length === 0) {
    console.log('Every approval is already in place. Nothing to send.');
    return;
  }
  if (!execute) {
    console.log(`${pending.length} approval transaction(s) would be sent. Re-run with --execute.`);
    return;
  }

  console.log(`Sending ${pending.length} approval transaction(s)...`);
  for (const send of pending) await send();
  console.log('Done. Re-run the readiness probe to confirm the CLOB sees the allowance.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
