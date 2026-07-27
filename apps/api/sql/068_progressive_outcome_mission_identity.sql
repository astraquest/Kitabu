-- A curriculum topic can contain several official learning outcomes.  Progress is
-- therefore keyed by the published outcome mission (lesson_key), not collapsed
-- to the root topic.
DROP INDEX IF EXISTS progressive_lesson_progress_topic_idx;

CREATE INDEX IF NOT EXISTS progressive_lesson_progress_topic_idx
  ON progressive_lesson_progress(user_id, grade_level, subject_id, curriculum_topic_id)
  WHERE curriculum_topic_id IS NOT NULL;

COMMENT ON COLUMN progressive_lesson_progress.curriculum_topic_id IS
  'Root curriculum topic for reporting. Outcome-mission progress remains distinct by lesson_key.';
