import { headers } from 'next/headers';
import { recoverMessageAddress } from 'viem';
import { getWalletFromPrivyToken } from './privy-auth';

/**
 * Gets the wallet address from the request.
 * Tries Privy token first, then falls back to legacy signed message format.
 */
export async function getWalletAddressFromRequest(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const authData = authHeader.substring(7);

    // Try Privy token verification first (JWT format — contains dots)
    if (authData.includes('.')) {
      const wallet = await getWalletFromPrivyToken(authHeader);
      if (wallet) return wallet;
    }

    // Legacy: signed wallet auth — address:signature:timestamp
    const parts = authData.split(':');
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

    // Legacy dev-only: bare address
    if (process.env.NODE_ENV === 'development' && /^0x[a-fA-F0-9]{40}$/.test(authData)) {
      return authData.toLowerCase();
    }

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
