# Kitabu AI — SEO Content Strategy (v1, 2026-07-04)

Owner: growth. Extends Playbook Section 4 (keyword battle plan). This document is the
binding brief for every blog article written for kitabu.ai. Compliance guardrails
(Playbook 1.6) override everything in it.

---

## 1. Objective & reality check

**Goal:** own the branded SERP outright, reach page 1 in Kenya for Tier-1 commercial
terms within 6–12 months, and win the fresh exam-intent terms (KJSEA/KPSEA 2026) where
incumbents are weakest, via long-form content + entity authority + internal linking.

**Corrections to the raw keyword wishlist (recorded so we stay honest):**

1. **Bare "Kitabu" is the wrong target.** It is the Swahili word for "book"; the SERP
   is owned by unrelated entities: kitabu.co.ke (bookshop), eKitabu (accessibility
   e-books), Kytabu.africa (edtech, brand-collision risk per Playbook P0-2),
   Kitabu Africa (fintech), Swap Kitabu, KITABOO (India), plus dictionary results.
   Blog posts cannot displace a dictionary word. What we CAN own: **"Kitabu AI"**,
   **"Kitabu AI app"**, **"kitabu.ai"**, **"Kitabu app Kenya"** — and today
   kitabu.ai does not reliably surface even for "Kitabu AI". Branded-SERP ownership is
   priority #1 and is won with an entity pillar page + consistent citations (Playbook
   6.2), not generic articles.
2. **No competitor-naming comparison posts.** "X vs Zeraki" pages are classic SEO, but
   guardrail 8 forbids naming rivals in customer-facing material until a verified
   competitor matrix exists. We win the comparison intent with "how to choose"
   content that sets criteria only we fully meet (parent visibility, CBC-strand
   alignment, M-Pesa, KSh 250/mo).
3. **Backlinks cannot be shipped from this repo.** Competitor authority (e.g. Zeraki)
   comes overwhelmingly from funding/press coverage (TechCrunch, Kenyan Wallstreet,
   TechMoran, Safaricom newsroom, Vodafone) and school partnerships. The outreach plan
   lives in `backlinks.md`; content's job is to be worth linking to (citable
   explainers, exam guides with real dates and KNEC citations).
4. **"Platform" is a banned customer-copy word** (guardrail/voice). For the keyword
   "Kenya online learning platform" we carry the term in metadata/title only (same
   rule as "AI"), and write "online learning in Kenya" in flowing copy.

## 2. What ranks today (SERP research, 2026-07-04)

- **Direct AI-tutor rivals:** Curio AI ("Kenya's #1 CBC & CBE AI Tutors", Grade 4–12),
  TopScore AI, TutorBot AI, Somo AI (KSh 500/mo premium), Elimu Connect, SomaNami,
  EduMate Africa. Most have thin blogs; their rankings rest on homepage keyword
  stuffing + app-store presence.
- **The content king is cbcedukenya.com:** grade-specific free revision hubs + a blog
  of 2,000–2,600-word dated parent guides ("KJSEA 2026 … 7-Step Parent Plan",
  "Grade 10 CBC Pathways 2026: A Parent's Complete Guide", "KNEC CBA Portal Guide").
  Their pattern: year-stamped titles, H2 every 150–200 words, one data table, a
  step-by-step plan section, a "mistakes to avoid" section, KNEC/Ministry citations,
  4 soft CTAs, heavy internal linking. This is the model to beat — we beat it by being
  more useful per word, opinionated, and parent-first (they are materials-first).
- **Established e-learning SERP owners:** Zeraki (schools distribution + press
  backlinks), Eneza/Shupavu (mass reach), EasyElimu/Revise Kenya/Arena/KCSE Revision
  (past-paper content farms), Craydel/Dawati/elimuApp (listicle presence via
  insiderkenya, mmbitsolutions, Safaricom newsroom listicles).
- **Fresh exam intent is wide open:** "KJSEA 2026" (exam window 26 Oct – 20 Nov 2026)
  ranks blogs published weeks ago. Recency beats authority here — our fastest win.

## 3. Keyword → URL map (delta on Playbook 4.2)

| Keyword cluster | Primary URL | Supporting |
|---|---|---|
| kitabu ai / kitabu ai app / kitabu app / is kitabu ai legit / kitabu ai price | **/blog/what-is-kitabu-ai** (new pillar) | `/`, `/about`, `/pricing` |
| ai tutor kenya / cbc ai tutor / kenyan cbc ai tutor / private ai tutor kenya / best ai tutor app kenya | **/blog/ai-tutor-kenya-parents-guide** (new pillar) | `/`, `/blog/cbc-ai-tutor-kenya` |
| kenya online learning platform / online learning kenya / e-learning kenya / online classes kenya | **/blog/online-learning-kenya-guide** (new) | `/for-schools`, `/cbc-revision-app-kenya` |
| kjsea 2026 / kjsea revision / grade 9 revision kenya / junior school assessment | **/blog/kjsea-grade-9-parents-guide** (new) | `/junior-school-cbc-revision` |
| kpsea revision grade 6 / kpsea 2026 / grade 6 assessment kenya | **/blog/kpsea-grade-6-revision-guide** (new) | `/grade-6-kpsea-revision` |
| cbc vs cbe / what is cbe kenya / competency based education kenya | **/blog/cbc-vs-cbe-explained** (new, citable asset per Playbook 6.3) | `/curriculum-alignment` |
| how to help my child with cbc homework | /blog/help-child-cbc-homework (**expand**) | `/online-homework-help-kenya` |
| my child is failing maths | /blog/child-failing-maths-kenya (**expand**) | `/cbc-mathematics-revision` |
| is my child really revising / track child progress kenya | /blog/is-my-child-really-revising (**expand**) | `/for-parents` |

## 4. Article standards (every post, non-negotiable)

- **Length:** 1,500–2,200 words of unique, useful copy (pillars up to 2,400). No
  padding — every section must pass "would a real Kenyan parent learn something
  specific here?"
- **Structure:** H1 (carries target keyword naturally, once) → 40–60-word lede that
  answers the query immediately (AI-Overview bait) → H2 every 150–250 words → at least
  one step-by-step numbered plan → one "mistakes to avoid" or "red flags" section →
  FAQ block (4–6 Q&As, powers FAQPage schema) → single soft CTA paragraph at the end.
- **Allowed HTML:** `h2, h3, p, ul, ol, li, strong, em, a, blockquote, img`. **No
  tables** (the prose stylesheet has no table styles — use lists).
- **Citations:** 1–2 credible Kenyan sources linked (knec.ac.ke, kicd.ac.ke,
  education.go.ke). Never cite or name competitors.
- **Facts:** only facts provided in the brief's fact pack. No invented statistics,
  testimonials, school names, dates, or "studies show". If a number isn't in the
  fact pack, write around it.
- **Images:** ≥1 real app screenshot from `/assets/` with correct width/height +
  descriptive keyword-bearing alt, `loading="lazy"`, `style="max-width: 320px"` for
  the 1280×2856 phone shots.
- **Internal links:** 2–3 contextual (other blogs + one SEO landing), one soft CTA to
  `/` `/pricing/` or `/download/` at the end only (Playbook 3.4). No CTA stacking.
- **Voice:** warm, plain-spoken, proudly Kenyan; short sentences; concrete pictures
  (the Friday WhatsApp message, the green progress bar, the 8 PM homework standoff).
  Opinionated: we believe revision should be visible to parents, patient for
  learners, and affordable in KSh — say so. Kiswahili used deliberately (approved
  lines only). "AI" allowed in titles/metadata/H1; in flowing copy prefer "personal
  tutor / patient teacher / mwalimu wa nyumbani".
- **Compliance (Playbook 1.6 — overrides everything):** grades = "Grade 4–10 at
  launch, expanding to Senior School"; "CBC-aligned", never "KICD-approved"; offline =
  downloaded books & saved lessons only; holidays = "parent-led home revision";
  outcome claims = "watch real improvement, week by week" (never "D− to B+");
  safety = "guided, age-appropriate space built for schoolwork", no absolutes;
  teachers = "less routine marking", never "no marking"; never name competitors;
  banned words in copy: platform, ecosystem, leverage, robust, cutting-edge,
  revolutionary, disrupt, synergy, engine, algorithm, direction, surfaces, workflows,
  role-based.
- **Metadata:** title ≤ 60 chars incl. target keyword near the front, year-stamped
  where intent is fresh ("(2026)"); meta description 140–160 chars with a concrete
  hook + price where relevant.

## 5. Fact pack (verified 2026-07-04 — the ONLY external facts articles may state)

**Kitabu AI (canonical entity facts):** built by Jambo AI Studio, Nairobi; founder
Samora Kibagendi; personal tutor for Kenyan learners Grade 4–10 at launch, expanding
to Senior School; CBC-aligned strand by strand; English & Kiswahili; free ≈15-minute
diagnostic to start; KSh 250/month per learner lead price (weekly and annual options
exist); M-Pesa payment; parent dashboard + Friday WhatsApp progress summary; lessons,
practice, quizzes, leaderboards, streaks; downloaded books & saved lessons work
offline (live tutor needs a connection); teacher tools reduce routine marking; 30-day
free whole-school pilot; contact hello@kitabu.ai / WhatsApp +254 716 175 485.

**KJSEA (Kenya Junior School Education Assessment):** national Grade 9 assessment by
KNEC; 2026 window 26 Oct – 20 Nov 2026; first sat in Nov 2025; results are not
ranked school-by-school like the old KCPE; determines Senior School pathway placement
(from 2027 for the 2026 cohort); placement score = 20% KPSEA + 20% school-based
assessments (Grades 7–8) + 60% KJSEA exam; nine learning areas.

**KPSEA (Kenya Primary School Education Assessment):** national Grade 6 assessment by
KNEC at the end of primary; five papers (Mathematics; English; Kiswahili/Kenyan Sign
Language; Integrated Science; Creative Arts & Social Studies); it is a monitoring
assessment, not a ranked pass/fail exam like the old KCPE; contributes 20% to the
eventual junior-school placement score; every learner proceeds to Grade 7.

**CBC / CBE:** CBC (Competency Based Curriculum) introduced 2017, progressively
replacing 8-4-4; structure 2-6-3-3-3 (pre-primary 2, primary 6, junior school 3,
senior school 3, tertiary); following the Presidential Working Party on Education
Reform, the framework is now officially referred to as CBE (Competency Based
Education) — same competency approach, reorganized around learning pathways; Senior
School (Grade 10–12) offers three pathways: STEM, Social Sciences, and Arts & Sports
Science; the first Senior School (Grade 10) cohort began January 2026; assessment is
continuous (school-based) plus national checkpoints (KPSEA Grade 6, KJSEA Grade 9).

**Citation URLs:** https://www.knec.ac.ke (KJSEA/KPSEA guidelines),
https://kicd.ac.ke (curriculum designs, CBC materials), https://education.go.ke
(Ministry of Education).

## 6. The article slate (9 pieces)

Briefs below; full per-article direction is given to the writer. Order = priority.

1. **/blog/what-is-kitabu-ai** — "What Is Kitabu AI? Every Question Parents Ask,
   Answered" (branded pillar, ~1,800 w). Owns the branded SERP + feeds AI-search
   entity answers ("is Kitabu AI legit", "how much does Kitabu AI cost"). Plain
   factual entity sentences an AI assistant can quote. FAQ-heavy.
2. **/blog/ai-tutor-kenya-parents-guide** — "AI Tutor in Kenya (2026): The Complete
   Parent's Guide" (category pillar, ~2,400 w). Target: ai tutor kenya, kenyan cbc ai
   tutor. What AI tutoring is, what it can/can't do, safety, cost anchoring, 7
   criteria for choosing (our promise as the bar), red flags (answer-dumping apps,
   generic chatbots with no syllabus), how to start.
3. **/blog/kjsea-grade-9-parents-guide** — "KJSEA 2026: A Grade 9 Parent's Guide —
   Dates, Scoring, and a Calm Revision Plan" (~2,000 w). Fastest win: fresh intent,
   weak incumbents. Term-by-term plan to the 26 Oct window.
4. **/blog/online-learning-kenya-guide** — "Online Learning in Kenya (2026): What
   Actually Works for Grade 4–10 Families" (~2,000 w). Target: kenya online learning
   platform (metadata carries "platform"). Honest guide: when online learning works,
   when it doesn't, cost of data, phones vs cybercafé myths, what to demand from any
   product (visibility, syllabus alignment, M-Pesa).
5. **/blog/kpsea-grade-6-revision-guide** — "KPSEA Explained: How to Prepare Your
   Grade 6 Child Without Panic" (~1,800 w). Demystify (not ranked, 20% weight),
   5-paper breakdown, weekly revision rhythm, parent script.
6. **/blog/cbc-vs-cbe-explained** — "CBC vs CBE: What Actually Changed (Plain-Language
   Guide for Parents)" (~1,800 w). The citable explainer (Playbook 6.3) journalists
   and AI assistants can quote. Timeline, what stayed the same, pathways, assessments.
7. **/blog/help-child-cbc-homework** — EXPAND existing to ~1,600 w + FAQ (keep the
   voice and best lines; add: a worked example of "show me how your teacher did it",
   subject-by-subject quick tips, the 20-minute evening routine, FAQ).
8. **/blog/child-failing-maths-kenya** — EXPAND to ~1,600 w + FAQ (add: the foundation
   chain Grade 5→8 explained concretely, 3 signs it's a gap not laziness, what a good
   diagnostic asks, term-recovery timeline, FAQ).
9. **/blog/is-my-child-really-revising** — EXPAND to ~1,600 w + FAQ (add: the
   5-minute weekly check ritual, phone rules that don't cause war, what "productive
   screen time" looks like in data, FAQ).

Future queue (log in content-gaps): grade-by-grade revision guides (G4–G10), senior
school pathway chooser, teacher workload series, "cost of private tuition in Nairobi"
data piece, Kiswahili-language flagship post.

## 7. Technical/site changes shipping with this batch

- Article template: FAQPage schema + rendered FAQ accordion, `og:image` on articles
  (was missing), visible publish date retained.
- Articles refactored out of `build-pages.mjs` into `apps/web/build/articles/*.mjs`
  (one module per article) so the content engine can grow to weekly posts without a
  1,000-line monolith.
- Homepage `#blog` grid + footer "Learn" column updated with the new pillars.
- Sitemap regenerated (articles auto-included).

## 8. Measurement (per Playbook 4.7 — needs GSC post-launch)

Weekly: GSC page-2 goldmine sprint + low-CTR title rewrites. Monthly: AI-mention
audit (10 standard queries, Playbook 6.4), cannibalization check (watch:
/blog/cbc-ai-tutor-kenya vs /blog/ai-tutor-kenya-parents-guide — if they collide,
301 the old post into the pillar). 90-day targets: #1 for "kitabu ai" and "kitabu ai
app"; page 1 for "kjsea 2026" and "kpsea revision grade 6"; page 2→1 sprints running
on "ai tutor kenya" and "cbc revision app kenya".
