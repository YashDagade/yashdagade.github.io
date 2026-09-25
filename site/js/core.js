/* yashdagade.com v2 — core shell.
 * Router, keyboard shortcuts, chrome (index, caption, controls, links), Find palette, [M] menu,
 * shortcuts sheet, hover-reveal cards, and the per-scene `api` described in site/CONTRACT.md.
 */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});
  // Shared drawing helpers that one scene exports for others (e.g. the SkyWindFarm unit reused by Build).
  Site.art = Site.art || {};

  Site.colors = {
    bg: '#ffffff',
    ink: '#000000',
    ink75: 'rgba(0,0,0,.75)',
    g100: '#f6f6f6',
    g200: '#eeeeee',
    g300: '#dddddd',
    g400: '#cccccc',
    g500: '#999999',
    g600: '#666666',
    g700: '#333333',
    accent: '#1432F5',
    accentSoft: 'rgba(20,50,245,.12)',
    accent2: '#7F93FF',
  };

  Site.fonts = {
    serif: "'Newsreader', Georgia, 'Times New Roman', serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  };

  const LINKS = {
    x: 'https://x.com/YashDagad',
    linkedin: 'https://www.linkedin.com/in/yashdagade/',
    email: 'mailto:me@yashdagade.com',
    github: 'https://github.com/YashDagade',
    scholar: 'https://scholar.google.com/citations?user=o56NnCkAAAAJ&hl=en',
    resume: 'tex/main.pdf',
  };
  Site.links = LINKS;

  // Everything that is not a scene, for the Find palette and the menu.
  const DESTINATIONS = [
    { group: 'Pages', title: 'About', path: '/me', href: 'me.html' },
    { group: 'Pages', title: 'Books read', path: '/books', href: 'books.html' },
    { group: 'Pages', title: 'Press', path: '/press', href: 'press.html' },
    { group: 'Pages', title: 'Old website', path: '/old', href: 'old/index.html' },
    { group: 'Writing', title: 'Dear Modern Education', path: '/dearmoderneducation', href: 'dearmoderneducation.html' },
    { group: 'Writing', title: 'From Subsistence Towards Exploration', path: '/fromsubtoexp', href: 'fromsubtoexp.html' },
    { group: 'Elsewhere', title: 'Resume', path: '/resume.pdf', href: LINKS.resume, ext: true },
    { group: 'Elsewhere', title: 'GitHub', path: '@YashDagade', href: LINKS.github, ext: true },
    { group: 'Elsewhere', title: 'Google Scholar', path: 'scholar', href: LINKS.scholar, ext: true },
    { group: 'Elsewhere', title: 'LinkedIn', path: 'in/yashdagade', href: LINKS.linkedin, ext: true },
    { group: 'Elsewhere', title: 'X', path: '@YashDagad', href: LINKS.x, ext: true },
    { group: 'Elsewhere', title: 'Email', path: 'me@yashdagade.com', href: LINKS.email, ext: true },
  ];

  const defs = [];
  const inst = {}; // id -> instance record
  let activeId = null;
  let booted = false;
  let pageMode = false;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };
  Site.h = h;

  // Per-scene loudness trims (linear gain for the scene bus), measured so each scene's opening step lands
  // around −28 dB RMS: lpjepa and radial-vcreg were quiet, build's drops were loud.
  const BUS_TRIM = { lpwm: 1, skywindfarm: 1.26, lpjepa: 1.41, 'radial-vcreg': 1.78, build: 0.71 };
  const busTrim = id => BUS_TRIM[id] || 1;

  const audio = () => Site.audio || null;
  const sfx = (name, ...args) => {
    const a = audio();
    try { if (a && a.ui && a.ui[name]) a.ui[name](...args); } catch (e) { /* audio must never break UI */ }
  };

  /* ------------------------------------------------------------------ math (KaTeX) */

  // Typeset LaTeX into `target` (an element). KaTeX is loaded with `defer` from jsDelivr, so it is ready by
  // the time scenes are created; if it failed to load, fall back to `opts.fallback` (or the raw source).
  function tex(target, latex, opts = {}) {
    if (!target) return target;
    const k = window.katex;
    if (k && typeof k.render === 'function') {
      try {
        k.render(String(latex), target, { throwOnError: false, displayMode: !!opts.display, output: 'html', strict: 'ignore' });
        target.classList.add('tex');
        return target;
      } catch (e) { /* fall through */ }
    }
    target.textContent = opts.fallback != null ? opts.fallback : String(latex).replace(/\\[a-zA-Z]+|[{}^_]/g, '');
    return target;
  }
  Site.tex = tex;
  Site.texHTML = (latex, opts = {}) => {
    const k = window.katex;
    try { if (k) return k.renderToString(String(latex), { throwOnError: false, displayMode: !!opts.display, output: 'html', strict: 'ignore' }); } catch (e) {}
    const d = document.createElement('span');
    d.textContent = opts.fallback != null ? opts.fallback : String(latex);
    return d.innerHTML;
  };

  /* ------------------------------------------------------------------ registration */

  Site.register = function (def) {
    if (!def || !def.id) throw new Error('Site.register: missing id');
    if (defs.some(d => d.id === def.id)) return;
    defs.push(def);
    defs.sort((a, b) => a.n - b.n);
    if (booted && !pageMode) renderIndex();
  };
  Site.scenes = () => defs.slice();
  const numbered = () => defs.filter(d => !d.hidden);

  /* ------------------------------------------------------------------ chrome refs */

  const ui = {};

  function grabChrome() {
    ui.stage = $('#stage');
    ui.controls = $('#controls');
    ui.headline = $('#headline');
    ui.caption = $('#caption');
    ui.index = $('#index');
    ui.links = $('#links');
    ui.find = $('#find');
    ui.menu = $('#menu');
    ui.shortcuts = $('#shortcuts');
    ui.sound = $('#sound');
    ui.hint = $('#hint');
    ui.reveal = $('#reveal');
    ui.findBtn = $('.pill--find');
    ui.menuBtn = $('.pill--menu');
  }

  /* ------------------------------------------------------------------ index + caption */

  function renderIndex() {
    if (!ui.index) return;
    ui.index.textContent = '';
    for (const d of numbered()) {
      const a = h('a', { href: '#' + d.id, 'aria-label': `${d.n}. ${d.title}`, title: d.title },
        '[', h('span', { class: 'n', text: String(d.n) }), ']');
      if (d.id === activeId) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', e => { e.preventDefault(); go(d.id, true); });
      a.addEventListener('pointerenter', () => sfx('hover'));
      ui.index.append(a);
    }
  }

  let captionTimer = 0;
  function setCaption(text) {
    if (!ui.caption) return;
    const lines = String(text || '').split('\n');
    const apply = () => {
      ui.caption.textContent = '';
      for (const l of lines) ui.caption.append(h('span', { class: 'line', text: l || ' ' }));
      requestAnimationFrame(() => { ui.caption.classList.remove('is-swapping'); layoutMobileStack(); });
    };
    clearTimeout(captionTimer);
    if (!ui.caption.childNodes.length || reduced) return apply();
    ui.caption.classList.add('is-swapping');
    captionTimer = setTimeout(apply, 220);
  }

  // Phones: the caption, the scene links row and the controls stack upward from the index, each with a gap.
  // (Scene links live in the [M] menu on phones; scenes lay their art out above bottom ≈ 104px + controls.)
  function layoutMobileStack() {
    if (!ui.caption || !ui.controls) return;
    if (innerWidth > 800) { ui.controls.style.bottom = ''; if (ui.hint) ui.hint.style.bottom = ''; return; }
    const capTop = 58 + ui.caption.offsetHeight;
    const ctrlBottom = Math.max(104, capTop + 16);
    ui.controls.style.bottom = ctrlBottom + 'px';
    if (ui.hint) ui.hint.style.bottom = (ctrlBottom + ui.controls.offsetHeight + 10) + 'px';
  }

  /* ------------------------------------------------------------------ context headline */

  // Big, persistent context text at the top of a scene ("what am I looking at?"). One group per scene;
  // only the active scene's group shows. Text may contain $…$ spans, typeset with KaTeX.
  function richHTML(text) {
    return String(text).split(/(\$[^$]+\$)/g).map(seg => {
      if (seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$') return Site.texHTML(seg.slice(1, -1));
      const d = document.createElement('span');
      d.textContent = seg;
      // wrap words so they can fade in one by one
      return d.innerHTML.split(/(\s+)/).map(w => (/^\s+$/.test(w) || !w) ? w : `<span class="w">${w}</span>`).join('');
    }).join('');
  }

  function setHeadline(rec, title, sub, opts = {}) {
    const g = rec.headlineEl;
    if (!g) return { bottom: 0 };
    const key = opts.key != null ? String(opts.key) : `${title}\u0000${sub || ''}`;
    if (g.dataset.key === key && !opts.force) return { bottom: headlineBottom(rec) };
    g.dataset.key = key;
    g.textContent = '';
    if (!title && !sub) { g.classList.remove('has-text'); notifyHeadline(rec); return { bottom: 0 }; }
    g.classList.add('has-text');
    if (title) g.append(h('p', { class: 'hl-title', html: richHTML(title) }));
    if (sub) g.append(h('p', { class: 'hl-sub', html: richHTML(sub) }));
    // word-by-word entrance (skipped for reduced motion)
    const words = [...g.querySelectorAll('.w, .katex')];
    if (!reduced && opts.animate !== false) {
      words.forEach((w, i) => { w.style.animationDelay = Math.min(i * 22, 900) + 'ms'; w.classList.add('hl-in'); });
    }
    notifyHeadline(rec);
    return { bottom: headlineBottom(rec) };
  }

  // debugging / screenshots: set the active scene's headline from the console
  Site._headline = (title, sub, opts) => { const rec = activeId && inst[activeId]; return rec ? setHeadline(rec, title, sub, opts || {}) : null; };

  function headlineBottom(rec) {
    const g = rec && rec.headlineEl;
    if (!g || !g.classList.contains('has-text') || !g.offsetParent) return 0;
    const r = g.getBoundingClientRect();
    return Math.round(r.bottom);
  }

  function notifyHeadline(rec) {
    requestAnimationFrame(() => {
      const bottom = headlineBottom(rec);
      rec.headlineFns.forEach(fn => { try { fn(bottom); } catch (e) { console.error(e); } });
      window.dispatchEvent(new CustomEvent('yd:headline', { detail: { id: rec.def.id, bottom } }));
    });
  }

  /* ------------------------------------------------------------------ hint */

  // One hint line. While audio is still locked, the "click for sound" invite is the resting state:
  // a scene's timed hint temporarily replaces it and the invite comes back when that hint expires.
  let hintTimer = 0;
  let invite = null;
  function renderHint(text, withDot) {
    ui.hint.textContent = '';
    if (withDot) ui.hint.append(h('span', { class: 'dot' }));
    ui.hint.append(text);
    ui.hint.classList.add('is-visible');
  }
  function restHint() {
    if (!ui.hint) return;
    if (invite) renderHint(invite, true);
    else ui.hint.classList.remove('is-visible');
  }
  function hint(text, ms = 3600, withDot = false) {
    if (!ui.hint) return;
    clearTimeout(hintTimer);
    if (!text) { restHint(); return; } // hint('') hides now
    renderHint(text, withDot);
    if (ms > 0) hintTimer = setTimeout(restHint, ms);
  }
  function hideHint() { clearTimeout(hintTimer); invite = null; if (ui.hint) ui.hint.classList.remove('is-visible'); }
  Site.hint = hint;

  /* ------------------------------------------------------------------ reveal card */

  const reveal = { target: null, x: 0, y: 0, raf: 0, cache: {} };

  function preload(src) {
    if (!src || reveal.cache[src]) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    reveal.cache[src] = img;
  }

  function showReveal(opts) {
    const card = ui.reveal;
    if (!card) return;
    card.textContent = '';
    const frame = h('div', { class: 'reveal-card__frame' });
    if (opts.src) {
      const img = h('img', { src: opts.src, alt: opts.title || '', class: opts.fit === 'contain' ? 'is-contain' : null });
      if (opts.maxHeight) img.style.maxHeight = opts.maxHeight + 'px';
      // the card's height is only known once the image has loaded: re-place it then
      if (!img.complete) img.addEventListener('load', () => { if (ui.reveal.contains(img)) positionReveal(); }, { once: true });
      frame.append(img);
    }
    card.append(frame);
    if (opts.title || opts.meta) {
      card.append(h('div', { class: 'reveal-card__meta' },
        h('span', { class: 't', text: opts.title || '' }),
        h('span', { class: 'm', text: opts.meta || '' })));
    }
    card.style.width = (opts.width || (innerWidth < 800 ? 220 : 300)) + 'px';
    card.classList.add('is-visible');
    positionReveal();
  }

  function positionReveal() {
    const card = ui.reveal;
    if (!card || !reveal.target) return;
    const r = card.getBoundingClientRect();
    const pad = 18;
    const floor = innerHeight - 72; // keep clear of the bottom chrome (index, Find, links)
    let x, y;
    if (reveal.anchor) {
      // pinned above the target (falls below it if there is no room)
      const b = reveal.target.getBoundingClientRect();
      x = b.left + b.width / 2 - r.width / 2;
      y = b.top - r.height - 12;
      if (y < 12) y = b.bottom + 12;
    } else {
      x = reveal.x + pad;
      if (x + r.width > innerWidth - 12) x = reveal.x - r.width - pad;
      // low on the screen (links row, lower data): open above the pointer
      y = reveal.y > innerHeight * 0.7 ? reveal.y - r.height - pad : reveal.y + pad;
      if (y + r.height > floor) y = reveal.y - r.height - pad;
    }
    x = Math.max(12, Math.min(x, innerWidth - r.width - 12));
    y = Math.max(12, Math.min(y, floor - r.height));
    card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function hideReveal() {
    reveal.target = null;
    if (ui.reveal) ui.reveal.classList.remove('is-visible');
  }

  function attachReveal(target, opts) {
    if (!target) return () => {};
    preload(opts.src);
    target.setAttribute('data-reveal', '');
    if (!target.hasAttribute('tabindex') && !(target instanceof HTMLAnchorElement)) target.setAttribute('tabindex', '0');
    const enter = e => {
      reveal.target = target;
      reveal.anchor = opts.anchor === 'above';
      if (e && e.clientX != null) { reveal.x = e.clientX; reveal.y = e.clientY; }
      else {
        const b = target.getBoundingClientRect();
        reveal.x = b.left + b.width / 2; reveal.y = b.top + b.height / 2;
      }
      showReveal(opts);
      sfx('hover');
    };
    const move = e => {
      if (reveal.target !== target) return;
      reveal.x = e.clientX; reveal.y = e.clientY;
      if (!reveal.raf) reveal.raf = requestAnimationFrame(() => { reveal.raf = 0; positionReveal(); });
    };
    const leave = () => { if (reveal.target === target) hideReveal(); };
    const click = e => {
      if (e.pointerType === 'touch' && reveal.target !== target) { e.preventDefault(); enter(e); return; }
      if (opts.href) { sfx('select'); window.open(opts.href, '_blank', 'noopener'); }
    };
    target.addEventListener('pointerenter', enter);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerleave', leave);
    target.addEventListener('focus', enter);
    target.addEventListener('blur', leave);
    target.addEventListener('click', click);
    return () => {
      target.removeEventListener('pointerenter', enter);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerleave', leave);
      target.removeEventListener('focus', enter);
      target.removeEventListener('blur', leave);
      target.removeEventListener('click', click);
      target.removeAttribute('data-reveal');
      if (reveal.target === target) hideReveal();
    };
  }
  Site.reveal = attachReveal;

  /* ------------------------------------------------------------------ controls: stepper + slider */

  function makeStepper(group, { items, onSelect, index = 0 }) {
    const root = h('div', { class: 'stepper', role: 'tablist', 'aria-orientation': 'vertical' });
    const rail = h('span', { class: 'stepper__rail' });
    const tick = h('span', { class: 'stepper__tick' });
    root.append(rail, tick);
    let cur = -1;
    const btns = items.map((label, i) => {
      const b = h('button', { class: 'stepper__item', role: 'tab', type: 'button' }, label);
      b.addEventListener('click', () => {
        sfx('tick');
        set(i);
        if (onSelect) onSelect(i, true);
      });
      b.addEventListener('pointerenter', () => sfx('hover'));
      root.append(b);
      return b;
    });
    function place() {
      const b = btns[cur];
      if (!b) return;
      const y = b.offsetTop + b.offsetHeight / 2;
      tick.style.transform = `translateY(${Math.round(y)}px)`;
    }
    function set(i) {
      i = Math.max(0, Math.min(items.length - 1, i | 0));
      if (i === cur) return;
      cur = i;
      btns.forEach((b, j) => {
        b.classList.toggle('is-active', j === i);
        b.setAttribute('aria-selected', j === i ? 'true' : 'false');
      });
      place();
    }
    group.append(root);
    set(index);
    requestAnimationFrame(place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    return { set, get: () => cur, el: root, place };
  }

  function makeSlider(group, { min = 0, max = 1, step = 0, value = min, label, left = '', right = '', onInput }) {
    const root = h('div', { class: 'slider' });
    const lab = h('div', { class: 'slider__label' });
    const track = h('div', {
      class: 'slider__track', role: 'slider', tabindex: '0',
      'aria-valuemin': String(min), 'aria-valuemax': String(max),
    });
    const thumb = h('span', { class: 'slider__thumb' });
    track.append(thumb);
    const ends = h('div', { class: 'slider__ends' }, h('span', { text: left }), h('span', { text: right }));
    root.append(lab, track, ends);
    group.append(root);

    let v = value;
    let lastDetent = null;
    let lastTickAt = 0;
    const quant = x => {
      x = Math.max(min, Math.min(max, x));
      if (step > 0) x = Math.round((x - min) / step) * step + min;
      return +x.toFixed(6);
    };
    function render() {
      const f = max === min ? 0 : (v - min) / (max - min);
      thumb.style.left = (f * 100).toFixed(3) + '%';
      lab.textContent = label ? label(v) : String(v);
      track.setAttribute('aria-valuenow', String(v));
    }
    function set(x, fromUser) {
      const nv = quant(x);
      if (nv === v && !fromUser) { render(); return; }
      v = nv;
      render();
      if (fromUser) {
        const detent = step > 0 ? v : Math.round(((v - min) / (max - min || 1)) * 24);
        // detent sound, at most ~12/s so a fast drag stays a texture rather than a buzz
        const now = performance.now();
        if (detent !== lastDetent && now - lastTickAt > 85) { lastDetent = detent; lastTickAt = now; sfx('tick', { gain: 0.6 }); }
        if (onInput) onInput(v);
      }
    }
    const fromEvent = e => {
      const r = track.getBoundingClientRect();
      return min + ((e.clientX - r.left) / r.width) * (max - min);
    };
    track.addEventListener('pointerdown', e => {
      track.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
      set(fromEvent(e), true);
    });
    track.addEventListener('pointermove', e => { if (track.hasPointerCapture(e.pointerId)) set(fromEvent(e), true); });
    const end = e => { root.classList.remove('is-dragging'); try { track.releasePointerCapture(e.pointerId); } catch (_) {} };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('keydown', e => {
      const inc = step > 0 ? step : (max - min) / 50;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - inc, true); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + inc, true); e.preventDefault(); e.stopPropagation(); }
    });
    set(value, false);
    render();
    return { set: x => set(x, false), get: () => v, el: root };
  }

  /* ------------------------------------------------------------------ scene instances */

  function makeCanvas(rec, parent, opts = {}) {
    parent = parent || rec.el;
    const canvas = h('canvas');
    if (opts.z != null) canvas.style.zIndex = String(opts.z);
    if (parent !== rec.el) Object.assign(canvas.style, { position: 'absolute', inset: '0', display: 'block' });
    parent.append(canvas);
    const ctx = canvas.getContext('2d');
    const out = {
      canvas, ctx, w: 0, h: 0, dpr: 1,
      clear() { ctx.clearRect(0, 0, out.w, out.h); },
      resize() {
        const w = parent.clientWidth || innerWidth;
        const hh = parent.clientHeight || innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (w === out.w && hh === out.h && dpr === out.dpr) return;
        out.w = w; out.h = hh; out.dpr = dpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(hh * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = hh + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
    };
    out.resize();
    rec.canvases.push(out);
    return out;
  }

  function createInstance(def) {
    const el = h('section', { class: `scene scene--${def.id}`, 'data-scene': def.id, 'aria-label': def.title });
    ui.stage.append(el);
    const controls = h('div', { class: 'controls-group', 'data-scene': def.id });
    ui.controls.append(controls);
    const links = h('div', { class: 'links-group', 'data-scene': def.id });
    ui.links.append(links);
    const headlineEl = h('div', { class: 'headline-group', 'data-scene': def.id });
    if (ui.headline) ui.headline.append(headlineEl);

    const rec = {
      def, el, controls, links, headlineEl,
      loops: new Set(), resizers: new Set(), canvases: [], placers: [], headlineFns: new Set(),
      caption: def.caption || '',
      hooks: {}, soundOn: false,
    };

    const api = {
      id: def.id,
      n: def.n,
      el,
      colors: Site.colors,
      fonts: Site.fonts,
      reduced,
      audio: Site.audio,
      bus: () => {
        const a = audio();
        if (!a || !a.ready) return null;
        try { return a.bus(def.id); } catch (e) { return null; }
      },
      isActive: () => activeId === def.id,
      loop(fn) { rec.loops.add(fn); return () => rec.loops.delete(fn); },
      onResize(fn) { rec.resizers.add(fn); return () => rec.resizers.delete(fn); },
      size: () => ({ w: ui.stage.clientWidth || innerWidth, h: ui.stage.clientHeight || innerHeight }),
      canvas: (parent, opts) => makeCanvas(rec, parent, opts),
      stepper: opts => { const s = makeStepper(controls, opts); rec.placers.push(s.place); return s; },
      slider: opts => makeSlider(controls, opts),
      caption(text) { rec.caption = text; if (activeId === def.id) setCaption(text); },
      links(items) {
        links.textContent = '';
        const anchors = [];
        for (const it of items || []) {
          const ext = /^(https?:|mailto:)/.test(it.href);
          const a = h('a', { href: it.href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null },
            h('span', { text: it.label }), ext && !it.href.startsWith('mailto:') ? ' ↗' : '');
          a.addEventListener('pointerenter', () => sfx('hover'));
          a.addEventListener('click', () => sfx('select'));
          links.append(a);
          anchors.push(a);
        }
        if (activeId === def.id) requestAnimationFrame(layoutMobileStack);
        return anchors;
      },
      reveal: (target, opts) => attachReveal(target, opts || {}),
      tex: (target, latex, opts) => tex(target, latex, opts),
      art: () => Site.art,
      hint: (text, ms) => hint(text, ms),
      // context headline: big text at the top that says what the step shows (see CONTRACT "Round 4")
      headline: (title, sub, opts) => setHeadline(rec, title, sub, opts || {}),
      headlineBottom: () => headlineBottom(rec),
      onHeadline(fn) { rec.headlineFns.add(fn); return () => rec.headlineFns.delete(fn); },
      headlineTop(px) { // phones: let the scene put the headline under its own step navigation
        if (px == null) headlineEl.style.top = ''; else headlineEl.style.top = Math.round(px) + 'px';
        notifyHeadline(rec);
      },
    };
    rec.api = api;

    try {
      rec.hooks = def.create(el, api) || {};
    } catch (err) {
      console.error(`[site] scene "${def.id}" failed to create`, err);
      el.append(h('div', { class: 'mono-xs', style: 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#999', text: `${def.title} — failed to load` }));
      rec.hooks = {};
    }
    inst[def.id] = rec;
    return rec;
  }

  function callHook(rec, name, ...args) {
    const fn = rec && rec.hooks && rec.hooks[name];
    if (typeof fn !== 'function') return undefined;
    try { return fn.apply(rec.hooks, args); } catch (err) { console.error(`[site] ${rec.def.id}.${name}()`, err); }
    return undefined;
  }

  // Sound lifecycle: sound(true) only while active + audio ready + enabled.
  let readyHooked = false;
  function syncSound(rec) {
    if (!rec) return;
    const a = audio();
    if (a && !a.ready) {
      // Music is on by default: however audio becomes ready, every scene is synced at that moment; and a visitor who
      // has already interacted with the site (a reload, a link from another page of it: the browser carries that
      // activation over) needs no new gesture.
      if (!readyHooked && typeof a.onReady === 'function') {
        readyHooked = true;
        // (a microtask later: when a keydown's unlock is ready at once, the key it navigates by is handled first)
        a.onReady(() => Promise.resolve().then(() => {
          unlocked = true; hideHint(); renderSound();
          try { if (activeId) a.fadeBus(activeId, busTrim(activeId), 0.3); } catch (e) {}
          for (const id in inst) syncSound(inst[id]);
        }));
      }
      if (activeId === rec.def.id && navigator.userActivation && navigator.userActivation.hasBeenActive) { try { a.unlock(); } catch (e) {} }
    }
    const want = activeId === rec.def.id && !!(a && a.ready && a.enabled);
    if (want === rec.soundOn) return;
    rec.soundOn = want;
    callHook(rec, 'sound', want);
  }

  /* ------------------------------------------------------------------ routing */

  function idFromHash() {
    const raw = decodeURIComponent((location.hash || '').replace(/^#\/?/, '')).toLowerCase();
    if (!raw) return null;
    const byId = defs.find(d => d.id === raw || (d.path && d.path.replace(/^\//, '') === raw));
    if (byId) return byId.id;
    const byN = defs.find(d => String(d.n) === raw);
    return byN ? byN.id : null;
  }

  function go(id, fromUser) {
    const def = defs.find(d => d.id === id);
    if (!def) return;
    if (id === activeId) return;
    const prev = activeId ? inst[activeId] : null;
    activeId = id;

    if (prev) {
      syncSound(prev);
      callHook(prev, 'exit');
      prev.el.classList.remove('is-active');
      prev.controls.classList.remove('is-active');
      prev.links.classList.remove('is-active');
      prev.headlineEl.classList.remove('is-active');
      try { const a = audio(); if (a && a.ready) a.fadeBus(prev.def.id, 0, 0.4); } catch (e) {}
    }
    hideReveal();

    const rec = inst[id] || createInstance(def);
    rec.canvases.forEach(c => c.resize());
    rec.el.classList.add('is-active');
    rec.controls.classList.add('is-active');
    rec.links.classList.add('is-active');
    rec.headlineEl.classList.add('is-active');
    setCaption(rec.caption);
    renderIndex();
    document.title = def.n === 1 && !fromUser && !prev ? 'Yash Dagade' : `${def.title} — Yash Dagade`;

    const newHash = '#' + def.id;
    if (location.hash !== newHash) history.replaceState(null, '', newHash);

    try {
      const a = audio();
      if (a && a.ready) { a.fadeBus(id, busTrim(id), 0.4); if (prev) a.ui.transition(def.n); }
    } catch (e) {}

    callHook(rec, 'enter');
    // Controls were laid out while hidden (display:none): re-place stepper ticks now.
    requestAnimationFrame(() => { rec.placers.forEach(p => p()); layoutMobileStack(); window.dispatchEvent(new Event('yd:layout')); });
    syncSound(rec);
  }
  Site.go = go;
  Site.active = () => activeId;

  function step(delta) {
    const list = numbered();
    if (!list.length) return;
    const i = list.findIndex(d => d.id === activeId);
    const j = i < 0 ? (delta > 0 ? 0 : list.length - 1) : (i + delta + list.length) % list.length;
    go(list[j].id, true);
  }

  /* ------------------------------------------------------------------ main loop */

  let last = 0;
  function frame(nowMs) {
    const t = nowMs / 1000;
    const dt = last ? Math.min(0.1, t - last) : 1 / 60;
    last = t;
    const rec = activeId && inst[activeId];
    if (rec) {
      for (const fn of rec.loops) {
        try { fn(t, dt); } catch (err) { console.error(`[site] ${rec.def.id} loop`, err); rec.loops.delete(fn); }
      }
    }
    requestAnimationFrame(frame);
  }

  let resizeRaf = 0;
  function onResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      for (const id in inst) {
        const rec = inst[id];
        rec.canvases.forEach(c => c.resize());
        rec.placers.forEach(p => p());
        if (id === activeId) notifyHeadline(rec);
        const { w, h: hh } = rec.api.size();
        rec.resizers.forEach(fn => { try { fn(w, hh); } catch (e) { console.error(e); } });
      }
      layoutMobileStack();
      window.dispatchEvent(new Event('yd:layout'));
    });
  }

  /* ------------------------------------------------------------------ overlays */

  let openOverlay = null;

  function open(which) {
    if (openOverlay === which) return;
    if (openOverlay) close(true);
    openOverlay = which;
    const el = ui[which];
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    hideReveal();
    sfx('open');
    if (which === 'find') {
      pal.q = '';
      pal.sel = 0;
      renderPalette();
      pal.input.value = '';
      pal.input.focus({ preventScroll: true });
      ui.findBtn && (ui.findBtn.style.visibility = 'hidden');
    }
    if (which === 'menu' && ui.menuBtn) { ui.menuBtn.textContent = '[X]'; document.body.classList.add('menu-open'); fillPageLinks(); }
  }

  // Phones hide the bottom-right scene links, so the menu carries them ("On this page").
  function fillPageLinks() {
    const box = $('#menu .page-links');
    if (!box) return;
    box.textContent = '';
    const rec = activeId && inst[activeId];
    const src = rec ? [...rec.links.querySelectorAll('a[href]')] : [];
    if (!src.length) return;
    box.append(h('div', { class: 'sep' }), h('div', { class: 'k', text: `On this page · ${rec.def.title}` }));
    const row = h('div', { class: 'small' });
    for (const a of src) {
      const c = h('a', { href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') }, a.textContent.replace(/\s*↗\s*$/, ''));
      c.addEventListener('click', () => sfx('select'));
      row.append(c);
    }
    box.append(row);
  }

  function close(silent) {
    if (!openOverlay) return;
    const el = ui[openOverlay];
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (openOverlay === 'find') { pal.input.blur(); ui.findBtn && (ui.findBtn.style.visibility = ''); }
    if (openOverlay === 'menu' && ui.menuBtn) { ui.menuBtn.textContent = '[M]'; document.body.classList.remove('menu-open'); }
    openOverlay = null;
    if (!silent) sfx('close');
  }
  Site.open = open;
  Site.close = close;

  /* ---- Find palette ---- */

  const pal = { q: '', sel: 0, items: [], list: null, typed: null, input: null };

  function paletteEntries() {
    const scenes = defs.map(d => ({
      group: d.hidden ? 'Pages' : 'Work', title: d.title, path: d.path || '/' + d.id, key: d.hidden ? null : String(d.n),
      run: () => { if (pageMode) location.href = 'index.html#' + d.id; else go(d.id, true); },
    }));
    const rest = DESTINATIONS.map(d => ({
      group: d.group, title: d.title, path: d.path,
      run: () => { if (d.ext) window.open(d.href, '_blank', 'noopener'); else location.href = d.href; },
    }));
    if (pageMode) rest.unshift({ group: 'Pages', title: 'Home', path: '/', run: () => { location.href = 'index.html'; } });
    return scenes.concat(rest);
  }

  function score(item, q) {
    if (!q) return 1;
    const hay = (item.title + ' ' + item.path + ' ' + item.group).toLowerCase();
    if (hay.startsWith(q)) return 3;
    if (item.title.toLowerCase().split(/\s+/).some(w => w.startsWith(q))) return 2.5;
    if (hay.includes(q)) return 2;
    if (q.length < 3) return 0;
    let i = 0;
    for (const ch of item.title.toLowerCase()) if (ch === q[i]) i++;
    return i === q.length ? 1 : 0;
  }

  function renderPalette() {
    const q = pal.q.trim().toLowerCase();
    pal.typed.textContent = pal.q;
    const all = paletteEntries();
    pal.items = all
      .map((it, i) => ({ it, s: score(it, q), i }))
      .filter(x => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0) || a.i - b.i)
      .map(x => x.it);
    pal.sel = Math.max(0, Math.min(pal.sel, pal.items.length - 1));
    pal.list.textContent = '';
    if (!pal.items.length) {
      pal.list.append(h('li', { class: 'palette__empty', text: 'No matches. Try "sky", "press" or "3".' }));
      return;
    }
    let lastGroup = null;
    pal.items.forEach((it, i) => {
      if (!q && it.group !== lastGroup) {
        lastGroup = it.group;
        pal.list.append(h('li', { 'aria-hidden': 'true' }, h('span', { class: 'grp', text: it.group })));
      }
      const li = h('li', { class: i === pal.sel ? 'is-selected' : '' });
      const a = h('a', { href: '#', role: 'option' },
        h('span', null, it.key ? h('span', { style: 'color:var(--g500);margin-right:10px', text: `[${it.key}]` }) : null, it.title),
        h('span', { class: 'p', text: it.path }));
      a.addEventListener('click', e => { e.preventDefault(); pal.sel = i; runSelected(); });
      a.addEventListener('pointermove', () => {
        if (pal.sel !== i) { pal.sel = i; highlight(); sfx('hover'); }
      });
      li.append(a);
      pal.list.append(li);
    });
  }

  function highlight() {
    const lis = [...pal.list.querySelectorAll('li:not([aria-hidden])')];
    lis.forEach((li, i) => li.classList.toggle('is-selected', i === pal.sel));
    const cur = lis[pal.sel];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function runSelected() {
    const it = pal.items[pal.sel];
    if (!it) { sfx('error'); return; }
    sfx('select');
    close(true);
    it.run();
  }

  function buildPalette() {
    pal.typed = $('#find .typed');
    pal.list = $('#find .palette__list');
    pal.input = $('#find input');
    pal.input.addEventListener('input', () => {
      pal.q = pal.input.value.replace(/^yashdagade\//, '');
      pal.sel = 0;
      renderPalette();
      sfx('type');
    });
    pal.input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { pal.sel = Math.min(pal.items.length - 1, pal.sel + 1); highlight(); sfx('tick'); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { pal.sel = Math.max(0, pal.sel - 1); highlight(); sfx('tick'); e.preventDefault(); }
      else if (e.key === 'Enter') { runSelected(); e.preventDefault(); }
      else if (e.key === 'Escape') { close(); e.preventDefault(); }
      else if (e.key === '?' && !pal.q) { e.preventDefault(); open('shortcuts'); }
      else if (e.key === 'Backspace' && !pal.input.value) sfx('type');
      e.stopPropagation();
    });
    ui.find.addEventListener('pointerdown', e => { if (e.target === ui.find) close(); });
    $('#find .palette').addEventListener('pointerdown', () => setTimeout(() => pal.input.focus({ preventScroll: true }), 0));
  }

  /* ---- Menu ---- */

  function buildMenu() {
    const panel = $('#menu .menu-panel');
    if (!panel) return;
    panel.textContent = '';
    const link = (text, href, cls, ext) => {
      const a = h('a', { href, class: cls || null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, text);
      a.addEventListener('pointerenter', () => sfx('hover'));
      a.addEventListener('click', () => sfx('select'));
      return a;
    };
    panel.append(link('Work', pageMode ? 'index.html' : '#' + (defs[0] ? defs[0].id : '')));
    for (const d of numbered()) {
      const a = h('a', { href: (pageMode ? 'index.html' : '') + '#' + d.id, class: 'indent' },
        h('span', { class: 'k', text: `[${d.n}]` }), d.title);
      a.addEventListener('pointerenter', () => sfx('hover'));
      a.addEventListener('click', e => {
        if (!pageMode) { e.preventDefault(); close(true); go(d.id, true); }
      });
      panel.append(a);
    }
    for (const d of defs.filter(x => x.hidden)) {
      const a = link(d.title, (pageMode ? 'index.html' : '') + '#' + d.id);
      a.addEventListener('click', e => { if (!pageMode) { e.preventDefault(); close(true); go(d.id, true); } });
      panel.append(a);
    }
    panel.append(link('About', 'me.html'));
    panel.append(link('Books', 'books.html'));
    panel.append(h('div', { class: 'sep' }));
    const small = h('div', { class: 'small' },
      link('X', LINKS.x, null, true), link('LinkedIn', LINKS.linkedin, null, true),
      link('GitHub', LINKS.github, null, true), link('Scholar', LINKS.scholar, null, true),
      link('Email', LINKS.email), link('Resume', LINKS.resume, null, true));
    panel.append(small);
    panel.append(h('div', { class: 'page-links' }));
    // Attribution: always credit where the ideas came from.
    panel.append(h('div', { class: 'credit' },
      'Design inspired by ', link('paradigm.xyz', 'https://www.paradigm.xyz', null, true),
      ' · ', link('Old website', 'old/index.html')));
    ui.menu.addEventListener('pointerdown', e => { if (e.target === ui.menu) close(); });
  }

  /* ------------------------------------------------------------------ sound toggle + unlock */

  function renderSound() {
    const a = audio();
    const on = !!(a && a.enabled);
    if (ui.sound) {
      ui.sound.classList.toggle('is-off', !on);
      ui.sound.setAttribute('aria-label', on ? 'Mute sound [S]' : 'Unmute sound [S]');
      ui.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function toggleSound() {
    const a = audio();
    if (!a) return;
    try {
      a.unlock();
      a.toggle();
      if (a.enabled) setTimeout(() => sfx('select'), 30);
    } catch (e) {}
    renderSound();
    hint(a.enabled ? 'Sound on' : 'Sound off', 1400);
    for (const id in inst) syncSound(inst[id]);
  }

  let unlocked = false, gestureHooks = false;
  function unlockAudio() {
    const a = audio();
    if (!a || (unlocked && a.ready)) return;
    // Any gesture counts. A touchstart (or a touch pointerdown) is not a user activation, so keep trying on the ones
    // that are (the tap's end, its click) until the context really runs, and resume it directly: a resume() refused
    // before a gesture can stay pending inside audio.js.
    if (!gestureHooks) {
      gestureHooks = true;
      ['pointerup', 'touchend', 'click'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true, capture: true }));
    }
    try {
      if (a.ctx && a.ctx.state !== 'running' && typeof a.ctx.resume === 'function') { const r = a.ctx.resume(); if (r && r.catch) r.catch(() => {}); }
      const p = a.unlock();
      unlocked = true;
      const after = () => {
        hideHint();
        renderSound();
        try { if (a.ready && activeId) a.fadeBus(activeId, busTrim(activeId), 0.3); } catch (e) {}
        for (const id in inst) syncSound(inst[id]);
      };
      if (p && typeof p.then === 'function') p.then(after, after); else setTimeout(after, 30);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ keyboard */

  function isTyping(e) {
    const t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  function onKey(e) {
    unlockAudio();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (openOverlay) {
      if (e.key === 'Escape') { close(); e.preventDefault(); }
      else if (openOverlay !== 'find' && (e.key === 'm' || e.key === 'M') && openOverlay === 'menu') { close(); e.preventDefault(); }
      else if (openOverlay === 'shortcuts' && e.key === '?') { close(); e.preventDefault(); }
      return;
    }
    if (isTyping(e)) return;
    const k = e.key;
    if (!pageMode && /^[1-9]$/.test(k)) {
      const d = numbered().find(x => String(x.n) === k);
      if (d) { go(d.id, true); e.preventDefault(); return; }
    }
    if (!pageMode && k === 'ArrowRight') { step(1); e.preventDefault(); return; }
    if (!pageMode && k === 'ArrowLeft') { step(-1); e.preventDefault(); return; }
    if (k === 'f' || k === 'F' || k === '/') { open('find'); e.preventDefault(); return; }
    if (k === 'm' || k === 'M') { open('menu'); e.preventDefault(); return; }
    if (k === 's' || k === 'S') { toggleSound(); e.preventDefault(); return; }
    if (k === '?') { open('shortcuts'); e.preventDefault(); return; }
    if (k === 'Escape') { hideReveal(); return; }
    const rec = activeId && inst[activeId];
    if (rec && callHook(rec, 'key', e) === true) e.preventDefault();
  }

  /* ------------------------------------------------------------------ touch swipe */

  function bindSwipe() {
    let sx = 0, sy = 0, st = 0;
    ui.stage.addEventListener('touchstart', e => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = performance.now();
    }, { passive: true });
    ui.stage.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (performance.now() - st < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ wordmark: always "Yash Dagade"; a click types the next phrase */

  const WORDMARK = ['Yash Dagade', 'Energy and Intelligence', 'Models and Robots'];

  function startWordmark() {
    const wm = $('.wordmark');
    if (!wm) return;
    wm.textContent = '';
    const text = h('span', { class: 'wm-text', text: WORDMARK[0] });
    const caret = h('span', { class: 'wm-caret', 'aria-hidden': 'true' });
    wm.append(text, caret);
    wm.setAttribute('aria-label', 'Yash Dagade');
    wm.setAttribute('title', '');
    let i = 0;
    let run = 0; // a newer click cancels a typing run in progress
    const wait = ms => new Promise(r => setTimeout(r, ms));
    async function typeTo(next) {
      const my = ++run;
      wm.classList.add('is-typing');
      if (reduced) { text.textContent = next; }
      else {
        let cur = text.textContent;
        while (cur.length) { if (my !== run) return; cur = cur.slice(0, -1); text.textContent = cur; await wait(26); }
        wm.classList.toggle('is-long', next.length > 14);
        await wait(160);
        for (let k = 1; k <= next.length; k++) {
          if (my !== run) return;
          text.textContent = next.slice(0, k);
          await wait(48 + Math.random() * 34 + (next[k - 1] === ' ' ? 40 : 0));
        }
      }
      wm.classList.toggle('is-long', next.length > 14);
      if (my === run) setTimeout(() => { if (my === run) wm.classList.remove('is-typing'); }, 700);
    }
    wm.addEventListener('click', e => {
      e.preventDefault();
      i = (i + 1) % WORDMARK.length;
      sfx('tick');
      typeTo(WORDMARK[i]);
    });
  }

  /* ------------------------------------------------------------------ boot */

  Site.boot = function (opts = {}) {
    if (booted) return;
    booted = true;
    pageMode = !!opts.page;
    document.body.classList.toggle('page-mode', pageMode);
    grabChrome();
    startWordmark();

    buildPalette();
    buildMenu();

    ui.findBtn && ui.findBtn.addEventListener('click', () => open('find'));
    ui.menuBtn && ui.menuBtn.addEventListener('click', () => (openOverlay === 'menu' ? close() : open('menu')));
    ui.sound && ui.sound.addEventListener('click', e => { e.stopPropagation(); unlockAudio(); toggleSound(); });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close()));
    ui.shortcuts && ui.shortcuts.addEventListener('pointerdown', e => { if (e.target === ui.shortcuts) close(); });
    [ui.findBtn, ui.menuBtn, ui.sound].forEach(b => b && b.addEventListener('pointerenter', () => sfx('hover')));

    window.addEventListener('keydown', onKey);
    ['pointerdown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true, capture: true }));
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
    // headline heights change once the web fonts arrive
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const rec = activeId && inst[activeId]; if (rec) notifyHeadline(rec); });

    const a = audio();
    if (a && typeof a.onChange === 'function') {
      a.onChange(() => { renderSound(); for (const id in inst) syncSound(inst[id]); });
    }
    renderSound();

    if (pageMode) {
      if (!(a && a.ready)) setTimeout(() => { if (!unlocked) hint('Press F to find anything', 3200); }, 1200);
      return;
    }

    bindSwipe();
    window.addEventListener('hashchange', () => { const id = idFromHash(); if (id) go(id, true); });
    renderIndex();
    const first = idFromHash() || (defs[0] && defs[0].id);
    if (first) go(first, false);
    requestAnimationFrame(frame);

    // Sound is a big part of this site: invite the first gesture.
    setTimeout(() => {
      if (!unlocked) { invite = 'Click or press any key for sound · 1–5 to explore'; restHint(); }
    }, 900);
  };
})();
