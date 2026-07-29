/**
 * Polymarket Bridge: fund Blue's trading collateral from Base.
 *
 * Polymarket issues each wallet a dedicated deposit address per address family.
 * Anything sent to the EVM one from a supported chain is bridged and converted
 * into trading collateral on Polygon automatically, so Blue can top herself up
 * from her own Base holdings without a third-party bridge.
 *
 * Docs: https://docs.polymarket.com/trading/bridge/deposit
 */

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  getAddress,
  http,
  parseEther,
  parseUnits,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { resolvePolymarketSignerKey } from './polymarket-signer';

export const BRIDGE_BASE_URL = 'https://bridge.polymarket.com';
export const BASE_CHAIN_ID = 8453;

/** Sentinel the bridge uses for a chain's native asset. */
const NATIVE_SENTINEL = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const BASE_RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  'https://mainnet.base.org';

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

export interface BridgeDepositAddresses {
  evm: Address;
  svm?: string;
  tron?: string;
  btc?: string;
}

export interface SupportedAsset {
  chainId: string;
  chainName: string;
  token: { name: string; symbol: string; address: string; decimals: number };
  minCheckoutUsd: number;
}

export interface BridgeSendResult {
  sent: boolean;
  symbol: string;
  amount: string;
  to: Address;
  hash?: `0x${string}`;
  minCheckoutUsd: number;
}

function builderHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const code = process.env.POLYMARKET_BUILDER_CODE?.trim();
  if (code) headers['X-Builder-Code'] = code;
  return headers;
}

function tradingAccount() {
  return privateKeyToAccount(resolvePolymarketSignerKey());
}

/**
 * The wallet the bridge should credit. In EOA mode that is the signer itself;
 * any other signature type means collateral belongs to a proxy we do not control
 * from here, so we refuse rather than bridge into the wrong account.
 */
export function resolveCollateralWallet(): Address {
  const account = tradingAccount();
  const signatureType = process.env.POLYMARKET_SIGNATURE_TYPE?.trim() || '2';
  const configured = (
    process.env.POLYMARKET_DEPOSIT_WALLET_ADDRESS ||
    process.env.POLYMARKET_PROXY_WALLET ||
    ''
  ).trim();
  if (!configured) throw new Error('Polymarket funder wallet is missing.');
  const funder = getAddress(configured);

  if (signatureType !== '0') {
    throw new Error(
      `POLYMARKET_SIGNATURE_TYPE is ${signatureType}; bridging from this wallet would ` +
        'credit an account it does not control.',
    );
  }
  if (funder !== account.address) {
    throw new Error(
      `EOA mode requires signer === funder, but the signer is ${account.address} ` +
        `and the funder is ${funder}.`,
    );
  }
  return funder;
}

export async function fetchSupportedAssets(): Promise<SupportedAsset[]> {
  const res = await fetch(`${BRIDGE_BASE_URL}/supported-assets`, {
    headers: builderHeaders(),
  });
  if (!res.ok) {
    throw new Error(`The bridge asset list failed (${res.status}).`);
  }
  const body = await res.json() as { supportedAssets?: SupportedAsset[] };
  if (!Array.isArray(body.supportedAssets)) {
    throw new Error('The bridge returned an unexpected asset list.');
  }
  return body.supportedAssets;
}

export async function findBaseAsset(symbol: string): Promise<SupportedAsset> {
  const assets = await fetchSupportedAssets();
  const wanted = symbol.trim().toUpperCase();
  const match = assets.find(
    (asset) =>
      String(asset.chainId) === String(BASE_CHAIN_ID) &&
      asset.token.symbol.toUpperCase() === wanted,
  );
  if (!match) {
    const available = assets
      .filter((asset) => String(asset.chainId) === String(BASE_CHAIN_ID))
      .map((asset) => asset.token.symbol)
      .join(', ');
    throw new Error(`${symbol} is not bridgeable from Base. Supported: ${available}`);
  }
  return match;
}

/** Blue's dedicated deposit addresses. Stable per wallet, safe to cache. */
export async function requestDepositAddresses(
  walletAddress?: Address,
): Promise<BridgeDepositAddresses> {
  const address = walletAddress || resolveCollateralWallet();
  const res = await fetch(`${BRIDGE_BASE_URL}/deposit`, {
    method: 'POST',
    headers: builderHeaders(),
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    throw new Error(`The bridge deposit request failed (${res.status}).`);
  }
  const body = await res.json() as {
    address?: Record<string, string>;
    warnings?: Array<{ code: string; message: string }>;
  };
  const evm = body.address?.evm;
  if (!evm) throw new Error('The bridge did not return an EVM deposit address.');

  for (const warning of body.warnings || []) {
    console.warn(`Polymarket bridge: ${warning.message}`);
  }
  return {
    evm: getAddress(evm),
    svm: body.address?.svm,
    tron: body.address?.tron,
    btc: body.address?.btc,
  };
}

export async function getDepositStatus(walletAddress?: Address): Promise<unknown> {
  const address = walletAddress || resolveCollateralWallet();
  const res = await fetch(`${BRIDGE_BASE_URL}/status/${address}`, {
    headers: builderHeaders(),
  });
  return res.json();
}

/**
 * Move value from Blue's Base wallet into her Polymarket collateral.
 *
 * Fails closed: refuses unsupported tokens, insufficient balance, and amounts
 * below the bridge's own minimum where that can be checked without a price feed.
 */
export async function bridgeFromBase(options: {
  symbol: string;
  amount: number;
  dryRun?: boolean;
}): Promise<BridgeSendResult> {
  const account = tradingAccount();
  resolveCollateralWallet();

  const asset = await findBaseAsset(options.symbol);
  const { evm: to } = await requestDepositAddresses();
  const isNative =
    asset.token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase();

  if (!Number.isFinite(options.amount) || options.amount <= 0) {
    throw new Error('The bridge amount must be positive.');
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL, { timeout: 15_000 }),
  });

  const value = isNative
    ? parseEther(String(options.amount))
    : parseUnits(options.amount.toFixed(asset.token.decimals), asset.token.decimals);

  const balance = isNative
    ? await publicClient.getBalance({ address: account.address })
    : await publicClient.readContract({
        address: getAddress(asset.token.address),
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      });

  if (balance < value) {
    const held = isNative
      ? formatEther(balance)
      : formatUnits(balance, asset.token.decimals);
    throw new Error(
      `Blue holds ${held} ${asset.token.symbol} on Base, which is short of ${options.amount}.`,
    );
  }
  // A stablecoin's unit price is close enough to a dollar to enforce the floor
  // directly. Volatile assets are left to the bridge, which rejects dust itself.
  if (/^(USDC|USDT|DAI|USDS|USDbC|USDe|EURC)$/i.test(asset.token.symbol)) {
    if (options.amount < asset.minCheckoutUsd) {
      throw new Error(
        `${options.amount} ${asset.token.symbol} is below the bridge minimum of ` +
          `$${asset.minCheckoutUsd}.`,
      );
    }
  }

  const result: BridgeSendResult = {
    sent: false,
    symbol: asset.token.symbol,
    amount: String(options.amount),
    to,
    minCheckoutUsd: asset.minCheckoutUsd,
  };
  if (options.dryRun) return result;

  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL, { timeout: 15_000 }),
  });

  const hash = isNative
    ? await wallet.sendTransaction({ to, value })
    : await wallet.writeContract({
        address: getAddress(asset.token.address),
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, value],
      });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`The bridge transfer reverted (${hash}).`);
  }

  return { ...result, sent: true, hash };
}
