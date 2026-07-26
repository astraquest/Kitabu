CREATE TABLE IF NOT EXISTS deployment_data_operation_checkpoints (
  operation_key TEXT PRIMARY KEY,
  input_sha256 TEXT NOT NULL CHECK (input_sha256 ~ '^[0-9a-f]{64}$'),
  database_state_sha256 TEXT CHECK (database_state_sha256 IS NULL OR database_state_sha256 ~ '^[0-9a-f]{64}$'),
  release_sha TEXT NOT NULL,
  output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_data_operation_checkpoints_completed
  ON deployment_data_operation_checkpoints (completed_at DESC);
