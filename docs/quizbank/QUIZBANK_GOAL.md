# Kitabu QuizBank Completion Contract

## Rewritten Objective

Build a production-ready Kenya CBC QuizBank for Kitabu AI.

The QuizBank must cover every supported Kenya CBC grade and subject in the canonical manifest at `apps/api/data/quiz-bank/KEN/CBC/manifest.json`. Each grade-subject cell must contain exactly 100 validated questions. Questions must be accurate, grade appropriate, varied in difficulty, tied to strand, sub-strand, and learning outcome metadata, and reusable across QuizMe, Take Quiz, Game Zone, homework assignment setting, review, and flashcards.

## Canonical Scope

- Country: Kenya (`KEN`)
- Curriculum: CBC / KNEC (`CBC`)
- Grades: Grade 4 through Grade 12
- Question target: 100 questions per subject per grade
- Total target from current manifest: 12,600 questions

## Question Requirements

Every question must include:

- `questionNumber`: 1 through 100, unique inside one grade-subject file
- `type`: `MCQ`, `TRUE_FALSE`, `SHORT_ANSWER`, or `ESSAY`
- `prompt`: clear, age-appropriate, and answerable without hidden context
- `options`: 4 plausible options for MCQ, 2 options for TRUE_FALSE, empty array for written formats
- `correctAnswer`: exact expected answer or option text
- `explanation`: short teaching explanation, not just an answer key
- `difficulty`: 1 through 5, with mixed difficulty across the file
- `strandTitle`, `subStrandTitle`, `learningOutcome`: curriculum-aligned metadata
- `cognitiveLevel`: `recall`, `understand`, `apply`, `analyze`, or `create`
- `featureTags`: one or more of `quiz_me`, `take_quiz`, `quiz_battle`, `homework`, `flashcards`, `games`

## Completion Gate

The goal is complete only when all of these are true:

1. `apps/api/data/quiz-bank/KEN/CBC/manifest.json` is the active source of truth for Kenya CBC grade-subject coverage.
2. Every manifest grade-subject cell has a corresponding question file at `apps/api/data/quiz-bank/KEN/CBC/questions/<grade-code>/<subject-id>.json`.
3. Every question file has exactly 100 valid questions.
4. Automated validation passes with `node apps/api/scripts/quiz-bank/validate-quiz-bank.mjs`.
5. The database schema allows 100 questions per subject per grade, not just 100 per grade.
6. `/quiz-bank?grade=...&subjectId=...` returns only matching subject questions, with legacy app subject aliases supported.
7. The data imports into `quiz_bank_questions` with `npm run import:quiz-bank -- --dry-run` and then `npm run import:quiz-bank` without duplicate-key collisions.
8. QuizMe, Take Quiz, Game Zone, Homework, and Flashcards can consume the same normalized fields without custom reshaping.
9. No question uses placeholder text such as `Correct answer`, `Fallback Practice Set`, or synthetic filler as final content.
10. A review pass verifies grade fit, answer accuracy, difficulty spread, and duplicate avoidance.

## Worker Model

Generation work should be split by grade-subject cell. Each worker owns exactly one output file:

`apps/api/data/quiz-bank/KEN/CBC/questions/<grade-code>/<subject-id>.json`

Workers must not edit shared schema, scripts, app code, or another worker's output file. Shared validators and importers are owned by the main thread.
