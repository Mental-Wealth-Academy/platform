-- Create practitioner_consultations for 1-on-1 Lead Practitioner sessions

CREATE TABLE IF NOT EXISTS practitioner_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT DEFAULT 'Academy Member',
  email TEXT DEFAULT 'in-app-message',
  contact TEXT DEFAULT 'in-app-message',
  focus_area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practitioner_consultations_created_at ON practitioner_consultations (created_at DESC);

-- Enable RLS
ALTER TABLE practitioner_consultations ENABLE ROW LEVEL SECURITY;

-- Allow inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'practitioner_consultations' AND policyname = 'Allow inserts to practitioner_consultations'
  ) THEN
    CREATE POLICY "Allow inserts to practitioner_consultations"
      ON practitioner_consultations
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
