import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error('NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
    }
    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

// Cache Privy userId → wallet address to avoid repeated API calls.
// Privy's verifyAuthToken is local JWT verification (fast), but getUser
// is a network call. This cache keeps wallet lookups fast after the first hit.
const walletCache = new Map<string, { wallet: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies a raw Privy access token and returns the user's wallet address.
 * Results are cached by Privy userId for 5 minutes.
 */
export async function getWalletFromPrivyToken(token: string): Promise<string | null> {
  if (!token) {
    console.warn('[Privy Auth] No token provided');
    return null;
  }

  try {
    const client = getPrivyClient();
    const { userId } = await client.verifyAuthToken(token);

    // Check cache
    const cached = walletCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.wallet;
    }

    const user = await client.getUser(userId);

    // Find the user's wallet — prefer embedded, fallback to linked
    const embeddedWallet = user.linkedAccounts.find(
      (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
    );
    const linkedWallet = user.linkedAccounts.find(
      (a: any) => a.type === 'wallet'
    );
    const wallet = embeddedWallet || linkedWallet;

    if (!wallet || !('address' in wallet)) {
      console.warn('[Privy Auth] User has no wallet linked. userId:', userId,
        'linkedAccounts:', JSON.stringify(user.linkedAccounts.map((a: any) => ({ type: a.type, walletClientType: a.walletClientType, hasAddress: 'address' in a }))));
      return null;
    }
    const rawAddress = (wallet as any).address;
    const address = typeof rawAddress === 'string' ? rawAddress.trim().toLowerCase() : String(rawAddress).trim().toLowerCase();
    console.warn('[Privy Auth] Resolved wallet:', address.slice(0, 10) + '...', 'type:', (wallet as any).walletClientType, 'length:', address.length);

    // Cache the result
    walletCache.set(userId, { wallet: address, expiresAt: Date.now() + CACHE_TTL });

    return address;
  } catch (error: any) {
    console.error('[Privy Auth] Token verification failed:', error?.message || error);
    return null;
  }
}
