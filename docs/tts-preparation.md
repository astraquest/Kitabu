# TTS content preparation

Kitabu stores generated speech in the shared TTS asset store and uses Postgres `tts_artifacts`/`tts_jobs` for durable metadata and background preparation. New artifacts are keyed by normalized spoken text, language, avatar voice, speaking settings, and pronunciation settings; provider and model are deliberately excluded from identity. Existing BYTEA artifacts remain readable during migration, while new ready rows reference a storage key/URL.

Cartesia is the synchronous primary provider when its API key and explicit avatar voice map are configured. Quota, rate-limit, unavailable, or missing-voice conditions defer the job to Gemini without a tight retry loop. The worker's normal poller processes Cartesia jobs; a once-daily Gemini overflow run is budgeted by the durable `tts_provider_usage_daily` ledger. Gemini uses the standard v1beta `generateContent` AUDIO path, never Batch. Start the worker with `npm --workspace @kitabu/api run start` after building, and run a bounded Gemini pass manually with `KITABU_TTS_MANUAL_LIMIT=2 npm --workspace @kitabu/api run tts:gemini` when needed.

Local filesystem storage is the explicit development default and remains the rollback option. For production Supabase Storage, set `KITABU_TTS_STORAGE_BACKEND=supabase`, provide `KITABU_SUPABASE_URL`, `KITABU_SUPABASE_SERVICE_ROLE_KEY`, and `KITABU_TTS_STORAGE_BUCKET` (normally `tts-audio`). The server-only adapter uses the service role for authenticated reads and idempotent upserts; it never sends that key to clients. Set `KITABU_TTS_PUBLIC_BASE_URL` (or the legacy `KITABU_TTS_STORAGE_PUBLIC_BASE_URL`) only when metadata should include public object URLs. The existing `http-put` backend remains available as an explicit compatibility option.

To promote the production local WAV catalog, run `node scripts/migrate-tts-to-supabase.mjs`. It defaults to exactly the 84 English onboarding artifacts, verifies each download's nonzero size and SHA-256 before updating its `tts_artifacts` metadata, refuses missing or mismatched files, never deletes the local copy, and supports `--dry-run` and `--expected-count N`. A successful rerun skips already-correct objects after verification.

After applying migrations, prepare imported QuizBank speech with:

```text
npm --workspace @kitabu/api run import:quiz-bank -- --enqueue-tts
```

This only enqueues the curated question prompt for each supported avatar voice (`Samora`, `Barake`, `Bella`, and `Judith`). It never enqueues answer options, question numbers, or checkbox labels. The worker performs Gemini calls asynchronously; tests and dry-run QuizBank validation do not call Gemini.

Prepare the landing and onboarding catalog against a local development database with:

```text
npm --workspace @kitabu/api run prepare:tts:onboarding
```

The command is retrieval-first: it reads the deterministic artifact identity before enqueueing, counts ready rows only when the row has `status = 'ready'`, a readable audio payload or storage key, `mime_type`, and `content_hash`, and relies on the unique identity/job constraints for idempotent retries. It refuses non-local database URLs. The landing carousel uses Samora as the documented pre-selection voice; onboarding switches to the selected avatar voice after selection. Current onboarding cues include the shared microphone-access copy and do not include the removed tutor-voice screen copy.

The native landing carousel also plays the checked-in `native-app/src/assets/landing-soundtrack.mp3` at volume `0.12`, loops it independently of narration, and removes it when the carousel unmounts. Regenerate that small local asset with `native-app/scripts/generate-landing-soundtrack.ps1` when needed; it never uses a remote runtime URL.

If Postgres is not configured, there is no durable artifact store. Local device audio caches remain playback caches only and are not a substitute for this server-side persistence.
