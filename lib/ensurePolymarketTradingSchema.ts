import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaPolymarketTradingSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaPolymarketTradingSchemaLock: Promise<void> | undefined;
}

export async function ensurePolymarketTradingSchema() {
  if (globalThis.__mwaPolymarketTradingSchemaEnsured) return;
  if (globalThis.__mwaPolymarketTradingSchemaLock) {
    await globalThis.__mwaPolymarketTradingSchemaLock;
    return;
  }

  const lock = (async () => {
    try {
      await sqlQuery(
        `CREATE TABLE IF NOT EXISTS polymarket_trade_executions (
          request_id VARCHAR(64) PRIMARY KEY,
          target_key VARCHAR(255) NOT NULL UNIQUE,
          user_id VARCHAR(64) NOT NULL,
          status VARCHAR(16) NOT NULL
            CHECK (status IN ('pending', 'submitted', 'failed')),
          plan JSONB NOT NULL DEFAULT '{}'::jsonb,
          response JSONB,
          order_id VARCHAR(255) UNIQUE,
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
        {},
      );
      globalThis.__mwaPolymarketTradingSchemaEnsured = true;
    } finally {
      globalThis.__mwaPolymarketTradingSchemaLock = undefined;
    }
  })();

  globalThis.__mwaPolymarketTradingSchemaLock = lock;
  await lock;
}
