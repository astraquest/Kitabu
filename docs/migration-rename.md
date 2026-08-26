# Kitabu migration and rename runbook

**Status:** IN_PROGRESS until production acceptance is complete  
**Owner:** [owner]  
**Last updated:** [YYYY-MM-DD]  
**Release identity:** [exact commit SHA / image digest / AAB version recorded at execution]

## 1. Objective, scope, non-goals, and decisions

### Objective

Move Kitabu’s website, admin portal, API, worker, Redis, and Postgres runtime to a clean,
provider-specific DigitalOcean deployment behind the existing Cloudflare DNS/WAF/Tunnel edge.
Release a new Android identity, resolve the iOS identity gate, and establish encrypted
off-server backups with a tested restore path before public cutover.

This is an executable runbook, not evidence that external console, DNS, tunnel, hosting,
payment, mail, or store actions have already happened. Every such action requires an owner,
approval, timestamp, change reference, and verification evidence.

### Scope

- Native package/bundle identities, OAuth, Digital Asset Links, store references, Sentry,
  AppsFlyer, push, generated pages, mailer, tests, workflows, and current documentation.
- DigitalOcean Droplet, Reserved IP, Ubuntu 24.04, Docker Compose, Caddy, API/worker/Redis/Postgres,
  monitoring, backups, and origin hardening.
- Cloudflare DNS, WAF, and the existing remotely managed Tunnel, while preserving public names.
- DigitalOcean Spaces as active S3-compatible asset storage and separate Cloudflare R2 backups.
- Fresh migrations, deterministic curriculum/QuizBank/school imports, seed cleanup, and one owner.
- Controlled repository rename, fresh sibling clone verification, release freeze, immutable identity,
  cutover, rollback, recovery, and end-to-end acceptance.

### Non-goals

- Do not restore demo, QA, or historical users to the clean production database.
- Do not treat the Android package change as an update. ai.kitabu.app is a new Google Play
  listing; existing ai.kitabu2.twa installs do not auto-update.
- Do not change kitabu.ai, www.kitabu.ai, app.kitabu.ai, or admin.kitabu.ai.
- Do not make a public A-record cutover or remove email DNS records.
- Do not replace the current Tunnel with a partial config or discard unrelated existing ingress.
- Do not rewrite historical release artifacts or historical evidence merely to update identity.
- Do not treat local Docker volumes, Spaces, one Droplet, or one Tunnel as a backup.
- Do not fabricate IDs, fingerprints, credentials, artifacts, or external-action results.
- Do not perform paid, destructive, irreversible, or production-state actions without approval.

### Fixed decisions

| Decision | Required outcome | Evidence |
| --- | --- | --- |
| Android | Change ai.kitabu2.twa to ai.kitabu.app; create a new Play listing, not an update. | Signed AAB manifest, listing identity, Internal Testing install |
| iOS | Recommend changing currently unreleased ai.kitabunative.app to ai.kitabu.app. | Apple state and explicit decision gate |
| Data | Clean rebuild; no restored/demo users; targeted known-seed cleanup only. | Empty DB, cleanup result, owner bootstrap audit |
| Domains | Public domains remain unchanged. | DNS/Tunnel export and external probes |
| Tunnel | Reuse remotely managed Tunnel initially; preserve full ordered ingress and catchall. | Full pre/post config and version |
| Origin | SSH only inbound; no public DB, Redis, or API ports. | Firewall/listeners/external probes |
| Host | Ubuntu 24.04, recommended Basic 8 GiB/4 vCPU, Reserved IP, monitoring, daily backups. | DO resource and policy evidence |
| Storage | Add S3-compatible SigV4 backend; Spaces is active store; separate R2 copy is backup. | Code tests, object hashes, restore drill |
| Data runner | Migrations first, then apps/api/scripts/deployment/run-data-operations.mjs. | Plan, checkpoints, state/input digests |
| Baselines | 37,379 accepted schools; 47 counties; 209 subjects; 833 strands; 4,341 topics; zero duplicates. | Execution-time immutable-release reports |
| QuizBank | Workspace observation: 13,867 questions across 138 cells; exact immutable-release count is required. | Validator/import/import-state output |
| Release | Freeze automatic main deploy until target is ready; reconcile dirty tree and pin release. | Clean review, exact SHA, CI evidence |
| Rollback | Previous validated DigitalOcean release or restoring the new clean DB; never inaccessible Hetzner. | Recovery point and rehearsal |
| Repository identity | Current folder is D:\\APP BACKUPS\\KITABU\\kitabu-ai-progressive-release and origin is https://github.com/astraquest/Kitabu.git. Desired repository is astraquest/ai.kitabu.app, with a fresh sibling clone ending in ai.kitabu.app. Never rename the active workspace in place. | Local inventory, GitHub rename approval, new-clone SHA/status/remotes |

### Unresolved decision gates

| Gate | Owner | Stop condition | Resolution |
| --- | --- | --- | --- |
| GATE-IOS-IDENTITY | Apple/product owner | Apple state contradicts alignment or shows a live/submitted existing ID. | Record ALIGN to ai.kitabu.app or reviewed alternative |
| GATE-PAYMENTS | Product/legal/store owner | Store policy or M-Pesa/external-payment posture is unreviewed. | Record policy decision before enablement |
| GATE-TUNNEL-CHANGE | Cloudflare owner | Full live config cannot be exported/versioned/restored. | Obtain authorized access or stop |
| GATE-DATA-BASELINE | Data owner | Any count/duplicate/county acceptance fails. | Repair in separate task and rerun |
| GATE-CREDENTIALS | Security/platform owner | Credential missing, unscoped, or would require committing a secret. | Provision through approved secret systems |

### Approval classes

- Code/repository: edits and tests in this repository; review and CI remain mandatory.
- Configuration: non-secret environment or deployment config; record redacted before/after.
- Paid/external: DO, Spaces/R2, Cloudflare, Google/Apple/Expo, stores, AppsFlyer, Sentry,
  M-Pesa, SMTP, or production state; named owner approves immediately before execution.
- Destructive/recovery: DB cleanup, cutover, rollback, or restore; requires recovery point first.

## 2. Current-state evidence table

| Area | Current evidence or implication | Repository path |
| --- | --- | --- |
| Android package | Expo config and generated Gradle use the old package. | native-app/app.config.js; native-app/android/app/build.gradle |
| iOS package | Config and Xcode project use ai.kitabunative.app; release status requires Apple check. | native-app/app.config.js; native-app/ios/KitabuNativeApp.xcodeproj/project.pbxproj |
| Android shrinking | R8 optimized resource shrinking is configured; exact release proof remains required. | native-app/android/gradle.properties; native-app/android/app/build.gradle |
| OAuth drift | app.config.js resolves env/Gradle/default values; current Android property and defaults differ. | native-app/app.config.js; native-app/android/gradle.properties; apps/api/src/config.ts |
| API identity | API defaults and Asset Links assertions use the old package/fingerprint set. | apps/api/src/config.ts; apps/api/src/server.ts; apps/api/src/legalPages.test.ts; .github/workflows/deploy-api.yml |
| Website/store URLs | Source, generated, legal, and download pages contain the old Play URL. | apps/web/build/build-pages.mjs; apps/web/index.html; apps/web/download/index.html; apps/web/privacy/index.html; apps/web/policy/index.html; apps/web/terms/index.html; apps/web/deletion/index.html |
| Mail/Sentry | Mailer links and native/API release naming contain old identity. | apps/api/src/mailer.ts; apps/api/src/mailer.test.ts; native-app/src/observability/sentry.ts; native-app/__tests__/sentry.test.ts; .github/workflows/native-release-observability.yml |
| DO guide | Current guide incorrectly describes A-record pointing and automatic SQL initialization. | DEPLOY_DIGITALOCEAN.md |
| Compose | Loopback binds are directionally safe; provider/shared volume and Caddy assumptions need target review. | docker-compose.yml |
| Caddy | Required public routes exist, but unrelated/shared hosts and old Hetzner IP are present. | infra/Caddyfile |
| Backup | Local compressed DB/reference archives and retention exist; encryption, off-server upload, locking, and restore drill do not. | infra/backup.sh; docs/RUNBOOK.md |
| Asset storage | Supported backends are local, http-put, and supabase; SigV4 backend is absent. | apps/api/src/educationalAssets/storage.ts; apps/api/src/educationalAssets/service.ts; apps/api/sql/086_educational_asset_storage_backends.sql; apps/api/sql/093_educational_asset_supabase_storage.sql |
| Data runner | Hashes inputs, dependencies, plans migrations, executes operations, and checkpoints state. | apps/api/scripts/deployment/run-data-operations.mjs; apps/api/scripts/deployment/run-data-operations.test.mjs |
| School catalog | Manifest records 37,379 accepted schools; acceptance expects 47 counties. | apps/api/data/school-directory/manifest.json; apps/api/scripts/schools/import-school-catalog.mjs |
| Curriculum | KEN/CBC normalized sources and validation reports exist for grades 1–12. | apps/api/data/curriculum/KEN/CBC; apps/api/scripts/curriculum |
| QuizBank | Manifest, validator, and importer exist; exact release count must be recorded. | apps/api/data/quiz-bank/manifest.json; apps/api/scripts/quiz-bank |
| CI/deploy | SSH deploy workflow has immutable staging and data guards but a stale Hetzner step. | .github/workflows/deploy-api.yml |
| Worktree | Creation-time status was dirty with modified data/scripts and untracked temp/release content. | git status --short at execution |
| Repository | Local workspace path and origin are known; repository rename and fresh clone have not been performed by this runbook. | Current local path, origin, exact SHA, branch/PR/tag/release/issues/settings inventory |

## 3. Target architecture

~~~text
Users and store builds
        |
Fresh verified sibling clone: D:\\APP BACKUPS\\KITABU\\ai.kitabu.app
        |  exact approved SHA; origin https://github.com/astraquest/ai.kitabu.app.git
Cloudflare DNS + WAF + existing remotely managed Tunnel
        |  public names unchanged; no public A-record cutover
DigitalOcean Reserved IP / Ubuntu 24.04 Droplet
        |
  Caddy (Kitabu-only routes)
    |--> kitabu.ai/www       static website
    |--> admin.kitabu.ai     static admin
    \`--> app.kitabu.ai       API
          |--> private Postgres
          |--> private Redis
          \`--> worker
                \`--> DigitalOcean Spaces (S3/SigV4 active assets)
                \`--> encrypted checksummed backup --> separate Cloudflare R2
~~~

Use the recommended 8 GiB/4 vCPU Droplet unless a capacity decision changes it. Postgres,
Redis, and API must not listen publicly. Caddy must not claim unrelated hosts or an old
provider IP. The remotely managed Tunnel is authoritative; any edit is a whole ordered-list
replacement that preserves every existing rule and the final http_status:404 catchall.

## 4. Strict operating/update protocol

One task at a time is the default. Parallel work is allowed only when an owner records that
tasks share no files, state, credentials, or acceptance dependency.

Use only these statuses: TODO, IN_PROGRESS, BLOCKED, DONE.

Every update must contain:

~~~text
Task ID: [stable ID]
Status: TODO | IN_PROGRESS | BLOCKED | DONE
Owner: [person/agent]
Session: [session/run ID]
Date: [YYYY-MM-DD; timezone]
Prerequisites: [IDs]
Release identity: [exact commit SHA / image digest / AAB version]
Evidence: [path, URL, command output, or console change reference]
Blocker or decision: [none or exact blocker]
Next action: [one action]
~~~

Rules:

1. Claim only the task or append-only log entry you own; never overwrite another owner.
2. DONE requires evidence satisfying that task’s acceptance criteria.
3. BLOCKED names the exact missing approval, credential, state, or test.
4. Use immutable commit SHA, CI run, image digest, AAB version code, and mapping hash.
5. Redact all secrets and personal data. Record names/scopes/locations, never values.
6. Never paste OAuth IDs, signing fingerprints, private keys, tokens, passwords, webhook secrets,
   M-Pesa credentials, SMTP credentials, or google-services.json.
7. External/paid/destructive actions require the named approval immediately before execution.
8. Preserve historical artifacts and classify old-identity hits instead of rewriting them.
9. Append a handoff/change-log entry at each phase; correct history only by dated correction.
10. If evidence conflicts with this document, stop at the relevant gate.
11. Package, infrastructure, and deployment tasks may not proceed from an unverified clone; they
    require REPO-007 evidence. The active workspace remains untouched/read-only until acceptance.

## 5. Master phase checklist

All items start TODO. Replace evidence slots only with execution evidence.

| ID | Task | Type | Dependencies | Status | Acceptance/evidence slot |
| --- | --- | --- | --- | --- | --- |
| REPO-001 | Record current local path, origin, exact SHA, branches/PRs/tags/releases/issues/settings, and dirty-tree state | read-only | PRE-001 | TODO | Redacted inventory and exact SHA |
| REPO-002 | Reconcile/commit/push intended work before identity change (execution requires production-deployment skill) | code/release | PRE-004 | TODO | Approved commit/push evidence; skill gate recorded |
| REPO-003 | Confirm ai.kitabu.app availability and obtain org-admin approval | external/decision | REPO-001 | TODO | Availability check and approval |
| REPO-004 | Audit old repo/path references across code/docs/workflows/badges/submodules/packages/registries/webhooks/keys/consoles | code/audit | REPO-001 | TODO | Classified reference report |
| REPO-005 | Rename existing astraquest/Kitabu to astraquest/ai.kitabu.app; do not create unrelated duplicate | external | REPO-002, REPO-003 | TODO | Rename audit/change reference |
| REPO-006 | Verify renamed repo settings, collaborators, protections, environments, secrets/variables, webhooks, deploy keys, releases, issues/PRs, packages/GHCR, security, and automation | external/audit | REPO-005, REPO-004 | TODO | Post-rename verification |
| REPO-007 | Fresh sibling clone at D:\\APP BACKUPS\\KITABU\\ai.kitabu.app; verify origin, exact SHA, status, submodules/LFS, dependencies/tests | code/release | REPO-006 | TODO | Clean clone and test evidence |
| REPO-008 | Update deployment-host clone/remotes and canonical references only after fresh-clone acceptance | config/release | REPO-007 | TODO | Host/remotes/reference evidence |
| REPO-009 | Retain old local folder untouched/read-only; archive/remove only under later explicit destructive approval | decision/recovery | REPO-007 | TODO | Retention and later approval record |
| PRE-001 | Name owners, approvers, on-call, and open log | coordination | — | TODO | Owner/session/start time |
| PRE-002 | Freeze automatic main deployment | external/config | PRE-001 | TODO | Workflow/control evidence |
| PRE-003 | Reconcile dirty tree without discarding edits; pin SHA | code/release | PRE-001 | TODO | Clean status/review/exact SHA |
| PRE-004 | Inventory release, backups, DNS, Tunnel, and inaccessible Hetzner | read-only | PRE-001 | TODO | Redacted inventory |
| PRE-005 | Approve clean rebuild/no user restore | decision | PRE-004 | TODO | Explicit approval |
| ID-001 | Change active Android package to ai.kitabu.app | code | PRE-003, REPO-007 | IN_PROGRESS | app.config.js + build.gradle updated; signed-build evidence pending |
| ID-002 | Resolve iOS alignment gate | external/decision | PRE-004 | TODO | Apple evidence/decision |
| ID-003 | Register web/Android/iOS OAuth; package plus SHA-1 | external | ID-001, ID-002 | TODO | Console and redacted config |
| ID-004 | Reconcile API KITABU_GOOGLE_CLIENT_IDS | code/config | ID-003 | IN_PROGRESS | In-repo drift aligned (app.config.js default = gradle.properties); console registration external |
| ID-005 | Test real Play-signed Google sign-in | external/test | ID-003, APP-003 | TODO | Internal Testing device |
| ID-006 | Capture exact new Play SHA-256; update Asset Links | external/code | APP-003 | TODO | Exact console/served JSON/device |
| ID-007 | Decide temporary legacy Asset Links statement/expiry | decision | ID-006 | TODO | Decision/removal date |
| ID-008 | Replace active old refs in native/API/website/generated/docs/workflows/mailer/Sentry | code | ID-001, ID-002 | IN_PROGRESS | Active refs replaced except iOS bundle (GATE-IOS-IDENTITY) and repo-name refs (REPO-005) |
| ID-009 | Add package/release assertions/tests | code | ID-008 | TODO | CI/test output |
| INFRA-001 | Provision DO Ubuntu 24.04, plan, Reserved IP, monitoring, daily backups | paid/external | PRE-005, REPO-007 | TODO | Resource/policy evidence |
| INFRA-002 | Harden SSH/firewall; verify no public DB/Redis/API | external/config | INFRA-001 | TODO | Firewall/listeners/probes |
| INFRA-003 | Install pinned host dependencies and baseline hardening | config | INFRA-002 | TODO | Version/hardening output |
| INFRA-004 | Make Compose Kitabu-specific, private, identity-bound, digest-pinned where feasible | code/config | INFRA-003 | IN_PROGRESS | Healthchecks added for all five services; loopback binds kept; digest pinning deferred (unverifiable offline) |
| INFRA-005 | Make Caddy Kitabu-specific; remove old IP/unrelated hosts | code/config | INFRA-004 | IN_PROGRESS | Caddyfile reduced to kitabu.ai/www/app/admin; unrelated hosts and 138.201.244.183 removed; edge activation deferred to cutover |
| INFRA-006 | Stage website/admin/API from exact release | release | PRE-003, INFRA-004 | TODO | Content hashes/SHA |
| CF-001 | Export full remote Tunnel config/version and DNS | paid/external | PRE-004, INFRA-005 | TODO | Full redacted export |
| CF-002 | Review WAF, DNS, email DNS, no-A-record plan | paid/external | CF-001 | TODO | Record matrix |
| CF-003 | Merge target route into complete ordered ingress/catchall | paid/external | CF-001, INFRA-005 | TODO | Whole-list preservation diff |
| CF-004 | Verify connector version and all protected hostnames externally | test | CF-003, DEPLOY-004 | TODO | Logs/probes |
| DATA-001 | Provision Spaces and independent R2 bucket/policies | paid/external | INFRA-001, PRE-005 | TODO | Resources/policies |
| DATA-002 | Implement SigV4 backend alongside existing backend contract | code | PRE-003 | TODO | Unit/contract tests |
| DATA-003 | Configure Spaces and migrate/verify assets | code/config | DATA-001, DATA-002 | TODO | Object inventory/hashes |
| DATA-004 | Add encrypted checksum R2 upload, retention, lock | code | DATA-001 | TODO | Script/test/R2 evidence |
| DATA-005 | Execute isolated DB/assets/reference restore drill | recovery | DATA-004 | TODO | Checksums/counts/timing |
| DATA-006 | Review clean migration and known-seed cleanup plan | code/data | PRE-005 | TODO | Script/allowlist review |
| DATA-007 | Fresh migrations then deterministic data operations | destructive/data | DATA-006, DEPLOY-003 | TODO | Ledger/plan/checkpoints |
| DATA-008 | Validate schools, curriculum, QuizBank/counties/duplicates | data/test | DATA-007 | TODO | Immutable-release reports |
| DATA-009 | Targeted seed cleanup; zero-user assertion; one owner bootstrap | destructive | DATA-007, DATA-008 | TODO | Before/after queries/audit |
| DEPLOY-001 | Retarget CI to DO; preserve drift/mutation guards | code | INFRA-004, PRE-003, REPO-007 | IN_PROGRESS | Hetzner step renamed to DigitalOcean activation; assetlinks assertion updated to ai.kitabu.app; host retarget requires secrets/infra |
| DEPLOY-002 | Add immutable SHA/digest/package/fingerprint assertions | code | ID-006, DEPLOY-001 | TODO | CI identity binding |
| DEPLOY-003 | Build/review artifacts and reconcile release | release | PRE-003, DEPLOY-001 | TODO | CI pass/digests/clean SHA |
| DEPLOY-004 | Verified off-server pre-backup and post-backup | external/release | DEPLOY-003, DATA-004 | TODO | Backup IDs/checksums |
| DEPLOY-005 | Apply migrations/data/readiness on DO | destructive/release | DEPLOY-004, DATA-007 | TODO | Logs/state/health |
| DEPLOY-006 | Activate API/worker/Caddy; verify internal origin | release | DEPLOY-005, INFRA-005 | TODO | Compose/local checks |
| APP-001 | New Play listing, signing, testing, legal/Data Safety/policy | paid/external | ID-001, DEPLOY-003 | TODO | Play evidence |
| APP-002 | Apple registration/metadata if aligned | paid/external | ID-002, DEPLOY-003 | TODO | Apple evidence |
| APP-003 | Signed AAB; R8/shrinking; exact nonempty mapping | release | ID-001, DEPLOY-003, APP-001 | TODO | AAB/mapping hashes/sizes |
| APP-004 | Expo project/push/FCM credential audit; no committed google-services.json | external/config | ID-003, APP-001 | TODO | Credential-name evidence |
| APP-005 | AppsFlyer/Sentry/M-Pesa/SMTP/analytics audit | external/config | DEPLOY-003, GATE-PAYMENTS | TODO | Console/config tests |
| APP-006 | Internal Testing sign-in, links, push, Sentry, AppsFlyer | test | APP-003, APP-004, APP-005, ID-005 | TODO | Device matrix |
| CUTOVER-001 | Go/no-go review of all prerequisites and recovery | decision | CF-004, DATA-005, DATA-009, DEPLOY-006, APP-006 | TODO | Signed go/no-go |
| CUTOVER-002 | Controlled edge/origin activation; domains unchanged | external | CUTOVER-001 | TODO | Timestamp/tunnel/DNS |
| CUTOVER-003 | Public website/admin/API/legal/M-Pesa/email/origin tests | test | CUTOVER-002 | TODO | Public matrix |
| CUTOVER-004 | Admin schools/pagination/47 counties/filtering/real analytics | test | CUTOVER-003, DATA-008, DATA-009 | TODO | UI/API evidence |
| DR-001 | Capture final release/config/DNS/data/backup evidence bundle | ops | CUTOVER-003 | TODO | Bundle index |
| DR-002 | Confirm previous DO release and clean-DB recovery | recovery | DR-001, DATA-005 | TODO | Recovery evidence |
| DR-003 | Unfreeze automation after exact-main CI/deploy gates | external/release | CUTOVER-004, DR-002 | TODO | Approval/workflow |
| DR-004 | Final DoD review and operational handoff | coordination | DR-003 | TODO | All applicable IDs DONE |

## 6. Detailed phase procedures

### PRE — control and inventory

1. Name migration, code, data, Cloudflare, DO, store, security, and rollback owners.
2. Freeze automatic main deploy before package, DNS, Tunnel, or production-data changes.
3. Record Git status, deployed SHA/digests, migration ledger, backup inventory/checksums, full
   Tunnel/DNS export, and that old Hetzner is inaccessible. Never print environment values.
4. Reconcile the dirty tree through review/merge; never reset, checkout, delete, or overwrite
   user/agent work. Pin one exact reviewed SHA.
5. Obtain explicit clean-rebuild approval.

Safe read-only templates:

~~~bash
git status --short --untracked-files=all
git log -1 --format='%H %cI %s'
git diff --stat
git diff --name-only
~~~

### REPO — controlled repository rename and fresh clone

This phase is a controlled repository-identity change, not an in-place workspace rename and not a
new unrelated repository. Current evidence is the local folder
D:\APP BACKUPS\KITABU\kitabu-ai-progressive-release with origin
https://github.com/astraquest/Kitabu.git. The desired GitHub repository is
https://github.com/astraquest/ai.kitabu.app.git and the desired fresh sibling local clone is
D:\APP BACKUPS\KITABU\ai.kitabu.app. These are desired/recorded identities, not claims that
the rename or clone has already occurred.

1. REPO-001: record the current absolute local path, origin URL, exact HEAD SHA, default and
   active branches, open PRs/issues, tags/releases, branch rules/protections, environments,
   Actions secrets/variables (names only), collaborators/teams, webhooks, deploy keys, packages/
   GHCR, security settings, submodules/LFS, and dirty/untracked state. Redact values and tokens.
2. REPO-002: reconcile and review all intended current work before the identity change. Commit and
   push only after the production-deployment skill has been loaded and its required lane/gates
   followed. This runbook documents that gate; it does not execute Git actions.
3. REPO-003: confirm the target name is available and obtain org-admin approval. Do not proceed
   if the name is unavailable or approval is missing.
4. REPO-004: audit references to astraquest/Kitabu and absolute kitabu-ai-progressive-release
   paths in source, docs, workflows, badges, submodules, package metadata, container registries,
   webhooks, deploy keys, scripts, generated content, and external consoles. Classify each hit
   as active, historical, or intentionally retained.
5. REPO-005: rename the existing GitHub repository astraquest/Kitabu to
   astraquest/ai.kitabu.app. Preserve the existing repository, issues, PRs, settings, and history;
   do not create an unrelated duplicate. GitHub normally redirects web and Git operations from
   the old name, but GitHub Pages URLs and calls to an Action hosted at the old repository do
   not redirect. Do not reuse the old repository name while redirects are still needed. Follow
   the official procedure/reference:
   https://docs.github.com/en/enterprise-cloud@latest/repositories/creating-and-managing-repositories/renaming-a-repository
6. REPO-006: after rename, independently verify settings, collaborators/teams, branch rules and
   protections, environments, Actions secrets/variables (names/scopes only), webhooks, deploy
   keys, releases, issues/PRs, packages/GHCR, security settings, repository automation, and
   required external integrations. Verify old/new URLs, not just a browser redirect.
7. REPO-007: only after REPO-006, create a fresh sibling clone at
   D:\APP BACKUPS\KITABU\ai.kitabu.app from the new URL. Do not copy .git, untracked files,
   generated/temp artifacts, local env files, keys, or credentials. Set and verify origin as the
   new URL, checkout the exact approved SHA, verify clean status, submodules/LFS if present,
   install dependencies using the repository package-manager convention, and run the applicable
   checks/tests. Package, infrastructure, and deployment implementation cannot proceed from any
   clone until this evidence is accepted.
8. REPO-008: after fresh-clone acceptance, update deployment-host clone/remotes and canonical
   references. Update active references only after verification; preserve historical release
   artifacts and old local workspace evidence.
9. REPO-009: keep the old local folder untouched/read-only until new-clone and release-workflow
   acceptance. Archive/remove it only after a later explicit destructive approval; never rename
   the active workspace in place.

Rollback/recovery: if rename verification or clone checks fail, stop, retain the old local folder,
and use GitHub’s supported redirect/recovery path or the captured old remote state. Do not create
a second repository to bypass a failed rename and do not delete the old folder.

### ID — identity, OAuth, Asset Links, and references

Change active native, generated Android, API config/tests, Asset Links, website/generated pages,
mailer, Sentry, workflow, and current-doc references. First classify every search hit as active,
test fixture, or immutable historical artifact.

~~~bash
rg -n --hidden --glob '!node_modules/**' --glob '!native-app/tmp/**' --glob '!release-artifacts/**' 'ai\.kitabu2\.twa|ai\.kitabunative\.app|play\.google\.com/store/apps/details\?id=|assetlinks|applicationId|bundleIdentifier' native-app apps .github docs infra DEPLOY_DIGITALOCEAN.md docker-compose.yml
~~~

Google OAuth:

1. In the approved Google Cloud project, create/confirm web, Android, and iOS clients.
2. Register the new Android package and every real SHA-1 used by development, Internal Testing/
   Play App Signing, and approved release channels. Do not infer Play signing from local keys.
3. Review consent screen, origins, redirects, scopes, test users, and ownership.
4. Reconcile client-ID drift between app.config.js and android/gradle.properties.
5. Set API KITABU_GOOGLE_CLIENT_IDS to exactly the approved production audiences.
6. Test with the Play-signed Internal Testing artifact on a clean device; verify token
   issuer/audience and API session. A debug build is insufficient.

Asset Links:

1. Copy the exact SHA-256 certificate from Play Console after new App Signing is configured.
   Record it in approved evidence; never guess or fabricate it.
2. Update API route/config/tests/deploy assertions for ai.kitabu.app and that certificate; retain
   the required login-credential relation.
3. Add a legacy statement only if ID-007 approves a bounded reason, owner, and expiry/removal task.
4. Verify external JSON/status/content type and app-link behavior from the signed install.

### INFRA — host, Compose, and Caddy

Provisioning is paid external work requiring approval. Use Ubuntu 24.04, recommended Basic
8 GiB/4 vCPU, Reserved IP, monitoring, and daily backups. Record resource IDs and policy.

~~~bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin openssl
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
~~~

Harden SSH, restrict it to approved sources, disable password SSH where policy allows, and apply
security updates. Allow no public Postgres, Redis, or API ports. Use break-glass access.

Compose requirements:

- private Postgres/Redis and local/internal API binds;
- API/worker/Caddy carry exact release SHA/digest;
- only approved website/admin trees and Kitabu Caddyfile mounted;
- named volumes documented as runtime state, never as backups;
- health checks for API, worker, Postgres, Redis, and Caddy;
- digest-pin images where the build system supports it.

~~~bash
docker compose config --quiet
docker compose config
docker compose ps
~~~

Caddy must serve only kitabu.ai/www, admin.kitabu.ai/admin, app.kitabu.ai/API, required legal
redirects, and security headers. Remove old Hetzner IP and unrelated shared hosts. Validate
locally before edge exposure. Stage content from exact SHA and regenerate pages from reviewed
source.

### CF — DNS, WAF, and Tunnel

Cloudflare state changes require owner approval. Export the complete remotely managed Tunnel
configuration/version and all DNS records before editing. Include every ordered ingress rule,
service, hostname, path rule, and final http_status:404 catchall. Preserve MX, SPF, DKIM, DMARC,
and other email records.

Safe whole-list sequence:

1. GET/export live config/version.
2. Stop if it changed since the last review.
3. Merge approved route into the complete ordered list.
4. Assert no hostname/service pair disappeared and catchall remains.
5. Refuse stale writes when live version/list changed.
6. PUT the complete merged list.
7. Wait for connector adoption.
8. Probe every existing protected hostname plus apex/www/app/admin externally.
9. Restore the captured full config if a prior route regresses.

Do not delete/recreate DNS records to repair ingress. A future dedicated Kitabu Tunnel is optional,
not part of initial cutover.

### DATA — assets, backup, and clean DB

Provision Spaces for active assets and a separate R2 bucket/account for backups with least
privilege. Runtime credentials may access only the required Spaces prefix; backup credentials
write to R2 and are not public API credentials.

Add an S3-compatible SigV4 backend to the educational-asset contract while retaining local,
http-put, and Supabase paths for tests/approved transfer. Define endpoint, region/signing,
bucket/prefix, content type, cache/public-read behavior, retries, timeouts, key safety, and
metadata/hash behavior. Test put/get/delete and migration/read compatibility.

Extend backup to:

- produce a consistent DB dump and required reference/assets manifest;
- encrypt before leaving host;
- emit file names, sizes, and SHA-256 checksum manifest;
- upload encrypted artifacts and manifest to R2;
- lock overlapping runs and clean temp files;
- enforce local/remote retention without deleting newest known-good point;
- fail on upload/checksum/restore verification errors;
- log only secret-free IDs, dates, sizes, and hashes.

Run an isolated restore of DB, assets, and reference library. Verify schema, counts, object hashes,
readability, and application startup. An upload is not a restore test; Spaces is not backup.

Clean database:

1. Create a new empty production DB; capture empty-state evidence; do not restore old SQL users.
2. Apply repository migrations in order. Historical seed migrations remain immutable.
3. Run plan then apply for run-data-operations.mjs, recording operation/input/state digests,
   checkpoints, release SHA, and completion times.
4. Import school catalog; require 37,379 accepted schools unless a reviewed manifest changed,
   all 47 counties, and correct admin pagination/filtering.
5. Validate curriculum: 209 subjects, 833 strands, 4,341 topics, zero duplicates.
6. Validate/import QuizBank and record exact immutable-release count/cell coverage. The workspace
   observation was 13,867 questions across 138 cells, not an execution result.
7. Query users without exposing secrets or unnecessary PII. Run targeted cleanup naming only known
   seed identities; never blanket-delete unexpected users.
8. Assert zero users; perform secure one-time real platform-admin bootstrap; assert one real owner.
9. Take and verify post-bootstrap off-server backup.

Template sequence (adapt only after review; placeholders are not values to commit):

~~~bash
docker compose run --rm -T api node scripts/apply-migrations.mjs
docker compose run --rm -T api node scripts/deployment/run-data-operations.mjs --plan
docker compose run --rm -T api node scripts/deployment/run-data-operations.mjs --apply
~~~

### DEPLOY — immutable release

Retarget the GitHub workflow to DO, rename the stale Hetzner step, and preserve drift refusal,
immutable staging, migration/data ordering, mutation guards, readiness checks, and post-start
assertions. Update package and Asset Links assertions.

Required controls:

- automatic main deploy frozen until go/no-go;
- clean reviewed SHA, never a dirty checkout;
- CI-built digest-pinned images where practical;
- verified off-server pre-backup before mutations and post-backup after;
- API/worker/Caddy report same release identity;
- previous validated DO release and clean-DB restore path documented;
- rollback never targets inaccessible Hetzner.

Repository checks:

~~~bash
npm ci
npm run check
npm run build
npm run validate:quiz-bank -w apps/api
npm run test:api
npm run typecheck:native
npm run lint:native
npm run test:native
npm run readiness:production
~~~

Run all represented curriculum validators and save output tied to exact SHA. If a check cannot
run, mark BLOCKED or document the untested boundary; never mark DONE by assumption.

### APP — stores, credentials, and mobile acceptance

In Play Console, create a new ai.kitabu.app listing, configure Play App Signing/Internal Testing,
Data Safety, target audience, privacy/account deletion, store metadata, and policy review. Do
not select an update to the old listing. Payment policy is a gate before enabling M-Pesa/external
payments.

If Apple gate aligns, configure ai.kitabu.app in Apple Developer, provisioning, push, TestFlight,
and metadata. Otherwise retain the valid Apple identity and update all downstream surfaces using
the recorded decision.

Build AAB from exact SHA and verify manifest package, intended signing, R8 minification,
resource shrinking, non-empty mapping.txt, AAB/mapping SHA-256 and sizes, exact build
correspondence, retention beside AAB, and upload of that mapping with that AAB. A compatibility
exception must be approved and documented before release.

Audit Expo project/push/FCM/APNs credentials. Never commit or fabricate google-services.json.
Audit AppsFlyer, Sentry, M-Pesa, SMTP, and analytics through approved systems.

On a clean Play Internal Testing device verify Google sign-in, app/deep links, push delivery,
Sentry new release, AppsFlyer attribution, API auth, email verification/reset, legal links,
and payment behavior only after policy/config approval.

### CUTOVER and DR

Go/no-go requires exact SHA/digests, package/OAuth/Asset Links, approved iOS/payment decisions,
hardened DO, Kitabu Caddy/Compose, full Tunnel export/merge plan, tested R2 restore, clean DB
counts, one owner, signed AAB mapping evidence, and verified pre-backup.

Keep automation frozen. Activate exact DO API/worker/Caddy release, apply approved full Tunnel
merge, do not mutate public A records, and verify connector adoption. Then run public website,
admin, API, legal, email, M-Pesa, origin-isolation, and admin analytics tests.

Capture a final evidence bundle. On failure, freeze changes and preserve logs. Application-only
failure may roll back to previous validated DO release if schema-compatible. Data failure uses
verified clean-DB/assets restore, then reruns readiness. Never return to Hetzner.

## 7. Environment and secret inventory (names only)

Values belong in approved secret stores/provider consoles. This file records names only.

### Runtime, release, database, and host

KITABU_RUNTIME_ENV, KITABU_NODE_ENV, KITABU_TRUST_PROXY, KITABU_RELEASE_VERSION,
KITABU_RELEASE_SHA, KITABU_API_BASE_URL, KITABU_ADMIN_WEB_ORIGIN, KITABU_ADMIN_WEB_BASE_URL,
KITABU_LANDING_WEB_BASE_URL, KITABU_WEB_APP_ORIGINS, KITABU_NATIVE_APP_ORIGIN,
KITABU_PASSWORD_RESET_URL, KITABU_EMAIL_VERIFICATION_URL, KITABU_DATABASE_URL,
KITABU_POSTGRES_USER, KITABU_POSTGRES_DB, KITABU_POSTGRES_PASSWORD, KITABU_REDIS_URL,
KITABU_COMPOSE_DIR, KITABU_BACKUP_DIR, KITABU_REFERENCE_LIBRARY_DIR,
KITABU_DATA_OPERATION_MEMORY_BUDGET_MIB, KITABU_ALLOW_DESTRUCTIVE_MIGRATIONS, deploy SSH user/key/
known-host names, and DO resource/firewall/monitoring identifiers.

### Auth and mobile

KITABU_JWT_PRIVATE_KEY, KITABU_JWT_PUBLIC_KEY, KITABU_GOOGLE_CLIENT_IDS,
KITABU_GOOGLE_WEB_CLIENT_ID, KITABU_GOOGLE_ANDROID_CLIENT_ID, KITABU_GOOGLE_IOS_CLIENT_ID,
KITABU_GOOGLE_REDIRECT_URI, KITABU_ANDROID_PACKAGE_NAME,
KITABU_ANDROID_SHA256_CERT_FINGERPRINTS, KITABU_APP_DEEP_LINK_BASE, Expo project ID,
Play/Apple signing/provisioning names, FCM/APNs credential names, and OAuth console resource names.

### Spaces, R2, and assets

KITABU_EDUCATIONAL_ASSET_STORAGE_BACKEND, KITABU_EDUCATIONAL_ASSET_STORAGE_BUCKET,
KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT, KITABU_EDUCATIONAL_ASSET_STORAGE_UPLOAD_URL_TEMPLATE,
KITABU_SPACES_ENDPOINT, KITABU_SPACES_REGION, KITABU_SPACES_BUCKET, KITABU_SPACES_ACCESS_KEY,
KITABU_SPACES_SECRET_KEY, KITABU_R2_ENDPOINT, KITABU_R2_BUCKET, KITABU_R2_ACCESS_KEY,
KITABU_R2_SECRET_KEY, backup encryption key name, and retention/lock names.

### Providers and observability

KITABU_OPENAI_API_KEY, KITABU_GEMINI_API_KEY, KITABU_DEEPSEEK_API_KEY,
KITABU_GROQ_API_KEY, KITABU_NVIDIA_API_KEY, KITABU_CARTESIA_API_KEY,
KITABU_TTS_STORAGE_BACKEND, KITABU_TTS_STORAGE_UPLOAD_URL_TEMPLATE, KITABU_MPESA_ENV,
KITABU_MPESA_CONSUMER_KEY, KITABU_MPESA_CONSUMER_SECRET, KITABU_MPESA_SHORTCODE,
KITABU_MPESA_PASSKEY, KITABU_MPESA_CALLBACK_URL, KITABU_SMTP_HOST, KITABU_SMTP_PORT,
KITABU_SMTP_USER, KITABU_SMTP_PASS, KITABU_MAIL_FROM, KITABU_TRANSACTIONAL_MAIL_FROM,
KITABU_SENTRY_DSN, KITABU_APPSFLYER_DEV_KEY, KITABU_POSTHOG_KEY, KITABU_POSTHOG_HOST,
KITABU_META_PIXEL_ID, KITABU_META_CAPI_ACCESS_TOKEN, KITABU_TIKTOK_PIXEL_CODE,
KITABU_TIKTOK_EVENTS_ACCESS_TOKEN, KITABU_GA4_MEASUREMENT_ID, KITABU_GA4_API_SECRET,
KITABU_AFRICASTALKING_USERNAME, KITABU_AFRICASTALKING_API_KEY,
KITABU_AFRICASTALKING_SENDER_ID, and Mufasa telemetry secret names.

### External systems

Current local path, GitHub origin/target repository URLs, repository rename approval/change
reference, fresh-clone path, and deployment-host clone/remotes (names/URLs only); DigitalOcean
account/project/resource names; Cloudflare account/zone/Tunnel IDs; GitHub repository/environment/secret names; Google Cloud project/OAuth client names; Play app/signing/
track/service-account names; Apple Developer/App Store/Team identifiers; Expo/EAS project and
credential names; AppsFlyer, Sentry, M-Pesa, SMTP, analytics, Spaces, and R2 resource names.


## 8. Release acceptance matrix

Record PASS, FAIL, or BLOCKED, exact release identity, operator/date, and evidence for every row.
A PASS must be reproducible.

| Area | Test | Required result |
| --- | --- | --- |
| Repo | check/build/API/native type/lint/tests/readiness | Pass on reviewed SHA |
| Worktree | status/review reconciliation | Clean pinned release |
| Repository | current/target identities, rename, references, and fresh clone | Old repo preserved until acceptance; new clone has exact approved SHA, new origin, clean status, and passing checks |
| Android | signed AAB manifest and listing | ai.kitabu.app, new listing |
| Shrinking | release build settings/output | R8/resource shrinking or approved exception |
| Mapping | AAB/mapping metadata, SHA-256, size | Nonempty mapping from exact AAB, uploaded together |
| iOS | Apple state/build setting | Aligned or documented alternative |
| OAuth | clients, package+SHA-1, consent, API allowlist | Correct; Play-signed sign-in passes |
| Asset Links | external JSON and device link | New package, exact Play SHA-256, relation |
| Active refs | scoped search | No unintended old current refs; historical preserved |
| Website/admin/API | public HTTPS and auth/legal smoke | Correct exact-SHA content and healthy routes |
| Origin | firewall, binds, external probes | No public DB/Redis/API |
| Caddy | validation and route table | Kitabu hosts only; no old IP/unrelated hosts |
| Tunnel/DNS | full export/version and probes | All routes preserved; catchall/email/domains intact |
| Spaces | SigV4 put/get/delete and metadata | Active path works, least privilege |
| R2 | encrypted upload/checksum/retention/lock | Independent verified copy |
| Restore | isolated DB/assets/reference restore | Counts/checksums/startup pass |
| Data | migrations/plan/checkpoints/state | Deterministic release-bound completion |
| Schools | catalog/admin query | 37,379 baseline or reviewed manifest; all 47 counties; pagination/filter |
| Curriculum | canonical count/duplicate report | 209/833/4341 and zero duplicates |
| QuizBank | validator/import/database | Exact immutable count recorded; observation 13,867/138 |
| Users | cleanup/bootstrap | Zero before bootstrap; one real owner after |
| Mobile | push, Sentry, AppsFlyer | New identity and delivery/telemetry pass |
| Payments/email | policy/M-Pesa and SMTP tests | Approved payment posture; mail flows pass |
| Recovery | pre/post backup and previous DO release | Verified points and owner |
| Analytics | real admin analytics | No demo/fixture analytics |

## 9. Final definition of done

The migration is complete only when every applicable checklist item is DONE with evidence; REPO-001
through REPO-009 are resolved with the required approvals/evidence; exact reviewed SHA/digests are
clean, CI-validated, deployed, and consistent; Android is a new
ai.kitabu.app listing with Play signing, R8/resource shrinking, exact mapping correspondence,
and Internal Testing sign-in; the iOS decision is recorded; OAuth and Asset Links pass; active
old references are removed while historical artifacts remain unchanged; DO is hardened and
Kitabu-specific; full Cloudflare ingress, email DNS, domains, and catchall are preserved; Spaces
works through SigV4 and encrypted independent R2 backups pass restore; clean data counts, 47
counties, zero duplicates, and one owner pass; public/admin/mobile/payment/email/analytics
acceptance passes; previous DO and clean-DB recovery paths are documented; and automation is
unfrozen only after exact-main CI/deployment monitoring gates pass.

## 10. Append-only execution log, handoff, and decision log

### Execution log entry template

Append; never delete prior entries.

~~~markdown
### [YYYY-MM-DD HH:MM TZ] — [Task ID] — [title]

- Status: TODO | IN_PROGRESS | BLOCKED | DONE
- Owner:
- Session/run ID:
- Approval class: code | configuration | paid/external | destructive/recovery
- Prerequisites:
- Release identity: SHA / CI run / image digest / AAB version
- Repository identity: current path/origin; renamed URL; fresh-clone path/origin/SHA/status
- Files or external systems changed:
- What changed and why:
- Commands/tests and exact outcomes:
- Console/API actions and references (no secret values):
- Evidence paths/URLs/checksum manifest:
- Untested areas:
- Residual risks:
- Blocker/decision:
- Next action and successor:
~~~

### Handoff template

~~~markdown
## Handoff: [from] -> [to] — [date/session]

Overall status: TODO | IN_PROGRESS | BLOCKED | DONE
Completed IDs:
Active ID:
Blocked IDs and exact blockers:
Exact release identity:
Verified recovery point:
Changed files/systems:
Commands/outcomes:
Approvals remaining:
Untested/residual risks:
Next single action and owner:
~~~

### Decision log template

~~~markdown
### DEC-[number] — [YYYY-MM-DD] — [title]

- Requester:
- Decider/approval:
- Related IDs:
- Options:
- Evidence:
- Decision:
- Scope/expiry:
- Rollback/reconsideration trigger:
- Follow-up task:
~~~

### Decisions to complete

| ID | Decision | Required record |
| --- | --- | --- |
| DEC-001 | Approve clean rebuild/no restored users | Product/security owner/date |
| DEC-009 | Approve existing GitHub repo rename and fresh sibling clone; do not rename active workspace | Org admin/repository owner/date |
| DEC-010 | Approve later archive/removal of old local folder, only after final acceptance | Destructive-action approver/date |
| DEC-002 | Resolve iOS identity gate | Apple evidence and ALIGN/alternative |
| DEC-003 | Approve Play listing and payment posture | Store/legal owner/policy evidence |
| DEC-004 | Approve full-list Tunnel reuse/no A-record cutover | Cloudflare owner/export/version |
| DEC-005 | Approve DO capacity/Reserved IP/monitoring/backups | Platform owner/resource evidence |
| DEC-006 | Approve Spaces active plus R2 backup | Data/security owner/policy evidence |
| DEC-007 | Approve seed cleanup allowlist/owner bootstrap | Security/data review |
| DEC-008 | Approve cutover and automation unfreeze | Go/no-go acceptance bundle |

### [2026-08-26] — ID-001, ID-004, ID-008, DEPLOY-001, INFRA-004, INFRA-005 — identity sweep and infra cleanup (code lane)

- Status: IN_PROGRESS
- Owner: ox-alpha (agent session)
- Session/run ID: opencode OCR/migration follow-up, 2026-08-26
- Approval class: code
- Prerequisites: user-approved deviation from rule 11 (code tasks executed in active workspace before REPO-007)
- Release identity: working tree on branch codex/admin-quizbank-production; commit recorded at execution
- Repository identity: D:\APP BACKUPS\KITABU\kitabu-ai-progressive-release; origin https://github.com/astraquest/Kitabu.git (unchanged)
- Files changed: native-app/app.config.js; native-app/android/app/build.gradle; native-app/src/observability/sentry.ts; native-app/__tests__/sentry.test.ts; apps/api/src/config.ts; apps/api/src/server.ts; apps/api/src/mailer.ts; apps/api/src/mailer.test.ts; apps/api/src/legalPages.test.ts; apps/api/.env.example; apps/web/index.html; apps/web/{download,privacy,policy,terms,deletion}/index.html; apps/web/build/build-pages.mjs; .github/workflows/deploy-api.yml; .github/workflows/native-release-observability.yml; docker-compose.yml; infra/Caddyfile; DEPLOY_DIGITALOCEAN.md; this file
- What changed and why: Android applicationId/package ai.kitabu2.twa -> ai.kitabu.app (ID-001); OAuth default drift aligned to gradle.properties client ID (ID-004); Play URLs, Asset Links package, mailer links, Sentry release naming, workflow assertions, and website store badges moved to ai.kitabu.app (ID-008); deploy step renamed off Hetzner and assetlinks assertion updated (DEPLOY-001); compose healthchecks for postgres/redis/api/worker/caddy (INFRA-004); Caddyfile reduced to Kitabu hosts only, old IP 138.201.244.183 and unrelated subdomains removed (INFRA-005); DO guide DNS section rewritten for Tunnel/no A-record cutover and false auto-SQL-init claim removed
- Commands/tests and exact outcomes: docker compose config --quiet OK; npm run check OK; npm run build OK; npm run test:api 274 pass / 0 fail / 1 skipped; npm run test:native 84 suites / 413 tests pass; npm run typecheck:native OK; rg sweep shows no active ai.kitabu2.twa refs outside gitignored dist (rebuilt clean) and historical docs/runbook text
- Console/API actions: none
- Untested areas: signed AAB build with new applicationId; real Play sign-in; live Caddy activation (deliberately deferred to cutover so the current shared host keeps serving unrelated subdomains until INFRA provisioning)
- Residual risks: pre-existing lint failure native-app/src/screens/TakeQuizScreen.tsx:243 (unused var) unrelated to this change blocks lint:native; new Play SHA-256 fingerprint still pending ID-006 (existing fingerprint retained as placeholder via env-overridable config); iOS bundleIdentifier intentionally unchanged pending GATE-IOS-IDENTITY; repo-name refs (infra/install-github-runner.sh) intentionally retained until REPO-005
- Blocker/decision: none for code lane; external gates unchanged
- Next action and successor: obtain REPO-002..REPO-007 approvals/evidence before any deploy-lane execution


