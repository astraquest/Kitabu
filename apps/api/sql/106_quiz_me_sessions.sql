CREATE TABLE IF NOT EXISTS quiz_me_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_session_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  curriculum_code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  strand_title TEXT NOT NULL,
  sub_strand_title TEXT NOT NULL,
  requested_count INTEGER NOT NULL CHECK (requested_count BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER CHECK (score IS NULL OR score >= 0),
  UNIQUE (user_id, client_session_id)
);

CREATE TABLE IF NOT EXISTS quiz_me_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_me_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_bank_questions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  served_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id),
  UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_quiz_me_session_questions_question
  ON quiz_me_session_questions (question_id);

CREATE TABLE IF NOT EXISTS quiz_me_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_me_sessions(id) ON DELETE CASCADE,
  session_question_id UUID NOT NULL REFERENCES quiz_me_session_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1),
  feedback TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, session_question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_me_answers_user_history
  ON quiz_me_answers (session_id, submitted_at);
