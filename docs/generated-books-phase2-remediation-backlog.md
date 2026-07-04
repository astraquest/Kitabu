# Generated Books Phase 2 Remediation Backlog

Phase 2 starts from the Phase 1 testing release published on 2026-07-04. The current 280 generated books are available for manual testing as `published-for-testing`, but they are not final academic content.

This backlog preserves the paused review context so the next work can continue quickly without losing the published testing baseline.

## Baseline To Preserve

- Production has 280 generated packages: Kenya 63, Rwanda 87, Uganda 38, Tanzania 65, Ethiopia 27.
- Every Phase 1 package has readable `pages.json`, a PDF, `source-map.json`, and `assets/cover.png` referenced by manifest `coverImage`.
- Production data is server-local at `/opt/kitabu-ai/apps/api/data/books`; normal code deploys do not ship the generated corpus.
- The failed local full-corpus Git push does not affect production availability. Generated package files are ignored by Git; the production server-local data directory is the source of truth for the Phase 1.5 testing baseline.
- Normal authenticated users see `published-for-testing` books scoped to country, curriculum, and selected grade.
- Demo, staff, and admin preview users can review the full generated-book set.
- Current final gates remain closed: 0 `ready-for-cover`, 0 `library-ready`, and 0 `published-library`.
- Kenya remains `content-reviewed-draft`; the other 217 generated packages remain `content-draft-review-needed`.
- Post-baseline correction: `KEN/CBC/G9/agriculture` was regenerated with generator v47 and synced to production after package backup `/var/backups/kitabu/generated-books-G9-agriculture-pre-v47-20260704224657`; the invalid clothing/household-disinfection contamination scan now returns 0 hits.

Do not break this baseline while remediating. Phase 2 work should create new validated package versions and preserve enough rollback evidence to return to the Phase 1 testing snapshot.

Some older running notes mention 176/280 cover URLs before the final cover sync. Treat the production release evidence as the current baseline: 280 manifests, 280 PDFs, and 280 cover PNGs on the server, and `student@kitabu.ai` returning 280 generated books with 280 cover URLs. Re-verify this before risky Phase 2 changes.

## Promotion Rules

A book can move from `published-for-testing` only after all of these are true:

- Source snapshot exists with country, curriculum, grade, subject, source status, and input hash.
- `book-plan.json` breaks the subject into teachable topics and subtopics.
- Every learning outcome has explanation, example or activity, practice, and source-map coverage.
- Writing is age-appropriate, conversational, specific, and free of filler.
- Local examples match the learner's country and curriculum context.
- `pages.json` parses and remains readable in the app.
- Manifest metadata includes status, version, checksums, page count, downloads, and deferred visual list.
- Validation report is clean or has only documented accepted warnings.
- Adversarial reviewer confirms the book is genuinely helpful to learners.

Accepted manual feedback must be fixed in the generator or source-normalization path where possible, not only by editing one output page. Final market-quality cover and mascot work should wait until content acceptance for that book or batch.

Every accepted feedback item should carry:

- Issue ID.
- Country, curriculum, grade, subject, book title, book ID, page number, and page title.
- Issue type, severity, exact quote or screenshot, and reproduction steps.
- Reviewer recommendation and final decision.
- Fix owner: generator logic, source normalization, manifest/package metadata, or one-off page patch.
- Verification artifact path after remediation.

## Availability Controls

Generated packages are not a normal Git artifact in this phase. Before regeneration, package sync, or production deploy:

- Back up `/opt/kitabu-ai/apps/api/data/books`.
- Do not assume a code commit, PR merge, or Git push contains the generated corpus; package availability must be verified on the production server-local path.
- Record the backup path in the relevant release note or remediation PR.
- Remember that the previous database checkpoint was a logical DB census and generated-library manifest snapshot, not a full `pg_dump`.
- Verify after changes that `/health` passes.
- Verify `student@kitabu.ai` still sees 280 generated books, all readable, with 280 cover URLs.
- Verify at least one normal scoped student sees only the selected country/curriculum/grade books and can switch grade.
- Verify country split remains expected unless the change intentionally adds or removes generated books.

## Work Order

1. Intake manual testing feedback and attach each accepted issue to country, curriculum, grade, subject, book ID, page number, severity, and evidence.
2. Reproduce each accepted issue against the current package version.
3. Patch the generator, source normalization, or curriculum mapping cause.
4. Regenerate only the affected disjoint country/grade/subject batch unless a shared generator fix requires a broader rebuild.
5. Run package validation and focused blocker scans.
6. Run adversarial review by subject family.
7. Promote accepted content to `ready-for-cover`.
8. Generate or refine final cover art and mascots.
9. Promote accepted books to `published-library`.

## Kenya

Current state: 63 Kenya CBC packages are readable and structurally valid on the v46 remediation line, with 12,867 pages and 2,275,797 words. They are still draft-gated.

Open Phase 2 tasks:

- Run fresh adversarial acceptance for v46 before any `ready-for-cover` promotion.
- Re-review language books for repeated English routines, placeholder table-of-contents labels, Kiswahili fragments, weak source titles, and generic reading or listening tasks.
- Re-review Mathematics and Science for prior wrong-domain routing, generic fallback tasks, and weak examples.
- Re-review Agriculture, Creative Arts, Social Studies, and senior aggregate packages for contamination, source-title artifacts, repeated templates, local-context placeholders, and component-review gates.
- Resolve the 9 senior aggregate packages that still require component review.
- Promote Kenya packages to `ready-for-cover` only after reviewer acceptance.

Acceptance evidence required:

- v46 package validation remains clean or warnings are explicitly accepted.
- Focused blocker scans remain clear for the previously fixed language, STEM, practical, and humanities strings.
- Reviewer samples cover lower-primary, junior-secondary, and senior-secondary books across language, STEM, and practical/humanities subjects.

## Rwanda

Current state: 87 Rwanda REB-CBC packages were generated from the normalized pipeline and are readable in the Phase 1 release. They remain `content-draft-review-needed`.

Open Phase 2 tasks:

- Clear source-review draft status or document accepted provenance limits per source.
- Remediate repeated application-workshop pages across affected packages.
- Re-review and fix wrong-domain S6 STEM and humanities examples.
- Complete language QA for Kinyarwanda, French, and English leakage or duplicated scaffolds.
- Add or verify offline bundle metadata.
- Resolve alternate-package taxonomy decisions before final catalog promotion.
- Re-run validation, live readability checks, and adversarial acceptance before `ready-for-cover`.

Acceptance evidence required:

- 87/87 packages validate with no structural errors.
- Repeated-template/application-workshop scan is clear or documented as accepted for specific pages only.
- S6 and language representative samples pass adversarial review.
- Offline/download metadata is complete.

## Uganda

Current state: 38 Uganda packages are generated and readable in the Phase 1 release. They are not final-ready.

Open Phase 2 tasks:

- Preserve the 38 readable packages, but block readiness until fallback outlines are replaced or explicitly accepted against reviewed sources.
- Re-check source provenance and source-review status for the configured Uganda core set.
- Resolve rejected or review-needed source documents.
- Expand configured scope if the current grade/subject set is incomplete against the Uganda target matrix.
- Confirm review fixes are still present in the package versions published for testing.
- Review instructional depth for the 28 packages that still need content-depth acceptance.
- Review and clear or accept the remaining repeated-opening group.
- Run subject-family adversarial review for language, STEM, humanities, and practical subjects.
- Verify outcome coverage, local examples, app readability, checksums, and offline metadata.
- Promote to `ready-for-cover` only after reviewer acceptance.

Acceptance evidence required:

- Full 38-package validation summary.
- Country/grade/subject coverage matrix showing no configured package is missing.
- Reviewer notes proving the books are learner-useful, not merely structurally valid.

## Tanzania

Current state: 65 Tanzania packages are generated and readable in the Phase 1 release. They are not final-ready.

Open Phase 2 tasks:

- Re-check official TIE source coverage and any parser/front-matter cleanup gaps.
- Resolve the earlier missing official TIE PDF inventory gap.
- Confirm all 520 generated fallback topics are replaced with source-derived content, justified, or explicitly accepted with clear source status.
- Move all 65 source documents out of `review_needed` or document accepted provenance limits.
- Review instructional depth for the 61 packages that still carry content-depth warnings.
- Run subject-family adversarial review for local context, content depth, repetition, and wrong-domain examples.
- Verify outcome coverage, app readability, checksums, and offline metadata.
- Promote to `ready-for-cover` only after reviewer acceptance.

Acceptance evidence required:

- Full 65-package validation summary.
- Source/config report showing which packages are source-derived and which have accepted limitations.
- Reviewer notes proving content depth and country fit.

## Ethiopia

Current state: 27 Ethiopia packages are generated and readable in the Phase 1 release, but Ethiopia coverage is incomplete. Only 24 are expected-aligned drafts against a 124-entry expected matrix. Existing drafts include source-derived candidates and extra candidate drafts that do not fully satisfy the expected matrix.

Open Phase 2 tasks:

- Expand Ethiopia sources and config beyond the current partial coverage.
- Reconcile the expected matrix for G7-G8 General Science and Information Technology versus separate Biology, Chemistry, and Physics coverage.
- Normalize source-present blocked subjects: G7 Mathematics, G7 Physical Education, G7 Social Studies, G8 Physical Education, and G8 Social Studies.
- Resolve the remaining coverage gaps: missing source-document entries, missing normalized-unit entries, and `source-no-units` entries.
- Continue generating Ethiopia packages only from verified source-derived topics unless fallback is explicitly approved.
- Do not rerun Ethiopia as English-only.
- Do not crawl the compromised ANRSEB index; use individually verified direct PDF candidates only.
- Re-review Mathematics and Information Technology for template-driven practice, repeated answer checks, and generic workshop filler.
- Regress-test fallback-topic leakage, repeated/thin content, parser or OCR fragments, generic IT task scaffolds, and Application Workshop filler.
- Generate, validate, and review the remaining Ethiopia expected packages.
- Promote only accepted source-derived packages to `ready-for-cover`.

Acceptance evidence required:

- Updated Ethiopia coverage matrix with expected, generated, source-present, source-missing, and candidate-extra counts.
- Validation summary for every generated Ethiopia package.
- Focused scans proving prior Math and IT template blockers remain cleared.
- Reviewer notes confirming source-derived depth and learner usefulness.

## Phase 2 Sub-Agent Split

Use disjoint ownership so parallel work does not conflict:

- Kenya language reviewer: English and Kiswahili packages only.
- Kenya STEM reviewer: Mathematics and Science and Technology packages only.
- Kenya practical/humanities reviewer: Agriculture, Creative Arts, Social Studies, and senior aggregate gates.
- Rwanda source and language reviewer.
- Rwanda STEM/humanities reviewer.
- Uganda reviewer.
- Tanzania reviewer.
- Ethiopia source/config agent.
- Ethiopia generation and package-validation agent.
- Adversarial publication gate reviewer for status promotion, app readability, and offline/download metadata.

Workers must not edit the same output folder, must not revert unrelated changes, and must report changed files plus validation evidence.

## Phase 2 Exit Criteria

Phase 2 is complete only when:

- Accepted tester feedback has been triaged and either fixed, rejected with evidence, or deferred with owner and reason.
- Every expected generated book has passed the content readiness gate.
- Final cover/mascot work has been completed for accepted books.
- Accepted books have moved from `published-for-testing` to `published-library`.
- Production deployment has been verified for normal new users, grade switching, demo/staff/admin preview, readable pages, covers, downloads, and health checks.
