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

`site-*.js` exposes `window.kitabuTrack(name, props)` and fires the playbook
8.1 event names (`download_cta_clicked`, `school_demo_viewed/started/submitted`,
`pricing_viewed`, `persona_page_viewed`, `faq_expanded`) from `data-event`
attributes. Events forward to PostHog when `window.posthog` exists; until then
they queue in `window.__kitabuEvents`, so adding the PostHog snippet later
requires no markup changes.

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
