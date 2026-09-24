/* ==========================================================================
   Scene 1 — LpWM · "A Case for Sparse Representations in World Models".

   A live, illustrative model-predictive-control loop in the paper's Piecewise
   2×2 environment: a ViT encoder turns the frame into a sparse latent z (about
   half the units exactly zero), a predictor rolls z forward under candidate
   actions, and CEM (300 samples → top 30) picks a plan; execute 5 steps,
   replan. The user can drag the goal or nudge the agent at any time.
   Sparse (LpWM) and dense (LeWM) run side by side in "Plan (MPC)".
   The last two steps draw the paper's real results (Fig 1b, Fig 2c).

   The simulation is a toy (labelled "illustrative" on screen). Every number
   in the charts comes from the research brief (Fig 1b, Fig 2c, Tables 1–3).

   Round 2: all math is KaTeX in an HTML overlay above the canvas (TX); the ViT
   step shows patches → tokens (+ position embeddings) → a transformer block
   with 3 animated attention heads → CLS → a 3-layer MLP projector with a
   layer-by-layer forward pass → ReLU → the sparse code, which then flows on
   into the AdaLN-zero predictor. Text follows the round-2 typography rules.

   Round 4: every step opens with a context headline (core's api.headline: one
   plain sentence + a sub naming the parts, HL below); the art of each step is
   laid out under its own headline at every viewport (relayout / fitLayout).
   Each step keeps its sub where its art still fits; step 5's title carries the
   "illustrative" qualifier when its sub is dropped. The bottom-left caption
   gives the source and how to interact. Phones keep core's sound invite clear
   of the art until the first tap; one failing view never stops the scene.

   Round 5: autoplay dwells 16–18 s a step (time to read the headline); desktops
   fall back to a one-line sub before dropping it; the Capacity headline and
   caption follow the open / closed-loop toggle; the Sparse-code picture says
   when it shows the dense comparison; the toy's dense model is calibrated to
   reach the goal about 2 times in 3 (the paper: 65.3% vs 84.7%); short phones
   keep the sound invite off the landing step with a compact planner box.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ content (brief) */

  const STEPS = ['World model', 'ViT encoder', 'Sparse code', 'Predictor', 'Plan (MPC)', 'Capacity', 'Horizon'];
  const BAR = (60 / 118) * 4;
  // autoplay dwell per step, in whole bars (≈ 2 s each): long enough to read the headline and its sub, then the art
  const STEP_BARS = [9, 8, 8, 8, 11, 8, 8];
  // Bottom-left captions (≤ 38 characters a line). The headline says the point of each step; the caption gives the
  // source and how to interact. CAPS_T: touch wording; CAPS1: one line, for phones too short for three.
  const CAPS = [
    'Paper: LpWM, A Case for Sparse\nRepresentations in World Models.\nIllustrative loop: drag the goal ⊕.',
    'ViT: 12 layers, width 384, 3 heads\n(the paper’s PointMaze config).\nHover a query token: its 3 heads.',
    'Method: RDMReg toward a Rectified\nLaplace. Slide the output link from\nsparse to dense; hover a unit.',
    'Lemma G.1: rollout error compounds\nwith the horizon. Drag H to imagine\nfurther ahead.',
    'Illustrative Piecewise 2×2 loop,\nnot a measurement. Drag the goal ⊕\nor an agent; H sets the plan length.',
    'Fig 1b · PushT, open-loop, D = 4096.\nClick a rung for its predictor;\npress C for closed-loop.',
    'Fig 2c · Piecewise 2×2, closed-loop\nMPC (R = 1), 3 seeds, mean ± std.\nHover a horizon for its values.',
  ];
  const CAPS_T = {
    1: 'ViT: 12 layers, width 384, 3 heads\n(the paper’s PointMaze config).\nTap a query token: its 3 heads.',
    2: 'Method: RDMReg toward a Rectified\nLaplace. Slide the output link from\nsparse to dense; tap a unit.',
    5: 'Fig 1b · PushT, open-loop, D = 4096.\nTap a rung for its predictor, or\n“closed-loop” for those results.',
    6: 'Fig 2c · Piecewise 2×2, closed-loop\nMPC (R = 1), 3 seeds, mean ± std.\nTap a horizon for its values.',
  };
  // (Capacity, after the toggle: the closed-loop panel of Fig 1b)
  const CAPS_C = 'Fig 1b · PushT, closed-loop, D = 4096.\nClick a rung for its predictor;\npress C for open-loop.';
  const CAPS_TC = 'Fig 1b · PushT, closed-loop, D = 4096.\nTap a rung for its predictor, or\n“open-loop” for those results.';
  const CAPS1 = [
    'Paper: LpWM · sparse world models',
    'ViT · 12 layers · tap a token',
    'RDMReg · slide sparse → dense',
    'Lemma G.1 · drag H to look ahead',
    'Illustrative toy · drag the goal ⊕',
    'Fig 1b · PushT · tap a rung',
    'Fig 2c · Piecewise 2×2 · 3 seeds',
  ];

  // Fig 1b (PushT, D = 4096) + Table 1/2/3.
  const LADDER = {
    names: ['Deep-AdaLN(k)', 'Shallow-AdaLN(k)', 'MLP∘LTV(k)', 'MLP∘LTI(k)', 'LTI(k)', 'LTI(1)'],
    short: ['Deep', 'Shallow', 'MLP∘LTV', 'MLP∘LTI', 'LTI(k)', 'LTI(1)'],
    params: [822.4, 151.1, 84.7, 83.9, 67.1, 33.6],
    open: { le: [61.33, 54.00, 2.00, 5.33, 4.67, 1.00], lp: [58.00, 61.33, 47.33, 62.67, 28.00, 15.00] },
    closed: { le: [70.00, 70.67, 2.67, 14.00, 10.00, 2.00], lp: [78.67, 70.67, 63.33, 75.33, 34.67, 23.00] },
    active: [0.48, 0.49, 0.47, 0.43, 0.44, 0.56],
    // (the functional forms are typeset with KaTeX: RUNG_TEX in view5)
    glyph: [
      ['blocks6'], ['blocks1'], ['sq:A(z)', 'gate', 'relu', 'sq:W'], ['sq:A', 'relu', 'sq:W'],
      ['sq:A₀', 'sq:A₁', 'sq:A₂', 'plus', 'sq:B'], ['sq:A', 'plus', 'sq:B'],
    ],
  };
  // Fig 2c (Piecewise 2×2, random goals, true MPC R = 1, 3 seeds).
  const HORIZ = {
    H: [5, 10, 15, 20],
    lp: [84.67, 59.33, 41.33, 42.00], lpS: [4.16, 7.02, 7.02, 5.29],
    tj: [82.67, 72.67, 58.00, 43.33], tjS: [5.03, 5.77, 4.00, 9.02],
    le: [65.33, 36.00, 35.33, 38.00], leS: [4.16, 3.46, 2.31, 0.00],
  };

  /* ------------------------------------------------------------ math */

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, d) => clamp((t - a) / d, 0, 1);
  const eout = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eio = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const sig = x => 1 / (1 + Math.exp(-x));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------ toy world: Piecewise 2×2 */
  // p_{t+1} = p_t + a_t·speed + b[zone(p_t)],  b_i = bias·(cos θ_i, sin θ_i),  θ_i = 2πi/4 (y down):
  // top-left → right, top-right → down, bottom-left → left, bottom-right → up   (brief §4, App. C)

  const SPEED = 0.042, BIAS = 0.017, MARG = 0.035, R_OK = 0.045, BLOCK = 5, MAXR = 10;
  const BV = [[BIAS, 0], [0, BIAS], [-BIAS, 0], [0, -BIAS]];
  const zoneOf = (x, y) => (y >= 0.5 ? 2 : 0) + (x >= 0.5 ? 1 : 0);
  // Illustrative predictors. Sparse: mode-exact (support names the zone) with a tiny ε.
  // Dense: smooths the piecewise drift across boundaries and mis-scales the action response. (Calibrated offline so
  // that, in the Plan (MPC) step's paired episodes, dense reaches the goal about 2 times in 3 — the paper measures
  // 65.3% dense vs 84.7% sparse on this world — rather than overstating the gap.)
  const MODELS = [
    { rot: 0.05, gain: 0.985, soft: 0, pull: 0 },
    { rot: 0.4, gain: 0.85, soft: 0.12, pull: 0.03 },
  ].map(m => Object.assign({ c: Math.cos(m.rot), s: Math.sin(m.rot) }, m));

  function stepTrue(x, y, ax, ay, o) {
    const b = BV[zoneOf(x, y)];
    o[0] = clamp(x + ax * SPEED + b[0], MARG, 1 - MARG);
    o[1] = clamp(y + ay * SPEED + b[1], MARG, 1 - MARG);
  }
  function stepModel(k, x, y, ax, ay, o) {
    const m = MODELS[k];
    const rx = (ax * m.c - ay * m.s) * m.gain, ry = (ax * m.s + ay * m.c) * m.gain;
    let bx, by;
    if (!m.soft) { const b = BV[zoneOf(x, y)]; bx = b[0]; by = b[1]; }
    else {
      const wx = sig((x - 0.5) / m.soft), wy = sig((y - 0.5) / m.soft);
      const w0 = (1 - wx) * (1 - wy), w1 = wx * (1 - wy), w2 = (1 - wx) * wy, w3 = wx * wy;
      bx = w0 * BV[0][0] + w1 * BV[1][0] + w2 * BV[2][0] + w3 * BV[3][0];
      by = w0 * BV[0][1] + w1 * BV[1][1] + w2 * BV[2][1] + w3 * BV[3][1];
    }
    o[0] = clamp(x + rx * SPEED + bx + m.pull * (0.5 - x), MARG, 1 - MARG);
    o[1] = clamp(y + ry * SPEED + by + m.pull * (0.5 - y), MARG, 1 - MARG);
  }

  /* ------------------------------------------------------------ toy latent code (24 of D) */
  // Cells 0–11: four zone blocks of 3 (after Lemma 4.1: the active block names the mode, the
  // barycentric weights λ = (1−u−v, u, v) inside it give the position). Cells 12–23: distributed
  // hinge features. Sparse code = ReLU(pre) (LpWM, σ = ReLU); dense code = pre (LeWM, σ = identity).
  const HINGE = [];
  { const r = mulberry32(7); for (let j = 0; j < 12; j++) { const a = (TAU * j) / 12 + 0.23; HINGE.push([Math.cos(a), Math.sin(a), -0.05 + 0.16 * r()]); } }
  function preact(x, y, o) {
    const q = zoneOf(x, y);
    for (let k = 0; k < 4; k++) {
      const u = Math.abs(x - (k & 1)), v = Math.abs(y - (k >> 1)), l0 = 1 - u - v;
      if (k === q) { o[3 * k] = l0; o[3 * k + 1] = u; o[3 * k + 2] = v; }
      else {
        o[3 * k] = -0.12 - 0.5 * Math.abs(l0 - 0.2);
        o[3 * k + 1] = -0.1 - 0.45 * Math.abs(u - 0.5);
        o[3 * k + 2] = -0.1 - 0.45 * Math.abs(v - 0.5);
      }
    }
    for (let j = 0; j < 12; j++) { const h = HINGE[j]; o[12 + j] = 2 * (h[0] * (x - 0.5) + h[1] * (y - 0.5)) + h[2]; }
    return o;
  }
  function code(k, x, y, o) { preact(x, y, o); if (k === 0) for (let i = 0; i < 24; i++) if (o[i] < 0) o[i] = 0; return o; }
  const TMP = new Float32Array(24);
  function cost(k, x, y, g) { code(k, x, y, TMP); let c = 0; for (let i = 0; i < 24; i++) { const d = TMP[i] - g[i]; c += d * d; } return c; }

  /* ------------------------------------------------------------ CEM (incremental) */
  // C = ‖ẑ_H − z_g‖²; 300 candidates, top 30, 30 iterations, initial variance 1 (App. D).
  const GN = new Float32Array(1 << 16);
  { const r = mulberry32(99); for (let i = 0; i < GN.length; i += 2) { const u = Math.max(1e-9, r()), v = r(), m = Math.sqrt(-2 * Math.log(u)); GN[i] = m * Math.cos(TAU * v); GN[i + 1] = m * Math.sin(TAU * v); } }
  const CEM_N = 300, CEM_E = 30, CEM_IT = 30;
  const OUT = [0, 0];
  function cemInit(k, x0, y0, g, H) {
    const idx = new Array(CEM_N); for (let i = 0; i < CEM_N; i++) idx[i] = i;
    return {
      k, x0, y0, g, H, it: 0, done: false,
      mu: new Float32Array(H * 2), sd: new Float32Array(H * 2).fill(1),
      A: new Float32Array(CEM_N * H * 2), C: new Float32Array(CEM_N), idx,
      pos: new Float32Array(CEM_N * (H + 1) * 2), eliteCost: [],
    };
  }
  function cemIter(st) {
    const { k, H, mu, sd, A, C, idx, pos } = st;
    let gi = (Math.random() * 65536) | 0;
    for (let n = 0; n < CEM_N; n++) {
      let x = st.x0, y = st.y0, pi = n * (H + 1) * 2;
      pos[pi] = x; pos[pi + 1] = y;
      for (let h = 0; h < H; h++) {
        const i = (n * H + h) * 2;
        gi = (gi + 1) & 65535; const ax = (A[i] = clamp(mu[2 * h] + sd[2 * h] * GN[gi], -1, 1));
        gi = (gi + 1) & 65535; const ay = (A[i + 1] = clamp(mu[2 * h + 1] + sd[2 * h + 1] * GN[gi], -1, 1));
        stepModel(k, x, y, ax, ay, OUT); x = OUT[0]; y = OUT[1];
        pi += 2; pos[pi] = x; pos[pi + 1] = y;
      }
      C[n] = cost(k, x, y, st.g);
    }
    idx.sort((a, b) => C[a] - C[b]);
    for (let d = 0; d < H * 2; d++) {
      let m = 0; for (let e = 0; e < CEM_E; e++) m += A[idx[e] * H * 2 + d]; m /= CEM_E;
      let v = 0; for (let e = 0; e < CEM_E; e++) { const q = A[idx[e] * H * 2 + d] - m; v += q * q; }
      mu[d] = m; sd[d] = Math.max(0.05, Math.sqrt(v / CEM_E));
    }
    let ec = 0; for (let e = 0; e < CEM_E; e++) ec += C[idx[e]];
    st.eliteCost.push(ec / CEM_E);
    st.it++;
    if (st.it >= CEM_IT) st.done = true;
  }
  function rollout(k, x, y, mu, H) {
    const pts = new Float32Array((H + 1) * 2); pts[0] = x; pts[1] = y;
    for (let h = 0; h < H; h++) {
      if (k < 0) stepTrue(x, y, mu[2 * h], mu[2 * h + 1], OUT); else stepModel(k, x, y, mu[2 * h], mu[2 * h + 1], OUT);
      x = OUT[0]; y = OUT[1]; pts[2 * h + 2] = x; pts[2 * h + 3] = y;
    }
    return pts;
  }

  /* ========================================================================== */

  Site.register({
    id: 'lpwm',
    n: 1,
    title: 'LpWM',
    path: '/lpwm',
    caption: 'Sparse world models plan with less:\nfew active latents, a small predictor,\nup to +57 pts success on PushT.',

    create(el, api) {
      const C = api.colors;
      const MONO = api.fonts.mono;
      // Typography (round 2): 11px only for tick labels, 12px for labels, 13–14px for titles/readouts.
      const F11 = '11px ' + MONO, F12 = '12px ' + MONO, F13 = '13px ' + MONO, F14 = '14px ' + MONO;
      const INK = C.ink, ACC = C.accent, G2 = C.g200, G3 = C.g300, G4 = C.g400, G5 = C.g500, G6 = C.g600;
      const SEC = '#505050'; // secondary text (readable)
      const A = api.audio;
      const STEP = 60 / 118 / 4; // one 16th at 118 BPM
      const reduced = api.reduced;

      const style = document.createElement('style');
      style.textContent = '.scene--lpwm{touch-action:none;-webkit-user-select:none;user-select:none;}' +
        '.scene--lpwm canvas{touch-action:none;}' +
        '.scene--lpwm .lpwm-tx-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;}' +
        '.scene--lpwm .lpwm-tx{position:absolute;left:0;top:0;white-space:nowrap;font-family:' + MONO + ';letter-spacing:.02em;line-height:1.25;will-change:transform,opacity;display:none;}' +
        // inline math inside mono prose never drops below 15 px (its subscripts stay ≥ 10.5 px)
        '.scene--lpwm .lpwm-tx .katex{font-size:max(1.16em,15px);letter-spacing:0;line-height:1;}' +
        '.scene--lpwm .lpwm-tx.m .katex{font-size:1em;}' +
        '.scene--lpwm .lpwm-tx.box{background:' + C.bg + ';padding:4px 8px;border:1px solid ' + C.ink + ';}' +
        '.scene--lpwm .lpwm-tx.halo{text-shadow:0 0 2px ' + C.bg + ',0 0 3px ' + C.bg + ',0 0 4px ' + C.bg + ';}' +
        '.scene--lpwm .lpwm-tx .katex .mord.text{font-family:' + MONO + ';}' +
        // the hidden headline copies used for measuring (core's own classes; shown only to layout)
        '.scene--lpwm .lpwm-hlprobe{display:block;}' +
        // this scene's headline wraps into even lines (no one-word last line), and its copies wrap the same way
        '.headline-group[data-scene="lpwm"] .hl-title,.scene--lpwm .lpwm-hlprobe .hl-title{text-wrap:balance;}' +
        '.headline-group[data-scene="lpwm"] .hl-sub,.scene--lpwm .lpwm-hlprobe .hl-sub{text-wrap:pretty;}' +
        // (words are inline blocks whether or not they animate in — as in the copies — so a sub swapped in place, or
        // reduced motion, wraps exactly as predicted)
        '.headline-group[data-scene="lpwm"] .w{display:inline-block;}';
      el.append(style);

      const cv = api.canvas();
      const ctx = cv.ctx;

      /* ---------------------------------------------------------------- math overlay (KaTeX) */
      // The canvas cannot typeset math, so every formula / variable name is a KaTeX element in an HTML
      // layer above the canvas, positioned each frame. TX(id, src, x, y, o): `src` is mono text with
      // $…$ math segments (or pure LaTeX with o.math). (x, y) is the anchor: y = vertical CENTRE of the line.
      // o: { size (px), color, align 'left'|'center'|'right', a (opacity), p (left→right reveal 0..1), math }
      const txLayer = document.createElement('div');
      txLayer.className = 'lpwm-tx-layer';
      el.append(txLayer);
      const TXP = new Map();
      let txFrame = 1;
      const escHTML = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const texFallback = s => s.replace(/\\(hat|mathrm|text|operatorname|big|Big|left|right|,|;|!|quad)\b/g, '').replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, '');
      function mixedHTML(src, math) {
        if (math) return Site.texHTML(src, { fallback: texFallback(src) });
        const parts = src.split('$');
        let out = '';
        for (let k = 0; k < parts.length; k++) {
          if (!parts[k]) continue;
          out += k % 2 ? Site.texHTML(parts[k], { fallback: texFallback(parts[k]) }) : '<span>' + escHTML(parts[k]) + '</span>';
        }
        return out;
      }
      function TX(id, src, x, y, o) {
        o = o || {};
        let r = TXP.get(id);
        if (!r) {
          const d = document.createElement('div');
          d.className = 'lpwm-tx';
          txLayer.append(d);
          r = { el: d, key: '', tf: '', op: -1, clip: -1, shown: false, used: 0 };
          TXP.set(id, r);
        }
        r.used = txFrame;
        const a = o.a == null ? 1 : o.a, p = o.p == null ? 1 : clamp(o.p, 0, 1);
        if (a <= 0.004 || p <= 0.001) { if (r.shown) { r.el.style.display = 'none'; r.shown = false; } return; }
        const size = o.size || 12, color = o.color || INK, align = o.align || 'left';
        const key = src + '|' + size + '|' + color + '|' + (o.math ? 1 : 0) + (o.box ? 1 : 0) + (o.halo ? 1 : 0);
        if (key !== r.key) {
          r.key = key;
          r.el.innerHTML = mixedHTML(src, o.math);
          r.el.className = 'lpwm-tx' + (o.math ? ' m' : '') + (o.box ? ' box' : '') + (o.halo ? ' halo' : '');
          r.el.style.fontSize = size + 'px';
          r.el.style.color = color;
        }
        if (!r.shown) { r.el.style.display = 'block'; r.shown = true; }
        // a left-aligned label never runs past the right gutter: it slides left instead (measured once per text)
        if (align === 'left' && G) {
          if (r.wk !== r.key) { r.wk = r.key; r.w = r.el.offsetWidth; }
          const bound = cv.w - (G.phone ? 16 : 40);
          if (x + r.w > bound) x = Math.max(G.phone ? 16 : 40, bound - r.w);
        }
        const ax = align === 'right' ? -100 : align === 'center' ? -50 : 0;
        const tf = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(' + ax + '%,-50%)';
        if (tf !== r.tf) { r.tf = tf; r.el.style.transform = tf; }
        const op = Math.round(a * 100) / 100;
        if (op !== r.op) { r.op = op; r.el.style.opacity = String(op); }
        const cl = Math.round((1 - p) * 100);
        if (cl !== r.clip) { r.clip = cl; r.el.style.clipPath = cl > 0 ? 'inset(-4px ' + cl + '% -4px 0)' : ''; }
      }
      function txEnd() {
        for (const r of TXP.values()) if (r.used !== txFrame && r.shown) { r.el.style.display = 'none'; r.shown = false; }
        txFrame++;
      }

      /* ---------------------------------------------------------------- state */
      const S = {
        step: 0, from: -1, tSwitch: -10, stepT: 0,
        playing: true, autoplay: true,
        H: 5, alpha: 0, alphaUser: false,
        rung: 3, rungView: 3, rungUser: false, loopMix: 0, loopClosed: false,
        hover: null, userTouched: false,
      };
      let rt = 0;          // real time (s) while active
      let soundOn = false;

      /* ---------------------------------------------------------------- time base */
      // The picture always runs on performance.now(), so motion is frame-smooth whether or not sound
      // is on. Sound maps sim time → audio time through a smoothed offset (a2p = audio − perf), so
      // every tick is still scheduled sample-accurately with `when`. Pauses freeze sim time.
      let offset = 0, frozenAt = null, a2p = null;
      const audioLive = () => !!(soundOn && A && A.ready && A.enabled && A.ctx);
      const clk = () => performance.now() / 1000;
      const simT = () => (frozenAt !== null ? frozenAt : clk()) - offset;
      function syncAudio() {
        if (!audioLive()) { a2p = null; return; }
        const c = A.ctx;
        let raw = null;
        try {
          if (c.getOutputTimestamp) {
            const ts = c.getOutputTimestamp();
            if (ts && ts.contextTime > 0 && ts.performanceTime > 0) raw = ts.contextTime - ts.performanceTime / 1000;
          }
        } catch (e) { raw = null; }
        if (raw == null) raw = c.currentTime - performance.now() / 1000;
        if (a2p == null || Math.abs(raw - a2p) > 0.15) a2p = raw; else a2p += (raw - a2p) * 0.04;
      }
      const audioToSim = at => at - a2p - offset;
      function setFrozen(f) {
        if (f && frozenAt === null) frozenAt = clk();
        else if (!f && frozenAt !== null) { offset += clk() - frozenAt; frozenAt = null; }
      }

      /* ---------------------------------------------------------------- sound */
      const snd = (function () {
        let nb = null;
        const LV = { click: 0.14, tick: 0.075, bit: 0.04, grain: 0.06, sub: 0.28 };
        const lastAt = {};
        function live() { return audioLive() ? A : null; }
        function when(t) {
          const a = live(); if (!a) return 0;
          const now = a.ctx.currentTime;
          const w = t == null || a2p == null ? now : t + offset + a2p;
          return Math.max(now + 0.003, w);
        }
        function api1(n) { const f = A && A.play && A.play[n]; return typeof f === 'function' ? f : null; }
        function noise(c) {
          if (!nb || nb.sampleRate !== c.sampleRate) {
            nb = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
            const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          }
          return nb;
        }
        function outNode(c, pan) {
          const g = c.createGain(); g.gain.value = 0;
          const b = api.bus();
          if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan || 0, -1, 1); g.connect(p); p.connect(b); g._p = p; }
          else g.connect(b);
          return g;
        }
        function env(g, t, a, d, pk) {
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(pk, t + a);
          g.gain.exponentialRampToValueAtTime(1e-4, t + a + d);
        }
        function done(src, nodes) { src.onended = () => { for (const n of nodes) { try { n.disconnect(); } catch (e) { /* */ } } }; }
        const L = {
          click(c, t, o) {
            const s = c.createBufferSource(); s.buffer = noise(c);
            const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.freq || 2500 + Math.random() * 6500; f.Q.value = o.q || 2.4;
            const g = outNode(c, o.pan); s.connect(f); f.connect(g);
            env(g, t, 0.0004, o.len || 0.007, (o.g == null ? 1 : o.g) * LV.click);
            s.start(t, Math.random() * 0.4); s.stop(t + 0.05); done(s, [s, f, g, g._p].filter(Boolean));
          },
          tick(c, t, m, o) {
            const hz = 440 * Math.pow(2, (m - 69) / 12);
            const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = hz;
            const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz * 2.756;
            const g2 = c.createGain(); g2.gain.value = 0.22;
            const g = outNode(c, o.pan); o1.connect(g); o2.connect(g2); g2.connect(g);
            const d = o.len || 0.045;
            env(g, t, 0.0012, d, (o.g == null ? 1 : o.g) * LV.tick);
            o1.start(t); o2.start(t); o1.stop(t + d + 0.02); o2.stop(t + d + 0.02);
            done(o1, [o1, o2, g2, g, g._p].filter(Boolean));
            L.click(c, t, { g: 0.25 * (o.g == null ? 1 : o.g), freq: Math.min(12000, hz * 4), q: 4, pan: o.pan, len: 0.003 });
          },
          bit(c, t, m, o) {
            const hz = 440 * Math.pow(2, (m - 69) / 12);
            const os = c.createOscillator(); os.type = 'square'; os.frequency.setValueAtTime(hz, t);
            if (o.drop) os.frequency.setValueAtTime(hz * 0.5, t + (o.len || 0.02) * 0.5);
            const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp || 5200;
            const g = outNode(c, o.pan); os.connect(f); f.connect(g);
            const d = o.len || 0.022;
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((o.g == null ? 1 : o.g) * LV.bit, t + 0.001);
            g.gain.setValueAtTime((o.g == null ? 1 : o.g) * LV.bit, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.004);
            os.start(t); os.stop(t + d + 0.01); done(os, [os, f, g, g._p].filter(Boolean));
          },
          grain(c, t, m, o) {
            const hz = 440 * Math.pow(2, (m - 69) / 12);
            const d = o.dur || 0.09;
            const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = hz * (1 + (Math.random() - 0.5) * 0.004);
            const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz * 2.001;
            const g2 = c.createGain(); g2.gain.value = 0.12 * (o.bright == null ? 0.5 : o.bright);
            const g = outNode(c, o.pan); o1.connect(g); o2.connect(g2); g2.connect(g);
            const pk = (o.g == null ? 1 : o.g) * LV.grain;
            const curve = new Float32Array(32); for (let i = 0; i < 32; i++) curve[i] = pk * Math.pow(Math.sin((Math.PI * i) / 31), 2);
            g.gain.setValueAtTime(0, t); g.gain.setValueCurveAtTime(curve, t, d);
            o1.start(t); o2.start(t); o1.stop(t + d + 0.01); o2.stop(t + d + 0.01);
            done(o1, [o1, o2, g2, g, g._p].filter(Boolean));
          },
          sub(c, t, m, o) {
            const hz = 440 * Math.pow(2, (m - 69) / 12);
            const os = c.createOscillator(); os.type = 'sine';
            os.frequency.setValueAtTime(hz * 1.6, t); os.frequency.exponentialRampToValueAtTime(hz, t + 0.035);
            const g = outNode(c, 0); os.connect(g);
            const d = o.dur || 0.4;
            env(g, t, 0.004, d, (o.g == null ? 1 : o.g) * LV.sub);
            os.start(t); os.stop(t + d + 0.05); done(os, [os, g, g._p].filter(Boolean));
          },
        };
        function G(o) { return o && o.g != null ? o.g : 1; }
        const api2 = {
          ok(key, gap) { const n = performance.now(); if (lastAt[key] && n - lastAt[key] < gap * 1000) return false; lastAt[key] = n; return true; },
          click(t, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('click');
            if (f) f({ when: when(t), gain: 0.85 * G(o), pan: o.pan || 0, freq: o.freq, q: o.q, dest: api.bus() });
            else L.click(a.ctx, when(t), o);
          },
          tick(t, m, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('tick');
            if (f) f(m, { when: when(t), gain: 0.85 * G(o), pan: o.pan || 0, dur: clamp((o.len || 0.04) / 8, 0.003, 0.008), dest: api.bus() });
            else L.tick(a.ctx, when(t), m, o);
          },
          bit(t, m, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('bit');
            if (f) f(m, { when: when(t), gain: 0.75 * G(o), pan: o.pan || 0, dur: clamp(o.len || 0.022, 0.006, 0.08), to: o.drop ? m - 12 : undefined, dest: api.bus() });
            else L.bit(a.ctx, when(t), m, o);
          },
          grain(t, m, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('grain');
            if (f) f(m, { when: when(t), gain: 0.8 * G(o), pan: o.pan || 0, dur: o.dur, bright: o.bright, dest: api.bus() });
            else L.grain(a.ctx, when(t), m, o);
          },
          sub(t, m, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('sub');
            if (f) f(m, { when: when(t), gain: 0.8 * G(o), dur: o.dur, dest: api.bus() });
            else L.sub(a.ctx, when(t), m, o);
          },
          data(t, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('data');
            if (f) { f({ when: when(t), dur: o.dur || 0.2, density: o.density || 40, pitch: o.pitch, spread: o.spread == null ? 0.8 : o.spread, gain: 0.6 * G(o), dest: api.bus() }); return; }
            const n = Math.max(1, Math.round((o.dur || 0.2) * (o.density || 40)));
            const c = a.ctx, t0 = when(t), sp = o.spread == null ? 0.8 : o.spread;
            for (let i = 0; i < n; i++) {
              const tt = t0 + Math.random() * (o.dur || 0.2), pan = (Math.random() * 2 - 1) * sp;
              if (o.pitch && Math.random() < 0.4) L.bit(c, tt, o.pitch[(Math.random() * o.pitch.length) | 0], { g: 0.35 * G(o), pan, len: 0.006 + Math.random() * 0.01 });
              else L.click(c, tt, { g: 0.45 * G(o), pan, freq: 3000 + Math.random() * 8000, len: 0.003 });
            }
          },
          glitch(t, o = {}) {
            const a = live(); if (!a || !api.bus()) return;
            const f = api1('glitch');
            if (f) { f({ when: when(t), repeats: o.repeats || 6, len: o.len || 0.028, midi: o.midi, gain: 0.75 * G(o), pan: o.pan || 0, dest: api.bus() }); return; }
            const c = a.ctx; let tt = when(t), len = o.len || 0.028;
            const rep = o.repeats || 6;
            for (let i = 0; i < rep; i++) {
              const gg = G(o) * (1 - (i / rep) * 0.6);
              if (o.midi != null) L.bit(c, tt, o.midi + (i % 2 ? 12 : 0), { g: 0.8 * gg, len: len * 0.6, pan: o.pan || 0 });
              L.click(c, tt, { g: 0.5 * gg, freq: 5000 + i * 700, pan: o.pan || 0, len: 0.004 });
              tt += len; len *= 0.82;
            }
          },
          kick(t, o = {}) { const f = api1('kick'); if (live() && f && api.bus()) f({ when: when(t), gain: G(o), dest: api.bus() }); },
          hat(t, o = {}) { const f = api1('hat'); if (live() && f && api.bus()) f({ when: when(t), gain: G(o), pan: o.pan || 0, dest: api.bus() }); },
        };
        return api2;
      })();
      const deg = (i, oct = 0) => (A && A.degree ? A.degree(i, oct) : 62 + [0, 2, 4, 7, 9][((i % 5) + 5) % 5] + 12 * (Math.floor(i / 5) + oct));
      const ZONE_ROOT = [0, 3, 4, 2]; // TL → D, TR → A, BL → B, BR → F#
      // round 2 (less high content): zone-block ticks top out at A5, hinge ticks sit in D3–B4
      const cellMidi = i => (i < 12 ? deg(ZONE_ROOT[(i / 3) | 0] + [0, 2, 4][i % 3], 0) : deg(((i - 12) % 10) - 5, 0));

      // Just-in-time sound queue. A plan's phrase (up to ~4 s long) is queued in sim time and handed
      // to the engine only ~0.12 s ahead, tagged with its agent's plan generation: a replan, a step
      // change, a pause or an exit silently drops whatever the old plan had not played yet.
      const SQ = [];
      function qs(ag, t, fn) { if (audioLive()) SQ.push({ t, fn, k: ag ? ag.kind : -1, gen: ag ? ag.gen : 0 }); }
      function drainSQ(now) {
        if (!SQ.length) return;
        const h = now + 0.12;
        for (let i = 0; i < SQ.length;) {
          const e = SQ[i];
          if (e.k >= 0 && AG[e.k].gen !== e.gen) { SQ.splice(i, 1); continue; }
          if (e.t <= h) { SQ.splice(i, 1); if (e.t > now - 0.06) { try { e.fn(); } catch (_) { /* never break the frame */ } } continue; }
          i++;
        }
      }
      function clearSQ(hard) {
        SQ.length = 0;
        if (hard && A && typeof A.stopAll === 'function' && api.bus()) { try { A.stopAll(api.bus(), 0.03); } catch (e) { /* */ } }
      }
      // the next 16th (× mult) of the shared clock, in sim time; null = play now (no clock / no sound)
      function qT(mult) {
        if (!audioLive() || a2p == null || !A.clock || typeof A.clock.nextStep !== 'function') return null;
        const ns = A.clock.nextStep(mult || 1);
        return ns && ns.time > 0 ? audioToSim(ns.time) : null;
      }
      // Hover sounds: at most ONE per 16th slot of the shared clock. A new hover aimed at a slot that already
      // has a pending sound replaces it (the latest cell wins) instead of stacking another voice on the same
      // instant. dwell (s): the slot is at least this far ahead, so a sweep that moves on never sounds.
      let hoverQ = null; // { at (audio time), fn(simTime) }
      function hoverSound(fn, dwell) {
        if (!audioLive() || a2p == null || !A.clock || typeof A.clock.nextStep !== 'function') return;
        const ns = A.clock.nextStep(1);
        if (!ns || !(ns.time > 0)) return;
        const sd = A.clock.stepDur || STEP, now = A.ctx.currentTime;
        let at = ns.time;
        if (dwell) while (at - now < dwell) at += sd;
        if (hoverQ && Math.abs(hoverQ.at - at) < 1e-3) { hoverQ.fn = fn; return; }
        if (hoverQ && !dwell) fireHover();
        hoverQ = { at, fn };
      }
      function fireHover() {
        const q = hoverQ; hoverQ = null;
        if (q && audioLive() && a2p != null) { try { q.fn(audioToSim(q.at)); } catch (e) { /* never break the frame */ } }
      }
      function pumpHover() { if (hoverQ && (!audioLive() || A.ctx.currentTime >= hoverQ.at - 0.06)) fireHover(); }

      /* ---------------------------------------------------------------- sim: agents */
      function mkAgent(kind) {
        return {
          kind, gen: 0, x: 0.2, y: 0.72, seg: [], trail: [], plans: [], status: 'run', phase: 'plan', phaseTick: 0,
          planLen: 4, execLen: 1, execI: 0, execWait: 0, replans: 0, st: null, zone: 2, drag: false,
          pulses: [], flashes: [], ok: 0, eps: 0, done: 0, marks: [], endT: 0, lastDrift: 0,
          res: null,               // this episode's outcome (1 reached, 0 missed), committed when BOTH agents are done
          lastFin: null, prevFin: null, // the last two finished plans (read-outs never go blank while replanning)
        };
      }
      const AG = [mkAgent(0), mkAgent(1)];
      const goal = { x: 0.8, y: 0.26 };
      const gcode = [code(0, goal.x, goal.y, new Float32Array(24)), code(1, goal.x, goal.y, new Float32Array(24))];
      let nextTick = 0, tickN = 0, epWait = -1, simOn = false;
      let pairBroken = false; // Plan (MPC): an agent was nudged mid-episode → this episode is not scored
      let arpUntil = -1, reachAt = -9; // sound: end of the current code arpeggio, time of the last goal-reached chord
      let events = []; // {t, type, ...}  (visual flashes)
      const rng = mulberry32(2026);

      const dual = () => S.step === 4;
      const simStep = () => (S.step >= 5 ? (S.from >= 0 && S.from <= 4 ? S.from : 4) : S.step);
      const PHASE = [
        { plan: 12, exec: 1 }, { plan: 32, exec: 2 }, { plan: 16, exec: 2 }, { plan: 20, exec: 1 }, { plan: 4, exec: 1 },
      ];

      function setGoal(x, y) {
        goal.x = clamp(x, 0.06, 0.94); goal.y = clamp(y, 0.06, 0.94);
        code(0, goal.x, goal.y, gcode[0]); code(1, goal.x, goal.y, gcode[1]);
      }
      function agentPos(ag, T) {
        if (ag.drag) return [ag.x, ag.y];
        const sg = ag.seg;
        for (let i = sg.length - 1; i >= 0; i--) {
          const s = sg[i];
          if (s.t <= T) {
            if (reduced) return [s.x1, s.y1]; // reduced motion: the agent steps, it never glides
            const u = clamp((T - s.t) / s.d, 0, 1), e = 1 - (1 - u) * (1 - u) * (1 - u);
            return [lerp(s.x0, s.x1, e), lerp(s.y0, s.y1, e)];
          }
        }
        return sg.length ? [sg[0].x0, sg[0].y0] : [ag.x, ag.y];
      }
      function pushSeg(ag, t, x1, y1, d) {
        ag.seg.push({ t, x0: ag.x, y0: ag.y, x1, y1, d });
        if (ag.seg.length > 5) ag.seg.shift();
        ag.x = x1; ag.y = y1;
      }
      function curPlan(ag, T) {
        for (let i = ag.plans.length - 1; i >= 0; i--) if (ag.plans[i].t <= T) return ag.plans[i];
        return null;
      }
      // latest plan whose CEM has finished (so read-outs never blink while the next plan is computed)
      function finPlan(ag, T) {
        for (let i = ag.plans.length - 1; i >= 0; i--) if (ag.plans[i].t <= T && ag.plans[i].fin) return ag.plans[i];
        // (a burst of replans can push every finished plan out of the buffer: fall back to the last one)
        return ag.lastFin && ag.lastFin.t <= T ? ag.lastFin : null;
      }
      // the finished plan before `pl` (what a read-out showed before `pl` started overwriting it)
      function prevFinOf(ag, pl) { return ag.lastFin === pl ? ag.prevFin : ag.lastFin !== pl ? ag.lastFin : null; }

      function startPlan(ag, t, why) {
        const ps = PHASE[simStep()];
        ag.planLen = ps.plan; ag.execLen = ps.exec;
        ag.phase = 'plan'; ag.phaseTick = 1; ag.replans++;
        ag.gen++; // drops whatever the previous plan still had queued
        const st = cemInit(ag.kind, ag.x, ag.y, gcode[ag.kind], S.H);
        const pl = { t, st, planLen: ag.planLen, H: S.H, x0: ag.x, y0: ag.y, fin: null, why, code: code(0, ag.x, ag.y, new Float32Array(24)), pre: preact(ag.x, ag.y, new Float32Array(24)) };
        ag.st = pl;
        // a superseded plan that never finished is dropped, so it can never evict the last finished one
        const last = ag.plans[ag.plans.length - 1];
        if (last && !last.fin) ag.plans.pop();
        ag.plans.push(pl); if (ag.plans.length > 3) ag.plans.shift();
        ag.marks.push({ t, x: ag.x, y: ag.y }); if (ag.marks.length > 12) ag.marks.shift();
        if (drag && drag.type === 'goal') {
          // while the goal is being dragged the planner restarts every ~260 ms: no full phrases, just one
          // quantised "replan" bit (pitched by the goal's zone), at most once per 1/8 note
          if (ag.kind === 0 && snd.ok('replan', STEP * 2)) snd.bit(qT(2), deg(ZONE_ROOT[zoneOf(goal.x, goal.y)], 0), { g: 0.32, pan: (goal.x - 0.5) * 0.8, len: 0.018 });
          return;
        }
        planSounds(ag, pl, t);
      }
      function finishPlan(ag, t, plIn) {
        const pl = plIn || ag.st; if (!pl) return;
        pl.finT = t;
        while (!pl.st.done) cemIter(pl.st);
        const H = pl.H, mu = pl.st.mu;
        const imag = rollout(ag.kind, pl.x0, pl.y0, mu, H);
        const tru = rollout(-1, pl.x0, pl.y0, mu, H);
        const other = rollout(1 - ag.kind, pl.x0, pl.y0, mu, H);
        const dx = imag[2 * H] - tru[2 * H], dy = imag[2 * H + 1] - tru[2 * H + 1];
        const ox = other[2 * H] - tru[2 * H], oy = other[2 * H + 1] - tru[2 * H + 1];
        pl.fin = { mu, imag, tru, other, drift: Math.hypot(dx, dy), otherDrift: Math.hypot(ox, oy), cost: pl.st.eliteCost[pl.st.eliteCost.length - 1] };
        ag.lastDrift = pl.fin.drift;
        if (ag.lastFin !== pl) { ag.prevFin = ag.lastFin; ag.lastFin = pl; }
        if (!pl.seed && simStep() === 3 && ag.kind === 0 && !(drag && drag.type === 'goal')) {
          // the autoregressive rollout, one column per 32nd: sparse = a clean tick pitched by the active block
          // (the zone = the "chord"), dense = a short smeared bit on the right
          const HH = Math.min(H, 20), every = Math.ceil(HH / 6), bitEvery = Math.max(2, Math.ceil(HH / 3));
          for (let h = 0; h < HH; h++) {
            if (h % every && h !== HH - 1) continue;
            const tt = t + (h * STEP) / 2, zq = zoneOf(imag[2 * h + 2], imag[2 * h + 3]);
            qs(ag, tt, () => snd.tick(tt, deg(ZONE_ROOT[zq] + (h % 3) * 2, 0), { g: 0.3, pan: -0.55 + (0.25 * h) / 20, len: 0.04 }));
            if (h % bitEvery === 0) qs(ag, tt + STEP / 4, () => snd.bit(tt + STEP / 4, deg(ZONE_ROOT[zq], 0) - 1, { g: 0.16, pan: 0.55, len: 0.012 }));
          }
        }
      }
      // A finished plan computed synchronously (30 CEM iterations, a few ms) and back-dated, so the scene
      // looks finished at first paint: rollout raster, drift and paths exist before the live loop plans.
      function seedPlan(ag, t) {
        const st = cemInit(ag.kind, ag.x, ag.y, gcode[ag.kind], S.H);
        const pl = { t: t - 3, st, planLen: PHASE[simStep()].plan, H: S.H, x0: ag.x, y0: ag.y, fin: null, why: null, seed: true, code: code(0, ag.x, ag.y, new Float32Array(24)), pre: preact(ag.x, ag.y, new Float32Array(24)) };
        finishPlan(ag, t - 3, pl);
        ag.plans.push(pl); if (ag.plans.length > 3) ag.plans.shift();
      }
      function newEpisodeAgent(ag, t) {
        ag.status = 'run'; ag.replans = 0; ag.phase = 'plan'; ag.phaseTick = 0; ag.execWait = 0; ag.res = null;
        ag.trail.length = 0; ag.marks.length = 0; ag.trail.push({ t, x: ag.x, y: ag.y });
      }
      function pickGoal() {
        const a = AG[0];
        // the Predictor step compares two predictors along the path: a farther goal keeps that comparison legible
        const minD = simStep() === 3 ? 0.55 : 0.45;
        for (let i = 0; i < 40; i++) {
          const x = 0.1 + 0.8 * rng(), y = 0.1 + 0.8 * rng();
          if (Math.hypot(x - a.x, y - a.y) > minD && (i > 25 || zoneOf(x, y) !== zoneOf(a.x, a.y))) return [x, y];
        }
        return [clamp(1 - a.x, 0.1, 0.9), clamp(1 - a.y, 0.1, 0.9)];
      }
      function newEpisode(t, keepGoal) {
        if (!keepGoal) { const g = pickGoal(); setGoal(g[0], g[1]); }
        const a = AG[0], d = AG[1];
        if (dual()) {
          if (Math.hypot(d.x - a.x, d.y - a.y) > 0.001) {
            pushSeg(d, t, a.x, a.y, 0.34);
            events.push({ t, type: 'reset', k: 1 });
            snd.glitch(t, { repeats: 3, len: 0.022, midi: deg(1, 1), g: 0.35, pan: 0.45 });
          }
          newEpisodeAgent(d, t);
          d.eps++;
        }
        newEpisodeAgent(a, t);
        a.eps++;
        epWait = -1;
        pairBroken = false;
      }
      function startDual(t) {
        const a = AG[0], d = AG[1];
        d.seg.length = 0; d.x = a.x; d.y = a.y; d.plans.length = 0; d.st = null; d.lastFin = d.prevFin = null;
        a.plans.length = 0; a.st = null; a.lastFin = a.prevFin = null;
        a.ok = d.ok = 0; a.eps = d.eps = 0; a.done = d.done = 0;
        a.seg.length = 0;
        newEpisode(t, false);
        seedPlan(a, t); seedPlan(d, t);
      }
      // The task changed (goal moved, H changed). In Plan (MPC) that starts a fresh PAIRED episode for both
      // agents from the same state, so the sparse-vs-dense score always compares the same episodes.
      function restartTask(why, t) {
        if (dual()) {
          newEpisode(t, true);
          for (const ag of AG) { ag.why = why; ag.gen++; }
        } else replanAll(why, t);
      }

      function agentTick(ag, t) {
        if (ag.drag || ag.status !== 'run') return;
        if (ag.phase === 'plan') {
          if (ag.phaseTick === 0) { startPlan(ag, t, ag.why || null); ag.why = null; return; }
          ag.phaseTick++;
          if (ag.phaseTick > ag.planLen) {
            finishPlan(ag, t);
            ag.phase = 'exec'; ag.execI = 0; ag.execWait = 0;
          } else return;
        }
        // exec
        if (ag.execWait > 0) { ag.execWait--; return; }
        const pl = ag.st; if (!pl || !pl.fin) { ag.phase = 'plan'; ag.phaseTick = 0; return; }
        const mu = pl.fin.mu, i = ag.execI;
        const z0 = zoneOf(ag.x, ag.y);
        stepTrue(ag.x, ag.y, mu[2 * i] + (rng() - 0.5) * 0.06, mu[2 * i + 1] + (rng() - 0.5) * 0.06, OUT);
        const d = ag.execLen * STEP;
        pushSeg(ag, t, OUT[0], OUT[1], d * 0.9);
        ag.trail.push({ t: t + d * 0.9, x: ag.x, y: ag.y }); if (ag.trail.length > 90) ag.trail.shift();
        ag.pulses.push(t); if (ag.pulses.length > 6) ag.pulses.shift();
        execSounds(ag, t);
        const z1 = zoneOf(ag.x, ag.y);
        if (z1 !== z0) { ag.flashes.push({ t: t + d * 0.5, z: z1 }); if (ag.flashes.length > 4) ag.flashes.shift(); zoneSounds(ag, t + d * 0.5, z1); }
        ag.execI++; ag.execWait = ag.execLen - 1;
        if (Math.hypot(ag.x - goal.x, ag.y - goal.y) < R_OK) {
          ag.status = 'reached'; ag.res = 1; ag.endT = t + d;
          events.push({ t: t + d, type: 'reached', k: ag.kind, n: ag.replans });
          reachSounds(ag, t + d);
        } else if (ag.execI >= Math.min(BLOCK, pl.H)) {
          if (ag.replans >= MAXR) {
            ag.status = 'failed'; ag.res = 0; ag.endT = t + d;
            events.push({ t: t + d, type: 'failed', k: ag.kind });
            failSounds(ag, t + d);
          } else { ag.phase = 'plan'; ag.phaseTick = 0; }
        }
      }

      function logicTick(t) {
        const n = dual() ? 2 : 1;
        for (let k = 0; k < n; k++) agentTick(AG[k], t);
        let running = false;
        for (let k = 0; k < n; k++) if (AG[k].status === 'run' || AG[k].drag) running = true;
        if (!running) {
          if (epWait < 0) {
            // score the episode only once every agent has run it to the end, on the same goal
            if (!pairBroken) for (let k = 0; k < n; k++) { const ag = AG[k]; if (ag.res != null) { ag.done++; if (ag.res) ag.ok++; } }
            for (let k = 0; k < n; k++) AG[k].res = null;
            epWait = (dual() ? 10 : 7) + (S.userTouched ? 14 : 0);
          } else if (--epWait <= 0) newEpisode(t, false);
        }
        pulseSounds(t);
        tickN++;
        events = events.filter(e => t - e.t < 4);
      }
      function cemWork(now) {
        const n = dual() ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const pl = AG[k].st;
          if (!pl || pl.st.done || pl.t > now) continue;
          const dur = Math.max(STEP, pl.planLen * STEP * 0.92);
          const target = Math.min(CEM_IT, Math.ceil(CEM_IT * Math.pow(clamp((now - pl.t) / dur, 0, 1), 1.7)) + 1);
          let guard = 0;
          while (pl.st.it < target && guard++ < 12) cemIter(pl.st);
        }
      }
      function runSim() {
        const now = simT();
        const la = a2p != null ? 0.08 : 0; // logic runs a little ahead so its sounds can be scheduled
        if (nextTick < now - 0.35) nextTick = now;
        let guard = 0;
        while (nextTick <= now + la && guard++ < 6) { logicTick(nextTick); nextTick += STEP; }
        cemWork(now);
      }
      // Force a replan (user moved the goal / nudged the agent / changed H).
      function replanAll(why, t) {
        const n = dual() ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const ag = AG[k];
          if (ag.drag) continue;
          if (ag.status !== 'run') { ag.status = 'run'; ag.replans = 0; ag.trail.length = 0; ag.marks.length = 0; ag.trail.push({ t, x: ag.x, y: ag.y }); }
          else ag.replans = 0;
          ag.phase = 'plan'; ag.phaseTick = 0; ag.why = why; ag.gen++;
        }
        epWait = -1;
      }

      /* ---------------------------------------------------------------- sonification */
      function panOf(ag) { return dual() ? (ag.kind ? 0.5 : -0.5) + (ag.x - 0.5) * 0.3 : (ag.x - 0.5) * 0.8; }
      function planSounds(ag, pl, t) {
        const s = simStep(), dur = pl.planLen * STEP, pan = panOf(ag);
        const c = pl.code, pre = pl.pre;
        // every note of the phrase goes through the just-in-time queue (dropped if this plan is superseded)
        const Q = (tt, fn) => qs(ag, tt, () => fn(tt));
        // one soft tuned tick per ACTIVE unit, silence for every exact zero (negative space); spread over ≥ 1 beat
        const codeTicks = (t0, span, g, pp) => {
          const slot = Math.max(span, 4 * STEP) / 24;
          if (ag.kind === 0) arpUntil = Math.max(arpUntil, t0 + 24 * slot); // execution clicks thin out meanwhile
          for (let i = 0; i < 24; i++) {
            const p = pp == null ? -0.7 + (1.4 * i) / 23 : pp;
            if (c[i] > 0) Q(t0 + i * slot, tt => snd.tick(tt, cellMidi(i), { g: g * (0.45 + 0.55 * Math.min(1, c[i])), pan: p, len: 0.05 }));
            else if (s === 2 && S.alpha > 0.05 && i % 2 === 0) Q(t0 + i * slot, tt => snd.bit(tt, cellMidi(i) - 12, { g: 0.45 * S.alpha * Math.min(1, -pre[i] * 2), pan: p, len: 0.012 }));
          }
        };
        // the 3-layer MLP forward pass: one low bit per layer, rising
        const mlpBits = (t0, span) => { for (let l = 0; l < 4; l++) Q(t0 + (span * l) / 3.6, tt => snd.bit(tt, deg(l * 2, -1), { g: 0.32 + 0.05 * l, pan: -0.2 + 0.15 * l, len: 0.018 })); };
        if (pl.why) Q(t, tt => snd.glitch(tt, { repeats: 6, len: 0.026, midi: deg(4, 0), g: 0.45, pan }));
        if (s === 0 || s === 4) {
          // step 0 walks the whole loop: encode → the sparse code flows on → predict → plan (CEM)
          const c0 = s === 0 ? 0.64 : 0, cd = s === 0 ? 0.26 : 0.45;
          if (s === 0) {
            Q(t, tt => snd.click(tt, { g: 0.45, freq: 3200, pan: -0.6 }));
            codeTicks(t + dur * 0.28, 10 * STEP, 0.7, null); // (spread over 10 sixteenths: room between the ticks)
            // (one click as the code enters the predictor: the arpeggio already carries this window)
            Q(t + dur * 0.52, tt => snd.click(tt, { g: 0.26, freq: 2200, q: 4, pan: 0 }));
          }
          // CEM: a wide data burst (300 samples) narrowing to a few clean ticks (the elites → the plan)
          const dense = ag.kind === 1;
          Q(t + dur * c0, tt => snd.data(tt, { dur: dur * (cd + 0.14), density: dense ? 56 : 42, spread: dual() ? 0.35 : 0.9, g: dense ? 0.38 : 0.32, pitch: [deg(0, 0), deg(2, 0), deg(4, 0)] }));
          if (dense) Q(t + dur * 0.9, tt => snd.bit(tt, deg(1, 0), { g: 0.45, pan, len: 0.03 }));
          else Q(t + dur * 0.9, tt => snd.tick(tt, deg(0, 0), { g: 0.6, pan }));
        } else if (s === 1) {
          // ViT encoder, locked to the drawing (ENC): patches → tokens, 12 attention blocks, CLS, MLP, ReLU, code
          Q(t, tt => snd.data(tt, { dur: dur * ENC.scan[1], density: 30, spread: 0.7, g: 0.24 }));
          const a0 = ENC.attn[0], as = ENC.attn[1] - ENC.attn[0];
          for (let i = 0; i < 12; i++) Q(t + dur * (a0 + (as * i) / 12), tt => snd.click(tt, { g: 0.24 + 0.015 * i, freq: 1500 + 190 * i, q: 4, pan: -0.5 + i / 12 }));
          Q(t + dur * ENC.cls[0], tt => snd.bit(tt, deg(3, 0), { g: 0.42, pan: 0.2 }));
          mlpBits(t + dur * ENC.mlp[0], dur * (ENC.mlp[1] - ENC.mlp[0]));
          Q(t + dur * ENC.relu[0], tt => snd.click(tt, { g: 0.55, freq: 2600, q: 6, pan: 0.3 }));
          codeTicks(t + dur * ENC.rev[0], dur * 0.14, 0.8, null);
        } else if (s === 2) {
          Q(t, tt => snd.data(tt, { dur: dur * 0.2, density: 30, spread: 0.7, g: 0.22 }));
          codeTicks(t + dur * 0.5, dur * 0.3, 0.8, null);
        } else {
          // predictor (PRD): the code arrives (one soft bit: its arpeggio was already heard in the encoder
          // step), 6 AdaLN blocks, the MLP pass, ReLU, then ẑ's active units
          Q(t, tt => snd.bit(tt, deg(0, 0), { g: 0.3, pan: -0.6, len: 0.016 }));
          for (let i = 0; i < 6; i++) Q(t + dur * (PRD.blocks[0] + ((PRD.blocks[1] - PRD.blocks[0]) * i) / 6), tt => snd.click(tt, { g: 0.3, freq: 1700 + 300 * i, q: 4, pan: 0.1 * i - 0.25 }));
          Q(t + dur * PRD.blocks[0], tt => snd.sub(tt, deg(0, -2), { g: 0.25, dur: 0.16 }));
          mlpBits(t + dur * PRD.mlp[0], dur * (PRD.mlp[1] - PRD.mlp[0]));
          Q(t + dur * PRD.relu[0], tt => snd.click(tt, { g: 0.5, freq: 2600, q: 6, pan: 0.2 }));
          {
            const t0 = t + dur * PRD.rev[0], slot = (4 * STEP) / 12;
            let k = 0;
            for (let i = 0; i < 12; i++) if (c[i] > 0) { const tt = t0 + k++ * slot; Q(tt, t2 => snd.tick(t2, cellMidi(i), { g: 0.7 * (0.45 + 0.55 * Math.min(1, c[i])), pan: 0.3, len: 0.05 })); }
            Q(t0 + k * slot, t2 => snd.data(t2, { dur: 0.18, density: 30, spread: 0.4, g: 0.16 }));
            arpUntil = Math.max(arpUntil, t0 + 4 * STEP);
          }
        }
      }
      function execSounds(ag, t) {
        // plan execution: the clicky micro-pulse, locked to the clock (the kick and hats are added in pulseSounds)
        const pan = panOf(ag);
        if (ag.kind === 0) {
          const beat = tickN % 4 === 0;
          // while a code arpeggio (or the other agent's phrase) is sounding, only the on-beat clicks remain
          const busy = t < arpUntil || (dual() && AG[1].phase === 'plan' && AG[1].status === 'run');
          if (busy && tickN % 2 !== 0) return;
          snd.click(t, { g: beat ? 0.7 : 0.4, freq: beat ? 3800 : 5600, q: beat ? 3 : 5, pan, len: beat ? 0.008 : 0.004 });
          if (tickN % 4 === 2 && !busy) snd.tick(t, deg(ZONE_ROOT[zoneOf(ag.x, ag.y)], 0), { g: 0.16, pan, len: 0.03 });
        } else if (tickN % 4 === 2) {
          // dense: a smeared, slightly noisier pulse, once per beat (keeps Plan (MPC) inside the event budget)
          snd.data(t, { dur: 0.06, density: 90, spread: 0.2, g: 0.3 });
        }
      }
      function pulseSounds(t) {
        const n = dual() ? 2 : 1;
        let exec = false;
        for (let k = 0; k < n; k++) if (AG[k].status === 'run' && AG[k].phase === 'exec') exec = true;
        if (!exec) return;
        // a goal-reached chord carries its own sub: the bar's kick / sub merge into it
        const nearReach = Math.abs(t - reachAt) < STEP * 3;
        if (tickN % 16 === 0 && !nearReach) snd.kick(t, { g: 0.32 });
        if (tickN % 16 === 8 && !nearReach) snd.sub(t, deg(0, -2), { g: 0.35, dur: 0.18 });
        if (tickN % 4 === 2) snd.hat(t, { g: 0.12, pan: 0.25 });
      }
      function zoneSounds(ag, t, z) {
        if (!snd.ok('zone' + ag.kind, 0.2)) return;
        const r = ZONE_ROOT[z], pan = panOf(ag);
        if (ag.kind === 0) for (let i = 0; i < 3; i++) snd.tick(t == null ? null : t + i * STEP * 0.25, deg(r + 2 * i, 0), { g: 0.5, pan, len: 0.06 });
        else snd.data(t, { dur: 0.08, density: 60, spread: 0.3, g: 0.3 });
      }
      function reachSounds(ag, t) {
        const pan = panOf(ag);
        const g = ag.kind ? 0.6 : 1;
        [0, 2, 4, 7].forEach((d, i) => snd.grain(t + i * 0.028, deg(d, 0), { g: 0.7 * g, pan: pan + (i - 1.5) * 0.15, dur: 0.24, bright: 0.18 }));
        // one sub per moment: when both agents arrive together (or a kick is due), they share it
        if (Math.abs(t - reachAt) > STEP * 2) snd.sub(t, deg(0, -2), { g: 0.9 * g, dur: 0.6 });
        reachAt = t;
      }
      function failSounds(ag, t) {
        const pan = panOf(ag);
        snd.bit(t, deg(1, 0), { g: 0.5, pan, len: 0.04 });
        snd.bit(t + STEP, deg(-1, 0), { g: 0.45, pan, len: 0.05, drop: true });
      }

      /* ---------------------------------------------------------------- context headline (CONTRACT round 4) */
      // Every step opens with one plain sentence that says what the picture shows (core's big centred headline)
      // and a sub that names the parts. Numbers are the brief's: Fig 1b (PushT, one-layer MLP∘LTI(k), open-loop,
      // D = 4096: 62.67% vs 5.33%) and Fig 2c (Piecewise 2×2, true MPC R = 1, 3 seeds: H = 10, 59.33% vs 36.00%).
      // t: title · s: sub · ss: a one-line sub for windows where the full sub does not fit (desktops) · tt: the title
      // when it stands alone · tp: the title alone on phones. Step 6 (Capacity) follows the open / closed-loop toggle
      // (HLC: Fig 1b closed-loop, MLP∘LTI(k): 75.33% vs 14.00%; without a transformer, dense ≤ 14.0%).
      const HL = [
        { t: 'A world model understands and predicts the world, so acting becomes search, not generation.',
          s: 'That helps it plan in situations it has never seen. Here, in a toy world of four zones, the encoder turns frames into features, the predictor imagines the future from them and the next action, and the planner (CEM) searches for actions.',
          ss: 'The encoder sees, the predictor imagines, the planner (CEM) searches.' },
        { t: 'The encoder is a Vision Transformer, and we study how to make its features sparse.',
          s: 'The frame is cut into patches that become tokens, 12 attention blocks mix them, and the summary token (CLS) goes through an MLP and a ReLU, which sets negative values to exactly zero: the sparse code.',
          ss: 'Patches become tokens; after an MLP, a ReLU zeroes every negative.' },
        // (tt: the title shown when the sub is dropped: it names the dense contrast the picture also shows)
        { t: 'Sparse codes should make the future easier to predict: about half of each code is exactly zero.',
          tt: 'Sparse codes should make the future easier to predict: about half of each is exactly zero, unlike dense codes.',
          // (phones keep the two-line title; the picture's own tag says when it shows the dense code)
          tp: 'Sparse codes should make the future easier to predict: about half of each code is exactly zero.',
          s: 'Which units fire names the zone the agent is in; how strongly they fire gives its position. Our LpWM is trained toward a target that is exactly zero half the time; dense LeWM toward a Gaussian, so every unit is active.',
          ss: 'Which units fire names the zone. Dense codes keep every unit on.' },
        { t: 'The predictor takes the sparse code and the next action, and predicts the next code.',
          s: 'The action scales and shifts every layer. Fed its own predictions, it imagines $H$ steps ahead (right: sparse vs dense, same actions, toy). It is trained to match the encoder’s code of the real next frame.',
          ss: 'It imagines $H$ steps ahead. Right: sparse vs dense, same actions.' },
        // (the "illustrative" qualifier is never lost: the title carries it when the sub is dropped; the measured
        // numbers are Table 4 / Fig 2c, Piecewise 2×2, random goals, H = 5, R = 1: 84.67% vs 65.33%)
        { t: 'During planning, sparsity helps the model plan faster and better.',
          tt: 'During planning, sparsity helps the model plan faster and better (here, an illustrative toy).',
          s: 'An illustrative toy: the planner (CEM) imagines 300 action plans, keeps the best 30, runs 5 steps, replans. Measured on this world, replanning every step: sparse reaches the goal 84.7% of the time, dense 65.3%.',
          ss: 'Illustrative toy. Measured on this world: sparse 84.7%, dense 65.3%.' },
        { t: 'Sparse models plan well with far smaller predictors: 62.7% vs 5.3% success on PushT with a one-layer MLP.',
          // (tp: phones, where the sub is dropped)
          tp: 'Sparse models plan with far smaller predictors: a one-layer MLP, 62.7% vs 5.3% on PushT.',
          s: 'PushT: push a T-shaped block into place. Left to right, the predictor shrinks from a 6-layer transformer to one linear map. Both do well with a transformer; without one, dense falls below 6% while sparse keeps planning.',
          ss: 'PushT: push a T-block into place. Predictors shrink left to right.' },
        { t: 'At every planning horizon tested, sparse models beat dense ones, by up to 23 points at 10 steps ahead.',
          s: 'In a 2D world of four zones that each push the agent a different way, sparse codes succeed 59.3% of the time at 10 steps vs 36.0% for dense. Planning further ahead is harder for both.',
          ss: 'A 2D world of four zones: 59.3% vs 36.0% success at 10 steps ahead.' },
      ];
      const HLC = {
        t: 'Sparse models plan well with far smaller predictors: 75.3% vs 14.0% success on PushT with a one-layer MLP.',
        tp: 'Sparse models plan with far smaller predictors: a one-layer MLP, 75.3% vs 14.0% on PushT.',
        s: 'PushT: push a T-shaped block into place. Left to right, the predictor shrinks from a 6-layer transformer to one linear map. Both do well with a transformer; without one, dense falls to 14% or less, sparse keeps planning.',
        ss: HL[5].ss,
      };
      const hl = i => (i === 5 && S.loopClosed ? HLC : HL[i]);
      let hlPhone = null;  // headline placement last handed to core (phones: under the step nav)
      // sub: 2 = the full sub, 1 = the one-line sub, 0 = the title alone
      const hlTitle = (i, sub) => (sub ? hl(i).t : (hlPhone && hl(i).tp) || hl(i).tt || hl(i).t);
      const hlSub = (i, sub) => (sub === 2 ? hl(i).s : sub === 1 ? hl(i).ss : null);
      // Phones: the step nav (‹ 01 / 07 · World model ›) is the headline's eyebrow; the headline sits under it, at the
      // same top as the other scenes with a step nav (94 px)
      const PH_NAV = 71, PH_TOP = 94;
      // Hidden copies of all seven headlines (with the sub, and title alone), set in the shell's own classes (same
      // fonts, widths, breakpoints, KaTeX and wrapping), so the layout knows every step's headline height up front and
      // places each step's art under its own headline before that step is shown. (Their own marker class, never
      // .is-active: an unscoped query for the live headline can never find one of them.)
      const hlBox = document.createElement('div');
      hlBox.setAttribute('aria-hidden', 'true');
      hlBox.style.cssText = 'position:absolute;inset:0;visibility:hidden;pointer-events:none;overflow:hidden;z-index:-1;';
      el.append(hlBox);
      function hlHTML(text) {
        // (exactly as core's headline: text → escaped HTML → words; words and formulas are inline blocks, so the
        // lines break at the same places)
        return String(text).split(/(\$[^$]+\$)/g).map(seg => {
          if (seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$') return '<span style="display:inline-block">' + Site.texHTML(seg.slice(1, -1)) + '</span>';
          const d = document.createElement('span');
          d.textContent = seg;
          return d.innerHTML.split(/(\s+)/).map(w => (!w || /^\s+$/.test(w) ? w : '<span style="display:inline-block">' + w + '</span>')).join('');
        }).join('');
      }
      const probe = html => {
        const g = document.createElement('div');
        g.className = 'headline-group has-text lpwm-hlprobe';
        g.innerHTML = html;
        hlBox.append(g);
        return g;
      };
      const hlM = HL.map(() => ({ full: probe(''), short: probe(''), title: probe('') }));
      // (the step's copies follow its text: the title-alone copies follow the chrome — phones have their own short
      // titles — and step 6's follow the open / closed-loop toggle)
      function setProbes(i) {
        const g = hlM[i], h = hl(i), two = s => '<p class="hl-title">' + hlHTML(h.t) + '</p><p class="hl-sub">' + hlHTML(s) + '</p>';
        g.full.innerHTML = two(h.s);
        g.short.innerHTML = two(h.ss);
        g.title.innerHTML = '<p class="hl-title">' + hlHTML(hlTitle(i, 0)) + '</p>';
      }
      function setTitleProbes() { for (let i = 0; i < HL.length; i++) setProbes(i); }
      setTitleProbes();
      // measured − predicted headline bottom, per step and variant (normally 0: see onHeadline)
      const hlAdj = {};
      function measureHL(phone) {
        const top = phone ? PH_TOP : parseFloat(getComputedStyle(hlM[0].full).top) || 74;
        return {
          top,
          full: hlM.map((g, i) => g.full.offsetHeight + (hlAdj[i + 's'] || 0)),
          short: hlM.map((g, i) => g.short.offsetHeight + (hlAdj[i + 'm'] || 0)),
          title: hlM.map((g, i) => g.title.offsetHeight + (hlAdj[i + 't'] || 0)),
        };
      }
      let hlShown = '';    // the key last handed to core
      const hlSubOn = i => (!G || !G.subs ? 2 : G.subs[i]);
      function syncHeadline(force, animate) {
        const i = S.step, sub = hlSubOn(i);
        const key = 'lpwm' + i + (sub === 2 ? 's' : sub === 1 ? 'm' : 't') + (!sub && hlPhone && hl(i).tp ? 'p' : '') + (i === 5 && S.loopClosed ? 'c' : '');
        if (key === hlShown && !force) return;
        hlShown = key;
        api.headline(hlTitle(i, sub), hlSub(i, sub), { key, force: !!force, animate: animate !== false });
      }

      /* ---------------------------------------------------------------- layout */
      // Four compositions, each drawn at a scale near 1 (labels are fixed-size px, so the art must not shrink far
      // below its design size or the words collide):
      //   wide  1060 wide  roomy desktops (1440×900, 1680×1050)
      //   mid    620 wide  smaller landscape windows (1280×720, 1100×700, 1024×640, 900×620): fewer, shorter labels
      //   tall   358 wide  the phone composition on a portrait tablet (834×1112), with the desktop chrome
      //   phone  358 wide  phones (≤ 800 px, core's mobile chrome); 'short' = the compact phone compositions
      // Every step's art lies under ITS context headline: it starts a short, nearly fixed gap below the headline
      // (20–46 px; phones 20 px, or 14 where 20 would take the art under its floor, + a little of the spare room) and
      // ends above the bottom chrome (and, desktops, the one-line sub stands in for a sub that does not fit); spare room falls below
      // the art. The art of step i spans [tu·s + tp, bu·s + bp] px from its origin (LAYS[·].ext[i], measured at several
      // scales: design units plus fixed-size labels). Each step takes the largest scale its room allows, within 15% of
      // the tightest step, and a step change glides both the offset and the scale with the crossfade. A composition is
      // used only at or above its floor scale. Each step keeps its headline's sub wherever its own art still holds
      // that floor (else its title stands alone, and step 5's title carries the "illustrative" qualifier itself).
      // Headline heights come from hidden copies in the shell's own classes, so all seven steps are known before any
      // of them is shown. G.mobile = the stacked (phone) composition, G.phone = the phone chrome, G.mid, G.short.
      const LAYS = {
        wide: { dw: 1060, smax: 1.22, min: 0.82, ext: [[100.8, -44.3, 500.8, 55.7], [127.2, -25.4, 543.5, 5.9], [64.4, -26.7, 553.3, 21.9], [112.8, -21.9, 586.1, 9], [59.2, -29.1, 578.1, 25.5], [43.7, -58.9, 465.9, 105.3], [109.7, -53.9, 458.8, 114.5]] },
        mid: { dw: 620, smax: 1.15, min: 0.9, ext: [[85.2, -44.8, 374.5, 37.7], [39.1, -27, 254.2, 77.5], [24.5, -21.8, 393, 17.6], [14.4, -21, 354.5, 49.1], [26.3, -28.4, 292.3, 127.4], (w, h) => (h < 700 ? [150, -140, 298.9, 82.4] : [150, -152, 298.9, 106.4]), [68.6, -52.4, 290.2, 113.3]] },
        tall: { dw: 358, smax: 1.35, min: 1, ext: [[-30.3, -2, 529.7, 2], [-0.3, -2, 547.1, 2], [0, -2, 534.8, 2], [-0.1, -2, 505.8, 2], [9.6, -2, 406.6, 2], [3.4, -2, 486.4, 2], [48.9, -2, 424.4, 2]] },
        phone: { dw: 358, smax: 1, min: 0.94, ext: [[-0.3, -2, 529.7, 2], [0.2, -2, 560.2, 2], [-0.1, -2, 534.8, 2], [0.3, -2, 507.3, 2], [5.1, -2, 417.1, 2], [1.5, -2, 518.5, 2], [36.4, -2, 448.4, 2]] },
        short: { dw: 358, smax: 1, min: 0.9, ext: [[-2.4, 0.2, 343.7, 108.1], [-2.4, 0.1, 439.1, 9.1], [-3, 0.6, 379.1, 3.7], [10.2, -12.2, 357.9, 11.2], [10.7, -9.1, 212.4, 118.2], [15.4, -15, 263.8, 103.8], [0, 6, 367.5, 82.2]] },
      };
      // the tall (portrait tablet) steps whose art is short may grow a little more (the width still caps them)
      LAYS.tall.smaxS = [1.35, 1.35, 1.35, 1.35, 1.5, 1.5, 1.5];
      // (short phones, sound locked: the landing step with its compact planner box, 50 px instead of 104; see view0)
      LAYS.short.ext0c = [-2.4, 0.2, 343.7, 55];
      const SLIDER_OF = [-1, -1, 0, 1, 1, 2, -1]; // the step's control under the stepper: alpha · H · rung
      const extOf = (D, i, w, h) => (typeof D.ext[i] === 'function' ? D.ext[i](w, h) : D.ext[i]);
      // short mid windows (< 700 px tall): the Capacity step's formula block sits closer to the chart and the
      // axis-direction row gives way (view5)
      const tight5 = () => G && G.mid && G.h < 700;
      // Sound is locked until the visitor's first gesture, and until then core's resting invite ("Click or press any
      // key for sound…", two lines on a phone) sits just above the phone controls, i.e. over the bottom of the art.
      // While it can show, phones keep that band free where the room allows; the first gesture gives it back (the art
      // glides into it).
      let gestured = false;
      const locked = () => !gestured && !(A && A.ready);
      ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, () => {
        if (gestured) return;
        gestured = true;
        setTimeout(() => { if (G) relayout(true); }, 150);
      }, { capture: true, passive: true }));
      const INVITE = 'Click or press any key for sound · 1–5 to explore';
      // core's phone hint: 11 px mono (.02em), 14 px lines, 3 px padding, a 13 px dot, at most 100vw − 32 px wide
      const inviteH = w => 6 + 14 * Math.max(1, Math.ceil((tw(INVITE, F11) + INVITE.length * 0.22 + 13 + 14) / (w - 32)));
      let slotH = 67; // the slider's height (the slot is display:none on phone steps without a slider)
      function sliderH() {
        try { const v = slot.offsetHeight; if (v > 20) slotH = v; } catch (e) { /* (controls not built yet) */ }
        return slotH;
      }
      // Phones: the chrome stacks up from the index row (core): the caption (capLines × 14 px) from 58 px, the controls
      // from max(104, caption top + 16), the hint 10 px above the controls. A step with a slider ends its art 14 px
      // above the slider's label; a step without one has no controls row, so its art runs down to 12 px above the
      // caption. reserve: the invite's height, kept free (+ 8 px) above the controls while sound is locked.
      function phoneBottoms(h, capLines, reserve) {
        const ctrl = Math.max(104, 58 + 14 * capLines + 16), sh = sliderH();
        let slider = h - ctrl - sh - 14, free = h - 58 - 14 * capLines - 12;
        if (reserve) { slider = Math.min(slider, h - ctrl - sh - 10 - reserve - 8); free = Math.min(free, h - ctrl - 10 - reserve - 8); }
        return { slider, free };
      }
      // (cp0: short phones while sound is locked, where no composition keeps the invite's band clear on every step:
      // the landing step alone keeps it clear, with a compact planner box — its title row and one stats line)
      const extAt = (D, i, w, h, cp0) => (cp0 && i === 0 && D.ext0c ? D.ext0c : extOf(D, i, w, h));
      function fitLayout(lay, capLines, reserve, M, w, h, noSl, cp0) {
        const D = LAYS[lay], ph = lay === 'phone' || lay === 'short';
        const col = w < 1100 ? 260 : 300; // clear of the left control column (stepper + slider)
        const ax0 = lay === 'wide' ? 300 : ph ? 16 : col, ax1 = lay === 'wide' ? w - 56 : ph ? w - 16 : w - 40;
        // (desktop: the caption, bottom-left, reaches x ≈ 298, so where the art starts at x = 260 it ends above it)
        const ay1 = lay === 'wide' ? h - 92 : lay === 'mid' ? (col < 300 ? h - 108 : h - 96) : h - 108;
        const PB = ph ? phoneBottoms(h, capLines, cp0 ? 0 : reserve) : null, PB0 = cp0 ? phoneBottoms(h, capLines, reserve) : PB;
        const subs = [], tops = [], bots = [], fit = [], caps = [];
        for (let i = 0; i < 7; i++) {
          caps[i] = Math.min(D.smaxS ? D.smaxS[i] : D.smax, (ax1 - ax0) / D.dw);
          // (cp0 also lends the steps with a slider the invite's band: until the first gesture their slider row is
          // hidden, the invite sits right above the caption, and the art keeps clear of it — with more room, not less)
          const pb = cp0 && (i === 0 || SLIDER_OF[i] >= 0) ? PB0 : PB;
          bots[i] = ph ? (SLIDER_OF[i] < 0 || noSl || cp0 ? pb.free : pb.slider) : ay1;
          // the art spans [tu·s + tp, bu·s + bp] px from the origin: design units plus fixed-size labels
          const e = extAt(D, i, w, h, cp0);
          const fitAt = top => Math.min(caps[i], (bots[i] - top - (e[3] - e[1])) / (e[2] - e[0]));
          // (the art starts 20 px under its headline; on a phone where 20 px would take the art under its floor, 14)
          const gp = t => (ph && fitAt(t + 20) < D.min ? 14 : 20);
          const tS = M.top + M.full[i], tM = M.top + M.short[i], tT = M.top + M.title[i];
          // each step keeps its sub where its own art still holds the composition's floor scale; desktops fall back
          // to the one-line sub before the title stands alone
          subs[i] = fitAt(tS + gp(tS)) >= D.min ? 2 : !ph && fitAt(tM + 20) >= D.min ? 1 : 0;
          const tb = subs[i] === 2 ? tS : subs[i] ? tM : tT;
          tops[i] = tb + gp(tb);
          fit[i] = fitAt(tops[i]);
        }
        // each step takes the largest scale its band allows, within 15% of the tightest step (so a step change is
        // a gentle glide, never a jump in size). A window too small for any composition never takes it below its floor
        // (phones: 85% of it) — the labels are fixed-size and would pile up — the art runs past its band instead.
        const sMin = Math.min(...fit), ok = sMin >= D.min - 1e-6;
        const floor = ok ? 0.5 : ph ? D.min * 0.85 : D.min;
        const sS = fit.map((f, i) => clamp(Math.min(f, Math.max(sMin, floor) * 1.15), floor, Math.max(floor, caps[i])));
        // each step's art starts a short gap under its headline (desktop: + at most 26 px of its spare room; phones:
        // + 30% of it), and the rest of the room falls below the art, so stepping keeps that gap nearly constant
        const oyS = sS.map((s, i) => {
          const e = extAt(D, i, w, h, cp0), room = Math.max(0, bots[i] - tops[i] - ((e[2] - e[0]) * s + e[3] - e[1]));
          return tops[i] - (e[0] * s + e[1]) + (ph ? room * 0.3 : Math.min(room * 0.5, 26));
        });
        const oxS = sS.map(s => (ph ? ax0 + (ax1 - ax0 - D.dw * s) / 2 : ax0));
        // (where each step's art ends: phones keep their own hints off it)
        const artB = sS.map((s, i) => { const e = extAt(D, i, w, h, cp0); return oyS[i] + e[2] * s + e[3]; });
        const nSub = subs.reduce((n, v) => n + (v === 2 ? 1 : v ? 0.5 : 0), 0);
        return { lay, capLines, reserve, cp0: !!cp0, noSl: !!noSl, subs, nSub, sS, oxS, oyS, tops, bots, artB, sMin, rel: sMin / D.min, ok };
      }
      let G = null;
      let cpk = null; // the landing step's compact planner (short phones while sound is locked), 0..1, eased to G.cp0
      function relayout(glide, hlAnim) {
        const w = cv.w, h = cv.h, phone = w <= 800;
        if (hlPhone !== phone) {
          hlPhone = phone; api.headlineTop(phone ? PH_TOP : null);
          setTitleProbes(); for (const k in hlAdj) delete hlAdj[k];
        }
        const M = measureHL(phone);
        // [composition, caption lines, reserved invite band]. Phones: the full 3-line caption where it fits, else a
        // one-line caption (the controls row starts at 104 px either way, so one line costs the art nothing).
        const R = phone && locked() ? inviteH(w) : 0;
        const cands = phone
          ? (R ? [['phone', 3, R], ['short', 3, R], ['short', 1, R], ['short', 3, R, 0, 1], ['short', 1, R, 0, 1]] : []).concat([['phone', 3, 0], ['short', 3, 0], ['short', 1, 0]])
          : h > w * 1.1 ? [['tall', 3, 0]] : [['wide', 3, 0], ['mid', 3, 0]];
        const fits = cands.map(c => fitLayout(c[0], c[1], c[2], M, w, h, c[3], c[4]));
        // (a phone too short for every composition, e.g. 375×553 with Safari's bars: its sliders give their row to the
        // art — the canvas stays interactive — then its caption too, so text never sits on text; what still does not
        // fit runs past the band at 85% of the floor)
        // (only where even the best layout falls well under its floor: 375×667 keeps its sliders)
        if (phone && !fits.some(x => x.rel >= 0.9)) fits.push(fitLayout('short', 1, 0, M, w, h, true), fitLayout('short', 0, 0, M, w, h, true));
        // the first candidate (at or above its floor) that keeps the most subs — on desktops the wide composition may
        // give up one sub rather than fall back to the smaller mid picture — else (a window too small for all of
        // them) the one closest to its floor
        // (phones, while sound is locked: keeping the invite's band clear comes first — the first tap re-fits, and the
        // subs that needed that band come back; where nothing fits, one that keeps it clear at least on the landing
        // step, and is as close to its floor as the best, wins)
        const okR = fits.filter(x => x.ok && x.reserve), oks = okR.length ? okR : fits.filter(x => x.ok);
        const most = oks.length ? Math.max(...oks.map(x => x.nSub)) : 0;
        const bestRel = Math.max(...fits.map(x => x.rel));
        const f = oks.find(x => x.nSub >= most - (phone ? 0 : 1)) || fits.find(x => x.reserve && x.rel >= bestRel - 0.005) || fits.find(x => x.rel >= bestRel - 1e-9);
        const lay = f.lay === 'short' ? 'phone' : f.lay;
        const prev = G;
        G = {
          w, h, lay, s: f.sS[S.step], short: f.lay === 'short', mobile: lay === 'phone' || lay === 'tall', phone: lay === 'phone', mid: lay === 'mid',
          // (every desktop composition starts on the content-left line, just right of the control column)
          ox: f.oxS[S.step], oy: f.oyS[S.step], sS: f.sS, oxS: f.oxS, oyS: f.oyS, tops: f.tops, bots: f.bots, artB: f.artB,
          subs: f.subs, capLines: f.capLines, reserve: f.reserve, cp0: f.cp0, noSlider: f.noSl, glide: null,
          // (a landscape phone, where no composition fits: the room under the headline asks for portrait instead)
          rotate: !f.ok && w > h * 1.15 && (phone || (h < 500 && coarse())),
        };
        if (prev) {
          const i = S.step, moved = Math.abs(prev.sS[i] - G.sS[i]) > 0.002 || Math.abs(prev.oyS[i] - G.oyS[i]) > 0.5 || Math.abs(prev.oxS[i] - G.oxS[i]) > 0.5;
          // (the art glides into its new room when the room changed under it: sound unlocked, the headline changed;
          // only while the scene is showing — a relayout of a hidden scene just takes its new place)
          if (glide && moved && prev.w === w && prev.h === h && !reduced && api.isActive()) G.glide = { s: prev.s, ox: prev.ox, oy: prev.oy, t0: rt };
          else if (!moved && prev.glide) G.glide = prev.glide;
          G.s = prev.s; G.ox = prev.ox; G.oy = prev.oy;
        }
        // (a sub that comes or goes with the window is swapped in place: the headline does not replay its entrance;
        // the capacity step's open / closed-loop toggle does replay it)
        if (hlShown) syncHeadline(false, !!hlAnim);
        if (!prev || prev.capLines !== f.capLines || prev.h !== h || prev.lay !== G.lay) showCaption();
        // the H slider's label is shortened where the control column is narrow (x < 250 below 1100 px)
        try { sliders.H.set(S.H); showSlider(S.step); } catch (e) { /* (not built yet) */ }
      }
      // Bottom-left caption: the source and how to interact (the headline carries the point). Tight phones: one line.
      // (the capacity step's caption follows the open / closed-loop toggle; short mid windows give the Predictor step's
      // rollout read-outs the caption's upper lines)
      function showCaption() {
        const i = S.step, cl = i === 5 && S.loopClosed;
        api.caption(G && G.capLines === 0 ? ''
          : G && (G.capLines === 1 || (i === 3 && G.mid && G.h < 660)) ? CAPS1[i]
            : coarse() && CAPS_T[i] ? (cl ? CAPS_TC : CAPS_T[i]) : cl ? CAPS_C : CAPS[i]);
      }
      const X = u => G.ox + u * G.s, Y = v => G.oy + v * G.s, Z = d => d * G.s;
      api.onResize(() => relayout());
      // The headline's height changes with its text, the window and the web fonts: re-fit the art under it. The layout
      // predicts every headline from its hidden copy; if the shell's real headline ever ends elsewhere (a future
      // markup or style change), its real bottom wins for that step and variant, with one warning.
      let hlWarned = false;
      api.onHeadline(() => {
        if (!G) return;
        const b = api.headlineBottom();
        const m = /^lpwm(\d)([smt])p?c?$/.exec(hlShown);
        if (b > 0 && m && api.isActive()) {
          const i = +m[1], v = m[2], M = measureHL(G.phone);
          const d = b - (M.top + (v === 's' ? M.full[i] : v === 'm' ? M.short[i] : M.title[i]));
          if (Math.abs(d) > 2) {
            hlAdj[i + v] = (hlAdj[i + v] || 0) + d;
            if (!hlWarned) { hlWarned = true; console.warn('[lpwm] headline measured ' + Math.round(d) + ' px off its prediction (step ' + (i + 1) + '): using the real bottom'); }
          }
        }
        relayout(true);
      });
      try { if (document.fonts) { document.fonts.ready.then(() => relayout(true)); document.fonts.addEventListener('loadingdone', () => relayout(true)); } } catch (e) { /* */ }
      // (core re-stacks the phone chrome after a scene change or a resize)
      window.addEventListener('yd:layout', () => { if (api.isActive()) relayout(); });

      // environment rects (design units) per step
      function envRect(step) {
        const m = G.mobile, md = G.mid, sh = G.short;
        switch (step) {
          case 0: return m ? (sh ? [104, 0, 150] : [79, 0, 200]) : md ? [0, 84, 196] : [0, 100, 300];
          case 1: return m ? (sh ? [0, 0, 100] : [0, 0, 112]) : md ? [0, 60, 112] : [0, 212, 168];
          case 2: return m ? [0, 0, 84] : md ? [0, 24, 96] : [0, 225, 150];
          case 3: return m ? (sh ? [0, 0, 112] : [0, 0, 128]) : md ? [0, 44, 124] : [0, 190, 200];
          case 4: return m ? (sh ? [8, 26, 160] : [0, 26, 171]) : md ? [40, 26, 220] : [160, 58, 330];
          default: return null;
        }
      }
      function envDense() { return G.mobile ? (G.short ? [190, 26, 160] : [187, 26, 171]) : G.mid ? [360, 26, 220] : [570, 58, 330]; }
      const R = r => ({ x: X(r[0]), y: Y(r[1]), s: Z(r[2]) });

      /* ---------------------------------------------------------------- drawing primitives */
      const P = v => Math.round(v) + 0.5;
      function ln(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      function lnP(x1, y1, x2, y2, p) { if (p <= 0) return; ln(x1, y1, lerp(x1, x2, Math.min(1, p)), lerp(y1, y2, Math.min(1, p))); }
      function polyP(pts, p) {
        if (p <= 0 || pts.length < 4) return;
        let total = 0; const segs = [];
        for (let i = 2; i < pts.length; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); segs.push(d); total += d; }
        let left = total * Math.min(1, p);
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 0; i < segs.length; i++) {
          const d = segs[i], x0 = pts[2 * i], y0 = pts[2 * i + 1], x1 = pts[2 * i + 2], y1 = pts[2 * i + 3];
          if (left >= d) { ctx.lineTo(x1, y1); left -= d; }
          else { const f = d ? left / d : 0; ctx.lineTo(lerp(x0, x1, f), lerp(y0, y1, f)); break; }
        }
        ctx.stroke();
        return pointAt(pts, p);
      }
      function pointAt(pts, p) {
        let total = 0; const segs = [];
        for (let i = 2; i < pts.length; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); segs.push(d); total += d; }
        let left = total * clamp(p, 0, 1);
        for (let i = 0; i < segs.length; i++) {
          const d = segs[i];
          if (left <= d) { const f = d ? left / d : 0; return [lerp(pts[2 * i], pts[2 * i + 2], f), lerp(pts[2 * i + 1], pts[2 * i + 3], f)]; }
          left -= d;
        }
        return [pts[pts.length - 2], pts[pts.length - 1]];
      }
      function rectP(x, y, w, h, p) { polyP([x, y, x + w, y, x + w, y + h, x, y + h, x, y], p); }
      function plus(x, y, r) { ln(x - r, y, x + r, y); ln(x, y - r, x, y + r); }
      function head(x, y, ang, s) {
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang + 2.6) * s, y + Math.sin(ang + 2.6) * s);
        ctx.lineTo(x, y);
        ctx.lineTo(x + Math.cos(ang - 2.6) * s, y + Math.sin(ang - 2.6) * s);
        ctx.stroke();
      }
      function dash(on) { ctx.setLineDash(on ? (Array.isArray(on) ? on : [2, 3]) : []); }
      function circ(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) ctx.fill(); else ctx.stroke(); }

      // Tiny markup for labels: a_{t} = subscript, ^{…} = superscript. Parsed once and cached.
      const runCache = new Map();
      function runs(str) {
        let r = runCache.get(str);
        if (r) return r;
        r = [];
        let i = 0, buf = '';
        while (i < str.length) {
          const ch = str[i];
          if ((ch === '_' || ch === '^') && str[i + 1] === '{') {
            if (buf) { r.push({ t: buf, m: 0 }); buf = ''; }
            const j = str.indexOf('}', i + 2);
            r.push({ t: str.slice(i + 2, j < 0 ? str.length : j), m: ch === '_' ? 1 : 2 });
            i = j < 0 ? str.length : j + 1;
          } else { buf += ch; i++; }
        }
        if (buf) r.push({ t: buf, m: 0 });
        r.len = r.reduce((a, x) => a + x.t.length, 0);
        if (runCache.size > 400) runCache.clear();
        runCache.set(str, r);
        return r;
      }
      const wCache = new Map();
      function tw(s, font) {
        const k = font + '|' + ('letterSpacing' in ctx ? ctx.letterSpacing : '') + '|' + s;
        let w = wCache.get(k);
        if (w == null) { ctx.font = font; w = ctx.measureText(s).width; if (wCache.size > 1200) wCache.clear(); wCache.set(k, w); }
        return w;
      }
      function textW(str, font = F12) {
        const rs = runs(str); const sf = subFont(font);
        let w = 0; for (const r of rs) w += tw(r.t, r.m ? sf : font);
        return w;
      }
      function subFont() { return F11; }
      // Text never inherits a leaked canvas alpha: T sets its own (o.a, else the alpha of the view being
      // drawn, txtA) and restores the previous one. Typing labels share ONE thin accent caret per frame:
      // the most recently started label (smallest progress) gets it.
      let txtA = 1, caret = null;
      // T(str, x, y, {color, align, font, p (typing 0..1), cursor, a (alpha), halo (white knockout)})
      function T(str, x, y, o) {
        o = o || {};
        const font = o.font || F12, sf = subFont(font);
        const rs = runs(str);
        let n = o.p == null ? Infinity : Math.floor(rs.len * clamp(o.p, 0, 1));
        if (n <= 0) return;
        const al = o.a != null ? o.a : txtA;
        if (al <= 0.004) return;
        let w = 0; for (const r of rs) w += tw(r.t, r.m ? sf : font);
        let x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
        // (left-aligned labels slide left rather than run past the right gutter)
        if (!o.align && G) { const bound = cv.w - (G.phone ? 16 : 40); if (x0 + w > bound) x0 = Math.max(G.phone ? 16 : 40, bound - w); }
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = al;
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const typing = n < rs.len;
        for (let pass = o.halo ? 0 : 1; pass < 2; pass++) {
          let cx = x0, left = n;
          if (pass === 0) { ctx.strokeStyle = C.bg; ctx.lineWidth = 3; ctx.lineJoin = 'round'; }
          else ctx.fillStyle = o.color || INK;
          for (const r of rs) {
            if (left <= 0) break;
            const s = r.t.length > left ? r.t.slice(0, left) : r.t;
            left -= s.length;
            const f = r.m ? sf : font;
            ctx.font = f;
            const yy = y + (r.m === 1 ? 2.5 : r.m === 2 ? -4 : 0);
            if (pass === 0) ctx.strokeText(s, cx, yy); else ctx.fillText(s, cx, yy);
            cx += tw(s, f);
            if (pass === 1 && typing && left <= 0 && o.cursor !== false && (!caret || o.p < caret.p)) caret = { x: cx + 1, y, p: o.p, a: al };
          }
          if (pass === 0) { ctx.lineWidth = 1; ctx.lineJoin = 'miter'; }
        }
        ctx.globalAlpha = ga;
      }
      function drawCaret() {
        if (caret) { ctx.globalAlpha = caret.a; ctx.fillStyle = ACC; ctx.fillRect(Math.round(caret.x), Math.round(caret.y) - 10, 1, 12); }
        caret = null;
      }
      // eyebrows / panel kickers (the site's shared header style): UPPERCASE, 12 px mono, tracking .06em, #555
      const LS = 'letterSpacing' in ctx, EYE = '#555';
      function caps(str, x, y, o) {
        if (LS) ctx.letterSpacing = '0.72px';
        T(str, x, y, Object.assign({ color: EYE, font: F12 }, o));
        if (LS) ctx.letterSpacing = '0px';
      }
      // Place a short live label near an anchor so it avoids obstacles (path samples, goal, agent) and
      // stays inside its panel. cands: [[dx, dy (baseline), 'left'|'right'], …] in order of preference;
      // obs: [[x, y, radius, weight], …]; box: {x0, y0, x1, y1}. Returns [left x, baseline y].
      // key (optional): remembers the last choice and favours it, so a label does not flicker between spots.
      const placeMem = new Map();
      function placeLabel(str, font, ax, ay, cands, obs, box, key, wOverride) {
        const w = wOverride || textW(str, font);
        let best = null, bs = Infinity, bi = 0;
        const prev = key ? placeMem.get(key) : -1;
        for (let ci = 0; ci < cands.length; ci++) {
          const c = cands[ci];
          const x0 = clamp(c[2] === 'right' ? ax + c[0] - w : ax + c[0], box.x0 + 5, box.x1 - 5 - w);
          const y = clamp(ay + c[1], box.y0 + 15, box.y1 - 6);
          const bx0 = x0 - 3, bx1 = x0 + w + 3, by0 = y - 12, by1 = y + 4;
          let s = ci * 0.3 - (ci === prev ? 1.2 : 0);
          for (const p of obs) {
            const r = p[2] || 0;
            if (p[0] >= bx0 - r && p[0] <= bx1 + r && p[1] >= by0 - r && p[1] <= by1 + r) s += p[3] || 1;
          }
          if (s < bs) { bs = s; best = [x0, y]; bi = ci; }
        }
        if (key) placeMem.set(key, bi);
        return best;
      }
      // sample a polyline every ~5 px into obstacle points
      function sampleLine(pts, out, wgt) {
        for (let i = 2; i < pts.length; i += 2) {
          const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1];
          const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
          for (let k = 0; k <= n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n), 1, wgt || 1]);
        }
        return out;
      }

      /* ---------------------------------------------------------------- flow particles */
      const PARTS = [];
      for (let i = 0; i < 70; i++) PARTS.push({ x: Math.random(), y: Math.random(), life: Math.random() * 4, max: 3 + Math.random() * 3 });
      function updParts(dt) {
        for (const p of PARTS) {
          const b = BV[zoneOf(p.x, p.y)];
          p.x += b[0] * dt * 4.2; p.y += b[1] * dt * 4.2; p.life += dt;
          if (p.life > p.max || p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98) { p.x = 0.04 + Math.random() * 0.92; p.y = 0.04 + Math.random() * 0.92; p.life = 0; p.max = 3 + Math.random() * 3; }
        }
      }

      /* ---------------------------------------------------------------- environment panel */
      const panels = []; // hit-test rects filled while drawing: {x, y, s, k}
      // the paper draws each zone's drift as a 3×3 grid of small triangles (Fig 5)
      function chevron(x, y, dx, dy, s) {
        const px = -dy, py = dx;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 1.1, y + dy * s * 1.1);
        ctx.lineTo(x - dx * s * 0.7 + px * s * 0.75, y - dy * s * 0.7 + py * s * 0.75);
        ctx.lineTo(x - dx * s * 0.7 - px * s * 0.75, y - dy * s * 0.7 - py * s * 0.75);
        ctx.closePath();
        ctx.fill();
      }
      function envFrame(r, a, mini, noCorners) {
        const { x, y, s } = r;
        ctx.globalAlpha = a;
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.strokeRect(P(x), P(y), Math.round(s), Math.round(s));
        if (!mini && !noCorners) {
          ctx.strokeStyle = G5;
          const o = 7, rr = 3;
          plus(P(x - o), P(y - o), rr); plus(P(x + s + o), P(y - o), rr); plus(P(x - o), P(y + s + o), rr); plus(P(x + s + o), P(y + s + o), rr);
        }
        ctx.strokeStyle = G3; dash([2, 3]);
        ln(P(x + s / 2), y + 1, P(x + s / 2), y + s - 1); ln(x + 1, P(y + s / 2), x + s - 1, P(y + s / 2));
        dash(false);
        // drift field glyphs: 2×2 zones, 3×3 chevrons each
        ctx.fillStyle = G4; ctx.lineWidth = 1;
        const cs = Math.max(1.5, s / 130);
        for (let q = 0; q < 4; q++) {
          const zx = (q & 1) * 0.5, zy = (q >> 1) * 0.5, b = BV[q], dx = Math.sign(b[0]), dy = Math.sign(b[1]);
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            if (mini && (i + j) % 2) continue;
            chevron(x + (zx + 0.1 + 0.15 * i) * s, y + (zy + 0.1 + 0.15 * j) * s, dx, dy, cs);
          }
        }
      }
      function envParticles(r, a) {
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = G4;
        for (const p of PARTS) {
          const f = Math.min(1, p.life / 0.6, (p.max - p.life) / 0.6);
          if (f <= 0) continue;
          ctx.globalAlpha = a * 0.75 * f;
          ctx.fillRect(r.x + p.x * r.s - 0.5, r.y + p.y * r.s - 0.5, 1.2, 1.2);
        }
        ctx.globalAlpha = a;
      }
      const SX = (r, x) => r.x + x * r.s, SY = (r, y) => r.y + y * r.s;
      const ringR = r => Math.max(5, R_OK * r.s);
      function drawGoal(r, a, T0, big, id, zg) {
        const gx = SX(r, goal.x), gy = SY(r, goal.y);
        ctx.globalAlpha = a;
        const hot = S.hover && S.hover.goal;
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        const arm = big ? 7 : 5;
        ln(gx - arm, P(gy), gx - 2, P(gy)); ln(gx + 2, P(gy), gx + arm, P(gy));
        ln(P(gx), gy - arm, P(gx), gy - 2); ln(P(gx), gy + 2, P(gx), gy + arm);
        dash([1.5, 2.5]); ctx.strokeStyle = hot ? ACC : G5;
        circ(gx, gy, ringR(r), false);
        dash(false);
        if (big && zg) TX('goal' + id, '$z_g$', zg[0], zg[1] - 5, { size: 14, color: SEC, a, halo: true });
      }
      // z_g's spot: one of the four diagonals just outside the goal ring (or, last, level with the goal on either
      // side of the ring), away from the agent, its trail and the plan's predicted steps, kept inside the panel.
      // A goal dragged into a corner clamps some candidates back onto the marker itself, so the crosshair and the
      // inside of the ring are heavy obstacles too. Returns [left x, baseline y] (+ its obstacle box).
      const ZG_W = 17;
      function placeZg(r, ag, pos, pl, T0, id) {
        const gx = SX(r, goal.x), gy = SY(r, goal.y), rr = ringR(r), d = Math.max(rr * 0.72 + 3, 10);
        const cands = [[d, -d + 2, 'left'], [-d, -d + 2, 'right'], [d, d + 12, 'left'], [-d, d + 12, 'right'], [rr + 4, 5, 'left'], [-(rr + 4), 5, 'right']];
        const obs = [[SX(r, pos[0]), SY(r, pos[1]), 8, 10], [gx, gy, 5, 20]];
        // (the ring, sampled just inside its stroke: the diagonal and level spots outside it are never hit)
        for (let k = 0; k < 24; k++) obs.push([gx + Math.cos(k * TAU / 24) * (rr - 3), gy + Math.sin(k * TAU / 24) * (rr - 3), 0, 4]);
        const tr = []; for (const p of ag.trail) if (p.t <= T0) tr.push(SX(r, p.x), SY(r, p.y));
        if (tr.length >= 4) sampleLine(tr, obs, 1);
        const pf = pl && pl.fin ? pl : finPlan(ag, T0);
        if (pf && pf.fin) {
          const im = pf.fin.imag;
          for (let h = 1; h <= pf.H; h++) obs.push([SX(r, im[2 * h]), SY(r, im[2 * h + 1]), 4, 3]);
        }
        const box = { x0: r.x, y0: r.y, x1: r.x + r.s, y1: r.y + r.s };
        return placeLabel('', F14, gx, gy, cands, obs, box, 'zg' + id, ZG_W);
      }
      function drawAgent(r, ag, pos, a, T0) {
        const x = SX(r, pos[0]), y = SY(r, pos[1]);
        ctx.globalAlpha = a;
        const col = ag.kind ? INK : ACC;
        // action pulses: small expanding rings on each executed step
        if (!reduced) for (const tp of ag.pulses) {
          const u = (T0 - tp) / 0.32;
          if (u < 0 || u > 1) continue;
          ctx.globalAlpha = a * (1 - u) * 0.6; ctx.strokeStyle = col; ctx.lineWidth = 1;
          circ(x, y, 4 + u * 9, false);
        }
        ctx.globalAlpha = a; ctx.fillStyle = col;
        circ(x, y, ag.kind ? 3.6 : 4, true);
        if (S.hover && S.hover.agent === ag.kind) { ctx.strokeStyle = col; circ(x, y, 8, false); }
        if (ag.drag) { ctx.strokeStyle = col; dash([2, 2]); circ(x, y, 11, false); dash(false); }
      }
      // full live environment. opts: {k (agent kind), plan, cem, other, trail, alpha, label}
      function drawEnv(rect, o) {
        const a = o.alpha;
        if (a <= 0.004) return;
        const r = rect, ag = AG[o.k], T0 = simT();
        const mini = r.s < 110;
        txtA = a;
        envFrame(r, a, mini, o.corners === false || G.mobile);
        envParticles(r, a);
        // zone flashes (support switch)
        if (!reduced) for (const f of ag.flashes) {
          const u = (T0 - f.t) / 0.7;
          if (u < 0 || u > 1) continue;
          ctx.globalAlpha = a * (1 - u) * (ag.kind ? 0.35 : 0.8);
          ctx.strokeStyle = ag.kind ? G5 : ACC; ctx.lineWidth = 1;
          ctx.strokeRect(P(r.x + (f.z & 1) * r.s / 2) + 1, P(r.y + (f.z >> 1) * r.s / 2) + 1, r.s / 2 - 2, r.s / 2 - 2);
        }
        ctx.globalAlpha = a;
        const pl = curPlan(ag, T0);
        const pos = agentPos(ag, T0);
        // trail + replan marks
        if (o.trail !== false && ag.trail.length) {
          ctx.strokeStyle = G5; ctx.lineWidth = 1;
          ctx.beginPath();
          let started = false;
          for (const p of ag.trail) { if (p.t > T0) break; const x = SX(r, p.x), y = SY(r, p.y); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
          if (started) { ctx.lineTo(SX(r, pos[0]), SY(r, pos[1])); ctx.stroke(); }
          ctx.strokeStyle = INK;
          for (const m of ag.marks) {
            if (m.t > T0) continue;
            const x = SX(r, m.x), y = SY(r, m.y);
            ctx.globalAlpha = a * 0.8;
            ctx.strokeRect(P(x - 2.5), P(y - 2.5), 5, 5);
          }
          ctx.globalAlpha = a;
        }
        const box = { x0: r.x, y0: r.y, x1: r.x + r.s, y1: r.y + r.s };
        const gx = SX(r, goal.x), gy = SY(r, goal.y), gR = ringR(r) + 4;
        // z_g is placed first; every other live label then treats it (and the goal ring) as an obstacle
        const zg = !mini ? placeZg(r, ag, pos, pl, T0, o.k) : null;
        const goalObs = [[gx, gy, gR, 8]];
        // (text on text is worse than text on a line: the z_g label weighs more than a whole trail)
        if (zg) goalObs.push([zg[0] + ZG_W / 2, zg[1] - 5, 10, 40]);
        if (pl && o.plan !== false) {
          // Predictor step: until the new plan's paths are revealed, the previous comparison stays up (faded)
          if (o.other) {
            const pv = pl.fin ? prevFinOf(ag, pl) : finPlan(ag, T0);
            const rv = planReveal(pl, T0);
            if (pv && pv !== pl && rv < 1) drawPlan(r, ag, pv, T0, a * 0.5 * (1 - rv), Object.assign({}, o, { cem: false, ghost: true }), goalObs);
          }
          drawPlan(r, ag, pl, T0, a, o, goalObs);
        }
        drawGoal(r, a, T0, !mini, o.k, zg);
        drawAgent(r, ag, pos, a, T0);
        // live CEM read-out next to a planning agent (overview only: Plan (MPC) prints it in its stats row).
        // It sits on the side of the agent facing AWAY from the goal, clear of the trail, with a white knockout.
        if (pl && !mini && r.s >= 200 && o.cem !== false && S.step === 0 && ag.status === 'run' && (!pl.fin || T0 - pl.t < pl.planLen * STEP)) {
          const ax = SX(r, pos[0]), ay = SY(r, pos[1]);
          const sx = gx >= ax ? -1 : 1, sy = gy >= ay ? -1 : 1; // away from the goal first
          const cands = [[sx * 18, sy < 0 ? -16 : 26], [-sx * 18, sy < 0 ? -16 : 26], [sx * 18, sy < 0 ? 26 : -16], [-sx * 18, sy < 0 ? 26 : -16]]
            .map(c => [c[0], c[1], c[0] < 0 ? 'right' : 'left']);
          const obs = goalObs.slice();
          const tr = []; for (const p of ag.trail) if (p.t <= T0) tr.push(SX(r, p.x), SY(r, p.y));
          if (tr.length >= 4) sampleLine(tr, obs, 1);
          obs.push([ax, ay, 7, 8]);
          const lbl = 'CEM ' + String(pl.st.it).padStart(2, '0') + '/30';
          const [lx, ly] = placeLabel(lbl, F12, ax, ay, cands, obs, box, 'cem' + o.k);
          const lw = textW(lbl, F12), cxL = lx + lw / 2 < ax ? lx + lw + 2 : lx - 2, cyL = ly < ay ? ly + 2 : ly - 10;
          const dx = cxL - ax, dy = cyL - ay, dl = Math.hypot(dx, dy) || 1;
          ctx.globalAlpha = a; ctx.strokeStyle = G5; dash([1, 2]);
          if (dl > 12) ln(ax + (dx / dl) * 6, ay + (dy / dl) * 6, cxL - (dx / dl) * 2, cyL - (dy / dl) * 2);
          dash(false);
          T(lbl, lx, ly, { font: F12, color: ag.kind ? INK : ACC, halo: true });
        }
        // end-of-episode badges (hidden while the goal is being dragged: they would label a spot never reached)
        if (ag.status !== 'run' && T0 >= ag.endT && !(drag && drag.type === 'goal')) {
          const u = clamp((T0 - ag.endT) / 0.9, 0, 1);
          if (ag.status === 'reached' && !reduced) {
            ctx.strokeStyle = ag.kind ? INK : ACC; ctx.lineWidth = 1;
            for (let i = 0; i < 2; i++) { const uu = clamp(u * 1.4 - i * 0.3, 0, 1); if (uu <= 0 || uu >= 1) continue; ctx.globalAlpha = a * (1 - uu); dash([2, 3]); circ(gx, gy, 6 + uu * 26, false); dash(false); }
          }
          if (!mini && r.s > 240) {
            ctx.globalAlpha = a;
            const txt = ag.status === 'reached' ? 'reached · ' + ag.replans + ' plan' + (ag.replans > 1 ? 's' : '') : 'missed · 10 replans';
            // measured + clamped inside the panel, clear of the goal ring, the z_g label, the agent and the trail
            const obs = goalObs.slice();
            obs.push([SX(r, pos[0]), SY(r, pos[1]), 7, 8]);
            const tr = []; for (const p of ag.trail) if (p.t <= T0) tr.push(SX(r, p.x), SY(r, p.y));
            if (tr.length >= 4) sampleLine(tr, obs, 1);
            const dx = gR * 0.6 + 4;
            const [lx, ly] = placeLabel(txt, F12, gx, gy, [[dx, gR + 14, 'left'], [-dx, gR + 14, 'right'], [dx, -gR - 6, 'left'], [-dx, -gR - 6, 'right']], obs, box, 'rb' + o.k);
            T(txt, lx, ly, { font: F12, color: ag.status === 'reached' ? (ag.kind ? INK : ACC) : G6, p: reduced ? 1 : u * 2.2, halo: true });
          }
        }
        ctx.globalAlpha = 1;
        if (o.hit) panels.push({ x: r.x, y: r.y, s: r.s, k: o.k });
      }
      // how far a plan's chosen path has been revealed (0 while CEM runs, → 1 over the end of the plan phase)
      function planReveal(pl, T0) {
        if (!pl || !pl.fin) return 0;
        const since = T0 - pl.t, pdur = pl.planLen * STEP;
        return since < pdur && !reduced ? clamp((since - pdur * 0.72) / (pdur * 0.28), 0, 1) : 1;
      }
      function drawPlan(r, ag, pl, T0, a, o, goalObs) {
        const st = pl.st, H = pl.H, fin = pl.fin;
        const since = T0 - pl.t, pdur = pl.planLen * STEP;
        const planning = !o.ghost && (!fin || since < pdur);
        // CEM samples (reduced motion: only the chosen plan, no fans). Long horizons draw fewer, fainter
        // samples (300 × 20 steps would turn into a grey hairball).
        if (o.cem !== false && !reduced) {
          let ca;
          if (planning) ca = 1;
          else { const ex = since - pdur; ca = clamp(1 - ex / (STEP * 3.5), 0, 1); }
          if (ca > 0.01 && st.it > 0) {
            const pos = st.pos, jit = pl.why && since < 0.18 ? 2.5 : 0;
            const hk = Math.min(1, 5 / H);
            const n = Math.round((r.s < 200 ? 120 : 300) * (0.25 + 0.75 * hk)), stride = CEM_N / n;
            ctx.lineWidth = r.s < 200 ? 0.6 : 0.7;
            ctx.strokeStyle = G5; ctx.globalAlpha = a * ca * (r.s < 200 ? 0.16 : 0.12) * (0.65 + 0.35 * hk);
            ctx.beginPath();
            for (let c = 0; c < n; c++) {
              const i = Math.floor(c * stride);
              let pi = i * (H + 1) * 2;
              const jx = jit ? (Math.random() - 0.5) * jit * 2 : 0;
              ctx.moveTo(SX(r, pos[pi]) + jx, SY(r, pos[pi + 1]));
              for (let h = 1; h <= H; h++) { pi += 2; ctx.lineTo(SX(r, pos[pi]) + jx, SY(r, pos[pi + 1])); }
            }
            ctx.stroke();
            // elites
            ctx.strokeStyle = ag.kind ? G6 : ACC; ctx.globalAlpha = a * ca * (ag.kind ? 0.22 : 0.16); ctx.lineWidth = 0.7;
            ctx.beginPath();
            for (let e = 0; e < CEM_E; e++) {
              const i = st.idx[e];
              let pi = i * (H + 1) * 2;
              ctx.moveTo(SX(r, pos[pi]), SY(r, pos[pi + 1]));
              for (let h = 1; h <= H; h++) { pi += 2; ctx.lineTo(SX(r, pos[pi]), SY(r, pos[pi + 1])); }
            }
            ctx.stroke();
            // endpoints of samples as tiny dots (the "data")
            if (r.s >= 200 && planning) {
              ctx.fillStyle = G6; ctx.globalAlpha = a * ca * 0.5;
              for (let c = 0; c < n; c += 3) { const i = Math.floor(c * stride), pi = (i * (H + 1) + H) * 2; ctx.fillRect(SX(r, pos[pi]) - 0.5, SY(r, pos[pi + 1]) - 0.5, 1, 1); }
            }
            ctx.lineWidth = 1;
          }
        }
        if (!fin) return;
        const reveal = o.ghost ? 1 : planReveal(pl, T0);
        if (reveal <= 0) return;
        const col = ag.kind ? INK : ACC;
        const im = fin.imag, tr = fin.tru;
        const toS = arr => { const out = new Array(arr.length); for (let i = 0; i < arr.length; i += 2) { out[i] = SX(r, arr[i]); out[i + 1] = SY(r, arr[i + 1]); } return out; };
        const imS = toS(im), trS = toS(tr);
        // true outcome of the plan (dotted ink)
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = INK; ctx.lineWidth = 1; dash([1, 3]);
        polyP(trS, reveal); dash(false);
        // the other model's imagined rollout of the same actions (step 3 comparison)
        if (o.other) {
          const ot = toS(fin.other);
          ctx.strokeStyle = G5; ctx.globalAlpha = a * 0.9;
          for (let h = 1; h <= H; h++) {
            if (h / H > reveal) break;
            circ(ot[2 * h], ot[2 * h + 1], 2.4, false);
          }
          ctx.globalAlpha = a * 0.55; dash([2, 2]); polyP(ot, reveal); dash(false);
          const end = 2 * H;
          if (reveal >= 1 && r.s > 150) {
            ctx.globalAlpha = a; ctx.strokeStyle = G5; dash([1, 2]); ln(ot[end], ot[end + 1], trS[end], trS[end + 1]); dash(false);
          }
        }
        // chosen plan in imagination: the line + hollow circles at each predicted step
        ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.25;
        polyP(imS, reveal);
        ctx.lineWidth = 1;
        for (let h = 1; h <= H; h++) {
          if (h / H > reveal) break;
          ctx.fillStyle = C.bg; circ(imS[2 * h], imS[2 * h + 1], 2.6, true);
          ctx.strokeStyle = col; circ(imS[2 * h], imS[2 * h + 1], 2.6, false);
        }
        // drift callout at the horizon (imagined vs true)
        if (reveal >= 1 && r.s > 150 && o.drift !== false && !o.ghost && ag.status === 'run') {
          const e = 2 * H, dx = trS[e] - imS[e], dy = trS[e + 1] - imS[e + 1];
          if (Math.hypot(dx, dy) > 3) {
            ctx.strokeStyle = col; dash([1, 2]); ln(imS[e], imS[e + 1], trS[e], trS[e + 1]); dash(false);
            // (Plan (MPC) prints drift in its stats row, so the in-panel label is only shown in the overview.)
            // Placed off both paths, the goal ring and z_g, with a white knockout.
            if (S.step === 0) {
              const lbl = 'drift ' + fin.drift.toFixed(2);
              const pa = agentPos(ag, T0);
              const obs = (goalObs || []).concat([[SX(r, pa[0]), SY(r, pa[1]), 7, 8]]);
              sampleLine(imS, obs, 2); sampleLine(trS, obs, 1);
              // first choice: ahead in x but on the far side in y of the last imagined segment (the path
              // arrives from behind, so this quadrant is usually empty); the obstacle score decides the rest
              const ddx = imS[e] - imS[e - 2], ddy = imS[e + 1] - imS[e - 1];
              const hx = ddx >= 0 ? 1 : -1, ahY = ddy >= 0 ? 20 : -10, bhY = ddy >= 0 ? -10 : 20;
              const cands = [[hx * 10, bhY], [-hx * 10, ahY], [hx * 10, ahY], [-hx * 10, bhY], [0, 32], [0, -22]]
                .map(c => [c[0], c[1], c[0] < 0 ? 'right' : 'left']);
              const [lx, ly] = placeLabel(lbl, F12, trS[e], trS[e + 1], cands, obs, { x0: r.x, y0: r.y, x1: r.x + r.s, y1: r.y + r.s }, 'dr' + ag.kind);
              T(lbl, lx, ly, { font: F12, color: ag.kind ? INK : ACC, halo: true });
            }
          }
        }
      }

      /* ---------------------------------------------------------------- latent cells */
      // orientation 'v': cells stacked down from (x, y); 'h': cells left→right from (x, y).
      function cellPos(i, o) {
        const blk = o.blocks && i < 12 ? Math.floor(i / 3) * o.bgap : o.blocks ? 4 * o.bgap : 0;
        const d = i * o.pitch + blk;
        return o.orient === 'h' ? [o.x + d, o.y] : [o.x, o.y + d];
      }
      function codeLen(o) { return 24 * o.pitch - (o.pitch - o.cs) + (o.blocks ? 4 * o.bgap : 0); }
      // vals: Float32Array(24); mode 0 = sparse (accent where > 0), 1 = dense (grey magnitude), 2 = σ-blend (sign-coded)
      function drawCode(vals, o, a, reveal = 1, flashNeg = 0) {
        const cs = o.cs, cw = o.cw || cs;
        const W = o.orient === 'h' ? cs : cw, Hh = o.orient === 'h' ? cw : cs; // cell box (cw = across the flow)
        ctx.lineWidth = 1;
        for (let i = 0; i < 24; i++) {
          const [x, y] = cellPos(i, o);
          const on = i / 24 < reveal;
          const v = vals[i];
          ctx.globalAlpha = a;
          if (on && o.mode === 1) {
            ctx.fillStyle = G6; ctx.globalAlpha = a * (0.18 + 0.62 * Math.min(1, Math.abs(v) / 1.1));
            ctx.fillRect(x, y, W, Hh);
            ctx.globalAlpha = a * 0.55; ctx.strokeStyle = G6; ctx.strokeRect(P(x), P(y), W - 1, Hh - 1);
          } else if (on && v > 0.001) {
            ctx.fillStyle = ACC; ctx.globalAlpha = a * (0.28 + 0.72 * Math.min(1, v / 1.05));
            ctx.fillRect(x, y, W, Hh);
          } else if (on && v < -0.001 && o.mode === 2) {
            ctx.fillStyle = G6; ctx.globalAlpha = a * (0.15 + 0.6 * Math.min(1, -v / 1.1));
            ctx.fillRect(x, y, W, Hh);
          } else {
            ctx.strokeStyle = on ? G4 : G3; ctx.globalAlpha = a * (on ? 1 : 0.6);
            ctx.strokeRect(P(x), P(y), W - 1, Hh - 1);
            if (on && flashNeg > 0 && o.pre && o.pre[i] < 0) { ctx.fillStyle = G4; ctx.globalAlpha = a * flashNeg; ctx.fillRect(x, y, W, Hh); }
          }
          if (o.hot === i) { ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.strokeRect(P(x - 2), P(y - 2), W + 3, Hh + 3); }
        }
        ctx.globalAlpha = a;
      }
      const activeN = v => { let n = 0; for (let i = 0; i < 24; i++) if (v[i] > 0) n++; return n; };
      // A code column being re-written: cells below `rev` already hold the NEW code, the rest keep the OLD one
      // (the column never goes blank); the cell just written gets a brief accent frame. With no old code the
      // unwritten cells are empty outlines. Returns the 24 values on screen (so read-outs stay in sync).
      function drawCodeWrite(nv, ov, o, a, rev, flashNeg, pre) {
        const k = rev >= 1 ? 24 : Math.floor(clamp(rev, 0, 1) * 24);
        const mix = new Float32Array(24), mp = pre ? new Float32Array(24) : null;
        for (let i = 0; i < 24; i++) { mix[i] = i < k || !ov ? nv[i] : ov[i]; if (mp) mp[i] = i < k ? pre[i] : 0; }
        drawCode(mix, Object.assign({}, o, { pre: mp }), a, ov ? 1 : k / 24, flashNeg);
        if (k > 0 && k < 24 && !reduced) {
          const [x, y] = cellPos(k - 1, o), cs = o.cs, cw = o.cw || cs;
          const W = o.orient === 'h' ? cs : cw, Hh = o.orient === 'h' ? cw : cs;
          ctx.globalAlpha = a; ctx.strokeStyle = ACC; ctx.lineWidth = 1;
          ctx.strokeRect(P(x - 2), P(y - 2), Math.round(W + 3), Math.round(Hh + 3));
        }
        if (!ov && k < 24) for (let i = k; i < 24; i++) mix[i] = 0;
        return mix;
      }

      /* ---------------------------------------------------------------- network glyphs */
      // Generic flow orientation: f = along the flow, c = across. 'h' → f is x; 'v' → f is y.
      function fc(orient, f, c) { return orient === 'h' ? [f, c] : [c, f]; }
      function layerBars(orient, f0, pitch, n, c0, c1, bw, sweep, a, hotCol) {
        for (let i = 0; i < n; i++) {
          const f = f0 + i * pitch;
          const [x, y] = fc(orient, f, c0), [x2, y2] = fc(orient, f + bw, c1);
          const passed = sweep > i + 1 ? 1 : sweep > i ? sweep - i : 0;
          if (passed > 0) { ctx.globalAlpha = a * 0.9; ctx.fillStyle = G2; ctx.fillRect(x, y, x2 - x, y2 - y); }
          ctx.globalAlpha = a; ctx.strokeStyle = sweep > i && sweep < i + 1 ? hotCol || ACC : INK; ctx.lineWidth = 1;
          ctx.strokeRect(P(x), P(y), Math.round(x2 - x), Math.round(y2 - y));
        }
      }
      // ---- 3-layer MLP projector (4 node columns) with a layer-by-layer forward pass.
      // o = { orient, f0 (first column, along the flow), fp (column pitch), cm (centre, across), np (node pitch),
      //       r (node radius), cols: [n0, n1, n2, n3] }
      // w = pass position in layers: column l lights at w = l; signal pulses travel l → l+1 while l < w < l+1.
      //     w < 0 → idle (outlines). seed changes the activation pattern per pass. The last column shows
      //     pre-activations: positive (accent) or negative (grey), which the ReLU that follows sets to exactly 0.
      const hash01 = (a, b, c) => { const h = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return h - Math.floor(h); };
      function mlpAct(seed, l, i, L) {
        const v = hash01(seed, l, i);
        if (l === L - 1) return v < 0.46 ? -(0.25 + 0.6 * v) : 0.25 + 0.75 * v;
        return v < 0.22 ? 0.06 : 0.2 + 0.8 * v;
      }
      // The last layer's signs come from the real code (`pre`): as many of its n nodes are negative as the
      // fraction of z the ReLU zeroes, using actual pre-activation values, in a seed-shuffled order.
      function lastFrom(pre, n, seed) {
        if (!pre) return null;
        const negs = [], poss = [];
        for (let i = 0; i < 24; i++) (pre[i] <= 0 ? negs : poss).push(pre[i]);
        const g = clamp(Math.round((n * negs.length) / 24), 0, n);
        const out = [];
        for (let j = 0; j < n; j++) {
          if (j < g) out.push(-clamp(-negs[Math.floor((j * negs.length) / Math.max(1, g))], 0.25, 0.85));
          else out.push(poss.length ? clamp(poss[Math.floor(((j - g) * poss.length) / Math.max(1, n - g))], 0.25, 1) : 0.5);
        }
        for (let j = n - 1; j > 0; j--) { const k = Math.floor(hash01(seed, j, 5) * (j + 1)); const t = out[j]; out[j] = out[k]; out[k] = t; }
        return out;
      }
      // Colour discipline: hidden layers are ink (grey by activation), their signal ink hairlines; accent is
      // reserved for the positive units of the last layer (what survives the ReLU into the sparse code).
      function mlpNet(o, a, w, seed, last) {
        const L = o.cols.length;
        const pos = (l, i) => fc(o.orient, o.f0 + l * o.fp, o.cm + (i - (o.cols[l] - 1) / 2) * o.np);
        const act = (l, i) => (l === L - 1 && last && last.length === o.cols[l] ? last[i] : mlpAct(seed, l, i, L));
        // base wiring: one batched path
        ctx.globalAlpha = a * 0.85; ctx.strokeStyle = G3; ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let l = 0; l < L - 1; l++) for (let i = 0; i < o.cols[l]; i++) {
          const [x1, y1] = pos(l, i);
          for (let j = 0; j < o.cols[l + 1]; j++) { const [x2, y2] = pos(l + 1, j); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        }
        ctx.stroke();
        // signal: edges carrying the pass light up, with pulses travelling along them
        for (let l = 0; l < L - 1; l++) {
          const live = w > l && w < l + 1 ? w - l : -1, done = w >= l + 1;
          if (live < 0 && !done) continue;
          for (let i = 0; i < o.cols[l]; i++) {
            const ai = act(l, i);
            if (ai < 0.3) continue;
            const [x1, y1] = pos(l, i);
            for (let j = 0; j < o.cols[l + 1]; j++) {
              const s = ai * hash01(seed + 3, l * 11 + i, j);
              if (s < 0.34) continue;
              const [x2, y2] = pos(l + 1, j);
              ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
              if (live >= 0) {
                ctx.globalAlpha = a * (0.06 + 0.26 * s) * (1 - 0.5 * live);
                ln(x1, y1, x2, y2);
                // the signal: a short 1 px comet (fading tail) riding the edge from an active node
                const u = eout(clamp(live * 1.25 - hash01(seed, i, j) * 0.25, 0, 1));
                if (u > 0 && u < 1) {
                  const len = Math.hypot(x2 - x1, y2 - y1) || 1, du = Math.min(u, 9 / len);
                  ctx.lineWidth = 1;
                  for (let q = 0; q < 3; q++) {
                    const ua = u - du * (1 - q / 3), ub = u - du * (1 - (q + 1) / 3);
                    ctx.globalAlpha = a * (0.1 + 0.4 * s) * [0.25, 0.55, 1][q];
                    ln(lerp(x1, x2, ua), lerp(y1, y2, ua), lerp(x1, x2, ub), lerp(y1, y2, ub));
                  }
                  ctx.lineWidth = 0.8;
                }
              } else if (s > 0.5) {
                ctx.globalAlpha = a * 0.09 * s;
                ln(x1, y1, x2, y2);
              }
            }
          }
        }
        ctx.lineWidth = 1;
        // nodes
        for (let l = 0; l < L; l++) for (let i = 0; i < o.cols[l]; i++) {
          const [x, y] = pos(l, i), v = act(l, i), lit = w >= l, out = l === L - 1;
          const fresh = lit && w - l < 0.45 ? 1 - (w - l) / 0.45 : 0;
          if (fresh > 0 && v > 0) { ctx.globalAlpha = a * fresh * 0.55; ctx.strokeStyle = out ? ACC : INK; circ(x, y, o.r + 3 + 3 * (1 - fresh), false); }
          ctx.globalAlpha = a; ctx.fillStyle = C.bg; circ(x, y, o.r, true);
          if (lit && out && v > 0) { ctx.globalAlpha = a * (0.3 + 0.7 * v); ctx.fillStyle = ACC; circ(x, y, o.r, true); }
          else if (lit && out) { ctx.globalAlpha = a * 0.55; ctx.fillStyle = G4; circ(x, y, o.r, true); }
          else if (lit) { ctx.globalAlpha = a * (0.15 + 0.6 * clamp(v, 0, 1)); ctx.fillStyle = INK; circ(x, y, o.r, true); }
          ctx.globalAlpha = a; ctx.strokeStyle = lit && out ? (v > 0 ? ACC : G6) : INK; circ(x, y, o.r, false);
        }
        ctx.globalAlpha = a;
      }
      function reluBox(x, y, s, a, hot) {
        ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = hot ? ACC : INK; ctx.lineWidth = hot ? 1.5 : 1;
        ctx.strokeRect(P(x - s / 2), P(y - s / 2), Math.round(s), Math.round(s));
        ctx.beginPath(); ctx.moveTo(x - s * 0.32, y + s * 0.18); ctx.lineTo(x, y + s * 0.18); ctx.lineTo(x + s * 0.32, y - s * 0.26); ctx.stroke();
        ctx.lineWidth = 1;
      }
      // ---- ViT pieces
      // 12 visible patch tokens stand for the 256 real ones (one per 1/12 of the frame, top → bottom).
      const TOKN = 13; // CLS + 12
      const tokOf = y => 1 + Math.min(11, Math.max(0, Math.floor(y * 12)));
      // the observation as the encoder sees it: a 16×16 patch grid over the live frame, with a scan
      function patchGrid(r, a, scan) {
        const n = 16, c = r.s / n;
        ctx.globalAlpha = a; ctx.strokeStyle = G3; ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let i = 1; i < n; i++) {
          const v = Math.round(r.x + i * c) + 0.5, hy = Math.round(r.y + i * c) + 0.5;
          ctx.moveTo(v, r.y); ctx.lineTo(v, r.y + r.s); ctx.moveTo(r.x, hy); ctx.lineTo(r.x + r.s, hy);
        }
        ctx.stroke(); ctx.lineWidth = 1;
        if (scan > 0 && scan < 1) {
          const row = Math.floor(scan * n), col = Math.floor((scan * n - row) * n);
          ctx.globalAlpha = a * 0.08; ctx.fillStyle = ACC; ctx.fillRect(r.x, r.y, r.s, row * c);
          ctx.globalAlpha = a; ctx.strokeStyle = ACC; ctx.strokeRect(P(r.x), P(r.y + row * c), Math.round(r.s), Math.round(c));
          ctx.globalAlpha = a * 0.4; ctx.fillStyle = ACC; ctx.fillRect(r.x + col * c, r.y + row * c, c, c);
          ctx.globalAlpha = a;
          return [r.x + (col + 0.5) * c, r.y + (row + 0.5) * c];
        }
        ctx.globalAlpha = a;
        return null;
      }
      // a column (orient 'h') or row ('v') of tokens. o = { orient, f, c0, tp, tsz }; tokens [0, fill) are filled.
      // agentTok / goalTok: the tokens whose patches contain the agent / the goal (marked inside).
      function tokenCol(o, a, fill, agentTok, goalTok, hot) {
        for (let j = 0; j < (o.n || TOKN); j++) {
          const [x, y] = fc(o.orient, o.f, o.c0 + j * o.tp - o.tsz / 2);
          const s = o.tsz, on = j < fill;
          ctx.globalAlpha = a;
          if (j === 0) {
            if (on) { ctx.fillStyle = ACC; ctx.globalAlpha = a * (hot ? 0.85 : 0.3); ctx.fillRect(x, y, s, s); }
            ctx.globalAlpha = a; ctx.strokeStyle = ACC; ctx.strokeRect(P(x), P(y), Math.round(s) - 1, Math.round(s) - 1);
          } else {
            if (on) { ctx.fillStyle = INK; ctx.globalAlpha = a * 0.08; ctx.fillRect(x, y, s, s); }
            ctx.globalAlpha = a * (on ? 1 : 0.35); ctx.strokeStyle = INK; ctx.strokeRect(P(x), P(y), Math.round(s) - 1, Math.round(s) - 1);
            if (on && j === agentTok) { ctx.globalAlpha = a; ctx.fillStyle = ACC; circ(x + s / 2, y + s / 2, Math.max(1.6, s * 0.2), true); }
            if (on && j === goalTok) { ctx.globalAlpha = a; ctx.strokeStyle = INK; plus(x + s / 2, y + s / 2, Math.max(2, s * 0.26)); }
          }
        }
        ctx.globalAlpha = a;
      }
      // position embedding: a small sinusoid next to each token, a different frequency per position.
      // o = { orient, f (start along the flow), len, c0, tp, amp }
      function posEmb(o, a, fill) {
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = G6; ctx.lineWidth = 0.8;
        for (let j = 0; j < (o.n || TOKN); j++) {
          if (j >= fill) continue;
          const cc = o.c0 + j * o.tp;
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const u = k / 12, ff = o.f + u * o.len, cv2 = cc + Math.sin(u * TAU * (0.6 + 0.22 * j) + j * 0.7) * o.amp;
            const [x, y] = fc(o.orient, ff, cv2);
            if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1; ctx.globalAlpha = a;
      }
      // Self-attention weights for one block: 3 heads with distinct roles (schematic):
      // head 1 looks up the agent's patch, head 2 is local (neighbouring patches), head 3 looks up the goal's patch.
      const ATT = new Float32Array(3 * TOKN * TOKN), ATT2 = new Float32Array(3 * TOKN * TOKN), ATTR = new Float32Array(3 * TOKN * TOKN);
      function attnBlock(out, blk, agentTok, goalTok, n) {
        for (let h = 0; h < 3; h++) for (let q = 0; q < n; q++) {
          let sum = 0;
          const base = (h * TOKN + q) * TOKN;
          for (let k = 0; k < n; k++) {
            let s = -1.2 + 1.6 * hash01(blk * 3.1 + h, q, k);
            if (h === 0) s += (k === agentTok ? 3.4 : 0) + (k === 0 ? 1.1 : 0);
            else if (h === 1) { const dq = Math.abs(q - k) - (1 + (hash01(blk, q, 9) > 0.5 ? 1 : 0)); s += 3.4 * Math.exp(-(dq * dq) / 0.6); }
            else s += (k === goalTok ? 3.4 : 0) + (q === 0 && k === agentTok ? 1.2 : 0);
            const e = Math.exp(s * 1.25);
            out[base + k] = e; sum += e;
          }
          for (let k = 0; k < n; k++) out[base + k] /= sum;
        }
      }
      // o = { orient, fk (right edge of the key tokens), fq (left edge of the query tokens), c0, tp }
      // blk (float): the block index; weights crossfade between blocks. focus: the query to emphasise (-1 = none).
      const HEADS = [
        { col: ACC, dash: [], w: 1.15, bend: -0.16 },
        { col: INK, dash: [4, 3], w: 0.9, bend: 0 },
        { col: INK, dash: [1, 2.6], w: 1.1, bend: 0.16 },
      ];
      // prevFocus / ff: the query that had the focus before, and the crossfade (0 → 1) from it to `focus`
      function attnLines(o, a, blk, agentTok, goalTok, focus, prevFocus = -1, ff = 1) {
        const b0 = Math.floor(blk), fr = eio(blk - b0);
        const n = o.n || TOKN;
        attnBlock(ATT, b0, agentTok, goalTok, n); attnBlock(ATT2, b0 + 1, agentTok, goalTok, n);
        for (let i = 0; i < ATTR.length; i++) ATTR[i] = lerp(ATT[i], ATT2[i], fr);
        const span = o.fq - o.fk;
        for (let h = 0; h < 3; h++) {
          const st = HEADS[h];
          ctx.setLineDash(st.dash); ctx.lineWidth = st.w;
          for (let q = 0; q < n; q++) {
            // accent only for the focused query's "agent" head; the other queries are faint grey context
            const wF = focus < 0 ? 1 : q === focus ? ff : q === prevFocus ? 1 - ff : 0;
            const hiCol = focus >= 0 && h === 0 ? ACC : INK;
            for (let k = 0; k < n; k++) {
              const wgt = ATTR[(h * TOKN + q) * TOKN + k];
              if (wgt < 0.09) continue;
              const alH = wF > 0 ? a * (focus < 0 ? 0.6 : 1) * Math.min(1, wgt * 1.55) * wF : 0;
              const alF = wF < 1 ? a * Math.min(0.1, wgt * 0.22) * (1 - wF) : 0;
              if (alH < 0.02 && alF < 0.02) continue;
              const ck = o.c0 + k * o.tp, cq = o.c0 + q * o.tp, bend = st.bend * o.tp * (o.bendK || 2.2);
              const [x0, y0] = fc(o.orient, o.fk, ck), [x3, y3] = fc(o.orient, o.fq, cq);
              const [x1, y1] = fc(o.orient, o.fk + span * 0.42, ck + bend), [x2, y2] = fc(o.orient, o.fq - span * 0.42, cq + bend);
              ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
              if (alF >= 0.02) { ctx.globalAlpha = alF; ctx.strokeStyle = G5; ctx.stroke(); }
              if (alH >= 0.02) { ctx.globalAlpha = alH; ctx.strokeStyle = hiCol; ctx.stroke(); }
            }
          }
        }
        ctx.setLineDash([]); ctx.lineWidth = 1; ctx.globalAlpha = a;
      }
      // legend swatch for a head
      function headSwatch(h, x, y, len, a) {
        const st = HEADS[h];
        ctx.globalAlpha = a; ctx.setLineDash(st.dash); ctx.strokeStyle = st.col; ctx.lineWidth = st.w + 0.2;
        ln(x, P(y), x + len, P(y)); ctx.setLineDash([]); ctx.lineWidth = 1;
      }
      // a train of the ACTIVE units of a code travelling along a path: the sparse features flowing on.
      // u: 0 → 1 (+ the train's length); gap: delay between consecutive units (in u).
      function packetTrain(vals, pts, u, a, cs, gap) {
        if (u <= 0) return;
        let k = 0;
        for (let i = 0; i < 24; i++) {
          const v = vals[i];
          if (!(v > 0.001)) continue;
          const pu = u - k * (gap || 0.035);
          k++;
          if (pu <= 0 || pu >= 1) continue;
          const [x, y] = pointAt(pts, eio(pu));
          const fade = Math.min(1, pu / 0.08, (1 - pu) / 0.12);
          ctx.globalAlpha = a * fade * (0.35 + 0.65 * Math.min(1, v / 1.05)); ctx.fillStyle = ACC;
          ctx.fillRect(x - cs / 2, y - cs / 2, cs, cs);
        }
        ctx.globalAlpha = a;
      }
      function arrow(pts, a, col, p = 1, headSize = 4) {
        ctx.globalAlpha = a; ctx.strokeStyle = col || INK; ctx.lineWidth = 1;
        const end = polyP(pts, p);
        if (p >= 0.98 && end) {
          const n = pts.length, ld = ctx.getLineDash();
          ctx.setLineDash([]); // (a dashed path still ends in a solid head)
          head(pts[n - 2], pts[n - 1], Math.atan2(pts[n - 1] - pts[n - 3], pts[n - 2] - pts[n - 4]), headSize);
          ctx.setLineDash(ld);
        }
      }

      /* ---------------------------------------------------------------- step views */
      const sAlpha = i => {
        const tr = eout((rt - S.tSwitch) / 0.6);
        if (i === S.step) return reduced ? 1 : tr;
        if (i === S.from) return reduced ? 0 : 1 - tr;
        return 0;
      };
      const age = () => (reduced ? 99 : rt - S.tSwitch);

      // Encoding-phase progress of the current (sparse) plan, 0..1 over the plan phase.
      function encProg(T0) {
        const pl = curPlan(AG[0], T0);
        if (!pl) return { e: 1, pl: null };
        if (reduced) return { e: 1, pl }; // reduced motion: every pass is shown in its final state
        return { e: clamp((T0 - pl.t) / (pl.planLen * STEP), 0, 1), pl };
      }

      /* -- step 0: the world model loop */
      // Mini encoder glyph (a ViT in miniature): patch grid → tokens → self-attention (3 heads) → CLS → MLP.
      function miniEnc(x, y, w, h, a, u, seed, agentTok, goalTok, last) {
        // u: encoder progress 0..1 (≥ 1 = done, < 0 idle)
        const cy = y + h / 2, gs = Math.min(h * 0.28, w * 0.22);
        const gx = x + w * 0.04;
        ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.strokeRect(P(gx), P(cy - gs / 2), Math.round(gs), Math.round(gs));
        ctx.strokeStyle = G4; ctx.lineWidth = 0.6;
        for (let i = 1; i < 4; i++) { ln(P(gx + (gs * i) / 4), cy - gs / 2, P(gx + (gs * i) / 4), cy + gs / 2); ln(gx, P(cy - gs / 2 + (gs * i) / 4), gx + gs, P(cy - gs / 2 + (gs * i) / 4)); }
        ctx.lineWidth = 1;
        const scan = u >= 0 && u < 0.25 ? u / 0.25 : -1;
        if (scan >= 0) { const row = Math.floor(scan * 4); ctx.globalAlpha = a; ctx.strokeStyle = ACC; ctx.strokeRect(P(gx), P(cy - gs / 2 + (row * gs) / 4), Math.round(gs), Math.round(gs / 4)); }
        const n = 5, tsz = Math.max(5, Math.min(10, h * 0.055)), tp = Math.min(h * 0.13, 22);
        const c0 = cy - ((n - 1) * tp) / 2;
        const f1 = gx + gs + w * 0.05, f2 = x + w * 0.52;
        const fill = u < 0 ? n : Math.floor(clamp(u / 0.25, 0, 1) * n + 0.001);
        tokenCol({ orient: 'h', f: f1, c0, tp, tsz, n }, a, fill, 1 + ((agentTok - 1) % 4), 1 + ((goalTok - 1) % 4), false);
        const blk = u < 0 || u >= 1 ? 11 : clamp((u - 0.25) / 0.45, 0, 1) * 11;
        // the CLS query (the one that becomes z) carries the attention; the others stay faint context
        attnLines({ orient: 'h', fk: f1 + tsz, fq: f2, c0, tp, n, bendK: 1.4 }, a * (u >= 0.25 && u < 0.7 ? 1 : 0.7), blk, 1 + ((agentTok - 1) % 4), 1 + ((goalTok - 1) % 4), 0);
        tokenCol({ orient: 'h', f: f2, c0, tp, tsz, n }, a, u < 0 || u >= 0.3 ? n : 0, -1, -1, u >= 0.66 && u < 0.8);
        // CLS → mini MLP (with room for the elbow)
        const m0 = x + w * 0.7, mp = w * 0.08, nr = Math.max(2.3, Math.min(3.4, h * 0.018));
        const ex = f2 + tsz + (m0 - f2 - tsz) * 0.45;
        ctx.globalAlpha = a; ctx.strokeStyle = G5;
        ln(f2 + tsz + 1, P(c0), ex, P(c0)); ln(P(ex), c0, P(ex), cy); ln(ex, P(cy), m0 - nr - 3, P(cy));
        mlpNet({ orient: 'h', f0: m0, fp: mp, cm: cy, np: Math.min(14, h * 0.075), r: nr, cols: [3, 4, 4, 3] }, a, u < 0 || u >= 1 ? 4 : (u - 0.66) / 0.3 * 4, seed, last);
      }
      // Mini predictor glyph: 6 AdaLN-zero blocks conditioned on a_t (scale/shift taps), then the MLP.
      function miniPred(x, y, w, h, a, u, seed, act, last) {
        const top = y + h * 0.1, bot = y + h * 0.68, cy = y + h * 0.39;
        const bp = w * 0.08, b0 = x + w * 0.08, bw = Math.max(3, w * 0.028);
        const sweep = u < 0 || u >= 1 ? 7 : clamp(u / 0.62, 0, 1) * 6;
        layerBars('h', b0, bp, 6, top, bot, bw, sweep, a);
        // a_t and its per-block scale/shift taps
        const acx = b0 + bp * 2.5 + bw / 2, acy = y + h * 0.86, ar = Math.max(6, h * 0.055);
        ctx.globalAlpha = a; ctx.strokeStyle = INK; circ(acx, acy, ar, false);
        const an = Math.atan2(act[1], act[0]), al = ar * 0.62;
        ctx.strokeStyle = ACC; ln(acx - Math.cos(an) * al, acy - Math.sin(an) * al, acx + Math.cos(an) * al, acy + Math.sin(an) * al);
        head(acx + Math.cos(an) * al, acy + Math.sin(an) * al, an, 2.5);
        const busY = bot + (acy - ar - bot) * 0.5;
        ctx.strokeStyle = G5; ln(P(acx), acy - ar, P(acx), busY); ln(b0 + bw / 2, P(busY), b0 + 5 * bp + bw / 2, P(busY));
        dash([1.5, 2]);
        for (let i = 0; i < 6; i++) {
          const hot = sweep > i && sweep < i + 1;
          ctx.strokeStyle = hot ? ACC : G5; ln(P(b0 + i * bp + bw / 2), busY, P(b0 + i * bp + bw / 2), bot + 1);
        }
        dash(false);
        const m0 = x + w * 0.64, mp = w * 0.085, nr = Math.max(2.3, Math.min(3.4, h * 0.018));
        ctx.globalAlpha = a; ctx.strokeStyle = G5; ln(b0 + 5 * bp + bw + 3, P(cy), m0 - nr - 2, P(cy));
        mlpNet({ orient: 'h', f0: m0, fp: mp, cm: cy, np: Math.min(14, h * 0.075), r: nr, cols: [3, 4, 4, 3] }, a, u < 0 || u >= 1 ? 4 : (u - 0.6) / 0.38 * 4, seed + 7, last);
      }
      function view0(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile, T0 = simT();
        const { e, pl } = encProg(T0);
        const H = pl ? pl.H : S.H;
        const d = u => ta * 1.0 - u; // draw-on helper (seconds)
        txtA = a;
        let L;
        const md = G.mid;
        if (md) {
          // mid: the environment on the left, the module row beside it, the planner under the row; the
          // loop returns along the bottom into the environment
          L = {
            enc: [232, 124, 112, 100], z: [356, 128], pred: [378, 124, 112, 100], rast: [504, 128], plan: [232, 300, 388, 104],
            cs: 3.4, pitch: 4.2, rmax: 72,
            loop: [[196, 174, 232, 174], [344, 174, 352, 174], [362, 174, 378, 174], [490, 174, 500, 174], null, [232, 352, 40, 352, 40, 280]],
            ot: [214, 160], zh: 267, act: [48, 341],
          };
        } else if (!m) {
          L = {
            enc: [370, 160, 180, 180], z: [572, 166], pred: [610, 160, 180, 180], rast: [820, 166], plan: [640, 440, 410, 104],
            cs: 5.5, pitch: 7, rmax: 104,
            // (the environment sits on the content-left line, x = 0: ENVIRONMENT aligns with the thesis above it)
            loop: [[300, 250, 370, 250], [550, 250, 568, 250], [584, 250, 610, 250], [790, 250, 814, 250], null, [640, 492, 240, 492, 240, 402]],
            ot: [335, 236], zh: 392, act: [260, 476],
          };
        } else if (G.short) {
          // short phones: a smaller environment, the planner tucked right under the module row
          L = {
            enc: [10, 204, 108, 104], z: [128, 208], pred: [150, 204, 108, 104], rast: [272, 208], plan: [10, 346, 348, 104],
            cs: 3.2, pitch: 4, rmax: 72,
            loop: [[179, 152, 179, 157, 96, 157, 96, 204], [118, 256, 124, 256], [136, 256, 150, 256], [258, 256, 268, 256], null, [10, 398, 0, 398, 0, 75, 104, 75]],
            ot: [122, 172], zh: 330,
          };
        } else {
          // (everything sits ≥ 16 px from the screen edge: the return path of the loop runs at x = 0)
          L = {
            enc: [10, 262, 108, 112], z: [128, 268], pred: [150, 262, 108, 112], rast: [272, 268], plan: [10, 426, 348, 104],
            cs: 3.2, pitch: 4.2, rmax: 72,
            // (o_t → encoder runs above both eyebrows and drops right of the encoder's title, into its box)
            loop: [[179, 202, 179, 207, 96, 207, 96, 262], [118, 318, 124, 318], [136, 318, 150, 318], [258, 318, 268, 318], null, [10, 478, 0, 478, 0, 100, 79, 100]],
            ot: [122, 221], zh: 402,
          };
        }
        const cols = Math.min(H, 20), rp = Math.min(m || md ? 4.8 : 8, L.rmax / cols);
        const rcx = L.rast[0] + (cols * rp) / 2;
        L.loop[4] = [rcx, L.rast[1] + 24 * L.pitch + 6, rcx, L.plan[1]];
        // short phones while sound is locked (G.cp0): a compact planner box — its title row and one stats line, the
        // cost formula and the sparkline dropped (the Plan step shows both) — so the landing view keeps the sound
        // invite's band clear; the first gesture grows it back (cpk glides 1 → 0)
        const k = G.short ? cpk || 0 : 0;
        if (k > 0) { const lp5 = L.loop[5]; lp5[1] = lp5[3] = lerp(lp5[1], L.plan[1] + 26, k); }
        ctx.save();
        // (the step's context line is core's headline above the art: HL[0])
        // loop connectors
        L.loop.forEach((seg, i) => { const pts = seg.map((v, j) => (j % 2 ? Y(v) : X(v))); arrow(pts, a, INK, prog(d(0.2 + i * 0.12), 0, 0.5)); });
        const lp = prog(ta, 0.6, 0.6);
        if (!m) {
          TX('v0.ot', '$o_t$', X(L.ot[0]), Y(L.ot[1]), { size: 15, align: 'center', a, p: lp });
          if (md) TX('v0.zt', '$z_t$', X(L.z[0]) + Z(L.cs) / 2, Y(L.z[1]) - 12, { size: 15, align: 'center', a, p: lp });
          else TX('v0.zt', '$z_t$', X(597), Y(234), { size: 15, align: 'center', a, p: lp });
          TX('v0.zh', '$\\hat z_{t+1:t+H}$', X(rcx) + (md ? 8 : 12), Y(L.zh), { size: 15, a, p: lp });
          // the return leg carries the action label: the longest wording that fits the leg
          const room = Z(L.loop[5][0] - L.act[0]) - 12;
          const act = ['actions $a_t$ · execute 5 steps, then replan', 'actions $a_t$ · execute 5, replan', 'actions $a_t$ · 5 steps', 'actions $a_t$'].find(s => textW(s.replace(/\$a_t\$/, 'a_t'), F12) <= room) || 'actions $a_t$';
          TX('v0.act', act, X(L.act[0]), Y(L.act[1]), { size: 12, a, p: prog(ta, 0.8, 0.8) });
        } else {
          TX('v0.ot', '$o_t$', X(L.ot[0]), Y(L.ot[1]), { size: 14, align: 'center', a, p: lp });
          TX('v0.zh', '$\\hat z$', X(rcx) + 8, Y(L.zh), { size: 14, a, p: lp });
        }
        // pulse along the loop during the plan phase
        if (pl && e < 1) {
          const segs = L.loop.map(seg => seg.map((v, j) => (j % 2 ? Y(v) : X(v))));
          const u = e * segs.length, si = Math.min(segs.length - 1, Math.floor(u));
          const pt = pointAt(segs[si], u - si);
          ctx.globalAlpha = a; ctx.fillStyle = ACC; circ(pt[0], pt[1], 3, true);
        }
        const hot = k => pl && e < 1 && Math.floor(e * 6) === k;
        const seed = pl ? Math.floor(pl.t * 7.3) % 97 : 1;
        const ap = agentPos(AG[0], T0);
        const agentTok = tokOf(ap[1]), goalTok = tokOf(goal.y);
        // encoder
        const [ex, ey, ew, eh] = L.enc;
        moduleBox(ex, ey, ew, eh, a, ta, 0.3, 'ENCODER', '$f_\\theta$ · ViT', hot(0) || hot(1), false, 'v0.enc');
        miniEnc(X(ex), Y(ey), Z(ew), Z(eh), a, pl ? (e < 1 / 3 ? e * 3 : 1) : -1, seed, agentTok, goalTok, pl ? lastFrom(pl.pre, 3, seed) : null);
        if (!m && !md) {
          T('patches → 12 blocks → CLS', X(ex), Y(ey + eh) + 18, { color: SEC, p: prog(ta, 0.8, 0.6) });
          TX('v0.encsub', '→ MLP → ReLU → sparse $z$', X(ex), Y(ey + eh) + 30, { size: 12, color: SEC, a, p: prog(ta, 0.9, 0.6) });
        }
        // z_t column (+ its count) and the sparse code flowing on into the predictor
        const zo = { orient: 'v', x: X(L.z[0]), y: Y(L.z[1]), cs: Z(L.cs), pitch: Z(L.pitch), mode: 0 };
        if (pl) {
          drawCode(pl.code, zo, a, e > 0.3 ? 1 : 0);
          // (mid: under the column, where there is room between the encoder and the predictor)
          if (e > 0.3 && !m) T(activeN(pl.code) + '/24', zo.x + zo.cs / 2, md ? zo.y + 24 * zo.pitch + 14 : zo.y - 12, { align: 'center', font: F12, color: ACC });
          if (e > 0.3 && e < 0.62) {
            const py = Y(L.enc[1] + L.enc[3] / 2);
            packetTrain(pl.code, [X(L.enc[0] + L.enc[2]) - Z(10), py, X(L.pred[0] + L.pred[2] * 0.45), py], (e - 0.3) / 0.2, a, Math.max(3, Z(m ? 3 : 4.5)), 0.05);
          }
        }
        // predictor
        const [px, py, pw, ph] = L.pred;
        const cp = curPlan(AG[0], T0);
        let act = [1, 0];
        if (cp && cp.fin) { const i = clamp(AG[0].execI - 1, 0, cp.H - 1); act = [cp.fin.mu[2 * i], cp.fin.mu[2 * i + 1]]; }
        moduleBox(px, py, pw, ph, a, ta, 0.45, 'PREDICTOR', m || md ? '$g_\\phi$ · AdaLN' : '$g_\\phi$ · AdaLN-zero transformer', hot(2) || hot(3), false, 'v0.pred');
        const plNext = finPlan(AG[0], T0);
        const preN = plNext ? preact(plNext.fin.imag[2], plNext.fin.imag[3], new Float32Array(24)) : null;
        miniPred(X(px), Y(py), Z(pw), Z(ph), a, pl ? (e < 0.42 ? 0 : e < 0.7 ? (e - 0.42) / 0.28 : 1) : -1, seed, act, lastFrom(preN, 3, seed + 7));
        if (!m && !md) TX('v0.predsub', '$a_t$ → scale & shift', X(px), Y(py + ph) + 18, { size: 12, color: SEC, a, p: prog(ta, 0.9, 0.6) });
        // rollout raster
        const plF = finPlan(AG[0], T0);
        if (plF) {
          const tmp = new Float32Array(24);
          // a finished plan writes its rollout over the previous one, column by column (never blank)
          const plO = prevFinOf(AG[0], plF), fc0 = Math.min(plF.H, 20);
          const rev = plF.finT != null && !reduced ? clamp((T0 - plF.finT) / (fc0 * STEP * 0.5 + 0.05), 0, 1) : 1;
          const dim = plF === pl ? 1 : 0.8;
          for (let h = 0; h < cols; h++) {
            const src = h / fc0 < rev || !plO ? plF : plO;
            if (h >= Math.min(src.H, 20)) continue;
            code(0, src.fin.imag[2 * h + 2], src.fin.imag[2 * h + 3], tmp);
            const o0 = { orient: 'v', x: X(L.rast[0]) + Z(h * rp), y: Y(L.rast[1]), cs: Z(L.cs), pitch: Z(L.pitch), mode: 0 };
            drawCode(tmp, o0, a * dim);
            if (rev < 1 && h === Math.ceil(rev * fc0) - 1) { ctx.globalAlpha = a; ctx.strokeStyle = ACC; ctx.strokeRect(P(o0.x - 2), P(o0.y - 2), Math.round(o0.cs + 3), Math.round(24 * o0.pitch - (o0.pitch - o0.cs) + 3)); }
          }
        }
        // planner box (title inside, so the ẑ arrow can drop straight in)
        const [qx, qy, qw, qh] = L.plan;
        const phot = hot(4) || hot(5);
        const bxp = prog(ta, 0.6, 0.7);
        // text is in px, so the box is sized in px too (never smaller than its four rows)
        const bw0 = Math.round(Z(qw)), bh0 = Math.round(lerp(Math.max(Z(qh), m ? 104 : 108), 50, k)), by0 = Y(qy);
        ctx.globalAlpha = a; ctx.strokeStyle = phot ? ACC : G4; dash([2, 3]);
        rectP(P(X(qx)), P(by0), bw0, bh0, bxp); dash(false);
        const st = pl && pl.st;
        const tx = X(qx) + 14, fa = a * (1 - k);
        caps('PLANNER', tx, by0 + 20, { color: phot ? ACC : SEC, p: prog(ta, 0.8, 0.5) });
        T('CEM · model-predictive control', tx + (m ? 66 : 72), by0 + 20, { font: m ? F12 : F13, p: prog(ta, 0.85, 0.7) });
        const rep = 'replan ' + String(AG[0].replans).padStart(2, '0') + '/10';
        if (k > 0) TX('v0.cmp', '300 → top 30 · ' + rep + ' · $H = ' + H + '$', tx, by0 + 36, { size: 12, color: SEC, a: a * k, p: prog(ta, 1.1, 0.8) });
        TX('v0.cost', '\\min_{a}\\;\\lVert \\hat z_H - z_g \\rVert^2', tx, by0 + (m ? 45 : 48), { size: m ? 16 : 18, math: true, a: fa, p: prog(ta, 0.9, 0.8) });
        T('300 → top 30 · iter ' + String(st ? st.it : 0).padStart(2, '0') + '/30', tx, by0 + (m ? 74 : 78), { color: SEC, a: fa, p: prog(ta, 1.1, 0.8) });
        TX('v0.rep', rep + ' · $H = ' + H + '$', tx, by0 + (m ? 89 : 93), { size: 12, color: SEC, a: fa, p: prog(ta, 1.2, 0.8) });
        // sparkline of the elite cost per CEM iteration (live)
        if (st && st.eliteCost.length > 1 && k < 0.99) {
          const sx1 = X(qx) + bw0 - 14, sx0 = sx1 - Math.min(m ? 96 : 118, bw0 * 0.3), sy0 = by0 + 34, sy1 = by0 + bh0 - 30;
          const ec = st.eliteCost.map(v => Math.log(v + 1e-4)), mx = Math.max(...ec), mn = Math.min(...ec);
          const pts = [];
          for (let i = 0; i < ec.length; i++) pts.push(lerp(sx0, sx1, i / (CEM_IT - 1)), lerp(sy1, sy0, mx > mn ? (ec[i] - mn) / (mx - mn) : 0));
          ctx.globalAlpha = fa; ctx.strokeStyle = G3; ln(sx0, P(sy1), sx1, P(sy1));
          ctx.strokeStyle = ACC; ctx.lineWidth = 1; polyP(pts, 1);
          T(m || bw0 < 400 ? 'elite cost' : 'elite cost · 30 iters', sx1, sy1 + 16, { font: F12, color: SEC, align: 'right', a: fa });
        }
        ctx.restore();
      }
      function moduleBox(u, v, w, h, a, ta, delay, cap, sub, hot, noCorners, id) {
        const x = X(u), y = Y(v), ww = Z(w), hh = Z(h);
        ctx.globalAlpha = a; ctx.strokeStyle = hot ? ACC : G4; ctx.lineWidth = 1; dash([2, 3]);
        rectP(P(x), P(y), Math.round(ww), Math.round(hh), prog(ta, delay, 0.7));
        dash(false);
        if (!noCorners) { ctx.strokeStyle = hot ? ACC : INK; plus(P(x), P(y), 3); plus(P(x + ww), P(y + hh), 3); }
        caps(cap, x, y - 30, { p: prog(ta, delay + 0.2, 0.5), color: hot ? ACC : SEC });
        TX(id, sub, x, y - 13, { size: 13, a, p: prog(ta, delay + 0.3, 0.6) });
      }

      /* -- step 1: ViT encoder */
      // Encoding timeline (fractions of the plan phase, 32 sixteenths ≈ 4.1 s):
      const ENC = { scan: [0, 0.14], attn: [0.14, 0.47], cls: [0.47, 0.53], mlp: [0.53, 0.84], relu: [0.8, 0.88], rev: [0.84, 0.94], flow: 0.94 };
      let attHover = -1, attLastFocus = -1;
      const attF = { cur: 0, prev: -1, t: -9 }; // the attention tour's focused query (+ the one it crossfades from)
      const attHit = []; // [x, y, size, token] for hover
      function attnSound(q) {
        // the three heads of the hovered query: one soft tick per head, pitched by the key it attends to most.
        // The pointer must rest on the token for a 16th first; sweeps merge into one phrase per 1/8 at most.
        hoverSound(t => {
          if (!snd.ok('hoverAttn', STEP * 2)) return;
          for (let h = 0; h < 3; h++) {
            let best = 0, bw = -1;
            for (let k = 0; k < TOKN; k++) { const v = ATTR[(h * TOKN + q) * TOKN + k]; if (v > bw) { bw = v; best = k; } }
            snd.tick(t + h * STEP * 0.5, deg(best % 7, h === 1 ? -1 : 0), { g: 0.3 + 0.3 * bw, pan: -0.4 + 0.4 * h, len: 0.04 });
          }
        }, STEP);
      }
      function view1(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile, T0 = simT();
        const { e, pl } = encProg(T0);
        const o = m ? 'v' : 'h', md = G.mid;
        txtA = a;
        // mid: the same left-to-right flow, compressed; the code z_t is a row under the MLP (fed by the ReLU
        // from above) with its counts under it, and the ReLU plot / the flow into g_φ are left to later steps
        const L = md ? {
          tok: { f: 204, c0: 60, tp: 15, tsz: 11 }, qf: 330, box: [196, 44, 158, 212], pe: { f: 186, len: 12, amp: 2.8 },
          cls: [341, 60, 362, 60, 362, 104, 374, 104],
          mlp: { f0: 386, fp: 28, cm: 104, np: 11, r: 4 }, relu: [504, 104, 22],
          z: { orient: 'h', x: 384, y: 200, cs: 8, pitch: 9.3, blocks: true, bgap: 3 },
        } : G.short ? {
          // short phones: a smaller frame, a flatter attention block, the counts folded into the z_t label
          tok: { f: 150, c0: 17, tp: 26, tsz: 11 }, qf: 212, box: [2, 134, 354, 94], pe: { f: 136, len: 12, amp: 3 },
          cls: [17, 224, 17, 372, 36, 372],
          mlp: { f0: 42, fp: 48, cm: 372, np: 9, r: 3.4 }, relu: [226, 372, 20],
          z: { orient: 'h', x: 10, y: 436, cs: 11, pitch: 13.4, blocks: true, bgap: 4 },
        } : !m ? {
          tok: { f: 216, c0: 188, tp: 18, tsz: 12 }, qf: 450, box: [206, 172, 266, 248], pe: { f: 180, len: 16, amp: 3.2 },
          cls: [462, 188, 486, 188, 486, 296, 502, 296],
          mlp: { f0: 512, fp: 42, cm: 296, np: 17, r: 4.5 }, relu: [676, 296, 24],
          z: { orient: 'v', x: 716, y: 126, cs: 11, pitch: 13.5, blocks: true, bgap: 4 },
        } : {
          tok: { f: 172, c0: 17, tp: 26, tsz: 11 }, qf: 262, box: [2, 146, 354, 138], pe: { f: 153, len: 13, amp: 3 },
          cls: [17, 274, 17, 424, 36, 424],
          mlp: { f0: 42, fp: 48, cm: 424, np: 11, r: 3.6 }, relu: [226, 424, 20],
          // (the z_t row sits low enough that its label line clears the MLP's bottom nodes)
          z: { orient: 'h', x: 10, y: 500, cs: 11, pitch: 13.4, blocks: true, bgap: 4 },
        };
        const XY = (f, c) => (o === 'h' ? [X(f), Y(c)] : [X(c), Y(f)]);
        const fl = v => (o === 'h' ? X(v) : Y(v)), cl = v => (o === 'h' ? Y(v) : X(v));
        const pr = (k) => (pl ? clamp((e - ENC[k][0]) / (ENC[k][1] - ENC[k][0]), 0, 1) : 1);
        const seed = pl ? Math.floor(pl.t * 7.3) % 97 : 3;
        ctx.save();
        // ---- o_t: the live frame (env layer) + 16×16 patch grid with a raster scan
        const fr = R(envRect(1));
        const scan = pl && e < ENC.scan[1] ? pr('scan') : -1;
        const patch = patchGrid(fr, a, scan);
        const ap = agentPos(AG[0], T0);
        const agentTok = tokOf(ap[1]), goalTok = tokOf(goal.y);
        const fill = scan >= 0 ? 1 + Math.floor(scan * 12) : TOKN;
        let capBox = null; // desktop: the caption block under o_t (the patch → token line never crosses it)
        if (!m) {
          TX('v1.ot', '$o_t$ · 224×224 px', fr.x, fr.y - 16, { size: 13, a, p: prog(ta, 0.2, 0.6) });
          const cl1 = '16×16 patches, 14 px', cl2 = '→ 256 tokens (12 shown)', cl3 = '+ position embeddings', cl4 = 'config: PointMaze ViT';
          T(cl1, fr.x, fr.y + fr.s + 22, { color: SEC, p: prog(ta, 0.4, 0.7) });
          T(cl2, fr.x, fr.y + fr.s + 40, { color: SEC, p: prog(ta, 0.5, 0.7) });
          T(cl3, fr.x, fr.y + fr.s + 58, { color: SEC, p: prog(ta, 0.6, 0.7) });
          // (patch size and head count are stated only for the paper's PointMaze ViT)
          T(cl4, fr.x, fr.y + fr.s + 80, { color: SEC, p: prog(ta, 0.7, 0.7) });
          capBox = [fr.x - 3, fr.y + fr.s + 8, fr.x + Math.max(textW(cl1), textW(cl2), textW(cl3), textW(cl4)) + 3, fr.y + fr.s + 84];
        } else {
          const tx0 = X(fr.s / G.s + 16);
          TX('v1.ot', '$o_t$ · 224×224 px', tx0, Y(12), { size: 13, a, p: prog(ta, 0.2, 0.6) });
          T('16×16 patches · 14 px', tx0, Y(38), { color: SEC, p: prog(ta, 0.4, 0.7) });
          T('→ 256 tokens (12 shown)', tx0, Y(56), { color: SEC, p: prog(ta, 0.5, 0.7) });
          T('+ position embeddings', tx0, Y(74), { color: SEC, p: prog(ta, 0.6, 0.7) });
          T('config: PointMaze ViT', tx0, Y(G.short ? 94 : 96), { color: SEC, p: prog(ta, 0.7, 0.7) });
        }
        // ---- the transformer block (dashed) with the input tokens, their position embeddings and the outputs
        const T1 = L.tok;
        const [bx, by, bw, bh] = L.box;
        ctx.globalAlpha = a; ctx.strokeStyle = G4; dash([2, 3]);
        rectP(P(X(bx)), P(Y(by)), Math.round(Z(bw)), Math.round(Z(bh)), prog(ta, 0.2, 0.8)); dash(false);
        ctx.strokeStyle = INK; plus(P(X(bx)), P(Y(by)), 3); plus(P(X(bx + bw)), P(Y(by + bh)), 3);
        const titleY = Y(by) - (m ? 16 : 20);
        T('transformer block · 3 heads', X(bx), titleY, { font: F13, p: prog(ta, 0.3, 0.7) });
        const tk = { orient: o, f: fl(T1.f), c0: cl(T1.c0), tp: Z(T1.tp), tsz: Z(T1.tsz) };
        posEmb({ orient: o, f: fl(L.pe.f), len: Z(L.pe.len), c0: cl(T1.c0), tp: Z(T1.tp), amp: Z(L.pe.amp) }, a, fill);
        tokenCol(tk, a, fill, agentTok, goalTok, false);
        // patch → token flight line while scanning (on phones it steps around the block's title; on desktop a patch
        // whose straight line would cross the caption under o_t leaves the frame level, right of that caption,
        // then drops to its token)
        if (patch && fill > 1) {
          const [tx, ty] = XY(L.pe.f - 2, T1.c0 + (fill - 1) * T1.tp);
          ctx.globalAlpha = a * 0.8; ctx.strokeStyle = ACC; dash([1.5, 2]);
          const yb0 = titleY - 13, yb1 = titleY + 5;
          let hitsCap = false;
          if (capBox) for (let k = 0; k <= 32 && !hitsCap; k++) {
            const qx = lerp(patch[0], tx, k / 32), qy = lerp(patch[1], ty, k / 32);
            hitsCap = qx >= capBox[0] && qx <= capBox[2] && qy >= capBox[1] && qy <= capBox[3];
          }
          if (m && patch[1] < yb0 && ty > yb1) {
            const ua = (yb0 - patch[1]) / (ty - patch[1]), ub = (yb1 - patch[1]) / (ty - patch[1]);
            ln(patch[0], patch[1], lerp(patch[0], tx, ua), yb0);
            ln(lerp(patch[0], tx, ub), yb1, tx, ty);
          } else if (hitsCap) {
            const xc = Math.max(patch[0], Math.min(tx - 2, capBox[2] + 4));
            ctx.beginPath(); ctx.moveTo(patch[0], patch[1]); ctx.lineTo(xc, patch[1]); ctx.lineTo(tx, ty); ctx.stroke();
          } else ln(patch[0], patch[1], tx, ty);
          dash(false);
          ctx.globalAlpha = a; ctx.fillStyle = ACC; circ(tx, ty, 2, true);
        }
        // attention: 3 heads, crossfading block by block. One query at a time shows where its 3 heads look
        // (steps every 1/8 note; CLS, the query that becomes z, when motion is reduced); hover a query to pick it
        let blk = 11, attA = 0.75;
        if (pl && e >= ENC.attn[0] && e < ENC.attn[1]) { blk = pr('attn') * 11.999; attA = 1; }
        else if (pl && e < ENC.attn[0]) attA = 0.25;
        // The tour dwells half a bar on each meaningful query: CLS (what becomes z) → the agent's patch → the
        // goal's patch → one background patch; lines crossfade over 180 ms. Hover picks a query instead.
        let bgTok = 1, bgS = -1;
        for (let j = 1; j < TOKN; j++) { const sc = Math.min(Math.abs(j - agentTok), Math.abs(j - goalTok)); if (sc > bgS) { bgS = sc; bgTok = j; } }
        const tour = [0, agentTok, goalTok, bgTok];
        const want = attHover >= 0 ? attHover : reduced ? 0 : tour[Math.floor(rt / (STEP * 8)) % 4];
        if (want !== attF.cur) {
          attF.prev = attF.cur; attF.cur = want; attF.t = rt;
          if (attHover < 0 && S.step === 1 && a > 0.5) { const tq = qT(1); snd.tick(tq, deg([0, 2, 4, 1][tour.indexOf(want) & 3], 0), { g: 0.18, pan: -0.3 + (0.6 * want) / TOKN, len: 0.03 }); }
        }
        const focus = attF.cur, ff = reduced ? 1 : clamp((rt - attF.t) / 0.18, 0, 1);
        attHit.length = 0;
        for (let j = 0; j < TOKN; j++) {
          // only the query (output) column is a hit target: hovering it shows what THAT query attends to
          const [qx, qy] = XY(L.qf, T1.c0 + j * T1.tp - T1.tsz / 2);
          attHit.push([qx, qy, Z(T1.tsz), j]);
        }
        if (focus >= 0 && focus !== attLastFocus) { attLastFocus = focus; if (attHover >= 0) attnSound(focus); }
        const qk = Object.assign({}, tk, { f: fl(L.qf) });
        attnLines({ orient: o, fk: fl(T1.f + T1.tsz) + 2, fq: fl(L.qf) - 2, c0: cl(T1.c0), tp: Z(T1.tp), bendK: m ? 1.2 : 2.2 }, a * attA, blk, agentTok, goalTok, focus, ff < 1 ? attF.prev : -1, ff);
        const outFill = pl && e < ENC.attn[0] + 0.01 ? 0 : TOKN;
        const clsHot = pl && e >= ENC.cls[0] && e < ENC.cls[1];
        tokenCol(qk, a, outFill, agentTok, goalTok, clsHot);
        if (outFill) {
          const s = Z(T1.tsz);
          [[focus, ff], [attF.prev, 1 - ff]].forEach(([q, w]) => {
            if (q < 0 || w <= 0.01) return;
            const [fx, fy] = XY(L.qf, T1.c0 + q * T1.tp - T1.tsz / 2);
            ctx.globalAlpha = a * w; ctx.strokeStyle = q === 0 ? ACC : INK; ctx.lineWidth = 1.25;
            ctx.strokeRect(P(fx - 3), P(fy - 3), Math.round(s + 5), Math.round(s + 5)); ctx.lineWidth = 1;
          });
          ctx.globalAlpha = a;
        }
        // block progress: 12 blocks, the current one in accent
        const nb = pl && e < ENC.attn[0] ? 0 : Math.min(12, Math.floor(blk) + 1);
        const py0 = m ? Y(by + bh) + 16 : Y(by + bh) + 20, px0 = m ? X(40) : X(bx);
        for (let i = 0; i < 12; i++) {
          const x = px0 + i * 12;
          const cur = pl && i === nb - 1 && e >= ENC.attn[0] && e < ENC.attn[1];
          if (i < nb) { ctx.globalAlpha = a; ctx.fillStyle = cur ? ACC : G3; ctx.fillRect(x, py0 - 4, 8, 8); }
          ctx.globalAlpha = a; ctx.strokeStyle = cur ? ACC : G5; ctx.strokeRect(P(x), P(py0 - 4), 7, 7);
        }
        T(nb === 0 ? (m ? 'patchify' : 'patchify · blocks next') : 'block ' + String(nb).padStart(2, '0') + ' / 12', px0 + 12 * 12 + 8, py0 + 4, { color: SEC });
        // head legend (schematic roles) + how to explore it
        const hy = py0 + (m ? 24 : 26);
        let hx = px0;
        if (!m) { T('heads', hx, hy + 4, { color: SEC }); hx += 50; }
        ['agent', 'local', 'goal'].forEach((nm, h) => {
          headSwatch(h, hx, hy, 20, a);
          T(nm, hx + 26, hy + 4, { color: h === 0 ? ACC : INK });
          hx += 26 + textW(nm, F12) + 16;
        });
        if (!m) {
          T('(schematic)', hx - 4, hy + 4, { color: SEC });
          T('hover a token in the right column to see its 3 heads', px0, hy + 26, { color: SEC, p: prog(ta, 1.6, 0.8) });
        } else T('(schematic) · tap a lower-row token', px0, hy + 22, { color: SEC });
        // ---- CLS → 3-layer MLP projector (forward pass, layer by layer) → ReLU → z_t
        const clsPts = L.cls.map((v, j) => (j % 2 ? Y(v) : X(v)));
        ctx.globalAlpha = a; ctx.strokeStyle = G5; polyP(clsPts, 1);
        const clsP = pl ? pr('cls') : 1;
        if (pl && clsP > 0 && clsP < 1) { const pt = pointAt(clsPts, eio(clsP)); ctx.fillStyle = ACC; circ(pt[0], pt[1], 3.2, true); }
        if (!m) T('CLS', X(L.cls[2]) + 4, Y(L.cls[1]) - 8, { color: ACC });
        const w = !pl ? 4 : e < ENC.mlp[0] ? -1 : e < ENC.mlp[1] ? pr('mlp') * 3.6 : 4;
        const MO = L.mlp;
        // the MLP's last layer carries the real signs of this frame's code (≈ as many negatives as z has zeros)
        mlpNet({ orient: 'h', f0: X(MO.f0), fp: Z(MO.fp), cm: Y(MO.cm), np: Z(MO.np), r: Math.max(3, Z(MO.r)), cols: [6, 8, 8, 6] }, a, w, seed, lastFrom(pl ? pl.pre : preact(ap[0], ap[1], new Float32Array(24)), 6, seed));
        const mTop = Y(MO.cm) - Z(MO.np) * 3.5 - Z(MO.r);
        // (mid: under the MLP, so the CLS label above its input stays clear)
        if (md) T('MLP · 3 layers', X(MO.f0) - Z(10), Y(MO.cm) + Z(MO.np) * 3.5 + Z(MO.r) + 18, { color: INK, p: prog(ta, 0.6, 0.6) });
        else T('MLP projector · 3 layers', X(MO.f0) - Z(10), mTop - (m ? 12 : 18), { color: INK, p: prog(ta, 0.6, 0.6) });
        const [rx, ry, rs] = L.relu;
        arrow([X(MO.f0 + 3 * MO.fp) + Z(MO.r) + 4, Y(ry), X(rx - rs / 2) - 2, Y(ry)], a, G5, 1, 3);
        const reluHot = pl && e > ENC.relu[0] && e < ENC.relu[1];
        reluBox(X(rx), Y(ry), Z(rs), a, reluHot);
        T('ReLU', X(rx), Y(ry) - Z(rs) / 2 - 9, { align: 'center', color: reluHot ? ACC : SEC });
        if (!m && !md) arrow([X(rx + rs / 2) + 2, Y(ry), X(L.z.x) - 5, Y(ry)], a, INK, 1, 3);
        else arrow([X(rx), Y(ry) + Z(rs) / 2 + 2, X(rx), Y(L.z.y) - 6], a, INK, 1, 3);
        // z_t
        const zo = Object.assign({}, L.z, { x: X(L.z.x), y: Y(L.z.y), cs: Z(L.z.cs), pitch: Z(L.z.pitch), bgap: Z(L.z.bgap), mode: 0, pre: pl ? pl.pre : null });
        const zRev = pl ? pr('rev') : 1;
        const flash = pl && e > ENC.relu[0] + 0.02 && e < ENC.rev[1] ? 1 - (e - ENC.relu[0] - 0.02) / (ENC.rev[1] - ENC.relu[0] - 0.02) : 0;
        // the previous encoding stays at full ink until the new pass overwrites it, cell by cell
        const ip = pl ? AG[0].plans.indexOf(pl) : -1;
        const prevPl = pl ? (ip > 0 ? AG[0].plans[ip - 1] : AG[0].lastFin !== pl ? AG[0].lastFin : null) : null;
        const newZ = pl ? pl.code : code(0, AG[0].x, AG[0].y, new Float32Array(24));
        const zv = drawCodeWrite(newZ, prevPl ? prevPl.code : null, Object.assign({}, zo, { pre: null }), a, !pl ? 1 : e < ENC.rev[0] ? 0 : zRev, flash * 0.9, pl ? pl.pre : null);
        ctx.globalAlpha = a;
        const zl = codeLen(zo), nAct = activeN(zv);
        if (md) {
          TX('v1.z', '$z_t$', zo.x, zo.y - 14, { size: 16, a });
          TX('v1.l0', 'active ' + nAct + '/24 · $\\lVert z\\rVert_0/D = ' + (nAct / 24).toFixed(2) + '$', zo.x, zo.y + zo.cs + 24, { size: 12, color: ACC, a, p: prog(ta, 1.3, 0.5) });
          TX('v1.toy', 'toy: 24 of $D$ · paper 28–63%', zo.x, zo.y + zo.cs + 46, { size: 12, color: SEC, a, p: prog(ta, 1.5, 0.6) });
        } else if (!m) {
          TX('v1.z', '$z_t$', zo.x + zo.cs / 2, zo.y - 18, { size: 16, align: 'center', a });
          // ReLU plot + counts
          const ax = X(790), ay = Y(160);
          TX('v1.relu', '\\mathrm{ReLU}(x) = \\max(0,\\, x)', ax, ay - 26, { size: 16, math: true, a, p: prog(ta, 1.0, 0.6) });
          ctx.globalAlpha = a; ctx.strokeStyle = G3; ln(ax, P(ay + Z(60)), ax + Z(140), P(ay + Z(60))); ln(P(ax + Z(70)), ay, P(ax + Z(70)), ay + Z(78));
          ctx.strokeStyle = G5; dash([2, 2]); ln(ax + Z(4), ay + Z(10), ax + Z(70), ay + Z(60)); dash(false);
          ctx.strokeStyle = reluHot ? ACC : INK; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ax, ay + Z(60)); ctx.lineTo(ax + Z(70), ay + Z(60)); ctx.lineTo(ax + Z(136), ay + Z(4)); ctx.stroke(); ctx.lineWidth = 1;
          T('every negative → exactly 0', ax, ay + Z(78) + 20, { color: SEC, p: prog(ta, 1.2, 0.6) });
          const sy = Y(300);
          T('active ' + String(nAct).padStart(2, ' ') + ' / 24', ax, sy, { font: F13, p: prog(ta, 1.3, 0.5) });
          T('zero   ' + String(24 - nAct).padStart(2, ' ') + ' / 24', ax, sy + 20, { font: F13, p: prog(ta, 1.4, 0.5) });
          TX('v1.l0', '\\lVert z \\rVert_0 / D = ' + (nAct / 24).toFixed(2), ax, sy + 42, { size: 16, math: true, color: ACC, a, p: prog(ta, 1.5, 0.5) });
          T('paper: 28–63% active (Table 3)', ax, sy + 72, { color: SEC, p: prog(ta, 1.7, 0.6) });
          TX('v1.toy', 'toy 24-unit view of $z$', ax, sy + 86, { size: 12, color: SEC, a, p: prog(ta, 1.8, 0.6) });
          // the sparse code flows on — into a (ghosted) predictor g_φ, whose blocks light up as it lands
          const fy = Y(496), fx0 = zo.x + zo.cs / 2, fx1 = X(924);
          const fpts = [fx0, zo.y + zl + 6, fx0, fy, fx1, fy];
          arrow(fpts, a, INK, prog(ta, 1.2, 0.8), 4);
          TX('v1.flow', 'sparse code $z_t$ flows on', X(734), fy - 16, { size: 12, a, p: prog(ta, 1.4, 0.8) });
          let gu = 0, u = -1;
          if (pl && e >= ENC.flow && !reduced) {
            u = (T0 - (pl.t + ENC.flow * pl.planLen * STEP)) / 0.8;
            packetTrain(zv, fpts, u, a, Z(7), 0.04);
            gu = clamp((u - 1) / 0.9, 0, 1);
          }
          const gw = 130, gh = 96, gx0 = 928, gy0 = 496 - gh * 0.39;
          const gp = prog(ta, 1.3, 0.8);
          const ga = a * gp * (u >= 1 ? 1 : 0.45);
          if (ga > 0.004) {
            let act = [1, 0];
            const cp = finPlan(AG[0], T0);
            if (cp) act = [cp.fin.mu[0], cp.fin.mu[1]];
            miniPred(X(gx0), Y(gy0), Z(gw), Z(gh), ga, u >= 1 ? Math.max(0.02, gu) : 0, seed + 3, act, lastFrom(zv, 3, seed + 3));
            TX('v1.gphi', 'predictor $g_\\phi$', X(gx0), Y(gy0) - 12, { size: 13, a: a * gp });
          }
        } else if (G.short) {
          TX('v1.z', '$z_t$', zo.x, zo.y - 16, { size: 14, a });
          TX('v1.toy', nAct + '/24 active · 24 of $D$', zo.x + 30, zo.y - 16, { size: 12, color: ACC, a });
        } else {
          TX('v1.z', '$z_t$', zo.x, zo.y - 16, { size: 14, a });
          TX('v1.toy', '24 of $D$ shown', zo.x + 30, zo.y - 16, { size: 12, color: SEC, a });
          const sy = zo.y + zo.cs + 26;
          TX('v1.l0', 'active ' + nAct + '/24 · $\\lVert z\\rVert_0/D = ' + (nAct / 24).toFixed(2) + '$', zo.x, sy, { size: 12, color: ACC, a });
          T('zeros are exact · paper: 28–63% active', zo.x, sy + 22, { color: SEC });
        }
        ctx.restore();
      }

      /* -- step 2: sparse code */
      const zoneGlyph = ['→', '↓', '←', '↑'];
      let hotCell = -1;
      const view2cells = [];
      function view2(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile, T0 = simT();
        txtA = a;
        const pos = agentPos(AG[0], T0);
        const pre = preact(pos[0], pos[1], new Float32Array(24));
        const al = S.alpha;
        const vals = new Float32Array(24);
        for (let i = 0; i < 24; i++) vals[i] = Math.max(pre[i], al * pre[i]);
        const md = G.mid;
        // (short phones: up to 12 design units of air around the lemma line, from the room left under the step's art)
        const ex2 = G.short && G.artB ? Math.min(12, (Math.max(0, G.bots[2] - G.artB[2]) * 0.35) / G.s) : 0;
        // (mid: the code is a row across the top, beside o_t; the lemma below it on the left, the two target
        // distributions on the right)
        const zo = md
          ? { orient: 'h', x: X(128), y: Y(52), cs: Z(11.5), pitch: Z(13.4), blocks: true, bgap: Z(4), mode: 2, hot: hotCell }
          : !m
            ? { orient: 'v', x: X(262), y: Y(64), cs: Z(15), pitch: Z(18.4), blocks: true, bgap: Z(7), mode: 2, hot: hotCell }
            : { orient: 'h', x: X(8), y: Y(G.short ? 104 : 128), cs: Z(11.4), pitch: Z(13.4), blocks: true, bgap: Z(4), mode: 2, hot: hotCell };
        view2cells.length = 0;
        ctx.save();
        const rev = prog(ta, 0.1, 0.8);
        drawCode(vals, zo, a, rev);
        for (let i = 0; i < 24; i++) { const [x, y] = cellPos(i, zo); view2cells.push([x, y, zo.cs, i]); }
        // zone blocks: direction glyph per block (the zone's drift), active one in accent
        const q = zoneOf(pos[0], pos[1]);
        for (let k = 0; k < 4; k++) {
          const [x0, y0] = cellPos(3 * k, zo), [x1, y1] = cellPos(3 * k + 2, zo);
          ctx.globalAlpha = a;
          if (zo.orient === 'v') T(zoneGlyph[k], x0 - 16, (y0 + y1 + zo.cs) / 2 + 4, { color: k === q ? ACC : G5, font: F13 });
          else T(zoneGlyph[k], (x0 + x1 + zo.cs) / 2 - 4, y0 - 7, { color: k === q ? ACC : G5, font: F13 });
        }
        const [bx, by] = cellPos(0, zo), [ex, ey] = cellPos(11, zo), [hx, hy] = cellPos(12, zo), [kx, ky] = cellPos(23, zo);
        ctx.strokeStyle = G5; ctx.globalAlpha = a;
        const lemP = prog(ta, 0.5, 0.8);
        // while the output link is (mostly) the identity, the picture says so beside the code: it now shows the dense
        // comparison, not the sparse code of the headline (it takes the place of the hover hint on smaller layouts)
        const denseA = a * clamp((al - 0.35) / 0.3, 0, 1), hintA = a - denseA;
        const denseTag = G.phone ? 'now: dense code (LeWM)' : 'now: dense code (LeWM), for comparison';
        if (zo.orient === 'v') {
          const bxr = bx + zo.cs + 10;
          ln(P(bxr), by, P(bxr), ey + zo.cs); ln(bxr - 4, P(by), bxr, P(by)); ln(bxr - 4, P(ey + zo.cs), bxr, P(ey + zo.cs));
          ln(P(bxr), hy, P(bxr), ky + zo.cs); ln(bxr - 4, P(hy), bxr, P(hy)); ln(bxr - 4, P(ky + zo.cs), bxr, P(ky + zo.cs));
          TX('v2.z', '$z_t$', zo.x + zo.cs / 2, zo.y - 20, { size: 16, align: 'center', a });
          if (denseA > 0.01) T(denseTag, X(304), zo.y - 15, { font: F13, a: denseA });
          // Lemma 4.1 card, beside the zone blocks
          const lx = X(304), ly = Y(92);
          caps('LEMMA 4.1 · MODE-FACTORED SPARSE CODE', lx, ly, { p: lemP });
          T('one active block names the mode;', lx, ly + 26, { font: F14, p: prog(ta, 0.6, 0.8) });
          T('its values pin down the position.', lx, ly + 46, { font: F14, p: prog(ta, 0.7, 0.8) });
          TX('v2.lem', 'E(x) = J_q\\,\\lambda_q(x), \\quad \\lVert E(x) \\rVert_0 \\le r + 1', lx, ly + 82, { size: 18, math: true, a, p: prog(ta, 0.8, 0.8) });
          TX('v2.lam', '$\\lambda_q$ = barycentric weights of $x$ in zone $q$', lx, ly + 116, { size: 13, color: SEC, a, p: prog(ta, 0.9, 0.8) });
          T('toy code: 4 zones × 3 units', lx, ly + 136, { color: SEC, p: prog(ta, 1.0, 0.8) });
          const dyc = (hy + ky + zo.cs) / 2;
          T('12 distributed units', lx, dyc - 8, { font: F13, p: prog(ta, 1.0, 0.6) });
          T('ReLU hinges of the position', lx, dyc + 12, { color: SEC, p: prog(ta, 1.1, 0.6) });
        } else {
          if (md) {
            TX('v2.z', '$z_t$', X(128), Y(22), { size: 16, a });
          } else {
            TX('v2.z', '$z_t$ of the live frame $o_t$', X(98), Y(12), { size: 13, a });
            if (hintA > 0.01) T('tap a unit to hear it', X(98), Y(34), { color: SEC, a: hintA });
            if (denseA > 0.01) T(denseTag, X(98), Y(34), { a: denseA });
            if (hotCell < 0 && !G.short) T('toy 24-unit view', X(98), Y(52) + 4, { color: SEC });
          }
          const byr = by + zo.cs + 8;
          ln(bx, P(byr), ex + zo.cs, P(byr)); ln(P(bx), byr - 4, P(bx), byr); ln(P(ex + zo.cs), byr - 4, P(ex + zo.cs), byr);
          ln(hx, P(byr), kx + zo.cs, P(byr)); ln(P(hx), byr - 4, P(hx), byr); ln(P(kx + zo.cs), byr - 4, P(kx + zo.cs), byr);
          T('zone blocks', bx, byr + 16, { color: SEC });
          T('distributed', hx, byr + 16, { color: SEC });
          if (md) {
            // the lemma card, under o_t and the code, left of the charts
            const lx = X(0), ly = Y(156);
            caps('LEMMA 4.1 · MODE-FACTORED SPARSE CODE', lx, ly, { p: lemP });
            T('one active block names the mode;', lx, ly + 26, { font: F14, p: prog(ta, 0.6, 0.8) });
            T('its values pin down the position.', lx, ly + 46, { font: F14, p: prog(ta, 0.7, 0.8) });
            TX('v2.lem', 'E(x) = J_q\\,\\lambda_q(x), \\quad \\lVert E(x) \\rVert_0 \\le r + 1', lx, ly + 82, { size: 18, math: true, a, p: prog(ta, 0.8, 0.8) });
            const lamR = X(352) - 14; // (the Gaussian's title starts here)
            const lam = ['$\\lambda_q$ = barycentric weights of $x$ in zone $q$', '$\\lambda_q$ = barycentric weights of $x$', '$\\lambda_q$ = barycentric weights'].find(v => lx + textW(v.replace(/\$[^$]*\$/g, 'xx'), F13) <= lamR) || '$\\lambda_q$ = barycentric weights';
            TX('v2.lam', lam, lx, ly + 116, { size: 13, color: SEC, a, p: prog(ta, 0.9, 0.8) });
            T('toy code: 4 zones × 3 units', lx, ly + 136, { color: SEC, p: prog(ta, 1.0, 0.8) });
          } else if (!G.short) {
            caps('LEMMA 4.1', X(0), Y(190), { p: lemP });
            T('active block = mode · values = position', X(0), Y(209), { p: prog(ta, 0.6, 0.8) });
            TX('v2.lem', 'E(x) = J_q\\,\\lambda_q(x),\\;\\; \\lVert E(x) \\rVert_0 \\le r + 1', X(0), Y(234), { size: 15, math: true, a, p: prog(ta, 0.8, 0.8) });
          } else {
            // short phones: the lemma is one line (its name, then its formula) under the code, with some of the
            // step's spare room (ex2) above and below it, so the labels, the lemma and the charts read as three groups
            caps('LEMMA 4.1', X(0), Y(160 + ex2), { p: lemP });
            TX('v2.lem', 'E(x) = J_q\\,\\lambda_q(x),\\;\\; \\lVert E(x) \\rVert_0 \\le r + 1', X(0) + 82, Y(160 + ex2) - 4, { size: 15, math: true, a, p: prog(ta, 0.8, 0.8) });
          }
        }
        // hovered unit value: a fixed read-out slot under the o_t panel (it can never cover the lemma); the
        // hovered cell itself keeps a 1 px ink ring
        if (hotCell >= 0) {
          const v = vals[hotCell];
          const exact = Math.abs(v) < 5e-4;
          // tiny leaky values keep their sign and magnitude visible (never a signed zero like "−0.00")
          const num = exact ? '0' : Math.abs(v) < 0.01 ? (v < 0 ? '-' : '') + Math.abs(v).toExponential(0).replace(/e([+-])(\d+)/, (_, s, d) => '\\times 10^{' + (s === '-' ? '-' : '') + d + '}') : v.toFixed(2);
          const src = '$z_{' + hotCell + '} = ' + num + '$' + (exact ? ' · exactly zero' : v > 0 ? ' · active' : ' · negative (dense)');
          if (md) TX('v2.hv', src, X(162), Y(22), { size: 13, color: v > 0 ? ACC : INK, a });
          else if (!m) TX('v2.hv', src, X(0), Y(406), { size: 13, color: v > 0 ? ACC : INK, a });
          else TX('v2.hv', src, X(98), Y(52), { size: 13, color: v > 0 ? ACC : INK, a });
        } else if (md) {
          if (hintA > 0.01) T('hover a unit to hear it', X(162), Y(22) + 4, { color: SEC, a: hintA, p: prog(ta, 1.2, 0.6) });
          if (denseA > 0.01) T(denseTag, X(162), Y(22) + 4, { font: F13, a: denseA });
        } else if (!m) T('hover a unit to hear it', X(0), Y(406) + 4, { color: SEC, p: prog(ta, 1.2, 0.6) });
        // distributions: Rectified Laplace (LpWM, sparse) and isotropic Gaussian (LeWM, dense)
        // (phones: a clear 24 px gap under the lemma; chart titles sit on the 16 px gutter)
        const L = md ? { x0: 352, x1: 612, sy: 256, dy: 392, hs: 96, hd: 50, l1: 40 }
          : !m ? { x0: 690, x1: 1056, sy: 262, dy: 506, hs: 150, hd: 104, l1: 50 }
            : G.short ? { x0: 22, x1: 350, sy: 250 + 2 * ex2, dy: 344 + 2 * ex2, hs: 48, hd: 36, l1: 18 } : { x0: 22, x1: 350, sy: 380, dy: 494, hs: 72, hd: 42, l1: 34 };
        // (short phones: each target's parameters sit on its title line)
        const inl = G.short;
        const tX = m ? X(0) : X(L.x0);
        const sA = a * lerp(1, 0.3, al), dA = a * lerp(0.4, 1, al);
        const sx0 = X(L.x0), sx1 = X(L.x1), sy = Y(L.sy), vx = v => lerp(sx0, sx1, v / 3);
        const drawOn = prog(ta, 0.4, 1.2);
        ctx.globalAlpha = sA; ctx.strokeStyle = INK; lnP(sx0, P(sy), sx1, P(sy), drawOn);
        for (let v = 0; v <= 3; v++) { ln(P(vx(v)), sy, P(vx(v)), sy + 4); T(String(v), vx(v), sy + 17, { align: 'center', font: F11, color: SEC, a: sA }); }
        // spike (point mass at 0)
        ctx.strokeStyle = ACC; ctx.lineWidth = 2;
        lnP(P(sx0), sy, P(sx0), sy - Z(L.hs), prog(ta, 0.6, 0.6));
        ctx.lineWidth = 1.5;
        const tail = []; for (let i = 0; i <= 60; i++) { const v = (i / 60) * 3; tail.push(vx(v), sy - Z(L.hs * 0.62) * Math.exp(-2 * v)); }
        polyP(tail, prog(ta, 0.8, 1.0));
        ctx.lineWidth = 1;
        ctx.globalAlpha = a;
        T('50% of mass exactly at 0', sx0 + 10, sy - Z(L.hs) + 10, { color: ACC, p: prog(ta, 1.0, 0.7) });
        const t1y = sy - Z(L.hs) - Z(L.l1);
        // (a title that would reach the right gutter drops the word "target")
        const fitT = (lng, sht, f) => (tX + textW(lng, f) <= cv.w - (G.phone ? 16 : 40) ? lng : sht);
        const tF = inl ? F12 : m || md ? F13 : F14;
        const t1 = inl ? 'LpWM · Rectified Laplace' : fitT('LpWM target · Rectified Laplace', 'LpWM · Rectified Laplace', tF);
        T(t1, tX, t1y, { font: inl ? F12 : m || md ? F13 : F14, p: prog(ta, 0.9, 0.9) });
        TX('v2.lap', 'p = 1,\\ \\ \\mu = 0,\\ \\ \\sigma = \\tfrac{1}{2}', inl ? tX + textW(t1, F12) + 12 : tX, inl ? t1y - 4 : t1y + (m ? 16 : md ? 18 : 20), { size: m ? 14 : 15, math: true, color: SEC, a, p: prog(ta, 1.0, 0.8) });
        // live values: zeros stacked at the spike, actives as a rug on the axis. (The stack never rises into the
        // chart title above it: where a single column would, e.g. short phones, it folds into two columns.)
        let zc = 0, nz = 0;
        for (let i = 0; i < 24; i++) if (vals[i] <= 0.001 && vals[i] >= -0.001) nz++;
        const zAvail = Z(L.hs) + Z(L.l1) - 20, zCols = nz * 5 > zAvail ? 2 : 1;
        const zp = Math.min(5, zAvail / Math.max(1, Math.ceil(nz / zCols))), zh = zp >= 4 ? 3 : 2;
        for (let i = 0; i < 24; i++) {
          const v = vals[i];
          if (v > 0.001) { ctx.fillStyle = ACC; ctx.globalAlpha = sA; ctx.fillRect(Math.round(vx(Math.min(3, v))) - 1, sy - 10, 2, 9); }
          else if (v >= -0.001) {
            ctx.fillStyle = ACC; ctx.globalAlpha = sA * 0.55;
            ctx.fillRect(sx0 - 13 - (zc % zCols) * 8, Math.round(sy - 6 - Math.floor(zc / zCols) * zp), 7, zh); zc++;
          }
        }
        ctx.globalAlpha = a;
        // (captioned under the stacked spike, on its own row below the axis ticks)
        if (zc && !m && !md) T(zc + ' zeros', sx0 - 13, sy + 34, { color: ACC });
        // dense (Gaussian)
        const dy = Y(L.dy), dx = v => lerp(sx0, sx1, (v + 3) / 6);
        ctx.globalAlpha = dA; ctx.strokeStyle = INK; lnP(sx0, P(dy), sx1, P(dy), drawOn);
        for (let v = -3; v <= 3; v++) { ln(P(dx(v)), dy, P(dx(v)), dy + 4); T(String(v).replace('-', '−'), dx(v), dy + 17, { align: 'center', font: F11, color: SEC, a: dA }); }
        const bell = []; for (let i = 0; i <= 80; i++) { const v = -3 + (i / 80) * 6; bell.push(dx(v), dy - Z(L.hd) * Math.exp(-0.5 * v * v)); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.25; dash([3, 3]); polyP(bell, prog(ta, 1.0, 1.2)); dash(false); ctx.lineWidth = 1;
        ctx.globalAlpha = a;
        const t2y = dy - Z(L.hd) - Z(L.l1);
        const t2 = inl ? 'LeWM · Gaussian' : fitT('LeWM target · isotropic Gaussian', 'LeWM · isotropic Gaussian', tF);
        T(t2, tX, t2y, { font: inl ? F12 : m || md ? F13 : F14, p: prog(ta, 1.1, 0.9) });
        // (the parenthesis shortens where it would reach the right gutter)
        const gauP = inl ? 'p = 2,\\ \\ \\sigma = 1' : 'p = 2,\\ \\ \\sigma = 1 \\quad \\text{(' + (tX + 270 > cv.w - (G.phone ? 16 : 40) ? 'all active' : 'every unit active') + ')}';
        TX('v2.gau', gauP, inl ? tX + textW(t2, F12) + 12 : tX, inl ? t2y - 4 : t2y + (m ? 16 : md ? 18 : 20), { size: m ? 14 : 15, math: true, color: SEC, a, p: prog(ta, 1.2, 0.8) });
        for (let i = 0; i < 24; i++) { const v = clamp(vals[i] / 0.5, -3, 3); ctx.fillStyle = G6; ctx.globalAlpha = dA * (Math.abs(vals[i]) > 0.001 ? 1 : 0.4); ctx.fillRect(Math.round(dx(v)) - 1, dy - 10, 2, 9); }
        // counts
        const nNZ = vals.reduce((c, v) => c + (Math.abs(v) > 0.001 ? 1 : 0), 0);
        ctx.globalAlpha = a;
        if (md) {
          T('nonzero ' + String(nNZ).padStart(2, ' ') + ' / 24 = ' + (nNZ / 24).toFixed(2), X(0), Y(332), { font: F13, color: nNZ < 24 ? ACC : INK });
          T('Table 3: LpWM 28–63% active · LeWM 100%', X(0), Y(332) + 20, { color: SEC });
        } else if (!m) {
          const cy = Y(552);
          T('nonzero ' + String(nNZ).padStart(2, ' ') + ' / 24 = ' + (nNZ / 24).toFixed(2), sx0, cy, { font: F13, color: nNZ < 24 ? ACC : INK });
          T('Table 3: LpWM 28–63% active · LeWM 100%', sx0, cy + 20, { color: SEC });
        } else {
          // (≥ 16 px above the phone's slider label, so the read-out never reads as part of the control)
          T('nonzero ' + nNZ + '/24 = ' + (nNZ / 24).toFixed(2) + ' · paper 28–63%', X(0), Y(G.short ? 380 + 2 * ex2 : 534), { color: nNZ < 24 ? ACC : INK });
        }
        ctx.restore();
      }

      /* -- step 3: predictor + rollouts */
      // Prediction timeline (fractions of the plan phase, 20 sixteenths ≈ 2.5 s)
      const PRD = { inflow: [0, 0.2], blocks: [0.2, 0.5], mlp: [0.5, 0.74], relu: [0.72, 0.8], rev: [0.76, 0.86] };
      // One AdaLN-zero transformer block of g_φ over the k = 3 latent tokens (z_{t-2}, z_{t-1}, z_t), drawn as a
      // box holding the 3 token squares and their causal self-attention arcs (each token attends to itself and
      // the earlier ones). u = the pass's position in this block (0..1 while inside, ≥ 1 after, < 0 before).
      // While the action's scale/shift lands, the tokens are visibly scaled (γ) and shifted (β).
      function predBlock(x, y0, y1, bw, lanes, ts, a, u, gam, bet) {
        const passed = u >= 1, hot = u > 0 && u < 1;
        if (passed || hot) { ctx.globalAlpha = a * (hot ? 0.55 : 0.9); ctx.fillStyle = G2; ctx.fillRect(x, y0, bw, y1 - y0); }
        ctx.globalAlpha = a; ctx.strokeStyle = hot ? ACC : INK; ctx.lineWidth = hot ? 1.25 : 1;
        ctx.strokeRect(P(x), P(y0), Math.round(bw), Math.round(y1 - y0)); ctx.lineWidth = 1;
        const k = hot ? Math.sin(Math.PI * clamp(u * 1.3, 0, 1)) : 0;
        const sc = 1 + 0.4 * k * gam, sh = 3 * k * bet;
        const tx = x + Math.max(2, bw * 0.18);
        // causal attention arcs (right of the tokens, inside the box)
        const xr = tx + ts + 1, room = x + bw - xr - 1.5;
        const ap = hot ? clamp((u - 0.1) / 0.6, 0, 1) : 1;
        for (let j = 1; j < 3; j++) for (let i = 0; i < j; i++) {
          const ya = lanes[i] + sh, yb = lanes[j] + sh, bulge = room * (j - i === 2 ? 1 : 0.62);
          const pts = [];
          for (let s = 0; s <= 10; s++) { const v = s / 10; pts.push(xr + 2 * bulge * v * (1 - v) * 2, lerp(ya, yb, v)); }
          ctx.globalAlpha = a * (hot ? 0.95 : passed ? 0.5 : 0.28);
          ctx.strokeStyle = hot && j === 2 ? ACC : INK; ctx.lineWidth = 0.9;
          polyP(pts, ap);
        }
        ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) {
          const s = ts * sc, yy = lanes[j] + sh - s / 2, xx = tx + ts / 2 - s / 2;
          ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fillRect(xx, yy, s, s);
          if (passed || hot) { ctx.globalAlpha = a * (0.2 + 0.25 * j); ctx.fillStyle = INK; ctx.fillRect(xx, yy, s, s); }
          ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.strokeRect(P(xx), P(yy), Math.round(s) - 1, Math.round(s) - 1);
        }
        ctx.globalAlpha = a;
      }
      function view3(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile, T0 = simT();
        const { e, pl } = encProg(T0);
        txtA = a;
        const pr = k => (pl ? clamp((e - PRD[k][0]) / (PRD[k][1] - PRD[k][0]), 0, 1) : 1);
        const seed = pl ? Math.floor(pl.t * 5.1) % 89 : 5;
        ctx.save();
        const tmp = new Float32Array(24);
        const plR = finPlan(AG[0], T0);
        const rrev = plR && plR.finT != null && !reduced ? clamp((T0 - plR.finT) / (Math.min(plR.H, 20) * STEP * 0.5 + 0.05), 0, 1) : 1;
        const ag = AG[0], cp = curPlan(ag, T0);
        let act = [1, 0];
        if (cp && cp.fin) { const i = clamp(ag.execI - 1, 0, cp.H - 1); act = [cp.fin.mu[2 * i], cp.fin.mu[2 * i + 1]]; }
        else if (pl && pl.st.it > 0) act = [pl.st.mu[0], pl.st.mu[1]];
        const gam = clamp(Math.hypot(act[0], act[1]), 0.3, 1), bet = clamp(act[1], -1, 1) || 0.5;
        const sweep = !pl ? 7 : e < PRD.blocks[0] ? 0 : e < PRD.blocks[1] ? pr('blocks') * 6 : 7;
        // the next latent the predictor is producing: from the current CEM mean (live), else the last plan
        let zNext = null, nx = 0, ny = 0;
        if (pl) { stepModel(0, pl.x0, pl.y0, pl.st.it ? pl.st.mu[0] : 0, pl.st.it ? pl.st.mu[1] : 0, OUT); nx = OUT[0]; ny = OUT[1]; zNext = code(0, nx, ny, new Float32Array(24)); }
        else if (plR) { nx = plR.fin.imag[2]; ny = plR.fin.imag[3]; zNext = code(0, nx, ny, new Float32Array(24)); }
        const preN = zNext ? preact(nx, ny, new Float32Array(24)) : null;
        // what the ẑ_{t+1} column showed before this pass: the last finished plan's first imagined step
        const plZ = pl && pl.fin ? prevFinOf(ag, pl) : plR;
        const zOld = plZ && plZ !== pl ? code(0, plZ.fin.imag[2], plZ.fin.imag[3], new Float32Array(24)) : null;
        const w = !pl ? 4 : e < PRD.mlp[0] ? -1 : e < PRD.mlp[1] ? pr('mlp') * 3.6 : 4;
        const reluHot = pl && e > PRD.relu[0] && e < PRD.relu[1];
        // the sparse (LpWM) and dense (LeWM) rollouts of the SAME action sequence, one column per imagined step
        // (a new rollout overwrites the previous one column by column; nothing ever fades to blank)
        const plO = plR ? prevFinOf(ag, plR) : null;
        const rasters = (rx0, ry0, cs, pitch, cpMax, span, gap, tick) => {
          const cols = Math.min(plR.H, 20), cp2 = Math.min(cpMax, span / cols), cw = Math.min(cs, cp2 - (m ? 1.5 : 2.2));
          const gw = cols * cp2 - (cp2 - cw);
          const rxs = [rx0, rx0 + Math.max(gw, span - 10) + gap];
          const wr = rrev < 1 ? Math.ceil(rrev * cols) - 1 : -1; // the column just written
          let actS = 0;
          for (let h = 0; h < cols; h++) {
            const isNew = h / cols < rrev, src = isNew ? plR : plO && h < Math.min(plO.H, 20) ? plO : null;
            const pp = src || plR, on = src ? 1 : 0.12;
            code(0, pp.fin.imag[2 * h + 2], pp.fin.imag[2 * h + 3], tmp); actS += activeN(tmp);
            drawCode(tmp, { orient: 'v', cs, cw, pitch, mode: 0, x: rxs[0] + h * cp2, y: ry0 }, a * on);
            code(1, pp.fin.other[2 * h + 2], pp.fin.other[2 * h + 3], tmp);
            drawCode(tmp, { orient: 'v', cs, cw, pitch, mode: 1, x: rxs[1] + h * cp2, y: ry0 }, a * on);
            if (h === wr && !reduced) {
              ctx.globalAlpha = a; ctx.strokeStyle = ACC;
              for (let g = 0; g < 2; g++) ctx.strokeRect(P(rxs[g] + h * cp2 - 2), P(ry0 - 2), Math.round(cw + 3), Math.round(24 * pitch - (pitch - cs) + 3));
            }
            if (tick && (h === 0 || h === cols - 1 || (cols >= 10 && (h + 1) % 5 === 0 && h < cols - 3))) {
              // (the first column's tick starts at the raster's edge, so it never pokes past the gutter)
              for (let g = 0; g < 2; g++) T('+' + (h + 1), h ? rxs[g] + h * cp2 + cw / 2 : rxs[g], ry0 + 24 * pitch + 14, { align: h ? 'center' : 'left', font: F11, color: SEC });
            }
          }
          const shown = rrev >= 1 || !plO ? plR : plO;
          return { rxs, pct: Math.round((actS / cols / 24) * 100), gw, drift: shown.fin.drift, otherDrift: shown.fin.otherDrift };
        };
        if (G.mid) {
          // mid: the pipeline runs beside the environment (top), the two rollouts and the bound sit below it
          const ey = Y(116);
          arrow([X(140), ey, X(170), ey], a, INK, 1, 3);
          TX('v3.f', '$f_\\theta$', X(155), ey - 13, { size: 14, align: 'center', a });
          const zc = { orient: 'v', cs: Z(5), pitch: Z(5.6), mode: 0 };
          const zy = Y(44);
          const hist = ag.trail.slice(-12);
          const newIn = pl ? pr('inflow') : 1;
          const ip = pl ? ag.plans.indexOf(pl) : -1;
          const prevIn = pl ? (ip > 0 ? ag.plans[ip - 1] : ag.lastFin !== pl ? ag.lastFin : null) : null;
          for (let k = 0; k < 3; k++) {
            const p = k === 2 || hist.length < 3 ? (pl ? [pl.x0, pl.y0] : agentPos(ag, T0)) : hist[Math.max(0, hist.length - 1 - (2 - k) * 2)];
            code(0, p.x != null ? p.x : p[0], p.y != null ? p.y : p[1], tmp);
            const zo3 = Object.assign({}, zc, { x: X(176 + k * 10), y: zy });
            if (k === 2) drawCodeWrite(tmp, prevIn ? prevIn.code : null, zo3, a, newIn, 0, null);
            else drawCode(tmp, zo3, a * [0.3, 0.55, 1][k], 1);
          }
          if (pl && newIn < 1) packetTrain(pl.code, [X(140), ey, X(200), ey], newIn * 1.25, a, Z(4), 0.03);
          // (named under the columns: above them sits the environment's legend)
          TX('v3.hist', X(176) + 100 < X(283) - 6 ? '$z_{t-2:t}$ · $k = 3$' : '$z_{t-2:t}$', X(176), Y(196), { size: 13, a });
          // three latents → three tokens → 6 AdaLN-zero blocks, each scaled & shifted by the action
          const lanes = [92, 116, 140].map(Y), fx = X(208);
          ctx.globalAlpha = a; ctx.strokeStyle = INK; ln(X(203), ey, fx, ey);
          for (let k = 0; k < 3; k++) arrow([fx, ey, X(225), lanes[k]], a, G5, 1, 2.5);
          TX('v3.title', 'predictor $g_\\phi$', X(230), Y(36), { size: 14, a, p: prog(ta, 0.2, 0.5) });
          T('AdaLN-zero · 6 blocks', X(230), Y(56), { color: SEC, p: prog(ta, 0.3, 0.8) });
          const b0 = 230, bp = 22, bw = 16, by0 = Y(72), by1 = Y(160);
          ctx.globalAlpha = a; ctx.strokeStyle = G3;
          for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) ln(X(b0 + i * bp + bw), P(lanes[k]), X(b0 + (i + 1) * bp), P(lanes[k]));
          for (let i = 0; i < 6; i++) predBlock(X(b0 + i * bp), by0, by1, Z(bw), lanes, Z(6), a, sweep - i, gam, bet);
          const acx = X(b0 + 2.5 * bp + bw / 2), acy = Y(196), ar = Z(10);
          ctx.globalAlpha = a; ctx.strokeStyle = INK; circ(acx, acy, ar, false);
          const an = Math.atan2(act[1], act[0]), al = ar * 0.62 * Math.min(1, Math.hypot(act[0], act[1]) + 0.35);
          ctx.strokeStyle = ACC; ln(acx - Math.cos(an) * al, acy - Math.sin(an) * al, acx + Math.cos(an) * al, acy + Math.sin(an) * al);
          head(acx + Math.cos(an) * al, acy + Math.sin(an) * al, an, 3);
          TX('v3.a', '$a_t$ · scale & shift', acx + ar + 8, acy, { size: 12, a });
          const busY = Y(176);
          ctx.strokeStyle = G5; ln(P(acx), acy - ar, P(acx), busY); ln(X(b0) + Z(bw) / 2, P(busY), X(b0 + 5 * bp) + Z(bw) / 2, P(busY));
          for (let i = 0; i < 6; i++) {
            const hot = sweep > i && sweep < i + 1, tx = P(X(b0 + i * bp) + Z(bw) / 2);
            ctx.strokeStyle = hot ? ACC : G5; ctx.lineWidth = hot ? 1.5 : 1; dash([1.5, 2]); ln(tx, busY, tx, by1 + 11); dash(false); ctx.lineWidth = 1;
            ctx.globalAlpha = a; ctx.fillStyle = hot ? ACC : C.bg; ctx.strokeStyle = hot ? ACC : INK;
            ctx.beginPath(); ctx.moveTo(tx, by1 + 3); ctx.lineTo(tx + 3, by1 + 6.5); ctx.lineTo(tx, by1 + 10); ctx.lineTo(tx - 3, by1 + 6.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            if (hot) { ctx.globalAlpha = a * 0.7; ctx.fillStyle = ACC; const u = (sweep - i); ctx.fillRect(tx - 1.5, lerp(busY, by1 + 10, u) - 1.5, 3, 3); }
          }
          ctx.globalAlpha = a;
          arrow([X(b0 + 5 * bp + bw) + 3, lanes[2], X(366), ey], a, INK, 1, 3);
          // 3-layer MLP projector → ReLU → sparse ẑ_{t+1}
          const MO = { f0: 376, fp: 24, cm: 116, np: 10, r: 3.5 };
          mlpNet({ orient: 'h', f0: X(MO.f0), fp: Z(MO.fp), cm: Y(MO.cm), np: Z(MO.np), r: Math.max(3, Z(MO.r)), cols: [6, 8, 8, 6] }, a, w, seed, lastFrom(preN, 6, seed));
          T('MLP projector', X(MO.f0) - Z(8), Y(MO.cm) + Z(MO.np) * 3.5 + Z(MO.r) + 17, { p: prog(ta, 0.6, 0.6) });
          arrow([X(MO.f0 + 3 * MO.fp) + Z(MO.r) + 3, ey, X(465), ey], a, G5, 1, 3);
          reluBox(X(476), ey, Z(18), a, reluHot);
          T('ReLU', X(476), ey - Z(9) - 9, { align: 'center', color: reluHot ? ACC : SEC });
          arrow([X(485) + 2, ey, X(497), ey], a, INK, 1, 3);
          if (zNext) {
            const revN = !pl ? 1 : e < PRD.rev[0] ? 0 : pr('rev'), flash = pl && e > PRD.relu[0] && e < PRD.rev[1] + 0.05 ? 1 - pr('rev') : 0;
            const shownN = drawCodeWrite(zNext, zOld, Object.assign({}, zc, { x: X(500), y: zy }), a, revN, flash * 0.9, preN);
            T(activeN(shownN) + '/24', X(502.5), Y(196), { align: 'center', color: ACC });
          }
          TX('v3.zh', '$\\hat z_{t+1}$', X(502.5), Y(30), { size: 14, align: 'center', a });
          // autoregressive: ẑ_{t+1} is fed back in as the newest latent, H times
          const rolling = plR && rrev < 1;
          const fb = [X(506), Y(58), X(518), Y(58), X(518), Y(14), X(210), Y(14), X(210), Y(52), X(201) + 3, Y(52)];
          ctx.globalAlpha = a; dash([2, 3]); arrow(fb, a * (rolling ? 1 : 0.8), rolling ? ACC : G5, prog(ta, 0.8, 1), 4); dash(false);
          // (right-aligned over the ẑ_{t+1} end of the loop, ≥ 40 px clear of the environment's eyebrow on its left,
          // so the two never read as one line)
          const fbL = X(0) + textW('same actions, two predictors') + 40;
          const fbLong = X(518) - textW('fed back · ×H (autoregressive)') - 16 >= fbL; // (+ the KaTeX ×H's extra width)
          TX('v3.fb', fbLong ? 'fed back · $\\times H$ (autoregressive)' : 'fed back · $\\times H$', X(518), Y(14) - 11, { size: 12, color: rolling ? ACC : SEC, align: 'right', a, p: prog(ta, 1.0, 0.8) });
          // the two rollouts of the same actions (bottom left)
          if (plR) {
            const R3 = rasters(X(0), Y(242), Z(3.8), Z(4.6), Z(10), Z(150), Z(24), true);
            TX('v3.lp', 'LpWM · $\\hat z_{t+1:t+H}$', R3.rxs[0], Y(226), { size: 12, color: ACC, a });
            T('LeWM · same actions', R3.rxs[1], Y(226) + 4);
            const cy3 = Math.max(Y(380), Y(242) + 24 * Z(4.6) + 30); // (≥ 16 px under the rasters' tick labels)
            T(R3.pct + '% active', R3.rxs[0], cy3, { color: ACC });
            T('drift ' + R3.drift.toFixed(3), R3.rxs[0], cy3 + 18, { color: SEC });
            T('100% active', R3.rxs[1], cy3);
            T('drift ' + R3.otherDrift.toFixed(3), R3.rxs[1], cy3 + 18, { color: SEC });
          }
          // objective, the drift definition and Lemma G.1 (bottom right)
          const qx = X(370);
          T('trained with', qx, Y(244), { color: SEC, p: prog(ta, 0.9, 1) });
          TX('v3.obj', '\\lVert \\hat z_{t+1} - z_{t+1} \\rVert^2 + \\lambda\\,\\mathrm{RDMReg}(z)', qx, Y(244) + 24, { size: 14, math: true, a, p: prog(ta, 0.9, 1) });
          TX('v3.dn', 'toy sim · drift $= \\lVert x_H - \\hat x_H \\rVert$', qx, Y(244) + 56, { size: 12, color: SEC, a });
          caps('LEMMA G.1 · ROLLOUT BOUND', qx, Y(334), { p: prog(ta, 1.0, 0.6) });
          TX('v3.lem', '\\lVert x_H - \\hat x_H \\rVert \\;\\le\\; \\epsilon \\sum_{k=0}^{H} L^k', qx, Y(334) + 28, { size: 18, math: true, a, p: prog(ta, 1.2, 1) });
          TX('v3.lem2', 'compounds with $H$, scales with $\\epsilon$', qx, Y(334) + 60, { size: 12, color: SEC, a, p: prog(ta, 1.4, 1) });
        } else if (!m) {
          // ---- input: the sparse code arrives from the encoder f_θ (history k = 3)
          const ey = Y(290);
          arrow([X(204), ey, X(254), ey], a, INK, 1, 3);
          TX('v3.f', '$f_\\theta$', X(229), ey - 13, { size: 14, align: 'center', a });
          const zc = { orient: 'v', cs: Z(8), pitch: Z(10), mode: 0 };
          const zy = Y(170);
          const hist = ag.trail.slice(-12);
          const newIn = pl ? pr('inflow') : 1;
          const ip = pl ? ag.plans.indexOf(pl) : -1;
          const prevIn = pl ? (ip > 0 ? ag.plans[ip - 1] : ag.lastFin !== pl ? ag.lastFin : null) : null;
          for (let k = 0; k < 3; k++) {
            const p = k === 2 || hist.length < 3 ? (pl ? [pl.x0, pl.y0] : agentPos(ag, T0)) : hist[Math.max(0, hist.length - 1 - (2 - k) * 2)];
            code(0, p.x != null ? p.x : p[0], p.y != null ? p.y : p[1], tmp);
            const zo3 = Object.assign({}, zc, { x: X(262 + k * 14), y: zy });
            // the newest latent z_t is overwritten in place as the encoder's code arrives (never blank)
            if (k === 2) drawCodeWrite(tmp, prevIn ? prevIn.code : null, zo3, a, newIn, 0, null);
            else drawCode(tmp, zo3, a * [0.3, 0.55, 1][k], 1);
          }
          if (pl && newIn < 1) packetTrain(pl.code, [X(204), ey, X(262 + 28) + Z(4), ey], newIn * 1.25, a, Z(5), 0.03);
          TX('v3.hist', '$z_{t-2:t}$', X(279), Y(150), { size: 15, align: 'center', a });
          TX('v3.k', '$k = 3$', X(262), Y(430), { size: 13, color: SEC, a });
          // three latents → three tokens
          const lanes = [218, 254, 290].map(Y), fx = X(306);
          ctx.globalAlpha = a; ctx.strokeStyle = INK; ln(X(300), ey, fx, ey);
          ctx.strokeStyle = G5;
          for (let k = 0; k < 3; k++) arrow([fx, ey, X(328), lanes[k]], a, G5, 1, 2.5);
          // ---- predictor g_φ: 6 AdaLN-zero blocks over the 3 tokens, each scaled & shifted by the action
          TX('v3.title', 'predictor $g_\\phi$', X(332), Y(150), { size: 14, a, p: prog(ta, 0.2, 0.5) });
          T('AdaLN-zero · 6 blocks', X(332), Y(172), { color: SEC, p: prog(ta, 0.3, 0.8) });
          const b0 = 332, bp = 26, bw = 20, by0 = Y(196), by1 = Y(312);
          // token lanes between blocks
          ctx.globalAlpha = a; ctx.strokeStyle = G3;
          for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) ln(X(b0 + i * bp + bw), P(lanes[k]), X(b0 + (i + 1) * bp), P(lanes[k]));
          for (let i = 0; i < 6; i++) predBlock(X(b0 + i * bp), by0, by1, Z(bw), lanes, Z(7), a, sweep - i, gam, bet);
          const acx = X(b0 + 2.5 * bp + bw / 2), acy = Y(362), ar = Z(12);
          ctx.globalAlpha = a; ctx.strokeStyle = INK; circ(acx, acy, ar, false);
          const an = Math.atan2(act[1], act[0]), al = ar * 0.62 * Math.min(1, Math.hypot(act[0], act[1]) + 0.35);
          ctx.strokeStyle = ACC; ln(acx - Math.cos(an) * al, acy - Math.sin(an) * al, acx + Math.cos(an) * al, acy + Math.sin(an) * al);
          head(acx + Math.cos(an) * al, acy + Math.sin(an) * al, an, 3.5);
          TX('v3.a', '$a_t$', acx + ar + 8, acy, { size: 15, a });
          const busY = Y(336);
          ctx.strokeStyle = G5; ln(P(acx), acy - ar, P(acx), busY); ln(X(b0) + Z(bw) / 2, P(busY), X(b0 + 5 * bp) + Z(bw) / 2, P(busY));
          for (let i = 0; i < 6; i++) {
            const hot = sweep > i && sweep < i + 1, tx = P(X(b0 + i * bp) + Z(bw) / 2);
            ctx.strokeStyle = hot ? ACC : G5; ctx.lineWidth = hot ? 1.5 : 1; dash([1.5, 2]); ln(tx, busY, tx, by1 + 12); dash(false); ctx.lineWidth = 1;
            // scale/shift marker where the action enters the block
            ctx.globalAlpha = a; ctx.fillStyle = hot ? ACC : C.bg; ctx.strokeStyle = hot ? ACC : INK;
            ctx.beginPath(); ctx.moveTo(tx, by1 + 3); ctx.lineTo(tx + 3.5, by1 + 7); ctx.lineTo(tx, by1 + 11); ctx.lineTo(tx - 3.5, by1 + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
            if (hot) { ctx.globalAlpha = a * 0.7; ctx.fillStyle = ACC; const u = (sweep - i); ctx.fillRect(tx - 1.5, lerp(busY, by1 + 11, u) - 1.5, 3, 3); }
          }
          ctx.globalAlpha = a;
          TX('v3.ada', 'scale & shift $\\gamma(a_t),\\ \\beta(a_t)$ per block', X(332), Y(402), { size: 12, color: SEC, a, p: prog(ta, 0.5, 0.8) });
          arrow([X(b0 + 5 * bp + bw) + 3, lanes[2], X(494), ey], a, INK, 1, 3);
          // ---- 3-layer MLP projector → ReLU → sparse ẑ_{t+1}
          const MO = { f0: 504, fp: 31, cm: 290, np: 15, r: 4 };
          mlpNet({ orient: 'h', f0: X(MO.f0), fp: Z(MO.fp), cm: Y(MO.cm), np: Z(MO.np), r: Math.max(3, Z(MO.r)), cols: [6, 8, 8, 6] }, a, w, seed, lastFrom(preN, 6, seed));
          T('MLP projector', X(MO.f0) - Z(8), Y(MO.cm) - Z(MO.np) * 3.5 - Z(MO.r) - 16, { p: prog(ta, 0.6, 0.6) });
          arrow([X(MO.f0 + 3 * MO.fp) + Z(MO.r) + 3, ey, X(616), ey], a, G5, 1, 3);
          reluBox(X(628), ey, Z(22), a, reluHot);
          T('ReLU', X(628), ey - Z(11) - 9, { align: 'center', color: reluHot ? ACC : SEC });
          arrow([X(639) + 2, ey, X(660), ey], a, INK, 1, 3);
          if (zNext) {
            const revN = !pl ? 1 : e < PRD.rev[0] ? 0 : pr('rev'), flash = pl && e > PRD.relu[0] && e < PRD.rev[1] + 0.05 ? 1 - pr('rev') : 0;
            // the previous prediction stays until this pass writes over it; the count follows the column
            const shownN = drawCodeWrite(zNext, zOld, Object.assign({}, zc, { x: X(664), y: zy }), a, revN, flash * 0.9, preN);
            T(activeN(shownN) + '/24', X(668), Y(430), { align: 'center', color: ACC });
          }
          TX('v3.zh', '$\\hat z_{t+1}$', X(668), Y(150), { size: 15, align: 'center', a });
          TX('v3.obj', 'trained with $\\lVert \\hat z_{t+1} - z_{t+1} \\rVert^2 + \\lambda\\,\\mathrm{RDMReg}(z)$', X(262), Y(470), { size: 13, a, p: prog(ta, 0.9, 1) });
          // ---- autoregressive: ẑ_{t+1} is fed back in, H times → the imagined rollout
          const rolling = plR && rrev < 1;
          // (it closes the loop on the history the predictor reads: it enters the newest column, z_t)
          const fb = [X(676), Y(176), X(692), Y(176), X(692), Y(112), X(314), Y(112), X(314), Y(186), X(299) + 3, Y(186)];
          ctx.globalAlpha = a; dash([2, 3]); arrow(fb, a * (rolling ? 1 : 0.8), rolling ? ACC : G5, prog(ta, 0.8, 1), 5); dash(false);
          TX('v3.fb', 'fed back as input · $\\times H$ (autoregressive)', X(502), Y(112) - 12, { size: 12, color: rolling ? ACC : SEC, align: 'center', a, p: prog(ta, 1.0, 0.8) });
          arrow([X(677), ey, X(708), ey], a, INK, 1, 3);
          if (plR) {
            const R3 = rasters(X(716), Y(170), Z(8), Z(10), Z(16), Z(128), Z(44), true);
            TX('v3.lp', 'LpWM · $\\hat z_{t+1:t+H}$', R3.rxs[0], Y(150), { size: 13, color: ACC, a });
            T('LeWM · same actions', R3.rxs[1], Y(150) + 5, { font: F13 });
            T(R3.pct + '% active', R3.rxs[0], Y(446), { font: F13, color: ACC });
            T('drift ' + R3.drift.toFixed(3), R3.rxs[0], Y(466), { color: SEC });
            T('100% active', R3.rxs[1], Y(446), { font: F13 });
            T('drift ' + R3.otherDrift.toFixed(3), R3.rxs[1], Y(466), { color: SEC });
            // (the tail is dropped where it would reach the right gutter)
            const tail = R3.rxs[0] + 330 <= cv.w - 40 ? ' at the horizon' : '';
            TX('v3.dn', 'toy sim · drift $= \\lVert x_H - \\hat x_H \\rVert$' + tail, R3.rxs[0], Y(490), { size: 12, color: SEC, a });
          }
          // Lemma G.1 (the rollout bound). On short viewports the eyebrow folds into the subline, so the block
          // clears the bottom-right links.
          const shortV = G.h <= 760;
          if (!shortV) caps('LEMMA G.1 · ROLLOUT BOUND', X(716), Y(524), { p: prog(ta, 1.0, 0.6) });
          TX('v3.lem', '\\lVert x_H - \\hat x_H \\rVert \\;\\le\\; \\epsilon \\sum_{k=0}^{H} L^k', X(716), Y(shortV ? 530 : 554), { size: 19, math: true, a, p: prog(ta, 1.2, 1) });
          TX('v3.lem2', shortV ? 'Lemma G.1 · compounds with $H$' : 'compounds with $H$, scales with $\\epsilon$', X(716), Y(shortV ? 562 : 588), { size: 12, color: SEC, a, p: prog(ta, 1.4, 1) });
        } else {
          // mobile: inflow → 6 token blocks + MLP → ReLU → ẑ_{t+1} column, then the two rasters and the bound
          const lanes = [50, 69, 88].map(Y), my = Y(69);
          arrow([X(134), my, X(147), my], a, INK, 1, 3);
          TX('v3.f', '$f_\\theta$', X(140), my - 16, { size: 13, align: 'center', a });
          if (pl && pr('inflow') < 1) packetTrain(pl.code, [X(129), my, X(149), my], pr('inflow') * 1.25, a, 3, 0.03);
          TX('v3.title', 'predictor $g_\\phi$', X(150), Y(6), { size: 13, a });
          T(X(150) + textW('AdaLN-zero · 6 blocks', F12) + 8 <= X(316) ? 'AdaLN-zero · 6 blocks' : '6 AdaLN blocks', X(150), Y(26), { color: SEC });
          const b0 = 150, bp = 12.4, bw = 10, by0 = Y(38), by1 = Y(100);
          for (let i = 0; i < 6; i++) predBlock(X(b0 + i * bp), by0, by1, Z(bw), lanes, Z(4.5), a, sweep - i, gam, bet);
          mlpNet({ orient: 'h', f0: X(232), fp: Z(14), cm: my, np: Z(9), r: 3, cols: [3, 4, 4, 3] }, a, w, seed, lastFrom(preN, 3, seed));
          arrow([X(b0 + 5 * bp + bw) + 2, lanes[2], X(226), my], a, G5, 1, 2.5);
          arrow([X(278), my, X(287), my], a, G5, 1, 2.5);
          reluBox(X(296), my, Z(14), a, reluHot);
          arrow([X(304), my, X(313), my], a, INK, 1, 2.5);
          const zc = { orient: 'v', cs: Z(4.4), pitch: Z(5.4), mode: 0 };
          if (zNext) {
            const revN = !pl ? 1 : e < PRD.rev[0] ? 0 : pr('rev');
            const shownN = drawCodeWrite(zNext, zOld, Object.assign({}, zc, { x: X(316), y: Y(4) }), a, revN, 0, preN);
            TX('v3.zh', '$\\hat z_{t+1}$', X(326), Y(30), { size: 14, a });
            T(activeN(shownN) + '/24', X(326), Y(56), { color: ACC });
          }
          const acx = X(180), acy = Y(121), ar = Z(7);
          ctx.globalAlpha = a; ctx.strokeStyle = INK; circ(acx, acy, ar, false);
          const an = Math.atan2(act[1], act[0]), al = ar * 0.62;
          ctx.strokeStyle = ACC; ln(acx - Math.cos(an) * al, acy - Math.sin(an) * al, acx + Math.cos(an) * al, acy + Math.sin(an) * al);
          ctx.strokeStyle = G5; ln(P(acx), acy - ar, P(acx), Y(108)); ln(X(b0 + bw / 2), P(Y(108)), X(b0 + 5 * bp + bw / 2), P(Y(108)));
          dash([1.5, 2]); for (let i = 0; i < 6; i++) ln(P(X(b0 + i * bp + bw / 2)), Y(108), P(X(b0 + i * bp + bw / 2)), by1); dash(false);
          TX('v3.a', '$a_t$', acx + ar + 5, acy, { size: 13, a });
          // (short phones: flatter rasters and the bound's name folded into its subline)
          const sh = G.short;
          T('illustrative simulation', X(0), sh ? Y(141) : Y(128) + 18, { color: SEC });
          if (plR) {
            const R3 = sh ? rasters(X(0), Y(170), Z(3.3), Z(4), Z(10), Z(150), Z(34), true) : rasters(X(0), Y(190), Z(5), Z(6), Z(10), Z(150), Z(34), true);
            const ly = sh ? Y(158) : Y(176), sy = sh ? Y(300) : Y(368), dy = sh ? 16 : Z(18);
            TX('v3.lp', 'LpWM · $\\hat z_{t+1:t+H}$', R3.rxs[0], ly, { size: 12, color: ACC, a });
            T('LeWM · same actions', R3.rxs[1], ly + 4);
            T(R3.pct + '% active', R3.rxs[0], sy, { color: ACC });
            T('drift ' + R3.drift.toFixed(3), R3.rxs[0], sy + dy, { color: SEC });
            T('100% active', R3.rxs[1], sy);
            T('drift ' + R3.otherDrift.toFixed(3), R3.rxs[1], sy + dy, { color: SEC });
            TX('v3.dn', 'toy sim · drift $= \\lVert x_H - \\hat x_H \\rVert$', R3.rxs[0], sh ? Y(332) : Y(408), { size: 12, color: SEC, a });
          }
          if (sh) {
            // (short phones: the bound alone; its name and "compounds with H" are in the caption, and a subline
            // here would crowd the slider label under it)
            TX('v3.lem', '\\lVert x_H - \\hat x_H \\rVert \\le \\epsilon \\sum_{k=0}^{H} L^k', X(0), Y(356), { size: 16, math: true, a });
          } else {
            caps('LEMMA G.1 · ROLLOUT BOUND', X(0), Y(444));
            TX('v3.lem', '\\lVert x_H - \\hat x_H \\rVert \\le \\epsilon \\sum_{k=0}^{H} L^k', X(0), Y(472), { size: 16, math: true, a });
            TX('v3.lem2', 'compounds with $H$, scales with $\\epsilon$', X(0), Y(502), { size: 12, color: SEC, a });
          }
        }
        ctx.restore();
      }

      /* -- step 4: MPC, sparse vs dense side by side (text + rasters; panels drawn by env layer) */
      function view4(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile, T0 = simT();
        txtA = a;
        ctx.save();
        const pr = [R(envRect(4)), R(envDense())];
        const tmp = new Float32Array(24);
        let capBottom = 0;
        for (let k = 0; k < 2; k++) {
          const r = pr[k], ag = AG[k];
          const col = k ? INK : ACC;
          // title
          ctx.globalAlpha = a;
          ctx.fillStyle = col;
          const ty = r.y - (m ? 12 : 16);
          if (k) { ctx.strokeStyle = INK; ctx.strokeRect(P(r.x), P(ty - 8), 7, 7); }
          else ctx.fillRect(r.x, ty - 8, 8, 8);
          // (the title and the score share the panel's width: narrow panels take the short forms)
          const done = ag.done;
          const wide = r.s > 300;
          const sm = m || 14 + textW('LpWM · sparse latent', F13) + 16 + textW(wide ? 'reached 10 of 10' : '10/10 reached', F12) > r.s;
          T(k ? (sm ? 'LeWM · dense' : 'LeWM · dense latent') : (sm ? 'LpWM · sparse' : 'LpWM · sparse latent'), r.x + 14, ty, { color: col, font: m ? F12 : F13, p: prog(ta, 0.2 + k * 0.1, 0.6) });
          // no score until the first episode has ended
          let score = !done ? (m ? '—' : wide ? 'reached —' : '— reached') : m ? ag.ok + '/' + done : wide ? 'reached ' + ag.ok + ' of ' + done : ag.ok + '/' + done + ' reached';
          const tw4 = textW(k ? (sm ? 'LeWM · dense' : 'LeWM · dense latent') : (sm ? 'LpWM · sparse' : 'LpWM · sparse latent'), m ? F12 : F13);
          if (14 + tw4 + 12 + textW(score) > r.s) score = !done ? '—' : ag.ok + '/' + done;
          T(score, r.x + r.s, ty, { align: 'right', color: SEC, p: prog(ta, 0.5, 0.6) });
          // stats
          const pl0 = curPlan(ag, T0), pl = finPlan(ag, T0);
          const sy = r.y + r.s + (m ? 18 : 22);
          const it = pl0 ? pl0.st.it : 0;
          T('replan ' + String(ag.replans).padStart(2, '0') + '/10' + (wide ? ' · CEM iter ' + String(it).padStart(2, '0') + '/30' : ''), r.x, sy);
          if (pl && pl.fin) T((m ? '' : 'drift ') + pl.fin.drift.toFixed(3), r.x + r.s, sy, { align: 'right', color: col });
          // raster: one row per imagined latent ẑ_{t+h}, 24 units across (sparse → mostly silence)
          if (pl && pl.fin) {
            const H = pl.H, rows = Math.min(H, 20);
            // (long horizons get a taller raster, so 20 rows never collapse into 2 px dashes)
            const total = G.mid ? Z(56) : G.short ? Z(34) : Z(m ? 48 : 62) * (rows > 10 ? 1.35 : 1), rp = total / rows, rh = Math.max(1.5, rp - (rows > 10 ? 1.5 : G.short ? 2.5 : 3.5));
            const cw = r.s / 24, ry = sy + (m ? 12 : 16);
            let act = 0;
            for (let h = 0; h < rows; h++) {
              code(k, pl.fin.imag[2 * h + 2], pl.fin.imag[2 * h + 3], tmp);
              const yy = ry + h * rp;
              for (let i = 0; i < 24; i++) {
                const v = tmp[i], xx = r.x + i * cw + 1;
                if (k === 0) {
                  if (v > 0.001) { act++; ctx.fillStyle = ACC; ctx.globalAlpha = a * (0.3 + 0.7 * Math.min(1, v / 1.05)); ctx.fillRect(xx, yy, cw - 3, rh); }
                  else { ctx.fillStyle = G3; ctx.globalAlpha = a; ctx.fillRect(xx, yy + rh / 2 - 0.5, cw - 3, 1); }
                } else { ctx.fillStyle = G6; ctx.globalAlpha = a * (0.18 + 0.62 * Math.min(1, Math.abs(v) / 1.1)); ctx.fillRect(xx, yy, cw - 3, rh); }
              }
            }
            ctx.globalAlpha = a;
            if (!m) {
              T('+1', r.x - 6, ry + rh, { align: 'right', font: F11, color: SEC });
              T('+' + H, r.x - 6, ry + (rows - 1) * rp + rh, { align: 'right', font: F11, color: SEC });
            }
            const ly2 = ry + total + (m ? 12 : 16);
            capBottom = Math.max(capBottom, ly2 + 4);
            // (the caption drops detail rather than shrink or run into the right-aligned count)
            const cnt = k ? '100% active' : Math.round((act / rows / 24) * 100) + '% active';
            const room = r.s - textW(cnt, F12) - 20; // ≈ the KaTeX ẑ (+ D) and a gap
            const cap = [' · ' + H + ' imagined steps · 24 of D', ' · ' + H + ' imagined steps', ' · ' + H + ' steps', ''].find(c => textW(c, F12) <= room) || '';
            TX('v4.zh' + k, '$\\hat z$' + cap.replace(/ D$/, ' $D$'), r.x, ly2, { size: 12, color: SEC, a });
            T(cnt, r.x + r.s, ly2 + 4, { align: 'right', color: col });
          }
        }
        // legend (mid: the "illustrative simulation" note joins the legend's flow)
        const md = G.mid;
        // (phones: never closer than 22 px under the raster captions, whatever the scale)
        // (the portrait tablet, drawn at up to 1.5×: the legend follows the raster captions at a fixed gap, rather than
        // floating ~90 px below them)
        const ly = m ? (G.phone ? Math.max(Y(G.short ? 286 : 376), capBottom + 22) : capBottom + 34) : md ? Math.max(Y(380), capBottom + 20) : Y(578);
        const lx = m ? X(0) : md ? X(40) : X(160);
        ctx.globalAlpha = a;
        const items = [
          ['line', 'plan (imagined)'], ['circ', 'predicted steps'], ['dot', 'true outcome'], ['fan', m ? 'CEM samples' : '300 CEM samples → top 30'], ['sq', 'replan'],
        ];
        if (md) items.push(['note', 'illustrative simulation']);
        let x = lx, y = ly;
        const xr = m ? X(358) : md ? X(580) : X(1060);
        items.forEach(([kind, label]) => {
          const iw = (kind === 'note' ? 0 : 22) + textW(label, F12);
          if (x > lx && x + iw > xr) { x = lx; y += 20; }
          if (kind === 'note') { T(label, x, y, { color: SEC }); x += iw; return; }
          ctx.strokeStyle = kind === 'fan' ? G5 : INK; ctx.fillStyle = INK; ctx.lineWidth = 1;
          if (kind === 'line') { ctx.strokeStyle = ACC; ctx.lineWidth = 1.25; ln(x, P(y - 4), x + 16, P(y - 4)); ctx.lineWidth = 1; }
          if (kind === 'circ') { ctx.strokeStyle = ACC; circ(x + 6, y - 4, 3, false); }
          if (kind === 'dot') { dash([1, 3]); ln(x, P(y - 4), x + 16, P(y - 4)); dash(false); }
          if (kind === 'fan') { for (let j = 0; j < 4; j++) ln(x, y - 4, x + 16, y - 10 + j * 4); }
          if (kind === 'sq') ctx.strokeRect(P(x + 3), P(y - 7), 6, 6);
          const lw = textW(label, F12);
          T(label, x + 22, y, { color: SEC });
          x += 22 + lw + (m ? 14 : 24);
        });
        if (!md) T(m ? 'illustrative simulation · Piecewise 2×2' : 'illustrative simulation · Piecewise 2×2 dynamics · execute 5 steps, replan · ≤ 10 replans', m ? X(0) : X(160), y + 22, { color: SEC });
        ctx.restore();
      }

      /* -- step 5: capacity ladder (Fig 1b) */
      let capHit = [];
      const RUNG_TEX = [
        '\\hat z_{t+1} = \\sigma\\big(\\mathrm{AdaLN}^{(6)}(z_{t-k+1:t},\\, a_t)\\big)',
        '\\hat z_{t+1} = \\sigma\\big(\\mathrm{AdaLN}^{(1)}(z_{t-k+1:t},\\, a_t)\\big)',
        '\\hat z_{t+1} = \\sigma\\big(W\\,\\mathrm{ReLU}\\big(\\textstyle\\sum_{i=0}^{k-1} A_i(z_t)\\, z_{t-i} + B(z_t)\\, a_t\\big)\\big)',
        '\\hat z_{t+1} = \\sigma\\big(W\\,\\mathrm{ReLU}\\big(\\textstyle\\sum_{i=0}^{k-1} A_i\\, z_{t-i} + B\\, a_t\\big)\\big)',
        '\\hat z_{t+1} = \\sigma\\big(\\textstyle\\sum_{i=0}^{k-1} A_i\\, z_{t-i} + B\\, a_t\\big)',
        '\\hat z_{t+1} = \\sigma(A\\, z_t + B\\, a_t)',
      ];
      function view5(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile;
        txtA = a;
        ctx.save();
        // short viewports (< 800 px tall): a shorter plot, so the rung formula sits clear of the top chrome row
        const short = !m && G.h < 800, md = G.mid;
        const L = md ? { x0: 40, x1: 610, y0: 150, y1: 300, gl: [212, 0] }
          : !m ? { x0: 120, x1: 950, y0: short ? 190 : 150, y1: 466, gl: [380, 8] }
            : G.short ? { x0: 34, x1: 352, y0: 142, y1: 262, gl: [0, 8] } : { x0: 34, x1: 352, y0: 150, y1: 392, gl: [0, 8] };
        // (phones: the chart title keeps ≥ 20 px under the rung's formula block at any scale; the portrait tablet, drawn
        // at up to 1.5×, never lets that gap grow past ~50 px: the plot grows taller instead)
        const x0 = X(L.x0), x1 = X(L.x1), y1 = Y(L.y1);
        const y0 = m ? Math.max(G.phone ? Y(L.y0) : Math.min(Y(L.y0), Y(L.gl[1]) + 150), Y(L.gl[1]) + 124) : Y(L.y0);
        const yv = v => lerp(y1, y0, v / 100);
        const n = 6, xc = i => lerp(x0, x1, (i + 0.5) / n);
        const lm = eio(S.loopMix);
        const le = i => lerp(LADDER.open.le[i], LADDER.closed.le[i], lm), lp = i => lerp(LADDER.open.lp[i], LADDER.closed.lp[i], lm);
        const pAx = prog(ta, 0.1, 0.8);
        // grid
        ctx.globalAlpha = a; ctx.lineWidth = 1;
        for (let v = 0; v <= 100; v += 20) {
          ctx.strokeStyle = v === 0 ? INK : G2; dash(v === 0 ? false : [2, 3]);
          lnP(x0, P(yv(v)), x1, P(yv(v)), pAx);
          T(String(v), x0 - 9, yv(v) + 4, { align: 'right', font: F11, color: SEC, p: pAx * 2 });
        }
        dash(false);
        TX('v5.title', 'planning success (%) · PushT · $D = 4096$', x0, y0 - (m ? 44 : 48), { size: m ? 12 : 13, a, p: prog(ta, 0.3, 0.9) });
        // open / closed toggle
        const tgY = y0 - (m ? 20 : 22);
        const oW = textW('open-loop', F12), cW = textW('closed-loop', F12);
        ctx.globalAlpha = a;
        T('open-loop', x0, tgY, { color: S.loopClosed ? SEC : INK });
        T('/', x0 + oW + 7, tgY, { color: G5 });
        T('closed-loop', x0 + oW + 19, tgY, { color: S.loopClosed ? INK : SEC });
        ctx.strokeStyle = INK;
        const ux = S.loopClosed ? x0 + oW + 19 : x0, uw = S.loopClosed ? cW : oW;
        ln(ux, P(tgY + 4), ux + uw, P(tgY + 4));
        if (!m) T('[C]', x0 + oW + 27 + cW, tgY, { color: SEC });
        capHit = [{ x: x0 - 4, y: tgY - 12, w: oW + cW + 30, h: 20, act: 'loop' }];
        // legend
        if (!m) {
          const lgx = x1, lgy = y0 - 48;
          ctx.fillStyle = ACC; circ(lgx - textW('LpWM (sparse)', F12) - 11, lgy - 4, 3.6, true);
          T('LpWM (sparse)', lgx, lgy, { align: 'right', color: ACC });
          ctx.strokeStyle = INK; ctx.fillStyle = C.bg; circ(lgx - textW('LeWM (dense)', F12) - 11, lgy + 14, 3.6, true); circ(lgx - textW('LeWM (dense)', F12) - 11, lgy + 14, 3.6, false);
          T('LeWM (dense)', lgx, lgy + 18, { align: 'right' });
        }
        // series
        const pL = prog(ta, 0.7, 1.4);
        const ptsLe = [], ptsLp = [];
        for (let i = 0; i < n; i++) { ptsLe.push(xc(i), yv(le(i))); ptsLp.push(xc(i), yv(lp(i))); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1; polyP(ptsLe, pL);
        ctx.strokeStyle = ACC; ctx.lineWidth = 1.5; polyP(ptsLp, prog(ta, 0.9, 1.4)); ctx.lineWidth = 1;
        // selected rung: guide + gap segment
        const rv = S.rungView, ri = Math.round(rv);
        const gx = lerp(xc(Math.floor(rv)), xc(Math.min(5, Math.floor(rv) + 1)), rv - Math.floor(rv));
        const gLe = lerp(le(Math.floor(rv)), le(Math.min(5, Math.floor(rv) + 1)), rv - Math.floor(rv));
        const gLp = lerp(lp(Math.floor(rv)), lp(Math.min(5, Math.floor(rv) + 1)), rv - Math.floor(rv));
        const pG = prog(ta, 1.6, 0.6);
        if (pG > 0) {
          ctx.globalAlpha = a * pG; ctx.strokeStyle = ACC; dash([2, 3]); ln(P(gx), y0 - 4, P(gx), y1); dash(false);
          ctx.lineWidth = 2; ln(P(gx), yv(gLe), P(gx), yv(gLp)); ctx.lineWidth = 1;
          if (Math.abs(gLp - gLe) > 4) head(P(gx), yv(gLp) + (gLp > gLe ? 1 : -1), gLp > gLe ? -Math.PI / 2 : Math.PI / 2, 5);
        }
        ctx.globalAlpha = a;
        for (let i = 0; i < n; i++) {
          const pp = prog(ta, 0.7 + i * 0.22, 0.2);
          if (pp <= 0) continue;
          ctx.globalAlpha = a * pp;
          ctx.fillStyle = C.bg; ctx.strokeStyle = INK; circ(xc(i), yv(le(i)), 3.8, true); circ(xc(i), yv(le(i)), 3.8, false);
          ctx.fillStyle = ACC; circ(xc(i), yv(lp(i)), 4.2, true);
        }
        // the gap read-out lives in a fixed row at the top of the guide (every value in this chart is ≤ 79%,
        // so the row between the 100 and 80 gridlines never meets a dot or a line), beside the guide
        if (pG > 0) {
          const gap = lp(ri) - le(ri);
          const lbl = m
            ? (gap >= 0 ? '+' : '−') + Math.abs(gap).toFixed(1) + ' pts'
            : 'sparse ' + lp(ri).toFixed(1) + '% · dense ' + le(ri).toFixed(1) + '% · ' + (gap >= 0 ? '+' : '−') + Math.abs(gap).toFixed(1) + ' pts';
          const lw = textW(lbl, F13);
          const lx = gx + 10 + lw <= x1 ? gx + 10 : Math.max(x0 + 4, gx - 10 - lw);
          T(lbl, lx, yv(100) + 18, { color: ACC, font: F13, a: a * pG });
        }
        // x labels
        capHit.length = 1;
        // (phones: the two MLP∘ names break over two lines so neighbouring labels never run together)
        const MN = ['Deep', 'Shallow', 'MLP∘|LTV', 'MLP∘|LTI', 'LTI(k)', 'LTI(1)'];
        for (let i = 0; i < n; i++) {
          const sel = i === ri, la = a * prog(ta, 0.3 + i * 0.05, 0.4);
          if (!m) {
            // (mid: a column is ~95 px wide, so the rungs take their short names)
            T((md ? LADDER.short : LADDER.names)[i], xc(i), y1 + 20, { align: 'center', font: F12, color: sel ? ACC : INK, a: la });
            T(LADDER.params[i] + 'M', xc(i), y1 + 38, { align: 'center', font: F12, color: SEC, a: la });
            // (narrow columns: the bare percentage — the foot line names the row)
            T(Math.round(LADDER.active[i] * 100) + ((x1 - x0) / n >= textW('48% active', F12) + 22 ? '% active' : '%'), xc(i), y1 + 55, { align: 'center', font: F12, color: SEC, a: la });
          } else {
            // (narrow phone columns, < 56 px: the tick labels step down to 11 px so neighbours never touch)
            const fT = (x1 - x0) / n < 56 ? F11 : F12;
            MN[i].split('|').forEach((s, k) => T(s, xc(i), y1 + 18 + k * 14, { align: 'center', font: fT, color: sel ? ACC : INK, a: la }));
            T(LADDER.params[i] + 'M', xc(i), y1 + 48, { align: 'center', font: fT, color: SEC, a: la });
            T(Math.round(LADDER.active[i] * 100) + '%', xc(i), y1 + 63, { align: 'center', font: fT, color: SEC, a: la });
          }
          capHit.push({ x: xc(i) - (x1 - x0) / n / 2, y: y0, w: (x1 - x0) / n, h: y1 - y0 + 60, act: 'rung', i });
        }
        ctx.globalAlpha = a;
        TX('v5.foot', m ? 'params at $D = 4096$ · LpWM active fraction' : 'params at $D = 4096$ (Table 2) · LpWM active fraction $\\lVert z \\rVert_0 / D$ (Table 3)', x0, y1 + (m ? 80 : 78), { size: 12, color: SEC, a, p: prog(ta, 1.2, 1) });
        // (short phones: the axis-direction line gives way to the legend; desktops drop it wherever it would sit in the
        // caption's band at the bottom — the slider's "deep transformer ↔ linear" already says it)
        if (!G.short && !tight5() && (G.phone || y1 + 102 <= cv.h - 137)) {
          T('← more complex predictor', x0, y1 + 102, { color: SEC, p: prog(ta, 1.3, 1) });
          T('simpler →', x1, y1 + 102, { color: SEC, align: 'right', p: prog(ta, 1.3, 1) });
        }
        if (m) {
          const lgy = y1 + (G.short ? 102 : 126);
          ctx.fillStyle = ACC; circ(x0 + 4, lgy - 4, 3.6, true); T('LpWM (sparse)', x0 + 14, lgy, { color: ACC });
          ctx.strokeStyle = INK; ctx.fillStyle = C.bg; circ(x0 + 138, lgy - 4, 3.6, true); circ(x0 + 138, lgy - 4, 3.6, false); T('LeWM (dense)', x0 + 148, lgy);
        }
        // predictor glyph + formula for the selected rung
        // (lifted a little so its last line always clears the chart title by ≥ 24 px, also at 1280×720; never
        // above the band under the headline, gliding with the step's offset)
        const gxp = !m ? X(L.gl[0]) : X(0), gyp = !m ? Math.max(G.tops[5] + 8 + (G.oy - G.oyS[5]), Math.min(Y(L.gl[1]) - 6, y0 - (tight5() ? 134 : 146))) : Y(L.gl[1]);
        const ga = a * prog(ta, 0.2, 0.6);
        ctx.globalAlpha = ga;
        T(LADDER.names[ri], gxp, gyp + 4, { color: ACC, font: F13, a: ga });
        TX('v5.form', RUNG_TEX[ri], gxp, gyp + (m ? 30 : 34), { size: m ? 15 : 17, math: true, a: ga });
        TX('v5.sub', (ri === 0 ? '6 layers' : '1 layer') + ' · $k = ' + (ri === 5 ? 1 : 3) + '$ · ' + LADDER.params[ri] + 'M params', gxp, gyp + (m ? 56 : 62), { size: 12, color: SEC, a: ga });
        if (!m) predGlyph(LADDER.glyph[ri], X(L.gl[0]) - 24, gyp - 4, Z(130), Z(64), ga);
        ctx.restore();
      }
      const GLYPH_TEX = { 'A(z)': 'A(z)', A: 'A', 'A₀': 'A_0', 'A₁': 'A_1', 'A₂': 'A_2', B: 'B', W: 'W' };
      // The selected rung's predictor, right-aligned to end at xr. The transformer rungs reuse the step-3
      // block (the token box with its causal arcs): 6 for Deep, 1 for Shallow, so the ladder visibly shrinks
      // the same predictor.
      function predGlyph(parts, xr, y, w, h, a) {
        const n = parts.length;
        const unit = Math.min(Z(28), w / (n + 0.5)), sqS = Math.min(unit, h - 14);
        const BW = 16, BP = 21, ST = 8;
        const widthOf = p => (p === 'blocks6' ? 5 * BP + BW + 2 * ST : p === 'blocks1' ? BW + 2 * ST : p === 'relu' ? 28 : p === 'gate' ? 22 : p === 'plus' ? 14 : sqS + 8);
        let cx = xr; for (const p of parts) cx -= widthOf(p);
        ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        let sqi = 0;
        for (const p of parts) {
          if (p === 'blocks6' || p === 'blocks1') {
            const nb = p === 'blocks6' ? 6 : 1, lanes = [0.3, 0.5, 0.7].map(f => y + h * f), y0b = y + 5, y1b = y + h - 5;
            ctx.globalAlpha = a; ctx.strokeStyle = G4;
            for (const l of lanes) {
              ln(cx, P(l), cx + ST, P(l));
              for (let i = 0; i < nb - 1; i++) ln(cx + ST + i * BP + BW, P(l), cx + ST + (i + 1) * BP, P(l));
              ln(cx + ST + (nb - 1) * BP + BW, P(l), cx + widthOf(p), P(l));
            }
            for (let i = 0; i < nb; i++) predBlock(cx + ST + i * BP, y0b, y1b, BW, lanes, 5, a, 1, 0, 0);
            ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = 1;
            cx += widthOf(p); continue;
          }
          if (p === 'relu') {
            // an unboxed 2 px hinge as tall as the A / W boxes (a boxed one read as a checkbox)
            const s = Math.min(unit, h - 14), yb = y + h / 2 + s / 2, yt = y + h / 2 - s / 2;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 1, yb); ctx.lineTo(cx + 9, yb); ctx.lineTo(cx + 19, yt); ctx.stroke(); ctx.lineWidth = 1;
            cx += 28; continue;
          }
          if (p === 'gate') { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12, xx = cx + u * 16, yy = y + h / 2 + 6 - 12 * sig((u - 0.5) * 10); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); cx += 22; continue; }
          if (p === 'plus') { plus(cx + 5, y + h / 2, 3.5); cx += 14; continue; }
          if (p.startsWith('sq:')) {
            const lbl = p.slice(3), s = sqS;
            ctx.strokeRect(P(cx), P(y + h / 2 - s / 2), Math.round(s), Math.round(s));
            TX('v5.sq' + sqi++, GLYPH_TEX[lbl] || lbl, cx + s / 2, y + h / 2, { size: 14, math: true, align: 'center', a });
            cx += s + 8;
          }
        }
      }

      /* -- step 6: longer horizons (Fig 2c) */
      let horHover = -1, horHit = [];
      const HOR_DRAW = 3 * 4 * STEP; // each series draws on over 3 beats: one horizon column lands per beat
      // a sample episode in the true dynamics for the inset (a simple go-to-goal controller)
      const INSET = (() => {
        const g = [0.78, 0.28], pts = [0.2, 0.76], o = [0, 0];
        let x = 0.2, y = 0.76;
        for (let i = 0; i < 40 && Math.hypot(x - g[0], y - g[1]) > R_OK; i++) {
          const dx = g[0] - x, dy = g[1] - y, d = Math.hypot(dx, dy) || 1;
          stepTrue(x, y, dx / d, dy / d, o); x = o[0]; y = o[1]; pts.push(x, y);
        }
        return { g, pts };
      })();
      function insetEnv(r, a, p) {
        if (a <= 0.004) return;
        ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.strokeRect(P(r.x), P(r.y), Math.round(r.s), Math.round(r.s));
        ctx.strokeStyle = G4; dash([2, 3]);
        ln(P(r.x + r.s / 2), r.y + 1, P(r.x + r.s / 2), r.y + r.s - 1); ln(r.x + 1, P(r.y + r.s / 2), r.x + r.s - 1, P(r.y + r.s / 2));
        dash(false);
        ctx.fillStyle = G6; ctx.globalAlpha = a * 0.7;
        const cs = Math.max(1.8, r.s / 60);
        for (let q = 0; q < 4; q++) {
          const zx = (q & 1) * 0.5, zy = (q >> 1) * 0.5, b = BV[q];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) chevron(r.x + (zx + 0.1 + 0.15 * i) * r.s, r.y + (zy + 0.1 + 0.15 * j) * r.s, Math.sign(b[0]), Math.sign(b[1]), cs);
        }
        const gx = SX(r, INSET.g[0]), gy = SY(r, INSET.g[1]);
        ctx.globalAlpha = a; ctx.strokeStyle = INK;
        ln(gx - 5, P(gy), gx - 1.5, P(gy)); ln(gx + 1.5, P(gy), gx + 5, P(gy)); ln(P(gx), gy - 5, P(gx), gy - 1.5); ln(P(gx), gy + 1.5, P(gx), gy + 5);
        const pts = []; for (let i = 0; i < INSET.pts.length; i += 2) pts.push(SX(r, INSET.pts[i]), SY(r, INSET.pts[i + 1]));
        ctx.strokeStyle = ACC; ctx.lineWidth = 1.25;
        const end = polyP(pts, p) || [pts[0], pts[1]];
        ctx.lineWidth = 1;
        ctx.strokeStyle = INK; ctx.strokeRect(P(pts[0] - 2.5), P(pts[1] - 2.5), 5, 5);
        ctx.fillStyle = ACC; circ(end[0], end[1], 3, true);
      }
      // Sound: one horizon column per beat as its points land — a LeWM bit, an LpWM tick a 16th later and
      // a quiet LpWM+TJ grain (pitched by success: sparse always sounds above dense), then one low
      // sub + tick when "sparse wins at every horizon" types. Everything ≤ A4.
      const horS = { col: 0, tb: null, fin: false };
      function horizonSounds() {
        if (S.step !== 6 || !S.playing || reduced || !audioLive()) return;
        const ta = age(), BEAT = 4 * STEP;
        const pit = v => deg(Math.round((v - 30) / 6) - 2, -1);
        while (horS.col < 4 && ta >= 1.3 + horS.col * BEAT - 0.1) {
          const i = horS.col;
          if (i === 0) horS.tb = qT(1);
          const tb = horS.tb == null ? null : horS.tb + i * BEAT;
          snd.bit(tb, pit(HORIZ.le[i]), { g: 0.3, pan: 0.35, len: 0.02 });
          snd.tick(tb == null ? null : tb + STEP, pit(HORIZ.lp[i]), { g: 0.5, pan: -0.3, len: 0.05 });
          snd.grain(tb == null ? null : tb + 2 * STEP, pit(HORIZ.tj[i]), { g: 0.14, dur: 0.1, bright: 0.1, pan: -0.1 });
          horS.col++;
        }
        if (!horS.fin && ta >= 3.8) {
          horS.fin = true;
          const t = qT(1);
          snd.sub(t, deg(0, -2), { g: 0.45, dur: 0.4 });
          snd.tick(t, deg(0, -1), { g: 0.4, pan: -0.2, len: 0.05 });
        }
      }
      function view6(a, ta) {
        if (a <= 0.004) return;
        const m = G.mobile;
        txtA = a;
        ctx.save();
        const md = G.mid;
        const L = md ? { x0: 40, x1: 460, y0: 70, y1: 290 } : !m ? { x0: 180, x1: 820, y0: 110, y1: 460 } : { x0: 36, x1: 340, y0: 84, y1: 360 };
        const x0 = X(L.x0), x1 = X(L.x1), y0 = Y(L.y0), y1 = Y(L.y1);
        const xv = i => lerp(x0, x1, i / 3), yv = v => lerp(y1, y0, (v - 30) / 60);
        const pAx = prog(ta, 0.1, 0.8);
        ctx.globalAlpha = a;
        for (let v = 30; v <= 90; v += 10) {
          ctx.strokeStyle = v === 30 ? INK : G2; dash(v === 30 ? false : [2, 3]);
          lnP(x0, P(yv(v)), x1, P(yv(v)), pAx); T(String(v), x0 - 9, yv(v) + 4, { align: 'right', font: F11, color: SEC, p: pAx * 2 });
        }
        dash(false);
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = INK; ln(P(xv(i)), y1, P(xv(i)), y1 + 4); T(String(HORIZ.H[i]), xv(i), y1 + 19, { align: 'center', font: F12, color: horHover === i ? ACC : INK }); }
        // (narrow phones: the title moves above the legend rather than run into it)
        const tUp = m && x0 + textW('episodic success (%)', F13) + 12 > x1 - textW('LpWM (sparse)', F12) - 14;
        T('episodic success (%)', x0, y0 - (tUp ? 58 : m ? 30 : 34), { font: F13, p: prog(ta, 0.2, 0.8) });
        TX('v6.xt', 'planning horizon $H$ (model steps)', x1, y1 + (m ? 38 : 40), { size: 12, color: SEC, align: 'right', a, p: prog(ta, 0.4, 0.8) });
        TX('v6.note', m ? 'Piecewise 2×2 · MPC ($R = 1$) · 3 seeds' : 'Piecewise 2×2 · random goals · true MPC ($R = 1$) · 3 seeds, mean ± std', x0, y1 + (m ? 58 : 60), { size: 12, color: SEC, a, p: prog(ta, 0.5, 0.8) });
        const series = [
          { k: 'le', s: 'leS', col: INK, fill: 'rgba(0,0,0,0.035)', name: 'LeWM (dense)', mk: 'sq', d: 0.8 },
          { k: 'lp', s: 'lpS', col: ACC, fill: 'rgba(20,50,245,0.07)', name: 'LpWM (sparse)', mk: 'dot', d: 1.3, w: 1.5 },
          { k: 'tj', s: 'tjS', col: C.accent2, fill: 'rgba(127,147,255,0.06)', name: 'LpWM + TJ', mk: 'tri', d: 1.8 },
        ];
        for (const sr of series) {
          const p = prog(ta, sr.d, HOR_DRAW);
          if (p <= 0) continue;
          const vals = HORIZ[sr.k], sd = HORIZ[sr.s];
          // band
          ctx.globalAlpha = a * p; ctx.fillStyle = sr.fill;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { const xx = xv(i); if (i) ctx.lineTo(xx, yv(vals[i] + sd[i])); else ctx.moveTo(xx, yv(vals[i] + sd[i])); }
          for (let i = 3; i >= 0; i--) ctx.lineTo(xv(i), yv(vals[i] - sd[i]));
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a; ctx.strokeStyle = sr.col; ctx.lineWidth = sr.w || 1;
          const pts = []; for (let i = 0; i < 4; i++) pts.push(xv(i), yv(vals[i]));
          polyP(pts, p); ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            if (i / 3 > p + 0.001) break;
            const xx = xv(i), yy = yv(vals[i]);
            ctx.strokeStyle = sr.col; ctx.fillStyle = sr.col;
            if (sr.mk === 'dot') circ(xx, yy, 4, true);
            else if (sr.mk === 'sq') { ctx.fillStyle = C.bg; ctx.fillRect(xx - 3.5, yy - 3.5, 7, 7); ctx.strokeRect(P(xx - 3.5), P(yy - 3.5), 7, 7); }
            else { ctx.beginPath(); ctx.moveTo(xx, yy - 4.5); ctx.lineTo(xx + 4, yy + 3); ctx.lineTo(xx - 4, yy + 3); ctx.closePath(); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke(); }
          }
        }
        // legend (with each series' marker; lifted clear of the 90 gridline)
        const lgx = x1, lgy = y0 - (m ? 38 : 42);
        series.slice().reverse().forEach((sr, j) => {
          const la = a * prog(ta, 0.4, 0.6), yy = lgy + j * (m ? 16 : 18);
          T(sr.name, lgx, yy, { align: 'right', color: sr.col === C.accent2 ? '#5d74f0' : sr.col, a: la });
          const mx = lgx - textW(sr.name, F12) - 10, my = yy - 4;
          ctx.globalAlpha = la; ctx.strokeStyle = sr.col; ctx.fillStyle = sr.col; ctx.lineWidth = 1;
          if (sr.mk === 'dot') circ(mx, my, 3.6, true);
          else if (sr.mk === 'sq') { ctx.fillStyle = C.bg; ctx.fillRect(mx - 3.5, my - 3.5, 7, 7); ctx.strokeRect(P(mx - 3.5), P(my - 3.5), 7, 7); }
          else { ctx.beginPath(); ctx.moveTo(mx, my - 4.5); ctx.lineTo(mx + 4, my + 3); ctx.lineTo(mx - 4, my + 3); ctx.closePath(); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke(); }
        });
        ctx.globalAlpha = a;
        // gap labels (LpWM − LeWM) count up; each sits beside the midpoint of the dotted gap it measures
        // (right-aligned on the last column), with a white knockout; hidden under an open tooltip
        const gp = prog(ta, 2.9, 1.2);
        if (gp > 0) {
          for (let i = 0; i < 4; i++) {
            const g = (HORIZ.lp[i] - HORIZ.le[i]) * eout(gp);
            const ga = a * Math.min(1, gp * 2);
            ctx.globalAlpha = ga;
            ctx.strokeStyle = ACC; dash([1, 2]); ln(P(xv(i)), yv(HORIZ.le[i]) - 5, P(xv(i)), yv(HORIZ.lp[i]) + 5); dash(false);
            if (i === horHover) continue;
            // (H = 5: a third of the way up, where the steep LpWM line has already left the column)
            const midY = lerp(yv(HORIZ.le[i]), yv(HORIZ.lp[i]), i === 0 ? (m ? 0.25 : 0.36) : 0.5);
            // H = 20: desktop has open room right of the last column (the inset sits higher), so the label leaves
            // the narrow gap between the two lines and the TJ triangle; phones keep it inside the column
            const out = i === 3 && !m;
            T('+' + g.toFixed(1), xv(i) + (i === 3 && !out ? -8 : out ? 12 : 8), midY + 5, { color: ACC, align: i === 3 && !out ? 'right' : 'left', font: m ? F12 : F13, halo: true, a: ga });
          }
        }
        ctx.globalAlpha = a;
        T('sparse wins at every horizon', x0, y1 + (m ? 86 : 90), { color: ACC, font: F14, p: prog(ta, 3.8, 1.2) });
        // (the third series is named here: TJ = the paper's optional Temporal-Jaccard loss, which penalises changes in
        // the set of active units from one step to the next)
        if (!m) {
          const room = cv.w - 40 - x0;
          const note = ['gap labels: LpWM − LeWM, in points · LpWM + TJ adds a loss that keeps the active units stable over time',
            'gaps: LpWM − LeWM, in points · LpWM + TJ keeps the active units stable over time',
            'LpWM + TJ adds a loss that keeps the active units stable over time'].find(s => textW(s, F12) <= room) || 'LpWM + TJ keeps the active units stable';
          T(note, x0, y1 + 110, { color: SEC, p: prog(ta, 4.2, 1) });
        }
        // hover column → values
        horHit = [];
        for (let i = 0; i < 4; i++) horHit.push({ x: xv(i) - (x1 - x0) / 8, y: y0, w: (x1 - x0) / 4, h: y1 - y0, i });
        if (horHover >= 0) {
          const i = horHover, xx = xv(i);
          ctx.strokeStyle = G4; dash([2, 3]); ln(P(xx), y0, P(xx), y1); dash(false);
          const lines = [
            ['H = ' + HORIZ.H[i], INK],
            ['LpWM      ' + HORIZ.lp[i].toFixed(2) + ' ± ' + HORIZ.lpS[i].toFixed(2), ACC],
            ['LpWM + TJ ' + HORIZ.tj[i].toFixed(2) + ' ± ' + HORIZ.tjS[i].toFixed(2), '#5d74f0'],
            ['LeWM      ' + HORIZ.le[i].toFixed(2) + ' ± ' + HORIZ.leS[i].toFixed(2), INK],
          ];
          const bw = 214, bh = 84, bx = clamp(xx + 12, x0, x1 - bw), by = y0 + 6;
          ctx.fillStyle = C.bg; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = INK; ctx.strokeRect(P(bx), P(by), bw, bh);
          lines.forEach((l, j) => T(l[0], bx + 10, by + 20 + j * 17, { color: l[1] }));
        }
        // the environment these numbers come from (inset: its four drift zones, a goal and one sample episode)
        if (!m) {
          const r = md ? { x: X(488), y: Y(70), s: Z(110) } : { x: X(880), y: Y(110), s: Z(120) };
          const ia = a * prog(ta, 0.6, 0.8);
          insetEnv(r, ia, prog(ta, 1.0, 1.6));
          T('Piecewise 2×2', r.x, r.y + r.s + 20, { font: F13, a: ia });
          T('paper env (Fig 5)', r.x, r.y + r.s + 38, { color: SEC, a: ia });
        }
        ctx.restore();
      }

      /* ---------------------------------------------------------------- shared env layer */
      function drawEnvLayer() {
        panels.length = 0;
        const tr = reduced ? 1 : eio((rt - S.tSwitch) / 0.75);
        const ra = envRect(S.step), rb = S.from >= 0 ? envRect(S.from) : null;
        let rect = null, a = 0;
        if (ra && rb) { rect = [lerp(rb[0], ra[0], tr), lerp(rb[1], ra[1], tr), lerp(rb[2], ra[2], tr)]; a = 1; }
        else if (ra) { rect = ra; a = tr; }
        else if (rb) { rect = rb; a = 1 - tr; }
        if (rect && a > 0.004) {
          const r = R(rect);
          const showCEM = S.step === 0 || S.step === 4;
          drawEnv(r, { k: 0, alpha: a, hit: !!ra, cem: showCEM, other: S.step === 3, drift: S.step !== 3, corners: S.step !== 1 && !(S.from === 1 && rt - S.tSwitch < 0.8) });
          if (S.step <= 3) {
            const la = a * (S.step === 0 ? 1 : 0.95);
            ctx.globalAlpha = la; txtA = la;
            if (S.step === 0 && !G.phone) {
              caps('ENVIRONMENT', r.x, r.y - 32);
              T(G.mid || G.mobile ? 'Piecewise 2×2 · drag goal' : 'Piecewise 2×2 · drag goal or agent', r.x, r.y - 13, { font: F13 });
              // (mid: right of the loop's return leg, which enters the panel from below; tall: two lines beside
              // the panel's foot, clear of o_t's connector under it)
              if (G.mobile) { T('illustrative', r.x + r.s + 12, r.y + r.s - 17, { color: SEC }); T('simulation', r.x + r.s + 12, r.y + r.s - 2, { color: SEC }); }
              else if (G.mid && r.x + Z(48) + textW('illustrative simulation') > X(232) - 10) {
                // (small mid windows: two lines, so the note stays left of the planner box)
                T('illustrative', r.x + Z(48), r.y + r.s + 20, { color: SEC }); T('simulation', r.x + Z(48), r.y + r.s + 35, { color: SEC });
              } else T('illustrative simulation', r.x + (G.mid ? Z(48) : 0), r.y + r.s + 20, { color: SEC });
            } else if (S.step === 3 && !G.mobile) {
              T('same actions, two predictors', r.x, r.y - 34);
              const ly = r.y - 14;
              ctx.strokeStyle = ACC; circ(r.x + 4, ly - 4, 3, false); T('LpWM', r.x + 12, ly, { color: ACC });
              ctx.strokeStyle = G6; circ(r.x + 62, ly - 4, 3, false); T('LeWM', r.x + 70, ly, { color: SEC });
              dash([1, 3]); ctx.strokeStyle = INK; ln(r.x + 118, P(ly - 4), r.x + 134, P(ly - 4)); dash(false); T('true', r.x + 140, ly, { color: SEC });
              // (mid: two lines, so the note stays under the panel, clear of the latent history beside it)
              if (G.mid) { T('illustrative', r.x, r.y + r.s + 20, { color: SEC }); T('simulation', r.x, r.y + r.s + 35, { color: SEC }); }
              else T('illustrative simulation', r.x, r.y + r.s + 20, { color: SEC });
            } else if (S.step === 2 && !G.mobile) {
              TX('env.ot', '$o_t$ · live', r.x, r.y - 13, { size: 13, a: la });
            }
          }
          ctx.globalAlpha = 1;
        }
        // dense panel (Plan (MPC) only)
        const da = sAlpha(4);
        if (da > 0.004) drawEnv(R(envDense()), { k: 1, alpha: da, hit: S.step === 4, cem: true });
      }

      /* ---------------------------------------------------------------- chrome drawn on the canvas */
      // The site's shared step header: "01 / 07 · Step name" (12 px mono, #555), a short 1 px progress hairline
      // under it, then the play state in the same type. Desktop: top-right, on the chrome's 40 px gutter
      // (top ≈ 72 px). Phones: centred between the ‹ › step buttons, the play state folded into the line.
      // (the same rows as the DOM counters of scenes 3 and 4: label baseline 83, hairline 92, state baseline 110)
      const HDR = { y: 83, w: 64, bar: 9, st: 27 };
      const hdrLabel = () => String(S.step + 1).padStart(2, '0') + ' / 07 · ' + STEPS[S.step];
      const hdrState = () => (!S.playing ? 'paused · [space]' : S.autoplay && !reduced ? 'autoplay' : 'interactive');
      // left edge of the header block (its click target: pause / play)
      const hdrLeft = () => cv.w - 40 - Math.max(textW(hdrLabel(), F12), textW('paused · [space]', F12));
      let navHit = [];
      function drawChrome() {
        navHit = [];
        const dur = STEP_BARS[S.step] * BAR;
        const f = clamp(S.stepT / dur, 0, 1);
        ctx.globalAlpha = 1; txtA = 1;
        if (!G.phone) {
          const x = cv.w - 40, y = HDR.y, w = HDR.w;
          T(hdrLabel(), x, y, { align: 'right', font: F12, color: EYE });
          ctx.strokeStyle = G3; ln(x - w, P(y + HDR.bar), x, P(y + HDR.bar));
          ctx.strokeStyle = S.autoplay && S.playing ? INK : G5; ln(x - w, P(y + HDR.bar), x - w + w * f, P(y + HDR.bar));
          T(hdrState(), x, y + HDR.st, { align: 'right', font: F12, color: EYE });
          const bw = cv.w - 40 - hdrLeft() + 8;
          navHit.push({ x: x - bw, y: y - 12, w: bw + 4, h: HDR.st + 18, act: 'play' });
        } else {
          const cx = cv.w / 2, y = PH_NAV, w = 70;
          T(hdrLabel() + (S.playing ? '' : ' · paused'), cx, y, { align: 'center', font: F12, color: EYE });
          T('‹', 22, y + 1, { font: F12, color: EYE });
          T('›', cv.w - 22, y + 1, { font: F12, color: EYE, align: 'right' });
          ctx.strokeStyle = G3; ln(cx - w / 2, P(y + 7), cx + w / 2, P(y + 7));
          ctx.strokeStyle = S.autoplay && S.playing ? INK : G5; ln(cx - w / 2, P(y + 7), cx - w / 2 + w * f, P(y + 7));
          navHit.push({ x: 0, y: y - 22, w: cv.w * 0.3, h: PH_TOP - (y - 22), act: 'prev' });
          navHit.push({ x: cv.w * 0.7, y: y - 22, w: cv.w * 0.3, h: PH_TOP - (y - 22), act: 'next' });
          navHit.push({ x: cv.w * 0.3, y: y - 22, w: cv.w * 0.4, h: PH_TOP - (y - 22), act: 'play' });
        }
      }

      /* ---------------------------------------------------------------- ghost cursor (autoplay demo of an intervention) */
      let ghost = null;
      function ghostStart() {
        const g = pickGoal();
        ghost = { t0: rt, from: [goal.x, goal.y], to: g, released: false };
      }
      function ghostUpdate() {
        if (!ghost) return;
        const u = rt - ghost.t0;
        if (u > 0.7 && u < 1.9) {
          const f = eio((u - 0.7) / 1.2);
          setGoal(lerp(ghost.from[0], ghost.to[0], f), lerp(ghost.from[1], ghost.to[1], f));
          if (!ghost.moving) { ghost.moving = true; for (const ag of AG) { if (ag.status === 'run') { ag.phase = 'plan'; ag.phaseTick = 0; } } }
        }
        if (u >= 1.9 && !ghost.released) { ghost.released = true; restartTask('ghost', simT()); }
        if (u > 2.8) ghost = null;
      }
      function drawGhost() {
        if (!ghost || S.step !== 4) return;
        const u = rt - ghost.t0;
        const r = R(envRect(4));
        const gx = SX(r, goal.x), gy = SY(r, goal.y);
        let x = gx + 6, y = gy + 8, al = 1;
        if (u < 0.7) { const f = eio(u / 0.7); x = lerp(gx + 70, gx + 6, f); y = lerp(gy + 60, gy + 8, f); al = f; }
        if (u > 2.2) al = clamp(1 - (u - 2.2) / 0.5, 0, 1);
        ctx.globalAlpha = al;
        ctx.fillStyle = C.bg; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 13); ctx.lineTo(x + 3.5, y + 10); ctx.lineTo(x + 6.5, y + 16); ctx.lineTo(x + 8.5, y + 15); ctx.lineTo(x + 5.5, y + 9.5); ctx.lineTo(x + 10, y + 9.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (u > 0.6 && u < 1.95) { ctx.strokeStyle = ACC; circ(gx, gy, 10, false); }
        ctx.globalAlpha = 1;
      }

      /* ---------------------------------------------------------------- frame */
      // each step's picture sits under its own headline (relayout: G.oyS, and on phones G.sS / G.oxS); a step
      // change glides between the two placements with the step's crossfade
      function draw() {
        cv.clear();
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        {
          const tr = reduced ? 1 : eio((rt - S.tSwitch) / 0.75);
          const a = S.from >= 0 ? S.from : S.step, b = S.step;
          let s = lerp(G.sS[a], G.sS[b], tr), ox = lerp(G.oxS[a], G.oxS[b], tr), oy = lerp(G.oyS[a], G.oyS[b], tr);
          // (the room under the headline changed without a step change: the art glides into it)
          const gl = G.glide;
          if (gl) {
            const u = eio((rt - gl.t0) / 0.6);
            if (u >= 1) G.glide = null;
            else { s = lerp(gl.s, s, u); ox = lerp(gl.ox, ox, u); oy = lerp(gl.oy, oy, u); }
          }
          G.s = s; G.ox = ox; G.oy = oy;
        }
        if (G.rotate) drawRotate();
        else {
          // one failing view never stops the scene: it is skipped (and reported once), everything else still draws
          guard('env', drawEnvLayer);
          for (let i = 0; i < 7; i++) { const a = sAlpha(i); if (a > 0.004) guard(i, () => views[i](a, i === S.step ? age() : 9)); }
          guard('ghost', drawGhost);
        }
        guard('chrome', drawChrome);
        drawCaret();
        ctx.globalAlpha = 1;
        txEnd();
      }
      const views = [view0, view1, view2, view3, view4, view5, view6];
      // canvas state saved inside a view that throws is unwound here (ctx.save / restore are counted)
      let saveDepth = 0;
      {
        const sv = ctx.save.bind(ctx), rs = ctx.restore.bind(ctx);
        ctx.save = () => { saveDepth++; sv(); };
        ctx.restore = () => { if (saveDepth > 0) { saveDepth--; rs(); } };
      }
      const failed = new Set();
      function guard(id, fn) {
        const d0 = saveDepth;
        try { fn(); } catch (e) {
          if (!failed.has(id)) { failed.add(id); console.error('[lpwm] view ' + id + ' failed', e); }
        }
        while (saveDepth > d0) ctx.restore();
        ctx.globalAlpha = 1; txtA = 1; ctx.lineWidth = 1; dash(false);
      }
      // Landscape phones: the diagrams need a portrait screen (their labels are fixed-size), so the room under the
      // headline asks for it rather than showing an unreadable picture.
      function drawRotate() {
        const cx = cv.w / 2, top = G.tops[S.step], bot = Math.max(top + 60, G.bots[S.step]);
        const cy = Math.round((top + bot) / 2);
        ctx.globalAlpha = 1; txtA = 1;
        // a phone outline turning upright
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.strokeRect(P(cx - 30), P(cy - 34), 20, 34);
        ctx.strokeStyle = G5; dash([2, 3]); ctx.strokeRect(P(cx - 2), P(cy - 24), 34, 20); dash(false);
        ctx.strokeStyle = ACC; ctx.beginPath(); ctx.arc(cx - 4, cy - 17, 13, -Math.PI * 0.05, -Math.PI * 0.5, true); ctx.stroke();
        head(cx - 4, cy - 30, Math.PI, 3);
        T('Turn your phone upright to see the diagram', cx, cy + 22, { align: 'center', color: SEC });
      }

      /* ---------------------------------------------------------------- autoplay choreography per step */
      function choreo(dt) {
        const t = S.stepT;
        if (reduced) {
          // reduced motion: no automated sweeps; the capacity step rests on the headline rung
          if (S.step === 5) {
            if (!S.rungUser && S.rung !== 3) { S.rung = 3; sliders.rung.set(3); }
            S.rungView = S.rung; S.loopMix = S.loopClosed ? 1 : 0;
          }
          return;
        }
        if (S.step === 2 && !S.alphaUser) {
          // sparse → dense → sparse: the sparse code the headline describes holds for the first 3 bars (while the
          // headline is read), then the dense comparison (ramp, hold, ramp back), then sparse again
          const b = t / BAR;
          const v = b < 3 ? 0 : b < 3.8 ? eio((b - 3) / 0.8) : b < 5.2 ? 1 : b < 6 ? 1 - eio((b - 5.2) / 0.8) : 0;
          // (the slider re-renders on every set: only when the value moves)
          if (Math.abs(v - S.alpha) > 1e-3 || (v !== S.alpha && (v === 0 || v === 1))) { S.alpha = v; sliders.alpha.set(v); }
        }
        if (S.step === 5) {
          if (!S.rungUser) {
            // the guide opens on the headline's rung, MLP∘LTI(k) (the +57 pt gap) while the headline is read, then
            // walks the ladder (deep → linear) and settles back on it
            const b = t / BAR;
            let target = 3;
            if (b >= 2.6 && b < 2.6 + 6 * 0.42) target = clamp(Math.floor((b - 2.6) / 0.42), 0, 5);
            if (target !== S.rung) { S.rung = target; sliders.rung.set(target); rungSound(target); }
          }
          S.rungView += (S.rung - S.rungView) * Math.min(1, dt * 9);
          S.loopMix += ((S.loopClosed ? 1 : 0) - S.loopMix) * Math.min(1, dt * 6);
        }
        if (S.step === 4 && S.autoplay && !S.userTouched && !ghost && !S.ghostDone && t > BAR * 5.5) { S.ghostDone = true; ghostStart(); }      }

      /* ---------------------------------------------------------------- step switching */
      function setStep(i, user) {
        i = ((i % 7) + 7) % 7;
        if (i === S.step) return;
        const prev = S.step;
        S.from = prev; S.step = i; S.tSwitch = rt; S.stepT = 0;
        clearSQ(false); // the previous step's queued phrase does not belong to the new picture
        stepper.set(i);
        showCaption();
        syncHeadline();
        showSlider(i);
        if (user) S.autoplay = false;
        hotCell = -1; horHover = -1; attHover = -1;
        ghost = null; S.ghostDone = false;
        clearMyHint();
        if (i === 4 && A && A.ready) setTimeout(() => { if (api.isActive() && S.step === 4) myHint(fitHint((coarse() ? [] : ['Drag the goal ⊕ anywhere · drag an agent to nudge it']).concat(['Drag the goal ⊕ · drag an agent to nudge it', 'Drag the goal ⊕ or an agent', 'Drag the goal ⊕'])), 3800); }, 900);
        if (i === 6) { horS.col = 0; horS.tb = null; horS.fin = false; }
        const t = simT();
        if (i === 4) startDual(t);
        else if (prev === 4 && i < 4) { AG[1].plans.length = 0; if (AG[0].status !== 'run') newEpisode(t, false); else replanAll(null, t); }
        if (i === 5) { S.rungView = S.rung; if (!S.rungUser) { S.rung = 3; S.rungView = 3; sliders.rung.set(3); } }
        if (i === 2 && !S.alphaUser) { S.alpha = 0; sliders.alpha.set(0); }
        simRunning();
        stepSound(i);
        if (bed) { try { bed.set({ density: bedDensity(), bright: i >= 5 ? 0.2 : 0.14 }, 1.2); } catch (e) { /* */ } }
      }
      function stepSound(i) {
        const t = qT(1);
        snd.grain(t, deg(i, 0), { g: 0.3, pan: -0.2 + i * 0.07, dur: 0.12, bright: 0.15 });
        if (i >= 5) snd.data(t, { dur: 0.35, density: 22, spread: 0.9, g: 0.25 });
      }
      // open ↔ closed loop: the same soft, quantised cue from a click or the C key, then the rung's notes
      // (the headline and the caption follow the toggle: the closed-loop panel has its own numbers)
      function toggleLoop() {
        S.loopClosed = !S.loopClosed;
        snd.click(qT(1), { g: 0.35, freq: 2600, q: 3 });
        rungSound(S.rung);
        loopText();
      }
      function loopText() {
        setProbes(5);
        relayout(true, true);
        showCaption();
      }
      function rungSound(r) {
        const lt = qT(1);
        const lm = S.loopClosed;
        const le = (lm ? LADDER.closed : LADDER.open).le[r], lp = (lm ? LADDER.closed : LADDER.open).lp[r];
        snd.bit(lt, deg(Math.round(le / 10), 0), { g: 0.45, pan: 0.3, len: 0.03 });
        snd.tick(lt == null ? null : lt + STEP, deg(Math.round(lp / 10), 0), { g: 0.8, pan: -0.3 });
        if (lp - le > 30) snd.sub(lt == null ? null : lt + STEP, deg(0, -2), { g: 0.5, dur: 0.3 });
      }
      function simRunning() {
        const on = S.playing && S.step <= 4;
        if (on === simOn) return;
        simOn = on;
        setFrozen(!on);
        if (on) nextTick = Math.max(nextTick, simT());
      }

      /* ---------------------------------------------------------------- controls */
      const stepper = api.stepper({
        items: STEPS,
        index: 0,
        onSelect(i) { S.userTouched = true; setStep(i, true); },
      });
      const sliders = {};
      sliders.alpha = api.slider({
        min: 0, max: 1, step: 0, value: 0,
        label: v => (v < 0.02 ? 'output link: ReLU (LpWM)' : v > 0.98 ? 'output link: identity (LeWM)' : 'leaky ReLU, slope ' + v.toFixed(2)),
        left: 'sparse', right: 'dense',
        onInput(v) { S.alpha = v; S.alphaUser = true; S.autoplay = false; S.userTouched = true; },
      });
      sliders.H = api.slider({
        min: 5, max: 20, step: 5, value: 5,
        label: v => (innerWidth > 800 && innerWidth < 1100 ? 'horizon H = ' : 'planning horizon H = ') + v + ' model steps',
        left: 'H = 5', right: '20',
        onInput(v) { if (v === S.H) return; S.H = v; S.autoplay = false; S.userTouched = true; restartTask('slider', simT()); },
      });
      sliders.rung = api.slider({
        min: 0, max: 5, step: 1, value: 3,
        label: v => LADDER.names[v] + ' · ' + LADDER.params[v] + 'M',
        left: 'deep transformer', right: 'linear',
        onInput(v) { S.rung = v; S.rungUser = true; S.autoplay = false; S.userTouched = true; rungSound(v); },
      });
      // A pointer drag leaves focus on the slider track, whose keydown handler then swallows every arrow key
      // (↑↓ steps / ←→ scenes stop working). Hand focus back after pointer use; keyboard focus is unaffected.
      [sliders.alpha, sliders.H, sliders.rung].forEach(s => {
        const blur = () => { const ae = document.activeElement; if (ae && s.el.contains(ae) && ae.blur) ae.blur(); };
        s.el.addEventListener('pointerup', blur);
        s.el.addEventListener('pointercancel', blur);
        s.el.addEventListener('lostpointercapture', blur);
      });
      // Stack the three sliders in one slot so the stepper never jumps when a step swaps its slider.
      const slot = document.createElement('div');
      slot.style.position = 'relative';
      const sEls = [sliders.alpha.el, sliders.H.el, sliders.rung.el];
      if (sEls[0].parentNode) sEls[0].parentNode.insertBefore(slot, sEls[0]);
      sEls.forEach((s, i) => {
        slot.append(s);
        s.style.transition = 'opacity .35s ease';
        if (i) { s.style.position = 'absolute'; s.style.left = '0'; s.style.top = '0'; }
      });
      function showSlider(step) {
        const which = SLIDER_OF[step];
        sEls.forEach((s, i) => {
          const on = i === which;
          s.style.opacity = on ? '1' : '0';
          s.style.visibility = on ? 'visible' : 'hidden';
          s.style.pointerEvents = on ? 'auto' : 'none';
        });
        // (phones: a step without a slider has no controls row at all, so core's hint line sits just above the
        // caption rather than over the art; desktops keep the slot's height so the stepper never jumps)
        // (core re-stacks the phone chrome, hint included, when the step's caption swaps in)
        // (a landscape phone showing the "turn upright" note has no use for a slider either)
        const disp = G && (G.rotate || ((which < 0 || G.noSlider || G.cp0) && G.phone)) ? 'none' : '';
        if (slot.style.display !== disp) {
          slot.style.display = disp;
          // (phones: core re-stacks its chrome — the hint line above the controls — whenever the links are set)
          if (G && G.phone && api.isActive()) api.links(LINKS);
        }
      }
      const LINKS = [
        { label: 'paper', href: 'https://arxiv.org/abs/2608.22764' },
        { label: 'RDMReg (LpJEPA)', href: 'https://arxiv.org/abs/2602.01456' },
      ];
      api.links(LINKS);

      /* ---------------------------------------------------------------- pointer interaction */
      let drag = null; // {type:'goal'|'agent', k, pid, lastReplan}
      let lastDragEnd = 0;
      function toWorld(p, x, y) { return [clamp((x - p.x) / p.s, 0.03, 0.97), clamp((y - p.y) / p.s, 0.03, 0.97)]; }
      function hitPanel(x, y) {
        for (const p of panels) if (x >= p.x - 8 && x <= p.x + p.s + 8 && y >= p.y - 8 && y <= p.y + p.s + 8) return p;
        return null;
      }
      function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
      function localXY(e) { const b = el.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
      function interact() { S.userTouched = true; S.autoplay = false; ghost = null; }

      el.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const [x, y] = localXY(e);
        for (const h of navHit) {
          if (inRect(h, x, y)) {
            if (h.act === 'prev') { interact(); setStep(S.step - 1, true); }
            else if (h.act === 'next') { interact(); setStep(S.step + 1, true); }
            else togglePlay();
            return;
          }
        }
        if (S.step === 5) {
          for (const h of capHit) {
            if (!inRect(h, x, y)) continue;
            interact();
            if (h.act === 'loop') toggleLoop();
            else { S.rung = h.i; S.rungUser = true; sliders.rung.set(h.i); rungSound(h.i); }
            return;
          }
        }
        if (S.step === 2) {
          for (const c of view2cells) {
            if (x >= c[0] - 4 && x <= c[0] + c[2] + 4 && y >= c[1] - 3 && y <= c[1] + c[2] + 3) { hotCell = c[3]; interact(); cellSound(c[3]); return; }
          }
        }
        if (S.step === 1) {
          for (const c of attHit) {
            if (x >= c[0] - 5 && x <= c[0] + c[2] + 5 && y >= c[1] - 4 && y <= c[1] + c[2] + 4) { attHover = attHover === c[3] && e.pointerType === 'touch' ? -1 : c[3]; attLastFocus = -1; interact(); return; }
          }
        }
        if (S.step === 6) {
          // touch: tap a horizon column to open (or close) its values
          for (const h of horHit) {
            if (!inRect(h, x, y)) continue;
            interact();
            horHover = horHover === h.i && e.pointerType === 'touch' ? -1 : h.i;
            if (horHover >= 0) horTick(horHover);
            return;
          }
        }
        const p = hitPanel(x, y);
        if (!p) return;
        const T0 = simT();
        const gx = SX(p, goal.x), gy = SY(p, goal.y);
        const k = p.k, ag = AG[k], ap = agentPos(ag, T0);
        const ax = SX(p, ap[0]), ay = SY(p, ap[1]);
        const hitR = e.pointerType === 'touch' ? 22 : 13;
        interact();
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* */ }
        if (Math.hypot(x - ax, y - ay) < hitR && Math.hypot(x - ax, y - ay) < Math.hypot(x - gx, y - gy)) {
          drag = { type: 'agent', k, p, pid: e.pointerId };
          ag.drag = true; ag.x = ap[0]; ag.y = ap[1]; ag.seg.length = 0; ag.gen++;
          snd.click(qT(1), { g: 0.7, freq: 3000 });
        } else {
          drag = { type: 'goal', p, pid: e.pointerId, last: 0 };
          const w = toWorld(p, x, y);
          if (Math.hypot(x - gx, y - gy) >= hitR) setGoal(w[0], w[1]);
          for (const ag2 of AG) { if (ag2.status === 'run' && !ag2.drag) { ag2.phase = 'plan'; ag2.phaseTick = 0; ag2.why = 'goal'; ag2.gen++; } }
          snd.glitch(qT(1), { repeats: 4, len: 0.02, midi: deg(2, 0), g: 0.45 });
        }
      });
      el.addEventListener('pointermove', e => {
        const [x, y] = localXY(e);
        if (drag && e.pointerId === drag.pid) {
          const w = toWorld(drag.p, x, y);
          if (drag.type === 'goal') {
            setGoal(w[0], w[1]);
            const n = performance.now();
            if (n - drag.last > 260) {
              drag.last = n;
              for (const ag of AG) if (!ag.drag && ag.status === 'run') { ag.phase = 'plan'; ag.phaseTick = 0; }
            }
          } else {
            const ag = AG[drag.k];
            const ox = ag.x, oy = ag.y;
            ag.x = w[0]; ag.y = w[1];
            if (zoneOf(ox, oy) !== zoneOf(ag.x, ag.y)) { zoneSounds(ag, qT(1), zoneOf(ag.x, ag.y)); ag.flashes.push({ t: simT(), z: zoneOf(ag.x, ag.y) }); }
          }
          return;
        }
        // hover
        const T0 = simT();
        const hv = { x, y };
        const p = hitPanel(x, y);
        let cursor = '';
        if (p) {
          const gx = SX(p, goal.x), gy = SY(p, goal.y), ap = agentPos(AG[p.k], T0);
          if (Math.hypot(x - SX(p, ap[0]), y - SY(p, ap[1])) < 13) { hv.agent = p.k; cursor = 'grab'; }
          else if (Math.hypot(x - gx, y - gy) < 13) { hv.goal = true; cursor = 'grab'; }
          else cursor = 'crosshair';
        }
        if (S.step === 2) {
          let hc = -1;
          for (const c of view2cells) if (x >= c[0] - 3 && x <= c[0] + c[2] + 3 && y >= c[1] - 2 && y <= c[1] + c[2] + 2) hc = c[3];
          if (hc !== hotCell) { hotCell = hc; if (hc >= 0 && e.pointerType !== 'touch') cellSound(hc); }
          if (hc >= 0) cursor = 'pointer';
        }
        if (S.step === 1) {
          let hh = -1;
          for (const c of attHit) if (x >= c[0] - 4 && x <= c[0] + c[2] + 4 && y >= c[1] - 3 && y <= c[1] + c[2] + 3) hh = c[3];
          if (hh !== attHover) attHover = hh;
          if (hh >= 0) cursor = 'pointer';
        }
        if (S.step === 5) for (const h of capHit) if (inRect(h, x, y)) cursor = 'pointer';
        if (S.step === 6 && e.pointerType !== 'touch') {
          let hh = -1; for (const h of horHit) if (inRect(h, x, y)) hh = h.i;
          if (hh !== horHover) { horHover = hh; if (hh >= 0) horTick(hh); }
          if (hh >= 0) cursor = 'pointer';
        }
        for (const h of navHit) if (inRect(h, x, y)) cursor = 'pointer';
        S.hover = hv;
        if (el.style.cursor !== cursor) el.style.cursor = cursor;
      });
      function endDrag(e) {
        if (!drag || (e && e.pointerId !== drag.pid)) return;
        const T0 = simT();
        if (drag.type === 'agent') {
          const ag = AG[drag.k];
          ag.drag = false; ag.seg.length = 0;
          ag.trail.push({ t: T0, x: ag.x, y: ag.y });
          ag.status = 'run'; ag.replans = 0; ag.phase = 'plan'; ag.phaseTick = 0; ag.why = 'nudge'; ag.res = null;
          epWait = -1;
          if (dual()) pairBroken = true; // one agent was moved by hand: this episode is not a fair pair, not scored
        } else restartTask('goal', T0);
        drag = null;
        lastDragEnd = performance.now();
      }
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
      // (a lifted finger also "leaves": touch selections stay until tapped again)
      el.addEventListener('pointerleave', e => { if (!drag) { S.hover = null; if (e.pointerType !== 'touch') { hotCell = -1; horHover = -1; attHover = -1; } } });
      function horTick(i) { hoverSound(t => snd.tick(t, deg(Math.round((HORIZ.lp[i] - 30) / 6) - 2, -1), { g: 0.4 })); }
      // keep a quick horizontal drag of the goal from being read as a scene swipe by core
      el.addEventListener('touchend', e => { if (drag || performance.now() - lastDragEnd < 80) e.stopPropagation(); }, { passive: true });
      function cellSound(i) {
        const pos = agentPos(AG[0], simT());
        const pre = preact(pos[0], pos[1], new Float32Array(24));
        const v = Math.max(pre[i], S.alpha * pre[i]);
        hoverSound(lt => {
          if (v > 0.001) snd.tick(lt, cellMidi(i), { g: 0.5 + 0.4 * Math.min(1, v), pan: -0.6 + (1.2 * i) / 23 });
          else if (v < -0.001) snd.bit(lt, cellMidi(i) - 12, { g: 0.35, len: 0.015 });
          else snd.click(lt, { g: 0.22, freq: 4200, len: 0.002 });
        });
      }
      // this scene's own hints (so a step change can take them down without touching core's hints)
      let myHintUntil = 0;
      const coarse = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
      // (801–1100 px wide, core puts hints under the wordmark, right on top of the headline: there the scene says
      // nothing — the caption carries how to interact, the step header the play state)
      // (phones: core puts hints 10 px above the controls; where that line would cover the step's art, the scene says
      // nothing — the one-line caption already says how to interact)
      function myHint(text, ms) {
        if (innerWidth > 800 && innerWidth <= 1100) return;
        if (G && G.phone && G.artB) {
          const i = S.step, cap = G.capLines;
          const ctrl = Math.max(104, 58 + 14 * cap + 16), sl = SLIDER_OF[i] >= 0 && !G.noSlider && !G.cp0 ? sliderH() : 0;
          const lines = Math.max(1, Math.ceil((tw(text, F11) + text.length * 0.22 + 14) / (G.w - 32)));
          if (G.h - ctrl - sl - 10 - (6 + 14 * lines) < G.artB[i] + 4) return;
        }
        api.hint(text, ms); myHintUntil = performance.now() + ms;
      }
      // the longest wording that stays on one line: core's hint (11 px mono, .02em tracking) wraps at 100vw − 680 px
      // between the caption and the links on mid-size windows, and phones keep a 16 px gutter
      function fitHint(variants) {
        const vw = innerWidth, max = vw <= 800 ? vw - 32 : vw <= 1360 ? vw - 680 : Infinity;
        return variants.find(v => tw(v, F11) + v.length * 0.22 <= max - 2) || variants[variants.length - 1];
      }
      function clearMyHint() { if (performance.now() < myHintUntil) { api.hint('', 1); myHintUntil = 0; } }
      function togglePlay() {
        S.playing = !S.playing;
        // resuming restores the mode the visitor paused in (a visitor who had taken control keeps it)
        if (S.playing) S.autoplay = S.apBeforePause != null ? S.apBeforePause : S.autoplay;
        else { S.apBeforePause = S.autoplay; clearSQ(true); } // nothing already queued keeps playing over a frozen picture
        simRunning();
        myHint(S.playing ? 'Playing' : fitHint(coarse() ? ['Paused · tap to resume', 'Paused'] : ['Paused · space to resume', 'Paused · [space]', 'Paused']), 1200);
      }

      /* ---------------------------------------------------------------- main loop */
      api.loop((t, dt) => {
        rt += dt;
        if (!G || G.w !== cv.w || G.h !== cv.h) relayout();
        { const k1 = G.cp0 ? 1 : 0; cpk = cpk == null || reduced ? k1 : Math.abs(k1 - cpk) < 0.002 ? k1 : cpk + (k1 - cpk) * Math.min(1, dt * 6); }
        syncAudio();
        if (S.playing) {
          S.stepT += dt;
          // (reduced motion: no automatic advance — the visitor steps with ↑↓ or the stepper)
          if (S.autoplay && !reduced && S.stepT >= STEP_BARS[S.step] * BAR) setStep(S.step + 1, false);
          choreo(dt);
        } else if (S.step === 5) choreo(dt);
        if (simOn) runSim();
        if (SQ.length) { if (simOn) drainSQ(simT()); else SQ.length = 0; }
        if (S.playing && S.step <= 4 && !reduced) updParts(dt);
        ghostUpdate();
        pumpHover();
        horizonSounds();
        draw();
      });

      /* ---------------------------------------------------------------- bed (neuron-like grain shimmer) */
      let offClock = null, bed = null;
      function startBed() {
        stopBed(); // (never leak a second grain cloud or clock listener)
        if (A && typeof A.granular === 'function') {
          try { bed = A.granular({ density: bedDensity(), pitch: [deg(0, -1), deg(2, -1), deg(4, -1), deg(1, 0), deg(3, 0)], dur: 0.09, spread: 0.95, bright: 0.14, octave: 0, jitter: 0.8, detune: 6, gain: 0.55, attack: 1.2, dest: api.bus() }); } catch (e) { bed = null; }
        }
        if (A && A.clock && typeof A.clock.on === 'function') {
          offClock = A.clock.on((step, time) => {
            if (bed) return;
            if (Math.random() < (S.step >= 5 ? 0.09 : 0.05)) {
              const lt = a2p != null ? audioToSim(time) : null;
              snd.grain(lt, deg(Math.floor(Math.random() * 6), -1), { g: 0.16 + Math.random() * 0.1, pan: (Math.random() * 2 - 1) * 0.8, dur: 0.07 + Math.random() * 0.06, bright: 0.15 });
            }
          });
        }
      }
      // the bed thins out while the sim is ticking (negative space) and shimmers more over the charts
      function bedDensity() { return S.step >= 5 ? 4.5 : S.step === 4 ? 1.4 : 2.2; }
      function stopBed() {
        if (offClock) { try { offClock(); } catch (e) { /* */ } offClock = null; }
        if (bed) { try { bed.stop(1.2); } catch (e) { /* */ } bed = null; }
      }

      /* ---------------------------------------------------------------- lifecycle */
      function reset() {
        rt = 0;
        S.from = -1; S.step = 0; S.tSwitch = -10; S.stepT = 0;
        S.playing = true; S.autoplay = true; S.userTouched = false; S.apBeforePause = null;
        S.alphaUser = false; S.rungUser = false; S.alpha = 0;
        // a re-entered scene replays from its defaults (H = 5, open-loop, the MLP∘LTI(k) rung)
        if (S.loopClosed) { S.loopClosed = false; setProbes(5); }
        S.H = 5; S.loopMix = 0; S.rung = 3; S.rungView = 3;
        // (no glide carried over from a relayout while the scene was hidden: rt restarts at 0)
        if (G) G.glide = null;
        stepper.set(0); showCaption(); showSlider(0);
        syncHeadline(true); // (the context line replays its entrance with the scene)
        sliders.alpha.set(0); sliders.H.set(5); sliders.rung.set(3);
        hotCell = -1; horHover = -1; attHover = -1;
        SQ.length = 0;
        for (const ag of AG) { ag.seg.length = 0; ag.trail.length = 0; ag.plans.length = 0; ag.marks.length = 0; ag.st = null; ag.pulses.length = 0; ag.flashes.length = 0; ag.ok = 0; ag.eps = 0; ag.done = 0; ag.drag = false; ag.res = null; ag.lastFin = ag.prevFin = null; }
        AG[0].x = 0.2; AG[0].y = 0.72; AG[1].x = 0.2; AG[1].y = 0.72;
        setGoal(0.8, 0.26);
        simOn = false; frozenAt = null; offset = 0;
        simRunning();
        nextTick = simT() + 0.35;
        newEpisode(nextTick, true);
        seedPlan(AG[0], simT()); // the first frame already has a finished plan: raster, drift, paths
        ghost = null; drag = null; hoverQ = null;
        horS.col = 0; horS.tb = null; horS.fin = false;
        attF.cur = 0; attF.prev = -1; attF.t = -9;
        arpUntil = -1; reachAt = -9; placeMem.clear();
      }
      relayout();
      reset();

      return {
        enter() {
          reset();
          relayout();
          if (reduced) S.tSwitch = -10;
          setTimeout(() => { if (api.isActive() && S.step === 0 && A && A.ready) myHint(fitHint(coarse() ? ['Drag the goal ⊕ · ‹ › for steps', 'Drag the goal ⊕'] : ['Drag the goal ⊕ or nudge the agent · ↑↓ steps', 'Drag the goal ⊕ · ↑↓ steps', 'Drag the goal ⊕']), 4200); }, 1600);
        },
        exit() {
          stopBed();
          clearSQ(true);
          drag = null; ghost = null;
          for (const ag of AG) ag.drag = false;
          setFrozen(true);
          simOn = false;
        },
        sound(on) {
          soundOn = on;
          if (on) {
            startBed(); // (subscribes to the shared clock, so it is running before we phase-align to it)
            syncAudio();
            // Phase-align the sim's logic grid to the shared clock by delaying the NEXT tick by < one 16th.
            // The picture never jumps: sim time itself is untouched.
            try {
              const ct = qT(1);
              if (ct != null && simOn) {
                const d = (((ct - nextTick) % STEP) + STEP) % STEP;
                nextTick += d;
              }
            } catch (e) { /* */ }
          } else {
            stopBed();
            clearSQ(false);
            syncAudio();
          }
        },
        key(e) {
          const k = e.key;
          if (k === 'ArrowDown') { interact(); setStep(S.step + 1, true); return true; }
          if (k === 'ArrowUp') { interact(); setStep(S.step - 1, true); return true; }
          if (k === ' ' || k === 'Spacebar') { togglePlay(); return true; }
          if ((k === 'c' || k === 'C') && S.step === 5) { interact(); toggleLoop(); return true; }
          if ((k === 'g' || k === 'G') && S.step <= 4) { interact(); const g = pickGoal(); setGoal(g[0], g[1]); restartTask('goal', simT()); return true; }
          return false;
        },
      };
    },
  });
})();
