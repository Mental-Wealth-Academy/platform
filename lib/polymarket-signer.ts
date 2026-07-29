/**
 * Resolves the private key Blue trades Polymarket with.
 *
 * The trading key and Blue's wallet key are the same secret, so requiring both
 * variables means a deploy can half-configure itself: the wallet address lines
 * up while the signer is empty, and every call fails with a missing-signer error
 * that looks nothing like the misconfiguration behind it.
 *
 * POLYMARKET_WALLET_PRIVATE_KEY still wins when set, so the trading key can be
 * rotated independently of Blue's if they ever need to diverge.
 */

export function resolvePolymarketSignerKey(): `0x${string}` {
  const raw = (
    process.env.POLYMARKET_WALLET_PRIVATE_KEY?.trim() ||
    process.env.AZURA_PRIVATE_KEY?.trim() ||
    ''
  );
  if (!raw) {
    throw new Error(
      'Polymarket signer is missing. Set POLYMARKET_WALLET_PRIVATE_KEY or AZURA_PRIVATE_KEY.',
    );
  }
  const key = (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('The Polymarket signer key is malformed.');
  }
  return key;
}
