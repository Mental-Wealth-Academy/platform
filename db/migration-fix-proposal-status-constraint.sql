-- ============================================================================
-- Fix proposals.status CHECK constraint to include all statuses used by the app
-- Run this in Supabase SQL Editor if the database was created with the old constraint
-- ============================================================================

-- Drop the old constraint and add the expanded one
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE proposals ADD CONSTRAINT valid_status CHECK (
  status IN (
    'pending_review',
    'approved',
    'rejected',
    'active',
    'completed',
    'expired',
    'on_chain_pending',
    'on_chain_active',
    'executed'
  )
);
