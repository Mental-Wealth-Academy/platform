import { constants as cryptoConstants, createPrivateKey, sign as signWithPrivateKey } from 'node:crypto';

export const KALSHI_API_BASE_URL =
  (process.env.KALSHI_API_BASE_URL || 'https://api.elections.kalshi.com').replace(/\/+$/, '');

const KALSHI_ORDER_PATH = '/trade-api/v2/portfolio/orders';

export interface KalshiOrderRequest {
  ticker: string;
  side: 'yes' | 'no';
  count: number;
  priceCents: number;
  clientOrderId: string;
}

export interface KalshiOrderResponse {
  order_id?: string;
  client_order_id?: string;
  ticker?: string;
  side?: 'yes' | 'no';
  action?: 'buy' | 'sell';
  status?: string;
  yes_price?: number;
  no_price?: number;
  yes_price_dollars?: string;
  no_price_dollars?: string;
  created_time?: string;
  last_update_time?: string;
  remaining_count?: number;
  remaining_count_fp?: string;
  initial_count?: number;
  initial_count_fp?: string;
}

function getKalshiCredentials() {
  const apiKeyId = process.env.KALSHI_API_KEY_ID?.trim() || '';
  const privateKeyPem = (process.env.KALSHI_API_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

  if (!apiKeyId || !privateKeyPem) {
    throw new Error('Kalshi credentials missing. Set KALSHI_API_KEY_ID and KALSHI_API_PRIVATE_KEY.');
  }

  return { apiKeyId, privateKeyPem };
}

function createKalshiSignature(timestamp: string, method: string, path: string, privateKeyPem: string): string {
  const message = `${timestamp}${method.toUpperCase()}${path}`;
  const key = createPrivateKey(privateKeyPem);
  const signature = signWithPrivateKey('sha256', Buffer.from(message, 'utf8'), {
    key,
    padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
    saltLength: cryptoConstants.RSA_PSS_SALTLEN_DIGEST,
  });
  return signature.toString('base64');
}

async function signedKalshiFetch(path: string, init: RequestInit = {}) {
  const { apiKeyId, privateKeyPem } = getKalshiCredentials();
  const timestamp = Date.now().toString();
  const method = (init.method || 'GET').toUpperCase();
  const signature = createKalshiSignature(timestamp, method, path, privateKeyPem);

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('KALSHI-ACCESS-KEY', apiKeyId);
  headers.set('KALSHI-ACCESS-TIMESTAMP', timestamp);
  headers.set('KALSHI-ACCESS-SIGNATURE', signature);

  return fetch(`${KALSHI_API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    cache: 'no-store',
  });
}

export async function placeKalshiOrder(input: KalshiOrderRequest): Promise<KalshiOrderResponse> {
  const priceCents = Math.max(1, Math.min(99, Math.round(input.priceCents)));
  const count = Math.max(1, Math.floor(input.count));

  const payload: Record<string, string | number | boolean> = {
    ticker: input.ticker,
    action: 'buy',
    side: input.side,
    count,
    type: 'limit',
    client_order_id: input.clientOrderId,
    time_in_force: 'fill_or_kill',
  };

  if (input.side === 'yes') {
    payload.yes_price = priceCents;
  } else {
    payload.no_price = priceCents;
  }

  const response = await signedKalshiFetch(KALSHI_ORDER_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      parsed?.error?.message ||
      parsed?.message ||
      rawText ||
      `Kalshi order failed with status ${response.status}`;
    throw new Error(message);
  }

  return (parsed?.order || parsed) as KalshiOrderResponse;
}
