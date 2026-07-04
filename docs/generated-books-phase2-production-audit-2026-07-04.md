# Generated Books Phase 2 Production Audit - 2026-07-04

This audit records Phase 2 readiness evidence from the production-mounted generated-book corpus. It does not promote any book to `ready-for-cover`.

## Production Baseline

Read-only census source: `/opt/kitabu-ai/apps/api/data/books`, checked through the running API container mount at `/app/data/books`.

| Metric | Count |
|---|---:|
| Total books | 280 |
| Kenya | 63 |
| Rwanda | 87 |
| Uganda | 38 |
| Tanzania | 65 |
| Ethiopia | 27 |
| Manifests with `status: published-for-testing` | 280 |
| `content-reviewed-draft` | 63 |
| `content-draft-review-needed` | 217 |
| `coverStatus: phase1-testing-cover-attached` | 280 |
| Packages with cover PNG | 280 |
| Packages with PDF | 280 |
| Packages with `pages.json` | 280 |
| Packages with `source-map.json` | 280 |
| Packages with `book-plan.json` | 280 |
| Manifest page total | 45,576 |
| Manifest word total | 5,765,296 |

Production services were healthy during the audit: `kitabu-api` was healthy, and Postgres, Redis, Caddy, and worker were running on `kitabu-prod-1`.

Post-audit corrections now part of the Phase 1.5 baseline:

- `KEN/CBC/G9/agriculture` was regenerated with generator v47 and synced to production after backup `/var/backups/kitabu/generated-books-G9-agriculture-pre-v47-20260704224657`.
- The clothing/household-disinfection contamination scan for that package now returns 0 hits.
- PR #25 preserves `published-for-testing` status and cover metadata during future Kenya regeneration.
- PR #26 added language artifact promotion gates. The current follow-up branch tightens those gates for all configured language subjects before any promotion beyond `published-for-testing`.
- Latest production recheck still shows 280 generated packages, 280 attached covers, 0 missing pages/source maps/PDFs/covers, and healthy API/database/Redis services.

## Local Corpus Caveat

The ignored local corpus in `C:/Users/NDIZIFLIX/Desktop/APPS/KITABU/kitabu-ai/apps/api/data/books` is stale against production for Phase 2 acceptance purposes. Local census showed 280 packages, but only 20 manifests with `status: published-for-testing`, 36,806 pages, and 4,453,973 words.

Use production evidence or a freshly synced production snapshot before making content-readiness decisions. Local sub-agent findings from the stale corpus are useful as candidate risks only until rechecked against production.

## Production-Confirmed Blockers

### Kenya Language

Production scan scope: all 18 Kenya English and Kiswahili packages.

- 18/18 packages are `published-for-testing` with `contentStatus: content-reviewed-draft`.
- 9/18 packages still have repeated language scaffold markers matching prior blocked patterns.
- 4/18 packages have page titles longer than 110 characters.
- 18/18 packages still include some short instructional/front-matter pages.
- Examples:
  - `KEN/CBC/G4/english`, `kitabu-quest-grade-4-english-p004`, table of contents still contains `Grammar in uses`.
  - `KEN/CBC/G4/english`, `kitabu-quest-grade-4-english-p006`, repeated `Skill Focus` pattern remains.
  - `KEN/CBC/G4/kiswahili`, `kitabu-quest-grade-4-kiswahili-p020`, 118-character title.
  - `KEN/CBC/G11/kiswahili`, review-clinic titles reach 140+ characters.

Decision: language packages remain blocked from `ready-for-cover` pending a focused production-snapshot review and generator/title cleanup.

### Kenya STEM

Production scan scope: Kenya Mathematics and Science and Technology packages, Grades 4-12.

- Senior Science and Technology packages for Grades 10-12 aggregate Biology, Chemistry, General Science, and Physics source documents under one `Science and Technology` book title.
- Senior Mathematics packages for Grades 10-12 aggregate Core Mathematics and Essential Mathematics under one `Mathematics` book title.
- Grades 7-9 Science and Technology packages use Integrated Science source documents while the catalog title remains `Science and Technology`.
- Generic science fallback phrasing remains in all Science packages, with representative hits such as `What evidence would help explain this idea clearly?`.
- Lower-grade Science page depth is still weaker than market replacement standard:
  - Grade 4 Science and Technology: 133 pages, 20,811 words.
  - Grade 5 Science and Technology: 133 pages, 21,938 words.
  - Grade 6 Science and Technology: 133 pages, 21,507 words.

Decision: STEM remains blocked from `ready-for-cover` until senior subject routing/catalog decisions are made and generic science fallback content is remediated.

### Kenya Practical And Humanities

Production scan scope: Kenya Agriculture G4-G9 and senior Creative Arts/Social Studies aggregate source-map samples.

- G4-G8 Agriculture no longer hit the exact stale local textile/laundry/sewing blocker strings checked in production.
- G9 Agriculture had contained `Disinfecting Clothing and Household Articles` across 16 pages in this audit snapshot, but that finding has since been remediated in production by the v47 targeted package sync noted above.
- Senior Creative Arts and Social Studies aggregate packages still need component-source review. Front matter maps to all component source documents, and the production audit did not prove page-level component precision for instructional pages.

Decision: practical/humanities packages remain blocked from `ready-for-cover` until senior aggregate component-source mapping is reviewed and the corrected G9 Agriculture package is included in the next adversarial acceptance pass.

### Uganda

Production scan scope: all 38 Uganda NCDC packages.

- 38/38 packages are `published-for-testing`.
- 38/38 packages have `sourceQuality.status: draft-source-review-needed`.
- 38/38 embedded source documents are `review_needed`.
- 34/38 packages have front-matter/source-pollution pattern hits, commonly `Table of Content` mapped into learner pages.
- 16/38 packages repeat `Work with a partner or small group` eight times each.

Decision: Uganda remains blocked from `ready-for-cover` for source review, source-cleaning, and instructional-depth remediation.

### Ethiopia

Production scan scope: all 27 Ethiopia ENC packages.

- 27/27 packages are `published-for-testing`.
- 27/27 packages have `sourceQuality.status: draft-source-review-needed`.
- Grade split: G4 1, G5 1, G6 1, G7 3, G8 5, G9 8, G10 8.
- Subject split: English 7, Mathematics 3, Information Technology 3, Biology 2, Chemistry 2, Physics 2, Geography 2, History 2, Civics and Ethical Education 2, General Science 2.
- G8 Mathematics still has 43 `Application Workshop` pages.

Decision: Ethiopia remains blocked from `ready-for-cover` because coverage is incomplete, source review is still required, expected-matrix decisions remain open, and G8 Mathematics template expansion needs remediation.

## Local Sub-Agent Findings To Revalidate

Six read-only sub-agents reviewed the local corpus in parallel. Because the local corpus is stale against production, their findings must be treated as candidate risks, not final production evidence. Production scans already confirmed several risk categories, but the exact affected page lists should be regenerated from a production-synced snapshot before patching.

Candidate areas from local agents:

- Kenya language: repeated scaffolds, raw TOCs, Kiswahili fragments, long titles, and shallow pages.
- Kenya STEM: senior science/math routing, generic fallback tasks, shallow lower-grade Science, and source-map locator gaps.
- Kenya practical/humanities: agriculture contamination and senior aggregate source-map precision.
- Rwanda: source-review blocks, S6 Mathematics wrong-domain examples, repeated Application Workshop pages, shallow source-map anchors, incomplete offline metadata, and alternate taxonomy decisions.
- Uganda: source-review blocks, source/front-matter pollution, repeated partner-work scaffolds, incomplete offline metadata, and incomplete scope.
- Tanzania: source-review blocks, missing local TIE source files in the local checkout, fallback IDs, source-map locator gaps, thin instructional pages, repeated Sanaa na Michezo pages, Kiswahili language mixing, and incomplete offline metadata.

## Next Phase 2 Actions

1. Create or sync a production-equivalent local snapshot before patching package content.
2. Start Kenya remediation with source-routing/catalog decisions:
   - split or explicitly approve senior Core/Essential Mathematics handling,
   - split or explicitly approve senior Biology/Chemistry/Physics/General Science handling,
   - decide whether G7-G9 should be titled Integrated Science instead of Science and Technology.
3. Patch Kenya language title and scaffold generation from the production-confirmed examples.
4. Revalidate the v47 G9 Agriculture correction during the next Kenya adversarial acceptance pass.
5. Run production-snapshot audits for Rwanda and Tanzania before patching, because current detailed findings came from stale local files.
6. Keep all packages `published-for-testing` until blockers and high-severity accepted findings are fixed and re-reviewed.
