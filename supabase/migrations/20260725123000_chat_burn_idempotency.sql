CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS diamond_burns (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(64) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  amount INTEGER NOT NULL,
  tx_hash VARCHAR(80) NOT NULL UNIQUE,
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

-- Rows written before the reservation flow are settled spends: the burn is on
-- chain and the answer was delivered. They carry no request_id, so nothing can
-- reclaim them; recording them as completed keeps the ledger honest.
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
