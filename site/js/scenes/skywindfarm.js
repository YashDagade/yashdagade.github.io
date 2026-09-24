/* yashdagade.com v2 — scene [4] SkyWindFarm.
 *
 * A line-art sky. An altitude axis with the measured wind-shear profile v(h); three tethered
 * SkyWindFarm Energy Units whose counter-rotating VAWTs spin at the local wind speed; deep-blue
 * energy packets sliding down the tethers into the grid; and, underneath everything, a quiet fluid
 * layer: smoke-wire streaklines and tracers advected through (shear profile + curl-noise turbulence
 * + von Kármán-like vortices shed by every unit). Press and hold the sky to gust, drag ← → or scroll
 * to set the wind. Hover a drawn part to see the real thing (photos and figures from the paper).
 *
 * Every number comes from the research brief (Yash's paper assets/swf.pdf; OWID / UNDP data).
 *
 * Shared art (top level, pure canvas, no DOM): Site.art.swfUnit and Site.art.swfTether, documented
 * below. This scene draws its own units and tethers with them, so Build reuses the exact same glyph.
 */
(function () {
  'use strict';

  /* ================================================================ data (brief) */

  // Paper Fig. 2, digitized (h in m, v in m/s): average wind speed above Central London.
  const FIG2 = [[110, 6.9], [125, 7.3], [175, 8.2], [200, 8.6], [250, 9.2], [300, 9.8], [350, 10.4], [400, 10.9],
    [500, 11.6], [600, 12.3], [700, 12.9], [800, 13.3], [900, 13.8], [1000, 14.5], [1100, 15.1], [1200, 16.1],
    [1300, 16.9], [1400, 18.1], [1500, 19.4], [1600, 20.4], [1700, 21.0], [1800, 21.7], [2000, 22.8]];

  // Energy (kWh/person/yr, OWID 2025; 2024 for NGA KEN TZA ETH UGA HTI NER COD) vs HDI (UNDP 2023).
  const HDI = [
    ['Iceland', 'ISL', 206917, 0.972], ['Qatar', 'QAT', 199256, 0.886], ['Singapore', 'SGP', 174382, 0.946],
    ['UAE', 'ARE', 128665, 0.940], ['Saudi Arabia', 'SAU', 96633, 0.900], ['Canada', 'CAN', 83452, 0.939],
    ['United States', 'USA', 75051, 0.938], ['South Korea', 'KOR', 69745, 0.937], ['Russia', 'RUS', 60168, 0.832],
    ['Australia', 'AUS', 56927, 0.958], ['Norway', 'NOR', 55629, 0.970], ['Sweden', 'SWE', 43127, 0.959],
    ['Iran', 'IRN', 39906, 0.799], ['France', 'FRA', 37613, 0.920], ['Japan', 'JPN', 37192, 0.925],
    ['Germany', 'DEU', 33183, 0.959], ['China', 'CHN', 31815, 0.797], ['Spain', 'ESP', 30144, 0.918],
    ['Poland', 'POL', 28575, 0.906], ['Switzerland', 'CHE', 27197, 0.970], ['Italy', 'ITA', 25991, 0.915],
    ['United Kingdom', 'GBR', 25129, 0.946], ['Denmark', 'DNK', 23888, 0.962], ['Turkey', 'TUR', 23190, 0.853],
    ['South Africa', 'ZAF', 21592, 0.741], ['Chile', 'CHL', 21237, 0.878], ['Argentina', 'ARG', 19108, 0.865],
    ['Mexico', 'MEX', 16481, 0.789], ['Brazil', 'BRA', 14609, 0.786], ['Vietnam', 'VNM', 12847, 0.766],
    ['Indonesia', 'IDN', 11196, 0.728], ['Egypt', 'EGY', 9309, 0.754], ['India', 'IND', 7419, 0.685],
    ['Philippines', 'PHL', 6122, 0.720], ['Pakistan', 'PAK', 3400, 0.544], ['Bangladesh', 'BGD', 3205, 0.685],
    ['Nigeria', 'NGA', 2213, 0.560], ['Kenya', 'KEN', 1677, 0.628], ['Tanzania', 'TZA', 1155, 0.555],
    ['Ethiopia', 'ETH', 686, 0.497], ['Uganda', 'UGA', 637, 0.582], ['Haiti', 'HTI', 602, 0.554],
    ['Niger', 'NER', 511, 0.419], ['DR Congo', 'COD', 312, 0.522],
  ];
  const EIA_2024 = { NGA: 1, KEN: 1, TZA: 1, ETH: 1, UGA: 1, HTI: 1, NER: 1, COD: 1 };
  const WORLD = ['World', 'WLD', 20258, 0.756];
  // label placement: [dx, dy, align, mobile?]
  const HDI_LABELS = {
    ISL: [-8, -7, 'right', 1], QAT: [-8, 13, 'right', 1], NOR: [0, -9, 'center', 0], USA: [5, 15, 'left', 0],
    DEU: [0, 18, 'center', 0], CHN: [0, 16, 'center', 1], IND: [8, 4, 'left', 1], BGD: [-8, 4, 'right', 0],
    NGA: [-8, 4, 'right', 1, [0, -10, 'center']], ETH: [0, 16, 'center', 1],
  };

  const IMG = 'site/img/swf/';
  // owner feedback: patent, ISEF, and the two videos together; never the paper PDF
  const LINKS = [
    { label: 'Utility patent', href: 'https://patents.google.com/patent/US20250243843A1/en' },
    { label: 'ISEF project', href: 'https://isef.net/project/egsd018-skywindfarm' },
    { label: 'explanation', m: 'Video: explanation', href: 'https://youtu.be/gDUk6V607js' },
    { label: 'flight', m: 'Video: flight', href: 'https://youtu.be/Z6k2j59-ubo' },
  ];
  const V_DESIGN = 26.7;       // m/s at 3 km (Weibull c, paper p.4)
  const RHO_HUB = 0.8;         // kg/m³ at 3 km (paper, conservative)
  const CP = 0.43, CA = 12, NT = 4, TSR = 3, R_T = 1.5;
  const V_MIN = 2, V_MAX = 36; // 36 m/s ≈ jet-stream average (paper §8.1)
  const V_IN = 18, V_OUT = 33;  // the system's cut-in / cut-out wind speeds (paper p. 20)
  const ALT_MAX = 3500;
  const TAU = Math.PI * 2;
  const TAB_W = 300;            // step 2: width of the shear table + legend column

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eout = t => 1 - Math.pow(1 - t, 3);
  const fmtInt = n => Math.round(n).toLocaleString('en-US');
  const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
  // displayed physics: every number on screen is computed from the wind speed as displayed (0.1 m/s), so a
  // shown 26.7 m/s always reads 7,614 W/m² (the turbulence only modulates the drawing and the sound)
  const vD = v => Math.round(v * 10) / 10;
  // 0..1: inside the paper's operating window (smooth over ±0.5 m/s)
  const winOf = v => sstep(V_IN - 0.5, V_IN + 0.5, v) * (1 - sstep(V_OUT - 0.5, V_OUT + 0.5, v));

  // v(h) at the design wind, m/s. Below 110 m: the brief's 1/7-law extrapolation (4.9 m/s at 10 m).
  // 110–2000 m: paper Fig. 2. 2000–3000 m: dashed join to the paper's design point (26.7 m/s).
  function vProfile(h) {
    if (h <= 110) return 4.9 * Math.pow(Math.max(h, 2) / 10, 1 / 7);
    if (h <= 2000) {
      for (let i = 1; i < FIG2.length; i++) {
        if (h <= FIG2[i][0]) {
          const a = FIG2[i - 1], b = FIG2[i];
          return lerp(a[1], b[1], (h - a[0]) / (b[0] - a[0]));
        }
      }
      return 22.8;
    }
    if (h <= 3000) return lerp(22.8, V_DESIGN, (h - 2000) / 1000);
    return V_DESIGN;
  }
  // International Standard Atmosphere (troposphere), brief §1.2.
  const rhoISA = h => 1.225 * Math.pow(1 - 0.0065 * h / 288.15, 4.2559);
  const pa = (v, rho) => 0.5 * rho * v * v * v;              // W/m²
  const pUnit = v => 0.5 * RHO_HUB * v * v * v * CP * CA * NT; // W, paper Eq 15
  // Wing angle of attack falls as v rises: ~16° @ 18 m/s → ~0.5° @ 36 m/s (paper Fig. 5, read from figure).
  const aoa = v => clamp(lerp(16, 0.5, (1 / 324 - 1 / (v * v)) / (1 / 324 - 1 / 1296)), 0.5, 16);

  // head / sub / short: the context headline (core's api.headline, CONTRACT "Round 4"): one plain sentence that states
  // the step's point (the thesis, in Yash's words, runs through steps 1–4), a sub that names what is drawn, and a
  // short sub (≤ ~51 characters: one line even on a 375 px phone) for windows where the full sub does not fit.
  // Numbers from the brief: paper p. 4 (18–33 m/s > 90% of the time at 3 km over London, the operating altitude; 26.7 m/s), Fig. 2 (~7 m/s at
  // 100 m), brief §1.2 (1/7-law 10 m row, extrapolated: ≈ 100× the power density at 3 km), §3.1 (600 m³ He,
  // 1.75 t, δ ≈ 16°; designed for ~3 km, flown to ~150 m), Eq. 15–16 (Cp 0.43 → 157 kW harvested → × 0.9 × 0.9 ≈
  // 127 kW), p. 21 (~25% lower LCOE than FlyGen), OWID / UNDP (44 countries drawn; r = 0.91 over 187).
  // ($…$ is typeset by KaTeX; keep "$" out of plain text, and no punctuation right after a $…$ span. A formula with a
  // relation is one brace group, "\${r = 0.91}$", so KaTeX never breaks the line after its "=".)
  // U+00A0 (NB) keeps a number with its unit and the last two words of a title together: core's word spans are built
  // from innerHTML, where it arrives as "&nbsp;", so the pair stays in one span and never breaks.
  const NB = '\u00a0';
  const STEPS = [
    { id: 'cubic', label: 'Cubic law', dur: 12,
      head: `Wind energy is cubically proportional to wind${NB}velocity.`,
      sub: `Double the wind speed and you get eight times the power. At 3${NB}km over London, where SkyWindFarm is designed to fly, the wind blows 18–33${NB}m/s over 90% of the time${NB}(shaded).`,
      short: `Double the wind, eight times the${NB}power.`,
      cap: 'Shaded band: paper Fig. 1 (3 km over\nLondon). Drag ← → to set the wind.\nPress and hold the sky to gust.' },
    { id: 'shear', label: 'Wind shear', dur: 12,
      head: `Wind speed increases significantly with altitude, so the sky holds far more energy than the${NB}ground.`,
      sub: `Above London the wind rises from about 7${NB}m/s at 100${NB}m to 26.7${NB}m/s at 3${NB}km. Up there, each square metre of wind carries about 100× the power it does 10${NB}m above the${NB}ground.`,
      short: `About 7${NB}m/s at 100${NB}m, 26.7${NB}m/s at 3${NB}km over${NB}London.`,
      cap: 'Solid: measured over London, paper\nFig. 2. Dotted: the textbook 1/7 law.\nHover the sky to probe any altitude.' },
    { id: 'sky', label: 'Into the sky', dur: 13,
      head: `So as a species we should harness energy from the sky. The only reason we don’t: it’s${NB}an${NB}engineering${NB}problem.`,
      sub: `SkyWindFarm Energy Units are designed to fly at about 3${NB}km: each 1.75${NB}t unit is held up by 600${NB}m³ of helium plus a lift wing, and its tether leans back only about${NB}16°.`,
      short: `SkyWindFarm units are designed to fly at ~3${NB}km.`,
      cap: 'Designed for ~3 km; the prototype has\nflown to about 150 m (flight test).\nHover a drawing to see the real thing.' },
    { id: 'unit', label: 'The unit', dur: 15,
      head: `SkyWindFarm lifts counter-rotating vertical-axis turbines on a helium shell and tethers the power${NB}down.`,
      sub: `My high-school design: four Darrieus turbines in counter-rotating pairs, with two diffuser walls. They capture 43% of the power in the wind passing through them: about 157${NB}kW per unit at 26.7${NB}m/s.`,
      short: `My high-school design: four Darrieus${NB}turbines.`,
      cap: 'Cp 0.43 at tip-speed ratio 3 (paper\nFig. 15): rotors at about 510 rpm.\nHover the parts. Flow is illustrative.' },
    { id: 'power', label: 'Tethered power', dur: 13,
      head: `A conducting tether brings the power down to the grid: about${NB}127${NB}kW${NB}per${NB}unit.`,
      sub: `157${NB}kW harvested at the 26.7${NB}m/s design wind, less about 10% each in the tether and generator. My paper estimates about 25% lower energy cost than today’s FlyGen airborne wind${NB}turbines.`,
      short: `157${NB}kW harvested × 0.9 (tether) × 0.9${NB}(generator).`,
      cap: 'Runs from 18 to 33 m/s (paper p. 20).\nCost bars read from paper Fig. 25.\nHover the cost chart for the figure.' },
    { id: 'life', label: 'Energy & life', dur: 16,
      head: `Energy and quality of life rise${NB}together.`,
      sub: `Each dot is one of 44 countries: primary energy use per person (log scale) against the UN Human Development Index; correlation \${r = 0.91}$ across all 187${NB}countries.`,
      short: `Each dot is a country: energy use vs the UN${NB}HDI.`,
      cap: 'Hover or tap a dot for its numbers\n(*: 2024 data, eight countries).\nUNDP HDR 2025 · EI Stat. Review 2026' },
  ];

  //                     cubic shear  sky  unit power life
  const VIS = {
    axis:     [0.00, 1.00, 1.00, 0.00, 1.00, 0.00],
    profile:  [0.00, 1.00, 0.32, 0.00, 0.32, 0.00],
    plabels:  [0.00, 1.00, 0.00, 0.00, 0.00, 0.00],
    ground:   [0.00, 0.30, 1.00, 0.00, 1.00, 0.00], // step 2: just the ground line (the table's lower rows sit there);
                                                    // step 1: none (under the chart it would read as a second x axis)
    units:    [0.00, 0.00, 1.00, 1.00, 1.00, 0.00],
    hero:     [1.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    packets:  [0.00, 0.00, 0.70, 0.00, 1.00, 0.00],
    lift:     [0.00, 0.00, 1.00, 0.00, 0.00, 0.00],
    power:    [0.00, 0.00, 0.00, 0.00, 1.00, 0.00],
    chart:    [0.00, 0.00, 0.00, 0.00, 0.00, 1.00],
    rake:     [1.00, 1.00, 1.00, 0.35, 1.00, 0.30],
    tracers:  [1.00, 1.00, 1.00, 0.70, 1.00, 0.40],
  };
  const LAUNCH = [0, 0, 1, 1, 1, 1];
  const ZOOM = [0, 0, 0, 1, 0, 0];

  // Energy Units: altitude (m) and tether lean (deg, a fan in perspective around the paper's 16° blowdown).
  const UNITS = [{ alt: 2780, ang: 3 }, { alt: 3000, ang: 16 }, { alt: 2640, ang: 27 }];
  // Turbines in the paper's plan layout (Fig. 6, metres; x across, y downwind). dir: +1 CCW, -1 CW (from above).
  const TURB = [
    { n: 'T1', x: -8.95, y: 0, dir: -1 }, { n: 'T4', x: 0, y: 0, dir: 1 },
    { n: 'T2', x: -6.35, y: 4.5, dir: 1 }, { n: 'T3', x: -2.6, y: 4.5, dir: -1 },
  ];
  // Diffuser walls (Fig. 6): 40° to the wind, 1.9 m downwind span, upstream-outboard of T1 and T4.
  const WALLS = [[[-9.56, -1.9], [-11.03, -3.8]], [[0.61, -1.9], [2.08, -3.8]]];
  const PLAN_C = [-4.475, 1.2]; // centre of the 15 m "considered region" (Table 1)

  /* ================================================================ shared art (Site.art) */
  //
  // Site.art.swfUnit(ctx, x, y, scale, t, opts) → { x, y }
  //   One SkyWindFarm Energy Unit, side view, hairline line art (paper §2.1, Fig. 4b; plan layout Fig. 6):
  //   flotation shell (half-teardrop LTA dome on an elliptical deck plate seen slightly from below), stability
  //   wing (NACA 4412 section at a positive angle of attack; wind blows +x), the counter-rotating 4-VAWT cluster
  //   hanging from the deck's underside (H-Darrieus rotors: generator hub, spokes, 3 blades whose chord
  //   foreshortens as they turn), the two 40° diffuser walls, and the bridle (from the rotor hubs).
  //   Returns the bridle point (where the tether attaches), in CSS px.
  //   Site.art.swfUnit.extent = { halfW: 50, top: -39, bottom: 52, bridle: { x: -3, y: 52 } } (local units).
  //   x, y    deck centre. The shell rises above y, the turbines hang below it (canvas y grows down).
  //   scale   px per local unit. The drawing spans x ± 50·scale (the 15 m deck) and y − 39·scale (shell
  //           top) … y + 52·scale (bridle point). ~0.2 = icon, 0.8 = sky, 3–4 = close-up.
  //   t       seconds; spins the rotors at opts.rpm unless opts.phase is given.
  //   opts    rpm = 14        visual rotor speed of the drawing (the real design point is ~510 rpm)
  //           phase           rotor angle in radians (overrides t·rpm, so a caller can vary speed smoothly)
  //           energy = 0      0..1: the bridle node lights up in the accent colour (> 0.01); the generator
  //                           plates join in above 0.6 (sky scale) so small units stay quiet
  //           accent = '#1432F5', ink = '#000000', bg = '#ffffff' (hidden-line fill; pass your background)
  //           alpha = 1       ink opacity (the accent is not faded)
  //           detail          0 glyph · 1 standard · 2 close-up (struts, shell wireframe, wall slats);
  //                           default from scale (> 1.4 → 2, > 0.34 → 1, else 0)
  //           aoa = 6         wing angle of attack in degrees (paper Fig. 5: ~16° at 18 m/s → ~0.5° at 36 m/s)
  //           highlight       'shell' | 'wing' | 'turb' | 'wall' | 'bridle' (or 'tether') | null → that part in accent
  //   Pure: touches only ctx (wrapped in save/restore), no DOM, no globals.
  //
  // Site.art.swfTether(ctx, x1, y1, x2, y2, t, opts) → { at(u) → {x, y}, control: {x, y} }
  //   The electricity-conducting tether from the unit's bridle point (x1, y1) down to the ground drum
  //   (x2, y2): one hairline quadratic that bows downwind (+x), with deep-blue energy packets (a 3 px
  //   square + short trail) sliding toward the ground. at(u) samples the curve, u = 0 unit … 1 ground.
  //   opts    sag = 0.07      bow as a fraction of the tether length (+ = toward +x)
  //           ink = '#000000', alpha = 0.8 (line opacity), width = 1, accent = '#1432F5', highlight = false
  //           energy = 0.5    0..1 → number and speed of automatic packets (0 = none)
  //           speed = 0.42    tether lengths per second for automatic packets (scaled by energy)
  //           packets         explicit packet positions [u, …] in 0..1 (overrides the automatic ones)
  //           packetAlpha = 1
  //   Pure, like swfUnit.
  const SiteNS = (window.Site = window.Site || {});
  const ART = (SiteNS.art = SiteNS.art || {});
  const ART_INK = '#000000', ART_BG = '#ffffff', ART_ACCENT = '#1432F5';

  // '#rrggbb' / '#rgb' + alpha → rgba(); anything else is returned unchanged.
  function withAlpha(col, a) {
    if (a >= 0.999) return col;
    let h = String(col || '').trim();
    if (h[0] !== '#') return col;
    h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return col;
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, a).toFixed(3)})`;
  }

  // Side-view frame: origin at deck centre, 100 units = the 15 m deck, y down.
  const KS = 5.6; // side-view units per metre for the turbine cluster (slightly compressed in depth)
  function sideTurb(t) {
    const cx = t.x - PLAN_C[0], dy = t.y - 0.9;
    return { X: dy * KS + cx * KS * 0.5, Y: -cx * KS * 0.2 };
  }
  const TSIDE = TURB.map(sideTurb);
  const WSIDE = WALLS.map(w => w.map(p => sideTurb({ x: p[0], y: p[1] })));
  const TORDER = [1, 3, 2, 0]; // far → near for the painter's algorithm (T4, T3, T2, T1)
  const BRIDLE = { x: -3, y: 52 }; // tether attachment, local units
  const TURB_TOP = 2.2, TURB_H = 26.7 * 0.92; // rotor top (on the deck's underside) and height, local units
  // The deck is an elliptical plate seen slightly from below (as in the paper's render, Fig. 4b): the rotors'
  // generator discs sit on its underside, so nothing floats. DECK_CY/RY: centre and half-depth of the underside.
  const DECK_CY = 1.8, DECK_RY = 9.6, DECK_T = 1.8;
  // bridle feet: the near diffuser wall's lower corner and the lower hubs of T1, T2, T3 (as in the render)
  const BRIDLE_FEET = [[WSIDE[0][1].X, WSIDE[0][1].Y + TURB_TOP + TURB_H]].concat([0, 2, 3].map(k => [TSIDE[k].X, TSIDE[k].Y + TURB_TOP + TURB_H * 0.9]));
  function shellTop(x) { // top of the shell profile at local x (for the wireframe latitudes)
    const t = (x + 50) / 100;
    if (t <= 0 || t >= 1) return 0;
    return -38.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.68)), 0.9);
  }
  function shellPath(ctx, x, y, s) {
    // half-teardrop: blunt nose into the wind (left), long taper to the tail (right)
    ctx.beginPath();
    ctx.moveTo(x - 50 * s, y);
    ctx.bezierCurveTo(x - 52 * s, y - 25 * s, x - 38 * s, y - 38 * s, x - 16 * s, y - 38.5 * s);
    ctx.bezierCurveTo(x + 10 * s, y - 39 * s, x + 36 * s, y - 20 * s, x + 50 * s, y);
    ctx.closePath();
  }
  // bounding box of the stability wing (local units, relative to the deck centre) at angle of attack ang (rad)
  function airfoilBox(ang) {
    const c = Math.cos(ang), sn = Math.sin(ang), chord = 30;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, th = 0.6 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u);
      const cm = u < 0.4 ? (0.04 / 0.16) * (0.8 * u - u * u) : (0.04 / 0.36) * (0.2 + 0.8 * u - u * u);
      for (const py0 of [cm + th, cm - th]) {
        const px = (u - 0.35) * chord, py = -py0 * chord;
        const rx = 6 + px * c - py * sn, ry = -15 + px * sn + py * c;
        x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry);
      }
    }
    return { x0, y0, x1, y1 };
  }
  function airfoilPath(ctx, x, y, s, chord, ang) {
    // NACA-4412-like section (12% thick, 4% camber). The wind blows +x, so the leading edge (left) is raised
    // by ang: a positive angle of attack (canvas y grows down, hence the + rotation).
    const c = Math.cos(ang), sn = Math.sin(ang);
    const thick = u => 0.6 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u);
    const camber = u => (u < 0.4 ? (0.04 / 0.16) * (0.8 * u - u * u) : (0.04 / 0.36) * (0.2 + 0.8 * u - u * u));
    const N = 16;
    ctx.beginPath();
    for (let i = 0; i <= 2 * N; i++) {
      const up = i <= N, u = up ? 1 - i / N : (i - N) / N;
      const py0 = up ? camber(u) + thick(u) : camber(u) - thick(u);
      const px = (u - 0.35) * chord, py = -py0 * chord;
      const rx = px * c - py * sn, ry = px * sn + py * c;
      if (i) ctx.lineTo(x + rx * s, y + ry * s); else ctx.moveTo(x + rx * s, y + ry * s);
    }
    ctx.closePath();
  }
  function artLine(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  // One three-bladed H-Darrieus rotor seen from the side, hanging from the deck's underside: the generator
  // disc on top, three straight blades whose chord foreshortens as they turn (width ∝ |sin θ|), the shaft and
  // the lower struts to the hub (paper render, Fig. 4b). The swept volume is a translucent veil, so a nearer
  // rotor fades (not erases) the lines of the ones behind it.
  function artTurbine(ctx, x, y, s, phase, dir, detail, K, hl, energy) {
    const R = 10 * s, top = y + TURB_TOP * s, H = TURB_H * s, bot = top + H, ry = Math.max(0.8, 2 * s);
    const col = hl ? K.accent : K.ink;
    const faint = a => (hl ? withAlpha(K.accent, Math.min(1, a * 1.5)) : K.faint(a));
    ctx.lineWidth = 1;
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * 0.72;
    ctx.fillStyle = K.bg;
    ctx.beginPath();
    ctx.ellipse(x, top, R, ry, 0, Math.PI, TAU);
    ctx.lineTo(x + R, bot);
    ctx.ellipse(x, bot, R, ry, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = ga;
    const B = [];
    for (let k = 0; k < 3; k++) {
      const a = phase * dir + (k * TAU) / 3, sn = Math.sin(a);
      B.push({ x: x + Math.cos(a) * R, dy: sn * ry, front: sn > 0, w: Math.abs(sn) * 1.1 * s });
    }
    const sy = bot - H * 0.1; // lower strut level
    const ty = top + H * 0.06; // upper strut level (close-up: the rotor is open, hub + spokes, no lid)
    const blade = (b, stroke) => {
      const y0 = (detail >= 2 ? ty - 1.2 * s : top) + b.dy, y1 = bot + b.dy;
      if (detail >= 2 && b.w > 1.6) {
        ctx.fillStyle = K.bg;
        ctx.fillRect(b.x - b.w / 2, y0, b.w, y1 - y0);
        ctx.strokeStyle = stroke;
        ctx.beginPath(); ctx.moveTo(b.x - b.w / 2, y0); ctx.lineTo(b.x - b.w / 2, y1); ctx.lineTo(b.x + b.w / 2, y1); ctx.lineTo(b.x + b.w / 2, y0); ctx.stroke();
      } else { ctx.strokeStyle = stroke; artLine(ctx, b.x, y0, b.x, y1); }
    };
    // back blades and struts (seen through the veil), then the shaft
    if (detail >= 2) { // the swept circle, top and bottom, as a faint dotted guide
      ctx.save(); ctx.setLineDash([1.5, 3]); ctx.strokeStyle = faint(0.3);
      ctx.beginPath(); ctx.ellipse(x, ty, R, ry, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, sy, R, ry, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }
    for (const b of B) if (!b.front) blade(b, faint(detail ? 0.3 : 0.4));
    if (detail >= 1) {
      ctx.strokeStyle = faint(detail >= 2 ? 0.4 : 0.3);
      for (const b of B) if (!b.front) { artLine(ctx, x, sy, b.x, sy + b.dy); if (detail >= 2) artLine(ctx, x, ty, b.x, ty + b.dy); }
      ctx.strokeStyle = faint(detail >= 2 ? 0.6 : 0.4);
      artLine(ctx, x, top, x, sy + (detail >= 2 ? 2 * s : 0));
      ctx.strokeStyle = faint(detail >= 2 ? 0.6 : 0.4);
      for (const b of B) if (b.front) { artLine(ctx, x, sy, b.x, sy + b.dy); if (detail >= 2) artLine(ctx, x, ty, b.x, ty + b.dy); }
    }
    for (const b of B) if (b.front) blade(b, col);
    if (detail >= 2) {
      // direct-drive generator at the hub, bolted to the deck; lower hub
      const glow = energy > 0.01 && !hl ? withAlpha(K.accent, 0.35 + 0.65 * energy) : col;
      const hr = R * 0.26, hh = ty - top + ry * 0.4;
      ctx.fillStyle = K.bg; ctx.strokeStyle = glow;
      ctx.beginPath(); ctx.ellipse(x, top + hh, hr, ry * 0.3, 0, 0, Math.PI); ctx.lineTo(x - hr, top); ctx.lineTo(x + hr, top); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(x - 1.2, sy - 1.2, 2.4, 2.4);
      return;
    }
    // glyph / sky scale: the generator plate on the deck's underside, in ink. It takes the accent only when
    // the unit is highlighted or producing strongly (energy > 0.6), so the blue stays on the energy packets.
    ctx.fillStyle = K.bg;
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.ellipse(x, top, R * 1.04, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const lit = hl ? 0 : sstep(0.6, 0.95, energy);
    if (lit > 0.01) { ctx.strokeStyle = withAlpha(K.accent, lit); ctx.stroke(); }
  }

  ART.swfUnit = function swfUnit(ctx, x, y, s, t, o) {
    o = o || {};
    const ink0 = o.ink || ART_INK, accent = o.accent || ART_ACCENT, bg = o.bg || ART_BG;
    const alpha = o.alpha == null ? 1 : clamp(+o.alpha, 0, 1);
    const hl = o.highlight === 'tether' ? 'bridle' : o.highlight || null;
    const detail = o.detail != null ? o.detail : s > 1.4 ? 2 : s > 0.34 ? 1 : 0;
    const energy = clamp(+o.energy || 0, 0, 1);
    const base = o.phase != null ? +o.phase : (+t || 0) * ((o.rpm == null ? 14 : +o.rpm) / 60) * TAU;
    const ang = ((o.aoa == null ? 6 : +o.aoa) * Math.PI) / 180;
    const K = { ink: withAlpha(ink0, alpha), bg, accent, faint: a => withAlpha(ink0, a * alpha) };
    const bp = { x: x + BRIDLE.x * s, y: y + BRIDLE.y * s };
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    // bridle lines → tether point
    ctx.strokeStyle = hl === 'bridle' ? accent : K.faint(0.55);
    ctx.beginPath();
    for (const p of BRIDLE_FEET) { ctx.moveTo(x + p[0] * s, y + p[1] * s); ctx.lineTo(bp.x, bp.y); }
    ctx.stroke();
    // flotation module: the LTA shell
    shellPath(ctx, x, y, s);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = hl === 'shell' ? accent : K.ink; ctx.stroke();
    if (detail >= 2 || (detail >= 1 && s > 0.6)) {
      ctx.save();
      shellPath(ctx, x, y, s); ctx.clip();
      ctx.strokeStyle = hl === 'shell' ? withAlpha(accent, 0.35) : K.faint(0.16);
      for (const f of detail >= 2 ? [0.25, 0.5, 0.75] : [0.5]) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const lx = -50 + i * 2.5, xx = x + lx * s, yy = y + shellTop(lx) * s * f;
          if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      if (detail >= 2) {
        for (const mx of [-30, -8, 16]) {
          ctx.beginPath();
          ctx.ellipse(x + (mx + 4) * s, y, Math.abs(mx - 44) * 0.18 * s + 6 * s, 38 * s, 0, Math.PI, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // deck: an elliptical plate seen slightly from below (underside + the far rim's thickness)
    const dcy = y + DECK_CY * s, drx = 50 * s, dry = DECK_RY * s, dt = DECK_T * s;
    ctx.beginPath();
    ctx.ellipse(x, dcy - dt, drx, dry, 0, Math.PI, TAU);
    ctx.lineTo(x + drx, dcy);
    ctx.ellipse(x, dcy, drx, dry, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = K.ink; ctx.stroke();
    if (detail >= 1) {
      ctx.strokeStyle = K.faint(0.55);
      ctx.beginPath(); ctx.ellipse(x, dcy, drx, dry, 0, Math.PI, TAU); ctx.stroke();
    }
    // stability module: lift wing section at its angle of attack
    airfoilPath(ctx, x + 6 * s, y - 15 * s, s, 30, ang);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = hl === 'wing' ? accent : K.ink; ctx.stroke();
    // diffuser walls (the far one faint, behind the rotors), turbines far → near, near wall in front of T1.
    // A wall's top edge follows the deck's underside so it hangs from the plate.
    const under = X => dcy + dry * Math.sqrt(Math.max(0, 1 - (X * s / drx) * (X * s / drx)));
    const wall = (wi, far) => {
      const w = WSIDE[wi];
      const ax = x + w[0].X * s, bx = x + w[1].X * s;
      const aT = Math.min(y + (w[0].Y + 0.5) * s, under(w[0].X) - 0.3 * s), bT = Math.min(y + (w[1].Y + 0.5) * s, under(w[1].X) - 0.3 * s);
      const aB = y + (w[0].Y + TURB_TOP) * s + TURB_H * s, bB = y + (w[1].Y + TURB_TOP) * s + TURB_H * s;
      const whl = hl === 'wall';
      ctx.beginPath();
      ctx.moveTo(ax, aT); ctx.lineTo(bx, bT); ctx.lineTo(bx, bB); ctx.lineTo(ax, aB); ctx.closePath();
      const ga = ctx.globalAlpha;
      // close-up: an opaque plate; sky scale: a translucent veil with a lighter hairline (a thin wall, not a slab)
      if (far || detail < 2) ctx.globalAlpha = ga * (far ? 0.72 : 0.6);
      ctx.fillStyle = bg; ctx.fill();
      ctx.globalAlpha = ga;
      ctx.strokeStyle = whl ? accent : far ? K.faint(detail < 2 ? 0.35 : 0.45) : detail < 2 ? K.faint(0.62) : K.ink; ctx.stroke();
      if (detail >= 2) {
        ctx.strokeStyle = whl ? withAlpha(accent, 0.4) : K.faint(far ? 0.1 : 0.16);
        for (let k = 1; k < 6; k++) { const f = k / 6; artLine(ctx, ax, lerp(aT, aB, f), bx, lerp(bT, bB, f)); }
      }
    };
    wall(1, true);
    for (const k of TORDER) {
      const p = TSIDE[k];
      artTurbine(ctx, x + p.X * s, y + p.Y * s, s, base + k * 1.3, TURB[k].dir, detail, K, hl === 'turb', energy);
    }
    wall(0, false);
    // bridle node: where the power leaves the unit
    if (energy > 0.01) {
      const r = 1.2 + 1.3 * energy;
      ctx.fillStyle = accent;
      ctx.fillRect(bp.x - r, bp.y - r, 2 * r, 2 * r);
    }
    ctx.restore();
    return bp;
  };
  // Local-unit extent of the drawing (multiply by scale): callers size and attach tethers from these.
  ART.swfUnit.extent = { halfW: 50, top: -39, bottom: 52, bridle: { x: BRIDLE.x, y: BRIDLE.y } };

  function tetherCurve(x1, y1, x2, y2, sag) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    return { a: { x: x1, y: y1 }, c: { x: (x1 + x2) / 2 + sag * len, y: (y1 + y2) / 2 }, b: { x: x2, y: y2 }, len };
  }
  const qpt = (T, u) => ({
    x: (1 - u) * (1 - u) * T.a.x + 2 * (1 - u) * u * T.c.x + u * u * T.b.x,
    y: (1 - u) * (1 - u) * T.a.y + 2 * (1 - u) * u * T.c.y + u * u * T.b.y,
  });

  ART.swfTether = function swfTether(ctx, x1, y1, x2, y2, t, o) {
    o = o || {};
    const T = tetherCurve(x1, y1, x2, y2, o.sag == null ? 0.07 : +o.sag);
    const ink0 = o.ink || ART_INK, accent = o.accent || ART_ACCENT;
    const alpha = o.alpha == null ? 0.8 : clamp(+o.alpha, 0, 1);
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineWidth = o.width || 1;
    ctx.strokeStyle = o.highlight ? accent : withAlpha(ink0, alpha);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(T.c.x, T.c.y, x2, y2); ctx.stroke();
    let pk = o.packets;
    if (!pk) {
      pk = [];
      const e = clamp(o.energy == null ? 0.5 : +o.energy, 0, 1);
      if (e > 0.001) {
        const n = Math.max(1, Math.round(1 + e * 5));
        const sp = (o.speed == null ? 0.42 : +o.speed) * (0.6 + 0.8 * e);
        for (let k = 0; k < n; k++) pk.push(((((+t || 0) * sp + k / n) % 1) + 1) % 1);
      }
    }
    const pa = o.packetAlpha == null ? 1 : clamp(+o.packetAlpha, 0, 1);
    if (pk.length && pa > 0.001) {
      const ga = ctx.globalAlpha;
      ctx.fillStyle = accent;
      ctx.strokeStyle = withAlpha(accent, 0.5);
      for (const u of pk) {
        const q = qpt(T, u), q2 = qpt(T, Math.max(0, u - 0.035));
        ctx.globalAlpha = ga * pa * sstep(0, 0.06, u) * (1 - sstep(0.975, 1, u));
        artLine(ctx, q2.x, q2.y, q.x, q.y);
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
      }
    }
    ctx.restore();
    return { at: u => qpt(T, u), control: T.c };
  };

  Site.register({
    id: 'skywindfarm',
    n: 4,
    title: 'SkyWindFarm',
    path: '/skywindfarm',
    caption: 'Wind power grows with the cube of its\nspeed, and wind grows with height.\nSkyWindFarm tethers turbines at 3 km.',

    create(el, api) {
      const C = api.colors;
      const MONO = api.fonts.mono, SERIF = api.fonts.serif;
      const REDUCED = !!api.reduced;

      /* ---------------------------------------------------------------- DOM */
      const style = document.createElement('style');
      style.textContent = `
        .scene--skywindfarm { cursor: crosshair; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .scene--skywindfarm .swf-hits { position: absolute; inset: 0; pointer-events: none; }
        .scene--skywindfarm .swf-hit { position: absolute; left: 0; top: 0; pointer-events: auto; outline: none; transform-origin: 0 0; -webkit-tap-highlight-color: transparent; }
        .scene--skywindfarm .swf-hit[hidden] { display: none; }
        .scene--skywindfarm .swf-hit:focus-visible { outline: 1px dashed var(--accent); outline-offset: 2px; }
        .scene--skywindfarm .swf-mnav { display: none; position: absolute; left: 50%; top: 46px; transform: translateX(-50%);
          align-items: center; gap: 0; font-family: var(--mono); font-size: 12px; line-height: 15px; letter-spacing: .02em; white-space: nowrap; z-index: 2; }
        .scene--skywindfarm .swf-mnav button { min-width: 44px; min-height: 44px; padding: 12px 14px; color: var(--ink);
          display: inline-flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
        .scene--skywindfarm .swf-mnav button:active { color: var(--accent); }
        .scene--skywindfarm .swf-mnav .t { position: relative; min-width: 264px; padding: 12px 8px; text-align: center; font-variant-numeric: tabular-nums; color: #555; }
        .scene--skywindfarm .swf-mnav .pg { position: absolute; left: 50%; bottom: 8px; width: 64px; height: 1px; margin-left: -32px; background: var(--g300); }
        .scene--skywindfarm .swf-mnav .pg i { position: absolute; inset: 0; background: #000; transform-origin: 0 0; transform: scaleX(0); }
        .scene--skywindfarm .swf-mnav .t.is-paused .pg i { background: var(--g500); }
        @media (max-width: 800px) { .scene--skywindfarm .swf-mnav { display: flex; } }
        .scene--skywindfarm .swf-tex { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .scene--skywindfarm .swf-tx { position: absolute; left: 0; top: 0; white-space: nowrap; color: #000; line-height: 1;
          opacity: 0; visibility: hidden; will-change: transform, opacity; }
        .scene--skywindfarm .swf-tx .katex { font-size: 1em; line-height: 1.15; }
        .scene--skywindfarm .swf-tx.is-accent { color: var(--accent); }
        .scene--skywindfarm .swf-tx.is-sec { color: #444; }
        .scene--skywindfarm .swf-hlm { display: block !important; visibility: hidden !important; pointer-events: none; }
        .scene--skywindfarm .swf-hlm .w, .scene--skywindfarm .swf-hlm .katex { display: inline-block; }
      `;
      el.append(style);

      const cv = api.canvas();
      const ctx = cv.ctx;
      const texLayer = document.createElement('div');
      texLayer.className = 'swf-tex';
      el.append(texLayer);
      const hitLayer = document.createElement('div');
      hitLayer.className = 'swf-hits';
      el.append(hitLayer);

      /* ---------------------------------------------------------------- context headline (core) */
      // Each step's point is said in core's shared context headline (api.headline): big serif text centred at the top
      // that stays until the step changes; the art is laid out under it. A hidden copy with the headline's own classes
      // measures all six steps' text up front (L.hbS), so the layout is known for every step and never jumps when the
      // words change. api.onHeadline re-checks against the live headline (web fonts, KaTeX) and re-lays out if needed.
      const hlm = document.createElement('div');
      hlm.className = 'headline-group has-text swf-hlm';
      hlm.setAttribute('aria-hidden', 'true');
      el.append(hlm);
      const escHTML = s => { const d = document.createElement('span'); d.textContent = s; return d.innerHTML; };
      // the same markup core builds (words as inline-blocks, $…$ through KaTeX), so it wraps identically
      function hlHTML(s) {
        return String(s).split(/(\$[^$]+\$)/g).map(seg => {
          if (seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$') {
            try { return SiteNS.texHTML ? SiteNS.texHTML(seg.slice(1, -1)) : escHTML(seg.slice(1, -1)); } catch (e) { return escHTML(seg); }
          }
          return escHTML(seg).split(/(\s+)/).map(w => (/^\s+$/.test(w) || !w ? w : `<span class="w">${w}</span>`)).join('');
        }).join('');
      }
      function measureHeadline(head, sub) {
        hlm.innerHTML = `<p class="hl-title">${hlHTML(head)}</p>` + (sub ? `<p class="hl-sub">${hlHTML(sub)}</p>` : '');
        const r = hlm.getBoundingClientRect(), r0 = el.getBoundingClientRect();
        if (r.width > 4) L.hlRight = Math.round(r.right - r0.left);
        return r.height > 4 ? Math.round(r.bottom - r0.top) : 0;
      }
      // (the live group, for the hover target and the fluid knockout; read only)
      let hlEl = null;
      const hlGroup = () => hlEl || (hlEl = document.querySelector('.headline-group[data-scene="skywindfarm"]'));

      /* ---------------------------------------------------------------- KaTeX overlays */
      // Formulas are typeset by KaTeX (api.tex) in absolutely-positioned HTML over the canvas. Each frame a
      // draw function calls place(x, y, alpha, align); anything not placed in a frame fades out.
      let texFrame = 0;
      const TEX = {};
      function mkTex(id, latex, o) {
        o = o || {};
        const d = document.createElement('div');
        d.className = 'swf-tx' + (o.accent ? ' is-accent' : o.sec ? ' is-sec' : '');
        d.style.fontSize = (o.size || 16) + 'px';
        texLayer.append(d);
        const T = { el: d, latex: '', size: o.size || 16, w: 0, h: 0, k: '', a: -1, frame: -1, fallback: o.fallback || '', lastSet: -1 };
        T.set = (lx, force) => {
          if (lx === T.latex && !force) return;
          T.latex = lx;
          api.tex(d, lx, { display: false, fallback: T.fallback || lx });
          T.w = 0; // re-measure lazily
        };
        T.size_ = px => { if (px !== T.size) { T.size = px; d.style.fontSize = px + 'px'; T.w = 0; } };
        T.accent_ = on => { on = !!on; if (on !== T.acc) { T.acc = on; d.classList.toggle('is-accent', on); } };
        // x, y: anchor (top of the formula box); align: 'left' | 'right' | 'center'
        T.place = (x, y, a, align) => {
          T.frame = texFrame;
          if (!T.w && a > 0.001) { T.w = d.offsetWidth || T.w; T.h = d.offsetHeight || T.h; }
          const ox = align === 'right' ? T.w : align === 'center' ? T.w / 2 : 0;
          const k = `${Math.round(x - ox)},${Math.round(y)}`;
          if (k !== T.k) { T.k = k; d.style.transform = `translate3d(${Math.round(x - ox)}px, ${Math.round(y)}px, 0)`; }
          T.alpha(a);
        };
        T.alpha = a => {
          a = a < 0.01 ? 0 : a > 0.99 ? 1 : Math.round(a * 50) / 50;
          if (a === T.a) return;
          T.a = a;
          d.style.opacity = String(a);
          d.style.visibility = a > 0 ? 'visible' : 'hidden';
        };
        T.set(latex, true);
        TEX[id] = T;
        return T;
      }
      function texEndFrame() {
        for (const id in TEX) if (TEX[id].frame !== texFrame) TEX[id].alpha(0);
        texFrame++;
      }
      mkTex('hero', 'P/A = \\tfrac{1}{2}\\,\\rho\\,v^{3}', { size: 34, fallback: 'P/A = ½ρv³' });
      mkTex('shear', 'v(h) = v_{\\mathrm{ref}}\\,(h/h_{\\mathrm{ref}})^{\\alpha},\\;\\; \\alpha \\approx 1/7', { size: 15, sec: true, fallback: 'v(h) = v_ref (h/h_ref)^α, α ≈ 1/7' });
      mkTex('unitP', 'P = \\tfrac{1}{2}\\,\\rho\\,v^{3}\\,C_p\\,A\\,N', { size: 20, fallback: 'P = ½ρv³ Cp A N' });
      mkTex('unitSub', '= \\tfrac{1}{2}\\,(0.8)(26.7)^{3}(0.43)(12)(4)', { size: 15, sec: true });
      mkTex('blow', '\\delta = \\arctan(F_d/F_l) \\approx 16^{\\circ}', { size: 15, fallback: 'δ = arctan(Fd/Fl) ≈ 16°' });
      mkTex('blowS', '\\delta \\approx 16^{\\circ}', { size: 15, fallback: 'δ ≈ 16°' });
      mkTex('lift', 'F = V g\\,(\\rho_{\\mathrm{air}} - \\rho_{\\mathrm{He}})', { size: 15, sec: true, fallback: 'F = Vg(ρair − ρHe)' });
      // once the web fonts are in, re-measure KaTeX boxes, the headlines and chart labels
      try { document.fonts && document.fonts.ready.then(() => { for (const id in TEX) TEX[id].w = 0; if (L.W) layout(); }); } catch (e) { /* ok */ }
      mkTex('cp', 'C_p', { size: 14, fallback: 'Cp' });
      mkTex('hdi', '\\mathrm{HDI} = -0.018 + 0.196\\,\\log_{10}\\mathrm{kWh}', { size: 14, sec: true, fallback: 'HDI = −0.018 + 0.196 log10 kWh' });

      // mobile step navigation (the core stepper is hidden < 800px): ‹ 01 / 06 · Step › with the shared header's
      // progress hairline under the label; tapping the label pauses / resumes. The label keeps one width (its min-width
      // fits the longest, "05 / 06 · Tethered power · paused"), so the ‹ › targets never move under a finger. (The
      // scene's links are in core's [M] menu on phones, "On this page".)
      const mnav = document.createElement('div');
      mnav.className = 'swf-mnav';
      const mPrev = document.createElement('button'); mPrev.type = 'button'; mPrev.textContent = '‹'; mPrev.setAttribute('aria-label', 'Previous step');
      const mNext = document.createElement('button'); mNext.type = 'button'; mNext.textContent = '›'; mNext.setAttribute('aria-label', 'Next step');
      const mLab = document.createElement('button'); mLab.type = 'button'; mLab.className = 't';
      const mTxt = document.createElement('span');
      const mPg = document.createElement('span'); mPg.className = 'pg';
      const mPgI = document.createElement('i'); mPg.append(mPgI);
      mLab.append(mTxt, mPg);
      let mPgK = -1;
      mnav.append(mPrev, mLab, mNext);
      el.append(mnav);
      mPrev.addEventListener('click', e => { e.stopPropagation(); ui('tick'); goStep(S.step - 1, true); });
      mNext.addEventListener('click', e => { e.stopPropagation(); ui('tick'); goStep(S.step + 1, true); });
      mLab.addEventListener('click', e => { e.stopPropagation(); ui('tick'); togglePause(); });
      ['pointerdown', 'touchstart', 'touchend'].forEach(ev => mnav.addEventListener(ev, e => e.stopPropagation(), { passive: true }));

      /* ---------------------------------------------------------------- state */
      const S = {
        step: 0, stepT: 0, T: 0, A: 0, paused: false, lastInteract: -1e9, hovering: 0,
        base: V_DESIGN, gust: 0, v: V_DESIGN, vs: V_DESIGN,
        sweep: null, cubeFlags: { a: false, b: false }, prevV: V_DESIGN,
        zoomLin: 0, zoom: 0,
        launchLin: [0, 0, 0], launch: [0, 0, 0],
        rot: [0, 0.7, 1.9], // rotor angle per unit (rad); per-turbine offsets are added inside Site.art.swfUnit
        vis: {}, hlT0: 0, hlN: 0, hlK: 0, hlGap: 0.09, playT: 0,
        chartT0: 0, dotsShown: 0, hintShown: false, entered: false,
        detune: 0.04, focusV: V_DESIGN, probeBin: -1, rowFlags: 0,
        win: 1,         // smoothed operating-window factor (18–33 m/s): rotors, packets and the hum follow it
        flowUntil: -1,  // paused + stepped: the fluid keeps flowing through the transition until S.A reaches this
      };
      for (const k in VIS) S.vis[k] = VIS[k][0];
      const ptr = { in: false, down: false, x: 0, y: 0, x0: 0, base0: 0, t0: 0, id: -1, moved: 0, type: 'mouse' };
      const jet = { x: 0, y: 0, a: 0, s2: 60 * 60 };
      let hoverId = null;
      let hoverDot = -1;
      let hdHover = false; // pointer on the desktop step counter (click: pause / play)

      /* ---------------------------------------------------------------- layout */
      const L = {};
      let NLUT = new Float32Array(1), ULUT = new Float32Array(1);

      // Three layout tiers. m: phones (< 800 px, core compacts its chrome). c: compact, 800–1240 px or a
      // portrait tablet (the desktop composition does not fit; narrower right column, no plan view, the step-4
      // formula under the drawing). Otherwise the full desktop layout.
      function layout() {
        const W = cv.w, H = cv.h, m = W < 800, c = !m && (W < 1240 || W / H < 1.05);
        const W0 = L.W, H0 = L.H;
        L.W = W; L.H = H; L.m = m; L.c = c;
        L.pt = c && W / H < 1.05; // portrait tablet
        // phones: core stacks the slider above the 3-line caption (controls ≈ 68 px tall, bottom 116 px) and its hint
        // (the sound invite before the first tap, then the scene's gust hint) just above the controls: bottom edge at
        // hint.style.bottom (≈ 194 px up), up to two lines (34 px) tall, on a white backing. L.ctrlTop is that band's
        // top: on every step the scene's lowest text (the ground's axis labels and "grid →", the cubic chart's source
        // line, the step-4 formula) ends ≥ 8 px above it, so the hint never covers the art.
        L.ctrlTop = m ? Math.round(H - hintBottom() - 34) : H;
        L.ground = m ? L.ctrlTop - 30 : H - 150;
        // the context headline's bottom for every step (L.hbS); the art of step i starts at artTop(i) (+ 20 px)
        measureHeadlines();
        // phones: the 3 km units hang below the top-left callouts (lift in step 3, power in step 5, each placed
        // under its step's headline); a short phone lowers the top of the sky rather than letting a callout sit on
        // the units. Desktop: the sky (and the fluid's white fade) starts under the tallest headline.
        L.short = m && L.ground - H * 0.25 < 330;
        L.us = m ? (L.short ? 0.42 : 0.46) : 0;
        if (m) {
          // (short phones: the step-5 callout's cost row carries its source, one row shorter)
          const K = Math.max(artTop(4) + (L.short ? 76 : 92), artTop(2) + 58, artTop(1));
          L.top = Math.round(Math.max(H * 0.25, (7 / 6) * (K + 39 * L.us) - L.ground / 6));
        } else L.top = Math.max(126, L.hbMax + 20);
        L.axisX = m ? 50 : Math.round(clamp(W * 0.235, 300, 380));
        // (the right-hand column ends on the chrome's 40 px gutter, like the step counter above it)
        L.rcolW = c ? 216 : 232;
        L.rcolX = W - 40 - L.rcolW;
        // wind-speed scale of the profile (px per m/s): wide in step 2, where the profile is the hero (≈ 30% of
        // the width), a narrow ghost by the axis in steps 3 and 5 (kvNow() blends them with the step-2 layer)
        if (m) { L.kvW = clamp((W - 250) / V_MAX, 2.3, 3.6); L.kvG = L.kvW * 0.8; }
        else {
          L.kvW = clamp(Math.min(W * 0.0097, (W - 40 - TAB_W - 30 - L.axisX) / V_MAX), 3.4, 14);
          L.kvG = clamp((W * 0.11) / V_MAX, 3, 4.4);
        }
        L.pxs = m ? 2.5 : 4.2;
        L.colX = Math.round(L.axisX + L.kvW * V_MAX + 30); // shear table column (clear of the profile at 36 m/s)
        // ground station: the unit fan's centre of mass sits at ≈ 52–58% of the width
        // (portrait tablets: a little left, so the tethers pass left of the text column in the lower half)
        L.gx = Math.round(W * (m ? 0.42 : L.pt ? 0.47 : c ? 0.54 : 0.52));
        // unit scale follows the sky's height so the three units never overlap at short viewports
        if (!m) L.us = clamp((0.82 * (L.ground - L.top)) / 560, 0.6, 0.82);
        // the unit fan stays left of the right-hand text column (portrait: the column sits below the units)
        L.uxMax = m ? W - 10 : L.pt ? W - 16 : L.rcolX - 16;
        L.gs = m ? 0.6 : 1;
        // a short sky (under the headline on a short window, or on a short phone) packs the units close in height, so
        // the fan widens (fanAng) and, where neighbouring units would still touch, they shrink until each keeps ≥ 8 px
        // of clear sky (short phones: down to 0.34)
        const usMin = m && L.short ? 0.34 : m ? 0.4 : 0.42;
        for (let k = 0; k < 16 && L.us > usMin && unitGap() < 8; k++) L.us = Math.max(usMin, L.us * 0.95);
        // the blowdown angle (step 3) is drawn on the unit whose tether leans closest to the paper's 16°
        L.blowU = [0, 1, 2].reduce((b, i) => (Math.abs(fanAng(i) - 16) < Math.abs(fanAng(b) - 16) ? i : b), 1);
        L.xMin = m ? -10 : L.axisX - 90;
        // shared header (all scenes): the step counter sits top-right on the chrome's 40 px gutter (baseline 83,
        // top ≈ 72), beside the context headline; phones: the step nav (44 px targets) sits under the wordmark and
        // the headline under the nav
        L.hdR = W - 40; L.hdY = 83; L.hdW = 190;
        // (where the longest "05 / 06 · Tethered power" would reach the headline's right edge, a portrait tablet,
        // the counter drops the step's name: the stepper on the left shows it)
        L.hdShort = !m && L.hdR - Math.max.apply(null, STEPS.map((s, i) => textW(stepLabel(i, false)))) < (L.hlRight || 0) + 14;
        // top of the right-hand text column for each step (its first baseline): under that step's headline;
        // portrait tablets: the lower half of the sky, under the units and right of the tethers
        const rc0 = L.pt ? Math.round(H * 0.6) : c ? 150 : 146;
        L.rcolYS = STEPS.map((s, i) => Math.max(rc0, artTop(i) + 14));
        // step 1 (the cubic-law chart): its title ("power density", 12 px above the plot) under the headline;
        // phones: the hero's x-axis title and the band's source line (≈ 62 px under the plot) stay ≥ 10 px above
        // the hint band (L.ctrlTop)
        if (m) {
          const hy = Math.max(198, artTop(0) + 28), room = L.ctrlTop - 72 - hy;
          L.hero = { x: 58, y: hy, w: W - 58 - 26, h: Math.max(120, Math.min(330, room)) };
        } else if (L.pt) {
          // portrait tablets: the chart takes the width right of the control column (x ≥ 290) to the 40 px gutter, and
          // a matching height (its axis title ends ≥ 24 px above the ground)
          const hx = 290, hw = W - 40 - hx, hy = Math.max(Math.round(H * 0.27), artTop(0) + 34);
          L.hero = { x: hx, y: hy, w: hw, h: Math.round(Math.max(120, Math.min(hw * 0.95, H - hy - 175, L.ground - 24 - 40 - hy))) };
        } else {
          const hx = Math.round(Math.max(L.axisX + 90, W * 0.31)), hw = Math.round(Math.min(W * 0.47, W - 40 - hx));
          const hy = Math.max(Math.round(H * 0.27), artTop(0) + 34);
          L.hero = { x: hx, y: hy, w: hw, h: Math.round(Math.min(H * 0.42, H - hy - 175)) };
        }
        // step 6 (the HDI chart): its title ("Human Development Index", 16 px above the plot) under the headline
        if (m) {
          const cy0 = Math.max(180, artTop(5) + 30);
          // (its axis title and two source lines, ≈ 72 px under the plot, end ≥ 10 px above the hint band; the two
          // fossil-reserve lines that join them later, ≈ 112 px under it, only where the plot keeps ≥ 220 px)
          const hF = Math.min(380, L.ctrlTop - 121 - cy0);
          L.chartFossil = hF >= 220;
          L.chart = { x: 52, y: cy0, w: W - 52 - 24, h: Math.max(120, L.chartFossil ? hF : Math.min(380, L.ctrlTop - 86 - cy0)) };
        } else if (c) {
          const cx0 = Math.round(Math.max(296, W * 0.29)), cy0 = Math.max(150, artTop(5) + 32);
          L.chart = { x: cx0, y: cy0, w: W - 48 - cx0, h: Math.round(Math.min(H - cy0 - 262, L.pt ? 560 : 1e9)) };
        } else {
          const cx0 = Math.round(Math.max(L.axisX + 80, W * 0.29)), cy0 = Math.max(150, artTop(5) + 32);
          L.chart = { x: cx0, y: cy0, w: W - 130 - cx0, h: Math.round(H - cy0 - (H < 800 ? 222 : 215)) };
        }
        // close-up (step 4). Desktop/compact: callouts left and right of the unit; their left edge stays right
        // of the control column (x ≥ 290). Portrait tablets and phones: callouts above and below the unit.
        if (m) {
          // phones, top to bottom: the headline, two callouts, the unit, two callouts, the formula block, and
          // ≥ 12 px above the slider. Full: 2-line callouts under the bridle and the 3-line formula. Short phones:
          // the lower callouts become titles beside the bridle and the formula drops its TSR line (the caption
          // carries it).
          L.stack = true; L.cx = Math.round(W * 0.5);
          const s0 = Math.min(2.3, ((W - 32) / 100) * 0.66);
          // first baseline of the top callouts (under the headline) and their lower edge (2 lines)
          L.mTopBase = artTop(3) + 14;
          const topBot = L.mTopBase + 20;
          // (the full layout keeps its text and trades unit size first: down to 1.75, then the short layout)
          const fyFull = L.ctrlTop - 12 - 40, sFit = Math.min(s0, (fyFull - topBot - 60) / 115);
          L.mShort = sFit < 1.75;
          if (!L.mShort) {
            const yMin = topBot + 8 + 39 * sFit, yMax = fyFull - 52 - 76 * sFit;
            L.cs = sFit; L.fy = fyFull; L.cy = Math.round(clamp(H * 0.44, yMin, yMax));
          } else {
            L.fy = L.ctrlTop - 12 - 22;
            const room = L.fy - 26 - 6 - 4 - (topBot + 8);
            L.cs = clamp(room / 89, 1.4, s0);
            L.cy = Math.round(topBot + 8 + 39 * L.cs);
          }
        } else {
          // the control column is x < 250 below 1100 px wide (x < 280 above)
          const x0 = W < 1100 ? 266 : 296, labW = 190, gap = 32, right = c ? W - 40 : L.rcolX - 24;
          const avail = right - x0 - 2 * (labW + gap);
          L.cx0 = x0; L.labW = labW; L.labGap = gap;
          L.stack = avail < 240;
          // landscape compact windows too narrow for the roomy side layout: narrower callout columns and a
          // smaller unit rather than stacking (a short window has no room above and below)
          const avail2 = right - x0 - 2 * (180 + 20);
          // side layouts: the top callouts (shell, wing: 48 local units above the deck, 14 px text ascent) start
          // under the headline, and the lowest text stays clear of the bottom chrome: the bridle label (52 units +
          // 84 px below the deck; compact: the formula block, 52 units + 60 px below, ending ≥ 118 px above the
          // bottom) and the diffuser-wall callout (62 units + 52 px; it ends above the caption's top, ≈ 120 px up,
          // so the two never read as one line). The unit shrinks when they do not all fit at the width's scale.
          const top4 = artTop(3) + 14, bot4 = c ? H - 118 - 60 : H - 80 - 84, wall4 = H - 120 - 52;
          const fitS = s => Math.max(1.4, Math.min(s, (bot4 - top4) / 100, (wall4 - top4) / 110));
          const fitY = s => {
            const lo = top4 + 48 * s, hi = Math.min(bot4 - 52 * s, wall4 - 62 * s);
            return Math.round(clamp(H * 0.47, lo, Math.max(lo, hi)));
          };
          if (L.stack && !L.pt && avail2 >= 160) {
            L.stack = false; L.labW = 180; L.labGap = 20;
            const s4 = fitS(clamp(avail2 / 100, 1.6, 2.4));
            L.cs = s4;
            L.cx = Math.round(x0 + 200 + 50 * s4 + Math.max(0, (avail2 - 100 * s4) / 2));
            L.cy = fitY(s4);
          } else if (L.stack) {
            // room for the callouts above (≈ 82 px, under the headline) and below (≈ 90 px + the formula) the unit
            const cTop = top4 + 82;
            L.cs = clamp(Math.min(((right - x0) / 100) * 0.8, (H - cTop - 210) / 91), 1.6, 3.6);
            L.cx = Math.round((x0 + right) / 2); L.cy = Math.round(cTop + 39 * L.cs);
          } else {
            const s4 = fitS(clamp(avail / 100, 2.4, 4.2));
            L.cs = s4;
            L.cx = Math.round(x0 + labW + gap + 50 * s4 + Math.max(0, (avail - 100 * s4) / 2));
            L.cy = fitY(s4);
          }
        }
        // (the plan's title sits ≥ 30 px under the formula block above it: rcolY − 16 … rcolY + 130)
        // (and it shrinks, ≥ 110 px, so its three readout lines, ≈ 82 px under it, end ≥ 24 px above the bottom-right
        // links, top ≈ H − 106, and the column never reads as one stack with them; where even the smallest plan
        // would not leave that gap, the "rotor … rpm" line goes)
        if (m || c) L.plan = null;
        else {
          const py = Math.round(Math.max(H * 0.42, L.rcolYS[3] + 164)), hFull = H - 212 - py, rpm = hFull >= 110;
          L.plan = { x: L.rcolX, y: py, w: 232, h: Math.round(clamp(rpm ? hFull : H - 196 - py, 100, 170)), rpm };
        }
        // shear LUT: normalized v(y)/26.7 for every pixel row
        const n = Math.max(2, Math.ceil(H) + 2);
        NLUT = new Float32Array(n); ULUT = new Float32Array(n);
        for (let y = 0; y < n; y++) NLUT[y] = vProfile(clamp(altOf(y), 0, 4000)) / V_DESIGN;
        buildGrid();
        buildChart();
        // a resize keeps the flow (tracers and streaks are rescaled); only a tier change reseeds it
        seedFluid(!W0 || m !== (W0 < 800), W0 ? W / W0 : 1, H0 ? H / H0 : 1);
      }
      // The art of step i starts 20 px under that step's headline (CONTRACT, Round 4).
      const artTop = i => (L.hbS ? L.hbS[i] : 150) + 20;
      // phones: how far up core's hint ends (its inline bottom, set by core's mobile stack; read-only here)
      function hintBottom() {
        try {
          const e = document.getElementById('hint'), b = e ? parseFloat(e.style.bottom) : NaN;
          return b > 60 && b < 400 ? b : 194;
        } catch (e) { return 194; }
      }
      // Every step's headline block, measured (bottom edge, px) with its full sub, its one-line short sub and its
      // title alone. The full sub stays where the art keeps enough room under the tallest headline; a short window
      // (or a short phone) gets the short sub, and only where even that does not fit does each step show its title
      // alone (the caption, bottom left, still carries the details). One variant for all six steps, so the layout
      // never jumps between them. Phones: the headline sits under the step nav (api.headlineTop).
      let hlCache = null;
      function measureHeadlines() {
        const m = L.m;
        const hlTop = m ? 94 : null;
        if (hlTop !== L.hlTop) { L.hlTop = hlTop; api.headlineTop(hlTop); }
        hlm.style.top = m ? hlTop + 'px' : '';
        // (the blocks' heights depend on the width, the tier, the web fonts and KaTeX, never on the height)
        const key = `${L.W}|${m}|${document.fonts ? document.fonts.status : ''}|${!!window.katex}`;
        if (!hlCache || hlCache.key !== key) {
          hlCache = { key, full: STEPS.map(s => measureHeadline(s.head, s.sub)), short: STEPS.map(s => measureHeadline(s.head, s.short)),
            bare: STEPS.map(s => measureHeadline(s.head, null)), right: L.hlRight };
          hlm.textContent = '';
        }
        const { full, short, bare } = hlCache;
        L.hlRight = hlCache.right;
        const fb = api.headlineBottom() || (m ? 170 : 160);
        const floor = m ? L.ctrlTop : L.ground;
        const room = v => floor - Math.max.apply(null, v) - 20;
        const hv = room(full) >= (m ? 330 : 320) ? 'full' : room(short) >= (m ? 225 : 290) ? 'short' : 'bare';
        const hb = (hv === 'full' ? full : hv === 'short' ? short : bare).map(b => b || fb);
        const changed = L.hlVar !== hv;
        L.hlVar = hv; L.sub = hv === 'full'; L.hbS = hb; L.hbMax = Math.max.apply(null, hb);
        if (changed && L.ready) applyHeadline(false);
      }
      const subOf = st => (L.hlVar === 'full' ? st.sub : L.hlVar === 'short' ? st.short : null);
      function applyHeadline(fromStep) {
        const st = STEPS[S.step];
        api.headline(st.head, subOf(st), { key: st.id + ':' + L.hlVar });
        if (!fromStep) return;
        // the words fade in one by one (core): a few soft keystrokes under them, like the typed line they replace
        const words = (st.head + ' ' + (subOf(st) || '')).split(/\s+/).filter(Boolean).length;
        const D = Math.min(words * 0.022, 0.9) + 0.25;
        S.hlN = REDUCED ? 0 : clamp(Math.round(D / 0.09), 3, 9); S.hlK = 0; S.hlGap = D / Math.max(1, S.hlN); S.hlT0 = S.A;
      }
      // the live headline's box (read once per change, never per frame): floating labels keep clear of it, and in
      // step 4 its sub is a hover target ("my high-school design" → the earlier prototypes)
      // (Read right after the text changes, while core's words still sit in their fade-in start state, shifted 5 px
      // down: vertical extents come from the paragraph's box and the words' offsets, which ignore those transforms.)
      function readHeadlineBox() {
        const g = hlGroup();
        L.hlBox = null; L.hlSubBox = null; L.hlCue = null;
        if (!g || !g.classList.contains('has-text')) return;
        const r0 = el.getBoundingClientRect(), r = g.getBoundingClientRect();
        if (r.height < 4) return;
        L.hlBox = { x: r.left - r0.left - 6, y: r.top - r0.top - 4, w: r.width + 12, h: r.height + 8 };
        const sEl = g.querySelector('.hl-sub');
        if (!sEl) return;
        // the text's own horizontal extent (a centred line is narrower than its paragraph)
        const rg = document.createRange();
        rg.selectNodeContents(sEl);
        const rr = rg.getBoundingClientRect(), pr = sEl.getBoundingClientRect();
        L.hlSubBox = { x: rr.left - r0.left - 6, y: pr.top - r0.top - 3, w: rr.width + 12, h: pr.height + 6 };
        // step 4's hover cue: a dotted underline under the words before the sub's first colon ("My high-school design")
        const ws = Array.from(sEl.querySelectorAll('.w'));
        const k = ws.findIndex(w => /:$/.test(w.textContent));
        if (k < 0 || k > 5 || !ws[0].firstChild || !ws[k].firstChild) return;
        const t0 = ws[0].firstChild, t1 = ws[k].firstChild;
        const rc = document.createRange();
        rc.setStart(t0, 0); rc.setEnd(t1, Math.max(0, t1.textContent.length - 1));
        const cr = rc.getBoundingClientRect();
        const w0 = ws[0], gTop = r.top - r0.top; // (the group is the words' offsetParent)
        if (w0.offsetParent !== g || cr.width < 4) return;
        L.hlCue = { x0: cr.left - r0.left, x1: cr.right - r0.left, y: gTop + w0.offsetTop + w0.offsetHeight };
      }
      const yOf = h => L.ground - (h / ALT_MAX) * (L.ground - L.top);
      const altOf = y => ((L.ground - y) / (L.ground - L.top)) * ALT_MAX;
      const vAt = h => vProfile(h) * S.vs / V_DESIGN;
      const kvNow = () => lerp(L.kvG, L.kvW, clamp(S.vis.plabels, 0, 1));

      /* ---------------------------------------------------------------- audio helpers */
      const AU = () => api.audio || (window.Site && window.Site.audio) || null;
      const live = () => { const a = AU(); return !!(a && a.ready && a.enabled && snd.on); };
      function P(name, a1, a2) {
        const a = AU();
        if (!a || !a.play) return false;
        const fn = a.play[name];
        if (typeof fn !== 'function') return false;
        try { a2 === undefined ? fn(a1) : fn(a1, a2); return true; } catch (e) { return false; }
      }
      function ui(name, o) { const a = AU(); try { if (a && a.ui && typeof a.ui[name] === 'function') a.ui[name](o); } catch (e) { /* never */ } }
      const deg = (i, o) => { const a = AU(); try { return a && typeof a.degree === 'function' ? a.degree(i, o) : 62 + i * 2 + o * 12; } catch (e) { return 74; } };
      // microsound vocabulary with graceful fallbacks while the engine is being re-voiced
      const sClick = o => P('click', o) || P('hat', { when: o.when, gain: (o.gain || 0.3) * 0.35, pan: o.pan, dest: o.dest, decay: 0.012 });
      const sTick = (m, o) => P('tick', m, o) || P('blip', m, Object.assign({}, o, { dur: 0.03, gain: (o.gain || 0.4) * 0.6 }));
      const sSub = (m, o) => P('sub', m, o) || P('kick', { when: o.when, gain: (o.gain || 0.5) * 0.45, dest: o.dest, pitch: 90, low: 42, decay: 0.22 });
      const sGrain = (m, o) => P('grain', m, o) || P('blip', m, Object.assign({}, o, { dur: 0.06, gain: (o.gain || 0.4) * 0.5 }));

      const snd = { on: false, wind: null, humA: null, humB: null, gran: null, off: null, bed: null, upd: 0,
        arr: [], eddy: 0, cube: [], dots: [], lastEddy: 0, lastSwish: 0, lastDetent: 0, arrIdx: 0 };

      // The wind + hum bed runs through a scene-owned 4-pole lowpass at ~820 Hz (it was the only bed on the
      // site with real energy above 1 kHz: 10–28%). Pressing and holding the sky (a gust) opens it towards
      // ~2 kHz, and it closes again as the gust relaxes: brightness only arrives with a gust.
      const BED_LP = 820, BED_GUST_LP = 2000;
      function bedOpen() {
        const a = AU(), ctx = a && a.ctx, bus = api.bus();
        if (!ctx || !bus || typeof ctx.createBiquadFilter !== 'function') return null;
        const l1 = ctx.createBiquadFilter(), l2 = ctx.createBiquadFilter();
        l1.type = 'lowpass'; l1.frequency.value = BED_LP; l1.Q.value = 0.54;
        l2.type = 'lowpass'; l2.frequency.value = BED_LP * 1.12; l2.Q.value = 0.5;
        l1.connect(l2); l2.connect(bus);
        return { l1, l2, f: BED_LP };
      }
      function bedClose(bed) {
        if (!bed) return;
        setTimeout(() => { try { bed.l2.disconnect(); bed.l1.disconnect(); } catch (e) { /* already gone */ } }, 2500);
      }
      function bedSet(f) {
        const bed = snd.bed, a = AU();
        if (!bed || !a || !a.ctx || Math.abs(f - bed.f) < 8) return;
        bed.f = f;
        const t = a.ctx.currentTime;
        try {
          // opens fast with the gust (τ 80 ms), closes gently (τ 350 ms)
          const tau = f > bed.l1.frequency.value ? 0.08 : 0.35;
          [[bed.l1, 1], [bed.l2, 1.12]].forEach(([n, k]) => {
            n.frequency.cancelScheduledValues(t);
            n.frequency.setValueAtTime(n.frequency.value, t);
            n.frequency.setTargetAtTime(f * k, t, tau);
          });
        } catch (e) { /* never */ }
      }

      function soundStart() {
        const a = AU();
        if (!a) return;
        snd.on = true;
        const bus = api.bus();
        const vN = S.v / V_MAX;
        try { snd.bed = bedOpen(); } catch (e) { snd.bed = null; }
        // into the lowpass (reverb: 0 because the scene bus already carries the reverb send)
        const bed = snd.bed ? snd.bed.l1 : bus;
        try { if (typeof a.wind === 'function') snd.wind = a.wind({ intensity: 0.08 + 0.47 * vN, gain: windGain(), dest: bed, reverb: 0, attack: 2.5 }); } catch (e) { snd.wind = null; }
        try {
          if (typeof a.hum === 'function') {
            snd.humA = a.hum(38 - S.detune, { rate: humRate(), gain: 0.001, dest: bed, reverb: 0, attack: 2, cutoff: 520 });
            snd.humB = a.hum(38 + S.detune, { rate: humRate() * 1.01, gain: 0.001, dest: bed, reverb: 0, attack: 2, cutoff: 520 });
          }
        } catch (e) { snd.humA = snd.humB = null; }
        try {
          if (typeof a.granular === 'function') {
            // round 2: a low, dark grain bed (D3–D4, lowpassed) instead of glassy grains above 1 kHz
            snd.gran = a.granular({ density: 2, pitch: [deg(0, -1), deg(2, -1), deg(4, -1), deg(0, 0)], dur: 0.05, spread: 0.9, bright: 0.12, gain: 0.001, dest: bus });
          }
        } catch (e) { snd.gran = null; }
        try { if (a.clock && typeof a.clock.on === 'function') snd.off = a.clock.on(onClock); } catch (e) { snd.off = null; }
        snd.upd = 0;
        soundUpdate(true);
        if (!S.hintShown) setTimeout(showHint, 900);
      }
      function soundStop() {
        snd.on = false;
        try { snd.wind && snd.wind.stop(0.6); } catch (e) {}
        try { snd.humA && snd.humA.stop(0.5); } catch (e) {}
        try { snd.humB && snd.humB.stop(0.5); } catch (e) {}
        try { snd.gran && snd.gran.stop(0.4); } catch (e) {}
        try { snd.off && snd.off(); } catch (e) {}
        bedClose(snd.bed); // after the wind and hum tails have rung out
        snd.wind = snd.humA = snd.humB = snd.gran = snd.off = snd.bed = null;
        snd.arr.length = 0; snd.cube.length = 0; snd.dots.length = 0;
      }
      // round 2: a darker wind (band-pass ≤ ~750 Hz, whistle ≤ ~770 Hz); loudness rides on gain, not brightness
      const windGain = () => 0.34 + 0.72 * Math.pow(S.v / V_MAX, 1.4);
      const humRate = () => 5.5 * S.v / V_DESIGN; // AM ∝ rotor speed (TSR held at 3 ⇒ ω ∝ v)
      function soundUpdate(force) {
        if (!snd.on) return;
        const now = S.A;
        if (!force && now - snd.upd < 0.12) return;
        snd.upd = now;
        const vN = S.v / V_MAX;
        const uv = unitsLevel();
        // the wind bed follows the altitude under the pointer (hover low: quieter, darker; high: louder, brighter)
        const fN = S.focusV / V_MAX;
        const pz = S.paused ? 0.3 : 1; // paused: the beds sink, the groove stops (onClock)
        // steps 1–2 (the cubic chart, the shear profile): the bed sits 3 dB back so the figure leads;
        // step 6 (the chart): the wind drops back so the rising HDI ticks stand against quiet
        const wg = (0.34 + 0.72 * Math.pow(fN, 1.4)) * (S.step === 5 ? 0.4 : S.step <= 1 ? 0.71 : 1) * (S.paused ? 0.6 : 1);
        try { snd.wind && snd.wind.set({ intensity: 0.08 + 0.47 * fN, gain: wg }, 0.3); } catch (e) {}
        // a press-and-hold gust opens the bed's lowpass; it closes as the gust relaxes
        bedSet(BED_LP + (BED_GUST_LP - BED_LP) * Math.pow(clamp(S.gust / 6, 0, 1), 1.5));
        // the turbine hum: −3.5 dB outside the close-up (it was most of the sub-250 Hz energy in steps 3/5), and it
        // winds down with the rotors outside the paper's 18–33 m/s operating window
        const hg = 0.34 * uv * (0.45 + 0.55 * Math.min(1.4, S.v / V_DESIGN)) * pz * (S.step === 3 ? 1 : 0.67) * S.win;
        const hr = humRate() * (0.25 + 0.75 * S.win);
        try { snd.humA && snd.humA.set({ rate: hr, gain: hg, midi: 38 - S.detune }, 0.4); } catch (e) {}
        try { snd.humB && snd.humB.set({ rate: hr * 1.01, gain: hg, midi: 38 + S.detune }, 0.4); } catch (e) {}
        // a dark D3–D4 grain floor even before the units launch: a warm tone under the wind in every step
        try { snd.gran && snd.gran.set({ density: 2.5 + 16 * vN * uv, gain: (0.06 + 0.16 * uv) * pz, bright: 0.08 + 0.12 * vN }, 0.4); } catch (e) {}
      }
      // how much of the turbines we can "hear": units aloft and visible
      function unitsLevel() {
        const l = (S.launch[0] + S.launch[1] + S.launch[2]) / 3;
        return clamp(l * S.vis.units, 0, 1);
      }

      // Everything rhythmic lands on the shared 16th grid.
      function onClock(step, time) {
        if (!snd.on) return;
        // UI-driven ticks (cubic law, profile rows, HDI dots) follow the reveals, which run while paused
        if (snd.cube.length) {
          const c = snd.cube.shift();
          sTick(c.m, { when: time, gain: c.g, pan: c.p, dest: api.bus() });
        }
        if (snd.dots.length) {
          const d = snd.dots.shift();
          sTick(d.m, { when: time, gain: d.g, pan: d.p, dest: api.bus() });
        }
        if (S.paused) return; // Space stops the groove and the arrivals with the picture
        const bus = api.bus();
        const a = AU();
        // energy packets reaching the ground: quantized to 8ths → at design wind they fuse into a steady pulse.
        // Above ~22 m/s the arrivals outrun the 8th grid, so the odd 16ths carry quiet ghost ticks (≤ 8/s) and the
        // density keeps following v³ instead of saturating.
        if (snd.arr.length) {
          if (step % 2 === 0) {
            const n = snd.arr.length;
            const u = snd.arr.shift();
            if (snd.arr.length > 3) snd.arr.splice(0, snd.arr.length - 3);
            const pitch = deg([0, 2, 4][u] + (snd.arrIdx++ % 6 >= 3 ? 3 : 0), 0); // D4–F#5, not the 2 kHz octave
            sTick(pitch, { when: time, gain: (0.2 + 0.04 * Math.min(3, n)) * 1.41, pan: [-0.35, 0, 0.35][u], dest: bus });
            if (step % 8 === 0) sSub(38, { when: time, dur: 0.16, gain: 0.45, harmonic: 0.35, dest: bus }); // D2 on beats 1 and 3
          } else if (snd.arr.length > 1) {
            const u = snd.arr.shift();
            sTick(deg([0, 2, 4][u], 0), { when: time, gain: 0.3 * 0.32, pan: [-0.5, 0, 0.5][u], dest: bus });
          }
        }
        // at strong wind the pulse grows a clean, clicky backbone (power ∝ v³; nothing outside the 18–33 m/s window)
        const pw = Math.pow(S.v / V_DESIGN, 3) * unitsLevel() * (S.step === 3 ? 0.5 : 1) * S.win;
        if (pw > 0.75 && step % 16 === 0) P('kick', { when: time, gain: 0.22 + 0.1 * Math.min(1, pw - 0.75), dest: bus });
        if (pw > 1.25 && step % 8 === 4) P('kick', { when: time, gain: 0.16, dest: bus });
        if (pw > 0.95 && step % 4 === 2) P('hat', { when: time, gain: 0.08, pan: step % 8 === 2 ? -0.25 : 0.25, dest: bus });
        if (pw > 1.6 && step % 32 === 30 && a && a.clock) P('ratchet', { when: time, count: 4, span: a.clock.stepDur, gain: 0.09, dest: bus });
      }
      // turbulence clicks: soft, woody 600–1.4 kHz knocks (were 0.9–2.4 kHz)
      const eddyHz = () => 600 + Math.random() * 800;
      function eddySound(x, strength) {
        if (!live()) return;
        if (S.A - snd.lastEddy < 0.18) return;
        snd.lastEddy = S.A;
        const a = AU();
        sClick({ when: a.now() + Math.random() * 0.05, freq: eddyHz(), q: 5, gain: 0.05 + 0.07 * clamp(strength, 0, 1),
          pan: clamp((x / L.W) * 2 - 1, -0.9, 0.9), dest: api.bus() });
      }
      function gustSound(x, y) {
        if (!live() || S.A - snd.lastSwish < 0.25) return;
        snd.lastSwish = S.A;
        const pan = clamp((x / L.W) * 2 - 1, -0.8, 0.8);
        P('noise', { type: 'pink', filter: 'bandpass', freq: 500 + 1500 * clamp(1 - y / L.H, 0, 1), q: 0.8,
          attack: 0.16, dur: 0.18, release: 0.9, gain: 0.3, pan, dest: api.bus() });
        // the pitched grain lands on the shared 16th grid (the unpitched swish stays immediate)
        sGrain(deg(2, -1), { when: next16(), gain: 0.12, pan, bright: 0.1, dur: 0.09, dest: api.bus() });
      }
      function next16() {
        const a = AU();
        try { return a && a.clock && a.clock.nextStep ? a.clock.nextStep(1).time : a ? a.now() : 0; } catch (e) { return 0; }
      }
      function arrivalSound(u) {
        if (!live()) return;
        if (snd.arr.length < 6) snd.arr.push(u);
      }

      /* ---------------------------------------------------------------- fluid */
      const FL = {
        nT: 0, L: 16, TX: null, TY: null, PX: null, PY: null, AGE: null, LIFE: null, VAL: null, head: 0, acc: 0,
        emit: [], vort: [], bodies: [], eAcc: 0, dtE: 1 / 24, T: 0,
      };
      // turbulence: curl of a sum of drifting plane waves (divergence-free, cheap)
      const NM = 6;
      const MK = new Float32Array(NM * 2), MA = new Float32Array(NM), MC = new Float32Array(NM), MP = new Float32Array(NM);
      (function initModes() {
        const lens = [520, 390, 300, 230, 170, 130];
        const angs = [0.35, 2.1, 1.25, 2.75, 0.8, 1.9];
        for (let i = 0; i < NM; i++) {
          const k = TAU / lens[i];
          MK[i * 2] = Math.cos(angs[i]) * k; MK[i * 2 + 1] = Math.sin(angs[i]) * k;
          MA[i] = (lens[i] / TAU) * (0.34 / (1 + i * 0.35)); // velocity amplitude ≈ MA·k → ~0.34·U scale
          MC[i] = 40 + i * 9; MP[i] = i * 1.7;
        }
      })();
      let turbA = 1, Uref = 1, speedMul = 1;

      // full: (re)allocate every tracer and emitter chain. Otherwise (a resize within the same tier) the existing
      // flow is rescaled by (sx, sy), so streaklines survive a window drag instead of vanishing and regrowing.
      function seedFluid(full, sx, sy) {
        const m = L.m;
        const nT = m ? 360 : 760;
        if (!full && FL.nT === nT && FL.emit.length) {
          if (sx === 1 && sy === 1) return;
          const PX = FL.PX, PY = FL.PY, TX = FL.TX, TY = FL.TY;
          for (let i = 0; i < nT; i++) { PX[i] *= sx; PY[i] *= sy; }
          for (let j = 0; j < TX.length; j++) { TX[j] *= sx; TY[j] *= sy; }
          for (const q of FL.emit) for (let j = 0; j < q.M; j++) { q.X[j] *= sx; q.Y[j] *= sy; }
          for (const q of FL.vort) { q.x *= sx; q.y *= sy; }
          return;
        }
        FL.nT = nT;
        FL.PX = new Float32Array(nT); FL.PY = new Float32Array(nT);
        FL.AGE = new Float32Array(nT); FL.LIFE = new Float32Array(nT); FL.VAL = new Uint8Array(nT);
        FL.TX = new Float32Array(nT * FL.L); FL.TY = new Float32Array(nT * FL.L);
        for (let i = 0; i < nT; i++) respawn(i, true);
        // emitters: smoke rake (left) + 4 per unit + 4 extra for the close-up
        FL.emit.length = 0;
        const rakeN = m ? 6 : 11;
        for (let k = 0; k < rakeN; k++) {
          const h = 300 + k * (3000 / (rakeN - 1)) * (rakeN - 1) / rakeN + (m ? 150 : 0);
          FL.emit.push(mkEmitter('rake', -1, h, m ? 70 : 96));
        }
        for (let u = 0; u < 3; u++) for (let k = 0; k < 4; k++) FL.emit.push(mkEmitter('unit', u, [-1.2, -0.5, 0.5, 1.2][k], m ? 80 : 110));
        for (let k = 0; k < 4; k++) FL.emit.push(mkEmitter('zoom', 1, [-0.95, -0.25, 0.25, 0.95][k], m ? 90 : 130));
        FL.bodies = [0, 1, 2].map(() => ({ x: -999, y: -999, R: 30, U: 100, w: 0, phase: Math.random() * 0.5, side: 1 }));
        FL.vort.length = 0;
        FL.eAcc = 0;
      }
      function mkEmitter(kind, u, k, M) {
        const X = new Float32Array(M), Y = new Float32Array(M);
        X.fill(NaN); Y.fill(NaN);
        return { kind, u, k, M, X, Y, head: 0, w: 0, fade: 0, x: 0, y: 0, h: kind === 'rake' ? k : 0 };
      }
      function respawn(i, anywhere) {
        const x = anywhere ? lerp(L.xMin, L.W + 10, Math.random()) : L.xMin + Math.random() * 30;
        const y = lerp(L.top - 30, L.ground - 3, Math.random());
        FL.PX[i] = x; FL.PY[i] = y; FL.AGE[i] = 0; FL.LIFE[i] = 5 + Math.random() * 9; FL.VAL[i] = 0;
        const o = i * FL.L;
        for (let j = 0; j < FL.L; j++) { FL.TX[o + j] = x; FL.TY[o + j] = y; }
      }

      // velocity field (px/s) → fu, fv
      let fu = 0, fv = 0;
      function flow(x, y, withVort) {
        let yi = y | 0;
        if (yi < 0) yi = 0; else if (yi >= ULUT.length) yi = ULUT.length - 1;
        let u = ULUT[yi], v = 0;
        const ta = turbA * 0.42 * (0.45 * Uref + 0.55 * u); // ~15% rms of the local wind
        const T = FL.T;
        for (let i = 0; i < NM; i++) {
          const kx = MK[i * 2], ky = MK[i * 2 + 1];
          const c = Math.cos(kx * (x - MC[i] * T) + ky * y + MP[i] + T * 0.07 * (i + 1)) * MA[i] * ta;
          u += ky * c; v -= kx * c;
        }
        const B = FL.bodies;
        for (let b = 0; b < 3; b++) {
          const q = B[b];
          if (q.w < 0.01) continue;
          const dx = x - q.x, dy = y - q.y, R2 = q.R * q.R, r2 = dx * dx + dy * dy;
          if (r2 < 20 * R2) {
            const Ub = q.U * q.w, r4 = r2 * r2 + 1e-3, k = R2 / r4;
            const f = r2 < 9 * R2 ? 1 : 1 - (Math.sqrt(r2 / R2) - 3) / 1.48;
            u -= Ub * k * (dx * dx - dy * dy) * f;
            v -= Ub * 2 * k * dx * dy * f;
            if (r2 < R2 * 1.05) { const r = Math.sqrt(r2) + 0.01; u += (dx / r) * Ub * 1.2; v += (dy / r) * Ub * 1.2; }
          }
          if (dx > 0 && dx < 16 * q.R) {
            const e = Math.exp(-(dy * dy) / (1.4 * R2)) * Math.exp(-dx / (7 * q.R)) * Math.min(1, dx / q.R);
            u -= q.U * q.w * 0.55 * e;
          }
        }
        if (withVort) {
          const V = FL.vort;
          for (let i = 0; i < V.length; i++) {
            const q = V[i];
            const dx = x - q.x, dy = y - q.y, r2 = dx * dx + dy * dy, rc2 = q.rc * q.rc;
            if (r2 > 49 * rc2) continue;
            const f = (q.g * (1 - Math.exp(-r2 / rc2)) / (TAU * (r2 + 0.01))) * (1 - r2 / (49 * rc2));
            u -= f * dy; v += f * dx;
          }
        }
        if (jet.a > 1) {
          const dx = x - jet.x, dy = y - jet.y, e = Math.exp(-(dx * dx + dy * dy * 1.8) / jet.s2);
          u += jet.a * e;
        }
        fu = u; fv = v;
      }

      function fluidStep(dt) {
        FL.T += dt;
        const W = L.W, G = L.ground;
        // shear LUT for this frame (user wind × profile, blended to uniform while zoomed in)
        const z = S.zoom;
        speedMul = lerp(1, 1.45, z);
        const k = L.pxs * S.vs * speedMul;
        for (let y = 0; y < ULUT.length; y++) ULUT[y] = k * lerp(NLUT[y], 1, z);
        Uref = L.pxs * V_DESIGN;
        turbA = 0.35 + 0.65 * (S.vs / V_DESIGN);

        // bodies (units) and vortex shedding (Strouhal ≈ 0.21)
        const B = FL.bodies;
        for (let b = 0; b < 3; b++) {
          const q = B[b];
          if (q.w < 0.2) continue;
          const U = ULUT[clamp(q.y | 0, 0, ULUT.length - 1)];
          q.U = U;
          q.phase += dt * 0.21 * U / (2 * q.R);
          if (q.phase >= 0.5) {
            q.phase -= 0.5;
            q.side = -q.side;
            const rc = 0.42 * q.R;
            const g = -q.side * 5.8 * U * rc * q.w;
            FL.vort.push({ x: q.x + 1.0 * q.R, y: q.y + q.side * 0.6 * q.R, g, g0: g, rc, rc0: rc, age: 0, life: 7.5, tau: 3.4, vx: 0, vy: 0 });
            if (S.vis.tracers > 0.3) eddySound(q.x + q.R, Math.min(1, (U / Uref) * q.w * 0.8));
          }
        }
        // advect vortices
        const V = FL.vort;
        for (let i = V.length - 1; i >= 0; i--) {
          const q = V[i];
          flow(q.x, q.y, false);
          q.x += (fu * 0.88 + q.vx) * dt; q.y += (fv * 0.88 + q.vy) * dt;
          q.age += dt;
          q.g = q.g0 * Math.exp(-q.age / q.tau);
          q.rc = q.rc0 * Math.sqrt(1 + q.age * 0.5);
          if (q.puff) { q.vx *= Math.exp(-dt * 0.7); }
          if (q.age > q.life || q.x > W + 120 || q.y < L.top - 80 || q.y > G + 40) V.splice(i, 1);
        }
        if (V.length > 44) V.splice(0, V.length - 44);

        // tracers
        const n = FL.nT, PX = FL.PX, PY = FL.PY;
        FL.acc += dt;
        let sample = false;
        if (FL.acc > 0.06) { FL.acc = 0; sample = true; FL.head = (FL.head + 1) % FL.L; }
        const Lh = FL.L, hd = FL.head, TX = FL.TX, TY = FL.TY;
        for (let i = 0; i < n; i++) {
          let x = PX[i], y = PY[i];
          flow(x, y, true);
          x += fu * dt; y += fv * dt;
          FL.AGE[i] += dt;
          if (x > W + 12 || y < L.top - 60 || y > G - 1 || x < L.xMin - 20 || FL.AGE[i] > FL.LIFE[i]) {
            respawn(i, FL.AGE[i] > FL.LIFE[i] || x < L.xMin - 20);
            continue;
          }
          PX[i] = x; PY[i] = y;
          if (sample) {
            TX[i * Lh + hd] = x; TY[i * Lh + hd] = y;
            if (FL.VAL[i] < Lh) FL.VAL[i]++;
          }
        }

        // streak emitters
        FL.eAcc += dt;
        let emitN = 0;
        while (FL.eAcc >= FL.dtE) { FL.eAcc -= FL.dtE; emitN++; }
        if (emitN > 2) emitN = 2;
        const E = FL.emit;
        for (let e = 0; e < E.length; e++) {
          const q = E[e];
          positionEmitter(q);
          const X = q.X, Y = q.Y, M = q.M;
          // a chain fades with its emitter; once invisible it is cleared (no orphaned blocks of smoke)
          q.fade += ((q.w > 0.02 ? Math.min(1, q.w * 1.2) : 0) - q.fade) * (1 - Math.exp(-dt / 0.5));
          if (q.w <= 0.02 && q.fade < 0.03) { if (X[0] === X[0] || X[q.head] === X[q.head]) { X.fill(NaN); Y.fill(NaN); } continue; }
          for (let j = 0; j < M; j++) {
            const x = X[j];
            if (x !== x) continue;
            const y = Y[j];
            flow(x, y, true);
            const nx = x + fu * dt, ny = y + fv * dt;
            if (nx > W + 30 || ny < L.top - 80 || ny > G - 1) { X[j] = NaN; continue; }
            X[j] = nx; Y[j] = ny;
          }
          if (q.w > 0.02) {
            for (let k = 0; k < emitN; k++) {
              X[q.head] = q.x + (Math.random() - 0.5) * 0.6; Y[q.head] = q.y + (Math.random() - 0.5) * 0.6;
              q.head = (q.head + 1) % M;
            }
          } else if (emitN) {
            // not emitting: let the chain drain (mark the next slot dead so the line shortens from the source)
            for (let k = 0; k < emitN; k++) { X[q.head] = NaN; q.head = (q.head + 1) % M; }
          }
        }
      }
      function positionEmitter(q) {
        if (q.kind === 'rake') {
          q.x = L.axisX + (L.m ? -30 : 16);
          q.y = yOf(q.h);
          q.w = S.vis.rake;
          return;
        }
        const b = FL.bodies[q.u];
        if (q.kind === 'unit') {
          q.x = b.x - 2.3 * b.R; q.y = b.y + q.k * b.R;
          q.w = b.w * (q.u === 1 ? 1 : 1 - S.zoom);
        } else {
          q.x = b.x - 1.9 * b.R; q.y = b.y + q.k * b.R;
          q.w = S.zoom * b.w;
        }
      }

      function drawFluid() {
        const n = FL.nT, Lh = FL.L, hd = FL.head, TX = FL.TX, TY = FL.TY;
        // tracers: faint hairline trails
        const ta = S.vis.tracers;
        if (ta > 0.01) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(0,0,0,${(0.075 * ta).toFixed(3)})`;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const c = FL.VAL[i];
            if (c < 3) continue;
            const o = i * Lh;
            let j = (hd - c + 1 + Lh) % Lh;
            ctx.moveTo(TX[o + j], TY[o + j]);
            for (let s = 1; s < c; s++) { j = (j + 1) % Lh; ctx.lineTo(TX[o + j], TY[o + j]); }
            ctx.lineTo(FL.PX[i], FL.PY[i]);
          }
          ctx.stroke();
        }
        // streaklines: newest at the source, fading with age (4 buckets)
        const E = FL.emit;
        const BK = [0.2, 0.45, 0.7, 1];
        const BA = [0.19, 0.14, 0.085, 0.04];
        for (let e = 0; e < E.length; e++) {
          const q = E[e], M = q.M, X = q.X, Y = q.Y;
          if (q.fade < 0.03) continue;
          for (let bk = 0; bk < 4; bk++) {
            ctx.beginPath();
            let any = false;
            const j0 = Math.floor((bk ? BK[bk - 1] : 0) * M), j1 = Math.floor(BK[bk] * M);
            let pen = false;
            for (let j = j0; j < j1; j++) {
              const i0 = (q.head - 1 - j + M * 2) % M, i1 = (i0 - 1 + M) % M;
              const x0 = X[i0], y0 = Y[i0], x1 = X[i1], y1 = Y[i1];
              if (x0 !== x0 || x1 !== x1) { pen = false; continue; }
              const dx = x1 - x0, dy = y1 - y0;
              if (dx * dx + dy * dy > 3600) { pen = false; continue; }
              if (!pen) { ctx.moveTo(x0, y0); pen = true; }
              ctx.lineTo(x1, y1);
              any = true;
            }
            if (any) { ctx.strokeStyle = `rgba(0,0,0,${(BA[bk] * q.fade).toFixed(3)})`; ctx.stroke(); }
          }
        }
        // soften the edges of the flow field (left control column, top)
        const W = L.W;
        if (!L.m) {
          const g = ctx.createLinearGradient(L.xMin, 0, L.axisX + 36, 0);
          g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, L.axisX + 36, L.H);
        }
        const g2 = ctx.createLinearGradient(0, L.top - 50, 0, L.top + 10);
        g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, L.top + 10);
        // text blocks sit on clean white: feathered knockouts registered by last frame's text (see ko())
        for (const k of KO) {
          const x = k[0], y = k[1], w = k[2], h = k[3], a = k[4];
          ctx.fillStyle = withAlpha(C.bg, 0.3 * a); ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
          ctx.fillStyle = withAlpha(C.bg, 0.5 * a); ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
          ctx.fillStyle = withAlpha(C.bg, 0.85 * a); ctx.fillRect(x, y, w, h);
        }
      }
      let KO = [], KOn = [];
      function ko(x, y, w, h, a) { if (a > 0.02 && w > 0 && h > 0) KOn.push([x, y, w, h, Math.min(1, a)]); }

      // Text boxes drawn this frame. Live guides leave a gap where they would cross one, and floating labels
      // (probe, gust, paused) pick a spot that clears them all. Reset at the start of every render.
      const LB = [];
      function reg(x, y, w, h) { if (w > 0 && h > 0) LB.push({ x, y, w, h }); }
      const hitBox = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      function freeBox(b, extra) {
        if (b.x < 8 || b.x + b.w > L.W - 8 || b.y < 64 || b.y + b.h > L.H - 76) return false;
        for (const q of LB) if (hitBox(b, q)) return false;
        if (extra) for (const q of extra) if (hitBox(b, q)) return false;
        return true;
      }
      // A feathered opaque backing drawn now, over everything already drawn (fluid, ghost profile, tethers,
      // grid lines): text that a line might cross sits on clean white.
      function plate(x, y, w, h, a) {
        if (a < 0.02 || w <= 0 || h <= 0) return;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = withAlpha(C.bg, 0.3 * a); ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
        ctx.fillStyle = withAlpha(C.bg, 0.55 * a); ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
        ctx.fillStyle = withAlpha(C.bg, 0.94 * a); ctx.fillRect(x, y, w, h);
        ctx.restore();
      }
      // An axis-aligned guide, broken where it would cross a registered text box (strokes with the current
      // style and dash pattern).
      function gapLine(x0, y0, x1, y1, pad, extra) {
        pad = pad == null ? 3 : pad;
        const vert = Math.abs(x1 - x0) < 0.5;
        const a = vert ? Math.min(y0, y1) : Math.min(x0, x1), b = vert ? Math.max(y0, y1) : Math.max(x0, x1);
        const cuts = [];
        for (const q of extra ? LB.concat(extra) : LB) {
          if (vert ? x0 < q.x - pad || x0 > q.x + q.w + pad : y0 < q.y - pad || y0 > q.y + q.h + pad) continue;
          const s = vert ? q.y - pad : q.x - pad, e = vert ? q.y + q.h + pad : q.x + q.w + pad;
          if (e > a && s < b) cuts.push([s, e]);
        }
        cuts.sort((p, q) => p[0] - q[0]);
        const seg = (p, q) => { if (vert) { ctx.moveTo(x0, p); ctx.lineTo(x0, q); } else { ctx.moveTo(p, y0); ctx.lineTo(q, y0); } };
        ctx.beginPath();
        let cur = a;
        for (const c of cuts) { if (c[0] > cur) seg(cur, c[0]); cur = Math.max(cur, c[1]); }
        if (cur < b) seg(cur, b);
        ctx.stroke();
      }

      /* ---------------------------------------------------------------- drawing helpers */
      // Type scale (v2): readable text ≥ 12 px in #000 / #444; 11 px only for ticks, guides and source notes.
      const INK = '#000000', SEC = '#444444', TER = '#555555', TICK = '#999999';
      const LH = 16; // line height for 12 px text blocks
      // No font cache: ctx.save()/restore() and canvas resizes change ctx.font behind any cache's back.
      function font(px, fam, w) { ctx.font = `${w || 400} ${px}px ${fam || MONO}`; }
      function text(s, x, y, o) {
        o = o || {};
        font(o.size || 12, o.fam, o.w);
        ctx.fillStyle = o.color || SEC;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = o.base || 'alphabetic';
        ctx.fillText(s, x, y);
      }
      function textW(s, size) { font(size || 12); return ctx.measureText(s).width; }
      // Shared eyebrow / kicker style (all scenes): uppercase 12 px mono, letter-spacing .06em, #555. The caller
      // uppercases the words and keeps units as written ($/MWh).
      function kicker(s, x, y, color) {
        font(12);
        ctx.fillStyle = color || TER; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        const ls = 'letterSpacing' in ctx;
        if (ls) ctx.letterSpacing = '0.72px';
        ctx.fillText(s, x, y);
        if (ls) ctx.letterSpacing = '0px';
      }
      function plus(x, y, r, color) {
        ctx.strokeStyle = color || C.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
      }
      function dashed(pattern, fn) { ctx.save(); ctx.setLineDash(pattern); fn(); ctx.restore(); }
      function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      function bracketBox(x, y, w, h, color) {
        ctx.strokeStyle = color || C.accent; ctx.lineWidth = 1;
        dashed([2, 3], () => { ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h)); });
        plus(x, y, 3.5, color || C.accent); plus(x + w, y + h, 3.5, color || C.accent);
      }
      const rgba = (a) => `rgba(0,0,0,${a})`;
      const acc = (a) => `rgba(20,50,245,${a})`;

      /* ---------------------------------------------------------------- Energy Unit (via Site.art) */
      // o: { phase, v, hl, energy }
      function drawUnit(x, y, s, o) {
        return ART.swfUnit(ctx, x, y, s, S.T, {
          phase: o.phase, aoa: aoa(o.v), highlight: o.hl || null, energy: o.energy || 0,
          ink: C.ink, bg: C.bg, accent: C.accent, detail: s > 1.4 ? 2 : s > 0.3 ? 1 : 0,
        });
      }
      /* ---------------------------------------------------------------- ground station + grid */
      const GRID = { pts: [], len: [], total: 0, pylons: [] };
      function buildGrid() {
        const gs = L.gs, gx = L.gx, G = L.ground;
        const px = L.m ? [gx + 115 * gs, gx + 205 * gs, gx + 280 * gs] : [gx + 158 * gs, gx + 246 * gs, gx + 318 * gs];
        const ph = [64, 52, 42].map(h => h * gs);
        GRID.pylons = px.map((x, i) => ({ x, h: ph[i] }));
        const pts = [[gx + 96 * gs, G - 28 * gs]];
        GRID.pylons.forEach(p => { pts.push([p.x, G - p.h * 0.86]); });
        pts.push([Math.min(L.W - (L.m ? 16 : 60), GRID.pylons[2].x + (L.m ? 60 : 150) * gs), G - ph[2] * 0.5]);
        // resample with catenary sag
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const sag = Math.min(14, Math.abs(b[0] - a[0]) * 0.1) * gs;
          for (let k = 0; k < 16; k++) {
            const t = k / 16;
            out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + sag * 4 * t * (1 - t)]);
          }
        }
        out.push(pts[pts.length - 1]);
        GRID.pts = out;
        GRID.len = [0];
        for (let i = 1; i < out.length; i++) GRID.len.push(GRID.len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
        GRID.total = GRID.len[GRID.len.length - 1];
      }
      function gridAt(d) {
        const L2 = GRID.len;
        let i = 1;
        while (i < L2.length - 1 && L2[i] < d) i++;
        const a = GRID.pts[i - 1], b = GRID.pts[i], t = clamp((d - L2[i - 1]) / Math.max(1e-3, L2[i] - L2[i - 1]), 0, 1);
        return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
      }
      const drumTop = () => ({ x: L.gx, y: L.ground - 31 * L.gs });

      function drawGround(al, hl) {
        if (al < 0.01) return;
        const G = Math.round(L.ground) + 0.5, gs = L.gs, gx = L.gx;
        ctx.save();
        ctx.globalAlpha = al;
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.ink;
        line(L.m ? 16 : L.axisX, G, L.W - (L.m ? 16 : 40), G);
        const stAl = clamp((al - 0.3) / 0.7, 0, 1);
        if (stAl > 0.01) {
          ctx.globalAlpha = stAl;
          const col = hl ? C.accent : C.ink;
          ctx.strokeStyle = col;
          // tether drum
          ctx.fillStyle = C.bg;
          ctx.beginPath(); ctx.rect(gx - 26 * gs, G - 7 * gs, 52 * gs, 7 * gs); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.rect(gx - 18 * gs, G - 29 * gs, 36 * gs, 22 * gs); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = hl ? acc(0.45) : rgba(0.28);
          for (let yy = G - 26 * gs; yy < G - 8 * gs; yy += 3 * gs) line(gx - 18 * gs, yy, gx + 18 * gs, yy);
          ctx.strokeStyle = col;
          line(gx - 21 * gs, G - 33 * gs, gx - 21 * gs, G - 7 * gs); line(gx + 21 * gs, G - 33 * gs, gx + 21 * gs, G - 7 * gs);
          // motor
          ctx.beginPath(); ctx.rect(gx - 70 * gs, G - 25 * gs, 34 * gs, 19 * gs); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = hl ? acc(0.45) : rgba(0.28);
          for (let xx = gx - 66 * gs; xx < gx - 38 * gs; xx += 3.5 * gs) line(xx, G - 24 * gs, xx, G - 7 * gs);
          ctx.strokeStyle = col;
          line(gx - 36 * gs, G - 16 * gs, gx - 21 * gs, G - 16 * gs);
          line(gx - 66 * gs, G - 6 * gs, gx - 66 * gs, G); line(gx - 40 * gs, G - 6 * gs, gx - 40 * gs, G);
          // ground control & storage container
          ctx.beginPath(); ctx.rect(gx + 36 * gs, G - 34 * gs, 60 * gs, 34 * gs); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = hl ? acc(0.35) : rgba(0.2);
          for (let xx = gx + 60 * gs; xx < gx + 94 * gs; xx += 5 * gs) line(xx, G - 32 * gs, xx, G - 2 * gs);
          // bolt
          ctx.strokeStyle = C.accent;
          ctx.beginPath();
          const bx = gx + 47 * gs, by = G - 24 * gs;
          ctx.moveTo(bx + 3 * gs, by - 3 * gs); ctx.lineTo(bx - 2 * gs, by + 5 * gs); ctx.lineTo(bx + 2 * gs, by + 5 * gs); ctx.lineTo(bx - 3 * gs, by + 13 * gs);
          ctx.stroke();
          // pylons (lattice towers)
          ctx.strokeStyle = C.ink;
          GRID.pylons.forEach(p => {
            const h = p.h, x = p.x;
            const lb = x - 0.2 * h, rb = x + 0.2 * h, lt = x - 0.05 * h, rt = x + 0.05 * h, ty = G - h;
            ctx.beginPath();
            ctx.moveTo(lb, G); ctx.lineTo(lt, ty); ctx.lineTo(rt, ty); ctx.lineTo(rb, G);
            ctx.moveTo(x - 0.26 * h, G - 0.86 * h); ctx.lineTo(x + 0.26 * h, G - 0.86 * h);
            ctx.moveTo(x - 0.2 * h, G - 0.72 * h); ctx.lineTo(x + 0.2 * h, G - 0.72 * h);
            ctx.stroke();
            ctx.strokeStyle = rgba(0.3);
            ctx.beginPath();
            for (let k = 0; k < 4; k++) {
              const y0 = G - (k / 4) * h * 0.86, y1 = G - ((k + 1) / 4) * h * 0.86;
              const w0 = lerp(0.2, 0.06, k / 4) * h, w1 = lerp(0.2, 0.06, (k + 1) / 4) * h;
              ctx.moveTo(x - w0, y0); ctx.lineTo(x + w1, y1); ctx.moveTo(x + w0, y0); ctx.lineTo(x - w1, y1);
            }
            ctx.stroke();
            ctx.strokeStyle = C.ink;
          });
          // wires, ending in a ground tick and "grid →" (so the line never stops in mid-air)
          ctx.strokeStyle = rgba(0.6);
          ctx.beginPath();
          GRID.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          const e = GRID.pts[GRID.pts.length - 1];
          ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0], G);
          ctx.stroke();
          const gl = 'grid →', gw = textW(gl);
          text(gl, e[0], G + 18, { align: 'right', color: SEC });
          reg(e[0] - gw - 4, G + 5, gw + 8, 17);
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- sky units, tethers, packets */
      const units = UNITS.map(() => ({ x: 0, y: 0, s: 1, bp: { x: 0, y: 0 }, a: 0, tether: null }));
      const packets = [];
      const ripples = [];
      const pulses = [];
      const emitAcc = [0, 0, 0];

      // each unit's tether lean from the drum, degrees (before the fan narrows for the text column, unitTarget)
      function fanAng(i) {
        const sky = L.ground - L.top;
        let ang = UNITS[i].ang;
        if (L.m) {
          ang = lerp([2, 12, 22][i], [0, 16, 32][i], clamp((360 - sky) / 140, 0, 1)); // shorter phones: wider
          // short phones (a sky ≈ 150 px tall): the three units sit in almost one row, so the fan opens around the
          // paper's 16° (the nearest unit then carries the blowdown angle) into the sky's empty right half
          ang = lerp(ang, [16, 34, 52][i], clamp((250 - sky) / 50, 0, 1));
        } else {
          if (i === 2) ang = lerp(30, 27, clamp((sky - 440) / 180, 0, 1)); // short skies: fan wider
          ang = lerp(ang, [0, 16, 33][i], clamp((440 - sky) / 110, 0, 1)); // very short skies (≈ 330 px): wider still
        }
        return ang;
      }
      function fanDx(i) {
        return (drumTop().y - yOf(UNITS[i].alt)) * Math.tan((fanAng(i) * Math.PI) / 180);
      }
      // the smallest clear gap between two units' drawn boxes (deck ± 50, shell top − 39 … bridle + 52, local units)
      // at their targets, in px: side by side or one above the other
      function unitGap() {
        const s = L.us, P = [0, 1, 2].map(unitTarget);
        let g = 1e9;
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
          g = Math.min(g, Math.max(Math.abs(P[i].x - P[j].x) - 100 * s, Math.abs(P[i].y - P[j].y) - 91 * s));
        }
        return g;
      }
      function unitTarget(i) {
        const d = drumTop();
        // the whole fan narrows (keeping its shape) when the rightmost unit would reach the text column
        const room = L.uxMax - 52 * L.us - d.x, far = Math.max(fanDx(0), fanDx(1), fanDx(2));
        const k = far > room && far > 1 ? Math.max(0.2, room / far) : 1;
        return { x: d.x + fanDx(i) * k, y: yOf(UNITS[i].alt) };
      }
      // the three units' drawn boxes at their targets (shell top … bridle), grown by pad px: callouts placed against
      // these never jump while the units launch or bob
      function unitTargetBoxes(pad) {
        const s = L.us;
        return [0, 1, 2].map(i => {
          const t = unitTarget(i);
          return { x: t.x - 50 * s - pad, y: t.y - 39 * s - pad, w: 100 * s + 2 * pad, h: 91 * s + 2 * pad };
        });
      }
      function updateUnits(dt, t) {
        const d = drumTop();
        for (let i = 0; i < 3; i++) {
          const u = units[i], tg = unitTarget(i);
          const l = S.launch[i];
          const bob = Math.sin(t * 0.45 + i * 2.1) * 2.2 + Math.sin(t * 0.83 + i) * 0.8;
          let x = lerp(d.x, tg.x, l), y = lerp(d.y - 8, tg.y + bob, l);
          let s = L.us * lerp(0.22, 1, eout(l));
          // step 4: the middle unit becomes the close-up
          if (i === 1 && S.zoom > 0.001) {
            const z = S.zoom;
            x = lerp(x, L.cx, z); y = lerp(y, L.cy + bob * 0.3, z); s = lerp(s, L.cs, z);
          }
          u.x = x; u.y = y; u.s = s;
          const others = i === 1 ? 1 : 1 - S.zoom;
          u.a = clamp(l * 4, 0, 1) * S.vis.units * others * (i === 1 ? 1 : 1);
          // rotors: ω = λ·v/R (TSR held at 3), drawn 30× slowed down; they wind down outside the 18–33 m/s window
          const vloc = vAt(UNITS[i].alt);
          const w = (TSR * vloc) / R_T * 0.033 * S.win;
          if (!REDUCED) S.rot[i] += w * dt;
          const body = FL.bodies[i];
          body.x = x; body.y = y - 4 * s; body.R = 34 * s;
          body.w = clamp(l * 1.5 - 0.3, 0, 1) * S.vis.units * (i === 1 ? 1 : 1 - S.zoom) * (S.step === 5 ? 0.6 : 1);
        }
      }
      // the same curve Site.art.swfTether draws (for hit-testing and callouts)
      const tetherSag = () => 0.07 * Math.pow(S.vs / V_DESIGN, 2);
      function tetherBP(i) { const u = units[i]; return { x: u.x + BRIDLE.x * u.s, y: u.y + BRIDLE.y * u.s }; }
      function tetherCtrl(i) {
        const bp = tetherBP(i), d = drumTop();
        return tetherCurve(bp.x, bp.y, d.x, d.y, tetherSag());
      }

      function updatePackets(dt) {
        const pv = S.vis.packets;
        for (let i = 0; i < 3; i++) {
          const up = S.launch[i] >= 0.999 && pv > 0.2 && S.zoom < 0.05;
          if (!up) { emitAcc[i] = 0; continue; }
          const P = pUnit(vAt(UNITS[i].alt)) * S.win; // no power outside the paper's operating window
          emitAcc[i] += dt * (P / 60000);
          if (emitAcc[i] >= 1) { emitAcc[i] -= 1; if (packets.length < 90) packets.push({ u: i, t: 0 }); }
        }
        for (let k = packets.length - 1; k >= 0; k--) {
          const p = packets[k];
          p.t += dt / 2.3;
          if (p.t >= 1) {
            packets.splice(k, 1);
            const d = drumTop();
            ripples.push({ x: d.x, y: L.ground, a: 0 });
            if (pulses.length < 30) pulses.push({ d: 0 });
            if (S.vis.packets > 0.3) arrivalSound(p.u);
          }
        }
        for (let k = ripples.length - 1; k >= 0; k--) { ripples[k].a += dt; if (ripples[k].a > 1.2) ripples.splice(k, 1); }
        for (let k = pulses.length - 1; k >= 0; k--) { pulses[k].d += dt * 240 * L.gs; if (pulses[k].d > GRID.total) pulses.splice(k, 1); }
      }

      const pkBuf = [[], [], []];
      function drawTethers() {
        for (let i = 0; i < 3; i++) pkBuf[i].length = 0;
        for (const p of packets) pkBuf[p.u].push(p.t);
        // prefers-reduced-motion: packets rest at fixed spots on the tethers (while the units produce)
        if (REDUCED && S.win > 0.5) for (let i = 0; i < 3; i++) pkBuf[i].push(0.3, 0.65);
        const d = drumTop();
        for (let i = 0; i < 3; i++) {
          const u = units[i];
          if (u.a < 0.01 || (i === 1 && S.zoom > 0.02)) continue;
          const bp = tetherBP(i);
          ART.swfTether(ctx, bp.x, bp.y, d.x, d.y, S.T, {
            sag: tetherSag(), alpha: 0.8 * u.a, highlight: hoverId === 'tether', ink: C.ink, accent: C.accent,
            packets: pkBuf[i], packetAlpha: S.vis.packets,
          });
        }
      }
      function drawGridFx() {
        const pv = S.vis.packets * S.vis.ground;
        if (pv < 0.01) return;
        ctx.save();
        for (const r of ripples) {
          const k = r.a / 1.2;
          ctx.strokeStyle = acc((0.6 * (1 - k) * pv).toFixed(3));
          ctx.beginPath(); ctx.ellipse(r.x, r.y, 6 + 40 * eout(k) * L.gs, (2 + 6 * eout(k)) * L.gs, 0, Math.PI, TAU); ctx.stroke();
        }
        ctx.fillStyle = C.accent;
        for (const p of pulses) {
          const q = gridAt(p.d);
          ctx.globalAlpha = pv * (1 - sstep(GRID.total * 0.8, GRID.total, p.d));
          ctx.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3);
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- altitude axis + profile */
      function drawAxis(al) {
        if (al < 0.01) return;
        ctx.save();
        ctx.globalAlpha = al;
        const x = Math.round(L.axisX) + 0.5, G = L.ground, top = L.top;
        // draw-on from the ground up in step 2
        const k = S.step === 1 ? eout(clamp(S.stepT / 1.4, 0, 1)) : 1;
        let yTop = lerp(G, top, k);
        // phones: the axis starts below the top-left callout (lift, power) instead of striking through it
        if (L.m && L.mCallBotPrev > 0) yTop = Math.max(yTop, lerp(yTop, L.mCallBotPrev + 12, clamp(S.vis.power + S.vis.lift, 0, 1)));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        line(x, G, x, yTop);
        const ticks = L.m ? [0, 1000, 2000, 3000] : [0, 500, 1000, 1500, 2000, 2500, 3000];
        for (let h = 0; h <= ALT_MAX; h += 250) {
          const y = Math.round(yOf(h)) + 0.5;
          if (y < yTop - 0.5) break;
          const major = h % 1000 === 0;
          ctx.strokeStyle = C.ink;
          line(x - (major ? 4 : 2), y, x, y);
          if (ticks.indexOf(h) >= 0) {
            const lab = L.m ? (h ? `${h / 1000} km` : '0') : `${h === 0 ? '0' : fmtInt(h).replace(',', ' ')} m`;
            text(lab, x - 8, y + 4, { size: 11, align: 'right', color: major ? C.ink : C.g600 });
          }
          if (major && h > 0) {
            ctx.strokeStyle = rgba(0.12);
            const xEnd = L.m ? L.W - 16 : L.rcolX - 30;
            const tab = S.vis.plabels > 0.05 && !L.m;
            dashed([1, 4], () => {
              if (tab) line(x + 6, y, L.colX - 12, y); else line(x + 6, y, xEnd, y);
            });
          }
        }
        if (k > 0.98) {
          // flight test marker: 150 m (paper Fig. 21)
          if (!L.m) {
            const y = Math.round(yOf(150)) + 0.5;
            const hl = hoverId === 'flight';
            ctx.strokeStyle = hl ? C.accent : C.ink;
            ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
            text('flight test · 150 m', x - 9, y + 4, { align: 'right', color: hl ? C.accent : SEC });
            reg(x - 13 - textW('flight test · 150 m'), y - 9, textW('flight test · 150 m') + 20, 17);
          }
        }
        ctx.restore();
      }
      function drawProfile(al, labAl) {
        if (al < 0.01) return;
        ctx.save();
        ctx.globalAlpha = al;
        const x0 = L.axisX, kv = kvNow(), G = L.ground;
        const draw = S.step === 1 ? clamp((S.stepT - 0.5) / 2.2, 0, 1) : 1;
        const hMax = lerp(10, 3000, eio(draw));
        const f = S.vs / V_DESIGN;
        // speed scale along the ground (the profile's x-axis)
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        // the narrow ghost scale (steps 3, 5) labels only its ends, and "30" drops its unit before it would
        // crowd the ground station's "motor" label (step 5)
        const ends = L.m || kv * 10 < 36;
        const motorL = S.vis.power > 0.01 && !L.m ? L.gx - 53 * L.gs - textW('motor') / 2 : 1e9;
        for (let v = 0; v <= 30; v += 10) {
          const xx = Math.round(x0 + v * kv) + 0.5;
          line(xx, G, xx, G + 4);
          if (ends && v % 30) continue;
          const s30 = L.m || xx + textW('30 m/s', 11) / 2 + 10 < motorL ? '30 m/s' : '30';
          text(v === 30 ? s30 : String(v), xx, G + 17, { size: 11, align: v === 30 && L.m ? 'left' : 'center', color: C.g600 });
        }
        // 1/7 power law reference (textbook), 10 m → 1 km
        ctx.strokeStyle = rgba(0.3);
        dashed([2, 3], () => {
          ctx.beginPath();
          for (let h = 10; h <= Math.min(1000, hMax); h += 10) {
            const xx = x0 + 5 * Math.pow(h / 10, 1 / 7) * f * kv, yy = yOf(h);
            if (h === 10) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        });
        // measured profile: dashed extrapolation < 110 m, solid Fig. 2 data, dashed join to the design point
        const seg = (h0, h1, dash) => {
          if (hMax <= h0) return;
          const e = Math.min(h1, hMax);
          ctx.strokeStyle = C.ink;
          ctx.beginPath();
          for (let h = h0; h <= e + 0.01; h += 10) {
            const xx = x0 + vAt(h) * kv, yy = yOf(h);
            if (h === h0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          if (dash) { ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); } else ctx.stroke();
        };
        seg(10, 110, true); seg(110, 2000, false); seg(2000, 3000, true);
        if (hMax >= 2990) {
          const xx = x0 + vAt(3000) * kv, yy = yOf(3000);
          plus(xx, yy, 4, C.accent);
        }
        const y3 = Math.round(yOf(3000));
        L.legendBox = null; L.mAnnot = null;
        // side table: wind and power density (½ρv³) at a few altitudes (ISA air density; the paper's 0.8 at 3 km).
        // Each row sits on a plate and is registered, so the probe label and its guide keep clear of it.
        if (labAl > 0.01 && !L.m) {
          const cx = L.colX;
          const hy = y3 - 28;
          ctx.globalAlpha = al * labAl;
          plate(cx - 4, hy - 12, 196, 16, al * labAl);
          text('wind', cx, hy, { color: TER });
          text('power / m²', cx + 84, hy, { color: TER });
          reg(cx - 4, hy - 12, 196, 16);
          [3000, 2000, 1000, 300, 10].forEach(h => {
            if (hMax < h) return;
            // a short sky: the 2 km row would sit under the legend (y3 + 11 … y3 + 105), so it goes
            if (h === 2000 && yOf(2000) - 8 < y3 + 108) return;
            const v = vAt(h), vd = vD(v), rho = h >= 3000 ? RHO_HUB : rhoISA(h);
            const px = x0 + v * kv, yy = Math.round(yOf(h)) + 0.5;
            const la = labAl * (draw >= 1 ? 1 : clamp((hMax - h) / 200 + 0.2, 0, 1));
            ctx.globalAlpha = al * la;
            ctx.fillStyle = h === 3000 ? C.accent : C.ink;
            if (h !== 3000) { ctx.beginPath(); ctx.arc(px, yy, 1.8, 0, TAU); ctx.fill(); }
            ctx.strokeStyle = rgba(0.3);
            dashed([1, 3], () => line(px + 6, yy, cx - 12, yy));
            const P = pa(vd, rho);
            const ps = P < 1000 ? `${fmtInt(P)} W/m²` : `${(P / 1000).toFixed(2)} kW/m²`;
            const ty = h === 10 ? yy - 6 : yy + 4;
            const ex = h === 10 ? '~' : ''; // 10 m: the 1/7-law extrapolation, not a measured row
            const third = h === 3000 ? 'air 0.8 kg/m³' : h === 10 ? 'extrapolated' : '';
            const tx0 = h === 10 ? cx - 7 : cx;
            const rw = (third ? 190 + textW(third) : 84 + textW(ex + ps)) + (cx - tx0);
            plate(tx0 - 4, ty - 12, rw + 8, 16, al * la);
            text(`${ex}${f1(vd)} m/s`, tx0, ty, { color: h === 3000 ? C.accent : h === 10 ? SEC : INK });
            text(ex + ps, h === 10 ? cx + 77 : cx + 84, ty, { color: h === 3000 ? C.accent : SEC });
            if (third) text(third, cx + 190, ty, { color: TER });
            reg(tx0 - 4, ty - 12, rw + 8, 16);
          });
          if (hMax >= 2990) {
            // the headline ratio, then the legend: measured profile (with its source), textbook law, design point
            const a = al * labAl * clamp((S.stepT - 2.9) / 0.7, 0, 1);
            ctx.globalAlpha = a;
            const sw = TEX.shear.w || 202;
            const lw = Math.max(textW('≈ 100× the power density of 10 m', 13), 36 + sw + textW('textbook'));
            const top = y3 + 11;
            plate(cx - 4, top, lw + 8, 94, a);
            text('≈ 100× the power density of 10 m', cx, y3 + 25, { size: 13, color: INK });
            ctx.strokeStyle = C.ink;
            line(cx, y3 + 42.5, cx + 18, y3 + 42.5);
            text('measured, London', cx + 26, y3 + 47, { color: SEC });
            text('SkyWindFarm paper, 2024 · Fig. 2', cx + 26, y3 + 61, { size: 11, color: TER });
            ctx.strokeStyle = rgba(0.45);
            dashed([2, 3], () => line(cx, y3 + 79.5, cx + 18, y3 + 79.5));
            TEX.shear.place(cx + 26, y3 + 70, a, 'left');
            text('textbook', cx + 36 + sw, y3 + 84, { color: TER });
            plus(cx + 9, y3 + 96, 3.5, C.accent);
            text('design point, 3 km · paper p. 4', cx + 26, y3 + 100, { color: SEC });
            reg(cx - 4, top, lw + 8, 94);
            L.legendBox = { x: cx - 6, y: top, w: lw + 12, h: 96 };
          }
        } else if (labAl > 0.01 && L.m && hMax >= 2990) {
          // phones: one narrow block right of where the profile's 3 km point can ever reach (36 m/s), so the
          // curve never runs through it
          const a = al * labAl;
          ctx.globalAlpha = a;
          const xx = Math.round(x0 + V_MAX * L.kvW + 10);
          const v3 = vD(vAt(3000)), v10 = vD(vAt(10));
          const rows = [
            [`${f1(v3)} m/s · ${(pa(v3, RHO_HUB) / 1000).toFixed(1)} kW/m²`, 12, C.accent, -8],
            ['≈ 100× the power', 12, INK, 10], ['density of 10 m', 12, INK, 26],
            [`(~${f1(v10)} m/s · ${fmtInt(pa(v10, rhoISA(10)))} W/m²)`, 12, SEC, 42],
            ['SkyWindFarm paper,', 11, TER, 58], ['2024 · Fig. 2', 11, TER, 71],
          ];
          // the sky's top is shared with steps 3 and 5 (their callouts need it), which leaves a band of open sky under
          // this step's headline: where it has room, the legend sits there, 20 px under the headline (the phone's
          // only key to the solid measured profile and the dotted textbook law), and carries the source line
          const ly = artTop(1) + 12, leg = ly + 22 <= Math.min(L.top - 4, y3 - 33);
          if (leg) rows.length = 4;
          let w = 0;
          rows.forEach(r => { w = Math.max(w, textW(r[0], r[1])); });
          const bh = leg ? 70 : 96;
          plate(xx - 4, y3 - 21, w + 8, bh, a);
          rows.forEach(r => text(r[0], xx, y3 + r[3], { size: r[1], color: r[2] }));
          reg(xx - 4, y3 - 21, w + 8, bh);
          L.mAnnot = { x: xx - 6, y: y3 - 22, w: w + 12, h: bh + 2 };
          if (leg) {
            const l1 = 'measured over London · paper Fig. 2', l2 = 'textbook 1/7 power law';
            const lw = 26 + Math.max(textW(l1), textW(l2));
            plate(12, ly - 13, lw + 8, 34, a);
            ctx.strokeStyle = C.ink;
            line(16, ly - 3.5, 34, ly - 3.5);
            ctx.strokeStyle = rgba(0.45);
            dashed([2, 3], () => line(16, ly + 12.5, 34, ly + 12.5));
            text(l1, 42, ly, { color: SEC });
            text(l2, 42, ly + 16, { color: TER });
            reg(12, ly - 13, lw + 8, 34);
          }
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- cubic-law chart (step 1 hero) */
      const PMAX = 20000; // W/m² chart ceiling
      function drawCubic(rect, al) {
        if (al < 0.01) return;
        ctx.save();
        ctx.globalAlpha = al;
        const { x, y, w, h } = rect;
        const X = v => x + (v / V_MAX) * w, Y = p => y + h - (p / PMAX) * h;
        const draw = S.step === 0 ? eio(clamp((S.stepT - 0.2) / 1.6, 0, 1)) : 1;
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.ink;
        // axes
        const bx = Math.round(x) + 0.5, by = Math.round(y + h) + 0.5;
        line(bx, by, bx + w * draw, by); line(bx, by, bx, by - h * draw);
        // 18–33 m/s: where the wind at 3 km is >90% of the time (paper p.4)
        ctx.fillStyle = acc(0.045);
        ctx.fillRect(X(18), y, X(33) - X(18), h);
        const vd = vD(S.v), pLive = pa(vd, RHO_HUB);
        // the live wind label sits under the axis title's row; where it would run into the title it moves up into
        // the tick row instead (and, like the power label below, hides the tick labels it would touch)
        const liveOn = draw > 0.99 && Math.abs(S.v - V_DESIGN) > 0.15;
        const liveMX = X(S.v), liveS = f1(vd), liveW = textW(liveS, 11);
        const liveInRow = liveOn && liveMX + liveW / 2 + 8 > x + w - textW('wind speed, m/s', 12) - 8;
        // ticks appear behind the axes' draw heads; titles fade in with them
        for (let v = 0; v <= 35; v += 5) {
          const xx = Math.round(X(v)) + 0.5;
          if (xx > bx + w * draw + 0.5) break;
          line(xx, by, xx, by + 4);
          if (!liveInRow || Math.abs(xx - liveMX) >= (liveW + textW(String(v), 11)) / 2 + 6) {
            text(String(v), xx, by + 17, { size: 11, align: 'center', color: C.g600 });
          }
        }
        // the live value label (accent, left of the axis) takes precedence over a tick label it would touch
        const liveY = draw > 0.99 && Math.abs(S.v - V_DESIGN) > 0.15 ? Y(Math.min(PMAX, pLive)) - 7 : -1e4;
        for (let p = 0; p <= PMAX; p += 5000) {
          const yy = Math.round(Y(p)) + 0.5;
          if (yy < by - h * draw - 0.5) break;
          line(bx - 4, yy, bx, yy);
          if (Math.abs(yy + 4 - liveY) >= 13) text(p ? `${p / 1000}` : '0', bx - 8, yy + 4, { size: 11, align: 'right', color: C.g600 });
        }
        ctx.globalAlpha = al * sstep(0.6, 1, draw);
        text('wind speed, m/s', x + w, by + 34, { size: 12, align: 'right', color: TER });
        text('power density, kW/m²', bx, y - 12, { size: 12, color: TER });
        reg(x + w - textW('wind speed, m/s') - 4, by + 21, textW('wind speed, m/s') + 8, 17);
        // the design point's label: right of and below the marker; above-left of it when that would leave the
        // viewport (phones: one line on a short plot, the live readout carries the numbers)
        const dP = [V_DESIGN, pa(V_DESIGN, RHO_HUB)];
        // (it ends on the chrome's 40 px gutter: a few px over slide it left, more flips it)
        const dOver = X(dP[0]) + 10 + Math.max(textW('26.7 m/s → 7.6 kW/m²'), textW('design point · 3 km')) - (L.W - 40);
        const dFlip = L.m || dOver > 6;
        const dOne = L.m && h < 260;
        // (short phones: a 156 px plot holds at most three text rows, so the design point is named in the key line
        // under the axis, beside its blue +, rather than inside the plot)
        const dKey = L.m && L.short;
        const dl = dFlip ? { x: X(dP[0]) - 10, a: 'right', y: Y(dP[1]) - (dOne ? 10 : 26) } : { x: X(dP[0]) + 10 - Math.max(0, dOver), a: 'left', y: Y(dP[1]) + 18 };
        const dlW = Math.max(textW('design point · 3 km'), dOne ? 0 : textW('26.7 m/s → 7.6 kW/m²'));
        const dlBox = dKey ? { x: -1e4, y: -1e4, w: 1, h: 1 } : { x: (dl.a === 'right' ? dl.x - dlW : dl.x) - 4, y: dl.y - 12, w: dlW + 8, h: dOne ? 16 : 32 };
        const l20 = { x: X(20) - 12 - textW('20 m/s → 3.2 kW/m²'), y: Y(pa(20, RHO_HUB)) - 21, w: textW('20 m/s → 3.2 kW/m²') + 8, h: 16 };
        // the band's label (hover → paper Fig. 1): the first spot inside the band that clears the formula block,
        // the curve and the labels above: top centre, top right, then the band's foot under the curve; else (a
        // cramped chart) under the formula block, or on phones only in the source line below the axis
        const hb = hoverId === 'band', bx0b = X(18), bx1b = X(33), bw = bx1b - bx0b;
        const curveY = xx => Y(Math.min(PMAX, pa(clamp(((xx - x) / w) * V_MAX, 0, V_MAX), RHO_HUB)));
        const LONG = '90% of the time at 3 km', SHORT = '90% of time', src = 'SkyWindFarm paper, 2024 · Fig. 1';
        const variants = [];
        if (!L.m && textW(LONG) < bw - 8) variants.push({ l1: LONG, src: textW(src, 11) < bw - 6 ? [src] : ['SkyWindFarm paper,', '2024 · Fig. 1'] });
        variants.push({ l1: SHORT, src: L.m ? [] : ['SkyWindFarm paper,', '2024 · Fig. 1'] });
        const tb = L.heroBox;
        let band = null;
        for (const v of variants) {
          const bl = Math.max(textW(v.l1), textW('18–33 m/s'), ...v.src.map(s => textW(s, 11)));
          const bandH = 38 + (v.src.length ? 14 + 13 * (v.src.length - 1) : 0);
          const cands = [[X(25.5), y, 'top'], [bx1b - bl / 2 - 6, y, 'top'], [X(28), y + h - bandH - 6, 'foot'], [bx1b - bl / 2 - 6, y + h - bandH - 6, 'foot']];
          for (const [bc, by0, kind] of cands) {
            const b = { x: bc - bl / 2 - 4, y: by0 + 3, w: bl + 8, h: bandH };
            if (b.x < bx0b - 2 || b.x + b.w > bx1b + 2) continue;
            if ((tb && hitBox(b, tb)) || hitBox(b, dlBox) || hitBox(b, l20)) continue;
            // (the glyphs sit 4 px inside the box: the curve clears them by ≥ 4 px)
            if (kind === 'top' ? curveY(b.x + b.w - 4) < b.y + b.h : curveY(b.x + 4) > b.y) continue;
            band = { v, bc, by0, bl, bandH, b };
            break;
          }
          if (band) break;
        }
        if (!band && !L.m) {
          const v = variants[variants.length - 1], bl = Math.max(textW(v.l1), textW('SkyWindFarm paper,', 11));
          const bc = X(25.5), by0 = tb ? tb.y + tb.h + 6 : y;
          band = { v, bc, by0, bl, bandH: 65, b: { x: bc - bl / 2 - 4, y: by0 + 3, w: bl + 8, h: 65 } };
        }
        if (band) {
          const { v, bc, by0 } = band;
          text(v.l1, bc, by0 + 16, { align: 'center', color: hb ? C.accent : SEC });
          text('18–33 m/s', bc, by0 + 32, { align: 'center', color: hb ? C.accent : SEC });
          v.src.forEach((s, i) => text(s, bc, by0 + 47 + 13 * i, { size: 11, align: 'center', color: hb ? C.accent : TER }));
          reg(band.b.x, band.b.y, band.b.w, band.b.h);
          L.bandY = by0; L.bandH = band.bandH;
        } else { L.bandY = y; L.bandH = h - 2; }
        if (dKey) {
          const k1 = 'design point, 3 km', k2 = band ? ' · band: paper Fig. 1' : ' · band: 90% of time, Fig. 1';
          plus(20, by + 54, 3.5, C.accent);
          text(k1, 30, by + 58, { size: 11, color: C.accent });
          text(k2, 30 + textW(k1, 11), by + 58, { size: 11, color: hb ? C.accent : TER });
        } else if (L.m) text(band ? 'Band: SkyWindFarm paper, 2024 · Fig. 1' : 'Band: 90% of the time at 3 km · paper Fig. 1', 16, by + 58, { size: 11, color: hb ? C.accent : TER });
        const bandBox = band ? band.b : null;
        ctx.globalAlpha = al;
        // the curve ½·0.8·v³
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        const vEnd = V_MAX * draw;
        let started = false;
        for (let v = 0; v <= vEnd + 0.01; v += 0.25) {
          const p = pa(v, RHO_HUB);
          if (p > PMAX) break;
          const xx = X(v), yy = Y(p);
          if (!started) { ctx.moveTo(xx, yy); started = true; } else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        if (draw > 0.99) {
          const ha = clamp((S.stepT - 1.8) / 0.8, 0, 1);
          ctx.globalAlpha = al * ha;
          // 2× v → 8× P
          const a = [10, pa(10, RHO_HUB)], b = [20, pa(20, RHO_HUB)];
          ctx.strokeStyle = rgba(0.45);
          dashed([2, 3], () => {
            line(X(a[0]), by, X(a[0]), Y(a[1])); line(bx, Y(a[1]), X(a[0]), Y(a[1]));
            line(X(b[0]), by, X(b[0]), Y(b[1])); line(bx, Y(b[1]), X(b[0]), Y(b[1]));
          });
          plus(X(a[0]), Y(a[1]), 3.5); plus(X(b[0]), Y(b[1]), 3.5);
          const boxes = [];
          const lab = (s, xx, yy, o) => {
            text(s, xx, yy, o);
            const tw = textW(s, o.size || 12), x0 = o.align === 'right' ? xx - tw : o.align === 'center' ? xx - tw / 2 : xx;
            const bb = { x: x0 - 4, y: yy - 12, w: tw + 8, h: 16 };
            boxes.push(bb);
            if (ha > 0.3) reg(bb.x, bb.y, bb.w, bb.h);
          };
          if (!L.m && X(a[0]) - 8 - textW('10 m/s → 0.4 kW/m²') > bx + 8) lab('10 m/s → 0.4 kW/m²', X(a[0]) - 8, Y(a[1]) - 9, { align: 'right', color: SEC });
          lab('20 m/s → 3.2 kW/m²', X(b[0]) - 8, Y(b[1]) - 9, { align: 'right', color: SEC });
          // the design point (label placed above, with the band's)
          plus(X(dP[0]), Y(dP[1]), 4.5, C.accent);
          if (!dKey) lab('design point · 3 km', dl.x, dl.y, { color: C.accent, align: dl.a });
          if (!dOne && !dKey) lab('26.7 m/s → 7.6 kW/m²', dl.x, dl.y + 16, { color: SEC, align: dl.a });
          // "2× the wind → 8× the power": centred over the 10→20 m/s step, but always left of the curve (whose
          // leftmost point over the label's height is at its bottom edge), inside the plot and clear of the other
          // labels, the band's and the formula block (a chart too cramped for it leaves it to the caption)
          const s2 = '2× the wind → 8× the power', fs = L.m ? 12 : 13, w2 = textW(s2, fs);
          const curveX = yy => X(Math.cbrt((2 * clamp(((y + h - yy) / h) * PMAX, 0, PMAX)) / RHO_HUB));
          const avoid = boxes.concat(tb ? [tb] : [], bandBox ? [bandBox] : []);
          // phones: two lines stacked on the 20 m/s label, right-aligned with it, well under the design point (one
          // line there would sit on the live wind guide and run into the design marker)
          // (short phones: the short sub says it, "Double the wind, eight times the power", and the plot keeps three rows)
          let two = null, ok = false;
          if (L.m && !dKey) {
            const xr = X(b[0]) - 8, y2 = Y(b[1]) - 9 - 21, wA = textW('2× the wind', fs), wB = textW('→ 8× the power', fs);
            const bb = { x: xr - Math.max(wA, wB) - 4, y: y2 - 16 - 13, w: Math.max(wA, wB) + 8, h: 34 };
            if (bb.x >= bx + 6 && curveX(y2 - 16) > xr + 6 && !avoid.some(q => hitBox(bb, q))) two = { xr, y2, bb };
          }
          let yb = Y(b[1]) - 34, xc = X(15);
          for (let k = 0; !two && !dKey && k < 80 && yb - 13 >= y; k++, yb -= 3) {
            xc = Math.min(X(15), curveX(yb + 4) - 12 - w2 / 2);
            const bb = { x: xc - w2 / 2 - 4, y: yb - 13, w: w2 + 8, h: 18 };
            if (bb.x >= bx + 6 && !avoid.some(q => hitBox(bb, q))) { ok = true; break; }
          }
          if (two) {
            text('2× the wind', two.xr, two.y2 - 16, { size: fs, align: 'right', color: INK });
            text('→ 8× the power', two.xr, two.y2, { size: fs, align: 'right', color: INK });
            if (ha > 0.3) reg(two.bb.x, two.bb.y, two.bb.w, two.bb.h);
          } else if (ok) {
            text(s2, xc, yb, { size: fs, align: 'center', color: INK });
            if (ha > 0.3) reg(xc - w2 / 2 - 4, yb - 13, w2 + 8, 18);
          }
          ctx.globalAlpha = al;
        }
        // live marker: its guides break around every label they would cross
        if (draw > 0.99) {
          const v = S.v, p = pa(v, RHO_HUB);
          const mx = X(v), my = Y(Math.min(PMAX, p));
          ctx.strokeStyle = acc(0.55);
          dashed([2, 3], () => { gapLine(mx, by, mx, my); gapLine(bx, my, mx, my); });
          ctx.fillStyle = C.accent;
          ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
          if (liveOn) {
            // keep clear of the axis title (and, on phones, of the band's source line below it)
            text(liveS, mx, by + (liveInRow ? 17 : 34), { size: 11, align: 'center', color: C.accent });
            text(`${(pLive / 1000).toFixed(1)}`, bx - 8, my - 7, { size: 11, align: 'right', color: C.accent });
          }
        }
        ctx.restore();
      }
      function drawHero(al) {
        if (al < 0.01) return;
        const r = L.hero;
        const fa = al * clamp((S.stepT - 0.1) / 0.8, 0, 1);
        const tx = r.x + r.w * (L.m ? 0.02 : 0.03) + 4, ty = r.y + (L.m ? 8 : 12);
        TEX.hero.size_(L.m ? 24 : 34);
        const th = TEX.hero.h || (L.m ? 30 : 42);
        const vd = vD(S.v), P = pa(vd, RHO_HUB);
        // (short phones: one readout row, wind and power together; the air density is in the formula's ρ)
        const one = L.m && L.short;
        const l1 = one ? null : `wind ${f1(vd)} m/s · air 0.8 kg/m³`, l2 = one ? `${f1(vd)} m/s → ${fmtInt(P)} W/m²` : `→ ${fmtInt(P)} W/m²`;
        // the chart sits on near-white: the turbulence stays around it (≈ 30% inside the plot)
        ko(r.x - 44, r.y - 30, r.w + 56, r.h + 72, 0.62 * al);
        L.heroBox = { x: tx - 4, y: ty - 2, w: Math.max(TEX.hero.w || 200, one ? textW(l2, 13) : textW(l1)) + 12, h: th + (one ? 22 : 40) };
        reg(L.heroBox.x, L.heroBox.y, L.heroBox.w, L.heroBox.h);
        drawCubic(r, al);
        ctx.save();
        ctx.globalAlpha = fa;
        TEX.hero.place(tx, ty, fa, 'left');
        if (l1) text(l1, tx + 2, ty + th + 14, { color: INK });
        text(l2, tx + 2, ty + th + (one ? 16 : 32), { size: 13, color: C.accent });
        ctx.restore();
      }

      /* ---------------------------------------------------------------- probe (hover the sky) */
      // the drawn units, as boxes a floating label must clear
      function unitBoxes() {
        const out = [];
        for (const u of units) if (u.a > 0.3) out.push({ x: u.x - 52 * u.s, y: u.y - 40 * u.s, w: 104 * u.s, h: 94 * u.s });
        return out;
      }
      // would a label box cross the drawn shear profile?
      function crossesProfile(b) {
        if (S.vis.profile < 0.2) return false;
        const kv = kvNow();
        for (const yy of [b.y, b.y + b.h / 2, b.y + b.h]) {
          if (yy < L.top - 5 || yy > L.ground) continue;
          const px = L.axisX + vAt(clamp(altOf(yy), 10, 3000)) * kv;
          if (px > b.x - 3 && px < b.x + b.w + 3) return true;
        }
        return false;
      }
      // pointer on a text block: no floating labels there (what is under the pointer is already written)
      const overText = (x, y) => LB.some(q => x > q.x - 6 && x < q.x + q.w + 6 && y > q.y - 6 && y < q.y + q.h + 6);
      function drawProbe() {
        if (!ptr.in || (ptr.type === 'touch' && !ptr.down) || (hoverId && !ptr.down)) return;
        const al = S.vis.axis;
        if (al < 0.5 || S.zoom > 0.1 || S.vis.chart > 0.1) return;
        const y = ptr.y, x = ptr.x;
        if (y < L.top || y > L.ground - 2 || x < L.axisX + 4 || overText(x, y)) return;
        const h = altOf(y), v = vAt(h), vd = vD(v), P = pa(vd, rhoISA(h));
        const ps = `${P >= 1000 ? (P / 1000).toFixed(2) + ' kW' : fmtInt(P) + ' W'}/m²`;
        const lines = L.m ? [`${fmtInt(h)} m · ${f1(vd)} m/s`, ps] : [`${fmtInt(h)} m · ${f1(vd)} m/s · ${ps}`];
        const w = Math.max.apply(null, lines.map(s => textW(s)));
        const lh = 15, bh = lines.length * lh + 3;
        const r = 10 + 10 * clamp(S.gust / 10, 0, 1);
        const px = L.axisX + v * kvNow();
        // candidates: above the pointer (right, left), then below it (clear of the gust label); on phones the
        // right-hand spot starts right of the profile
        // box tops: above the pointer, or below it (clear of the gust label under the ring when pressed)
        const tops = [(ptr.down ? y - r - 12 : y - 8) - (lines.length - 1) * lh - 12, ptr.down ? y + r + 23 : y + 12];
        // right of the pointer, pulled back inside the gutter (the chrome's 40 px; 16 px on phones)
        const xr = Math.min(x + 12, L.W - (L.m ? 20 : 44) - w);
        const xs = L.m ? [Math.max(xr, px + 12), px + 12, x - 14 - w] : [xr, x - 12 - w];
        const ub = unitBoxes();
        let pick = null;
        for (const top of tops) {
          for (const lx of xs) {
            const b = { x: lx - 4, y: top, w: w + 8, h: bh };
            if (freeBox(b, ub) && !crossesProfile(b)) { pick = b; break; }
          }
          if (pick) break;
        }
        ctx.save();
        ctx.globalAlpha = al;
        ctx.strokeStyle = acc(0.45);
        dashed([2, 3], () => gapLine(L.axisX, Math.round(y) + 0.5, x, Math.round(y) + 0.5, 3, ub));
        ctx.fillStyle = C.accent;
        if (S.vis.profile > 0.2) { ctx.beginPath(); ctx.arc(px, y, 2.4, 0, TAU); ctx.fill(); }
        if (pick) {
          plate(pick.x, pick.y, pick.w, pick.h, al);
          lines.forEach((s, i) => text(s, pick.x + 4, pick.y + 12 + i * lh, { color: C.accent }));
          reg(pick.x, pick.y, pick.w, pick.h);
        }
        ctx.restore();
      }
      function drawPointer() {
        if (!ptr.down || S.vis.chart > 0.5) return;
        ctx.save();
        const x = ptr.x, y = ptr.y;
        const k = clamp(S.gust / 10, 0, 1);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 1;
        const r = 10 + 10 * k;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        plus(x, y, 3.5, C.accent);
        // little flow arrow, unless it would cross a label
        const ax1 = x + r + 18 + 20 * k;
        if (freeBox({ x: x + r + 2, y: y - 4, w: ax1 - x - r, h: 8 })) {
          line(x + r + 4, y, ax1, y); line(ax1, y, ax1 - 4, y - 3); line(ax1, y, ax1 - 4, y + 3);
        }
        if (!overText(x, y)) {
          const lab = ptr.moved > 6 ? `wind ${f1(vD(S.base))} m/s` : `gust +${f1(S.gust)} m/s`;
          const lw = textW(lab), ly = y + r + 14;
          for (const lx of [x + r + 6, x - r - 6 - lw]) {
            const b = { x: lx - 4, y: ly - 12, w: lw + 8, h: 16 };
            if (freeBox(b)) { plate(b.x, b.y, b.w, b.h, 1); text(lab, lx, ly, { color: C.accent }); reg(b.x, b.y, b.w, b.h); break; }
          }
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- step 3/5 callouts */
      // lines: strings or { t, c, size, tex, a, gap } — the first line is the title (13 px ink), the rest 12 px
      // #444. A { tex: TEX.x } line reserves room for a KaTeX overlay (placed at the same anchor/alignment).
      // Trailing rows may fade in later ({ a }: their own alpha, × al; a row at 0 takes no room) and start a little
      // lower ({ gap }). The block sits on a plate (lines behind it never cross the text) and is registered as a
      // text box; every plate is drawn before any text, so a later row's feathered plate never washes the rows
      // above it. CB holds its box after the call (CB.split: the top of the first late row).
      // anchor: { x, y } a dashed leader from the title's outer side; { from: 'below' } from the block's lower edge
      // instead (a block above its target); { from: 'elbow' } level from the title, then vertical to the target.
      let CB = null;
      // the box callout() will draw for these lines (all rows shown), without drawing: { w, h } (CB's size)
      function calloutSize(lines) {
        let w = 0, h = 0;
        lines.forEach((l, i) => {
          const o = typeof l === 'string' ? { t: l } : l;
          if (o.tex) { w = Math.max(w, o.tex.w || 170); h += (o.tex.h || 20) + 4; } else { w = Math.max(w, textW(o.t, o.size || (i === 0 ? 13 : 12))); h += i === 0 ? 18 : LH; }
        });
        return { w: w + 8, h: h + 1 };
      }
      function callout(lines, x, y, al, align, anchor) {
        CB = null;
        if (al < 0.01) return y;
        let yy = y, bw = 0, split = -1, lateA = 1;
        const rows = [];
        lines.forEach((l, i) => {
          const o = typeof l === 'string' ? { t: l } : l;
          const ra = o.a == null ? 1 : clamp(o.a, 0, 1);
          if (ra < 0.01) return;
          if (o.a != null && split < 0) { yy += o.gap || 0; split = yy - 14; lateA = ra; }
          const row = { o, y: yy, ra, size: o.size || (i === 0 ? 13 : 12) };
          if (o.tex) { row.w = o.tex.w || 170; yy += (o.tex.h || 20) + 4; } else { row.w = textW(o.t, row.size); yy += i === 0 ? 18 : LH; }
          bw = Math.max(bw, row.w);
          rows.push(row);
        });
        const x0 = align === 'right' ? x - bw : x;
        CB = { x: x0 - 4, y: y - 14, w: bw + 8, h: yy - y + 1, split: split < 0 ? null : split };
        ctx.save();
        ctx.globalAlpha = al;
        if (split < 0) plate(CB.x, CB.y, CB.w, CB.h, al);
        else {
          plate(CB.x, CB.y, CB.w, split - CB.y, al);
          plate(CB.x, split, CB.w, CB.y + CB.h - split, al * lateA);
        }
        if (anchor) {
          ctx.strokeStyle = rgba(0.55);
          dashed([2, 3], () => {
            const ex = align === 'right' ? x + 6 : x - 6;
            ctx.beginPath();
            if (anchor.from === 'below') { ctx.moveTo(clamp(anchor.x, CB.x + 8, CB.x + CB.w - 8), CB.y + CB.h + 3); ctx.lineTo(anchor.x, anchor.y); }
            else if (anchor.from === 'elbow') { ctx.moveTo(ex, y - 4); ctx.lineTo(anchor.x, y - 4); ctx.lineTo(anchor.x, anchor.y); }
            else { ctx.moveTo(ex, y - 4); ctx.lineTo(ex + (align === 'right' ? 10 : -10), y - 4); ctx.lineTo(anchor.x, anchor.y); }
            ctx.stroke();
          });
          plus(anchor.x, anchor.y, 3, C.ink);
        }
        rows.forEach((row, i) => {
          const o = row.o;
          ctx.globalAlpha = al * row.ra;
          if (o.tex) { o.tex.place(x, row.y - 9, al * row.ra, align || 'left'); return; }
          text(o.t, x, row.y, { align: align || 'left', size: row.size, color: o.c || (i === 0 ? INK : SEC) });
        });
        ctx.restore();
        reg(CB.x, CB.y, CB.w, CB.h);
        return yy;
      }
      // The blowdown angle's block beside the drum (paper Eq. 4): the full form (δ = arctan(F_d/F_l) ≈ 16° and two
      // lines) or the short one (δ ≈ 16°, "blowdown"), left of the vertical, with its arc of radius R. Phones shrink
      // the arc until the label keeps ≥ 8 px from every unit, else leave the angle out (null); so does a fan with no
      // unit drawn near 16°.
      function blowGeom(forceShort) {
        if (Math.abs(fanAng(L.blowU) - 16) > 4) return null;
        const d = drumTop();
        const bwL = Math.max(TEX.blow.w || 190, textW('among the lowest of any AWE'));
        const bwS = Math.max(TEX.blowS.w || 60, textW('blowdown'));
        const short = !!forceShort || L.m || d.x - 11 - bwL < L.axisX + 12; // short when the long one would reach the axis
        const box = R => (short ? { x: d.x - 9 - bwS, y: d.y - R - 36, w: bwS + 2, h: 42 } : { x: d.x - 11 - bwL, y: d.y - R - 52, w: bwL + 2, h: 60 });
        let R = L.m ? 70 : 96;
        if (L.m) {
          const ub = unitTargetBoxes(8);
          while (R > 30 && ub.some(q => hitBox(box(R), q))) R -= 2;
          if (ub.some(q => hitBox(box(R), q))) return null;
        }
        return { R, short, box: box(R) };
      }
      // where the desktop lift callout goes (decided on the units' targets, so it never jumps while they launch):
      // { x, y, align, u (the unit it points at), anchor(u) → leader target, blowShort }
      function liftPlace(body) {
        const sz = calloutSize(body), s = L.us, ub = unitTargetBoxes(8);
        const boxAt = (x, y, align) => ({ x: align === 'right' ? x + 4 - sz.w : x - 4, y: y - 14, w: sz.w, h: sz.h });
        const clear = (b, others) => !ub.some(q => hitBox(b, q)) && !others.some(q => q && hitBox(b, q));
        const grow = (b, p) => (b ? { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p } : null);
        const col = { x: L.rcolX, y: L.rcolYS[2] + 2, align: 'left', u: 2, anchor: u => ({ x: u.x + 36 * u.s, y: u.y - 24 * u.s }) };
        if (L.pt) {
          // portrait: the empty sky under the headline, left of the fan, with a leader down to the first unit's dome
          // (in the right-hand column its leader would run along a tether); else that column, with an elbow leader
          const t = { x: L.axisX + 12, y: artTop(2) + 14, align: 'left', u: 0, anchor: u => ({ x: u.x - 14 * u.s, y: u.y - 39 * u.s - 4, from: 'below' }) };
          const b = boxAt(t.x, t.y, 'left');
          if (b.x + b.w <= L.W - 40 && clear(b, [])) return t;
          col.anchor = u => ({ x: u.x + 30 * u.s, y: u.y - 30 * u.s, from: 'elbow' });
          return col;
        }
        if (L.c) return col; // compact: the right-hand column, with a leader to the nearest unit
        // desktop: left of and below the first unit, unless it would come within 24 px of the blowdown block (a short
        // sky under a two-line headline, e.g. 1280×720 or 1366×768); then the empty right-hand column, then the
        // blowdown's short form, and last the callout moves up
        const t0 = unitTarget(0);
        const A = { x: Math.round(t0.x - 58 * s - 34), y: Math.round(t0.y + 70), align: 'right', u: 0, dy: 70,
          anchor: u => ({ x: u.x - 44 * u.s, y: u.y - 8 * u.s }) };
        const bA = boxAt(A.x, A.y, 'right'), BG = blowGeom(false);
        if (!BG || clear(bA, [grow(BG.box, 24)])) return A;
        if (clear(boxAt(col.x, col.y, 'left'), [])) return col;
        const BS = blowGeom(true);
        if (!BS || clear(bA, [grow(BS.box, 24)])) return Object.assign(A, { blowShort: true });
        A.dy = Math.min(70, BS.box.y - 24 - sz.h + 14 - t0.y);
        return Object.assign(A, { blowShort: true });
      }
      function drawLift(al) {
        if (al < 0.01 || S.launch[0] < 0.9) return;
        const a = al * clamp((S.stepT - 3.8) / 0.8, 0, 1);
        L.liftBox = null;
        let blowShort = false;
        if (L.m) {
          const y1 = callout(['Lift, one unit', 'helium 600 m³ ≈ 3.7 kN', { t: '= 17,167 N total (1.75 t)', c: C.accent }], 16, artTop(2) + 14, a, 'left');
          if (a > 0.05) L.mCallBot = Math.max(L.mCallBot, y1 - 10);
          L.liftBox = CB; L.liftU = 0;
        } else {
          const body = ['Lift, one Energy Unit', { tex: TEX.lift }, 'helium 600 m³ ≈ 3.7 kN', '+ lift wing, NACA 4412',
            { t: '= 17,167 N, the full 1.75 t', c: C.accent }];
          const pl = liftPlace(body), u = units[pl.u];
          // (beside a unit, the block follows its bob; in a column it stays put)
          const x = pl.dy != null ? Math.round(u.x - 58 * u.s - 34) : pl.x, y = pl.dy != null ? Math.round(u.y + pl.dy) : pl.y;
          callout(body, x, y, a, pl.align, pl.anchor(u));
          L.liftBox = CB; L.liftU = pl.u; blowShort = !!pl.blowShort;
        }
        // blowdown angle at the drum (paper Eq. 4), on the unit drawn nearest the paper's 16°
        const BG = blowGeom(blowShort), bu = L.blowU;
        const a2 = al * clamp((S.stepT - 5) / 0.8, 0, 1);
        if (BG && a2 > 0.01 && units[bu].a > 0.5) {
          const d = drumTop(), T = tetherCtrl(bu), R = BG.R, b = BG.box;
          const ang = Math.atan2(T.a.x - d.x, d.y - T.a.y);
          ctx.save();
          ctx.globalAlpha = a2;
          ctx.strokeStyle = rgba(0.5);
          dashed([2, 3], () => line(d.x, d.y, d.x, d.y - R - 24));
          ctx.beginPath(); ctx.arc(d.x, d.y, R, -Math.PI / 2, -Math.PI / 2 + ang); ctx.stroke();
          plate(b.x, b.y, b.w, b.h, a2);
          if (BG.short) {
            TEX.blowS.place(d.x - 8, d.y - R - 34, a2, 'right');
            text('blowdown', d.x - 8, d.y - R + 2, { align: 'right', color: SEC });
          } else {
            TEX.blow.place(d.x - 10, d.y - R - 50, a2, 'right');
            text('among the lowest of any AWE', d.x - 10, d.y - R - 12, { align: 'right', color: SEC });
            text('static tether, low tension', d.x - 10, d.y - R + 4, { align: 'right', color: SEC });
          }
          reg(b.x, b.y, b.w, b.h);
          ctx.restore();
        }
      }
      // Levelized cost of energy, $/MWh — paper Fig. 25 (SkyWindFarm ≈ $25, text §7; the rest read from the figure).
      const LCOE = [['SkyWindFarm', 25], ['FlyGen AWEs', 33], ['Onshore wind', 33], ['Solar PV', 48], ['GroundGen AWEs', 56], ['Offshore wind', 75]];
      // The grid art under a text column spanning x0…x1 (pylons, wires, the ground station): the column's text ends
      // ≥ 8 px above it (and ≥ 24 px above the bottom-right links).
      function artFloor(x0, x1) {
        let f = Math.min(L.ground - 8, L.H - 130);
        const gs = L.gs;
        GRID.pylons.forEach(p => { if (p.x + 0.26 * p.h > x0 && p.x - 0.26 * p.h < x1) f = Math.min(f, L.ground - p.h - 8); });
        GRID.pts.forEach(p => { if (p[0] > x0 && p[0] < x1) f = Math.min(f, p[1] - 8); });
        if (L.gx + 100 * gs > x0 && L.gx - 74 * gs < x1) f = Math.min(f, L.ground - 48 * gs - 8);
        return f;
      }
      // (rows under the bars, by level: 0 all · 1 one source line · 2 no to-scale row · 3 no source line; their
      // last glyph's bottom, below the bars' end)
      const LCOE_TAIL = [55, 41, 24, 8];
      function drawLcoe(x, y, w, al, compact, floor) {
        const t = S.stepT - 1.6;
        const k0 = clamp(t / 0.6, 0, 1) * al;
        L.lcoeBox = null; L.scaleBox = null;
        if (k0 < 0.01) return y;
        // the column never runs into the grid art below it (floor): where it would, the rows tighten, the two source
        // lines become one, the to-scale row goes (the paper figure stays a hover in the roomier layouts), and last
        // the source line (the caption names Fig. 25)
        const endOf = cmp => y + (cmp ? 19 : 20) + LCOE.length * (cmp ? 15 : 17) + 6;
        let cmp = !!compact, lvl = 0;
        if (floor != null && endOf(cmp) + LCOE_TAIL[0] > floor) {
          cmp = true;
          while (lvl < 3 && endOf(cmp) + LCOE_TAIL[lvl] > floor) lvl++;
        }
        const labW = 116, valW = 26, bw = w - labW - valW, rowH = cmp ? 15 : 17;
        const X = c => x + labW + (c / 75) * bw;
        const r0 = y + (cmp ? 19 : 20);
        const yEnd = r0 + LCOE.length * rowH + 6;
        const box = { x: x - 4, y: y - 14, w: w + 8, h: yEnd + LCOE_TAIL[lvl] + 1 - (y - 14) };
        plate(box.x, box.y, box.w, box.h, k0);
        ctx.save();
        ctx.globalAlpha = k0;
        const hl = hoverId === 'lcoe';
        kicker('COST OF ENERGY · $/MWh', x, y, hl ? C.accent : TER);
        let yy = r0;
        L.lcoeRow0 = yy - 12;
        LCOE.forEach((r, i) => {
          const g = eout(clamp((t - 0.25 - i * 0.12) / 0.7, 0, 1));
          const me = i === 0;
          text(r[0], x, yy + 4, { color: me ? INK : SEC });
          const x1 = lerp(X(0), X(r[1]), g);
          const by = Math.round(yy - 3) + 0.5;
          if (me) { ctx.fillStyle = C.accent; ctx.fillRect(X(0), by - 3, x1 - X(0), 6); }
          else { ctx.strokeStyle = rgba(0.7); ctx.strokeRect(Math.round(X(0)) + 0.5, by - 3, Math.max(0, Math.round(x1 - X(0))), 6); }
          ctx.globalAlpha = k0 * g;
          text((me ? '≈' : '') + r[1], x1 + 6, yy + 4, { color: me ? C.accent : SEC });
          ctx.globalAlpha = k0;
          yy += rowH;
        });
        ctx.strokeStyle = C.ink;
        line(Math.round(X(0)) + 0.5, y + 8, Math.round(X(0)) + 0.5, yy - 8);
        yy += 6;
        const k1 = clamp((t - 1.3) / 0.6, 0, 1) * al;
        ctx.globalAlpha = k1;
        text('≈ 25% below FlyGen AWEs', x, yy + 4, { color: INK });
        let ys = yy + 21;
        if (lvl < 2) {
          // an explicit affordance for the paper's to-scale figure (Fig. 26)
          const hs = hoverId === 'scale', sl = 'size vs a 150 kW turbine';
          plus(x + 3.5, yy + 16.5, 3.5, hs ? C.accent : C.ink);
          text(sl, x + 13, yy + 21, { color: hs ? C.accent : SEC });
          L.scaleBox = { x: x - 4, y: yy + 8, w: textW(sl) + 21, h: 18 };
          ys = yy + 38;
        }
        if (lvl === 0) {
          text('SkyWindFarm paper, 2024 · Fig. 25', x, ys, { size: 11, color: TER });
          text('selected bars, read from figure', x, ys + 14, { size: 11, color: TER });
        } else if (lvl < 3) text('Paper Fig. 25, read from figure', x, ys, { size: 11, color: TER });
        ctx.restore();
        L.lcoeBox = { x: x - 6, y: y - 16, w: w + 12, h: yy + 8 - (y - 16), row0: L.lcoeRow0 };
        reg(box.x, box.y, box.w, box.h);
        return yEnd + LCOE_TAIL[lvl];
      }
      function drawPower(al) {
        if (al < 0.01) return;
        // the wind at 3 km as displayed (the slider label, the panel and its caveat all use the same value)
        const vd = vD(S.v), P = pUnit(vd), net = P * 0.81;
        const a = al * clamp((S.stepT - 0.8) / 0.8, 0, 1);
        // the paper's operating window is 18–33 m/s (cut-in / cut-out, p. 20): outside it the unit delivers nothing,
        // and ½ρv³CpAN is only a theoretical number
        const inWin = vd >= V_IN && vd <= V_OUT;
        const cut = vd < V_IN ? `below ${V_IN} m/s cut-in (p. 20)` : `above ${V_OUT} m/s cut-out (p. 20)`;
        const title = `Per unit, at ${f1(vd)} m/s`;
        if (L.m) {
          // one block: the cost rows fade in later on their own plate, drawn before any text (two stacked
          // callouts would lay the second one's feathered plate over the first one's last line)
          const k2 = clamp((S.stepT - 2.4) / 0.8, 0, 1);
          const ml = inWin ? [title, { t: `${fmtInt(P / 1000)} kW → ≈ ${fmtInt(net / 1000)} kW delivered`, c: C.accent }]
            : [title, { t: `0 kW delivered (${fmtInt(P / 1000)} kW theoretical)`, c: INK }, { t: cut, c: SEC }];
          const cost = L.short ? [{ t: 'cost ≈ $25/MWh · FlyGen $33 · Fig. 25', c: INK, size: 12, a: k2, gap: 2 }]
            : [{ t: 'cost ≈ $25/MWh · FlyGen AWEs $33', c: INK, size: 12, a: k2, gap: 2 },
              { t: 'SkyWindFarm paper, 2024 · Fig. 25', c: TER, size: 11, a: k2 }];
          const y2 = callout(ml.concat(cost), 16, artTop(4) + 14, a, 'left');
          L.lcoeBoxM = CB && CB.split != null && k2 > 0.05 ? { x: CB.x, y: CB.split, w: CB.w, h: CB.y + CB.h - CB.split } : null;
          if (a > 0.05) L.mCallBot = Math.max(L.mCallBot, y2 - 10);
          return;
        }
        const x = L.rcolX, y = L.rcolYS[4] + 2;
        const lines = inWin ? [title, { t: `${fmtInt(P / 1000)} kW harvested`, c: INK }, { t: `→ ≈ ${fmtInt(net / 1000)} kW delivered`, c: C.accent }]
          : [title, { t: `${fmtInt(P / 1000)} kW theoretical`, c: SEC }, { t: '0 kW delivered', c: INK }, { t: cut, c: SEC }];
        const y1 = callout(lines, x, y, a, 'left');
        drawLcoe(x, y1 + 20, L.rcolW, al, L.H < 800, artFloor(x - 12, x + L.rcolW + 12));
        // labels on the ground station
        const b = clamp((S.stepT - 1.4) / 0.8, 0, 1) * al;
        ctx.save();
        ctx.globalAlpha = b;
        const G = L.ground;
        [['drum', L.gx], ['motor', L.gx - 53], ['storage', L.gx + 66]].forEach(([s, xx]) => {
          text(s, xx, G + 18, { align: 'center', color: SEC });
          reg(xx - textW(s) / 2 - 4, G + 5, textW(s) + 8, 17);
        });
        ctx.restore();
      }
      // "+ system" sits on the ground station, just above the storage container
      function drawSystemMarker(al) {
        if (al < 0.01 || L.m) return;
        const gs = L.gs, x = L.gx + 40 * gs, y = L.ground - 44 * gs;
        const hl = hoverId === 'system';
        ctx.save();
        ctx.globalAlpha = al;
        plus(x, y, 3.5, hl ? C.accent : C.ink);
        text('system', x + 8, y + 4, { color: hl ? C.accent : SEC });
        ctx.restore();
        L.sysBox = { x: x - 8, y: y - 10, w: textW('system') + 22, h: 20 };
        reg(x - 5, y - 9, textW('system') + 17, 17);
      }
      // step 3: outside the 18–33 m/s window the turbines stop; say so near the units
      function drawWindowNote(al) {
        if (al < 0.01 || S.win > 0.5 || units[1].a < 0.5) return;
        const vd = vD(S.v);
        const s0 = vd < V_IN ? `below the ${V_IN} m/s cut-in:` : `above the ${V_OUT} m/s cut-out:`, s1 = 'turbines stop';
        const a = al * (1 - S.win * 2);
        let lines, x, y;
        if (L.c) {
          // compact: the lift callout holds the top-right slot, so the note goes in the same column, two lines,
          // ≥ 16 px under the lift block (where that block will be, before it has faded in)
          const liftNext = L.rcolYS[2] + 2 + 18 + ((TEX.lift.h || 20) + 4) + 3 * LH;
          lines = [s0, s1]; x = L.rcolX; y = liftNext + 16;
        } else {
          // centred over the top unit, kept inside the gutters (16 px on phones, 40 px otherwise)
          const u = units[1], s = `${s0} ${s1}`, sw = textW(s);
          lines = [s]; x = clamp(u.x - sw / 2, L.m ? 16 : L.axisX + 12, L.W - (L.m ? 16 : 40) - sw);
          y = Math.max(L.top - 14, u.y - 44 * u.s - 14);
        }
        const w = Math.max.apply(null, lines.map(s => textW(s))), h = 16 * lines.length;
        plate(x - 4, y - 12, w + 8, h, a);
        ctx.save();
        ctx.globalAlpha = a;
        lines.forEach((s, i) => text(s, x, y + i * 16, { color: C.accent }));
        ctx.restore();
        reg(x - 4, y - 12, w + 8, h);
      }

      /* ---------------------------------------------------------------- close-up (step 4) */
      function unitPt(lx, ly) { const u = units[1]; return { x: u.x + lx * u.s, y: u.y + ly * u.s }; }
      function drawCloseLabels(al) {
        if (al < 0.01) return;
        const u = units[1], s = u.s;
        const t = S.stepT - 1.5;
        const fade = i => al * clamp((t - i * 0.45) / 0.6, 0, 1);
        const T3 = TSIDE[3], W1 = WSIDE[0];
        const anchors = {
          shell: unitPt(-26, -30), wing: unitPt(6, -15), turb: unitPt(T3.X + 4, T3.Y + 14),
          wall: unitPt((W1[0].X + W1[1].X) / 2, (W1[0].Y + W1[1].Y) / 2 + 18), tether: unitPt(-3, 52),
        };
        const specs = [
          { id: 'shell', side: 'L', y: -48, lines: ['Flotation module', 'LTA shell, 600 m³ helium', 'lift ≈ 3.7 kN', 'PVF · polyester · TPU skin'] },
          { id: 'wing', side: 'R', y: -48, lines: ['Stability module', 'lift wing, NACA 4412', { t: 'reorients to a 30° wind', id: 'stab' }, { t: 'shift in 7.2 s', id: 'stab' }] },
          { id: 'turb', side: 'R', y: 22, lines: ['Energy module', '4 Darrieus VAWTs, 3 × 4 m', 'direct-drive generators', { t: 'counter-rotating pairs', c: C.accent }, { t: 'cancel their torque', c: C.accent }] },
          { id: 'wall', side: 'L', y: 62, lines: ['Diffuser walls', '40° to the wind', 'shield the return stroke', 'speed up the power stroke'] },
          { id: 'tether', side: 'C', y: 0, lines: ['Bridle → tether', 'one static, conducting line'] },
        ];
        L.stabBox = null;
        let stackBottom = 0;
        ctx.save();
        specs.forEach((sp, i) => {
          const a = fade(i);
          if (a < 0.01) return;
          const an = anchors[sp.id];
          let x, y, align;
          if (L.stack) {
            // phones and portrait tablets: callouts above and below the unit (no bridle label: the formula goes there)
            if (sp.id === 'tether') return;
            const top = sp.y < 0;
            align = sp.side === 'L' ? 'left' : 'right';
            // short phones: the lower two are titles beside the bridle's apex (the caption names them too)
            const beside = L.m && L.mShort && !top;
            y = top ? (L.m ? L.mTopBase : artTop(3) + 14)
              : Math.round(u.y + (beside ? 50 : 76) * s);
            // left of the unit, the control column (x < 280, 30–70% of the height) is reserved on tablets
            const inZone = !L.m && y > L.H * 0.3 - 80 && y < L.H * 0.7 + 10;
            x = sp.side === 'L' ? (L.m ? 16 : inZone ? L.cx0 : 40) : L.W - (L.m ? 16 : 40);
            if (L.m) {
              const short = { shell: 'LTA shell, 600 m³ He', wing: 'lift wing, NACA 4412', turb: '4 counter-rotating VAWTs', wall: '40° to the wind' };
              sp = Object.assign({}, sp, { lines: beside ? [sp.lines[0]] : [sp.lines[0], short[sp.id]] });
            }
          } else if (sp.side === 'C') {
            if (L.c) return; // compact: the formula sits under the unit instead
            x = u.x + 30; y = u.y + 52 * s + 64; align = 'left';
          } else {
            const edge = 50 * s + L.labGap;
            x = sp.side === 'L' ? u.x - edge : u.x + edge;
            y = u.y + sp.y * s;
            align = sp.side === 'L' ? 'right' : 'left';
          }
          const hl = hoverId === sp.id;
          let bw = 0;
          sp.lines.forEach((l, k) => { bw = Math.max(bw, textW(typeof l === 'string' ? l : l.t, k === 0 ? 13 : 12)); });
          // right-aligned blocks never reach into the control column
          const xMin = (L.cx0 || 296) - 6;
          if (align === 'right' && !L.m && !L.stack && x - bw < xMin) x = xMin + bw;
          // and left-aligned ones end on the chrome's 40 px gutter
          if (align === 'left' && !L.m && !L.stack && x + bw > L.W - 40) x = L.W - 40 - bw;
          const bh = 18 + LH * (sp.lines.length - 1);
          const bx0 = align === 'right' ? x - bw : x;
          if (!sp.y || sp.y > 0) stackBottom = Math.max(stackBottom, y + bh - 14);
          ctx.globalAlpha = a;
          plate(bx0 - 4, y - 14, bw + 8, bh, a);
          // leader: from the text block's edge to the anchor, with an elbow (stacked: from the block's lower or
          // upper edge, above the anchor where it can be, so it never runs through the text)
          ctx.strokeStyle = hl ? C.accent : rgba(0.5);
          const ex = align === 'right' ? x + 8 : align === 'left' ? x - 8 : x;
          const ey = y - 5;
          dashed([2, 3], () => {
            ctx.beginPath();
            if (L.stack) {
              const lx0 = clamp(an.x, bx0 + 2, bx0 + bw - 2), ly0 = an.y > y ? y - 14 + bh + 2 : y - 16;
              ctx.moveTo(lx0, ly0); ctx.lineTo(an.x, an.y);
            } else if (sp.side === 'C') { ctx.moveTo(align === 'left' ? x - 6 : x + 6, ey); ctx.lineTo(an.x, an.y); }
            else { const mx = align === 'right' ? ex + 18 : ex - 18; ctx.moveTo(ex, ey); ctx.lineTo(mx, ey); ctx.lineTo(an.x, an.y); }
            ctx.stroke();
          });
          plus(an.x, an.y, 3, hl ? C.accent : C.ink);
          let yy = y;
          sp.lines.forEach((l, k) => {
            const o = typeof l === 'string' ? { t: l } : l;
            const hs = o.id === 'stab' && hoverId === 'stab';
            text(o.t, x, yy, { align, size: k === 0 ? 13 : 12, color: (hl && k === 0) || hs ? C.accent : o.c || (k === 0 ? INK : SEC) });
            if (o.id === 'stab') {
              const w = textW(o.t), sx0 = align === 'right' ? x - w : x;
              const b = L.stabBox;
              L.stabBox = b ? { x: Math.min(b.x, sx0 - 4), y: b.y, w: Math.max(b.x + b.w, sx0 + w + 4) - Math.min(b.x, sx0 - 4), h: yy + 5 - b.y }
                : { x: sx0 - 4, y: yy - 13, w: w + 8, h: 18 };
            }
            yy += k === 0 ? 18 : LH;
          });
          reg(bx0 - 4, y - 14, bw + 8, bh);
        });
        ctx.restore();
        L.closeBottom = stackBottom;
      }
      function drawFormula(al) {
        if (al < 0.01) return;
        const vd = vD(S.v), P = pUnit(vd);
        const inWin = vd >= V_IN && vd <= V_OUT;
        const a = al * clamp((S.stepT - 3.2) / 0.8, 0, 1);
        if (a < 0.01) return;
        // the numeric substitution follows the live wind (re-typeset at most ~8x per second)
        if (S.A - (TEX.unitSub.lastSet || 0) > 0.12) {
          TEX.unitSub.lastSet = S.A;
          TEX.unitSub.set(`= \\tfrac{1}{2}\\,(0.8)(${f1(vd)})^{3}(0.43)(12)(4)`);
        }
        ctx.save();
        ctx.globalAlpha = a;
        if (L.m || L.c) {
          // phones and compact: a short block under the unit (the tether passes behind it)
          const u = units[1];
          const y = L.m ? L.fy
            : Math.round(Math.min(L.H - 118, L.stack ? Math.max(u.y + 52 * u.s + 40, (L.closeBottom || 0) + 44) : u.y + 52 * u.s + 60));
          // short phones: the TSR · Cp line is in the caption; the block is two lines
          const tsr = !(L.m && L.mShort), bh = tsr ? 66 : 48;
          const l2 = inWin ? `= ${fmtInt(P / 1000)} kW at ${f1(vd)} m/s` : L.m ? `0 kW: outside ${V_IN}–${V_OUT} m/s (${fmtInt(P / 1000)} kW in theory)`
            : `${fmtInt(P / 1000)} kW theoretical · 0 kW outside ${V_IN}–${V_OUT} m/s`;
          const hl = hoverId === 'cp' || hoverId === 'tunnel';
          const col = hl ? C.accent : SEC, a0 = 'TSR 3 · ', a1 = '0.43 · r > 0.95 vs tunnel';
          const w0 = textW(a0), tw = TEX.cp.w || 17, w1 = textW(a1), wl = w0 + tw + 5 + w1;
          const bw = Math.max(tsr ? wl : 0, textW(l2), TEX.unitP.w || 150);
          // centred under the unit; on a compact window slid sideways (≤ 90 px) off any callout it would touch
          let cx = L.m ? L.W / 2 : u.x;
          if (!L.m) {
            const lo = (L.cx0 || 296) + bw / 2 + 6, hi = L.W - 40 - bw / 2 - 6;
            for (const d of [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90]) {
              const c2 = clamp(u.x + d, lo, hi), b = { x: c2 - bw / 2 - 6, y: y - 26, w: bw + 12, h: bh };
              if (!LB.some(q => hitBox(b, q))) { cx = c2; break; }
            }
          }
          const x0 = cx - wl / 2;
          plate(cx - bw / 2 - 6, y - 26, bw + 12, bh, a);
          TEX.unitP.size_(16);
          TEX.unitP.place(cx, y - 22, a, 'center');
          text(l2, cx, y + 16, { align: 'center', color: inWin ? C.accent : SEC });
          if (tsr) {
            text(a0, x0, y + 33, { color: col });
            TEX.cp.accent_(hl);
            TEX.cp.place(x0 + w0, y + 33 - 12, a, 'left');
            text(a1, x0 + w0 + tw + 5, y + 33, { color: col });
            L.cpLine = { x: x0 - 4, y: y + 19, w: wl + 8, h: 19 };
          } else L.cpLine = null;
          reg(cx - bw / 2 - 6, y - 26, bw + 12, bh);
          ctx.restore();
          return;
        }
        const x = L.rcolX, y0 = L.rcolYS[3] - 2;
        ko(x - 6, y0 - 16, L.rcolW + 12, 150, a);
        if (L.plan) ko(L.plan.x - 6, L.plan.y - 24, L.plan.w + 12, L.plan.h + 104, a);
        TEX.unitP.size_(20);
        kicker('HARVESTED POWER · ONE UNIT', x, y0);
        TEX.unitP.place(x, y0 + 12, a, 'left');
        TEX.unitSub.place(x, y0 + 48, a, 'left');
        if (inWin) {
          text(`= ${fmtInt(P / 1000)} kW`, x + 2, y0 + 92, { size: 14, color: C.accent });
          text(`≈ ${fmtInt((P * 0.81) / 1000)} kW delivered`, x + 2, y0 + 110, { color: SEC });
        } else {
          text(`= ${fmtInt(P / 1000)} kW, theoretical`, x + 2, y0 + 92, { size: 14, color: SEC });
          text(`0 kW: ${vd < V_IN ? `below ${V_IN} m/s cut-in` : `above ${V_OUT} m/s cut-out`}`, x + 2, y0 + 110, { color: INK });
        }
        text('air 0.8 kg/m³ · 12 m²/rotor', x + 2, y0 + 127, { color: TER });
        reg(x - 4, y0 - 14, L.rcolW + 8, 146);
        // plan view + readout
        const pl = L.plan;
        if (pl) drawPlan(pl, a);
        ctx.restore();
      }
      function drawPlan(r, al) {
        const k = Math.min(r.w / 16, r.h / 15.5);
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 6;
        // Paper Fig. 6 rotated 90° counter-clockwise on screen (a true rotation, not a transpose, so handedness
        // is kept): the fig's downwind (+y, down the page) becomes screen +x, its +x (right) becomes screen up.
        // T1 and its wall end up at the bottom, T4 and its wall at the top; T1 still turns CW, T4 CCW, so each
        // wall shields its rotor's outboard return stroke, as in the paper.
        const P = (fx, fy) => ({ x: cx + (fy - PLAN_C[1]) * k, y: cy - (fx - PLAN_C[0]) * k });
        const hl = hoverId === 'plan';
        ctx.save();
        ctx.globalAlpha *= 1;
        kicker('PLAN VIEW · PAPER FIG. 6', r.x, r.y - 8, hl ? C.accent : TER);
        ctx.strokeStyle = rgba(0.3);
        dashed([2, 3], () => { ctx.beginPath(); ctx.arc(cx, cy, 7.5 * k, 0, TAU); ctx.stroke(); });
        // streamlines with moving dashes, funnelled by the walls
        ctx.strokeStyle = rgba(0.22);
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -S.T * 26 * (S.v / V_DESIGN);
        for (let c = -12; c <= 3.2; c += 1.25) {
          ctx.beginPath();
          for (let d = -6; d <= 9; d += 0.25) {
            let off = 0;
            // funnel toward T1 / T4 behind the walls
            if (c < -9.5) off = 0.9 * sstep(-4.5, -1.5, d) * sstep(-12.8, -10.2, c) * (1 - sstep(0.5, 5, d) * 0.6);
            if (c > 0.7) off = -0.9 * sstep(-4.5, -1.5, d) * sstep(3.6, 1.2, c) * (1 - sstep(0.5, 5, d) * 0.6);
            const p = P(c + off, d);
            if (Math.hypot(p.x - cx, p.y - cy) > 7.9 * k) { if (d > -6) ctx.moveTo(p.x, p.y); continue; }
            if (d === -6) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        ctx.restore();
        // walls
        ctx.strokeStyle = hl ? C.accent : C.ink;
        ctx.lineWidth = 2;
        WALLS.forEach(w => { const a = P(w[0][0], w[0][1]), b = P(w[1][0], w[1][1]); line(a.x, a.y, b.x, b.y); });
        ctx.lineWidth = 1;
        // turbines with rotating blades
        TURB.forEach((t, i) => {
          const p = P(t.x, t.y);
          ctx.strokeStyle = hl ? C.accent : C.ink;
          ctx.fillStyle = C.bg;
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 * k, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = rgba(0.2);
          dashed([1, 3], () => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * k, 0, TAU); ctx.stroke(); });
          const ph = S.rot[1] + i * 1.3;
          ctx.fillStyle = hl ? C.accent : C.ink;
          for (let b = 0; b < 3; b++) {
            // viewed from above like the figure; canvas angles grow clockwise, so dir −1 (CW) → +ph
            const a = -t.dir * ph + (b * TAU) / 3;
            ctx.fillRect(p.x + Math.cos(a) * 1.5 * k - 1.5, p.y + Math.sin(a) * 1.5 * k - 1.5, 3, 3);
          }
          // rotation arrow
          ctx.strokeStyle = rgba(0.6);
          const a0 = -Math.PI * 0.8, a1 = -Math.PI * 0.2, rr = 0.75 * k;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, a0, a1); ctx.stroke();
          const end = t.dir > 0 ? a0 : a1, sgn = t.dir > 0 ? 1 : -1;
          const ex = p.x + Math.cos(end) * rr, ey = p.y + Math.sin(end) * rr;
          const tx = -Math.sin(end) * sgn, ty = Math.cos(end) * sgn;
          line(ex, ey, ex + (tx * -3 + Math.cos(end) * 2.5), ey + (ty * -3 + Math.sin(end) * 2.5));
          line(ex, ey, ex + (tx * -3 - Math.cos(end) * 2.5), ey + (ty * -3 - Math.sin(end) * 2.5));
          const lab = `${t.n} ${t.dir > 0 ? 'CCW' : 'CW'}`;
          text(lab, p.x + 1.8 * k + 4, p.y + 4, { align: 'left', color: TER });
        });
        // wind arrow
        const wy = cy - 7.5 * k + 6;
        ctx.strokeStyle = C.ink;
        line(r.x, wy, r.x + 22, wy); line(r.x + 22, wy, r.x + 18, wy - 3); line(r.x + 22, wy, r.x + 18, wy + 3);
        text('wind', r.x, wy - 7, { color: TER });
        text('15 m region', cx, cy + 7.5 * k + 16, { align: 'center', color: TER });
        // performance readout (hover → Fig. 15 / the wind tunnel)
        const hy = r.y + r.h + 44;
        {
          const col = hoverId === 'cp' ? C.accent : INK, a0 = 'TSR 3.0 · ', w0 = textW(a0, 13);
          text(a0, r.x, hy, { size: 13, color: col });
          TEX.cp.accent_(hoverId === 'cp');
          TEX.cp.place(r.x + w0, hy - 13, al, 'left');
          text('0.43', r.x + w0 + (TEX.cp.w || 17) + 5, hy, { size: 13, color: col });
        }
        text('r > 0.95, CFD vs wind tunnel', r.x, hy + 18, { color: hoverId === 'tunnel' ? C.accent : SEC });
        if (r.rpm) text(`rotor ${fmtInt((TSR * S.v) / R_T * 60 / TAU)} rpm at TSR 3`, r.x, hy + 34, { color: SEC });
        L.cpY = hy;
        ctx.restore();
      }
      function drawCloseTether(al) {
        if (al < 0.01) return;
        const u = units[1];
        const bp = { x: u.x - 3 * u.s, y: u.y + 52 * u.s };
        const yEnd = L.m ? Math.max(bp.y + 20, L.fy + 22) : L.H - 90;
        const g = ctx.createLinearGradient(0, bp.y, 0, yEnd);
        g.addColorStop(0, rgba((0.8 * al).toFixed(3))); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = hoverId === 'tether' ? C.accent : g;
        const dx = (yEnd - bp.y) * Math.tan((-10 * Math.PI) / 180);
        line(bp.x, bp.y, bp.x + dx, yEnd);
      }

      /* ---------------------------------------------------------------- energy & HDI chart */
      const CH = { dots: [], order: [], world: null };
      const lx = k => Math.log10(k);
      const XMIN = lx(250), XMAX = lx(250000), YMIN = 0.4, YMAX = 1.0;
      const FIT = e => -0.0177 + 0.1955 * e; // log-linear fit over the 44 (brief), drawn 300–30,000 kWh
      function buildChart() {
        const r = L.chart;
        const X = k => r.x + ((lx(k) - XMIN) / (XMAX - XMIN)) * r.w;
        const Y = h => r.y + r.h - ((h - YMIN) / (YMAX - YMIN)) * r.h;
        CH.X = X; CH.Y = Y;
        CH.dots = HDI.map(d => ({ n: d[0], iso: d[1], kwh: d[2], hdi: d[3], x: X(d[2]), y: Y(d[3]), lab: HDI_LABELS[d[1]] || null, lp: null }));
        CH.order = CH.dots.map((d, i) => i).sort((a, b) => CH.dots[a].kwh - CH.dots[b].kwh);
        CH.world = { x: X(WORLD[2]), y: Y(WORLD[3]) };
        placeLabels();
      }
      // Label placement: the preferred anchor first, then the others around the dot; the first one that stays
      // in the plot, touches no dot, the World marker, the annotation block or a label already placed, and sits
      // nearer its own dot than any other (else the label is left out: its dot stays hollow, hover names it).
      function placeLabels() {
        const r = L.chart, Y = CH.Y;
        const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        const boxes = [];
        const dotBox = d => ({ x: d.x - 4.5, y: d.y - 4.5, w: 9, h: 9 });
        const dotHits = (b, skip) => CH.dots.filter(o => o !== skip && hit(b, dotBox(o))).length;
        // a label reads as naming the dot nearest to it: another dot clearly (3 px) closer to its box is ambiguous
        const gapTo = (b, d) => Math.hypot(Math.max(b.x - d.x, 0, d.x - b.x - b.w), Math.max(b.y - d.y, 0, d.y - b.y - b.h));
        const ambiguous = (b, d) => { const g = gapTo(b, d) - 3; return CH.dots.some(o => o !== d && gapTo(b, o) < g); };
        const inPlot = b => b.x >= r.x + 4 && b.x + b.w <= r.x + r.w + 2 && b.y >= r.y - 14 && b.y + b.h <= r.y + r.h - 2;
        // "World": left of its marker, else right, below or above, wherever no country's dot sits
        const ww = textW('World', 12), wx = CH.world.x, wy = CH.world.y;
        const wc = [[-9, 4, 'right'], [9, 4, 'left'], [0, 18, 'center'], [0, -10, 'center'], [-12, 15, 'right'], [12, 15, 'left'], [-12, -7, 'right'], [12, -7, 'left']].map(c => {
          const x0 = c[2] === 'right' ? wx + c[0] - ww : c[2] === 'center' ? wx - ww / 2 : wx + c[0];
          return { c, b: { x: x0 - 2, y: wy + c[1] - 11, w: ww + 4, h: 14 } };
        });
        if (!L.m) {
          boxes.push({ x: r.x + 20, y: Y(0.95) - 14, w: 330, h: 66 }); // r = 0.91 block
          const wp = wc.find(o => !dotHits(o.b)) || wc[0];
          CH.worldLab = wp.c;
          boxes.push(wp.b);
          [[0.55, 14], [0.55, -6], [0.7, -6], [0.8, -6]].forEach(([hv, dy]) => boxes.push({ x: r.x + r.w - 76, y: Y(hv) + dy - 11, w: 76, h: 14 }));
        } else boxes.push({ x: r.x + r.w - 206, y: Y(0.46) - 31, w: 206, h: 35 }); // r = 0.91 (+ world), lower right
        boxes.push({ x: CH.world.x - 7, y: CH.world.y - 7, w: 14, h: 14 });
        boxes.push({ x: r.x - 4, y: r.y - 29, w: textW('Human Development Index', 13) + 8, h: 17 }); // the plot's title
        const ALT = [[8, 4, 'left'], [-8, 4, 'right'], [0, -9, 'center'], [0, 17, 'center'], [6, -7, 'left'], [-6, -7, 'right'], [6, 15, 'left'], [-6, 15, 'right'],
          [0, -20, 'center'], [0, 28, 'center'], [-8, -16, 'right'], [8, -16, 'left']];
        // (2 px around the glyphs; against the dots the box ends 1 px under the baseline unless the name has a
        // descender, against labels and blocks it keeps 3 px there, so two names never stack tight)
        const full = b => ({ x: b.x, y: b.y, w: b.w, h: 14 });
        const boxOf = (d, c, w) => {
          const tx = d.x + c[0], ty = d.y + c[1];
          const x0 = c[2] === 'right' ? tx - w : c[2] === 'center' ? tx - w / 2 : tx;
          return { x: x0 - 2, y: ty - 11, w: w + 4, h: /[gjpqyQ]/.test(d.n) ? 14 : 12 };
        };
        // the extremes and the big economies first; in a crowded cluster (narrow windows) a label that can only
        // land on another label, a block or a dot is left out (its dot stays hollow; hover still names it)
        const PRI = ['ISL', 'USA', 'CHN', 'IND', 'NGA', 'ETH', 'QAT', 'BGD', 'NOR', 'DEU'];
        CH.dots.forEach(d => { d.lp = null; });
        const todo = CH.dots.filter(d => d.lab && !(L.m && !d.lab[3])).sort((a, b) => PRI.indexOf(a.iso) - PRI.indexOf(b.iso));
        for (const d of todo) {
          const pref = L.m && d.lab[4] ? d.lab[4] : d.lab;
          const w = textW(d.n, 12);
          // cost = overlaps (labels and blocks weigh more than dots); the first zero-cost anchor wins,
          // otherwise the cheapest one, as long as it touches nothing
          let pick = null, best = 1e9;
          for (const c of [pref].concat(ALT)) {
            const b = boxOf(d, c, w);
            if (!inPlot(b)) continue;
            const cost = 3 * boxes.filter(o => hit(full(b), o)).length + dotHits(b, d) + (ambiguous(b, d) ? 1 : 0) +
              (Math.abs(c[1]) > 18 ? 0.5 : 0); // far anchors only when the near ones collide
            if (cost < best) { best = cost; pick = { c, b }; }
            if (!cost) break;
          }
          if (!pick || best >= 1) continue;
          d.lp = pick.c;
          boxes.push(full(pick.b));
        }
        // phones: "World" goes last, only where it clears every dot and label (else a line over r = 0.91 names the +)
        if (L.m) {
          const wp = wc.find(o => inPlot(o.b) && !dotHits(o.b) && !boxes.some(q => hit(o.b, q)));
          CH.worldLab = wp ? wp.c : null;
        }
      }
      function drawChart(al) {
        if (al < 0.01) return;
        const r = L.chart, X = CH.X, Y = CH.Y;
        const t = S.stepT;
        ctx.save();
        ctx.globalAlpha = al;
        ctx.lineWidth = 1;
        const bx = Math.round(r.x) + 0.5, by = Math.round(r.y + r.h) + 0.5;
        const dA = eio(clamp(t / 1.1, 0, 1));
        ctx.strokeStyle = C.ink;
        line(bx, by, bx + r.w * dA, by);
        line(bx, by, bx, by - r.h * dA);
        // x ticks: decades + minor (drawn behind the axis' draw head)
        for (let e = 2; e <= 5; e++) {
          for (let m = 1; m < 10; m++) {
            const k = m * Math.pow(10, e);
            if (k < 300 || k > 250000) continue;
            const xx = Math.round(X(k)) + 0.5;
            if (xx > bx + r.w * dA) continue;
            line(xx, by, xx, by + (m === 1 ? 5 : 2.5));
            if (m === 1) text(`${fmtInt(k)}`, xx, by + 18, { size: 11, align: 'center', color: C.g600 });
          }
        }
        // labels tied to the far ends of the axes appear only once the axes have grown to them
        const late = sstep(0.8, 1, dA);
        ctx.globalAlpha = al * late;
        text(L.m ? 'kWh per person per year (log)' : 'primary energy per person, kWh per year (log scale)', bx + r.w, by + 36, { size: 12, align: 'right', color: TER });
        ctx.globalAlpha = al;
        // y: HDI tiers (UNDP cut-offs)
        const tiers = [[0.55, 'medium'], [0.7, 'high'], [0.8, 'very high']];
        [0.4, 0.55, 0.7, 0.8, 1.0].forEach(hv => {
          const yy = Math.round(Y(hv)) + 0.5;
          if (yy < by - r.h * dA - 0.5) return;
          line(bx - 4, yy, bx, yy);
          text(hv.toFixed(2), bx - 8, yy + 4, { size: 11, align: 'right', color: C.g600 });
        });
        ctx.strokeStyle = rgba(0.16);
        dashed([2, 4], () => tiers.forEach(([hv]) => { const yy = Math.round(Y(hv)) + 0.5; line(bx + 1, yy, bx + r.w * dA, yy); }));
        if (!L.m) {
          ctx.globalAlpha = al * late;
          text('low', bx + r.w, Y(0.55) + 14, { size: 11, align: 'right', color: TER });
          tiers.forEach(([hv, nm]) => text(nm, bx + r.w, Y(hv) - 6, { size: 11, align: 'right', color: TER }));
          ctx.globalAlpha = al;
        }
        ctx.globalAlpha = al * late;
        text('Human Development Index', bx, r.y - 16, { size: 13, color: INK });
        reg(bx - 4, r.y - 29, textW('Human Development Index', 13) + 8, 17);
        ctx.globalAlpha = al;
        // the fit: a dashed guide in the accent that fades out over its last 15% and ends in a small +
        const fitA = clamp((t - 7.2) / 1.4, 0, 1);
        if (fitA > 0.01) {
          const e0 = lx(300), e1 = lx(30000), eEnd = lerp(e0, e1, eio(fitA)), eF = lerp(e0, e1, 0.85);
          const p0 = { x: X(Math.pow(10, eF)), y: Y(FIT(eF)) }, p1 = { x: X(Math.pow(10, e1)), y: Y(FIT(e1)) };
          const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          g.addColorStop(0, acc(0.6)); g.addColorStop(1, acc(0));
          ctx.strokeStyle = g;
          dashed([4, 4], () => {
            ctx.beginPath();
            for (let e = e0; e <= eEnd + 1e-6; e += 0.02) {
              const xx = X(Math.pow(10, e)), yy = Y(FIT(e));
              if (e === e0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
          });
          if (fitA >= 1) plus(p1.x, p1.y, 3, acc(0.45));
          const fa = al * clamp((t - 8.2) / 0.8, 0, 1);
          ctx.globalAlpha = fa;
          if (!L.m) {
            const ax = bx + 24, ay = Math.round(Y(0.95));
            text('correlation r = 0.91 · 187 countries', ax, ay, { size: 13, color: C.accent });
            TEX.hdi.place(ax, ay + 9, fa, 'left');
            text('44 shown · fit drawn 300–30,000 kWh', ax, ay + 45, { color: TER });
            ko(ax - 6, ay - 16, 300, 66, fa);
          } else {
            // phones: the empty lower right of the plot (high energy, low HDI: no country sits there)
            text('r = 0.91 · 187 countries', bx + r.w - 4, Math.round(Y(0.46)), { size: 13, align: 'right', color: C.accent });
          }
          ctx.globalAlpha = al;
        }
        // dots in ascending energy order (as if the arriving power fills them); labelled ones are solid ink,
        // the hovered one takes the accent
        const shown = S.dotsShown;
        const labs = [];
        for (let j = 0; j < shown && j < CH.order.length; j++) {
          const d = CH.dots[CH.order[j]];
          const age = t - (1.2 + j * 0.12);
          const k = clamp(age / 0.35, 0, 1);
          const isLab = !!d.lp;
          const hov = hoverDot === CH.order[j];
          ctx.strokeStyle = hov ? C.accent : C.ink;
          ctx.fillStyle = hov ? C.accent : isLab ? C.ink : C.bg;
          const rr = (isLab || hov ? 3.2 : 2.8) * (0.4 + 0.6 * eout(k)) + (1 - k) * 3;
          ctx.beginPath(); ctx.arc(d.x, d.y, rr, 0, TAU);
          ctx.fill(); if (!isLab || hov) ctx.stroke();
          if (isLab && k > 0.5 && !hov) labs.push([d.n, d.x + d.lp[0], d.y + d.lp[1], d.lp[2], al * clamp((k - 0.5) * 2, 0, 1)]);
        }
        if (shown >= CH.order.length) {
          const wa = clamp((t - (1.2 + CH.order.length * 0.12)) / 0.5, 0, 1);
          ctx.globalAlpha = al * wa;
          plus(CH.world.x, CH.world.y, 5, C.ink);
          const c = L.m ? CH.worldLab : CH.worldLab || [-9, 4, 'right'];
          if (c) labs.push(['World', CH.world.x + c[0], CH.world.y + c[1], c[2], al * wa]);
          else {
            // phones, no room by the marker: a key line over the r = 0.91 note (the empty lower right)
            const kx = bx + r.w - 4, ky = Math.round(Y(0.46)) - 18;
            text('world average', kx, ky, { align: 'right', color: TER });
            plus(kx - textW('world average') - 10, ky - 4, 4, C.ink);
          }
          ctx.globalAlpha = al;
        }
        // names over every dot, each on a thin white halo (a crowded cluster's hollow dots pass behind the text)
        ctx.save();
        ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = C.bg;
        for (const [s, lx0, ly0, align, la] of labs) {
          if (la < 0.01) continue;
          ctx.globalAlpha = la;
          font(12); ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
          ctx.strokeText(s, lx0, ly0);
          ctx.fillStyle = INK; ctx.fillText(s, lx0, ly0);
        }
        ctx.restore();
        ctx.globalAlpha = al;
        // hover tooltip: an opaque card above the dot (below it near the top of the plot), in place of its label
        if (hoverDot >= 0) {
          const d = CH.dots[hoverDot];
          const s1 = d.n, s2 = `${fmtInt(d.kwh)} kWh${EIA_2024[d.iso] ? '*' : ''} · HDI ${d.hdi.toFixed(3)}`;
          const w = Math.ceil(Math.max(textW(s1, 13), textW(s2, 12))) + 12, h = 40;
          const tx = clamp(d.x - w / 2, Math.max(8, r.x - 40), Math.min(L.W - 8, r.x + r.w + 20) - w);
          let ty = d.y - 12 - h;
          if (ty < r.y - 22) ty = d.y + 12;
          ctx.fillStyle = C.bg;
          ctx.fillRect(tx, ty, w, h);
          ctx.strokeStyle = rgba(0.25);
          ctx.strokeRect(Math.round(tx) + 0.5, Math.round(ty) + 0.5, Math.round(w), h);
          text(s1, tx + 6, ty + 16, { size: 13, color: C.accent });
          text(s2, tx + 6, ty + 33, { color: INK });
        }
        // sources (below the plot, left) and the incumbent (below the plot, right): fossil reserves as the paper
        // cites them, a 2009 estimate (paper §1, after Shafiee & Topal, Energy Policy 2009)
        ctx.globalAlpha = al * clamp((t - 2) / 1, 0, 1);
        const src = L.m ? ['Energy: EI Statistical Review 2026 / EIA', 'via OWID (2025; *2024) · HDI: UNDP 2025']
          : ['Energy: Energy Institute Statistical Review 2026 / EIA', 'via OWID (2025; *2024) · HDI: UNDP HDR 2025 (2023)'];
        const sy = by + (L.m ? 54 : 58);
        const sx = L.m ? 16 : bx;
        src.forEach((s, i) => text(s, sx, sy + i * 14, { size: 11, color: TER }));
        ko(sx - 6, sy - 14, L.m ? L.W - 20 : r.w + 12, L.m ? 74 : 92, al);
        reg(sx - 4, sy - 12, textW(src[1], 11) + 8, 30);
        const fa2 = al * clamp((t - 9.2) / 0.9, 0, 1);
        if (fa2 > 0.01 && (!L.m || L.chartFossil)) {
          ctx.globalAlpha = fa2;
          if (L.m) {
            // phones: two lines, so the bottom stack stays clear of the slider
            text('Fossil reserves (2009 est.): oil ≈ 35 yr', 16, sy + 38, { color: INK });
            text('gas ≈ 37 yr · coal ≈ 107 yr · SkyWindFarm paper', 16, sy + 54, { size: 11, color: TER });
          } else {
            // compact: right-aligned on the rows below the sources. Desktop: left-aligned under the sources, a block of
            // its own (right-aligned under the x-axis title it read as that title's next line, and ran into the links)
            const al2 = L.c ? 'right' : 'left', fx = L.c ? bx + r.w : sx, fy = L.c ? sy + 44 : sy + 48;
            const fs = 'SkyWindFarm paper, 2024, after Shafiee & Topal 2009', fw = textW(fs, 11);
            text('Fossil reserves, 2009 estimate', fx, fy, { size: 13, align: al2, color: INK });
            text('oil ≈ 35 yr · gas ≈ 37 yr · coal ≈ 107 yr', fx, fy + 18, { align: al2, color: SEC });
            text(fs, fx, fy + 34, { size: 11, align: al2, color: TER });
            reg((L.c ? fx - fw : fx) - 4, fy - 13, fw + 8, 52);
          }
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- context headline: keystrokes, hover */
      // (the headline itself is core's HTML; the scene keeps its floating labels clear of it, plays soft keystrokes
      // under its word-by-word entrance, and in step 4 brackets the sub while it is hovered)
      function drawHeadlineFx() {
        if (S.hlK < S.hlN && S.A >= S.hlT0 + 0.06 + S.hlK * S.hlGap) {
          S.hlK++;
          if (live()) ui('type', { gain: 0.26 + 0.06 * Math.random() });
        }
        const b = L.hlBox;
        if (!b) return;
        reg(b.x, b.y, b.w, b.h);
        // step 4: the sub is the one hoverable headline on the site ("My high-school design" → the earlier
        // prototypes), so those words carry a quiet dotted underline once they have faded in; accent while hovered
        const q = L.hlCue;
        if (S.step === 3 && q && S.zoom > 0.5) {
          const on = hoverId === 'typed';
          ctx.save();
          ctx.globalAlpha = clamp((S.stepT - 0.9) / 0.6, 0, 1);
          ctx.strokeStyle = on ? C.accent : C.g500;
          ctx.lineWidth = 1;
          dashed([1, 2], () => line(q.x0, Math.round(q.y - 3) + 0.5, q.x1, Math.round(q.y - 3) + 0.5));
          ctx.restore();
        }
        if (hoverId === 'typed' && L.hlSubBox) {
          const qb = L.hlSubBox;
          ctx.save();
          bracketBox(qb.x, qb.y, qb.w, qb.h);
          ctx.restore();
        }
      }

      /* ---------------------------------------------------------------- hit regions (hover → the real thing) */
      const HITS = {};
      function mkHit(id, steps, opts) {
        const d = document.createElement('div');
        d.className = 'swf-hit';
        d.setAttribute('aria-label', opts.title);
        d.setAttribute('role', 'img');
        d.hidden = true;
        hitLayer.append(d);
        api.reveal(d, opts);
        d.addEventListener('pointerenter', () => { hoverId = id; S.hovering++; });
        d.addEventListener('pointerleave', () => { if (hoverId === id) hoverId = null; S.hovering = Math.max(0, S.hovering - 1); });
        d.addEventListener('focus', () => { hoverId = id; });
        d.addEventListener('blur', () => { if (hoverId === id) hoverId = null; });
        HITS[id] = { el: d, steps, k: '', rot: 0 };
      }
      // steps: 0 cubic · 1 shear · 2 sky · 3 unit · 4 power · 5 life. Figures are from the paper (assets/swf.pdf).
      // reveal-card captions are kept to one line at the card width (title left, meta right)
      mkHit('band', [0], { src: IMG + 'fig01-weibull-3km.jpg', title: 'Wind at 3 km, Weibull', meta: 'Fig. 1', width: 300 });
      mkHit('profile', [1], { src: IMG + 'fig02-london-profile.jpg', title: 'Wind above London', meta: 'Fig. 2', width: 290 });
      mkHit('flight', [1, 2, 4], { src: IMG + 'prototype-flight.jpg', title: 'Flight test', meta: '2 balloons · 150 m' });
      mkHit('units', [2, 4], { src: IMG + 'units-in-sky.jpg', title: 'Energy Units aloft', meta: 'render' });
      mkHit('tether', [2, 4], { src: IMG + 'prototype-tethered.jpg', title: 'Tethered Energy Unit', meta: 'Fig. 22' });
      mkHit('ground', [2, 4], { src: IMG + 'ground-station.jpg', title: 'Ground control', meta: 'drum · storage' });
      mkHit('system', [2, 4], { src: IMG + 'system-diagram.jpg', title: 'SkyWindFarm system', meta: 'poster art' });
      mkHit('lift', [2], { src: IMG + 'fig05-wing-aoa.jpg', title: 'Wing AoA vs wind', meta: 'Fig. 5', width: 300 });
      // (the headline sub: pinned under the sub rather than at the pointer, so the card never covers the words)
      mkHit('typed', [3], { src: IMG + 'design-iterations.jpg', title: 'Earlier prototypes', meta: 'App. I', width: 300, anchor: 'above' });
      mkHit('shell', [3], { src: IMG + 'energy-unit-render.jpg', title: 'Energy Unit', meta: 'render' });
      mkHit('wing', [3], { src: IMG + 'fig05-wing-aoa.jpg', title: 'Wing AoA vs wind', meta: 'Fig. 5', width: 300 });
      mkHit('stab', [3], { src: IMG + 'fig18-stability.jpg', title: '30° wind shift, 6-DOF', meta: 'Fig. 18', width: 300 });
      mkHit('turb', [3], { src: IMG + 'lab-prototype.jpg', title: 'Lab prototype Newton', meta: 'Fig. 12a', width: 250 });
      mkHit('wall', [3], { src: IMG + 'cfd-velocity-contour.jpg', title: 'CFD velocity contour', meta: 'Fig. 9' });
      mkHit('plan', [3], { src: IMG + 'cfd-velocity-contour.jpg', title: 'CFD velocity contour', meta: 'Fig. 9' });
      mkHit('cp', [3], { src: IMG + 'fig15-cp-tsr.jpg', title: 'Cp vs TSR', meta: 'Fig. 15', width: 300 });
      mkHit('tunnel', [3], { src: IMG + 'wind-tunnel-setup.jpg', title: 'Wind tunnel, UMN', meta: 'r > 0.95' });
      mkHit('lcoe', [4], { src: IMG + 'fig25-lcoe.jpg', title: 'Levelized cost of energy', meta: 'Fig. 25', width: 340 });
      mkHit('scale', [4], { src: IMG + 'fig26-scale-crop.jpg', title: '150 kW each, to scale', meta: 'Fig. 26', width: 300 });
      function placeHit(id, x, y, w, h, rot) {
        const H0 = HITS[id];
        if (!H0) return;
        const key = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)},${(rot || 0).toFixed(2)}`;
        if (key === H0.k) return;
        H0.k = key;
        const st = H0.el.style;
        st.width = Math.max(1, Math.round(w)) + 'px';
        st.height = Math.max(1, Math.round(h)) + 'px';
        st.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)` + (rot ? ` rotate(${rot}rad)` : '');
      }
      let hitStep = -1;
      const MOBILE_OFF = { flight: 1, system: 1, plan: 1, wall: 1, stab: 1, tunnel: 1, scale: 1 };
      const COMPACT_OFF = { plan: 1, tunnel: 1 }; // no plan view; the TSR line carries the Cp figure
      const OFF = (id) => placeHit(id, -100, -100, 1, 1);
      const boxHit = (id, b) => (b ? placeHit(id, b.x, b.y, b.w, b.h) : OFF(id));
      function syncHitVisibility() {
        if (hitStep === S.step) return;
        hitStep = S.step;
        for (const id in HITS) {
          const on = HITS[id].steps.indexOf(S.step) >= 0 && !(L.m && MOBILE_OFF[id]) && !(L.c && COMPACT_OFF[id]);
          HITS[id].el.hidden = !on;
          if (!on && hoverId === id) hoverId = null;
        }
      }
      function updateHits() {
        syncHitVisibility();
        const st = S.step;
        if (st === 0) {
          const r = L.hero, X = v => r.x + (v / V_MAX) * r.w;
          placeHit('band', X(18), (L.bandY || r.y) + 2, X(33) - X(18), (L.bandH || 52) + 2);
        }
        if (st === 1) boxHit('profile', S.vis.plabels > 0.5 ? (L.m ? L.mAnnot : L.legendBox) : null);
        if (st === 2) boxHit('lift', S.vis.lift > 0.5 && L.liftBox ? L.liftBox : null);
        if (st === 4) {
          const b = L.lcoeBox;
          if (L.m) { boxHit('lcoe', S.vis.power > 0.5 ? L.lcoeBoxM : null); OFF('scale'); }
          else if (b && S.vis.power > 0.5) { placeHit('lcoe', b.x, b.y, b.w, b.h); boxHit('scale', L.scaleBox); }
          else { OFF('lcoe'); OFF('scale'); }
        }
        if (st === 1 || st === 2 || st === 4) {
          const gs = L.gs;
          if (st !== 1) placeHit('ground', L.gx - 74 * gs, L.ground - 38 * gs, 174 * gs, 40 * gs);
          if (!L.m) placeHit('flight', L.axisX - 128, yOf(150) - 9, 136, 18);
          if (!L.m) boxHit('system', L.sysBox);
          // units: one hit spanning all three (reveal shows them together)
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (let i = 0; i < 3; i++) {
            const u = units[i];
            if (u.a < 0.3) continue;
            x0 = Math.min(x0, u.x - 52 * u.s); x1 = Math.max(x1, u.x + 52 * u.s);
            y0 = Math.min(y0, u.y - 40 * u.s); y1 = Math.max(y1, u.y + 36 * u.s);
          }
          if (x1 > x0) placeHit('units', x0, y0, x1 - x0, y1 - y0); else placeHit('units', -100, -100, 1, 1);
          // middle tether as a rotated strip
          const T = tetherCtrl(1);
          const ax = T.c.x, ay = T.c.y;
          const len = Math.hypot(T.b.x - T.a.x, T.b.y - T.a.y) * 0.62;
          const ang = Math.atan2(T.b.y - T.a.y, T.b.x - T.a.x);
          const sx = ax - Math.cos(ang) * len / 2 + Math.sin(ang) * 8, sy = ay - Math.sin(ang) * len / 2 - Math.cos(ang) * 8;
          if (units[1].a > 0.3) placeHit('tether', sx, sy, len, 16, ang); else placeHit('tether', -100, -100, 1, 1);
        } else if (st === 3) {
          const u = units[1], s = u.s;
          placeHit('shell', u.x - 50 * s, u.y - 39 * s, 100 * s, 30 * s);
          // the wing's own outline (+ 6 px), so the shell render wins across the rest of the dome
          const wb = airfoilBox((aoa(S.v) * Math.PI) / 180);
          placeHit('wing', u.x + wb.x0 * s - 6, u.y + wb.y0 * s - 6, (wb.x1 - wb.x0) * s + 12, (wb.y1 - wb.y0) * s + 12);
          placeHit('turb', u.x - 26 * s, u.y + 3 * s, 62 * s, 27 * s);
          const w1 = WSIDE[0];
          placeHit('wall', u.x + Math.min(w1[0].X, w1[1].X) * s - 4, u.y + (Math.min(w1[0].Y, w1[1].Y) + 3) * s, Math.abs(w1[1].X - w1[0].X) * s + 6, 28 * s);
          if (L.plan) placeHit('plan', L.plan.x, L.plan.y - 22, L.plan.w, L.plan.h + 28);
          if (L.m || L.c) boxHit('cp', L.cpLine || null);
          if (L.c) boxHit('stab', S.zoom > 0.97 && L.stabBox ? L.stabBox : null);
          else if (!L.m) {
            const cy = L.cpY || L.plan.y + L.plan.h + 44;
            placeHit('cp', L.plan.x - 4, cy - 15, 170, 20);
            placeHit('tunnel', L.plan.x - 4, cy + 5, 230, 18);
            boxHit('stab', S.zoom > 0.97 && L.stabBox ? L.stabBox : null);
          }
          boxHit('typed', L.hlSubBox);
        }
      }

      /* ---------------------------------------------------------------- controls */
      const stepper = api.stepper({ items: STEPS.map(s => s.label), index: 0, onSelect: i => goStep(i, true) });
      const slider = api.slider({
        min: V_MIN, max: V_MAX, step: 0.1, value: V_DESIGN,
        label: v => `Wind at 3 km · ${f1(v)} m/s${S.gust > 0.15 ? ` +${f1(S.gust)}` : ''}`,
        left: 'Calm', right: 'Jet stream',
        onInput: v => { S.base = v; S.sweep = null; touch(); },
      });
      api.links(LINKS.map(l => ({ label: l.label, href: l.href })));
      // "Videos: explanation · flight" on one line, and hovering a link shows the real thing too
      (function linkRow() {
        const grp = document.querySelector('.links-group[data-scene="skywindfarm"]');
        if (!grp) return;
        const as = grp.querySelectorAll('a');
        if (as.length !== 4) return;
        const [, isef, expl, flight] = as;
        const row = document.createElement('div');
        row.style.cssText = 'font-size:var(--fs-xs);line-height:16px;color:#555;white-space:nowrap';
        [expl, flight].forEach(a => {
          a.style.display = 'inline';
          if (a === expl) Array.from(a.childNodes).forEach(n => { if (n.nodeType === 3 && /↗/.test(n.textContent)) n.remove(); });
        });
        row.append('Videos: ', expl, ' · ', flight);
        grp.append(row);
        // phones list these links in core's [M] menu from their text: a hidden "Video: " keeps them self-explanatory
        [[expl, 'explanation'], [flight, 'flight']].forEach(([a, nm]) => {
          const vh = document.createElement('span');
          vh.textContent = 'Video: ';
          vh.style.display = 'none';
          a.prepend(vh);
          a.setAttribute('aria-label', `Video: ${nm}`);
        });
        // smaller cards here: they flip up and left over the scene from the bottom-right corner
        api.reveal(isef, { src: IMG + 'isef-poster.jpg', title: 'ISEF 2024 · EGSD018', meta: 'Third Award', width: 240 });
        api.reveal(expl, { src: IMG + 'explainer-video-still.jpg', title: 'Explanation video', meta: '2024 · 1:50', width: 240 });
        api.reveal(flight, { src: IMG + 'prototype-flight.jpg', title: 'Flight test video', meta: '2024 · 3:41', width: 240 });
      })();

      function touch() { S.lastInteract = S.A; }
      function stepLabel(i, short) {
        const n = `${String(i + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
        return short ? n : `${n} · ${STEPS[i].label}`;
      }
      const stepStr = () => stepLabel(S.step, false);
      function updLab() {
        mTxt.textContent = stepStr() + (S.paused ? ' · paused' : '');
        mLab.classList.toggle('is-paused', S.paused);
        mLab.setAttribute('aria-label', `Step ${S.step + 1} of ${STEPS.length}, ${STEPS[S.step].label}. ${S.paused ? 'Paused: tap to play' : 'Playing: tap to pause'}`);
      }
      function togglePause() {
        S.paused = !S.paused;
        updLab();
        hintUntil = performance.now() + 1100;
        api.hint(S.paused ? 'Paused' : 'Playing', 1100);
        touch();
      }
      // the autoplay timer (S.playT) runs on the simulation clock, so a pause holds the step's progress
      const stepProgress = () => (REDUCED ? 1 : clamp(S.playT / STEPS[S.step].dur, 0, 1));
      // Shared header (desktop): "01 / 06 · Step" in 12 px mono #555, a 64 px progress hairline under it and the
      // play state, right-aligned on the chrome's 40 px gutter. Click it to pause / play.
      function hdBox() { return { x: L.hdR - L.hdW, y: L.hdY - 16, w: L.hdW + 4, h: 48 }; }
      function drawHeader() {
        if (L.m) {
          const p = stepProgress(), k = Math.round(p * 200);
          if (k !== mPgK) { mPgK = k; mPgI.style.transform = `scaleX(${(k / 200).toFixed(3)})`; }
          return;
        }
        // (CONTRACT "Round 3": label baseline 83, hairline 92, play state baseline 110, as in scenes 1–3)
        const x = L.hdR, y = L.hdY, w = 64, yy = Math.round(y + 9) + 0.5;
        const hov = hdHover;
        ctx.save();
        ctx.globalAlpha = 1;
        text(stepLabel(S.step, L.hdShort), x, y, { align: 'right', color: TER });
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.g300; line(x - w, yy, x, yy);
        ctx.strokeStyle = S.paused ? C.g500 : C.ink; line(x - w, yy, x - w + w * stepProgress(), yy);
        text(S.paused ? 'paused · [space]' : REDUCED ? '↑ ↓ to step' : 'autoplay', x, y + 27, { align: 'right', color: hov ? C.accent : TER });
        ctx.restore();
      }
      // (between 801 and 1100 px wide core shows its hint under the wordmark, where it would read as the context
      // headline's eyebrow: there the step-1 caption carries the gust and drag hints instead)
      let hintUntil = 0;
      function showHint() {
        if (S.hintShown || !api.isActive()) return;
        S.hintShown = true;
        if (!L.m && L.W <= 1100) return;
        hintUntil = performance.now() + 5200;
        api.hint(L.m ? 'Hold the sky to gust · drag ← → to set the wind' : 'Press and hold the sky to gust · drag ← → or scroll to set the wind', 5200);
      }

      function goStep(i, fromUser) {
        const n = STEPS.length;
        i = ((i % n) + n) % n;
        const prev = S.step;
        S.step = i;
        S.stepT = 0; S.playT = 0;
        // prefers-reduced-motion: every staged reveal is keyed to stepT, so jump straight to the final state
        if (REDUCED) S.stepT = 60;
        stepper.set(i);
        updLab();
        applyHeadline(true);
        api.caption(STEPS[i].cap);
        if (fromUser) touch();
        // leaving step 1 before its automatic 3 → 26.7 m/s sweep has finished (paused, or stepped on early): the wind
        // lands on the design point, so no later step is drawn at a frozen mid-sweep wind (a wind the visitor set by
        // dragging, scrolling or +/− is theirs and stays: those clear the sweep)
        // (the operating-window factor follows at once: step 1 draws no units, so nothing visibly jumps)
        if (prev === 0 && i !== 0 && S.sweep) { S.base = S.sweep.to; S.sweep = null; S.win = winOf(S.base); }
        if (i === 0) {
          S.sweep = REDUCED ? null : { t0: S.T + 0.9, from: 3, to: V_DESIGN, dur: 5.2 };
          S.cubeFlags.a = S.cubeFlags.b = false;
          // start the sweep where it will begin (no 26.7 → 3 → 26.7 jump on re-entry)
          S.base = REDUCED ? V_DESIGN : 3;
        }
        if (i === 5) { S.dotsShown = 0; S.chartT0 = S.T; } else hoverDot = -1;
        if (i === 1) S.rowFlags = 0;
        if (i === 3) S.detune = 0.04;
        // paused: the simulation stays frozen, but the fluid flows through the transition (≈ 4.5 s) so no wake of a
        // unit that has moved (the step-4 close-up) is left behind as a hole in the streaklines
        if (S.paused && !REDUCED && i !== prev) {
          S.flowUntil = S.A + 4.5; // the zoom (≈ 1.5 s) plus the streak fade-outs (≈ 2 s)
          if (ZOOM[i] !== ZOOM[prev] || LAUNCH[i] !== LAUNCH[prev]) FL.vort.length = 0;
        }
        if (LAUNCH[i] && !LAUNCH[prev] && !REDUCED) {
          // tow the units up, staggered
          for (let k = 0; k < 3; k++) S.launchLin[k] = -0.18 * k;
        }
        if (REDUCED) {
          for (let k = 0; k < 3; k++) S.launchLin[k] = LAUNCH[i];
          S.zoomLin = ZOOM[i];
          for (const k in VIS) S.vis[k] = VIS[k][i];
        }
        hitStep = -1;
      }

      /* ---------------------------------------------------------------- input */
      function localXY(e) { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest && e.target.closest('.swf-mnav')) return;
        const [x, y] = localXY(e);
        ptr.type = e.pointerType || 'mouse';
        ptr.in = true;
        if (!L.m && hitBox({ x, y, w: 1, h: 1 }, hdBox())) { ui('tick'); togglePause(); return; } // the step counter
        if (ptr.type === 'touch' && e.target.classList && e.target.classList.contains('swf-hit')) return; // a tap on a part = see the photo
        // step 6: a tap (or click) on a country shows its numbers, and does not gust; a tap on empty space clears it
        if (S.step === 5 && S.vis.chart > 0.5) { pickDot(x, y); if (hoverDot >= 0) return; }
        ptr.down = true; ptr.id = e.pointerId; ptr.x = x; ptr.y = y; ptr.x0 = x; ptr.base0 = S.base; ptr.t0 = S.T; ptr.moved = 0;
        touch();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        // a puff: a counter-rotating vortex pair that travels downwind
        const U = ULUT[clamp(y | 0, 0, ULUT.length - 1)] || 80;
        const g = 5.5 * Math.max(60, U) * 14;
        FL.vort.push({ x, y: y - 16, g, g0: g, rc: 14, rc0: 14, age: 0, life: 4.5, tau: 2.2, vx: 70, vy: 0, puff: 1 });
        FL.vort.push({ x, y: y + 16, g: -g, g0: -g, rc: 14, rc0: 14, age: 0, life: 4.5, tau: 2.2, vx: 70, vy: 0, puff: 1 });
        gustSound(x, y);
      });
      el.addEventListener('pointermove', e => {
        const [x, y] = localXY(e);
        ptr.in = true; ptr.type = e.pointerType || ptr.type;
        if (ptr.down && e.pointerId === ptr.id) {
          const dx = x - ptr.x0;
          ptr.moved = Math.max(ptr.moved, Math.abs(dx));
          if (ptr.moved > 6 && !(S.step === 5 && ptr.type === 'touch')) { // (step 6 on touch: dragging reads the chart)
            S.sweep = null;
            const k = (V_MAX - V_MIN) / (L.W * (L.m ? 0.8 : 0.55));
            const nb = clamp(ptr.base0 + (dx - Math.sign(dx) * 6) * k, V_MIN, V_MAX);
            if (Math.floor(nb / 2) !== Math.floor(S.base / 2) && S.A - snd.lastDetent > 0.05) { snd.lastDetent = S.A; ui('tick', { gain: 0.5 }); }
            S.base = nb;
          }
          touch();
        }
        ptr.x = x; ptr.y = y;
        if (S.step === 5) pickDot(x, y);
        const hh = !L.m && !ptr.down && hitBox({ x, y, w: 1, h: 1 }, hdBox());
        if (hh !== hdHover) { hdHover = hh; el.style.cursor = hh ? 'pointer' : ''; if (hh) ui('hover'); }
      });
      const endPtr = e => {
        if (e.pointerId !== ptr.id) return;
        ptr.down = false;
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        if (ptr.type === 'touch') ptr.in = false;
      };
      el.addEventListener('pointerup', endPtr);
      el.addEventListener('pointercancel', endPtr);
      el.addEventListener('pointerleave', () => {
        if (hdHover) { hdHover = false; el.style.cursor = ''; }
        if (!ptr.down) { ptr.in = false; if (S.step === 5 && ptr.type !== 'touch') hoverDot = -1; }
      });
      el.addEventListener('wheel', e => {
        if (!api.isActive()) return;
        e.preventDefault();
        const d = clamp(-e.deltaY, -60, 60) * 0.02;
        const nb = clamp(S.base + d, V_MIN, V_MAX);
        if (Math.floor(nb / 2) !== Math.floor(S.base / 2) && S.A - snd.lastDetent > 0.05) { snd.lastDetent = S.A; ui('tick', { gain: 0.5 }); }
        S.base = nb; S.sweep = null;
        touch();
      }, { passive: false });
      function pickDot(x, y) {
        let best = -1, bd = (L.m ? 18 : 12) ** 2;
        for (let j = 0; j < S.dotsShown && j < CH.order.length; j++) {
          const i = CH.order[j], d = CH.dots[i];
          const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
          if (dd < bd) { bd = dd; best = i; }
        }
        if (best !== hoverDot) {
          hoverDot = best;
          if (best >= 0) { ui('hover'); touch(); }
        }
      }

      /* ---------------------------------------------------------------- main loop */
      let lastT = 0;
      let sliderK = ''; // the slider's label as last set: core's set() rewrites the DOM on every call
      api.loop((t, dtRaw) => {
        // Two clocks. S.A (dtA) never pauses: layer tweens, launch/zoom, typing, staged reveals (stepT) and
        // UI rate limits, so stepping while paused still draws the new step. S.T (dt) is the simulation:
        // Space freezes the fluid, rotors, packets, gusts and autoplay.
        const dtA = Math.min(dtRaw, 0.05);
        const dt = S.paused ? 0 : dtA;
        S.A += dtA;
        S.T += dt;
        S.stepT += dtA;
        S.playT += dt;
        // prefers-reduced-motion: final states, no ambient motion (the flow is pre-warmed once, then held)
        const vm = REDUCED ? 0 : 1;
        const dtF = S.paused ? (S.A < S.flowUntil ? dtA : 0) : dtA;

        // autoplay: advance when the step is done and nobody is interacting
        if (!S.paused && !REDUCED && S.playT > STEPS[S.step].dur && S.A - S.lastInteract > 5 && !ptr.down && !hoverId && hoverDot < 0) {
          goStep(S.step + 1, false);
        }

        // wind: sweep (step 1), gusts (press & hold), relax on release
        if (S.sweep) {
          const k = (S.T - S.sweep.t0) / S.sweep.dur;
          if (k >= 0) S.base = lerp(S.sweep.from, S.sweep.to, eio(clamp(k, 0, 1)));
          if (k >= 1) {
            S.sweep = null;
            // landing on the design point: a clean sub pulse + a bright grain
            if (live()) {
              const a = AU(), nx = a.clock && a.clock.nextStep ? a.clock.nextStep(4) : { time: a.now() };
              sSub(38, { when: nx.time, dur: 0.3, gain: 0.5, harmonic: 0.35, dest: api.bus() });
              sGrain(deg(4, 0), { when: nx.time, gain: 0.18, pan: 0.3, bright: 0.12, dur: 0.1, dest: api.bus() });
            }
          }
        }
        if (ptr.down && ptr.moved <= 6) {
          const gMax = Math.max(0, Math.min(12, V_MAX - S.base));
          S.gust += (gMax - S.gust) * (1 - Math.exp(-dt / 1.3));
        } else {
          S.gust *= Math.exp(-dt / 1.1);
        }
        S.v = clamp(S.base + S.gust, 0.5, V_MAX);
        S.vs += (S.v - S.vs) * (1 - Math.exp(-dtA / 0.35));
        // the 18–33 m/s operating window: rotors, packets and the hum wind down (≈ 1.2 s) outside it
        S.win += (winOf(S.vs) - S.win) * (REDUCED ? 1 : 1 - Math.exp(-dt / 1.2));
        // local jet under the pointer while pressed
        const jt = ptr.down ? 60 + 12 * S.gust * L.pxs : 0;
        jet.a += (jt - jet.a) * (1 - Math.exp(-dt / 0.25));
        if (ptr.down) { jet.x = ptr.x; jet.y = ptr.y; }
        jet.s2 = (L.m ? 40 : 64) ** 2;
        const sk = f1(S.base) + '|' + (S.gust > 0.15 ? f1(S.gust) : '');
        if (sk !== sliderK) { sliderK = sk; slider.set(S.base); }

        // cubic-law ticks: one at 10 m/s, eight at 20 m/s (2× v → 8× P)
        if (S.step === 0 && live()) {
          if (S.prevV < 10 && S.v >= 10 && !S.cubeFlags.a) { S.cubeFlags.a = true; snd.cube.push({ m: deg(0, 0), g: 0.36, p: 0 }); }
          if (S.prevV < 20 && S.v >= 20 && !S.cubeFlags.b) {
            S.cubeFlags.b = true;
            for (let k = 0; k < 8; k++) snd.cube.push({ m: deg(k % 5, 0), g: 0.22 + 0.02 * k, p: (k / 7 - 0.5) * 0.8 });
          }
          if (S.v < 8) S.cubeFlags.a = false;
          if (S.v < 17) S.cubeFlags.b = false;
        }
        S.prevV = S.v;

        // probe: the wind bed focuses on the altitude under the pointer; 250 m detents tick, pitched by height
        const probing = ptr.in && !hoverId && S.vis.axis > 0.5 && S.zoom < 0.1 && S.vis.chart < 0.1 &&
          ptr.y > L.top && ptr.y < L.ground && ptr.x > L.axisX && ptr.type !== 'touch';
        const fTarget = probing ? vAt(altOf(ptr.y)) : S.v;
        S.focusV += (fTarget - S.focusV) * (1 - Math.exp(-dtA / 0.3));
        if (probing) {
          const bin = Math.floor(altOf(ptr.y) / 250);
          if (bin !== S.probeBin && S.probeBin >= 0 && live() && S.A - snd.lastDetent > 0.07) {
            snd.lastDetent = S.A;
            sTick(deg(Math.min(clamp(bin, 0, 13) - 3, 7), 0), { when: next16(), gain: 0.1, pan: clamp((ptr.x / L.W) * 2 - 1, -0.8, 0.8), dest: api.bus() }); // ≤ A5, on the 16th grid
          }
          S.probeBin = bin;
        } else S.probeBin = -1;

        // step 2: a rising tick as the profile passes each tabulated altitude (pitch ∝ v)
        if (S.step === 1 && live()) {
          const hMax = lerp(10, 3000, eio(clamp((S.stepT - 0.5) / 2.2, 0, 1)));
          [10, 300, 1000, 2000, 3000].forEach((h, i) => {
            if (hMax >= h && !(S.rowFlags & (1 << i))) {
              S.rowFlags |= 1 << i;
              snd.cube.push({ m: deg(Math.round((vAt(h) / V_DESIGN) * 7), 0), g: 0.2 + 0.03 * i, p: -0.4 + 0.2 * i });
            }
          });
        }

        // ambient turbulence as microsound: sparse clicks, denser (∝ v²) as the wind picks up
        if (live() && S.vis.tracers > 0.2) {
          const rate = (0.4 + 2.0 * Math.pow(S.v / V_DESIGN, 2)) * (unitsLevel() > 0.3 ? 0.35 : 1) * S.vis.tracers;
          if (Math.random() < rate * dt) {
            const a = AU();
            sClick({ when: a.now() + 0.01 + Math.random() * 0.03, freq: eddyHz(), q: 5,
              gain: 0.025 + Math.random() * 0.03, pan: Math.random() * 1.7 - 0.85, dest: api.bus() });
          }
        }

        // layer visibility
        const kk = 1 - Math.exp(-dtA / 0.45);
        for (const k in VIS) S.vis[k] += (VIS[k][S.step] - S.vis[k]) * (REDUCED ? 1 : kk);
        // launch + zoom tweens
        for (let i = 0; i < 3; i++) {
          const tg = LAUNCH[S.step];
          S.launchLin[i] += clamp(tg - S.launchLin[i], -dtA / 1.6, dtA / 3.4);
          S.launch[i] = eio(clamp(S.launchLin[i], 0, 1));
          if (!tg && S.vis.units < 0.02) { S.launchLin[i] = 0; S.launch[i] = 0; }
        }
        S.zoomLin += clamp(ZOOM[S.step] - S.zoomLin, -dtA / 1.1, dtA / 1.5);
        S.zoom = eio(clamp(S.zoomLin, 0, 1));
        if (S.step === 3 && S.stepT > 5.5) S.detune = Math.max(0, S.detune - dtA * 0.02); // counter-rotation: beating dissolves
        else if (S.step !== 3) S.detune = 0.04;

        // chart reveal (step 6)
        if (S.step === 5) {
          const want = REDUCED ? CH.order.length : clamp(Math.floor((S.stepT - 1.2) / 0.12) + 1, 0, CH.order.length);
          while (S.dotsShown < want) {
            const d = CH.dots[CH.order[S.dotsShown]];
            if (live() && snd.dots.length < 8) {
              const deg_ = Math.round(((d.hdi - 0.4) / 0.6) * 9);
              snd.dots.push({ m: deg(deg_ - 2, 0), g: 0.2, p: ((lx(d.kwh) - XMIN) / (XMAX - XMIN) - 0.5) * 1.2 });
            }
            S.dotsShown++;
          }
        }

        updateUnits(dt, S.T);
        updatePackets(dt * vm);
        if (dtF * vm > 0) fluidStep(dtF * vm);
        soundUpdate(false);

        // ---------------- render
        KO = KOn; KOn = [];
        LB.length = 0;
        if (!L.m) { const hb = hdBox(); reg(hb.x, hb.y, hb.w, hb.h); } // the step counter (drawn last, on top)
        L.mCallBotPrev = L.mCallBot || 0; L.mCallBot = 0;
        cv.clear();
        drawFluid();
        drawAxis(S.vis.axis);
        drawProfile(S.vis.profile, S.vis.plabels);
        drawTethers();
        drawCloseTether(S.zoom);
        for (const i of [2, 0, 1]) {
          const u = units[i];
          if (u.a < 0.01) continue;
          const hl = S.zoom > 0.5 && i === 1 ? (hoverId === 'stab' ? 'wing' : hoverId === 'shell' || hoverId === 'wing' || hoverId === 'turb' || hoverId === 'wall' || hoverId === 'tether' ? hoverId : null)
            : hoverId === 'units' ? 'shell' : hoverId === 'lift' && i === (L.liftU || 0) ? 'wing' : null;
          ctx.save();
          ctx.globalAlpha = u.a;
          const en = S.vis.packets * (S.launch[i] > 0.99 ? 1 : 0) * clamp(pUnit(vAt(UNITS[i].alt)) / pUnit(V_DESIGN), 0, 1.4) * 0.7 * S.win;
          u.bp = drawUnit(u.x, u.y, u.s, { phase: S.rot[i], v: vAt(UNITS[i].alt), hl, energy: S.zoom > 0.5 ? 0 : en });
          ctx.restore();
        }
        if (hoverId === 'units' && S.zoom < 0.5) {
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          units.forEach(u => { if (u.a > 0.3) { x0 = Math.min(x0, u.x - 54 * u.s); x1 = Math.max(x1, u.x + 54 * u.s); y0 = Math.min(y0, u.y - 44 * u.s); y1 = Math.max(y1, u.y + 58 * u.s); } });
          if (x1 > x0) bracketBox(x0, y0, x1 - x0, y1 - y0);
        }
        // (phones, step 1: no ground line between the chart's source note and the slider)
        drawGround(S.vis.ground * (L.m ? 1 - S.vis.hero : 1), hoverId === 'ground');
        drawGridFx();
        drawSystemMarker(S.vis.ground * (S.step === 2 || S.step === 4 ? 1 : 0));
        drawLift(S.vis.lift);
        drawWindowNote(S.vis.lift);
        drawPower(S.vis.power);
        drawCloseLabels(S.zoom > 0.97 ? 1 : 0);
        drawFormula(S.zoom > 0.97 ? 1 : 0);
        drawHero(S.vis.hero);
        drawChart(S.vis.chart);
        drawHeadlineFx();
        drawProbe();
        drawPointer();
        drawHeader();
        texEndFrame();
        updateHits();
        lastT = t;
      });

      // core already coalesces resize bursts (a window drag) into one callback per frame, so lay out right away: the
      // next frame draws the new layout into the resized canvas, and the headline check that follows (onHeadline)
      // finds it already measured. (Core hears a resize twice, from the window and its ResizeObserver, often in two
      // frames: the second call, at an unchanged size, has nothing to do.)
      const relayout = () => { layout(); hitStep = -1; for (const id in HITS) HITS[id].k = ''; };
      api.onResize(() => { if (cv.w !== L.W || cv.h !== L.H) relayout(); });
      layout();
      // pre-warm the flow so the first paint already shows streaklines
      (function prewarm() {
        for (let i = 0; i < 150; i++) fluidStep(1 / 30);
      })();
      goStep(0, false);
      L.ready = true;
      // the live headline changed (step, resize, web fonts): re-read its box; if it does not end where the layout
      // expects (the measuring copy ran before the fonts arrived), lay the art out again
      api.onHeadline(bottom => {
        readHeadlineBox();
        if (!bottom || !L.hbS || !api.isActive()) return;
        if (Math.abs(bottom - L.hbS[S.step]) > 2) { hlCache = null; relayout(); } // (stale measurements: measure again)
      });

      return {
        enter() {
          S.paused = false; S.flowUntil = -1; S.win = 1;
          S.T += 0.001;
          S.base = V_DESIGN; S.gust = 0;
          for (let k = 0; k < 3; k++) { S.launchLin[k] = 0; S.launch[k] = 0; }
          S.zoomLin = 0; S.zoom = 0;
          for (const k in VIS) S.vis[k] = VIS[k][0];
          packets.length = 0; pulses.length = 0; ripples.length = 0;
          hoverId = null; hoverDot = -1;
          ptr.down = false;
          goStep(0, false);
          requestAnimationFrame(readHeadlineBox); // (core shows the headline group before enter())
          if (!S.entered) {
            S.entered = true;
            setTimeout(() => { if (!S.hintShown && api.isActive()) showHint(); }, 7000);
          }
        },
        exit() {
          // this scene's own hint is still up: back to core's resting state, so it never follows into another scene
          if (performance.now() < hintUntil) { hintUntil = 0; api.hint(''); }
          if (hdHover) { hdHover = false; el.style.cursor = ''; }
          ptr.down = false; ptr.in = false;
          hoverId = null; hoverDot = -1;
          snd.arr.length = 0; snd.cube.length = 0; snd.dots.length = 0;
        },
        sound(on) {
          if (on) soundStart(); else soundStop();
        },
        key(e) {
          if (e.key === ' ' || e.code === 'Space') { togglePause(); return true; }
          if (e.key === 'ArrowDown') { goStep(S.step + 1, true); ui('tick'); return true; }
          if (e.key === 'ArrowUp') { goStep(S.step - 1, true); ui('tick'); return true; }
          if (e.key === '+' || e.key === '=') { S.base = clamp(S.base + 1, V_MIN, V_MAX); S.sweep = null; touch(); ui('tick', { gain: 0.5 }); return true; }
          if (e.key === '-' || e.key === '_') { S.base = clamp(S.base - 1, V_MIN, V_MAX); S.sweep = null; touch(); ui('tick', { gain: 0.5 }); return true; }
          return false;
        },
      };
    },
  });
})();
