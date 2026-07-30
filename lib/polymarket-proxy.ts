/**
 * Blue's Polymarket proxy wallet.
 *
 * Polymarket rejects raw EOAs as order makers ("maker address not allowed,
 * please use the deposit wallet flow"). Orders must come from a proxy wallet
 * that the signer owns. The proxy address is deterministic: the factory derives
 * it from the owner EOA, so it can be computed before the wallet exists onchain
 * and funded at that address to bring it into being.
 *
 * Deriving it also gives us a real ownership check. Comparing a configured
 * proxy against the one the factory derives for our signer is what catches a
 * funder wallet belonging to somebody else, which is otherwise invisible until
 * an order is rejected or, worse, collateral is stranded.
 */

import { createPublicClient, getAddress, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { resolvePolymarketSignerKey } from './polymarket-signer';

/** Polymarket's proxy wallet factory on Polygon. */
export const PROXY_FACTORY_ADDRESS =
  '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as const;

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
] as const;

function publicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 15_000 }),
  });
}

export function polymarketSignerAddress(): Address {
  return privateKeyToAccount(resolvePolymarketSignerKey()).address;
}

/** The proxy the factory derives for an owner. Stable, and valid before deployment. */
export async function deriveProxyAddress(owner: Address): Promise<Address> {
  const derived = await publicClient().readContract({
    address: PROXY_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'computeProxyAddress',
    args: [owner],
  });
  return getAddress(derived);
}

export async function isProxyDeployed(proxy: Address): Promise<boolean> {
  const code = await publicClient().getBytecode({ address: proxy });
  return Boolean(code && code !== '0x');
}

export interface ProxyStatus {
  signer: Address;
  proxy: Address;
  configured: Address | null;
  matchesConfigured: boolean;
  deployed: boolean;
}

export async function readProxyStatus(): Promise<ProxyStatus> {
  const signer = polymarketSignerAddress();
  const proxy = await deriveProxyAddress(signer);
  const raw = (
    process.env.POLYMARKET_DEPOSIT_WALLET_ADDRESS ||
    process.env.POLYMARKET_PROXY_WALLET ||
    ''
  ).trim();
  const configured = raw ? getAddress(raw) : null;
  return {
    signer,
    proxy,
    configured,
    matchesConfigured: configured === proxy,
    deployed: await isProxyDeployed(proxy),
  };
}

/**
 * The wallet that holds collateral and signs as maker.
 *
 * Refuses when the configured funder is not the proxy our signer owns, which is
 * the case that silently strands money in somebody else's wallet.
 */
export async function resolveOwnedProxy(): Promise<Address> {
  const status = await readProxyStatus();
  if (!status.configured) {
    throw new Error(
      `Polymarket funder wallet is missing. Blue's proxy is ${status.proxy}.`,
    );
  }
  if (!status.matchesConfigured) {
    throw new Error(
      `POLYMARKET_PROXY_WALLET is ${status.configured}, but the signer ` +
        `${status.signer} owns ${status.proxy}. Funding the configured wallet ` +
        'would put collateral somewhere Blue cannot trade from.',
    );
  }
  return status.proxy;
}
