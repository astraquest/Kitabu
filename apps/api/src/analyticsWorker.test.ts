import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { analyticsRetryDelayMs, runAnalyticsWorkerOnce } from './analyticsWorker.js';
import type { AnalyticsDeliveryClaim } from './repositories.js';
import type { AnalyticsProvider } from './analytics.js';
import { appConfig } from './config.js';
import { db, redis } from './db.js';

// The worker's eligibility check is intentionally credential-aware. Tests use
// sentinel configuration only; no provider requests are made by these fakes.
appConfig.KITABU_POSTHOG_KEY = 'test-posthog-key';
appConfig.KITABU_META_PIXEL_ID = 'test-meta-pixel';
appConfig.KITABU_META_CAPI_ACCESS_TOKEN = 'test-meta-token';

after(async () => {
  await db.end();
  redis.disconnect();
});

const consent = {
  anonymousId: '22222222-2222-4222-8222-222222222222',
  analytics: true,
  marketing: true,
  firstAttribution: {},
  latestAttribution: {},
  clientId: null,
  appInstanceId: null
};

function claim(provider: AnalyticsProvider, source = 'website', userId: string | null = null, attempts = 1): AnalyticsDeliveryClaim {
  return {
    eventId: '11111111-1111-4111-8111-111111111111',
    provider,
    attempts,
    event: {
      eventId: '11111111-1111-4111-8111-111111111111',
      name: 'page_view',
      occurredAt: new Date(),
      anonymousId: consent.anonymousId,
      userId,
      platform: source === 'native' ? 'android' : 'web',
      source,
      properties: { path: '/' },
      consent: { analytics: true, marketing: true },
      attribution: {}
    }
  };
}

function dependencies(claims: AnalyticsDeliveryClaim[]) {
  const completed: Array<{ status: string; next: Date | null }> = [];
  const dispatched: AnalyticsProvider[][] = [];
  return {
    completed,
    dispatched,
    claimDeliveries: async () => claims,
    findConsent: async () => consent,
    findRoles: async (): Promise<string[]> => [],
    dispatch: async (_event: unknown, providers: readonly AnalyticsProvider[]) => {
      dispatched.push([...providers]);
      return providers.map(provider => ({ provider, ok: true }));
    },
    complete: async (_eventId: string, _provider: AnalyticsProvider, _owner: string, status: 'delivered' | 'failed' | 'skipped', _error: string | undefined, next: Date | null) => {
      completed.push({ status, next });
    },
    skipAll: async () => undefined,
    log: undefined,
    now: () => new Date('2026-08-19T10:00:00.000Z')
  };
}

test('worker dispatches only the claimed provider and records success', async () => {
  const deps = dependencies([claim('posthog')]);
  const result = await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 1000 }, deps);
  assert.deepEqual(deps.dispatched, [['posthog']]);
  assert.deepEqual(deps.completed.map(item => item.status), ['delivered']);
  assert.deepEqual(result, { claimed: 1, delivered: 1, skipped: 0, failed: 0 });
});

test('worker applies bounded exponential backoff after provider rejection', async () => {
  const deps = dependencies([claim('posthog', 'website', null, 2)]);
  deps.dispatch = async (_event, providers) => providers.map(provider => ({ provider, ok: false, error: 'provider_rejected' }));
  const result = await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 250 }, deps);
  assert.equal(result.failed, 1);
  assert.equal(deps.completed[0].status, 'failed');
  assert.equal(deps.completed[0].next?.toISOString(), '2026-08-19T10:00:00.200Z');
  assert.equal(analyticsRetryDelayMs(10, 100, 250), 250);
});

test('withdrawn analytics consent skips all providers without dispatch', async () => {
  const deps = dependencies([claim('posthog')]);
  deps.findConsent = async () => ({ ...consent, analytics: false, marketing: false });
  let skipCount = 0;
  deps.skipAll = async () => { skipCount += 1; };
  await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 1000 }, deps);
  assert.equal(skipCount, 1);
  assert.deepEqual(deps.dispatched, []);
  assert.deepEqual(deps.completed, []);
});

test('marketing withdrawal skips advertising providers while analytics providers remain eligible', async () => {
  const deps = dependencies([claim('meta')]);
  deps.findConsent = async () => ({ ...consent, marketing: false });
  await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 1000 }, deps);
  assert.deepEqual(deps.dispatched, []);
  assert.equal(deps.completed[0].status, 'skipped');
});

test('native student rows are conservatively skipped with zero provider requests', async () => {
  const deps = dependencies([claim('posthog', 'native', '33333333-3333-4333-8333-333333333333')]);
  deps.findRoles = async () => ['student'];
  await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 1000 }, deps);
  assert.deepEqual(deps.dispatched, []);
  assert.equal(deps.completed[0].status, 'skipped');
});

test('max-attempt failure has no next retry time', async () => {
  const deps = dependencies([claim('posthog', 'website', null, 5)]);
  deps.dispatch = async (_event, providers) => providers.map(provider => ({ provider, ok: false, error: 'HTTPError' }));
  await runAnalyticsWorkerOnce({ owner: 'test', batchSize: 10, maxAttempts: 5, leaseMs: 1000, baseBackoffMs: 100, maxBackoffMs: 1000 }, deps);
  assert.equal(deps.completed[0].status, 'failed');
  assert.equal(deps.completed[0].next, null);
});
