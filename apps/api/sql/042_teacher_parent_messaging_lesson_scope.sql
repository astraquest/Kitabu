CREATE TABLE IF NOT EXISTS user_subject_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_name)
);

CREATE TABLE IF NOT EXISTS teacher_teaching_scopes (
  teacher_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (teacher_user_id, grade_level, subject_name)
);

CREATE TABLE IF NOT EXISTS teacher_parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  outcome TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  style TEXT NOT NULL,
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subject_preferences_subject
  ON user_subject_preferences (subject_name, user_id);

CREATE INDEX IF NOT EXISTS idx_teacher_teaching_scopes_lookup
  ON teacher_teaching_scopes (teacher_user_id, grade_level, subject_name);

CREATE INDEX IF NOT EXISTS idx_teacher_parent_messages_teacher
  ON teacher_parent_messages (school_id, teacher_user_id, grade_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_parent_messages_parent
  ON teacher_parent_messages (parent_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_teacher
  ON teacher_lesson_plans (teacher_user_id, created_at DESC);
