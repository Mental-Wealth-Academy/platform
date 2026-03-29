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

/**
 * Verifies a Privy access token from the Authorization header and returns
 * the user's wallet address (embedded or linked).
 */
export async function getWalletFromPrivyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  try {
    const client = getPrivyClient();
    const { userId } = await client.verifyAuthToken(token);
    const user = await client.getUser(userId);

    // Find the user's wallet — prefer embedded, fallback to linked
    const embeddedWallet = user.linkedAccounts.find(
      (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
    );
    const linkedWallet = user.linkedAccounts.find(
      (a: any) => a.type === 'wallet'
    );
    const wallet = embeddedWallet || linkedWallet;

    if (!wallet || !('address' in wallet)) return null;
    return (wallet as any).address.toLowerCase();
  } catch (error) {
    console.warn('[Privy Auth] Token verification failed:', error);
    return null;
  }
}
