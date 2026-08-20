# Full-funnel analytics rollout checklist

This is the operational order for the Kitabu analytics contract. It is a
checklist, not an instruction to apply migrations or deploy from a developer
worktree.

## Dependency order

1. Confirm the public web configuration in `apps/web/analytics-config.js`:
   Meta Pixel `1385983863052002`, TikTok Pixel `DA31J43C77U41MKSOLRG`, and GA4
   Measurement ID `G-51LWM65FP4`. Google Ads remains blank until its public
   conversion ID and labels are deliberately configured.
2. Provision server-only values in the API runtime environment using the
   names in `apps/api/.env.example`: PostHog key/host, Meta CAPI token and
   pixel ID, TikTok Events API token and pixel code, and GA4 Measurement
   Protocol measurement ID/API secret. Never place these values in tracked
   files or client bundles.
3. Take and verify the normal database backup, then apply migrations in
   numeric order: `100_full_funnel_analytics.sql`,
   `101_analytics_consent_states.sql`, `102_analytics_delivery_leases.sql`,
   and `103_analytics_inactivity_state.sql`. These migrations are currently
   unapplied by this repository change; application belongs to the approved
   production migration process only.
4. Deploy the API and worker, then verify ingestion, consent synchronization,
   provider delivery/retry, M-Pesa authoritative lifecycle events, inactivity
   maintenance, and protected aggregate funnel retrieval. Provider failures
   must not fail auth, learning, payment, deletion, or worker loops.
5. Deploy the generated website pages and date-versioned analytics assets.
   Validate consent gating, browser event IDs, GA4 client/server dedupe, and
   that no server secret is present in the public output.
6. Release the native app only after its build environment supplies
   `KITABU_APPSFLYER_DEV_KEY` (or the explicitly equivalent public Expo build
   input). AppsFlyer uses manual start after eligible adult consent, strict
   kids mode, Purchase Connector disabled, and AD_ID blocked. Missing config
   must fail closed; no literal dev key belongs in source.

## Release gates and remaining work

- Run the web analytics contract test, API analytics tests/typecheck/build,
  migration static checks, and `git diff --check` before promotion.
- Confirm the live provider resources and event contracts in each provider
  console; this repository does not claim that a provider secret, migration,
  deployment, dashboard, or campaign is active merely because a public ID is
  configured.
- Verify consent and role policy after deployment: native student/unknown
  events remain first-party only; advertising receives only explicit
  marketing-consented adult/parent events and coarse grade bands.
- Complete dashboard/report setup and a bounded production smoke test after
  the API tables exist. Do not send real learner content, names, phone/email,
  raw identifiers, or payment credentials to providers.
