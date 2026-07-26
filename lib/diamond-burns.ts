import { createPublicClient, http, parseUnits, parseEventLogs, parseAbi, type Chain, type TransactionReceipt } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { sqlQuery } from './db';
import { getDiamondsTokenAddress } from './diamonds-onchain';
import { getChainConfig, resolveVerifiedRpcUrl, BURN_ADDRESS } from './chain-config';

/**
 * Diamond ($BLUE) spending — real burns, server-verified.
 *
 * Every spend is a Transfer of $BLUE from the user's own wallet to the dead
 * address, signed by the user. The server verifies the transfer onchain and
 * records it in the diamond_burns ledger; the UNIQUE tx_hash means one burn
 * buys exactly one thing. Callers that can fail after verification (e.g. the
 * chat AI call) should reserve the burn first with recordDiamondBurn and
 * release it with releaseDiamondBurn on failure, so the user's burn is never
 * consumed by a turn that produced nothing.
 *
 * Built on viem: ethers v5's node HTTP transport fails inside deployed Vercel
 * lambdas ("missing response" on every RPC host), which made verification
 * throw on every spend in production.
 */

export const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

const ERC20_EVENTS_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

async function getBurnClient() {
  const cfg = getChainConfig();
  const chain: Chain = cfg.chainId === 84532 ? baseSepolia : base;
  return createPublicClient({
    chain,
    transport: http(await resolveVerifiedRpcUrl()),
  });
}

/**
 * Verify the supplied tx is a confirmed $BLUE Transfer of at least
 * `minWholeDiamonds` from `from` to `to`, emitted by the Diamonds token
 * contract, and signed by `from`. Waits briefly for the tx to confirm
 * (spends are signed moments before they are submitted here). Fail closed
 * on any mismatch.
 */
export async function verifyDiamondsTransferTx(
  txHash: string,
  from: string,
  to: string,
  minWholeDiamonds: number,
  options: { timeoutMs?: number } = {},
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tokenAddress = getDiamondsTokenAddress();
  if (!tokenAddress) return { ok: false, reason: 'token_not_configured' };

  const client = await getBurnClient();
  const hash = txHash as `0x${string}`;
  let receipt: TransactionReceipt | null = await client
    .waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: Math.max(1_000, Math.min(30_000, options.timeoutMs ?? 30_000)),
    })
    .catch(() => null);
  if (!receipt) {
    receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
  }
  if (!receipt) return { ok: false, reason: 'tx_not_found' };
  if (receipt.status !== 'success') return { ok: false, reason: 'tx_failed' };
  if (receipt.from.toLowerCase() !== from.toLowerCase()) return { ok: false, reason: 'wrong_sender' };

  const requiredAmount = parseUnits(String(minWholeDiamonds), 18);
  const transfers = parseEventLogs({
    abi: ERC20_EVENTS_ABI,
    eventName: 'Transfer',
    logs: receipt.logs,
    strict: false,
  });

  for (const log of transfers) {
    if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
    const args = log.args as { from?: string; to?: string; value?: bigint };
    if (!args.from || !args.to || typeof args.value !== 'bigint') continue;
    if (args.from.toLowerCase() !== from.toLowerCase()) continue;
    if (args.to.toLowerCase() !== to.toLowerCase()) continue;
    if (args.value < requiredAmount) continue;
    return { ok: true };
  }

  return { ok: false, reason: 'no_transfer' };
}

/** A burn is a verified transfer to the dead address. */
export async function verifyDiamondBurnTx(
  txHash: string,
  userWallet: string,
  minWholeDiamonds: number,
  options: { timeoutMs?: number } = {},
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return verifyDiamondsTransferTx(
    txHash,
    userWallet,
    BURN_ADDRESS,
    minWholeDiamonds,
    options,
  );
}

let burnSchemaEnsured = false;
export async function ensureBurnLedgerSchema() {
  if (burnSchemaEnsured) return;
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS diamond_burns (
      id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(36) NOT NULL,
      wallet_address VARCHAR(64) NOT NULL,
      purpose VARCHAR(32) NOT NULL,
      amount INTEGER NOT NULL,
      tx_hash VARCHAR(80) NOT NULL UNIQUE,
      request_id VARCHAR(80),
      payload_hash VARCHAR(64),
      status VARCHAR(16) NOT NULL DEFAULT 'reserved',
      response_text TEXT,
      lease_expires_at TIMESTAMP,
      output_started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(80);
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'reserved';
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS response_text TEXT;
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP;
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS output_started_at TIMESTAMP;
    ALTER TABLE diamond_burns
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    UPDATE diamond_burns
      SET status = 'completed',
          completed_at = COALESCE(completed_at, created_at)
      WHERE request_id IS NULL
        AND status = 'reserved';
    UPDATE diamond_burns
      SET lease_expires_at = created_at + INTERVAL '2 minutes'
      WHERE status = 'reserved'
        AND lease_expires_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS diamond_burns_request_id_unique
      ON diamond_burns (user_id, purpose, request_id)
      WHERE request_id IS NOT NULL;
    ALTER TABLE diamond_burns ENABLE ROW LEVEL SECURITY;
  `);
  burnSchemaEnsured = true;
}

export interface BurnRecordInput {
  userId: string;
  walletAddress: string;
  purpose: string;
  amount: number;
  txHash: string;
  requestId?: string;
  payloadHash?: string;
}

/**
 * Claim a verified burn for `purpose`. Returns false when the tx hash has
 * already been spent (the UNIQUE constraint rejects replays).
 */
export async function recordDiamondBurn(input: BurnRecordInput): Promise<boolean> {
  await ensureBurnLedgerSchema();
  try {
    await sqlQuery(
      `INSERT INTO diamond_burns
         (
           user_id,
           wallet_address,
           purpose,
           amount,
           tx_hash,
           request_id,
           payload_hash,
           lease_expires_at
         )
       VALUES
         (
           :userId,
           :walletAddress,
           :purpose,
           :amount,
           :txHash,
           :requestId,
           :payloadHash,
           CURRENT_TIMESTAMP + INTERVAL '2 minutes'
         )`,
      {
        userId: input.userId,
        walletAddress: input.walletAddress,
        purpose: input.purpose,
        amount: input.amount,
        txHash: input.txHash.toLowerCase(),
        requestId: input.requestId ?? null,
        payloadHash: input.payloadHash ?? null,
      },
    );
    return true;
  } catch (err: any) {
    if (err?.code === '23505') return false;
    throw err;
  }
}

export interface DiamondBurnResult {
  txHash: string;
  requestId: string | null;
  payloadHash: string | null;
  status: 'reserved' | 'output_started' | 'completed';
  responseText: string | null;
  createdAt: string;
  leaseExpiresAt: string | null;
}

/**
 * Resolve a previously claimed burn for an idempotent retry. The lookup is
 * scoped to the authenticated user and purpose so a client cannot replay
 * another member's receipt.
 */
export async function getDiamondBurnResult(
  txHash: string,
  userId: string,
  purpose: string,
): Promise<DiamondBurnResult | null> {
  await ensureBurnLedgerSchema();
  const rows = await sqlQuery<Array<{
    tx_hash: string;
    request_id: string | null;
    payload_hash: string | null;
    status: string;
    response_text: string | null;
    created_at: string | Date;
    lease_expires_at: string | Date | null;
  }>>(
    `SELECT
       tx_hash,
       request_id,
       payload_hash,
       status,
       response_text,
       created_at,
       lease_expires_at
     FROM diamond_burns
     WHERE tx_hash = :txHash
       AND user_id = :userId
       AND purpose = :purpose
     LIMIT 1`,
    {
      txHash: txHash.toLowerCase(),
      userId,
      purpose,
    },
  );
  const row = rows[0];
  if (!row) return null;
  return {
    txHash: row.tx_hash,
    requestId: row.request_id,
    payloadHash: row.payload_hash,
    status: row.status === 'completed'
      ? 'completed'
      : row.status === 'output_started'
        ? 'output_started'
        : 'reserved',
    responseText: row.response_text,
    createdAt: new Date(row.created_at).toISOString(),
    leaseExpiresAt: row.lease_expires_at
      ? new Date(row.lease_expires_at).toISOString()
      : null,
  };
}

/**
 * Consume a reservation before its first assistant delta leaves the server.
 * The stored prefix gives a retry something safe to replay if the invocation
 * freezes immediately after this write.
 */
export async function markDiamondBurnOutputStarted(
  txHash: string,
  userId: string,
  requestId: string,
  payloadHash: string,
  responsePrefix: string,
): Promise<boolean> {
  await ensureBurnLedgerSchema();
  const rows = await sqlQuery<Array<{ tx_hash: string }>>(
    `UPDATE diamond_burns
     SET status = 'output_started',
         response_text = :responsePrefix,
         lease_expires_at = NULL,
         output_started_at = COALESCE(output_started_at, CURRENT_TIMESTAMP)
     WHERE tx_hash = :txHash
       AND user_id = :userId
       AND request_id = :requestId
       AND payload_hash = :payloadHash
       AND status = 'reserved'
     RETURNING tx_hash`,
    {
      txHash: txHash.toLowerCase(),
      userId,
      requestId,
      payloadHash,
      responsePrefix,
    },
  );
  return Boolean(rows[0]);
}

/**
 * Atomically reclaim a reservation after its generation lease expires. This
 * lets a crashed request retry while preventing two live requests from
 * generating against the same paid receipt.
 */
export async function reclaimDiamondBurnReservation(
  txHash: string,
  userId: string,
  requestId: string,
  payloadHash: string,
): Promise<boolean> {
  await ensureBurnLedgerSchema();
  const rows = await sqlQuery<Array<{ tx_hash: string }>>(
    `UPDATE diamond_burns
     SET lease_expires_at = CURRENT_TIMESTAMP + INTERVAL '2 minutes'
     WHERE tx_hash = :txHash
       AND user_id = :userId
       AND request_id = :requestId
       AND payload_hash = :payloadHash
       AND status = 'reserved'
       AND (
         lease_expires_at IS NULL
         OR lease_expires_at <= CURRENT_TIMESTAMP
       )
     RETURNING tx_hash`,
    {
      txHash: txHash.toLowerCase(),
      userId,
      requestId,
      payloadHash,
    },
  );
  return Boolean(rows[0]);
}

/** Persist the paid result before the response is considered complete. */
export async function completeDiamondBurn(
  txHash: string,
  userId: string,
  requestId: string,
  payloadHash: string,
  responseText: string,
): Promise<void> {
  await ensureBurnLedgerSchema();
  await sqlQuery(
    `UPDATE diamond_burns
     SET status = 'completed',
         response_text = :responseText,
         lease_expires_at = NULL,
         completed_at = CURRENT_TIMESTAMP
     WHERE tx_hash = :txHash
       AND user_id = :userId
       AND request_id = :requestId
       AND payload_hash = :payloadHash`,
    {
      txHash: txHash.toLowerCase(),
      userId,
      requestId,
      payloadHash,
      responseText,
    },
  );
}

/**
 * Release a reserved burn so the same tx can be retried — only for spends
 * where the paid-for action failed after the burn was claimed.
 */
export async function releaseDiamondBurn(txHash: string, userId: string): Promise<void> {
  await sqlQuery(
    `DELETE FROM diamond_burns
     WHERE tx_hash = :txHash
       AND user_id = :userId
       AND status = 'reserved'`,
    { txHash: txHash.toLowerCase(), userId },
  );
}
