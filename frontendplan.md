# Kitabu AI Admin Portal — Frontend Redesign Plan

> **Target surface:** `apps/admin-web/` → deploys to **admin.kitabu.ai**
> **Goal:** Turn the current zero-build vanilla-JS admin into a world-class, polished, brand-forward dashboard.
> **Decisions (locked):**
> 1. **Design direction:** Brand-forward Kitabu (blue `#2563EB` + orange `#f97316`), friendly rounded cards, illustrative empty states, tasteful accent gradients on hero KPIs and charts.
> 2. **Stack:** Migrate from vanilla JS to a component framework with **static export** (still served as static files by Caddy).
> 3. **Scope:** Visual polish **plus** UX / information-architecture cleanup (consolidate duplicate pages, real loading/empty/error states, better tables, grouped navigation).

---

## Table of contents
1. [Context & how it deploys today](#1-context--how-it-deploys-today)
2. [Current-state audit (concrete problems)](#2-current-state-audit-concrete-problems)
3. [Target architecture & stack](#3-target-architecture--stack)
4. [Brand design system](#4-brand-design-system)
5. [Component library inventory](#5-component-library-inventory)
6. [Information architecture & navigation](#6-information-architecture--navigation)
7. [Page-by-page redesign](#7-page-by-page-redesign)
8. [Data, auth & state layer](#8-data-auth--state-layer)
9. [Accessibility, performance & quality bars](#9-accessibility-performance--quality-bars)
10. [Deployment & build changes](#10-deployment--build-changes)
11. [Phased delivery plan](#11-phased-delivery-plan)
12. [Risks & mitigations](#12-risks--mitigations)
13. [Definition of done](#13-definition-of-done)

---

## 1. Context & how it deploys today

- **Folder:** `apps/admin-web/` — four files only: `index.html`, `app.js` (~1,420 lines), `styles.css` (~780 lines), `_headers`.
- **Deploy:** Caddy `file_server` serves `admin.kitabu.ai` from `/srv/admin` (see `infra/Caddyfile`). No build step — files are copied verbatim.
- **Backend:** Single SPA that calls the live Fastify API at `https://app.kitabu.ai` (overridable via `window.KITABU_API_BASE`). Auth via `/auth/login` + `/auth/refresh`, bearer token in `localStorage`, 30s polling refresh.
- **Guardrails (CLAUDE.md):** Preserve the Fastify API and the RN app; AI behind `apps/api/src/ai.ts`; DB writes behind repositories; Zod validation; production-safe increments. **This plan changes only `apps/admin-web/` + its deploy wiring — no API or RN changes.**

The migration must **keep the deploy model**: the framework build must emit static assets to `/srv/admin`; Caddy keeps serving them.

---

## 2. Current-state audit (concrete problems)

Visual / UX:
- **Metric cards** are full-saturation solid fills (`.blue/.green/.amber/.red`) with small white sub-text — loud, dated, and some combinations (amber `#f6bb2f` bg with white) fail WCAG contrast. No trend/delta, no icon, no sparkline.
- **Charts** are hand-rolled fixed `600×250` SVG. Labels overlap when there are many bars/points, no tooltips, no hover, no responsive reflow, no per-chart empty state.
- **Tables** have no sorting, no pagination, no sticky header, no column controls, no export. A 760px `min-width` forces horizontal scroll on tablet.
- **State conflation:** the only empty signal is "No live records available yet." Loading, empty, and error all look identical. There are **no skeletons** — the UI is blank until the first 30s poll resolves.
- **5 duplicate pages:** Tutor / QuickFacts / Homework / Assessment / Career Coach all render the *same* `renderNextAgent()` table; Chatbot is a near-twin. This is the same data five times.
- **Dead intent:** `navItems` carries a `next: true` flag on 11 items that is never rendered (no "beta/coming soon" badge).
- **Placeholder surfaces:** the notifications button opens a stub modal; profile is minimal.

Engineering / correctness:
- **Full-innerHTML re-render** on every search keystroke (`renderRoute()` rebuilds the whole content node) — drops focus/scroll and is janky on large tables.
- **XSS surface:** HTML is assembled with template strings guarded by a hand-rolled `escapeHtml()`. One missed spot = injection. (A component framework escapes by default.)
- **Brittle error handling:** session is cleared by string-matching `error.message.includes("401")`.
- **`_headers` is the wrong format** for this host. That file is a Cloudflare Pages / Netlify convention; Caddy `file_server` does **not** read it, so the intended security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, cache rules) are **not actually applied in production**. They must live in the Caddyfile.
- **Mobile sidebar** has no scrim/backdrop and no focus management; modal has no focus trap or `Esc` handling beyond scrim click.
- **Hardcoded `grades`/`subjects`** arrays diverge from live curriculum data.
- **Token in `localStorage`** with no idle timeout (note: auth hardening is out of scope here but flagged).

These are the concrete things the redesign fixes — not just "make it prettier."

---

## 3. Target architecture & stack

**Framework:** **Vite + React 18 + TypeScript**, output as a static SPA (`vite build` → `dist/`).
- *Why Vite over Next static export:* the portal is fully client-rendered behind a login, `noindex`, polls a live API — there is no SSR/SEO benefit. A Vite SPA gives the simplest static `dist/`, fastest dev loop, and a clean drop-in to `/srv/admin`. (Next.js `output: 'export'` is an acceptable alternative but adds App-Router overhead for zero gain here.)

**Core libraries:**
| Concern | Choice | Rationale |
|---|---|---|
| Styling / tokens | **Tailwind CSS** + CSS variables | Token-driven brand system, fast, consistent; dark mode via `class` strategy |
| Accessible primitives | **Radix UI** (Dialog, Dropdown, Tabs, Toast, Tooltip, Popover) | Focus trap, keyboard nav, ARIA done right |
| Data / polling | **TanStack Query** | Replaces manual `Promise.allSettled` + `setInterval`; gives per-query loading/error/refetchInterval/stale cache |
| Tables | **TanStack Table** | Sorting, pagination, column visibility, density — headless, styled by us |
| Charts | **Recharts** | Responsive, gradient fills, tooltips; themed to brand tokens |
| Routing | **React Router** | Client routing with a guarded layout route |
| Forms | **react-hook-form + Zod** | Mirrors API's Zod contracts; inline validation |
| Icons | **lucide-react** | The current inline SVGs are already lucide-style paths |
| Dates / format | **Intl** (native) + tiny helpers | Keep `KSh` / `en-KE` formatting |

**Proposed source structure** (builds to static `dist/`):
```
apps/admin-web/
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
  src/
    main.tsx
    app/
      App.tsx               # router + providers
      AppShell.tsx          # sidebar + topbar layout
      routes.tsx            # route table (lazy per page)
      guards.tsx            # RequireAuth
    lib/
      api.ts                # fetch wrapper + refresh
      queries.ts            # TanStack Query hooks (useUsers, useSchools, …)
      auth.ts               # session store
      format.ts             # money(), percent(), dates
      env.ts                # VITE_API_BASE + runtime override
    design/
      tokens.css            # CSS variables (brand, neutral, semantic)
      theme.ts              # token typings / chart palette
    components/             # Button, Card, MetricCard, DataTable, Charts/, Dialog, Toast, EmptyState, Skeleton, StatusPill, Sidebar, Topbar, …
    pages/
      Dashboard.tsx  Schools.tsx  Subjects.tsx  Users.tsx
      SalesAgents.tsx  TeacherPortal.tsx  ParentsPortal.tsx
      AiAnalytics.tsx        # consolidates the 5+1 agent pages
      QuizArena.tsx  Pilots.tsx  Pricing.tsx  Settings.tsx
    features/               # modals & forms (school, discount, announcement, pilot, assignment, curriculum-import)
```

---

## 4. Brand design system

### 4.1 Color tokens (CSS variables in `tokens.css`)

**Brand blue** (primary, anchored on `#2563EB` = blue-600):
`50 #eff6ff · 100 #dbeafe · 200 #bfdbfe · 300 #93c5fd · 400 #60a5fa · 500 #3b82f6 · 600 #2563EB · 700 #1d4ed8 · 800 #1e40af · 900 #1e3a8a · 950 #172554`

**Brand orange** (accent, anchored on `#f97316` = orange-500):
`50 #fff7ed · 100 #ffedd5 · 200 #fed7aa · 300 #fdba74 · 400 #fb923c · 500 #F97316 · 600 #ea580c · 700 #c2410c`

**Neutral** (slate ramp for surfaces/text/borders): `50…950`.

**Semantic:** `success #16a34a`, `warning #f59e0b`, `danger #ef4444`, `info` = brand-600.

**Surfaces (light):** app bg `--bg #f6f8fc`, surface `#ffffff`, surface-muted `#f8fafc`, border `#e6eaf2`, text `#0f172a`, muted `#64748b`.

**Signature gradients** (used sparingly on hero KPIs, the active nav item, and chart fills):
- `--grad-brand: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)`
- `--grad-accent: linear-gradient(135deg, #fb923c 0%, #f97316 100%)`
- `--grad-hero: linear-gradient(135deg, #2563EB 0%, #4f46e5 55%, #f97316 140%)` (deep-blue → indigo → orange edge)
- Chart fills: blue area gradient (`#2563EB`→transparent), orange bar gradient (`#fb923c`→`#f97316`).

**Contrast rule:** orange and amber are **never** used as a background for white body text. Orange is a foreground accent (icons, deltas, chart highlights, the brand mark) or paired with `slate-900` text. All text/background pairs must pass WCAG AA (≥4.5:1 body, ≥3:1 large).

### 4.2 Typography
- **UI / body:** `Inter` variable (self-hosted via `@fontsource` so we don't depend on the OS having Inter).
- **Headings / numerals:** `Plus Jakarta Sans` (friendly, geometric — fits the education brand) with `tabular-nums` for KPI figures so numbers don't jitter.
- **Scale:** display 32/40, h1 24/32, h2 20/28, h3 16/24, body 14/22, small 13/18, caption 12/16. Weights 400/500/600/800.

### 4.3 Shape, depth, motion
- **Radii (friendly, larger than today's 8px):** cards 16px, controls 10–12px, pills full, modal 20px.
- **Shadows:** layered soft — `--shadow-sm`, `--shadow-card: 0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)`, `--shadow-pop` for menus/modals. Hero KPI gets a faint brand-tinted glow.
- **Motion:** 150–240ms `ease-out`; entrance fades + 4–8px rise; chart bars/lines animate in; `prefers-reduced-motion` disables all non-essential motion.
- **Density:** 4px spacing base; comfortable default, optional compact table density.

### 4.4 Dark mode (included, brand-tuned)
Tailwind `class` strategy; tokens have light + dark values. Dark uses `--bg #0b1220`, surfaces `#111a2e`, brand stays blue with orange accent. Toggle in the topbar, persisted, defaults to system. (Brand-forward look is the primary/light theme; dark is the polished companion.)

---

## 5. Component library inventory

Reusable, brand-themed, accessible components (each with loading/empty/disabled states):

- **Buttons:** `Button` (primary brand-gradient, secondary, ghost, danger, success), `IconButton`, `Button` with leading/trailing icon, loading spinner state.
- **Surfaces:** `Card`/`Panel` (header slot + actions), `SectionHeader`.
- **MetricCard:** white/dark card with colored icon chip, big tabular-nums value, **delta vs previous period** (▲/▼ with color), optional inline sparkline. One "hero" variant uses `--grad-hero`.
- **DataTable** (TanStack Table): sortable headers, pagination, sticky header, row hover, density toggle, per-column visibility, CSV export, integrated **search**, and first-class `loading` (skeleton rows) / `empty` (illustration) / `error` (retry) states.
- **Charts** (`components/charts/`): `BarChart`, `LineChart`, `AreaChart`, `DonutChart` (legend + center total), `RadialGauge` (health meter) — all responsive (`ResponsiveContainer`), brand gradients, tooltips, accessible `<title>`/`aria-label`, and an empty placeholder.
- **Inputs:** `TextField`, `Textarea`, `Select` (Radix), `DatePicker`, `FileDrop` (drag-and-drop PDF for curriculum import), `SearchInput` (debounced).
- **Overlays:** `Dialog`/`Modal` (Radix — focus trap, `Esc`, scrim), `Toast` system (replaces the silent sync banner with real success/error toasts), `Tooltip`, `DropdownMenu`, `ConfirmDialog`.
- **Status:** `StatusPill` / `Badge` (with icon + text, never color-only), `SyncIndicator` (live/syncing/error dot + relative time), `Avatar`.
- **States:** `Skeleton` primitives, `EmptyState` (friendly illustration + CTA), `ErrorState` (message + retry), `Spinner`.
- **Navigation:** grouped collapsible `Sidebar`, `Topbar` (page title/subtitle, search/⌘K, refresh, theme toggle, notifications, profile menu), optional **Command Palette** (⌘K quick-nav across pages/schools/users).

---

## 6. Information architecture & navigation

**Group the flat 18-item list** into a scannable sidebar with section labels:

- **Overview** — Dashboard
- **Operations** — Schools · Users · Pilots · Pricing
- **Academics** — Subjects · Quiz Arena
- **People** — Sales Agents · Teacher's Portal · Parents' Portal
- **AI Agents** — **AI Analytics** (single consolidated page; agent picked via in-page tabs/selector)
- **System** — Settings

**Key IA fix — consolidate the agent pages.** Tutor, QuickFacts, Homework, Assessment, Career Coach, and Chatbot currently render the same `/admin/analytics/ai-usage` data. Replace them with **one `AiAnalytics` page** featuring an agent **segmented control / tab strip** (All · Chatbot · Tutor · QuickFacts · Homework · Assessment · Career Coach) that filters the same live dataset by `feature`. This removes 5 redundant routes, keeps every agent reachable, and makes the data comparable in one place. Deep links preserved via `/ai-analytics?agent=tutor`.

Other nav improvements:
- `aria-current="page"` on the active item; real `<nav>` landmark; collapsible groups persisted.
- Retire the unused `next: true` flag, or render it as a real **"Beta"** badge where a surface is genuinely partial.
- Sidebar collapses to icons on `lg`; off-canvas drawer with scrim + focus trap on mobile.

---

## 7. Page-by-page redesign

For every page: real skeleton on load, friendly empty state, error state with retry, responsive grid, and brand-themed charts/tables. Page-specific notes below.

### Dashboard
- Hero KPI row: **Total Users, Active Users, New Users (30d), Revenue** as `MetricCard`s with **period-over-period deltas** and sparklines; "Revenue" uses the hero gradient.
- Charts: **User Growth** (area, blue gradient), **Revenue** (bar, orange gradient) with tooltips; **Subject Usage** donut with legend + center total.
- Replace the "Live Admin Feed" text list with an **Activity / Health strip** (users, schools, teacher, AI, billing) as compact stat tiles linking to their pages.
- Keep time-range + grade filters; move them into a tidy toolbar with segmented control for range.

### Schools
- KPI trio (Most Active / Highest Enrollment / Least Active) as metric cards.
- `DataTable` (sortable by students, searchable, paginated) with `StatusPill` for pilot status and a row action menu (View · Edit pricing · Update pilot).
- "Add School" → Radix dialog with `react-hook-form + Zod`.
- Detail view becomes a **slide-over panel** (not a cramped modal): grade distribution mini-bar, plan, engagement, contacts.

### Subjects
- KPI trio (Most/Least active subject, Best assignment average).
- Subject Engagement donut + Assignment Averages bar.
- **Curriculum by Grade**: grade tabs (segmented), per-subject table with strand counts and a clear **PDF import** via `FileDrop` (progress + success toast). Distinguish "Loaded" vs "Pending" with badges and a real loading skeleton.

### Users
- Grade filter + debounced search (no full re-render; table updates in place).
- KPI trio + Acquisition (bar) and Active Users (line) charts.
- Paginated, sortable `DataTable`; status as pill; **View More** opens a slide-over with profile + assignments-in-grade.

### Sales Agents
- KPI trio (owners, highest/lowest revenue owner).
- Sortable owners table (revenue, students) with contact actions (copy email/phone), CSV export.

### Teacher's Portal
- Two sections: **Student Performance** and **Assignments**, each a `DataTable` with trend chips and progress bars (submitted/total).
- **Set Assignment** modal keeps the AI-generation flow (`/ai/generate-text`) but upgraded: topic form → "Generate with AI" (loading state) → **editable preview of questions** (not raw JSON in a textarea) with type badges → Publish. Raw-JSON editing remains available behind an "Advanced" toggle.

### Parents' Portal
- Learner selector (search/typeahead) instead of "first match."
- **Health Meter** as polished `RadialGauge` with color zones + label; KPI stack (grade, assessment avg, homework completion); per-subject scores as a horizontal bar list.

### AI Analytics (consolidated)
- Agent segmented control (All / Chatbot / Tutor / …).
- KPIs: tracked features, blocked/flagged events, tracked users, total AI spend.
- Charts: **Spend by Feature** (bar), **Spend by School** (bar), spend trend (line if time series available).
- **Flagged Content** table (blocked events) with severity badges.
- Empty-safe: clear "no AI usage recorded yet" state per agent.

### Quiz Arena
- Grade segmented control; KPIs (fallback questions, covered subjects, labelled answers).
- QuizBank `DataTable` with subject filter, search, pagination; answer column readable; expandable row for options/explanation.

### Pilots
- KPI trio (Active / Onboarding / Engaged students).
- Pilot table with an **onboarding stage stepper** (0–4 as a progress indicator) and status pill; **Update Pilot** dialog.

### Pricing
- KPI trio (Active Subscriptions, Failed Payments, Revenue Signal).
- Three managed sections: **School Pricing** (assign plan/discount), **Reusable Discounts**, **Hero Announcements** — each a card with table + create dialog and active/paused badges. Announcement form gets proper date pickers and a live preview of the in-app hero card.

### Settings
- Account card (admin email, roles, avatar), **API base**, **last sync** + manual refresh, **theme**, **density**.
- **Live status** table (records loaded per area) as health rows.
- Sign out as a clearly separated destructive action with confirm.
- (Stretch) idle-timeout + "active sessions" if the API exposes it.

### Global surfaces
- **Notifications**: real dropdown/panel fed by announcements + sync/billing events (replaces the stub modal); unread badge.
- **Profile menu**: avatar dropdown (account, theme, sign out).
- **Toasts** for every create/update/delete and for sync failures.
- **Command palette (⌘K)** for quick navigation (stretch).

---

## 8. Data, auth & state layer

- **`lib/api.ts`:** typed `fetch` wrapper preserving today's behavior — bearer token, `401 → /auth/refresh → retry once`, JSON parsing — but returning typed results and throwing typed errors (status code on the error object, no string-matching).
- **`lib/queries.ts`:** one TanStack Query hook per resource (`useUsers`, `useSchools`, `usePlans`, `useDiscounts`, `useAnnouncements`, `useAiUsage`, `useBilling`, `useTeacherStudents`, `useTeacherAssignments`, `useCurriculum(grade)`, `useQuizBank(grade)`), with `refetchInterval: 30s`, `staleTime`, and shared loading/error. Mutations (`createSchool`, `updatePilot`, `createDiscount`, `createAnnouncement`, `createAssignment`, `importCurriculumPdf`) invalidate the right queries and fire toasts.
- **Auth:** `RequireAuth` guard wraps the app shell; role check (`platform_admin` / `school_admin`) preserved; unauthorized → login. Token handling kept in `localStorage` for parity (auth-storage hardening noted as a separate, out-of-scope follow-up).
- **Config:** `VITE_API_BASE` at build time with a `window.KITABU_API_BASE` runtime override retained for parity with current deploys.
- **No `dangerouslySetInnerHTML`** anywhere — React escaping removes the current XSS surface.

---

## 9. Accessibility, performance & quality bars

**Accessibility (WCAG 2.1 AA):**
- All interactive elements keyboard-reachable with visible focus rings; modals/menus via Radix (focus trap, `Esc`, return focus).
- Status conveyed by **icon + text**, never color alone; verified contrast for all token pairs (special attention to orange/amber).
- Charts have text alternatives (`aria-label` + a visually-hidden data summary); tables use proper `<th scope>`.
- `aria-current` on active nav; `prefers-reduced-motion` honored; respects `prefers-color-scheme`.

**Performance:**
- Route-level code splitting (`React.lazy`) + lazy-loaded charts so the initial bundle is lean.
- Vite content-hashed assets → long-cache hashed JS/CSS, `no-store` on `index.html`.
- Debounced search; virtualized rows for very large tables if needed.
- Targets: Lighthouse (desktop) Performance ≥ 90, Accessibility ≥ 95; first meaningful paint shows skeletons immediately (no blank 30s wait).

**Quality:**
- TypeScript strict; ESLint + Prettier; `vite build` + `tsc --noEmit` gate.
- Component tests (Vitest + Testing Library) for table, charts wrapper, auth guard, and the assignment-generation flow.
- This satisfies CLAUDE.md's "run build before declaring production-impacting work complete."

---

## 10. Deployment & build changes

Keep Caddy serving static files; change only how `/srv/admin` is populated.

1. **Build:** `cd apps/admin-web && npm ci && npm run build` → `apps/admin-web/dist/`.
2. **Publish:** deploy step copies `dist/` → `/srv/admin` (replace the current verbatim copy of the 4 files). Update `DEPLOY_HETZNER.md` / `DEPLOY_DIGITALOCEAN.md` and any deploy script accordingly.
3. **SPA fallback in Caddy** (client-side routing needs it):
   ```caddy
   admin.kitabu.ai {
     root * /srv/admin
     encode gzip zstd
     header {
       X-Content-Type-Options nosniff
       Referrer-Policy strict-origin-when-cross-origin
       Permissions-Policy "camera=(), microphone=(), geolocation=()"
       -Server
     }
     @assets path /assets/*
     header @assets Cache-Control "public, max-age=31536000, immutable"
     header /index.html Cache-Control "no-store"
     try_files {path} /index.html
     file_server
   }
   ```
4. **Move security headers into the Caddyfile** (above) and **delete `_headers`** — it is silently ignored by Caddy today, so this is also a real security fix, not just cleanup.
5. **CI:** add an admin-web build job (typecheck + build + tests) so a broken admin build can't ship.

> Rollout is reversible: the old static files can be restored to `/srv/admin` instantly if the new build regresses.

---

## 11. Phased delivery plan

Production-safe, incremental, reviewable PRs. Each phase ends in a working, deployable state.

**Phase 0 — Scaffolding & deploy parity (foundation)**
- Stand up Vite + React + TS + Tailwind inside `apps/admin-web/` (source in `src/`, old files retained until cutover).
- Wire `lib/api.ts`, auth guard, login, and the app shell so a logged-in admin sees an empty themed shell against the live API.
- Prove the static `dist/` deploys to `/srv/admin` behind Caddy with SPA fallback + headers. **Acceptance: login + one live data call works in staging.**

**Phase 1 — Design system & component library**
- Tokens (`tokens.css`), Tailwind config, fonts, dark mode.
- Build the component inventory (Buttons, Card, MetricCard, DataTable, Charts, Dialog, Toast, StatusPill, Skeleton, EmptyState, Sidebar, Topbar). Storybook-style demo page for visual QA.

**Phase 2 — App shell & data layer**
- Grouped sidebar + topbar (search, refresh, theme, notifications, profile), `RequireAuth`, routing, TanStack Query hooks for all resources, global toasts + sync indicator.

**Phase 3 — Page migration (highest-traffic first)**
- Dashboard → Users → Schools → Pricing → Pilots → Subjects → Sales Agents → Teacher's Portal → Parents' Portal → Quiz Arena → Settings.
- Port modals/forms to Radix + react-hook-form + Zod (school, discount, announcement, pilot, assignment, curriculum import).

**Phase 4 — UX/IA cleanup**
- Consolidate the 6 agent pages into **AI Analytics** with the agent selector.
- DataTable upgrades everywhere (sort/paginate/export); real loading/empty/error states; slide-over detail panels; notifications panel.

**Phase 5 — Polish**
- Motion, illustrative empty states, command palette (⌘K), dark-mode pass, micro-interactions, responsive audit.

**Phase 6 — QA, a11y, perf & cutover**
- Lighthouse + axe pass, cross-browser/mobile, content-hash caching, CI build gate, docs update, **cutover** `/srv/admin` from old files to `dist/`, then remove the legacy `app.js/styles.css/_headers`.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Migration is a rewrite vs. "production-safe increments" | New stack stood up **alongside** old files; cutover is a single Caddy path swap and is instantly reversible. Old build kept until Phase 6 sign-off. |
| Deploy model changes (build step now required) | Build still emits **static files** to the same `/srv/admin`; only the publish source changes. Documented + CI-gated. |
| SPA routing 404s on refresh | `try_files … /index.html` fallback in Caddy (Phase 0 acceptance criterion). |
| Security headers regress during move | Headers moved into Caddyfile **and verified** before deleting `_headers`; net improvement since `_headers` was never applied. |
| API shape drift / partial data | TanStack Query per-resource error isolation + defensive typing; every page has explicit empty/error states. |
| Brand colors fail contrast | Orange/amber restricted to accents/foreground; AA contrast checked in design-system phase. |
| Scope creep on AI/assignment flow | AI generation endpoint unchanged; only the **UI** around it improves. No API/RN edits (CLAUDE.md). |

---

## 13. Definition of done

- All 13 surfaces (12 pages + global shell) shipped on the new stack with brand-forward visuals, dark mode, and consistent loading/empty/error states.
- The 6 agent pages are consolidated into one AI Analytics page; sidebar is grouped; every table sorts/paginates.
- No `dangerouslySetInnerHTML`; inputs validated with Zod; charts and tables are responsive and accessible.
- Security headers served by Caddy; `_headers` removed; SPA fallback in place.
- `npm run build` + typecheck + tests green in CI; Lighthouse desktop Perf ≥ 90 / A11y ≥ 95.
- Deploy docs updated; cutover completed and verified on admin.kitabu.ai; rollback path documented.
- No changes to the Fastify API or React Native app.
```
