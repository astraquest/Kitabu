import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/072_assessment_tts_cache.sql', import.meta.url), 'utf8');
const assessmentTts = await readFile(new URL('../src/tts.ts', import.meta.url), 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS tts_assets\b/i);
assert.match(migration, /canonical_text TEXT NOT NULL/i);
assert.match(migration, /public_url TEXT/i);
assert.match(migration, /duration_ms INTEGER/i);
assert.match(migration, /status TEXT NOT NULL DEFAULT 'queued' CHECK \(status IN \('queued', 'processing', 'ready', 'failed', 'unavailable'\)\)/i);
assert.match(migration, /CREATE TABLE IF NOT EXISTS assessment_tts_jobs\b/i);
assert.match(migration, /CREATE TABLE IF NOT EXISTS assessment_tts_queue\b/i);
assert.match(migration, /identity_sha256 TEXT NOT NULL UNIQUE REFERENCES tts_assets\(identity_sha256\)/i);
assert.match(migration, /provider_submission_token TEXT NOT NULL UNIQUE/i);
assert.match(migration, /provider_job_name TEXT/i);
assert.match(migration, /provider_metadata JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
assert.match(migration, /last_polled_at TIMESTAMPTZ/i);
assert.match(migration, /status TEXT NOT NULL DEFAULT 'queued' CHECK \(status IN \('queued', 'submitting', 'submitted', 'polling', 'completed', 'failed', 'uncertain'\)\)/i);
assert.match(migration, /status TEXT NOT NULL DEFAULT 'queued' CHECK \(status IN \('queued', 'processing', 'done', 'failed'\)\)/i);
assert.match(migration, /ON assessment_tts_jobs \(status, last_polled_at, updated_at\)/i);
assert.match(migration, /ON assessment_tts_queue \(status, available_at, priority DESC, created_at ASC\)/i);
assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS tts_jobs\b/i);
assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS tts_queue\b/i);
assert.doesNotMatch(migration, /ON tts_jobs\b/i);
assert.doesNotMatch(migration, /ON tts_queue\b/i);

assert.ok((assessmentTts.match(/assessment_tts_jobs/g) ?? []).length >= 10);
assert.ok((assessmentTts.match(/assessment_tts_queue/g) ?? []).length >= 5);
assert.doesNotMatch(assessmentTts, /\b(?:FROM|JOIN|UPDATE|INTO) tts_jobs\b/i);
assert.doesNotMatch(assessmentTts, /\b(?:FROM|UPDATE|INTO) tts_queue\b/i);

console.log(JSON.stringify({ status: 'ok', migration: '072_assessment_tts_cache.sql' }));
