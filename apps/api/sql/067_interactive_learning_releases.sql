CREATE TABLE IF NOT EXISTS interactive_learning_bundles (
  bundle_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  channel TEXT NOT NULL CHECK (channel IN ('development', 'preview', 'staging', 'production')),
  release_id TEXT NOT NULL,
  manifest JSONB NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (bundle_id, revision),
  UNIQUE (release_id),
  UNIQUE (sha256)
);

CREATE TABLE IF NOT EXISTS interactive_learning_release_history (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('development', 'preview', 'staging', 'production')),
  bundle_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  release_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('publish', 'rollback')),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (bundle_id, revision) REFERENCES interactive_learning_bundles(bundle_id, revision)
);

CREATE TABLE IF NOT EXISTS interactive_learning_release_pointers (
  channel TEXT PRIMARY KEY CHECK (channel IN ('development', 'preview', 'staging', 'production')),
  bundle_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  release_id TEXT NOT NULL,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (bundle_id, revision) REFERENCES interactive_learning_bundles(bundle_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_interactive_learning_release_history_channel
  ON interactive_learning_release_history (channel, created_at DESC);
