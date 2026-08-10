ALTER TABLE educational_assets
  ADD COLUMN IF NOT EXISTS review_reason TEXT
  CHECK (review_reason IS NULL OR char_length(btrim(review_reason)) BETWEEN 1 AND 500);

CREATE INDEX IF NOT EXISTS idx_educational_assets_review_queue
  ON educational_assets (production_status, updated_at DESC, id ASC);
