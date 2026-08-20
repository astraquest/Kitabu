/* Kitabu AI — shared site behaviour (motion spec 4.1/4.2, events spec 5.7).
   Progressive enhancement only: content and CTAs work with JS disabled. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Legacy presentation behavior delegates analytics to site-20260818.js. */
  function track(name, props) {
    if (window.kitabuAnalytics && typeof window.kitabuAnalytics.track === 'function') {
      return window.kitabuAnalytics.track(name, props);
    }
    return null;
  }
  window.kitabuTrack = window.kitabuAnalytics && typeof window.kitabuAnalytics.track === 'function'
    ? window.kitabuAnalytics.track
    : track;

  // Declarative CTA events: <a data-event="download_cta_clicked" data-event-source="hero">
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (el) track(el.getAttribute('data-event'), { source: el.getAttribute('data-event-source') || '' });
  });

  // Page-view events declared on <body data-page-event="pricing_viewed">
  var pageEvent = document.body.getAttribute('data-page-event');
  if (pageEvent && pageEvent !== 'pricing_viewed') track(pageEvent, { persona: document.body.getAttribute('data-persona') || undefined });

  /* ---------------------------------------------------------------------
     Header: sticky state + mobile sheet menu (spec 4.2-F)
  --------------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 80);
    };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  var menuToggle = document.querySelector('.menu-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (menuToggle) {
    var setMenuState = function (open, restoreFocus) {
      document.body.classList.toggle('menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (navLinks) navLinks.setAttribute('aria-hidden', String(window.innerWidth <= 900 && !open));
      if (open && navLinks) {
        var firstLink = navLinks.querySelector('a');
        if (firstLink) firstLink.focus();
      } else if (restoreFocus) {
        menuToggle.focus();
      }
    };

    menuToggle.setAttribute('aria-controls', 'navLinks');
    setMenuState(false, false);
    menuToggle.addEventListener('click', function () {
      setMenuState(!document.body.classList.contains('menu-open'), false);
    });
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenuState(false, false);
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenuState(false, true);
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && document.body.classList.contains('menu-open')) {
        setMenuState(false, false);
      } else if (navLinks) {
        navLinks.setAttribute('aria-hidden', String(window.innerWidth <= 900 && !document.body.classList.contains('menu-open')));
      }
    });
  }

  /* ---------------------------------------------------------------------
     Split-text word reveal (spec 4.2-A)
  --------------------------------------------------------------------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    if (reduceMotion) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (word, i) {
      var outer = document.createElement('span');
      outer.className = 'split-word';
      var inner = document.createElement('span');
      inner.textContent = word;
      inner.style.transitionDelay = (i * 0.05) + 's';
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------------------------------------------------------------------
     Scroll reveals — fire once, threshold 0.25 (spec 4.1)
  --------------------------------------------------------------------- */
  var revealTargets = document.querySelectorAll('[data-reveal], [data-split], .progress-bar-anim, .compare-glow, .swahili-lockup');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          startCounters(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach(function (t) { io.observe(t); });
  } else {
    revealTargets.forEach(function (t) {
      t.classList.add('is-visible');
      startCounters(t, true);
    });
  }

  /* ---------------------------------------------------------------------
     Count-up numbers (spec 4.2-C): <span data-count-from="42" data-count-to="68">42</span>
  --------------------------------------------------------------------- */
  function startCounters(scope, instant) {
    var counters = scope.querySelectorAll ? scope.querySelectorAll('[data-count-to]') : [];
    counters.forEach(function (el) {
      var from = parseInt(el.getAttribute('data-count-from') || '0', 10);
      var to = parseInt(el.getAttribute('data-count-to'), 10);
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (instant || reduceMotion) { el.textContent = to + suffix; return; }
      var duration = 1200;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------------
     Hero choreography (spec 4.2-B): phone springs in, bubble types,
     progress bar fills. Total sequence ≤ 2.2s.
  --------------------------------------------------------------------- */
  var phone = document.querySelector('.phone');
  if (phone) {
    var fire = function () {
      if (reduceMotion) {
        phone.classList.add('is-live');
        phone.querySelectorAll('[data-type-in]').forEach(function (b) { b.classList.add('is-visible'); });
        var bar = phone.querySelector('.progress-bar-anim');
        if (bar) { bar.classList.add('is-visible'); startCounters(bar, true); }
        return;
      }
      setTimeout(function () { phone.classList.add('is-live'); }, 700);
      setTimeout(function () {
        phone.querySelectorAll('[data-type-in]').forEach(function (b) { b.classList.add('is-visible'); });
      }, 1400);
      setTimeout(function () {
        var bar = phone.querySelector('.progress-bar-anim');
        if (bar) { bar.classList.add('is-visible'); startCounters(bar); }
      }, 1800);
    };
    if (document.readyState === 'complete') fire();
    else window.addEventListener('load', fire);
  }

  /* ---------------------------------------------------------------------
     FAQ accordion (spec 4.2-H): animate open/close, one open at a time
     on mobile, fire faq_expanded.
  --------------------------------------------------------------------- */
  document.querySelectorAll('.faq-list details').forEach(function (details) {
    var summary = details.querySelector('summary');
    var body = details.querySelector('.faq-body');
    if (!summary || !body) return;
    summary.addEventListener('click', function (e) {
      if (reduceMotion) {
        if (!details.open) track('faq_expanded', { question: summary.textContent.trim() });
        return; // let native toggle happen
      }
      e.preventDefault();
      if (details.open) {
        body.style.height = body.scrollHeight + 'px';
        requestAnimationFrame(function () {
          body.style.transition = 'height 0.3s cubic-bezier(0.22,1,0.36,1)';
          body.style.height = '0px';
        });
        setTimeout(function () {
          details.open = false;
          body.style.cssText = '';
        }, 300);
      } else {
        if (window.innerWidth < 768) {
          document.querySelectorAll('.faq-list details[open]').forEach(function (other) {
            if (other !== details) other.open = false;
          });
        }
        details.open = true;
        var target = body.scrollHeight;
        body.style.height = '0px';
        requestAnimationFrame(function () {
          body.style.transition = 'height 0.3s cubic-bezier(0.22,1,0.36,1)';
          body.style.height = target + 'px';
        });
        setTimeout(function () { body.style.cssText = ''; }, 320);
        track('faq_expanded', { question: summary.textContent.trim() });
      }
    });
  });

  /* ---------------------------------------------------------------------
     Comparison table row stagger (spec 4.2-G)
  --------------------------------------------------------------------- */
  document.querySelectorAll('.compare-table tbody tr').forEach(function (row, i) {
    row.setAttribute('data-reveal', '');
    row.style.setProperty('--reveal-delay', (i * 0.06) + 's');
  });
  // Re-observe rows added above after initial pass
  if ('IntersectionObserver' in window && !reduceMotion) {
    var rowIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); rowIO.unobserve(entry.target); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.compare-table tbody tr').forEach(function (r) { rowIO.observe(r); });
  } else {
    document.querySelectorAll('.compare-table tbody tr').forEach(function (r) { r.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------------------
     Sticky mobile CTA bar after 60% scroll (spec 4.3)
  --------------------------------------------------------------------- */
  var stickyBar = document.querySelector('.sticky-cta');
  if (stickyBar) {
    var dismissed = false;
    var dismissBtn = stickyBar.querySelector('.sticky-cta-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        dismissed = true;
        stickyBar.classList.remove('is-shown');
      });
    }
    window.addEventListener('scroll', function () {
      if (dismissed) return;
      var doc = document.documentElement;
      var progress = (window.scrollY) / (doc.scrollHeight - window.innerHeight || 1);
      stickyBar.classList.toggle('is-shown', progress > 0.6);
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     School onboarding form (plan 5.5 / P0-6). Fires school_demo_started on
     first input and school_demo_submitted on submit. Delivery is two-channel:
     1) WhatsApp — opens wa.me with the details prefilled (synchronously,
        inside the click gesture so popup blockers allow it; on phones this
        lands in the WhatsApp app ready to send).
     2) Email — POST to the Kitabu API (/public/school-onboarding), which
        stores the lead and emails hello@kitabu.ai.
  --------------------------------------------------------------------- */
  var demoForm = document.querySelector('#schoolDemoForm');
  if (demoForm) {
    var API_BASE = window.KITABU_API_BASE || 'https://app.kitabu.ai';
    var started = false;
    demoForm.addEventListener('input', function () {
      if (!started) { started = true; track('school_demo_started'); }
    });
    demoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!demoForm.reportValidity()) return;
      var levelLabels = { junior: 'Junior school', senior: 'Senior school', junior_and_senior: 'Junior & senior' };
      var boardingLabels = { day: 'Day', boarding: 'Boarding', day_and_boarding: 'Day & boarding' };
      var data = {
        schoolName: demoForm.school_name.value.trim(),
        county: demoForm.county.value,
        town: demoForm.town.value.trim(),
        schoolLevel: demoForm.school_level.value,
        boardingType: demoForm.boarding_type.value,
        studentCount: parseInt(demoForm.student_count.value, 10),
        contactPhone: demoForm.phone.value.trim(),
        source: 'website'
      };
      track('school_demo_submitted', {
        county: data.county, school_level: data.schoolLevel,
        boarding_type: data.boardingType, student_count: data.studentCount
      });
      var submitBtn = demoForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var waMessage = 'School onboarding request [site_demo_form]\n' +
        'School: ' + data.schoolName + '\n' +
        'Location: ' + (data.town ? data.town + ', ' : '') + data.county + ' County\n' +
        'Level: ' + (levelLabels[data.schoolLevel] || data.schoolLevel) + '\n' +
        'Type: ' + (boardingLabels[data.boardingType] || data.boardingType) + '\n' +
        'Students: ' + data.studentCount + '\n' +
        'Phone: ' + data.contactPhone;
      var waUrl = 'https://wa.me/254716175485?text=' + encodeURIComponent(waMessage);

      // Channel 1: WhatsApp — synchronous open within the click gesture.
      window.open(waUrl, '_blank', 'noopener');

      var showSuccess = function () {
        demoForm.hidden = true;
        var success = document.querySelector('#demoSuccess');
        if (success) {
          success.hidden = false;
          var waLink = success.querySelector('[data-wa-resend]');
          if (waLink) waLink.href = waUrl;
        }
      };

      // Channel 2: API — stores the lead and emails hello@kitabu.ai.
      if (window.fetch) {
        fetch(API_BASE + '/public/school-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(showSuccess, showSuccess);
      } else {
        showSuccess();
      }
    });
  }
})();
