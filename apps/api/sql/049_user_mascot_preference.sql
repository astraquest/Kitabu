ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mascot_key TEXT NOT NULL DEFAULT 'rabbit'
  CHECK (mascot_key IN ('rabbit', 'lion', 'elephant'));
