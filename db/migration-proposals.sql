-- ============================================================================
-- Voting Proposals System Migration
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Proposals table - Stores all user proposal submissions
CREATE TABLE IF NOT EXISTS proposals (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id CHAR(36) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  proposal_markdown TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('pending_review', 'approved', 'rejected', 'active', 'completed', 'expired', 'on_chain_pending', 'on_chain_active', 'executed'))
);

-- Proposal reviews table - Stores Blue's analysis and decisions
CREATE TABLE IF NOT EXISTS proposal_reviews (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id CHAR(36) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  reasoning TEXT NOT NULL,
  token_allocation_percentage INTEGER NULL,
  scores JSONB NULL,
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  UNIQUE (proposal_id),
  CONSTRAINT valid_decision CHECK (decision IN ('approved', 'rejected')),
  CONSTRAINT valid_token_allocation CHECK (
    (decision = 'approved' AND token_allocation_percentage BETWEEN 1 AND 40) OR
    (decision = 'rejected' AND token_allocation_percentage IS NULL)
  )
);

-- Proposal transactions table - Tracks blockchain transactions
CREATE TABLE IF NOT EXISTS proposal_transactions (
  id CHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id CHAR(36) NOT NULL,
  transaction_hash VARCHAR(255) NULL,
  transaction_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  token_amount VARCHAR(255) NULL,
  gas_used VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  CONSTRAINT valid_transaction_status CHECK (transaction_status IN ('pending', 'confirmed', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_wallet_address ON proposals(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_reviews_proposal_id ON proposal_reviews(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_reviews_decision ON proposal_reviews(decision);

CREATE INDEX IF NOT EXISTS idx_proposal_transactions_proposal_id ON proposal_transactions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_transactions_status ON proposal_transactions(transaction_status);

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at 
  BEFORE UPDATE ON proposals
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
