-- Server-owned QuizBank-first homework drafts and immutable assignment usage.
CREATE TABLE IF NOT EXISTS homework_assignment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  country_code TEXT NOT NULL DEFAULT 'KEN',
  curriculum_code TEXT NOT NULL DEFAULT 'CBC',
  grade_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_id TEXT NOT NULL DEFAULT '',
  strand_title TEXT,
  sub_strand_title TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  requested_count INTEGER NOT NULL CHECK (requested_count BETWEEN 1 AND 100),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'published', 'abandoned')),
  published_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE homework_assignment_drafts
  ADD COLUMN IF NOT EXISTS subject_id TEXT NOT NULL DEFAULT '';

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS source_draft_id UUID REFERENCES homework_assignment_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_source_draft
  ON assignments (source_draft_id) WHERE source_draft_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS assignment_question_usage (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quiz_bank_question_id UUID NOT NULL REFERENCES quiz_bank_questions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assignment_id, quiz_bank_question_id),
  UNIQUE (author_user_id, quiz_bank_question_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_question_usage_author
  ON assignment_question_usage (author_user_id, used_at DESC);
