import { sqlQuery } from './db';
import { ensurePolymarketTradingSchema } from './ensurePolymarketTradingSchema';

export interface PolymarketTradeLedgerRow {
  request_id: string;
  target_key: string;
  user_id: string;
  status: 'pending' | 'submitted' | 'failed';
  plan: unknown;
  response: unknown;
  order_id: string | null;
  error_message: string | null;
}

export async function claimPolymarketTrade(input: {
  requestId: string;
  targetKey: string;
  userId: string;
  plan: unknown;
}): Promise<{ claimed: boolean; row: PolymarketTradeLedgerRow }> {
  await ensurePolymarketTradingSchema();
  const inserted = await sqlQuery<PolymarketTradeLedgerRow[]>(
    `INSERT INTO polymarket_trade_executions (
       request_id, target_key, user_id, status, plan
     ) VALUES (
       :requestId, :targetKey, :userId, 'pending', :plan::jsonb
     )
     ON CONFLICT DO NOTHING
     RETURNING request_id, target_key, user_id, status, plan, response,
               order_id, error_message`,
    {
      requestId: input.requestId.slice(0, 64),
      targetKey: input.targetKey.slice(0, 255),
      userId: input.userId.slice(0, 64),
      plan: JSON.stringify(input.plan),
    },
  );
  if (inserted[0]) return { claimed: true, row: inserted[0] };

  const existing = await sqlQuery<PolymarketTradeLedgerRow[]>(
    `SELECT request_id, target_key, user_id, status, plan, response,
            order_id, error_message
     FROM polymarket_trade_executions
     WHERE request_id = :requestId OR target_key = :targetKey
     ORDER BY CASE WHEN request_id = :requestId THEN 0 ELSE 1 END
     LIMIT 1`,
    {
      requestId: input.requestId.slice(0, 64),
      targetKey: input.targetKey.slice(0, 255),
    },
  );
  if (!existing[0]) {
    throw new Error('The trade ledger could not claim or recover this request.');
  }
  return { claimed: false, row: existing[0] };
}

export async function completePolymarketTrade(input: {
  requestId: string;
  orderId: string;
  response: unknown;
}): Promise<void> {
  const rows = await sqlQuery<{ request_id: string }[]>(
    `UPDATE polymarket_trade_executions
     SET status = 'submitted',
         order_id = :orderId,
         response = :response::jsonb,
         updated_at = now()
     WHERE request_id = :requestId
       AND status = 'pending'
     RETURNING request_id`,
    {
      requestId: input.requestId.slice(0, 64),
      orderId: input.orderId.slice(0, 255),
      response: JSON.stringify(input.response),
    },
  );
  if (!rows[0]) {
    throw new Error('The trade ledger did not accept the execution receipt.');
  }
}

export async function failPolymarketTrade(
  requestId: string,
  errorMessage: string,
): Promise<void> {
  await sqlQuery(
    `UPDATE polymarket_trade_executions
     SET status = 'failed',
         error_message = :errorMessage,
         updated_at = now()
     WHERE request_id = :requestId
       AND status = 'pending'`,
    {
      requestId: requestId.slice(0, 64),
      errorMessage: errorMessage.slice(0, 2_000),
    },
  );
}
