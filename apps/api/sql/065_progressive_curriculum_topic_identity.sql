ALTER TABLE progressive_lesson_attempts
  ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID
    REFERENCES curriculum_topics(id) ON DELETE RESTRICT;

ALTER TABLE progressive_lesson_progress
  ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID
    REFERENCES curriculum_topics(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS progressive_lesson_attempts_topic_idx
  ON progressive_lesson_attempts(user_id, curriculum_topic_id, last_activity_at DESC)
  WHERE curriculum_topic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS progressive_lesson_progress_topic_idx
  ON progressive_lesson_progress(user_id, grade_level, subject_id, curriculum_topic_id)
  WHERE curriculum_topic_id IS NOT NULL;

COMMENT ON COLUMN progressive_lesson_attempts.curriculum_topic_id IS
  'Stable canonical curriculum topic delivered by this richly authored lesson attempt.';

COMMENT ON COLUMN progressive_lesson_progress.curriculum_topic_id IS
  'Stable canonical curriculum topic used to preserve progress across lesson versions.';
