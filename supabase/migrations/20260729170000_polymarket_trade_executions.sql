CREATE TABLE IF NOT EXISTS public.polymarket_trade_executions (
  request_id      VARCHAR(64)  PRIMARY KEY,
  target_key      VARCHAR(255) NOT NULL UNIQUE,
  user_id         VARCHAR(64)  NOT NULL,
  status          VARCHAR(16)  NOT NULL
                  CHECK (status IN ('pending', 'submitted', 'failed')),
  plan            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  response        JSONB,
  order_id        VARCHAR(255) UNIQUE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.polymarket_trade_executions ENABLE ROW LEVEL SECURITY;

-- Execution records are server-only. The target_key uniqueness constraint
-- prevents a second live order for the same configured market and outcome.
