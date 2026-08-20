import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyticsEventInputSchema,
  analyticsConsentInputSchema,
  buildProviderPayload,
  deterministicPaymentEventId,
  dispatchAnalyticsEvent,
  eligibleAnalyticsProviders,
  hashProviderExternalId,
  providerEventName,
  providerResponseAccepted,
  resolveServerAnalyticsContext,
  sanitizeAnalyticsEvent,
  sanitizeAnalyticsProperties
} from './analytics.js';
import { appConfig } from './config.js';

const baseEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  name: 'purchase' as const,
  occurredAt: new Date().toISOString(),
  anonymousId: '22222222-2222-4222-8222-222222222222',
  platform: 'server' as const,
  source: 'server' as const,
  properties: { plan_code: 'monthly', amount_ksh_cents: 2500, email: 'blocked@example.com', content: 'blocked' },
  consent: { analytics: true, marketing: false },
  attribution: {}
};

test('sanitizer keeps only event-specific minimized properties', () => {
  assert.deepEqual(sanitizeAnalyticsProperties('purchase', baseEvent.properties), {
    plan_code: 'monthly', amount_ksh_cents: 2500
  });
  const parsed = analyticsEventInputSchema.parse(baseEvent);
  assert.equal(sanitizeAnalyticsEvent(parsed, null).userId, null);
});

test('payment lifecycle event IDs are deterministic UUIDs and differ by lifecycle', () => {
  const purchase = deterministicPaymentEventId('purchase', '33333333-3333-4333-8333-333333333333', 'receipt-1');
  assert.equal(purchase, deterministicPaymentEventId('purchase', '33333333-3333-4333-8333-333333333333', 'receipt-1'));
  assert.match(purchase, /^[0-9a-f-]{36}$/);
  assert.notEqual(purchase, deterministicPaymentEventId('payment_not_completed', '33333333-3333-4333-8333-333333333333', 'receipt-1'));
});

test('provider mapping carries event ID for dedupe and does not include raw identity', () => {
  const event = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse(baseEvent), '44444444-4444-4444-8444-444444444444');
  const payload = buildProviderPayload('posthog', event) as Record<string, unknown>;
  assert.equal(payload.uuid, event.eventId);
  assert.equal(JSON.stringify(payload).includes('blocked@example.com'), false);
  assert.deepEqual(eligibleAnalyticsProviders({ analytics: false, marketing: false }), []);
});

test('provider mappings use standard names and hashed identities', () => {
  assert.equal(providerEventName('meta', 'page_view'), 'PageView');
  assert.equal(providerEventName('meta', 'signup_completed'), 'CompleteRegistration');
  assert.equal(providerEventName('meta', 'pricing_viewed'), 'ViewContent');
  assert.equal(providerEventName('meta', 'checkout_started'), 'InitiateCheckout');
  assert.equal(providerEventName('meta', 'purchase'), 'Purchase');
  assert.equal(providerEventName('tiktok', 'purchase'), 'CompletePayment');
  assert.equal(providerEventName('ga4', 'signup_completed'), 'sign_up');
  assert.equal(providerEventName('ga4', 'pricing_viewed'), 'view_item');
  assert.equal(providerEventName('ga4', 'checkout_started'), 'begin_checkout');
  const rawId = '44444444-4444-4444-8444-444444444444';
  assert.equal(hashProviderExternalId(rawId), hashProviderExternalId(rawId.toUpperCase()));
  assert.notEqual(hashProviderExternalId(rawId), rawId);
});

test('advertising payloads hash identity, carry safe source URL, and use TikTok pixel data shape', () => {
  const originalPixel = appConfig.KITABU_TIKTOK_PIXEL_CODE;
  appConfig.KITABU_TIKTOK_PIXEL_CODE = 'pixel-test';
  try {
    const parsed = analyticsEventInputSchema.parse({
      ...baseEvent,
      name: 'page_view',
      source: 'website',
      platform: 'web',
      properties: { path: '/pricing', role: 'student', grade: 'Grade 4' },
      consent: { analytics: true, marketing: true },
      attribution: { fbp: 'fb.1.1234567890.browser', fbc: 'fb.1.1234567890.click', ttp: 'ttp_cookie', ttclid: 'click-id' }
    });
    const event = sanitizeAnalyticsEvent(parsed, '44444444-4444-4444-8444-444444444444');
    const meta = buildProviderPayload('meta', event) as { data: Array<Record<string, unknown>> };
    const metaEvent = meta.data[0] as { user_data: Record<string, unknown>; event_source_url: string; action_source: string };
    assert.equal(metaEvent.action_source, 'website');
    assert.equal(metaEvent.event_source_url, 'https://kitabu.ai/pricing');
    assert.equal((metaEvent.user_data.external_id as string[])[0], hashProviderExternalId(event.userId!));
    assert.equal(JSON.stringify(meta).includes(event.userId!), false);
    const tiktok = buildProviderPayload('tiktok', event) as { event_source_id: string; data: Array<Record<string, unknown>> };
    assert.equal(tiktok.event_source_id, 'pixel-test');
    assert.equal((tiktok.data[0] as { event: string }).event, 'ViewContent');
    assert.equal(JSON.stringify(tiktok).includes(event.userId!), false);
  } finally {
    appConfig.KITABU_TIKTOK_PIXEL_CODE = originalPixel;
  }
});

test('advertising grade minimization removes student grade and derives only parent band', () => {
  const makeEvent = (role: 'student' | 'parent') => sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
    ...baseEvent,
    name: 'onboarding_completed',
    properties: { role, grade: 'Grade 4' },
    consent: { analytics: true, marketing: true }
  }), null);
  const studentPayload = JSON.stringify(buildProviderPayload('meta', makeEvent('student')));
  assert.equal(studentPayload.includes('Grade 4'), false);
  const parentPayload = JSON.stringify(buildProviderPayload('meta', makeEvent('parent')));
  assert.equal(parentPayload.includes('Grade 4'), false);
  assert.equal(parentPayload.includes('grade_band'), true);
  assert.equal(parentPayload.includes('4-6'), true);
});

test('Meta request keeps access token out of URL and safe delivery logs', async () => {
  const previousPixel = appConfig.KITABU_META_PIXEL_ID;
  const previousToken = appConfig.KITABU_META_CAPI_ACCESS_TOKEN;
  const previousPosthog = appConfig.KITABU_POSTHOG_KEY;
  const previousTiktokPixel = appConfig.KITABU_TIKTOK_PIXEL_CODE;
  const previousTiktokToken = appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN;
  const previousGa4Id = appConfig.KITABU_GA4_MEASUREMENT_ID;
  const previousGa4Secret = appConfig.KITABU_GA4_API_SECRET;
  const previousFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const logs: unknown[] = [];
  appConfig.KITABU_META_PIXEL_ID = 'pixel-test';
  appConfig.KITABU_META_CAPI_ACCESS_TOKEN = 'secret-token';
  appConfig.KITABU_POSTHOG_KEY = undefined;
  appConfig.KITABU_TIKTOK_PIXEL_CODE = undefined;
  appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = undefined;
  appConfig.KITABU_GA4_MEASUREMENT_ID = undefined;
  appConfig.KITABU_GA4_API_SECRET = undefined;
  globalThis.fetch = (async (url, init) => {
    requestUrl = String(url);
    requestInit = init;
    return new Response('{"events_received":1,"debug":"response-body-secret"}', { status: 200 });
  }) as typeof fetch;
  try {
    const event = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
      ...baseEvent,
      name: 'purchase',
      consent: { analytics: true, marketing: true }
    }), '44444444-4444-4444-8444-444444444444');
    const results = await dispatchAnalyticsEvent(event, ['meta'], (data) => logs.push(data));
    assert.deepEqual(results, [{ provider: 'meta', ok: true, status: 200, error: undefined }]);
    assert.equal(requestUrl, 'https://graph.facebook.com/v25.0/pixel-test/events');
    assert.equal(requestUrl.includes('secret-token'), false);
    assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer secret-token');
    assert.equal(JSON.stringify(logs).includes('secret-token'), false);
    assert.equal(JSON.stringify(logs).includes('response-body-secret'), false);
  } finally {
    appConfig.KITABU_META_PIXEL_ID = previousPixel;
    appConfig.KITABU_META_CAPI_ACCESS_TOKEN = previousToken;
    appConfig.KITABU_POSTHOG_KEY = previousPosthog;
    appConfig.KITABU_TIKTOK_PIXEL_CODE = previousTiktokPixel;
    appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = previousTiktokToken;
    appConfig.KITABU_GA4_MEASUREMENT_ID = previousGa4Id;
    appConfig.KITABU_GA4_API_SECRET = previousGa4Secret;
    globalThis.fetch = previousFetch;
  }
});

test('provider response acceptance is strict for Meta and TikTok but HTTP-based for PostHog and GA4', () => {
  assert.equal(providerResponseAccepted('meta', 200, '{"events_received":1}'), true);
  assert.equal(providerResponseAccepted('meta', 200, '{}'), false);
  assert.equal(providerResponseAccepted('meta', 200, '{"events_received":0}'), false);
  assert.equal(providerResponseAccepted('meta', 200, '{"error":{"message":"rejected"}}'), false);
  assert.equal(providerResponseAccepted('meta', 200, 'not-json'), false);
  assert.equal(providerResponseAccepted('tiktok', 200, '{"code":0}'), true);
  assert.equal(providerResponseAccepted('tiktok', 200, '{"code":1001,"message":"rejected"}'), false);
  assert.equal(providerResponseAccepted('tiktok', 200, '{}'), false);
  assert.equal(providerResponseAccepted('posthog', 204, ''), true);
  assert.equal(providerResponseAccepted('ga4', 204, ''), true);
  assert.equal(providerResponseAccepted('posthog', 500, ''), false);
});

test('TikTok HTTP success rejection returns bounded provider_rejected without response leakage', async () => {
  const previousPixel = appConfig.KITABU_TIKTOK_PIXEL_CODE;
  const previousToken = appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN;
  const previousPosthog = appConfig.KITABU_POSTHOG_KEY;
  const previousMetaPixel = appConfig.KITABU_META_PIXEL_ID;
  const previousMetaToken = appConfig.KITABU_META_CAPI_ACCESS_TOKEN;
  const previousGa4Id = appConfig.KITABU_GA4_MEASUREMENT_ID;
  const previousGa4Secret = appConfig.KITABU_GA4_API_SECRET;
  const previousFetch = globalThis.fetch;
  const logs: unknown[] = [];
  appConfig.KITABU_TIKTOK_PIXEL_CODE = 'pixel-test';
  appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = 'tiktok-secret';
  appConfig.KITABU_POSTHOG_KEY = undefined;
  appConfig.KITABU_META_PIXEL_ID = undefined;
  appConfig.KITABU_META_CAPI_ACCESS_TOKEN = undefined;
  appConfig.KITABU_GA4_MEASUREMENT_ID = undefined;
  appConfig.KITABU_GA4_API_SECRET = undefined;
  globalThis.fetch = (async () => new Response('{"code":1001,"message":"provider-response-secret"}', { status: 200 })) as typeof fetch;
  try {
    const event = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
      ...baseEvent,
      name: 'page_view',
      source: 'website',
      platform: 'web',
      consent: { analytics: true, marketing: true }
    }), null);
    const results = await dispatchAnalyticsEvent(event, ['tiktok'], (data) => logs.push(data));
    assert.deepEqual(results, [{ provider: 'tiktok', ok: false, status: 200, error: 'provider_rejected' }]);
    assert.equal(JSON.stringify(logs).includes('provider-response-secret'), false);
    assert.equal(JSON.stringify(logs).includes('tiktok-secret'), false);
  } finally {
    appConfig.KITABU_TIKTOK_PIXEL_CODE = previousPixel;
    appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = previousToken;
    appConfig.KITABU_POSTHOG_KEY = previousPosthog;
    appConfig.KITABU_META_PIXEL_ID = previousMetaPixel;
    appConfig.KITABU_META_CAPI_ACCESS_TOKEN = previousMetaToken;
    appConfig.KITABU_GA4_MEASUREMENT_ID = previousGa4Id;
    appConfig.KITABU_GA4_API_SECRET = previousGa4Secret;
    globalThis.fetch = previousFetch;
  }
});

test('Meta HTTP success error and zero-events responses are rejected without body leakage', async () => {
  const previousPixel = appConfig.KITABU_META_PIXEL_ID;
  const previousToken = appConfig.KITABU_META_CAPI_ACCESS_TOKEN;
  const previousPosthog = appConfig.KITABU_POSTHOG_KEY;
  const previousTiktokPixel = appConfig.KITABU_TIKTOK_PIXEL_CODE;
  const previousTiktokToken = appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN;
  const previousGa4Id = appConfig.KITABU_GA4_MEASUREMENT_ID;
  const previousGa4Secret = appConfig.KITABU_GA4_API_SECRET;
  const previousFetch = globalThis.fetch;
  const logs: unknown[] = [];
  const responses = [
    '{"error":{"message":"meta-response-secret"}}',
    '{"events_received":0}'
  ];
  appConfig.KITABU_META_PIXEL_ID = 'pixel-test';
  appConfig.KITABU_META_CAPI_ACCESS_TOKEN = 'meta-secret';
  appConfig.KITABU_POSTHOG_KEY = undefined;
  appConfig.KITABU_TIKTOK_PIXEL_CODE = undefined;
  appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = undefined;
  appConfig.KITABU_GA4_MEASUREMENT_ID = undefined;
  appConfig.KITABU_GA4_API_SECRET = undefined;
  globalThis.fetch = (async () => new Response(responses.shift() ?? '{}', { status: 200 })) as typeof fetch;
  try {
    const event = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
      ...baseEvent,
      name: 'purchase',
      consent: { analytics: true, marketing: true }
    }), null);
    const first = await dispatchAnalyticsEvent(event, ['meta'], (data) => logs.push(data));
    const second = await dispatchAnalyticsEvent(event, ['meta'], (data) => logs.push(data));
    assert.deepEqual(first, [{ provider: 'meta', ok: false, status: 200, error: 'provider_rejected' }]);
    assert.deepEqual(second, [{ provider: 'meta', ok: false, status: 200, error: 'provider_rejected' }]);
    assert.equal(JSON.stringify(logs).includes('meta-response-secret'), false);
    assert.equal(JSON.stringify(logs).includes('meta-secret'), false);
  } finally {
    appConfig.KITABU_META_PIXEL_ID = previousPixel;
    appConfig.KITABU_META_CAPI_ACCESS_TOKEN = previousToken;
    appConfig.KITABU_POSTHOG_KEY = previousPosthog;
    appConfig.KITABU_TIKTOK_PIXEL_CODE = previousTiktokPixel;
    appConfig.KITABU_TIKTOK_EVENTS_ACCESS_TOKEN = previousTiktokToken;
    appConfig.KITABU_GA4_MEASUREMENT_ID = previousGa4Id;
    appConfig.KITABU_GA4_API_SECRET = previousGa4Secret;
    globalThis.fetch = previousFetch;
  }
});

test('attribution cookies are accepted only with marketing consent', () => {
  const input = { ...baseEvent, attribution: { fbp: 'fb.1.1234567890.browser', fbc: 'fb.1.1234567890.click', ttp: 'ttp_cookie' } };
  const noMarketing = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({ ...input, consent: { analytics: true, marketing: false } }), null);
  assert.equal(noMarketing.attribution.fbp, undefined);
  const marketing = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({ ...input, consent: { analytics: true, marketing: true } }), null);
  assert.equal(marketing.attribution.fbp, 'fb.1.1234567890.browser');
});

test('server lifecycle consent context safely falls back without stored context', () => {
  const fallback = resolveServerAnalyticsContext('44444444-4444-4444-8444-444444444444', null);
  assert.equal(fallback.anonymousId, '44444444-4444-4444-8444-444444444444');
  assert.deepEqual(fallback.consent, { analytics: false, marketing: false });
  assert.deepEqual(fallback.attribution, {});
  const stored = resolveServerAnalyticsContext('44444444-4444-4444-8444-444444444444', {
    anonymousId: '55555555-5555-4555-8555-555555555555',
    analytics: false,
    marketing: true,
    latestAttribution: { utm_campaign: 'parent-campaign' },
    clientId: 'client-1',
    appInstanceId: 'instance-1'
  });
  assert.equal(stored.anonymousId, '55555555-5555-4555-8555-555555555555');
  assert.deepEqual(stored.consent, { analytics: false, marketing: true });
  assert.equal(stored.attribution.utm_campaign, 'parent-campaign');
});

test('strict ingestion contract rejects unknown top-level fields and invalid source/platform pairs', () => {
  assert.equal(analyticsEventInputSchema.safeParse({ ...baseEvent, unexpected: true }).success, false);
  assert.equal(analyticsEventInputSchema.safeParse({ ...baseEvent, source: 'website', platform: 'android' }).success, false);
});

test('client-delivered GA4 is excluded from server dispatch eligibility', () => {
  const previousId = appConfig.KITABU_GA4_MEASUREMENT_ID;
  const previousSecret = appConfig.KITABU_GA4_API_SECRET;
  appConfig.KITABU_GA4_MEASUREMENT_ID = 'G-test';
  appConfig.KITABU_GA4_API_SECRET = 'secret';
  try {
    assert.deepEqual(eligibleAnalyticsProviders({ analytics: true, marketing: false }, ['ga4']), []);
  } finally {
    appConfig.KITABU_GA4_MEASUREMENT_ID = previousId;
    appConfig.KITABU_GA4_API_SECRET = previousSecret;
  }
});

test('native student and unknown contexts remain first-party only', () => {
  const enabled = { analytics: true, marketing: true };
  assert.deepEqual(eligibleAnalyticsProviders(enabled, [], { source: 'native', role: 'student' }), []);
  assert.deepEqual(eligibleAnalyticsProviders(enabled, [], { source: 'native', role: null }), []);
  assert.deepEqual(eligibleAnalyticsProviders(enabled, [], { source: 'native', role: 'parent' }), eligibleAnalyticsProviders(enabled));
  assert.equal(analyticsConsentInputSchema.safeParse({ analytics: false, marketing: false, source: 'native', platform: 'ios', version: '1' }).success, true);
  assert.equal(analyticsConsentInputSchema.safeParse({ analytics: false, marketing: false, source: 'native', platform: 'web', version: '1' }).success, false);
});

test('immediate dispatch honors the persisted provider allowlist and sends no native student request', async () => {
  const previousPosthog = appConfig.KITABU_POSTHOG_KEY;
  const previousFetch = globalThis.fetch;
  let requests = 0;
  appConfig.KITABU_POSTHOG_KEY = 'test-posthog-key';
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    const serverEvent = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
      ...baseEvent,
      consent: { analytics: true, marketing: false }
    }), null);
    await dispatchAnalyticsEvent(serverEvent, ['posthog']);
    assert.equal(requests, 1);

    const studentEvent = sanitizeAnalyticsEvent(analyticsEventInputSchema.parse({
      ...baseEvent,
      platform: 'android',
      source: 'native',
      consent: { analytics: true, marketing: true }
    }), null);
    const approved = eligibleAnalyticsProviders(studentEvent.consent, [], { source: 'native', role: 'student' });
    await dispatchAnalyticsEvent(studentEvent, approved);
    assert.equal(requests, 1);
  } finally {
    appConfig.KITABU_POSTHOG_KEY = previousPosthog;
    globalThis.fetch = previousFetch;
  }
});
