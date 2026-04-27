import { Contract, providers } from 'ethers';

export const SOUL_KEY_ADDRESS = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F';

const ERC721_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
];

let cached: { wallet: string; hasKey: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function walletHoldsSoulKey(wallet: string | null | undefined): Promise<boolean> {
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return false;

  const now = Date.now();
  const normalized = wallet.toLowerCase();
  if (cached && cached.wallet === normalized && cached.expiresAt > now) {
    return cached.hasKey;
  }

  const rpcUrl = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL;
  if (!rpcUrl) {
    console.warn('[soul-key] BASE_RPC_URL not configured');
    return false;
  }

  try {
    const provider = new providers.JsonRpcProvider(rpcUrl);
    const contract = new Contract(SOUL_KEY_ADDRESS, ERC721_BALANCE_ABI, provider);
    const balance = await contract.balanceOf(wallet);
    const hasKey = balance && balance.gt(0);
    cached = { wallet: normalized, hasKey: !!hasKey, expiresAt: now + CACHE_TTL_MS };
    return !!hasKey;
  } catch (err) {
    console.error('[soul-key] balanceOf failed:', err);
    return false;
  }
}
