ALTER TABLE user_curriculum_progress
  ADD COLUMN IF NOT EXISTS passed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE user_curriculum_progress
SET passed = COALESCE(quiz_score, 100) >= 70
WHERE passed IS DISTINCT FROM (COALESCE(quiz_score, 100) >= 70);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('learning.mastery_unlocks', TRUE, 'Require a 70 percent lesson quiz score before unlocking the next topic.')
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;
