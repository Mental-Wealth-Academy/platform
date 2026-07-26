/**
 * Polymarket CLOB V2 — authenticated trading client.
 *
 * Places orders against Polymarket's Central Limit Order Book using
 * HMAC-SHA256 signed requests (L2 auth). Credentials are derived once
 * via EIP-712 wallet signature and stored as env vars.
 *
 * Required environment variables:
 *   POLYMARKET_CLOB_API_KEY      — L2 API key
 *   POLYMARKET_CLOB_SECRET       — L2 HMAC secret
 *   POLYMARKET_CLOB_PASSPHRASE   — L2 passphrase
 *
 * Collateral: pUSD on Polygon (V2, post April 2026).
 */

import { createHmac } from 'node:crypto';

export const POLYMARKET_CLOB_BASE =
  (process.env.POLYMARKET_CLOB_BASE_URL || 'https://clob.polymarket.com').replace(/\/+$/, '');

const ORDER_PATH = '/orders';

// ── Types ──

export interface PolymarketOrderRequest {
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;       // 0-1 decimal
  size: number;        // number of shares
  orderType?: 'FOK' | 'GTC';
  clientOrderId?: string;
}

export interface PolymarketOrderResponse {
  id?: string;
  status?: string;
  order_id?: string;
  market?: string;
  asset_id?: string;
  side?: string;
  original_size?: string;
  size_matched?: string;
  price?: string;
  outcome?: string;
  created_at?: string;
  expiration?: string;
  type?: string;
}

// ── Credentials ──

function getPolymarketCredentials() {
  const apiKey = process.env.POLYMARKET_CLOB_API_KEY?.trim() || '';
  const secret = process.env.POLYMARKET_CLOB_SECRET?.trim() || '';
  const passphrase = process.env.POLYMARKET_CLOB_PASSPHRASE?.trim() || '';

  if (!apiKey || !secret || !passphrase) {
    throw new Error(
      'Polymarket CLOB credentials missing. Set POLYMARKET_CLOB_API_KEY, POLYMARKET_CLOB_SECRET, and POLYMARKET_CLOB_PASSPHRASE.',
    );
  }

  return { apiKey, secret, passphrase };
}

// ── HMAC-SHA256 signing (L2 auth) ──

function createHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  return createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(message)
    .digest('base64');
}

async function signedPolymarketFetch(path: string, init: RequestInit = {}) {
  const { apiKey, secret, passphrase } = getPolymarketCredentials();
  const timestamp = (Date.now() / 1000).toFixed(0);
  const method = (init.method || 'GET').toUpperCase();
  const body = typeof init.body === 'string' ? init.body : '';
  const signature = createHmacSignature(secret, timestamp, method, path, body);

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('POLY-ADDRESS', apiKey);
  headers.set('POLY-SIGNATURE', signature);
  headers.set('POLY-TIMESTAMP', timestamp);
  headers.set('POLY-NONCE', timestamp);
  headers.set('POLY-PASSPHRASE', passphrase);

  return fetch(`${POLYMARKET_CLOB_BASE}${path}`, {
    ...init,
    method,
    headers,
    cache: 'no-store',
  });
}

// ── Order placement ──

export async function placePolymarketOrder(
  input: PolymarketOrderRequest,
): Promise<PolymarketOrderResponse> {
  const price = Math.max(0.01, Math.min(0.99, input.price));
  const size = Math.max(1, Math.floor(input.size));

  const payload: Record<string, string | number> = {
    token_id: input.tokenId,
    side: input.side,
    price,
    size,
    type: input.orderType || 'FOK',
  };

  if (input.clientOrderId) {
    payload.client_order_id = input.clientOrderId;
  }

  const body = JSON.stringify(payload);

  const response = await signedPolymarketFetch(ORDER_PATH, {
    method: 'POST',
    body,
  });

  const rawText = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      (parsed as Record<string, string>)?.error ||
      (parsed as Record<string, string>)?.message ||
      rawText ||
      `Polymarket order failed with status ${response.status}`;
    throw new Error(String(message));
  }

  return (parsed || {}) as PolymarketOrderResponse;
}
