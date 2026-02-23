/**
 * Clanker API — APPLE Token Deployment
 *
 * One-shot script to deploy the APPLE token on Base via Clanker.
 * Pairs with USDC, mints 3% supply to Azura's vault address.
 */

const CLANKER_API_URL = 'https://www.clanker.world/api/tokens/deploy';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;

export interface ClankerDeployRequest {
  name: string;
  symbol: string;
  tokenAdmin: string;
  requestKey: string;
  pairedToken: string;
  chainId: number;
  vault?: {
    percentage: number;
    recipient: string;
  };
  rewards?: {
    percentage: number;
    recipient: string;
  };
}

export interface ClankerDeployResponse {
  id: string;
  requestKey: string;
  expectedAddress: string;
  status: string;
  name: string;
  symbol: string;
  chainId: number;
  poolAddress?: string;
  txHash?: string;
}

function generateRequestKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Deploy the APPLE token via Clanker API.
 * Returns the deployment response including expectedAddress.
 */
export async function deployAppleToken(azuraWalletAddress: string): Promise<ClankerDeployResponse> {
  const apiKey = process.env.CLANKER_API_KEY;
  if (!apiKey) {
    throw new Error('CLANKER_API_KEY not configured');
  }

  const body: ClankerDeployRequest = {
    name: 'Apple',
    symbol: 'APPLE',
    tokenAdmin: azuraWalletAddress,
    requestKey: generateRequestKey(),
    pairedToken: USDC_BASE,
    chainId: BASE_CHAIN_ID,
    vault: {
      percentage: 3,
      recipient: azuraWalletAddress,
    },
    rewards: {
      percentage: 100,
      recipient: azuraWalletAddress,
    },
  };

  const res = await fetch(CLANKER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clanker deploy failed (${res.status}): ${text}`);
  }

  return res.json();
}
