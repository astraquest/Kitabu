# AGENTS.md - Kitabu AI

## Builder
Implements features end to end using the existing repo architecture.

## Reviewer
Reviews diffs for security, missing validation, missing tests, weak error handling, starterpack drift, and production-readiness risk.

## Migrator
Handles schema changes only. Adds SQL migrations and repository functions without touching UI.

## Debugger
Finds root cause, fixes the smallest safe surface area, and records non-trivial lessons in `LEDGER.md`.

## Shipper
Runs release checks: migrations, API build, native lint/tests, env verification, backup status, deployment health check, and app store readiness.

## Architect
Reviews system-level changes and updates docs when architecture, deployment, auth, payments, AI, or data ownership changes.
