/**
 * Polymarket CLOB API Client
 *
 * Uses the official @polymarket/clob-client for authenticated
 * order placement on Polymarket's CLOB (Polygon).
 *
 * Required env vars:
 *   POLYMARKET_CLOB_API_KEY
 *   POLYMARKET_CLOB_SECRET
 *   POLYMARKET_CLOB_PASSPHRASE
 *   POLYMARKET_PROXY_WALLET       — the Polymarket proxy wallet address
 *   POLYMARKET_WALLET_PRIVATE_KEY  — private key for signing orders (EIP-712)
 */

import { ClobClient, Side, AssetType } from '@polymarket/clob-client';
import { Wallet } from 'ethers';

const CLOB_HOST = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

export interface ClobOrder {
  tokenID: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  expiration?: number;
}

export interface ClobOrderResponse {
  orderID: string;
  status: string;
  transactionsHashes?: string[];
}

export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  original_size: string;
  size_matched: string;
  status: string;
  created_at: number;
}

export interface FilledOrder {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  status: string;
  match_time: number;
}

let _client: ClobClient | null = null;

function getClient(): ClobClient {
  if (_client) return _client;

  const apiKey = process.env.POLYMARKET_CLOB_API_KEY;
  const secret = process.env.POLYMARKET_CLOB_SECRET;
  const passphrase = process.env.POLYMARKET_CLOB_PASSPHRASE;
  const privateKey = process.env.POLYMARKET_WALLET_PRIVATE_KEY;

  if (!apiKey || !secret || !passphrase) {
    throw new Error(
      'Missing Polymarket CLOB credentials. Set POLYMARKET_CLOB_API_KEY, POLYMARKET_CLOB_SECRET, POLYMARKET_CLOB_PASSPHRASE.',
    );
  }

  // Signer is required for placing orders (EIP-712 signatures)
  const signer = privateKey ? new Wallet(privateKey) : undefined;

  _client = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID,
    signer,
    { key: apiKey, secret, passphrase },
  );

  return _client;
}

/**
 * Get a read-only client (no signer needed) for public data.
 */
function getPublicClient(): ClobClient {
  return new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID);
}

/**
 * Place a limit order on the Polymarket CLOB.
 */
export async function placeOrder(order: ClobOrder): Promise<ClobOrderResponse> {
  const client = getClient();

  const side = order.side === 'BUY' ? Side.BUY : Side.SELL;

  const signed = await client.createOrder({
    tokenID: order.tokenID,
    price: order.price,
    size: order.size,
    side,
    feeRateBps: 0,
    nonce: 0,
    expiration: order.expiration || 0,
  });

  const response = await client.postOrder(signed);
  return {
    orderID: response?.orderID || 'unknown',
    status: response?.status || 'submitted',
    transactionsHashes: response?.transactionsHashes,
  };
}

/**
 * Place a market order (fills at best available price).
 */
export async function placeMarketOrder(
  tokenID: string,
  amount: number,
): Promise<ClobOrderResponse> {
  const client = getClient();
  const response = await client.createAndPostMarketOrder({
    tokenID,
    amount,
    side: Side.BUY,
    feeRateBps: 0,
    nonce: 0,
  });
  return {
    orderID: response?.orderID || 'unknown',
    status: response?.status || 'submitted',
    transactionsHashes: response?.transactionsHashes,
  };
}

/**
 * Cancel an open order by ID.
 */
export async function cancelOrder(orderID: string): Promise<{ success: boolean }> {
  const client = getClient();
  await client.cancelOrder({ id: orderID } as any);
  return { success: true };
}

/**
 * Get all open orders for the authenticated account.
 */
export async function getOpenOrders(market?: string): Promise<OpenOrder[]> {
  const client = getClient();
  const params = market ? { market } : undefined;
  const orders = await client.getOpenOrders(params);
  return orders as unknown as OpenOrder[];
}

/**
 * Get filled (matched) trades for the authenticated account.
 */
export async function getFilledOrders(market?: string): Promise<FilledOrder[]> {
  const client = getClient();
  const params = market ? { market } : undefined;
  const trades = await client.getTrades(params);
  return trades as unknown as FilledOrder[];
}

/**
 * Get USDC balance and allowance for trading.
 */
export async function getClobBalance(): Promise<{ balance: string }> {
  const client = getClient();
  const result = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
  return { balance: result?.balance || '0' };
}

/**
 * Get order book for a token.
 */
export async function getOrderBook(tokenID: string) {
  const client = getPublicClient();
  return client.getOrderBook(tokenID);
}

/**
 * Get midpoint price for a token.
 */
export async function getMidpoint(tokenID: string): Promise<string> {
  const client = getPublicClient();
  return client.getMidpoint(tokenID);
}

/**
 * Get active markets from the CLOB.
 */
export async function getActiveMarkets(limit = 20) {
  const client = getPublicClient();
  return client.getMarkets();
}
