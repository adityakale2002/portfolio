(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- footer year ---------- */
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  var menuBtn = $('.menu-btn');
  var nav = $('#site-nav');
  var mobileMQ = window.matchMedia('(max-width: 900px)');

  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    // keep hidden nav out of the tab order on mobile
    if (mobileMQ.matches) { nav.inert = !open; } else { nav.inert = false; }
  }
  menuBtn.addEventListener('click', function () {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuBtn.focus();
    }
  });
  var onMQ = function () { setMenu(false); };
  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', onMQ); else mobileMQ.addListener(onMQ);
  setMenu(false);

  /* ---------- active nav link ---------- */
  var navLinks = $$('.nav-list a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- work tabs (WAI-ARIA tabs pattern) ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var n = tabs.length, next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % n];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + n) % n];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[n - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });
  // show the right panel on load (all but the first start hidden in markup)
  var firstSel = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
  if (firstSel) selectTab(firstSel, false);

  /* ---------- photography filter ---------- */
  var chips = $$('.chip');
  var photoItems = $$('[data-gallery="photo"] > li');
  var statusEl = $('#filter-status');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      photoItems.forEach(function (li) {
        var show = f === 'all' || li.getAttribute('data-cat') === f;
        li.hidden = !show;
        if (show) shown++;
      });
      if (statusEl) statusEl.textContent = 'Showing ' + shown + ' photo' + (shown === 1 ? '' : 's') + (f === 'all' ? '' : ' in ' + chip.textContent);
    });
  });

  /* ---------- viewer (native <dialog>: focus trap + Esc built in) ---------- */
  var viewer = $('#viewer');
  var stage = $('#viewer-stage');
  var vTitle = $('#viewer-title');
  var vSub = $('#viewer-sub');
  var btnPrev = $('#viewer-prev');
  var btnNext = $('#viewer-next');
  var btnClose = $('#viewer-close');
  var current = { items: [], index: 0, opener: null };

  function clearMedia() {
    $$('img, video', stage).forEach(function (m) {
      if (m.tagName === 'VIDEO') { m.pause(); m.removeAttribute('src'); m.load(); }
      m.remove();
    });
  }

  function render() {
    var btn = current.items[current.index];
    clearMedia();
    var kind = btn.getAttribute('data-viewer');
    var el;
    if (kind === 'video') {
      el = document.createElement('video');
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.poster = btn.getAttribute('data-poster') || '';
      el.src = btn.getAttribute('data-full');
      el.setAttribute('aria-label', btn.getAttribute('data-title'));
      el.style.maxHeight = 'calc(100dvh - 11rem)';
      el.style.aspectRatio = '9 / 16';
    } else {
      el = document.createElement('img');
      el.src = btn.getAttribute('data-full');
      el.alt = btn.querySelector('img') ? btn.querySelector('img').alt : btn.getAttribute('data-title');
      el.style.maxHeight = 'calc(100dvh - 11rem)';
    }
    stage.insertBefore(el, btnPrev);
    vTitle.textContent = btn.getAttribute('data-title') || '';
    vSub.textContent = (btn.getAttribute('data-sub') || '') + (current.items.length > 1 ? '  ·  ' + (current.index + 1) + ' / ' + current.items.length : '');
    var multi = current.items.length > 1;
    btnPrev.hidden = !multi;
    btnNext.hidden = !multi;
  }

  function step(d) {
    var n = current.items.length;
    if (n < 2) return;
    current.index = (current.index + d + n) % n;
    render();
  }

  function openViewer(btn) {
    var group = btn.closest('ul');
    current.items = $$('[data-viewer]', group).filter(function (b) { return !b.closest('li').hidden; });
    current.index = Math.max(0, current.items.indexOf(btn));
    current.opener = btn;
    render();
    if (typeof viewer.showModal === 'function') viewer.showModal(); else viewer.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }

  $$('[data-viewer]').forEach(function (btn) {
    btn.addEventListener('click', function () { openViewer(btn); });
  });
  btnPrev.addEventListener('click', function () { step(-1); });
  btnNext.addEventListener('click', function () { step(1); });
  btnClose.addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('close', function () {
    clearMedia();
    document.body.style.overflow = '';
    if (current.opener) current.opener.focus();
  });
  // click on the dark backdrop closes
  viewer.addEventListener('click', function (e) {
    if (e.target === viewer || e.target === stage) viewer.close();
  });
  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  // swipe
  var touchX = null;
  stage.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- enquiry form ---------- */
  var form = $('#enquiry');
  var status = $('#form-status');
  var fields = {
    name: $('#f-name'),
    email: $('#f-email'),
    message: $('#f-msg'),
    service: $('#f-service')
  };
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    var ok = true, first = null;
    var rules = [
      [fields.name, fields.name.value.trim().length > 0],
      [fields.email, emailRe.test(fields.email.value.trim())],
      [fields.message, fields.message.value.trim().length > 0]
    ];
    rules.forEach(function (r) {
      var bad = !r[1];
      r[0].setAttribute('aria-invalid', String(bad));
      if (bad) { ok = false; if (!first) first = r[0]; }
    });
    if (first) first.focus();
    return ok;
  }
  Object.keys(fields).forEach(function (k) {
    fields[k].addEventListener('input', function () {
      if (fields[k].getAttribute('aria-invalid') === 'true') fields[k].setAttribute('aria-invalid', 'false');
    });
  });

  function messageText() {
    return 'Hi Aditya,\n\n' + fields.message.value.trim() +
      '\n\nService: ' + fields.service.value +
      '\nName: ' + fields.name.value.trim() +
      '\nEmail: ' + fields.email.value.trim();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';
    if (!validate()) { status.textContent = 'Please fix the highlighted fields.'; return; }
    var subject = 'Portfolio enquiry: ' + fields.service.value;
    window.location.href = 'mailto:' + window.SITE.email +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(messageText());
    status.textContent = 'Opening your email app. If nothing opens, email me directly at ' + window.SITE.email + '.';
  });

  $('#send-wa').addEventListener('click', function () {
    status.textContent = '';
    if (!validate()) { status.textContent = 'Please fix the highlighted fields.'; return; }
    window.open('https://wa.me/' + window.SITE.wa + '?text=' + encodeURIComponent(messageText()), '_blank', 'noopener');
    status.textContent = 'Opening WhatsApp in a new tab.';
  });
})();
