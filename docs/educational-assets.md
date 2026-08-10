# Educational assets

The educational-asset foundation stores Kitabu-controlled copies of reviewed learning media. Each asset has a SHA-256 content identity, a local storage key, and immutable provenance.

Source URLs are provenance only. They must never be used as learner-serving URLs; learner delivery will use Kitabu-controlled storage in a later route slice.

Only CC0/public-domain, MIT, and CC BY assets are production eligible after approval. CC BY-SA is retained as restricted and cannot be served in production. Non-commercial, no-derivatives, all-rights-reserved, proprietary, missing, and unverifiable licenses are not production eligible.

SVG inputs must be structurally screened before storage. Scripts, event handlers, embedded/remote resources, data URLs, and CSS imports are rejected. The local storage abstraction accepts only relative keys contained under its configured root.

## Learner retrieval

Authenticated callers can query `GET /educational-assets` with optional `query`, `subject`, `topic`, `grade`, `assetType`, and bounded `limit` filters. Results expose `assetKey`, a Kitabu-relative `assetUrl`, educational metadata, and display attribution. `GET /educational-assets/:assetId/file` serves only the eligible locally stored file with its persisted MIME type.

Both endpoints apply the production eligibility policy: only approved CC0/public-domain, MIT, or CC BY assets are visible or read. The service never includes source URLs in learner responses. Remote source URLs remain immutable provenance records only and are never learner-serving URLs.

## Acquisition adapters

Adapters implement bounded discovery and download using `RemoteAsset` provenance metadata, resumable cursors, and explicit capabilities. The runner supports `--limit`, `--dry-run`, `--resume`, bounded retries, content-hash and provider-asset identity deduplication, checkpointed import runs, and local-original storage. It validates file bytes before persistence; SVGs receive the structural safety check. Normalization and thumbnails are not implemented in this phase.

Health Icons is the only enabled adapter. Its official site states that commercial and personal use, editing, and republication are allowed without credit; this implementation records CC0-1.0 evidence and uses only the official [repository](https://github.com/resolvetosavelives/healthicons), GitHub tree API, and raw GitHub file URLs. Discovery is limited to `public/icons/**` SVG/PNG files, retaining every upstream resolution rather than guessing which variants are redundant. Use `npm.cmd run assets:sync -w apps/api -- --provider health-icons --limit 10` or add `--dry-run` / `--resume <cursor>`. Do not run bulk syncs during builds, and do not commit downloaded assets to Git.

Tabler Icons is a separate MIT-licensed adapter verified against its official [repository and LICENSE](https://github.com/tabler/tabler-icons). It discovers only official outline/filled SVG source directories and records them as `generic-ui-concept` assets: they are interface and concept icons, not textbook scientific diagrams. Use `--provider tabler-icons`; do not use it to imply curriculum-specific scientific illustration.

Bioicons is intentionally deferred: its [official repository](https://github.com/duerrsimon/bioicons) states that individual icons carry their own licenses and citations. Automated import must wait for per-asset license and citation extraction.

Bioicons is now a bounded adapter, not a global-license import. It discovers only SVGs beneath `static/icons/{cc-0,mit,cc-by-3.0,cc-by-4.0,cc-by-sa-3.0,cc-by-sa-4.0}/`, preserves the exact CC BY/CC BY-SA version from each directory, records the directory-specific license evidence and creator URL from the official [`authors.json`](https://github.com/duerrsimon/bioicons/blob/main/static/icons/authors.json) when available, and fails if GitHub reports a truncated tree. Both CC BY-SA versions remain discovered but restricted by the existing runner policy. `static/icons/bsd/` remains deferred until explicit BSD-2/BSD-3 domain license values and verification are added.

## Phase 4 manifests and reports

Each normal sync atomically writes `manifests/<provider>/<import-run-id>.json` under the configured educational-asset storage root. The JSON manifest records run identity/revision/cursor, import timestamp, and every source path with its hash (when downloaded), license, database asset ID (when created), outcome, and normalization status. The command output includes a report with acquisition counters plus provider, license, and media-type breakdowns. Dry runs return the same manifest/report in memory and write neither database nor storage.

Original files remain authoritative. SVGs are structurally validated and recorded as `validated-original`; unsafe files are quarantined and never enter learner storage. Raster files are recorded as `needs-normalization`: the current dependency set has no image decoder/resizer, so thumbnails and raster normalization are deliberately deferred and must not be represented as complete.
