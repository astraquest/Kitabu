# Onboarding rollout measurement plan

This plan covers the Phase 4/5 onboarding funnel instrumentation. It does not require a feature-flag service or a deployment change.

## Staged rollout

1. Establish a seven-day baseline for the current onboarding flow across student, parent, and teacher roles.
2. Compare the new flow with one role at a time, starting with internal/staff users, then a small student cohort, then parent and teacher cohorts.
3. Expand only after the current-vs-new comparison is stable for one full week and no guardrail is breached.

The API keeps legacy selection clients valid. New events are versioned (`eventVersion = 1`) and can be compared by role, event type, and step.

## Metrics

- Completion: unique sessions with `complete` / unique sessions with `view`.
- Step conversion: unique sessions reaching each step, with `selection`, `skip`, and `back` counts.
- Drop-off: `drop_off` sessions by step and role.
- Permission outcome: granted, denied, unsupported, and error results at the reminder step.
- Quality: onboarding submit errors, time from first view to completion, and identified-user rate.
- Rollout comparison: report every metric for current and new cohorts, split by role, country/curriculum, and app version where available.

Use sessions as the primary denominator; events are counts of actions and can exceed one per session.

## Guardrails

Pause expansion if any role shows a sustained (two-day) completion decline of 10% or more versus its baseline, a drop-off increase of 10 percentage points at one step, a material rise in onboarding submit errors, or a permission prompt/error regression. Also pause for accessibility defects affecting keyboard navigation, screen-reader progress, touch targets, or reduced-motion users.

## Rollback signal

Rollback the new cohort when the completion or error guardrail remains breached after one measurement window and is not explained by traffic mix or an external dependency. The rollback action is to route the affected role back to the existing onboarding path and keep event ingestion enabled so the comparison remains observable. Resume rollout only after the signal returns to baseline for two consecutive days.
