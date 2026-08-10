ALTER TABLE educational_asset_provenance
  DROP CONSTRAINT IF EXISTS educational_asset_provenance_source_license_check;

ALTER TABLE educational_asset_provenance
  ADD CONSTRAINT educational_asset_provenance_source_license_check CHECK (source_license IN (
    'CC0-1.0', 'PUBLIC-DOMAIN', 'MIT', 'CC-BY-3.0', 'CC-BY-4.0',
    'CC-BY-SA-3.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0',
    'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0', 'ALL-RIGHTS-RESERVED', 'PROPRIETARY', 'UNKNOWN'
  ));
