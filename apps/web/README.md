# kitabu.ai — marketing website

Static, multi-page site deployed as a Cloudflare-Pages-style app (folder routes
with `index.html`, flat `.html` blog files served with clean URLs, `_headers`
for caching/security). No framework, no build dependencies beyond Node.

## Architecture

| Piece | What it is |
|---|---|
| `index.html` | Homepage — **hand-authored**, edit directly |
| `build/build-pages.mjs` | Generator for **every other route** (persona pages, pricing, download, school demo form, authority pages, 7 SEO landings, blog posts, 404, sitemap.xml). Edit the page definitions in this file, then run `node apps/web/build/build-pages.mjs`. Never edit generated pages by hand — the next build overwrites them |
| `build/articles/*.mjs` | **One module per blog post** (default-exports an array of article definitions; auto-loaded by the build, auto-added to the sitemap). All new posts go here, not in `build-pages.mjs`. Supports an optional `faq: [[q, a], …]` field that renders a "Common questions" accordion + FAQPage schema. After adding a post, also add its card to the homepage `#blog` grid (hand-authored). Content rules live in `growth-machine/seo-content-strategy.md` (repo root) — length, structure, fact pack, compliance |
| `styles-20260811.css` | The entire design system (tokens, components, motion states). Date-stamped: cached immutable, so **rename with a new date** when you change it, and update `ASSET_CSS` in the build script + the homepage `<link>` |
| `site-20260704.js` | All behaviour: scroll reveals, split-text, counters, FAQ accordion, sticky header/bar, analytics events, school onboarding form. Same date-stamp rule (`ASSET_JS`) |
| `assets/fonts/*.woff2` | Self-hosted variable fonts (Bricolage Grotesque, Plus Jakarta Sans), latin subset, preloaded |
| `legal.css` | Shared, script-free design system for `/terms`, `/policy`, `/privacy`, and `/deletion`. The API image copies this file plus its allowlisted logo, favicon, and fonts so the Play-facing `app.kitabu.ai` routes render without depending on the marketing host |
| `styles.css` | Unreferenced legacy stylesheet from the previous legal-page design |
| `styles-20260619*.css`, `main.js` | Unreferenced legacy files from the previous site — safe to delete |

## Performance rules (Core Web Vitals budget: LCP < 2.5s on 3G, CLS < 0.1)

- Pure static HTML; zero render-blocking third-party scripts.
- Fonts: 2 woff2 files (~68 KB total), preloaded, `font-display: swap`.
- One CSS file + one JS file (deferred), both cached immutable via `_headers`.
- Images below the fold use `loading="lazy"` and explicit width/height.
- All animation is `transform`/`opacity` only, honors `prefers-reduced-motion`,
  and is progressive enhancement — the site is fully usable with JS disabled.

## Copy & compliance rules (from the Kitabu Marketing Playbook — binding)

- Current coverage: Grades 4–10. Describe any future subject expansion separately without implying the live app is unreleased.
- Distribution: Android is live on Google Play. App Store availability is the only customer-facing surface that may say "Coming soon" until the iOS listing is live.
- "CBC-aligned" only — never "KICD-approved".
- Offline claim: downloaded books & saved lessons only; the live tutor needs a connection.
- Holidays: "parent-led home revision, on your terms" — never "holiday classes/tuition".
- Lead price everywhere: KSh 250/month; weekly/annual only in pricing contexts.
- Never invent testimonials, reviews, school names, or partnerships.
- Banned words in customer copy: platform, ecosystem, leverage, robust,
  cutting-edge, revolutionary, disrupt, synergy, engine, algorithm, direction,
  surfaces, workflows, role-based.
- Copy marked `[VERBATIM]` in the playbook (hero, problem/solution/promise
  sections, pricing) is final — do not paraphrase.

## Analytics

`site-20260818.js` is the centralized first-party website analytics service.
It exposes `window.kitabuTrack(name, props)`. Before analytics consent, the
anonymous/session UUIDs, first/latest attribution, and pending events remain
memory-only. After analytics consent it persists those bounded identifiers and
attribution, then batches consented events to
`https://app.kitabu.ai/analytics/events` (override with `window.KITABU_API_BASE`),
and keeps a bounded offline queue. `analytics-config.js` is public configuration
only: Meta Pixel ID, TikTok Pixel Code, GA4 Measurement ID, and Google Ads
conversion IDs/labels may be populated at deploy time; never add access tokens or
API secrets. Third-party scripts are loaded only after the matching consent.

The older `site-20260704.js` remains loaded for non-funnel presentation behavior;
its `kitabuTrack` calls delegate to the centralized service. Unknown legacy
event names are ignored because no page reads the former in-memory buffer.
Canonical events are `page_view`,
`landing_page_engaged`, `app_download_clicked`, and `pricing_viewed` plus the
backend lifecycle names. A direct Google Play destination is the only website
action classified as `app_download_clicked`; WhatsApp is not.

## School onboarding form (`/schools/demo`)

Two delivery channels on submit:
1. **WhatsApp** — opens `wa.me/254716175485` with the details prefilled
   (works with zero backend).
2. **Email + database** — POST to `https://app.kitabu.ai/public/school-onboarding`
   (Fastify route in `apps/api/src/server.ts`), which stores the lead in
   `school_onboarding_requests` (migration `apps/api/sql/037_…`) and emails
   `hello@kitabu.ai` (configurable via `KITABU_SCHOOL_LEADS_EMAIL`).
   Override the API base for testing with `window.KITABU_API_BASE`.

## Local preview

Any static server with clean-URL support, e.g. `npx serve apps/web`.

## Cloudflare Pages

The Git-integrated Pages project should use these settings:

- Production branch: `main`
- Root directory: `apps/web`
- Build command: `npm run build`
- Build output directory: `dist`

The build runs the existing generator, then packages only deployable static pages, assets, and Pages configuration into `dist/`; source-only build scripts, README, package metadata, and any edge-code source are excluded. Run `npm run check` from this directory to verify that the clean release contains the legal pages, referenced homepage assets, security headers, and apex redirects. The reset-password and verify-email redirects are configured as narrowly scoped Cloudflare zone rules with HTTP 308 and complete query-string preservation; do not add them to `_redirects`, whose query-string preservation is not guaranteed.
The existing zone-level `www.kitabu.ai` to `kitabu.ai` redirect remains outside
Pages; do not attach `app.kitabu.ai` or `admin.kitabu.ai` to this project.
