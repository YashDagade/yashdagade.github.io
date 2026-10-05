/* Stints: the project catalog, and its list on the About page (/me).
 *
 * The one source of the projects. The About page lists them beside its text (Site.renderStints); the Build film
 * (the hidden /build) reads the same rows for its montage, hover cards and index. Adding a project = one row here:
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

  // the list's thumbnail focus for images whose subject is off-centre (the list crops them to 58 × 40)
  const FOCUS = { arbor: '0% 56%', 'option-glass': '55% 35%', biped: '50% 52%' };
  // a page of this site that shows the project: its scene key ([n]) or, for a page without one, a word
  const SCENE = { lpwm: 'lpwm', 'rectified-lpjepa': 'lpjepa', skywindfarm: 'skywindfarm', biped: 'robot', 'radial-vcreg': 'radial-vcreg' };

  // Render the list into el: a header (STINTS · n projects), then one row per project (number, thumbnail, name
  // with its chips, the one-line description, year and field). A row with a link opens it; the chips open the
  // project's scene on the home page, or its video.
  Site.renderStints = function (el) {
    if (!el) return;
    const h = Site.h || ((tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
      kids.flat().forEach(c => c != null && e.append(c));
      return e;
    });
    const scenes = typeof Site.scenes === 'function' ? Site.scenes() : [];
    const P = Site.STINTS;
    el.textContent = '';
    el.append(h('div', { class: 'st-head' }, h('span', null, `Stints · ${P.length} projects`)));
    const list = h('div', { class: 'st-list' });
    P.forEach((p, i) => {
      const ext = p.href && /^https?:/.test(p.href);
      const src = p.thumb || p.img || null;
      const th = h('span', { class: 'st-th', 'aria-hidden': 'true' });
      if (src) {
        const im = h('img', { src, alt: '', loading: 'lazy', decoding: 'async' });
        if (FOCUS[p.id]) im.style.objectPosition = FOCUS[p.id];
        th.append(im);
      } else th.append(h('span', { class: 'st-gen' + (p.gen === 'code' ? ' st-gen--code' : '') }, p.gen === 'code' ? '' : p.name[0]));
      const chips = [];
      const sc = SCENE[p.id], def = sc && scenes.find(d => d.id === sc);
      if (def) {
        const label = def.hidden ? (p.id === 'radial-vcreg' ? 'demo' : def.title.toLowerCase()) : String(def.n);
        const c = h('span', { class: 'st-chip', role: 'link', title: `Open ${def.title} on the home page` }, `[${label}]`);
        c.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); location.href = 'index.html#' + def.id; });
        chips.push(c);
      }
      if (p.video) {
        const v = h('span', { class: 'st-chip', role: 'link', title: `${p.name}: watch the video` }, '▶ video');
        v.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); window.open(p.video, '_blank', 'noopener'); });
        chips.push(v);
      }
      const row = h(p.href ? 'a' : 'div', { class: 'st-row', href: p.href || null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null },
        h('span', { class: 'st-no' }, String(i + 1).padStart(2, '0')), th,
        h('span', { class: 'st-nm' },
          h('span', { class: 'st-n' }, p.name, p.arch ? h('em', null, 'archived') : null, ...chips),
          h('span', { class: 'st-o' }, p.idx || p.one)),
        h('span', { class: 'st-yr' }, p.year, h('span', null, p.field)));
      if (!p.href) row.setAttribute('tabindex', '0');
      list.append(row);
    });
    el.append(list);
  };
})();
