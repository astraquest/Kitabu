# Generated Books Phase 1 Feedback Template

Use this template when manually testing `published-for-testing` KITABU QUEST books. The goal is to capture enough evidence for Phase 2 remediation without mixing subjective impressions with actionable defects.

## Tester Details

- Tester:
- Date:
- Account used:
- Device/browser:
- Country/curriculum selected:
- Grade selected:

## Book Feedback

Create one entry per issue.

```text
Issue ID:
Country:
Curriculum:
Grade:
Subject:
Book title:
Book ID:
Page number:
Page title:

Issue type:
- Content accuracy
- Curriculum coverage
- Age appropriateness
- Language/grammar
- Repetition or filler
- Missing explanation
- Weak example/activity
- Wrong local context
- Safety concern
- Formatting/rendering
- Cover/library display
- Download/offline package
- Other

Severity:
- Blocker: learner could be misled, unsafe, unable to read, or book should not be used.
- High: materially weak or incorrect, should be fixed before final acceptance.
- Medium: noticeable quality issue, should be fixed in Phase 2.
- Low: polish or preference.

What happened:

Expected improvement:

Evidence:
- Exact quote or short excerpt:
- Screenshot/file name:
- Steps to reproduce:

Reviewer recommendation:
- Fix in Phase 2
- Accept for testing, revisit later
- Not a valid issue
```

## Book-Level Review Summary

Use this after checking a full book or a representative sample.

```text
Country:
Curriculum:
Grade:
Subject:
Book ID:
Pages reviewed:

Overall decision:
- Testing OK
- Needs Phase 2 fixes
- Block from final acceptance

Strengths:

Main fixes needed:

Coverage gaps noticed:

Repeated patterns noticed:

Pages that need priority review:
```

## Phase 2 Intake Rules

- Every accepted issue must include country, grade, subject, book ID, and page number.
- Content defects should be fixed in the generator or source-normalization path where possible, not only by hand-editing one output page.
- Do not promote a book to `ready-for-cover`, `library-ready`, or `published-library` until blocker and high-severity accepted findings are resolved and re-reviewed.
- Keep Phase 1 `published-for-testing` status until the book has passed Phase 2 content acceptance.
- If a report affects multiple books, create one issue for the pattern and list representative affected pages.
