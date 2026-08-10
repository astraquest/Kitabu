ALTER TABLE educational_assets
  DROP CONSTRAINT IF EXISTS educational_assets_storage_backend_check;

ALTER TABLE educational_assets
  ADD CONSTRAINT educational_assets_storage_backend_check
  CHECK (storage_backend IN ('local', 'http-put', 'supabase'));
