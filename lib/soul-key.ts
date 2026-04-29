import { Contract, providers } from 'ethers';

export const SOUL_KEY_ADDRESS = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F';
export const VIP_MEMBERSHIP_CARD_ADDRESS =
  process.env.VIP_MEMBERSHIP_CARD_ADDRESS || '0x5da79055cf8ca6482c997df58822e08e5707d6fc';
export const VIP_MEMBERSHIP_CARD_TOKEN_ID = BigInt(process.env.VIP_MEMBERSHIP_CARD_TOKEN_ID || '1');

const ERC721_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
];
const ERC1155_BALANCE_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

let cached: { wallet: string; hasKey: boolean; expiresAt: number } | null = null;
let vipCached: { wallet: string; hasCard: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

function getProvider(): providers.JsonRpcProvider | null {
  const rpcUrl = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL;
  if (!rpcUrl) {
    console.warn('[soul-key] BASE_RPC_URL not configured');
    return null;
  }

  return new providers.JsonRpcProvider(rpcUrl);
}

export async function walletHoldsSoulKey(wallet: string | null | undefined): Promise<boolean> {
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return false;

  const now = Date.now();
  const normalized = wallet.toLowerCase();
  if (cached && cached.wallet === normalized && cached.expiresAt > now) {
    return cached.hasKey;
  }

  const provider = getProvider();
  if (!provider) {
    return false;
  }

  try {
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

export async function walletHoldsVipMembershipCard(wallet: string | null | undefined): Promise<boolean> {
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return false;

  const now = Date.now();
  const normalized = wallet.toLowerCase();
  if (vipCached && vipCached.wallet === normalized && vipCached.expiresAt > now) {
    return vipCached.hasCard;
  }

  const provider = getProvider();
  if (!provider) {
    return false;
  }

  try {
    const contract = new Contract(VIP_MEMBERSHIP_CARD_ADDRESS, ERC1155_BALANCE_ABI, provider);
    const balance = await contract.balanceOf(wallet, VIP_MEMBERSHIP_CARD_TOKEN_ID);
    const hasCard = balance && balance.gt(0);
    vipCached = { wallet: normalized, hasCard, expiresAt: now + CACHE_TTL_MS };
    return hasCard;
  } catch (err) {
    console.error('[vip-membership-card] balanceOf failed:', err);
    return false;
  }
}
