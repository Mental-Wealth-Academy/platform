/**
 * Helper to get auth headers for authenticated API calls.
 * With Privy, we use the Privy access token instead of manual wallet signatures.
 *
 * @param getAccessToken - Function from usePrivy() or getAccessToken from @privy-io/react-auth
 * @returns Promise with Authorization header
 */
export async function getPrivyAuthHeaders(
  getAccessToken: () => Promise<string | null>
): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * @deprecated Use getPrivyAuthHeaders instead. Kept for backward compatibility during migration.
 */
export async function getWalletAuthHeaders(
  address: string | undefined,
  signMessageAsync?: any
): Promise<HeadersInit> {
  if (!address) return {};
  if (!signMessageAsync) {
    if (process.env.NODE_ENV === 'development') {
      return { 'Authorization': `Bearer ${address}` };
    }
    throw new Error('Signature required for wallet authentication');
  }
  const timestamp = Date.now().toString();
  const message = `Sign in to Mental Wealth Academy\n\nWallet: ${address}\nTimestamp: ${timestamp}`;
  const signature = await signMessageAsync({ message });
  return { 'Authorization': `Bearer ${address}:${signature}:${timestamp}` };
}
