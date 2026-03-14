import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sqlQuery } from './db';
import { getWalletAddressFromRequest } from './wallet-auth';

const SESSION_COOKIE_NAME = 'mwa_session';
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  walletAddress: string;
  shardCount: number;
};

export async function getSessionTokenFromCookies() {
  const cookieStore = await import('next/headers').then(m => m.cookies());
  return cookieStore.get('session_token')?.value || cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function createSessionForUser(userId: string) {
  const sessionId = uuidv4();
  const token = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await sqlQuery(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES (:id, :userId, :token, :expiresAt)`,
    { id: sessionId, userId, token, expiresAt }
  );

  return { token, expiresAt };
}

/**
 * Gets the current user via wallet address authentication or session cookie.
 * Tries wallet auth header first, then falls back to session cookie.
 */
export async function getCurrentUserFromRequestCookie(): Promise<CurrentUser | null> {
  // Try wallet auth header first
  try {
    const walletAddress = await getWalletAddressFromRequest();
    if (walletAddress) {
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
      if (user) {
        return {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          walletAddress: user.wallet_address,
          shardCount: user.shard_count,
        };
      }
    }
  } catch (error) {
    console.warn('Wallet auth failed, trying session cookie:', error);
  }

  // Fallback to session cookie
  try {
    const token = await getSessionTokenFromCookies();
    if (!token) return null;

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
       JOIN sessions s ON s.user_id = u.id
       WHERE s.token = :token AND s.expires_at > NOW()
       LIMIT 1`,
      { token }
    );

    const user = rows[0];
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      walletAddress: user.wallet_address,
      shardCount: user.shard_count,
    };
  } catch (error) {
    console.warn('Session cookie auth failed:', error);
    return null;
  }
}

/**
 * Gets the current user from the request.
 */
export async function getUserFromRequest(_request?: Request): Promise<CurrentUser | null> {
  return getCurrentUserFromRequestCookie();
}
