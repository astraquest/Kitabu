# Kitabu QuizBank Completion Contract

## Rewritten Objective

Build a production-ready Kenya CBC QuizBank for Kitabu AI.

The QuizBank must cover every supported Kenya CBC grade and subject in the canonical manifest at `apps/api/data/quiz-bank/KEN/CBC/manifest.json`. Every question available from harvested past exams must be extracted and stored — there is no per-subject cap. Questions must be accurate, grade appropriate, varied in difficulty, tied to strand, sub-strand, and learning outcome metadata, and reusable across QuizMe, Take Quiz, Game Zone, homework assignment setting, review, and flashcards.

## Canonical Scope

- Country: Kenya (`KEN`)
- Curriculum: CBC / KNEC (`CBC`)
- Grades: Grade 1 through Grade 12
- Question source: harvested official past assessments (KNEC SBA/KJSEA/KCSE, mocks, predictions) with their marking schemes
- Total target: every extractable exam question per grade-subject cell

## Completion Gate

The goal is complete only when all of these are true:

1. `apps/api/data/quiz-bank/KEN/CBC/manifest.json` is the active source of truth for Kenya CBC grade-subject coverage.
2. Every manifest grade-subject cell has a corresponding question file at `apps/api/data/quiz-bank/KEN/CBC/questions/<grade-code>/<subject-id>.json`.
3. Every question file contains all extracted, valid questions for that cell (no artificial cap).
4. Automated validation passes with `node apps/api/scripts/quiz-bank/validate-quiz-bank.mjs`.
5. The database schema allows large per-subject question volumes (question_number up to 1000, unique per country+curriculum+grade+subject+number).
6. `/quiz-bank?grade=...&subjectId=...` returns only matching subject questions, with legacy app subject aliases supported.
7. The data imports into `quiz_bank_questions` with `npm run import:quiz-bank -- --dry-run` and then `npm run import:quiz-bank` without duplicate-key collisions.
8. QuizMe, Take Quiz, Game Zone, Homework, and Flashcards can consume the same normalized fields without custom reshaping.
9. No question uses placeholder text such as `Correct answer`, `Fallback Practice Set`, or synthetic filler as final content.
10. A review pass verifies grade fit, answer accuracy, difficulty spread, and duplicate avoidance.

## Worker Model

Generation work should be split by grade-subject cell. Each worker owns exactly one output file:

`apps/api/data/quiz-bank/KEN/CBC/questions/<grade-code>/<subject-id>.json`

Workers must not edit shared schema, scripts, app code, or another worker's output file. Shared validators and importers are owned by the main thread.

