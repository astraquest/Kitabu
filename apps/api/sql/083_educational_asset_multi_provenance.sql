ALTER TABLE educational_asset_provenance
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

ALTER TABLE educational_asset_provenance
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE educational_asset_provenance
  DROP CONSTRAINT IF EXISTS educational_asset_provenance_pkey;

ALTER TABLE educational_asset_provenance
  ADD CONSTRAINT educational_asset_provenance_pkey PRIMARY KEY (id);

-- Preserve all immutable provenance. A conflicting provider identity requires
-- manual review rather than silently dropping or rewriting either record.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM educational_asset_provenance
    WHERE provider_key IS NOT NULL AND provider_asset_id IS NOT NULL
    GROUP BY provider_key, provider_asset_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce educational asset provider identity uniqueness: duplicate provenance records require manual resolution';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_educational_asset_provenance_provider_identity
  ON educational_asset_provenance (provider_key, provider_asset_id)
  WHERE provider_key IS NOT NULL AND provider_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_educational_asset_provenance_asset_canonical
  ON educational_asset_provenance (asset_id, source_license, retrieved_at DESC, id ASC);
