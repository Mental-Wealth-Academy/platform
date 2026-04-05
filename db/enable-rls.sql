-- ============================================================================
-- Enable Row Level Security (RLS) on all public tables
-- ============================================================================
-- This SQL script enables RLS on all tables to improve security
-- Run this in Supabase SQL Editor after creating your schema
-- ============================================================================

-- Enable RLS on Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on User Avatars table
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Forum Categories table
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Forum Threads table
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Forum Posts table
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Quest Completions table
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on X Accounts table
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on X OAuth States table
ALTER TABLE x_oauth_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. Since you're using a service role connection string (direct PostgreSQL),
--    RLS policies don't apply to your API - the service role bypasses RLS
--
-- 2. RLS is still important for:
--    - Direct database access (if you allow it)
--    - Future Supabase client-side queries
--    - Defense in depth security
--
-- 3. If you want to add policies (optional), you can create policies like:
--
--    -- Example: Allow service role to do everything
--    CREATE POLICY "Service role can do everything" ON users
--      FOR ALL USING (auth.role() = 'service_role');
--
--    But this is not necessary if you're only using service role connections
--
-- 4. The Security Advisor warnings should disappear after running this script
-- ============================================================================
