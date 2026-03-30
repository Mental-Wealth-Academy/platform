import { headers, cookies } from 'next/headers';
import { recoverMessageAddress } from 'viem';
import { getWalletFromPrivyToken } from './privy-auth';

/**
 * Gets the wallet address from the request.
 * Checks in order:
 *   1. Authorization header (Bearer <privy-jwt>)
 *   2. Privy auth cookie (privy-token) — set automatically by Privy SDK
 *   3. Legacy signed wallet message (address:signature:timestamp)
 */
export async function getWalletAddressFromRequest(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    // 1. Try Authorization header with Privy JWT
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // JWT tokens contain dots
      if (token.includes('.')) {
        const wallet = await getWalletFromPrivyToken(token);
        if (wallet) return wallet;
        console.warn('[Wallet Auth] Authorization header JWT failed to extract wallet');
      }

      // Legacy: signed wallet auth — address:signature:timestamp
      const parts = token.split(':');
      if (parts.length === 3) {
        const [walletAddress, signature, timestamp] = parts;

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return null;

        const timestampNum = parseInt(timestamp, 10);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (isNaN(timestampNum) || Math.abs(now - timestampNum) > fiveMinutes) return null;

        const message = `Sign in to Mental Wealth Academy\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
        const isValid = await verifyWalletSignature(message, signature, walletAddress);
        if (isValid) return walletAddress.toLowerCase();
      }
    }

    // 2. Try Privy auth cookie (set automatically by @privy-io/react-auth)
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
      const wallet = await getWalletFromPrivyToken(privyToken);
      if (wallet) return wallet;
      console.warn('[Wallet Auth] privy-token cookie JWT failed to extract wallet');
    } else {
      console.warn('[Wallet Auth] No privy-token cookie found');
    }

    console.warn('[Wallet Auth] All auth methods failed. authHeader:', authHeader ? 'present' : 'absent', 'privyToken:', privyToken ? 'present' : 'absent');
    return null;
  } catch (error) {
    console.error('getWalletAddressFromRequest error:', error);
    return null;
  }
}

export async function verifyWalletSignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
