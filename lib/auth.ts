import { getWalletAddressFromRequest } from './wallet-auth';
import { sqlQuery } from './db';

export type CurrentUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  walletAddress: string;
  shardCount: number;
};

/**
 * Gets the current user from the request.
 *
 * Auth: Privy JWT (Authorization header) or Privy cookie (privy-token).
 * Both resolved by getWalletAddressFromRequest() → user looked up by wallet.
 */
export async function getCurrentUserFromRequestCookie(): Promise<CurrentUser | null> {
  try {
    const walletAddress = await getWalletAddressFromRequest();
    if (!walletAddress) {
      console.warn('[Auth] No wallet extracted from request');
      return null;
    }

    const rows = await sqlQuery<
      Array<{
        id: string;
        username: string;
        avatar_url: string | null;
        created_at: string;
        wallet_address: string;
        shard_count: number;
      }>
    >(
      `SELECT u.id, u.username, u.avatar_url, u.created_at, u.wallet_address, u.shard_count
       FROM users u
       WHERE LOWER(u.wallet_address) = LOWER(:walletAddress)
       LIMIT 1`,
      { walletAddress }
    );

    const user = rows[0];
    if (!user) {
      console.warn('[Auth] Wallet extracted but no user row found:', walletAddress.slice(0, 10) + '...');
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      walletAddress: user.wallet_address,
      shardCount: user.shard_count,
    };
  } catch (error) {
    console.warn('Auth failed:', error);
    return null;
  }
}

/**
 * Gets the current user from the request.
 */
export async function getUserFromRequest(_request?: Request): Promise<CurrentUser | null> {
  return getCurrentUserFromRequestCookie();
}
