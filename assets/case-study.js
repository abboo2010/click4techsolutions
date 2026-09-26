/* Case Study + Poster buttons for "Our Work" cards.
 *
 * Adds two buttons to any work card whose title matches an entry in CASE_STUDIES:
 *   - Case Study -> opens the HTML case study in a pop-up (modal with an iframe)
 *   - Poster     -> opens the HTML poster page in a new tab
 *
 * The work grid is (re)rendered by assets/cms-loader.js after the CMS responds, which
 * replaces the cards' HTML. A MutationObserver re-applies the buttons every time, so this
 * works with the static fallback cards and with CMS-driven cards alike.
 *
 * To add another case study later: add an entry to CASE_STUDIES below (match the card title).
 */
(function () {
  'use strict';

  var CASE_STUDIES = [
    {
      match: /chandran|ir@sabah|irsabah|meditouch/i,
      title: 'IR@SABAH Case Study',
      caseStudy: 'irsabah-case-study.html',
      poster: 'irsabah-poster.html'
    }
  ];

  /* ---------- styles ---------- */
  var css = [
    '.work-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:2px;position:relative;z-index:2}',
    '.cs-btn{display:inline-flex;align-items:center;gap:7px;font:700 0.8rem/1 "Plus Jakarta Sans",system-ui,sans-serif;padding:10px 15px;border-radius:8px;cursor:pointer;text-decoration:none;border:1.5px solid var(--line);background:transparent;color:var(--navy);transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease}',
    '.cs-btn:hover{transform:translateY(-2px);border-color:var(--orange)}',
    '.cs-btn:focus-visible{outline:2px solid var(--orange);outline-offset:2px}',
    '.cs-btn.primary{background:linear-gradient(135deg,var(--orange),var(--orange-deep));border-color:transparent;color:#fff}',
    '.cs-btn.primary:hover{box-shadow:0 8px 18px -8px rgba(240,125,30,.7)}',
    '.cs-btn svg{width:14px;height:14px;flex:none}',
    '.cs-overlay{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(10,20,38,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}',
    '.cs-overlay.open{display:flex;animation:csFade .25s ease}',
    '.cs-dialog{position:relative;display:flex;flex-direction:column;width:min(980px,100%);height:min(92vh,1000px);background:var(--card,#fff);color:var(--navy,#132A4E);border-radius:14px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);animation:csPop .3s cubic-bezier(.22,1,.36,1)}',
    '.cs-bar{display:flex;align-items:center;gap:12px;padding:12px 14px 12px 18px;border-bottom:1px solid var(--line,rgba(19,42,78,.14));flex:none}',
    '.cs-bar h3{margin:0;flex:1;min-width:0;font:600 1rem/1.3 "Newsreader",Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cs-bar a{font:700 0.78rem/1 "Plus Jakarta Sans",system-ui,sans-serif;color:var(--orange-deep,#C8600A);text-decoration:none;white-space:nowrap}',
    '.cs-bar a:hover{text-decoration:underline}',
    '.cs-close{flex:none;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--line,rgba(19,42,78,.14));background:transparent;color:inherit;font-size:1.3rem;line-height:1;cursor:pointer}',
    '.cs-close:hover{border-color:var(--orange,#F07D1E)}',
    '.cs-close:focus-visible,.cs-bar a:focus-visible{outline:2px solid var(--orange,#F07D1E);outline-offset:2px}',
    '.cs-frame{flex:1;width:100%;border:0;background:#EFEDE7}',
    '@media (max-width:640px){.cs-overlay{padding:0}.cs-dialog{width:100%;height:100%;border-radius:0}.cs-bar a.cs-full{display:none}}',
    '@keyframes csFade{from{opacity:0}to{opacity:1}}',
    '@keyframes csPop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.cs-overlay.open,.cs-dialog{animation:none}.cs-btn{transition:none}}',
    'body.cs-lock{overflow:hidden}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.setAttribute('data-case-study', '');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- modal (built once, lazily) ---------- */
  var overlay, dialog, frame, titleEl, fullLink, closeBtn, lastTrigger;

  function buildModal() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'cs-overlay';
    overlay.innerHTML =
      '<div class="cs-dialog" role="dialog" aria-modal="true" aria-labelledby="csTitle">' +
        '<div class="cs-bar">' +
          '<h3 id="csTitle"></h3>' +
          '<a class="cs-full" target="_blank" rel="noopener">Open full page &#8599;</a>' +
          '<button type="button" class="cs-close" aria-label="Close case study">&times;</button>' +
        '</div>' +
        '<iframe class="cs-frame" title="Case study" loading="lazy"></iframe>' +
      '</div>';
    document.body.appendChild(overlay);
    dialog = overlay.querySelector('.cs-dialog');
    frame = overlay.querySelector('.cs-frame');
    titleEl = overlay.querySelector('#csTitle');
    fullLink = overlay.querySelector('.cs-full');
    closeBtn = overlay.querySelector('.cs-close');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab') {
        var f = [closeBtn];
        if (fullLink && fullLink.offsetParent !== null) f.unshift(fullLink);
        var i = f.indexOf(document.activeElement);
        if (i === -1) { f[0].focus(); e.preventDefault(); return; }
        if (e.shiftKey && i === 0) { f[f.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
      }
    });
  }

  function openModal(cfg, trigger) {
    buildModal();
    lastTrigger = trigger || null;
    titleEl.textContent = cfg.title;
    fullLink.href = cfg.caseStudy;
    frame.title = cfg.title;
    if (frame.getAttribute('src') !== cfg.caseStudy) frame.setAttribute('src', cfg.caseStudy);
    overlay.classList.add('open');
    document.body.classList.add('cs-lock');
    closeBtn.focus();
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('cs-lock');
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  /* ---------- buttons ---------- */
  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
  var ICON_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';

  function findConfig(card) {
    var h = card.querySelector('h3');
    var text = h ? h.textContent : '';
    for (var i = 0; i < CASE_STUDIES.length; i++) {
      if (CASE_STUDIES[i].match.test(text)) return CASE_STUDIES[i];
    }
    return null;
  }

  function decorate() {
    var cards = document.querySelectorAll('#work .work-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.querySelector('.work-actions')) continue;
      var cfg = findConfig(card);
      if (!cfg) continue;

      var row = document.createElement('div');
      row.className = 'work-actions';

      var cs = document.createElement('button');
      cs.type = 'button';
      cs.className = 'cs-btn primary';
      cs.innerHTML = ICON_DOC + '<span>Case Study</span>';
      cs.setAttribute('aria-haspopup', 'dialog');
      (function (c, b) { b.addEventListener('click', function () { openModal(c, b); }); })(cfg, cs);

      var po = document.createElement('a');
      po.className = 'cs-btn';
      po.href = cfg.poster;
      po.target = '_blank';
      po.rel = 'noopener';
      po.innerHTML = ICON_IMG + '<span>Poster</span>';

      row.appendChild(cs);
      row.appendChild(po);

      var domain = card.querySelector('.work-domain');
      if (domain) card.insertBefore(row, domain); else card.appendChild(row);
    }
  }

  function init() {
    decorate();
    var work = document.getElementById('work');
    if (work && window.MutationObserver) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; decorate(); });
      }).observe(work, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
