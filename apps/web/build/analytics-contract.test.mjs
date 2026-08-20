import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const service = read('site-20260818.js');

test('public analytics service has bounded IDs, attribution, consent and retry queue', () => {
  assert.match(service, /var anonymousId = null/);
  assert.match(service, /var sessionId = null/);
  assert.match(service, /if \(consent && consent\.analytics\) \{/);
  assert.match(service, /persistentId\(localStorage, ANON_KEY, shouldPersist\)/);
  assert.match(service, /persistentId\(sessionStorage, SESSION_KEY, shouldPersist\)/);
  assert.doesNotMatch(service, /var anonymousId = persistentId\(localStorage/);
  assert.match(service, /clearAnalyticsStorage\(\)/);
  assert.match(service, /FIRST_ATTRIBUTION_KEY/);
  assert.match(service, /LATEST_ATTRIBUTION_KEY/);
  assert.match(service, /MAX_QUEUE = 100/);
  assert.match(service, /MAX_ATTEMPTS = 3/);
  assert.match(service, /pendingConsentEvents/);
  assert.match(service, /data-consent="necessary"/);
  assert.match(service, /data-consent="analytics"/);
  assert.match(service, /data-consent="all"/);
  assert.match(service, /parsed\.accepted !== true/);
  assert.match(service, /String\(Date\.now\(\) \+ uuidCounter\)\.slice\(-12\)\.padStart\(12, '0'\)/);
  assert.doesNotMatch(read('site-20260704.js'), /__kitabuEvents|window\.posthog/);
  assert.doesNotMatch(service, /__kitabuLegacyEvents|legacyTrack|legacyNames/);
  assert.doesNotMatch(read('site-20260704.js'), /__kitabuLegacyEvents/);
});

test('provider queues initialize before delivery and only initialized GA4 is declared client-delivered', () => {
  assert.ok(service.indexOf("window.fbq('init', config.metaPixelId)") < service.indexOf("loadScript('https://connect.facebook.net"));
  assert.ok(service.indexOf('ttq.load(config.tiktokPixelCode)') < service.indexOf("loadScript('https://analytics.tiktok.com"));
  assert.ok(service.indexOf('ttq.load(config.tiktokPixelCode)') < service.indexOf('ttq.page()'));
  assert.match(service, /loadedProviders\.ga4 = typeof window\.gtag === 'function' && Array\.isArray\(window\.dataLayer\)/);
  assert.match(service, /loadedProviders\.ga4 && window\.gtag && window\.dataLayer/);
});

test('UUID fallback remains a v4-shaped 36-character identifier without crypto', () => {
  const storage = (initial = {}) => ({
    values: { ...initial },
    getItem(key) { return this.values[key] || null; },
    setItem(key, value) { this.values[key] = String(value); },
    removeItem(key) { delete this.values[key]; }
  });
  const localStorage = storage();
  const sessionStorage = storage();
  const noop = () => {};
  const document = {
    cookie: '', referrer: '', readyState: 'complete',
    head: { appendChild: noop }, body: { appendChild: noop },
    addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ addEventListener: noop, setAttribute: noop, querySelectorAll: () => [] })
  };
  const window = {
    KITABU_ANALYTICS_CONFIG: {}, location: { search: '', origin: 'https://kitabu.ai', pathname: '/' },
    addEventListener: noop, setTimeout: noop, console: { debug: noop }
  };
  window.localStorage = localStorage; window.sessionStorage = sessionStorage;
  const context = { window, document, localStorage, sessionStorage, navigator: {}, URLSearchParams, Blob, Date, setTimeout: noop, isFinite };
  vm.runInNewContext(service, context);
  const eventId = window.kitabuAnalytics.track('page_view', { path: '/' });
  assert.match(eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(eventId.length, 36);
  assert.equal(localStorage.getItem('kitabu_analytics_anonymous_id_v1'), null);
  assert.equal(sessionStorage.getItem('kitabu_analytics_session_id_v1'), null);
  assert.equal(localStorage.getItem('kitabu_attribution_first_v1'), null);
  assert.equal(localStorage.getItem('kitabu_analytics_queue_v1'), null);
  window.kitabuAnalytics.setConsent({ analytics: true, marketing: false });
  assert.match(localStorage.getItem('kitabu_analytics_anonymous_id_v1'), /^[0-9a-f-]{36}$/i);
  assert.match(sessionStorage.getItem('kitabu_analytics_session_id_v1'), /^[0-9a-f-]{36}$/i);
  assert.ok(localStorage.getItem('kitabu_analytics_queue_v1'));
});

test('canonical website service classifies only real Play destinations as downloads', () => {
  assert.equal(service.includes('play\\.google\\.com\\/store'), true);
  assert.match(service, /destination_class: 'play_store'/);
  assert.match(service, /href\.indexOf\('wa\.me\/'\) === -1/);
  assert.match(service, /landing_page_engaged/);
  assert.match(service, /30_percent_scroll/);
  assert.match(service, /school_demo_started/);
  assert.match(service, /data-pricing-module/);
});

test('public client config contains identifiers only and no provider secrets', () => {
  const config = read('analytics-config.js');
  assert.match(config, /metaPixelId/);
  assert.match(config, /tiktokPixelCode/);
  assert.match(config, /ga4MeasurementId/);
  assert.doesNotMatch(config, /access[_-]?token|api[_-]?secret|secret/i);
});

test('generated canonical pages reference config/service/legacy assets and privacy disclosure', () => {
  for (const page of ['index.html', 'pricing/index.html', 'download/index.html', 'schools/demo/index.html', 'blog/what-is-kitabu-ai.html']) {
    const html = read(page);
    assert.match(html, /analytics-config\.js/);
    assert.match(html, /site-20260818\.js/);
    assert.match(html, /site-20260704\.js/);
    assert.doesNotMatch(html, /connect\.facebook\.net|googletagmanager\.com|analytics\.tiktok\.com/);
  }
  assert.match(read('pricing/index.html'), /data-pricing-module/);
  assert.match(read('privacy/index.html'), /GA4 may load with analytics-only consent/);
  assert.match(read('privacy/index.html'), /Meta Pixel, TikTok Pixel and Google Ads load only after explicit/);
  assert.match(read('policy/index.html'), /Privacy settings/);
  assert.match(read('_headers'), /\/site-20260818\.js[\s\S]*immutable/);
  assert.match(read('_headers'), /\/analytics-config\.js[\s\S]*max-age=60, must-revalidate/);
  assert.equal(existsSync(new URL('analytics-config.js', root)), true);
});
