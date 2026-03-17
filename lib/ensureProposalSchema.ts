import { sqlQuery } from './db';

let schemaEnsured = false;

export async function ensureProposalSchema() {
  if (schemaEnsured) return;

  try {
    // Proposals table
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS proposals (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        proposal_markdown TEXT NOT NULL,
        recipient_address VARCHAR(255) NULL,
        token_amount VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT valid_status CHECK (status IN ('pending_review', 'approved', 'rejected', 'active', 'completed', 'expired', 'on_chain_pending', 'on_chain_active', 'executed'))
      )
    `);

    // Add recipient_address and usdc_amount columns if they don't exist
    try {
      await sqlQuery(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS recipient_address VARCHAR(255) NULL`);
    } catch (e: any) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Warning: Could not add recipient_address column:', e.message);
      }
    }
    
    try {
      await sqlQuery(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS token_amount VARCHAR(255) NULL`);
    } catch (e: any) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Warning: Could not add token_amount column:', e.message);
      }
    }

    // Proposal reviews table
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS proposal_reviews (
        id CHAR(36) PRIMARY KEY,
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
      )
    `);

    // Add on-chain tracking columns if they don't exist (PostgreSQL 9.5+ supports IF NOT EXISTS)
    try {
      await sqlQuery(`ALTER TABLE proposal_reviews ADD COLUMN IF NOT EXISTS on_chain_proposal_id VARCHAR(50) NULL`);
    } catch (e: any) {
      // Column might already exist, ignore
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Warning: Could not add on_chain_proposal_id column:', e.message);
      }
    }
    
    try {
      await sqlQuery(`ALTER TABLE proposal_reviews ADD COLUMN IF NOT EXISTS on_chain_tx_hash VARCHAR(255) NULL`);
    } catch (e: any) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Warning: Could not add on_chain_tx_hash column:', e.message);
      }
    }
    
    try {
      await sqlQuery(`ALTER TABLE proposal_reviews ADD COLUMN IF NOT EXISTS on_chain_created_at TIMESTAMP NULL`);
    } catch (e: any) {
      if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
        console.warn('Warning: Could not add on_chain_created_at column:', e.message);
      }
    }

    // Add index for on-chain lookups if it doesn't exist
    try {
      await sqlQuery(`
        CREATE INDEX IF NOT EXISTS idx_proposal_reviews_onchain_id 
        ON proposal_reviews(on_chain_proposal_id) 
        WHERE on_chain_proposal_id IS NOT NULL
      `);
    } catch (e: any) {
      // Index might already exist, ignore
      if (!e.message?.includes('already exists')) {
        console.warn('Warning: Could not create on-chain index:', e.message);
      }
    }

    // Proposal transactions table
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS proposal_transactions (
        id CHAR(36) PRIMARY KEY,
        proposal_id CHAR(36) NOT NULL,
        transaction_hash VARCHAR(255) NULL,
        transaction_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        token_amount VARCHAR(255) NULL,
        gas_used VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP NULL,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
        CONSTRAINT valid_transaction_status CHECK (transaction_status IN ('pending', 'confirmed', 'failed'))
      )
    `);

    // Indexes
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposals_wallet_address ON proposals(wallet_address)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC)`);
    
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposal_reviews_proposal_id ON proposal_reviews(proposal_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposal_reviews_decision ON proposal_reviews(decision)`);
    
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposal_transactions_proposal_id ON proposal_transactions(proposal_id)`);
    await sqlQuery(`CREATE INDEX IF NOT EXISTS idx_proposal_transactions_status ON proposal_transactions(transaction_status)`);

    // Trigger for updated_at
    await sqlQuery(`
      DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals
    `);
    await sqlQuery(`
      CREATE TRIGGER update_proposals_updated_at 
        BEFORE UPDATE ON proposals
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);

    schemaEnsured = true;
    console.log('✅ Proposal schema ensured');
  } catch (error) {
    console.error('Error ensuring proposal schema:', error);
    throw error;
  }
}
