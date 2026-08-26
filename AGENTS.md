# AGENTS.md - Kitabu AI

## Codex Delegation Policy

Sol runs as the high-reasoning orchestrator. Luna runs as the only implementation agent at high reasoning; there are no fallback implementation agents. Sol plans, decomposes, delegates, and performs read-only acceptance review. When explicitly assigned, Luna owns repository, configuration, dependency, migration, Git, release, and deployment mutations, and returns the changed files, a diff summary, and verification evidence. Luna must not spawn or delegate to other agents.

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
