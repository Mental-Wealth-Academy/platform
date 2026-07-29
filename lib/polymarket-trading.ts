/**
 * Polymarket CLOB V2 authenticated trading client.
 *
 * Uses the official V2 SDK so each order receives both layers required by
 * production: the wallet's EIP-712 order signature and L2 HMAC API auth.
 * Collateral is pUSD on Polygon.
 */

import {
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  Side,
  SignatureTypeV2,
  type ApiKeyCreds,
  type OrderResponse,
} from '@polymarket/clob-client-v2';
import {
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { wrapUsdcToPusd } from './polymarket-collateral';
import { resolvePolymarketSignerKey } from './polymarket-signer';

/** Auto-wrap is on unless explicitly disabled, so the agent is self-funding by default. */
function autoWrapEnabled(): boolean {
  return process.env.POLYMARKET_AUTO_WRAP?.trim().toLowerCase() !== 'false';
}

export const POLYMARKET_CLOB_BASE =
  (process.env.POLYMARKET_CLOB_BASE_URL || 'https://clob.polymarket.com').replace(/\/+$/, '');

const POLYGON_RPC_URL =
  process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
const PUSD_DECIMALS = 6;

export interface PolymarketOrderRequest {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  orderType?: 'FOK' | 'GTC';
  clientOrderId?: string;
}

export interface PolymarketOrderResponse {
  id?: string;
  orderID?: string;
  order_id?: string;
  status?: string;
  errorMsg?: string;
  success?: boolean;
  size_matched?: string;
  takingAmount?: string;
  makingAmount?: string;
  transactionsHashes?: string[];
  tradeIDs?: string[];
}

export interface PolymarketCollateralBalance {
  raw: string;
  formatted: string;
  usd: number;
  allowanceCount: number;
  hasAllowance: boolean;
}

let authenticatedClient: ClobClient | null = null;
let authenticatedClientPromise: Promise<ClobClient> | null = null;

function resolveSignatureType(): SignatureTypeV2 {
  const configured = process.env.POLYMARKET_SIGNATURE_TYPE?.trim();
  if (!configured) return SignatureTypeV2.POLY_GNOSIS_SAFE;

  const value = Number(configured);
  if (
    value !== SignatureTypeV2.EOA &&
    value !== SignatureTypeV2.POLY_PROXY &&
    value !== SignatureTypeV2.POLY_GNOSIS_SAFE &&
    value !== SignatureTypeV2.POLY_1271
  ) {
    throw new Error('POLYMARKET_SIGNATURE_TYPE must be 0, 1, 2, or 3.');
  }
  return value;
}

function buildPolymarketClient(creds?: ApiKeyCreds): ClobClient {
  const funder = (
    process.env.POLYMARKET_DEPOSIT_WALLET_ADDRESS ||
    process.env.POLYMARKET_PROXY_WALLET ||
    ''
  ).trim();
  if (!isAddress(funder)) {
    throw new Error('Polymarket funder wallet is missing or invalid.');
  }

  const account = privateKeyToAccount(resolvePolymarketSignerKey());
  const signer = createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC_URL, { timeout: 8_000 }),
  });
  return new ClobClient({
    host: POLYMARKET_CLOB_BASE,
    chain: Chain.POLYGON,
    signer,
    creds,
    signatureType: resolveSignatureType(),
    funderAddress: getAddress(funder),
    useServerTime: true,
    retryOnError: true,
    throwOnError: true,
  });
}

function configuredApiCredentials(): ApiKeyCreds | undefined {
  const key = process.env.POLYMARKET_CLOB_API_KEY?.trim();
  const secret = process.env.POLYMARKET_CLOB_SECRET?.trim();
  const passphrase = process.env.POLYMARKET_CLOB_PASSPHRASE?.trim();
  if (!key || !secret || !passphrase) return undefined;
  return { key, secret, passphrase };
}

async function getPolymarketClient(forceWalletDerivation = false): Promise<ClobClient> {
  if (!forceWalletDerivation && authenticatedClient) return authenticatedClient;
  if (!forceWalletDerivation && authenticatedClientPromise) {
    return authenticatedClientPromise;
  }

  authenticatedClientPromise = (async () => {
    if (!forceWalletDerivation) {
      const configured = configuredApiCredentials();
      if (configured) {
        authenticatedClient = buildPolymarketClient(configured);
        return authenticatedClient;
      }
    }

    const l1Client = buildPolymarketClient();
    let derived: ApiKeyCreds;
    try {
      derived = await l1Client.deriveApiKey();
    } catch {
      derived = await l1Client.createApiKey();
    }
    authenticatedClient = buildPolymarketClient(derived);
    return authenticatedClient;
  })();

  try {
    return await authenticatedClientPromise;
  } finally {
    authenticatedClientPromise = null;
  }
}

function isInvalidApiKey(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unauthorized|invalid api key/i.test(message);
}

export async function fetchPolymarketCollateralBalance(): Promise<PolymarketCollateralBalance> {
  let client = await getPolymarketClient();
  let result;
  try {
    result = await client.getBalanceAllowance({
      asset_type: AssetType.COLLATERAL,
    });
  } catch (error) {
    if (!isInvalidApiKey(error)) throw error;
    client = await getPolymarketClient(true);
    result = await client.getBalanceAllowance({
      asset_type: AssetType.COLLATERAL,
    });
  }
  const raw = result.balance || '0';
  const formatted = formatUnits(BigInt(raw), PUSD_DECIMALS);
  const usd = Number(formatted);
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error('Polymarket returned an invalid collateral balance.');
  }

  const allowances = Object.values(result.allowances || {});
  return {
    raw,
    formatted,
    usd,
    allowanceCount: allowances.length,
    hasAllowance: allowances.some((allowance) => BigInt(allowance) > 0n),
  };
}

export async function refreshPolymarketCollateralBalance(): Promise<PolymarketCollateralBalance> {
  await fetchPolymarketCollateralBalance();
  const client = await getPolymarketClient();
  await client.updateBalanceAllowance({
    asset_type: AssetType.COLLATERAL,
  });
  return fetchPolymarketCollateralBalance();
}

function normalizeOrderResponse(response: OrderResponse): PolymarketOrderResponse {
  return {
    ...response,
    id: response.orderID,
    order_id: response.orderID,
    size_matched: response.takingAmount,
  };
}

export async function placePolymarketOrder(
  input: PolymarketOrderRequest,
): Promise<PolymarketOrderResponse> {
  if (!/^\d+$/.test(input.tokenId)) {
    throw new Error('Polymarket outcome token ID is missing or invalid.');
  }
  if (!Number.isFinite(input.price) || input.price < 0.01 || input.price > 0.99) {
    throw new Error('Polymarket order price must be between 0.01 and 0.99.');
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new Error('Polymarket order size must be positive.');
  }

  const side = input.side === 'BUY' ? Side.BUY : Side.SELL;
  const orderType = input.orderType || 'FOK';

  if (side === Side.BUY) {
    const initialCollateral = await fetchPolymarketCollateralBalance();
    let collateral =
      initialCollateral.usd <= 0 || !initialCollateral.hasAllowance
        ? await refreshPolymarketCollateralBalance()
        : initialCollateral;
    const requiredUsd = input.size * input.price;

    // Blue funds herself: short collateral is topped up from her own USDC.e
    // through the permissionless onramp rather than failing the trade.
    if (collateral.usd + Number.EPSILON < requiredUsd && autoWrapEnabled()) {
      try {
        const wrap = await wrapUsdcToPusd();
        if (wrap.wrapped) {
          collateral = await refreshPolymarketCollateralBalance();
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error('Polymarket auto-wrap failed:', detail);
      }
    }

    if (collateral.usd + Number.EPSILON < requiredUsd) {
      throw new Error(
        `Polymarket collateral is ${collateral.formatted} pUSD; ${requiredUsd.toFixed(2)} pUSD is required.`,
      );
    }
    if (!collateral.hasAllowance) {
      throw new Error('Polymarket collateral allowance is missing.');
    }
  }
  const client = await getPolymarketClient();

  let response: OrderResponse;
  if (orderType === 'GTC') {
    response = await client.createAndPostOrder(
      {
        tokenID: input.tokenId,
        price: input.price,
        side,
        size: input.size,
      },
      undefined,
      OrderType.GTC,
    ) as OrderResponse;
  } else {
    response = await client.createAndPostMarketOrder(
      {
        tokenID: input.tokenId,
        amount: side === Side.BUY ? input.size * input.price : input.size,
        price: input.price,
        side,
        orderType: OrderType.FOK,
      },
      undefined,
      OrderType.FOK,
    ) as OrderResponse;
  }

  if (!response.success || response.errorMsg) {
    throw new Error(response.errorMsg || 'Polymarket rejected the order.');
  }
  return normalizeOrderResponse(response);
}
