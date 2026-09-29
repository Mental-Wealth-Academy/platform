-- Create god_jar_entries for anonymous surrender/prayer submissions to the Ethereal Horizon

CREATE TABLE IF NOT EXISTS god_jar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_god_jar_entries_created_at ON god_jar_entries (created_at DESC);

-- Enable RLS
ALTER TABLE god_jar_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (users placing burdens into the jar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'god_jar_entries' AND policyname = 'Allow anonymous inserts to god_jar_entries'
  ) THEN
    CREATE POLICY "Allow anonymous inserts to god_jar_entries"
      ON god_jar_entries
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
