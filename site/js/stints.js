/* Stints: the project catalog, and its list on the About page (/me).
 *
 * The one source of the projects. The About page lists them beside its text (Site.renderStints, a copy of the Build
 * film's index); the Build film (/build) reads the same rows for its montage, hover cards and index. Adding a project = one row here:
 *   { id, name, year (display), y0, y1?, field (one of STINT_FIELDS), one (one-liner), idx (the list's line,
 *     ≤ ~64 chars so it fits two lines of the column), href|null, video?, img | gen:'title'|'code' (no image: a
 *     drawn tile), thumb? (list thumbnail, defaults to img), tcrop? (Build's thumbnail crop), meta, arch? (archived),
 *     w?, film? (in Build's cold-open montage) }
 * Order = newest first.
 */
(function () {
  'use strict';
  const Site = (window.Site = window.Site || {});

  Site.STINT_FIELDS = ['Research', 'Energy', 'Safety', 'Products', 'Tools', 'Experiments'];
  Site.STINTS = [
    { id: 'lpwm', name: 'LpWM', year: '2026', y0: 2026, field: 'Research', one: 'Sparse JEPA world model: sparsity lowers the predictor size needed to plan', idx: 'Sparse JEPA world model: plans with a smaller predictor', href: 'https://arxiv.org/abs/2608.22764', gen: 'code', meta: 'arXiv 2026 · sparse beats dense by up to +57 pts on PushT', film: true },
    { id: 'rectified-lpjepa', name: 'Rectified LpJEPA', year: '2026', y0: 2026, field: 'Research', one: 'JEPA pretraining on sparse, maximum-entropy representations', idx: 'JEPA pretraining on sparse, maximum-entropy features', href: 'https://arxiv.org/abs/2602.01456', img: 'site/img/projects/lpjepa.jpg', meta: 'ICML 2026', film: true },
    { id: 'arbor', name: 'Arbor', year: '2026', y0: 2026, field: 'Tools', one: 'Research workspace: syncs W&B, GitHub and Notion into a research tree that knows what I’m working on and keeps me on track', idx: 'W&B, GitHub and Notion → a research tree that keeps me on track', href: 'https://research-planner.bluemushroom-5aac49f7.eastus2.azurecontainerapps.io/', img: 'site/img/projects/arbor-signin.jpg', meta: 'Live · private login', film: true },
    { id: 'hermes', name: 'Hermes', year: '2026', y0: 2026, field: 'Tools', one: 'Chrome extension that reads articles aloud with live word highlighting, 0.75–4×', idx: 'Chrome extension: reads articles aloud, word-synced, 0.75–4×', href: 'https://github.com/YashDagade/browser-reader', img: 'site/img/projects/hermes.jpg', meta: 'Chrome extension · GitHub', film: true },
    { id: 'blinket', name: 'Blinket', year: '2026', y0: 2026, field: 'Products', one: 'Hands-free internet for people with ALS: blinks and winks on an ordinary webcam drive search, chat, shopping and calls', idx: 'Hands-free internet for ALS: blinks and winks on a webcam', href: 'https://blinketmed.com/apps', video: 'https://youtu.be/NoRGMwNrWNU', img: 'site/img/projects/blinket.jpg', meta: 'TreeHacks ’26 · demo video', film: true },
    { id: 'option-glass', name: 'Option Glass', year: '2026', y0: 2026, field: 'Tools', one: 'macOS screen assistant: double-tap Option to ask about whatever is on screen', idx: 'macOS assistant: double-tap Option, ask about the screen', href: null, img: 'site/img/projects/option-glass.jpg', meta: 'macOS · Swift', film: true },
    { id: 'biped', name: 'Biped', year: '2026', y0: 2026, field: 'Experiments', one: 'Bipedal robot on HiWonder LX-16A bus servos; build log in progress', idx: 'Bipedal robot on LX-16A bus servos; build log in progress', href: 'biped/', img: 'site/img/robot/robot-held-inspecting.jpg', thumb: 'site/img/robot/robot-held-inspecting-sq.jpg', tcrop: [128, 172, 380, 264], meta: 'Build log · Notion', film: true },
    { id: 'central-america-drift', name: 'Central America Drift', year: '2026', y0: 2026, field: 'Experiments', one: 'JS rigid-body sim of Central America rifting apart into islands', idx: 'Rigid-body JS sim of Central America rifting into islands', href: 'https://github.com/YashDagade/central_america_drift', img: 'site/img/projects/central-america-drift.jpg', meta: 'Simulation · GitHub', film: true },
    { id: 'simpl', name: 'Simpl', year: '2025–26', y0: 2025, y1: 2026, field: 'Products', one: 'iOS daily coach: turns quick food, sleep and exercise logs into what to do next', idx: 'iOS coach: food, sleep and exercise logs → what to do next', href: null, img: 'site/img/projects/simpl.jpg', meta: 'iOS app · Expo', film: true },
    { id: 'connectu', name: 'ConnectU', year: '2025–26', y0: 2025, y1: 2026, field: 'Products', one: 'Mentor–mentee matching: LLM bios, embeddings and Hungarian-algorithm pairing', idx: 'Mentor matching: LLM bios, embeddings, Hungarian pairing', href: 'https://connectu-frontend.vercel.app/', img: 'site/img/projects/connectu.jpg', meta: 'Matching platform', film: true },
    { id: 'radial-vcreg', name: 'Radial-VCReg', year: '2025', y0: 2025, field: 'Research', one: 'VCReg + radial Gaussianization: pushes feature norms toward the Chi distribution', idx: 'Radial Gaussianization: feature norms pushed toward Chi', href: 'https://arxiv.org/abs/2602.14272', img: 'site/img/projects/radialvcreg.jpg', meta: 'NeurIPS \'25 workshops', w: 291, film: true },
    { id: 'resq', name: 'ResQ', year: '2025', y0: 2025, field: 'Safety', one: 'Watches traffic-camera streams and flags crashes with a vision LLM in real time', idx: 'Flags crashes in live traffic-camera streams with a vision LLM', href: 'https://res-q-eta.vercel.app/', img: 'site/img/projects/resq.jpg', meta: 'Vision LLM · real time', film: true },
    { id: 'goedel', name: 'Goedel-Prover-V2, enhanced', year: '2025', y0: 2025, field: 'Experiments', one: 'Prompt adapter for Goedel-Prover-V2-8B: 84.6% → 85.2% on miniF2F (self-reported)', idx: 'Prompt adapter, 8B: 84.6% → 85.2% miniF2F (self-reported)', href: null, gen: 'title', meta: 'Lean · LLM' },
    { id: 'lotus', name: 'LOTUS', year: '2025', y0: 2025, field: 'Experiments', one: 'Generating Cas9 protein variants by flow matching in ESM-2 embedding space', idx: 'Cas9 variants via flow matching in ESM-2 space', href: 'https://github.com/YashDagade/Lotus', gen: 'title', meta: 'Flow matching · GitHub' },
    { id: 'wesifted', name: 'WeSifted', year: '2025', y0: 2025, field: 'Products', one: 'Free quarterly briefings on the federal bills and laws that matter to your business, plus a source-cited AI bill chat', idx: 'Federal bills and laws, briefed for your business · AI bill chat', href: 'https://www.wesifted.com/', img: 'site/img/projects/wesifted.jpg', meta: 'Live · wesifted.com' },
    { id: 'echo', name: 'Echo', year: '2025', y0: 2025, field: 'Products', one: 'AI documentation and note-taking for therapists', idx: 'AI documentation and note-taking for therapists', href: null, gen: 'title', meta: 'Archived', arch: true },
    { id: 'idontwannadie', name: 'idontwannadie.lol', year: '2024', y0: 2024, field: 'Safety', one: 'Safer-route maps built on 3.1M+ Minnesota crash records; built at PennApps XXV', idx: 'Safer routes from 3.1M+ MN crash records · PennApps XXV', href: 'https://idontwannadie.lol/', img: 'site/img/projects/idontwannadie.jpg', meta: 'PennApps XXV', film: true },
    { id: 'skywindfarm', name: 'SkyWindFarm', year: '2022–24', y0: 2022, y1: 2024, field: 'Energy', one: 'Airborne wind energy: helium-lifted VAWT clusters that harvest high-altitude wind', idx: 'Helium-lifted turbine clusters harvesting high-altitude wind', href: 'https://youtu.be/Z6k2j59-ubo', video: 'https://youtu.be/Z6k2j59-ubo', img: 'site/img/swf/prototype-flight.jpg', thumb: 'site/img/photos/swf-flight-low-2024-sq.jpg', meta: 'Flight video · ISEF 2023 + 2024 · patent application' },
    { id: 'eyeda', name: 'EyeDa', year: '2022', y0: 2022, field: 'Safety', one: 'Distracted-driving nonprofit + real-time detection device, built with a team of 15', idx: 'Distracted-driving nonprofit + detection device, with a team of 15', href: 'https://shreyadixit.org/shreya-innovation-lab/', img: 'site/img/projects/eyeda-heatmap.jpg', meta: 'Nonprofit · detection device', film: true },
  ];

  // ---------------------------------------------------------------------------------------------- the list
  // A copy of the Build film's index ("Stints"): its header with the Year / Field sort, the by-year timeline (one
  // square per project; hovering a row lights its square and the reverse), and the rows (number, thumbnail, name
  // with its chips, the one-liner, year and field). The styles are the film's, scoped to .stints.
  const CSS = `
.stints .bd-sh { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding-bottom: 7px; border-bottom: 1px solid var(--ink); font-size: 12px; line-height: 15px; }
.stints .bd-sh .m { color: #555; }
.stints .bd-sh > span:first-child { color: #555; text-transform: uppercase; letter-spacing: .06em; } /* eyebrow: STINTS · 18 PROJECTS */
.stints .bd-sh.is-flash { animation: bd-flash 1s ease; }
@keyframes bd-flash { 0%, 40% { color: var(--accent); border-color: var(--accent); } 100% { color: var(--ink); border-color: var(--ink); } }
.stints .bd-sort { display: inline-flex; gap: 10px; color: #555; }
.stints .bd-sort button { font-size: 12px; line-height: 15px; color: #555; transition: color .15s ease; }
.stints .bd-sort button:hover { color: var(--accent); }
.stints .bd-sort button.is-on { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
.stints .bd-tl { display: block; width: 100%; height: 74px; margin: 12px 0 4px; overflow: visible; }
.stints .bd-tl text { font-family: var(--mono); font-size: 11px; fill: #555; letter-spacing: .02em; }
.stints .bd-tl text.c { font-size: 12px; fill: var(--ink); }
.stints .bd-tl text.hn { font-size: 12px; fill: #555; }
.stints .bd-tl .mk .sq { fill: var(--bg); stroke: var(--ink); stroke-width: 1; transition: fill .15s ease, stroke .15s ease; }
.stints .bd-tl .mk .hit { fill: transparent; }
.stints .bd-tl .mk.is-lit .sq { fill: var(--accent); stroke: var(--accent); }
.stints .bd-tl .sp { stroke: var(--g400); stroke-width: 1; stroke-dasharray: 2 2; transition: stroke .15s ease; }
.stints .bd-tl .mk.is-lit .sp { stroke: var(--accent); stroke-dasharray: none; }
.stints .bd-list { position: relative; }
.stints .bd-row { position: relative; display: grid; grid-template-columns: 22px 58px minmax(0, 1fr) auto; column-gap: 12px; align-items: start; padding: 8px 0 9px;
  border-bottom: 1px solid var(--g200); text-decoration: none; color: var(--ink); }
.stints .bd-row .no { padding-top: 4px; font-size: 11px; line-height: 14px; color: var(--g500); font-variant-numeric: tabular-nums; }
.stints .bd-row .th { position: relative; display: block; width: 58px; height: 40px; margin-top: 1px; padding: 2px; border: 1px solid var(--g300); background: var(--bg); transition: border-color .15s ease; }
.stints .bd-row .th img { display: block; width: 100%; height: 100%; object-fit: cover; background: var(--g100); }
.stints .bd-row:hover .th, .stints .bd-row.is-lit .th, .stints .bd-row:focus-visible .th { border-color: var(--accent); }
.stints .bd-row .n { display: block; font-family: var(--serif); font-size: 17px; line-height: 21px; letter-spacing: 0; transition: color .15s ease; }
.stints .bd-row .n em { font-style: normal; font-family: var(--mono); font-size: 12px; letter-spacing: .02em; color: #555; margin-left: 8px; }
.stints .bd-row .n .sc { font-family: var(--mono); font-size: 12px; letter-spacing: .02em; color: var(--accent); margin-left: 8px; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color .15s ease; }
.stints .bd-row .n .sc:hover { border-color: var(--accent); }
.stints .bd-row .o { display: block; margin-top: 3px; font-size: 12px; line-height: 16px; color: #555; }
.stints .bd-gh { padding: 16px 0 6px; border-bottom: 1px solid var(--g300); font-size: 12px; line-height: 15px; color: #555; letter-spacing: .06em; animation: bd-in .35s ease both; }
@keyframes bd-in { from { opacity: 0; } to { opacity: 1; } }
.stints .bd-row .yr { padding-top: 4px; text-align: right; font-size: 12px; line-height: 15px; color: var(--ink); font-variant-numeric: tabular-nums; }
.stints .bd-row .yr span { display: block; color: #555; }
.stints .bd-row::before { content: ''; position: absolute; left: -14px; top: 18px; width: 8px; height: 1px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease); }
.stints .bd-row:hover .n, .stints .bd-row.is-lit .n, .stints .bd-row:focus-visible .n { color: var(--accent); }
.stints .bd-row:hover::before, .stints .bd-row.is-lit::before { transform: scaleX(1); }
.stints .bd-row:focus-visible { outline: none; }
.stints .bd-sort button { background: none; border: 0; padding: 0; cursor: pointer; font-family: var(--mono); }
`;

  // Thumbnails cropped to the part worth seeing (px of the file): Arbor's left panel, Option Glass's answer panel,
  // and the biped's face looking down at the robot in his hands
  const CROP = { arbor: [0, 0, 634, 750], 'option-glass': [255, 85, 690, 580], biped: [128, 172, 380, 264] };
  // a page of this site that shows the project: its scene key ([n]) or, for a page without one, a word
  const SCENE = { lpwm: 'lpwm', 'rectified-lpjepa': 'lpjepa', skywindfarm: 'skywindfarm', biped: 'robot', 'radial-vcreg': 'radial-vcreg' };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // the film's toy sparse code (LpWM has no image: its thumbnail is this, drawn)
  const CODE = (() => {
    const r = rng(11), D = 24, T = 8, v = [];
    const idx = shuffle([...Array(D).keys()], r), c0 = new Array(D);
    idx.forEach((d, k) => { const m = 0.45 + Math.abs(gauss(r)) * 0.8; c0[d] = k < 11 ? m : -m; });
    v.push(c0);
    for (let c = 1; c < T; c++) v.push(v[c - 1].map(x => 0.7 * x + 0.62 * gauss(r)));
    return { D, T, v };
  })();
  const ACCENT = '#1432F5', SERIF = "'Newsreader', Georgia, serif", MONO = "'Geist Mono', ui-monospace, monospace";
  function genCanvas(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    draw(g, w, h); return c;
  }
  const genCode = () => genCanvas(600, 375, g => {
    const { D, T, v } = CODE, cs = 21, x0 = 48, y0 = 176;
    for (let c = 0; c < T; c++) for (let d = 0; d < D; d++) {
      const val = v[c][d], cx = x0 + d * cs, cy = y0 + c * cs;
      if (val <= 0) { g.fillStyle = '#bbb'; g.fillRect(cx - 3, cy, 7, 1); g.fillRect(cx, cy - 3, 1, 7); }
      else { const s = Math.max(3, Math.min(10, val * 8)); g.fillStyle = ACCENT; g.globalAlpha = c === T - 1 ? 1 : 0.5 + c * 0.06; g.fillRect(cx - s / 2, cy - s / 2, s, s); g.globalAlpha = 1; }
    }
    g.fillStyle = '#000'; g.font = '30px ' + MONO; g.fillText('sparse latent rollout', 36, 66);
    g.fillStyle = '#444'; g.font = '26px ' + MONO; g.fillText('toy · illustrative', 36, 112);
  });
  // a project without an image: the + grid with its initial
  const genGlyph = p => genCanvas(174, 120, (g, w, h) => {
    for (let x = 14; x < w; x += 20) for (let y = 14; y < h; y += 20) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
    g.fillStyle = '#fff'; g.fillRect(16, 38, 74, 64);
    g.fillStyle = ACCENT; g.fillRect(w - 32, 20, 10, 10);
    g.fillStyle = '#000'; g.font = '400 56px ' + SERIF; g.fillText(p.name[0], 24, 92);
  });
  const toURL = c => { try { return c.toDataURL('image/png'); } catch (e) { return null; } };
  // an <img> source cropped to CROP once the file has loaded (cb gets the data URL)
  function cropped(src, box, cb) {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = box[2]; c.height = box[3];
        c.getContext('2d').drawImage(im, box[0], box[1], box[2], box[3], 0, 0, box[2], box[3]);
        cb(c.toDataURL('image/jpeg', 0.88));
      } catch (e) { cb(src); }
    };
    im.onerror = () => cb(src);
    im.src = src;
  }
  function ui(name) { const a = Site.audio; try { if (a && a.ui && typeof a.ui[name] === 'function') a.ui[name](); } catch (e) {} }

  Site.renderStints = function (el) {
    if (!el) return;
    const H = Site.h;
    if (!document.getElementById('stints-css')) document.head.append(H('style', { id: 'stints-css', text: CSS }));
    const PROJECTS = Site.STINTS, FIELDS = Site.STINT_FIELDS, TOUCH = !!(window.matchMedia && matchMedia('(hover: none)').matches);
    const pad2 = n => String(n).padStart(2, '0');
    const scenes = typeof Site.scenes === 'function' ? Site.scenes() : [];
    el.textContent = '';
    el.classList.add('stints');

    const sortY = H('button', { type: 'button', class: 'is-on', text: 'Year' });
    const sortF = H('button', { type: 'button', text: 'Field' });
    el.append(H('div', { class: 'bd-sh' }, H('span', { text: `STINTS · ${PROJECTS.length} projects` }), H('span', { class: 'bd-sort' }, 'Sort', sortY, sortF)));

    // the timeline: each project one small square in its start year's stack (two columns, bottom up), the year's count above
    const SVGNS = 'http://www.w3.org/2000/svg';
    const S = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const tl = S('svg', { class: 'bd-tl', 'aria-hidden': 'true' });
    const Y0 = Math.min(...PROJECTS.map(p => p.y0)), Y1 = Math.max(...PROJECTS.map(p => p.y1 || p.y0));
    const X = y => (6 + ((y - Y0) / Math.max(1, Y1 - Y0)) * 88).toFixed(2) + '%';
    const byYear = {};
    PROJECTS.forEach(p => { (byYear[p.y0] = byYear[p.y0] || []).push(p); });
    const SQ = 6, PITCH = 9, maxN = Math.max(...Object.values(byYear).map(a => a.length)), rowsN = Math.ceil(maxN / 2);
    const axisY = 22 + rowsN * PITCH + 6;
    tl.setAttribute('height', String(axisY + 18)); tl.style.height = (axisY + 18) + 'px';
    const hintT = S('text', { class: 'hn', x: '0', y: '11' }); hintT.textContent = TOUCH ? 'by year' : 'by year · hover a row'; tl.append(hintT);
    tl.append(S('line', { x1: '0%', x2: '100%', y1: String(axisY + 0.5), y2: String(axisY + 0.5), stroke: '#000', 'stroke-width': '1' }));
    for (let y = Y0; y <= Y1; y++) {
      tl.append(S('line', { x1: X(y), x2: X(y), y1: String(axisY), y2: String(axisY + 4), stroke: '#000', 'stroke-width': '1' }));
      const tx = S('text', { x: X(y), y: String(axisY + 16), 'text-anchor': 'middle' }); tx.textContent = String(y); tl.append(tx);
      const n = (byYear[y] || []).length;
      if (n) {
        const top = axisY - 4 - Math.ceil(n / 2) * PITCH;
        const s = S('svg', { x: X(y), y: String(top - 5), overflow: 'visible' });
        const c = S('text', { class: 'c', x: '0', y: '0', 'text-anchor': 'middle' }); c.textContent = String(n); s.append(c); tl.append(s);
      }
    }
    const markers = {};
    Object.keys(byYear).forEach(y => {
      byYear[y].forEach((p, k) => {
        const col = k % 2, row = Math.floor(k / 2), cx = col ? 1 : -1 - SQ, cy = axisY - 4 - (row + 1) * PITCH + (PITCH - SQ);
        const g = S('g', { class: 'mk' });
        const s = S('svg', { x: X(+y), y: '0', overflow: 'visible' });
        s.append(S('rect', { class: 'sq', x: String(cx + 0.5), y: String(cy + 0.5), width: String(SQ), height: String(SQ) }));
        s.append(S('rect', { class: 'hit', x: String(cx - 1.5), y: String(cy - 1.5), width: String(SQ + 4), height: String(SQ + 4) }));
        g.append(s);
        const tt = S('title', {}); tt.textContent = `${p.name} · ${p.year}`; g.append(tt);
        markers[p.id] = g; tl.append(g);
      });
    });
    el.append(tl);

    const list = H('div', { class: 'bd-list' });
    el.append(list);
    const rows = {};
    function chip(text, title, go) {
      const c = H('span', { class: 'sc', text, title, role: 'link' });
      c.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ui('select'); go(); });
      c.addEventListener('pointerenter', () => ui('hover'));
      return c;
    }
    PROJECTS.forEach((p, i) => {
      const ext = p.href && /^https?:/.test(p.href);
      const th = H('span', { class: 'th', 'aria-hidden': 'true' });
      const src = p.thumb || p.img || null;
      const im = H('img', { alt: '', loading: 'lazy', decoding: 'async' });
      if (src && CROP[p.id]) cropped(src, CROP[p.id], u => { im.src = u; });
      else if (src) im.src = src;
      else { const u = toURL(p.gen === 'code' ? genCode() : genGlyph(p)); if (u) im.src = u; }
      th.append(im);
      const sc = SCENE[p.id], def = sc && scenes.find(d => d.id === sc);
      const sChip = def ? chip(`[${def.hidden ? (p.id === 'radial-vcreg' ? 'demo' : def.title.toLowerCase()) : def.n}]`,
        def.hidden ? `The ${p.name} page: an interactive demo` : `Scene [${def.n}]: ${def.title}`, () => { location.href = 'index.html#' + def.id; }) : null;
      const vChip = p.video ? chip('▶ video', `${p.name}: watch the video`, () => window.open(p.video, '_blank', 'noopener')) : null;
      const r = H(p.href ? 'a' : 'div', { class: 'bd-row', href: p.href || null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, tabindex: p.href ? null : '0' },
        H('span', { class: 'no', text: pad2(i + 1) }), th,
        H('span', { class: 'nm' }, H('span', { class: 'n' }, p.name, p.arch ? H('em', { text: 'archived' }) : null, sChip, vChip),
          H('span', { class: 'o', text: p.idx || p.one })),
        H('span', { class: 'yr' }, p.year, H('span', { text: p.field })));
      r.dataset.id = p.id;
      rows[p.id] = r; list.append(r);
      // a row lights its square on the timeline, and a square its row
      const lit = on => { if (markers[p.id]) markers[p.id].classList.toggle('is-lit', on); };
      r.addEventListener('pointerenter', () => { lit(true); ui('hover'); });
      r.addEventListener('pointerleave', () => lit(false));
      r.addEventListener('focus', () => lit(true)); r.addEventListener('blur', () => lit(false));
      r.addEventListener('click', () => ui('select'));
      const mk = markers[p.id];
      if (mk) {
        mk.addEventListener('pointerenter', () => { r.classList.add('is-lit'); mk.classList.add('is-lit'); ui('hover'); });
        mk.addEventListener('pointerleave', () => { r.classList.remove('is-lit'); mk.classList.remove('is-lit'); });
      }
    });

    // sort (FLIP)
    function sortBy(kind) {
      sortY.classList.toggle('is-on', kind === 'year'); sortF.classList.toggle('is-on', kind === 'field');
      const before = {}; Object.values(rows).forEach(r => { before[r.dataset.id] = r.offsetTop; });
      const ord = PROJECTS.slice();
      if (kind === 'field') ord.sort((a, b) => FIELDS.indexOf(a.field) - FIELDS.indexOf(b.field) || b.y0 - a.y0);
      list.querySelectorAll('.bd-gh').forEach(n => n.remove());
      let fPrev = null;
      ord.forEach((p, i) => {
        if (kind === 'field' && p.field !== fPrev) { // group headers: "RESEARCH · 4"
          fPrev = p.field;
          list.append(H('div', { class: 'bd-gh', text: `${p.field.toUpperCase()} · ${ord.filter(q => q.field === p.field).length}` }));
        }
        rows[p.id].querySelector('.no').textContent = pad2(i + 1); list.append(rows[p.id]);
      });
      Object.values(rows).forEach(r => {
        const d = before[r.dataset.id] - r.offsetTop;
        if (!d) return;
        r.style.transition = 'none'; r.style.transform = `translateY(${d}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'; r.style.transform = ''; }));
      });
      ui('select');
    }
    sortY.addEventListener('click', () => sortBy('year'));
    sortF.addEventListener('click', () => sortBy('field'));
    [sortY, sortF].forEach(b => b.addEventListener('pointerenter', () => ui('hover')));
  };
})();
