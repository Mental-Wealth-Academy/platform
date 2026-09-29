-- ============================================================================
-- Yoga DAG Guides: Morning Flow, Somatic Release, Breath & Posture
-- ============================================================================
-- Adds 3 published foundation guides for physical wellness, mindful movement,
-- and somatic regulation to the guides DAG. Each guide features concise instructions
-- and full-body illustrations of Blue in corresponding yoga postures.
--
-- Invariants maintained:
-- - Unique topic_title per guide
-- - Status is 'published'
-- - Level is computed (no level column)
-- - Deduplication via ON CONFLICT
-- ============================================================================

INSERT INTO guides (slug, topic_title, summary, status, body, evidence_criteria)
VALUES
(
  'morning-flow',
  'Morning Flow',
  'A five-minute morning movement sequence to lengthen your spine, open your breath, and wake up your nervous system.',
  'published',
  '[
    {
      "id": "mf-1",
      "componentType": "rich_text",
      "title": "Morning Flow",
      "config": {
        "format": "markdown",
        "content": "Morning movement wakes up your spine and signals to your body that it is safe to start the day. You do not need flexibility or special equipment. Moving gently right after waking unglues stiff muscles and brings fresh oxygen into your brain."
      }
    },
    {
      "id": "mf-2",
      "componentType": "rich_text",
      "title": "The Practice",
      "config": {
        "format": "markdown",
        "content": "![Blue in Morning Flow](/images/yoga/blue-morning-flow.png)\n\nFollow this simple five-minute sequence:\n\n1. Stand tall with your feet shoulder-width apart. Feel the floor beneath you.\n2. Inhale slowly and raise both arms overhead. Interlace your fingers and reach gently toward the sky.\n3. Lengthen your spine. Keep your shoulders soft and away from your ears.\n4. Take three slow breaths here. Feel your ribcage expand on each inhale.\n5. Exhale and sweep your arms down to your sides. Roll your shoulders back twice."
      }
    },
    {
      "id": "mf-3",
      "componentType": "rich_text",
      "title": "Daily Cue",
      "config": {
        "format": "markdown",
        "content": "Do this stretch next to your bed before looking at your phone. One steady minute of gentle movement sets your posture and focus for the entire morning."
      }
    }
  ]'::jsonb,
  '[
    "The learner can perform an upward morning stretch without joint pinch or back strain",
    "The learner can link an inhale with reaching up and an exhale with relaxing down"
  ]'::jsonb
),
(
  'somatic-release',
  'Somatic Release',
  'Grounding floor postures to unwind stored stress, soften tight hips, and quiet the nervous system.',
  'published',
  '[
    {
      "id": "sr-1",
      "componentType": "rich_text",
      "title": "Somatic Release",
      "config": {
        "format": "markdown",
        "content": "Stress is physical before it is mental. Your body tightens around tension in your jaw, shoulders, and hips. Somatic release uses quiet, low-effort floor positions to give your nervous system permission to drop out of high alert."
      }
    },
    {
      "id": "sr-2",
      "componentType": "rich_text",
      "title": "The Practice",
      "config": {
        "format": "markdown",
        "content": "![Blue in Somatic Release](/images/yoga/blue-somatic-release.png)\n\nFollow these three grounding steps:\n\n1. Sit comfortably on the floor or a firm cushion with crossed legs. Keep your back tall and relaxed.\n2. Rest your hands gently on your knees with palms facing upward.\n3. Close your eyes. Drop your tongue from the roof of your mouth and unclench your jaw.\n4. Inhale through your nose for four counts. Feel your belly rise.\n5. Exhale slowly through your mouth for six counts. Imagine tension draining down into the ground."
      }
    },
    {
      "id": "sr-3",
      "componentType": "rich_text",
      "title": "Daily Cue",
      "config": {
        "format": "markdown",
        "content": "Spend three minutes in this position whenever you feel overwhelmed, or before you go to sleep. Long exhales turn down adrenaline and help your muscles release."
      }
    }
  ]'::jsonb,
  '[
    "The learner can identify two muscle groups holding tension and soften them",
    "The learner can maintain steady diaphragmatic breath in a resting posture for three minutes"
  ]'::jsonb
),
(
  'breath-and-posture',
  'Breath & Posture',
  'Core alignment cues to stack head, heart, and pelvis with effortless diaphragmatic breathing.',
  'published',
  '[
    {
      "id": "bp-1",
      "componentType": "rich_text",
      "title": "Breath & Posture",
      "config": {
        "format": "markdown",
        "content": "How you hold your body changes how you breathe, and how you breathe changes how you think. Slumping compresses your diaphragm and keeps your breath shallow. Stacking your bones upright lets your lungs fill with zero extra effort."
      }
    },
    {
      "id": "bp-2",
      "componentType": "rich_text",
      "title": "The Practice",
      "config": {
        "format": "markdown",
        "content": "![Blue in Breath and Posture](/images/yoga/blue-breath-posture.png)\n\nUse this check to find your neutral alignment:\n\n1. Stand with your feet flat and balanced between toes and heels.\n2. Bring your hands together at the center of your chest in a light prayer position.\n3. Line up your ears over your shoulders, and your shoulders over your hips.\n4. Inhale deeply through your nose. Expand your ribs outward in all directions like a balloon.\n5. Exhale softly and feel your chest stay tall while your shoulder blades slide down your back."
      }
    },
    {
      "id": "bp-3",
      "componentType": "rich_text",
      "title": "Daily Cue",
      "config": {
        "format": "markdown",
        "content": "Reset this posture whenever you stand up from your chair or before starting a focused task. A tall spine creates immediate breathing space for your lungs."
      }
    }
  ]'::jsonb,
  '[
    "The learner can align ear, shoulder, and hip in a neutral standing posture",
    "The learner can demonstrate 360-degree ribcage expansion during standing breath"
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  topic_title = EXCLUDED.topic_title,
  summary = EXCLUDED.summary,
  body = EXCLUDED.body,
  evidence_criteria = EXCLUDED.evidence_criteria,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- ── Guide Subjects ───────────────────────────────────────────────────────────
INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Movement' FROM guides WHERE slug = 'morning-flow'
ON CONFLICT DO NOTHING;

INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Foundations' FROM guides WHERE slug = 'morning-flow'
ON CONFLICT DO NOTHING;

INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Recovery' FROM guides WHERE slug = 'somatic-release'
ON CONFLICT DO NOTHING;

INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Foundations' FROM guides WHERE slug = 'somatic-release'
ON CONFLICT DO NOTHING;

INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Alignment' FROM guides WHERE slug = 'breath-and-posture'
ON CONFLICT DO NOTHING;

INSERT INTO guide_subjects (guide_id, subject)
SELECT id, 'Foundations' FROM guides WHERE slug = 'breath-and-posture'
ON CONFLICT DO NOTHING;
