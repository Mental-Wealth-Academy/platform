-- ============================================================================
-- Rename azura_review_tx_hash → blue_review_tx_hash
-- ============================================================================
-- Aligns the column name with the Blue agent rename across the codebase.
-- Idempotent: only renames if the old column exists and the new one does not.
-- Run this in Supabase SQL Editor.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_reviews'
      AND column_name = 'azura_review_tx_hash'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_reviews'
      AND column_name = 'blue_review_tx_hash'
  ) THEN
    EXECUTE 'ALTER TABLE proposal_reviews RENAME COLUMN azura_review_tx_hash TO blue_review_tx_hash';
  END IF;
END $$;

COMMENT ON COLUMN proposal_reviews.blue_review_tx_hash IS 'Transaction hash of Blue''s on-chain review.';
