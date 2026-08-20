/* Kitabu AI — first-party consent-aware marketing analytics. */
(function () {
  'use strict';

  var API_BASE = window.KITABU_API_BASE || 'https://app.kitabu.ai';
  var CONSENT_KEY = 'kitabu_consent_v1';
  var ANON_KEY = 'kitabu_analytics_anonymous_id_v1';
  var SESSION_KEY = 'kitabu_analytics_session_id_v1';
  var FIRST_ATTRIBUTION_KEY = 'kitabu_attribution_first_v1';
  var LATEST_ATTRIBUTION_KEY = 'kitabu_attribution_latest_v1';
  var QUEUE_KEY = 'kitabu_analytics_queue_v1';
  var CONSENT_VERSION = 1;
  var MAX_QUEUE = 100;
  var MAX_QUEUE_BYTES = 240000;
  var MAX_ATTEMPTS = 3;
  var DEBUG = window.KITABU_ANALYTICS_DEBUG === true;
  var config = window.KITABU_ANALYTICS_CONFIG || {};
  var sending = false;
  var consent = readJson(localStorage, CONSENT_KEY);
  var pendingConsentEvents = [];
  var loadedProviders = {};
  var fired = {};
  var anonymousId = null;
  var sessionId = null;
  var attribution = { first: {}, latest: {} };
  var uuidCounter = 0;

  var canonicalNames = {
    page_view: true,
    landing_page_engaged: true,
    app_download_clicked: true,
    first_open: true,
    signup_started: true,
    signup_completed: true,
    profile_setup_started: true,
    onboarding_completed: true,
    first_tutor_session: true,
    learning_session_completed: true,
    pricing_viewed: true,
    checkout_started: true,
    payment_not_completed: true,
    purchase: true,
    subscription_renewed: true,
    purchase_refunded: true,
    subscription_expired: true,
    user_inactive: true
  };
  var allowedProperties = {
    page_view: ['path', 'page_title', 'locale'],
    landing_page_engaged: ['path', 'engagement_type'],
    app_download_clicked: ['platform', 'placement', 'path', 'destination_class'],
    pricing_viewed: ['plan_code', 'billing_cycle', 'source_page'],
    first_open: ['install_source'],
    signup_started: ['role', 'entry_point'],
    signup_completed: ['role', 'entry_point'],
    profile_setup_started: ['role'],
    onboarding_completed: ['role'],
    first_tutor_session: ['subject'],
    learning_session_completed: ['subject', 'duration_seconds', 'completed']
  };

  function log() {
    if (DEBUG && window.console && console.debug) console.debug.apply(console, arguments);
  }
  function storageGet(storage, key) {
    try { return storage && storage.getItem(key); } catch (_error) { return null; }
  }
  function storageSet(storage, key, value) {
    try { if (storage) storage.setItem(key, value); } catch (_error) { /* storage is optional */ }
  }
  function storageRemove(storage, key) {
    try { if (storage) storage.removeItem(key); } catch (_error) { /* storage is optional */ }
  }
  function readJson(storage, key) {
    try { var raw = storageGet(storage, key); return raw ? JSON.parse(raw) : null; } catch (_error) { return null; }
  }
  function writeJson(storage, key, value) { storageSet(storage, key, JSON.stringify(value)); }
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = Array.prototype.map.call(bytes, function (value) { return ('0' + value.toString(16)).slice(-2); }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-8' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
    }
    uuidCounter += 1;
    return '00000000-0000-4000-8000-' + String(Date.now() + uuidCounter).slice(-12).padStart(12, '0');
  }
  function persistentId(storage, key, shouldPersist) {
    var existing = storageGet(storage, key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    var created = uuid();
    if (shouldPersist) storageSet(storage, key, created);
    return created;
  }
  function ensureAnalyticsIdentity(shouldPersist) {
    anonymousId = persistentId(localStorage, ANON_KEY, shouldPersist);
    sessionId = persistentId(sessionStorage, SESSION_KEY, shouldPersist);
  }
  function clearAnalyticsStorage() {
    storageRemove(localStorage, ANON_KEY);
    storageRemove(sessionStorage, SESSION_KEY);
    storageRemove(localStorage, FIRST_ATTRIBUTION_KEY);
    storageRemove(localStorage, LATEST_ATTRIBUTION_KEY);
    storageRemove(localStorage, QUEUE_KEY);
    anonymousId = uuid();
    sessionId = uuid();
    attribution = { first: {}, latest: {} };
  }
  function syncConsent(analyticsAllowed, marketingAllowed, anonymousIdSnapshot) {
    if (!window.fetch) return;
    var payload = {
      analytics: Boolean(analyticsAllowed),
      marketing: Boolean(marketingAllowed),
      source: 'website',
      platform: 'web',
      version: String(CONSENT_VERSION)
    };
    if (anonymousIdSnapshot && /^[0-9a-f-]{36}$/i.test(anonymousIdSnapshot)) payload.anonymousId = anonymousIdSnapshot;
    window.fetch(API_BASE + '/analytics/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () { /* consent withdrawal remains local-first and fail-safe */ });
  }

  function bounded(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : value;
  }
  function cookie(name) {
    var prefix = name + '=';
    return document.cookie.split(';').map(function (part) { return part.trim(); }).filter(function (part) { return part.indexOf(prefix) === 0; }).map(function (part) { return decodeURIComponent(part.slice(prefix.length)); })[0] || undefined;
  }
  function attributionSnapshot(marketingAllowed) {
    var params = new URLSearchParams(window.location.search);
    var result = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'].forEach(function (key) {
      var value = bounded(params.get(key) || '', 180);
      if (value) result[key] = value;
    });
    if (document.referrer && document.referrer.indexOf(window.location.origin) !== 0) result.referrer = bounded(document.referrer, 500);
    if (marketingAllowed) {
      [['fbp', ['fbp', '_fbp']], ['fbc', ['fbc', '_fbc']], ['ttp', ['ttp', '_ttp']]].forEach(function (item) { var value = bounded(cookie(item[1][0]) || cookie(item[1][1]) || '', 180); if (value) result[item[0]] = value; });
    }
    return result;
  }
  function mergeAttribution(marketingAllowed, shouldPersist) {
    var latest = attributionSnapshot(marketingAllowed);
    var storedFirst = shouldPersist ? readJson(localStorage, FIRST_ATTRIBUTION_KEY) : null;
    var first = storedFirst || attribution.first || latest;
    if (shouldPersist) {
      if (!storedFirst) writeJson(localStorage, FIRST_ATTRIBUTION_KEY, first);
      writeJson(localStorage, LATEST_ATTRIBUTION_KEY, latest);
    }
    return { first: first, latest: latest };
  }
  if (consent && consent.analytics) {
    ensureAnalyticsIdentity(true);
    attribution = mergeAttribution(Boolean(consent.marketing), true);
  } else {
    clearAnalyticsStorage();
    attribution = mergeAttribution(Boolean(consent && consent.marketing), false);
  }

  function getConsent() {
    return consent && consent.version === CONSENT_VERSION ? { analytics: Boolean(consent.analytics), marketing: Boolean(consent.marketing) } : null;
  }
  function consentAllowsAnalytics() { return Boolean(consent && consent.analytics); }

  function safeProperties(name, properties) {
    var allowed = allowedProperties[name] || [];
    var output = {};
    (properties || {});
    Object.keys(properties || {}).forEach(function (key) {
      if (allowed.indexOf(key) === -1) return;
      var value = properties[key];
      if (typeof value === 'string') output[key] = bounded(value, 160);
      else if (typeof value === 'number' && isFinite(value)) output[key] = value;
      else if (typeof value === 'boolean') output[key] = value;
    });
    return output;
  }
  function providerIds() {
    return config.ga4MeasurementId && consentAllowsAnalytics() && loadedProviders.ga4 && window.gtag && window.dataLayer ? ['ga4'] : [];
  }
  function eventPayload(name, properties) {
    var latest = mergeAttribution(Boolean(consent && consent.marketing), consentAllowsAnalytics());
    return {
      eventId: uuid(),
      name: name,
      occurredAt: new Date().toISOString(),
      anonymousId: anonymousId,
      sessionId: sessionId,
      platform: 'web',
      source: 'website',
      properties: safeProperties(name, properties),
      consent: { analytics: consentAllowsAnalytics(), marketing: Boolean(consent && consent.marketing) },
      attribution: latest.latest,
      clientDeliveredProviders: providerIds()
    };
  }
  function enqueue(event) {
    var queue = readJson(localStorage, QUEUE_KEY) || [];
    queue.push({ event: event, attempts: 0 });
    while (queue.length > MAX_QUEUE || JSON.stringify(queue).length > MAX_QUEUE_BYTES) queue.shift();
    writeJson(localStorage, QUEUE_KEY, queue);
  }
  function sendQueue(useBeacon) {
    if (!consentAllowsAnalytics() || sending) return;
    var queue = readJson(localStorage, QUEUE_KEY) || [];
    if (!queue.length) return;
    var batch = queue.slice(0, 20);
    var body = JSON.stringify({ events: batch.map(function (entry) { return entry.event; }) });
    if (useBeacon && navigator.sendBeacon) {
      var sent = navigator.sendBeacon(API_BASE + '/analytics/events', new Blob([body], { type: 'application/json' }));
      if (sent) {
        var beaconQueue = readJson(localStorage, QUEUE_KEY) || [];
        beaconQueue.slice(0, batch.length).forEach(function (entry) { entry.attempts = (entry.attempts || 0) + 1; });
        writeJson(localStorage, QUEUE_KEY, beaconQueue.filter(function (entry) { return (entry.attempts || 0) < MAX_ATTEMPTS; }));
        return;
      }
    }
    if (!window.fetch) return;
    sending = true;
    fetch(API_BASE + '/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })
      .then(function (response) {
        if (!response.ok) throw new Error('analytics_' + response.status);
        return response.text().then(function (text) {
          var parsed = null;
          try { parsed = JSON.parse(String(text || '').slice(0, 2048)); } catch (_error) { /* non-JSON responses are not accepted */ }
          if (!parsed || parsed.accepted !== true) throw new Error('analytics_not_accepted');
          writeJson(localStorage, QUEUE_KEY, queue.slice(batch.length));
        });
      })
      .catch(function () {
        var latestQueue = readJson(localStorage, QUEUE_KEY) || [];
        latestQueue.slice(0, batch.length).forEach(function (entry) { entry.attempts = (entry.attempts || 0) + 1; });
        latestQueue = latestQueue.filter(function (entry) { return (entry.attempts || 0) < MAX_ATTEMPTS; });
        writeJson(localStorage, QUEUE_KEY, latestQueue);
      })
      .then(function () { sending = false; });
  }
  function deliverProviders(name, properties, eventId) {
    var clean = safeProperties(name, properties);
    var metaNames = { page_view: 'PageView', signup_completed: 'CompleteRegistration', pricing_viewed: 'ViewContent', checkout_started: 'InitiateCheckout', purchase: 'Purchase' };
    var tiktokNames = { page_view: 'ViewContent', signup_completed: 'CompleteRegistration', pricing_viewed: 'ViewContent', checkout_started: 'InitiateCheckout', purchase: 'CompletePayment' };
    var ga4Names = { page_view: 'page_view', signup_completed: 'sign_up', pricing_viewed: 'view_item', checkout_started: 'begin_checkout', purchase: 'purchase' };
    if (consent && consent.marketing && config.metaPixelId && window.fbq) window.fbq(metaNames[name] ? 'track' : 'trackCustom', metaNames[name] || toPascal(name), clean, { eventID: eventId });
    if (consent && consent.marketing && config.tiktokPixelCode && window.ttq && window.ttq.track) { clean.event_id = eventId; window.ttq.track(tiktokNames[name] || toPascal(name), clean); }
    if (consentAllowsAnalytics() && config.ga4MeasurementId && window.gtag) { clean.event_id = eventId; window.gtag('event', ga4Names[name] || name, clean); }
    if (consent && consent.marketing && config.googleAdsConversionId && window.gtag && config.googleAdsConversionLabels && config.googleAdsConversionLabels[name]) window.gtag('event', 'conversion', { send_to: config.googleAdsConversionId + '/' + config.googleAdsConversionLabels[name], event_id: eventId });
  }
  function toPascal(name) { return name.split('_').map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); }).join(''); }
  function track(name, properties) {
    if (!canonicalNames[name]) return null;
    var event = eventPayload(name, properties);
    if (!consentAllowsAnalytics()) { pendingConsentEvents.push(event); return event.eventId; }
    enqueue(event);
    deliverProviders(name, event.properties, event.eventId);
    sendQueue(false);
    return event.eventId;
  }
  function loadScript(src, id, ready) {
    if (document.getElementById(id)) return;
    var script = document.createElement('script'); script.id = id; script.async = true; script.src = src; script.onload = ready; document.head.appendChild(script);
  }
  function loadProviders() {
    if (consent && consent.marketing && config.metaPixelId && !loadedProviders.meta) {
      if (!window.fbq) {
        var fbq = function () { (fbq.queue = fbq.queue || []).push(arguments); };
        fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
        window.fbq = fbq;
      }
      window.fbq('init', config.metaPixelId);
      loadScript('https://connect.facebook.net/en_US/fbevents.js', 'kitabu-meta-pixel'); loadedProviders.meta = true;
    }
    if (consent && consent.marketing && config.tiktokPixelCode && !loadedProviders.tiktok) {
      window.TiktokAnalyticsObject = 'ttq';
      var ttq = window.ttq = window.ttq || [];
      ttq.methods = ttq.methods || ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = ttq.setAndDefer || function (target, method) { target[method] = function () { target.push([method].concat(Array.prototype.slice.call(arguments, 0))); }; };
      ttq.methods.forEach(function (method) { if (typeof ttq[method] !== 'function') ttq.setAndDefer(ttq, method); });
      ttq._i = ttq._i || {}; ttq._t = ttq._t || {}; ttq._o = ttq._o || {};
      ttq.load = ttq.load || function (pixelCode, options) { ttq._i[pixelCode] = ttq._i[pixelCode] || []; ttq._t[pixelCode] = +new Date(); ttq._o[pixelCode] = options || {}; ttq.push(['load', pixelCode, options || {}]); };
      ttq.load(config.tiktokPixelCode);
      ttq.page();
      loadScript('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(config.tiktokPixelCode) + '&lib=ttq', 'kitabu-tiktok-pixel'); loadedProviders.tiktok = true;
    }
    if (consentAllowsAnalytics() && config.ga4MeasurementId && !loadedProviders.ga4) {
      window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', config.ga4MeasurementId, { send_page_view: false });
      loadedProviders.ga4 = typeof window.gtag === 'function' && Array.isArray(window.dataLayer);
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.ga4MeasurementId), 'kitabu-ga4-tag');
    }
  }
  function flushPending() {
    if (!consentAllowsAnalytics()) return;
    ensureAnalyticsIdentity(true);
    attribution = mergeAttribution(Boolean(consent.marketing), true);
    pendingConsentEvents.splice(0).forEach(function (event) { event.anonymousId = anonymousId; event.sessionId = sessionId; event.consent.analytics = true; event.consent.marketing = Boolean(consent.marketing); event.clientDeliveredProviders = providerIds(); event.attribution = attribution.latest; enqueue(event); deliverProviders(event.name, event.properties, event.eventId); });
    sendQueue(false);
  }
  function setConsent(next) {
    var previousAnonymousId = storageGet(localStorage, ANON_KEY);
    consent = { version: CONSENT_VERSION, analytics: Boolean(next.analytics), marketing: Boolean(next.marketing), updatedAt: new Date().toISOString() };
    writeJson(localStorage, CONSENT_KEY, consent);
    if (consent.analytics) {
      ensureAnalyticsIdentity(true);
      attribution = mergeAttribution(consent.marketing, true);
      syncConsent(true, consent.marketing, anonymousId);
    } else {
      pendingConsentEvents = [];
      syncConsent(false, false, previousAnonymousId);
      clearAnalyticsStorage();
    }
    loadProviders(); flushPending(); renderConsent();
  }
  function ensureConsentStyles() {
    if (document.getElementById('kitabu-consent-styles')) return;
    var style = document.createElement('style'); style.id = 'kitabu-consent-styles';
    style.textContent = '#kitabu-consent-banner{position:fixed;z-index:10000;left:16px;right:16px;bottom:16px;display:flex;gap:20px;align-items:flex-start;justify-content:space-between;padding:18px 20px;background:#fff;color:#18352a;border:1px solid #c8d9cc;border-radius:14px;box-shadow:0 12px 40px rgba(13,46,27,.18);font:14px/1.5 system-ui,sans-serif}#kitabu-consent-banner p{max-width:720px;margin:6px 0}#kitabu-consent-banner a{color:#166534;text-decoration:underline}.kitabu-consent-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.kitabu-consent-actions button,#kitabu-consent-settings{border:1px solid #196b42;border-radius:999px;background:#fff;color:#14532d;padding:9px 13px;cursor:pointer;font:inherit;white-space:nowrap}.kitabu-consent-actions button:last-child{background:#196b42;color:#fff}#kitabu-consent-settings{position:fixed;z-index:9999;left:14px;bottom:14px;background:#fff;box-shadow:0 4px 18px rgba(13,46,27,.16);font-size:12px}@media(max-width:720px){#kitabu-consent-banner{display:block;left:10px;right:10px;bottom:10px;padding:15px}.kitabu-consent-actions{justify-content:flex-start;margin-top:12px}.kitabu-consent-actions button{font-size:12px}}'; document.head.appendChild(style);
  }
  function renderConsent() {
    ensureConsentStyles();
    var existing = document.getElementById('kitabu-consent-banner'); if (existing) existing.remove();
    var settings = document.getElementById('kitabu-consent-settings'); if (settings) settings.remove();
    if (!getConsent()) {
      var banner = document.createElement('section'); banner.id = 'kitabu-consent-banner'; banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', 'Privacy choices'); banner.innerHTML = '<div><strong>Choose your privacy settings</strong><p>Kitabu uses necessary storage to keep this site reliable. With your permission, anonymous analytics helps us improve the site and marketing cookies help us measure campaigns. We never send names, phone numbers, school details, or child content to ad platforms.</p><a href="/privacy/">Read the privacy and cookie policy</a></div><div class="kitabu-consent-actions"><button type="button" data-consent="necessary">Necessary only</button><button type="button" data-consent="analytics">Analytics only</button><button type="button" data-consent="all">Allow analytics + marketing</button></div>';
      document.body.appendChild(banner);
      banner.querySelectorAll('[data-consent]').forEach(function (button) { button.addEventListener('click', function () { var choice = button.getAttribute('data-consent'); setConsent({ analytics: choice !== 'necessary', marketing: choice === 'all' }); }); });
    } else {
      var control = document.createElement('button'); control.id = 'kitabu-consent-settings'; control.type = 'button'; control.textContent = 'Privacy settings'; control.setAttribute('aria-label', 'Open privacy settings'); control.addEventListener('click', function () { consent = null; renderConsent(); }); document.body.appendChild(control);
    }
  }
  window.kitabuAnalytics = { track: track, setConsent: setConsent, getConsent: getConsent, openSettings: function () { consent = null; renderConsent(); }, flush: function () { sendQueue(false); } };
  window.kitabuTrack = track;

  // Initialize consented provider queues before any page or inline caller can track.
  loadProviders();

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a[data-event], button[data-event]') : null;
    if (!link) return;
    var eventName = link.getAttribute('data-event');
    var href = link.getAttribute('href') || '';
    if ((eventName === 'store_badge_clicked' || eventName === 'app_download_clicked') && /play\.google\.com\/store/i.test(href)) {
      track('app_download_clicked', { platform: 'android', placement: link.getAttribute('data-event-source') || 'unknown', path: window.location.pathname, destination_class: 'play_store' });
    } else if (eventName && eventName !== 'pricing_viewed') {
      if (href && href.indexOf('wa.me/') === -1) triggerEngagement('meaningful_cta');
    }
  }, true);
  function triggerEngagement(type) {
    var key = 'kitabu_engaged:' + window.location.pathname;
    if (fired.engagement || storageGet(sessionStorage, key)) return;
    fired.engagement = true; storageSet(sessionStorage, key, '1');
    track('landing_page_engaged', { path: window.location.pathname, engagement_type: type });
  }
  function installEngagement() {
    window.setTimeout(function () { triggerEngagement('10_seconds'); }, 10000);
    window.addEventListener('scroll', function () { var doc = document.documentElement; if (window.scrollY / Math.max(1, doc.scrollHeight - window.innerHeight) >= 0.3) triggerEngagement('30_percent_scroll'); }, { passive: true });
    var demoForm = document.querySelector('#schoolDemoForm');
    if (demoForm) demoForm.addEventListener('input', function () { triggerEngagement('school_demo_started'); }, { once: true });
  }
  function installPricingObserver() {
    var modules = document.querySelectorAll('[data-pricing-module]');
    if (!modules.length) return;
    var observe = function (entry) { var node = entry.target; if (!node.dataset.pricingSeen) { node.dataset.pricingSeen = '1'; track('pricing_viewed', { plan_code: node.getAttribute('data-plan-code') || undefined, billing_cycle: node.getAttribute('data-billing-cycle') || undefined, source_page: window.location.pathname }); } };
    if (!('IntersectionObserver' in window)) { modules.forEach(function (node) { observe({ target: node }); }); return; }
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { observe(entry); io.unobserve(entry.target); } }); }, { threshold: 0.35 }); modules.forEach(function (node) { io.observe(node); });
  }
  function installPageEvents() {
    track('page_view', { path: window.location.pathname, page_title: document.title });
    installEngagement(); installPricingObserver();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { renderConsent(); loadProviders(); installPageEvents(); });
  else { renderConsent(); loadProviders(); installPageEvents(); }
  window.addEventListener('pagehide', function () { sendQueue(true); });
})();
