-- ============================================================================
-- Row Level Security (RLS) Policies for Supabase
-- ============================================================================
-- Run this in Supabase SQL Editor if you use Supabase Auth (JWT) or client-side
-- access. With a direct postgres connection (service role), RLS is bypassed.
-- These policies allow full access only for the service_role (backend).
-- ============================================================================

-- Users
CREATE POLICY "Service role full access on users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_avatars
CREATE POLICY "Service role full access on user_avatars" ON user_avatars
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- sessions
CREATE POLICY "Service role full access on sessions" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- forum_categories
CREATE POLICY "Service role full access on forum_categories" ON forum_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- forum_threads
CREATE POLICY "Service role full access on forum_threads" ON forum_threads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- forum_posts
CREATE POLICY "Service role full access on forum_posts" ON forum_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- quest_completions
CREATE POLICY "Service role full access on quest_completions" ON quest_completions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- x_accounts
CREATE POLICY "Service role full access on x_accounts" ON x_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- x_oauth_states
CREATE POLICY "Service role full access on x_oauth_states" ON x_oauth_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Proposals tables (run after migration-proposals.sql)
-- CREATE POLICY "Service role full access on proposals" ON proposals
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "Service role full access on proposal_reviews" ON proposal_reviews
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "Service role full access on proposal_transactions" ON proposal_transactions
--   FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Events tables (run after migration-events.sql)
-- CREATE POLICY "Service role full access on events" ON events
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "Service role full access on event_reservations" ON event_reservations
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
