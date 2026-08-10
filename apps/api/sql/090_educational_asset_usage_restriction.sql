ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS usage_restriction TEXT NOT NULL DEFAULT 'none'
    CHECK (usage_restriction IN ('none', 'share_alike'));

ALTER TABLE educational_asset_import_runs
  ADD COLUMN IF NOT EXISTS restricted_count BIGINT NOT NULL DEFAULT 0
    CHECK (restricted_count >= 0);
