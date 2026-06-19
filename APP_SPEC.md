# APP_SPEC.md - Kitabu AI

## What It Does
Kitabu AI is a React Native tutoring app for Kenyan Grade 4-10 learners. It provides AI-assisted lessons, quizzes, homework support, games, curriculum delivery, teacher workflows, school administration, and M-Pesa subscriptions.

## Target User
Kenyan students, parents, teachers, and schools using Android-first mobile devices. Primary language is English, with Kiswahili-ready product direction.

## Revenue Model
Hybrid subscription model:
- Free tier for acquisition
- Weekly, monthly, annual individual subscriptions via M-Pesa
- School-managed pricing and pilots

## Material System
Material: porcelain
Light source: top-left

Hero objects:
- Home: Learning dashboard - pending assignments, subjects, and tutor entry point - opens a learning flow.
- Subscription: Plan card - price and billing cycle - starts M-Pesa checkout.

Object vocabulary:
- SubjectTile: tile - subject entry point - subject name and learning state.
- TutorInput: control - AI tutor access - typed or live tutor request.
- PaymentPlan: card - monetization choice - plan price and billing cycle.

CTA types used:
- Primary: BLOCK_BUTTON
- Secondary: TILE_ACTION

Forbidden for this app:
- Heavy platform migrations before launch unless explicitly approved.
- Direct AI/provider calls from mobile clients.
- DB access outside the API/repository layer.

## Design Overrides
- Primary color override: #2563EB
- Font override: system
- Corner radius override: existing React Native styles

## Feature Flags to Enable
- payments.mpesa_sms
- notifications.in_app

## AI Models
Server-side provider selection only. OpenAI is primary when configured; Gemini is fallback for current implementation. Future app-specific model changes must stay behind the API AI layer.

## Pages / Screens
- Intro and auth
- Student dashboard
- Subject learning
- AI Education subject entry and baseline diagnostic
- Lessons, quizzes, brain tease
- Homework
- Bookshelf and reader
- Podcasts
- Game Zone
- AI chat and live audio tutor
- Teacher portal
- Admin portal
- Profile, billing, notifications

## Integrations
- PostgreSQL
- Redis
- M-Pesa Daraja
- SMTP email
- OpenAI
- Gemini
- Africa's Talking SMS
- Sentry/PostHog configuration hooks

## Launch Checklist Override
Keep the current Fastify + React Native CLI architecture. Treat starterpack choices like Next.js, Expo, Drizzle, Better Auth, and PayPal as future migration candidates, not launch blockers.

## Current PRD Parity Notes
- Implemented: mandatory Math + English onboarding diagnostic, progressive subject diagnostics, AI Education subject shell, mastery/confidence persistence, spaced repetition schedules, in-app notifications, M-Pesa subscription flow, teacher portal, and admin school/pricing/curriculum surfaces.
- Remaining: parent dashboard, weekly exams, richer mastery-driven remediation/unlocks, school pilot onboarding/reporting flows, production environment separation/deployment, backup restore validation, Sentry/structured logging, prompt versioning, and per-user AI rate limits.
