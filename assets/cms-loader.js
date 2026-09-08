// Loads live content from the CMS (cms-content.js) and rewrites the
// relevant sections of the page before the site's own animation/behaviour
// script (site-animations.js) runs. If the CMS is unreachable, or this
// site hasn't been wired up to it yet, nothing is replaced and the
// hardcoded content already in the HTML is used as-is — the page always
// works even with zero CMS setup.
//
// This file MUST finish (success or failure) before site-animations.js is
// loaded, because that script duplicates the clients/marquee tracks for
// infinite scroll and binds the FAQ accordion to whatever is in the DOM
// at that moment — so content has to be final first.
(function () {
  'use strict';

  var CONTENT_URL = '/.netlify/functions/cms-content';
  var FETCH_TIMEOUT_MS = 2500;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var ICON_PATHS = {
    kiosk: '<path d="M8 5 2 12l6 7M16 5l6 7-6 7"/>',
    pwa: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><path d="M4.9 4.9l3 3M19.1 4.9l-3 3M4.9 19.1l3-3M19.1 19.1l-3-3"/>',
    booking: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    dashboard: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="0.8" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="0.8" fill="currentColor" stroke="none"/>',
    app: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    whatsapp: '<path d="M3 11l16-7-5 17-3-7-8-3z"/>',
    web: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    support: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/>',
    social: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    hosting: '<rect x="4" y="3" width="16" height="6" rx="1.5"/><rect x="4" y="10" width="16" height="6" rx="1.5"/><rect x="4" y="17" width="16" height="4" rx="1.5"/><circle cx="8" cy="6" r="0.8" fill="currentColor" stroke="none"/><circle cx="8" cy="13" r="0.8" fill="currentColor" stroke="none"/>',
    iot: '<circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/><path d="M8.5 15.5a5 5 0 0 1 7 0M5.5 12.5a9 9 0 0 1 13 0M2.5 9.5a13 13 0 0 1 19 0"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    control: '<path d="M4 12a8 8 0 0 1 14.9-4M20 12a8 8 0 0 1-14.9 4M15 4v4h4M9 20v-4H5"/>',
    local: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5"/>'
  };

  function iconSvg(key, size) {
    var inner = ICON_PATHS[key] || ICON_PATHS.kiosk;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }

  function applyHero(hero) {
    if (!hero) return;
    var heroSection = document.getElementById('home');
    if (!heroSection) return;

    var eyebrow = heroSection.querySelector('.eyebrow');
    if (eyebrow) {
      var dot = eyebrow.querySelector('.dot');
      eyebrow.innerHTML = '';
      if (dot) eyebrow.appendChild(dot);
      eyebrow.appendChild(document.createTextNode(hero.eyebrow || ''));
    }

    var h1 = heroSection.querySelector('.hero-copy h1');
    if (h1) h1.innerHTML = esc(hero.headline_before) + ' <em>' + esc(hero.headline_highlight) + '</em> ' + esc(hero.headline_after);

    var lede = heroSection.querySelector('.hero-copy p.lede');
    if (lede) lede.textContent = hero.lede || '';

    var ctas = heroSection.querySelectorAll('.hero-ctas button');
    if (ctas[0] && hero.cta_primary_text) ctas[0].textContent = hero.cta_primary_text;
    if (ctas[1] && hero.cta_secondary_text) ctas[1].textContent = hero.cta_secondary_text;

    var stats = heroSection.querySelectorAll('.hero-stats .stat');
    var statDefs = [
      { value: hero.stat1_value, suffix: hero.stat1_suffix, label: hero.stat1_label },
      { value: hero.stat2_value, suffix: hero.stat2_suffix, label: hero.stat2_label },
      { value: hero.stat3_value, suffix: hero.stat3_suffix, label: hero.stat3_label }
    ];
    stats.forEach(function (statEl, i) {
      var def = statDefs[i];
      if (!def) return;
      var b = statEl.querySelector('b');
      var span = statEl.querySelector('span');
      if (b) {
        b.setAttribute('data-count', def.value || '0');
        b.setAttribute('data-suffix', def.suffix || '');
        b.textContent = '0' + (def.suffix || ''); // site-animations.js animates this up to data-count
      }
      if (span) span.textContent = def.label || '';
    });
  }

  function applyMarquee(items) {
    var track = document.getElementById('marqueeTrack');
    if (!track || !items || !items.length) return;
    track.innerHTML = items.map(function (m) {
      return '<span>' + esc(m.text) + '</span><span class="sep">•</span>';
    }).join('\n      ');
  }

  function applyClients(clients) {
    var track = document.getElementById('clientsTrack');
    if (!track || !clients) return;
    track.innerHTML = clients.map(function (c) {
      return '<div class="client-card">' +
        '<div class="client-logo-plate"><img class="client-logo" src="' + esc(c.logo_url) + '" alt="' + esc(c.name) + '"></div>' +
        '<span>' + esc(c.name) + '</span>' +
        '</div>';
    }).join('');
  }

  function applyServices(services) {
    var grid = document.querySelector('#services .svc-grid');
    if (!grid || !services) return;
    var core = services.filter(function (s) { return s.group_name !== 'digital'; });
    var digital = services.filter(function (s) { return s.group_name === 'digital'; });

    function card(s) {
      return '<div class="svc-card" data-reveal>' +
        '<div class="svc-icon">' + iconSvg(s.icon_key, 20) + '</div>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<div class="kicker">' + esc(s.kicker) + '</div>' +
        '<p>' + esc(s.description) + '</p>' +
        '<a class="svc-link" href="#work">Learn More <span>→</span></a>' +
        '</div>';
    }

    var html = core.map(card).join('');
    if (digital.length) {
      html += '<div class="svc-divider" data-reveal>Core IT &amp; Digital Services</div>' + digital.map(card).join('');
    }
    grid.innerHTML = html;
  }

  function applyWhyCards(cards) {
    var wrap = document.querySelector('#why .why-cards');
    if (!wrap || !cards) return;
    wrap.innerHTML = cards.map(function (c) {
      return '<div class="why-card" data-reveal>' +
        '<div class="svc-icon">' + iconSvg(c.icon_key, 18) + '</div>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<p>' + esc(c.description) + '</p>' +
        '</div>';
    }).join('');
  }

  function applyWorkItems(items) {
    var grid = document.querySelector('#work .work-grid');
    if (!grid || !items) return;
    grid.innerHTML = items.map(function (w) {
      var bullets = Array.isArray(w.bullets) ? w.bullets : [];
      return '<div class="work-card" data-reveal>' +
        '<div class="work-top"><h3>' + esc(w.title) + '</h3><span class="live-tag"><span class="live-dot"></span>' + esc(w.status) + '</span></div>' +
        '<p class="desc">' + esc(w.description) + '</p>' +
        '<ul class="built-list">' + bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
        '<div class="work-domain">' + esc(w.domain) + '</div>' +
        '</div>';
    }).join('');
  }

  function applyPricingFactors(factors) {
    var wrap = document.querySelector('#pricing .pricing-factors');
    if (!wrap || !factors) return;
    wrap.innerHTML = factors.map(function (p) {
      return '<div class="pf"><b>' + esc(p.title) + '</b><span>' + esc(p.description) + '</span></div>';
    }).join('');
  }

  function applyFaqs(faqs) {
    var wrap = document.querySelector('#faq .faq-list');
    if (!wrap || !faqs) return;
    wrap.innerHTML = faqs.map(function (f) {
      return '<div class="faq-item" data-reveal>' +
        '<button class="faq-q" aria-expanded="false"><span>' + esc(f.question) + '</span><span class="chev">⌄</span></button>' +
        '<div class="faq-a"><p>' + esc(f.answer) + '</p></div>' +
        '</div>';
    }).join('');
  }

  function applyContactInfo(info) {
    if (!info) return;

    var ciItems = document.querySelectorAll('#contact .ci-item');
    if (ciItems[0]) {
      var callLink = ciItems[0].querySelector('a');
      if (callLink) { callLink.textContent = info.phone_display || ''; callLink.href = 'tel:+' + (info.phone_href || '').replace(/^\+/, ''); }
    }
    if (ciItems[1]) {
      var emailLink = ciItems[1].querySelector('a');
      if (emailLink) { emailLink.textContent = info.email || ''; emailLink.href = 'mailto:' + (info.email || ''); }
    }
    if (ciItems[2]) {
      var addrSpan = ciItems[2].querySelector('span');
      if (addrSpan) addrSpan.textContent = info.address || '';
    }

    var supportWa = document.querySelector('#supportWidget .support-btn');
    if (supportWa && info.whatsapp_link) supportWa.href = info.whatsapp_link;

    var footerText = document.querySelector('footer .footer-text');
    if (footerText) footerText.textContent = info.footer_text || '';

    var footerMeta = document.querySelector('footer .footer-meta');
    if (footerMeta && info.address) {
      footerMeta.innerHTML = esc(info.address) +
        ' &middot; <a href="tel:+' + esc((info.phone_href || '').replace(/^\+/, '')) + '">' + esc(info.phone_display) + '</a>' +
        ' &middot; <a href="mailto:' + esc(info.email) + '">' + esc(info.email) + '</a>';
    }
  }

  function applyContent(data) {
    try { applyHero(data.hero); } catch (e) { /* keep static fallback for this section */ }
    try { applyMarquee(data.marquee_items); } catch (e) { }
    try { applyClients(data.clients); } catch (e) { }
    try { applyServices(data.services); } catch (e) { }
    try { applyWhyCards(data.why_cards); } catch (e) { }
    try { applyWorkItems(data.work_items); } catch (e) { }
    try { applyPricingFactors(data.pricing_factors); } catch (e) { }
    try { applyFaqs(data.faqs); } catch (e) { }
    try { applyContactInfo(data.contact_info); } catch (e) { }
  }

  function loadAnimationsScript() {
    var s = document.createElement('script');
    s.src = 'assets/site-animations.js';
    document.body.appendChild(s);
  }

  function fetchWithTimeout(url, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
      fetch(url).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) { reject(new Error('bad status ' + res.status)); return; }
        res.json().then(resolve, reject);
      }, function (err) { clearTimeout(timer); reject(err); });
    });
  }

  fetchWithTimeout(CONTENT_URL, FETCH_TIMEOUT_MS)
    .then(applyContent)
    .catch(function () { /* CMS not set up yet, or unreachable — keep the static content already in the HTML */ })
    .then(loadAnimationsScript);
})();
