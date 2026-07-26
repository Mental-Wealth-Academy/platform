CREATE TABLE IF NOT EXISTS public.shop_fiat_purchases (
  id                CHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id           VARCHAR(36)  NOT NULL,
  item_id           VARCHAR(64)  NOT NULL,
  amount_cents      INTEGER      NOT NULL,
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.shop_fiat_purchases ENABLE ROW LEVEL SECURITY;

-- Purchased items are queried and inserted via server-side API routes and webhooks using service-role DB connections.
