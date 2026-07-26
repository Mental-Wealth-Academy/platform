/**
 * Chain-aware configuration for Diamonds ($BLUE) and related contracts.
 *
 * Toggle between Base mainnet and Base Sepolia via NEXT_PUBLIC_USE_TESTNET.
 * When set to 'true' (or '1'), all Diamonds flows (balance reads, mints,
 * burns, reflections) target the Sepolia deployment.
 */

export interface ChainConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  explorerUrl: string;
  diamondsTokenAddress: string;
  reflectionVaultAddress: string | null;
  cbBTcAddress: string | null;
  usdcAddress: string;
}

const MAINNET: ChainConfig = {
  chainId: 8453,
  chainIdHex: '0x2105',
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org',
  diamondsTokenAddress:
    process.env.DIAMONDS_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_DIAMONDS_TOKEN_ADDRESS ||
    '0x4A25Cea1f05C6725dC90849FBaafF00d67342B3f',
  reflectionVaultAddress:
    process.env.DIAMONDS_VAULT_ADDRESS ||
    process.env.NEXT_PUBLIC_REFLECTION_VAULT_ADDRESS ||
    null,
  cbBTcAddress:
    process.env.DIAMONDS_CBBTC_ADDRESS ||
    process.env.NEXT_PUBLIC_DIAMONDS_CBBTC_ADDRESS ||
    '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  usdcAddress:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

const SEPOLIA: ChainConfig = {
  chainId: 84532,
  chainIdHex: '0x14a34',
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrl:
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  diamondsTokenAddress:
    process.env.DIAMONDS_SEPOLIA_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_DIAMONDS_SEPOLIA_TOKEN_ADDRESS ||
    '0xd116e780ca9ec3984e7682e095aab50006a9c160',
  reflectionVaultAddress:
    process.env.DIAMONDS_SEPOLIA_VAULT_ADDRESS ||
    process.env.NEXT_PUBLIC_DIAMONDS_SEPOLIA_VAULT_ADDRESS ||
    '0xc8FfD11F157C71F58477Cc49a2bf25bc69683b20',
  cbBTcAddress:
    process.env.DIAMONDS_SEPOLIA_CBBTC_ADDRESS ||
    process.env.NEXT_PUBLIC_DIAMONDS_SEPOLIA_CBBTC_ADDRESS ||
    '0x71a92f9b94646e5119f82cd7b01c69da8ec3a352',
  // Circle's canonical USDC on Base Sepolia
  usdcAddress:
    process.env.NEXT_PUBLIC_USDC_SEPOLIA_ADDRESS ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

function isTestnet(): boolean {
  if (typeof process === 'undefined') return false;
  const v = process.env.NEXT_PUBLIC_USE_TESTNET || process.env.USE_TESTNET || '';
  return v === 'true' || v === '1' || v === 'yes';
}

export function getChainConfig(): ChainConfig {
  return isTestnet() ? SEPOLIA : MAINNET;
}

export function getDiamondsTokenAddress(): string {
  return getChainConfig().diamondsTokenAddress;
}

export function getReflectionVaultAddress(): string | null {
  return getChainConfig().reflectionVaultAddress;
}

export function getCbBTCAddress(): string | null {
  return getChainConfig().cbBTcAddress;
}

export function getUsdcAddress(): string {
  return getChainConfig().usdcAddress;
}

export function getRpcUrl(): string {
  return getChainConfig().rpcUrl;
}

export function getChainId(): number {
  return getChainConfig().chainId;
}

export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/** Public fallback RPCs per chain, tried in order after the configured URL. */
const FALLBACK_RPCS: Record<number, string[]> = {
  8453: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
  84532: ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com'],
};

let verifiedRpcCache: { chainId: number; url: string } | null = null;

/**
 * Server-side guard: find an RPC that provably serves the active chain and
 * answers the operation class Diamonds writes depend on. The probe is a real
 * eth_call (balanceOf on the Diamonds token): it fails on a wrong-network
 * URL (no code, empty return) AND on endpoints that answer cheap methods
 * like eth_chainId or eth_getCode but refuse eth_call — the 2026-07-08
 * reflections-cron outage, where prod's Alchemy app served getCode fine and
 * rejected every eth_call. Tries the configured URL first, then public
 * fallbacks; caches the winner for the process lifetime.
 */
export async function resolveVerifiedRpcUrl(): Promise<string> {
  const cfg = getChainConfig();
  if (verifiedRpcCache?.chainId === cfg.chainId) return verifiedRpcCache.url;

  // balanceOf(BURN_ADDRESS) against the least-privileged contract we touch:
  // prefer cbBTC over the token, because an Alchemy app allowlisted only for
  // the Diamonds token (per the Gas Manager setup) passes token calls while
  // refusing cbBTC calls — probing the token waved exactly that endpoint
  // through on 2026-07-08. Any healthy endpoint returns a 32-byte word.
  const probeTarget = cfg.cbBTcAddress || cfg.diamondsTokenAddress;
  const probeBody = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'eth_call',
    params: [{
      to: probeTarget,
      data: `0x70a08231000000000000000000000000${BURN_ADDRESS.slice(2).toLowerCase()}`,
    }, 'latest'],
  });

  const candidates = [cfg.rpcUrl, ...(FALLBACK_RPCS[cfg.chainId] || [])];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: probeBody,
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => null);
      const result: string | undefined = data?.result;
      if (typeof result === 'string' && result.length === 66) {
        if (url !== cfg.rpcUrl) {
          console.error(`[chain-config] Configured RPC failed the eth_call probe — using ${url}`);
        }
        verifiedRpcCache = { chainId: cfg.chainId, url };
        return url;
      }
    } catch { /* try the next candidate */ }
  }
  console.error('[chain-config] No candidate RPC passed the probe — using the configured URL as-is.');
  return cfg.rpcUrl;
}
