-- ============================================================================
-- Seed: starter guide DAG on mental-wealth foundations
-- ============================================================================
-- Run AFTER db/migration-guides.sql. Idempotent: uses stable slugs and
-- ON CONFLICT DO NOTHING so re-running does not duplicate rows.
--
-- Shape of the DAG (prereq → guide), 3 levels deep, 7 published guides:
--
--   Level 0 (primitives, no prereqs):
--     attention-basics
--     emotional-vocabulary
--
--   Level 1:
--     journaling-practice     (needs emotional-vocabulary)
--     cognitive-reframing     (needs attention-basics, emotional-vocabulary)
--     mindful-breathing       (needs attention-basics)
--
--   Level 2:
--     building-a-daily-practice (needs journaling-practice, mindful-breathing)
--     values-clarification      (needs cognitive-reframing, journaling-practice)
--
-- body JSONB is an array of components matching the course_components renderer
-- format ({ id, componentType, title, config }), only 'rich_text' is used here
-- so the guide page renders cleanly with components/course-renderers.
-- Does NOT reference or modify shadow-work.
-- ============================================================================

-- ── Guides ──────────────────────────────────────────────────────────────────
INSERT INTO guides (slug, topic_title, status, body) VALUES
(
  'attention-basics',
  'Attention Basics',
  'published',
  '[
    {"id":"ab-1","componentType":"rich_text","title":"What attention is",
     "config":{"format":"markdown","content":"# Attention Basics\n\nAttention is the mental spotlight you point at one thing while letting the rest fade. Everything else in mental wealth is downstream of being able to notice where that spotlight is pointing.\n\n## Why it comes first\n\n- You cannot regulate what you never notice.\n- You cannot reflect on a feeling you did not catch.\n- Every later skill assumes you can hold focus for a minute or two.\n\n## A 60-second drill\n\nSit, pick one sensation (your breath, your feet on the floor), and rest your attention there. When it wanders, note it and return. That return IS the rep."}}
  ]'::jsonb
),
(
  'emotional-vocabulary',
  'Emotional Vocabulary',
  'published',
  '[
    {"id":"ev-1","componentType":"rich_text","title":"Naming what you feel",
     "config":{"format":"markdown","content":"# Emotional Vocabulary\n\nYou can only work with feelings you can name. ''Bad'' and ''stressed'' are low-resolution. Precision gives you leverage.\n\n## Widen your palette\n\n- Instead of ''bad'': disappointed, ashamed, resentful, drained.\n- Instead of ''good'': relieved, proud, curious, calm.\n\n## The practice\n\nOnce a day, catch one feeling and give it the most specific name you can. Accuracy beats intensity."}}
  ]'::jsonb
),
(
  'journaling-practice',
  'Journaling Practice',
  'published',
  '[
    {"id":"jp-1","componentType":"rich_text","title":"Getting it on the page",
     "config":{"format":"markdown","content":"# Journaling Practice\n\nJournaling externalizes the loop running in your head so you can look at it instead of being inside it. It builds directly on being able to name feelings.\n\n## A simple format\n\n- What happened (facts only).\n- What I felt (use your emotional vocabulary).\n- What I made it mean.\n\n## Keep it low-stakes\n\nThree lines counts. Consistency matters more than length."}}
  ]'::jsonb
),
(
  'cognitive-reframing',
  'Cognitive Reframing',
  'published',
  '[
    {"id":"cr-1","componentType":"rich_text","title":"Catching and re-testing thoughts",
     "config":{"format":"markdown","content":"# Cognitive Reframing\n\nReframing is noticing an automatic thought and asking whether it is actually true. It needs attention (to catch the thought) and emotional vocabulary (to see what it is doing to you).\n\n## The move\n\n1. Catch the thought: ''I always mess this up.''\n2. Name the distortion: over-generalization.\n3. Write a fairer version: ''I struggled this time; here is one thing I would change.''\n\nYou are not forcing positivity, you are restoring accuracy."}}
  ]'::jsonb
),
(
  'mindful-breathing',
  'Mindful Breathing',
  'published',
  '[
    {"id":"mb-1","componentType":"rich_text","title":"Using the breath as an anchor",
     "config":{"format":"markdown","content":"# Mindful Breathing\n\nThe breath is a portable anchor for attention. This guide turns the raw skill of focusing into something you can do to settle your nervous system on demand.\n\n## Box breathing\n\nInhale 4, hold 4, exhale 4, hold 4. Repeat for a minute. When your mind drifts, that is expected, return to the count."}}
  ]'::jsonb
),
(
  'building-a-daily-practice',
  'Building a Daily Practice',
  'published',
  '[
    {"id":"bdp-1","componentType":"rich_text","title":"Stacking small habits",
     "config":{"format":"markdown","content":"# Building a Daily Practice\n\nA daily practice is how the earlier skills stop being exercises and become defaults. It assumes you already journal and can settle yourself with the breath.\n\n## Design your stack\n\n- Anchor to something you already do (after coffee, before bed).\n- Start absurdly small: one breath drill + three journal lines.\n- Track completion, not perfection.\n\n## The point\n\nMomentum compounds. A tiny practice you keep beats a big one you abandon."}}
  ]'::jsonb
),
(
  'values-clarification',
  'Values Clarification',
  'published',
  '[
    {"id":"vc-1","componentType":"rich_text","title":"Deciding what matters",
     "config":{"format":"markdown","content":"# Values Clarification\n\nValues turn reflection into direction. Once you can reframe thoughts and journal honestly, you can ask the bigger question: what am I actually optimizing for?\n\n## An exercise\n\nList five things you would defend even when they cost you. Rank them. Where does your calendar disagree with your ranking?\n\nThat gap is your work."}}
  ]'::jsonb
),
(
  'morning-flow',
  'Morning Flow',
  'published',
  '[
    {"id":"mf-1","componentType":"rich_text","title":"Morning Flow","config":{"format":"markdown","content":"Morning movement wakes up your spine and signals to your body that it is safe to start the day. You do not need flexibility or special equipment. Moving gently right after waking unglues stiff muscles and brings fresh oxygen into your brain."}},
    {"id":"mf-2","componentType":"rich_text","title":"The Practice","config":{"format":"markdown","content":"![Blue in Morning Flow](/images/yoga/blue-morning-flow.png)\n\nFollow this simple five-minute sequence:\n\n1. Stand tall with your feet shoulder-width apart. Feel the floor beneath you.\n2. Inhale slowly and raise both arms overhead. Interlace your fingers and reach gently toward the sky.\n3. Lengthen your spine. Keep your shoulders soft and away from your ears.\n4. Take three slow breaths here. Feel your ribcage expand on each inhale.\n5. Exhale and sweep your arms down to your sides. Roll your shoulders back twice."}},
    {"id":"mf-3","componentType":"rich_text","title":"Daily Cue","config":{"format":"markdown","content":"Do this stretch next to your bed before looking at your phone. One steady minute of gentle movement sets your posture and focus for the entire morning."}}
  ]'::jsonb
),
(
  'somatic-release',
  'Somatic Release',
  'published',
  '[
    {"id":"sr-1","componentType":"rich_text","title":"Somatic Release","config":{"format":"markdown","content":"Stress is physical before it is mental. Your body tightens around tension in your jaw, shoulders, and hips. Somatic release uses quiet, low-effort floor positions to give your nervous system permission to drop out of high alert."}},
    {"id":"sr-2","componentType":"rich_text","title":"The Practice","config":{"format":"markdown","content":"![Blue in Somatic Release](/images/yoga/blue-somatic-release.png)\n\nFollow these three grounding steps:\n\n1. Sit comfortably on the floor or a firm cushion with crossed legs. Keep your back tall and relaxed.\n2. Rest your hands gently on your knees with palms facing upward.\n3. Close your eyes. Drop your tongue from the roof of your mouth and unclench your jaw.\n4. Inhale through your nose for four counts. Feel your belly rise.\n5. Exhale slowly through your mouth for six counts. Imagine tension draining down into the ground."}},
    {"id":"sr-3","componentType":"rich_text","title":"Daily Cue","config":{"format":"markdown","content":"Spend three minutes in this position whenever you feel overwhelmed, or before you go to sleep. Long exhales turn down adrenaline and help your muscles release."}}
  ]'::jsonb
),
(
  'breath-and-posture',
  'Breath & Posture',
  'published',
  '[
    {"id":"bp-1","componentType":"rich_text","title":"Breath & Posture","config":{"format":"markdown","content":"How you hold your body changes how you breathe, and how you breathe changes how you think. Slumping compresses your diaphragm and keeps your breath shallow. Stacking your bones upright lets your lungs fill with zero extra effort."}},
    {"id":"bp-2","componentType":"rich_text","title":"The Practice","config":{"format":"markdown","content":"![Blue in Breath and Posture](/images/yoga/blue-breath-posture.png)\n\nUse this check to find your neutral alignment:\n\n1. Stand with your feet flat and balanced between toes and heels.\n2. Bring your hands together at the center of your chest in a light prayer position.\n3. Line up your ears over your shoulders, and your shoulders over your hips.\n4. Inhale deeply through your nose. Expand your ribs outward in all directions like a balloon.\n5. Exhale softly and feel your chest stay tall while your shoulder blades slide down your back."}},
    {"id":"bp-3","componentType":"rich_text","title":"Daily Cue","config":{"format":"markdown","content":"Reset this posture whenever you stand up from your chair or before starting a focused task. A tall spine creates immediate breathing space for your lungs."}}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ── Subjects ────────────────────────────────────────────────────────────────
INSERT INTO guide_subjects (guide_id, subject)
SELECT g.id, s.subject
FROM guides g
JOIN (VALUES
  ('attention-basics',          'Foundations'),
  ('attention-basics',          'Focus'),
  ('emotional-vocabulary',      'Foundations'),
  ('emotional-vocabulary',      'Emotional Regulation'),
  ('journaling-practice',       'Reflection'),
  ('journaling-practice',       'Emotional Regulation'),
  ('cognitive-reframing',       'Emotional Regulation'),
  ('mindful-breathing',         'Focus'),
  ('mindful-breathing',         'Foundations'),
  ('building-a-daily-practice', 'Habits'),
  ('values-clarification',      'Reflection'),
  ('values-clarification',      'Habits'),
  ('morning-flow',              'Movement'),
  ('morning-flow',              'Foundations'),
  ('somatic-release',           'Recovery'),
  ('somatic-release',           'Foundations'),
  ('breath-and-posture',        'Alignment'),
  ('breath-and-posture',        'Foundations')
) AS s(slug, subject) ON s.slug = g.slug
ON CONFLICT (guide_id, subject) DO NOTHING;

-- ── Methods (nested inside a definitive guide) ──────────────────────────────
INSERT INTO guide_methods (parent_guide_id, title, sort_order, body)
SELECT g.id, m.title, m.sort_order, m.body::jsonb
FROM guides g
JOIN (VALUES
  ('building-a-daily-practice', 'The two-minute floor', 0,
   '[{"id":"m-2min","componentType":"rich_text","title":"","config":{"format":"markdown","content":"Set a floor so low you cannot fail: two minutes. On bad days you hit the floor and still keep the streak."}}]'),
  ('building-a-daily-practice', 'Habit stacking', 1,
   '[{"id":"m-stack","componentType":"rich_text","title":"","config":{"format":"markdown","content":"Attach the new practice to an existing anchor: ''After I pour my coffee, I do one breath drill.''"}}]'),
  ('journaling-practice', 'The three-line entry', 0,
   '[{"id":"m-3line","componentType":"rich_text","title":"","config":{"format":"markdown","content":"Facts, feeling, meaning, one line each. Enough to get the loop onto the page."}}]')
) AS m(slug, title, sort_order, body) ON m.slug = g.slug;

-- ── Edges (prereq -> guide). Trigger enforces acyclicity. ───────────────────
INSERT INTO guide_edges (prereq_id, guide_id)
SELECT p.id, c.id
FROM (VALUES
  ('emotional-vocabulary',  'journaling-practice'),
  ('attention-basics',      'cognitive-reframing'),
  ('emotional-vocabulary',  'cognitive-reframing'),
  ('attention-basics',      'mindful-breathing'),
  ('journaling-practice',   'building-a-daily-practice'),
  ('mindful-breathing',     'building-a-daily-practice'),
  ('cognitive-reframing',   'values-clarification'),
  ('journaling-practice',   'values-clarification')
) AS e(prereq_slug, guide_slug)
JOIN guides p ON p.slug = e.prereq_slug
JOIN guides c ON c.slug = e.guide_slug
ON CONFLICT (prereq_id, guide_id) DO NOTHING;

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================
