/**
 * Polymarket CLOB API Client
 *
 * HMAC-SHA256 authenticated client for placing and managing
 * orders on Polymarket's Central Limit Order Book (Polygon).
 */

import crypto from 'crypto';

const CLOB_BASE_URL = 'https://clob.polymarket.com';

interface ClobConfig {
  apiKey: string;
  secret: string;
  passphrase: string;
  proxyWallet: string;
}

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

function getConfig(): ClobConfig {
  const apiKey = process.env.POLYMARKET_CLOB_API_KEY;
  const secret = process.env.POLYMARKET_CLOB_SECRET;
  const passphrase = process.env.POLYMARKET_CLOB_PASSPHRASE;
  const proxyWallet = process.env.POLYMARKET_PROXY_WALLET;

  if (!apiKey || !secret || !passphrase || !proxyWallet) {
    throw new Error(
      'Missing Polymarket CLOB credentials. Set POLYMARKET_CLOB_API_KEY, POLYMARKET_CLOB_SECRET, POLYMARKET_CLOB_PASSPHRASE, POLYMARKET_PROXY_WALLET.',
    );
  }

  return { apiKey, secret, passphrase, proxyWallet };
}

function createHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  const message = timestamp + method + path + body;
  return crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(message).digest('base64');
}

async function clobFetch(
  method: string,
  path: string,
  body?: object,
): Promise<Response> {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';

  const signature = createHmacSignature(config.secret, timestamp, method, path, bodyStr);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'POLY-API-KEY': config.apiKey,
    'POLY-SIGNATURE': signature,
    'POLY-TIMESTAMP': timestamp,
    'POLY-PASSPHRASE': config.passphrase,
  };

  const res = await fetch(`${CLOB_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CLOB ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res;
}

/**
 * Place a limit order on the Polymarket CLOB.
 */
export async function placeOrder(order: ClobOrder): Promise<ClobOrderResponse> {
  const res = await clobFetch('POST', '/order', {
    tokenID: order.tokenID,
    price: order.price,
    size: order.size,
    side: order.side,
    expiration: order.expiration || 0,
  });
  return res.json();
}

/**
 * Cancel an open order by ID.
 */
export async function cancelOrder(orderID: string): Promise<{ success: boolean }> {
  const res = await clobFetch('DELETE', `/order/${orderID}`);
  return res.json();
}

/**
 * Get all open orders for the authenticated account.
 */
export async function getOpenOrders(market?: string): Promise<OpenOrder[]> {
  const path = market ? `/orders?market=${market}` : '/orders';
  const res = await clobFetch('GET', path);
  return res.json();
}

/**
 * Get filled (matched) orders for the authenticated account.
 */
export async function getFilledOrders(market?: string): Promise<FilledOrder[]> {
  const path = market ? `/trades?market=${market}` : '/trades';
  const res = await clobFetch('GET', path);
  return res.json();
}

/**
 * Get account balance on the CLOB (USDC on Polygon).
 */
export async function getClobBalance(): Promise<{ balance: string }> {
  const res = await clobFetch('GET', '/balance');
  return res.json();
}
