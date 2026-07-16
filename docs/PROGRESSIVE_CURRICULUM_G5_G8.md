# Progressive curriculum: Grades 5–8

This release publishes the first three distinct locally stored source units or sub-strands for every
core subject in Kenya Grades 5–8. Learner-facing wording is normalized where a
PDF extraction merged table columns; topic identity and order remain traceable to
the stored source.

## Source hierarchy

1. **Grades 5 and 6:** reviewed KICD-derived book plans are the ordering source.
   Grade 5 plans are preserved at Git commit `6137466`. The exact Grade 6
   source-plan snapshots are pinned per subject to commits `3d4ae610` and
   `cc84b126`, under `apps/api/data/books/KEN/CBC/G{5,6}/*/book-plan.json`.
   Their manifests record official KICD preview URLs and reviewed extraction,
   while correctly retaining draft/testing content status.
2. **Grades 7 and 8:** no direct KICD plan is stored in the repository. The
   validated `apps/api/data/quiz-bank/KEN/CBC/questions/grade-{7,8}` files are the
   available CBC evidence. Topic order is therefore the first occurrence of each
   unique strand/sub-strand in those files, and every chapter records its source
   file and question range.
3. **Religious Education:** the manifest exposes one blended subject rather than
   a selected CRE, IRE, or HRE pathway. Where no source-backed plan exists, the
   chapters are explicitly provisional, pluralistic, and non-doctrinal. A future
   curriculum import should replace them after the learner's pathway is known.

## Authoring contract

Every published chapter has five distinct activities, a guided-to-checkpoint
progression, one active opening interaction (bucket sorting or a choice sprint), at least four procedural visual
presentations, four unique choices for every multiple-choice checkpoint, private
server-side answers, misconception codes, teachable hints, and concise feedback.
Scenes use familiar Kenyan school, home, market, community, nature, studio, farm,
and computer-lab contexts. Mascots remain milestone and feedback companions; they
are not used as decorative clutter on every activity.

The API validates this contract while constructing the immutable lesson catalog,
and the test suite independently checks chapter counts, curriculum order, answer
privacy, deterministic grading, interaction solvability, and path aliases.
