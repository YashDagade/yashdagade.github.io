/* Scene 5 — Build: "Here's to the builders".
 *
 * Film mode: a 44-bar, 118 BPM music video of Yash's build poem. Lines type on with a block cursor on
 * the 16th-note grid, emphasized phrases ink to deep blue, and hairline vignettes of the work (LpWM sparse latent
 * rollout, Rectified LpJEPA histogram, Radial-VCReg burst, SkyWindFarm turbines in the sky, the robot's CAD render;
 * every "[n]" chip reads the live scene order: SN / readSN), Paradigm-film hex dumps / node grids and project photos
 * cut in on the beat.
 * The film's grammar (block cursor on 16ths, hex dumps, node grids) nods to Paradigm's Fourth Fund film;
 * it is credited at the end of the film and under the poem.
 * Bits & atoms (round 4): the film opens on a workbench, a terminal (bits) beside a hairline robot arm that
 * assembles a SkyWindFarm unit (atoms), and peaks in bar 42 on an assembly engine that builds six more, then
 * "system active" on the bar-43 downbeat (BENCH, ENG, bench(), engine()). Every one of their visual events is a
 * FOLEY event at the same film second, voiced with the round-4 micro-foley kit (play.key / servo / arm /
 * pneumatic / snap / relay / compile / ping / chime, cnc()), each guarded with a fallback to the older voices.
 * The typed poem is voiced as real keystrokes: a space bar on spaces, a key press otherwise, an Enter on slams.
 * The projects-by-year grouping of the index is called "Stints" (the owner's word).
 * Music is on by default: arriving by any gesture (key 5, arrows, index, menu, Find, a swipe) the film and the score
 * start together at 0:00; a direct link (no gesture yet) plays the film silently under a "Play with sound" pill.
 * The biped (the #robot page) appears as ONE photo (the owner's pick) closing the cold-open montage, as its CAD
 * line-art render (site/img/robot/renders/, exported by the robot page; guarded while missing) in the finale's panel
 * of the four scenes, in its Stints row (thumbnail + its scene chip → #robot) and, photo + render, on
 * "And they yearn to build".
 * Settled mode: the full poem in serif with hoverable phrases (project images + curated personal photos),
 * an index of every project with thumbnails (hover → image, click → link), socials, other pages, friends' sites and
 * the attribution lines. SkyWindFarm units and tethers are drawn with Site.art.swfUnit / swfTether
 * (exported by skywindfarm.js, so both scenes share one glyph); a local fallback draws them if it's missing.
 *
 * The soundtrack lives in build-score.js (window.Site.BuildScore). Integration contract used here:
 *   const s = Site.BuildScore.create(Site.audio, busGainNode)
 *   s.play(atSeconds)   start (or restart) the 44-bar score from a film position
 *   s.stop(fadeSec)     fade out and stop
 *   s.playing           bool (a getter or a method is accepted)
 *   s.position()        film seconds at the audio clock: what is being SCHEDULED (the foley uses it / timeAt())
 *   s.heardPosition()   film seconds the listener hears now (position − output latency): the PICTURE follows it
 *   s.timeAt(sec)       context time of a film second (foley `when`)
 *   s.typing([sec])     on-screen keystroke and machine-event times: the score drops its click row around them
 * (heardPosition / timeAt / typing are used when present; position() alone still works.)
 * "System active" (bar 43.1): build.js plays the compile-success chime itself unless a playing score declares its own
 * resolution (Site.BuildScore.resolves, or a section named resolve / success / active / compile). The assembly engine
 * of bar 42 is timed on the score's accelerating Enter line (Site.BuildScore.accel; the same series is computed here
 * if it is missing), so its rams and snap-fits land on those keystrokes. At the end of the
 * film the settled bed comes in 1.2 s after the frame dissolves while the score rings out (faded from 4.5 s).
 * This file owns the visual timeline (a seconds counter, slaved to the score's audio clock while it
 * plays), the on-screen microsound (keystrokes, slams, card jumps) and the dark settled/paused bed.
 * Math in the film is typeset with KaTeX in HTML overlays that track the canvas (mlabel()).
 * Data (poem, catalog, hover map, links, timeline) comes from the scene-5 brief (projects.md).
 */
(function () {
  'use strict';

  /* ================================================================== timing */
  const BPM = 118, BEAT = 60 / BPM, BAR = 4 * BEAT, S16 = BEAT / 4, BARS = 44, DUR = BARS * BAR; // 89.49 s
  const lb = (bar, beat = 1, s = 0) => (bar - 1) * BAR + (beat - 1) * BEAT + s * S16;
  const SETTLE_AT = lb(44, 4); // bar 44 beat 4: the frame (credits held for a beat) dissolves into the interactive poem
  const RETURN_MS = 60000; // re-entering [5] within this long after the film settled opens the index; later, the film again

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
  // The site's scene numbers. Every "[n]" chip in the film and the index reads them here. They are read from the
  // live registry when the scene is created (readSN), so a reorder in the scene files never leaves a stale chip:
  // a hidden page (menu / Find only) has no number (null), and its chips drop the "[n]" (or name the page instead).
  const SID = { lpwm: 'lpwm', lpjepa: 'lpjepa', radial: 'radial-vcreg', swf: 'skywindfarm', robot: 'robot' };
  const SN = { lpwm: 1, lpjepa: 2, radial: null, swf: 3, robot: 4 }; // (round 5 order, until readSN runs)
  function readSN() {
    let defs = [];
    try { defs = (window.Site && typeof Site.scenes === 'function' && Site.scenes()) || []; } catch (e) {}
    if (!defs.length) return;
    Object.keys(SID).forEach(k => { const d = defs.find(x => x.id === SID[k]); SN[k] = d && !d.hidden && d.n >= 1 && d.n <= 4 ? d.n : null; });
  }
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
  // Attribution: shown exactly as written in build.html (no trailing period), under the poem and at the
  // end of the film, followed by the Paradigm design credit.
  const ATTRIBUTION = 'Inspired by Think Different, Apple; Ethos of Sequoia; Against the Odds, James Dyson, and many other builders';
  const CREDIT = { pre: 'Design inspired by ', link: 'paradigm.xyz', href: 'https://www.paradigm.xyz', post: ' · the film nods to Paradigm’s Fourth Fund film' };
  const CREDIT_TEXT = CREDIT.pre + CREDIT.link + CREDIT.post;

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

  /* ================================================================== images */
  const IMG = {
    yash: 'site/img/photos/portrait-headshot-2022.jpg', // the résumé headshot at full resolution (site/img/yash.jpg is 906 px)
    connectu: 'site/img/projects/connectu.jpg', eyeda: 'site/img/projects/eyeda-heatmap.jpg',
    hermes: 'site/img/projects/hermes.jpg', idw: 'site/img/projects/idontwannadie.jpg',
    blinket: 'site/img/projects/blinket.jpg',
    lpjepa: 'site/img/projects/lpjepa.jpg', radial: 'site/img/projects/radialvcreg.jpg',
    cp: 'site/img/projects/skywindfarm-cp.jpg',
    cfd: 'site/img/swf/cfd-velocity-contour.jpg', render: 'site/img/swf/energy-unit-render.jpg',
    poster: 'site/img/swf/isef-poster.jpg', flight: 'site/img/swf/prototype-flight.jpg',
    system: 'site/img/swf/system-diagram.jpg', sky: 'site/img/swf/units-in-sky.jpg', ground: 'site/img/swf/ground-station.jpg',
    // Arbor: the public sign-in page. site/img/projects/arbor.jpg (the app itself) still shows private project
    // names, so it waits for the owner's OK (projects2.md, privacy flag 1); swap the path here to use it.
    arbor: 'site/img/projects/arbor-signin.jpg',
    optionGlass: 'site/img/projects/option-glass.jpg', simpl: 'site/img/projects/simpl.jpg',
    resq: 'site/img/projects/resq.jpg', drift: 'site/img/projects/central-america-drift.jpg',
    wesifted: 'site/img/projects/wesifted.jpg',
    // the biped: ONE photo of it (the owner's pick: looking down at it in hand; the other shots were too alike and
    // are gone), its 600² crop, and the CAD's line-art render exported by the #robot page (robot.js render mode)
    robot: 'site/img/robot/robot-held-inspecting.jpg', robotSq: 'site/img/robot/robot-held-inspecting-sq.jpg',
    robotCad: 'site/img/robot/renders/robot-three-quarter.png',
  };
  // w / h of every image a card can show, so cards are sized before the image has loaded
  const AR = {};
  [[IMG.connectu, 1200 / 631], [IMG.eyeda, 1200 / 553], [IMG.hermes, 1.6], [IMG.idw, 1200 / 699], [IMG.lpjepa, 1172 / 1200],
    [IMG.radial, 291 / 300], [IMG.cp, 638 / 468], [IMG.cfd, 1334 / 649], [IMG.render, 1110 / 828], [IMG.poster, 862 / 542],
    [IMG.flight, 1400 / 786], [IMG.system, 1400 / 873], [IMG.sky, 1400 / 752], [IMG.ground, 1136 / 273], [IMG.arbor, 634 / 750],
    [IMG.optionGlass, 690 / 580], [IMG.simpl, 1200 / 675], [IMG.resq, 1200 / 725], [IMG.drift, 1.6], [IMG.wesifted, 1200 / 654],
    [IMG.robot, 1120 / 1400], [IMG.robotSq, 1], [IMG.robotCad, 1200 / 1500], [IMG.blinket, 1200 / 721]]
    .forEach(([s, a]) => { AR[s] = a; });
  // Source crops (px of the file): Arbor's public page is half sign-in form; only its left panel ("Follow the
  // question. Keep the discoveries." + the research tree) is shown. Canvas draws crop directly; <img> uses a
  // cropped data URL made once the file has loaded (cropSrc()).
  const CROP = {};
  CROP[IMG.arbor] = [0, 0, 634, 750];
  CROP[IMG.optionGlass] = [255, 85, 690, 580]; // the dark answer panel only (the file is mostly white margin)
  // images smaller than the frames they can land in: drawn at native size at most (letterboxed), never upscaled
  const NATIVE_W = {};
  NATIVE_W[IMG.radial] = 291;

  // Curated personal photos (photos manifest; EXIF/GPS stripped, ≤ 300 KB). One row per photo:
  //   { id, f: file stem in site/img/photos/, year, ar: w/h of the full file, sqOnly: use the 600² crop everywhere
  //     (the crop leaves other people out), fy: vertical focus 0 top … 1 bottom for cover crops (default .5) }
  // ph(id) → the photo for cards (the full file, or its square crop when sqOnly); sq(id) → the 600² crop
  // (flipbooks, contact strips, index thumbnails). Captions live where the photo is used.
  const PHOTOS = [
    { id: 'rotors', f: 'swf-printed-rotors', year: 2023, ar: 0.75 },
    { id: 'cluster', f: 'swf-stratasys-printed-cluster', year: 2023, ar: 0.75 },
    { id: 'boards', f: 'swf-printed-flotation-boards', year: 2023, ar: 1149 / 1400 },
    { id: 'shop', f: 'swf-machine-shop', year: 2023, ar: 0.75, fy: 0.4 },
    { id: 'metal', f: 'swf-metal-flotation-board', year: 2023, ar: 0.75 },
    { id: 'bench', f: 'swf-electronics-bench', year: 2023, ar: 0.75 },
    { id: 'tunnelY', f: 'swf-wind-tunnel-yash', year: 2023, ar: 4 / 3 },
    { id: 'laser', f: 'swf-laser-cutter', year: 2023, ar: 0.75, fy: 0.4 },
    { id: 'atrium', f: 'swf-prototype-atrium', year: 2024, ar: 4 / 3 },
    { id: 'launch', f: 'swf-balloon-launch', year: 2024, ar: 0.75 },
    { id: 'aloft', f: 'swf-flight-ground', year: 2024, ar: 1, sqOnly: true },
    { id: 'selfieCam', f: 'swf-flight-selfie-camera', year: 2024, ar: 0.75, fy: 0.45 },
    { id: 'pointing', f: 'swf-flight-selfie-pointing', year: 2024, ar: 0.75 },
    { id: 'aerial', f: 'swf-flight-aerial', year: 2024, ar: 1400 / 786 },
    { id: 'skyline', f: 'swf-flight-skyline', year: 2024, ar: 1400 / 790 },
    { id: 'fair', f: 'fair-poster-suit-2024', year: 2024, ar: 1, sqOnly: true },
    { id: 'fairDC', f: 'fair-dc-poster-2024', year: 2024, ar: 1, sqOnly: true },
    { id: 'whiteboard', f: 'lab-whiteboard-room-2025', year: 2025, ar: 0.75 },
    { id: 'paint', f: 'paint-studio-2025', year: 2025, ar: 0.75, fy: 0.4 },
    { id: 'rowing', f: 'rowing-sunrise-2025', year: 2025, ar: 0.75 },
    { id: 'gauss', f: 'notes-gauss-law-2026', year: 2026, ar: 1282 / 1394 },
    { id: 'summit', f: 'portrait-summit-2026', year: 2026, ar: 0.75 },
  ];
  const PH = {};
  PHOTOS.forEach(p => { PH[p.id] = p; });
  const sq = id => `site/img/photos/${PH[id].f}-sq.jpg`;
  const ph = id => (PH[id].sqOnly ? sq(id) : `site/img/photos/${PH[id].f}.jpg`);
  PHOTOS.forEach(p => { AR[ph(p.id)] = p.sqOnly ? 1 : p.ar; AR[sq(p.id)] = 1; });
  const FY = {}; // src → vertical focus for cover crops
  PHOTOS.forEach(p => { if (p.fy != null) { FY[ph(p.id)] = p.fy; FY[sq(p.id)] = p.fy; } });
  IMG.yash && (FY[IMG.yash] = 0.3);
  FY[IMG.arbor] = 0.56; // (its crop, in landscape frames: the headline and the whole research tree)
  FY[IMG.robotSq] = 0.5; // (landscape crops of the robot photo: his face looking down and the robot in his hands)
  FY[IMG.robot] = 0.34; FY[IMG.robotCad] = 0.12; // (the phone sheet's landscape crops: face + robot; the torso + upper legs)

  const ARBOR = 'https://research-planner.bluemushroom-5aac49f7.eastus2.azurecontainerapps.io/';
  const FIELDS = ['Research', 'Energy', 'Safety', 'Products', 'Tools', 'Experiments'];
  // The project index (projects2.md catalog, minus Pantheon, which is work experience). Adding a project =
  // one row here; it joins the index, the timeline, the counts and (film: true) the cold-open montage:
  //   { id, name, year (display), y0, y1?, field (one of FIELDS), one (one-liner: hover card), idx (the index
  //     row's line, ≤ ~64 chars so it fits two lines of the column), href|null, img | gen:'title'|'code',
  //     thumb? (index thumbnail, defaults to img), meta, arch? (archived), w?, film? }
  // Default order = newest first (the "Year" sort).
  const PROJECTS = [
    { id: 'lpwm', name: 'LpWM', year: '2026', y0: 2026, field: 'Research', one: 'Sparse JEPA world model: sparsity lowers the predictor size needed to plan', idx: 'Sparse JEPA world model: plans with a smaller predictor', href: 'https://arxiv.org/abs/2608.22764', gen: 'code', meta: 'arXiv 2026 · sparse beats dense by up to +57 pts on PushT', film: true },
    { id: 'rectified-lpjepa', name: 'Rectified LpJEPA', year: '2026', y0: 2026, field: 'Research', one: 'JEPA pretraining on sparse, maximum-entropy representations', idx: 'JEPA pretraining on sparse, maximum-entropy features', href: 'https://arxiv.org/abs/2602.01456', img: IMG.lpjepa, meta: 'ICML 2026', film: true },
    { id: 'arbor', name: 'Arbor', year: '2026', y0: 2026, field: 'Tools', one: 'Research workspace: syncs W&B, GitHub and Notion into a research tree that knows what I’m working on and keeps me on track', idx: 'W&B, GitHub and Notion → a research tree that keeps me on track', href: ARBOR, img: IMG.arbor, meta: 'Live · private login', film: true },
    { id: 'hermes', name: 'Hermes', year: '2026', y0: 2026, field: 'Tools', one: 'Chrome extension that reads articles aloud with live word highlighting, 0.75–4×', idx: 'Chrome extension: reads articles aloud, word-synced, 0.75–4×', href: 'https://github.com/YashDagade/browser-reader', img: IMG.hermes, meta: 'Chrome extension · GitHub', film: true },
    { id: 'blinket', name: 'Blinket', year: '2026', y0: 2026, field: 'Products', one: 'Hands-free internet for people with ALS: blinks and winks on an ordinary webcam drive search, chat, shopping and calls', idx: 'Hands-free internet for ALS: blinks and winks on a webcam', href: 'https://blinketmed.com/apps', video: 'https://youtu.be/NoRGMwNrWNU', img: IMG.blinket, meta: "TreeHacks ’26 · demo video", film: true },
    { id: 'option-glass', name: 'Option Glass', year: '2026', y0: 2026, field: 'Tools', one: 'macOS screen assistant: double-tap Option to ask about whatever is on screen', idx: 'macOS assistant: double-tap Option, ask about the screen', href: null, img: IMG.optionGlass, meta: 'macOS · Swift', film: true },
    { id: 'biped', name: 'Biped', year: '2026', y0: 2026, field: 'Experiments', one: 'Bipedal robot on HiWonder LX-16A bus servos; build log in progress', idx: 'Bipedal robot on LX-16A bus servos; build log in progress', href: 'biped/', img: IMG.robot, thumb: IMG.robotSq, tcrop: [128, 172, 380, 264], meta: 'Build log · Notion', film: true },
    { id: 'central-america-drift', name: 'Central America Drift', year: '2026', y0: 2026, field: 'Experiments', one: 'JS rigid-body sim of Central America rifting apart into islands', idx: 'Rigid-body JS sim of Central America rifting into islands', href: 'https://github.com/YashDagade/central_america_drift', img: IMG.drift, meta: 'Simulation · GitHub', film: true },
    { id: 'simpl', name: 'Simpl', year: '2025–26', y0: 2025, y1: 2026, field: 'Products', one: 'iOS daily coach: turns quick food, sleep and exercise logs into what to do next', idx: 'iOS coach: food, sleep and exercise logs → what to do next', href: null, img: IMG.simpl, meta: 'iOS app · Expo', film: true },
    { id: 'connectu', name: 'ConnectU', year: '2025–26', y0: 2025, y1: 2026, field: 'Products', one: 'Mentor–mentee matching: LLM bios, embeddings and Hungarian-algorithm pairing', idx: 'Mentor matching: LLM bios, embeddings, Hungarian pairing', href: 'https://connectu-frontend.vercel.app/', img: IMG.connectu, meta: 'Matching platform', film: true },
    { id: 'radial-vcreg', name: 'Radial-VCReg', year: '2025', y0: 2025, field: 'Research', one: 'VCReg + radial Gaussianization: pushes feature norms toward the Chi distribution', idx: 'Radial Gaussianization: feature norms pushed toward Chi', href: 'https://arxiv.org/abs/2602.14272', img: IMG.radial, meta: "NeurIPS '25 workshops", w: 291, film: true },
    { id: 'resq', name: 'ResQ', year: '2025', y0: 2025, field: 'Safety', one: 'Watches traffic-camera streams and flags crashes with a vision LLM in real time', idx: 'Flags crashes in live traffic-camera streams with a vision LLM', href: 'https://res-q-eta.vercel.app/', img: IMG.resq, meta: 'Vision LLM · real time', film: true },
    { id: 'goedel', name: 'Goedel-Prover-V2, enhanced', year: '2025', y0: 2025, field: 'Experiments', one: 'Prompt adapter for Goedel-Prover-V2-8B: 84.6% → 85.2% on miniF2F (self-reported)', idx: 'Prompt adapter, 8B: 84.6% → 85.2% miniF2F (self-reported)', href: null, gen: 'title', meta: 'Lean · LLM' },
    { id: 'lotus', name: 'LOTUS', year: '2025', y0: 2025, field: 'Experiments', one: 'Generating Cas9 protein variants by flow matching in ESM-2 embedding space', idx: 'Cas9 variants via flow matching in ESM-2 space', href: 'https://github.com/YashDagade/Lotus', gen: 'title', meta: 'Flow matching · GitHub' },
    { id: 'wesifted', name: 'WeSifted', year: '2025', y0: 2025, field: 'Products', one: 'Curated, profile-tailored legislation updates for small and mid-size businesses', idx: 'Legislation updates tailored to small and mid-size businesses', href: 'https://wesifted.com', img: IMG.wesifted, meta: 'Archived', arch: true },
    { id: 'echo', name: 'Echo', year: '2025', y0: 2025, field: 'Products', one: 'AI documentation and note-taking for therapists', idx: 'AI documentation and note-taking for therapists', href: null, gen: 'title', meta: 'Archived', arch: true },
    { id: 'idontwannadie', name: 'idontwannadie.lol', year: '2024', y0: 2024, field: 'Safety', one: 'Safer-route maps built on 3.1M+ Minnesota crash records; PennApps XXV winner', idx: 'Safer routes from 3.1M+ MN crash records · PennApps XXV', href: 'https://idontwannadie.lol/', img: IMG.idw, meta: 'PennApps XXV', film: true },
    { id: 'skywindfarm', name: 'SkyWindFarm', year: '2022–24', y0: 2022, y1: 2024, field: 'Energy', one: 'Airborne wind energy: helium-lifted VAWT clusters that harvest high-altitude wind', idx: 'Helium-lifted turbine clusters harvesting high-altitude wind', href: 'https://youtu.be/Z6k2j59-ubo', video: 'https://youtu.be/Z6k2j59-ubo', img: IMG.flight, thumb: sq('aloft'), meta: 'Flight video · ISEF 2023 + 2024 · patent application' },
    { id: 'eyeda', name: 'EyeDa', year: '2022', y0: 2022, field: 'Safety', one: 'Distracted-driving nonprofit + real-time detection device; led a 15-person team', idx: 'Distracted-driving nonprofit + detection device; led 15 people', href: 'https://shreyadixit.org/shreya-innovation-lab/', img: IMG.eyeda, meta: 'KARE11 · CBS · Star Tribune', film: true },
  ];
  const PBY = {};
  PROJECTS.forEach(p => { PBY[p.id] = p; });

  const SOCIALS = [
    { label: 'X', href: 'https://x.com/YashDagad' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yashdagade/' },
    { label: 'Email', href: 'mailto:me@yashdagade.com' },
    { label: 'GitHub', href: 'https://github.com/YashDagade' },
    { label: 'Scholar', href: 'https://scholar.google.com/citations?user=o56NnCkAAAAJ&hl=en' },
    { label: 'Resume', href: 'tex/main.pdf' },
  ];
  // (just the names: the old site's pointing arrows are gone, round 4)
  const FRIENDS = [
    { name: 'Marco', label: 'Marco', href: 'https://marcoschonert.com/' },
    { name: 'Pranav', label: 'Pranav', href: 'https://pranavponnusamy.com/' },
    { name: 'Brian', label: 'Brian', href: 'https://briankmason.com/' },
    { name: 'Max', label: 'Max', href: 'https://www.maxxiong.dev/' },
  ];
  const PRESS = ['KARE11', 'CBS', 'Star Tribune', 'Fox 9', 'UMN ME', 'Duke Today'];

  // The cold-open montage ("fig. 00 — things I've built"): one frame per 16th from the moment "builders" inks,
  // 2022 → 2026, builds and flights first, then the projects. Photos use their 600² crops (light, subject-
  // centred). A frame is { src, year, fy?, draw?:'code' (LpWM has no image: its sparse code is drawn) }.
  // Any PROJECTS row with film: true that is not listed here is appended in year order, so the montage, its
  // counter, its timing and its flip sounds always follow the catalog.
  const MF = id => ({ src: sq(id), year: PH[id].year, fy: PH[id].fy });
  // (a project's frame carries its START year, so the frame's year and the flip pitch only ever climb)
  const MP = id => { const p = PBY[id]; return { src: p.thumb || p.img || null, year: p.y0, draw: p.gen === 'code' ? 'code' : null, id }; };
  const MONTAGE = [
    MP('eyeda'), MF('rotors'), MF('cluster'), MF('shop'), MF('metal'), MF('tunnelY'), MF('laser'),
    MF('atrium'), MF('launch'), MF('aloft'), { src: ph('aerial'), year: 2024 }, MF('fair'), MP('idontwannadie'),
    MP('radial-vcreg'), MP('connectu'), MP('resq'), MP('simpl'), MP('rectified-lpjepa'), MP('lpwm'),
    MP('hermes'), MP('arbor'), MP('option-glass'), MP('central-america-drift'),
    Object.assign(MP('biped'), { fy: FY[IMG.robotSq] }), // (the last frame, on the cut to bar 5: what I'm building now)
  ];
  PROJECTS.slice().reverse().forEach(p => { if (p.film && !MONTAGE.some(m => m.id === p.id) && (p.img || p.gen === 'code')) MONTAGE.push(MP(p.id)); });
  // The flipbook starts when "builders" inks (bar 3 beat 3) and cuts to the roll call on the bar-5 downbeat:
  // one frame per 16th (faster only if the catalog outgrows 24 frames); a spare beat or more at the end shows
  // the lit node grid (Paradigm's film grammar).
  const FLIP = { t0: lb(3, 3), end: lb(5) };
  FLIP.step = Math.min(S16, (FLIP.end - FLIP.t0) / Math.max(1, MONTAGE.length));
  FLIP.dur = MONTAGE.length * FLIP.step;

  // Hover map for the settled poem (brief §d + photos manifest §2). Every phrase opens cards beside the poem.
  // mode: card (one image) | jump (several cards) | mosaic | flip | friends. A card is { src | gen:'text', title,
  // meta, href?, lines? }. 'will power' shows power and energy: the Energy Unit, the units aloft, the ground station.
  const SWF_HREF = 'https://youtu.be/Z6k2j59-ubo'; // the flight video is SkyWindFarm's main link
  const HOVER = {
    'builders': { mode: 'flip', frames: MONTAGE, title: 'Stints, by year', meta: '2022 → 2026 · hover any blue phrase' },
    'misfits': { mode: 'card', src: IMG.yash, title: 'Yash Dagade', meta: 'B.S. Math + Philosophy, Duke ’28 · research at NYU CILVR', w: 220 },
    'rebels': { mode: 'card', gen: 'code', title: 'LpWM — a case for sparse world models', meta: 'Sparse beats dense by up to +57 pts on PushT planning', href: 'https://arxiv.org/abs/2608.22764', proj: ['lpwm'] },
    'troublemakers': { mode: 'jump', proj: ['idontwannadie', 'resq'], cards: [
      { src: IMG.idw, title: 'idontwannadie.lol', meta: 'Google Maps, but optimized for safety · PennApps XXV', href: 'https://idontwannadie.lol/' },
      { src: IMG.resq, title: 'ResQ', meta: 'Flags crashes in live traffic-camera streams', href: 'https://res-q-eta.vercel.app/' }] },
    'round pegs in the square holes': { mode: 'card', src: IMG.radial, title: 'Radial-VCReg', meta: 'Feature norms pushed toward a Chi distribution · NeurIPS ’25 wkshp', href: 'https://arxiv.org/abs/2602.14272', proj: ['radial-vcreg'], w: 260 },
    'things differently': { mode: 'card', src: IMG.lpjepa, title: 'Rectified LpJEPA', meta: 'The same data, projected at four angles · ICML 2026', href: 'https://lpjepa.com', proj: ['rectified-lpjepa'], w: 280 },
    'question everything': { mode: 'card', src: ph('pointing'), title: 'SkyWindFarm', meta: 'Why keep turbines on the ground? · flight test, 2024', href: SWF_HREF, proj: ['skywindfarm'], w: 230 },
    'laws of physics': { mode: 'jump', proj: ['skywindfarm'], cards: [
      { src: IMG.cfd, title: 'SkyWindFarm · URANS CFD', meta: 'Cluster Cp 0.43 at tip-speed ratio 3.0 (tunnel + CFD)', href: 'assets/swf.pdf' },
      { src: ph('gauss'), title: 'Gauss’s law, by hand', meta: 'Notes, 2026' }] },
    'first principles': { mode: 'jump', proj: ['skywindfarm'], cards: [
      { src: IMG.system, title: 'SkyWindFarm, from first principles', meta: 'Flotation · stability · energy · power transfer · ground', href: 'https://youtu.be/gDUk6V607js' },
      { src: ph('metal'), title: 'The metal flotation board', meta: 'Cut, wired and measured by hand · 2023' }] },
    'non-mimetic': { mode: 'card', src: ph('atrium'), title: 'SkyWindFarm · indoor hang test, 2024', meta: 'First-author inventor · US 2025/0243843 A1', href: 'https://youtu.be/Z6k2j59-ubo', proj: ['skywindfarm'], w: 300 },
    'change the world': { mode: 'jump', proj: ['eyeda', 'idontwannadie', 'connectu'], cards: [
      { src: IMG.eyeda, title: 'EyeDa', meta: 'Distracted-driving nonprofit · KARE11, CBS, Star Tribune', href: 'https://shreyadixit.org/shreya-innovation-lab/' },
      { src: IMG.idw, title: 'idontwannadie.lol', meta: 'Safer routes from 3.1M+ MN crash records', href: 'https://idontwannadie.lol/' },
      { src: IMG.connectu, title: 'ConnectU', meta: 'Mentor matching: Hungarian algorithm over embeddings', href: 'https://connectu-frontend.vercel.app/' }] },
    // Will power → power and energy: the unit that harvests it, the units aloft, the ground station it
    // arrives at (swf.pdf Eq 15–16: ≈157 kW harvested, ≈127 kW delivered per unit, design estimate).
    // The first card is live line art (Site.art.swfUnit + swfTether, animated while open); if skywindfarm.js
    // doesn't export them, the render of the units in the sky takes its place.
    'will power': { mode: 'jump', energy: true, proj: ['skywindfarm'], cards: [
      { art: 'energy', alt: IMG.sky, title: 'Units aloft, power flowing down', meta: '≈157 kW harvested per unit (est.)', href: SWF_HREF },
      { src: IMG.render, title: 'Energy Unit', meta: 'LTA shell · lift wing · 4 VAWTs', href: 'https://youtu.be/gDUk6V607js' },
      { src: IMG.ground, title: 'Power reaches the ground station', meta: '≈127 kW delivered per unit (est.)', href: 'assets/swf.pdf' }] },
    'no limits': { mode: 'jump', proj: ['skywindfarm'], cards: [
      { src: ph('aloft'), title: 'SkyWindFarm · prototype aloft', meta: 'Flight test, May 2024', href: 'https://youtu.be/Z6k2j59-ubo' },
      { src: ph('skyline'), title: 'Tethered, holding station', meta: '6-DoF sim: rejects harsh disturbances in ~7 s', href: 'https://youtu.be/Z6k2j59-ubo' }] },
    'high bar for quality': { mode: 'jump', proj: ['skywindfarm'], cards: [
      { src: ph('tunnelY'), title: 'UMN wind tunnel · 2023', meta: 'Wind tunnel vs CFD: correlation > 0.95', href: 'assets/swf.pdf' },
      { src: IMG.cp, title: 'Power coefficient vs tip-speed ratio', meta: 'Cluster Cp 0.43 at TSR 3.0 (tunnel + CFD avg.)', href: 'assets/swf.pdf' }] },
    'excellence': { mode: 'jump', proj: ['skywindfarm'], cards: [
      { src: IMG.poster, title: 'ISEF 2023 + 2024', meta: 'Third Award ’23 · 3rd Grand Award + $10K Ricoh prize ’24', href: 'press.html' },
      { src: ph('fair'), title: 'At the SkyWindFarm board', meta: 'Science fair, March 2024' }] },
    // tools I built instead of searching for one
    'build before they search': { mode: 'jump', proj: ['hermes', 'arbor', 'option-glass', 'simpl'], cards: [
      { src: IMG.hermes, title: 'Hermes', meta: 'My own article reader · word-synced voice', href: 'https://github.com/YashDagade/browser-reader' },
      { src: IMG.arbor, title: 'Arbor', meta: 'A research tree synced from W&B, GitHub, Notion', href: ARBOR },
      { src: IMG.optionGlass, title: 'Option Glass', meta: 'Double-tap Option, ask about the screen' },
      { src: IMG.simpl, title: 'Simpl', meta: 'A daily coach from quick logs' }] },
    // (a text card carries its own words: its caption is only the title, never a repeat of the card)
    // (the biped: its one photo and its CAD render open the robot's own page, #robot; the render is optional: a card
    // whose image failed to load is left out, see phraseCfg)
    // (the two tall cards share the top row, so the short text card never leaves a hole under it in the 2 × 2 grid)
    'And they yearn to build': { mode: 'jump', proj: ['lpwm', 'biped'], cards: [
      { src: IMG.robot, title: 'My biped, in hand', meta: '45 cm · eight servos', href: '#robot' },
      { src: IMG.robotCad, title: 'The biped, from its CAD', meta: 'Open the robot page', href: '#robot', optional: true },
      { gen: 'text', head: 'Now building', title: 'Biped build log', meta: null, lines: ['World models for robots', 'NYU CILVR · Pantheon', 'Biped build log'], href: 'biped/' },
      { src: ph('laser'), title: 'At the laser cutter', meta: 'SkyWindFarm, 2023' }] },
    'the same life': { mode: 'friends', title: 'Fellow builders', meta: 'Marco · Pranav · Brian · Max' },
    'race unrelentingly toward creating value': { mode: 'jump', proj: ['skywindfarm', 'rectified-lpjepa'], cards: [
      { src: ph('aerial'), title: 'Energy · SkyWindFarm', meta: 'Flight test, 2024', href: SWF_HREF },
      { src: IMG.lpjepa, title: 'Intelligence · Rectified LpJEPA', meta: 'ICML 2026', href: 'https://arxiv.org/abs/2602.01456' }] },
    'ignore them': { mode: 'jump', cards: [
      { gen: 'text', head: 'Press', title: 'All press coverage', meta: null, lines: PRESS, href: 'press.html' },
      { src: ph('fairDC'), title: 'Science expo, Washington DC', meta: 'April 2024' }] },
    'change things': { mode: 'mosaic', srcs: [sq('aloft'), IMG.lpjepa, sq('cluster'), IMG.eyeda, IMG.idw, sq('tunnelY'), IMG.arbor, IMG.hermes, sq('fair')], title: 'So far', meta: '3 papers · 1 patent application · ISEF ’23 + ’24 · 1 nonprofit' },
  };
  // photos that only hover cards use: fetched after the film's own images (see preloadLater)
  const HOVER_SRCS = [];
  Object.values(HOVER).forEach(h => { [h.src].concat((h.cards || []).map(c => c.src), h.srcs || []).forEach(s => { if (s && HOVER_SRCS.indexOf(s) < 0) HOVER_SRCS.push(s); }); });

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
    s5b: spec(L(4, 1), { at: lb(4), rate: 6, ink: [lb(4, 2, 3)] }), // inks when the first energy pulse arrives (S5 WP.ink); held 2¼ beats
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
    // credits: the attribution types on from bar 43 (done by beat 4), the design credit lands an 8th after the
    // last line; both hold at full strength until the frame settles (drawn outside the end fade)
    s10f: spec(segs('attr', ATTRIBUTION), { at: lb(3), rate: 10 }),
    s10g: spec(segs('credit', CREDIT_TEXT), { at: lb(4, 1, 2), slam: true }),
  };
  // The Hermes shot (bar 33): words of [10,0] are read aloud one per 8th.
  const HERMES_WORDS = (() => {
    const out = []; let c = 0;
    const txt = L(10, 0).map(g => g.text).join('');
    txt.split(/(\s+)/).forEach(p => { if (p && !/^\s/.test(p)) out.push({ c0: c, c1: c + p.length }); c += p.length; });
    return out;
  })();
  // Bars 33–34: Hermes (the reader) is up from the downbeat while it reads the line; on "…build before they
  // search." the other tools I built instead of searching join it, one per 8th, in a 2 × 2 on the footprint of
  // the contact sheet that replaces them; then "curious about everything" fills that sheet, one photo per 32nd.
  const TOOLS_T = lb(1) + 7 * BEAT / 2; // the 8th on which Hermes reads "build"
  const TOOLS = [['hermes', 'Hermes · 2026'], ['arbor', 'Arbor · 2026'], ['option-glass', 'Option Glass · 2026'], ['simpl', 'Simpl · 2025–26']];
  const toolT = i => (i ? TOOLS_T + (i - 1) * BEAT / 2 : 0);
  const CURIOUS_T = lb(2, 3), CURIOUS_STEP = S16 / 2; // the sheet fills in one beat (32nds) and is held for the last beat of bar 34
  // (the last cell is the accent. hack-electrodes-2026 is left out until its context is confirmed: photos manifest #27)
  const CURIOUS = [['boards', 'printing'], ['bench', 'circuits'], ['selfieCam', 'flight'], ['whiteboard', 'research'],
    ['gauss', 'physics'], ['rowing', 'rowing'], ['summit', 'hiking'], ['paint', 'art']];
  const FILM_PHOTOS = [ph('aerial'), ph('tunnelY'), sq('fair')].concat(CURIOUS.map(c => sq(c[0])));
  const NAME_T = NAMES.map((_, k) => (k < 6 ? lb(4, 1) + k * BEAT / 2 : lb(4, 4) + (k - 6) * S16));
  const GLITCHES = [[lb(9), 0.5], [lb(13), 0.45], [lb(16, 2), 0.8], [lb(17), 1], [lb(21), 1], [lb(29), 0.5], [lb(33), 0.7], [lb(37), 0.8], [lb(41), 1]];

  /* ================================================================== bits & atoms */
  // Software + hardware. The film opens on a workbench, BITS (a terminal) beside ATOMS (a hairline robot arm that
  // assembles a SkyWindFarm unit out of the Site.art.swfUnit glyph), and peaks on an assembly engine that builds six
  // more. Bar 1 is sparse: in near silence one keystroke, then one joint actuation, then the rest of the command (a
  // typo and its backspace), and Enter on the bar-2 downbeat starts the manifesto. Bar 2 layers the arm's
  // pick-and-place (servo whir, vacuum hiss, snap-fit) under the typed title; on bar 3 the unit comes online (relay)
  // and the montage takes over. Bar 42 ("They push the human race forward.") is the crescendo: a gantry places twelve
  // parts on six stands, riding the score's accelerating Enter line (dotted 8ths → 32nds), over a CNC hum; on the
  // bar-43 downbeat every unit reports in, "system active" (the compile-success chime), and the machine powers down
  // into the closing lines.
  // Every drawn event is a FOLEY event at the same film second, so each one is heard exactly when it is seen.
  const BENCH = {
    // the command, typed thoughtfully: [t, key] ('\b' backspace, '\n' Enter: its keystroke also starts the title)
    keys: [[lb(1, 2, 0), 'b'], [lb(1, 3, 1), 'u'], [lb(1, 3, 2), 'i'], [lb(1, 3, 3), 'l'], [lb(1, 4, 0), 's'],
      [lb(1, 4, 1), '\b'], [lb(1, 4, 2), 'd'], [lb(2, 1, 0), '\n']],
    // arm moves [t0, t1, pose, voice]: J1 alone wakes the arm, then two picks, then back to its wake pose
    moves: [[lb(1, 2, 2), lb(1, 3, 0), 'wake', 'servo'],
      [lb(2, 1, 0), lb(2, 1, 2), 'p1', 'servo'], [lb(2, 1, 3), lb(2, 2, 2), 's1', 'glide'],
      [lb(2, 2, 3), lb(2, 3, 1), 'p2', 'servo'], [lb(2, 3, 2), lb(2, 4, 1), 's2', 'glide'],
      [lb(2, 4, 2), lb(3, 1, 0), 'wake', 'servo']],
    // [vacuum on (pick), seated (snap-fit), vacuum off (release)] for the rotor cluster, then the flotation shell
    grip: [[lb(2, 1, 2), lb(2, 2, 2), lb(2, 2, 3)], [lb(2, 3, 1), lb(2, 4, 1), lb(2, 4, 2)]],
    compiled: lb(2, 1, 1), power: lb(3, 1, 0),
  };
  // the terminal's log: [t, tag, item, status, t of the status (else t)]
  BENCH.log = [[lb(2), 'bits', 'firmware.bin', 'compiled', BENCH.compiled], [BENCH.grip[0][1], 'atoms', 'rotor cluster', 'seated'],
    [BENCH.grip[1][1], 'atoms', 'flotation shell', 'seated'], [BENCH.power, 'unit 01', 'online · 0 errors', '']];
  // The engine: placement k puts part k % 2 (rotor cluster, then shell) on stand k >> 1. It rides the score's
  // accelerando (Site.BuildScore.accel, the Enter line whose gaps shrink geometrically from a dotted 8th to a 32nd and
  // whose next onset is the bar-43 downbeat): of its sixteen bar-42 onsets, the first four cycles use two, the ram
  // firing on one (ram) and the part seating on the next (p); from step 10 a part seats on every onset. So every ram
  // and snap-fit lands on one of the line's keystrokes, the gantry speeds up with the sound, and "system active" is the
  // downbeat the line was aiming at. Each placement: travel along the rail, the pneumatic ram down (dip), the snap-fit
  // at the bottom (p), back up (up). (Without the score's times: the same series computed here, else a 16th grid.)
  const ENG = { t0: lb(42), on: lb(43), off: lb(43, 3), n: 6, cmd: 'build --units 6', place: [], ram: [] };
  (() => {
    const BS = window.Site && window.Site.BuildScore;
    let A = BS && Array.isArray(BS.accel) ? BS.accel.filter(x => isFinite(x)) : [];
    if (A.length < 16) { // the score's series (build-score.js accelTimes: bar 41 step 2 → bar 43, 22 onsets, from a dotted 8th)
      const t0 = lb(41, 1, 2), span = (lb(43) - t0) / S16, n = 22;
      let lo = 0.5, hi = 1;
      for (let it = 0; it < 60; it++) { const r = (lo + hi) / 2; if (3 * (1 - Math.pow(r, n)) / (1 - r) > span) hi = r; else lo = r; }
      const q = (lo + hi) / 2; A = []; for (let k = 0, t = t0, g = 3; k < n; k++) { A.push(t); t += g * S16; g *= q; }
    }
    A = A.filter(t => t >= ENG.t0 + 0.02 && t < ENG.on - 0.02).sort((a, b) => a - b);
    const m = A.length - 12;
    if (m >= 1 && m <= 6) {
      for (let i = 0; i < m; i++) { ENG.ram.push(A[2 * i]); ENG.place.push(A[2 * i + 1]); }
      ENG.place.push(...A.slice(2 * m));
    } else ENG.place = [2, 5, 7, 9, 10, 11, 12, 13, 14, 14.5, 15, 15.5].map(s => lb(42) + s * S16);
  })();
  ENG.k = ENG.place.map((p, k, P) => {
    const prev = k ? P[k - 1] : ENG.t0, next = k + 1 < P.length ? P[k + 1] : ENG.on, ram = ENG.ram[k];
    // (before a cycle that fires its ram on a keystroke, the head lifts fast, leaving the travel time)
    return { p, ram, gap: p - prev, dip: ram != null ? p - ram : Math.min(0.5 * (p - prev), 1.2 * S16),
      up: ENG.ram[k + 1] != null ? Math.min(0.5 * S16, 0.35 * (next - p)) : Math.min(0.35 * (next - p), S16) };
  });
  ENG.k.forEach((q, k) => { q.tS = k ? ENG.place[k - 1] + ENG.k[k - 1].up : ENG.t0; q.tE = q.p - q.dip; });

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
    const rows8 = []; for (let i = 0; i < bytes.length; i += 8) rows8.push(bytes.slice(i, i + 8));
    const sq = raw.indexOf('status quo');
    const all = Array.from(new TextEncoder().encode(RAW.map(st => st.map(l => l.map(p => (typeof p === 'string' ? p : p.em)).join('')).join(' ')).join(' ')));
    return { raw, bytes, rows, rows8, sq: [sq, sq + 10], crc: crc32(bytes).toString(16).padStart(8, '0'), all };
  })();
  const hex2 = b => b.toString(16).padStart(2, '0');

  /* ================================================================== captions + css */
  // (lines ≤ 32 characters, so the caption ends well left of the poem's stanza numbers at x ≈ 284)
  const CAP_FILM = 'Here’s to the builders: my\nbuild manifesto in bits and\natoms, and every stint so far.';
  const CAP_SET = 'Here’s to the builders. Hover a\nblue phrase to see what I built;\nthe stints list every project.';
  const CAP_SET_TOUCH = 'Here’s to the builders. Tap a\nblue phrase to see what I built;\nthe stints list every project.';

  const CSS = `
.scene--build .bd-film { transition: opacity .7s ease; }
.scene--build.is-settled .bd-film, .scene--build.is-settled .bd-ov { opacity: 0; }
.scene--build .bd-ov { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; transition: opacity .7s ease; }
.scene--build .bd-ml { position: absolute; left: 0; top: 0; white-space: nowrap; font-family: var(--mono); letter-spacing: .02em; line-height: 1.3; visibility: hidden; will-change: transform; }
.scene--build .bd-ml .katex { font-size: 1.1em; line-height: 1; }
.scene--build .bd-ml .bl { display: inline-block; width: 0; height: 0; vertical-align: baseline; }
.scene--build .bd-ml.is-bg { background: var(--bg); padding: 0 3px; margin-left: -3px; }
.scene--build .bd-set { position: absolute; top: 64px; bottom: 72px; left: 280px; right: 150px; padding-left: 40px; overflow-x: hidden; overflow-y: auto;
  opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .5s ease, visibility 0s linear .5s;
  scrollbar-width: none; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 34px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 26px, #000 calc(100% - 34px), transparent 100%); }
.scene--build .bd-set::-webkit-scrollbar { display: none; }
.scene--build.is-settled .bd-set { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .9s ease .1s, visibility 0s; }
.scene--build .bd-grid { display: grid; grid-template-columns: minmax(0, 1fr); max-width: 580px; row-gap: 56px; padding: 34px 0 90px; }
.scene--build .bd-kick { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; line-height: 15px; color: #555; margin: 0 0 22px; }
.scene--build .bd-kick b { font-weight: 400; color: #555; text-transform: uppercase; letter-spacing: .06em; } /* the eyebrow */
.scene--build .bd-btn { font-size: 12px; line-height: 15px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--g400); transition: color .15s ease, border-color .15s ease; }
.scene--build .bd-btn:hover { color: var(--accent); border-color: var(--accent); }
.scene--build .bd-st { position: relative; margin: 0 0 16px; font-family: var(--serif); font-size: 18px; line-height: 27px; letter-spacing: 0; color: var(--ink); }
.scene--build .bd-st p { margin: 0; }
.scene--build .bd-st--open { font-size: 28px; line-height: 34px; letter-spacing: -.012em; margin-bottom: 24px; }
.scene--build .bd-sn { position: absolute; left: -36px; top: 7px; font-family: var(--mono); font-size: 11px; line-height: 14px; letter-spacing: .02em; color: var(--g500); transition: color .2s ease; }
.scene--build .bd-st--open .bd-sn { top: 11px; }
.scene--build .bd-st:hover .bd-sn { color: var(--ink); }
.scene--build .bd-close p { font-style: italic; }
.scene--build .bd-em { color: var(--accent); cursor: crosshair; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px;
  text-decoration-color: rgba(20, 50, 245, .32); border-radius: 1px; transition: background-color .15s ease, text-decoration-color .15s ease; outline: none; }
.scene--build .bd-em:hover, .scene--build .bd-em.is-lit, .scene--build .bd-em:focus-visible { background: var(--accent-soft); text-decoration-color: var(--accent); }
.scene--build .bd-em.is-nw { white-space: nowrap; } /* short phrases never split ("laws of / physics"); long ones may */
.scene--build .bd-cur { display: inline-block; width: .42em; height: .74em; margin-left: 4px; vertical-align: -.04em; background: var(--ink); animation: bd-blink 1.017s steps(2, jump-none) infinite; }
@keyframes bd-blink { 0% { opacity: 1; } 100% { opacity: 0; } }
.scene--build .bd-attr { margin-top: 30px; padding-top: 12px; max-width: 460px; border-top: 1px solid var(--g300); font-size: 12px; line-height: 17px; color: #555; }
.scene--build .bd-attr p { margin: 0; }
.scene--build .bd-attr p + p { margin-top: 6px; }
.scene--build .bd-attr a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--g400); transition: color .15s ease, border-color .15s ease; }
.scene--build .bd-attr a:hover { color: var(--accent); border-color: var(--accent); }
.scene--build .bd-poem > .bd-st, .scene--build .bd-poem > .bd-attr, .scene--build .bd-side > *, .scene--build .bd-tail > * { opacity: 0; transform: translateY(5px); }
.scene--build.is-settled .bd-poem > .bd-st, .scene--build.is-settled .bd-poem > .bd-attr, .scene--build.is-settled .bd-side > *, .scene--build.is-settled .bd-tail > * {
  opacity: 1; transform: none; transition: opacity .7s ease var(--d, 0s), transform .7s var(--ease) var(--d, 0s); }
.scene--build .bd-side { font-size: 12px; line-height: 15px; }
.scene--build .bd-sh { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding-bottom: 7px; border-bottom: 1px solid var(--ink); font-size: 12px; line-height: 15px; }
.scene--build .bd-sh .m { color: #555; }
.scene--build .bd-sh > span:first-child { color: #555; text-transform: uppercase; letter-spacing: .06em; } /* eyebrow: STINTS · 18 PROJECTS */
.scene--build .bd-sh.is-flash { animation: bd-flash 1s ease; }
@keyframes bd-flash { 0%, 40% { color: var(--accent); border-color: var(--accent); } 100% { color: var(--ink); border-color: var(--ink); } }
.scene--build .bd-sort { display: inline-flex; gap: 10px; color: #555; }
.scene--build .bd-sort button { font-size: 12px; line-height: 15px; color: #555; transition: color .15s ease; }
.scene--build .bd-sort button:hover { color: var(--accent); }
.scene--build .bd-sort button.is-on { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
.scene--build .bd-tl { display: block; width: 100%; height: 74px; margin: 12px 0 4px; overflow: visible; }
.scene--build .bd-tl text { font-family: var(--mono); font-size: 11px; fill: #555; letter-spacing: .02em; }
.scene--build .bd-tl text.c { font-size: 12px; fill: var(--ink); }
.scene--build .bd-tl text.hn { font-size: 12px; fill: #555; }
.scene--build .bd-tl .mk .sq { fill: var(--bg); stroke: var(--ink); stroke-width: 1; transition: fill .15s ease, stroke .15s ease; }
.scene--build .bd-tl .mk .hit { fill: transparent; }
.scene--build .bd-tl .mk.is-lit .sq { fill: var(--accent); stroke: var(--accent); }
.scene--build .bd-tl .sp { stroke: var(--g400); stroke-width: 1; stroke-dasharray: 2 2; transition: stroke .15s ease; }
.scene--build .bd-tl .mk.is-lit .sp { stroke: var(--accent); stroke-dasharray: none; }
.scene--build .bd-list { position: relative; }
.scene--build .bd-row { position: relative; display: grid; grid-template-columns: 22px 58px minmax(0, 1fr) auto; column-gap: 12px; align-items: start; padding: 8px 0 9px;
  border-bottom: 1px solid var(--g200); text-decoration: none; color: var(--ink); }
.scene--build .bd-row .no { padding-top: 4px; font-size: 11px; line-height: 14px; color: var(--g500); font-variant-numeric: tabular-nums; }
.scene--build .bd-row .th { position: relative; display: block; width: 58px; height: 40px; margin-top: 1px; padding: 2px; border: 1px solid var(--g300); background: var(--bg); transition: border-color .15s ease; }
.scene--build .bd-row .th img { display: block; width: 100%; height: 100%; object-fit: cover; background: var(--g100); }
.scene--build .bd-row:hover .th, .scene--build .bd-row.is-lit .th, .scene--build .bd-row:focus-visible .th { border-color: var(--accent); }
.scene--build .bd-row .n { display: block; font-family: var(--serif); font-size: 17px; line-height: 21px; letter-spacing: 0; transition: color .15s ease; }
.scene--build .bd-row .n em { font-style: normal; font-family: var(--mono); font-size: 12px; letter-spacing: .02em; color: #555; margin-left: 8px; }
.scene--build .bd-row .n .sc { font-family: var(--mono); font-size: 12px; letter-spacing: .02em; color: var(--accent); margin-left: 8px; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color .15s ease; }
.scene--build .bd-row .n .sc:hover { border-color: var(--accent); }
.scene--build .bd-row .o { display: block; margin-top: 3px; font-size: 12px; line-height: 16px; color: #555; }
.scene--build .bd-gh { padding: 16px 0 6px; border-bottom: 1px solid var(--g300); font-size: 12px; line-height: 15px; color: #555; letter-spacing: .06em; animation: bd-in .35s ease both; }
@keyframes bd-in { from { opacity: 0; } to { opacity: 1; } }
.scene--build .bd-row .yr { padding-top: 4px; text-align: right; font-size: 12px; line-height: 15px; color: var(--ink); font-variant-numeric: tabular-nums; }
.scene--build .bd-row .yr span { display: block; color: #555; }
.scene--build .bd-row::before { content: ''; position: absolute; left: -14px; top: 18px; width: 8px; height: 1px; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease); }
.scene--build .bd-row:hover .n, .scene--build .bd-row.is-lit .n, .scene--build .bd-row:focus-visible .n { color: var(--accent); }
.scene--build .bd-row:hover::before, .scene--build .bd-row.is-lit::before { transform: scaleX(1); }
.scene--build .bd-row:focus-visible { outline: none; }
.scene--build .bd-else { margin-top: 0; }
.scene--build .bd-links { display: flex; flex-wrap: wrap; gap: 8px 16px; padding-top: 10px; }
.scene--build .bd-links a { color: var(--ink); text-decoration: none; }
.scene--build .bd-links a span { border-bottom: 1px solid var(--g400); transition: color .15s ease, border-color .15s ease; }
.scene--build .bd-links a:hover span { color: var(--accent); border-color: var(--accent); }
.scene--build .bd-links--sub { padding-top: 6px; font-size: 12px; line-height: 15px; }
@media (min-width: 801px) { .scene--build .bd-links--soc { display: none; } } /* the same links are pinned bottom-right */
.scene--build .bd-fr { margin-top: 30px; }
.scene--build .bd-fr .h { font-size: 12px; line-height: 15px; color: #555; letter-spacing: .06em; text-transform: uppercase; }
.scene--build .bd-fr .bd-links { gap: 8px 22px; }
.scene--build .bd-jl { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.scene--build .bd-jl svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.scene--build .bd-jl .ld { fill: none; stroke: var(--ink); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0; transition: opacity .12s linear; }
.scene--build .bd-jl .ld.is-energy { stroke: var(--accent); stroke-dasharray: 2 6; animation: bd-flow .55s linear infinite; }
@keyframes bd-flow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 16; } }
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
.scene--build .bd-jc .im canvas { display: block; width: 100%; height: 100%; }
.scene--build .bd-jc .im.mz { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 3px; background: var(--bg); }
.scene--build .bd-jc .im.mz img { position: static; visibility: visible; width: 100%; height: 100%; min-height: 0; object-fit: cover; }
.scene--build .bd-jc .tx { display: block; padding: 7px 8px 6px; font-family: var(--serif); font-size: 18px; line-height: 21px; letter-spacing: 0; }
.scene--build .bd-jc .mt { display: block; padding-top: 6px; font-size: 12px; line-height: 15px; }
.scene--build .bd-jc .mt .t { display: block; color: var(--ink); }
.scene--build .bd-jc .mt .m { display: block; margin-top: 1px; color: #555; }
.scene--build .bd-jc .mt .m2 { display: block; margin-top: 4px; color: #555; }
.scene--build .bd-side .bd-sh, .scene--build .bd-side .bd-tl, .scene--build .bd-side .bd-row, .scene--build .bd-side .bd-gh { transition: opacity .25s ease; }
/* once the settled page has faded in, its blocks answer hover dims quickly (no entrance stagger) */
.scene--build.is-settled.is-shown .bd-poem > .bd-st, .scene--build.is-settled.is-shown .bd-poem > .bd-attr,
.scene--build.is-settled.is-shown .bd-tail > * { transition: opacity .25s ease; }
.scene--build .bd-kick { transition: opacity .25s ease; }
/* a phrase's cards are up: the index steps back completely (no fragments peek around the cards, no orphan rows);
   the header and the timeline (its lit squares show the related projects) stay only where no card covers them */
.scene--build.is-jumping .bd-side .bd-sh:not(.is-clear), .scene--build.is-jumping .bd-side .bd-tl:not(.is-clear),
.scene--build.is-jumping .bd-side .bd-row, .scene--build.is-jumping .bd-side .bd-gh { opacity: 0; }
/* an index row's card is up (it sits over the poem column): the poem steps back */
.scene--build.is-jumping-idx .bd-poem > .bd-st, .scene--build.is-jumping-idx .bd-poem > .bd-attr, .scene--build.is-jumping-idx .bd-poem > .bd-kick,
.scene--build.is-jumping-idx .bd-tail > * { opacity: .04; }
.scene--build .bd-jp { position: absolute; left: 0; right: 0; background: var(--bg); border-top: 1px solid var(--g300); border-bottom: 1px solid var(--g300); pointer-events: auto; opacity: 0; transition: opacity .12s linear; }
.scene--build .bd-jp.is-in { opacity: 1; }
.scene--build a.bd-jc:hover .fr { border-color: var(--accent); }
.scene--build a.bd-jc:hover .tx, .scene--build a.bd-jc:hover .mt .t { color: var(--accent); }
@media (min-width: 1200px) {
  .scene--build .bd-grid { grid-template-columns: minmax(340px, 500px) minmax(300px, 420px); column-gap: clamp(48px, 5vw, 84px); max-width: none; }
  .scene--build .bd-poem { grid-column: 1; grid-row: 1; }
  .scene--build .bd-side { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
  .scene--build .bd-tail { grid-column: 1; grid-row: 2; }
  .scene--build .bd-side.is-sticky { position: sticky; top: 28px; }
}
@media (min-width: 1200px) and (max-width: 1359px) { /* the poem column is ~390 px here: no widows in the opening stanza */
  .scene--build .bd-st--open { font-size: 25px; line-height: 31px; }
  .scene--build .bd-st--open .bd-sn { top: 9px; }
}
@media (max-width: 800px) {
  .scene--build .bd-set { left: 0; right: 0; padding: 0 16px; bottom: 104px; }
  .scene--build .bd-kick { margin-bottom: 16px; }
  .scene--build .bd-grid { padding-top: 22px; row-gap: 44px; }
  .scene--build .bd-sn { position: static; display: block; margin-bottom: 2px; }
  .scene--build .bd-st { font-size: 17px; line-height: 25px; }
  .scene--build .bd-st--open { font-size: 24px; line-height: 29px; }
  .scene--build .bd-row::before { display: none; }
  .scene--build .bd-row { grid-template-columns: 20px 52px minmax(0, 1fr) auto; column-gap: 10px; }
  .scene--build .bd-row .th { width: 52px; height: 36px; }
}
/* "Play with sound": browsers only start audio after a gesture, so a film that opens without one (a direct link to
   #build) plays silently under a light veil with this pill; any click, tap or key starts it from 0:00 with the music.
   It sits in clear space (placePill: under the terminal, on the text column's left edge), a white halo keeps every
   hairline off it, and one glyph (the accent ▶, at cap height) says what it does. (left/top: its top-left corner) */
.scene--build .bd-veil { position: absolute; inset: 0; z-index: 6; background: rgba(255, 255, 255, .64); cursor: pointer;
  opacity: 0; visibility: hidden; transition: opacity .45s ease, visibility 0s linear .45s; }
.scene--build .bd-go { position: absolute; left: 50%; top: 50%; z-index: 7; display: inline-flex; align-items: center; gap: 12px;
  padding: 13px 22px 13px 18px; border: 1px solid var(--ink); border-radius: 26px; background: var(--bg); color: var(--ink);
  box-shadow: 0 0 0 10px var(--bg); cursor: pointer; white-space: nowrap;
  font-family: var(--mono); font-size: 14px; line-height: 18px; letter-spacing: .02em;
  opacity: 0; visibility: hidden; transform: translateY(6px);
  transition: opacity .35s ease, transform .35s var(--ease), visibility 0s linear .35s, background-color .15s ease, color .15s ease, border-color .15s ease; }
.scene--build.is-waiting .bd-veil { opacity: 1; visibility: visible; transition: opacity .6s ease, visibility 0s; }
.scene--build.is-waiting .bd-go { opacity: 1; visibility: visible; transform: none;
  transition: opacity .5s ease .1s, transform .5s var(--ease) .1s, visibility 0s, background-color .15s ease, color .15s ease, border-color .15s ease; }
.scene--build .bd-go:hover, .scene--build .bd-go:focus-visible { border-color: var(--accent); color: var(--accent); outline: none; }
.scene--build .bd-go .pl { flex: none; width: 0; height: 0; border-style: solid; border-width: 5.5px 0 5.5px 9.5px;
  border-color: transparent transparent transparent var(--accent); margin: 0 1px 1px 0; animation: bd-breathe 2.4s ease-in-out infinite; }
@keyframes bd-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.scene--build .bd-go .k { color: var(--g600); margin-left: -2px; }
.scene--build .bd-go.is-compact .k { display: none; }
@media (max-width: 799px) { .scene--build .bd-go { padding: 11px 18px 11px 15px; gap: 10px; font-size: 13px; box-shadow: 0 0 0 8px var(--bg); } }
/* while the pill is up it is the one call to action: core's "Click or press any key for sound" line steps aside */
body:has(.scene--build.is-active.is-waiting) #hint { visibility: hidden !important; opacity: 0 !important; }
@media (prefers-reduced-motion: reduce) { .scene--build .bd-cur, .scene--build .bd-jl .ld.is-energy, .scene--build .bd-go .pl { animation: none; } }
`;

  /* ================================================================== scene */
  Site.register({
    id: 'build', n: 5, title: 'Build', path: '/build',
    caption: CAP_FILM,
    create(el, api) {
      const C = api.colors, FN = api.fonts, H = Site.h;
      readSN(); // (every scene file has registered by now: create runs after boot)
      const AU = () => api.audio || (window.Site && window.Site.audio) || null;
      el.append(H('style', { text: CSS }));
      // a touch device (no hover): the copy says "Tap", and the buttons carry no keyboard hints
      const mq = q => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
      const TOUCH = mq('(hover: none)') || mq('(pointer: coarse)');
      const capSet = () => (TOUCH ? CAP_SET_TOUCH : CAP_SET);

      /* ---------------------------------------------------------- images */
      const imgs = {};
      function img(src) {
        if (!src) return null;
        let im = imgs[src];
        if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; imgs[src] = im; }
        return im;
      }
      const ready = im => im && im.complete && im.naturalWidth > 0;
      const loaded = im => new Promise(res => { if (!im) return res(); if (im.complete) return res(); im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); });
      // Loading is chained so the montage (needed from bar 3 beat 3, ~5 s in) never competes with later images:
      // the montage first; then the photos of the first bars (bar 5: headshot, idontwannadie); then the film's other
      // images; the photos only the hover cards use when the page settles (or after 12 s).
      let laterT = 0;
      Promise.all(MONTAGE.map(m => loaded(img(m.src))))
        .then(() => Promise.all([loaded(img(IMG.yash)), loaded(img(IMG.idw))]))
        .then(() => { Object.values(IMG).forEach(img); FILM_PHOTOS.forEach(img); });
      function preloadLater() { clearTimeout(laterT); Object.values(IMG).forEach(img); HOVER_SRCS.forEach(img); }
      laterT = setTimeout(preloadLater, 12000);

      /* ---------------------------------------------------------- canvas + text engine */
      const cv = api.canvas(el);
      cv.canvas.classList.add('bd-film');
      const ctx = cv.ctx;
      const mcache = new Map(), lcache = new Map();
      function resetText() { mcache.clear(); lcache.clear(); if (typeof ovReset === 'function') ovReset(); }
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
        const tw = q => (q.w = q.sp ? spW * q.s.length : mw(font, q.s));
        let x = 0, y = 0, W = 0;
        for (let i = 0; i < toks.length;) {
          const t = toks[i];
          if (t.sp) { t.x = x; t.y = y; tw(t); if (x > 0) x += t.w; else t.hide = true; i++; continue; }
          let j = i, gw = 0;
          while (j < toks.length && !toks[j].sp) { gw += tw(toks[j]); j++; }
          // an emphasized phrase wraps as one unit ("will power." never splits into "will / power."), unless the
          // phrase alone is wider than the column: then it breaks between its words like any other text (and its
          // tail is not regrouped: that left the first word alone on a line, "they / build / before they search.")
          let j2 = j, gw2 = gw, pw = i - 1;
          while (pw >= 0 && toks[pw].sp) pw--;
          const mid = t.span >= 0 && pw >= 0 && toks[pw].span === t.span;
          while (!mid && j2 < toks.length && toks[j2].sp && toks[j2].span >= 0 && toks[j2 - 1].span === toks[j2].span) {
            gw2 += tw(toks[j2]); j2++;
            while (j2 < toks.length && !toks[j2].sp) { gw2 += tw(toks[j2]); j2++; }
          }
          if (j2 > j && gw2 <= maxW) { j = j2; gw = gw2; }
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
              const tx = x + xe + Math.max(16, size * 0.62 + 6); // clear of the block cursor
              // only if it fits: inside the frame, and (o.tagMax) left of a figure column beside the text
              if (tx + mw(monoF(12), o.tag[i]) <= (o.tagMax != null ? o.tagMax : G.F.x1 + 8)) label(o.tag[i], tx, y + r.y - size * 0.26, { color: C.accent });
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

      /* ---------------------------------------------------------- math overlays (KaTeX) */
      // Canvas text can't typeset math, so any label with notation is an absolutely-positioned HTML node
      // (mono prose + KaTeX spans) that follows the canvas transform. `src` uses $…$ for math:
      //   mlabel('turb.law', 'wind power $P/A = \\tfrac12\\rho v^3$', x, baselineY, { size: 13, align: 'right' })
      // Nodes are pooled by key; each frame marks what it used and ovEnd() hides the rest.
      const ovl = H('div', { class: 'bd-ov', 'aria-hidden': 'true' });
      el.append(ovl);
      const OV = new Map();
      let ovGen = 0;
      const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      // if KaTeX failed to load, show a readable plain approximation rather than raw LaTeX
      const TEXF = [[/\\(left|right|,)/g, ''], [/\\tfrac\{1\}\{2\}/g, '½'], [/\\mathbb\{R\}/g, 'ℝ'], [/\\mathrm\{([^}]*)\}/g, '$1'],
        [/\\beta/g, 'β'], [/\\chi/g, 'χ'], [/\\psi/g, 'ψ'], [/\\theta/g, 'θ'], [/\\pi/g, 'π'], [/\\rho/g, 'ρ'], [/\\le\b/g, '≤'],
        [/\\approx/g, '≈'], [/\\in\b/g, '∈'], [/\\\|/g, '‖'], [/\^\{?\\circ\}?/g, '°'], [/\\%/g, '%'], [/[{}]/g, '']];
      const texFallback = tex => TEXF.reduce((q, [re, to]) => q.replace(re, to), tex);
      function richHTML(src) {
        return String(src).split(/(\$[^$]+\$)/).map(p => (p.length > 2 && p[0] === '$' && p[p.length - 1] === '$'
          ? Site.texHTML(p.slice(1, -1), { fallback: texFallback(p.slice(1, -1)) }) : escH(p))).join('');
      }
      function mlabel(key, src, x, y, o) {
        o = o || {};
        const size = o.size || 13;
        let r = OV.get(key);
        if (!r) { const e = H('div', { class: 'bd-ml' }); ovl.append(e); r = { e, src: null, size: 0, bl: null, w: 0, h: 0, x0: 0, y0: 0, seq: 0, tf: '', op: '', col: '', vis: false, gen: 0 }; OV.set(key, r); }
        if (r.src !== src || r.size !== size || r.bg !== !!o.bg) {
          r.e.innerHTML = richHTML(src) + '<span class="bl"></span>';
          r.e.style.fontSize = size + 'px';
          r.e.classList.toggle('is-bg', !!o.bg);
          r.src = src; r.size = size; r.bg = !!o.bg; r.bl = null;
        }
        if (r.bl == null) { r.bl = r.e.lastChild.offsetTop; r.w = r.e.offsetWidth; r.h = r.e.offsetHeight; } // layout read only when content changes
        const m = ctx.getTransform(), d = cv.dpr || 1;
        const X = (m.a * x + m.c * y + m.e) / d, Y = (m.b * x + m.d * y + m.f) / d;
        const ax = o.align === 'right' ? r.w : o.align === 'center' ? r.w / 2 : 0;
        r.x0 = X - ax; r.y0 = Y - r.bl; r.seq = ++ovSeq;
        const tf = `translate3d(${Math.round(X - ax)}px, ${Math.round(Y - r.bl)}px, 0)`;
        const op = String(Math.round(clamp01(ctx.globalAlpha * (o.alpha == null ? 1 : o.alpha)) * 100) / 100);
        const col = o.color || C.ink;
        if (tf !== r.tf) { r.e.style.transform = tf; r.tf = tf; }
        if (op !== r.op) { r.e.style.opacity = op; r.op = op; }
        if (col !== r.col) { r.e.style.color = col; r.col = col; }
        r.gen = ovGen; // ovEnd() shows it (unless something drawn later covers it)
        return r.w;
      }
      // the width a label would take, without showing it (its own pooled node, left hidden)
      function mlabelW(key, src, size) {
        const w = mlabel(key, src, 0, 0, { size });
        OV.get(key).gen = -1;
        return w;
      }
      // Canvas content drawn AFTER a label (a photo flash, a jump-out card) must still cover it: those
      // draws register an occluder rect and ovEnd() hides any label they overlap.
      let ovSeq = 0;
      const occ = [];
      function occlude(x, y, w, h) {
        const m = ctx.getTransform(), d = cv.dpr || 1;
        const X0 = (m.a * x + m.c * y + m.e) / d, Y0 = (m.b * x + m.d * y + m.f) / d;
        const X1 = (m.a * (x + w) + m.c * (y + h) + m.e) / d, Y1 = (m.b * (x + w) + m.d * (y + h) + m.f) / d;
        if (ctx.globalAlpha > 0.35) occ.push({ x0: Math.min(X0, X1), y0: Math.min(Y0, Y1), x1: Math.max(X0, X1), y1: Math.max(Y0, Y1), seq: ++ovSeq });
      }
      function ovBegin() { ovGen++; occ.length = 0; }
      function ovEnd() {
        OV.forEach(r => {
          let show = r.gen === ovGen;
          if (show && occ.length) {
            for (const q of occ) if (q.seq > r.seq && q.x0 < r.x0 + r.w && q.x1 > r.x0 && q.y0 < r.y0 + r.h && q.y1 > r.y0) { show = false; break; }
          }
          if (show !== r.vis) { r.e.style.visibility = show ? 'visible' : 'hidden'; r.vis = show; }
        });
      }
      function ovHideAll() { ovGen++; ovEnd(); }
      function ovReset() { OV.forEach(r => { r.bl = null; }); }

      /* ---------------------------------------------------------- drawing primitives */
      const T2 = '#555'; // secondary readable text (round-2 rule: #444–#555); C.g500/#999 only for guides
      function label(s, x, y, o) {
        o = o || {};
        const sz = o.size || 12;
        if (KO.length && !o.noKO) { // under a photo flash this frame: not drawn at all
          const w = mw(monoF(sz, o.w), s), x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
          for (const q of KO) if (x0 < q.x1 && x0 + w > q.x0 && y - sz * 0.9 < q.y1 && y + sz * 0.3 > q.y0) return;
        }
        ctx.font = monoF(sz, o.w);
        if (o.bg) { // a white ground so lines behind never cut through the letters
          const w = mw(monoF(sz, o.w), s), x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
          ctx.fillStyle = C.bg; ctx.fillRect(x0 - 3, y - sz * 0.9, w + 6, sz * 1.2);
        }
        ctx.fillStyle = o.color || C.ink;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(s, x, y);
        ctx.textAlign = 'left';
      }
      // one line in several colours, [[text, colour], …]: the scene references keep the accent for the "[n]" only
      function labelMix(parts, x, y, o) {
        const f = monoF((o && o.size) || 12);
        let xx = x;
        if (o && o.align === 'right') xx = x - parts.reduce((q, p) => q + mw(f, p[0]), 0);
        if (o && o.bg) { // one white ground under the whole line (per-part grounds would clip the neighbouring glyphs)
          const sz = o.size || 12, w = parts.reduce((q, p) => q + mw(f, p[0]), 0);
          if (!KO.some(q => xx < q.x1 && xx + w > q.x0 && y - sz * 0.9 < q.y1 && y + sz * 0.3 > q.y0)) { ctx.fillStyle = C.bg; ctx.fillRect(xx - 3, y - sz * 0.9, w + 6, sz * 1.2); }
        }
        for (const [s, col] of parts) { label(s, xx, y, Object.assign({}, o, { color: col, align: 'left', bg: false })); xx += mw(f, s); }
      }
      const mixW = (parts, sz) => parts.reduce((q, p) => q + mw(monoF(sz || 12), p[0]), 0);
      // (a hidden page has no number: the chip goes and the name stands alone)
      const sceneRef = (pre, n, post) => (n ? [[pre, T2], [`[${n}]`, C.accent], [post, T2]] : [[pre, T2], [post.replace(/^ /, ''), T2]]);
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
      function cover(im, x, y, w, h, fy) { // fy: vertical focus of the crop (0 top … 1 bottom)
        if (!ready(im)) { ctx.fillStyle = C.g100; ctx.fillRect(x, y, w, h); return; }
        const key = im.getAttribute('src'), cr = CROP[key];
        const ox = cr ? cr[0] : 0, oy = cr ? cr[1] : 0, iw = cr ? cr[2] : im.naturalWidth, ih = cr ? cr[3] : im.naturalHeight, ir = iw / ih, r = w / h;
        if (fy == null) fy = FY[key] != null ? FY[key] : 0.5;
        const nw = NATIVE_W[key];
        if (nw && w > nw * 1.02) { // smaller than the frame: letterboxed at native size, never upscaled
          ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h);
          const dw = Math.min(nw, w), dh = Math.min(dw / ir, h), dw2 = dh * ir;
          ctx.drawImage(im, ox, oy, iw, ih, Math.round(x + (w - dw2) / 2), Math.round(y + (h - dh) / 2), Math.round(dw2), Math.round(dh));
          return;
        }
        let sw, sh, sx, sy;
        if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) * fy; }
        ctx.drawImage(im, ox + sx, oy + sy, sw, sh, x, y, w, h);
      }
      const aspect = im => (ready(im) ? (CROP[im.getAttribute('src')] ? CROP[im.getAttribute('src')][2] / CROP[im.getAttribute('src')][3] : im.naturalWidth / im.naturalHeight) : 1.6);
      // an <img>-ready source: the cropped data URL for a CROP entry (made once the file has loaded), else src
      const cropURL = {};
      function cropSrc(src, cb) {
        const cr = CROP[src];
        if (!cr) return src;
        if (cropURL[src]) return cropURL[src];
        const im = img(src);
        const make = () => {
          if (cropURL[src] || !ready(im)) return;
          try {
            const c = document.createElement('canvas'); c.width = cr[2]; c.height = cr[3];
            c.getContext('2d').drawImage(im, cr[0], cr[1], cr[2], cr[3], 0, 0, cr[2], cr[3]);
            cropURL[src] = c.toDataURL('image/jpeg', 0.88);
          } catch (e) { cropURL[src] = src; }
        };
        if (ready(im)) { make(); return cropURL[src]; }
        loaded(im).then(() => { make(); if (cb && cropURL[src]) cb(cropURL[src]); });
        return null; // not yet: the caller shows a blank frame and swaps in the crop via cb
      }
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
        occlude(x - 5, y - 5, w + 10, h + 10 + (o.cap ? 20 : 0));
        ctx.fillStyle = C.bg; ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
        const wp = o.wipe ? eOut(u / o.wipe) : 1;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h * wp); ctx.clip();
        if (o.draw) o.draw(x, y, w, h); else cover(im, x, y, w, h, o.fy);
        ctx.restore();
        if (wp < 1) { ctx.fillStyle = C.accent; ctx.fillRect(x, y + h * wp, w, 1); }
        srect(x - 4, y - 4, w + 8, h + 8, C.ink);
        plus(x - 4, y - 4, 3, C.accent); plus(x + w + 4, y + h + 4, 3, C.accent);
        if (o.cap) {
          // the caption never runs past the frame's right edge (phones: the 16 px gutter); its white ground spans
          // the whole caption, so nothing drawn behind it shows through
          const cap = fitCap(o.cap, o.capMax || Math.max(w + 8, (G.phone ? G.w - 16 : G.F.x1 + 8) - (x - 4)));
          const cw = mw(monoF(12), cap);
          ctx.fillStyle = C.bg; ctx.fillRect(x - 4, y + h + 7, Math.max(w + 8, cw + 6), 18);
          label(cap, x - 4, y + h + 21, { noKO: true });
          if (o.dims && ready(im)) {
            const ds = `${im.naturalWidth} × ${im.naturalHeight}`;
            if (cw + mw(monoF(11), ds) + 18 < w + 8) label(ds, x + w + 4, y + h + 21, { align: 'right', size: 11, color: C.g500, noKO: true });
          }
        }
        ctx.restore();
      }
      // shorten a caption to maxW: drop its last clause (", 2024" or " · 2024"), else keep only its number
      // ("fig. 10") or its first clause
      function fitCap(cap, maxW) {
        const f = monoF(12);
        if (!cap || mw(f, cap) <= maxW) return cap;
        const s = cap.replace(/,[^,]*$/, '');
        if (mw(f, s) <= maxW) return s;
        const d = cap.replace(/ · [^·]*$/, '');
        if (d !== cap && mw(f, d) <= maxW) return d;
        return cap.split(' — ')[0].split(' · ')[0];
      }
      // fit an image of aspect ar inside rect R (max fraction of stage width), centred (o.top: top-aligned)
      function fit(ar, R, maxWf, cx, cy, top) {
        let w = Math.min(R.w, G.w * (maxWf || 0.4)), h = w / ar;
        if (h > R.h) { h = R.h; w = h * ar; }
        return { x: (cx != null ? cx : R.x + R.w / 2) - w / 2, y: top ? R.y : (cy != null ? cy : R.y + R.h / 2) - h / 2, w, h };
      }
      // Photo flashes. A section first reserves the rects of the flashes that are up this frame (keepOut), so
      // canvas labels under them are not drawn at all (instead of being sliced by the card's edge), then draws
      // its figure, then the flashes on top. The fit leaves 28 px under a photo for its caption.
      // o: { maxWf, cx, cy, top, wipe, capMax }. On a phone the figure area is the full width: a flash fills it.
      const KO = [];
      function flashGeom(key, lt, t0, dur, R, o) {
        const u = lt - t0;
        if (u < 0 || u >= dur) return null;
        o = o || {};
        const wf = o.maxWf || 0.4, im = img(key), R2 = { x: R.x, y: R.y, w: R.w, h: R.h - 28 };
        const f = fit(AR[key] || aspect(im), R2, G.mobile && !o.keepW ? Math.max(wf, 0.92) : wf, o.cx, o.cy, o.top);
        f.u = u; f.im = im;
        return f;
      }
      function keepOut(key, lt, t0, dur, R, o) {
        const f = flashGeom(key, lt, t0, dur, R, o);
        if (f) KO.push({ x0: f.x - 10, y0: f.y - 10, x1: f.x + f.w + 10, y1: f.y + f.h + 30 });
      }
      function flashImg(key, lt, t0, dur, R, cap, o) {
        const f = flashGeom(key, lt, t0, dur, R, o);
        if (!f) return;
        photo(f.im, f.x, f.y, f.w, f.h, { u: f.u, wipe: (o && o.wipe) || S16 * 1.2, cap, dims: true, capMax: o && o.capMax });
      }
      // a list of flashes [key, t0, dur, R, cap, o]: reserve them before the figure, draw them after it
      function flashes(list, lt, draw) {
        list.forEach(([k, t0, dur, R, cap, o]) => (draw ? flashImg(k, lt, t0, dur, R, cap, o) : keepOut(k, lt, t0, dur, R, o)));
      }
      function callout(ax, ay, lx, ly, text, sub, p, o) {
        if (p <= 0) return;
        o = o || {};
        ctx.save(); ctx.globalAlpha *= clamp01(p * 3);
        drawOn([[ax, ay]].concat(o.via || [], [[lx, ly]]), eOut(p), o.col || C.ink, [3, 3]); // (o.via: elbow points)
        if (!o.noDot) { ctx.fillStyle = o.col || C.ink; ctx.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4); }
        const right = o.align === 'right';
        label(text, lx + (right ? -4 : 4), ly - 4, { align: right ? 'right' : 'left', color: o.tcol || C.ink, bg: true });
        if (sub) {
          if (o.subKey) mlabel(o.subKey, sub, lx + (right ? -4 : 4), ly + 13, { size: 13, align: right ? 'right' : 'left', color: T2, bg: true });
          else label(sub, lx + (right ? -4 : 4), ly + 12, { align: right ? 'right' : 'left', color: T2, bg: true });
        }
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
      // Header (shared across scenes): desktop — the chapter eyebrow at the content-left x and the step counter
      // at the top-right (right edge on the chrome's 40 px gutter), line 1 at HUD.y1, the progress hairline under
      // it, the play state at HUD.y2. The film frame starts below both (its top corner marks clear line 2).
      const HUD = { y1: 83, bar: 91, y2: 106, frameTop: 120 };
      function relayout() {
        const w = cv.w, h = cv.h, phone = w < 800;
        // A portrait desktop window (an iPad held upright: desktop chrome, a tall narrow stage) gets the stacked
        // composition of the phone film (text on top, figure under it) inside a frame clear of the chrome.
        const tall = !phone && h > w * 1.12;
        const mobile = phone || tall; // (G.mobile = the stacked composition; G.phone = the phone chrome)
        // phone: the film frame stops above the control column (slider + buttons sit ~211px above the bottom)
        const X0 = 300; // the content-left every scene shares: clear of the control column (x < 280) and its buttons
        const F = phone ? { x0: 16, y0: 108, x1: w - 16, y1: h - 230 }
          : tall ? { x0: X0, y0: HUD.frameTop, x1: w - 40, y1: h - 172 } // (above the bottom-right links)
          : { x0: X0, y0: HUD.frameTop, x1: w - 150, y1: h - 98 };
        F.w = F.x1 - F.x0; F.h = F.y1 - F.y0;
        const k = mobile ? 1 : Math.max(0.78, Math.min(1.12, F.w / 970));
        const sz = phone
          ? { XL: Math.min(34, w * 0.085), L: Math.min(28, w * 0.07), M: Math.min(24, w * 0.061), S: Math.min(19, w * 0.049) }
          : tall ? { XL: Math.min(46, F.w * 0.09), L: Math.min(36, F.w * 0.07), M: Math.min(30, F.w * 0.058), S: Math.min(22, F.w * 0.045) }
          : { XL: 58 * k, L: 44 * k, M: 34 * k, S: 25 * k };
        const TX = F.x0, TY = mobile ? F.y0 + sz.L + (tall ? 14 : 0) : F.y0 + F.h * 0.2;
        const TW = mobile ? F.w : F.w * 0.56;
        const fs = tall ? 0.36 : 0.47; // (portrait: a tall frame, so the figure starts nearer the text)
        const FIG = mobile ? { x: F.x0, y: F.y0 + F.h * fs, w: F.w, h: F.h * (1 - fs) } : { x: F.x0 + F.w * 0.61, y: F.y0 + 26, w: F.w * 0.39, h: F.h - 52 };
        const VR = mobile ? { x: F.x0, y: F.y0 + F.h * 0.3, w: F.w, h: F.h * 0.7 } : { x: F.x0, y: F.y0 + 96, w: F.w, h: F.h - 110 };
        G = { w, h, mobile, phone, tall, F, sz, TX, TY, TW, FIG, VR, cw: w, ch: h };
        STREAM = null;
      }

      /* ---------------------------------------------------------- vignettes */
      // Scene [4] — SkyWindFarm: LTA units rise on tethers into high-altitude wind (illustrative).
      // unitArt() is the one place a unit is drawn: Site.art.swfUnit from skywindfarm.js (the same glyph as
      // scene [4]; anchor = deck centre, shell above, rotors below, returns the bridle point), with a local
      // fallback glyph if that export is missing. `s` is this file's unit scale (old glyph ±34·s wide);
      // SWF_K maps it onto swfUnit's scale (deck ±50 units) so both glyphs have the same footprint.
      const SWF_K = 0.62;
      const artFn = name => (window.Site && Site.art && typeof Site.art[name] === 'function' ? Site.art[name] : null);
      function unitArt(x, y, s, t, i, o) {
        o = o || {};
        const f = artFn('swfUnit');
        if (f) {
          ctx.save();
          try {
            if (o.knock !== false) knockUnit(ctx, x, y, s * SWF_K);
            const bp = f(ctx, x, y, s * SWF_K, t, { ink: C.ink, accent: C.accent, bg: C.bg, energy: o.energy || 0,
              phase: t * (o.rps || 0.7) * Math.PI * 2 + (i || 0) * 0.9, detail: o.detail });
            ctx.restore();
            if (bp && isFinite(bp.x) && isFinite(bp.y)) return bp;
          } catch (e) { ctx.restore(); }
        }
        drawUnit(x, y, s, t, i || 0);
        return { x, y: y + 24 * s };
      }
      // swfUnit fills its shell and deck, but the rotor band under the deck is open line art: a hairline drawn
      // behind a unit (wind, streamlines) would run through the rotors. This paper-white band (the rotors and the
      // diffuser walls, in swfUnit's local units: x −47…+37, y 0…+33) makes those lines pass behind the unit.
      function knockUnit(g, x, y, k) {
        g.save(); g.fillStyle = C.bg;
        g.fillRect(x - 47 * k, y + 1 * k, 84 * k, 32 * k);
        g.restore();
      }
      // the conducting tether, unit (x1, y1) → ground (x2, y2); o: swfTether options (energy, packets, highlight, alpha…)
      function tetherArt(x1, y1, x2, y2, t, o) {
        o = o || {};
        const f = artFn('swfTether');
        if (f) {
          ctx.save();
          try { const r = f(ctx, x1, y1, x2, y2, t, Object.assign({ ink: C.ink, accent: C.accent }, o)); ctx.restore(); if (r && r.at) return r; } catch (e) { ctx.restore(); }
        }
        seg(x1, y1, x2, y2, o.highlight ? C.accent : C.g600, o.highlight ? null : [3, 3]);
        const at = u => ({ x: lerp(x1, x2, u), y: lerp(y1, y2, u) });
        (o.packets || []).forEach(u => { const q = at(u); ctx.fillStyle = C.accent; ctx.fillRect(Math.round(q.x - 1.5), Math.round(q.y - 1.5), 3, 3); });
        return { at };
      }
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
          // once aloft, power flows: the generator plates light and packets run down the tether
          // (o.ghost: a photo flash is up over the figure — the units and tethers step back to a ghost, so none is
          // left sliced by the photo's edge)
          const en = eOut((pr - 0.85) / 0.15);
          ctx.save(); if (o.ghost) ctx.globalAlpha *= 0.14;
          const bp = unitArt(ux, uy, s, t, i, { energy: en * 0.8 });
          const te = tetherArt(bp.x, bp.y, gx, gy - 6 * s, t, { energy: en * 0.55, alpha: 0.75, sag: 0.05, speed: 0.5 });
          ctx.restore();
          units.push({ ux, uy, gx, bp, te });
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
          mlabel('turb.vh', '$v(h)$', px + 6, R.y + R.h * 0.06 - 8, { size: 13, color: T2, alpha: pa });
        }
        const cp = o.ghost ? 0 : (lt - BEAT * 3.4) / (BEAT * 0.8), nw = R.w < 560, k = s * SWF_K; // k: swfUnit scale (no callouts under a flash)
        if (units[1] && !nw) callout(units[1].ux - 30 * k, units[1].uy - 24 * k, units[1].ux - 96 * s, units[1].uy - 52 * s, 'flotation shell · helium', null, cp, { align: 'right' });
        if (units[2]) callout(units[2].ux + 34 * k, units[2].uy + 16 * k, Math.min(R.x + R.w - 4, units[2].ux + 96 * s), units[2].uy + 78 * s, 'VAWT cluster', '$C_p = 0.43$ at TSR 3.0', cp - 0.25, { align: units[2].ux + 96 * s > R.x + R.w - 200 ? 'right' : 'left', subKey: 'turb.cp' });
        if (units[0] && !nw) {
          const m = units[0].te.at(0.5);
          callout(m.x, m.y, Math.max(m.x - 70 * s, R.x + 16 + mw(monoF(12), 'power to ground station')), m.y - 30 * s, 'tether', 'power to ground station', cp - 0.5, { align: 'right' });
        }
        // the cube law, typeset (KaTeX), top-right, on a white ground so the wind lines pass behind it
        const la = eOut((lt - BEAT * 0.5) / BEAT);
        if (la > 0) {
          ctx.fillStyle = C.bg; ctx.fillRect(R.x + R.w - (nw ? 150 : 300), R.y - 38, nw ? 150 : 300, nw ? 30 : 50);
          mlabel('turb.law', '$P/A = \\tfrac{1}{2}\\,\\rho\\, v^{3}$', R.x + R.w, nw ? R.y - 12 : R.y - 16, { size: 17, align: 'right', alpha: la });
          if (!nw) label('wind power grows with the cube of speed', R.x + R.w, R.y + 5, { align: 'right', color: T2 });
        }
      }

      // V4 — Robot: the biped's CAD, as the #robot page exports it (a toon-shaded render, white ground). It prints on
      // top-down under an accent scan line (1½ beats from u = 0), washed 42 % toward white so its black servo blocks read
      // as mid-grey, the weight of the other panels' hairlines (white stays white, so no box shows round it). A wide,
      // short panel (a landscape phone) shows the torso and thighs across the panel's width, cropped by its bottom
      // edge, instead of a whole robot a few px tall. Until the file has loaded (or if it is missing): a hairline biped
      // glyph in the same box, so the panel is never empty.
      const ROBOT_BOX = [270, 88, 660, 1334]; // (the render's content box, px of the 1200 × 1500 file)
      function vRobot(R, u) {
        const im = img(IMG.robotCad), k = api.reduced ? 1 : eOut((u || 0) / (BEAT * 1.5));
        let [sx, sy, sw, sh] = ROBOT_BOX;
        // (the same ~80 % content box as the other panels, standing on a hairline ground where theirs sits)
        let h = R.h * 0.82, w = h * sw / sh;
        if (w > R.w * 0.84) { w = R.w * 0.84; h = w * sh / sw; }
        let gy = R.y + R.h * 0.93, x = R.x + (R.w - w) / 2, y = gy - h;
        const crop = ready(im) && w < R.w * 0.4;
        if (crop) { // (top-anchored cover crop: as wide as the others' drawings, running off the panel's bottom)
          w = Math.min(R.w * 0.62, R.h * 1.1); x = R.x + (R.w - w) / 2; y = R.y + R.h * 0.08; h = R.y + R.h + 6 - y;
          sh = Math.min(sh, sw * h / w);
        } else seg(R.x + R.w * 0.06, Math.round(gy) + 0.5, R.x + R.w * 0.94, Math.round(gy) + 0.5, C.g400);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - 4, w + 8, (h + 8) * k); ctx.clip();
        if (ready(im)) {
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        } else { // torso box on two legs of three segments, a foot each (proportions of the render)
          const tw = w, th = h * 0.13, lw = w * 0.2, ly = y + th, lh = h - th - h * 0.06;
          srect(x, y, tw, th, C.ink);
          [x + w * 0.2, x + w * 0.6].forEach(lx => {
            for (let s = 0; s < 3; s++) srect(lx, ly + s * lh / 3 + 2, lw, lh / 3 - 4, C.g500);
            srect(lx - w * 0.04, y + h - h * 0.06, lw + w * 0.08, h * 0.06, C.ink);
          });
        }
        ctx.restore();
        if (k < 1) { ctx.fillStyle = C.accent; ctx.fillRect(x - 6, y - 4 + (h + 8) * k, w + 12, 1); }
      }

      // V1 — LpWM: dense latent → rectified sparse code → predictor rollout (toy). Rows = time, columns = dims.
      function vCode(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, { D, T, v, active } = CODE;
        // (desktop: 184 px on the left for the "predictor / rolls z forward" arrow labels, 150 on the right for the counts)
        // narrow: no side labels (the time labels and counts need rows ≥ 15 px apart, the arrow labels 184 px); the
        // title (2 lines) sits above the grid and the count + caption (2 lines) under it
        const narrow = !mini && (R.w < 560 || Math.min((R.w - 334) / D, (R.h - 90) / T) < 15), padL = mini || narrow ? 0 : 184, padR = mini || narrow ? 0 : 150;
        let cs = Math.max(5, Math.min((R.w - padL - padR) / D, (R.h - (mini ? 8 : narrow ? 100 : 90)) / T, mini ? 20 : 30)), ch = cs;
        // o.fill (the finale's panels): the rollout fills ~84 % of a tall panel; rows (time) spread out vertically
        if (mini && o.fill) { cs = Math.min(R.w * 0.9 / D, 20); ch = Math.max(cs, Math.min(R.h * 0.8 / T, cs * 3.4)); }
        const gw = cs * D, gh = ch * T;
        const x0 = R.x + padL + (R.w - padL - padR - gw) / 2, y0 = R.y + (R.h - gh) / 2 + (mini ? 0 : 6);
        const snap = BEAT, dense = lt < snap, sk = eOut((lt - snap) / S16);
        const rowT = c => (c === 0 ? 0 : BEAT * (1 + c));
        let latest = 0;
        for (let c = 0; c < T; c++) if (lt >= rowT(c)) latest = c;
        const pl = Math.max(1.5, cs * 0.13);
        for (let c = 0; c < T; c++) {
          const shown = lt >= rowT(c);
          for (let d = 0; d < D; d++) {
            const cx = x0 + d * cs + cs / 2, cy = y0 + c * ch + ch / 2;
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
            if (!narrow) label(c === 0 ? 't' : 't+' + c, x0 - 14, y0 + c * cs + cs / 2 + 4, { align: 'right', size: 11, color: c === latest ? C.ink : C.g500 });
            if (!narrow && (c === latest || c === 0)) label(c === 0 && dense ? '24 / 24 non-zero' : `${active[c]} / 24 active`, x0 + gw + 14, y0 + c * cs + cs / 2 + 4, { color: c === latest && !dense ? C.ink : T2 });
          }
        }
        if (mini) return;
        // fresh row: a hairline bracket around the newest prediction
        if (!dense) { const fy = y0 + latest * cs; srect(x0 - 3, fy + 1, gw + 6, cs - 2, latest ? C.accent : C.g300, [2, 3]); }
        if (dense) mlabel('code.h1', 'dense latent $z_t$ · Gaussian target', x0, y0 - 38, { size: 13 });
        else label(narrow ? 'rectified: exact zeros (+)' : 'rectified: negative dims are exactly 0 (+)', x0, y0 - 38, { size: 13, color: C.ink });
        mlabel('code.h2', '$z \\in \\mathbb{R}^{24}$ · toy latent · illustrative', x0, y0 - 16, { size: 13, color: T2 });
        if (narrow) {
          label(dense ? '24 / 24 non-zero' : `t+${latest} · ${active[latest]} / 24 active`, x0, y0 + gh + 20, { color: dense ? T2 : C.ink });
        } else if (lt > BEAT * 2) {
          const ax = x0 - 44, ay1 = y0 + cs / 2, ay2 = y0 + (latest + 0.5) * cs;
          seg(ax, ay1, ax, ay2, C.ink, [3, 3]); seg(ax, ay2, ax - 3, ay2 - 5, C.ink); seg(ax, ay2, ax + 3, ay2 - 5, C.ink);
          label('predictor', ax - 8, ay1 + 4, { align: 'right', color: C.ink });
          mlabel('code.roll', 'rolls $z$ forward', ax - 8, ay1 + 22, { size: 13, align: 'right', color: T2 });
        }
        // (the gap is in percentage points: 62.7 % vs 5.3 % success, lpwm brief)
        const capL = sceneRef('', SN.lpwm, ' LpWM · sparse beats dense by up to +57 pts on PushT planning'), long = !narrow && x0 + mixW(capL) <= G.F.x1 + 4;
        labelMix(long ? capL : sceneRef('', SN.lpwm, ' LpWM · sparse up to +57 pts on PushT'), x0, y0 + gh + (narrow ? 40 : 30));
      }

      // V3 — Radial-VCReg: β₂ = 0 collapses every norm onto one circle; the entropy term spreads them to χ₂
      function vRadial(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, burst = o.burst != null ? o.burst : BAR;
        let cx = R.x + R.w / 2, cy = R.y + R.h / 2 + (mini ? 6 : 0);
        // (mini, the finale's panel: the burst's 95 % shell spans ~80 % of the panel, like the other three panels)
        let U = Math.min(R.w, R.h) * (mini ? 0.16 : 0.132);
        const iw = Math.min(170, R.w, Math.max(R.w * 0.3, 118)); // the radii inset (≥ 118: its two axis labels never meet)
        if (G.mobile && !mini) { // stacked: the cloud (r ≤ 2.8) under the two title lines, left of the inset, inside R
          U = Math.max(8, Math.min((R.w - iw - 12) * 0.16, (R.h - 48) / 5.7));
          cx = R.x + Math.max(2.9 * U, (R.w - iw - 12) / 2); cy = R.y + 46 + 2.85 * U;
        }
        const ax = U * 3.3 * eOut(lt / BEAT);
        const after = lt >= burst, gb = after ? eOut((lt - burst) / (BEAT * 0.5)) : 0; // gb: the ±2 ticks give way to the burst
        seg(cx - ax, cy, cx + ax, cy, C.g300); seg(cx, cy - ax, cx, cy + ax, C.g300);
        if (!mini) for (let k = -3; k <= 3; k++) if (k) {
          seg(cx + k * U, cy - 3, cx + k * U, cy + 3, C.g400);
          if (Math.abs(k) === 2 && gb < 1) { ctx.save(); ctx.globalAlpha *= 1 - gb; label(String(k), cx + k * U, cy + 17, { align: 'center', size: 11, color: C.g500 }); ctx.restore(); }
        }
        ctx.strokeStyle = C.g400; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(cx, cy, U, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (after && !mini) {
          const g = eOut((lt - burst - BEAT) / BEAT);
          if (g > 0) {
            ctx.globalAlpha = g; ctx.strokeStyle = C.g300; ctx.setLineDash([2, 4]);
            [1.1774, 2.4477].forEach(rq => { ctx.beginPath(); ctx.arc(cx, cy, rq * U, 0, Math.PI * 2); ctx.stroke(); });
            ctx.setLineDash([]);
            // the shells' labels sit outside the cloud (its farthest points are at r ≈ 2.8), upper right, each on a
            // hairline leader to its shell
            const lx = cx + (G.mobile ? 2.55 : 1.95) * U, ly = cy - (G.mobile ? 2.15 : 2.8) * U; // (phone: lower, clear of the title lines)
            [[2.4477, ly, 'rad.q95', '95%', -0.62], [1.1774, ly + 19, 'rad.q50', '50%', -1.05]].forEach(([rq, y, key, pc, a]) => {
              const sx = cx + Math.cos(a) * rq * U, sy = cy + Math.sin(a) * rq * U; // (the two leaders fan out to their shells)
              seg(lx - 5, y - 4, sx, sy, C.g500); ctx.fillStyle = C.g600; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3);
              mlabel(key, `$\\chi_2$ ${pc}`, lx, y, { size: 13, color: T2 });
            });
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
          const rel = burst + Math.floor(p.shell / 3) * S16, k = eExp((lt - rel) / 0.7); // three shells per 16th (the foley grid)
          const a = lerp(p.a0 + rot, p.a1 + rot * 0.25, k), rr = lerp((1 + pulse) * intro, p.rad, k);
          if (radii) radii[i] = rr;
          const x = cx + Math.cos(a) * rr * U, y = cy + Math.sin(a) * rr * U;
          if (k > 0.02 && k < 0.97) lit.push(x, y); else ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
        ctx.fillStyle = C.accent;
        for (let i = 0; i < lit.length; i += 2) ctx.fillRect(lit[i] - 1, lit[i + 1] - 1, 2, 2);
        if (mini) return;
        const nw = R.w < 560;
        // the two title lines end inside the frame: where the headline is wider than the figure it moves left (the
        // frame's top is clear there), and the caption takes the widest wording that fits from the same x
        // (placed by the wider of the two headlines, so the title block does not shift when the burst swaps them)
        const H1 = [nw ? '$\\beta_2 = 0$ · norms collapse to $r = 1$' : '$\\beta_2 = 0$ · all norms collapse onto $r = 1$',
          nw ? '$\\beta_2 > 0$ · $\\|z\\|$ spreads toward $\\chi_2$' : '$\\beta_2 > 0$ · entropy term spreads $\\|z\\|$ toward $\\chi_2$'];
        const h1 = H1[after ? 1 : 0], xR = G.F.x1 + 4;
        mlabel('rad.h1', h1, R.x, R.y + 12, { size: 13, color: C.ink });
        const hw = Math.max(mlabelW('rad.h1m0', H1[0], 13), mlabelW('rad.h1m1', H1[1], 13));
        const hx = Math.max(G.mobile ? G.F.x0 : G.TX + G.TW * 0.5, Math.min(R.x, xR - hw));
        if (hx !== R.x) mlabel('rad.h1', h1, hx, R.y + 12, { size: 13, color: C.ink });
        const capV = [nw ? ' Radial-VCReg · toy' : ' Radial-VCReg · 2-D toy · illustrative', ' Radial-VCReg · toy', ' Radial-VCReg']
          .map(q => sceneRef('fig. 07 · ', SN.radial, q)).concat([sceneRef('', SN.radial, ' Radial-VCReg')]);
        labelMix(capV.find(q => hx + mixW(q) <= xR) || capV[capV.length - 1], hx, R.y + 32); // (the "→ fig. 07" tag on "no limits")
        // inset: histogram of radii vs the χ₂ pdf  r·exp(−r²/2)
        // (desktop: right under the ring, its right edge on the ring's 95% shell, so the chart sits by what it explains)
        const ih = 64, r95 = 2.4477 * U;
        // (portrait: its axis labels end 16 px above the frame's foot, clear of the links column under it)
        let ix = R.x + R.w - iw, iy = R.y + R.h - ih - (G.tall ? 34 : 8);
        if (!G.mobile && cy + r95 + 24 + ih + 24 <= R.y + R.h) { ix = Math.min(R.x + R.w - iw, cx + r95 - iw); iy = cy + r95 + 24; }
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
        mlabel('rad.ax', '$\\|z\\|$', ix, iy + ih + 17, { size: 13, color: T2 });
        mlabel('rad.pdf', '$\\chi_2$ pdf', ix + iw, iy + ih + 17, { size: 13, align: 'right', color: C.accent });
      }

      // V2 — Rectified LpJEPA: samples fill a Gaussian; ReLU sends the negative half to an exact spike at 0
      // the histogram's frame: axis height, x range and value → x (shared with the bar-32 photo slot)
      function histGeom(R, mini) {
        const axY = R.y + R.h * (mini ? 0.86 : 0.8), W = R.w * (mini ? 0.86 : 0.78), x0 = R.x + (R.w - W) / 2;
        return { axY, W, x0, X: v => x0 + ((v + 3) / 6) * W, top: R.y + (mini ? 16 : 50) };
      }
      function vHist(R, lt, t, o) {
        o = o || {};
        const mini = !!o.mini, fillEnd = o.fill || BAR, rt = o.rect != null ? o.rect : BAR;
        const NB = 30, lo = -3, hi = 3, bw = (hi - lo) / NB;
        const { axY, W, x0, X, top: yTop } = histGeom(R, mini);
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
        if (!mini) for (let k = -2; k <= 2; k++) { seg(X(k), axY, X(k), axY + 4, C.ink); label(String(k), X(k), axY + 18, { align: 'center', size: 11, color: T2 }); }
        // (while the negative half slides into 0 its samples pile up in the bin just left of 0: every bar is capped
        // at the frame, like the spike, with the same // break mark)
        for (let b = 0; b < NB; b++) {
          if (!cnt[b]) continue;
          const full = cnt[b] * unitH, hh = Math.min(full, axY - yTop), bx = X(lo + b * bw), bwp = W / NB - 2;
          const neg = lo + b * bw < 0;
          ctx.fillStyle = neg && rk > 0 ? C.g200 : C.g100; ctx.fillRect(bx + 1, axY - hh, bwp, hh);
          srect(bx + 1, axY - hh, bwp, hh, neg && rk > 0 ? C.g400 : C.ink);
          if (full > hh + 0.5) {
            const y = axY - hh, cx = bx + 1 + bwp / 2, col = neg && rk > 0 ? C.g400 : C.ink;
            ctx.fillStyle = C.bg; ctx.fillRect(cx - bwp / 2 - 1, y + 10, bwp + 2, 5);
            seg(cx - bwp / 2 - 2, y + 12, cx + bwp / 2 + 2, y + 8, col); seg(cx - bwp / 2 - 2, y + 16, cx + bwp / 2 + 2, y + 12, col);
          }
        }
        if (!mini) { // samples in flight: clipped to the plot, below the vignette's two title lines
          ctx.save(); ctx.beginPath(); ctx.rect(R.x - 4, R.y + 44, R.w + 8, axY - R.y - 44); ctx.clip();
          for (let i = Math.max(0, n - 14); i < n; i++) {
            const ta = (i / HIST.N) * fillEnd, f = (lt - ta) / 0.22;
            if (f >= 1) continue;
            const x = HIST.xs[i], b = Math.floor((x - lo) / bw), top = Math.max(yTop, axY - cnt[Math.max(0, Math.min(NB - 1, b))] * unitH);
            ctx.fillStyle = C.accent; ctx.fillRect(X(x) - 1.5, lerp(top - 90, top, eIn(f)) - 1.5, 3, 3);
          }
          ctx.restore();
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
          const top = Math.max(yTop, axY - spike * unitH);
          ctx.fillStyle = C.accent; ctx.fillRect(X(0) - 1.5, top, 3, axY - top);
          if (top > axY - spike * unitH) { // axis break: the spike is taller than the frame
            ctx.fillStyle = C.bg; ctx.fillRect(X(0) - 5, top + 10, 10, 5);
            seg(X(0) - 6, top + 12, X(0) + 6, top + 8, C.accent); seg(X(0) - 6, top + 16, X(0) + 6, top + 12, C.accent);
          }
          if (!mini) {
            mlabel('hist.n', `spike at 0 · $n = ${spike}$`, X(0) + 12, top + 10, { size: 13, color: C.ink, bg: true });
            mlabel('hist.p', R.w < 560 ? '$P(x \\le 0) = 0.5$' : '$P(x \\le 0) = 0.5$ → exactly 0', X(0) + 12, top + 31, { size: 13, color: T2, bg: true });
          }
        }
        if (mini) return;
        const nw = R.w < 560;
        if (rk > 0) mlabel('hist.h1', nw ? '$\\mathrm{ReLU}(x)$: spike at 0 + half-tail' : '$\\mathrm{ReLU}(x)$: Gaussian → spike at 0 + half-tail', R.x, R.y + 12, { size: 13, color: C.ink });
        else label(`samples ${n} / ${HIST.N}`, R.x, R.y + 12, { size: 13, color: C.ink });
        labelMix(sceneRef('', SN.lpjepa, nw ? ' Rectified LpJEPA · illustrative' : ' Rectified LpJEPA · rectified Gaussian target · illustrative'), R.x, R.y + 32);
      }

      // potential flow past two SkyWindFarm units, each modelled as a cylinder: ψ = U·y·(1 − R²/r²) superposed (illustrative)
      let STREAM = null;
      function streams(R) {
        if (STREAM && STREAM.key === R.x + ',' + R.y + ',' + R.w + ',' + R.h) return STREAM;
        const m = Math.min(R.w, R.h);
        const cyl = [{ x: R.x + R.w * 0.64, y: R.y + R.h * 0.38, r: m * 0.085 }, { x: R.x + R.w * 0.84, y: R.y + R.h * 0.6, r: m * 0.072 }];
        const vel = (x, y) => {
          let u = 1, v = 0;
          for (const c of cyl) { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy, R2 = c.r * c.r; if (r2 < R2 * 0.9) return null; u -= R2 * (dx * dx - dy * dy) / (r2 * r2); v -= 2 * R2 * dx * dy / (r2 * r2); }
          return [u, v];
        };
        const lines = [], gy = R.y + R.h, fh = R.h - 22; // the ground is the figure's bottom edge; the flow stays 16 px+ above it
        for (let k = 0; k < 17; k++) {
          const y0 = R.y + (fh * (k + 0.5)) / 17, pts = [[R.x, y0]];
          let x = R.x, y = y0;
          for (let it = 0; it < 900 && x < R.x + R.w; it++) {
            const a = vel(x, y); if (!a) break;
            const b = vel(x + a[0] * 3, y + a[1] * 3); if (!b) break;
            const ux = (a[0] + b[0]) / 2, uy = (a[1] + b[1]) / 2, m = Math.hypot(ux, uy) || 1;
            x += (ux / m) * 6; y += (uy / m) * 6; pts.push([x, y]);
          }
          lines.push(pts);
        }
        STREAM = { key: R.x + ',' + R.y + ',' + R.w + ',' + R.h, cyl, lines, gy };
        return STREAM;
      }
      // One obstacle of the flow figure: a SkyWindFarm unit (the scene [4] glyph) centred in its model cylinder
      // (a dashed circle of radius R = c.r, which is what the streamlines go around), hanging on a tether that
      // carries energy down to a ground drum on the hatched ground line at the bottom of the figure.
      function rotorArt(c, i, t, R) {
        ctx.strokeStyle = C.g500; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (!artFn('swfUnit')) { // fallback: the old rotor glyph
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.8, 0, Math.PI * 2); ctx.stroke();
          const a = t * (i ? -5 : 5);
          for (let b = 0; b < 3; b++) { const aa = a + b * 2.0944; seg(c.x, c.y, c.x + Math.cos(aa) * c.r * 0.65, c.y + Math.sin(aa) * c.r * 0.65, C.g500); }
          return;
        }
        // deck ±0.9 R wide; the body (shell top −39 … rotor bottom +27, local units) is centred on the cylinder
        const s = (c.r * 0.9) / 50 / SWF_K, k = s * SWF_K, uy = c.y + 6 * k;
        const bp = unitArt(c.x, uy, s, t, i, { energy: 0.7, rps: 0.8, knock: false }); // (the streamlines go round the circle anyway)
        const gy = R.y + R.h, gx = bp.x - (gy - bp.y) * 0.2;
        tetherArt(bp.x, bp.y, gx, gy - 7, t, { energy: 0.6, alpha: 0.7, sag: 0.05, speed: 0.45 });
        ctx.fillStyle = C.bg; ctx.fillRect(gx - 6, gy - 7, 12, 7);
        srect(gx - 6, gy - 7, 12, 7, C.ink);
        if (i === 0 && c.r > 22) { // the model radius R (what the formula's R refers to): a radius callout outside
          // the glyph — a short leader pointing in at the dashed circle, arrowhead on it, R beyond; the centre mark
          const a = -0.62, ca = Math.cos(a), sa = Math.sin(a), ex = c.x + ca * c.r, ey = c.y + sa * c.r, L = 22;
          seg(ex + ca * L, ey + sa * L, ex + ca * 1.5, ey + sa * 1.5, C.g600);
          const nx = -sa, ny = ca; // arrowhead at the circle, pointing at the centre
          seg(ex + ca * 1.5, ey + sa * 1.5, ex + ca * 7 + nx * 3, ey + sa * 7 + ny * 3, C.g600);
          seg(ex + ca * 1.5, ey + sa * 1.5, ex + ca * 7 - nx * 3, ey + sa * 7 - ny * 3, C.g600);
          mlabel('flow.R', '$R$', ex + ca * (L + 4) + 1, ey + sa * (L + 4) + 2, { size: 14, color: C.ink });
        }
      }
      // o: { labels (show the label + formula), fieldA (alpha of the field: streamlines + units) }
      function drawStreams(R, lt, t, o) {
        const S = streams(R), gy = S.gy;
        ctx.save(); ctx.globalAlpha *= o.fieldA;
        // streamlines: 16 px clear of the ground; on desktop they fade out behind the headline (left), so the words stay clean
        ctx.save(); ctx.beginPath(); ctx.rect(R.x - 2, R.y - 30, R.w + 4, gy - 16 - R.y + 30); ctx.clip();
        let gGrey = C.g300, gAcc = C.accent;
        if (!G.mobile) {
          const x1 = Math.min(R.x + R.w * 0.9, G.TX + G.TW + 40);
          gGrey = ctx.createLinearGradient(R.x, 0, x1, 0); gGrey.addColorStop(0, 'rgba(221,221,221,0.25)'); gGrey.addColorStop(1, C.g300);
          gAcc = ctx.createLinearGradient(R.x, 0, x1, 0); gAcc.addColorStop(0, 'rgba(20,50,245,0.22)'); gAcc.addColorStop(1, C.accent);
        }
        S.lines.forEach((pts, k) => {
          const acc = k === 7 || k === 11;
          ctx.strokeStyle = acc ? gAcc : gGrey; ctx.lineWidth = 1;
          ctx.setLineDash(acc ? [22, 12] : [10, 8]); ctx.lineDashOffset = -t * (acc ? 90 : 60);
          ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        });
        ctx.restore();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        // the hatched ground line the tethers come down to
        const gx0 = Math.max(R.x, Math.min(G.mobile ? R.x : G.TX + G.TW + 24, ...S.cyl.map(c => c.x - (gy - c.y) * 0.22 - 28)));
        seg(gx0, gy + 0.5, R.x + R.w, gy + 0.5, C.ink);
        for (let x = gx0 + 4; x < R.x + R.w; x += 12) seg(x, gy + 1, x - 5, gy + 6, C.g300);
        S.cyl.forEach((c, i) => rotorArt(c, i, t, R));
        ctx.restore();
        const c0 = S.cyl[0];
        if (o.labels) { // the labels leave the moment the next line starts typing (the "rules" figure takes over)
          // the block (a header line, then the formula + "illustrative") takes the widest wording that fits between
          // the headline column and the frame's right edge
          const xL = G.mobile ? R.x : G.TX + G.TW + 16, xR = R.x + R.w;
          let ly = c0.y - c0.r;
          ctx.save(); ctx.globalAlpha *= o.fieldA;
          const fw = mlabel('flow.psi', '$\\psi = U\\,y\\left(1 - R^2/r^2\\right)$', xL, ly - 16, { size: 15, color: C.ink });
          const iw = mw(monoF(12), 'illustrative'), hw = s => mw(monoF(12), s.replace('$R$', 'R')) + 2;
          const V = [['potential flow · unit ≈ cylinder of radius $R$', true], ['potential flow · unit ≈ cylinder, radius $R$', true],
            ['potential flow · cylinder, radius $R$', true], ['potential flow · illustrative', false]];
          const need = ([h, side]) => Math.max(hw(h), side ? fw + 12 + iw : fw);
          const v = V.find(q => need(q) <= xR - xL) || V[3], bw = need(v);
          const lx = Math.max(xL, Math.min(c0.x - c0.r, xR - bw));
          // the radius label R (just placed, beside the first unit) keeps 3 px under the formula: where they would
          // meet, the block moves up
          const oR = OV.get('flow.R'), oP = OV.get('flow.psi');
          if (oR && oP && oR.gen === ovGen && oP.bl != null && oR.x0 < lx + fw && oR.x0 + oR.w > lx) {
            const pb = (ly - 16) - oP.bl + oP.h; // the formula's bottom
            if (pb + 3 > oR.y0) ly -= pb + 3 - oR.y0;
          }
          ctx.fillStyle = C.bg; ctx.fillRect(lx - 4, ly - 60, bw + 8, 50);
          mlabel('flow.h', v[0], lx, ly - 42, { size: 12, color: T2 });
          mlabel('flow.psi', '$\\psi = U\\,y\\left(1 - R^2/r^2\\right)$', lx, ly - 16, { size: 15, color: C.ink });
          if (v[1]) label('illustrative', lx + fw + 12, ly - 18, { color: T2 });
          ctx.restore();
        }
      }

      // Paradigm "Fourth Fund" hex dump of stanza 03 (bytes are the poem's UTF-8)
      function hexDump(R, u) {
        // the widest layout that fits the frame: 16 bytes a row beside the header column (needs ~830 px), 8 bytes a
        // row beside it (~580 px), else the phone layout (the header as one row on top, 8-byte rows under it)
        const cw12 = mw(monoF(12), '0000000000') / 10;
        const m = G.mobile || R.w < 260 + cw12 * 43.5, fs = m ? 11 : 12, lh = Math.round(fs * 1.36);
        ctx.font = monoF(fs);
        const cw = mw(monoF(fs), '0000000000') / 10;
        const half = !m && R.w < 260 + cw * 79;
        const rows = m || half ? HEX.rows8 : HEX.rows, per = m || half ? 8 : 16;
        const vis = Math.min(rows.length, Math.floor(u / (S16 * per / 16) + 1e-6) + 1); // one 16-byte row per 16th
        let px = R.x, py = R.y + 12;
        ctx.font = monoF(fs);
        const lab = (s, x, y, col) => { ctx.fillStyle = col || C.ink; ctx.fillText(s, x, y); };
        const col2 = m ? 0 : 128, mc = [0, 96, 176, 240]; // mobile: four columns in one row
        lab('Stanza :', px, py, T2); lab('Lines :', px + (m ? mc[1] : col2), py, T2);
        lab('03', px, py + lh, C.ink); lab('3', px + (m ? mc[1] : col2), py + lh);
        lab('Bytes :', px + (m ? mc[2] : 0), py + (m ? 0 : lh * 3), T2); lab(String(HEX.bytes.length), px + (m ? mc[2] : 0), py + (m ? lh : lh * 4));
        lab('CRC-32 :', px + (m ? mc[3] : col2), py + (m ? 0 : lh * 3), T2); lab('0x' + HEX.crc, px + (m ? mc[3] : col2), py + (m ? lh : lh * 4), vis >= rows.length ? C.accent : C.ink);
        if (!m) {
          lab('Nodes', px, py + lh * 7, T2);
          const r = rng(99), order = shuffle([...Array(72).keys()], r), lit = new Set(order.slice(0, Math.min(72, vis * 3)));
          nodeGrid(px + 4, py + lh * 8.4, 9, 8, 15, (c, rr) => { const k = rr * 9 + c; if (k === 51) return null; return lit.has(k) ? C.accent : C.ink; });
          cross(px + 4 + 6 * 15, py + lh * 8.4 + 5 * 15, 3.5, C.ink);
        }
        const hx = m ? R.x : R.x + 260, hy = m ? py + lh * 3.2 : py;
        const offC = m ? 6 : 10; // offset column width in chars (mobile: 4-digit offsets)
        for (let i = 0; i < vis; i++) {
          const y = hy + i * lh, row = rows[i], off = (i * per).toString(16).padStart(m ? 4 : 8, '0');
          lab(off, hx, y, T2);
          for (let j = 0; j < row.length; j++) {
            const idx = i * per + j, hit = idx >= HEX.sq[0] && idx < HEX.sq[1];
            lab(hex2(row[j]), hx + cw * (offC + j * 3 + (per === 16 && j >= 8 ? 1 : 0)), y, hit ? C.accent : C.ink);
          }
          let asc = ''; for (const b of row) asc += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
          lab(asc, hx + cw * (per === 8 ? offC + per * 3 + 1 : 62), y, C.ink);
        }
        if (vis < rows.length) { const y = hy + vis * lh; ctx.fillStyle = C.ink; ctx.fillRect(hx, y - fs * 0.8, cw, fs * 0.95); }
      }
      function ticker(t, x0, x1, y) { // decorative byte stream (tertiary: 11px, light); the 9th byte is the accent
        const f = monoF(11), step = Math.floor(t / S16), cw = mw(f, '00 '), n = Math.max(0, Math.floor((x1 - x0) / cw)), hk = Math.min(n - 1, 8);
        for (const q of KO) if (x0 < q.x1 && x1 > q.x0 && y - 10 < q.y1 && y + 3 > q.y0) return; // under a photo flash
        ctx.font = f; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        for (let k = 0; k < n; k++) { // each byte on its own cell, so the accent byte lines up with the rest
          ctx.fillStyle = k === hk ? C.accent : C.g400;
          ctx.fillText(hex2(HEX.all[(step + k) % HEX.all.length]), x0 + k * cw, y);
        }
      }

      /* ---------------------------------------------------------- bits & atoms: the bench (cold open) */
      // The cold open's frame: the montage's frame (large, right-aligned under the title; phone: full width under it).
      // Before the montage, the bench's ATOMS cell (the arm) is drawn in it; BITS (the terminal) sits left of it, or
      // under it, or (no room for either) in its caption row, one line at a time.
      function coldFrame() {
        const { TX, TY, sz, F } = G, size = sz.XL, y = TY + (G.mobile ? 0 : size * 0.4);
        const Lo = lay(SP.s0.segs, serifF(size), size, F.w * 0.9);
        const fy = y + Lo.last + size * 0.3 + (G.mobile ? 26 : 40);
        let fw = Math.round(G.mobile ? F.w * 0.84 : Math.min(F.w * 0.58, (F.y1 - fy - 30) / 0.66));
        // (a short or narrow desktop window: give up a little frame width, ≤ 10 %, so BITS keeps its column on the left
        // (232 px: the log's widest row, "bits firmware.bin compiled", at 12 px) instead of shrinking to one line under it)
        if (!G.mobile) { const col = Math.floor(F.w - 36 - 232); if (fw > col && col >= fw * 0.9) fw = col; }
        const fh = Math.round(fw * 0.66);
        return { x: G.mobile ? TX : Math.round(F.x1 - fw), y: fy, w: fw, h: fh };
      }
      const TAU = Math.PI * 2;
      const wrapUp = a => { while (a > Math.PI / 2) a -= TAU; while (a <= -1.5 * Math.PI) a += TAU; return a; }; // (joint 1 moves over the top)
      const wrapPi = a => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
      // Bench geometry, per layout. us = swfUnit scale (px per local unit). Left → right on the ground line: the two
      // parts on the tray (the rotor cluster rests on its rotors, the shell on its rim), the arm's pedestal, and the
      // stand (a short test mast up to the unit's bridle point, the tether drum beside it). Every distance is set
      // from the pedestal in unit scale and the group is centred in the cell, so a smaller us shrinks the arm too:
      // us steps down until the group fits the cell's width and the arm's swing over the top (2L above the
      // shoulder: two equal links) clears the cell's top.
      function benchGeom() {
        if (G.bench) return G.bench;
        const M = coldFrame(), F = G.F;
        let T, tm;
        const colW = M.x - 36 - F.x0, below = M.y + M.h + 44;
        if (!G.mobile && colW >= 225) { tm = 'col'; T = { x: F.x0, y: M.y, w: Math.min(colW, 420), h: M.h }; }
        else if (F.y1 - below >= 88) { tm = 'below'; T = { x: M.x - 4, y: below, w: M.w + 8, h: F.y1 - below }; }
        else { tm = 'line'; T = { x: M.x - 4, y: M.y + M.h + 21, w: M.w + 8, h: 16 }; }
        const fs = tm === 'col' && T.w >= 290 ? 13 : 12, lh = Math.round(fs * 1.55);
        const pad = Math.max(10, M.w * 0.024), top = M.y + 34, yg = M.y + M.h - Math.max(15, Math.round(M.h * 0.065));
        let us = Math.min(0.0019 * M.w, 1.2), B = null;
        for (let it = 0; it < 24 && !B; it++, us *= 0.95) {
          const e = 12 * us + 9, hb = 18 * us + 7, pb = 15 * us + 7, pH = Math.max(20 * us, (yg - top) * 0.2); // (pH: the mast)
          // offsets from the pedestal's axis: the shell 10 px clear of the pedestal, the rotor cluster beside it, the
          // stand's unit 20 px clear on the right (farther where there is room, so both reaches are alike)
          const o2 = -(pb + 10 + 50 * us), o1 = o2 - 110 * us - 6;
          let os = pb + 20 + 50 * us;
          const left = o1 - 50 * us, room = M.w - 2 * pad;
          os = Math.max(os, Math.min(-o1 * 0.75, room + left - 30 * us - 6));
          const right = os + 30 * us + 6, bx = M.x + pad + (room - (right - left)) / 2 - left;
          const p1x = bx + o1, p2x = bx + o2, sx = bx + os;
          const S = { x: bx, y: yg - hb }, D = { x: sx, y: yg - pH - 52 * us };
          const grips = { p1: { x: p1x, y: yg - 28 * us }, p2: { x: p2x - 13.9 * us, y: yg - 38.5 * us }, s1: { x: D.x, y: D.y }, s2: { x: D.x - 13.9 * us, y: D.y - 38.5 * us } };
          const dmax = Math.max(...Object.values(grips).map(g => Math.hypot(g.x - S.x, g.y - e - S.y)));
          const L = dmax * 0.52;
          if ((right - left <= room && S.y - 2 * L - 10 >= top && D.y - 39 * us - e - 8 >= top) || it === 23) B = { M, T, tm, fs, lh, pad, top, yg, us, e, hb, pb, pH, S, L, D, grips, px: [p1x, p2x], sx };
        }
        const pose = (x, y) => ik(B, x, y - B.e);
        B.poses = { rest: { a1: -1.95, a2: 2.35 }, wake: { a1: -1.4, a2: 2.35 } };
        Object.keys(B.grips).forEach(k => { B.poses[k] = pose(B.grips[k].x, B.grips[k].y); });
        B.ro = tm !== 'line' && M.w >= 420; // the joint readouts (top-right of the cell)
        G.bench = B;
        return B;
      }
      // two equal links, elbow up: the wrist target (x, y) → joint angles (a1 absolute, a2 relative); out of reach → clamped
      function ik(B, x, y) {
        const S = B.S, L = B.L, dx = x - S.x, dy = y - S.y;
        const d = Math.max(1, Math.min(2 * L - 0.01, Math.hypot(dx, dy))), th = Math.atan2(dy, dx), be = Math.acos(d / (2 * L));
        const c1 = th + be, c2 = th - be, a1 = wrapUp(Math.sin(c1) < Math.sin(c2) ? c1 : c2);
        const ex = S.x + L * Math.cos(a1), ey = S.y + L * Math.sin(a1);
        return { a1, a2: wrapPi(Math.atan2(S.y + d * Math.sin(th) - ey, S.x + d * Math.cos(th) - ex) - a1) };
      }
      function fk(B, p) {
        const S = B.S, L = B.L, E = { x: S.x + L * Math.cos(p.a1), y: S.y + L * Math.sin(p.a1) };
        const W = { x: E.x + L * Math.cos(p.a1 + p.a2), y: E.y + L * Math.sin(p.a1 + p.a2) };
        return { S, E, W, tip: { x: W.x, y: W.y + B.e } };
      }
      // the arm at film second t: joint-space moves (every joint eases together, as servos do)
      function armAt(B, t) {
        let pose = B.poses.rest, act = null;
        for (const [t0, t1, name] of BENCH.moves) {
          const to = B.poses[name];
          if (t >= t1) { pose = to; continue; }
          if (t >= t0) { const u = eIO((t - t0) / (t1 - t0)); act = { from: pose, to, name }; pose = { a1: lerp(pose.a1, to.a1, u), a2: lerp(pose.a2, to.a2, u) }; }
          break;
        }
        return { pose, act, j1: !!act && Math.abs(act.to.a1 - act.from.a1) > 0.03, j2: !!act && Math.abs(act.to.a2 - act.from.a2) > 0.03 };
      }
      // One part of a SkyWindFarm unit: the shared glyph, clipped. 'rotor' = the deck plate + the four-rotor cluster (+ the
      // bridle once on its stand), 'shell' = the flotation shell + stability wing, 'all' = the whole unit.
      // (x, y) = deck centre, s = swfUnit scale. o: { alpha, energy, phase, bridle }
      function unitPart(which, x, y, s, o) {
        o = o || {};
        const f = artFn('swfUnit');
        ctx.save();
        if (o.alpha != null) ctx.globalAlpha *= o.alpha;
        ctx.save();
        ctx.beginPath();
        if (which === 'rotor') ctx.rect(x - 64 * s, y - 0.5 * s, 128 * s, (o.bridle ? 58 : 30.5) * s);
        else if (which === 'shell') ctx.rect(x - 64 * s, y - 46 * s, 128 * s, 46.6 * s);
        else ctx.rect(x - 64 * s, y - 46 * s, 128 * s, (o.bridle === false ? 76.5 : 104) * s);
        ctx.clip();
        let ok = false;
        if (f) { try { f(ctx, x, y, s, 0, { ink: C.ink, accent: C.accent, bg: C.bg, energy: o.energy || 0, phase: o.phase == null ? 0.6 : o.phase }); ok = true; } catch (e) { ok = false; } }
        if (!ok) drawUnit(x, y - 8 * s, s / SWF_K, 0, 0);
        ctx.restore();
        if (which === 'rotor') { ctx.fillStyle = C.ink; ctx.fillRect(Math.round(x - 50 * s), Math.round(y), Math.round(100 * s), 1); } // the seam the shell snaps onto
        ctx.restore();
      }
      function capsule(x1, y1, x2, y2, r, col) {
        const len = Math.hypot(x2 - x1, y2 - y1);
        ctx.save(); ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(len, -r); ctx.arc(len, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
        ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = col || C.ink; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
      // a servo joint: the housing, its horn at the joint's angle, a centre pin; blue while it is moving
      function joint(x, y, r, ang, on) {
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = on ? C.accent : C.ink; ctx.lineWidth = 1; ctx.stroke();
        seg(x, y, x + Math.cos(ang) * (r - 1.5), y + Math.sin(ang) * (r - 1.5), on ? C.accent : C.ink);
        ctx.fillStyle = on ? C.accent : C.ink; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
      // the end effector, hanging from the wrist: a pneumatic cylinder, its rod and a vacuum cup (blue while it holds)
      // (ram: the cylinder is driving, blue)
      function effector(W, tip, us, vac, puff, ram) {
        const cw = 2.6 * us + 2.2, ch = 5 * us + 3, y0 = W.y + Math.max(3.5, 4.5 * us), cup = 2.4 * us + 2;
        seg(W.x, y0, W.x, y0 + 2, C.ink);
        ctx.fillStyle = C.bg; ctx.fillRect(W.x - cw, y0 + 2, cw * 2, ch); srect(W.x - cw, y0 + 2, cw * 2, ch, ram ? C.accent : C.ink);
        seg(W.x, y0 + 2 + ch, W.x, tip.y - cup, C.ink);
        const tw = 2 * us + 2, bw = 4.4 * us + 3;
        ctx.beginPath(); ctx.moveTo(W.x - tw, tip.y - cup); ctx.lineTo(W.x + tw, tip.y - cup); ctx.lineTo(W.x + bw, tip.y); ctx.lineTo(W.x - bw, tip.y); ctx.closePath();
        ctx.fillStyle = vac ? C.accentSoft : C.bg; ctx.fill(); ctx.strokeStyle = vac ? C.accent : C.ink; ctx.stroke();
        if (puff > 0 && puff < 1) { // release: a short puff of air from the cup's rim
          ctx.save(); ctx.globalAlpha *= 1 - puff;
          const d = 3 + 7 * eOut(puff);
          [-1, 1].forEach(sd => { seg(W.x + sd * (bw + 1), tip.y - 1, W.x + sd * (bw + 1 + d), tip.y - 1 - d * 0.35, C.g500); seg(W.x + sd * (bw + 1), tip.y + 1, W.x + sd * (bw + 1 + d * 0.8), tip.y + 1 + d * 0.3, C.g500); });
          ctx.restore();
        }
      }
      function hatchGround(x0, x1, y) {
        seg(x0, Math.round(y) + 0.5, x1, Math.round(y) + 0.5, C.ink);
        for (let x = x0 + 5; x < x1; x += 10) seg(x, y + 1, x - 4, y + 5, C.g300);
      }
      // a stand: a post up to the unit's bridle point, a foot, and the tether drum beside it
      function stand(D, us, yg) {
        const bx = D.x - 3 * us, by = D.y + 52 * us, dr = Math.max(2.5, 4.5 * us + 1), dx = D.x + 22 * us + 2;
        seg(bx, by + 1, bx, yg, C.ink);
        seg(bx - 7 * us - 3, Math.round(yg) - 0.5, bx + 7 * us + 3, Math.round(yg) - 0.5, C.ink);
        seg(bx - 3.5, Math.round(by) + 1.5, bx + 3.5, Math.round(by) + 1.5, C.ink); // the cradle
        ctx.strokeStyle = C.ink; ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(dx, yg - dr - 1, dr, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.fillRect(Math.round(dx) - 1, Math.round(yg - dr - 1) - 1, 2, 2);
        return { bx, by, drum: { x: dx, y: yg - 2 * dr - 1 } };
      }
      // the tether from the bridle down to the drum: slack and dashed until the unit is on it, energy once it is online
      function tetherTo(sd, bx, by, t, state, energy) {
        if (state === 0) { seg(sd.drum.x, sd.drum.y, sd.bx + 2, sd.by + 3, C.g400, [2, 3]); return; }
        if (state === 1) { seg(bx, by, sd.drum.x, sd.drum.y, C.ink); return; }
        tetherArt(bx, by, sd.drum.x, sd.drum.y, t, { energy, alpha: 0.9, sag: 0.04, speed: 0.6, highlight: false });
      }
      // The terminal. mode: 'col' / 'below' (eyebrow, the prompt line, then the log, newest at the bottom), 'top' (two
      // lines: the prompt, the newest row) or 'line' (one line: the newest row). rows: [tag, item, status, hi] or
      // { led: true, text } (a blue status light + text).
      function terminal(T, mode, fs, lh, cmd, cur, rows, t) {
        const f = monoF(fs), cw = mw(f, '0'), ew = trackW('BITS') + 14;
        const n = Math.max(12, Math.floor((T.w - (mode === 'line' ? ew : 0)) / cw)), cols = n >= 34 ? [0, 9, 26] : [0, 8, 24];
        const promptW = mw(f, '~/build $ ');
        const drawPrompt = (x, y) => {
          label('~/build $ ', x, y, { size: fs, color: T2, noKO: true });
          label(cmd, x + promptW, y, { size: fs, color: C.ink, noKO: true });
          if (cur) { const cx = x + promptW + mw(f, cmd) + 1; if (cur === 2 || ((t / BEAT) % 1) < 0.5) { ctx.fillStyle = C.ink; ctx.fillRect(Math.round(cx), Math.round(y - fs * 0.78), Math.round(fs * 0.55), Math.round(fs * 0.95)); } }
        };
        const drawRow = (r, x, y) => {
          if (!Array.isArray(r)) { ctx.fillStyle = C.accent; const q = Math.round(fs * 0.55); ctx.fillRect(Math.round(x), Math.round(y - fs * 0.62), q, q); label(r.text, x + cw * 2, y, { size: fs, color: C.accent, noKO: true }); return; }
          const [tag, item, status, hi] = r;
          label(tag, x + cols[0] * cw, y, { size: fs, color: hi ? C.ink : T2, noKO: true });
          const it = item.length > n - cols[1] ? item.slice(0, n - cols[1] - 1) + '…' : item;
          label(it, x + cols[1] * cw, y, { size: fs, color: hi ? C.accent : C.ink, noKO: true });
          // (a status too long for a narrow column says "ok" instead: "compiled" and "seated" both mean it)
          const st = status && cols[2] + status.length > n && /^[a-z]+$/.test(status) ? 'ok' : status;
          if (st && cols[2] + st.length <= n) label(st, x + cols[2] * cw, y, { size: fs, color: st === 'ok' ? C.accent : T2, noKO: true });
        };
        if (mode === 'line') { // one line, the newest row set compactly: tag, item, status (each dropped from the right if it runs long)
          tracked('BITS', T.x, T.y);
          const r = rows[rows.length - 1];
          if (!r) { drawPrompt(T.x + ew, T.y); return; }
          if (!Array.isArray(r)) { drawRow(r, T.x + ew, T.y); return; }
          let x = T.x + ew;
          [[r[0], r[3] ? C.ink : T2], [r[1], r[3] ? C.accent : C.ink], [r[2], r[2] === 'ok' ? C.accent : T2]].forEach(([q, col]) => {
            if (!q || x < 0 || x + mw(f, q) > T.x + T.w) { if (q) x = -1; return; }
            label(q, x, T.y, { size: fs, color: col, noKO: true }); x += mw(f, q + '  ');
          });
          return;
        }
        if (mode === 'top') {
          tracked('BITS', T.x, T.y + 14);
          drawPrompt(T.x + trackW('BITS') + 14, T.y + 14);
          if (rows.length) drawRow(rows[rows.length - 1], T.x, T.y + 14 + lh);
          return;
        }
        const ey = T.y + (mode === 'col' ? 20 : 12), y0 = ey + Math.round(lh * 1.45);
        tracked('BITS', T.x, ey);
        const items = [null].concat(rows), fit = Math.max(1, Math.floor((T.y + T.h - 6 - y0) / lh) + 1), vis = items.slice(Math.max(0, items.length - fit));
        vis.forEach((r, i) => { const y = y0 + i * lh; if (r === null) drawPrompt(T.x, y); else drawRow(r, T.x, y); });
      }
      // The bench at film second t (cold open, until the montage). alpha: the terminal's fade once the montage is up.
      function bench(t, armOn, termA) {
        const B = benchGeom(), { M, us, yg } = B;
        // BITS: the command (typed, with its typo), then the log
        let cmd = '', entered = false;
        for (const [kt, ch] of BENCH.keys) { if (t < kt) break; if (ch === '\b') cmd = cmd.slice(0, -1); else if (ch === '\n') entered = true; else cmd += ch; }
        const rows = [];
        for (const [t0, tag, item, status, t1] of BENCH.log) if (t >= t0) rows.push([tag, item, t < t1 ? '···' : status, tag === 'unit 01']);
        if (termA > 0) {
          ctx.save(); ctx.globalAlpha *= termA;
          terminal(B.T, B.tm, B.fs, B.lh, cmd, entered ? 0 : t >= BENCH.keys[0][0] ? 2 : 1, rows, t);
          ctx.restore();
        }
        if (!armOn) return;
        // ATOMS: the frame (the montage's), the ground, the reach envelope, the stand, the tray, the arm
        photo(null, M.x, M.y, M.w, M.h, { draw: () => {} });
        tracked('ATOMS', M.x + 12, M.y + 20);
        const A = armAt(B, t), K = fk(B, A.pose);
        if (B.ro) {
          const deg = a => { const v = Math.round(-a * 180 / Math.PI); return (v < 0 ? '−' : '+') + String(Math.abs(v)).padStart(3, '0') + '°'; };
          const on = t >= BENCH.grip[0][0] && t < BENCH.grip[0][2] || t >= BENCH.grip[1][0] && t < BENCH.grip[1][2];
          const xr = M.x + M.w - 12, lw = mw(monoF(12), 'vac ');
          [['J1', deg(A.pose.a1), A.j1], ['J2', deg(A.pose.a2), A.j2], ['vac', on ? 'on' : 'off', on]].forEach(([k, v, hot], i) => {
            label(k, xr - mw(monoF(12), '−000°') - lw, M.y + 20 + i * 16, { color: T2, noKO: true });
            label(v, xr, M.y + 20 + i * 16, { align: 'right', color: hot ? C.accent : C.ink, noKO: true });
          });
        }
        hatchGround(M.x + 8, M.x + M.w - 8, yg);
        ctx.strokeStyle = C.g300; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(B.S.x, B.S.y, 2 * B.L, Math.PI + 0.12, TAU - 0.12); ctx.stroke(); ctx.setLineDash([]);
        const [g1, g2] = BENCH.grip, D = B.D, s1 = t >= g1[1], s2 = t >= g2[1], on = t >= BENCH.power;
        const en = on ? eOut((t - BENCH.power) / BEAT) : 0, spin = on ? 0.6 + Math.pow(t - BENCH.power, 2) * 3.2 : 0.6;
        const sd = stand(D, us, yg);
        tetherTo(sd, sd.bx, sd.by, t, !s1 ? 0 : on ? 2 : 1, en * 0.8);
        if (!s2) unitPart('all', D.x, D.y, us, { alpha: 0.13 });
        if (s1) unitPart('rotor', D.x, D.y, us, { bridle: true, energy: en * 0.7, phase: spin });
        if (s2) unitPart('shell', D.x, D.y, us, { energy: en * 0.7 });
        // the tray: each part rests where it waits to be picked (its number under it)
        const numbered = M.y + M.h - yg >= 21;
        [[g1, 'rotor', B.px[0], yg - 28 * us], [g2, 'shell', B.px[1], yg - 0.6]].forEach(([g, which, x, y], i) => {
          if (t < g[0]) unitPart(which, x, y, us, {});
          if (numbered) label(pad2(i + 1), x - 50 * us, yg + 15, { size: 11, color: C.g500, noKO: true });
        });
        // the arm: pedestal, links, the part it holds, the effector, joints; and its plan (a dashed line to the target)
        const { S, E, W, tip } = K, pb = B.pb, pt = 8 * us + 4;
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(S.x - pb, yg); ctx.lineTo(S.x - pt, S.y + 3); ctx.lineTo(S.x + pt, S.y + 3); ctx.lineTo(S.x + pb, yg); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
        const r1 = Math.max(4.5, 6.5 * us + 2), w1 = Math.max(3, 5 * us + 1), w2 = Math.max(2.5, 4 * us + 1);
        capsule(S.x, S.y, E.x, E.y, w1); capsule(E.x, E.y, W.x, W.y, w2);
        const vac = (t >= g1[0] && t < g1[2]) || (t >= g2[0] && t < g2[2]);
        if (t >= g1[0] && t < g1[1]) unitPart('rotor', tip.x, tip.y, us, {});
        if (t >= g2[0] && t < g2[1]) unitPart('shell', tip.x + 13.9 * us, tip.y + 38.5 * us, us, {});
        const pf = [g1[2], g2[2]].map(tt => (t - tt) / (S16 * 1.5)).find(u => u > 0 && u < 1) || 0;
        effector(W, tip, us, vac, pf);
        joint(S.x, S.y, r1, A.pose.a1, A.j1); joint(E.x, E.y, r1 - 1, A.pose.a1 + A.pose.a2, A.j2); joint(W.x, W.y, Math.max(3.5, r1 - 2), Math.PI / 2, A.j1 || A.j2);
        if (A.act && A.act.name !== 'wake') {
          const to = fk(B, A.act.to).tip;
          if (Math.hypot(to.x - tip.x, to.y - tip.y) > 6) seg(tip.x, tip.y, to.x, to.y, C.g400, [2, 3]);
          plus(to.x, to.y, 4, C.accent);
        }
        // online: the bridle node pulses as the relay closes
        if (on && t - BENCH.power < BEAT) { const k = 1 - (t - BENCH.power) / BEAT; ctx.strokeStyle = C.accent; ctx.globalAlpha *= k; ctx.beginPath(); ctx.arc(sd.bx, sd.by, 4 + 14 * (1 - k), 0, TAU); ctx.stroke(); ctx.globalAlpha /= k; }
      }

      /* ---------------------------------------------------------- bits & atoms: the engine (bar 42) */
      // the layout of bars 41–42 (the two lines, then the strip of four scenes / the engine under them)
      function s10Layout() {
        const { TY, TW, sz, F } = G, size = sz.L, tw10 = G.mobile ? TW : Math.max(TW, F.w * 0.8); // (nothing beside these lines)
        const lab = 22, minH = G.mobile ? 170 : 110;
        const La = lay(SP.s10a.segs, serifF(size), size, tw10), Lb = lay(SP.s10b.segs, serifF(size), size, tw10);
        const textH = La.last + size * 0.3 + size * 1.25 + Lb.last + size * 0.3, yEnd = G.mobile ? F.y1 : F.y1 - 14;
        let ty = TY, Ry = Math.max(G.mobile ? F.y0 + F.h * 0.4 : F.y0 + F.h * 0.5, TY + textH + 28);
        if (yEnd - Ry < minH) { Ry = yEnd - minH; ty = Math.max(F.y0 + size, Ry - 28 - textH); }
        return { size, tw10, lab, minH, ty, Ry, yEnd, textBot: ty + textH };
      }
      // the credits (bars 43–44, bottom-left): the attribution, then the design credit, with a short rule above
      function creditsLayout() {
        const F = G.F, cw = G.mobile ? F.w : Math.min(F.w, 900), fs = 12, lhf = 1.4;
        const Lf = lay(SP.s10f.segs, monoF(fs), fs, cw, lhf), Lg = lay(SP.s10g.segs, monoF(fs), fs, cw, lhf);
        const yg = F.y1 - 8 - Lg.last, yf = yg - fs * lhf - 6 - Lf.last;
        return { cw, fs, lhf, yf, yg, rule: yf - 22.5 };
      }
      // Engine geometry: in the strip's place under the two lines, ending above the credits' rule. Desktop: the terminal
      // on the left, the machine on the right; narrow: the terminal's two lines over the machine. The machine: a gantry
      // rail on top (the head, a pneumatic ram and a vacuum cup), six stands on the ground line.
      function engGeom() {
        if (G.eng) return G.eng;
        const F = G.F, L10 = s10Layout(), cr = creditsLayout();
        // the room: from under the two lines to above the credits' rule; where that is short (small or stacked
        // screens) the engine may use the frame down to its foot, and then it is gone before the credits type in
        let y0 = G.mobile ? L10.textBot + 22 : L10.Ry, y1 = cr.rule - 22, early = false;
        if (y1 - y0 < 250) { y0 = Math.min(y0, L10.textBot + 26); if (y1 - y0 < 240) { y1 = L10.yEnd; early = true; } }
        const col = !G.mobile && F.w >= 700, fs = col ? 13 : 12, lh = Math.round(fs * 1.55), th = col ? 0 : lh + 32;
        const tw = col ? Math.min(300, F.w * 0.3) : F.w, mw0 = col ? F.w - tw - 36 : F.w;
        // the machine needs 80 px (eyebrow, rail, ram, ground) + 160 unit-scale px; the scale is set by the stands'
        // pitch, else by the height there is. The group sits under the lines (a little lower where there is room).
        const avail = y1 - y0 - th, us = Math.max(0.22, Math.min(0.95, (mw0 / ENG.n) * 0.8 / 100, (avail - 80) / 160));
        const need = Math.min(avail, 80 + 160 * us), off = Math.max(0, avail - need) * 0.3;
        const E = { x: F.x0, y: y0 + off, w: F.w, h: th + need };
        const T = col ? { x: E.x, y: E.y, w: tw, h: E.h } : { x: E.x, y: E.y, w: E.w, h: lh + 22 };
        const Mx = col ? { x: E.x + tw + 36, y: E.y, w: mw0, h: need } : { x: E.x, y: E.y + th, w: E.w, h: need };
        const N = ENG.n, pitch = Mx.w / N, yr = Mx.y + 32, yg = Mx.y + Mx.h - 14;
        const e = 10 * us + 8, park = yr + 12 + e, pH = 18 * us;
        const st = [...Array(N)].map((_, j) => { const x = Mx.x + pitch * (j + 0.5) - 8 * us; return { x, D: { x, y: yg - pH - 52 * us } }; });
        // (early: the machine reaches into the credits' band, so the credits wait for it to clear, 3 16ths: see SEC[10])
        G.eng = { E, T, Mx, col, fs, lh, N, pitch, yr, yg, us, e, park, pH, st, early, off: early ? ENG.on + 3 * S16 : ENG.off };
        return G.eng;
      }
      // the gantry head at film second t: x on the rail, the cup's tip y, the part it carries, what is moving
      function engHead(g, t) {
        const P = ENG.place, K = ENG.k, n = P.length, us = g.us;
        const tgt = k => { const s = g.st[k >> 1]; return k % 2 ? { x: s.D.x - 13.9 * us, y: s.D.y - 38.5 * us } : { x: s.D.x, y: s.D.y }; };
        const home = g.Mx.x + 18;
        for (let k = 0; k < n; k++) {
          const q = K[k], b = tgt(k);
          if (t >= q.p + q.up) continue;
          if (t < q.tE) { const x0 = k ? tgt(k - 1).x : home, u = q.tE > q.tS ? eIO((t - q.tS) / (q.tE - q.tS)) : 1; return { x: lerp(x0, b.x, u), y: g.park, part: k, move: u > 0 && u < 1 && Math.abs(b.x - x0) > 1 }; }
          if (t < q.p) return { x: b.x, y: lerp(g.park, b.y, eIn((t - q.tE) / q.dip)), part: k, down: true };
          return { x: b.x, y: lerp(b.y, g.park, eOut((t - q.p) / q.up)), part: -1 };
        }
        return { x: tgt(n - 1).x, y: g.park, part: -1 };
      }
      function engine(t) {
        if (t < ENG.t0 || t >= ENG.off) return;
        const g = engGeom(), { Mx, us, yr, yg } = g, P = ENG.place, u0 = t - ENG.t0;
        if (t >= g.off) return;
        const fade = t >= ENG.on ? 1 - eIn((t - ENG.on) / (g.off - ENG.on)) : 1;
        ctx.save(); ctx.globalAlpha *= fade;
        // (once the credits start typing, nothing of the engine is drawn over their band; on short screens, where the
        // machine stands in that band, the credits wait instead, so every unit is seen to light up on "system active")
        if (t >= ENG.on && !g.early) { const cr = creditsLayout(); ctx.beginPath(); ctx.rect(0, 0, G.w, cr.rule - 12); ctx.clip(); }
        // BITS
        const rows = [];
        for (let j = 0; j < ENG.n; j++) if (t >= P[2 * j + 1]) rows.push(['unit ' + pad2(j + 2), 'online', 'ok']);
        if (t >= ENG.on) rows.push({ led: true, text: 'build ok · system active' });
        terminal(g.T, g.col ? 'col' : 'top', g.fs, g.lh, ENG.cmd, 0, rows, t);
        // ATOMS: eyebrow + count, the rail (drawn on with the downbeat), the ground, six stands
        const done = rows.length - (t >= ENG.on ? 1 : 0), nodes = [];
        tracked('ATOMS', Mx.x, Mx.y + 12);
        label(`units ${pad2(done)} / ${pad2(ENG.n)}`, Mx.x + Mx.w, Mx.y + 12, { align: 'right', color: done === ENG.n ? C.accent : T2, noKO: true });
        const rp = eOut(u0 / (S16 * 1.5));
        seg(Mx.x, yr + 0.5, Mx.x + Mx.w * rp, yr + 0.5, C.ink);
        srect(Mx.x - 2, yr - 2, 4, 5, C.ink); if (rp >= 1) srect(Mx.x + Mx.w - 2, yr - 2, 4, 5, C.ink);
        hatchGround(Mx.x, Mx.x + Mx.w * rp, yg);
        g.st.forEach((s, j) => {
          if (u0 < j * S16 / 3) return;
          plus(s.x, yr + 0.5, 3, C.g300);
          const pr = P[2 * j], ps = P[2 * j + 1], okA = t >= ps, act = t >= ENG.on;
          const rise = okA ? eOut((t - ps - S16 * 0.4) / BEAT) * Math.max(0, Math.min(34, (s.D.y - 39 * us - yr - 22) * 0.55)) + (act ? eOut((t - ENG.on) / (2 * BEAT)) * 14 : 0) : 0;
          const en = act ? 1 : okA ? 0.55 : 0, spin = okA ? 0.6 + (t - ps) * 9 : 0.6;
          const sd = stand(s.D, us, yg), Dy = s.D.y - rise;
          nodes.push([sd.bx, sd.by - rise]);
          tetherTo(sd, sd.bx, sd.by - rise, t, t < pr ? 0 : okA ? 2 : 1, en * 0.9);
          if (!okA) unitPart('all', s.D.x, s.D.y, us, { alpha: 0.12 });
          if (t >= pr) unitPart('rotor', s.D.x, Dy, us, { bridle: true, energy: en, phase: spin });
          if (okA) unitPart('shell', s.D.x, Dy, us, { energy: en });
        });
        // the head: carriage on the rail (blue while it travels), the cylinder (blue while the ram drives down), the cup
        const H = engHead(g, t);
        if (H.part >= 0) { if (H.part % 2) unitPart('shell', H.x + 13.9 * us, H.y + 38.5 * us, us, {}); else unitPart('rotor', H.x, H.y, us, {}); }
        effector({ x: H.x, y: yr + 4 - Math.max(3.5, 4.5 * us) }, { x: H.x, y: H.y }, us, H.part >= 0, 0, H.down);
        ctx.fillStyle = C.bg; ctx.fillRect(H.x - 13, yr - 6, 26, 12); srect(H.x - 13, yr - 6, 26, 12, H.move ? C.accent : C.ink);
        ctx.fillStyle = H.move ? C.accent : C.ink; ctx.fillRect(Math.round(H.x) - 1, yr - 1, 2, 2);
        // the toolpath: a dashed line along the rail to the next stand
        if (H.move) { const k = H.part, tx = g.st[k >> 1].D.x - (k % 2 ? 13.9 * us : 0); seg(H.x, yr + 3.5, tx, yr + 3.5, C.accent, [2, 3]); plus(tx, yr + 3.5, 3.5, C.accent); }
        // system active: every unit's bridle node answers once
        if (t >= ENG.on && t - ENG.on < BEAT) {
          const k = 1 - (t - ENG.on) / BEAT;
          ctx.strokeStyle = C.accent; ctx.globalAlpha *= k;
          nodes.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3 + 10 * (1 - k), 0, TAU); ctx.stroke(); });
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------- film: sections */
      const cards = [];
      function card(key, cap, R, t0, lt, o) { // a jump-out project card (film)
        const u = lt - t0;
        if (u < 0) return null;
        o = o || {};
        let dx = 0, a = 1;
        if (o.off != null && lt >= o.off && o.hard) return null; // a deck on a phone: hard cut on the 8th, no blend
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
      // S0 — Cold open: blinking cursor, "Here's to the builders." one char per 16th; when "builders" inks, the
      // montage: every build and project, 2022 → 2026, one frame per 16th, cutting to the roll call on bar 5
      const drawCode = (x, y, w, h) => { ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); vCode({ x: x + 6, y: y + 6, w: w - 12, h: h - 12 }, BEAT * 7.5, 0, { mini: true }); };
      SEC[0] = (lt, t) => {
        const { TX, TY, sz } = G, size = sz.XL;
        const y = TY + (G.mobile ? 0 : size * 0.4);
        const r = typed(SP.s0, lt, TX, y, size, G.F.w * 0.9, { tag: ['fig. 00'] });
        // (bar 1: the cursor is the terminal's; the title's own cursor arrives with the Enter that starts it)
        if (lt >= SP.s0.at) cursor(r.cx, r.cy, size, !r.done, t);
        // bits & atoms: the bench until the montage; its terminal clears in an 8th once the montage is up (the one-line
        // terminal, in the caption row, gives way at once)
        if (lt < FLIP.t0 + S16 * 2) {
          const B = benchGeom();
          bench(lt, lt < FLIP.t0, lt < FLIP.t0 ? 1 : B.tm === 'line' ? 0 : 1 - clamp01((lt - FLIP.t0) / (S16 * 2)));
        }
        if (lt >= FLIP.t0) {
          const u = lt - FLIP.t0;
          // desktop: a large frame (≈ 0.58 of the film frame) set against the right edge, under the headline, so
          // the photos read and the composition's weight sits right of centre; phone: full width under the line
          const CF = coldFrame(), fy = CF.y, fw = CF.w, fh = CF.h, fx = CF.x;
          const NM = MONTAGE.length, figCap = 'fig. 00 — stints, by year';
          const cy = fy + fh + 21, xr = fx + fw + 4;
          if (u < FLIP.dur || FLIP.end - FLIP.t0 - FLIP.dur < BEAT) { // the montage (the last frame holds if no beat is left)
            const i = Math.min(NM - 1, Math.floor(u / FLIP.step)), m = MONTAGE[i];
            photo(m.draw ? null : img(m.src), fx, fy, fw, fh, { u: 10, fy: m.fy, draw: m.draw === 'code' ? drawCode : null });
            label(figCap, fx - 4, cy);
            // right: the frame's year ticks 2022 → 2026 (accent), then the counter (tertiary)
            const cnt = `${pad2(i + 1)} / ${pad2(NM)}`, cw2 = mw(monoF(11), cnt), yw = mw(monoF(12), '2026');
            const room = fw + 8 - mw(monoF(12), figCap) - 16;
            if (room >= cw2 + yw + 14) { label(cnt, xr, cy, { align: 'right', size: 11, color: T2 }); label(String(m.year), xr - cw2 - 14, cy, { align: 'right', color: C.accent }); }
            else if (room >= yw) label(String(m.year), xr, cy, { align: 'right', color: C.accent });
          } else {
            const v = clamp01((u - FLIP.dur) / (FLIP.end - FLIP.t0 - FLIP.dur)), gap = G.mobile ? 20 : 24;
            const cols = Math.floor(fw / gap) + 1, rows = Math.floor(fh / gap) + 1;
            const r2 = rng(3), order = shuffle([...Array(cols * rows).keys()], r2), lit = new Set(order.slice(0, Math.floor(order.length * eIn(v))));
            nodeGrid(fx, fy, cols, rows, gap, (c, rr) => (lit.has(rr * cols + c) ? C.accent : C.g300));
            label(figCap, fx - 4, cy, { color: T2 });
          }
        }
      };

      // S1 — Roll call: words slam on the beat, thumbnails flash; round peg in a square hole; four projections
      SEC[1] = (lt, t) => {
        const { TX, TY, TW, sz, FIG } = G, size = sz.M;
        const a = typed(SP.s1a, lt, TX, TY, size, TW, { dimAt: lb(3) });
        const b = typed(SP.s1b, lt, TX, a.bottom + size * 1.25, size, TW, { dimAt: lb(4) });
        const c = typed(SP.s1c, lt, TX, b.vis ? b.bottom + size * 1.25 : a.bottom + size * 1.25, size, TW);
        const act = c.vis ? c : b.vis ? b : a;
        cursor(act.cx, act.cy, size, !act.done, t);
        const FL1 = [['yash', lb(1, 1), 'fig. 01 — Yash Dagade'], ['code', lb(1, 3), G.mobile ? 'fig. 02 — LpWM (toy)' : 'fig. 02 — LpWM, sparse latent (toy)'], ['idw', lb(2, 1), 'fig. 03 — idontwannadie.lol']];
        if (lt < lb(3)) {
          const FR = { x: FIG.x, y: FIG.y + FIG.h * 0.12, w: FIG.w, h: FIG.h * 0.66 };
          // the flash up this frame (with its frame, accents and caption row): a thumb it would cover is not drawn,
          // so no sliver of its frame or its number peeks out from under the flash
          let fr = null;
          FL1.forEach(([k, t0]) => {
            const u = lt - t0;
            if (u < 0 || u >= BEAT) return;
            const f = k === 'code' ? fit(1.5, FR, 0.3) : flashGeom(IMG[k], lt, t0, BEAT, FR, { maxWf: 0.3 });
            if (f) fr = { x0: f.x - 10, y0: f.y - 10, x1: f.x + f.w + 10, y1: f.y + f.h + 30 };
          });
          FL1.forEach(([k, t0, cap], i) => {
            const u = lt - t0;
            if (u < 0) return;
            if (u < BEAT) {
              if (k === 'code') {
                const f = fit(1.5, FR, 0.3);
                photo(null, f.x, f.y, f.w, f.h, { u, wipe: S16, cap, draw: (x, y, w, h) => { ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); vCode({ x, y, w, h }, BEAT * 3, t, { mini: true }); } });
              } else flashImg(IMG[k], lt, t0, BEAT, FR, cap, { maxWf: 0.3 });
            } else {
              // after its flash: a small contact strip (three thumbs)
              const tw = G.mobile ? 64 : Math.min(96, FIG.w * 0.26), th = tw * 0.75, gx = FIG.x + i * (tw + 16), gy = FIG.y + FIG.h * 0.5 - th / 2;
              if (fr && gx - 8 < fr.x1 && gx + tw + 8 > fr.x0 && gy - 8 < fr.y1 && gy + th + 24 > fr.y0) return;
              photo(k === 'code' ? null : img(IMG[k]), gx, gy, tw, th, { u: u - BEAT, pop: true, draw: k === 'code' ? (x, y, w, h) => { ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); vCode({ x, y, w, h }, BEAT * 3, t, { mini: true }); } : null });
              label(pad2(i + 1), gx - 4, gy + th + 20, { size: 11, color: C.g500 });
            }
          });
        } else if (lt < lb(4)) {
          // bar 3 — a round peg dropped into a square hole
          const u = lt - lb(3), s = Math.min(FIG.w, FIG.h) * 0.5, cx = FIG.x + FIG.w / 2, cy = FIG.y + FIG.h / 2 - (G.mobile ? 14 : 20);
          const sq = [[cx - s / 2, cy - s / 2], [cx + s / 2, cy - s / 2], [cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2], [cx - s / 2, cy - s / 2]];
          drawOn(sq, eOut(u / (S16 * 3)), C.ink);
          // the peg drops from inside the frame (never through the HUD above it), fading in over a 16th
          const fall = eIn((u - S16 * 2) / (BEAT * 0.75)), ccy = lerp(Math.min(cy, Math.max(G.F.y0 + 10 + s / 2, cy - s * 1.3)), cy, fall);
          if (u > S16 * 2) {
            ctx.save(); ctx.beginPath(); ctx.rect(G.F.x0, G.F.y0, G.F.w, G.F.h); ctx.clip();
            ctx.globalAlpha *= clamp01((u - S16 * 2) / S16);
            ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(cx, ccy, s / 2, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
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
            mlabel('peg.frac', '$1 - \\pi/4 \\approx 21.5\\%$', cx - s / 2 - 4, cy + s / 2 + 30, { size: 16, alpha: g });
            const pegW = ['of the square hole is left unfilled', 'of the hole stays unfilled', 'left unfilled'];
            label(pegW.find(q => cx - s / 2 - 4 + mw(monoF(12), q) <= G.F.x1 + 6) || pegW[2], cx - s / 2 - 4, cy + s / 2 + 50, { color: T2 });
          }
        } else {
          // bar 4 — the same data, projected at θ = 0°, 45°, 90°, 135°
          const u = lt - lb(4), k = Math.min(3, Math.floor(u / BEAT)), sub = (u / BEAT) - k;
          const th = ((k + (k < 3 ? eIO(Math.max(0, sub - 0.75) / 0.25) : 0)) * Math.PI) / 4;
          const cx = FIG.x + FIG.w / 2, cy = FIG.y + FIG.h / 2 - (G.mobile ? 10 : 0), sc = Math.min(FIG.w, FIG.h) * 0.2;
          const dx = Math.cos(th), dy = -Math.sin(th);
          // the axis stops 24 px inside the figure (and above its caption row), whatever the angle, and never runs
          // much past the cloud (±2.6σ), so the caption can sit right under the figure
          const hx = Math.min(cx - FIG.x, FIG.x + FIG.w - cx) - 24, hy = Math.min(cy - FIG.y, FIG.y + FIG.h - 40 - cy) - 16;
          const Lmax = Math.min(sc * 2.3, hy);
          const Lx = Math.max(sc, Math.min(Lmax, Math.abs(dx) > 1e-6 ? hx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hy / Math.abs(dy) : Infinity));
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
          mlabel('proj.th', `$\\theta = ${[0, 45, 90, 135][k]}^{\\circ}$`, cx + dx * Lx + (dx < -0.1 ? -8 : 8), cy + dy * Lx - 8, { size: 15, color: C.accent, align: dx < -0.1 ? 'right' : 'left', bg: true });
          const capV = [' Rectified LpJEPA · same data, 4 projections', ' LpJEPA · same data, 4 projections', ' LpJEPA · 4 projections', ' LpJEPA'].map(q => sceneRef('', SN.lpjepa, q));
          const capP = capV.find((q, i) => (i || !G.mobile) && mixW(q) <= FIG.w) || capV[3];
          labelMix(capP, Math.max(FIG.x, Math.min(cx - mixW(capP) / 2, FIG.x + FIG.w - mixW(capP))), Math.min(FIG.y + FIG.h - 4, cy + Lmax + 26), { bg: true });
        }
      };

      // S2 — Question everything: typed at 2 chars/16th + a "why?" chain; then turbines in the sky
      SEC[2] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, VR, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          // (the chain's last label, "first principles", must end inside the frame: the chain starts further left
          // and steps in narrower where the figure column is narrow)
          // (narrower still: it may start left of the figure column, down to 16 px right of the text column, and
          // step in 16 px; where even that is not enough, "first principles" goes under the last square)
          const fpW = mw(monoF(13), 'first principles'), lw7 = fpW + 16, lwB = mw(monoF(13), 'but why?') + 16;
          const gMin = G.mobile ? FIG.x : Math.min(FIG.x, TX + TW + 16), gx0 = FIG.x + FIG.w * (G.mobile ? 0.06 : 0.12);
          let dx = G.mobile ? 20 : 34, gx = Math.min(gx0, F.x1 - 6 * dx - lw7), fpUnder = false;
          if (gx < FIG.x) {
            dx = Math.min(dx, (F.x1 - lw7 - gMin) / 6);
            if (dx >= 16) gx = Math.max(gMin, Math.min(gx0, F.x1 - 6 * dx - lw7));
            else { fpUnder = true; dx = Math.max(12, Math.min(20, (F.x1 - lwB - gMin) / 6)); gx = Math.max(gMin, Math.min(gx0, F.x1 - 6 * dx - lwB)); }
          }
          const a = typed(SP.s2a, lt, TX, TY, size, TW, { tag: ['→ SkyWindFarm'], tagMax: G.mobile ? null : gx - 16 });
          cursor(a.cx, a.cy, size, !a.done, t);
          const n = Math.min(7, Math.floor(lt / (BEAT * 1.1)) + 1), step = Math.min(66, FIG.h / 7.6);
          const ys = i => FIG.y + (G.mobile ? 8 : FIG.h * 0.04) + i * step, xs = i => gx + i * dx;
          for (let i = 0; i < n; i++) {
            const x = xs(i), y = ys(i), last = i === 6;
            if (i) drawOn([[xs(i - 1), ys(i - 1) + 8], [xs(i - 1), y], [x - 8, y]], eOut((lt - i * BEAT * 1.1) / (S16 * 2)), C.g500, [2, 3]);
            if (last && lt >= lb(2, 4)) {
              ctx.fillStyle = C.accent; ctx.fillRect(x - 5, y - 5, 10, 10);
              if (fpUnder) label('first principles', Math.min(x - 5, F.x1 + 4 - fpW), y + 26, { size: 13, color: C.accent });
              else label('first principles', x + 16, y + 5, { size: 13, color: C.accent });
            }
            else { plus(x, y, 5, i === n - 1 ? C.ink : C.g500); label(i === 0 ? 'why?' : 'but why?', x + 16, y + 5, { size: 13, color: i === n - 1 ? C.ink : T2 }); }
          }
          if (n > 1) label(`depth ${n}`, gx, ys(0) - 20, { color: T2 });
        } else {
          const u = lt - lb(3);
          // "question everything": the drone photo lands on beat 3 of bar 12 and holds two beats (to the cut)
          const FL = [[ph('aerial'), lb(4, 3), BEAT * 2, VR, G.mobile ? 'fig. 04 — the prototype aloft, 2024' : 'fig. 04 — the SkyWindFarm prototype aloft, 2024', { maxWf: 0.42 }]];
          flashes(FL, lt, false);
          const flashUp = KO.length > 0;
          labelMix(sceneRef('“question everything” → ', SN.swf, G.mobile ? ' SkyWindFarm' : ' SkyWindFarm, 2022–2024'), TX, F.y0 + 14);
          const b = typed(SP.s2b, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.9);
          cursor(b.cx, b.cy, sz.S, !b.done, t);
          vTurb(VR, u, t, { ghost: flashUp });
          flashes(FL, lt, true);
        }
      };

      // S3 — Laws of physics: streamlines behind the text; ruled lines break; hex dump cut
      SEC[3] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G, size = sz.L;
        if (lt < lb(4)) {
          // the flow field holds for two bars; when "They're not fond of rules…" starts typing, its labels go at once
          // and the units + streamlines clear within one 16th, before the ruled lines start drawing
          const fa = lt < lb(3) ? eOut(lt / BEAT) : 1 - clamp01((lt - lb(3)) / S16);
          // stacked (phone / portrait): the flow and its label block start under the headline's final lines
          const fTop = G.mobile ? Math.max(F.y0 + 20, TY + lay(SP.s3a.segs, serifF(size), size, TW).last + size * 0.3 + 16) : F.y0 + 20;
          if (fa > 0) drawStreams({ x: F.x0, y: fTop, w: F.w, h: F.y1 - 10 - fTop }, lt, t, { fieldA: fa, labels: lt < lb(3) });
          const a = typed(SP.s3a, lt, TX, TY, size, TW, { dimAt: lb(3), halo: true });
          let act = a;
          if (lt >= lb(3)) {
            const b = typed(SP.s3b, lt, TX, a.bottom + size * 1.3, size, TW, { halo: true });
            act = b;
            const u = lt - lb(3) - S16, n = 8;
            // (stacked: the ruled lines start under the second sentence's final lines, and fit above the frame's foot)
            const ry0 = G.mobile ? Math.max(FIG.y + FIG.h * 0.2, a.bottom + size * 1.3 + b.L.last + size * 0.3 + 34) : FIG.y + FIG.h * 0.2;
            const rst = Math.max(8, Math.min(26, FIG.h / 12, (F.y1 - 6 - ry0) / (n - 1)));
            for (let i = 0; i < n; i++) {
              // (the lines stop where their numbers still end inside the frame)
              const y = ry0 + i * rst, x0 = FIG.x + (G.mobile ? 0 : FIG.w * 0.1), x1 = Math.min(FIG.x + FIG.w * 0.95, F.x1 - 8 - mw(monoF(11), '08'));
              const br = eOut((lt - doneAt(SP.s3b) - i * S16 * 0.5 + S16) / S16), mid = lerp(x0, x1, 0.3 + ((i * 37) % 40) / 100);
              const gap = br * (20 + i * 3);
              drawOn([[x0, y], [mid - gap, y]], eOut((u - i * 0.03) / (S16 * 2)), C.ink);
              if (br < 1) drawOn([[mid - gap, y], [mid + gap, y]], eOut((u - i * 0.03) / (S16 * 2)), C.ink);
              drawOn([[mid + gap, y], [x1, y]], eOut((u - i * 0.03 - 0.05) / (S16 * 2)), br > 0 ? C.g400 : C.ink);
              if (br > 0) { plus(mid - gap, y, 3, C.accent); label(pad2(i + 1), x1 + 6, y + 4, { size: 11, color: C.g500 }); }
            }
            if (u > 0) tracked('RULES', FIG.x + (G.mobile ? 0 : FIG.w * 0.1), ry0 - 20);
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
          const a = typed(SP.s4a, lt, TX, TY, size, TW, { tag: ['→ fig. 05', '→ fig. 06'], tagMax: G.mobile ? null : FIG.x - 14 });
          cursor(a.cx, a.cy, size, a.vis < 33 ? lt < charTime(SP.s4a, 32) + S16 : !a.done, t);
          if (lt < lb(2)) {
            const FL5 = [[IMG.system, lb(1, 4), BEAT, FIG, 'fig. 05 — SkyWindFarm system diagram']];
            flashes(FL5, lt, false);
            const mods = ['flotation', 'stability', 'energy', 'power transfer', 'ground'];
            // (the boxes are never narrower than their longest word + its number)
            const bh = Math.min(38, FIG.h / 7), bw = Math.min(FIG.w, Math.max(Math.min(220, FIG.w * 0.8), mw(monoF(13), 'power transfer') + 50));
            const bx = FIG.x + (FIG.w - bw) / 2, by0 = FIG.y + (FIG.h - mods.length * (bh + 10)) / 2;
            mods.forEach((m, i) => {
              const u = lt - i * BEAT / 2;
              if (u < 0) return;
              const y = by0 + i * (bh + 10);
              drawOn([[bx, y], [bx + bw, y], [bx + bw, y + bh], [bx, y + bh], [bx, y]], eOut(u / (S16 * 1.5)), C.ink);
              label(pad2(i + 1), bx + 8, y + bh / 2 + 4, { size: 11, color: C.g500 });
              label(m, bx + 36, y + bh / 2 + 5, { size: 13, color: i === 2 ? C.accent : C.ink });
              if (i) seg(bx + bw / 2, y - 10, bx + bw / 2, y, C.g400, [2, 2]);
            });
            const fpV = [' SkyWindFarm · from first principles', ' SkyWindFarm · first principles', ' SkyWindFarm'].map(q => sceneRef('', SN.swf, q));
            const fpRef = fpV.find(q => mixW(q) <= G.F.x1 - FIG.x) || fpV[2];
            labelMix(fpRef, Math.max(FIG.x, Math.min(bx, G.F.x1 - mixW(fpRef))), by0 - 16);
            flashes(FL5, lt, true);
          } else {
            const FL6 = [[IMG.flight, lb(2, 4), BEAT, FIG, 'fig. 06 — SkyWindFarm prototype in flight']];
            flashes(FL6, lt, false);
            const u = lt - lb(2), cols = 6, rows = 4, gap = Math.min(46, FIG.w / 7), gx = FIG.x + (FIG.w - (cols - 1) * gap) / 2, gy = FIG.y + (FIG.h - (rows - 1) * gap) / 2;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              const k = r * cols + c;
              if (u < k * S16 * 0.35) continue;
              const x = gx + c * gap, y = gy + r * gap;
              if (k === 15) { const o = eOut((u - BEAT * 1.5) / BEAT) * 10; ctx.fillStyle = C.accent; ctx.fillRect(x - 7 + o, y - 7 - o, 14, 14); }
              else { ctx.strokeStyle = C.g500; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
            }
            label('mimetic: 23 / 24 alike', gx - 7, gy - 24, { color: T2 });
            flashes(FL6, lt, true);
          }
        } else {
          const u = lt - lb(3);
          const fpV = [['“first principles” · “non-mimetic” → ', ' LpWM, a sparse world model'], ['“first principles” · “non-mimetic” → ', ' LpWM'],
            ['“first principles” → ', ' LpWM']].map(([p, q]) => sceneRef(p, SN.lpwm, q));
          labelMix((!G.mobile && fpV.find(q => TX + mixW(q) <= F.x1 + 6)) || fpV[2], TX, F.y0 + 14);
          const b = typed(SP.s4b, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.92);
          cursor(b.cx, b.cy, sz.S, !b.done, t);
          vCode({ x: VR.x, y: VR.y + 16, w: VR.w, h: VR.h - 16 }, u, t);
        }
      };

      // Will power → power (bars 23–24). Three Energy Units on their own tethers converge on one ground
      // station (swf.pdf Fig. 4a); accent pulses run down the conducting tethers (§2.1) to the ground.
      // u = seconds since the vignette starts; o.flow = u at which energy starts to flow. Returns anchors.
      function vEnergy(R, u, t, o) {
        o = o || {};
        const mob = G.mobile, s = Math.max(0.5, Math.min(0.95, R.w / 400, R.h / 460));
        // (stacked: the station's readout, 40 px under the ground, keeps its descenders 6 px inside the figure)
        const gy = mob ? Math.min(R.y + R.h * 0.78, R.y + R.h - 46) : R.y + R.h * 0.8, gx = R.x + R.w * (mob ? 0.52 : 0.3), sw = 36 * s + 8, sh = 22 * s + 4;
        const pg = eOut(u / BEAT), flow = o.flow != null ? o.flow : Infinity, on = u >= flow;
        // high-altitude wind (faint; the upper streams in accent)
        const pw = eOut((u - BEAT * 0.3) / BEAT);
        if (pw > 0) {
          for (let k = 0; k < 4; k++) {
            const y = R.y + R.h * (0.1 + k * 0.1), hi = k < 2;
            ctx.strokeStyle = hi ? C.accent : C.g300; ctx.lineWidth = 1; ctx.globalAlpha *= hi ? 0.7 : 1;
            ctx.setLineDash([14 * s, 9 * s]); ctx.lineDashOffset = -t * 60 * (1.6 - k * 0.25);
            ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w * pw, y); ctx.stroke();
            ctx.globalAlpha /= hi ? 0.7 : 1;
          }
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
        // ground + ground station (drum and storage box, a bolt that lights when power arrives)
        seg(R.x, gy + 0.5, R.x + R.w * pg, gy + 0.5, C.ink);
        for (let x = R.x + 4; x < R.x + R.w * pg; x += 12) seg(x, gy + 1, x - 5, gy + 6, C.g300);
        const arrived = u >= flow + BEAT;
        if (pg > 0.5) {
          ctx.fillStyle = C.bg; ctx.fillRect(gx - sw / 2, gy - sh, sw, sh);
          srect(gx - sw / 2, gy - sh, sw, sh, C.ink);
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(gx - sw / 2 - 9 * s, gy - 8 * s, 7 * s, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = arrived ? C.accent : C.ink; ctx.lineWidth = arrived ? 1.5 : 1; ctx.beginPath();
          ctx.moveTo(gx + 2, gy - sh + 4); ctx.lineTo(gx - 4, gy - sh / 2 + 1); ctx.lineTo(gx + 3, gy - sh / 2 + 1); ctx.lineTo(gx - 2, gy - 4); ctx.stroke(); ctx.lineWidth = 1;
          label('ground station', gx - sw / 2 - 18 * s, gy + 22, { color: T2 });
        }
        // units rise on their tethers, staggered heights
        const U = mob ? [{ fx: 0.2, fy: 0.3 }, { fx: 0.52, fy: 0.08 }, { fx: 0.84, fy: 0.36 }] : [{ fx: 0.16, fy: 0.3 }, { fx: 0.52, fy: 0.12 }, { fx: 0.86, fy: 0.4 }];
        const units = [];
        U.forEach((q, i) => {
          // launched an 8th apart, each from its own spot beside the station, rising fast then settling (a balloon
          // let go), and faded in as it leaves the ground: the three drawings never pile up on one another
          const pr = eOut((u - BEAT * (0.25 + 0.5 * i)) / (BEAT * 1.5));
          if (pr <= 0) return;
          const tx = R.x + R.w * q.fx, ty = R.y + R.h * q.fy + 32 * s; // (the shell top sits at R.y + R.h·fy)
          const sx = gx + (i - 1) * 44 * s;
          const ux = lerp(sx, tx, pr) + Math.sin(t * 0.9 + i * 2) * 1.5 * s, uy = lerp(gy - sh - 30 * s, ty, pr) + Math.sin(t * 1.3 + i) * 1.5 * s;
          const ax = gx + (i - 1) * 8 * s, ay = gy - sh;       // tether foot on the station roof
          // the unit (scene [4] glyph): its generator plates light as power starts to flow
          ctx.save(); ctx.globalAlpha *= clamp01(pr / 0.3);
          const bp = unitArt(ux, uy, s * 1.3, t, i, { energy: on ? eOut((u - flow) / (BEAT * 0.5)) : 0, rps: 0.9 });
          ctx.restore();
          const bx = bp.x, by = bp.y;                           // tether head = the bridle point
          units.push({ ux, uy, ax, ay, bx, by });
          if (!on) { seg(ax, ay, bx, by, C.g600, [3, 3]); return; }
          // energy pulses: one per 8th per tether, one beat from unit to ground, drawn on the conducting tether
          const pk = [];
          for (let k = 0; k < 8; k++) { const te = flow + i * S16 * 0.66 + k * BEAT / 2, f = (u - te) / BEAT; if (f >= 0 && f <= 1) pk.push(f); }
          tetherArt(bx, by, ax, ay, t, { highlight: true, packets: pk, sag: 0.04 });
        });
        const hd = eOut((u - BEAT * 0.5) / BEAT);
        if (hd > 0) { // the scene reference, kept inside the frame (a shorter wording where the long one would run past it)
          ctx.save(); ctx.globalAlpha *= hd;
          const long = sceneRef('', SN.swf, ' SkyWindFarm · power flows down the tether'), short = sceneRef('', SN.swf, ' SkyWindFarm · power down the tether');
          if (mob) { // (stacked: the wire from the station up to the phrase runs at x = o.wireX — the label sits clear of it)
            const tiny = sceneRef('', SN.swf, ' SkyWindFarm'), clear = (q, x0) => o.wireX == null || o.wireX < x0 - 10 || o.wireX > x0 + mixW(q) + 10;
            const pick = [[short, R.x + R.w - mixW(short)], [short, R.x], [tiny, R.x + R.w - mixW(tiny)], [tiny, R.x]].find(([q, x0]) => clear(q, x0));
            if (pick) labelMix(pick[0], pick[1], R.y + 4);
          } else labelMix(R.x + mixW(long) <= G.F.x1 ? long : short, Math.min(R.x, G.F.x1 - mixW(short)), R.y + 4);
          ctx.restore();
        }
        if (arrived) {
          const k = eOut((u - flow - BEAT) / BEAT);
          ctx.save(); ctx.globalAlpha *= k;
          const kx = gx - sw / 2 - 18 * s, kr = G.F.x1 + 6; // (a frame narrower than the long wording gets the short one)
          if (mob || kx + mw(monoF(12), '≈127 kW delivered per unit') > kr || kx + mw(monoF(11), 'design estimate · swf.pdf') > kr) label('≈127 kW / unit (est.)', kx, gy + 40, { color: C.accent });
          else {
            label('≈127 kW delivered per unit', gx - sw / 2 - 18 * s, gy + 40, { color: C.accent });
            label('design estimate · swf.pdf', gx - sw / 2 - 18 * s, gy + 56, { size: 11, color: T2 });
          }
          ctx.restore();
        }
        return { gx, gy, sw, sh, units, port: [gx - sw / 2 - 16 * s - 1, gy - 8 * s] }; // port: left edge of the drum
      }

      // S5 — Will power (the drop): node-grid shockwave; "change the world" throws three projects out;
      // then "will power" becomes power: units rise, energy runs down the tethers and along a wire into
      // the phrase, which inks blue when the first pulse arrives.
      const WP = { rise: lb(3, 2), flow: lb(4, 1), wire: lb(4, 2), ink: lb(4, 2, 3) }; // flow: tethers light; wire: first pulse lands; ink: it reaches the phrase
      SEC[5] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G, size = sz.M, mob = G.mobile;
        if (lt < BEAT * 1.5) { // impact: every node of a grid flashes as a ring passes
          const gap = mob ? 22 : 28, cols = Math.floor(F.w / gap), rows = Math.floor(F.h / gap), R0 = (lt / (BEAT * 1.2)) * Math.hypot(F.w, F.h), fade = 1 - clamp01(lt / (BEAT * 1.5));
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
        // bar 22: "change the world" → EyeDa, idontwannadie.lol, ConnectU jump out on beats 1–3
        const off = lb(3, 1);
        if (lt >= lb(2) && lt < off + BEAT) {
          const CR = mob // mobile: one card at a time, each pushed off by the next (a small deck)
            ? [0, 1, 2].map(() => ({ x: FIG.x + FIG.w * 0.06, y: FIG.y + 8, w: FIG.w * 0.88, h: FIG.h - 44, wf: 0.8 }))
            : [0, 1, 2].map(i => { const slot = FIG.h / 3, dx = [0, 0.14, 0.04][i]; return { x: FIG.x + FIG.w * dx, y: FIG.y + i * slot, w: FIG.w * (1 - dx), h: slot - 36, wf: i ? 0.2 : 0.22 }; }); // one slot each, captions never covered
          const JUMP = [[IMG.eyeda, 'EyeDa · 2022'], [IMG.idw, 'idontwannadie.lol · 2024'], [IMG.connectu, 'ConnectU · 2025–26']];
          const sr = spanRect(La, 0);
          JUMP.forEach(([k, cap], i) => {
            const c = card(k, cap, CR[i], lb(2, 1 + i), lt, { off: mob && i < 2 ? lb(2, 2 + i) : off + i * S16, wf: CR[i].wf, hard: mob });
            if (!mob && c) leader(sr, c, lt - lb(2, 1 + i));
          });
        }
        // bars 23–24: will power → power
        if (lt >= WP.rise) {
          // (stacked: the figure starts under "…on their will power." — its scene reference never meets the phrase)
          const ey = mob ? Math.max(FIG.y + 6, yb + Lb.L.last + size * 0.3 + 16) : FIG.y;
          const sr = spanRect(Lb, 0), px = sr ? sr.x0 + Math.min(24, (sr.x1 - sr.x0) / 2) : null;
          const EN = vEnergy({ x: FIG.x, y: ey, w: FIG.w, h: FIG.y + FIG.h - ey }, lt - WP.rise, t, { flow: WP.flow - WP.rise, wireX: px });
          if (sr && lt >= WP.wire) {
            // the wire leaves the station when the first tether pulse lands and grows at the pulses' speed,
            // so its head reaches the phrase exactly when it inks; later pulses ride behind, one per 8th
            const uy = Math.round(sr.y + sr.size * 0.16) + 0.5;
            const wy = EN.port[1], travel = WP.ink - WP.wire;
            let path = [[EN.port[0], wy], [px, wy], [px, uy + 3]];
            // desktop, where the station's port is level with the phrase's line: the wire would run into the line
            // from the right, so it drops 6 px right of the line's end (left of the ground) and runs in under it
            if (!mob && wy > uy - size * 0.9 && wy < uy + size * 0.5) {
              const xe = Lb.x + Math.max(...Lb.L.toks.filter(q => !q.sp && !q.hide && Math.abs(Lb.y + q.y - sr.y) < 1).map(q => q.x + q.w));
              const xd = Math.max(xe + 8, Math.min(FIG.x - 6, EN.port[0] - 10)), yl = Math.round(uy + size * 0.42) + 0.5;
              path = [[EN.port[0], wy], [xd, wy], [xd, yl], [px, yl], [px, uy + 3]];
            }
            let len = 0; const seglen = []; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seglen.push(d); len += d; }
            const at = f => { let rem = f * len, q = path[0]; for (let i = 1; i < path.length; i++) { if (rem <= seglen[i - 1]) { const g = rem / seglen[i - 1]; return [lerp(path[i - 1][0], path[i][0], g), lerp(path[i - 1][1], path[i][1], g)]; } rem -= seglen[i - 1]; q = path[i]; } return q; };
            const head = clamp01((lt - WP.wire) / travel);
            drawOn(path, head, C.accent);
            for (let k = 0; k < 8; k++) {
              const te = WP.wire + k * BEAT / 2, f = (lt - te) / travel;
              if (f >= 0 && f <= 1) { const q = at(f), z = k === 0 ? 6 : 4; ctx.fillStyle = C.accent; ctx.fillRect(Math.round(q[0] - z / 2), Math.round(q[1] - z / 2), z, z); }
              const ua = f > 1 ? (f - 1) * travel : -1; // arrival: the terminal square swells for an instant
              if (ua >= 0 && ua < 0.25) { const z = 4 + 6 * (1 - ua / 0.25); ctx.fillStyle = C.accent; ctx.fillRect(Math.round(px - z / 2), Math.round(uy + 3 - z / 2), Math.round(z), Math.round(z)); }
            }
            if (head >= 1) { ctx.fillStyle = C.accent; ctx.fillRect(Math.round(px) - 2, Math.round(uy + 3) - 2, 4, 4); }
          }
        }
        const a = typed(SP.s5a, lt, TX, TY, size, TW, { dimAt: lb(4), halo: true });
        const b = typed(SP.s5b, lt, TX, yb, size, TW, { halo: true });
        const act = b.vis ? b : a;
        cursor(act.cx, act.cy, size, !act.done, t);
        if (!mob) ticker(t, F.x0, F.x0 + F.w * 0.55, F.y1 - 2); // desktop only: on a phone it crowds the frame
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
            // (stacked: the figure starts under the second sentence's final lines, so its title never meets them)
            const yB = a.bottom + size * 1.25 + b.L.last + size * 0.3 + 18;
            const R = G.mobile ? { x: FIG.x, y: Math.max(FIG.y - 10, yB), w: FIG.w, h: F.y1 - Math.max(FIG.y - 10, yB) } : { x: FIG.x - FIG.w * 0.15, y: F.y0 + 10, w: FIG.w * 1.15, h: F.h - 20 };
            vRadial(R, lt - lb(2), t, { burst: BAR });
          }
          if (!G.mobile) ticker(t, F.x0, F.x0 + F.w * 0.5, F.y1 - 2);
        } else {
          const size = G.mobile ? 13 : 15, mwid = Math.min(F.w, 640);
          const c = typed(SP.s6c, lt, F.x0 + F.w / 2 - mwid / 2, F.y0 + F.h * 0.46, size, mwid, { mono: true, color: T2, lhf: 1.5 });
          cursor(c.cx, c.cy, size, !c.done, t);
        }
      };

      // S7 — High bar for quality: a box builds edge by edge; wind tunnel vs CFD snaps to y = x; histogram rectifies
      SEC[7] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, VR, F } = G;
        if (lt < lb(3)) {
          const size = sz.L;
          // bar 30's figure (the tunnel photo over the tunnel-vs-CFD plot): its geometry comes first, so the
          // "→ fig. 08" tag on the line beside it is only set where it ends 16 px before the photo and the plot
          // a short figure area (a phone): the photo and the plot side by side where stacking them (photo, its
          // caption, the plot's label line, the plot) would not fit
          let g8 = null;
          if (lt >= lb(2)) {
            const side = G.mobile && FIG.h * 0.4 + 66 + Math.min(FIG.w * 0.7, FIG.h * 0.42) > FIG.h;
            const f = side ? fit(AR[ph('tunnelY')], { x: FIG.x, y: FIG.y, w: FIG.w * 0.4, h: FIG.h * 0.62 }, 0.4)
              : fit(AR[ph('tunnelY')], { x: FIG.x, y: FIG.y, w: FIG.w, h: FIG.h * 0.4 }, 0.3);
            if (side) f.x = FIG.x + 4;
            // side by side: the plot's "tunnel" axis label clears the photo, "y = x" ends inside the frame
            const sx0 = side ? f.x + f.w + 12 + mw(monoF(12), 'tunnel') + 8 : 0;
            const ps = side ? Math.max(40, Math.min(FIG.x + FIG.w - 40 - sx0, FIG.h - 60)) : Math.min(FIG.w * 0.7, FIG.h * 0.42);
            const px = side ? sx0 : FIG.x + (FIG.w - ps) / 2, py = FIG.y + FIG.h - ps - 16;
            g8 = { side, f, ps, px, py, left: Math.min(f.x - 4, px - 8 - mw(monoF(12), 'tunnel')) };
          }
          const a = typed(SP.s7a, lt, TX, TY, size, TW, { dimAt: lb(2) });
          const b = typed(SP.s7b, lt, TX, a.bottom + size * 1.3, size, TW, { tag: ['→ fig. 08'], tagMax: G.mobile || !g8 ? null : g8.left - 16 });
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
            label(`edges ${Math.min(12, Math.max(0, Math.floor(lt / S16) + 1))} / 12`, FIG.x + FIG.w / 2, cy + s * 1.1 + 20, { align: 'center', color: T2 });
          } else { // wind tunnel photo + tunnel-vs-CFD points snapping onto y = x
            const u = lt - lb(2), im = img(ph('tunnelY')), { side, f, ps, px, py } = g8;
            photo(im, f.x, FIG.y + 4, f.w, f.h, { u, wipe: S16 * 1.2, cap: side ? 'fig. 08' : G.mobile ? 'fig. 08 — wind tunnel, 2023' : 'fig. 08 — UMN wind tunnel, 2023', capMax: side ? f.w + 8 : null });
            seg(px, py + ps, px + ps, py + ps, C.ink); seg(px, py, px, py + ps, C.ink);
            drawOn([[px, py + ps], [px + ps, py]], eOut(u / BEAT), C.g500, [3, 3]);
            const k = eIO((u - BEAT) / (BEAT * 2));
            SCATTER.forEach(p => {
              const yv = p.x + lerp(p.j, p.e, k);
              ctx.fillStyle = k > 0.98 ? C.accent : C.ink; ctx.fillRect(px + p.x * ps - 2, py + ps - yv * ps - 2, 4, 4);
            });
            mlabel('sc.yx', '$y = x$', px + ps + 6, py + 6, { size: 13, color: T2 });
            label('CFD', px + ps, py + ps + 17, { align: 'right', color: T2 });
            label('tunnel', px - 8, py + 6, { align: 'right', color: T2 });
            // the result lands on the snap; the disclaimer stays (the points themselves are illustrative)
            if (k > 0.98) {
              // (every wording ends inside the frame: the widest that fits from the plot's left edge, else a shorter one)
              const xr = FIG.x + FIG.w, fits = s => px + mw(monoF(12), s) <= xr + 8; // (inside the frame's corner marks)
              if (side || py - 38 >= FIG.y + 4 + f.h + 35) {
                const r1 = side ? 'r > 0.95 (swf.pdf)' : ['correlation > 0.95 (swf.pdf)', 'r > 0.95 (swf.pdf)'].find(fits) || 'r > 0.95';
                label(r1, px, py - 26, { color: C.ink }); label(fits('points illustrative') ? 'points illustrative' : 'illustrative', px, py - 10, { color: T2 });
              } else { // one line: the widest wording that fits from the plot's left edge, else the shortest set flush right
                const C3 = [[['correlation > 0.95 (swf.pdf)', C.ink], [' · points illustrative', T2]],
                  [['r > 0.95 (swf.pdf)', C.ink], [' · points illustrative', T2]], [['r > 0.95 (swf.pdf)', C.ink], [' · illustrative', T2]],
                  [['r > 0.95 (swf.pdf)', C.ink]], [['r > 0.95', C.ink], [' · illustrative', T2]], [['r > 0.95', C.ink]]];
                const fitP = C3.find(q => px + mixW(q) <= xr + 4) || C3.find(q => mixW(q) <= xr + 4 - FIG.x) || C3[C3.length - 1];
                labelMix(fitP, Math.max(FIG.x, Math.min(px, xr + 4 - mixW(fitP))), py - 10);
              }
            } else label('points illustrative', px, py - 10, { color: T2 });
          }
        } else {
          const u = lt - lb(3);
          // "excellence": the ISEF poster, then Yash at his board (the square crop: no other people). Both land in
          // the negative half of the histogram, which the rectification has just emptied, so the payoff (the spike at
          // 0, its labels and the half-tail) stays in view. They start below the vignette's two header lines.
          const hg = histGeom(VR, false);
          const PR = { x: VR.x, y: VR.y + 58, w: Math.max(120, hg.X(0) - 28 - VR.x), h: hg.axY - 14 - (VR.y + 58) };
          const po = { maxWf: G.mobile ? 0.5 : 0.36, keepW: true, top: true, capMax: hg.X(0) - 12 - (PR.x - 4) };
          const FL = [[IMG.poster, lb(4, 2), BEAT, PR, G.mobile ? 'fig. 09 — ISEF poster' : 'fig. 09 — ISEF poster, 2024', Object.assign({ wipe: S16 * 0.6 }, po)],
            [sq('fair'), lb(4, 3), BEAT * 2, PR, 'fig. 10 — at the board, 2024', po]];
          flashes(FL, lt, false);
          label('“high bar for quality” · “excellence”', TX, F.y0 + 14, { color: T2 });
          const c = typed(SP.s7c, lt, TX, F.y0 + 30 + sz.S, sz.S, F.w * 0.92, { tag: ['→ figs. 09–10'] });
          cursor(c.cx, c.cy, sz.S, !c.done, t);
          vHist(G.VR, u, t, { fill: BAR, rect: BAR });
          flashes(FL, lt, true);
        }
      };

      // "…and are curious about everything.": a contact sheet of eight photos, one per 16th (u = s since it starts).
      // Desktop: a 3 × 3 sheet in the figure column (the ninth cell holds the caption). Phone: a 4 × 2 strip under
      // the line (yText = its bottom), numbered, with a one-line caption.
      // desktop geometry of the contact sheet (the four tools use the same footprint just before it)
      function sheetGeom() {
        const { FIG } = G, cols = 3, gx = 14, gy = 34;
        const cw = Math.min((FIG.w - gx * (cols - 1)) / cols, (FIG.h - 30 - gy * 2) / 3 - 4, 132), W = cw * cols + gx * (cols - 1);
        return { cols, gx, gy, cw, W, x0: FIG.x + (FIG.w - W) / 2, y0: FIG.y + 24 };
      }
      function curious(u, yText) {
        const { F } = G, mob = G.mobile, n = CURIOUS.length;
        let cols, cw, gx, gy, x0, y0, lab;
        if (mob) {
          cols = 4; gx = 8; gy = 8; lab = false;
          cw = Math.min((F.w - gx * (cols - 1)) / cols, (F.y1 - yText - 44 - gy) / 2);
          x0 = F.x0; y0 = Math.max(yText + 36, F.y1 - 2 * cw - gy - 4);
        } else {
          ({ cols, gx, gy, cw, x0, y0 } = sheetGeom()); lab = true;
        }
        if (cw < 24) return;
        // cell labels "01 printing": where a cell is narrower than that, the number goes; narrower still, the word
        const lw = Math.max(...CURIOUS.map(c => mw(monoF(12), c[1]))), labN = cw + gx - 8 >= lw + 18, labW = labN || cw + gx - 8 >= lw;
        const hy = y0 - 12;
        label(mob ? 'curious about everything · 2023 → 2026' : 'curious about everything', x0 - 4, hy, { color: T2 });
        CURIOUS.forEach(([id, word], k) => {
          const uk = u - k * CURIOUS_STEP;
          if (uk < 0) return;
          const x = x0 + (k % cols) * (cw + gx), y = y0 + Math.floor(k / cols) * (cw + gy);
          photo(img(sq(id)), x, y, cw, cw, { u: uk, pop: true });
          if (lab) {
            ctx.save(); ctx.globalAlpha *= clamp01(uk / 0.12);
            if (labN || !labW) label(pad2(k + 1), x - 4, y + cw + 19, { size: 11, color: C.g500 });
            if (labW) label(word, labN ? x + 18 : x - 4, y + cw + 19, { color: k === n - 1 ? C.accent : T2 });
            ctx.restore();
          }
        });
        if (!mob && u >= n * CURIOUS_STEP) { // the ninth cell: the span, set like a caption
          const k = n, x = x0 + (k % cols) * (cw + gx), y = y0 + Math.floor(k / cols) * (cw + gy);
          plus(x, y + cw / 2 - 16, 3, C.accent);
          if (x + mw(monoF(12), '2023 → 2026') <= G.F.x1 + 8) label('2023 → 2026', x, y + cw / 2 + 4, { color: C.ink });
          else { label('2023 →', x, y + cw / 2 + 4, { color: C.ink }); label('2026', x, y + cw / 2 + 20, { color: C.ink }); } // (a narrow cell: two lines)
        }
      }

      // S8 — Yearn to build: Hermes-style word highlight, then "And they yearn to build." alone, then the names
      SEC[8] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G;
        if (lt < lb(3)) {
          const size = sz.L, s = { segs: L(10, 0), n: L(10, 0).n, at: 0, slam: true };
          const font = serifF(size), Lo = lay(s.segs, font, size, TW);
          const wi = Math.min(HERMES_WORDS.length - 1, Math.floor(lt / (BEAT / 2)));
          const W = HERMES_WORDS[wi];
          const bottom = TY + Lo.last + size * 0.3;
          // desktop: the player (its hairline and its label) ends 16 px before the tools / contact sheet beside it
          const sgx = G.mobile ? Infinity : sheetGeom().x0 - 4, hLong = '▶  Hermes · word-synced voice · 0.75–4×';
          const hLab = !G.mobile && TX + mw(monoF(12), hLong) <= sgx - 12 ? hLong : '▶  Hermes · word-synced voice';
          const pw = Math.min(TW, 420, sgx - 16 - TX), py = bottom + 34, pr = (wi + ((lt / (BEAT / 2)) % 1)) / HERMES_WORDS.length;
          const b8 = py + 64 + lay(SP.s8b.segs, serifF(sz.M), sz.M, TW).last + sz.M * 0.3; // bottom of "…curious about everything."
          // Hermes is up from the downbeat (it is reading the line); on "build before they search" the other tools
          // I built for myself join it, one per 8th. Desktop: a 2 × 2 on the contact sheet's footprint, held until
          // the sheet replaces it (hard cut on the slam of the next line). Phone: a deck, each card pushing the last off.
          if (lt < CURIOUS_T) {
            const mob = G.mobile;
            if (mob) {
              TOOLS.forEach(([id, cap], i) => {
                const R = { x: FIG.x + FIG.w * 0.06, y: FIG.y + 6, w: FIG.w * 0.88, h: FIG.h - 40 };
                card(PBY[id].img, cap, R, toolT(i), lt, { off: i < TOOLS.length - 1 ? toolT(i + 1) : null, wf: 0.8, hard: true });
              });
            } else {
              // (a narrow figure column: the gap between the two columns widens until the left column's captions —
              // at least the names — end ≥ 10 px before the right column's)
              const sg = sheetGeom(), nameW = Math.max(...TOOLS.filter((_, i) => i % 2 === 0).map(q => mw(monoF(12), q[1].split(' · ')[0])));
              const gxT = Math.max(sg.gx, 2 * (nameW + 10) - sg.W), tw = (sg.W - gxT) / 2, th = Math.round(tw / 1.5);
              let first = null;
              TOOLS.forEach(([id, cap], i) => {
                const u = lt - toolT(i);
                if (u < 0) return;
                const x = sg.x0 + (i % 2) * (tw + gxT), y = sg.y0 + Math.floor(i / 2) * (th + sg.gy);
                photo(img(PBY[id].img), x, y, tw, th, { u, pop: true, cap, capMax: i % 2 ? tw + 8 : tw + gxT - 10 });
                if (i === 0) first = { x, y, w: tw, h: th, a: 1 };
              });
              // the player's line runs on as a leader to the reader it belongs to
              if (first) leader({ x1: TX + pw + 4, y: py - 0.5, size: 0 }, first, lt);
            }
          }
          if (lt >= CURIOUS_T) curious(lt - CURIOUS_T, b8);
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
          label(hLab, TX, py + 22, { color: T2 });
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
            // each name slams on one line: a long one steps down from XL to the size that fits the frame (never
            // under L; below that it wraps, and the caption goes under its last line)
            const w0 = mw(serifF(sz.XL), NAMES[k]), fitSz = Math.floor(sz.XL * (F.w - 4) / w0);
            const size = w0 <= F.w - 4 ? sz.XL : fitSz >= sz.L ? fitSz : sz.XL;
            const s = spec(segs('nm' + k, NAMES[k]), { at: 0, slam: true }), Lo = lay(s.segs, serifF(size), size, F.w);
            // the running list (desktop, a wide frame): right-aligned from the frame's top; the name sits low enough
            // to clear it by 40 px (else the list goes: it never runs into the counter or the name)
            const listB = F.y0 + 30 + (NAMES.length - 1) * 17, capY = lo => lo + sz.XL * 0.62 + 4;
            let y = F.y0 + F.h * 0.48 - Lo.last / 2, list = !G.mobile && F.w >= 700;
            if (list) { const y2 = Math.max(y, listB + 40 + sz.XL); if (capY(y2 + Lo.last) <= F.y1 - 6) y = y2; else list = false; }
            const x = F.x0 + (F.w - Lo.w) / 2;
            typed(s, 1, x, y, size, F.w, { color: k === NAMES.length - 1 ? C.accent : C.ink });
            label(`${pad2(k + 1)} / ${pad2(NAMES.length)}`, x, y - size - 6, { size: 11, color: C.g500 });
            if (list) for (let i = 0; i <= k; i++) label(NAMES[i], F.x1, F.y0 + 30 + i * 17, { align: 'right', color: i === k ? C.ink : T2 });
            // the caption under the name's last line: the long wording where it fits the frame, else the short one
            const capV = ['They are known by many names in their communities:', 'Known by many names:'].filter((q, i) => i || !G.mobile);
            const cap = capV.find(q => x + mw(monoF(12), q) <= F.x1 + 6) || capV[capV.length - 1];
            label(cap, Math.max(F.x0, Math.min(x, F.x1 + 6 - mw(monoF(12), cap))), y + Lo.last + size * 0.62, { color: T2 });
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
            // a callout above the phrase (desktop: Marco, top right) never crosses the lines: its leader leaves from
            // the right end of the phrase's underline (as the film's other leaders do), runs right under the line's
            // end to 14 px past the widest line, and only then climbs to its name
            const uy = Math.round(sr.y + size * 0.16) + 0.5;
            const xB = TX + Math.max(...a.L.toks.filter(q => !q.sp && !q.hide && TY + q.y <= sr.y + 1).map(q => q.x + q.w)) + 14;
            const urlOf = f => f.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            const wOf = f => Math.max(mw(monoF(12), f.label), mw(monoF(12), urlOf(f)));
            // stacked (phone / portrait): a spine drops from the anchor, and each callout branches off it on its own
            // row — Marco and Pranav to the right, Brian and Max (right-aligned) to the left where they fit there,
            // else to the right as well — so no leader ever runs through another callout's name or url
            const leftOK = ax - 18 - Math.max(wOf(FRIENDS[2]), wOf(FRIENDS[3])) >= F.x0;
            const rowsM = leftOK ? [0.58, 0.76, 0.67, 0.85] : [0.45, 0.57, 0.69, 0.81]; // (two sides: the rows alternate R, L, R, L)
            const spots = [[F.x1 - 150, F.y0 + 30], [F.x1 - 60, F.y0 + F.h * 0.45], [F.x0 + F.w * 0.62, F.y1 - 30], [F.x0 + 40, F.y1 - 60]];
            FRIENDS.forEach((f, i) => {
              const p = (lt - td - i * S16) / (S16 * 1.25); // (each draws on in 1¼ 16ths: the fourth completes inside the bar)
              if (p <= 0) return;
              const url = urlOf(f);
              if (G.mobile) {
                const left = leftOK && i >= 2, ly = F.y0 + F.h * rowsM[i], lx = left ? ax - 14 : Math.min(ax + 14, F.x1 + 2 - wOf(f));
                callout(ax, ay, lx, ly, f.label, url, p, { tcol: C.accent, via: [[ax, ly]], align: left ? 'right' : null });
                return;
              }
              // (a callout's name and its url end inside the frame: its spot moves left where they would not)
              const [lx0, ly] = spots[i], lx = Math.min(lx0, F.x1 + 2 - wOf(f));
              if (ly < sr.y - size * 0.5 && lx > xB + 20) callout(sr.x1 + 1, uy, lx, ly, f.label, url, p, { tcol: C.accent, via: [[xB, uy]], noDot: true });
              else callout(ax, ay, lx, ly, f.label, url, p, { tcol: C.accent });
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
          tracked('ENERGY', Rl.x, top - 10); tracked('INTELLIGENCE', Rr.x, top - 10); // (panel titles: the shared eyebrow style)
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
          // every layout: an item that would run past the frame starts a second row (or, with no room under the
          // frame's foot for one, is left out)
          let x = TX, y = py;
          PRESS.forEach((p, i) => {
            const w = mw(monoF(12), p);
            if (x > TX && x + w + 14 > F.x1 + 4) { if (y + 22 <= F.y1 - 4) { x = TX; y += 22; } else return; }
            if (lt >= lb(4, 3) + i * S16) {
              srect(x, y - 9, 8, 8, i === PRESS.length - 1 ? C.accent : C.ink);
              label(p, x + 14, y, { color: C.ink });
            }
            x += w + 14 + (G.mobile ? 12 : 24);
          });
          if (lt >= lb(4, 3)) tracked('PRESS', TX, py - 22);
          if (!G.mobile) ticker(t, F.x0, F.x0 + F.w * 0.55, F.y1 - 2);
        }
      };

      // S10 — Change things: all four vignettes at once; closing lines; dissolve into the interactive page
      SEC[10] = (lt, t) => {
        const { TX, TY, TW, sz, FIG, F } = G;
        if (lt < lb(3)) {
          // The strip of four panels starts under the two lines' final layout: lower where they need it (down to
          // its minimum height), and where even that is not enough the two lines start higher (s10Layout).
          const { size, tw10, lab, ty, Ry, yEnd } = s10Layout();
          const a = typed(SP.s10a, lt, TX, ty, size, tw10, { dimAt: lb(2) });
          const b = typed(SP.s10b, lt, TX, a.bottom + size * 1.25, size, tw10);
          const act = b.vis ? b : a;
          cursor(act.cx, act.cy, size, false, t);
          // bar 42 ("They push the human race forward."): a hard cut on the downbeat from the four scenes to the
          // assembly engine, the crescendo
          if (lt >= lb(2)) { engine(t); return; }
          ctx.save();
          const R = { x: F.x0, y: Ry, w: F.w, h: yEnd - Ry };
          const cols = G.mobile ? 2 : 4, rowsN = G.mobile ? 2 : 1, gap = G.mobile ? 14 : 22;
          const gw = (R.w - (cols - 1) * gap) / cols, gh = (R.h - rowsN * lab - (rowsN - 1) * gap) / rowsN;
          // (each panel's drawing fills the same ~80 % content box: the LpWM rollout spreads over the panel's height,
          // the radial burst is scaled so its 95 % shell spans ~80 % of the width)
          // (the four scenes on keys 1–4, in key order, read from the registry: SN. The robot's panel is its CAD
          // render. A page that is not on a key only fills a slot the keys leave empty, unnumbered.)
          const VIG = {
            lpwm: ['LpWM', (r) => vCode(r, BEAT * 7.5, t, { mini: true, fill: true })],
            lpjepa: ['Rectified LpJEPA', (r) => vHist(r, BAR * 1.5 + lt, t, { mini: true, fill: BAR, rect: BAR })],
            swf: ['SkyWindFarm', (r) => vTurb(r, BAR * 2, t, { mini: true })],
            robot: ['Robot', (r, u) => vRobot(r, u)],
            radial: ['Radial-VCReg', (r) => vRadial(r, BAR + 0.1 + lt * 0.8, t, { mini: true, burst: BAR })],
          };
          const cells = Object.keys(VIG).filter(k => SN[k]).sort((a, b) => SN[a] - SN[b]).slice(0, 4).map(k => [SN[k], ...VIG[k]]);
          Object.keys(VIG).forEach(k => { if (cells.length < 4 && !SN[k]) cells.push([null, ...VIG[k]]); });
          cells.forEach(([n, name, fn], i) => {
            const u = lt - i * S16;
            if (u < 0) return;
            const r = { x: R.x + (i % cols) * (gw + gap), y: R.y + Math.floor(i / cols) * (gh + lab + gap) + lab, w: gw, h: gh };
            srect(r.x, r.y, r.w, r.h, C.g300);
            plus(r.x, r.y, 3, C.accent);
            // the panel's name, or a shorter one, or just its number: never wider than the panel
            const chip = n ? `[${n}]` : '', nm = [name, name.replace('Rectified ', '')].find(q => mixW([[`${chip} ${q}`.trim()]]) <= r.w + 2);
            labelMix([[chip, C.accent], [nm ? (chip ? ' ' : '') + nm : '', C.ink]], r.x, r.y - 8);
            ctx.save(); ctx.beginPath(); ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); ctx.clip();
            fn({ x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 }, u);
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
          engine(t); // "system active", then the engine powers down (gone by beat 3)
          // credits, bottom-left: the poem's attribution types on, then the design credit (Paradigm). They are drawn
          // after the frame's end fade (render → afterFade), so they hold at full strength until the page settles.
          // (short screens: the attribution starts 3 16ths late, once the engine has cleared its band; the closing lines
          // type on those 16ths, so every keystroke heard is still one seen)
          const lf = lt - (engGeom().early ? 3 * S16 : 0);
          afterFade = () => {
            const { cw, fs, lhf, yf, yg } = creditsLayout();
            if (lf >= SP.s10f.at) { const k = eOut((lf - SP.s10f.at) / BEAT); seg(F.x0, yf - 22.5, F.x0 + 48 * k, yf - 22.5, C.g400); }
            typed(SP.s10f, lf, F.x0, yf, fs, cw, { mono: true, color: T2, lhf });
            typed(SP.s10g, lt, F.x0, yg, fs, cw, { mono: true, color: T2, lhf });
          };
        }
      };

      /* ---------------------------------------------------------- HUD, marks, glitch */
      function drawMarks(t) {
        const F = G.F, bt = Math.floor(t / BEAT) % 4, s16 = (t / BEAT) % 1;
        const P = [[F.x0 - 12, F.y0 - 4], [F.x1 + 12, F.y0 - 4], [F.x1 + 12, F.y1 + 8], [F.x0 - 12, F.y1 + 8]];
        P.forEach(([x, y], i) => plus(x, y, 4, i === bt && s16 < 0.25 ? (bt === 0 ? C.accent : C.ink) : C.g300));
      }
      // eyebrow text: UPPERCASE mono with .06em tracking, set glyph by glyph (canvas letterSpacing is not everywhere)
      const trackW = (s, sz) => { const f = monoF(sz || 12); let w = 0; for (const ch of s) w += mw(f, ch); return w + Math.max(0, s.length - 1) * (sz || 12) * 0.06; };
      function tracked(s, x, y, o) {
        o = o || {};
        const sz = o.size || 12, f = monoF(sz), ls = sz * 0.06;
        let xx = o.align === 'right' ? x - trackW(s, sz) : x;
        ctx.font = f; ctx.fillStyle = o.color || T2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        for (const ch of s) { ctx.fillText(ch, xx, y); xx += mw(f, ch) + ls; }
      }
      // The film's header, in the style every scene shares: the chapter eyebrow at the content-left x
      // ("§03 · QUESTION EVERYTHING · STANZA 02"), the step counter top-right ("02 / 06 · Question") with a short
      // hairline under it (progress through the step) and the play state under that, after the film's transport
      // (four beat squares, bar.beat.16th, tempo): "▪▫▫▫ 12.3.2 · 118 BPM · autoplay" / "… · paused · [space]".
      // All 12 px mono, #555. Where a line would run into the other, the eyebrow drops its stanza, then its name.
      // Phone: one line (the counter carries the state when paused) and the hairline with the beat squares.
      function drawHud(t, si) {
        const F = G.F, S = SECTIONS[si], ph = G.phone, f12 = monoF(12);
        const bar = Math.floor(t / BAR) + 1, beat = (Math.floor(t / BEAT) % 4) + 1, s16 = (Math.floor(t / S16) % 4) + 1;
        let k = 0; for (let i = 0; i < STEPS.length; i++) if (t >= lb(STEPS[i].bar) - 1e-6) k = i;
        const k0 = lb(STEPS[k].bar), k1 = k + 1 < STEPS.length ? lb(STEPS[k + 1].bar) : SETTLE_AT, prog = clamp01((t - k0) / (k1 - k0));
        const xr = ph ? G.w - 16 : G.w - 40, y1 = ph ? 86 : HUD.y1, yb = ph ? 94 : HUD.bar;
        const state = playing ? 'autoplay' : TOUCH ? 'paused' : 'paused · [space]';
        const num = `${pad2(k + 1)} / ${pad2(STEPS.length)}`, cFull = ph && !playing ? `${num} · paused` : `${num} · ${STEPS[k].label}`;
        const sec = `§${pad2(si + 1)}`, eFull = `${sec} · ${S.name} · ${S.ref}`.toUpperCase(), eMid = `${sec} · ${S.name}`.toUpperCase();
        const room = c => xr - mw(f12, c) - 24 - F.x0;
        // (phone, paused: the eyebrow gives up its name before the counter gives up "· paused" — the state stays)
        const opts = ph && !playing ? [[eFull, cFull], [eMid, cFull], [sec, cFull], [eMid, num], [sec, num]]
          : [[eFull, cFull], [eMid, cFull], [eMid, num], [sec, cFull], [sec, num]];
        const [eb, ctr] = opts.find(([e, c]) => trackW(e) <= room(c)) || opts[opts.length - 1];
        tracked(eb, F.x0, y1);
        label(ctr, xr, y1, { align: 'right', color: T2, noKO: true });
        // progress hairline: ink while the film plays, grey when paused
        const hw = ph ? 44 : 64, hx = xr - hw;
        ctx.fillStyle = C.g300; ctx.fillRect(hx, yb, hw, 1);
        ctx.fillStyle = playing ? C.ink : C.g500; ctx.fillRect(hx, yb, Math.round(hw * prog), 1);
        const beats = (x, yTop) => {
          for (let i = 0; i < 4; i++) {
            if (i === beat - 1) { ctx.fillStyle = i === 0 ? C.accent : C.ink; ctx.fillRect(x + i * 9, yTop, 6, 6); } else srect(x + i * 9, yTop, 5, 5, C.g400);
          }
        };
        if (ph) { beats(hx - 10 - 33, yb - 3); return; }
        const st2 = `${pad2(bar)}.${beat}.${s16} · ${BPM} BPM · ${state}`, w2 = mw(f12, st2);
        label(st2, xr, HUD.y2, { align: 'right', color: T2, noKO: true });
        beats(xr - w2 - 12 - 33, HUD.y2 - 7);
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
      let afterFade = null; // drawn at full strength after the end fade (the credits)
      function render() {
        if (!G || G.cw !== cv.w || G.ch !== cv.h) relayout();
        cv.clear();
        const t = pos, si = secAt(t), S = SECTIONS[si];
        ovBegin();
        KO.length = 0; afterFade = null;
        ctx.save();
        const fade = 1 - clamp01((t - lb(44, 3)) / BEAT);
        ctx.globalAlpha = fade;
        drawMarks(t);
        drawHud(t, si);
        // everything a section draws stays inside the frame's corner marks (a vignette never spills past them)
        ctx.save(); ctx.beginPath(); ctx.rect(G.F.x0 - 10, G.F.y0 - 12, G.F.w + 20, G.F.h + 22); ctx.clip();
        try { SEC[si](t - S.t0, t); } catch (err) { console.error('[build] section', si, err); }
        ctx.restore();
        ctx.restore();
        KO.length = 0;
        if (afterFade) { try { afterFade(); } catch (err) { console.error('[build] credits', err); } }
        ovEnd();
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
      const btnCss = 'font-size:var(--fs-xs);line-height:var(--lh-xs);color:var(--ink);border-bottom:1px solid var(--g400);padding:0;';
      const row = H('div', { style: 'display:flex;gap:16px;align-items:baseline;white-space:nowrap' });
      const KEYS = TOUCH ? { pause: 'Pause', play: 'Play', skip: 'Skip to index', replay: 'Replay the film' }
        : { pause: 'Pause [space]', play: 'Play [space]', skip: 'Skip to index [↵]', replay: 'Replay the film [space]' };
      const bPlay = H('button', { type: 'button', style: btnCss, text: KEYS.pause });
      const bSkip = H('button', { type: 'button', style: btnCss, text: KEYS.skip });
      row.append(bPlay, bSkip);
      group.append(row);
      const st2 = api.stepper({ items: ['Poem', 'Stints', 'Friends'], onSelect: i => jumpTo(i) });
      const bReplay = H('button', { type: 'button', style: btnCss, text: KEYS.replay });
      const row2 = H('div', { style: 'display:flex;gap:16px;align-items:baseline;white-space:nowrap' }, bReplay);
      group.append(row2);
      [bPlay, bSkip, bReplay].forEach(b => {
        b.addEventListener('pointerenter', () => { b.style.color = C.accent; b.style.borderColor = C.accent; ui('hover'); });
        b.addEventListener('pointerleave', () => { b.style.color = ''; b.style.borderColor = ''; });
      });
      bPlay.addEventListener('click', () => { ui('tick'); togglePlay(); });
      bSkip.addEventListener('click', () => settle('skip')); // (settle voices the skip: a mechanical Enter, a compile run)
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
        const txt = playing ? KEYS.pause : KEYS.play;
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
        // the score steps its click row aside around every on-screen keystroke, slam and machine event
        if (score && typeof score.typing === 'function') { try { score.typing(FOLEY.filter(e => TACTILE.has(e.k)).map(e => e.t)); } catch (e) {} }
        return score;
      }
      function scorePlay(at) {
        if (!soundOn || mode !== 'film' || !playing) return;
        const s = getScore();
        if (s) { try { s.play(Math.max(0, Math.min(DUR, at))); } catch (e) { console.warn('[build] score.play', e); } }
        startFoley();
      }
      // tolerate either shape of the score API: `playing` as a getter/bool or a method, `position` as a method or number
      function sPlaying() { try { return !!(score && (typeof score.playing === 'function' ? score.playing() : score.playing)); } catch (e) { return false; } }
      function sPos() { try { const p = typeof score.position === 'function' ? score.position() : score.position; return +p; } catch (e) { return NaN; } }
      // what the listener HEARS now (position minus the output latency: 150–250 ms on Bluetooth): the picture follows
      // this, so typed characters, slams and card jumps never appear before their sounds. Scheduling uses sPos().
      function sHeard() { try { return typeof score.heardPosition === 'function' ? +score.heardPosition() : sPos(); } catch (e) { return sPos(); } }
      function scoreStop(fade) {
        stopFoley(); stopHums();
        if (score) { try { score.stop(fade == null ? 0.3 : fade); } catch (e) {} }
      }
      let scrubTimer = 0;
      function scoreRestartSoon() {
        if (!soundOn) return;
        if (sPlaying()) scoreStop(0.06);
        clearTimeout(scrubTimer);
        scrubTimer = setTimeout(() => { if (mode === 'film' && playing) scorePlay(pos); }, 160);
      }
      // Microsound that is tied to what is on screen (keystrokes, slams, card jumps, the bench and the engine) —
      // scheduled against the score's clock so it lands on the same 16th grid as the music. Levels stay under the music.
      // (the kinds the score's click row steps aside for: score.typing())
      const TACTILE = new Set(['key', 'slam', 'bkey', 'servo', 'glide', 'vac', 'puff', 'seat', 'compile', 'power', 'hiss', 'place', 'active']);
      const FOLEY = buildFoley();
      function buildFoley() {
        let ev = [];
        const add = (sec, lt, k, p, x) => ev.push(Object.assign({ t: SECTIONS[sec].t0 + lt, k, p: p || 0 }, x));
        // Typing: one keystroke per 16th that shows new characters, voiced by what it types (round 4: real mechanical
        // switches): a space bar where the new characters start with a space, else a key press; a line that lands whole
        // (a slam) is an Enter.
        const typedSpec = (sec, s) => {
          if (s.slam) { add(sec, s.at, 'slam', 0, { kk: 'enter' }); return; }
          const txt = s.segs.map(g => g.text).join('');
          let prev = 0;
          for (let lt = s.at != null ? s.at : (s.stops ? s.stops[0][0] : s.parts[0].at); lt < SECTIONS[sec].t1 - SECTIONS[sec].t0; lt += S16) {
            const v = visAt(s, lt + 1e-4);
            if (v > prev) {
              const nu = txt.slice(prev, v);
              add(sec, lt, s.stops ? 'slam' : 'key', v - prev, { kk: s.stops ? 'enter' : !nu.trim() || nu[0] === ' ' ? 'space' : 'press' });
              prev = v;
            }
            if (v >= s.n) break;
          }
        };
        [[0, 's0'], [1, 's1a'], [1, 's1b'], [1, 's1c'], [2, 's2a'], [2, 's2b'], [3, 's3a'], [3, 's3b'], [3, 's3c'], [4, 's4a'], [4, 's4b'], [5, 's5a'], [5, 's5b'],
          [6, 's6a'], [6, 's6b'], [6, 's6c'], [7, 's7a'], [7, 's7b'], [7, 's7c'], [8, 's8b'], [8, 's8c'], [9, 's9a'], [9, 's9b'], [9, 's9d'], [10, 's10a'], [10, 's10b'], [10, 's10c'], [10, 's10d'], [10, 's10e'], [10, 's10f'], [10, 's10g']]
          .forEach(([sec, k]) => typedSpec(sec, SP[k]));
        SP.s9c.forEach(s => typedSpec(9, s));
        // montage: a tick per frame (≤ 8/s at 16ths; every other frame if the catalog ever forces faster flips)
        MONTAGE.forEach((_, i) => { if (FLIP.step >= S16 - 1e-6 || i % 2 === 0) add(0, FLIP.t0 + i * FLIP.step, 'flip', i); });
        [[1, lb(1, 1)], [1, lb(1, 3)], [1, lb(2, 1)], [2, lb(4, 3)], [4, lb(1, 4)], [4, lb(2, 4)], [7, lb(4, 2)], [7, lb(4, 3)]].forEach(([s, t], i) => add(s, t, 'flash', i));
        [[5, lb(2, 1)], [5, lb(2, 2)], [5, lb(2, 3)]].forEach(([s, t], i) => add(s, t, 'card', i));
        TOOLS.forEach((_, i) => add(8, toolT(i), 'card', 3 + i));
        CURIOUS.forEach((_, k) => { if (k % 2 === 0) add(8, CURIOUS_T + k * CURIOUS_STEP, 'thumb', k); }); // a tick per 16th (rate limit)
        for (let i = 0; i < HEX.rows.length; i++) add(3, lb(4, 2) + i * S16, 'row', i); // one hex row per 16th (on the grid)
        for (let c = 1; c < 8; c++) add(4, lb(3) + BEAT * (1 + c), 'col', CODE.active[c]);
        add(4, lb(3) + BEAT, 'snap');
        for (let j = 0; j < 8; j++) add(6, lb(3) + j * S16, 'shell', j * 3);         // the burst: three shells per 16th
        for (let i = 0; i < 8; i++) add(7, lb(3) + i * 2 * S16, 'hist', i * 2);      // every other 16th (the line types on the others)
        add(7, lb(4), 'snap');
        NAME_T.forEach((t, i) => add(8, t, 'name', i));
        for (let i = 0; i < 4; i++) add(9, charTime(SP.s9a, 50) + i * S16 + S16, 'ping', i);
        PRESS.forEach((p, i) => add(9, lb(4, 3) + i * S16, 'press', i));
        for (let i = 0; i < HERMES_WORDS.length; i++) add(8, i * BEAT / 2, 'word', i);
        [lb(4, 2), lb(4, 3), lb(4, 4)].forEach((t, i) => add(5, t, 'energy', i));
        add(5, WP.ink, 'powered');
        // bits & atoms, the bench: the command's keys (its Enter is also the title's first keystroke), the arm's moves,
        // the vacuum (on: a hiss; off: a puff), the snap-fits, the compile tick, power (relay + ping)
        const abs = (t, k, x) => ev.push(Object.assign({ t, k, p: 0 }, x));
        BENCH.keys.forEach(([t, ch]) => abs(t, 'bkey', { kk: ch === '\b' ? 'backspace' : ch === '\n' ? 'enter' : 'press' }));
        ev = ev.filter(e => !(e.k === 'key' && Math.abs(e.t - SP.s0.at) < 1e-6));
        BENCH.moves.forEach(([t0, t1, , v], i) => abs(t0, v, { dur: t1 - t0, p: i }));
        BENCH.grip.forEach(([on, seat, off], i) => { abs(on, 'vac', { p: i }); abs(seat, 'seat', { p: i }); abs(off, 'puff', { p: i }); });
        abs(BENCH.compiled, 'compile');
        abs(BENCH.power, 'power');
        // the engine: a CNC hum under it; per placement the travel (servo) and the ram (hiss) where there is room for
        // them (the ram on its keystroke of the score's accelerando), always the snap-fit, and a relay as each unit
        // comes online; then "system active"
        abs(ENG.t0, 'cnc', { dur: ENG.on - ENG.t0 });
        ENG.k.forEach((q, k) => {
          const roomy = q.ram != null || q.gap >= 2 * S16 - 1e-6;
          if (roomy && k % 2 === 0 && q.tE - q.tS >= 0.06) abs(q.tS, 'servo', { dur: q.tE - q.tS, p: 10 + k });
          if (roomy) abs(q.tE, 'hiss', { dur: q.dip, p: k });
          abs(q.p, 'place', { p: k });
        });
        abs(ENG.on, 'active');
        const seen = new Set();
        return ev.sort((a, b) => a.t - b.t).filter(e => { const k = e.k + '@' + e.t.toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; });
      }
      // Round-4 micro-foley voices (audio.js): play.key (kind: press / space / backspace / enter), servo, pneumatic,
      // arm, snap, relay, compile, and the pitched chime / ping (midi, o); the continuous cnc(). Every call is guarded
      // (typeof); where a voice is missing, the older microsound kit stands in (FALLBACK), so the film never goes silent.
      function fx(name, o, midi) {
        const a = aud();
        if (!soundOn || !a || !a.enabled || !a.play) return false;
        const f = a.play[name];
        if (typeof f === 'function') {
          try { if (midi != null) f(midi, o); else f(o); return true; } catch (e) { /* fall back */ }
        }
        if (FALLBACK[name]) { try { FALLBACK[name](a, o, midi); } catch (e) { /* silent */ } }
        return false;
      }
      function fxKey(kind, o) {
        const a = aud();
        if (!soundOn || !a || !a.enabled || !a.play) return;
        const f = a.play.key;
        if (typeof f === 'function') { try { f(Object.assign({ kind }, o)); return; } catch (e) { /* fall back */ } }
        FALLBACK.key(a, Object.assign({ kind }, o));
      }
      const jit = t => (t * 7919) % 1;
      const FALLBACK = {
        key: (a, o) => {
          const r = jit(o.when), d = o.dest, g = o.gain;
          if (o.kind === 'space') play('click', { when: o.when, gain: g * 1.1, freq: 950 + r * 250, q: 1.1, pan: o.pan, dest: d });
          else if (o.kind === 'backspace') { play('click', { when: o.when, gain: g * 0.9, freq: 2600, pan: o.pan, dest: d }); play('click', { when: o.when + 0.012, gain: g * 0.6, freq: 1900, pan: o.pan, dest: d }); }
          else if (o.kind === 'enter') { play('click', { when: o.when, gain: g * 1.1, freq: 1250, q: 1.4, pan: o.pan, dest: d }); play('tick', a.degree(0, 0), { when: o.when, gain: 0.12, dest: d }); }
          else play('click', { when: o.when, gain: g * (0.9 + 0.2 * r), freq: 1700 + r * 3300, pan: o.pan, dest: d });
        },
        servo: (a, o) => { play('noise', { when: o.when, dur: Math.max(0.02, o.dur - 0.03), attack: 0.012, release: 0.03, filter: 'bandpass', freq: 1250, freqTo: 1650, q: 5, gain: 0.07 * o.gain, pan: o.pan, dest: o.dest }); play('click', { when: o.when, gain: 0.25 * o.gain, freq: 2200, pan: o.pan, dest: o.dest }); },
        arm: (a, o) => play('noise', { when: o.when, dur: Math.max(0.03, o.dur - 0.05), attack: 0.03, release: 0.05, filter: 'bandpass', freq: 820, freqTo: 1100, q: 3.5, gain: 0.08 * o.gain, pan: o.pan, dest: o.dest }),
        pneumatic: (a, o) => play('noise', { when: o.when, dur: Math.max(0.01, (o.dur || 0.06) * 0.6), attack: 0.003, release: (o.dur || 0.06) * 0.8, filter: 'bandpass', freq: 3000, q: 0.7, type: 'white', gain: 0.05 * o.gain, pan: o.pan, dest: o.dest }),
        snap: (a, o) => { play('glitch', { when: o.when, repeats: 2, len: 0.009, gain: 0.35 * o.gain, pan: o.pan, dest: o.dest }); play('tick', a.degree(o.heavy ? 0 : 2, 1), { when: o.when, gain: 0.25 * o.gain, pan: o.pan, dest: o.dest }); },
        relay: (a, o) => { play('click', { when: o.when, gain: 0.7 * o.gain, freq: 2400, q: 3, pan: o.pan, dest: o.dest }); play('click', { when: o.when + 0.007, gain: 0.5 * o.gain, freq: 1500, q: 3, pan: o.pan, dest: o.dest }); },
        compile: (a, o) => play('data', { when: o.when, dur: S16 * 0.9, density: 70, gain: 0.22 * o.gain, spread: 0.6, clicks: 0.6, bits: 0.2, pitch: [a.degree(0, 0), a.degree(2, 0), a.degree(4, 0)], dest: o.dest }),
        ping: (a, o, m) => play('bit', m != null ? m : a.degree(0, 1), { when: o.when, gain: 0.3 * o.gain, pan: o.pan, dest: o.dest }),
        chime: (a, o) => [a.degree(0, 0), a.degree(3, 0), a.degree(0, 1)].forEach((m, i) => play('grain', m, { when: o.when + i * 0.028, dur: 0.22, gain: (0.4 - i * 0.08) * o.gain, bright: 0.2, pan: (i - 1) * 0.3, dest: o.dest })),
      };
      // The engine's CNC hum (cnc(), else the older hum at D2): it spools up with the placements to the downbeat, where
      // it stops. Pausing / seeking / leaving stops it at once (scoreStop → stopHums).
      let hums = [];
      // (u0: how far into the engine it starts, 0..1: a resume or a seek into bar 42 re-enters the hum at the speed
      // it had reached, after a short fade-in)
      function cncStart(when, dur, u0) {
        const a = aud();
        if (!soundOn || !a || !a.enabled || !(dur > 0.05)) return;
        const isCnc = typeof a.cnc === 'function', u = Math.max(0, Math.min(1, u0 || 0));
        let h = null;
        try {
          if (isCnc) h = a.cnc({ when, dest: bus(), gain: 0.7 + 0.3 * u, rate: 0.3 + 0.7 * u, load: 0.15 + 0.5 * u, attack: u ? 0.12 : 0.3 });
          else if (typeof a.hum === 'function') h = a.hum(a.degree(0, -2), { when, dest: bus(), gain: 0.2 + 0.1 * u, rate: 16 + 24 * u, cutoff: 900, attack: u ? 0.12 : 0.3 });
        } catch (e) { h = null; }
        if (!h) return;
        const rec = { h, timers: [] }, ms = Math.max(0, (when - a.now()) * 1000);
        rec.timers.push(setTimeout(() => { try { if (typeof h.set === 'function') h.set(isCnc ? { rate: 1, load: 0.65, gain: 1 } : { rate: 40, gain: 0.3 }, dur * 0.9); } catch (e) {} }, ms + (u ? 130 : 0)));
        rec.timers.push(setTimeout(() => { try { h.stop(0.3); } catch (e) {} hums = hums.filter(q => q !== rec); }, ms + dur * 1000));
        hums.push(rec);
      }
      function stopHums(rel) { hums.forEach(r => { r.timers.forEach(clearTimeout); try { r.h.stop(rel == null ? 0.12 : rel); } catch (e) {} }); hums = []; }
      // "system active / compile success". The chime is the score's own when it composes a resolution (a section named
      // resolve / success / active / compile, or BuildScore.resolves) and is playing, so the two never double; else
      // (no score, or it failed to start) it plays here.
      function scoreResolves() {
        const BS = window.Site && window.Site.BuildScore;
        try { return !!(BS && sPlaying() && (BS.resolves || (BS.sections || []).some(q => /resol|success|active|compile/i.test(q.name || '')))); } catch (e) { return false; }
      }
      // Round-2 voicing: the owner loves the typing, the discrete sounds and the drums, but found the high
      // content tiring. Tuned material sits in D4–A5 (≈294–880 Hz fundamentals), grains are dark
      // (bright ≤ 0.25), clicks are shorter/lower, and there are no sustained high tones anywhere.
      function foleyFire(e, when) {
        const a = aud(); if (!a) return;
        const dest = bus(), D = (i, o) => a.degree(i, o);
        const pan = ((e.t * 7.3) % 2) - 1;
        const lowPitch = [D(0, 0), D(2, 0), D(3, 0), D(4, 0), D(0, 1)];
        switch (e.k) {
          // (the score drops its own click row around these keystrokes — score.typing() — so the typing owns its 16ths)
          // (typing level: the score's click row was voiced against keys at ~0.65, build-score.js header; ±10 % per
          // keystroke so a line never sounds machine-flat. Peaks stay ≈ −26 dBFS, under the −24 dBFS UI ceiling.)
          case 'key': fxKey(e.kk || 'press', { when, gain: e.kk === 'space' ? 0.7 : 0.66, vel: 0.62 + 0.3 * jit(e.t), tone: 0.3, pan: pan * 0.4, dest }); break;
          case 'slam': fxKey('enter', { when, gain: 0.76, vel: 0.9, tone: 0.3, pan: pan * 0.3, dest }); play('glitch', { when: when + 0.004, repeats: 2, len: 0.014, gain: 0.1, dest }); break;
          case 'flip': { // pitched by the frame's year: the montage climbs a step per year, 2022 → 2026
            const m = MONTAGE[e.p], yi = m ? Math.max(0, Math.min(4, (m.year || 2022) - 2022)) : 0;
            play('tick', D(yi, 0), { when, gain: 0.28 + 0.04 * ((e.p % 4) === 0), pan: ((e.p % 6) / 5) * 1.0 - 0.5, dest }); break;
          }
          case 'flash': play('bit', D(4 + (e.p % 3), 0), { when, gain: 0.2, dest }); break;
          case 'card': play('grain', D((2 + e.p) % 5, 0), { when, gain: 0.36, bright: 0.2, pan: ((e.p % 3) - 1) * 0.4, dest }); break;
          case 'thumb': play('tick', D([0, 2, 4, 3, 1, 4, 2, 0][e.p % 8], 0), { when, gain: 0.2, pan: (e.p % 4) / 3 - 0.5, dest }); break;
          case 'row': play('data', { when, dur: S16 * 0.8, density: 48, gain: 0.13, spread: 0.9, pitch: lowPitch, clicks: 0.3, dest }); break;
          case 'col': play('tick', D(e.p % 5, 0), { when, gain: 0.22, dest }); break;
          case 'snap': play('glitch', { when, repeats: 5, len: 0.02, gain: 0.22, dest }); break;
          case 'shell': play('tick', D(e.p / 3, 0), { when, gain: 0.24, pan: pan, dest }); break;
          case 'hist': play('click', { when, gain: 0.12, freq: 1200 + ((e.p * 0.37) % 1) * 1300, pan, dest }); break;
          case 'name': play('tick', D(e.p, 0), { when, gain: 0.24, dest }); break;
          case 'ping': play('grain', D(e.p * 2, 0), { when, gain: 0.3, bright: 0.2, pan: [0.7, 0.9, 0.3, -0.7][e.p], dest }); break;
          case 'press': play('bit', D(e.p, 0), { when, gain: 0.15, dest }); break;
          case 'word': play('click', { when, gain: 0.1, freq: 1500, dest }); break;
          // will power → power: energy reaching the ground = a clean sub pulse + a low tick
          case 'energy': play('sub', D(0, -2), { when, dur: 0.3, gain: 0.22, dest }); play('tick', D(0, 1), { when, gain: 0.18, pan: -0.3, dest }); break;
          case 'powered': play('grain', D(0, 0), { when, gain: 0.34, bright: 0.15, dur: 0.18, dest }); play('grain', D(3, 0), { when: when + 0.01, gain: 0.24, bright: 0.1, dur: 0.18, pan: 0.3, dest }); break;
          // bits & atoms. The bench: the terminal sits left of the arm (pan left), the arm and its stand right.
          // (the command is typed thoughtfully: softer, brighter keys than the poem; its Enter lands hard)
          case 'bkey': fxKey(e.kk, { when, gain: e.kk === 'enter' ? 0.8 : 0.7, vel: e.kk === 'enter' ? 0.92 : 0.7, tone: 0.4, pan: -0.3, dest }); break;
          // a joint move: the servo's pitch glides up a fourth (J1 waking: a smaller step)
          case 'servo': fx('servo', { when, dur: e.dur, from: e.p >= 10 ? 55 : 52 + (e.p % 3) * 2, to: e.p >= 10 ? 60 : e.p ? 57 + (e.p % 3) * 2 : 55, gain: 0.5, pan: e.p >= 10 ? pan * 0.6 : 0.25, settle: 0.3, dest }); break;
          case 'glide': fx('arm', { when, dur: e.dur, to: 57, gain: 0.5, pan: 0.3, dest }); break;
          case 'vac': fx('pneumatic', { when, kind: 'puff', dur: 0.09, pressure: 0.55, gain: 0.45, pan: 0.3, dest }); break;
          case 'puff': fx('pneumatic', { when, kind: 'puff', dur: 0.06, pressure: 0.35, gain: 0.32, pan: 0.4, dest }); break;
          case 'seat': fx('snap', { when, size: e.p === 1 ? 0.55 : 0.32, metal: 0.6, gain: 0.62, pan: 0.4, dest }); break;
          case 'compile': fx('compile', { when, count: 4, gap: 0.028, progress: 0.2, gain: 0.5, pan: -0.35, dest }); break;
          case 'power': fx('relay', { when, gain: 0.55, pan: 0.4, dest }); fx('ping', { when: when + 0.01, gain: 0.45, pan: -0.3, dest }, D(0, 1)); break;
          // the engine: stands left → right across the stereo field; a unit coming online closes its relay
          case 'cnc': cncStart(when, e.dur); break;
          case 'hiss': fx('pneumatic', { when, kind: 'release', dur: Math.max(0.08, e.dur * 1.6), pressure: 0.5, gain: 0.34, pan: ((e.p >> 1) / 5 - 0.5) * 0.9, dest }); break;
          case 'place': { // the rotor cluster: a small snap; the shell: a bigger latch, and the unit's relay closes
            const pp = ((e.p >> 1) / 5 - 0.5) * 0.9;
            fx('snap', { when, size: e.p % 2 ? 0.55 : 0.28, metal: 0.6, double: e.p < 8, gain: e.p % 2 ? 0.58 : 0.44, pan: pp, heavy: e.p % 2 === 1, dest });
            if (e.p % 2) fx('relay', { when: when + 0.006, gain: 0.36, pan: pp, dest });
            break;
          }
          // system active / compile success: a relay, a climbing run of compile ticks, and (unless the score composes
          // its own resolution) a two-note chime, A4 → D5, the rising fourth that says "done"
          case 'active':
            fx('relay', { when, gain: 0.5, pan: 0, dest }); fx('compile', { when: when + 0.004, count: 6, gap: 0.03, progress: 0.35, gain: 0.45, pan: -0.35, dest });
            if (!scoreResolves()) { fx('chime', { when: when + 0.012, dur: 0.7, vel: 0.7, gain: 0.7, pan: -0.15, dest }, D(3, 0)); fx('chime', { when: when + 0.012 + S16 * 0.5, dur: 1.1, vel: 0.8, gain: 0.8, pan: 0.15, dest }, D(0, 1)); }
            break;
          default: break;
        }
      }
      function startFoley() {
        stopFoley(); stopHums(0.08); // (a restart: anything still humming belongs to the last run)
        if (!soundOn || !FOLEY_ON) return;
        foleyPos = pos;
        // resumed or sought into the engine (bar 42): its CNC hum comes back at the speed it had reached
        const a0 = aud();
        if (a0 && pos > ENG.t0 + 1e-4 && pos < ENG.on - 0.15) { // (the foley loop skips events before foleyPos: no double)
          let w = a0.now() + 0.03;
          if (sPlaying() && typeof score.timeAt === 'function') { const x = +score.timeAt(pos); if (isFinite(x)) w = Math.max(a0.now(), x); }
          cncStart(w, ENG.on - pos, (pos - ENG.t0) / (ENG.on - ENG.t0));
        }
        foleyTimer = setInterval(() => {
          const a = aud();
          if (!a || mode !== 'film' || !playing) return;
          const live = sPlaying(), now = a.now(), sp = live ? sPos() : pos;
          if (!isFinite(sp)) return;
          const horizon = sp + 0.12, tA = live && typeof score.timeAt === 'function';
          for (const e of FOLEY) {
            if (e.t < foleyPos) continue;
            if (e.t >= horizon) break;
            if (e.t >= sp - 0.02) {
              let when = now + Math.max(0, e.t - sp);
              if (tA) { const w = +score.timeAt(e.t); if (isFinite(w)) when = Math.max(now, w); } // the score's own clock mapping
              foleyFire(e, when);
            }
          }
          foleyPos = Math.max(foleyPos, horizon);
        }, 25);
      }
      function stopFoley() { clearInterval(foleyTimer); foleyTimer = 0; }
      // The score (build-score.js) is the music; the foley layer adds the on-screen keystrokes etc.
      // It is switched on only when the engine has the microsound voices it needs.
      let FOLEY_ON = true;

      // Settled bed. Round 2: the old bed's glassy grains at D5–E6 (degree(…, 1..2)) read as a sustained
      // flute/whistle, so they are gone. What is left is dark and low: a sparse grain cloud on D3–D4
      // (≈147–294 Hz, lowpassed, glass layer ~never, no octave jumps), a sub pulse every two bars (D2 then
      // A1) and a few low wooden ticks (≤ 587 Hz). Mostly negative space.
      function startBed() {
        stopBed();
        const a = aud();
        if (!soundOn || !a || mode !== 'settled') return;
        const dest = bus(), D = (i, o) => a.degree(i, o);
        try {
          if (typeof a.granular === 'function') {
            bed = a.granular({ density: 2.2, pitch: [D(0, -1), D(2, -1), D(3, -1), D(0, 0)], dur: 0.24, window: 'tukey', octave: 0, detune: 3,
              spread: 0.8, bright: 0.08, highpass: 70, attack: 2.5, gain: 0.16, dest });
          }
        } catch (e) { bed = null; }
        try {
          // (its pulses and ticks wait for the grain cloud's 2.5 s fade-in: at the end of the film that is the crossfade,
          // the score's last chord and grains ringing out while the bed rises, with no pulse landing on top of them)
          const r = rng(77), from = a.now() + 2.4;
          bedOff = a.clock && a.clock.on((step, time) => {
            if (!soundOn || mode !== 'settled' || time < from) return;
            const s64 = step % 64;
            if (s64 === 0) play('sub', D(0, -2), { when: time, dur: 1.1, gain: 0.17, dest });
            if (s64 === 32) play('sub', D(3, -3), { when: time, dur: 1.1, gain: 0.14, dest });
            if (step % 32 === 12) play('tick', D(4, 0), { when: time, gain: 0.1, pan: 0.45, dest });
            if (step % 32 === 22) play('tick', D(2, 0), { when: time, gain: 0.08, pan: -0.45, dest });
            if (s64 === 44) play('tick', D(0, 1), { when: time, gain: 0.06, pan: 0.1, dest });
            if (r() < 0.03) play('click', { when: time, gain: 0.05, freq: 900 + r() * 1100, pan: r() * 2 - 1, dest });
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

      /* ---------------------------------------------------------- play with sound */
      // Music is on by default, but a browser starts audio only after a gesture. Arriving by one (key 5, the arrows,
      // the index, the menu, Find, a stepper) the film and the music start together at 0:00: sound(true) lands a few ms
      // after enter(), and a film younger than FRESH seconds is restarted from 0 with the score. Arriving without one (a
      // direct link to #build) the film plays silently under a light veil with a "Play with sound" pill; the first click,
      // tap or key (anywhere: they all unlock audio) starts it again from 0:00 with the music. Taking the controls
      // (a step, the slider, pause, skip) instead keeps the film where it is, and the music joins it there.
      const FRESH = 0.35;
      const goBtn = H('button', { type: 'button', class: 'bd-go', 'aria-label': 'Play the film with sound' },
        H('span', { class: 'pl', 'aria-hidden': 'true' }), H('span', { text: 'Play with sound' }),
        TOUCH ? null : H('span', { class: 'k', text: '[space]' }));
      const veil = H('div', { class: 'bd-veil', 'aria-hidden': 'true' });
      el.append(veil, goBtn);
      let pillUp = false, pillT = 0, restart0 = false, holdUntil = 0;
      const audioLive = () => { const a = AU(); return !!(a && a.ready); };
      function pill(on) {
        clearTimeout(pillT); pillT = 0;
        on = !!on && mode === 'film' && !api.reduced && api.isActive() && !audioLive();
        if (on === pillUp) return;
        pillUp = on;
        if (on) placePill();
        el.classList.toggle('is-waiting', on);
      }
      // In clear space, never on a line or a word of the film: in the text column under BITS (its left edge on the
      // column's, its bottom on the ATOMS frame's) where the terminal has a column; under the terminal's last line where
      // it sits below the frame and there is room; else (phones) centred in the ATOMS frame, like a player's button,
      // its halo clearing the drawing. Only the first seconds (the bench) matter: that is what a shared link shows.
      function placePill() {
        if (!G) return;
        const B = benchGeom(), M = B.M, T = B.T, F = G.F, gap = G.phone ? 20 : 26;
        goBtn.classList.remove('is-compact');
        let pw = goBtn.offsetWidth, ph = goBtn.offsetHeight;
        // the terminal's last line (the prompt + the whole log, as the bench ends): its text bottom
        const ey = T.y + (B.tm === 'col' ? 20 : 12), y0 = ey + Math.round(B.lh * 1.45);
        const fit = Math.max(1, Math.floor((T.y + T.h - 6 - y0) / B.lh) + 1), lines = Math.min(fit, BENCH.log.length + 1);
        const logEnd = y0 + (lines - 1) * B.lh + 5;
        let x = M.x + (M.w - pw) / 2, y = M.y + (M.h - ph) / 2;
        if (B.tm === 'col') {
          const room = M.x - 30 - T.x;
          if (pw > room) { goBtn.classList.add('is-compact'); pw = goBtn.offsetWidth; ph = goBtn.offsetHeight; }
          if (pw <= room && M.y + M.h - ph >= logEnd + gap) { x = T.x; y = M.y + M.h - ph; }
        } else if (B.tm === 'below' && logEnd + gap + ph <= F.y1) { x = M.x; y = logEnd + gap; }
        goBtn.style.left = Math.round(x) + 'px';
        goBtn.style.top = Math.round(y) + 'px';
      }
      // (shown a moment after enter(): a gesture's unlock takes a few ms to land, and must not flash the pill)
      function pillSoon(ms) { clearTimeout(pillT); pillT = setTimeout(() => pill(true), ms); }
      // the user took the controls: the film stays where they put it, and the music joins it there
      function pillTaken() { restart0 = false; holdUntil = 0; if (pillUp) pill(false); }
      function playWithSound() {
        const a = AU();
        // (the same gesture's unlock may already have started film and score from 0:00: then there is nothing to redo)
        const started = soundOn && mode === 'film' && playing && sPlaying() && pos < 0.8;
        pill(false);
        if (!started) {
          restart0 = true; // (sound(true) restarts the film at 0:00 if it arrives after this: the unlock is async)
          replay();
          if (!soundOn) holdUntil = performance.now() + 450; // (and the first frame waits for it)
        }
        try {
          // (iOS: Web Audio follows the ringer switch unless the page asks for playback; this tap asked for sound)
          if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
        } catch (e) {}
        try {
          if (a && a.ctx && a.ctx.state !== 'running' && typeof a.ctx.resume === 'function') { const r = a.ctx.resume(); if (r && r.catch) r.catch(() => {}); }
          if (a && typeof a.unlock === 'function') a.unlock();
          if (a && !a.enabled && typeof a.setEnabled === 'function') a.setEnabled(true); // (explicitly asked for sound)
        } catch (e) { /* audio must never break the film */ }
      }
      goBtn.addEventListener('click', e => { e.stopPropagation(); playWithSound(); });
      veil.addEventListener('click', () => playWithSound());
      // audio became ready by any path while the pill was up: that gesture is the "play with sound". (It can happen inside
      // the very keydown or pointerdown that key() or the pill's click then sees, so they remember the pill for a moment.)
      let pillGoneAt = -1e9, readyAt = -1e9;
      const pillWasUp = () => pillUp || performance.now() - pillGoneAt < 400;
      try { const a0 = AU(); if (a0 && typeof a0.onReady === 'function') a0.onReady(() => { readyAt = performance.now(); if (pillUp) { if (AU().enabled) restart0 = true; pill(false); pillGoneAt = performance.now(); } }); } catch (e) {}
      // The speaker and the S key, while audio is still held back, also mean "sound on". The speaker already reads "on"
      // then (music is on by default), so a visitor who hears nothing clicks it, and core's toggle would turn that into
      // a mute, saved for every later visit. So the gesture that unlocks audio never toggles it: in the film with the
      // pill up it is the pill ("play with sound", from 0:00), elsewhere on [5] it only unlocks. (Capture listeners on
      // window: core's own pointerdown unlock runs first and may already have made audio ready, hence readyAt; its
      // keydown handler bubbles, so an S stopped here never reaches it.)
      const soundBtn = document.getElementById('sound');
      const wasLocked = () => { const a = AU(); return !!(a && a.enabled && (!a.ready || performance.now() - readyAt < 80)); };
      let eatClick = false;
      function soundGesture() {
        if (mode === 'film' && pillWasUp()) { pillGoneAt = -1e9; playWithSound(); return; }
        const a = AU();
        try { if (a && typeof a.unlock === 'function') a.unlock(); } catch (e) {}
      }
      window.addEventListener('pointerdown', e => {
        eatClick = !!(api.isActive() && soundBtn && e.target instanceof Node && soundBtn.contains(e.target) && wasLocked());
        resumeStalled();
      }, true);
      window.addEventListener('click', e => {
        if (!eatClick) return;
        eatClick = false;
        if (!(api.isActive() && soundBtn && e.target instanceof Node && soundBtn.contains(e.target))) return;
        e.stopPropagation(); e.preventDefault();
        soundGesture();
      }, true);
      window.addEventListener('keydown', e => {
        if (!api.isActive()) return;
        resumeStalled();
        if ((e.key !== 's' && e.key !== 'S') || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (document.querySelector('.is-open[aria-hidden="false"]')) return; // (an overlay is open: core's keys)
        if (!wasLocked()) return;
        e.stopPropagation(); e.preventDefault();
        soundGesture();
      }, true);

      /* ---------------------------------------------------------- transport */
      let mode = 'film', pos = 0, playing = false, bedTimer = 0, tailTimer = 0, watched = false, shownT = 0, hintUntil = 0, settledAt = -1e9;
      function seek(at, fromUser) {
        if (mode !== 'film') { mode = 'film'; el.classList.remove('is-settled', 'is-shown'); clearTimeout(shownT); showControls(); api.caption(CAP_FILM); stopBed(); }
        pos = Math.max(0, Math.min(DUR - 0.01, at));
        lastSlider = -1;
        if (fromUser) pillTaken();
        if (fromUser && soundOn && playing) { scoreStop(0.05); scorePlay(pos); }
        render(); syncControls();
      }
      function scrub(v) {
        pos = Math.max(0, Math.min(DUR - 0.01, v));
        lastSlider = pos;
        pillTaken();
        if (playing) scoreRestartSoon();
        render();
      }
      function togglePlay() {
        if (mode !== 'film') { replay(); return; }
        pillTaken();
        playing = !playing;
        if (playing) scorePlay(pos); else scoreStop(0.15);
        render(); syncControls();
      }
      function replay() {
        jumpHide(true);
        clearTimeout(bedTimer); clearTimeout(tailTimer);
        mode = 'film'; el.classList.remove('is-settled', 'is-shown'); clearTimeout(shownT);
        showControls(); api.caption(CAP_FILM);
        stopBed(); settledAt = -1e9; // (leaving mid-replay and coming back restarts the film, not the index)
        pos = 0; playing = true; lastSlider = -1; lastSi = -1;
        if (soundOn) { restart0 = false; scoreStop(0.05); scorePlay(0); }
        render(); syncControls();
      }
      // why: 'end' (the film finished) · 'skip' (the user skipped) · 'return' (re-entering [5] soon after it settled)
      // · 'reduced' (prefers-reduced-motion: straight to the final state, no skip sounds)
      function settle(why) {
        if (mode === 'settled') return;
        mode = 'settled'; playing = false; settledAt = performance.now();
        restart0 = false; pill(false);
        stopFoley(); stopHums(0.3);
        // skip (Enter): a mechanical Enter and a compile tick, the build done early
        if (why === 'skip') { scoreStop(0.8); const a0 = aud(); if (a0) { const w = a0.now() + 0.01; fxKey('enter', { when: w, gain: 0.7, pan: 0, dest: bus() }); fx('compile', { when: w + 0.02, gain: 0.4, pan: -0.3, dest: bus() }); } }
        else if (why === 'return' || why === 'reduced') scoreStop(0.2);
        // the end: a crossfade from the film's mechanical sequence into the settled bed. The bed comes in 1.2 s after the
        // frame dissolves (its 2.5 s attack) while the score rings out; whatever is left of the score fades over 3 s from 4.5 s.
        else { clearTimeout(tailTimer); tailTimer = setTimeout(() => { if (mode === 'settled' && sPlaying()) scoreStop(3); }, 4500); }
        watched = true; // later visits to [5] this session open on this page (Replay the film is one click away)
        if (performance.now() < hintUntil) { api.hint('', 1); hintUntil = 0; } // our keyboard hint never outlives film mode
        el.classList.add('is-settled');
        clearTimeout(shownT); shownT = setTimeout(() => el.classList.add('is-shown'), 1800); // entrance done: hover dims answer fast
        preloadLater(); // the hover cards' photos
        cv.clear(); ovHideAll();
        showControls();
        api.caption(capSet());
        set.scrollTop = 0;
        requestAnimationFrame(checkSticky);
        clearTimeout(bedTimer);
        bedTimer = setTimeout(() => { if (mode === 'settled' && soundOn && !bed && !bedOff) startBed(); }, why === 'end' ? 1200 : 900); // (sound(true) may have started it already)
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
      poem.append(H('div', { class: 'bd-kick' }, H('b', { text: 'yashdagade/build' }), H('span', { text: TOUCH ? 'Tap a blue phrase' : 'Hover a blue phrase' }), kReplay));
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
            const s = H('span', { class: 'bd-em' + (g.text.length <= 24 ? ' is-nw' : ''), tabindex: '0', text: g.text });
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
      // attribution (exact text) + design credit, discreetly after the poem
      const credA = H('a', { href: CREDIT.href, target: '_blank', rel: 'noopener' }, CREDIT.link);
      const attr = H('div', { class: 'bd-attr' }, H('p', { text: ATTRIBUTION }), H('p', null, CREDIT.pre, credA, CREDIT.post));
      credA.addEventListener('pointerenter', () => ui('hover'));
      credA.addEventListener('click', () => ui('select'));
      attr.style.setProperty('--d', (dly += 0.035).toFixed(3) + 's');
      poem.append(attr);

      // side: index
      const nPapers = 3;
      const sortY = H('button', { type: 'button', class: 'is-on', text: 'Year' });
      const sortF = H('button', { type: 'button', text: 'Field' });
      const secIndex = H('section', { class: 'bd-index' });
      const ihead = H('div', { class: 'bd-sh' }, H('span', { text: `STINTS · ${PROJECTS.length} projects` }), H('span', { class: 'bd-sort' }, 'Sort', sortY, sortF));
      secIndex.append(ihead);
      const SVGNS = 'http://www.w3.org/2000/svg';
      const S = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
      // Timeline: the stints (projects by year). Each project is one small square in its start year's stack (two columns, bottom
      // up), with the year's count above the stack. Hovering a row fills its square blue (and a square lights its row).
      const tl = S('svg', { class: 'bd-tl', 'aria-hidden': 'true' });
      const Y0 = Math.min(...PROJECTS.map(p => p.y0)), Y1 = Math.max(...PROJECTS.map(p => p.y1 || p.y0));
      const X = y => (6 + ((y - Y0) / Math.max(1, Y1 - Y0)) * 88).toFixed(2) + '%';
      const byYear = {};
      PROJECTS.forEach(p => { (byYear[p.y0] = byYear[p.y0] || []).push(p); });
      const SQ = 6, PITCH = 9, maxN = Math.max(...Object.values(byYear).map(a => a.length)), rowsN = Math.ceil(maxN / 2);
      const axisY = 22 + rowsN * PITCH + 6;
      tl.setAttribute('height', String(axisY + 18)); tl.style.height = (axisY + 18) + 'px';
      const hintT = S('text', { class: 'hn', x: '0', y: '11' }); hintT.textContent = TOUCH ? 'by year' : 'by year · hover a row'; tl.append(hintT);
      tl.append(S('line', { x1: '0%', x2: '100%', y1: String(axisY + 0.5), y2: String(axisY + 0.5), stroke: C.ink, 'stroke-width': '1' }));
      for (let y = Y0; y <= Y1; y++) {
        tl.append(S('line', { x1: X(y), x2: X(y), y1: String(axisY), y2: String(axisY + 4), stroke: C.ink, 'stroke-width': '1' }));
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
      secIndex.append(tl);
      const list = H('div', { class: 'bd-list' });
      secIndex.append(list);
      const rows = {}, thumbs = {};
      // the rows with a page of their own name it: "[n]" (click → that scene; the row itself still opens the paper or
      // the build log). The biped's page is #robot (its CAD, part by part, and the photo). A hidden page (menu / Find
      // only, no key) gets a word chip that says what it opens instead of a number: "[robot]", "[demo]" (Radial-VCReg's
      // interactive page).
      const SCENE_OF = { lpwm: ['lpwm', SN.lpwm], 'rectified-lpjepa': ['lpjepa', SN.lpjepa], 'radial-vcreg': ['radial-vcreg', SN.radial || 'demo'], skywindfarm: ['skywindfarm', SN.swf], biped: ['robot', SN.robot || 'robot'] };
      function sceneChip(p) {
        const sc = SCENE_OF[p.id];
        if (!sc) return null;
        const c = H('span', { class: 'sc', text: `[${sc[1]}]`, title: p.id === 'biped' ? `The robot page${typeof sc[1] === 'number' ? ` [${sc[1]}]` : ''}: the biped, from its CAD` : typeof sc[1] === 'number' ? `Scene [${sc[1]}]: ${p.name}` : `The ${p.name} page: an interactive demo` });
        c.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ui('select'); location.hash = '#' + sc[0]; });
        c.addEventListener('pointerenter', () => ui('hover'));
        return c;
      }
      function videoChip(p) {
        if (!p.video) return null;
        const v = H('span', { class: 'sc', text: '▶ video', title: `${p.name}: watch the video`, role: 'link' });
        v.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); ui('select'); window.open(p.video, '_blank', 'noopener'); });
        v.addEventListener('pointerenter', () => ui('hover'));
        return v;
      }
      PROJECTS.forEach((p, i) => {
        const ext = p.href && /^https?:/.test(p.href);
        const src = p.thumb || p.img || null;
        const th = H('span', { class: 'th', 'aria-hidden': 'true' });
        if (src) {
          // (p.tcrop: a crop for this 58 × 40 thumbnail only, e.g. the biped's face looking down at the robot in his
          // hands; at thumbnail size the whole square photo is mostly hair and T-shirt. Keyed '#t' so the montage and
          // the cards keep the full photo.)
          const key = p.tcrop ? src + '#t' : src;
          if (p.tcrop) CROP[key] = p.tcrop;
          const im = H('img', { src: CROP[key] ? '' : src, alt: '', loading: 'lazy', decoding: 'async' });
          if (CROP[key]) { const u = cropSrc(key, v => { im.src = v; }); if (u) im.src = u; } // (Arbor: the left panel only)
          if (FY[src] != null && !p.tcrop) im.style.objectPosition = `50% ${Math.round(FY[src] * 100)}%`;
          th.append(im);
        }
        thumbs[p.id] = th; // generated thumbnails (no image) are filled in once the fonts are in (see GEN)
        const r = H(p.href ? 'a' : 'div', { class: 'bd-row', href: p.href || null, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, tabindex: p.href ? null : '0' },
          H('span', { class: 'no', text: pad2(i + 1) }), th,
          H('span', { class: 'nm' }, H('span', { class: 'n' }, p.name, p.arch ? H('em', { text: 'archived' }) : null, sceneChip(p), videoChip(p)),
            H('span', { class: 'o', text: p.idx || p.one })),
          H('span', { class: 'yr' }, p.year, H('span', { text: p.field })));
        r.dataset.id = p.id;
        rows[p.id] = r; list.append(r);
      });
      const secElse = H('section', { class: 'bd-else' }, H('div', { class: 'bd-sh' }, H('span', { text: 'ELSEWHERE' }), H('span', { class: 'm', text: `${nPapers} papers · 1 patent application` })));
      // (the social links are pinned bottom-right on desktop, so here they only show on phones, where the pinned list is hidden)
      const ll = H('div', { class: 'bd-links bd-links--soc' });
      SOCIALS.forEach(s => {
        const ext = /^https?:/.test(s.href) || /\.pdf$/.test(s.href);
        ll.append(H('a', { href: s.href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, H('span', { text: s.label })));
      });
      const ll2 = H('div', { class: 'bd-links bd-links--sub' },
        H('a', { href: 'press.html' }, H('span', { text: 'Press' })), H('a', { href: 'build.html' }, H('span', { text: 'Read as text' })), H('a', { href: 'me.html' }, H('span', { text: 'About' })));
      secElse.append(ll, ll2);
      // friends' sites: just their names (no pointing arrows). (The owner's "get rid of this section about friends" was
      // the About page's list, gone in b28cd17; here only the arrows went.)
      const secFr = H('section', { class: 'bd-fr' }, H('div', { class: 'h', text: 'Check out my friends’ sites' }));
      const fl = H('div', { class: 'bd-links' });
      FRIENDS.forEach(f => fl.append(H('a', { href: f.href, target: '_blank', rel: 'noopener' }, H('span', { text: f.label }))));
      secFr.append(fl);
      const tail = H('div', { class: 'bd-tail' });
      side.append(secIndex); tail.append(secElse, secFr); grid.append(tail);
      [secIndex, secElse, secFr].forEach((n, i) => n.style.setProperty('--d', (0.25 + i * 0.12).toFixed(2) + 's'));
      [side, tail].forEach(c => c.querySelectorAll('a:not(.bd-row)').forEach(a => { a.addEventListener('pointerenter', () => ui('hover')); a.addEventListener('click', () => ui('select')); }));

      // Two-column layout: the index column is sticky. When it is taller than the stage it scrolls until its
      // last row is visible and then sticks (negative top), so the index never disappears at the poem's end.
      function checkSticky() {
        try {
          const on = innerWidth >= 1200;
          side.classList.toggle('is-sticky', on);
          side.style.top = on ? Math.min(28, set.clientHeight - side.offsetHeight - 36) + 'px' : '';
        } catch (e) {}
      }

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
        requestAnimationFrame(checkSticky); // (the group headers change the column's height)
        ui('select');
        const a0 = aud();
        if (a0) play('data', { dur: 0.3, density: 30, gain: 0.11, spread: 1, clicks: 0.3, pitch: [a0.degree(0, 0), a0.degree(2, 0), a0.degree(3, 0), a0.degree(4, 0)], dest: bus() });
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
      // Generated card art is shown ~250–300 px wide, so any words drawn into these 600 px canvases are set at
      // ≥ 28 px (≈ 13 px on screen); the small print (the one-liners) lives in the card's HTML caption instead.
      function genCode() {
        return genCanvas(600, 375, (g, w, h) => {
          const { D, T, v } = CODE, cs = 21, x0 = 48, y0 = 176;
          for (let c = 0; c < T; c++) for (let d = 0; d < D; d++) {
            const val = v[c][d], cx = x0 + d * cs, cy = y0 + c * cs;
            if (val <= 0) { g.fillStyle = '#bbb'; g.fillRect(cx - 3, cy, 7, 1); g.fillRect(cx, cy - 3, 1, 7); }
            else { const s = Math.max(3, Math.min(10, val * 8)); g.fillStyle = C.accent; g.globalAlpha = c === T - 1 ? 1 : 0.5 + c * 0.06; g.fillRect(cx - s / 2, cy - s / 2, s, s); g.globalAlpha = 1; }
          }
          g.fillStyle = '#000'; g.font = '30px ' + FN.mono;
          g.fillText('sparse latent rollout', 36, 66);
          g.fillStyle = '#444'; g.font = '26px ' + FN.mono;
          g.fillText('toy · illustrative', 36, 112);
        });
      }
      // a project without an image: its name, large, on the + grid (the one-liner is in the caption)
      function genTitle(p) {
        return genCanvas(600, 340, (g, w, h) => {
          for (let x = 30; x < w; x += 30) for (let y = 30; y < h; y += 30) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
          g.fillStyle = C.accent; g.fillRect(w - 66, 54, 12, 12);
          let fs = 64; g.font = `400 ${fs}px ${FN.serif}`;
          const name = p.name.replace(/, enhanced$/, '');
          while (fs > 36 && g.measureText(name).width > w - 96) { fs -= 4; g.font = `400 ${fs}px ${FN.serif}`; }
          const tw = g.measureText(name).width;
          g.fillStyle = '#fff'; g.fillRect(24, h - 92 - fs, tw + 36, fs + 56);
          g.fillStyle = '#000'; g.fillText(name, 40, h - 64);
        });
      }
      // a text card, set large enough to stay ≥ 12 px when the card is shown ~250 px wide (lines pair up to fit 4 rows)
      function genText(title, lines) {
        let L2 = lines.slice();
        if (L2.length > 4) { const p = []; for (let i = 0; i < L2.length; i += 2) p.push(L2.slice(i, i + 2).join(' · ')); L2 = p; }
        return genCanvas(600, 168 + L2.length * 46 + 26, (g, w) => {
          g.fillStyle = C.accent; g.fillRect(36, 36, 12, 12);
          for (let x = 452; x < w - 24; x += 26) for (let y = 42; y < 120; y += 26) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
          g.fillStyle = '#000'; g.font = '400 66px ' + FN.serif; g.fillText(title, 34, 124);
          g.font = '30px ' + FN.mono;
          L2.forEach((l, i) => { g.fillStyle = i === 0 ? '#000' : '#444'; g.fillText(l, 36, 190 + i * 46); });
        });
      }
      const toURL = (c, jpg) => { try { return c.toDataURL(jpg ? 'image/jpeg' : 'image/png', 0.88); } catch (e) { return null; } };

      /* ---------------------------------------------------------- hover wiring (poem + index) */
      const byProj = {};
      emSpans.forEach(s => { const cfg = HOVER[s.dataset.ph]; (cfg && cfg.proj || []).forEach(id => { (byProj[id] = byProj[id] || []).push(s); }); });
      function litProj(ids, on) { (ids || []).forEach(id => { if (rows[id]) rows[id].classList.toggle('is-lit', on); if (markers[id]) markers[id].classList.toggle('is-lit', on); }); }
      function litPhr(id, on) { (byProj[id] || []).forEach(s => s.classList.toggle('is-lit', on)); if (markers[id]) markers[id].classList.toggle('is-lit', on); }
      // index thumbnail for a project without an image: the + grid of the title cards with its initial (LpWM: its sparse code)
      function genGlyph(p) {
        return genCanvas(174, 120, (g, w, h) => {
          for (let x = 14; x < w; x += 20) for (let y = 14; y < h; y += 20) { g.fillStyle = '#ccc'; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7); }
          g.fillStyle = '#fff'; g.fillRect(16, 38, 74, 64);
          g.fillStyle = C.accent; g.fillRect(w - 32, 20, 10, 10);
          g.fillStyle = '#000'; g.font = '400 56px ' + FN.serif; g.fillText(p.name[0], 24, 92);
        });
      }
      // Generated art is made on first use (after the fonts are in, so canvas text is set in the right face).
      const GEN = {};
      const genURL = (key, make) => GEN[key] || (GEN[key] = toURL(make()));
      const codeURL = () => genURL('code', genCode);
      (async () => {
        try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
        PROJECTS.forEach(p => {
          if (p.thumb || p.img) return;
          const u = p.gen === 'code' ? codeURL() : genURL('glyph:' + p.id, () => genGlyph(p));
          if (u) thumbs[p.id].append(H('img', { src: u, alt: '' }));
        });
      })();
      // Card configs, built lazily per phrase / row and kept. Every phrase opens the same kind of callout: cards that
      // jump out beside the poem on a leader from the phrase (a cursor-following card would sit on the poem text).
      // A card item: { src, ar, title, meta, meta2?, href?, mosaic?: [src], flip?: [{src, fy}], art?, alt? }
      const JC = new Map();
      function phraseCfg(ph) {
        if (JC.has(ph)) return JC.get(ph);
        const cfg = HOVER[ph];
        let j;
        if (cfg.mode === 'flip') {
          j = Object.assign({}, cfg, { meta: TOUCH ? cfg.meta.replace('hover', 'tap') : cfg.meta, frames: MONTAGE.map(m => ({ src: m.draw === 'code' ? codeURL() : m.src, fy: m.fy })).filter(f => f.src) });
        } else if (cfg.mode === 'jump' || cfg.mode === 'friends') {
          // an optional card (an image another page exports) is shown only once its image has loaded; while it is still
          // loading, this phrase's config is not kept, so the next hover tries again; if it failed, it stays out
          const opt = (cfg.cards || []).filter(c => c.optional && c.src), pend = opt.some(c => { const im = img(c.src); return im && !im.complete; });
          const cards = (cfg.cards || []).filter(c => !c.optional || !c.src || ready(img(c.src)));
          j = Object.assign({}, cfg, { cards: cards.map(c => {
            if (c.gen === 'text' && !c.src) { const cv2 = genText(c.head || c.title, c.lines); return Object.assign({}, c, { src: toURL(cv2), ar: cv2.width / cv2.height }); }
            return c;
          }) });
          if (pend) return j; // (not kept: see above)
        } else { // one image → one card
          let it = { src: cfg.src || null, ar: AR[cfg.src] || null, title: cfg.title, meta: cfg.meta, href: cfg.href || null }, w = cfg.w || 280;
          if (cfg.gen === 'code') { it.src = codeURL(); it.ar = 600 / 375; }
          if (cfg.mode === 'mosaic') { it = { mosaic: cfg.srcs, ar: (3 * 200 + 6) / (3 * 140 + 6), title: cfg.title, meta: cfg.meta }; w = 320; }
          j = Object.assign({}, cfg, { mode: 'jump', single: true, cw: w, cards: [it] });
        }
        JC.set(ph, j);
        return j;
      }
      // an index row: its image (or generated art) at card size, the full one-liner, and the row's meta
      function rowCfg(p) {
        const key = 'row:' + p.id;
        if (JC.has(key)) return JC.get(key);
        let src = p.img || null, ar = src ? AR[src] || null : null;
        if (p.gen === 'code') { src = codeURL(); ar = 600 / 375; }
        if (p.gen === 'title') { src = genURL('title:' + p.id, () => genTitle(p)); ar = 600 / 340; }
        const j = { mode: 'jump', single: true, idx: true, cw: 300, proj: [p.id], cards: [{ src, ar, title: `${p.name} · ${p.year}`, meta: p.one, meta2: p.meta, href: p.href || null }] };
        JC.set(key, j);
        return j;
      }

      // Sound for hovering: one event per 16th at most across all of it (phrase ticks, card grains, flip ticks), so a
      // sweep across the poem never machine-guns; tuned material stays at or below B4 (degree(k % 5, 0) ≤ 494 Hz).
      let sndAt = -1, lastPT = 'mouse';
      function hSnd(when, fn) {
        const a = aud();
        if (!a || !soundOn) return false;
        const sd = a.clock ? a.clock.stepDur : S16, w = when || qwhen(0);
        if (w - sndAt < sd * 0.95) return false;
        sndAt = w; fn(a, w);
        return true;
      }
      const hoverTick = (k, gain) => hSnd(0, (a, w) => play('tick', a.degree(k % 5, 0), { when: w, gain: gain || 0.2, pan: ((k % 5) - 2) * 0.2, dest: bus() }));
      el.addEventListener('pointerdown', e => { lastPT = e.pointerType || 'mouse'; }, true);
      const isTouch = () => lastPT === 'touch' || TOUCH;
      // The listeners go on at once (nothing waits on fonts or images); card art is made on first hover.
      emSpans.forEach((s, k) => {
        const ph = s.dataset.ph, cfg = HOVER[ph];
        if (!cfg) return;
        s.addEventListener('pointerenter', e => {
          litProj(cfg.proj, true);
          if (e.pointerType !== 'touch') jumpShow(s, phraseCfg(ph));
        });
        s.addEventListener('pointerleave', e => { litProj(cfg.proj, false); if (e.pointerType !== 'touch') jumpHideSoon(); });
        s.addEventListener('focus', () => { litProj(cfg.proj, true); jumpShow(s, phraseCfg(ph)); });
        s.addEventListener('blur', () => { litProj(cfg.proj, false); jumpHideSoon(); });
        s.addEventListener('click', () => {
          const j = phraseCfg(ph), href = j.single && j.cards[0].href;
          // a mouse click on a single-card phrase opens its link; a tap (first) opens the sheet, a second tap closes it
          if (href && !isTouch()) { ui('select'); window.open(href, '_blank', 'noopener'); return; }
          if (jState && jState.span === s && jState.touch) jumpHide(); else { jumpShow(s, j); if (jState) jState.touch = true; }
        });
      });
      // Index rows: hover → the project's card in a fixed slot left of the index column (over the poem, which steps
      // back), level with the row. Only on the two-column layout with a mouse; elsewhere the row's thumbnail and the
      // lit phrases/markers are the preview, and a tap follows the link.
      PROJECTS.forEach((p, k) => {
        const r = rows[p.id];
        const on = e => {
          litPhr(p.id, true);
          if (e && e.pointerType === 'touch') return;
          if (innerWidth >= 1200 && !TOUCH) jumpShow(r, rowCfg(p)); else hoverTick(k);
        };
        const off = e => { litPhr(p.id, false); if (!(e && e.pointerType === 'touch')) jumpHideSoon(); };
        r.addEventListener('pointerenter', on); r.addEventListener('pointerleave', off);
        r.addEventListener('focus', () => on()); r.addEventListener('blur', () => off());
        r.addEventListener('click', () => ui('select'));
        const mk = markers[p.id];
        if (mk) {
          mk.addEventListener('pointerenter', () => { r.classList.add('is-lit'); litPhr(p.id, true); hoverTick(k); });
          mk.addEventListener('pointerleave', () => { r.classList.remove('is-lit'); litPhr(p.id, false); });
        }
      });

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
        el.classList.remove('is-jumping', 'is-jumping-idx', 'is-sheet');
        side.querySelectorAll('.is-clear').forEach(n => n.classList.remove('is-clear'));
      }
      // an <img> for a card: cropped sources (Arbor) swap in their crop once it is made
      function cardImg(src, alt, cls) {
        const e = H('img', { alt: alt || '', class: cls || null });
        if (CROP[src]) { const u = cropSrc(src, v => { e.src = v; }); if (u) e.src = u; } else e.src = src;
        if (FY[src] != null) e.style.objectPosition = `50% ${Math.round(FY[src] * 100)}%`;
        return e;
      }
      // Phone sheets: the y's (client px) where a sheet edge may sit — the gaps between text lines of the settled
      // page — so a sheet never slices a line of the poem or the index in half.
      function sheetCuts(top0, bot0) {
        const bands = [], rg = document.createRange();
        poem.querySelectorAll('.bd-kick, .bd-sn, .bd-st p, .bd-attr p').forEach(n => {
          rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) if (q.height > 2 && q.bottom > top0 - 60 && q.top < bot0 + 60) bands.push([q.top, q.bottom]);
        });
        [side, tail].forEach(c => c.querySelectorAll('.bd-sh, .bd-tl, .bd-row, .bd-gh, .bd-links, .bd-fr .h').forEach(n => {
          const q = n.getBoundingClientRect();
          if (q.height > 2 && q.bottom > top0 - 60 && q.top < bot0 + 60) bands.push([q.top, q.bottom]);
        }));
        bands.sort((a, b) => a[0] - b[0]);
        const m = [];
        for (const b of bands) { const l = m[m.length - 1]; if (l && b[0] <= l[1] + 1) l[1] = Math.max(l[1], b[1]); else m.push([b[0], b[1]]); }
        const cuts = [top0, bot0];
        for (let i = 0; i + 1 < m.length; i++) cuts.push((m[i][1] + m[i + 1][0]) / 2);
        return cuts.filter(y => y >= top0 && y <= bot0 && !m.some(b => y > b[0] + 1 && y < b[1] - 1)).sort((a, b) => a - b);
      }
      function jumpShow(span, cfg) {
        if (jState && jState.span === span) { clearTimeout(jState.hideT); return; }
        jumpHide();
        const mob = innerWidth < 800;
        const items = cfg.mode === 'flip' ? [{ flip: cfg.frames, title: cfg.title, meta: cfg.meta }]
          : cfg.mode === 'friends' ? FRIENDS.map(f => ({ text: f.label, title: f.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: f.href })) // (the name is in the box: the caption is the site)
          : cfg.cards.map(c => (c.art && !(artFn('swfUnit') && artFn('swfTether')) ? Object.assign({}, c, { art: null, src: c.alt }) : c));
        const rects = span.getClientRects(), r = rects[rects.length - 1] || span.getBoundingClientRect(), r0 = rects[0] || r; // r0: first line of a wrapped phrase
        const vw = innerWidth, vh = innerHeight, n = items.length;
        const textual = cfg.mode === 'friends';
        let cw = textual ? (mob ? Math.min(160, (vw - 44) / 2) : 150) : cfg.mode === 'flip' ? (mob ? 220 : 280)
          : cfg.single ? (mob ? Math.min(cfg.cw, vw - 32, 300) : cfg.cw) : (mob ? Math.min(180, (vw - 44) / 2) : 250);
        const st0 = { span, cfg, nodes: [], timers: [], hideT: 0, flipImgs: null, flipI: 0, flipAt: 0 };
        // build the cards first (hidden) so the layout uses their real heights (title + meta wrap at 12px)
        const cards = items.map(it => {
          const c = H(it.href ? 'a' : 'div', { class: 'bd-jc', href: it.href || null, target: it.href && /^https?:/.test(it.href) ? '_blank' : null, rel: it.href ? 'noopener' : null });
          const fr = H('span', { class: 'fr' });
          let im = null;
          if (it.text) fr.append(H('span', { class: 'tx', text: it.text }));
          else if (it.art) { im = H('span', { class: 'im' }); const c2 = H('canvas', { 'aria-hidden': 'true' }); im.append(c2); fr.append(im); st0.art = { c: c2, kind: it.art }; }
          else if (it.mosaic) { im = H('span', { class: 'im mz' }); it.mosaic.forEach(src => im.append(cardImg(src))); fr.append(im); }
          else {
            im = H('span', { class: 'im' });
            if (it.flip) { st0.flipImgs = it.flip.map((f, j) => { const e = cardImg(f.src, '', j === 0 ? 'on' : ''); if (f.fy != null) e.style.objectPosition = `50% ${Math.round(f.fy * 100)}%`; im.append(e); return e; }); }
            else im.append(cardImg(it.src, it.title || ''));
            fr.append(im);
          }
          c.append(fr, H('span', { class: 'mt' }, H('span', { class: 't', text: it.title || '' }), it.meta ? H('span', { class: 'm', text: it.meta }) : null, it.meta2 ? H('span', { class: 'm2', text: it.meta2 }) : null));
          c.style.visibility = 'hidden';
          jl.append(c); st0.nodes.push(c);
          return { it, c, im };
        });
        const arOf = it => (it.flip ? 1.5 : it.art ? 1.5 : it.ar || AR[it.src] || aspect(img(it.src)));
        const sizeTo = w => {
          cards.forEach(k => { k.c.style.width = Math.round(w) + 'px'; if (k.im) k.im.style.height = Math.round((w - 10) / arOf(k.it)) + 'px'; });
          return cards.map(k => k.c.offsetHeight);
        };
        let hts = sizeTo(cw);
        const pos2 = [];
        const pr = poem.getBoundingClientRect(), colX = Math.max(r.right + 48, pr.right + 28);
        const roomR = vw - colX - (mob ? 16 : 150);
        const idx = !!cfg.idx;
        const col = !idx && !mob && roomR >= Math.min(cw, 200) + 20;
        let lead = null; // index row: [ax, ay, cardRightX, cardY, cardH]
        if (idx) { // an index row: one card in the gutter left of the index column, level with the row
          const ir = secIndex.getBoundingClientRect(), rr = span.getBoundingClientRect();
          let x = ir.left - 44 - cw;
          if (x < pr.left - 20) { cw = Math.max(200, ir.left - 44 - (pr.left - 20)); hts = sizeTo(cw); x = ir.left - 44 - cw; }
          const y = Math.max(76, Math.min(vh - 96 - hts[0], rr.top + 18 - Math.min(hts[0] / 2, 60)));
          pos2.push([x, y]);
          lead = [ir.left - 12, rr.top + 18.5, x + cw + 8, y, hts[0]];
        } else if (col) { // a column to the right of the poem; shrink the images if the stack is taller than the stage
          if (roomR - 20 < cw) { cw = roomR - 20; hts = sizeTo(cw); }
          const gap = 16, avail = vh - 76 - 96 - (n - 1) * gap;
          let total = hts.reduce((q, h) => q + h, 0);
          // three or more cards that don't fit one column: a 2-column grid keeps them large (e.g. the four tools)
          const w2 = Math.min(cw, (roomR - 20 - gap) / 2);
          if (total > avail && !textual && n >= 3 && w2 >= 170) {
            cw = w2; hts = sizeTo(cw); st0.cols = 2;
            const rowH = () => { const a = []; for (let i = 0; i < n; i += 2) a.push(Math.max(hts[i], hts[i + 1] || 0)); return a; };
            let rh = rowH(), tot = rh.reduce((q, h) => q + h, 0) + (rh.length - 1) * gap;
            const room2 = vh - 76 - 96;
            if (tot > room2) {
              const ih = cards.reduce((q, k, i) => q + (i % 2 === 0 && k.im ? k.im.offsetHeight : 0), 0), f = Math.max(0.5, (room2 - (tot - ih)) / Math.max(1, ih));
              cw = Math.max(140, 10 + (cw - 10) * f); hts = sizeTo(cw); rh = rowH(); tot = rh.reduce((q, h) => q + h, 0) + (rh.length - 1) * gap;
            }
            let y = Math.max(76, Math.min(vh - 96 - tot, r.top + r.height / 2 - tot / 2));
            for (let i = 0; i < n; i++) { if (i && i % 2 === 0) y += rh[i / 2 - 1] + gap; pos2.push([colX + (i % 2) * (cw + gap), y]); }
          } else {
            if (total > avail && !textual) {
              const ih = cards.reduce((q, k) => q + (k.im ? k.im.offsetHeight : 0), 0), f = Math.max(0.5, (avail - (total - ih)) / Math.max(1, ih));
              cw = Math.max(160, 10 + (cw - 10) * f); hts = sizeTo(cw); total = hts.reduce((q, h) => q + h, 0);
            }
            let y = Math.max(76, Math.min(vh - 96 - total - (n - 1) * gap, r.top + r.height / 2 - (total + (n - 1) * gap) / 2));
            items.forEach((it, i) => { pos2.push([colX + (i % 2) * 36, y]); y += hts[i] + gap; });
          }
        } else {
          // phones / narrow: an opaque full-width sheet in whichever half the phrase is not in, its edges snapped into
          // the gaps between text lines (no line is ever sliced), cards in one or two columns, one leader to the sheet
          const top0 = 70, bot0 = vh - (mob ? 112 : 84), cuts = sheetCuts(top0, bot0);
          const innerUp = Math.max(top0, ...cuts.filter(y => y <= r0.top - 2)), innerDn = Math.min(bot0, ...cuts.filter(y => y >= r.bottom + 2));
          const upRoom = innerUp - top0, downRoom = bot0 - innerDn;
          const cols = n === 1 ? 1 : 2, gx = 12, gy = 14, pad = 14;
          // (a desktop window: the sheet spans the page column only, never the control column on the left)
          const sb = mob ? { l: 0, r: vw } : (() => { const q = set.getBoundingClientRect(); return { l: q.left, r: q.right }; })(), sw = sb.r - sb.l;
          let w = cols === 1 ? Math.min(cw, sw - 32) : Math.min(cw, (sw - 32 - gx) / 2);
          hts = sizeTo(w);
          const need = () => { let t = 0; for (let i = 0; i < n; i += cols) t += Math.max(...hts.slice(i, i + cols)); return t + (Math.ceil(n / cols) - 1) * gy + pad * 2; };
          // below the tapped line when the sheet fits there (the sentence it belongs to stays readable above it);
          // above only when it fits there and not below; otherwise whichever side has more room
          const need0 = need(), up = downRoom >= need0 ? false : upRoom >= need0 ? true : upRoom > downRoom, room = up ? upRoom : downRoom;
          if (need() > room && !textual) { // too tall: keep the column width, crop the photos shorter (object-fit: cover)
            // (a generated text card keeps its natural height: cropped, it loses its first and last lines. The photos
            // give up the height instead: the largest crop that fits, found by bisection, never below 35 %)
            const shr = cards.filter(k => k.im && k.it.gen !== 'text'), h0 = shr.map(k => k.im.offsetHeight);
            const apply = f => { shr.forEach((k, i) => { k.im.style.height = Math.round(h0[i] * f) + 'px'; }); hts = cards.map(k => k.c.offsetHeight); };
            let lo = 0.35, hi = 1;
            apply(lo);
            if (need() <= room) { for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; apply(m); if (need() <= room) lo = m; else hi = m; } apply(lo); }
          }
          const nd = Math.min(room, need());
          let py, ph;
          if (up) { const outer = Math.max(top0, ...cuts.filter(y => y <= innerUp - nd)); py = outer; ph = innerUp - outer; }
          else { const outer = Math.min(bot0, ...cuts.filter(y => y >= innerDn + nd)); py = innerDn; ph = outer - innerDn; }
          const panel = H('div', { class: 'bd-jp' });
          panel.style.top = Math.round(py) + 'px'; panel.style.height = Math.round(ph) + 'px';
          panel.style.left = Math.round(sb.l) + 'px'; panel.style.right = Math.round(vw - sb.r) + 'px';
          panel.addEventListener('pointerenter', () => { clearTimeout(st0.hideT); });
          panel.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') jumpHideSoon(); });
          jl.insertBefore(panel, jsvg.nextSibling); st0.nodes.push(panel); st0.panel = panel;
          const totalW = cols === 1 ? w : w * 2 + gx, x0 = Math.round(sb.l + (sw - totalW) / 2);
          let yy = py + Math.max(pad, (ph - nd) / 2 + pad); // (a sheet snapped taller than its cards centres them)
          for (let i = 0; i < n; i += cols) {
            const rowH = Math.max(...hts.slice(i, i + cols));
            for (let j = 0; j < cols && i + j < n; j++) pos2.push([x0 + j * (w + gx), yy]);
            yy += rowH + gy;
          }
          st0.edge = up ? py + ph : py;
        }
        // side column: the phrase's underline continues as the leader (like the film), then runs down a gutter;
        // index row: a leader from the row's left edge to the card; sheet: one short leader from the phrase to its edge
        let ax, ay;
        if (lead) { ax = lead[0]; ay = lead[1]; }
        else {
          const rl = !col && st0.edge < r0.top ? r0 : r; // sheet above: the leader leaves the phrase's first line
          ax = col ? r.right + 3 : rl.left + Math.min(rl.width / 2, 40);
          ay = col ? r.bottom - 1 : (st0.edge < rl.top ? rl.top - 2 : rl.bottom + 2);
        }
        const anchor = S('rect', { class: 'an', x: String(ax - 2), y: String(ay - 2), width: '4', height: '4' });
        jsvg.append(anchor); st0.nodes.push(anchor);
        el.classList.add(idx ? 'is-jumping-idx' : col ? 'is-jumping' : 'is-sheet'); // (an opaque sheet covers what it covers: nothing else dims)
        if (st0.panel) st0.timers.push(setTimeout(() => { if (jState === st0) st0.panel.classList.add('is-in'); }, 0));
        const a = aud(), sd = a && a.clock ? a.clock.stepDur : S16;
        const w0 = a && soundOn ? qwhen(0) : 0, now0 = a ? a.now() : 0, lat0 = a && soundOn ? outLat() : 0; // cards land when their sound is heard
        const seed = String(span.dataset.ph || span.dataset.id || '').length; // each phrase / row lands on its own pitch
        const boxes = [];
        cards.forEach(({ it, c }, i) => {
          const [x, y] = pos2[i];
          c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px'; c.style.visibility = '';
          boxes.push([x - 8, y - 8, x + cw + 8, y + hts[i] + 8]);
          c.addEventListener('pointerenter', () => { clearTimeout(st0.hideT); });
          c.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') jumpHideSoon(); });
          if (it.href) c.addEventListener('click', () => ui('select'));
          // leader: anchor → card edge
          let d;
          if (lead) { // straight across when the row is level with the card, else across, down, across
            const cy = Math.max(lead[3] + 10, Math.min(lead[3] + lead[4] - 10, ay)), mx = Math.round((lead[2] + ax) / 2) + 0.5;
            d = Math.abs(cy - ay) < 1 ? `M${ax} ${ay} H${lead[2]}` : `M${ax} ${ay} H${mx} V${cy} H${lead[2]}`;
          } else if (col && st0.cols === 2 && i % 2) d = 'M0 0'; // 2-column grid: leaders run to the left column only
          else if (col) { const gx = colX - 20, cy = y + Math.min(40, hts[i] / 2), ry = Math.round(r.bottom + 3) + 0.5; d = `M${ax} ${ay} V${ry} H${gx} V${cy} H${x - 2}`; }
          else d = i === 0 ? `M${ax} ${ay} V${st0.edge}` : 'M0 0';
          const path = S('path', { class: cfg.energy ? 'ld is-energy' : 'ld', d }); // energy: accent dashes flow card → phrase
          jsvg.append(path); st0.nodes.push(path);
          const step = cfg.mode === 'friends' || n >= 4 ? 1 : 2; // cards land on 8ths (16ths when there are four or more)
          const when = w0 + i * step * sd;
          const delay = a && soundOn ? Math.max(0, when - now0 + lat0) * 1000 : i * (cfg.mode === 'friends' ? 70 : 130);
          st0.timers.push(setTimeout(() => {
            if (jState !== st0) return;
            c.classList.add('is-in'); path.classList.add('is-in'); anchor.classList.add('is-in');
          }, delay));
          // its sound: the first card's now; the others just before they land, and only while this callout is still up
          const snd = () => {
            if (jState && jState !== st0) return;
            const aa0 = aud();
            hSnd(aa0 && when > aa0.now() + 0.01 ? when : qwhen(0), (aa, wt) => {
              if (cfg.mode === 'friends') play('grain', aa.degree(i * 2 % 5, 0), { when: wt, gain: 0.26, bright: 0.15, pan: -0.6 + i * 0.4, dest: bus() }) || play('tick', aa.degree(i * 2 % 5, 0), { when: wt, gain: 0.22, dest: bus() });
              else if (cfg.energy) { play('sub', aa.degree(0, -2), { when: wt, dur: 0.28, gain: 0.16, dest: bus() }); play('tick', aa.degree(i * 2 % 5, 0), { when: wt, gain: 0.2, pan: -0.3 + i * 0.3, dest: bus() }); }
              else if (!it.flip) { const dg = [2, 4, 1, 3, 0][(i + seed) % 5]; play('grain', aa.degree(dg, 0), { when: wt, gain: 0.3, bright: 0.15, pan: [-0.2, 0.35, -0.35, 0.2][i % 4], dest: bus() }) || play('tick', aa.degree(dg, 0), { when: wt, gain: 0.22, dest: bus() }); }
              else play('tick', aa.degree(0, 0), { when: wt, gain: 0.2, dest: bus() });
            });
          };
          if (i === 0) snd(); else if (a && soundOn) st0.timers.push(setTimeout(snd, Math.max(0, delay - 90)));
        });
        // the index steps back completely under a phrase's cards; its header, timeline and related rows stay only
        // where no card covers them
        if (col) {
          const clear = n2 => { const q = n2.getBoundingClientRect(); return !boxes.some(b => q.left < b[2] && q.right > b[0] && q.top < b[3] && q.bottom > b[1]); };
          [ihead, tl].forEach(n2 => n2.classList.toggle('is-clear', clear(n2)));
        }
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
          if (lastStanza >= 0 && now - lastTickAt > 80) { hSnd(0, (a, w) => play('tick', a.degree(k % 5, 0), { when: w, gain: 0.16, pan: ((k % 7) - 3) * 0.15, dest: bus() })); lastTickAt = now; }
          lastStanza = k;
        }
        const y = set.scrollTop + 40, two = innerWidth >= 1200;
        // (scrolled to the foot counts as "Friends": the section is short, so its top may never climb that far)
        const atEnd = set.scrollTop > 0 && set.scrollTop >= set.scrollHeight - set.clientHeight - 8;
        const idx = atEnd || y >= secFr.offsetTop - set.clientHeight * 0.6 ? 2 : !two && y >= secIndex.offsetTop - 60 ? 1 : 0;
        if (idx !== st2.get() && !(two && st2.get() === 1 && idx === 0 && set.scrollTop < 10)) st2.set(idx);
      }

      // the live 'will power' card: three units (the scene [4] glyph) aloft in the high wind, their generator plates
      // lit, energy packets running down the conducting tethers into one ground station
      function drawEnergyCard(A, t) {
        const c = A.c, w = c.clientWidth, h = c.clientHeight, U = artFn('swfUnit'), T = artFn('swfTether');
        if (!w || !h || !U || !T) return false;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
        const g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
        g.lineWidth = 1; g.setLineDash([12, 8]);
        [[0.12, C.accent, 46], [0.27, C.accent2 || C.accent, 38], [0.44, C.g300, 30]].forEach(([f, col, sp]) => {
          g.strokeStyle = col; g.lineDashOffset = -t * sp; g.beginPath(); g.moveTo(0, Math.round(h * f) + 0.5); g.lineTo(w, Math.round(h * f) + 0.5); g.stroke();
        });
        g.setLineDash([]); g.lineDashOffset = 0;
        const gy = Math.round(h - 14), gx = w * 0.5, sc = Math.max(0.24, Math.min(0.42, w / 640));
        g.strokeStyle = C.ink; g.beginPath(); g.moveTo(6, gy + 0.5); g.lineTo(w - 6, gy + 0.5); g.stroke();
        g.strokeStyle = C.g300; for (let x = 10; x < w - 6; x += 10) { g.beginPath(); g.moveTo(x, gy + 1); g.lineTo(x - 4, gy + 5); g.stroke(); }
        [[0.2, 0.34], [0.52, 0.2], [0.82, 0.4]].forEach(([fx, fy], i) => {
          const x = w * fx + Math.sin(t * 0.9 + i * 2) * 1.5, y = h * fy + 39 * sc * 0.4 + Math.sin(t * 1.3 + i) * 1.2;
          knockUnit(g, x, y, sc); // the wind lines pass behind the rotors
          const bp = U(g, x, y, sc, t, { energy: 0.8 + 0.2 * Math.sin(t * 3 + i), ink: C.ink, accent: C.accent, bg: C.bg, phase: t * 4.4 + i });
          if (bp) T(g, bp.x, bp.y, gx + (i - 1) * 7, gy - 11, t + i * 0.37, { energy: 0.85, highlight: true, sag: 0.03, speed: 0.55 });
        });
        g.fillStyle = C.bg; g.fillRect(gx - 14, gy - 11, 28, 11);
        g.strokeStyle = C.accent; g.strokeRect(Math.round(gx - 14) + 0.5, gy - 10.5, 28, 11);
        g.beginPath(); g.moveTo(gx + 2, gy - 9); g.lineTo(gx - 3, gy - 5); g.lineTo(gx + 3, gy - 5); g.lineTo(gx - 2, gy - 1); g.stroke();
        return true;
      }
      // output latency (s): what is scheduled now is heard this much later (Bluetooth: 150–250 ms)
      function outLat() {
        try { if (score && typeof score.latency === 'function') { const v = +score.latency(); if (isFinite(v)) return Math.max(0, v); } } catch (e) {}
        const a = aud(), c = a && a.ctx;
        return c ? Math.max(0, (c.outputLatency || 0) + (c.baseLatency || 0)) : 0;
      }
      function settledTick(t) {
        const J = jState;
        // the live 'will power' card; reduced motion: drawn once, still
        if (J && J.art && !(api.reduced && J.artDrawn)) { try { J.artDrawn = drawEnergyCard(J.art, api.reduced ? 1.2 : t) || J.artDrawn; } catch (e) { J.art = null; } }
        // The 'builders' flipbook: one frame per 16th of the shared audio clock, phase-locked to what is HEARD
        // (frame k shows when its tick is audible); a tick on every other frame for one pass of the frames, then
        // it flips on silently. Reduced motion: frame 0 only, no ticks.
        if (J && J.flipImgs && !api.reduced) {
          const a = aud(), n = J.flipImgs.length;
          let fi;
          if (a && a.clock && soundOn) {
            const sd = a.clock.stepDur, lat = outLat();
            if (J.flipT0 == null) { J.flipT0 = qwhen(0) + sd; J.flipNext = 1; }
            while (J.flipNext <= n && J.flipT0 + (J.flipNext - 1) * sd < a.now() + 0.12) { // schedule ahead, on the grid
              const k = J.flipNext++, wt = J.flipT0 + (k - 1) * sd;
              if (k % 2 === 0) { sndAt = Math.max(sndAt, wt); play('tick', a.degree(Math.floor(k / 2) % 5, 0), { when: wt, gain: 0.12, pan: (k % 8) / 7 - 0.5, dest: bus() }); }
            }
            const heard = a.now() - lat - J.flipT0;
            fi = heard < 0 ? 0 : (Math.floor(heard / sd) + 1) % n;
          } else {
            const now = performance.now();
            if (J.flipAt0 == null) J.flipAt0 = now;
            fi = Math.floor((now - J.flipAt0) / (S16 * 1000)) % n;
          }
          if (fi !== J.flipI) { J.flipImgs[J.flipI].classList.remove('on'); J.flipI = fi; J.flipImgs[fi].classList.add('on'); }
        }
      }

      /* ---------------------------------------------------------- audio stalls */
      // The picture follows the score's heard position, so a context that stops while the page is visible (iOS: a call,
      // Siri, an alarm; an output route change) would freeze the film on one frame. Its clock is watched: frozen for
      // 0.35 s of visible time (a tab coming back resumes in a few ms, well under that), the score is stopped and the
      // film runs on the wall clock, silent; the next gesture on [5] asks the context to resume, and when its clock
      // moves again the score rejoins the film where it is.
      let stalled = false, ctxT = -1, frozenFor = 0;
      function watchClock(dt) {
        const a = aud(), c = a && a.ctx;
        if (!c || !soundOn) { stalled = false; frozenFor = 0; ctxT = -1; return; }
        const moved = c.state === 'running' && c.currentTime !== ctxT;
        ctxT = c.currentTime;
        if (moved) {
          frozenFor = 0;
          if (stalled) { stalled = false; if (mode === 'film' && playing) { scoreStop(0); scorePlay(pos); } }
          return;
        }
        if (stalled || !(mode === 'film' && playing && sPlaying())) return;
        frozenFor += dt;
        if (frozenFor > 0.35) { stalled = true; scoreStop(0); }
      }
      function resumeStalled() {
        const a = aud(), c = a && a.ctx;
        if (!c || c.state === 'running' || c.state === 'closed' || document.hidden || typeof c.resume !== 'function') return;
        try { const r = c.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
      }

      /* ---------------------------------------------------------- loop */
      let stillAt = -1e9; // (paused: when the still frame was last drawn)
      api.loop((t, dt) => {
        if (mode !== 'film') { settledTick(t); return; }
        // (the gesture that brought us here is still unlocking audio: hold the first frame so film and music start together)
        if (playing && !soundOn && holdUntil && performance.now() < holdUntil) { render(); syncControls(); return; }
        watchClock(dt);
        if (playing) {
          let p = pos + dt;
          if (soundOn && sPlaying() && !stalled) {
            const sp = sHeard();
            // (never more than 30 ms ahead of what is heard: at a start the picture waits for the score's first sound)
            if (isFinite(sp)) { const err = sp - p; p = Math.abs(err) > 0.35 ? sp : Math.min(p + err * 0.12, sp + 0.03); }
          }
          pos = Math.max(0, Math.min(DUR, p));
          if (pos >= SETTLE_AT) { settle('end'); return; }
        } else {
          // paused: film time stands still, and so does the frame (a seek, a scrub, a resize or play redraws at once);
          // four redraws a second catch anything else (an image that just loaded) without redrawing 60 times a second
          if (t - stillAt < 0.25 && t >= stillAt) return;
          stillAt = t;
        }
        render();
        syncControls();
      });
      api.onResize(() => { relayout(); resetText(); stanzaTops = null; checkSticky(); if (mode === 'film') render(); jumpHide(); showControls(); if (pillUp) placePill(); });
      // (no pointing arrows on [5], as with the friends' names: core adds " ↗" to external links, so it comes off here)
      (api.links(SOCIALS.map(s => ({ label: s.label, href: s.href }))) || []).forEach(a => {
        Array.from(a.childNodes).forEach(n => { if (n.nodeType === 3 && /↗/.test(n.nodeValue)) n.remove(); });
      });
      // tiny inspection hook (used by visual tests): el._bd.seek(seconds), el._bd.state()
      el._bd = { seek: s => { if (mode !== 'film') replay(); seek(s, true); }, pause: () => { if (playing) togglePlay(); },
        state: () => ({ mode, pos, playing, soundOn, score: !!score, scorePlaying: sPlaying(), scorePos: score ? sPos() : null, bed: !!bed, pill: pillUp, frames: MONTAGE.length, projects: PROJECTS.length }),
        bus: () => api.bus(), flip: FLIP, foley: () => FOLEY.map(e => Object.assign({}, e)), bench: () => G && benchGeom(), engine: () => G && engGeom() };

      /* ---------------------------------------------------------- lifecycle */
      return {
        enter() {
          jumpHide();
          clearTimeout(bedTimer); clearTimeout(tailTimer);
          el.classList.remove('is-settled', 'is-shown'); clearTimeout(shownT);
          mode = 'film'; pos = 0; playing = true; lastSi = -1; lastSlider = -1;
          // The film plays on the first visit. Coming back within a minute of it ending (or being skipped) opens the
          // index page where you left it; after that, [5] plays the film again (it is the thing people are shown).
          if (api.reduced) { settle('reduced'); return; }
          if (watched && performance.now() - settledAt < RETURN_MS) { settle('return'); return; }
          showControls(); api.caption(CAP_FILM);
          relayout(); render(); syncControls();
          holdUntil = 0;
          if (!audioLive()) {
            // an unlock is on its way (a gesture just created the audio context, or the browser carried the visitor's
            // activation over from the page before): hold the first frame for it; else, after a beat, invite a gesture
            const a = AU(), coming = !!(a && (a.ctx || (navigator.userActivation && navigator.userActivation.hasBeenActive)));
            if (coming) holdUntil = performance.now() + 450;
            pillSoon(450);
          }
          // (keyboard hint: only where there is a keyboard; it never outlives film mode — settle() clears it)
          if (!TOUCH && innerWidth >= 800) setTimeout(() => { if (api.isActive() && aud() && mode === 'film' && pos < 3) { api.hint('Space pause · Enter skip to the index', 3200); hintUntil = performance.now() + 3200; } }, 1400);
        },
        exit() {
          if (mode === 'settled') settledAt = performance.now(); // (the index was on screen until now)
          playing = false; restart0 = false; holdUntil = 0; pill(false); stalled = false; frozenFor = 0;
          scoreStop(0.3); stopBed(); jumpHide(); ovHideAll();
          clearTimeout(bedTimer); clearTimeout(tailTimer); clearTimeout(scrubTimer);
        },
        sound(on) {
          soundOn = !!on;
          if (soundOn) {
            const a = aud();
            FOLEY_ON = !!(a && a.play && typeof a.play.click === 'function');
            // the first sound of a film that began without it (the pill was up, or it asked for 0:00, or the film is only
            // a moment old: the gesture that brought us here is still unlocking audio): picture and music start together
            const r0 = restart0 || pillUp;
            restart0 = false; holdUntil = 0; pill(false);
            if (mode === 'film' && playing) {
              if (r0 || pos < FRESH) { pos = 0; lastSlider = -1; render(); syncControls(); }
              scorePlay(pos);
            } else if (mode === 'settled') startBed();
          } else { scoreStop(0.25); stopBed(); }
        },
        key(e) {
          const k = e.key;
          if ((k === ' ' || k === 'Spacebar' || k === 'Enter') && mode === 'film' && pillWasUp()) { pillGoneAt = -1e9; playWithSound(); return true; }
          if (k === ' ' || k === 'Spacebar') { if (mode === 'film') togglePlay(); else replay(); ui('tick'); return true; }
          if (k === 'Enter') { if (mode === 'film') { settle('skip'); return true; } return false; }
          if (k === 'r' || k === 'R') { ui('select'); replay(); return true; }
          if (k === 'ArrowDown' || k === 'ArrowUp') {
            const d = k === 'ArrowDown' ? 1 : -1;
            if (mode === 'film') {
              let si = 0; for (let i = 0; i < STEPS.length; i++) if (pos >= lb(STEPS[i].bar) - 0.01) si = i;
              let ni = si + d;
              if (d < 0 && pos - lb(STEPS[si].bar) > 1.2) ni = si;
              if (ni >= STEPS.length) { settle('skip'); return true; }
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
