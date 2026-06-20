-- Production query/index hardening. These keep common joins, cascades, auth
-- lookups, and dashboard rollups off sequential scans as tables grow.

CREATE INDEX IF NOT EXISTS idx_user_roles_role_user
  ON user_roles (role, user_id);

CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id
  ON class_teachers (teacher_id);

CREATE INDEX IF NOT EXISTS idx_class_students_student_id
  ON class_students (student_id);

CREATE INDEX IF NOT EXISTS idx_assignments_class_id
  ON assignments (class_id);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id
  ON assignments (teacher_id);

CREATE INDEX IF NOT EXISTS idx_assignments_school_created_at
  ON assignments (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_student_submitted_at
  ON submissions (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id
  ON subscriptions (plan_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_plan_id
  ON payment_requests (plan_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_subscription_id
  ON ai_usage_events (subscription_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created_at
  ON audit_logs (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_replaced_by_token_id
  ON refresh_tokens (replaced_by_token_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash_active
  ON refresh_tokens (token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash_active
  ON password_reset_tokens (token_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash_active
  ON email_verification_tokens (token_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_diagnostic_answers_user_created_at
  ON diagnostic_answers (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mastery_scores_user_updated_at
  ON mastery_scores (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_confidence_records_user_created_at
  ON confidence_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spaced_repetition_user_due
  ON spaced_repetition_schedules (user_id, next_review_date);

CREATE INDEX IF NOT EXISTS idx_weekly_exam_attempts_user_status_submitted
  ON weekly_exam_attempts (user_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_exam_attempts_exam_user
  ON weekly_exam_attempts (exam_id, user_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id
  ON notification_deliveries (notification_id);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent_child
  ON parent_students (parent_user_id, student_user_id);
