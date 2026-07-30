/**
 * Recover collateral stranded at Blue's undeployed Polymarket proxy.
 *
 * The proxy address is produced by a CREATE2 formula, so tokens can be sent
 * there before any contract exists — which is how the balance got stuck. The
 * factory can still deploy the Safe at that exact address, and only a signature
 * from the owner authorises it. Once deployed, the Safe transfers the tokens out.
 *
 * Two phases, both idempotent:
 *   1. deploy  — factory.createProxy with the owner's EIP-712 authorisation
 *   2. sweep   — Safe.execTransaction sending the full pUSD balance to the owner
 *
 * Check:
 *   npx tsx --env-file=.env.local scripts/polymarket-recover-proxy.ts
 *
 * Execute:
 *   npx tsx --env-file=.env.local scripts/polymarket-recover-proxy.ts --execute
 */
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  http,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { resolvePolymarketSignerKey } from '../lib/polymarket-signer';

const FACTORY = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as const;
const PUSD = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as const;
const ZERO = '0x0000000000000000000000000000000000000000' as const;
const POLYGON_RPC_URL =
  process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';

const factoryAbi = [
  {
    name: 'computeProxyAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'createProxy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' },
      {
        name: 'createSig',
        type: 'tuple',
        components: [
          { name: 'v', type: 'uint8' },
          { name: 'r', type: 'bytes32' },
          { name: 's', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

const safeAbi = [
  { name: 'nonce', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'getOwners',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    name: 'getTransactionHash',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'address' }, { type: 'uint256' }, { type: 'bytes' }, { type: 'uint8' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'address' }, { type: 'address' }, { type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'execTransaction',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { type: 'address' }, { type: 'uint256' }, { type: 'bytes' }, { type: 'uint8' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'address' }, { type: 'address' }, { type: 'bytes' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

async function main() {
  const execute = process.argv.includes('--execute');
  const account = privateKeyToAccount(resolvePolymarketSignerKey());
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 20_000 }),
  });

  const proxy = getAddress(
    await publicClient.readContract({
      address: FACTORY,
      abi: factoryAbi,
      functionName: 'computeProxyAddress',
      args: [account.address],
    }),
  );

  const [code, stranded, pol] = await Promise.all([
    publicClient.getBytecode({ address: proxy }),
    publicClient.readContract({ address: PUSD, abi: erc20Abi, functionName: 'balanceOf', args: [proxy] }),
    publicClient.getBalance({ address: account.address }),
  ]);
  const deployed = Boolean(code && code !== '0x');

  console.log(`Owner      ${account.address}`);
  console.log(`Proxy      ${proxy}`);
  console.log(`Deployed   ${deployed ? 'yes' : 'no'}`);
  console.log(`Stranded   ${formatUnits(stranded, 6)} pUSD`);
  console.log(`Gas (POL)  ${formatEther(pol)}`);
  console.log(`Mode       ${execute ? 'EXECUTE' : 'check only (pass --execute)'}`);
  console.log('');

  if (stranded === 0n && !deployed) {
    console.log('Nothing stranded at the proxy. Nothing to do.');
    return;
  }
  if (pol === 0n) throw new Error('The owner wallet holds no POL to pay gas.');

  const wallet = createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 20_000 }),
  });

  // Phase 1: bring the Safe into existence at its deterministic address.
  if (!deployed) {
    if (!execute) {
      console.log('Would deploy the Safe at the proxy address (factory.createProxy).');
    } else {
      const signature = await account.signTypedData({
        domain: {
          name: 'Polymarket Contract Proxy Factory',
          chainId: polygon.id,
          verifyingContract: FACTORY,
        },
        types: {
          CreateProxy: [
            { name: 'paymentToken', type: 'address' },
            { name: 'payment', type: 'uint256' },
            { name: 'paymentReceiver', type: 'address' },
          ],
        },
        primaryType: 'CreateProxy',
        message: { paymentToken: ZERO, payment: 0n, paymentReceiver: ZERO },
      });
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      const hash = await wallet.writeContract({
        address: FACTORY,
        abi: factoryAbi,
        functionName: 'createProxy',
        args: [ZERO, 0n, ZERO, { v, r, s }],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`Deployment reverted (${hash}).`);
      console.log(`  deployed: ${hash}`);

      const owners = await publicClient.readContract({
        address: proxy, abi: safeAbi, functionName: 'getOwners',
      }) as readonly Address[];
      if (!owners.some((o) => o.toLowerCase() === account.address.toLowerCase())) {
        throw new Error(
          `The deployed Safe's owners are ${owners.join(', ')}, which does not include ` +
            `${account.address}. Stopping before attempting a sweep.`,
        );
      }
      console.log(`  owner confirmed: ${owners.join(', ')}`);
    }
  }

  // Phase 2: move the balance out to the owner.
  if (stranded === 0n) {
    console.log('Proxy holds no pUSD to sweep.');
    return;
  }
  if (!execute) {
    console.log(`Would sweep ${formatUnits(stranded, 6)} pUSD to ${account.address}.`);
    console.log('Re-run with --execute.');
    return;
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [account.address, stranded],
  });
  const nonce = await publicClient.readContract({
    address: proxy, abi: safeAbi, functionName: 'nonce',
  });
  const txHash = await publicClient.readContract({
    address: proxy,
    abi: safeAbi,
    functionName: 'getTransactionHash',
    args: [PUSD, 0n, data, 0, 0n, 0n, 0n, ZERO, ZERO, nonce],
  });
  // A Safe owner signature is ecrecover over the transaction hash itself.
  const sig = await account.sign({ hash: txHash });

  const execHash = await wallet.writeContract({
    address: proxy,
    abi: safeAbi,
    functionName: 'execTransaction',
    args: [PUSD, 0n, data, 0, 0n, 0n, 0n, ZERO, ZERO, sig],
  });
  const execReceipt = await publicClient.waitForTransactionReceipt({ hash: execHash });
  if (execReceipt.status !== 'success') throw new Error(`Sweep reverted (${execHash}).`);

  const after = await publicClient.readContract({
    address: PUSD, abi: erc20Abi, functionName: 'balanceOf', args: [account.address],
  });
  console.log(`  swept: ${execHash}`);
  console.log(`  owner pUSD balance now ${formatUnits(after, 6)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
