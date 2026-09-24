/* Scene 5 — Build: "Here's to the builders".
 *
 * Film mode: a 44-bar, 118 BPM music video of Yash's build poem. Lines type on with a block cursor on
 * the 16th-note grid, emphasized phrases ink to deep blue, and hairline vignettes of scenes 1–4
 * (sparse latent rollout, rectified histogram, radial burst, turbines in the sky), Paradigm-film hex
 * dumps / node grids and project photos cut in on the beat.
 * Settled mode: the full poem in serif with hoverable phrases (real project images), an index of every
 * project (hover → image, click → link), socials and friends' sites.
 *
 * The soundtrack lives in build-score.js (window.Site.BuildScore). This file owns the visual timeline
 * (a seconds counter, slaved to the score's audio clock while it plays) and the scene's own microsound.
 * Data (poem, catalog, hover map, links, timeline) comes from the scene-5 brief (projects.md).
 */
(function () {
  'use strict';

  /* ================================================================== timing */
  const BPM = 118, BEAT = 60 / BPM, BAR = 4 * BEAT, S16 = BEAT / 4, BARS = 44, DUR = BARS * BAR; // 89.49 s
  const lb = (bar, beat = 1, s = 0) => (bar - 1) * BAR + (beat - 1) * BEAT + s * S16;
  const SETTLE_AT = lb(44, 3); // bar 44 beat 3: the frame dissolves into the interactive poem

  const SECTIONS = [
    { name: 'Cold open', bar: 1, ref: 'stanza 01' },
    { name: 'Roll call', bar: 5, ref: 'stanza 01' },
    { name: 'Question everything', bar: 9, ref: 'stanza 02' },
    { name: 'Laws of physics', bar: 13, ref: 'stanza 03' },
    { name: 'First principles', bar: 17, ref: 'stanza 04' },
    { name: 'Will power', bar: 21, ref: 'stanza 05' },
    { name: 'No limits', bar: 25, ref: 'stanzas 06–07' },
    { name: 'High bar for quality', bar: 29, ref: 'stanzas 08–10' },
    { name: 'Yearn to build', bar: 33, ref: 'stanzas 11–12' },
    { name: 'The same life', bar: 37, ref: 'stanzas 14, 16–17' },
    { name: 'Change things', bar: 41, ref: 'stanzas 18–19 · closing' },
  ];
  SECTIONS.forEach((s, i) => { s.t0 = (s.bar - 1) * BAR; s.t1 = i + 1 < SECTIONS.length ? (SECTIONS[i + 1].bar - 1) * BAR : DUR; });
  const STEPS = [
    { label: 'Builders', bar: 1 }, { label: 'Question', bar: 9 }, { label: 'First principles', bar: 17 },
    { label: 'Will power', bar: 21 }, { label: 'Yearn to build', bar: 33 }, { label: 'Change things', bar: 37 },
  ];

  /* ================================================================== poem (exact text, build.html) */
  // Display typography only: straight quotes become curly quotes. Spelling is kept as written.
  const Q = s => s.replace(/"([^"]*)"/g, '“$1”').replace(/'/g, '’');
  const E = s => ({ em: s });
  function segs(id, ...parts) {
    const a = parts.map(p => (typeof p === 'string' ? { text: Q(p), em: false } : { text: Q(p.em), em: true }));
    a.id = id;
    a.n = a.reduce((k, g) => k + g.text.length, 0);
    return a;
  }
  const RAW = [
    [["Here's to the ", E('builders'), '.'],
      ['The ', E('misfits'), '. The ', E('rebels'), '. The ', E('troublemakers'), '.'],
      ['The ', E('round pegs in the square holes'), '.'],
      ['The ones who see ', E('things differently'), '.']],
    [['They are driven by "why" and not afraid to ', E('question everything'), '.'],
      ['They strive to see the beauty in math and physics.']],
    [['They know that the only laws of this universe are the ', E('laws of physics'), '.'],
      ["They're not fond of rules or bureaucracy."],
      ['And they have no respect for the status quo.']],
    [['They reason from ', E('first principles'), ' and are ', E('non-mimetic'), ' in their wants.'],
      ["The fact that something hasn't been done before bears no reason to them for why it can't be done."]],
    [['They are daring enough to think they can ', E('change the world'), " and don't need time, money or resources to do so."],
      ['They operate purely on their ', E('will power'), '.']],
    [['If they want to do something they will find a way to get it done.'],
      ['They push themselves to their limits to discover that they have ', E('no limits'), '.']],
    [["They often move in silence and don't care to see their names in the press."],
      ["Sometimes they are misunderstood, but that doesn't bother them as long as humanity would be grateful for what they build."]],
    [['They build for the sake of building; they often differentiate for the sake of it.']],
    [['They have a ', E('high bar for quality'), "; and don't really care for external validation."]],
    [['They are skittish about mediocrity and pine for ', E('excellence'), '.'],
      ['They have strong loosely held beliefs and change their minds swiftly in light of evidence.']],
    [["They don't trust things easily, and they ", E('build before they search'), '.'],
      ['They take things in their own hands and are curious about everything. ', E('And they yearn to build'), '.']],
    [['They are known by many names in their communities: The creative spirits. The underdogs. The resolute. The determined. The indefatigable. The outsiders. The defiant. The independent thinkers. The fighters and the true believers.']],
    [['And they come from many different generations, places, religions, cultures and ages.']],
    [['But intrinsically they all are living ', E('the same life'), '.']],
    [['Whilst the rest of humanity may be rationalizing everything happening around them, they have a rational for everything they do.']],
    [['Whilst the rest of humanity relentlessly competes to capture the most value;'],
      ['they ', E('race unrelentingly toward creating value'), '.']],
    [['You can quote them, disagree with them,'],
      ['glorify or vilify them.'],
      ["About the only thing you can't do is ", E('ignore them'), '.']],
    [['Because they ', E('change things'), '.']],
    [['They push the human race forward.']],
  ];
  const RAW_CLOSING = [['While some may call them the crazy ones'],
    ['we know that the people who are crazy enough to think they can change the world,'],
    ['are the ones who do!']];
  const ATTRIBUTION = 'Inspired by Think Different, Apple; Ethos of Sequoia; Against the Odds, James Dyson, and many other builders';

  const POEM = RAW.map((st, si) => st.map((ln, li) => segs(`p${si}.${li}`, ...ln)));
  const CLOSING = RAW_CLOSING.map((ln, li) => segs(`c${li}`, ...ln));
  const L = (si, li) => POEM[si][li];
  // first n characters of a line, as its own segs (used for clauses the film shows on their own)
  function clip(sg, n, id) {
    const out = []; let k = 0;
    for (const g of sg) { if (k >= n) break; const take = g.text.slice(0, n - k); out.push({ text: take, em: g.em }); k += take.length; }
    out.id = id; out.n = k; return out;
  }
  const NAMES = RAW[11][0][0].split(': ')[1].split(/(?<=\.)\s+/).map(Q);

  /* ================================================================== projects (brief §b, verified) */
  const IMG = {
    yash: 'site/img/yash.jpg',
    connectu: 'site/img/projects/connectu.jpg', eyeda: 'site/img/projects/eyeda-heatmap.jpg',
    hermes: 'site/img/projects/hermes.jpg', idw: 'site/img/projects/idontwannadie.jpg',
    lpjepa: 'site/img/projects/lpjepa.jpg', radial: 'site/img/projects/radialvcreg.jpg',
    cp: 'site/img/projects/skywindfarm-cp.jpg',
    cfd: 'site/img/swf/cfd-velocity-contour.jpg', render: 'site/img/swf/energy-unit-render.jpg',
    poster: 'site/img/swf/isef-poster.jpg', flight: 'site/img/swf/prototype-flight.jpg',
    tethered: 'site/img/swf/prototype-tethered.jpg', system: 'site/img/swf/system-diagram.jpg',
    sky: 'site/img/swf/units-in-sky.jpg', tunnel: 'site/img/swf/wind-tunnel-setup.jpg',
  };
  const FIELDS = ['Research', 'Energy', 'Safety', 'Products', 'Experiments'];
  const PROJECTS = [
    { id: 'lpwm', name: 'LpWM', year: '2026', y0: 2026, field: 'Research', one: 'Sparse JEPA world model: sparsity lowers the predictor size needed to plan', href: 'https://arxiv.org/abs/2608.22764', gen: 'code', meta: 'arXiv 2026 · sparse beats dense by up to 57% on PushT' },
    { id: 'rectified-lpjepa', name: 'Rectified LpJEPA', year: '2026', y0: 2026, field: 'Research', one: 'JEPA pretraining on sparse, maximum-entropy representations', href: 'https://arxiv.org/abs/2602.01456', img: IMG.lpjepa, meta: 'ICML 2026' },
    { id: 'hermes', name: 'Hermes', year: '2026', y0: 2026, field: 'Products', one: 'Chrome extension that reads articles aloud with live word highlighting, 0.75–4×', href: 'https://github.com/YashDagade/browser-reader', img: IMG.hermes, meta: 'Chrome extension · GitHub' },
    { id: 'biped', name: 'Biped', year: '2026', y0: 2026, field: 'Experiments', one: 'Robotics build log, in progress', href: 'biped/', gen: 'title', meta: 'Build log · Notion' },
    { id: 'central-america-drift', name: 'Central America Drift', year: '2026', y0: 2026, field: 'Experiments', one: 'JS rigid-body sim of Central America rifting apart into islands', href: 'https://github.com/YashDagade/central_america_drift', gen: 'title', meta: 'Simulation · GitHub' },
    { id: 'radial-vcreg', name: 'Radial-VCReg', year: '2025', y0: 2025, field: 'Research', one: 'VCReg + radial Gaussianization: pushes feature norms toward the χ distribution', href: 'https://arxiv.org/abs/2602.14272', img: IMG.radial, meta: "NeurIPS '25 workshops", w: 291 },
    { id: 'connectu', name: 'ConnectU', year: '2025', y0: 2025, field: 'Products', one: 'Mentor–mentee matching via the Hungarian algorithm over embedding similarity', href: null, img: IMG.connectu, meta: 'Matching platform' },
    { id: 'goedel', name: 'Goedel-Prover-V2, enhanced', year: '2025', y0: 2025, field: 'Experiments', one: 'Fork of Goedel-Prover-V2 with domain hints + disciplined self-correction', href: 'https://github.com/YashDagade/godel-prover-v2-enhanced', gen: 'title', meta: 'Lean · LLM · GitHub' },
    { id: 'idontwannadie', name: 'idontwannadie.lol', year: '2024', y0: 2024, field: 'Safety', one: 'Safer-route maps built on 3.1M+ Minnesota crash records; PennApps XXV winner', href: 'https://idontwannadie.lol/', img: IMG.idw, meta: 'PennApps XXV' },
    { id: 'skywindfarm', name: 'SkyWindFarm', year: '2022–24', y0: 2022, y1: 2024, field: 'Energy', one: 'Airborne wind energy: helium-lifted VAWT clusters that harvest high-altitude wind', href: 'https://isef.net/project/egsd018-skywindfarm', img: IMG.flight, meta: 'ISEF 2023 + 2024 · patent application' },
    { id: 'eyeda', name: 'EyeDa', year: '2022', y0: 2022, field: 'Safety', one: 'Distracted-driving nonprofit + real-time detection device; led a 15-person team', href: 'https://shreyadixit.org/shreya-innovation-lab/', img: IMG.eyeda, meta: 'KARE11 · CBS · Star Tribune' },
  ];

  const SOCIALS = [
    { label: 'X', href: 'https://x.com/YashDagad' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yashdagade/' },
    { label: 'Email', href: 'mailto:me@yashdagade.com' },
    { label: 'GitHub', href: 'https://github.com/YashDagade' },
    { label: 'Scholar', href: 'https://scholar.google.com/citations?user=o56NnCkAAAAJ&hl=en' },
    { label: 'Resume', href: 'tex/main.pdf' },
  ];
  const FRIENDS = [
    { name: 'Marco', label: 'Marco →', href: 'https://marcoschonert.com/' },
    { name: 'Pranav', label: 'Pranav →', href: 'https://pranavponnusamy.com/' },
    { name: 'Brian', label: '← Brian', href: 'https://briankmason.com/' },
    { name: 'Max', label: '← Max', href: 'https://www.maxxiong.dev/' },
  ];
  const PRESS = ['KARE11', 'CBS', 'Star Tribune', 'Fox 9', 'UMN ME', 'Duke Today'];

  // Hover map for the settled poem (brief §d). mode: card | pair | mosaic | text | jump | flip | friends
  const HOVER = {
    'builders': { mode: 'flip', srcs: [IMG.eyeda, IMG.sky, IMG.flight, IMG.idw, IMG.connectu, IMG.radial, IMG.lpjepa, IMG.hermes], title: 'Things I’ve built', meta: '2022 → 2026 · hover any blue phrase' },
    'misfits': { mode: 'card', src: IMG.yash, title: 'Yash Dagade', meta: 'B.S. Math + Philosophy, Duke ’28 · research at NYU CILVR', w: 220 },
    'rebels': { mode: 'card', gen: 'code', title: 'LpWM — a case for sparse world models', meta: 'Sparse beats dense by up to 57% on PushT planning', href: 'https://arxiv.org/abs/2608.22764', proj: ['lpwm'] },
    'troublemakers': { mode: 'card', src: IMG.idw, title: 'idontwannadie.lol', meta: 'Google Maps, but optimized for safety · PennApps XXV', href: 'https://idontwannadie.lol/', proj: ['idontwannadie'] },
    'round pegs in the square holes': { mode: 'card', src: IMG.radial, title: 'Radial-VCReg', meta: 'Feature norms pushed toward a χ distribution · NeurIPS ’25 wkshp', href: 'https://arxiv.org/abs/2602.14272', proj: ['radial-vcreg'], w: 260 },
    'things differently': { mode: 'card', src: IMG.lpjepa, title: 'Rectified LpJEPA', meta: 'Same data, projected at θ = 0°, 45°, 90°, 135° · ICML 2026', href: 'https://lpjepa.com', proj: ['rectified-lpjepa'], w: 280 },
    'question everything': { mode: 'card', src: IMG.sky, title: 'SkyWindFarm', meta: 'Why keep turbines on the ground? VAWT clusters in high-altitude wind', href: 'https://isef.net/project/egsd018-skywindfarm', proj: ['skywindfarm'] },
    'laws of physics': { mode: 'pair', srcs: [IMG.cfd, IMG.cp], title: 'SkyWindFarm — CFD velocity contours', meta: 'RANS, SST k–ω · cluster Cp 0.47 at tip-speed ratio 3.0', href: 'assets/swf.pdf', proj: ['skywindfarm'] },
    'first principles': { mode: 'card', src: IMG.system, title: 'SkyWindFarm — from first principles', meta: 'Flotation · stability · energy · power transfer · ground', href: 'https://youtu.be/gDUk6V607js', proj: ['skywindfarm'] },
    'non-mimetic': { mode: 'card', src: IMG.flight, title: 'SkyWindFarm — flying prototype', meta: 'First-author inventor · US 2025/0243843 A1', href: 'https://youtu.be/Z6k2j59-ubo', proj: ['skywindfarm'] },
    'change the world': { mode: 'jump', proj: ['eyeda', 'idontwannadie'], cards: [
      { src: IMG.eyeda, title: 'EyeDa', meta: 'Distracted-driving nonprofit · KARE11, CBS, Star Tribune', href: 'https://shreyadixit.org/shreya-innovation-lab/' },
      { src: IMG.idw, title: 'idontwannadie.lol', meta: 'Safer routes from 3.1M+ MN crash records', href: 'https://idontwannadie.lol/' }] },
    'will power': { mode: 'jump', proj: ['connectu'], cards: [
      { src: IMG.connectu, title: 'ConnectU', meta: 'Mentor matching: Hungarian algorithm over embeddings', href: null }] },
    'no limits': { mode: 'card', src: IMG.tethered, title: 'SkyWindFarm — prototype aloft', meta: '6-DoF sim: rejects harsh disturbances in ~7 s', href: 'https://youtu.be/Z6k2j59-ubo', proj: ['skywindfarm'] },
    'high bar for quality': { mode: 'pair', srcs: [IMG.tunnel, IMG.cp], title: 'SkyWindFarm — wind-tunnel validation', meta: 'Wind tunnel vs CFD: correlation > 0.95', href: 'assets/swf.pdf', proj: ['skywindfarm'] },
    'excellence': { mode: 'card', src: IMG.poster, title: 'ISEF 2023 + 2024', meta: 'Third Award ’23 · 3rd Grand Award + $10K Ricoh prize ’24', href: 'press.html', proj: ['skywindfarm'] },
    'build before they search': { mode: 'card', src: IMG.hermes, title: 'Hermes', meta: 'Built my own article reader · word-synced voice, 0.75–4×', href: 'https://github.com/YashDagade/browser-reader', proj: ['hermes'] },
    'And they yearn to build': { mode: 'text', title: 'Now building', meta: 'World models for robots (CILVR, Pantheon) · Biped build log', lines: ['World models for robots', 'NYU CILVR · Pantheon', 'Biped build log'], href: 'biped/', proj: ['lpwm', 'biped'] },
    'the same life': { mode: 'friends', title: 'Fellow builders', meta: 'Marco → Pranav → ← Brian ← Max' },
    'race unrelentingly toward creating value': { mode: 'pair', srcs: [IMG.render, IMG.lpjepa], title: 'Energy × intelligence', meta: '‘The defining problems of our generation’', proj: ['skywindfarm', 'rectified-lpjepa'] },
    'ignore them': { mode: 'text', title: 'Press', meta: 'KARE11 · CBS · Star Tribune · Fox 9 · UMN ME · Duke Today', lines: PRESS, href: 'press.html' },
    'change things': { mode: 'mosaic', srcs: [IMG.flight, IMG.lpjepa, IMG.radial, IMG.eyeda, IMG.idw, IMG.connectu, IMG.hermes, IMG.cfd, IMG.yash], title: 'So far', meta: '3 papers · 1 patent application · ISEF ’23 + ’24 · 1 nonprofit' },
  };

  /* ================================================================== film script (timing only) */
  // A typed line: { segs, at (local s), rate (chars per 16th) | slam | stops | parts, ink:[per-span overrides] }
  function spec(sg, o) {
    const s = Object.assign({ segs: sg, n: sg.n }, o);
    if (s.end != null && !s.rate) s.rate = Math.max(1, Math.ceil(s.n / Math.max(1, Math.round((s.end - s.at) / S16))));
    return s;
  }
  const SP = {
    s0: spec(L(0, 0), { at: lb(2), rate: 1, ink: [lb(3, 3)] }),
    s1a: spec(L(0, 1), { stops: [[lb(1, 1), 12], [lb(1, 3), 24], [lb(2, 1), 43]], ink: [lb(1, 1), lb(1, 3), lb(2, 1)] }),
    s1b: spec(L(0, 2), { at: lb(3), rate: 3 }),
    s1c: spec(L(0, 3), { at: lb(4), rate: 4 }),
    s2a: spec(L(1, 0), { at: lb(1), rate: 2 }),
    s2b: spec(L(1, 1), { at: lb(3), rate: 3 }),
    s3a: spec(L(2, 0), { at: lb(1), rate: 3 }),
    s3b: spec(L(2, 1), { at: lb(3), rate: 4 }),
    s3c: spec(L(2, 2), { at: lb(4), slam: true }),
    s4a: spec(L(3, 0), { parts: [{ at: lb(1), from: 0, upto: 33, rate: 3 }, { at: lb(2), from: 33, upto: 69, rate: 3 }] }),
    s4b: spec(L(3, 1), { at: lb(3), rate: 4 }),
    s5a: spec(L(4, 0), { at: lb(1), rate: 4 }),
    s5b: spec(L(4, 1), { at: lb(4), rate: 4 }),
    s6a: spec(L(5, 0), { at: lb(1), rate: 4 }),
    s6b: spec(L(5, 1), { at: lb(2), end: lb(3), ink: [lb(3)] }),
    s6c: spec(L(6, 0), { at: lb(4), rate: 6 }),
    s7a: spec(clip(L(7, 0), 36, 'p7.0a'), { at: lb(1), rate: 3 }),
    s7b: spec(clip(L(8, 0), 33, 'p8.0a'), { at: lb(2), rate: 4 }),
    s7c: spec(L(9, 0), { at: lb(3), end: lb(4), ink: [lb(4)] }),
    s8b: spec(clip(L(10, 1), 70, 'p10.1a'), { at: lb(2, 3), slam: true }),
    s8c: spec(segs('yearn', E('And they yearn to build'), '.'), { at: lb(3), rate: 2 }),
    s9a: spec(L(13, 0), { at: lb(1), rate: 4 }),
    s9b: spec(L(15, 1), { at: lb(2), slam: true }),
    s9c: [segs('q0', 'You can quote them,'), segs('q1', 'disagree with them,'), segs('q2', 'glorify'), segs('q3', 'or vilify them.')]
      .map((sg, i) => spec(sg, { at: lb(3, i + 1), slam: true })),
    s9d: spec(L(16, 2), { at: lb(4), rate: 4 }),
    s10a: spec(L(17, 0), { at: lb(1), slam: true }),
    s10b: spec(L(18, 0), { at: lb(2), slam: true }),
    s10c: spec(CLOSING[0], { at: lb(3), rate: 6 }),
    s10d: spec(CLOSING[1], { at: lb(3, 3), rate: 10 }),
    s10e: spec(CLOSING[2], { at: lb(4), slam: true }),
  };
  // The Hermes shot (bar 33): words of [10,0] are read aloud one per 8th.
  const HERMES_WORDS = (() => {
    const out = []; let c = 0;
    const txt = L(10, 0).map(g => g.text).join('');
    txt.split(/(\s+)/).forEach(p => { if (p && !/^\s/.test(p)) out.push({ c0: c, c1: c + p.length }); c += p.length; });
    return out;
  })();
  const NAME_T = NAMES.map((_, k) => (k < 6 ? lb(4, 1) + k * BEAT / 2 : lb(4, 4) + (k - 6) * S16));
  const GLITCHES = [[lb(9), 0.5], [lb(13), 0.45], [lb(16, 2), 0.8], [lb(17), 1], [lb(21), 1], [lb(29), 0.5], [lb(33), 0.7], [lb(37), 0.8], [lb(41), 1]];

  /* ================================================================== small pure helpers */
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const eOut = x => 1 - Math.pow(1 - clamp01(x), 3);
  const eIn = x => Math.pow(clamp01(x), 3);
  const eIO = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eExp = x => { x = clamp01(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const pad2 = n => String(n).padStart(2, '0');
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + pad2(s % 60); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function crc32(bytes) { let c, crc = 0xFFFFFFFF; for (let n = 0; n < bytes.length; n++) { c = (crc ^ bytes[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }

  // Toy data for the vignettes (seeded; labelled "illustrative" on screen)
  const CODE = (() => { // LpWM: 24-dim latent, 8 steps; column t has exactly 11 active dims (≈ half, as in the paper)
    const r = rng(11), D = 24, T = 8, v = [];
    const idx = shuffle([...Array(D).keys()], r), c0 = new Array(D);
    idx.forEach((d, k) => { const m = 0.45 + Math.abs(gauss(r)) * 0.8; c0[d] = k < 11 ? m : -m; });
    v.push(c0);
    for (let c = 1; c < T; c++) v.push(v[c - 1].map(x => 0.7 * x + 0.62 * gauss(r)));
    return { D, T, v, active: v.map(col => col.filter(x => x > 0).length) };
  })();
  const RAD = (() => { // Radial-VCReg: β₂ = 0 → every norm on the unit circle (8 short arcs); then χ₂ quantile shells
    const r = rng(7), N = 720, S = 24, per = N / S, pts = [];
    const perm = shuffle([...Array(N).keys()], r);
    for (let i = 0; i < N; i++) {
      const rank = perm[i], shell = Math.floor(rank / per), k = rank % per, q = (shell + 0.5) / S;
      pts.push({
        a0: Math.floor(r() * 8) * Math.PI / 4 + Math.PI / 8 + (r() - 0.5) * 0.3,
        a1: (k / per) * Math.PI * 2 + shell * 0.37 + (r() - 0.5) * 0.08,
        shell, rad: Math.sqrt(-2 * Math.log(1 - q)),
      });
    }
    return { N, S, pts };
  })();
  const HIST = (() => { const r = rng(23), xs = []; for (let i = 0; i < 420; i++) xs.push(Math.max(-2.97, Math.min(2.97, gauss(r)))); return { N: xs.length, xs }; })();
  const CLOUD = (() => { const r = rng(5), p = []; for (let i = 0; i < 240; i++) { const a = gauss(r) * 1.0, b = gauss(r) * 0.36, c = Math.cos(0.5), s = Math.sin(0.5); p.push([a * c - b * s, a * s + b * c]); } return p; })();
  const SCATTER = (() => { const r = rng(31), p = []; for (let i = 0; i < 16; i++) { const x = 0.12 + 0.76 * (i / 15) + (r() - 0.5) * 0.05; p.push({ x, j: (r() - 0.5) * 0.5, e: (r() - 0.5) * 0.045 }); } return p; })();
  const HEX = (() => {
    const raw = RAW[2].map(l => l.map(p => (typeof p === 'string' ? p : p.em)).join('')).join(' ');
    const bytes = Array.from(new TextEncoder().encode(raw));
    const rows = []; for (let i = 0; i < bytes.length; i += 16) rows.push(bytes.slice(i, i + 16));
    const sq = raw.indexOf('status quo');
    const all = Array.from(new TextEncoder().encode(RAW.map(st => st.map(l => l.map(p => (typeof p === 'string' ? p : p.em)).join('')).join(' ')).join(' ')));
    return { raw, bytes, rows, sq: [sq, sq + 10], crc: crc32(bytes).toString(16).padStart(8, '0'), all };
  })();
  const hex2 = b => b.toString(16).padStart(2, '0');

  /* ================================================================== captions + css */
  const CAP_FILM = 'Here’s to the builders: my build\nmanifesto, set to 118 BPM, with every\nproject I’ve built so far.';
  const CAP_SET = 'Here’s to the builders. Hover a blue\nphrase to see what I built; the index\nlists every project.';

  const CSS = `
.scene--build .bd-film { transition: opacity .7s ease; }
.scene--build.is-settled .bd-film { opacity: 0; }
.scene--build .bd-set { position: absolute; top: 64px; bottom: 72px; left: 280px; right: 150px; padding-left: 40px; overflow-x: hidden; overflow-y: auto;
  opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .5s ease, visibility 0s linear .5s;
  scrollbar-width: none; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 34px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 34px), transparent 100%); }
.scene--build .bd-set::-webkit-scrollbar { display: none; }
.scene--build.is-settled .bd-set { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .9s ease .1s, visibility 0s; }
.scene--build .bd-grid { display: grid; grid-template-columns: minmax(0, 1fr); max-width: 560px; row-gap: 56px; padding: 34px 0 90px; }
.scene--build .bd-kick { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 10px; line-height: 12.5px; color: var(--g600); margin: 0 0 22px; }
.scene--build .bd-kick b { font-weight: 400; color: var(--ink); }
.scene--build .bd-btn { font-size: 10px; line-height: 12.5px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--g400); transition: color .15s ease, border-color .15s ease; }
.scene--build .bd-btn:hover { color: var(--accent); border-color: var(--accent); }
.scene--build .bd-st { position: relative; margin: 0 0 15px; font-family: var(--serif); font-size: 17px; line-height: 25px; letter-spacing: 0; color: var(--ink); }
.scene--build .bd-st p { margin: 0; }
.scene--build .bd-st--open { font-size: 27px; line-height: 32px; letter-spacing: -.012em; margin-bottom: 24px; }
.scene--build .bd-sn { position: absolute; left: -34px; top: 7px; font-family: var(--mono); font-size: 10px; line-height: 12.5px; letter-spacing: .02em; color: var(--g400); transition: color .2s ease; }
.scene--build .bd-st--open .bd-sn { top: 11px; }
.scene--build .bd-st:hover .bd-sn { color: var(--ink); }
.scene--build .bd-close p { font-style: italic; }
.scene--build .bd-em { color: var(--accent); cursor: crosshair; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px;
  text-decoration-color: rgba(20, 50, 245, .32); border-radius: 1px; transition: background-color .15s ease, text-decoration-color .15s ease; outline: none; }
.scene--build .bd-em:hover, .scene--build .bd-em.is-lit, .scene--build .bd-em:focus-visible { background: var(--accent-soft); text-decoration-color: var(--accent); }
.scene--build .bd-cur { display: inline-block; width: .42em; height: .74em; margin-left: 4px; vertical-align: -.04em; background: var(--ink); animation: bd-blink 1.017s steps(2, jump-none) infinite; }
@keyframes bd-blink { 0% { opacity: 1; } 100% { opacity: 0; } }
.scene--build .bd-attr { margin-top: 26px; max-width: 400px; font-size: 10px; line-height: 12.5px; color: var(--g600); }
.scene--build .bd-poem > .bd-st, .scene--build .bd-poem > .bd-attr, .scene--build .bd-side > *, .scene--build .bd-tail > * { opacity: 0; transform: translateY(5px); }
.scene--build.is-settled .bd-poem > .bd-st, .scene--build.is-settled .bd-poem > .bd-attr, .scene--build.is-settled .bd-side > *, .scene--build.is-settled .bd-tail > * {
  opacity: 1; transform: none; transition: opacity .7s ease var(--d, 0s), transform .7s var(--ease) var(--d, 0s); }
.scene--build .bd-side { font-size: 12px; line-height: 15px; }
.scene--build .bd-sh { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding-bottom: 7px; border-bottom: 1px solid var(--ink); font-size: 10px; line-height: 12.5px; }
.scene--build .bd-sh .m { color: var(--g600); }
.scene--build .bd-sh.is-flash { animation: bd-flash 1s ease; }
@keyframes bd-flash { 0%, 40% { color: var(--accent); border-color: var(--accent); } 100% { color: var(--ink); border-color: var(--ink); } }
.scene--build .bd-sort { display: inline-flex; gap: 10px; color: var(--g500); }
.scene--build .bd-sort button { font-size: 10px; line-height: 12.5px; color: var(--g500); transition: color .15s ease; }
.scene--build .bd-sort button:hover { color: var(--accent); }
.scene--build .bd-sort button.is-on { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
.scene--build .bd-tl { display: block; width: 100%; height: 66px; margin: 12px 0 2px; overflow: visible; }
.scene--build .bd-tl text { font-family: var(--mono); font-size: 10px; fill: var(--g600); }
.scene--build .bd-tl .mk path { stroke: var(--ink); stroke-width: 1; fill: none; transition: stroke .15s ease; }
.scene--build .bd-tl .mk rect { fill: transparent; }
.scene--build .bd-tl .mk.is-lit path { stroke: var(--accent); stroke-width: 1.6; }
.scene--build .bd-tl .mk.is-lit .ld { stroke: var(--accent); opacity: 1; }
.scene--build .bd-tl .ld { stroke-dasharray: 2 2; opacity: 0; transition: opacity .15s ease; }
.scene--build .bd-list { position: relative; }
.scene--build .bd-row { position: relative; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; column-gap: 10px; align-items: start; padding: 7px 0 8px;
  border-bottom: 1px solid var(--g200); text-decoration: none; color: var(--ink); }
.scene--build .bd-row .no { padding-top: 4px; font-size: 10px; line-height: 12.5px; color: var(--g500); font-variant-numeric: tabular-nums; }
.scene--build .bd-row .n { display: block; font-family: var(--serif); font-size: 16px; line-height: 19px; letter-spacing: 0; transition: color .15s ease; }
.scene--build .bd-row .n i { font-style: normal; font-family: var(--mono); font-size: 10px; color: var(--g500); margin-left: 6px; }
.scene--build .bd-row .o { display: block; margin-top: 3px; font-size: 10px; line-height: 12.5px; color: var(--g600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scene--build .bd-row .yr { padding-top: 4px; text-align: right; font-size: 10px; line-height: 12.5px; color: var(--ink); font-variant-numeric: tabular-nums; }
.scene--build .bd-row .yr span { display: block; color: var(--g500); }
.scene--build .bd-row::before { content: ''; position: absolute; left: -14px; top: 18px; width: 8px; height: 1px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease); }
.scene--build .bd-row:hover .n, .scene--build .bd-row.is-lit .n, .scene--build .bd-row:focus-visible .n { color: var(--accent); }
.scene--build .bd-row:hover::before, .scene--build .bd-row.is-lit::before { transform: scaleX(1); }
.scene--build .bd-row:focus-visible { outline: none; }
.scene--build .bd-else { margin-top: 0; }
.scene--build .bd-links { display: flex; flex-wrap: wrap; gap: 8px 16px; padding-top: 10px; }
.scene--build .bd-links a { color: var(--ink); text-decoration: none; }
.scene--build .bd-links a span { border-bottom: 1px solid var(--g400); transition: color .15s ease, border-color .15s ease; }
.scene--build .bd-links a:hover span { color: var(--accent); border-color: var(--accent); }
.scene--build .bd-links--sub { padding-top: 6px; font-size: 10px; line-height: 12.5px; }
.scene--build .bd-fr { margin-top: 30px; }
.scene--build .bd-fr .h { font-size: 10px; line-height: 12.5px; color: var(--g600); letter-spacing: .04em; }
.scene--build .bd-fr .bd-links { gap: 8px 22px; }
.scene--build .bd-jl { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.scene--build .bd-jl svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.scene--build .bd-jl .ld { fill: none; stroke: var(--ink); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0; transition: opacity .12s linear; }
.scene--build .bd-jl .an { fill: var(--accent); opacity: 0; transition: opacity .12s linear; }
.scene--build .bd-jl .is-in { opacity: 1; }
.scene--build .bd-jc { position: absolute; left: 0; top: 0; display: block; background: var(--bg); box-shadow: 0 0 0 8px var(--bg); color: var(--ink); text-decoration: none; pointer-events: auto;
  opacity: 0; transform: scale(.92); transform-origin: 0 50%; transition: opacity .12s linear, transform .12s var(--ease); }
.scene--build .bd-jc.is-in { opacity: 1; transform: none; }
.scene--build .bd-jc .fr { position: relative; display: block; border: 1px solid var(--ink); padding: 4px; background: var(--bg); transition: border-color .15s ease; }
.scene--build .bd-jc .fr::before, .scene--build .bd-jc .fr::after { content: '+'; position: absolute; font-size: 12px; line-height: 12px; color: var(--accent); }
.scene--build .bd-jc .fr::before { left: -4px; top: -7px; }
.scene--build .bd-jc .fr::after { right: -4px; bottom: -6px; }
.scene--build .bd-jc .im { position: relative; display: block; background: var(--g100); overflow: hidden; }
.scene--build .bd-jc .im img { display: block; width: 100%; height: 100%; object-fit: cover; }
.scene--build .bd-jc .im img + img { position: absolute; inset: 0; visibility: hidden; }
.scene--build .bd-jc .im img.on { visibility: visible; }
.scene--build .bd-jc .tx { display: block; padding: 7px 8px 6px; font-family: var(--serif); font-size: 17px; line-height: 20px; letter-spacing: 0; }
.scene--build .bd-jc .mt { display: flex; justify-content: space-between; gap: 10px; padding-top: 6px; font-size: 10px; line-height: 12.5px; }
.scene--build .bd-jc .mt .m { color: var(--g600); text-align: right; }
.scene--build a.bd-jc:hover .fr { border-color: var(--accent); }
.scene--build a.bd-jc:hover .tx, .scene--build a.bd-jc:hover .mt .t { color: var(--accent); }
@media (min-width: 1200px) {
  .scene--build .bd-grid { grid-template-columns: minmax(340px, 480px) minmax(300px, 410px); column-gap: clamp(48px, 5vw, 84px); max-width: none; }
  .scene--build .bd-poem { grid-column: 1; grid-row: 1; }
  .scene--build .bd-side { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
  .scene--build .bd-tail { grid-column: 1; grid-row: 2; }
  .scene--build .bd-side.is-sticky { position: sticky; top: 28px; }
}
@media (max-width: 800px) {
  .scene--build .bd-set { left: 0; right: 0; padding: 0 16px; bottom: 104px; }
  .scene--build .bd-kick { margin-bottom: 16px; }
  .scene--build .bd-grid { padding-top: 22px; row-gap: 44px; }
  .scene--build .bd-sn { position: static; display: block; margin-bottom: 2px; }
  .scene--build .bd-st { font-size: 16px; line-height: 24px; }
  .scene--build .bd-st--open { font-size: 23px; line-height: 28px; }
  .scene--build .bd-row::before { display: none; }
}
@media (prefers-reduced-motion: reduce) { .scene--build .bd-cur { animation: none; } }
`;

  /* ================================================================== scene */
  Site.register({
    id: 'build', n: 5, title: 'Build', path: '/build',
    caption: CAP_FILM,
    create(el, api) {
      const C = api.colors, FN = api.fonts, H = Site.h;
      const AU = () => api.audio || (window.Site && window.Site.audio) || null;
      el.append(H('style', { text: CSS }));

      /* ---------------------------------------------------------- images */
      const imgs = {};
      function img(src) {
        if (!src) return null;
        let im = imgs[src];
        if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; imgs[src] = im; }
        return im;
      }
      Object.values(IMG).forEach(img);
      const ready = im => im && im.complete && im.naturalWidth > 0;
      const loaded = im => new Promise(res => { if (!im) return res(); if (im.complete) return res(); im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); });

      /* ---------------------------------------------------------- canvas + text engine */
      const cv = api.canvas(el);
      cv.canvas.classList.add('bd-film');
      const ctx = cv.ctx;
      const mcache = new Map(), lcache = new Map();
      function resetText() { mcache.clear(); lcache.clear(); }
      if (document.fonts) {
        document.fonts.ready.then(resetText);
        try { document.fonts.addEventListener('loadingdone', resetText); } catch (e) { /* old Safari */ }
      }
      const monoF = (sz, w) => `${w || 400} ${sz}px ${FN.mono}`;
      const serifF = (sz, it) => `${it ? 'italic ' : ''}400 ${sz}px ${FN.serif}`;
      function mw(font, s) {
        const k = font + '\u0001' + s;
        let v = mcache.get(k);
        if (v === undefined) { ctx.font = font; v = ctx.measureText(s).width; mcache.set(k, v); }
        return v;
      }
      function lay(sg, font, size, maxW, lhf) {
        const key = sg.id + '|' + font + '|' + Math.round(maxW) + '|' + (lhf || 0);
        let Lo = lcache.get(key);
        if (Lo) return Lo;
        const toks = []; let c = 0, si = -1;
        for (const g of sg) {
          if (g.em) si++;
          for (const p of g.text.split(/(\s+)/)) { if (!p) continue; toks.push({ s: p, em: g.em, span: g.em ? si : -1, c0: c, sp: /^\s/.test(p), x: 0, y: 0, w: 0 }); c += p.length; }
        }
        const lh = size * (lhf || 1.17), spW = mw(font, ' ');
        let x = 0, y = 0, W = 0;
        for (let i = 0; i < toks.length;) {
          const t = toks[i];
          if (t.sp) { t.x = x; t.y = y; t.w = spW * t.s.length; if (x > 0) x += t.w; else t.hide = true; i++; continue; }
          let j = i, gw = 0;
          while (j < toks.length && !toks[j].sp) { toks[j].w = mw(font, toks[j].s); gw += toks[j].w; j++; }
          if (x > 0 && x + gw > maxW) {
            const prev = toks[i - 1];
            if (prev && prev.sp && !prev.hide) { prev.hide = true; x -= prev.w; }
            W = Math.max(W, x); x = 0; y += lh;
          }
          for (let k = i; k < j; k++) { toks[k].x = x; toks[k].y = y; x += toks[k].w; }
          i = j;
        }
        W = Math.max(W, x);
        const spans = [];
        for (const t of toks) {
          if (t.span < 0 || t.hide) continue;
          const S = spans[t.span] || (spans[t.span] = { c0: t.c0, c1: t.c0 + t.s.length, rects: [] });
          S.c1 = Math.max(S.c1, t.c0 + t.s.length);
          let r = S.rects.find(q => q.y === t.y);
          if (!r) S.rects.push(r = { x0: t.x, x1: t.x + t.w, y: t.y });
          else { r.x0 = Math.min(r.x0, t.x); r.x1 = Math.max(r.x1, t.x + t.w); }
        }
        Lo = { toks, n: c, spans, w: W, h: y + lh, lh, size, font, last: y };
        lcache.set(key, Lo);
        return Lo;
      }
      function visAt(s, lt) {
        if (s.slam) return lt >= s.at ? s.n : 0;
        if (s.stops) { let v = 0; for (const [at, upto] of s.stops) if (lt >= at) v = upto; return v; }
        if (s.parts) {
          let v = 0;
          for (const p of s.parts) { if (lt < p.at) break; v = Math.min(p.upto, p.from + (Math.floor((lt - p.at) / S16 + 1e-6) + 1) * p.rate); }
          return v;
        }
        if (lt < s.at) return 0;
        return Math.min(s.n, (Math.floor((lt - s.at) / S16 + 1e-6) + 1) * s.rate);
      }
      function charTime(s, c) {
        if (s.slam) return s.at;
        if (s.stops) { for (const [at, upto] of s.stops) if (c < upto) return at; return Infinity; }
        if (s.parts) { for (const p of s.parts) if (c < p.upto) return p.at + Math.max(0, Math.ceil((c + 1 - p.from) / p.rate) - 1) * S16; return Infinity; }
        return s.at + Math.max(0, Math.ceil((c + 1) / s.rate) - 1) * S16;
      }
      const doneAt = s => charTime(s, s.n - 1);

      // Draw a typed line (x, y = first baseline). Returns layout, cursor position and bottom.
      function typed(s, lt, x, y, size, maxW, o) {
        o = o || {};
        const font = o.mono ? monoF(size) : serifF(size, o.italic);
        const Lo = lay(s.segs, font, size, maxW, o.lhf);
        const vis = o.vis != null ? o.vis : visAt(s, lt);
        const res = { L: Lo, vis, cx: x, cy: y, done: vis >= s.n, bottom: y + Lo.last + size * 0.3, x, y, s };
        if (vis <= 0) return res;
        const dim = o.dimAt != null && lt >= o.dimAt;
        const base = dim ? (o.dimColor || C.g400) : (o.color || C.ink);
        ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.fillStyle = base;
        let last = null;
        for (const t of Lo.toks) {
          if (t.c0 >= vis) break;
          last = t;
          if (t.sp) continue;
          const k = Math.min(t.s.length, vis - t.c0), str = k === t.s.length ? t.s : t.s.slice(0, k);
          if (o.halo) { ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = C.bg; ctx.strokeText(str, x + t.x, y + t.y); ctx.fillStyle = base; }
          ctx.fillText(str, x + t.x, y + t.y);
        }
        if (last) {
          const k = Math.min(last.s.length, vis - last.c0);
          if (last.sp) {
            if (last.hide) { res.cx = x; res.cy = y + last.y + Lo.lh; } else { res.cx = x + last.x + last.w * (k / last.s.length); res.cy = y + last.y; }
          } else { res.cx = x + last.x + (k === last.s.length ? last.w : mw(font, last.s.slice(0, k))); res.cy = y + last.y; }
        }
        if (o.noInk) return res;
        Lo.spans.forEach((S, i) => {
          if (vis < S.c1) return;
          const ti = s.ink && s.ink[i] != null ? s.ink[i] : charTime(s, S.c1 - 1);
          const u = lt - ti;
          if (u < 0) return;
          const p = eOut(u / (S16 * 2)), q = eOut(u / BEAT);
          for (const r of S.rects) {
            const rw = r.x1 - r.x0;
            ctx.save();
            ctx.beginPath(); ctx.rect(x + r.x0 - 1, y + r.y - size, rw * p + 2, size * 1.32); ctx.clip();
            ctx.fillStyle = o.bg || C.bg; ctx.fillRect(x + r.x0 - 1, y + r.y - size, rw + 2, size * 1.32);
            ctx.fillStyle = C.accent; ctx.font = font;
            for (const t of Lo.toks) if (t.span === i && !t.sp && t.y === r.y) ctx.fillText(t.s, x + t.x, y + t.y);
            ctx.restore();
            if (!o.noUnder) { ctx.fillStyle = C.accent; ctx.fillRect(x + r.x0, Math.round(y + r.y + size * 0.16), rw * q, 1); }
          }
          if (!o.noUnder && q >= 1 && o.tag && o.tag[i]) {
            const r = S.rects[S.rects.length - 1];
            const after = Lo.toks.filter(z => z.y === r.y && !z.sp && z.c0 >= S.c1);
            if (after.every(z => /^[.,;:!?]+$/.test(z.s))) {
              const xe = after.reduce((m, z) => Math.max(m, z.x + z.w), r.x1);
              label(o.tag[i], x + xe + Math.max(10, size * 0.3), y + r.y - size * 0.26, { color: C.accent });
            }
          }
        });
        return res;
      }
      function spanRect(res, i) { // absolute rect of span i's last line
        const S = res.L.spans[i];
        if (!S) return null;
        const r = S.rects[S.rects.length - 1];
        return { x0: res.x + r.x0, x1: res.x + r.x1, y: res.y + r.y, size: res.L.size };
      }
      function cursor(x, y, size, solid, t) {
        if (!solid && ((t / BEAT) % 1) >= 0.5) return;
        const w = Math.max(5, size * 0.44), hh = size * 0.72;
        ctx.fillStyle = C.ink;
        ctx.fillRect(Math.round(x + size * 0.07), Math.round(y - hh), Math.round(w), Math.round(hh + Math.max(1, size * 0.05)));
      }

      /* ---------------------------------------------------------- drawing primitives */
      function label(s, x, y, o) {
        o = o || {};
        ctx.font = monoF(o.size || 10, o.w);
        ctx.fillStyle = o.color || C.ink;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(s, x, y);
        ctx.textAlign = 'left';
      }
      function seg(x1, y1, x2, y2, col, dash, lw) {
        ctx.strokeStyle = col || C.ink; ctx.lineWidth = lw || 1;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (dash) ctx.setLineDash([]);
      }
      function srect(x, y, w, h, col, dash) {
        ctx.strokeStyle = col || C.ink; ctx.lineWidth = 1;
        if (dash) ctx.setLineDash(dash);
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
        if (dash) ctx.setLineDash([]);
      }
      function plus(x, y, s, col) {
        s = s || 3.5; ctx.fillStyle = col || C.ink;
        const X = Math.round(x), Y = Math.round(y), S = Math.round(s);
        ctx.fillRect(X - S, Y, 2 * S + 1, 1); ctx.fillRect(X, Y - S, 1, 2 * S + 1);
      }
      function cross(x, y, s, col) { seg(x - s, y - s, x + s, y + s, col); seg(x - s, y + s, x + s, y - s, col); }
      function drawOn(pts, p, col, dash) { // polyline drawn to fraction p of its length
        if (p <= 0 || pts.length < 2) return;
        let len = 0; const L2 = [];
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L2.push(d); len += d; }
        let rem = len * clamp01(p);
        ctx.strokeStyle = col || C.ink; ctx.lineWidth = 1; if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length && rem > 0; i++) {
          const d = L2[i - 1], f = Math.min(1, rem / d);
          ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); rem -= d;
        }
        ctx.stroke(); if (dash) ctx.setLineDash([]);
      }
      function cover(im, x, y, w, h) {
        if (!ready(im)) { ctx.fillStyle = C.g100; ctx.fillRect(x, y, w, h); return; }
        const iw = im.naturalWidth, ih = im.naturalHeight, ir = iw / ih, r = w / h;
        let sw, sh, sx, sy;
        if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) / 2; }
        ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
      }
      const aspect = im => (ready(im) ? im.naturalWidth / im.naturalHeight : 1.6);
      // A photo in a hairline frame with + accents. o: { u (s since appear), wipe, pop, cap, dims, alpha }
      function photo(im, x, y, w, h, o) {
        o = o || {};
        const u = o.u == null ? 10 : o.u;
        ctx.save();
        if (o.pop) {
          const k = clamp01(u / 0.12), sc = 0.92 + 0.08 * k;
          ctx.globalAlpha *= k;
          ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2);
        }
        if (o.alpha != null) ctx.globalAlpha *= o.alpha;
        ctx.fillStyle = C.bg; ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
        const wp = o.wipe ? eOut(u / o.wipe) : 1;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h * wp); ctx.clip();
        if (o.draw) o.draw(x, y, w, h); else cover(im, x, y, w, h);
        ctx.restore();
        if (wp < 1) { ctx.fillStyle = C.accent; ctx.fillRect(x, y + h * wp, w, 1); }
        srect(x - 4, y - 4, w + 8, h + 8, C.ink);
        plus(x - 4, y - 4, 3, C.accent); plus(x + w + 4, y + h + 4, 3, C.accent);
        if (o.cap) {
          ctx.fillStyle = C.bg; ctx.fillRect(x - 4, y + h + 7, w + 8, 14);
          label(o.cap, x - 4, y + h + 17);
          if (o.dims && ready(im)) label(`${im.naturalWidth} × ${im.naturalHeight}`, x + w + 4, y + h + 17, { align: 'right', color: C.g500 });
        }
        ctx.restore();
      }
      // fit an image of aspect ar inside rect R (max fraction of stage width), centred
      function fit(ar, R, maxWf, cx, cy) {
        let w = Math.min(R.w, G.w * (maxWf || 0.4)), h = w / ar;
        if (h > R.h) { h = R.h; w = h * ar; }
        return { x: (cx != null ? cx : R.x + R.w / 2) - w / 2, y: (cy != null ? cy : R.y + R.h / 2) - h / 2, w, h };
      }
      function flashImg(key, lt, t0, dur, R, cap, o) {
        const u = lt - t0;
        if (u < 0 || u >= dur) return;
        const im = img(key), f = fit(aspect(im), R, (o && o.maxWf) || 0.4, o && o.cx, o && o.cy);
        photo(im, f.x, f.y, f.w, f.h, { u, wipe: S16 * 1.2, cap, dims: true });
      }
      function callout(ax, ay, lx, ly, text, sub, p, o) {
        if (p <= 0) return;
        o = o || {};
        ctx.save(); ctx.globalAlpha *= clamp01(p * 3);
        drawOn([[ax, ay], [lx, ly]], eOut(p), o.col || C.ink, [3, 3]);
        ctx.fillStyle = o.col || C.ink; ctx.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4);
        const right = o.align === 'right';
        label(text, lx + (right ? -4 : 4), ly - 3, { align: right ? 'right' : 'left', color: o.tcol || C.ink });
        if (sub) label(sub, lx + (right ? -4 : 4), ly + 10, { align: right ? 'right' : 'left', color: C.g500 });
        ctx.restore();
      }
      function nodeGrid(x0, y0, cols, rows, gap, fnCol) {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const col = fnCol ? fnCol(c, r) : C.g400;
          if (col) plus(x0 + c * gap, y0 + r * gap, 3.5, col);
        }
      }

      /* ---------------------------------------------------------- layout */
      let G = null;
      function relayout() {
        const w = cv.w, h = cv.h, mobile = w < 800;
        const F = mobile ? { x0: 16, y0: 108, x1: w - 16, y1: h - 196 } : { x0: Math.max(300, Math.min(360, w * 0.22)), y0: 104, x1: w - 150, y1: h - 98 };
        F.w = F.x1 - F.x0; F.h = F.y1 - F.y0;
        const k = mobile ? 1 : Math.max(0.78, Math.min(1.12, F.w / 970));
        const sz = mobile
          ? { XL: Math.min(34, w * 0.085), L: Math.min(28, w * 0.07), M: Math.min(24, w * 0.061), S: Math.min(19, w * 0.049) }
          : { XL: 58 * k, L: 44 * k, M: 34 * k, S: 25 * k };
        const TX = F.x0, TY = mobile ? F.y0 + sz.L : F.y0 + F.h * 0.2;
        const TW = mobile ? F.w : F.w * 0.56;
        const FIG = mobile ? { x: F.x0, y: F.y0 + F.h * 0.47, w: F.w, h: F.h * 0.53 } : { x: F.x0 + F.w * 0.61, y: F.y0 + 26, w: F.w * 0.39, h: F.h - 52 };
        const VR = mobile ? { x: F.x0, y: F.y0 + F.h * 0.3, w: F.w, h: F.h * 0.7 } : { x: F.x0, y: F.y0 + 96, w: F.w, h: F.h - 110 };
        G = { w, h, mobile, F, sz, TX, TY, TW, FIG, VR, cw: w, ch: h };
        STREAM = null;
      }

      /* ---------------------------------------------------------- vignettes */
      // V4 — SkyWindFarm: LTA units rise on tethers into high-altitude wind (illustrative)
      function drawUnit(x, y, s, t, i) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        ctx.fillStyle = C.bg;
        ctx.beginPath(); ctx.ellipse(x, y, 34 * s, 15 * s, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillRect(x - 28 * s, y + 2 * s, 56 * s, 22 * s);
        srect(x - 28 * s, y + 2 * s, 56 * s, 22 * s, C.ink);
        for (let k = 0; k < 4; k++) {
          const cx = x + (-21 + 14 * k) * s, dir = k % 2 ? -1 : 1, phi = t * 7 * dir + i + k;
          for (let b = 0; b < 3; b++) {
            const a = phi + b * 2.0944, bx = cx + 4.6 * s * Math.sin(a);
            seg(bx, y + 5 * s, bx, y + 21 * s, Math.cos(a) > 0 ? C.ink : C.g300);
          }
        }
      }
      function vTurb(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, s = Math.max(0.45, Math.min(R.w / 520, R.h / 360, mini ? 0.7 : 1.6));
        const gy = R.y + R.h * 0.88, p0 = eOut(lt / (BEAT * 0.9));
        const nL = mini ? 4 : 7;
        for (let i = 0; i < nL; i++) {
          const f = i / (nL - 1), y = R.y + R.h * (0.06 + f * 0.5), hi = f < 0.45;
          const p1 = eOut((lt - 0.1 - i * 0.05) / BEAT);
          if (p1 <= 0) continue;
          ctx.strokeStyle = hi ? C.accent : C.g400; ctx.lineWidth = 1;
          ctx.setLineDash([16 * s * (1.5 - f * 0.7), 9 * s]);
          ctx.lineDashOffset = -t * 70 * s * (1.7 - f);
          ctx.beginPath();
          const xe = R.x + R.w * p1;
          for (let x = R.x; x <= xe; x += 8) { const yy = y + Math.sin(x * 0.011 / s + i * 1.7 + t * 0.5) * 3 * s; if (x === R.x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
          ctx.stroke();
        }
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        seg(R.x, gy, R.x + R.w * p0, gy, C.ink);
        for (let x = R.x + 4; x < R.x + R.w * p0; x += 12) seg(x, gy + 1, x - 5, gy + 6, C.g300);
        const U = [{ fx: 0.27, fy: 0.36, d: 0 }, { fx: 0.53, fy: 0.2, d: 0.35 }, { fx: 0.79, fy: 0.42, d: 0.7 }];
        const units = [];
        U.forEach((u, i) => {
          const gx = R.x + R.w * u.fx;
          if (p0 > u.fx) srect(gx - 5 * s, gy - 6 * s, 10 * s, 6 * s, C.ink);
          const pr = eIO((lt - BEAT * (0.5 + u.d)) / (BEAT * 2.4));
          if (pr <= 0) return;
          const ux = gx + R.w * 0.035 * pr + Math.sin(t * 0.9 + i * 2) * 2 * s;
          const uy = lerp(gy - 30 * s, R.y + R.h * u.fy, pr) + Math.sin(t * 1.3 + i) * 1.5 * s;
          seg(gx, gy - 6 * s, ux, uy + 24 * s, C.g600, [3, 3]);
          drawUnit(ux, uy, s, t, i);
          units.push({ ux, uy, gx });
        });
        if (mini) return;
        // wind profile: speed grows with altitude (qualitative)
        const px = R.x + 2, pa = eOut((lt - BEAT) / BEAT);
        if (pa > 0) {
          seg(px, gy, px, R.y + R.h * 0.06, C.ink);
          for (let k = 0; k < 6; k++) {
            const f = k / 5, y = gy - 18 - f * (gy - 18 - R.y - R.h * 0.08), len = (10 + 58 * Math.pow(f, 0.6)) * s * pa;
            seg(px, y, px + len, y, C.ink); seg(px + len, y, px + len - 4, y - 3, C.ink); seg(px + len, y, px + len - 4, y + 3, C.ink);
          }
          label('v(h)', px + 4, R.y + R.h * 0.06 - 6, { color: C.g600 });
        }
        const cp = (lt - BEAT * 3.4) / (BEAT * 0.8), nw = R.w < 560;
        if (units[1] && !nw) callout(units[1].ux - 22 * s, units[1].uy - 11 * s, units[1].ux - 96 * s, units[1].uy - 52 * s, 'flotation shell · helium', null, cp, { align: 'right' });
        if (units[2]) callout(units[2].ux + 28 * s, units[2].uy + 14 * s, Math.min(R.x + R.w - 4, units[2].ux + 96 * s), units[2].uy + 78 * s, 'VAWT cluster', 'Cp 0.47 at TSR 3.0', cp - 0.25, { align: units[2].ux + 96 * s > R.x + R.w - 150 ? 'right' : 'left' });
        if (units[0] && !nw) callout(lerp(units[0].gx, units[0].ux, 0.5), lerp(gy, units[0].uy, 0.45), units[0].gx - 70 * s, lerp(gy, units[0].uy, 0.45) - 30 * s, 'tether', 'power to ground station', cp - 0.5, { align: 'right' });
        label('P / A = ½ ρ v³', R.x + R.w, R.y + 8, { align: 'right', color: C.g600 });
        if (!nw) label('wind power grows with the cube of speed', R.x + R.w, R.y + 21, { align: 'right', color: C.g500 });
      }

      // V1 — LpWM: dense latent → rectified sparse code → predictor rollout (toy). Rows = time, columns = dims.
      function vCode(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, { D, T, v, active } = CODE;
        const narrow = !mini && R.w < 560, padL = mini || narrow ? 0 : 150, padR = mini || narrow ? 0 : 150;
        const cs = Math.max(5, Math.min((R.w - padL - padR) / D, (R.h - (mini ? 8 : 90)) / T, mini ? 20 : 30));
        const gw = cs * D, gh = cs * T;
        const x0 = R.x + padL + (R.w - padL - padR - gw) / 2, y0 = R.y + (R.h - gh) / 2 + (mini ? 0 : 6);
        const snap = BEAT, dense = lt < snap, sk = eOut((lt - snap) / S16);
        const rowT = c => (c === 0 ? 0 : BEAT * (1 + c));
        let latest = 0;
        for (let c = 0; c < T; c++) if (lt >= rowT(c)) latest = c;
        const pl = Math.max(1.5, cs * 0.13);
        for (let c = 0; c < T; c++) {
          const shown = lt >= rowT(c);
          for (let d = 0; d < D; d++) {
            const cx = x0 + d * cs + cs / 2, cy = y0 + c * cs + cs / 2;
            if (!shown || (c === 0 && lt < d * BEAT / 40)) { plus(cx, cy, pl, C.g300); continue; }
            const val = v[c][d];
            if (c === 0 && (dense || (val <= 0 && sk < 1))) {
              const sz = Math.max(2, Math.min(cs - 4, Math.abs(val) * cs * 0.55)) * (val <= 0 ? 1 - sk : 1);
              ctx.fillStyle = dense ? C.g500 : (val > 0 ? C.accent : C.g400);
              if (sz > 0.5) ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
              if (!dense && val <= 0) plus(cx, cy, pl * sk, C.ink);
              continue;
            }
            if (val <= 0) { plus(cx, cy, pl, c === latest ? C.ink : C.g400); continue; }
            const sz = Math.max(3, Math.min(cs - 4, val * cs * 0.55));
            ctx.globalAlpha = c === latest ? 1 : 0.3 + 0.45 * (c / T);
            ctx.fillStyle = C.accent; ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
            ctx.globalAlpha = 1;
          }
          if (!mini && shown) {
            if (!narrow) label(c === 0 ? 't' : 't+' + c, x0 - 14, y0 + c * cs + cs / 2 + 3, { align: 'right', color: c === latest ? C.ink : C.g500 });
            if (!narrow && (c === latest || c === 0)) label(c === 0 && dense ? '24 / 24 non-zero' : `${active[c]} / 24 active`, x0 + gw + 14, y0 + c * cs + cs / 2 + 3, { color: c === latest && !dense ? C.accent : C.g500 });
          }
        }
        if (mini) return;
        // fresh row: a hairline bracket around the newest prediction
        if (!dense) { const fy = y0 + latest * cs; srect(x0 - 3, fy + 1, gw + 6, cs - 2, latest ? C.accent : C.g300, [2, 3]); }
        label(dense ? 'dense latent z_t · Gaussian target' : (narrow ? 'rectified: exact zeros (+)' : 'rectified: negative dims are exactly 0 (+)'), x0, y0 - 30, { color: dense ? C.ink : C.accent });
        label('z ∈ ℝ²⁴ · toy latent · illustrative', x0, y0 - 17, { color: C.g500 });
        if (narrow) {
          label(dense ? '24 / 24 non-zero' : `t+${latest} · ${active[latest]} / 24 active`, x0, y0 + gh + 16, { color: dense ? C.g600 : C.accent });
        } else if (lt > BEAT * 2) {
          const ax = x0 - 44, ay1 = y0 + cs / 2, ay2 = y0 + (latest + 0.5) * cs;
          seg(ax, ay1, ax, ay2, C.ink, [3, 3]); seg(ax, ay2, ax - 3, ay2 - 5, C.ink); seg(ax, ay2, ax + 3, ay2 - 5, C.ink);
          label('predictor', ax - 8, ay1 + 4, { align: 'right', color: C.g600 });
          label('rolls z forward', ax - 8, ay1 + 17, { align: 'right', color: C.g500 });
        }
        label(narrow ? 'LpWM · sparse beats dense by up to 57% (PushT)' : 'LpWM · sparse beats dense by up to 57% on PushT planning', x0, y0 + gh + (narrow ? 32 : 26), { color: C.ink });
      }

      // V3 — Radial-VCReg: β₂ = 0 collapses every norm onto one circle; the entropy term spreads them to χ₂
      function vRadial(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, burst = o.burst != null ? o.burst : BAR;
        const cx = R.x + R.w / 2, cy = R.y + R.h / 2 + (mini ? 6 : 0);
        const U = Math.min(R.w, R.h) * (mini ? 0.125 : 0.132);
        const ax = U * 3.3 * eOut(lt / BEAT);
        seg(cx - ax, cy, cx + ax, cy, C.g300); seg(cx, cy - ax, cx, cy + ax, C.g300);
        if (!mini) for (let k = -3; k <= 3; k++) if (k) { seg(cx + k * U, cy - 3, cx + k * U, cy + 3, C.g400); if (Math.abs(k) === 2) label(String(k), cx + k * U, cy + 15, { align: 'center', color: C.g500 }); }
        ctx.strokeStyle = C.g400; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(cx, cy, U, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        const after = lt >= burst;
        if (after && !mini) {
          const g = eOut((lt - burst - BEAT) / BEAT);
          if (g > 0) {
            ctx.globalAlpha = g; ctx.strokeStyle = C.g300; ctx.setLineDash([2, 4]);
            [1.1774, 2.4477].forEach(rq => { ctx.beginPath(); ctx.arc(cx, cy, rq * U, 0, Math.PI * 2); ctx.stroke(); });
            ctx.setLineDash([]);
            label('χ₂ 50%', cx + 1.1774 * U * 0.7071 + 4, cy - 1.1774 * U * 0.7071 - 4, { color: C.g500 });
            label('χ₂ 95%', cx + 2.4477 * U * 0.7071 + 4, cy - 2.4477 * U * 0.7071 - 4, { color: C.g500 });
            ctx.globalAlpha = 1;
          }
        }
        const pulse = !after ? Math.pow(1 - ((lt / BEAT) % 1), 4) * 0.035 : 0;
        const rot = t * 0.12, lit = [], radii = mini ? null : new Float32Array(RAD.N);
        const intro = eOut(lt / (BEAT * 0.8));
        ctx.fillStyle = C.ink;
        for (let i = 0; i < RAD.N; i++) {
          const p = RAD.pts[i];
          if (mini && i % 2) continue;
          const rel = burst + p.shell * S16 * 0.33, k = eExp((lt - rel) / 0.7);
          const a = lerp(p.a0 + rot, p.a1 + rot * 0.25, k), rr = lerp((1 + pulse) * intro, p.rad, k);
          if (radii) radii[i] = rr;
          const x = cx + Math.cos(a) * rr * U, y = cy + Math.sin(a) * rr * U;
          if (k > 0.02 && k < 0.97) lit.push(x, y); else ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
        ctx.fillStyle = C.accent;
        for (let i = 0; i < lit.length; i += 2) ctx.fillRect(lit[i] - 1, lit[i + 1] - 1, 2, 2);
        if (mini) return;
        const nw = R.w < 560;
        label(after ? (nw ? 'β₂ > 0 · ‖z‖ spreads toward χ₂' : 'β₂ > 0 · entropy term spreads ‖z‖ toward χ₂') : (nw ? 'β₂ = 0 · norms collapse to r = 1' : 'β₂ = 0 · all norms collapse onto r = 1'), R.x, R.y + 8, { color: after ? C.accent : C.ink });
        label('Radial-VCReg · 2-D toy · illustrative', R.x, R.y + 21, { color: C.g500 });
        // inset: histogram of radii vs the χ₂ pdf  r·exp(−r²/2)
        const iw = Math.min(170, R.w * 0.3), ih = 64, ix = R.x + R.w - iw, iy = R.y + R.h - ih - 8;
        const NB = 16, lo = 0, hi = 3.6, bw = (hi - lo) / NB, cnt = new Array(NB).fill(0);
        for (let i = 0; i < RAD.N; i++) { const b = Math.floor((radii[i] - lo) / bw); if (b >= 0 && b < NB) cnt[b]++; }
        const sc = ih / (RAD.N * bw * 0.62);
        for (let b = 0; b < NB; b++) {
          const hh = Math.min(ih + 20, cnt[b] * sc);
          if (hh > 0.5) srect(ix + b * iw / NB, iy + ih - hh, iw / NB - 2, hh, C.g600);
        }
        seg(ix, iy + ih + 0.5, ix + iw, iy + ih + 0.5, C.ink);
        ctx.strokeStyle = C.accent; ctx.beginPath();
        for (let k = 0; k <= 60; k++) { const r = lo + (hi - lo) * k / 60, y = iy + ih - RAD.N * bw * r * Math.exp(-r * r / 2) * sc; if (k) ctx.lineTo(ix + iw * k / 60, y); else ctx.moveTo(ix, y); }
        ctx.stroke();
        label('‖z‖', ix, iy + ih + 13, { color: C.g600 });
        label('χ₂ pdf', ix + iw, iy + ih + 13, { align: 'right', color: C.accent });
      }

      // V2 — Rectified LpJEPA: samples fill a Gaussian; ReLU sends the negative half to an exact spike at 0
      function vHist(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, fillEnd = o.fill || BAR, rt = o.rect != null ? o.rect : BAR;
        const NB = 30, lo = -3, hi = 3, bw = (hi - lo) / NB;
        const axY = R.y + R.h * (mini ? 0.86 : 0.8), W = R.w * (mini ? 0.86 : 0.78), x0 = R.x + (R.w - W) / 2;
        const X = v => x0 + ((v - lo) / (hi - lo)) * W;
        const unitH = (R.h * (mini ? 0.42 : 0.5)) / (HIST.N * bw * 0.3989);
        const n = Math.floor(HIST.N * clamp01(lt / fillEnd)), rk = eIO((lt - rt) / BEAT);
        const cnt = new Array(NB).fill(0); let spike = 0;
        for (let i = 0; i < n; i++) {
          const x = HIST.xs[i];
          if (x < 0 && rk >= 1) { spike++; continue; }
          const xp = x < 0 ? lerp(x, 0, rk) : x;
          const b = Math.min(NB - 1, Math.max(0, Math.floor((xp - lo) / bw)));
          cnt[b]++;
        }
        seg(x0 - 6, axY + 0.5, x0 + W + 6, axY + 0.5, C.ink);
        if (!mini) for (let k = -2; k <= 2; k++) { seg(X(k), axY, X(k), axY + 4, C.ink); label(String(k), X(k), axY + 16, { align: 'center', color: C.g600 }); }
        for (let b = 0; b < NB; b++) {
          if (!cnt[b]) continue;
          const hh = cnt[b] * unitH, bx = X(lo + b * bw);
          const neg = lo + b * bw < 0;
          ctx.fillStyle = neg && rk > 0 ? C.g200 : C.g100; ctx.fillRect(bx + 1, axY - hh, W / NB - 2, hh);
          srect(bx + 1, axY - hh, W / NB - 2, hh, neg && rk > 0 ? C.g400 : C.ink);
        }
        if (!mini) for (let i = Math.max(0, n - 14); i < n; i++) {
          const ta = (i / HIST.N) * fillEnd, f = (lt - ta) / 0.22;
          if (f >= 1) continue;
          const x = HIST.xs[i], b = Math.floor((x - lo) / bw), top = axY - cnt[Math.max(0, Math.min(NB - 1, b))] * unitH;
          ctx.fillStyle = C.accent; ctx.fillRect(X(x) - 1.5, lerp(top - 90, top, eIn(f)) - 1.5, 3, 3);
        }
        if (n > HIST.N * 0.35) {
          ctx.globalAlpha = eOut((n / HIST.N - 0.35) / 0.3);
          ctx.strokeStyle = rk > 0 ? C.g400 : C.g600; ctx.setLineDash([3, 3]); ctx.beginPath();
          for (let k = 0; k <= 80; k++) { const v = lo + (hi - lo) * k / 80, y = axY - HIST.N * bw * Math.exp(-v * v / 2) / 2.5066 * unitH; if (k) ctx.lineTo(X(v), y); else ctx.moveTo(X(v), y); }
          ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        if (rk > 0) {
          ctx.strokeStyle = C.accent; ctx.globalAlpha = rk; ctx.beginPath();
          for (let k = 0; k <= 40; k++) { const v = (hi * k) / 40, y = axY - HIST.N * bw * Math.exp(-v * v / 2) / 2.5066 * unitH; if (k) ctx.lineTo(X(v), y); else ctx.moveTo(X(v), y); }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (spike > 0) {
          const top = Math.max(R.y + (mini ? 16 : 34), axY - spike * unitH);
          ctx.fillStyle = C.accent; ctx.fillRect(X(0) - 1.5, top, 3, axY - top);
          if (top > axY - spike * unitH) { // axis break: the spike is taller than the frame
            ctx.fillStyle = C.bg; ctx.fillRect(X(0) - 5, top + 10, 10, 5);
            seg(X(0) - 6, top + 12, X(0) + 6, top + 8, C.accent); seg(X(0) - 6, top + 16, X(0) + 6, top + 12, C.accent);
          }
          if (!mini) {
            label(`spike at 0 · n = ${spike}`, X(0) + 10, top + 8, { color: C.accent });
            label(R.w < 560 ? 'P(x ≤ 0) = 0.5' : 'P(x ≤ 0) = 0.5 → exactly 0', X(0) + 10, top + 21, { color: C.g600 });
          }
        }
        if (mini) return;
        const nw = R.w < 560;
        label(rk > 0 ? (nw ? 'ReLU(x): spike at 0 + half-tail' : 'ReLU(x): Gaussian → spike at 0 + half-tail') : `samples ${n} / ${HIST.N}`, R.x, R.y + 8, { color: rk > 0 ? C.accent : C.ink });
        label(nw ? 'Rectified LpJEPA · illustrative' : 'Rectified LpJEPA · rectified Gaussian target · illustrative', R.x, R.y + 21, { color: C.g500 });
      }

      // potential flow past two rotors, ψ = U·y·(1 − R²/r²) superposed (illustrative)
      let STREAM = null;
      function streams(R) {
        if (STREAM && STREAM.key === R.x + ',' + R.y + ',' + R.w) return STREAM;
        const cyl = [{ x: R.x + R.w * 0.66, y: R.y + R.h * 0.42, r: Math.min(R.w, R.h) * 0.07 }, { x: R.x + R.w * 0.84, y: R.y + R.h * 0.62, r: Math.min(R.w, R.h) * 0.06 }];
        const vel = (x, y) => {
          let u = 1, v = 0;
          for (const c of cyl) { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy, R2 = c.r * c.r; if (r2 < R2 * 0.9) return null; u -= R2 * (dx * dx - dy * dy) / (r2 * r2); v -= 2 * R2 * dx * dy / (r2 * r2); }
          return [u, v];
        };
        const lines = [];
        for (let k = 0; k < 17; k++) {
          const y0 = R.y + (R.h * (k + 0.5)) / 17, pts = [[R.x, y0]];
          let x = R.x, y = y0;
          for (let it = 0; it < 900 && x < R.x + R.w; it++) {
            const a = vel(x, y); if (!a) break;
            const b = vel(x + a[0] * 3, y + a[1] * 3); if (!b) break;
            const ux = (a[0] + b[0]) / 2, uy = (a[1] + b[1]) / 2, m = Math.hypot(ux, uy) || 1;
            x += (ux / m) * 6; y += (uy / m) * 6; pts.push([x, y]);
          }
          lines.push(pts);
        }
        STREAM = { key: R.x + ',' + R.y + ',' + R.w, cyl, lines };
        return STREAM;
      }
      function drawStreams(R, lt, t, alpha) {
        const S = streams(R);
        ctx.save(); ctx.globalAlpha *= alpha;
        S.lines.forEach((pts, k) => {
          const acc = k === 7 || k === 11;
          ctx.strokeStyle = acc ? C.accent : C.g300; ctx.lineWidth = 1;
          ctx.setLineDash(acc ? [22, 12] : [10, 8]); ctx.lineDashOffset = -t * (acc ? 90 : 60);
          ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        });
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        S.cyl.forEach((c, i) => {
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
          const a = t * (i ? -5 : 5);
          for (let b = 0; b < 3; b++) { const aa = a + b * 2.0944; seg(c.x, c.y, c.x + Math.cos(aa) * c.r * 0.8, c.y + Math.sin(aa) * c.r * 0.8, C.g500); }
          plus(c.x, c.y, 3, C.ink);
        });
        const c0 = S.cyl[0];
        label('potential flow past two rotors · illustrative', c0.x - c0.r, c0.y - c0.r - 22, { color: C.g500 });
        label('ψ = U·y·(1 − R²/r²)', c0.x - c0.r, c0.y - c0.r - 9, { color: C.g600 });
        ctx.restore();
      }

      // Paradigm "Fourth Fund" hex dump of stanza 03 (bytes are the poem's UTF-8)
      function hexDump(R, u) {
        const m = G.mobile, fs = m ? 8.5 : 11, cw = fs * 0.6, lh = fs * 1.36;
        const vis = Math.min(HEX.rows.length, Math.floor(u / (S16 * 0.9)) + 1);
        const rows = HEX.rows;
        let px = R.x, py = R.y + 10;
        ctx.font = monoF(fs);
        const lab = (s, x, y, col) => { ctx.fillStyle = col || C.ink; ctx.fillText(s, x, y); };
        const col2 = m ? 0 : 118;
        lab('Stanza :', px, py); lab('Lines :', px + col2 * (m ? 0 : 1) + (m ? 90 : 0), py);
        lab('03', px, py + lh, C.ink); lab('3', px + (m ? 90 : col2), py + lh);
        lab('Bytes :', px + (m ? 180 : 0), py + (m ? 0 : lh * 3)); lab(String(HEX.bytes.length), px + (m ? 180 : 0), py + (m ? lh : lh * 4));
        lab('CRC-32 :', px + (m ? 250 : col2), py + (m ? 0 : lh * 3)); lab('0x' + HEX.crc, px + (m ? 250 : col2), py + (m ? lh : lh * 4), vis >= rows.length ? C.accent : C.ink);
        if (!m) {
          lab('Nodes', px, py + lh * 7);
          const r = rng(99), order = shuffle([...Array(72).keys()], r), lit = new Set(order.slice(0, Math.min(72, vis * 3)));
          nodeGrid(px + 4, py + lh * 8.4, 9, 8, 15, (c, rr) => { const k = rr * 9 + c; if (k === 51) return null; return lit.has(k) ? C.accent : C.ink; });
          cross(px + 4 + 6 * 15, py + lh * 8.4 + 5 * 15, 3.5, C.ink);
        }
        const hx = m ? R.x : R.x + 250, hy = m ? py + lh * 3.2 : py;
        for (let i = 0; i < vis; i++) {
          const y = hy + i * lh, row = rows[i], off = (i * 16).toString(16).padStart(8, '0');
          lab(off, hx, y, C.ink);
          for (let j = 0; j < row.length; j++) {
            const idx = i * 16 + j, hit = idx >= HEX.sq[0] && idx < HEX.sq[1];
            lab(hex2(row[j]), hx + cw * (10 + j * 3 + (j >= 8 ? 1 : 0)), y, hit ? C.accent : C.ink);
          }
          if (!m) {
            let asc = ''; for (const b of row) asc += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
            lab(asc, hx + cw * 62, y, C.ink);
          }
        }
        if (vis < rows.length) { const y = hy + vis * lh; ctx.fillStyle = C.ink; ctx.fillRect(hx, y - fs * 0.8, cw, fs * 0.95); }
      }
      function ticker(t, x0, x1, y) {
        const step = Math.floor(t / S16), cw = 18, n = Math.max(0, Math.floor((x1 - x0) / cw));
        let s = '';
        for (let k = 0; k < n; k++) s += hex2(HEX.all[(step + k) % HEX.all.length]) + ' ';
        label(s, x0, y, { color: C.g400 });
        const hk = Math.min(n - 1, 8);
        if (hk >= 0) { ctx.fillStyle = C.bg; ctx.fillRect(x0 + hk * cw - 1, y - 9, 14, 12); label(hex2(HEX.all[(step + hk) % HEX.all.length]), x0 + hk * cw, y, { color: C.accent }); }
      }

      /* ---------------------------------------------------------- film: sections */
      const cards = [];
      function card(key, cap, R, t0, lt, o) { // a jump-out project card (film)
        const u = lt - t0;
        if (u < 0) return null;
        o = o || {};
        let dx = 0, a = 1;
        if (o.off != null && lt >= o.off) { const k = eIn((lt - o.off) / (S16 * 1.5)); dx = k * G.w * 0.5; a = 1 - k; if (a <= 0) return null; }
        const im = img(key), ar = aspect(im);
        let w = Math.min(R.w, G.w * (o.wf || 0.26)), h = w / ar;
        if (h > R.h) { h = R.h; w = h * ar; }
        const x = R.x + dx, y = R.y;
        photo(im, x, y, w, h, { u, pop: true, cap, alpha: a });
        return { x, y, w, h, a };
      }
      function leader(sr, c, u) { // the phrase's underline continues as a dashed leader to its card
        if (!sr || !c) return;
        const ay = Math.round(sr.y + sr.size * 0.16) + 0.5, ax = sr.x1 + 2;
        const xe = Math.max(ax + 10, Math.min(c.x - 30, G.TX + G.TW + 12)), bx = c.x - 7, by = c.y + Math.min(c.h * 0.5, 44);
        ctx.save(); ctx.globalAlpha *= c.a;
        drawOn([[ax, ay], [xe, ay], [bx, by]], eOut(u / 0.14), C.ink, [3, 3]);
        ctx.fillStyle = C.accent; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4);
        ctx.restore();
      }

      const SEC = [];
      // S0 — Cold open: blinking cursor, "Here's to the builders." one char per 16th, flipbook of projects
      SEC[0] = (lt, t) => {
        const { TX, TY, sz, F } = G, size = sz.XL;
        const y = TY + (G.mobile ? 0 : size * 0.4);
        const r = typed(SP.s0, lt, TX, y, size, F.w * 0.9, { tag: ['fig. 00'] });
        cursor(r.cx, r.cy, size, lt >= SP.s0.at && !r.done, t);
        if (lt >= lb(4)) {
          const u = lt - lb(4);
          const fw = G.mobile ? F.w * 0.8 : Math.min(360, F.w * 0.4), fh = fw * 0.58, fx = TX, fy = r.bottom + (G.mobile ? 26 : 40);
          if (u < 2 * BEAT) {
            const i = Math.min(7, Math.floor(u / S16));
            const src = HOVER.builders.srcs[i];
            photo(img(src), fx, fy, fw, fh, { u: 10 });
            label('fig. 00 — things I’ve built, 2022 → 2026', fx - 4, fy + fh + 17);
            label(`${pad2(i + 1)} / 08`, fx + fw + 4, fy + fh + 17, { align: 'right', color: C.g500 });
          } else {
            const v = clamp01((u - 2 * BEAT) / (2 * BEAT)), gap = G.mobile ? 20 : 24;
            const cols = Math.floor(fw / gap) + 1, rows = Math.floor(fh / gap) + 1;
            const r2 = rng(3), order = shuffle([...Array(cols * rows).keys()], r2), lit = new Set(order.slice(0, Math.floor(order.length * eIn(v))));
            nodeGrid(fx, fy, cols, rows, gap, (c, rr) => (lit.has(rr * cols + c) ? C.accent : C.g300));
            label('fig. 00 — things I’ve built, 2022 → 2026', fx - 4, fy + fh + 17, { color: C.g500 });
          }
        }
        if (lt < SP.s0.at) cursor(TX, y, size, false, t);
      };

      // S1 — Roll call: words slam on the beat, thumbnails flash; round peg in a square hole; four projections
      SEC[1] = (lt, t) => {
        const { TX, TY, TW, sz, FIG } = G, size = sz.M;
        const a = typed(SP.s1a, lt, TX, TY, size, TW, { dimAt: lb(3) });
        const b = typed(SP.s1b, lt, TX, a.bottom + size * 1.25, size, TW, { dimAt: lb(4) });
        const c = typed(SP.s1c, lt, TX, b.vis ? b.bottom + size * 1.25 : a.bottom + size * 1.25, size, TW);
        const act = c.vis ? c : b.vis ? b : a;
        cursor(act.cx, act.cy, size, !act.done, t);
        const flashes = [['yash', lb(1, 1), 'fig. 01 — Yash Dagade'], ['code', lb(1, 3), 'fig. 02 — LpWM, sparse latent (toy)'], ['idw', lb(2, 1), 'fig. 03 — idontwannadie.lol']];
        if (lt < lb(3)) {
          flashes.forEach(([k, t0, cap], i) => {
            const u = lt - t0;
            if (u < 0) return;
            if (u < BEAT) {
              const FR = { x: FIG.x, y: FIG.y + FIG.h * 0.12, w: FIG.w, h: FIG.h * 0.66 };
              if (k === 'code') {
                const f = fit(1.5, FR, 0.3);
                photo(null, f.x, f.y, f.w, f.h, { u, wipe: S16, cap, draw: (x, y, w, h) => { ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); vCode({ x, y, w, h }, BEAT * 3, t, { mini: true }); } });
              } else flashImg(IMG[k], lt, t0, BEAT, FR, cap, { maxWf: 0.3 });
            } else {
              // after its flash: a small contact strip (three thumbs)
              const tw = G.mobile ? 64 : Math.min(96, FIG.w * 0.26), th = tw * 0.75, gx = FIG.x + i * (tw + 16), gy = FIG.y + FIG.h * 0.5 - th / 2;
              photo(k === 'code' ? null : img(IMG[k]), gx, gy, tw, th, { u: u - BEAT, pop: true, draw: k === 'code' ? (x, y, w, h) => { ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); vCode({ x, y, w, h }, BEAT * 3, t, { mini: true }); } : null });
              label(pad2(i + 1), gx - 4, gy + th + 17, { color: C.g500 });
            }
          });
        } else if (lt < lb(4)) {
          // bar 3 — a round peg dropped into a square hole
          const u = lt - lb(3), s = Math.min(FIG.w, FIG.h) * (G.mobile ? 0.6 : 0.5), cx = FIG.x + FIG.w / 2, cy = FIG.y + FIG.h / 2 + (G.mobile ? 10 : 0);
          const sq = [[cx - s / 2, cy - s / 2], [cx + s / 2, cy - s / 2], [cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2], [cx - s / 2, cy - s / 2]];
          drawOn(sq, eOut(u / (S16 * 3)), C.ink);
          const fall = eIn((u - S16 * 2) / (BEAT * 0.75)), ccy = lerp(FIG.y - s * 0.2, cy, fall);
          if (u > S16 * 2) { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(cx, ccy, s / 2, 0, Math.PI * 2); ctx.stroke(); }
          const landed = fall >= 1, g = eOut((u - S16 * 2 - BEAT * 0.75) / (BEAT * 0.6));
          if (landed) {
            ctx.save();
            ctx.beginPath(); ctx.rect(cx - s / 2, cy - s / 2, s, s); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2, true); ctx.clip('evenodd');
            ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.beginPath();
            const reach = s * g;
            for (let d = -s; d <= s; d += 6) { ctx.moveTo(cx + d - reach / 2, cy + s / 2); ctx.lineTo(cx + d + reach / 2, cy + s / 2 - reach); }
            ctx.stroke();
            ctx.restore();
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => plus(cx + sx * s / 2, cy + sy * s / 2, 4, C.accent));
            label('1 − π/4 ≈ 21.5% of the hole left unfilled', cx - s / 2 - 4, cy + s / 2 + 22, { color: C.ink });
            label('○ round peg   □ square hole', cx - s / 2 - 4, cy + s / 2 + 35, { color: C.g500 });
          }
        } else {
          // bar 4 — the same data, projected at θ = 0°, 45°, 90°, 135°
          const u = lt - lb(4), k = Math.min(3, Math.floor(u / BEAT)), sub = (u / BEAT) - k;
          const th = ((k + (k < 3 ? eIO(Math.max(0, sub - 0.75) / 0.25) : 0)) * Math.PI) / 4;
          const cx = FIG.x + FIG.w / 2, cy = FIG.y + FIG.h / 2, sc = Math.min(FIG.w, FIG.h) * 0.2;
          const dx = Math.cos(th), dy = -Math.sin(th), Lx = sc * 3;
          seg(cx - dx * Lx, cy - dy * Lx, cx + dx * Lx, cy + dy * Lx, C.ink);
          const bins = new Array(24).fill(0);
          CLOUD.forEach(([px, py], i) => {
            const X = cx + px * sc, Y = cy - py * sc;
            ctx.fillStyle = C.ink; ctx.fillRect(X - 0.9, Y - 0.9, 1.8, 1.8);
            const pr = px * Math.cos(th) + py * Math.sin(th);
            const b = Math.floor((pr + 3) / 0.25); if (b >= 0 && b < 24) bins[b]++;
            if (i % 30 === 0) seg(X, Y, cx + dx * pr * sc, cy + dy * pr * sc, C.g300, [2, 2]);
          });
          const nx = -dy, ny = dx; // histogram grows perpendicular to the axis
          bins.forEach((n, b) => {
            if (!n) return;
            const pr = -3 + (b + 0.5) * 0.25, bx = cx + dx * pr * sc, by = cy + dy * pr * sc, hh = n * 1.6;
            seg(bx, by, bx + nx * hh, by + ny * hh, C.accent, null, 2);
          });
          label(`θ = ${[0, 45, 90, 135][k]}°`, cx + dx * Lx + 6, cy + dy * Lx - 6, { color: C.accent });
          label('same data · 4 projections · Rectified LpJEPA', FIG.x, FIG.y + FIG.h - 4, { color: C.g500 });
        }
      };

      // S2 — Question everything: typed at 2 chars/16th + a "why?" chain; then turbines in the sky
      SEC[2] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, VR, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          const a = typed(SP.s2a, lt, TX, TY, size, TW, { tag: ['→ SkyWindFarm'] });
          cursor(a.cx, a.cy, size, !a.done, t);
          const n = Math.min(7, Math.floor(lt / (BEAT * 1.1)) + 1), gx = FIG.x + FIG.w * (G.mobile ? 0.06 : 0.12), step = Math.min(66, FIG.h / 7.6), dx = G.mobile ? 20 : 34;
          const ys = i => FIG.y + (G.mobile ? 8 : FIG.h * 0.04) + i * step, xs = i => gx + i * dx;
          for (let i = 0; i < n; i++) {
            const x = xs(i), y = ys(i), last = i === 6;
            if (i) drawOn([[xs(i - 1), ys(i - 1) + 8], [xs(i - 1), y], [x - 8, y]], eOut((lt - i * BEAT * 1.1) / (S16 * 2)), C.g500, [2, 3]);
            if (last && lt >= lb(2, 4)) { ctx.fillStyle = C.accent; ctx.fillRect(x - 5, y - 5, 10, 10); label('first principles', x + 16, y + 4, { size: 12, color: C.accent }); }
            else { plus(x, y, 5, i === n - 1 ? C.ink : C.g500); label(i === 0 ? 'why?' : 'but why?', x + 16, y + 4, { size: 12, color: i === n - 1 ? C.ink : C.g500 }); }
          }
          if (n > 1) label(`depth ${n}`, gx, ys(0) - 18, { color: C.g500 });
        } else {
          const u = lt - lb(3);
          label('“question everything” → SkyWindFarm, 2022–2024', TX, F.y0 + 14, { color: C.accent });
          const b = typed(SP.s2b, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.9);
          cursor(b.cx, b.cy, sz.S, !b.done, t);
          vTurb(VR, u, t);
          flashImg(IMG.sky, lt, lb(4, 4), BEAT, VR, 'fig. 04 — SkyWindFarm units in the sky (render)', { maxWf: 0.4 });
        }
      };

      // S3 — Laws of physics: streamlines behind the text; ruled lines break; hex dump cut
      SEC[3] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G, size = sz.L;
        if (lt < lb(4)) {
          const fa = eOut(lt / BEAT) * (lt < lb(3) ? 1 : 1 - eOut((lt - lb(3)) / BEAT) * 0.8);
          drawStreams({ x: F.x0, y: F.y0 + 20, w: F.w, h: F.h - 30 }, lt, t, fa);
          const a = typed(SP.s3a, lt, TX, TY, size, TW, { dimAt: lb(3), noInk: false });
          let act = a;
          if (lt >= lb(3)) {
            const b = typed(SP.s3b, lt, TX, a.bottom + size * 1.3, size, TW);
            act = b;
            const u = lt - lb(3), n = 8;
            for (let i = 0; i < n; i++) {
              const y = FIG.y + FIG.h * 0.2 + i * Math.min(26, FIG.h / 12), x0 = FIG.x + (G.mobile ? 0 : FIG.w * 0.1), x1 = FIG.x + FIG.w * 0.95;
              const br = eOut((u - doneAt(SP.s3b) + lb(3) - i * S16 * 0.5 + S16) / S16), mid = lerp(x0, x1, 0.3 + ((i * 37) % 40) / 100);
              const gap = br * (20 + i * 3);
              drawOn([[x0, y], [mid - gap, y]], eOut((u - i * 0.03) / (S16 * 2)), C.ink);
              if (br < 1) drawOn([[mid - gap, y], [mid + gap, y]], eOut((u - i * 0.03) / (S16 * 2)), C.ink);
              drawOn([[mid + gap, y], [x1, y]], eOut((u - i * 0.03 - 0.05) / (S16 * 2)), br > 0 ? C.g400 : C.ink);
              if (br > 0) { plus(mid - gap, y, 3, C.accent); label(pad2(i + 1), x1 + 6, y + 3, { color: C.g500 }); }
            }
            label('rules', FIG.x + (G.mobile ? 0 : FIG.w * 0.1), FIG.y + FIG.h * 0.2 - 18, { color: C.g500 });
          }
          cursor(act.cx, act.cy, size, !act.done, t);
        } else if (lt < lb(4, 2)) {
          const c = typed(SP.s3c, lt, TX, TY, size, TW);
          cursor(c.cx, c.cy, size, false, t);
        } else {
          hexDump({ x: F.x0, y: F.y0 + 8, w: F.w, h: F.h }, lt - lb(4, 2));
        }
      };

      // S4 — First principles: module stack + photo, "non-mimetic" grid + photo, then LpWM sparse rollout
      SEC[4] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, VR, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          const a = typed(SP.s4a, lt, TX, TY, size, TW, { tag: ['→ fig. 05', '→ fig. 06'] });
          cursor(a.cx, a.cy, size, a.vis < 33 ? lt < charTime(SP.s4a, 32) + S16 : !a.done, t);
          if (lt < lb(2)) {
            const mods = ['flotation', 'stability', 'energy', 'power transfer', 'ground'];
            const bh = Math.min(38, FIG.h / 7), bw = Math.min(220, FIG.w * 0.8), bx = FIG.x + (FIG.w - bw) / 2, by0 = FIG.y + (FIG.h - mods.length * (bh + 10)) / 2;
            mods.forEach((m, i) => {
              const u = lt - i * BEAT / 2;
              if (u < 0) return;
              const y = by0 + i * (bh + 10);
              drawOn([[bx, y], [bx + bw, y], [bx + bw, y + bh], [bx, y + bh], [bx, y]], eOut(u / (S16 * 1.5)), C.ink);
              label(pad2(i + 1), bx + 8, y + bh / 2 + 4, { color: C.g500 });
              label(m, bx + 34, y + bh / 2 + 4, { color: i === 2 ? C.accent : C.ink });
              if (i) seg(bx + bw / 2, y - 10, bx + bw / 2, y, C.g400, [2, 2]);
            });
            label('SkyWindFarm · from first principles', bx, by0 - 14, { color: C.g500 });
            flashImg(IMG.system, lt, lb(1, 4), BEAT, FIG, 'fig. 05 — SkyWindFarm system diagram');
          } else {
            const u = lt - lb(2), cols = 6, rows = 4, gap = Math.min(46, FIG.w / 7), gx = FIG.x + (FIG.w - (cols - 1) * gap) / 2, gy = FIG.y + (FIG.h - (rows - 1) * gap) / 2;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              const k = r * cols + c;
              if (u < k * S16 * 0.35) continue;
              const x = gx + c * gap, y = gy + r * gap;
              if (k === 15) { const o = eOut((u - BEAT * 1.5) / BEAT) * 10; ctx.fillStyle = C.accent; ctx.fillRect(x - 7 + o, y - 7 - o, 14, 14); }
              else { ctx.strokeStyle = C.g500; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
            }
            label('mimetic: 23 / 24 alike', gx - 7, gy - 22, { color: C.g500 });
            flashImg(IMG.flight, lt, lb(2, 4), BEAT, FIG, 'fig. 06 — SkyWindFarm prototype in flight');
          }
        } else {
          const u = lt - lb(3);
          label('“first principles” · “non-mimetic” → a sparse world model (LpWM, 2026)', TX, F.y0 + 14, { color: C.accent });
          const b = typed(SP.s4b, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.92);
          cursor(b.cx, b.cy, sz.S, !b.done, t);
          vCode({ x: VR.x, y: VR.y + 16, w: VR.w, h: VR.h - 16 }, u, t);
        }
      };

      // S5 — Will power (the drop): node-grid shockwave, cards jump out, ConnectU on "will power"
      SEC[5] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G, size = sz.M;
        if (lt < BEAT * 1.5) { // impact: every node of a grid flashes as a ring passes
          const gap = G.mobile ? 22 : 28, cols = Math.floor(F.w / gap), rows = Math.floor(F.h / gap), R0 = (lt / (BEAT * 1.2)) * Math.hypot(F.w, F.h), fade = 1 - clamp01(lt / (BEAT * 1.5));
          ctx.save(); ctx.globalAlpha = fade;
          nodeGrid(F.x0 + gap / 2, F.y0 + gap / 2, cols, rows, gap, (c, r) => {
            const d = Math.hypot(c * gap + gap / 2, r * gap + gap / 2 - F.h * 0.25);
            return Math.abs(d - R0) < gap * 1.2 ? C.accent : C.g300;
          });
          ctx.restore();
        }
        // layout first, so leaders can run behind the (haloed) text
        const La = { L: lay(SP.s5a.segs, serifF(size), size, TW), x: TX, y: TY };
        const yb = TY + La.L.last + size * 0.3 + size * 1.25;
        const Lb = { L: lay(SP.s5b.segs, serifF(size), size, TW), x: TX, y: yb };
        const R1 = { x: FIG.x, y: FIG.y + (G.mobile ? 0 : FIG.h * 0.04), w: FIG.w, h: FIG.h * 0.45 };
        const R2 = { x: FIG.x + (G.mobile ? FIG.w * 0.35 : FIG.w * 0.12), y: FIG.y + FIG.h * (G.mobile ? 0.45 : 0.42), w: FIG.w, h: FIG.h * 0.45 };
        const sr = spanRect(La, 0);
        const c1 = card(IMG.eyeda, 'EyeDa · 2022', R1, lb(2, 1), lt, { off: lb(3, 1), wf: G.mobile ? 0.62 : 0.27 });
        const c2 = card(IMG.idw, 'idontwannadie.lol · 2024', R2, lb(2, 2), lt, { off: lb(3, 1) + S16, wf: G.mobile ? 0.62 : 0.24 });
        if (!G.mobile) { if (c1) leader(sr, c1, lt - lb(2, 1)); if (c2) leader(sr, c2, lt - lb(2, 2)); }
        if (lt >= lb(4, 3)) {
          const R3 = { x: FIG.x + (G.mobile ? 0 : FIG.w * 0.06), y: FIG.y + FIG.h * (G.mobile ? 0.2 : 0.28), w: FIG.w, h: FIG.h * 0.5 };
          const c3 = card(IMG.connectu, 'ConnectU · 2025', R3, lb(4, 3), lt, { wf: G.mobile ? 0.8 : 0.28 });
          if (!G.mobile) leader(spanRect(Lb, 0), c3, lt - lb(4, 3));
        }
        const a = typed(SP.s5a, lt, TX, TY, size, TW, { dimAt: lb(4), halo: true });
        const b = typed(SP.s5b, lt, TX, yb, size, TW, { halo: true });
        const act = b.vis ? b : a;
        cursor(act.cx, act.cy, size, !act.done, t);
        ticker(t, F.x0, F.x0 + F.w * (G.mobile ? 1 : 0.55), F.y1 - 2);
      };

      // S6 — No limits: ring (β₂ = 0) bursts into χ₂ shells on "no limits"; then silence
      SEC[6] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G;
        if (lt < lb(4)) {
          const size = sz.M;
          const a = typed(SP.s6a, lt, TX, TY, size, TW, { dimAt: lb(2) });
          const b = typed(SP.s6b, lt, TX, a.bottom + size * 1.25, size, TW, { tag: ['→ fig. 07'] });
          const act = b.vis ? b : a;
          cursor(act.cx, act.cy, size, !act.done, t);
          if (lt >= lb(2)) {
            const R = G.mobile ? { x: FIG.x, y: FIG.y - 10, w: FIG.w, h: FIG.h + 10 } : { x: FIG.x - FIG.w * 0.15, y: F.y0 + 10, w: FIG.w * 1.15, h: F.h - 20 };
            vRadial(R, lt - lb(2), t, { burst: BAR });
          }
          ticker(t, F.x0, F.x0 + F.w * (G.mobile ? 1 : 0.5), F.y1 - 2);
        } else {
          const size = G.mobile ? 10 : 11;
          const c = typed(SP.s6c, lt, F.x0 + F.w / 2 - Math.min(F.w, 560) / 2, F.y0 + F.h * 0.46, size, Math.min(F.w, 560), { mono: true, color: C.g500, lhf: 1.5 });
          cursor(c.cx, c.cy, size, !c.done, t);
        }
      };

      // S7 — High bar for quality: a box builds edge by edge; wind tunnel vs CFD snaps to y = x; histogram rectifies
      SEC[7] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, VR, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          const a = typed(SP.s7a, lt, TX, TY, size, TW, { dimAt: lb(2) });
          const b = typed(SP.s7b, lt, TX, a.bottom + size * 1.3, size, TW, { tag: ['→ fig. 08'] });
          const act = b.vis ? b : a;
          cursor(act.cx, act.cy, size, !act.done, t);
          if (lt < lb(2)) { // isometric wireframe box, one edge per 16th, dashed bounding box
            const s = Math.min(FIG.w, FIG.h) * 0.26, cx = FIG.x + FIG.w / 2, cy = FIG.y + FIG.h / 2 + s * 0.4;
            const P = (x, y, z) => [cx + (x - y) * s * 0.866, cy + (x + y) * s * 0.5 - z * s];
            const V = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)];
            const Ed = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7], [7, 4]];
            const BB = [P(-0.25, -0.25, 0), P(1.25, -0.25, 0), P(1.25, 1.25, 0), P(-0.25, 1.25, 0), P(-0.25, -0.25, 1.4), P(1.25, -0.25, 1.4), P(1.25, 1.25, 1.4), P(-0.25, 1.25, 1.4)];
            Ed.forEach(([i, j]) => drawOn([BB[i], BB[j]], eOut(lt / BEAT), C.g300, [3, 3]));
            Ed.forEach(([i, j], k) => drawOn([V[i], V[j]], eOut((lt - k * S16) / S16), k === 11 ? C.accent : C.ink));
            label(`edges ${Math.min(12, Math.max(0, Math.floor(lt / S16) + 1))} / 12`, FIG.x + FIG.w / 2, cy + s * 1.1 + 16, { align: 'center', color: C.g500 });
          } else { // wind tunnel photo + tunnel-vs-CFD points snapping onto y = x
            const u = lt - lb(2), im = img(IMG.tunnel);
            const f = fit(aspect(im), { x: FIG.x, y: FIG.y, w: FIG.w, h: FIG.h * 0.4 }, 0.3);
            photo(im, f.x, FIG.y + 4, f.w, f.h, { u, wipe: S16 * 1.2, cap: 'fig. 08 — wind-tunnel setup' });
            const ps = Math.min(FIG.w * 0.7, FIG.h * 0.42), px = FIG.x + (FIG.w - ps) / 2, py = FIG.y + FIG.h - ps - 16;
            seg(px, py + ps, px + ps, py + ps, C.ink); seg(px, py, px, py + ps, C.ink);
            drawOn([[px, py + ps], [px + ps, py]], eOut(u / BEAT), C.g500, [3, 3]);
            const k = eIO((u - BEAT) / (BEAT * 2));
            SCATTER.forEach(p => {
              const yv = p.x + lerp(p.j, p.e, k);
              ctx.fillStyle = k > 0.98 ? C.accent : C.ink; ctx.fillRect(px + p.x * ps - 2, py + ps - yv * ps - 2, 4, 4);
            });
            label('y = x', px + ps + 4, py + 4, { color: C.g500 });
            label('CFD', px + ps, py + ps + 14, { align: 'right', color: C.g600 });
            label('tunnel', px - 6, py + 4, { align: 'right', color: C.g600 });
            label(k > 0.98 ? 'correlation > 0.95 (swf.pdf)' : 'points illustrative', px, py - 8, { color: k > 0.98 ? C.accent : C.g500 });
          }
        } else {
          const u = lt - lb(3);
          label('“high bar for quality” · “excellence”', TX, F.y0 + 14, { color: C.accent });
          const c = typed(SP.s7c, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.92, { tag: ['→ fig. 09'] });
          cursor(c.cx, c.cy, sz.S, !c.done, t);
          vHist(G.VR, u, t, { fill: BAR, rect: BAR });
          flashImg(IMG.poster, lt, lb(4, 3), BEAT, VR, 'fig. 09 — ISEF poster, 2024', { maxWf: 0.4 });
        }
      };

      // S8 — Yearn to build: Hermes-style word highlight, then "And they yearn to build." alone, then the names
      SEC[8] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G;
        if (lt < lb(3)) {
          const size = sz.L, s = { segs: L(10, 0), n: L(10, 0).n, at: 0, slam: true };
          const font = serifF(size), Lo = lay(s.segs, font, size, TW);
          const wi = Math.min(HERMES_WORDS.length - 1, Math.floor(lt / (BEAT / 2)));
          const W = HERMES_WORDS[wi];
          const bottom = TY + Lo.last + size * 0.3;
          const pw = Math.min(TW, 420), py = bottom + 34, pr = (wi + ((lt / (BEAT / 2)) % 1)) / HERMES_WORDS.length;
          const tc = lb(1) + 7 * BEAT / 2;
          if (lt >= tc) {
            const R = { x: FIG.x, y: FIG.y + FIG.h * (G.mobile ? 0.12 : 0.2), w: FIG.w, h: FIG.h * 0.6 };
            const c = card(IMG.hermes, 'Hermes · 2026', R, tc, lt, { wf: G.mobile ? 0.8 : 0.3 });
            if (!G.mobile && c) { const Sx = Lo.spans[0]; if (Sx) { const r = Sx.rects[Sx.rects.length - 1]; leader({ x1: TX + r.x1, y: TY + r.y, size }, c, lt - tc); } }
          }
          typed(s, lt, TX, TY, size, TW, { color: C.g400, noInk: true, halo: true });
          // highlight box behind the current word
          const tw = Lo.toks.find(q => !q.sp && q.c0 <= W.c0 && q.c0 + q.s.length > W.c0);
          if (tw) {
            const w2 = Lo.toks.filter(q => !q.sp && q.c0 >= W.c0 && q.c0 < W.c1).reduce((m, q) => Math.max(m, q.x + q.w), 0);
            ctx.fillStyle = C.accentSoft; ctx.fillRect(TX + tw.x - 3, TY + tw.y - size * 0.8, w2 - tw.x + 6, size * 1.02);
          }
          typed(s, lt, TX, TY, size, TW, { vis: W.c1, noUnder: true });
          // a hairline player (Hermes)
          seg(TX, py, TX + pw, py, C.g300); seg(TX, py, TX + pw * Math.min(1, pr), py, C.ink);
          ctx.fillStyle = C.accent; ctx.fillRect(TX + pw * Math.min(1, pr) - 1, py - 5, 2, 11);
          label('▶  Hermes · word-synced voice · 0.75–4×', TX, py + 20, { color: C.g600 });
          if (lt >= lb(2, 3)) {
            const b = typed(SP.s8b, lt, TX, py + 64, sz.M, TW);
            cursor(b.cx, b.cy, sz.M, false, t);
          }
        } else if (lt < lb(4)) {
          const size = sz.XL, Lo = lay(SP.s8c.segs, serifF(size), size, F.w);
          const x = F.x0 + (F.w - Lo.w) / 2, y = F.y0 + F.h * 0.48;
          const c = typed(SP.s8c, lt, x, y, size, F.w);
          cursor(c.cx, c.cy, size, !c.done, t);
        } else {
          let k = -1; for (let i = 0; i < NAMES.length; i++) if (lt >= NAME_T[i]) k = i;
          if (k >= 0) {
            const size = sz.XL, s = spec(segs('nm' + k, NAMES[k]), { at: 0, slam: true }), Lo = lay(s.segs, serifF(size), size, F.w);
            const x = F.x0 + (F.w - Lo.w) / 2, y = F.y0 + F.h * 0.48;
            typed(s, 1, x, y, size, F.w, { color: k === NAMES.length - 1 ? C.accent : C.ink });
            label(`${pad2(k + 1)} / ${pad2(NAMES.length)}`, x, y - size - 4, { color: C.g500 });
            if (!G.mobile) for (let i = 0; i <= k; i++) label(NAMES[i], F.x1, F.y0 + 30 + i * 14, { align: 'right', color: i === k ? C.ink : C.g400 });
            label('They are known by many names in their communities:', x, y + size * 0.6, { color: C.g500 });
          }
        }
      };

      // S9 — The same life: friends callouts; energy × intelligence split; quote/disagree/glorify/vilify; press
      SEC[9] = (lt, t) => {
        const { TX, TY, TW, sz, F } = G;
        if (lt < lb(2)) {
          const size = sz.L, a = typed(SP.s9a, lt, TX, TY, size, TW);
          cursor(a.cx, a.cy, size, !a.done, t);
          const sr = spanRect(a, 0), td = charTime(SP.s9a, 50);
          if (sr && lt > td) {
            const ax = (sr.x0 + sr.x1) / 2, ay = sr.y + 8;
            const spots = G.mobile
              ? [[F.x0 + 10, F.y0 + F.h * 0.62], [F.x0 + F.w * 0.55, F.y0 + F.h * 0.7], [F.x0 + 10, F.y0 + F.h * 0.84], [F.x0 + F.w * 0.55, F.y0 + F.h * 0.92]]
              : [[F.x1 - 150, F.y0 + 30], [F.x1 - 60, F.y0 + F.h * 0.45], [F.x0 + F.w * 0.62, F.y1 - 30], [F.x0 + 40, F.y1 - 60]];
            FRIENDS.forEach((f, i) => {
              const p = (lt - td - i * S16) / (S16 * 2);
              if (p <= 0) return;
              const [lx, ly] = spots[i];
              callout(ax, ay, lx, ly, f.label, f.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), p, { tcol: C.accent });
            });
          }
        } else if (lt < lb(3)) {
          const size = sz.M, b = typed(SP.s9b, lt, TX, TY, size, G.mobile ? F.w : F.w * 0.9);
          cursor(b.cx, b.cy, size, false, t);
          const top = b.bottom + 40, hh = F.y1 - top - 20, half = (F.w - 40) / 2;
          const u = lt - lb(2) + BAR * 2;
          const Rl = { x: F.x0, y: top, w: half, h: hh }, Rr = { x: F.x0 + half + 40, y: top, w: half, h: hh };
          ctx.save(); ctx.globalAlpha = eOut((lt - lb(2)) / S16);
          vTurb(Rl, u, t, { mini: true }); vCode(Rr, BEAT * 6 + ((lt - lb(2)) % (BEAT * 2)), t, { mini: true });
          seg(F.x0 + half + 20, top, F.x0 + half + 20, top + hh, C.g300, [2, 3]);
          label('energy', Rl.x, top - 8, { color: C.g600 }); label('intelligence', Rr.x, top - 8, { color: C.g600 });
          ctx.restore();
        } else if (lt < lb(4)) {
          const size = sz.L; let y = TY;
          SP.s9c.forEach((s, i) => {
            if (lt < s.at) return;
            const r = typed(s, lt, TX, y, size, TW, { dimAt: i < 3 ? SP.s9c[i + 1].at : null });
            if (lt < (SP.s9c[i + 1] ? SP.s9c[i + 1].at : Infinity)) cursor(r.cx, r.cy, size, false, t);
            y = r.bottom + size * 1.1;
          });
        } else {
          const size = sz.L, d = typed(SP.s9d, lt, TX, TY, size, TW);
          cursor(d.cx, d.cy, size, !d.done, t);
          const py = d.bottom + 48;
          let x = TX;
          PRESS.forEach((p, i) => {
            if (lt < lb(4, 3) + i * S16) return;
            const w = mw(monoF(10), p);
            if (G.mobile && x + w > F.x1) return;
            srect(x, py - 9, 8, 8, i === PRESS.length - 1 ? C.accent : C.ink);
            label(p, x + 14, py, { color: C.ink });
            x += w + 38;
          });
          if (lt >= lb(4, 3)) label('press', TX, py - 20, { color: C.g500 });
          ticker(t, F.x0, F.x0 + F.w * (G.mobile ? 1 : 0.55), F.y1 - 2);
        }
      };

      // S10 — Change things: all four vignettes at once; closing lines; dissolve into the interactive page
      SEC[10] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          const a = typed(SP.s10a, lt, TX, TY, size, TW, { dimAt: lb(2) });
          const b = typed(SP.s10b, lt, TX, a.bottom + size * 1.25, size, TW);
          const act = b.vis ? b : a;
          cursor(act.cx, act.cy, size, false, t);
          const drift = lt >= lb(2) ? eIn((lt - lb(2)) / BAR) : 0;
          ctx.save(); ctx.globalAlpha = 1 - drift * 0.85; ctx.translate(-drift * F.w * 0.25, 0);
          const R = G.mobile ? { x: F.x0, y: F.y0 + F.h * 0.4, w: F.w, h: F.h * 0.6 } : { x: F.x0, y: F.y0 + F.h * 0.5, w: F.w, h: F.h * 0.5 - 14 };
          const cols = G.mobile ? 2 : 4, rowsN = G.mobile ? 2 : 1, gap = G.mobile ? 14 : 22, lab = 22;
          const gw = (R.w - (cols - 1) * gap) / cols, gh = (R.h - rowsN * lab - (rowsN - 1) * gap) / rowsN;
          const cells = [
            ['01  LpWM', (r) => vCode(r, BEAT * 7.5, t, { mini: true })],
            ['02  Rectified LpJEPA', (r) => vHist(r, BAR * 1.5 + lt, t, { mini: true, fill: BAR, rect: BAR })],
            ['03  Radial-VCReg', (r) => vRadial(r, BAR + 0.1 + lt * 0.8, t, { mini: true, burst: BAR })],
            ['04  SkyWindFarm', (r) => vTurb(r, BAR * 2, t, { mini: true })],
          ];
          cells.forEach(([name, fn], i) => {
            const u = lt - i * S16;
            if (u < 0) return;
            const r = { x: R.x + (i % cols) * (gw + gap), y: R.y + Math.floor(i / cols) * (gh + lab + gap) + lab, w: gw, h: gh };
            srect(r.x, r.y, r.w, r.h, C.g300);
            plus(r.x, r.y, 3, C.accent);
            label(name, r.x, r.y - 7, { color: C.ink });
            ctx.save(); ctx.beginPath(); ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); ctx.clip();
            fn({ x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 });
            ctx.restore();
          });
          ctx.restore();
        } else {
          const size = sz.M;
          const c = typed(SP.s10c, lt, TX, TY, size, G.mobile ? F.w : F.w * 0.8, { italic: true });
          const d = typed(SP.s10d, lt, TX, c.bottom + size * 1.2, size, G.mobile ? F.w : F.w * 0.8, { italic: true });
          const e = typed(SP.s10e, lt, TX, (d.vis ? d.bottom : c.bottom) + sz.XL * 1.4, sz.XL, F.w, { italic: true });
          const act = e.vis ? e : d.vis ? d : c;
          cursor(act.cx, act.cy, act === e ? sz.XL : size, act !== e && !act.done, t);
        }
      };

      /* ---------------------------------------------------------- HUD, marks, glitch */
      function drawMarks(t) {
        const F = G.F, bt = Math.floor(t / BEAT) % 4, s16 = (t / BEAT) % 1;
        const P = [[F.x0 - 12, F.y0 - 4], [F.x1 + 12, F.y0 - 4], [F.x1 + 12, F.y1 + 8], [F.x0 - 12, F.y1 + 8]];
        P.forEach(([x, y], i) => plus(x, y, 4, i === bt && s16 < 0.25 ? (bt === 0 ? C.accent : C.ink) : C.g300));
      }
      function drawHud(t, si) {
        const F = G.F, S = SECTIONS[si], y = F.y0 - 22;
        const bar = Math.floor(t / BAR) + 1, beat = (Math.floor(t / BEAT) % 4) + 1, s16 = (Math.floor(t / S16) % 4) + 1;
        label(`§${pad2(si + 1)}`, F.x0, y, { color: C.ink });
        label(G.mobile ? S.name : `${S.name}`, F.x0 + 34, y, { color: C.ink });
        if (!G.mobile) label(S.ref, F.x0 + 34 + mw(monoF(10), S.name) + 16, y, { color: C.g500 });
        const bx = F.x1 - 4 * 9 + 1;
        for (let i = 0; i < 4; i++) {
          const on = i === beat - 1;
          if (on) { ctx.fillStyle = i === 0 ? C.accent : C.ink; ctx.fillRect(bx + i * 9, y - 7, 6, 6); } else srect(bx + i * 9, y - 7, 5, 5, C.g400);
        }
        const txt = G.mobile ? `${pad2(bar)}.${beat}` : `${pad2(bar)}.${beat}.${s16}   ${BPM} BPM`;
        label(playing ? txt : 'paused  ' + txt, bx - 12, y, { align: 'right', color: playing ? C.g600 : C.accent });
      }
      function glitchPass(t) {
        for (const [tc, amt] of GLITCHES) {
          const d = t - tc;
          if (d < -S16 * 0.5 || d > S16 * 0.6) continue;
          const k = amt * (1 - Math.abs(d) / (S16 * 0.6)), r = rng(Math.floor(tc * 100) + Math.floor(t / (S16 / 3)));
          const w = cv.w, h = cv.h, dpr = cv.dpr, n = 5 + Math.floor(k * 9);
          for (let i = 0; i < n; i++) {
            const y = G.F.y0 + r() * G.F.h, sh = 2 + r() * 22 * k, dx = (r() - 0.5) * 90 * k;
            try { ctx.drawImage(cv.canvas, 0, y * dpr, w * dpr, sh * dpr, dx, y, w, sh); } catch (e) { /* ignore */ }
            if (r() < 0.35) { ctx.fillStyle = C.accent; ctx.fillRect(G.F.x0 + r() * G.F.w * 0.7, y, 20 + r() * 160 * k, 1 + Math.floor(r() * 2)); }
          }
          break;
        }
      }
      const secAt = t => { let i = 0; for (let k = 0; k < SECTIONS.length; k++) if (t >= SECTIONS[k].t0) i = k; return i; };
      function render() {
        if (!G || G.cw !== cv.w || G.ch !== cv.h) relayout();
        cv.clear();
        const t = pos, si = secAt(t), S = SECTIONS[si];
        ctx.save();
        const fade = 1 - clamp01((t - lb(44, 2)) / BEAT);
        ctx.globalAlpha = fade;
        drawMarks(t);
        drawHud(t, si);
        try { SEC[si](t - S.t0, t); } catch (err) { console.error('[build] section', si, err); }
        ctx.restore();
        if (!api.reduced) glitchPass(t);
      }

      /* ---------------------------------------------------------- controls */
      const st = api.stepper({ items: STEPS.map(s => s.label), onSelect: i => seek(lb(STEPS[i].bar), true) });
      const sl = api.slider({
        min: 0, max: DUR, step: 0, value: 0,
        label: v => `${fmt(v)} / ${fmt(DUR)}`, left: 'Start', right: 'End',
        onInput: v => scrub(v),
      });
      const group = st.el.parentNode;
      const btnCss = 'font-size:10px;line-height:12.5px;color:var(--ink);border-bottom:1px solid var(--g400);padding:0;';
      const row = H('div', { style: 'display:flex;gap:16px;align-items:baseline;white-space:nowrap' });
      const bPlay = H('button', { type: 'button', style: btnCss, text: 'Pause [space]' });
      const bSkip = H('button', { type: 'button', style: btnCss, text: 'Skip to index [↵]' });
      row.append(bPlay, bSkip);
      group.append(row);
      const st2 = api.stepper({ items: ['Poem', 'Projects', 'Friends'], onSelect: i => jumpTo(i) });
      const bReplay = H('button', { type: 'button', style: btnCss, text: 'Replay the film [space]' });
      const row2 = H('div', { style: 'display:flex;gap:16px;align-items:baseline;white-space:nowrap' }, bReplay);
      group.append(row2);
      [bPlay, bSkip, bReplay].forEach(b => {
        b.addEventListener('pointerenter', () => { b.style.color = C.accent; b.style.borderColor = C.accent; ui('hover'); });
        b.addEventListener('pointerleave', () => { b.style.color = ''; b.style.borderColor = ''; });
      });
      bPlay.addEventListener('click', () => { ui('tick'); togglePlay(); });
      bSkip.addEventListener('click', () => { ui('select'); settle('skip'); });
      bReplay.addEventListener('click', () => { ui('select'); replay(); });
      function showControls() {
        const film = mode === 'film';
        st.el.style.display = film ? '' : 'none';
        sl.el.style.display = film ? '' : 'none';
        row.style.display = film ? 'flex' : 'none';
        st2.el.style.display = film ? 'none' : '';
        row2.style.display = film ? 'none' : (innerWidth < 800 ? 'none' : 'flex');
        if (!film) requestAnimationFrame(() => { try { st2.place && st2.place(); } catch (e) {} });
        else requestAnimationFrame(() => { try { st.place && st.place(); } catch (e) {} });
      }
      let lastSi = -1, lastSlider = -1, lastPlayTxt = '';
      function syncControls() {
        let si = 0; for (let i = 0; i < STEPS.length; i++) if (pos >= lb(STEPS[i].bar)) si = i;
        if (si !== lastSi) { lastSi = si; st.set(si); }
        if (Math.abs(pos - lastSlider) > 0.05) { lastSlider = pos; sl.set(pos); }
        const txt = playing ? 'Pause [space]' : 'Play [space]';
        if (txt !== lastPlayTxt) { lastPlayTxt = txt; bPlay.textContent = txt; }
      }

      /* ---------------------------------------------------------- sound */
      let score = null, soundOn = false, bed = null, bedOff = null, foleyTimer = 0, foleyPos = 0;
      function aud() { const a = AU(); return a && a.ready ? a : null; }
      function ui(name, o) { const a = AU(); try { if (a && a.ui && typeof a.ui[name] === 'function') a.ui[name](o); } catch (e) {} }
      function play(name, ...args) {
        const a = aud();
        if (!soundOn || !a || !a.enabled || !a.play) return false;
        const f = a.play[name];
        if (typeof f !== 'function') return false;
        try { f(...args); return true; } catch (e) { return false; }
      }
      const bus = () => api.bus();
      function getScore() {
        if (score) return score;
        const BS = window.Site && window.Site.BuildScore, b = bus(), a = aud();
        if (!BS || typeof BS.create !== 'function' || !b || !a) return null;
        try { score = BS.create(a, b) || null; } catch (e) { console.warn('[build] BuildScore.create failed', e); score = null; }
        return score;
      }
      function scorePlay(at) {
        if (!soundOn || mode !== 'film' || !playing) return;
        const s = getScore();
        if (s) { try { s.play(Math.max(0, Math.min(DUR, at))); } catch (e) { console.warn('[build] score.play', e); } }
        startFoley();
      }
      function scoreStop(fade) {
        stopFoley();
        if (score) { try { score.stop(fade == null ? 0.3 : fade); } catch (e) {} }
      }
      let scrubTimer = 0;
      function scoreRestartSoon() {
        if (!soundOn) return;
        if (score && score.playing) scoreStop(0.06);
        clearTimeout(scrubTimer);
        scrubTimer = setTimeout(() => { if (mode === 'film' && playing) scorePlay(pos); }, 160);
      }
      // Microsound that is tied to what is on screen (keystrokes, slams, card jumps) — scheduled against the
      // score's clock so it lands on the same 16th grid as the music. Levels stay under the music.
      const FOLEY = buildFoley();
      function buildFoley() {
        const ev = [];
        const add = (sec, lt, k, p) => ev.push({ t: SECTIONS[sec].t0 + lt, k, p: p || 0 });
        const typedSpec = (sec, s) => {
          if (s.slam) { add(sec, s.at, 'slam'); return; }
          let prev = 0;
          for (let lt = s.at != null ? s.at : (s.stops ? s.stops[0][0] : s.parts[0].at); lt < SECTIONS[sec].t1 - SECTIONS[sec].t0; lt += S16) {
            const v = visAt(s, lt + 1e-4);
            if (v > prev) { add(sec, lt, s.stops ? 'slam' : 'key', v - prev); prev = v; }
            if (v >= s.n) break;
          }
        };
        [[0, 's0'], [1, 's1a'], [1, 's1b'], [1, 's1c'], [2, 's2a'], [2, 's2b'], [3, 's3a'], [3, 's3b'], [3, 's3c'], [4, 's4a'], [4, 's4b'], [5, 's5a'], [5, 's5b'],
          [6, 's6a'], [6, 's6b'], [6, 's6c'], [7, 's7a'], [7, 's7b'], [7, 's7c'], [8, 's8b'], [8, 's8c'], [9, 's9a'], [9, 's9b'], [9, 's9d'], [10, 's10a'], [10, 's10b'], [10, 's10c'], [10, 's10d'], [10, 's10e']]
          .forEach(([sec, k]) => typedSpec(sec, SP[k]));
        SP.s9c.forEach(s => typedSpec(9, s));
        for (let i = 0; i < 8; i++) add(0, lb(4) + i * S16, 'flip', i);
        [[1, lb(1, 1)], [1, lb(1, 3)], [1, lb(2, 1)], [2, lb(4, 4)], [4, lb(1, 4)], [4, lb(2, 4)], [7, lb(4, 3)]].forEach(([s, t], i) => add(s, t, 'flash', i));
        [[5, lb(2, 1)], [5, lb(2, 2)], [5, lb(4, 3)], [8, lb(1) + 7 * BEAT / 2]].forEach(([s, t], i) => add(s, t, 'card', i));
        for (let i = 0; i < HEX.rows.length; i++) add(3, lb(4, 2) + i * S16 * 0.9, 'row', i);
        for (let c = 1; c < 8; c++) add(4, lb(3) + BEAT * (1 + c), 'col', CODE.active[c]);
        add(4, lb(3) + BEAT, 'snap');
        for (let k = 0; k < 24; k += 3) add(6, lb(3) + k * S16 * 0.33, 'shell', k);
        for (let i = 0; i < 16; i++) add(7, lb(3) + i * S16 * 4 / 4, 'hist', i);
        add(7, lb(4), 'snap');
        NAME_T.forEach((t, i) => add(8, t, 'name', i));
        for (let i = 0; i < 4; i++) add(9, charTime(SP.s9a, 50) + i * S16 + S16, 'ping', i);
        PRESS.forEach((p, i) => add(9, lb(4, 3) + i * S16, 'press', i));
        for (let i = 0; i < HERMES_WORDS.length; i++) add(8, i * BEAT / 2, 'word', i);
        return ev.sort((a, b) => a.t - b.t);
      }
      function foleyFire(e, when) {
        const a = aud(); if (!a) return;
        const dest = bus(), D = (i, o) => a.degree(i, o);
        const pan = ((e.t * 7.3) % 2) - 1;
        switch (e.k) {
          case 'key': if (!play('click', { when, gain: 0.22, pan: pan * 0.4, dest })) play('hat', { when, gain: 0.05, dest }); break;
          case 'slam': if (!play('glitch', { when, repeats: 3, len: 0.018, gain: 0.25, dest })) play('click', { when, gain: 0.3, dest }); break;
          case 'flip': play('tick', D(e.p, 2), { when, gain: 0.35, pan: (e.p / 7) * 1.2 - 0.6, dest }); break;
          case 'flash': play('bit', D(4 + (e.p % 3), 1), { when, gain: 0.3, dest }); break;
          case 'card': play('grain', D(2 + e.p, 1), { when, gain: 0.45, bright: 0.7, dest }); break;
          case 'row': play('data', { when, dur: S16 * 0.8, density: 60, gain: 0.18, spread: 0.9, dest }); break;
          case 'col': play('tick', D(e.p % 5, 3), { when, gain: 0.35, dest }); break;
          case 'snap': play('glitch', { when, repeats: 5, len: 0.02, gain: 0.25, dest }); break;
          case 'shell': play('tick', D(e.p / 3, 2), { when, gain: 0.3, pan: pan, dest }); break;
          case 'hist': play('click', { when, gain: 0.16, pan, dest }); break;
          case 'name': play('tick', D(e.p, 2), { when, gain: 0.3, dest }); break;
          case 'ping': play('grain', D(e.p * 2, 2), { when, gain: 0.35, pan: [0.7, 0.9, 0.3, -0.7][e.p], dest }); break;
          case 'press': play('bit', D(e.p, 2), { when, gain: 0.2, dest }); break;
          case 'word': play('click', { when, gain: 0.12, freq: 2400, dest }); break;
          default: break;
        }
      }
      function startFoley() {
        stopFoley();
        if (!soundOn || !FOLEY_ON) return;
        foleyPos = pos;
        foleyTimer = setInterval(() => {
          const a = aud();
          if (!a || mode !== 'film' || !playing) return;
          const now = a.now(), sp = score && score.playing ? +score.position() : pos;
          if (!isFinite(sp)) return;
          const horizon = sp + 0.12;
          for (const e of FOLEY) {
            if (e.t < foleyPos) continue;
            if (e.t >= horizon) break;
            if (e.t >= sp - 0.02) foleyFire(e, now + Math.max(0, e.t - sp));
          }
          foleyPos = Math.max(foleyPos, horizon);
        }, 25);
      }
      function stopFoley() { clearInterval(foleyTimer); foleyTimer = 0; }
      // The score (build-score.js) is the music; the foley layer adds the on-screen keystrokes etc.
      // It is switched on only when the engine has the microsound voices it needs.
      let FOLEY_ON = true;

      // Settled bed: a quiet granular cloud on D(add9) with sparse tuned ticks — negative space.
      function startBed() {
        stopBed();
        const a = aud();
        if (!soundOn || !a || mode !== 'settled') return;
        const dest = bus(), D = (i, o) => a.degree(i, o);
        try {
          if (typeof a.granular === 'function') bed = a.granular({ density: 5, pitch: [D(0, 1), D(1, 1), D(2, 1), D(4, 1), D(1, 2)], dur: 0.11, spread: 0.9, bright: 0.35, gain: 0.12, dest });
          else if (typeof a.drone === 'function') bed = a.drone([D(0, -1), D(2, 0), D(1, 1)], { gain: 0.05, dest });
        } catch (e) { bed = null; }
        try {
          const r = rng(77);
          bedOff = a.clock && a.clock.on((step, time) => {
            if (!soundOn || mode !== 'settled') return;
            if (step % 32 === 0) play('sub', D(0, -2), { when: time, dur: 0.9, gain: 0.18, dest });
            if (step % 32 === 16) play('tick', D(4, 2), { when: time, gain: 0.16, pan: 0.5, dest });
            if (step % 32 === 22) play('tick', D(2, 2), { when: time, gain: 0.12, pan: -0.5, dest });
            if (r() < 0.045) play('click', { when: time, gain: 0.08, pan: r() * 2 - 1, dest });
          });
        } catch (e) { bedOff = null; }
      }
      function stopBed() {
        if (bed) { try { bed.stop(1.2); } catch (e) {} bed = null; }
        if (bedOff) { try { bedOff(); } catch (e) {} bedOff = null; }
      }
      // quantized one-shot for interactions (hover a phrase → a tuned tick on the next 16th)
      function qwhen(k) {
        const a = aud();
        if (!a) return 0;
        try { const ns = a.clock.nextStep(1); return ns.time + (k || 0) * a.clock.stepDur; } catch (e) { return a.now(); }
      }

      /* ---------------------------------------------------------- transport */
      let mode = 'film', pos = 0, playing = false, bedTimer = 0, tailTimer = 0;
      function seek(at, fromUser) {
        if (mode !== 'film') { mode = 'film'; el.classList.remove('is-settled'); showControls(); api.caption(CAP_FILM); stopBed(); }
        pos = Math.max(0, Math.min(DUR - 0.01, at));
        lastSlider = -1;
        if (fromUser && soundOn && playing) { scoreStop(0.05); scorePlay(pos); }
        render(); syncControls();
      }
      function scrub(v) {
        pos = Math.max(0, Math.min(DUR - 0.01, v));
        lastSlider = pos;
        if (playing) scoreRestartSoon();
        render();
      }
      function togglePlay() {
        if (mode !== 'film') { replay(); return; }
        playing = !playing;
        if (playing) scorePlay(pos); else scoreStop(0.15);
        render(); syncControls();
      }
      function replay() {
        jumpHide(true);
        clearTimeout(bedTimer); clearTimeout(tailTimer);
        mode = 'film'; el.classList.remove('is-settled');
        showControls(); api.caption(CAP_FILM);
        stopBed();
        pos = 0; playing = true; lastSlider = -1; lastSi = -1;
        if (soundOn) { scoreStop(0.05); scorePlay(0); }
        render(); syncControls();
      }
      function settle(why) {
        if (mode === 'settled') return;
        mode = 'settled'; playing = false;
        stopFoley();
        if (why === 'skip') { scoreStop(0.8); play('glitch', { repeats: 4, len: 0.025, gain: 0.3, dest: bus() }); }
        else { clearTimeout(tailTimer); tailTimer = setTimeout(() => { if (mode === 'settled' && score && score.playing) scoreStop(2.5); }, 6000); }
        el.classList.add('is-settled');
        cv.clear();
        showControls();
        api.caption(CAP_SET);
        set.scrollTop = 0;
        requestAnimationFrame(checkSticky);
        clearTimeout(bedTimer);
        bedTimer = setTimeout(() => { if (mode === 'settled' && soundOn) startBed(); }, why === 'skip' ? 900 : 2600);
        if (why === 'skip') ui('open');
      }

      /* ---------------------------------------------------------- settled DOM */
      const set = H('div', { class: 'bd-set' });
      const grid = H('div', { class: 'bd-grid' });
      const poem = H('article', { class: 'bd-poem', 'aria-label': 'Here’s to the builders' });
      const side = H('aside', { class: 'bd-side', 'aria-label': 'Projects and links' });
      grid.append(poem, side); set.append(grid); el.append(set);

      const kReplay = H('button', { type: 'button', class: 'bd-btn', text: '↺ Replay the film' });
      kReplay.addEventListener('click', () => { ui('select'); replay(); });
      kReplay.addEventListener('pointerenter', () => ui('hover'));
      poem.append(H('div', { class: 'bd-kick' }, H('b', { text: 'yashdagade/build' }), H('span', { text: 'Hover a blue phrase' }), kReplay));
      const emSpans = [];
      let dly = 0;
      const stanzaEls = [];
      POEM.forEach((stz, si) => {
        const div = H('div', { class: 'bd-st' + (si === 0 ? ' bd-st--open' : '') }, H('span', { class: 'bd-sn', text: pad2(si + 1) }));
        const p = H('p');
        stz.forEach((ln, li) => {
          if (li) p.append(H('br'));
          ln.forEach(g => {
            if (!g.em) { p.append(g.text); return; }
            const s = H('span', { class: 'bd-em', tabindex: '0', text: g.text });
            s.dataset.ph = g.text;
            emSpans.push(s); p.append(s);
          });
        });
        div.append(p);
        div.style.setProperty('--d', (dly += 0.035).toFixed(3) + 's');
        poem.append(div); stanzaEls.push(div);
      });
      const clo = H('div', { class: 'bd-st bd-close' }, H('span', { class: 'bd-sn', text: '—' }));
      const cp = H('p');
      CLOSING.forEach((ln, li) => { if (li) cp.append(H('br')); cp.append(ln.map(g => g.text).join('')); });
      cp.append(H('span', { class: 'bd-cur', 'aria-hidden': 'true' }));
      clo.append(cp); clo.style.setProperty('--d', (dly += 0.035).toFixed(3) + 's');
      poem.append(clo); stanzaEls.push(clo);
      const attr = H('div', { class: 'bd-attr', text: ATTRIBUTION });
      attr.style.setProperty('--d', (dly += 0.035).toFixed(3) + 's');
      poem.append(attr);

      // side: index
      const years = PROJECTS.map(p => p.y0);
      const nPapers = 3;
      const sortY = H('button', { type: 'button', class: 'is-on', text: 'Year' });
      const sortF = H('button', { type: 'button', text: 'Field' });
      const secIndex = H('section', { class: 'bd-index' });
      const ihead = H('div', { class: 'bd-sh' }, H('span', { text: `INDEX · ${PROJECTS.length} projects` }), H('span', { class: 'bd-sort' }, 'Sort', sortY, sortF));
      secIndex.append(ihead);
      const SVGNS = 'http://www.w3.org/2000/svg';
      const S = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
      const tl = S('svg', { class: 'bd-tl', 'aria-hidden': 'true' });
      const X = y => (4 + ((y - 2022) / 4) * 92).toFixed(2) + '%';
      tl.append(S('line', { x1: '0%', x2: '100%', y1: '48.5', y2: '48.5', stroke: C.ink, 'stroke-width': '1' }));
      for (let y = 2022; y <= 2026; y++) {
        tl.append(S('line', { x1: X(y), x2: X(y), y1: '48', y2: '52', stroke: C.ink, 'stroke-width': '1' }));
        const tx = S('text', { x: X(y), y: '64', 'text-anchor': y === 2022 ? 'start' : y === 2026 ? 'end' : 'middle' }); tx.textContent = String(y); tl.append(tx);
      }
      const lanes = {}, markers = {};
      PROJECTS.slice().sort((a, b) => a.y0 - b.y0).forEach(p => {
        const g = S('g', { class: 'mk' });
        if (p.y1) {
          const lane = 4, yy = 40 - lane * 8;
          g.append(S('line', { x1: X(p.y0), x2: X(p.y1), y1: String(yy + 0.5), y2: String(yy + 0.5), stroke: 'currentColor', class: 'ld', style: 'opacity:.9;stroke:var(--ink);stroke-dasharray:none' }));
          [p.y0, p.y1].forEach(y => { const s = S('svg', { x: X(y), y: String(yy), overflow: 'visible' }); s.append(S('path', { d: 'M-3.5 0.5H3.5M0 -3V4' })); g.append(s); });
        } else {
          const lane = (lanes[p.y0] = (lanes[p.y0] || 0) + 1) - 1 + (p.y0 === 2022 || p.y0 === 2024 ? 0 : 0);
          const yy = 40 - lane * 8;
          const s = S('svg', { x: X(p.y0), y: String(yy), overflow: 'visible' });
          s.append(S('line', { class: 'ld', x1: '0.5', x2: '0.5', y1: '0', y2: String(48 - yy) }));
          s.append(S('path', { d: 'M-3.5 0.5H3.5M0 -3V4' }));
          s.append(S('rect', { x: '-5', y: '-5', width: '10', height: '10' }));
          g.append(s);
        }
        markers[p.id] = g; tl.append(g);
      });
      secIndex.append(tl);
      const list = H('div', { class: 'bd-list' });
      secIndex.append(list);
      const rows = {};
      PROJECTS.forEach((p, i) => {
        const ext = p.href && /^https?:/.test(p.href);
        const r = H(p.href ? 'a' : 'div', { class: 'bd-row', href: p.href || null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, tabindex: p.href ? null : '0' },
          H('span', { class: 'no', text: pad2(i + 1) }),
          H('span', { class: 'nm' }, H('span', { class: 'n' }, p.name, p.href ? H('i', { text: ext ? '↗' : '→' }) : null), H('span', { class: 'o', text: p.one })),
          H('span', { class: 'yr' }, p.year, H('span', { text: p.field })));
        r.dataset.id = p.id;
        rows[p.id] = r; list.append(r);
      });
      const secElse = H('section', { class: 'bd-else' }, H('div', { class: 'bd-sh' }, H('span', { text: 'ELSEWHERE' }), H('span', { class: 'm', text: `${nPapers} papers · 1 patent application` })));
      const ll = H('div', { class: 'bd-links' });
      SOCIALS.forEach(s => {
        const ext = /^https?:/.test(s.href) || /\.pdf$/.test(s.href);
        ll.append(H('a', { href: s.href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, H('span', { text: s.label }), ext && /^https?:/.test(s.href) ? ' ↗' : ''));
      });
      const ll2 = H('div', { class: 'bd-links bd-links--sub' },
        H('a', { href: 'press.html' }, H('span', { text: 'Press' })), H('a', { href: 'build.html' }, H('span', { text: 'Read as text' })), H('a', { href: 'about.html' }, H('span', { text: 'About' })));
      secElse.append(ll, ll2);
      const secFr = H('section', { class: 'bd-fr' }, H('div', { class: 'h', text: '<< check out my friends’ sites >>' }));
      const fl = H('div', { class: 'bd-links' });
      FRIENDS.forEach(f => fl.append(H('a', { href: f.href, target: '_blank', rel: 'noopener' }, H('span', { text: f.label }))));
      secFr.append(fl);
      const tail = H('div', { class: 'bd-tail' });
      side.append(secIndex); tail.append(secElse, secFr); grid.append(tail);
      [secIndex, secElse, secFr].forEach((n, i) => n.style.setProperty('--d', (0.25 + i * 0.12).toFixed(2) + 's'));
      [side, tail].forEach(c => c.querySelectorAll('a').forEach(a => { a.addEventListener('pointerenter', () => ui('hover')); a.addEventListener('click', () => ui('select')); }));

      function checkSticky() {
        try { side.classList.toggle('is-sticky', innerWidth >= 1200 && side.offsetHeight <= set.clientHeight - 40); } catch (e) {}
      }

      // sort (FLIP)
      function sortBy(kind) {
        sortY.classList.toggle('is-on', kind === 'year'); sortF.classList.toggle('is-on', kind === 'field');
        const before = {}; Object.values(rows).forEach(r => { before[r.dataset.id] = r.offsetTop; });
        const ord = PROJECTS.slice();
        if (kind === 'field') ord.sort((a, b) => FIELDS.indexOf(a.field) - FIELDS.indexOf(b.field) || b.y0 - a.y0);
        ord.forEach((p, i) => { rows[p.id].querySelector('.no').textContent = pad2(i + 1); list.append(rows[p.id]); });
        Object.values(rows).forEach(r => {
          const d = before[r.dataset.id] - r.offsetTop;
          if (!d) return;
          r.style.transition = 'none'; r.style.transform = `translateY(${d}px)`;
          requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'; r.style.transform = ''; }));
        });
        ui('select');
        play('data', { dur: 0.3, density: 36, gain: 0.14, spread: 1, dest: bus() });
      }
      sortY.addEventListener('click', () => sortBy('year'));
      sortF.addEventListener('click', () => sortBy('field'));
      [sortY, sortF].forEach(b => b.addEventListener('pointerenter', () => ui('hover')));

      function jumpTo(i) {
        const target = [poem, secIndex, secFr][i];
        const two = innerWidth >= 1200;
        let top = two && i === 1 ? 0 : Math.max(0, target.offsetTop - 30);
        if (i === 0) top = 0;
        try { set.scrollTo({ top, behavior: api.reduced ? 'auto' : 'smooth' }); } catch (e) { set.scrollTop = top; }
        const hd = i === 0 ? null : target.querySelector('.bd-sh, .h');
        if (hd) { hd.classList.remove('is-flash'); void hd.offsetWidth; hd.classList.add('is-flash'); }
      }

      /* ---------------------------------------------------------- generated card images */
      function genCanvas(w, h, draw) {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
        draw(g, w, h); return c;
      }
      function genCode() {
        return genCanvas(600, 375, (g, w, h) => {
          const { D, T, v } = CODE, cs = 21, x0 = 48, y0 = 150;
          for (let c = 0; c < T; c++) for (let d = 0; d < D; d++) {
            const val = v[c][d], cx = x0 + d * cs, cy = y0 + c * cs;
            if (val <= 0) { g.fillStyle = '#bbb'; g.fillRect(cx - 3, cy, 7, 1); g.fillRect(cx, cy - 3, 1, 7); }
            else { const s = Math.max(3, Math.min(10, val * 8)); g.fillStyle = C.accent; g.globalAlpha = c === T - 1 ? 1 : 0.5 + c * 0.06; g.fillRect(cx - s / 2, cy - s / 2, s, s); g.globalAlpha = 1; }
          }
          g.fillStyle = '#000'; g.font = '15px ' + FN.mono;
          g.fillText('sparse latent rollout', 38, 56); g.fillStyle = '#666';
          g.fillText(`t: ${CODE.active[0]} / 24 dims active · toy, illustrative`, 38, 80);
          g.fillText('rows: t → t+7', 38, 104);
        });
      }
      function genTitle(p) {
        return genCanvas(600, 340, (g, w, h) => {
          g.strokeStyle = '#ccc';
          for (let x = 30; x < w; x += 30) for (let y = 30; y < h; y += 30) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
          g.fillStyle = '#fff'; g.fillRect(24, h - 128, w - 48, 104);
          g.fillStyle = C.accent; g.fillRect(w - 66, 54, 12, 12);
          g.fillStyle = '#000'; g.font = '400 38px ' + FN.serif; g.fillText(p.name, 34, h - 78);
          g.fillStyle = '#555'; g.font = '15px ' + FN.mono;
          const words = p.one.split(' '); let line = '', y = h - 50;
          words.forEach(wd => { if (g.measureText(line + wd).width > w - 80) { g.fillText(line, 34, y); line = ''; y += 20; } line += wd + ' '; });
          g.fillText(line, 34, y);
        });
      }
      function genText(title, lines) {
        return genCanvas(600, 300, (g, w, h) => {
          g.fillStyle = C.accent; g.fillRect(34, 36, 10, 10);
          g.fillStyle = '#000'; g.font = '400 40px ' + FN.serif; g.fillText(title, 34, 104);
          g.font = '17px ' + FN.mono;
          lines.forEach((l, i) => { g.fillStyle = i === 0 ? '#000' : '#555'; g.fillText(l, 34, 150 + i * 26); });
          for (let x = 420; x < w - 20; x += 24) for (let y = 40; y < 130; y += 24) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
        });
      }
      function genPair(a, b) {
        const H2 = 360, w1 = Math.round(H2 * aspect(a)), w2 = Math.round(H2 * aspect(b));
        return genCanvas(w1 + w2 + 12, H2, g => { if (ready(a)) g.drawImage(a, 0, 0, w1, H2); if (ready(b)) g.drawImage(b, w1 + 12, 0, w2, H2); });
      }
      function genMosaic(list9) {
        const cw = 200, ch = 140, gp = 6;
        return genCanvas(cw * 3 + gp * 2, ch * 3 + gp * 2, g => {
          list9.forEach((im, i) => {
            if (!ready(im)) return;
            const x = (i % 3) * (cw + gp), y = Math.floor(i / 3) * (ch + gp), ir = aspect(im), r = cw / ch;
            let sw, sh, sx, sy; const iw = im.naturalWidth, ih = im.naturalHeight;
            if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) / 2; }
            g.drawImage(im, sx, sy, sw, sh, x, y, cw, ch);
          });
        });
      }
      const toURL = (c, jpg) => { try { return c.toDataURL(jpg ? 'image/jpeg' : 'image/png', 0.88); } catch (e) { return null; } };

      /* ---------------------------------------------------------- hover wiring (poem + index) */
      const byProj = {};
      emSpans.forEach(s => { const cfg = HOVER[s.dataset.ph]; (cfg && cfg.proj || []).forEach(id => { (byProj[id] = byProj[id] || []).push(s); }); });
      function litProj(ids, on) { (ids || []).forEach(id => { if (rows[id]) rows[id].classList.toggle('is-lit', on); if (markers[id]) markers[id].classList.toggle('is-lit', on); }); }
      function litPhr(id, on) { (byProj[id] || []).forEach(s => s.classList.toggle('is-lit', on)); if (markers[id]) markers[id].classList.toggle('is-lit', on); }
      let wired = false;
      async function wire() {
        if (wired) return;
        wired = true;
        try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
        await Promise.all(Object.values(imgs).map(loaded));
        const genCodeURL = toURL(genCode());
        emSpans.forEach((s, k) => {
          const ph = s.dataset.ph, cfg = HOVER[ph];
          if (!cfg) return;
          const enter = () => {
            litProj(cfg.proj, true);
            const a = aud();
            if (a) play('tick', a.degree(k % 10, 2), { when: qwhen(0), gain: 0.4, pan: ((k % 5) - 2) * 0.2, dest: bus() });
          };
          const leave = () => litProj(cfg.proj, false);
          s.addEventListener('pointerenter', enter); s.addEventListener('pointerleave', leave);
          s.addEventListener('focus', enter); s.addEventListener('blur', leave);
          if (cfg.mode === 'jump' || cfg.mode === 'flip' || cfg.mode === 'friends') {
            s.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') jumpShow(s, cfg); });
            s.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') jumpHideSoon(); });
            s.addEventListener('focus', () => jumpShow(s, cfg)); s.addEventListener('blur', () => jumpHideSoon());
            s.addEventListener('click', () => { if (jState && jState.span === s && jState.touch) jumpHide(true); else { jumpShow(s, cfg); if (jState) jState.touch = true; } });
            return;
          }
          let src = cfg.src ? cfg.src : null, width;
          if (cfg.gen === 'code') src = genCodeURL;
          if (cfg.mode === 'pair') { src = toURL(genPair(img(cfg.srcs[0]), img(cfg.srcs[1])), true); width = innerWidth < 800 ? 260 : 400; }
          if (cfg.mode === 'mosaic') { src = toURL(genMosaic(cfg.srcs.map(img)), true); width = innerWidth < 800 ? 240 : 330; }
          if (cfg.mode === 'text') { src = toURL(genText(cfg.title, cfg.lines)); width = innerWidth < 800 ? 220 : 280; }
          if (cfg.w && !width) width = innerWidth < 800 ? Math.min(220, cfg.w) : cfg.w;
          api.reveal(s, { src, title: cfg.title, meta: cfg.meta, href: cfg.href || null, width });
        });
        PROJECTS.forEach(p => {
          const r = rows[p.id];
          let src = p.img || null;
          if (p.gen === 'code') src = genCodeURL;
          if (p.gen === 'title') src = toURL(genTitle(p));
          api.reveal(r, { src, title: p.name, meta: `${p.year} · ${p.meta}`, width: p.w ? Math.min(p.w, 260) : undefined });
          r.addEventListener('pointerenter', () => litPhr(p.id, true));
          r.addEventListener('pointerleave', () => litPhr(p.id, false));
          r.addEventListener('focus', () => litPhr(p.id, true));
          r.addEventListener('blur', () => litPhr(p.id, false));
          const mk = markers[p.id];
          if (mk) {
            mk.addEventListener('pointerenter', () => { r.classList.add('is-lit'); litPhr(p.id, true); ui('hover'); });
            mk.addEventListener('pointerleave', () => { r.classList.remove('is-lit'); litPhr(p.id, false); });
          }
        });
      }

      /* ---------------------------------------------------------- jump-out callouts (settled) */
      const jl = H('div', { class: 'bd-jl' });
      const jsvg = S('svg', {});
      jl.append(jsvg); el.append(jl);
      let jState = null;
      function jumpHideSoon() {
        if (!jState) return;
        clearTimeout(jState.hideT);
        const st0 = jState;
        st0.hideT = setTimeout(() => { if (jState === st0) jumpHide(true); }, 240);
      }
      function jumpHide() {
        if (!jState) return;
        const s0 = jState; jState = null;
        clearTimeout(s0.hideT); s0.timers.forEach(clearTimeout);
        s0.nodes.forEach(n => n.remove());
      }
      function jumpShow(span, cfg) {
        if (jState && jState.span === span) { clearTimeout(jState.hideT); return; }
        jumpHide();
        const mob = innerWidth < 800;
        const items = cfg.mode === 'flip' ? [{ flip: cfg.srcs, title: cfg.title, meta: cfg.meta }]
          : cfg.mode === 'friends' ? FRIENDS.map(f => ({ text: f.label, title: f.name, meta: f.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: f.href }))
          : cfg.cards;
        const rects = span.getClientRects(), r = rects[rects.length - 1] || span.getBoundingClientRect();
        const vw = innerWidth, vh = innerHeight, n = items.length;
        const textual = cfg.mode === 'friends';
        const cw = textual ? (mob ? Math.min(160, (vw - 44) / 2) : 150) : cfg.mode === 'flip' ? (mob ? 220 : 280) : (mob ? Math.min(180, (vw - 44) / 2) : 250);
        const hts = items.map(it => (it.text ? 58 : Math.round((cw - 10) / (it.flip ? 1.6 : aspect(img(it.src)))) + 10 + 20));
        const pos2 = [];
        const pr = poem.getBoundingClientRect(), colX = Math.max(r.right + 48, pr.right + 28);
        const roomR = vw - colX - (mob ? 16 : 150);
        if (!mob && roomR >= cw + 20) {
          const total = hts.reduce((a, b) => a + b, 0) + (n - 1) * 18;
          let y = Math.max(76, Math.min(vh - 96 - total, r.top + r.height / 2 - total / 2));
          items.forEach((it, i) => { pos2.push([colX + (i % 2) * 36, y]); y += hts[i] + 18; });
        } else {
          const perRow = Math.max(1, Math.min(n, Math.floor((vw - 32 + 12) / (cw + 12))));
          const rowsN = Math.ceil(n / perRow), maxH = Math.max(...hts);
          const total = perRow * cw + (perRow - 1) * 12;
          const x0 = Math.max(16, Math.min(vw - 16 - total, r.left + r.width / 2 - total / 2));
          let y0 = r.bottom + 26;
          if (y0 + rowsN * (maxH + 14) > vh - (mob ? 110 : 90)) y0 = Math.max(70, r.top - 26 - rowsN * (maxH + 14));
          items.forEach((it, i) => pos2.push([x0 + (i % perRow) * (cw + 12), y0 + Math.floor(i / perRow) * (maxH + 14)]));
        }
        const st0 = { span, cfg, nodes: [], timers: [], hideT: 0, flipImgs: null, flipI: 0, flipAt: 0 };
        const below = pos2[0] && pos2[0][1] > r.bottom;
        const ax = below || pos2[0][1] + 20 < r.top ? r.left + Math.min(r.width, 40) : r.right + 4, ay = below ? r.bottom + 2 : (pos2[0][1] + 20 < r.top ? r.top - 2 : r.top + r.height / 2);
        const anchor = S('rect', { class: 'an', x: String(ax - 2), y: String(ay - 2), width: '4', height: '4' });
        jsvg.append(anchor); st0.nodes.push(anchor);
        const a = aud(), sd = a && a.clock ? a.clock.stepDur : S16;
        const w0 = a && soundOn ? qwhen(0) : 0, now0 = a ? a.now() : 0;
        items.forEach((it, i) => {
          const [x, y] = pos2[i];
          const c = H(it.href ? 'a' : 'div', { class: 'bd-jc', href: it.href || null, target: it.href && /^https?:/.test(it.href) ? '_blank' : null, rel: it.href ? 'noopener' : null });
          c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px'; c.style.width = Math.round(cw) + 'px';
          const fr = H('span', { class: 'fr' });
          if (it.text) fr.append(H('span', { class: 'tx', text: it.text }));
          else {
            const im = H('span', { class: 'im' });
            im.style.height = Math.round((cw - 10) / (it.flip ? 1.6 : aspect(img(it.src)))) + 'px';
            if (it.flip) { st0.flipImgs = it.flip.map((src, j) => { const e = H('img', { src, alt: '', class: j === 0 ? 'on' : '' }); im.append(e); return e; }); }
            else im.append(H('img', { src: it.src, alt: it.title || '' }));
            fr.append(im);
          }
          c.append(fr, H('span', { class: 'mt' }, H('span', { class: 't', text: it.title || '' }), H('span', { class: 'm', text: it.meta || '' })));
          c.addEventListener('pointerenter', () => { clearTimeout(st0.hideT); });
          c.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') jumpHideSoon(); });
          if (it.href) c.addEventListener('click', () => ui('select'));
          jl.append(c); st0.nodes.push(c);
          // dashed leader: anchor → card edge (elbow)
          const bx = below || y + 20 < r.top ? x + 12 : x - 2, by = below ? y - 2 : (y + 20 < r.top ? y + hts[i] + 2 : y + 18);
          const mx = below || y + 20 < r.top ? ax : ax + Math.max(14, (bx - ax) * 0.45);
          const d = below || y + 20 < r.top ? `M${ax} ${ay} V${(ay + by) / 2} H${bx} V${by}` : `M${ax} ${ay} H${mx} L${bx} ${by}`;
          const path = S('path', { class: 'ld', d });
          jsvg.append(path); st0.nodes.push(path);
          const step = cfg.mode === 'friends' ? 1 : 2;
          const delay = a && soundOn ? Math.max(0, w0 + i * step * sd - now0) * 1000 : i * (cfg.mode === 'friends' ? 70 : 130);
          st0.timers.push(setTimeout(() => {
            if (jState !== st0) return;
            c.classList.add('is-in'); path.classList.add('is-in'); anchor.classList.add('is-in');
          }, delay));
          const aa = aud();
          if (aa) {
            const when = soundOn ? w0 + i * step * sd : 0;
            if (cfg.mode === 'friends') play('grain', aa.degree(i * 2, 2), { when, gain: 0.3, pan: -0.6 + i * 0.4, dest: bus() }) || play('tick', aa.degree(i * 2, 2), { when, gain: 0.3, dest: bus() });
            else if (!it.flip) play('grain', aa.degree(2 + i * 2, 1), { when, gain: 0.45, bright: 0.7, pan: i ? 0.35 : -0.2, dest: bus() }) || play('tick', aa.degree(2 + i * 2, 2), { when, gain: 0.4, dest: bus() });
          }
        });
        if (cfg.mode !== 'friends') ui('hover');
        jState = st0;
      }
      set.addEventListener('scroll', () => { if (jState) jumpHide(); scrollTicks(); }, { passive: true });
      document.addEventListener('pointerdown', e => {
        if (!jState || !jState.touch) return;
        if (e.target === jState.span || jl.contains(e.target)) return;
        jumpHide();
      }, true);

      // reading = ticks: crossing a stanza boundary while scrolling plays one quiet tuned tick
      let stanzaTops = null, lastStanza = -1, lastTickAt = 0;
      function scrollTicks() {
        if (!soundOn || mode !== 'settled') return;
        if (!stanzaTops) stanzaTops = stanzaEls.map(s => s.offsetTop);
        const mid = set.scrollTop + set.clientHeight * 0.45;
        let k = 0; for (let i = 0; i < stanzaTops.length; i++) if (stanzaTops[i] <= mid) k = i;
        if (k !== lastStanza) {
          const now = performance.now();
          if (lastStanza >= 0 && now - lastTickAt > 80) { const a = aud(); if (a) play('tick', a.degree(k % 10, 2), { when: qwhen(0), gain: 0.22, pan: ((k % 7) - 3) * 0.15, dest: bus() }); lastTickAt = now; }
          lastStanza = k;
        }
        const y = set.scrollTop + 40, two = innerWidth >= 1200;
        const idx = y >= secFr.offsetTop - set.clientHeight * 0.6 ? 2 : !two && y >= secIndex.offsetTop - 60 ? 1 : 0;
        if (idx !== st2.get() && !(two && st2.get() === 1 && idx === 0 && set.scrollTop < 10)) st2.set(idx);
      }

      function settledTick(t) {
        if (jState && jState.flipImgs) {
          const now = performance.now();
          if (now - jState.flipAt > 110) {
            jState.flipAt = now;
            jState.flipImgs[jState.flipI].classList.remove('on');
            jState.flipI = (jState.flipI + 1) % jState.flipImgs.length;
            jState.flipImgs[jState.flipI].classList.add('on');
            const a = aud();
            if (a && jState.flipI % 2 === 0) play('tick', a.degree(jState.flipI, 3), { gain: 0.16, pan: jState.flipI / 7 - 0.5, dest: bus() });
          }
        }
      }

      /* ---------------------------------------------------------- loop */
      api.loop((t, dt) => {
        if (mode !== 'film') { settledTick(t); return; }
        if (playing) {
          let p = pos + dt;
          if (soundOn && score && score.playing) {
            const sp = +score.position();
            if (isFinite(sp)) { const err = sp - p; p = Math.abs(err) > 0.35 ? sp : p + err * 0.12; }
          }
          pos = Math.max(0, Math.min(DUR, p));
          if (pos >= SETTLE_AT) { settle('end'); return; }
        }
        render();
        syncControls();
      });
      api.onResize(() => { relayout(); resetText(); stanzaTops = null; checkSticky(); if (mode === 'film') render(); jumpHide(); showControls(); });
      api.links(SOCIALS.map(s => ({ label: s.label, href: s.href })));
      setTimeout(wire, 60);
      // tiny inspection hook (used by visual tests): el._bd.seek(seconds), el._bd.state()
      el._bd = { seek: s => { if (mode !== 'film') replay(); seek(s, true); }, state: () => ({ mode, pos, playing, soundOn, score: !!score, scorePlaying: !!(score && score.playing) }), pause: () => { if (playing) togglePlay(); } };

      /* ---------------------------------------------------------- lifecycle */
      return {
        enter() {
          jumpHide();
          clearTimeout(bedTimer); clearTimeout(tailTimer);
          el.classList.remove('is-settled');
          mode = 'film'; pos = 0; playing = true; lastSi = -1; lastSlider = -1;
          if (api.reduced) { settle('skip'); return; }
          showControls(); api.caption(CAP_FILM);
          relayout(); render(); syncControls();
          setTimeout(() => { if (api.isActive() && aud() && mode === 'film' && pos < 3) api.hint('Space pause · Enter skip to the index', 3200); }, 1400);
        },
        exit() {
          playing = false;
          scoreStop(0.3); stopBed(); jumpHide();
          clearTimeout(bedTimer); clearTimeout(tailTimer); clearTimeout(scrubTimer);
        },
        sound(on) {
          soundOn = !!on;
          if (soundOn) {
            const a = aud();
            FOLEY_ON = !!(a && a.play && typeof a.play.click === 'function');
            if (mode === 'film' && playing) scorePlay(pos);
            else if (mode === 'settled') startBed();
          } else { scoreStop(0.25); stopBed(); }
        },
        key(e) {
          const k = e.key;
          if (k === ' ' || k === 'Spacebar') { if (mode === 'film') togglePlay(); else replay(); ui('tick'); return true; }
          if (k === 'Enter') { if (mode === 'film') { ui('select'); settle('skip'); return true; } return false; }
          if (k === 'r' || k === 'R') { ui('select'); replay(); return true; }
          if (k === 'ArrowDown' || k === 'ArrowUp') {
            const d = k === 'ArrowDown' ? 1 : -1;
            if (mode === 'film') {
              let si = 0; for (let i = 0; i < STEPS.length; i++) if (pos >= lb(STEPS[i].bar) - 0.01) si = i;
              let ni = si + d;
              if (d < 0 && pos - lb(STEPS[si].bar) > 1.2) ni = si;
              if (ni >= STEPS.length) { settle('skip'); ui('select'); return true; }
              ni = Math.max(0, ni);
              st.set(ni); ui('tick'); seek(lb(STEPS[ni].bar), true);
            } else {
              const ni = Math.max(0, Math.min(2, st2.get() + d));
              st2.set(ni); ui('tick'); jumpTo(ni);
            }
            return true;
          }
          return false;
        },
      };
    },
  });
})();
