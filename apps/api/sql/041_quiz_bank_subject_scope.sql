ALTER TABLE quiz_bank_questions
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KEN',
  ADD COLUMN IF NOT EXISTS curriculum_code TEXT NOT NULL DEFAULT 'CBC',
  ADD COLUMN IF NOT EXISTS learning_outcome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cognitive_level TEXT NOT NULL DEFAULT 'recall'
    CHECK (cognitive_level IN ('recall', 'understand', 'apply', 'analyze', 'create')),
  ADD COLUMN IF NOT EXISTS feature_tags JSONB NOT NULL DEFAULT '["quiz_me", "take_quiz", "quiz_battle", "homework", "flashcards", "games"]'::jsonb
    CHECK (jsonb_typeof(feature_tags) = 'array');

ALTER TABLE quiz_bank_questions
  DROP CONSTRAINT IF EXISTS quiz_bank_questions_grade_level_question_number_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quiz_bank_questions_scope_subject_question_number_key'
  ) THEN
    ALTER TABLE quiz_bank_questions
      ADD CONSTRAINT quiz_bank_questions_scope_subject_question_number_key
      UNIQUE (country_code, curriculum_code, grade_level, subject_id, question_number);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_scope_subject
  ON quiz_bank_questions (country_code, curriculum_code, grade_level, subject_id, difficulty, question_number);
