BEGIN;

-- Blue's memory tables were historically created lazily by
-- ensureBlueMemorySchema(). Define them here as well so a fresh environment can
-- apply this migration without depending on an application request running
-- first. CREATE TABLE IF NOT EXISTS preserves existing production data.
CREATE TABLE IF NOT EXISTS public.blue_chat_messages (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  text TEXT NOT NULL,
  request_id VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.blue_memory_facts (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL,
  summary TEXT NOT NULL,
  canonical_key VARCHAR(160),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  source_message_id CHAR(36)
    REFERENCES public.blue_chat_messages(id) ON DELETE SET NULL,
  evidence_text VARCHAR(240),
  source_type VARCHAR(32) NOT NULL DEFAULT 'user_statement',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  superseded_at TIMESTAMP,
  superseded_by_id CHAR(36)
    REFERENCES public.blue_memory_facts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category, summary)
);

CREATE TABLE IF NOT EXISTS public.blue_relationship_state (
  user_id CHAR(36) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  first_interaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_interaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_user_message TEXT,
  last_blue_response TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.blue_chat_messages
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blue_chat_messages_user_request_role
  ON public.blue_chat_messages(user_id, request_id, role)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blue_chat_messages_user_created
  ON public.blue_chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blue_chat_messages_created
  ON public.blue_chat_messages(created_at);

ALTER TABLE public.blue_memory_facts
  ADD COLUMN IF NOT EXISTS canonical_key VARCHAR(160);
ALTER TABLE public.blue_memory_facts
  ADD COLUMN IF NOT EXISTS evidence_text VARCHAR(240);
ALTER TABLE public.blue_memory_facts
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'user_statement';
ALTER TABLE public.blue_memory_facts
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP;
ALTER TABLE public.blue_memory_facts
  ADD COLUMN IF NOT EXISTS superseded_by_id CHAR(36);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blue_memory_facts_superseded_by_id_fkey'
      AND conrelid = 'public.blue_memory_facts'::regclass
  ) THEN
    ALTER TABLE public.blue_memory_facts
      ADD CONSTRAINT blue_memory_facts_superseded_by_id_fkey
      FOREIGN KEY (superseded_by_id)
      REFERENCES public.blue_memory_facts(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blue_memory_facts_user_canonical
  ON public.blue_memory_facts(user_id, category, canonical_key)
  WHERE canonical_key IS NOT NULL AND superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_updated
  ON public.blue_memory_facts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_category
  ON public.blue_memory_facts(user_id, category);

CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_user_event_key
  ON public.blue_memory_facts(user_id, (metadata->>'eventKey'));

CREATE INDEX IF NOT EXISTS idx_blue_memory_facts_updated
  ON public.blue_memory_facts(updated_at);

CREATE TABLE IF NOT EXISTS public.blue_memory_outbox (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_id VARCHAR(80) NOT NULL,
  user_message_id CHAR(36) NOT NULL
    REFERENCES public.blue_chat_messages(id) ON DELETE CASCADE,
  assistant_message_id CHAR(36) NOT NULL
    REFERENCES public.blue_chat_messages(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_error VARCHAR(240),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_blue_memory_outbox_pending
  ON public.blue_memory_outbox(status, available_at, created_at)
  WHERE status <> 'completed';

CREATE INDEX IF NOT EXISTS idx_blue_memory_outbox_completed
  ON public.blue_memory_outbox(completed_at)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_blue_relationship_state_last_interaction
  ON public.blue_relationship_state(last_interaction_at);

ALTER TABLE public.blue_memory_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blue_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blue_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blue_relationship_state ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_blue_memory_facts_updated_at
  ON public.blue_memory_facts;
CREATE TRIGGER update_blue_memory_facts_updated_at
  BEFORE UPDATE ON public.blue_memory_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blue_relationship_state_updated_at
  ON public.blue_relationship_state;
CREATE TRIGGER update_blue_relationship_state_updated_at
  BEFORE UPDATE ON public.blue_relationship_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blue_memory_outbox_updated_at
  ON public.blue_memory_outbox;
CREATE TRIGGER update_blue_memory_outbox_updated_at
  BEFORE UPDATE ON public.blue_memory_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
