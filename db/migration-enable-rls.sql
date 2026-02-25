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
-- 3. library_chapters — public read, admin-only write
-- =============================================================
ALTER TABLE public.library_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read library chapters"
  ON public.library_chapters FOR SELECT
  USING (true);

CREATE POLICY "Admin-only insert library chapters"
  ON public.library_chapters FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Admin-only update library chapters"
  ON public.library_chapters FOR UPDATE
  USING (false);

CREATE POLICY "Admin-only delete library chapters"
  ON public.library_chapters FOR DELETE
  USING (false);

-- =============================================================
-- 4. library_prompts — public read, admin-only write
-- =============================================================
ALTER TABLE public.library_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read library prompts"
  ON public.library_prompts FOR SELECT
  USING (true);

CREATE POLICY "Admin-only insert library prompts"
  ON public.library_prompts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Admin-only update library prompts"
  ON public.library_prompts FOR UPDATE
  USING (false);

CREATE POLICY "Admin-only delete library prompts"
  ON public.library_prompts FOR DELETE
  USING (false);

-- =============================================================
-- 5. user_chapter_progress — owner-only access
-- =============================================================
ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chapter progress"
  ON public.user_chapter_progress FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own chapter progress"
  ON public.user_chapter_progress FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own chapter progress"
  ON public.user_chapter_progress FOR UPDATE
  USING (user_id = auth.uid()::text);

-- =============================================================
-- 6. user_writings — owner-only access
-- =============================================================
ALTER TABLE public.user_writings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own writings"
  ON public.user_writings FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own writings"
  ON public.user_writings FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- =============================================================
-- 7. proposals — public read, owner insert, service-role update
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
