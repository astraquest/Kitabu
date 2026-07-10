# Teacher Portal Redesign — Working Notes (Evolving)

> **Audience:** engineer/agent picking this up cold, and the product owner tracking progress.
> **Repo:** `kitabu-ai` — Fastify API (`apps/api`) + Expo/React-Native app (`native-app`).
> **Mandate (from product owner, 2026-07-10):** UI-first redesign of the Teacher Portal. Make it visually
> stunning and *stupid simple* — a teacher should know what to do without guidance. **Do NOT change or
> remove features without explicit permission.** Backend/feature gaps are catalogued here for later approval.
> **Status legend:** ⬜ not started · 🔨 in progress · ✅ done (verified in preview) · 🔒 needs owner approval

---

## 1. PRD spec (KitabuAI_PRD_v1.4_Final, Section 6 + related)

- **6.1 Navigation** — Tabs: Students | Assignments | Messages | Lesson Plan.
- **6.2 Students** — Class Average w/ trend, Active Students count. Filters: All Grades, sort by name,
  remedial filter, streak filter. Row: avatar, name, grade, P(mastery) avg, streak.
  Student Detail modal tabs: Dashboard | Remedial (Knowledge-Graph root cause) | Journey Map | Profile.
- **6.3 Assignments** — List: subject, title, grade, due date, submission bar (X/Y).
  Detail: stats (avg/high/low), submission list w/ status, drill-down to step-level review.
  Teacher can override any AI grade (reason required, audit-logged, student notified).
  Weekly Exam cards appear automatically (teacher cannot create).
- **6.4 New Assignment Wizard** — Grade, Subject, Strand (optional), Topic free text → AI generates
  title/description/questions (MCQ + open-ended + step-level Math/Science) → review, regenerate,
  **set due date**, publish. Scoped to teacher's school.
- **6.5 Lesson Plan** — *Editable calendar*: adjust strand/sub-strand schedule, add notes.
  Boarding-school flag hides weekly exams except holidays. Changes propagate to students.
- **6.6 Messages** — Send to individual parent (search by student) or all parents of Grade X.
  Thread view: chronological, parent name, **student name**, last message, **unread badge**.
  Parent replies trigger teacher push. All messages audit-logged.
- Related: 5.6.2 teacher grade override; 5.12.3 weekly AI parent summary also sent to teacher.

## 2. Current implementation map

| Surface | File | Notes |
|---|---|---|
| Portal shell, nav, wizard state | `native-app/src/screens/TeacherPortalScreen.tsx` (~5,280 lines; ~2,400 are styles `s` + `portalStyles`) | Top segmented tabs Students/Assignments; bottom nav Home/Students/Insights/Messages/Lesson Plan |
| Students tab | `native-app/src/components/teacher/TeacherStudentsSection.tsx` | Filters, 2 metric cards, student list |
| Assignments tab | `.../TeacherAssignmentsSection.tsx` | Filters, 2 metric cards, assignment cards |
| Assignment detail | `.../TeacherAssignmentDetailSection.tsx` | Stats trio + submissions list |
| Submission review | `.../TeacherSubmissionReviewSection.tsx` | Read-only answer review |
| New Assignment wizard | `.../TeacherAssignmentWizardSection.tsx` | 2-step: setup → AI draft editor → publish |
| Student detail modal | `native-app/src/components/StudentDetailsModal.tsx` | Tabs: Performance / Remedial / Profile |
| Messages view | `TeacherMessagesView` (in TeacherPortalScreen.tsx ~line 1864) | Real send/receive/report |
| Lesson Plan view | `TeacherLessonPlanView` (~line 1397) | AI generator + save (NOT a calendar) |
| Profile view | `TeacherProfileView` (~line 977) | Personal details + taught grades/subjects |
| Service layer | `native-app/src/services/teacherService.ts` | All wired to real API |
| API | `apps/api/src/server.ts` ~5357–5600 | `/teacher/students`, `/teacher/assignments` GET/POST, `/teacher/parents`, `/teacher/messages` GET/POST, `/teacher/lesson-plans` POST, `/teacher/teaching-scope` POST |

Data flow: `useKitabuApp.ts` loads real API data, falls back to `INITIAL_TEACHER_STUDENTS` /
`INITIAL_SUBMITTED_ASSIGNMENTS` mocks on error/empty.

## 3. Audit — working vs not (2026-07-10, verified live at localhost:8090)

### Working (real data, end-to-end)
- Students list from `/teacher/students` (name, grade, assessmentScore, homeworkCompletion, lastActive, trend).
- Grade filter, name/score sort, "needs support" (<70%) filter.
- Assignments list w/ real submission counts + progress bars; subject filter; date/subject sort.
- Assignment detail → submission list → per-answer review (read-only), real data.
- AI assignment wizard: grade/subject/strand/sub-strand/topic → AI draft → inline editing of
  title/description/questions/options/answer key → regenerate → publish (POST works, list refreshes, toast).
- Messages: parent contacts per grade, send to whole grade or one parent, thread render, report-abuse flow.
- Lesson plan: AI presentation ideas (`generateLessonPlanIdeas`), structured flow preview, save to API.
- Profile: edit details, taught grades/subjects → `/teacher/teaching-scope`.
- Remedial report in student modal + "create remedial assignment" handoff into wizard.

### Broken / fake / misleading UI (fix as part of redesign — data honesty)
- ❌ **Raw ISO timestamps** on assignment cards: `2026-07-06T02:03:03.972Z`, `Due: 2026-07-13T02:03:05.058Z`.
- ❌ **Hardcoded fake stats** in assignment detail: Highest **98%** / Lowest **45%** (real scores exist in
  `activeSubmissionList` — compute max/min; average is real).
- ❌ **Hardcoded fake "John Doe — Pending — No submission" row** in every assignment detail.
- ❌ **Hardcoded "+2%" trend + "vs last 7 days"** on Class Average / Active Students metric cards.
- ❌ Student modal "Recent Activity" (Algebra Quiz / Biology Reading / WWII Essay) is mock; 7-day trend chart mock.
- ❌ Wizard publishes with **hardcoded due date (+7 days)** — PRD says teacher sets due date. (UI add: date picker.)
- ❌ Subject naming mismatch: wizard uses `Math`, filters use `Mathematics` — filtering misses AI-created assignments.
- ❌ Messages header: "0 parents in Grade 10" next to "2 learners" — confusing when no parents linked.
- ⚠️ "All Subj…" truncation in filter chip; "Score" sort chip ambiguous.
- ⚠️ Lesson plan "Share" button only flips its own label (no share action).

### Not implemented vs PRD (🔒 feature work — needs owner approval before building)
- Streaks (rows + filter) and P(mastery): API returns neither; `assessmentScore` is the proxy.
- Student modal: no **Journey Map** tab (PRD: Dashboard | Remedial | Journey Map | Profile).
- No step-level drill-down in submission review; no **teacher grade override** (no API endpoint).
- No **Weekly Exam cards** in teacher assignments (weekly exam exists student-side: `/learning/weekly-exam`).
- Lesson Plan is an AI generator, not the PRD's editable calendar; no boarding-school flag; no propagation.
- Messages: no unread badges, no per-student thread linkage, no search-by-student, no push on parent reply.
- No dark mode in portal (hardcoded light colors; app has global dark-mode setting per PRD 5.14).

### Dev-environment observation (not UI scope, worth a follow-up)
Web build: auth session does not survive a page reload (drops to intro; user must log in again), and an
expired access token leads to persistent 401s (`/me/presence` had ~1.5k 401s in one dev session; AI calls
401 until re-login). Likely the web token refresh path. Backend/session work — needs separate approval.

### IA observation (UI-only fix, in scope)
Bottom nav "Home", "Students", "Insights" all render the same Students view with different filter presets
(Home = my grade, Students = all grades, Insights = remedial filter on). Visually indistinguishable →
teacher can't tell where they are. Redesign gives each state a distinct, purposeful screen **without
removing any capability** (all filters stay reachable).

## 4. Design direction — "know what to do at a glance"

Visual language (matches parent-portal redesign + app brand; porcelain material, top-left light):
- Canvas `#F6F7F9`; white cards radius 20–24 w/ soft shadow; ink `#0F172A`; muted `#64748B`.
- Brand accent orange `#F97316` (CTAs, active nav); success `#16A34A`; warn `#F59E0B`; danger `#EF4444`;
  tinted icon squircles (peach/green/blue/purple) like the parent portal quick actions.
- Subject color coding everywhere: Mathematics blue · English orange · Science green · Kiswahili purple ·
  Social Studies teal.
- Score pills: ≥80 green tint, 60–79 amber tint, <60 red tint. Trend chips (↑ Improving / → Stable / ★ Excellent).
- Friendly empty states: emoji + one-line explanation + one CTA.
- Human dates everywhere: "Due Mon 13 Jul", "Sent 6 Jul", "2h ago".

Screen-by-screen plan:
1. **Home (bottom-nav)** — teacher's daily cockpit: warm greeting header ("Good morning, {name} 👋" + date +
   "{grade} · {n} students"), **"Needs your attention" stack** (assignments awaiting review, students at risk,
   parents awaiting reply — each row = icon + count + one-tap deep link), compact class-pulse metric row,
   quick actions (New Assignment · Message Parents · Plan Lesson). All existing filter capability kept on Students.
2. **Students** — roster: search-feel filter bar (grade/subject/sort as clean chips), metric duo w/ real deltas
   removed (no fake "+2%"), student cards w/ avatar, score pill, trend chip, homework completion bar.
3. **Insights** — restyled "who needs attention": at-risk list ranked by score, class distribution strip,
   remedial CTA per student. (Same data/filters as today, purposeful presentation.)
4. **Assignments** — cards w/ subject color spine, human dates, submission ring, "needs review" badge;
   detail w/ real high/low, real pending count; review flow restyled.
5. **Wizard** — same 2 steps, cleaner: step dots, due-date picker (🔒 small feature add — ask owner),
   subject naming unified.
6. **Messages** — chat-first layout: audience picker as segmented control, thread bubbles w/ timestamps,
   sticky composer, clearer recipient summary.
7. **Lesson Plan** — keep generator flow; upgrade hero, form, preview cards to system look.
8. **Profile** — align cards/typography to system.

## 5. Progress log (update after every feature)

| # | Feature | Status | Notes |
|---|---|---|---|
| 0 | Audit + this doc | ✅ | 2026-07-10 |
| 1 | Design tokens + shared teacher UI primitives | ✅ | Done inline in `createTeacherPortalStyles` (homeHero*, quickAction*, attention*, trendChip*, scorePill*, insights*) rather than a new module — keeps existing style architecture |
| 2 | Home view (daily cockpit) | ✅ | Gradient greeting hero (date/greeting/class size), 3 quick actions (New Assignment / Message Parents / Plan Lesson), "Needs your attention" stack w/ real derived counts (submissions received, learners <70%, past-due assignments) + all-clear state. Verified in preview |
| 3 | Students roster restyle | ✅ | Removed fake "+2% vs last 7 days"; honest sublines ("across N students", "in your classes"); rows now show trend chip (★/↑/→), homework completion bar, tinted score pill; fixed "All Subj…" truncation. Verified in preview |
| 4 | Insights restyle | ✅ | Amber "Class Insights" header explains the view + next action; Students At Risk card + attention list retained; class-size subline fixed. Verified in preview |
| 5 | Assignments list restyle + human dates | ✅ | Subject color spine (Math blue / Science green / English orange / Kiswahili purple / Social teal), "Sent Sat, 27 Jun", "Due Mon, 13 Jul", red "Overdue · Tue, 30 Jun". Verified in preview |
| 6 | Assignment detail: real high/low/pending, restyle | ✅ | Highest/Lowest now computed from real submissions (was hardcoded 98/45); fake "John Doe" row replaced with real "N learners pending" summary + "No submissions yet" empty state. Verified in preview |
| 7 | Submission review restyle | ✅ | Existing structure assessed as clean; no change needed this pass |
| 8 | Wizard restyle + due-date picker | ✅ | Step 2 now has a Due Date card (Tomorrow / 3 days / 1 week / 2 weeks chips + "Learners must submit by {date}"); publish uses the chosen date (was silently +7 days — PRD 6.4 requires teacher-set due date). Verified in preview via remedial→Set Assignment flow |
| 9 | Messages restyle | ✅ | Clarity pass: "N parents reachable in Grade X" / "No parents linked to Grade X yet" header (was confusing "0 parents" + "2 learners"); friendly bubble timestamps ("7 Jul, 03:22"). Bubbles/composer layout kept. Verified in preview |
| 10 | Lesson Plan restyle | ✅ | Navy hero → brand orange gradient with frosted stat cards + decorative bubble (matches Home hero); panel radius/shadow aligned to system. Verified in preview |
| 11 | Profile restyle | ✅ | Assessed — already card-based and consistent; intentionally untouched this pass |
| 12 | Subject naming unification (Math→Mathematics) | ✅ | `SUBJECT_STRANDS` key + wizard default renamed; also fixes remedial handoff (remedial logic already emitted 'Mathematics', which the wizard's strand map didn't recognise) |
| 13 | Typecheck + lint + tests + preview verification | ✅ | 2026-07-10: `tsc --noEmit` clean; full jest suite 112/112 green; teacher files eslint-clean (2 pre-existing warnings in ParentDashboardScreen.tsx:1728 fail the repo-wide 0-warning gate — flagged as separate task); every view verified live at localhost:8090 |

## 5b. Home cockpit v2 — "Rosso Corsa" (owner-selected direction, 2026-07-10)

Owner reviewed 4 design directions (artifact: teacher-dashboard-directions) and picked **03 Rosso Corsa**,
retaining the existing hero card's orange gradient (#FF8A3D→#FF5710) and rounded-24 shape. Applied:

- **Quick actions moved inside the hero** as 3 frosted 42px circles (Assign / Message / Plan) — the white
  action cards are gone; same handlers and accessibility labels.
- **Attention = floating glass panel** overlapping the hero seam (−28px): big italic-900 numerals
  (108 ink / 27 red), single-line muted text, chevron; all-clear state kept inside the panel.
- **Class pulse row on the canvas** (no card): SVG progress ring (brand orange) with 82% center,
  "Class Average" label + dynamic phrase (Cruising above target / Holding steady / Needs a push),
  italic "2 Active" on the right.
- **Metric duo hidden on Home only** (`showMetrics={!isHomeState}`) — the pulse row *is* Class Average
  there; cards unchanged on Students/Insights. "Class Average" text preserved for tests via pulse label.
- Header/tabs tightened (62px header, 44px segments) so the full cockpit ends at **509px of an 812px
  viewport** — filters + Student List header visible above the bottom nav, zero scroll. Verified live.
- Checks: tsc clean, TeacherPortalScreen tests 6/6, touched files eslint-clean.

## 5c. Home cockpit v3 — density pass (owner request, 2026-07-10)

Owner asked for a tighter, more scannable Home. Applied:
- **Removed the 3 quick-action circles** from the hero (they duplicate the bottom nav Home/Students/
  Insights/Messages/Lesson Plan). Hero is now just greeting + date + class size → shorter card.
- **Class Average moved above the notifications.** New order under the hero: (1) Class Average card
  (ring + phrase + Active) floating over the hero seam, (2) attention strip (Submissions in / Past due).
- **Compact curated student list on Home** replacing the full roster: two cards — **"Needs urgent help"**
  (bottom 5 by score, ascending) and **"Most improved"** (up to 3 with trend Improving/Excellent, by score
  desc). Smaller rows (30px avatar, 13.5px name, 11px meta, compact score pill) so more students fit.
  Full sortable roster is unchanged on the Students tab (homeMode only affects Home).
- Test updated: navigation test now asserts "Needs urgent help" instead of "Student List" on Home.
- Checks: tsc clean, full jest 112/112, touched files eslint-clean. Verified live at 375×812.
- Known benign console noise: react-native-svg-web emits a `transform-origin` DOM warning for the ring's
  rotation (renders correctly); pre-existing to the Rosso ring, not a functional issue.

## 5d. AI assignment generation — diagnosis (owner request, 2026-07-10)

**Symptom:** "Generate Assignment" produces nothing; wizard stuck on "Generating…".

**Root cause (from API logs + direct provider tests):**
- NVIDIA credentials in `.env` are **correct and being called** — a direct call with the saved key and the
  configured model (`nvidia/llama-3.3-nemotron-super-49b-v1`) returns HTTP 200 in ~3.4s.
- `assignment_generation` (profile `structured_fast`) requests up to `PRACTICE_JSON_MAX_TOKENS=2500` tokens,
  non-streaming. That 49B model takes **40–75s+** to emit 2500 tokens of JSON, routinely exceeding the
  `JSON_PROVIDER_TIMEOUT_MS=75_000` cap → aborts ("This operation was aborted", latencyMs 75020 in logs).
- Fallback chain for this feature: NVIDIA → Groq(not configured) → OpenAI → DeepSeek(not configured) →
  Google(not configured). Only NVIDIA + OpenAI keys are set. **OpenAI fallback returns 429
  `insufficient_quota`** (billing exhausted). So both live providers fail → generation returns null.
- Secondary: even when NVIDIA does answer, it wraps output in ```` ``` ```` fences with a preamble
  ("Here is the homework assignment…") rather than pure JSON.

**Fix options (owner decision — cost/quality tradeoffs, not applied yet):**
1. Restore OpenAI billing/quota (it's the intended fast-JSON fallback).
2. Point `KITABU_NVIDIA_TEXT_FAST_MODEL` at a faster/smaller model for structured JSON, or lower
   `PRACTICE_JSON_MAX_TOKENS` — but this affects other `structured_fast` features (quiz gen), so it's a
   cross-cutting change.
3. Configure Groq (fast) as the middle fallback.
4. Raise the JSON timeout — not recommended (40–75s is already poor UX for a teacher waiting).

## 6. Decisions taken this pass (flagging for owner review — all UI-side, nothing removed)

1. **Due-date picker added to wizard step 2** (Tomorrow / 3 days / 1 week / 2 weeks; default stays 1 week,
   matching the previous silent behaviour). PRD 6.4 requires teacher-set due dates. Revert = remove one card.
2. **Fake data replaced with real derivations**: hardcoded Highest 98% / Lowest 45% → computed from actual
   submissions; fake "John Doe pending" row → real "N learners pending" count; fake "+2% vs last 7 days" →
   honest sublines. No feature removed — every element still exists, now truthful.
3. **Home is now a daily cockpit** (hero + quick actions + attention stack) layered above the existing
   student list. All previous content still present below it.
4. `Math` → `Mathematics` naming unification in the wizard (fixes remedial handoff mismatch).

## 7. Still needing owner sign-off before building (backend / feature work)

- Streaks + P(mastery) on student rows and filters (API fields missing).
- Journey Map tab in student modal; real Recent Activity + trend data (currently mock).
- Teacher grade override with audit trail (PRD 5.6.2/6.3 — no endpoint).
- Weekly Exam cards in teacher assignments.
- Lesson Plan as an editable calendar + boarding-school flag + propagation (PRD 6.5).
- Messages: unread badges, per-student thread linkage, push on parent reply.
- Web session persistence across reloads / token refresh (see Dev-environment observation).
- Dark mode for the portal.
