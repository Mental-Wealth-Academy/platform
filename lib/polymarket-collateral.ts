/**
 * Blue's USDC.e -> pUSD collateral onramp.
 *
 * Polymarket's CLOB settles in pUSD, an ERC-20 on Polygon backed 1:1 by USDC.e.
 * The web UI wraps on deposit; an agent wallet that never touches the site has to
 * call the permissionless CollateralOnramp itself. This module is that capability,
 * so Blue can top up her own trading collateral without a human in the loop.
 *
 * Docs: https://docs.polymarket.com/concepts/pusd
 */

import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  maxUint256,
  parseUnits,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { resolvePolymarketSignerKey } from './polymarket-signer';
import { resolveOwnedProxy } from './polymarket-proxy';

/** Permissionless wrapper: USDC.e in, pUSD out, 1:1. */
export const COLLATERAL_ONRAMP_ADDRESS =
  '0x93070a847efEf7F70739046A929D47a521F5B8ee' as const;

/** Bridged USDC. The onramp does NOT accept native USDC (0x3c499c...). */
export const USDCE_ADDRESS =
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const;

export const PUSD_ADDRESS =
  '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as const;

const COLLATERAL_DECIMALS = 6;

const POLYGON_RPC_URL =
  process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }, { type: 'address' }],
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

const onrampAbi = [
  {
    name: 'wrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_asset', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export interface WrapResult {
  wrapped: boolean;
  amount: string;
  approveHash?: `0x${string}`;
  wrapHash?: `0x${string}`;
  pUsdBefore: string;
  pUsdAfter: string;
}

export interface CollateralPosition {
  address: Address;
  usdce: string;
  pUsd: string;
  pol: string;
}

function tradingAccount() {
  return privateKeyToAccount(resolvePolymarketSignerKey());
}

function publicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });
}

/**
 * Wrapping credits pUSD to the funder, which is the proxy the signer owns.
 * Ownership is checked against the factory so a misconfigured funder cannot
 * quietly receive the collateral.
 */
async function resolveFunder(): Promise<Address> {
  const signatureType = process.env.POLYMARKET_SIGNATURE_TYPE?.trim() || '1';
  if (signatureType === '0') {
    throw new Error(
      'POLYMARKET_SIGNATURE_TYPE is 0, but Polymarket does not accept a raw EOA as ' +
        'the maker. Use the proxy wallet and signature type 1 or 2.',
    );
  }
  return resolveOwnedProxy();
}

export async function readCollateralPosition(): Promise<CollateralPosition> {
  const account = tradingAccount();
  const client = publicClient();
  const [usdce, pUsd, pol] = await Promise.all([
    client.readContract({
      address: USDCE_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.readContract({
      address: PUSD_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.getBalance({ address: account.address }),
  ]);
  return {
    address: account.address,
    usdce: formatUnits(usdce, COLLATERAL_DECIMALS),
    pUsd: formatUnits(pUsd, COLLATERAL_DECIMALS),
    pol: formatUnits(pol, 18),
  };
}

/**
 * Convert USDC.e into pUSD. Pass no amount to wrap the full USDC.e balance.
 * Fails closed: never wraps more than the wallet holds, and never wraps zero.
 */
export async function wrapUsdcToPusd(options: {
  amountUsdc?: number;
  dryRun?: boolean;
} = {}): Promise<WrapResult> {
  const account = tradingAccount();
  const funder = await resolveFunder();
  const client = publicClient();

  const [usdceBalance, pUsdBefore, pol] = await Promise.all([
    client.readContract({
      address: USDCE_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.readContract({
      address: PUSD_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.getBalance({ address: account.address }),
  ]);

  const requested = options.amountUsdc === undefined
    ? usdceBalance
    : parseUnits(options.amountUsdc.toFixed(COLLATERAL_DECIMALS), COLLATERAL_DECIMALS);

  if (requested <= 0n) {
    throw new Error('There is no USDC.e in the trading wallet to wrap.');
  }
  if (requested > usdceBalance) {
    throw new Error(
      `Requested ${formatUnits(requested, COLLATERAL_DECIMALS)} USDC.e but the wallet ` +
        `holds ${formatUnits(usdceBalance, COLLATERAL_DECIMALS)}.`,
    );
  }
  if (pol === 0n) {
    throw new Error('The trading wallet holds no POL, so it cannot pay gas to wrap.');
  }

  const base: WrapResult = {
    wrapped: false,
    amount: formatUnits(requested, COLLATERAL_DECIMALS),
    pUsdBefore: formatUnits(pUsdBefore, COLLATERAL_DECIMALS),
    pUsdAfter: formatUnits(pUsdBefore, COLLATERAL_DECIMALS),
  };
  if (options.dryRun) return base;

  const wallet = createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });

  let approveHash: `0x${string}` | undefined;
  const allowance = await client.readContract({
    address: USDCE_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, COLLATERAL_ONRAMP_ADDRESS],
  });
  if (allowance < requested) {
    approveHash = await wallet.writeContract({
      address: USDCE_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [COLLATERAL_ONRAMP_ADDRESS, maxUint256],
    });
    await client.waitForTransactionReceipt({ hash: approveHash });
  }

  const wrapHash = await wallet.writeContract({
    address: COLLATERAL_ONRAMP_ADDRESS,
    abi: onrampAbi,
    functionName: 'wrap',
    args: [USDCE_ADDRESS, funder, requested],
  });
  const receipt = await client.waitForTransactionReceipt({ hash: wrapHash });
  if (receipt.status !== 'success') {
    throw new Error(`The wrap transaction reverted (${wrapHash}).`);
  }

  const pUsdAfter = await client.readContract({
    address: PUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [funder],
  });

  return {
    ...base,
    wrapped: true,
    approveHash,
    wrapHash,
    pUsdAfter: formatUnits(pUsdAfter, COLLATERAL_DECIMALS),
  };
}
