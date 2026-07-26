import { sqlQuery } from './db';

declare global {
  // eslint-disable-next-line no-var
  var __mwaShopFiatPurchasesSchemaEnsured: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mwaShopFiatPurchasesSchemaLock: Promise<void> | undefined;
}

export async function ensureShopFiatPurchasesSchema() {
  if (globalThis.__mwaShopFiatPurchasesSchemaEnsured) return;

  if (globalThis.__mwaShopFiatPurchasesSchemaLock) {
    await globalThis.__mwaShopFiatPurchasesSchemaLock;
    return;
  }

  const lockPromise = (async () => {
    try {
      await sqlQuery(
        `CREATE TABLE IF NOT EXISTS shop_fiat_purchases (
          id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id VARCHAR(36) NOT NULL,
          item_id VARCHAR(64) NOT NULL,
          amount_cents INTEGER NOT NULL,
          stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        {}
      );
      globalThis.__mwaShopFiatPurchasesSchemaEnsured = true;
    } finally {
      globalThis.__mwaShopFiatPurchasesSchemaLock = undefined;
    }
  })();

  globalThis.__mwaShopFiatPurchasesSchemaLock = lockPromise;
  await lockPromise;
}
