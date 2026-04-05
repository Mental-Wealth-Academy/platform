-- Migration: Enable RLS on all public tables
-- Fixes 7 Supabase Security Advisor errors: "RLS Disabled in Public"
--
-- NOTE: The app uses a service-role connection (bypasses RLS).
-- These policies are defense-in-depth for direct/anon-key access.

-- =============================================================
-- 1. proposal_reviews — public read, service-role write
-- =============================================================
ALTER TABLE public.proposal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read proposal reviews"
  ON public.proposal_reviews FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert proposal reviews"
  ON public.proposal_reviews FOR INSERT
  WITH CHECK (false);  -- only service role (bypasses RLS)

CREATE POLICY "Service role can update proposal reviews"
  ON public.proposal_reviews FOR UPDATE
  USING (false);

-- =============================================================
-- 2. proposal_transactions — owner read, service-role write
-- =============================================================
ALTER TABLE public.proposal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own proposal transactions"
  ON public.proposal_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_transactions.proposal_id
        AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Service role can insert proposal transactions"
  ON public.proposal_transactions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Service role can update proposal transactions"
  ON public.proposal_transactions FOR UPDATE
  USING (false);

-- =============================================================
-- 3. proposals — public read, owner insert, service-role update
-- =============================================================
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read proposals"
  ON public.proposals FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Service role can update proposals"
  ON public.proposals FOR UPDATE
  USING (false);  -- only service role (bypasses RLS)
