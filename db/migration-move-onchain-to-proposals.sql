-- ============================================================================
-- Move On-Chain Fields to Proposals Table
-- ============================================================================
-- This migration moves on-chain tracking fields from proposal_reviews to proposals
-- and adds recipient address and token amount fields needed for on-chain creation
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Add on-chain proposal tracking to proposals table (where it belongs)
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS on_chain_proposal_id VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS on_chain_tx_hash VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS recipient_address VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS token_amount VARCHAR(50) NULL;

-- Migrate existing data from proposal_reviews to proposals
UPDATE proposals p
SET 
  on_chain_proposal_id = pr.on_chain_proposal_id,
  on_chain_tx_hash = pr.on_chain_tx_hash
FROM proposal_reviews pr
WHERE p.id = pr.proposal_id 
  AND pr.on_chain_proposal_id IS NOT NULL;

-- Add index for on-chain lookups on proposals table
CREATE INDEX IF NOT EXISTS idx_proposals_onchain_id 
ON proposals(on_chain_proposal_id) 
WHERE on_chain_proposal_id IS NOT NULL;

-- Add index for recipient address
CREATE INDEX IF NOT EXISTS idx_proposals_recipient_address 
ON proposals(recipient_address) 
WHERE recipient_address IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN proposals.on_chain_proposal_id IS 'The proposal ID on the smart contract (created when user submits)';
COMMENT ON COLUMN proposals.on_chain_tx_hash IS 'Transaction hash of the on-chain proposal creation (paid by user)';
COMMENT ON COLUMN proposals.recipient_address IS 'Ethereum address to receive USDC if proposal is approved';
COMMENT ON COLUMN proposals.token_amount IS 'Amount of USDC requested (in USDC, not wei)';

-- Add azura_review_tx_hash to proposal_reviews for tracking the agent's on-chain review.
-- (Column later renamed to blue_review_tx_hash; see migration-rename-azura-to-blue.sql.)
ALTER TABLE proposal_reviews
ADD COLUMN IF NOT EXISTS azura_review_tx_hash VARCHAR(255) NULL;

COMMENT ON COLUMN proposal_reviews.azura_review_tx_hash IS 'Transaction hash of the agent''s on-chain review.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Now proposals table contains:
-- - on_chain_proposal_id: Set when user creates proposal on-chain
-- - on_chain_tx_hash: User's transaction hash
-- - recipient_address: Where to send USDC if approved
-- - token_amount: How much USDC to send
--
-- And proposal_reviews contains:
-- - azura_review_tx_hash: agent's review transaction hash (later renamed to blue_review_tx_hash)
-- ============================================================================
