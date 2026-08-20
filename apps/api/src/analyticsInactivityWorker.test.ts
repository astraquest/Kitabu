import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  buildInactivityEvent,
  inactivityDays,
  intersectAnalyticsProviders,
  processAnalyticsInactivityCandidate,
  runAnalyticsInactivityOnce,
  type InactivityCandidateProcessorDependencies,
  type InactivityDependencies
} from './analyticsInactivityWorker.js';
import { appConfig } from './config.js';
import { db, redis } from './db.js';
import { eligibleAnalyticsProviders, deterministicInactivityEventId } from './analytics.js';

after(async () => {
  await db.end();
  redis.disconnect();
});

const now = new Date('2026-08-19T12:00:00.000Z');
const candidate = {
  userId: '11111111-1111-4111-8111-111111111111',
  lastActivityAt: new Date('2026-08-12T12:00:00.000Z'),
  lastSurface: 'learning_session_completed'
};
const context = {
  anonymousId: '22222222-2222-4222-8222-222222222222',
  analytics: true,
  marketing: true,
  firstAttribution: {},
  latestAttribution: {},
  clientId: null,
  appInstanceId: null
};

test('inactivity threshold uses full elapsed days and deterministic episode IDs', () => {
  assert.equal(inactivityDays(now, candidate.lastActivityAt), 7);
  assert.equal(inactivityDays(new Date('2026-08-19T11:59:59.999Z'), candidate.lastActivityAt), 6);
  const first = deterministicInactivityEventId(candidate.userId, candidate.lastActivityAt);
  assert.equal(first, deterministicInactivityEventId(candidate.userId, candidate.lastActivityAt));
  assert.match(first, /^[0-9a-f-]{36}$/);
  const event = buildInactivityEvent(candidate, context, now);
  assert.equal(event.name, 'user_inactive');
  assert.deepEqual(event.properties, { days_inactive: 7, last_surface: 'learning_session_completed' });
  assert.equal(JSON.stringify(event.properties).includes(candidate.userId), false);
});

test('maintenance is once per episode and emits again after resumed activity', async () => {
  let emitted = false;
  const deps: InactivityDependencies = {
    listCandidates: async () => [candidate],
    processCandidate: async () => {
      if (emitted) return 'skipped';
      emitted = true;
      return 'emitted';
    }
  };
  const first = await runAnalyticsInactivityOnce({ thresholdDays: 7, batchSize: 10 }, deps, now);
  const second = await runAnalyticsInactivityOnce({ thresholdDays: 7, batchSize: 10 }, deps, now);
  assert.deepEqual(first, { scanned: 1, emitted: 1, skipped: 0 });
  assert.deepEqual(second, { scanned: 1, emitted: 0, skipped: 1 });

  emitted = false;
  const resumedCandidate = { ...candidate, lastActivityAt: new Date('2026-08-12T12:00:01.000Z') };
  deps.listCandidates = async () => [resumedCandidate];
  const resumed = await runAnalyticsInactivityOnce({ thresholdDays: 7, batchSize: 10 }, deps, now);
  assert.equal(resumed.emitted, 1);
});

test('no-consent candidate is skipped and maintenance failure is isolated', async () => {
  const logs: unknown[] = [];
  let calls = 0;
  const deps: InactivityDependencies = {
    listCandidates: async () => [candidate, { ...candidate, userId: '33333333-3333-4333-8333-333333333333' }],
    processCandidate: async () => {
      calls += 1;
      if (calls === 1) throw new Error('database_unavailable');
      return 'skipped';
    },
    log: data => logs.push(data)
  };
  const result = await runAnalyticsInactivityOnce({ thresholdDays: 7, batchSize: 10 }, deps, now);
  assert.deepEqual(result, { scanned: 2, emitted: 0, skipped: 2 });
  assert.equal(calls, 2);
  assert.equal(JSON.stringify(logs).includes(candidate.userId), false);
});

test('server lifecycle marketing delivery requires verified adult role', () => {
  const previous = {
    posthog: appConfig.KITABU_POSTHOG_KEY,
    metaId: appConfig.KITABU_META_PIXEL_ID,
    metaToken: appConfig.KITABU_META_CAPI_ACCESS_TOKEN,
    tiktokCode: appConfig.KITABU_TIKTOK_PIXEL_CODE,
    tiktokToken: appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN
  };
  appConfig.KITABU_POSTHOG_KEY = 'test-posthog';
  appConfig.KITABU_META_PIXEL_ID = 'test-meta';
  appConfig.KITABU_META_CAPI_ACCESS_TOKEN = 'test-meta-token';
  appConfig.KITABU_TIKTOK_PIXEL_CODE = 'test-tiktok';
  appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = 'test-tiktok-token';
  try {
    const marketing = { analytics: true, marketing: true };
    assert.equal(eligibleAnalyticsProviders(marketing, [], { source: 'server', role: 'student' }).includes('meta'), false);
    assert.equal(eligibleAnalyticsProviders(marketing, [], { source: 'server', role: null }).includes('tiktok'), false);
    assert.equal(eligibleAnalyticsProviders(marketing, [], { source: 'server', role: 'parent' }).includes('meta'), true);
    assert.deepEqual(intersectAnalyticsProviders(['posthog'], ['posthog', 'meta']), ['posthog']);
    assert.deepEqual(intersectAnalyticsProviders(['meta'], []), []);
  } finally {
    appConfig.KITABU_POSTHOG_KEY = previous.posthog;
    appConfig.KITABU_META_PIXEL_ID = previous.metaId;
    appConfig.KITABU_META_CAPI_ACCESS_TOKEN = previous.metaToken;
    appConfig.KITABU_TIKTOK_PIXEL_CODE = previous.tiktokCode;
    appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = previous.tiktokToken;
  }
});

test('candidate processor claims before insert, rechecks consent, and preserves stored provider allowlist', async () => {
  const previousPosthog = appConfig.KITABU_POSTHOG_KEY;
  const previousMetaId = appConfig.KITABU_META_PIXEL_ID;
  const previousMetaToken = appConfig.KITABU_META_CAPI_ACCESS_TOKEN;
  appConfig.KITABU_POSTHOG_KEY = 'test-posthog';
  appConfig.KITABU_META_PIXEL_ID = 'test-meta';
  appConfig.KITABU_META_CAPI_ACCESS_TOKEN = 'test-meta-token';
  try {
    let claim = false;
    let consent: typeof context | null = context;
    let inserts = 0;
    let marks = 0;
    let dispatched: string[] = [];
    const insertedProviders: string[][] = [];
    const makeDeps = (): InactivityCandidateProcessorDependencies => ({
      transaction: async work => work({
        claimEpisode: async () => claim,
        findConsent: async () => consent,
        findRoles: async () => ['parent'],
        insertEvent: async (_event, providers) => { inserts += 1; insertedProviders.push([...providers]); },
        markEmitted: async () => { marks += 1; }
      }),
      findConsent: async () => consent,
      findRoles: async () => ['parent'],
      dispatch: async (_event, providers) => {
        dispatched = [...providers];
        return providers.map(provider => ({ provider, ok: true }));
      },
      audit: async () => undefined
    });

    assert.equal(await processAnalyticsInactivityCandidate(candidate, now, makeDeps()), 'skipped');
    assert.equal(inserts, 0);

    claim = true;
    consent = { ...context, analytics: false };
    assert.equal(await processAnalyticsInactivityCandidate(candidate, now, makeDeps()), 'skipped');
    assert.equal(inserts, 0);

    consent = context;
    assert.equal(await processAnalyticsInactivityCandidate(candidate, now, makeDeps()), 'emitted');
    assert.equal(inserts, 1);
    assert.equal(marks, 1);
    assert.deepEqual(insertedProviders[0], ['posthog', 'meta']);
    assert.deepEqual(dispatched, ['posthog', 'meta']);

    consent = { ...context, marketing: false };
    assert.equal(await processAnalyticsInactivityCandidate({ ...candidate, lastActivityAt: new Date('2026-08-12T12:00:01.000Z') }, now, makeDeps()), 'emitted');
    assert.deepEqual(insertedProviders[1], ['posthog']);
    assert.deepEqual(dispatched, ['posthog']);
  } finally {
    appConfig.KITABU_POSTHOG_KEY = previousPosthog;
    appConfig.KITABU_META_PIXEL_ID = previousMetaId;
    appConfig.KITABU_META_CAPI_ACCESS_TOKEN = previousMetaToken;
  }
});

test('repository candidate contract uses presence, consent-at-selection, effective activity, and bounded batches', async () => {
  const source = await readFile(new URL('./repositories.ts', import.meta.url), 'utf8');
  assert.match(source, /presence_last_seen_at/);
  assert.match(source, /JOIN analytics_consent_states consent/);
  assert.match(source, /consent\.analytics_consent = TRUE/);
  assert.match(source, /effective_activity/);
  assert.match(source, /LIMIT \$2/);
});
