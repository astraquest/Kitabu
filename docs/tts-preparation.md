# TTS content preparation

Kitabu stores generated Gemini speech in Postgres (`tts_artifacts.audio_data`) and uses `tts_jobs` for durable background preparation. Artifacts are keyed by normalized spoken text, selected avatar voice, and the configured Gemini TTS model. The API returns a durable artifact on a cache hit or generates and stores it on a miss.

The API worker runs the queue in `worker-fallback` mode. Gemini batch TTS is not assumed or emulated because this repository does not have a verified batch API path for this model. Start the existing worker with `npm --workspace @kitabu/api run start` after building, and set `KITABU_TTS_WORKER_ENABLED=false` only when another worker process is responsible for the queue. Retries are bounded by `KITABU_TTS_MAX_ATTEMPTS`.

After applying migrations, prepare imported QuizBank speech with:

```text
npm --workspace @kitabu/api run import:quiz-bank -- --enqueue-tts
```

This only enqueues the curated question prompt for each supported avatar voice (`Samora`, `Barake`, `Bella`, and `Judith`). It never enqueues answer options, question numbers, or checkbox labels. The worker performs Gemini calls asynchronously; tests and dry-run QuizBank validation do not call Gemini.

Prepare the landing and onboarding catalog against a local development database with:

```text
npm --workspace @kitabu/api run prepare:tts:onboarding
```

The command is retrieval-first: it reads the deterministic artifact key before enqueueing, counts ready rows only when the row has `status = 'ready'`, non-empty `audio_data`, `mime_type`, and `content_hash`, and relies on the unique artifact/job constraints for idempotent retries. It refuses non-local database URLs. The landing carousel uses Samora as the documented pre-selection voice; onboarding switches to the selected avatar voice after selection. Both paths use the same durable Gemini-only speech endpoint.

The native landing carousel also plays the checked-in `native-app/src/assets/landing-soundtrack.mp3` at volume `0.12`, loops it independently of narration, and removes it when the carousel unmounts. Regenerate that small local asset with `native-app/scripts/generate-landing-soundtrack.ps1` when needed; it never uses a remote runtime URL.

If Postgres is not configured, there is no durable artifact store. Local device audio caches remain playback caches only and are not a substitute for this server-side persistence.
