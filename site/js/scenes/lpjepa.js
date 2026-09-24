/* ============================================================================
   yashdagade.com v2 — scene [2] · Rectified LpJEPA   (id 'lpjepa')

   One continuous drawing in five steps:
     0 Rectify         the target: GN_p(µ,σ) whose negative mass collapses into an exact
                       point mass at 0 (the Rectified Generalized Gaussian, Def. 3.4)
     1 Cramér–Wold     drag a projection direction c; the 1-D law of cᵀz (embeddings) vs cᵀy
                       (target) side by side, the sort-and-match pairing (Eq. 16) and W₂²(θ)
                       for every direction
     2 Slice & train   a toy ReLU encoder z = ReLU(Wx + b), x ~ GN_p(0, I), trained with RDMReg
                       only (sliced W₂², random c each step) until every slice matches → points
                       collapse onto the axes (W → a signed permutation, b → µ: exact for every p).
                       Full batch: the 1600 drawn inputs against the 1600 drawn targets (both
                       stratified: every quantile level once per coordinate), so heavy tails (p < 1)
                       converge instead of random-walking on minibatch noise. A p change retrains.
     3 Sparsity dial   µ → expected active fraction, closed form Φ_p(µ/σ), vs Table 13 (ViT-S)
                       and Table 5 (p at µ = 0, CIFAR-100)
     4 Accuracy cliff  sparsity vs linear-probe top-1 (Table 13) + Tables 1 and 5

   Shape p (0.5 · 1 · 2) drives every p-dependent quantity in every step and morphs smoothly:
   curves are evaluated at an interpolated p, samples are quantile-coupled (u ↦ Φ_p⁻¹(u)) and
   interpolated between shapes, measured data that only exists at p = 1 is dimmed and labelled.
   All math is typeset with KaTeX in HTML overlays (Site.texHTML); canvas carries line art,
   tick numerals and plain mono words only.

   Every step opens with the shared context headline (api.headline): one plain sentence that says the point of the
   step, and a sub that names the parts on screen. Each layer's art is laid out under the lower headline of the
   steps that share it (measured ahead of time, so steps 2 and 3 never jump), 20 px under it (36 px on tall
   screens), from the content-left (300 px ≥ 1280, 280 px ≥ 1100, else 260); the step counter sits top-right.
   Phones put the step nav under the wordmark and the headline under the nav (api.headlineTop), so the ‹ › buttons
   never move.

   Layout is responsive per layer: phones (≤ 800 px, as in core) stack everything (short phones put the projections
   beside the dial in steps 2–3); narrow desktop art boxes stack the dial over its panel (steps 2–3), move legends
   out of plots (step 4; step 5 only when its plot is short) and drop the side tables for a one-line Table 5 readout
   (step 5); short art boxes trade the secondary lines (sampling rule, per-row mean, Table 5 line, the table's q line,
   the sliced-mean row) for chart height, and the 1-D histograms of steps 2–3 keep ≥ 40 px where they can. Step 3
   always keeps its toy-training block on desktops (it is what backs the headline's claim). Readout rows under the
   step 5 plot that reach the links column's band (short desktops) take a shorter wording that stops short of it.

   Numbers and formulas: research brief for Kuang, Dagade, Rudner, Balestriero, LeCun,
   "Rectified LpJEPA", ICML 2026. The 2-D training is a labelled toy simulation.
   Sound: microsound / granular, kept low (D3–A4 fundamentals, pitched events are grains or
   bits, never high ticks), levelled to the other scenes (≈ −29…−33 dB RMS per step, no
   silent stretches). Two continuous layers: a wide cloud for the continuous part of the law
   and a narrow, centred bed for the point mass whose density follows its size. Non-zero
   samples are grains pitched by where they land (G3 and up, so they read on laptop speakers);
   every exact zero is the same short D3 bit. Flams tighten into unisons as slices match, a
   clean beat emerges as the toy encoder converges, and in step 5 the ringed Table-13 row
   pulses (encoder above, projector below).
   ============================================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ math (brief §9) */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lgamma(z) {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
    z -= 1; let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function gammaP(a, x) { // regularized lower incomplete gamma
    if (x <= 0) return 0;
    const gln = lgamma(a);
    if (x < a + 1) {
      let ap = a, s = 1 / a, d = s;
      for (let n = 0; n < 500; n++) { ap += 1; d *= x / ap; s += d; if (Math.abs(d) < Math.abs(s) * 1e-14) break; }
      return s * Math.exp(-x + a * Math.log(x) - gln);
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  const Phi = (p, t) => 0.5 * (1 + Math.sign(t) * gammaP(1 / p, Math.pow(Math.abs(t), p) / p)); // CDF of GN_p(0,1)
  const SIG = new Map();
  const sigmaGN = p => { // unit pre-ReLU variance
    let s = SIG.get(p);
    if (s === undefined) { s = Math.exp(0.5 * lgamma(1 / p) - 0.5 * lgamma(3 / p)) / Math.pow(p, 1 / p); if (SIG.size < 4000) SIG.set(p, s); }
    return s;
  };
  const activeFrac = (p, mu) => Phi(p, mu / sigmaGN(p)); // (1/D) E||x||_0
  const gnPdf = (p, mu, s, x) => Math.exp((1 - 1 / p) * Math.log(p) - Math.log(2 * s) - lgamma(1 / p) - Math.pow(Math.abs(x - mu), p) / (p * Math.pow(s, p)));
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function randGamma(a, r) {
    if (a < 1) return randGamma(a + 1, r) * Math.pow(r(), 1 / a);
    const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x = randn(r), v0 = 1 + c * x; if (v0 <= 0) continue;
      const v = v0 * v0 * v0, u = r();
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  }
  const stdGN = (p, r) => (r() < 0.5 ? -1 : 1) * Math.pow(p * randGamma(1 / p, r), 1 / p); // GN_p(0,1) draw
  // inverse CDFs (fast: closed form for p = 1, Acklam for p = 2, Halley on P(1/p, ·) otherwise; |err| < 3e-9)
  function normInv(u) {
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    if (u < pl || u > 1 - pl) {
      const q = Math.sqrt(-2 * Math.log(u < pl ? u : 1 - u));
      const v = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      return u < pl ? v : -v;
    }
    const q = u - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function invGammaP(a, pr) { // x with P(a, x) = pr (Numerical Recipes invgammp)
    if (pr <= 0) return 0;
    if (pr >= 1) return Math.max(100, a + 100 * Math.sqrt(a));
    const gln = lgamma(a), a1 = a - 1;
    let x, t, lna1 = 0, afac = 0;
    if (a > 1) {
      lna1 = Math.log(a1); afac = Math.exp(a1 * (lna1 - 1) - gln);
      const pp = pr < 0.5 ? pr : 1 - pr;
      t = Math.sqrt(-2 * Math.log(pp));
      x = (2.30753 + t * 0.27061) / (1 + t * (0.99229 + t * 0.04481)) - t;
      if (pr < 0.5) x = -x;
      x = Math.max(1e-3, a * Math.pow(1 - 1 / (9 * a) - x / (3 * Math.sqrt(a)), 3));
    } else {
      t = 1 - a * (0.253 + a * 0.12);
      x = pr < t ? Math.pow(pr / t, 1 / a) : 1 - Math.log(1 - (pr - t) / (1 - t));
    }
    for (let j = 0; j < 16; j++) {
      if (x <= 0) return 0;
      const err = gammaP(a, x) - pr;
      t = a > 1 ? afac * Math.exp(-(x - a1) + a1 * (Math.log(x) - lna1)) : Math.exp(-x + a1 * Math.log(x) - gln);
      const u = err / t;
      x -= (t = u / (1 - 0.5 * Math.min(1, u * ((a - 1) / x - 1))));
      if (x <= 0) x = 0.5 * (x + t);
      if (Math.abs(t) < 1e-10 * x) break;
    }
    return x;
  }
  function PhiInv(p, u) { // inverse CDF of GN_p(0,1)
    if (u === 0.5) return 0;
    const s = u < 0.5 ? -1 : 1, tl = u < 0.5 ? u : 1 - u;
    if (p === 1) return -s * Math.log(2 * tl);
    if (p === 2) return normInv(u);
    return s * Math.pow(p * invGammaP(1 / p, 1 - 2 * tl), 1 / p);
  }

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const easeIO = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  function fmt(v, d) { const s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d); return s.replace('-', '−'); }
  const pct = (v, d = 1) => fmt(100 * v, d) + '%';
  const fmtP = p => (p === 0.5 ? '0.5' : p === 0.75 ? '0.75' : String(p));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const texNum = v => fmt(v, 1).replace('−', '-');

  /* ------------------------------------------------------------------ data (brief §4) */

  // Table 13 · ViT-Small · ImageNet-100 · target RGN_1(µ, σ_GN = 0.7071)
  const T13 = {
    mu: [1.0, 0.5, 0.0, -0.5, -1.0, -1.5, -2.0, -2.5, -3.0],
    active: [0.9359, 0.8825, 0.7721, 0.5526, 0.3067, 0.1227, 0.0523, 0.0357, 0.0220],
    enc: [74.34, 74.58, 75.44, 74.80, 74.18, 74.88, 73.54, 72.06, 71.64],
    proj: [65.60, 66.42, 67.16, 66.86, 65.14, 63.70, 60.70, 57.96, 57.46],
  };
  const ZEROS13 = T13.active.map(a => 100 * (1 - a));
  const BASE13 = [
    { n: 'SimCLR', enc: 74.18, proj: 66.86 },
    { n: 'VICReg', enc: 72.06, proj: 63.56 },
    { n: 'LeJEPA', enc: 65.36, proj: 59.12 },
  ];
  // Table 1 · ImageNet-100 · ResNet-50 · encoder linear probe (zeros = 1 − L0), σ = σ_GN
  const T1 = [
    { p: 1, mu: '0', acc: '84.72', z: '30.6%' },
    { p: 2, mu: '0', acc: '85.08', z: '27.0%' },
    { p: 1, mu: '0.25', acc: '84.98', z: '25.6%' },
    { p: 2, mu: '1', acc: '85.08', z: '13.3%' },
    { p: 2, mu: '-2.5', acc: '82.02', z: '97.8%' },
    { p: 1, mu: '-3', acc: '82.72', z: '99.0%' },
    { n: 'LeJEPA', acc: '84.80', z: '0%' },
    { n: 'VICReg', acc: '84.18', z: '0%' },
    { n: 'SimCLR', acc: '83.44', z: '0%' },
  ];
  // Table 5 · CIFAR-100 · µ = 0, σ_GN: shape p → active fraction L0 and top-1 (encoder / projector)
  const T5 = { p: [2, 1, 0.75, 0.5], l0: [0.7357, 0.6474, 0.6099, 0.5727], enc: [66.29, 65.97, 65.78, 66.10], proj: [62.15, 62.22, 62.80, 62.74] };

  const STEPS = ['Rectify', 'Cramér–Wold', 'Slice & train', 'Sparsity dial', 'Accuracy cliff'];
  // bottom-left captions: what to try and one fact the headline does not already say (brief §2, §4, Appendix L).
  // ≤ 33 characters per line, so phones (caption max-width 70vw) never re-wrap them
  const CAPS = [
    'Slide µ to grow or shrink the\nspike of zeros; shape p (key P)\nsets how heavy the tails are.',
    'Drag c, or press [ and ], to\nturn the slice. The ring bulges\nwhere the two laws differ.',
    'The paper slices 8192 random\ndirections per step; this 2-D\ntoy uses 8. R restarts training.',
    'At µ = 0, runs with lower p\ncame out sparser, accuracy\nflat (Table 5, CIFAR-100).', // (measured at µ = 0 only)
    'Hover or tap a point for its\nTable 13 row; the slider’s µ\nrings the nearest measured run.',
  ];
  // context headlines (api.headline, CONTRACT "Round 4"): t = the point of the step in one plain sentence; the sub
  // names the parts on screen, in the longest variant that keeps it to two lines (layout measures them): l = with
  // a gloss (wide desktops, step 1), s = the parts (desktops), m = short (short desktops, narrow tablets, phones);
  // short phones show the title alone ('n'). One word for what is matched, throughout: "features" (the legends keep
  // "z embeddings"). No punctuation right after $…$: the shell sets math and words as separate boxes, so a comma
  // there could wrap onto its own line. hlFix (below) joins the last two words with a no-break space (core keeps them
  // in one word box) so a wrapped line never ends on a single word, and makes hyphens inside words no-break hyphens
  // and gives an en dash between letters a word joiner, so a reduced-motion headline (plain inline text) wraps like
  // the animated one (one box per word).
  // Claims and numbers: the brief (§1, Def. 3.4, Prop. 3.3, Eq. 13 and 16, Table 13).
  const NB = ' ', NH = '‑';
  const HL = [
    {
      t: 'Rectified LpJEPA trains self-supervised encoders whose features match a sparse, maximum-entropy target.',
      l: 'The target is a Rectified Generalized Gaussian: a ReLU turns everything below zero (dotted) into a spike of exact zeros (blue), and the mean shift $\\mu$ sets its size. The rest stays as spread out (informative) as possible.',
      s: 'The target is a Rectified Generalized Gaussian: a ReLU turns everything below zero (dotted) into a spike of exact zeros (blue), and the mean shift $\\mu$ sets its size.',
      m: 'A ReLU turns everything below zero (dotted) into exact zeros: the blue spike.',
    },
    {
      t: `Two distributions are equal exactly when all their 1-D projections${NB}are${NB}equal.`,
      s: 'So a high-dimensional match can be checked one line at a time (Cramér–Wold). Drag the line $c$ to pick one: blue is the target, black a toy encoder’s features, the ring their mismatch.',
      m: 'Drag the line $c$ to turn the slice. Blue: the target; black: a toy encoder’s features.',
    },
    {
      t: `Training matches features to the target along many random${NB}1-D${NB}slices.`,
      s: 'Each slice is sorted and paired rank by rank (RDMReg). On this loss alone, a toy ReLU encoder’s features settle onto the axes (exact zeros) and the mismatch ring shrinks.',
      m: 'Trained this way, a toy ReLU encoder’s features snap onto the axes.',
    },
    {
      t: 'The mean shift $\\mu$ is a dial that sets what share of features are exactly zero.',
      s: 'Top: feature vectors (blue = non-zero, empty = exactly zero). Bottom: the non-zero share as $\\mu$ moves: theory (line) and trained ViT-S networks (squares), which sit denser.',
      m: 'Top: features (blue = non-zero). Bottom: theory vs. trained.',
    },
    {
      t: 'Features can be 97.8% zeros while the encoder loses only 3.8 accuracy points.',
      s: 'Linear-probe accuracy of a ViT-S on ImageNet-100 (Table 13) as $\\mu$ makes the code sparser. Black: the encoder, 3.8 below its best; blue: the sparse projector output.',
      m: 'Accuracy as zeros grow (ViT-S). Black: encoder; blue: projector.',
    },
  ];
  const hlFix = s => s.split(/(\$[^$]+\$)/g).map(seg => (seg[0] === '$' ? seg
    : seg.replace(/(\w)-(?=\w)/g, '$1' + NH).replace(/(\w)–(?=\w)/g, '$1–⁠'))).join('').replace(/ ([^ $]+)$/, NB + '$1');
  HL.forEach(o => { for (const k of ['t', 'l', 's', 'm']) if (o[k]) o[k] = hlFix(o[k]); });
  const DUR = [16, 15, 17, 14, 16];      // autoplay seconds per step (steps 1 and 5 carry the longest headlines)
  const LAYER = [0, 1, 1, 2, 3];         // steps 1 and 2 share the 2-D drawing
  const IDLE = 16;                        // seconds without input before autoplay resumes
  const MU_DEF = [-0.5, 0, 0, null, null]; // default µ per step while the viewer has not set one (−0.5 = Fig. 5)
  const P_OPTS = [0.5, 1, 2];
  const PM_DUR = 0.9;                     // seconds for a shape-p morph

  // legend swatches (inline SVG, 24×12)
  const SVG = inner => `<svg class="lpj-sw" viewBox="0 0 24 12" aria-hidden="true">${inner}</svg>`;
  const SW = {
    ghost: SVG('<line x1="0" y1="6" x2="24" y2="6" stroke="#999" stroke-width="1" stroke-dasharray="2 3"/>'),
    solid: SVG('<line x1="0" y1="6" x2="24" y2="6" stroke="#000" stroke-width="1.6"/>'),
    dash: SVG('<line x1="0" y1="6" x2="24" y2="6" stroke="#555" stroke-width="1" stroke-dasharray="4 3"/>'),
    mass: SVG('<line x1="12" y1="12" x2="12" y2="4.5" stroke="#1432F5" stroke-width="2"/><circle cx="12" cy="4" r="3.3" fill="#1432F5"/>'),
    accDot: SVG('<circle cx="12" cy="6" r="3" fill="#1432F5"/>'),
    inkDot: SVG('<circle cx="12" cy="6" r="2.5" fill="#000"/>'),
    band: SVG('<path d="M2 11 V7 M8 11 V4.5 M14 11 V8 M20 11 V5.5" stroke="#bbb" stroke-width="1"/><path d="M0 7 C5 3 9 3 12 6 S19 7 24 4" stroke="rgba(20,50,245,.6)" stroke-width="1" fill="none"/>'),
    acc: SVG('<line x1="0" y1="6" x2="24" y2="6" stroke="#1432F5" stroke-width="2"/>'),
    sq: SVG('<rect x="8.5" y="2.5" width="7" height="7" fill="#fff" stroke="#000" stroke-width="1"/>'),
    dia: SVG('<path d="M12 1 L17 6 L12 11 L7 6 Z" fill="#1432F5"/>'),
  };

  const CSS = `
  .scene--lpjepa .lpj-ov { position:absolute; inset:0; pointer-events:none; z-index:2; overflow:hidden; }
  .scene--lpjepa .lpj-l { position:absolute; left:0; top:0; white-space:nowrap; font-size:12px; line-height:16px;
    letter-spacing:.02em; color:#444; opacity:0; font-variant-numeric:tabular-nums; transition:color .4s ease; }
  .scene--lpjepa .lpj-l .katex { font-size:var(--kx,15px); letter-spacing:0; line-height:1.15; }
  .scene--lpjepa .lpj-l .kx { display:inline-block; }
  .scene--lpjepa .lpj-l.ko { background:#fff; padding:0 4px; }
  .scene--lpjepa .lpj-l.box { background:#fff; padding:4px 6px 4px 4px; margin:-4px 0 0 -4px; }
  .scene--lpjepa .lpj-nw { white-space:nowrap; }
  .scene--lpjepa .lpj-l .kick { color:#555; letter-spacing:.06em; }
  .scene--lpjepa .lpj-l .dim { color:#555; }
  .scene--lpjepa .lpj-l .ink { color:#000; }
  .scene--lpjepa .lpj-l .acc { color:var(--accent); }
  .scene--lpjepa .lpj-l .ink, .scene--lpjepa .lpj-l .dim { transition:color .5s ease; }
  .scene--lpjepa .lpj-l.hi .ink { color:var(--accent); }
  .scene--lpjepa .lpj-l .wrap { white-space:normal; line-height:17px; }
  .scene--lpjepa .lpj-row { display:flex; align-items:center; gap:9px; min-height:22px; }
  .scene--lpjepa .lpj-row .dim { margin-left:1px; }
  .scene--lpjepa .lpj-wrap { display:flex; flex-wrap:wrap; column-gap:18px; row-gap:0; white-space:normal; }
  .scene--lpjepa .lpj-it { display:inline-flex; align-items:center; gap:7px; min-height:22px; white-space:nowrap; }
  .scene--lpjepa .lpj-grid { display:grid; grid-template-columns:auto auto; column-gap:22px; }
  .scene--lpjepa .lpj-sw { width:24px; height:12px; flex:none; overflow:visible; }
  .scene--lpjepa .lpj-tbl { border-collapse:collapse; }
  .scene--lpjepa .lpj-tbl td, .scene--lpjepa .lpj-tbl th { padding:0 0 0 18px; height:20px; text-align:right; font-weight:400; white-space:nowrap; }
  .scene--lpjepa .lpj-tbl td:first-child, .scene--lpjepa .lpj-tbl th:first-child { padding-left:0; text-align:left; }
  .scene--lpjepa .lpj-tbl th { color:#555; height:22px; vertical-align:bottom; padding-bottom:4px; border-bottom:1px solid #ddd; }
  .scene--lpjepa .lpj-tbl tr:nth-child(2) td { padding-top:4px; }
  .scene--lpjepa .lpj-tbl tr.sep td { border-top:1px solid #eee; }
  .scene--lpjepa .lpj-tbl th.acc, .scene--lpjepa .lpj-tbl td.acc { color:var(--accent); }
  .scene--lpjepa .lpj-tbl td.ink { color:#000; }
  .scene--lpjepa .lpj-tbl tr.off td { color:#555; }
  .scene--lpjepa .lpj-tbl tr.on td { color:#000; }
  .scene--lpjepa .lpj-tbl tr.on td.z { animation:lpjAcc .6s ease both; }
  .scene--lpjepa .lpj-tbl.hl td:first-child, .scene--lpjepa .lpj-tbl.hl th:first-child { padding-left:8px; box-shadow:inset 2px 0 0 transparent; transition:box-shadow .3s ease; }
  .scene--lpjepa .lpj-tbl.hl tr.on td:first-child { box-shadow:inset 2px 0 0 var(--accent); }
  .scene--lpjepa.lpj-rm .lpj-tbl tr.on td.z { animation:none; color:var(--accent); }
  @keyframes lpjAcc { from { color:#555; } to { color:var(--accent); } }
  .scene--lpjepa .lpj-l.tipbox { background:#fff; border:1px solid #000; padding:6px 9px; color:#000; line-height:18px; }
  .scene--lpjepa .lpj-tag { position:absolute; left:0; top:0; font-size:12px; line-height:15px; letter-spacing:.02em;
    color:#555; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .35s ease, color .15s ease;
    z-index:3; padding:3px 0; text-decoration:none; }
  .scene--lpjepa .lpj-tag:not(.on) { transition-duration:.12s, .15s; } /* leave fast: never under the next step's text */
  .scene--lpjepa .lpj-tag.on { opacity:1; pointer-events:auto; }
  .scene--lpjepa .lpj-tag span { border-bottom:1px solid #aaa; transition:border-color .15s ease; }
  .scene--lpjepa .lpj-tag:hover { color:var(--accent); }
  .scene--lpjepa .lpj-tag:hover span { border-color:var(--accent); }
  .scene--lpjepa .lpj-nav { position:absolute; left:4px; top:70px; display:none;
    align-items:center; gap:0; font-size:12px; line-height:15px; letter-spacing:.02em; white-space:nowrap; z-index:3; }
  .scene--lpjepa .lpj-nav button { min-width:40px; min-height:40px; display:inline-flex; align-items:center; justify-content:center;
    padding:0 10px; color:var(--ink); font-size:15px; }
  .scene--lpjepa .lpj-nav .lbl { position:relative; display:inline-block; min-width:180px; text-align:center; }
  .scene--lpjepa .lpj-nav .lbl b { font-weight:400; color:#555; }
  .scene--lpjepa .lpj-nav .lpj-bar { position:absolute; left:50%; bottom:-7px; width:64px; margin-left:-32px; }
  @media (max-width: 800px) { .scene--lpjepa .lpj-nav { display:flex; } }
  /* shared step counter (top-right, on the chrome's 40 px gutter): "01 / 05 · Step", a progress hairline, the play state */
  .scene--lpjepa .lpj-ctr { position:absolute; right:40px; top:72px; z-index:3; text-align:right; font-size:12px; line-height:15px;
    letter-spacing:.02em; color:#555; white-space:nowrap; pointer-events:none; font-variant-numeric:tabular-nums; }
  .scene--lpjepa .lpj-ctr .lpj-bar { margin:5px 0 6px auto; }
  .scene--lpjepa .lpj-ctr .s { pointer-events:auto; color:#555; font-size:12px; line-height:15px; letter-spacing:.02em; }
  .scene--lpjepa .lpj-ctr .s:hover { color:var(--accent); }
  .scene--lpjepa .lpj-bar { display:block; position:relative; width:64px; height:1px; background:#ddd; overflow:hidden; }
  .scene--lpjepa .lpj-bar i { position:absolute; left:0; top:0; width:100%; height:1px; background:#000; transform-origin:0 0; transform:scaleX(0); }
  @media (max-width: 800px) { .scene--lpjepa .lpj-ctr { display:none; } }
  `;

  Site.register({
    id: 'lpjepa', n: 2, title: 'Rectified LpJEPA', path: '/lpjepa',
    caption: CAPS[0],
    create(el, api) {
      const C = api.colors, F = api.fonts, au = api.audio, reduced = !!api.reduced;
      const acc = a => `rgba(20,50,245,${a})`;
      const ink = a => `rgba(0,0,0,${a})`;
      const FM = s => `${s}px ${F.mono}`;
      const h = Site.h;
      const T2 = '#444', T3 = '#555', TK = '#666', TG = '#999'; // secondary / tertiary text, tick numerals, guides

      /* ------------------------------------------------------------ DOM */
      const style = document.createElement('style');
      style.textContent = CSS;
      el.append(style);
      if (reduced) el.classList.add('lpj-rm');
      const cv = api.canvas();
      const ctx = cv.ctx;
      cv.canvas.style.touchAction = 'none';
      const OV = h('div', { class: 'lpj-ov', 'aria-hidden': 'true' });
      el.append(OV);

      /* ------------------------------------------------------------ KaTeX + HTML label overlay */
      const TXC = new Map();
      const GR_ = { mu: 'µ', sigma: 'σ', theta: 'θ', Phi: 'Φ', phi: 'φ', top: 'ᵀ', Longleftrightarrow: '⟺', to: '→', sim: '~', times: '×', uparrow: '↑', infty: '∞', forall: '∀', max: 'max', big: '', Big: '' };
      // readable plain text when KaTeX is unavailable (CDN slow or offline): never shown as raw LaTeX, never cached
      const texFallback = s => String(s)
        .replace(/\\(?:mathrm|mathbf|mathbb|text|operatorname)\{([^}]*)\}/g, '$1')
        .replace(/\\tfrac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
        .replace(/\\\|/g, '‖').replace(/\^\{?\\top\}?/g, 'ᵀ')
        .replace(/\\([A-Za-z]+)/g, (m, g) => (GR_[g] != null ? GR_[g] : ''))
        .replace(/\\[,;!: ]/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
      function TX(latex) {
        if (!window.katex) return esc(texFallback(latex));
        let s = TXC.get(latex);
        if (s === undefined) {
          try { s = Site.texHTML ? Site.texHTML(latex) : esc(texFallback(latex)); } catch (e) { s = esc(texFallback(latex)); }
          if (TXC.size > 900) TXC.clear();
          TXC.set(latex, s);
        }
        return s;
      }
      const K = (latex, px) => (px ? `<span class="kx" style="--kx:${px}px">${TX(latex)}</span>` : TX(latex));
      const LB = new Map(), used = new Set();
      let LA = 1, LY = 0; // alpha and y offset of the layer being drawn
      function rec(key) {
        let r = LB.get(key);
        if (!r) { r = { el: h('div', { class: 'lpj-l' }), html: null, tf: '', op: '0', col: '', cls: '', st: '' }; OV.append(r.el); LB.set(key, r); }
        return r;
      }
      function prime(key, html, st) {
        const r = rec(key);
        if (html !== r.html) { r.el.innerHTML = html; r.html = html; }
        if ((st || '') !== r.st) { r.el.style.cssText = (r.tf ? `transform:${r.tf};` : '') + `opacity:${r.op};` + (r.col ? `color:${r.col};` : '') + (st || ''); r.st = st || ''; }
        return r;
      }
      // sizes are cached per (html, style, class, layout pass): reading offsetWidth every frame would force a layout
      let MV = 0;
      function measure(key) {
        const r = LB.get(key);
        if (!r) return { w: 0, h: 0 };
        if (r.mHtml !== r.html || r.mSt !== r.st || r.mCls !== r.cls || r.mV !== MV) {
          r.mw = r.el.offsetWidth; r.mh = r.el.offsetHeight; r.mHtml = r.html; r.mSt = r.st; r.mCls = r.cls; r.mV = MV;
        }
        return { w: r.mw, h: r.mh };
      }
      // place an HTML label: (x, y) is the anchor, ax/ay the anchor fraction of the label box
      function lab(key, html, x, y, o) {
        o = o || {};
        const r = prime(key, html, o.st);
        const ax = o.ax || 0, ay = o.ay == null ? 0.5 : o.ay;
        const tf = `translate(${Math.round(x)}px,${Math.round(y + LY)}px) translate(${-ax * 100}%,${-ay * 100}%)`;
        if (tf !== r.tf) { r.el.style.transform = tf; r.tf = tf; }
        const a = LA * (o.alpha == null ? 1 : o.alpha);
        const op = a >= 0.995 ? '1' : a <= 0.005 ? '0' : a.toFixed(3);
        if (op !== r.op) { r.el.style.opacity = op; r.op = op; }
        const col = o.color || '';
        if (col !== r.col) { r.el.style.color = col; r.col = col; }
        const cls = o.cls || '';
        if (cls !== r.cls) { r.el.className = cls ? 'lpj-l ' + cls : 'lpj-l'; r.cls = cls; }
        used.add(key);
        return r;
      }
      function labFlush() {
        for (const [k, r] of LB) if (!used.has(k) && r.op !== '0') { r.el.style.opacity = '0'; r.op = '0'; }
        used.clear();
      }

      /* ------------------------------------------------------------ state */
      const S = {
        step: 0, sceneT: 0, rt: 0, stepT0: 0, paused: false, lastUser: -1e9, lastRot: -1e9, lastMuUser: -1e9,
        mu: -0.5, p: 2, pUser: false, muUser: false, muAnim: null, pAt: -1e9,
        theta: 0, drag: null, dragVel: 0, detent: 0, hoverDial: false,
        rot: { mode: 'hold', t0: 0, from: 0, to: 0 },
        vis: [1, 0, 0, 0], sliceT0: 0,
        sweep: null, mouse: null, tip: null,
        a13: 0.4, t5y: T5.l0[0], ring0: 0, ringMax0: 0, trainAcc: 0, hinted: false, rmTrain: 0, rmMuAt: 0,
      };
      // shape-p morph: curves are evaluated at pNow(); sample arrays interpolate with pE()
      const PM = { from: 2, t0: -1e9 };
      const pE = () => (reduced ? 1 : easeIO((S.rt - PM.t0) / PM_DUR));
      const pNow = () => { const e = pE(); return e >= 1 ? S.p : Math.exp(lerp(Math.log(PM.from), Math.log(S.p), e)); };
      function Morph(n, gen) { // quantile-coupled samples: each value glides from its old-p to its new-p position
        const cache = {}, cur = new Float64Array(n), snap = new Float64Array(n);
        const m = { cur, changed: true, settled: null };
        m.target = p => cache[p] || (cache[p] = gen(p));
        m.update = () => {
          const e = pE(), tgt = m.target(S.p);
          if (e >= 1) {
            if (m.settled !== S.p) { cur.set(tgt); m.settled = S.p; m.changed = true; } else m.changed = false;
            return;
          }
          for (let i = 0; i < n; i++) cur[i] = snap[i] + (tgt[i] - snap[i]) * e;
          m.settled = null; m.changed = true;
        };
        m.freeze = () => { m.update(); snap.set(cur); m.settled = null; };
        return m;
      }

      /* ------------------------------------------------------------ controls */
      const stepper = api.stepper({ items: STEPS, index: 0, onSelect: i => { touch(); goStep(i, true); } });
      const slider = api.slider({
        min: -3, max: 1, step: 0.05, value: S.mu,
        label: v => `µ = ${fmt(v, 2)}`,
        left: 'sparse', right: 'dense',
        onInput(v) { touch(); S.lastMuUser = S.sceneT; S.muUser = true; S.sweep = null; S.muAnim = null; applyMu(Math.round(v * 20) / 20, true); patchSlider(true); },
      });
      const slLab = slider.el.querySelector('.slider__label');
      let slHTML = '';
      function patchSlider(force) { // core writes the label as text; re-typeset µ with KaTeX (zeros follow the p morph)
        if (!slLab) return;
        const p = pE() >= 1 ? S.p : pNow();
        // "target": the closed-form share of the RGN_p target (measured rows elsewhere say "measured")
        const html = `<span style="font-size:13px">${TX('\\mu')}</span> = ${fmt(S.mu, 2)} · ${L.mob ? '' : 'target '}${pct(1 - activeFrac(p, S.mu))} zeros`;
        if (force || html !== slHTML) { slLab.innerHTML = html; slHTML = html; }
      }
      function sliderSet(v) { slider.set(v); patchSlider(true); }
      // ↑/↓ always step the stepper (the site convention), even while the slider track has focus
      slider.el.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault(); e.stopPropagation();
        touch(); goStep(S.step + (e.key === 'ArrowDown' ? 1 : -1), true);
      }, true);
      const slTrack = slider.el.querySelector('.slider__track');
      if (slTrack) slTrack.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { try { slTrack.blur(); } catch (_) {} } });

      // shape p: three glyph buttons (each glyph is the unit-variance GN_p density it selects)
      function glyph(p) {
        const s = sigmaGN(p), pk = gnPdf(p, 0, s, 0);
        let d = '';
        for (let i = 0; i <= 48; i++) {
          const x = -3 + (6 * i) / 48, y = gnPdf(p, 0, s, x) / pk;
          d += (i ? 'L' : 'M') + (1 + (26 * i) / 48).toFixed(2) + ' ' + (13 - 11.5 * y).toFixed(2);
        }
        return `<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true" style="display:block;overflow:visible"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>`;
      }
      const pBox = h('div', { style: 'display:flex;align-items:flex-end;gap:5px;white-space:nowrap;font-size:12px;line-height:15px;letter-spacing:.02em' });
      const pLab = h('span', { style: 'color:#444;padding-bottom:2px;margin-right:2px' });
      pLab.innerHTML = `shape <span style="font-size:13px">${TX('p')}</span>`;
      pBox.append(pLab);
      const pBtns = P_OPTS.map(pv => {
        const b = h('button', { type: 'button', 'aria-label': `shape p = ${fmtP(pv)}`, title: `p = ${fmtP(pv)} · press P to cycle`, style: 'display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;min-width:40px;min-height:40px;padding:2px 4px 0;color:#666;cursor:pointer;transition:color .2s ease;font-size:12px;line-height:15px' });
        b.innerHTML = glyph(pv) + `<span style="border-bottom:1px solid transparent;padding-bottom:1px;transition:border-color .2s ease">${fmtP(pv)}</span>`;
        b.addEventListener('click', e => { touch(); changeP(pv, true); if (e.detail > 0) b.blur(); }); // mouse: no lingering focus ring
        b.addEventListener('pointerenter', () => { b.style.color = C.accent; try { au && au.ui && au.ui.hover(); } catch (e) {} });
        b.addEventListener('pointerleave', () => { renderP(); });
        pBox.append(b);
        return b;
      });
      try { (stepper.el.parentNode || el).append(pBox); } catch (e) { el.append(pBox); }
      function renderP() {
        pBtns.forEach((b, i) => {
          const on = P_OPTS[i] === S.p;
          b.style.color = on ? '#000' : '#666';
          if (b.lastChild && b.lastChild.style) b.lastChild.style.borderBottomColor = on ? '#000' : 'transparent';
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }

      // mobile step navigation (the stepper is hidden < 800px)
      const nav = h('div', { class: 'lpj-nav' });
      const navPrev = h('button', { type: 'button', 'aria-label': 'Previous step', text: '‹' });
      const navLbl = h('span', { class: 'lbl' });
      const navTxt = h('span');
      const navBar = h('span', { class: 'lpj-bar' }, h('i'));
      navLbl.append(navTxt, navBar);
      const navNext = h('button', { type: 'button', 'aria-label': 'Next step', text: '›' });
      navPrev.addEventListener('click', () => { touch(); goStep(S.step - 1, true); });
      navNext.addEventListener('click', () => { touch(); goStep(S.step + 1, true); });
      nav.append(navPrev, navLbl, navNext);
      el.append(nav);

      // step counter (desktop), shared across scenes: "03 / 05 · Slice & train", a progress hairline for the
      // current step's autoplay time, and the play state (a button: it toggles pause like Space)
      const pad2 = n => String(n).padStart(2, '0');
      const ctr = h('div', { class: 'lpj-ctr' });
      const ctrTxt = h('div');
      const ctrBar = h('span', { class: 'lpj-bar' }, h('i'));
      const ctrState = h('button', { type: 'button', class: 's' });
      ctr.append(ctrTxt, ctrBar, ctrState);
      el.append(ctr);
      ctrState.addEventListener('click', e => { togglePause(); if (e.detail > 0) ctrState.blur(); });
      ctrState.addEventListener('pointerenter', () => { try { au && au.ui && au.ui.hover(); } catch (e) {} });
      const ctrFill = [ctrBar.firstChild, navBar.firstChild];
      const CTR = { txt: '', nav: '', st: '', f: -1, c: '' };
      const ctrLabel = i => `${pad2(i + 1)} / ${pad2(STEPS.length)} · ${STEPS[i]}`;
      const ctrStateText = () => (S.paused ? 'paused · [space]' : !reduced && S.sceneT - S.lastUser > IDLE ? 'autoplay' : 'interactive');
      function renderCtr() {
        const st = S.sceneT - S.stepT0;
        const auto = !S.paused && !reduced && S.sceneT - S.lastUser > IDLE;
        const t = L.ctrShort ? `${pad2(S.step + 1)} / ${pad2(STEPS.length)}` : ctrLabel(S.step);
        if (t !== CTR.txt) { ctrTxt.textContent = t; CTR.txt = t; }
        const s = ctrStateText();
        if (s !== CTR.st) { ctrState.textContent = s; ctrState.setAttribute('aria-label', S.paused ? 'Resume autoplay' : 'Pause'); CTR.st = s; }
        if (CTR.nav !== S.step) {
          navTxt.textContent = '';
          navTxt.append(h('b', { text: `${pad2(S.step + 1)} / ${pad2(STEPS.length)} · ` }), STEPS[S.step]);
          CTR.nav = S.step;
        }
        const f = Math.round(clamp(st / DUR[S.step], 0, 1) * 200) / 200, c = auto ? '#000' : '#999';
        if (f !== CTR.f) { for (const i of ctrFill) i.style.transform = `scaleX(${f})`; CTR.f = f; }
        if (c !== CTR.c) { for (const i of ctrFill) i.style.background = c; CTR.c = c; }
      }

      // hover-reveal tags: the real figures from the paper
      const PAPER = 'https://arxiv.org/abs/2602.01456';
      function mkTag(text, opts, steps) {
        const a = h('a', { class: 'lpj-tag', href: PAPER, target: '_blank', rel: 'noopener' }, h('span', { text }), ' ↗');
        el.append(a);
        api.reveal(a, opts); // the anchor itself opens the paper
        return { el: a, steps, on: false };
      }
      const FIG3 = { src: 'site/img/projects/lpjepa-fig3.jpg', title: 'Fig. 3 · rectification, sparsity dial, Pareto', meta: 'paper', width: 520 };
      const tags = [
        mkTag('fig. 5', { src: 'site/img/projects/lpjepa-fig5.jpg', title: 'Fig. 5 · GN, TGN, RGN densities', meta: 'mean −0.5, scale 1 (the scene uses unit variance)', width: 480 }, [0]),
        mkTag('fig. 1b', { src: 'site/img/projects/lpjepa.jpg', title: 'Fig. 1b · slices of a Gaussian vs its ReLU', meta: 'paper', width: 300 }, [1]),
        mkTag('fig. 14', { src: 'site/img/projects/lpjepa-fig14.jpg', title: 'Fig. 14 · real training curves', meta: 'CIFAR-100 · 1000 epochs', width: 440 }, [2]),
        mkTag('fig. 3', FIG3, [3]),
        mkTag('fig. 3', FIG3, [4]),
      ];
      function posTag(t, x, y, ax, ay) {
        t.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(${-(ax || 0) * 100}%, ${-(ay == null ? 0.5 : ay) * 100}%)`;
      }

      api.links([
        { label: 'paper', href: 'https://arxiv.org/abs/2602.01456' },
        { label: 'code', href: 'https://github.com/YilunKuang/rectified-lp-jepa' },
        { label: 'blog', href: 'https://yilunkuang.github.io/blog/2026/rectified-lp-jepa/' },
        { label: 'lpjepa.com', href: 'https://lpjepa.com' },
      ]);

      /* ------------------------------------------------------------ HTML blocks (typeset lazily, on first use) */
      const memo = f => { let v; return () => (v === undefined ? (v = f()) : v); };
      const legRow = (sw, tex, words) => `<div class="lpj-row">${sw}${K(tex)}${words ? `<span class="dim">${words}</span>` : ''}</div>`;
      const item = (sw, inner) => `<span class="lpj-it">${sw}${inner}</span>`;
      const RE_BALL = memo(() => `<div style="text-align:right">${K('\\|x\\|_p = 1', 15)}</div><div class="dim" style="text-align:right">max entropy · Prop. 3.3</div>`);
      const RE_LEG = memo(() => legRow(SW.ghost, '\\mathrm{GN}_p(\\mu,\\sigma)', 'before the ReLU')
        + legRow(SW.solid, '\\mathrm{RGN}_p', 'continuous part')
        + legRow(SW.dash, '\\mathrm{TGN}_p', 'truncated, max entropy')
        + legRow(SW.mass, '\\Phi_p(-\\mu/\\sigma)', 'point mass at 0'));
      const RE_LEG_N = memo(() => legRow(SW.ghost, '\\mathrm{GN}_p(\\mu,\\sigma)', '') + legRow(SW.solid, '\\mathrm{RGN}_p', '')
        + legRow(SW.dash, '\\mathrm{TGN}_p', '') + legRow(SW.mass, '\\Phi_p(-\\mu/\\sigma)', ''));
      const RE_LEG_M = memo(() => `<div class="lpj-wrap" style="column-gap:14px">${item(SW.ghost, K('\\mathrm{GN}_p'))}${item(SW.solid, K('\\mathrm{RGN}_p'))}${item(SW.dash, K('\\mathrm{TGN}_p'))}${item(SW.mass, K('\\Phi_p(-\\mu/\\sigma)'))}</div>`);
      // the sampling rule carries its source on the same line when it fits; otherwise "Algorithm 1" takes its own
      // line (no dangling separator)
      const RE_F1 = memo(() => `<div>${K('f(x) = \\Phi_p(-\\mu/\\sigma)\\,\\mathbf{1}\\{x=0\\} + \\mathrm{GN}_p(x;\\mu,\\sigma)\\,\\mathbf{1}\\{x>0\\}', 17)}</div>`);
      const RE_RULE = memo(() => `<div class="lpj-nw" style="margin-top:7px">${K('y = \\max\\!\\big(0,\\ \\mu + \\sigma S\\,(pG)^{1/p}\\big),\\ \\ S=\\pm 1,\\ G\\sim\\mathrm{Gamma}(1/p,1)', 14)}<span class="dim">  · Algorithm 1</span></div>`);
      const RE_RULE2 = memo(() => `<div style="margin-top:7px">${K('y = \\max\\!\\big(0,\\ \\mu + \\sigma S\\,(pG)^{1/p}\\big),\\ \\ S=\\pm 1,\\ G\\sim\\mathrm{Gamma}(1/p,1)', 14)}</div><div class="dim" style="margin-top:1px">Algorithm 1</div>`);
      const RE_F = inline => RE_F1() + (inline ? RE_RULE() : RE_RULE2());
      // the target's name and live parameters on one line under the headline (which says what it is and why);
      // v = 1 drops the source note where the line would not fit the plot width
      function reHeadHTML(v) {
        const settled = pE() >= 1, p = settled ? S.p : pNow(), mob = L.mob;
        const name = !settled ? '' : S.p === 2 ? 'Gaussian' : S.p === 1 ? 'Laplace' : '';
        const sep = '<span class="dim"> · </span>';
        return `<div class="lpj-nw">${K('\\mathrm{RGN}_p(\\mu,\\sigma)', 17)}<span class="dim">${mob ? ' ' : '  '}</span>`
          + `${K(settled ? `p = ${fmtP(p)}` : `p \\to ${fmtP(S.p)}`)}${name && !mob ? `<span class="dim"> ${name}</span>` : ''}${sep}${K('\\mu =')}<span class="ink"> ${fmt(S.mu, 2)}</span>${sep}${K(mob ? '\\sigma =' : '\\sigma = \\sigma_{\\mathrm{GN}}(p) =')}<span class="ink"> ${sigmaGN(p).toFixed(3)}</span>`
          + `${!mob && !v ? '<span class="dim">  · Def. 3.4</span>' : ''}</div>`;
      }
      // Cramér–Wold as math (Eq. 13) under the headline that says it in words, then what the marks mean.
      // Widest first: the statement breaks only at ⟺ and the legend rows never wrap, so narrow boxes get shorter
      // words instead of a line broken mid-equation (layout picks the first that fits). `compact` (short screens):
      // the legend is one wrapped row. The parts are kept apart so the figure tag can ride on the first one that
      // leaves it room.
      const CW_V = {}, CW_L1 = '\\mathrm{law}(z)=\\mathrm{law}(y)', CW_L2 = '\\Longleftrightarrow\\;\\mathrm{law}(c^{\\top}z)=\\mathrm{law}(c^{\\top}y)';
      const cwEvery = v => (v >= 3 ? '\\ \\text{ for all } c' : '\\ \\text{ for every direction } c');
      const cwRow = (sw, tex, words) => `<div class="lpj-row lpj-nw">${sw}${K(tex)}<span class="dim">${words}</span></div>`;
      // the statement is set a size under the headline's title (17 px, the label's #444), so the headline clearly leads
      function cwParts(v, compact) {
        const key = v + (compact ? 'c' : '');
        if (CW_V[key]) return CW_V[key];
        const line1 = `<div class="lpj-nw">${v === 0 ? K(`${CW_L1}\\;${CW_L2}${cwEvery(0)}`, 17) : K(CW_L1, 17)}</div>`;
        const line2 = v === 0 ? '' : `<div class="lpj-nw" style="margin-top:2px">${K(v === 4 ? CW_L2 + '\\ \\forall c' : CW_L2 + cwEvery(v), 17)}</div>`;
        const one = compact || v === 4;
        const stmt = `<div style="margin:0 0 ${one ? 6 : 8}px">${line1}${line2}</div>`;
        const short = v >= 2;
        const rows = one ? [compact && v < 4 ? CW_HEAD_C() : CW_HEAD_M()] : [
          cwRow(SW.accDot, 'y\\sim\\mathrm{RGN}_p(\\mu,\\sigma)', short ? 'target' : 'target samples'),
          cwRow(SW.inkDot, 'z=\\mathrm{ReLU}(Wx+b),\\ x\\sim\\mathrm{GN}_p(0,I)', short ? 'encoder' : 'toy encoder'),
          cwRow(SW.band, 'W_2^2(\\theta)', short ? 'all zero: same law' : 'per direction · all zero means same law'),
        ];
        return (CW_V[key] = { line1, line2, stmt, row1: rows[0], html: stmt + rows.join('') });
      }
      const cwHeadHTML = (v, compact) => cwParts(v, compact).html;
      const CW_HEAD_M = memo(() => `<div class="lpj-wrap" style="column-gap:14px">${item(SW.accDot, `${K('y')}<span class="dim">target</span>`)}${item(SW.inkDot, `${K('z')}<span class="dim">embeddings</span>`)}${item(SW.band, K('W_2^2(\\theta)'))}</div>`);
      const CW_HEAD_C = memo(() => `<div class="lpj-wrap" style="column-gap:16px">${item(SW.accDot, `${K('y\\sim\\mathrm{RGN}_p(\\mu,\\sigma)')}<span class="dim">target</span>`)}${item(SW.inkDot, `${K('z')}<span class="dim">embeddings</span>`)}${item(SW.band, `${K('W_2^2(\\theta)')}<span class="dim">per direction</span>`)}</div>`);
      const WHY = memo(() => `<div class="kick">WHY SORT</div><div class="wrap" style="margin-top:6px">Rectified slices change shape with ${K('\\theta', 14)}, so each is matched by sorting.</div>`);
      function t1HTML(p, w) {
        let s = `<div class="kick" style="margin-bottom:2px">TABLE 1 · IMAGENET-100 · RESNET-50</div>`;
        s += `<table class="lpj-tbl hl" style="width:${w}px"><tr><th></th><th>top-1</th><th>zeros</th></tr>`;
        T1.forEach((r, i) => {
          const ours = r.p != null, on = ours && r.p === p;
          const cls = [i === 6 ? 'sep' : '', ours ? (on ? 'on' : 'off') : ''].join(' ').trim();
          const name = ours ? K(`\\mathrm{RGN}_{${r.p}}(${r.mu})`, 14) : esc(r.n);
          s += `<tr class="${cls}"><td>${name}</td><td>${r.acc}</td><td class="z">${r.z}</td></tr>`;
        });
        s += '</table>';
        s += T1.some(r => r.p === p)
          ? `<div class="wrap" style="width:${w}px;margin-top:8px">Best encoder top-1 at 13–27% zeros; 82.72% at 99% zeros.</div>`
          : `<div class="wrap ink" style="width:${w}px;margin-top:8px">No ${K(`p = ${fmtP(p)}`, 14)} run in Table 1; rows shown at ${K('p = 1, 2', 14)}.</div>`;
        return s;
      }
      function t5HTML(p, w) {
        let s = `<div class="kick" style="margin-bottom:2px">TABLE 5 · CIFAR-100 · ${K('\\mu = 0', 14)}</div>`;
        s += `<table class="lpj-tbl hl" style="width:${w}px"><tr><th>${K('p', 14)}</th><th>zeros</th><th>enc.</th><th>proj.</th></tr>`;
        T5.p.forEach((pv, i) => {
          const on = pv === p;
          s += `<tr class="${on ? 'on' : ''}"><td>${fmtP(pv)}</td><td class="z">${pct(1 - T5.l0[i])}</td><td>${T5.enc[i].toFixed(2)}</td><td>${T5.proj[i].toFixed(2)}</td></tr>`;
        });
        s += '</table>';
        // Table 5 measured µ = 0 only (in theory, with σ_GN, lower p is sparser only for µ < 0)
        s += `<div class="wrap dim" style="width:${w}px;margin-top:8px">Lower ${K('p', 14)}: sparser at ${K('\\mu = 0', 14)}, accuracy flat.</div>`;
        return s;
      }
      // one-line Table 5 readout for the selected shape (phones and narrow desktops, where the tables do not fit)
      function plineHTML(p, v) {
        const i = T5.p.indexOf(p);
        if (i < 0) return '';
        const z = pct(1 - T5.l0[i]), e = T5.enc[i].toFixed(2), pr = T5.proj[i].toFixed(2);
        const kx = K(`p=${fmtP(p)},\\ \\mu=0`, 14);
        if (v === 0) return `<span class="dim">Table 5 · CIFAR-100 · </span>${kx}<span class="ink">: ${z} zeros · encoder ${e} · projector ${pr}</span>`;
        if (v === 1) return `<span class="dim">Table 5 · CIFAR-100 · </span>${kx}<span class="ink">: ${z} zeros · enc ${e} · proj ${pr}</span>`;
        if (v === 2) return `<span class="dim">Table 5 · </span>${kx}<span class="ink">: ${z} zeros · enc ${e}</span>`;
        return `<span class="dim">Table 5 · </span>${kx}<span class="ink">: ${z} zeros</span>`;
      }
      function diLegHTML(p, inPlot, short) {
        const pv = fmtP(p), off = p !== 1, t5i = T5.p.indexOf(p), l5 = t5i >= 0 ? T5.l0[t5i].toFixed(3) : '';
        if (L.mob || short) {
          return `<div class="lpj-row">${SW.acc}${K(`p = ${pv}`)}<span class="dim">theory</span></div>`
            + `<div class="lpj-row">${SW.sq}<span class="dim">Table 13</span>${off ? `<span class="ink">${K('p = 1', 14)} only</span>` : ''}</div>`
            + `<div class="lpj-row">${SW.dia}<span class="dim">Table 5</span>${l5 ? `<span class="ink">${l5}</span>` : ''}</div>`;
        }
        const a = `${SW.acc}${K(`p = ${pv}`)}<span class="dim">theory</span>`;
        const b = `${SW.sq}<span class="dim">trained ViT-S · Table 13</span>${off ? `<span class="dim">·</span><span class="ink">measured at ${K('p = 1', 14)} only</span>` : ''}`;
        const c = `${SW.dia}<span class="dim">trained at</span>${K('\\mu = 0')}<span class="dim">· CIFAR-100 · Table 5</span>${l5 ? `<span class="ink">active ${l5}</span>` : ''}`;
        return inPlot ? `<div class="lpj-row">${a}</div><div class="lpj-row">${b}</div><div class="lpj-row">${c}</div>`
          : `<div class="lpj-wrap">${item('', a)}${item('', b)}${item('', c)}</div>`;
      }
      // short phone charts: the legend as one row above the plot (the Table 5 value is in the step 5 readout and on tap);
      // q: name the measured shape (p = 1) beside Table 13 when another shape is selected, if the row still fits
      function diLegRowHTML(p, q) {
        const off = p !== 1;
        return `<div class="lpj-wrap" style="column-gap:12px">${item(SW.acc, `${K(`p = ${fmtP(p)}`)}<span class="dim">theory</span>`)}`
          + `${item(SW.sq, `<span class="dim">Table 13</span>${off && q ? `<span class="ink">${K('p = 1', 14)}</span>` : ''}`)}`
          + `${item(SW.dia, '<span class="dim">Table 5</span>')}</div>`;
      }
      function diRoHTML(long, act) {
        const nAct = Math.round(2048 * act);
        return long
          ? `${K(`\\mathbb{E}\\|z\\|_0 = D\\,\\Phi_p(\\mu/\\sigma) = 2048\\times${act.toFixed(4)} = ${nAct}`, 16)}<span class="ink" style="font-size:13px"> active</span><span class="dim" style="font-size:13px"> · ${pct(1 - act)} exactly zero</span>`
          : `${K('\\mathbb{E}\\|z\\|_0 =', 15)}<span class="ink"> ${nAct} of 2048 active</span><span class="dim"> · ${pct(1 - act)} zero</span>`;
      }
      // Accuracy-cliff x axis: 0–90 % zeros on 60 % of the width, 90–100 % stretched ×6 over the rest (the cliff lives there)
      const ZB = 90, ZF = 0.6, ZE = 100.6;
      const zf = z => (z <= ZB ? (ZF * (z + 4)) / (ZB + 4) : ZF + ((1 - ZF) * (z - ZB)) / (ZE - ZB));
      // one measured row of Table 13 (trained at p = 1): measured zeros beside that run's closed-form target
      function muRowHTML(i, v) {
        const mz = ZEROS13[i].toFixed(1) + '%', tz = pct(1 - activeFrac(1, T13.mu[i]));
        const e = T13.enc[i].toFixed(2), pr = T13.proj[i].toFixed(2), kx = K(`\\mu = ${texNum(T13.mu[i])}`, 14);
        if (v === 0) return `${kx}<span class="ink"> · measured ${mz} zeros </span><span class="dim">(target ${tz})</span><span class="ink"> · encoder ${e} · projector ${pr}</span>`;
        if (v === 1) return `${kx}<span class="ink"> · measured ${mz} zeros </span><span class="dim">(target ${tz})</span><span class="ink"> · enc ${e} · proj ${pr}</span>`;
        return `${kx}<span class="ink"> · ${mz} zeros measured · enc ${e}</span>`;
      }
      const paTagHTML = off => (off ? `<span class="ink">measured at </span>${K('p = 1', 14)}<span class="ink"> only</span>` : `<span class="dim">measured at </span>${K('p = 1', 14)}`);

      /* ------------------------------------------------------------ layout (per layer, computed on first draw after a resize) */
      const L = { ready: false, dirty: [true, true, true, true], mob: false, w: 0, h: 0, hlv: ['s', 's', 's', 's', 's'], hlPh: 'm', arts: null, entering: false };

      /* ------------------------------------------------------------ context headline (api.headline) */
      // Every step's art is laid out under the headline of its layer: the lower bottom of the steps that share the
      // layer (steps 2 and 3 share one drawing, so it never jumps between them). The bottoms are measured ahead of
      // time on a hidden copy with the shell's own headline classes, and corrected by api.onHeadline if they differ.
      // Phones: the step nav sits under the wordmark and the headline under the nav (api.headlineTop), so the ‹ ›
      // buttons never move between steps.
      const NAV_TOP = 52, HL_TOP_M = NAV_TOP + 42; // 94 px: the phone headline top of the other scenes with a step nav
      const HLS = { key: '', top: undefined, b: [0, 0, 0, 0, 0], act: {}, sz: '' };
      const hlSub = (i, v) => { v = v || L.hlv[i]; return v === 'n' ? null : HL[i][v] || HL[i].s; };
      const KX = () => (window.katex ? 1 : 0);
      // without KaTeX (CDN blocked) the headline's $…$ read as plain text (µ, c), never as raw LaTeX
      const hlText = s => (s && !window.katex ? s.replace(/\$([^$]+)\$/g, (m, g) => texFallback(g)) : s);
      const hlKey = i => `lpjepa-${i}-${L.hlv[i]}-${KX()}`;
      // still: a re-wrap for the same step (resize, fonts) swaps the text without replaying the word-by-word entrance
      function setHL(i, force, still) {
        if (i < 0 || i >= HL.length) return;
        const key = hlKey(i);
        HLS.key = key;
        api.headline(hlText(HL[i].t), hlText(hlSub(i)), still ? { key, animate: false } : { key, force: !!force });
      }
      // the shell's markup, rebuilt for measuring (text split at $…$ into KaTeX and words, like core's richHTML)
      const hlProbe = h('div', { class: 'headline-group lpj-hlprobe', 'aria-hidden': 'true' });
      hlProbe.style.cssText = 'display:block;visibility:hidden;pointer-events:none;z-index:-1';
      el.append(hlProbe);
      // exactly like core: text is escaped through the DOM (so U+00A0 becomes &nbsp; and glues its words into one box)
      const escDom = document.createElement('span');
      function hlRich(text) {
        return String(text).split(/(\$[^$]+\$)/g).map(seg => {
          if (seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$') return Site.texHTML(seg.slice(1, -1));
          escDom.textContent = seg;
          return escDom.innerHTML.split(/(\s+)/).map(w => (/^\s+$/.test(w) || !w ? w : `<span class="w">${w}</span>`)).join('');
        }).join('');
      }
      // the probe markup per (step, sub variant, KaTeX loaded): the strings are constants, so a resize only swaps it in
      // and reads its height
      const HLP = new Map();
      let hlpCur = '';
      const pLines = p => { if (!p) return 0; const lh = parseFloat(getComputedStyle(p).lineHeight) || 20; return Math.round(p.offsetHeight / lh); };
      // → { b: the bottom edge (viewport px) step i's headline will have in variant v (0 if it cannot be measured),
      //     tl / sl: its title / sub line counts }
      function hlProbeRun(i, v) {
        v = v || L.hlv[i];
        const sub = hlSub(i, v), key = `${i}|${v}|${KX()}`;
        let html = HLP.get(key);
        if (html === undefined) {
          const inl = reduced ? s => s : s => s.replace(/<span class="(w|katex)"/g, '<span style="display:inline-block" class="$1"'); // as while fading in
          html = inl(`<p class="hl-title">${hlRich(hlText(HL[i].t))}</p>` + (sub ? `<p class="hl-sub">${hlRich(hlText(sub))}</p>` : ''));
          HLP.set(key, html);
        }
        if (hlpCur !== html) { hlProbe.innerHTML = html; hlpCur = html; }
        const hh = hlProbe.offsetHeight;
        if (!(hh > 0)) return { b: 0, tl: 0, sl: 0 };
        return { b: Math.round(hlProbe.offsetTop + hh), tl: pLines(hlProbe.children[0]), sl: pLines(hlProbe.children[1]) };
      }
      const hlMeasure = i => hlProbeRun(i).b;
      // the sub variant per step. Desktops: the longest sub that keeps to two lines (and the whole headline to four);
      // short desktops (under 700 px) take the short one. Phones: the short sub while every step keeps ≥ 300 px of art
      // under it, else the title alone; it stays until that falls under 280 px (no flip-flop on small height changes)
      function pickHlVariants(mob, H, artY1) {
        if (!mob) {
          for (let i = 0; i < HL.length; i++) {
            let v = 'm';
            if (H >= 700) {
              for (const c of ['l', 's']) {
                if (!HL[i][c]) continue;
                const r = hlProbeRun(i, c);
                if (r.b > 0 && r.sl <= 2 && r.tl + r.sl <= 4) { v = c; break; }
              }
            }
            L.hlv[i] = v;
          }
          return;
        }
        let art = Infinity;
        for (let i = 0; i < HL.length; i++) { const r = hlProbeRun(i, 'm'); if (r.b > 0) art = Math.min(art, artY1 - r.b - 14); }
        if (art !== Infinity) L.hlPh = art >= (L.hlPh === 'm' ? 280 : 300) ? 'm' : 'n';
        L.hlv.fill(L.hlPh);
      }
      function hlLayerBottom(l) {
        let b = 0;
        for (let i = 0; i < LAYER.length; i++) if (LAYER[i] === l) b = Math.max(b, HLS.b[i] || 0, HLS.act[i] || 0);
        return b || (L.mob ? HL_TOP_M + 110 : 74 + 110); // (unmeasurable: a two-line title and sub)
      }
      // the art box of each layer: from under its headline to above the bottom chrome
      // (tall screens leave the headline more air, like the neighbouring scenes; the box is never inverted, e.g. on
      // landscape phones, so no scale ever flips)
      function artBoxes() {
        const A0 = L.art0, gap = L.mob ? 14 : L.h >= 800 ? 36 : 20;
        L.arts = [0, 1, 2, 3].map(l => {
          const y0 = Math.max(A0.y0, hlLayerBottom(l) + gap), y1 = Math.max(l === 0 ? A0.y1a : A0.y1, y0 + 120);
          return { x0: A0.x0, x1: A0.x1, y0, y1, w: A0.x1 - A0.x0, h: y1 - y0, cx: (A0.x0 + A0.x1) / 2, cy: (y0 + y1) / 2 };
        });
        L.art = L.arts[S.step >= 0 ? LAYER[S.step] : 0];
      }
      api.onHeadline(b => {
        if (!L.ready || !L.arts || S.step < 0 || !(b > 0)) return;
        const i = S.step, l = LAYER[i], before = L.arts[l].y0;
        HLS.act[i] = b;
        artBoxes();
        if (L.arts[l].y0 !== before) L.dirty = [true, true, true, true];
      });

      function tw(s, font) { ctx.font = font || FM(12); if ('letterSpacing' in ctx) ctx.letterSpacing = '0.2px'; return ctx.measureText(s).width; }
      // kickers (the shared eyebrow style): UPPERCASE, 12px mono, letter-spacing .06em, #555
      const KLS = '0.72px';
      function kw(s) { ctx.font = FM(12); const ls = 'letterSpacing' in ctx; if (ls) ctx.letterSpacing = KLS; const w = ctx.measureText(s).width; if (ls) ctx.letterSpacing = '0.2px'; return w; }
      function layout() {
        const w = cv.w || innerWidth, H = cv.h || innerHeight;
        const mob = w <= 800; // core's phone cutoff (innerWidth > 800 is a desktop; CSS max-width: 800px)
        L.mob = mob; L.w = w; L.h = H; L.ready = true;
        MV++; // fonts or viewport changed: re-measure every label
        // p control: compact on phones so it sits on the slider's row
        pLab.innerHTML = `${mob ? '' : 'shape '}<span style="font-size:13px">${TX('p')}</span>`;
        pBox.style.gap = mob ? '0px' : '5px';
        pBox.style.marginLeft = mob ? '-12px' : '0px';
        // shared content-left (every step's first line under the headline starts here): 300 px on wide screens, 260 px below 1280;
        // 1100–1279 keeps 280 so art in the middle band stays clear of the control column
        const x0 = mob ? 16 : w >= 1280 ? 300 : w >= 1100 ? 280 : 260;
        const x1 = mob ? w - 16 : w - Math.max(84, Math.round(w * 0.065));
        const y0 = mob ? HL_TOP_M : 78;
        const y1 = mob ? H - 226 : H - 92; // phones: the hint line sits above the controls (≈ H − 196)
        // phones, step 1: the sound invite ("Click or press any key…", two lines on a phone) shows there on arrival,
        // 10 px above the controls; the density plot and its legend row end 12 px above it
        let y1a = y1;
        if (mob) {
          // the controls' top: core stacks them 116 px up for a three-line caption, 72 px tall (before its first pass
          // they sit lower, so the smaller value wins and nothing jumps when it lands)
          let ct = H - 188;
          try { const r = document.getElementById('controls').getBoundingClientRect(); if (r.height > 20) ct = Math.min(ct, r.top); } catch (e) {}
          y1a = Math.min(y1, Math.round(ct - 10 - 34 - 8)); // (the legend row ends 4 px above the box)
        }
        L.art0 = { x0, y0, x1, y1, y1a };
        // context headline: the sub variant that fits (pickHlVariants); phones put it under the step nav. A change
        // for the current step swaps the text in place (enter() sets it once, through resetAll)
        nav.style.top = mob ? NAV_TOP + 'px' : '';
        const hlTop = mob ? HL_TOP_M : null;
        hlProbe.style.top = mob ? HL_TOP_M + 'px' : '';
        if (hlTop !== HLS.top) { HLS.top = hlTop; api.headlineTop(hlTop); }
        pickHlVariants(mob, H, y1);
        if (S.step >= 0 && !L.entering && api.isActive() && HLS.key !== hlKey(S.step)) setHL(S.step, false, true);
        HLS.act = {};
        for (let i = 0; i < HL.length; i++) HLS.b[i] = hlMeasure(i);
        artBoxes();
        // the step counter's box (top-right, 3 rows from y = 72): art that reaches it moves left of it or below it.
        // It reads "03 / 05 · Slice & train", like every other scene's counter, unless the context headline (centred,
        // at least 420 px wide) would reach it (portrait tablets): then it reads "03 / 05" (the stepper names the step).
        let lw = 0; // the longest label, measured like the CSS (.02em = 0.24 px at 12 px)
        for (let i = 0; i < STEPS.length; i++) lw = Math.max(lw, tw(ctrLabel(i)) + 0.04 * ctrLabel(i).length);
        const hlRight = w / 2 + (hlProbe.offsetWidth || 0) / 2;
        L.ctrShort = !mob && w - 40 - lw < hlRight + 16;
        const lwC = L.ctrShort ? tw('03 / 05') + 0.3 : lw;
        if (mob) L.cb = null;
        else L.cb = { x0: w - 40 - Math.ceil(Math.max(lwC, tw('paused · [space]'))) - 14, y1: 72 + 42 + 8 };
        CTR.txt = ''; CTR.st = '';
        // phones: the step nav's label keeps one width for every step, so the › button never moves under a thumb
        navLbl.style.minWidth = Math.max(180, Math.ceil(lw) + 4) + 'px';
        L.dirty = [true, true, true, true];
        if (mob) for (const t of tags) posTag(t, x1, NAV_TOP + 20, 1, 0.5); // beside the step nav, right-aligned
      }
      const LAYOUTS = [layRe, laySl, layDi, layPa];
      function ensure(l) { if (L.ready && L.dirty[l]) { L.dirty[l] = false; L.art = L.arts[l]; LAYOUTS[l](); } }

      // step 0 · density plot
      function layRe() {
        const A = L.art, mob = L.mob;
        // the plot starts on the content-left, under the header; on very wide screens it grows with the viewport so
        // its centre stays at ≈ 50–51 % of the width
        const pw = mob ? A.w - 4 : Math.min(A.w - 40, 880 + Math.max(0, L.w - 1440));
        let hv = 0;
        prime('reHead', reHeadHTML(0));
        if (!mob && measure('reHead').w > pw) { hv = 1; prime('reHead', reHeadHTML(1)); }
        const hd = measure('reHead');
        const hh = hd.h || (mob ? 24 : 28);
        const gx0 = mob ? A.x0 + 2 : A.x0;
        const top = A.y0;
        const clipY = top + hh + (mob ? 24 : 30); // the gap holds the "↑ peak" label of clipped densities
        const G = { A, hv, x0: gx0, x1: gx0 + pw, w: pw, top, clipY, xmin: -3, xmax: 4, dmax: 1.2, legX0: Infinity, legY1: 0, showBall: false, legBelow: mob, massShort: mob, legKey: 'reLeg', fLvl: 0 };
        const Xp = x => gx0 + ((x - G.xmin) / (G.xmax - G.xmin)) * pw;
        let below = 118;
        if (!mob) {
          prime('reLeg', RE_LEG()); prime('reLegN', RE_LEG_N()); prime('reBall', RE_BALL());
          let lg = measure('reLeg');
          const bl = measure('reBall');
          // the unit ball sits top-right of the plot (left of the step counter when it reaches the counter's rows)
          const br = 36, by = top + 44, bx = by - br - 8 < L.cb.y1 ? Math.min(G.x1 - 44, L.cb.x0 - 12 - br - 8) : G.x1 - 44;
          G.ball = { bx, by, br };
          G.showBall = gx0 + hd.w + 28 < bx - br - 16 - bl.w;
          // legend top-right of the plot: with words, else symbols only; else under the definition
          G.legX0 = G.x1 - lg.w - 14;
          if (G.legX0 < Xp(0.6) && L.h < 800) { G.legKey = 'reLegN'; lg = measure('reLegN'); G.legX0 = G.x1 - lg.w - 14; } // short screens: no room below
          if (G.legX0 < Xp(0.6)) { G.legKey = 'reLeg'; lg = measure('reLeg'); G.legBelow = true; G.legX0 = Infinity; G.showBall = false; } // it would sit on the curves
          else { G.legY0 = G.showBall ? by + br + 20 : clipY + 4; G.legY1 = G.legY0 + lg.h + 10; }
          // under the axis: tick labels, the sample counter, then the definition and the sampling rule (wrapped
          // inside the plot width); the legend drops under them when it has no room above. Short screens keep the plot
          // at ≥ 150 px: the sampling rule goes first, then the definition.
          G.fSt = `max-width:${Math.round(pw)}px;white-space:normal`;
          prime('reFp', RE_RULE(), 'white-space:nowrap');
          G.fInline = (measure('reFp').w || 560) <= pw;
          prime('reF', RE_F(G.fInline), G.fSt); prime('reF1', RE_F1(), G.fSt);
          const fH = [0, (measure('reF1').h || 26) + 14, (measure('reF').h || 52) + 14];
          const belowAt = lv => {
            let yy = 64 + fH[lv];
            const legDy = yy;
            if (G.legBelow) yy += (lg.h || 88) + 12;
            const b = yy + 40;
            return { b, legDy, tagDy: b - 38 };
          };
          let lv = 2, bb = belowAt(2);
          while (lv > 0 && A.y1 - bb.b - clipY < 150) { lv--; bb = belowAt(lv); }
          G.fLvl = lv; below = bb.b; G.legDy = bb.legDy; G.tagDy = bb.tagDy;
          // the point-mass label reads left of the stem; fall back to the short form before it reaches the controls
          prime('reMass', massHTML(false, 0.691));
          const ml = measure('reMass');
          G.massW = ml.w || 250; G.massH = ml.h || 44;
          G.massShort = Xp(0) - 12 - G.massW < A.x0 - 8;
        }
        prime('reMass', massHTML(true, 0.691));
        const ms = measure('reMass');
        G.massWs = ms.w || 150; G.massHs = ms.h || 20;
        prime('reMass', massHTML('stack', 0.691));
        const mk = measure('reMass');
        G.massWk = mk.w || 80; G.massHk = mk.h || 40;
        if (mob) { // phones: tick labels, the sample counter, then the legend (one row when it fits)
          G.legSt = `max-width:${Math.round(A.w)}px`;
          prime('reLegM', RE_LEG_M(), G.legSt);
          below = 58 + (measure('reLegM').h || 44) + 4;
        }
        G.base = Math.max(clipY + (mob ? 100 : 140), A.y1 - below);
        G.k = (G.base - clipY) / 1.2;
        L.re = G;
        if (!mob) posTag(tags[0], G.x0, G.base + G.tagDy, 0, 0.5);
      }
      function massHTML(short, q) {
        if (short === 'stack') return `<div style="line-height:20px">${K('\\Phi_p(-\\mu/\\sigma)', 15)}</div><div style="line-height:18px">= ${q.toFixed(3)}</div>`;
        return short
          ? `<div style="line-height:20px">${K('\\Phi_p(-\\mu/\\sigma) =', 15)}<span> ${q.toFixed(3)}</span></div>`
          : `<div style="line-height:22px">${K('P(z=0)=\\Phi_p(-\\mu/\\sigma) =', 16)}<span style="font-size:13px"> ${q.toFixed(3)}</span></div><div class="dim">point mass: exact zeros</div>`;
      }

      // the widest Cramér–Wold header variant that fits on one line per row (else the last one, allowed to wrap)
      function pickCwHead(maxW, compact) {
        for (let v = 0; v < 4; v++) {
          prime('cwHead', cwHeadHTML(v, compact), 'white-space:nowrap');
          if (measure('cwHead').w <= maxW) return { v, compact, html: cwHeadHTML(v, compact), st: `max-width:${Math.round(maxW)}px` };
        }
        // compact: the statement in two lines ending in ∀c, the legend wrapped under it (narrow columns beside the panel)
        prime('cwProbe', `<div class="lpj-nw">${K(CW_L2 + '\\ \\forall c', 18)}</div>`, 'white-space:nowrap');
        if (measure('cwProbe').w <= maxW && maxW >= 200) return { v: 4, compact, html: cwHeadHTML(4), st: `width:${Math.round(maxW)}px;white-space:normal` };
        return { v: 3, compact, html: cwHeadHTML(3, compact).replace(/ lpj-nw|class="lpj-nw"/g, ''), st: `max-width:${Math.round(maxW)}px;white-space:normal`, wrapped: true };
      }
      // the fig. 1b / fig. 14 tags (left of `limit`): after the whole statement (its last line when it takes two, so
      // the tag never splits it at ⟺), else after the legend's first row, else after the statement's first line
      function cwTags(ch, x, y, limit) {
        const parts = cwParts(ch.v, ch.compact);
        const tagW = Math.max(tags[1].el.offsetWidth, tags[2].el.offsetWidth) || 70;
        prime('cwProbe', parts.line1, 'white-space:nowrap');
        const l1 = measure('cwProbe'), h1 = l1.h || 24;
        const spots = [];
        if (parts.line2 && !ch.wrapped) {
          prime('cwProbe', parts.line2, 'white-space:nowrap');
          const l2 = measure('cwProbe');
          spots.push([x + (l2.w || 300) + 20, y + h1 + 2 + (l2.h || 24) / 2]);
        } else if (!parts.line2) spots.push([x + (l1.w || 300) + 20, y + h1 / 2 + 1]);
        prime('cwProbe', parts.stmt, 'white-space:nowrap');
        const sh = measure('cwProbe').h || 34;
        prime('cwProbe', parts.row1, 'white-space:nowrap');
        spots.push([x + (measure('cwProbe').w || 200) + 20, y + sh + 11]);
        spots.push([x + (l1.w || 140) + 20, y + h1 / 2 + 1]);
        const [tx, ty] = spots.find(s => s[0] + tagW <= limit) || spots[spots.length - 1];
        posTag(tags[1], tx, ty, 0, 0.5); posTag(tags[2], tx, ty, 0, 0.5);
      }
      // steps 1–2 · dial + projection panel (side by side on wide or short art boxes, stacked otherwise)
      function laySl() {
        const A = L.art, mob = L.mob, H = L.h, CB = L.cb;
        const bottom = Math.min(A.y1, H - 136); // the links list sits bottom-right
        if (!mob && (A.w >= 600 || H < 800)) {
          const panelW = clamp(A.w * 0.34, 280, 380);
          const P = { x0: A.x1 - panelW, x1: A.x1, w: panelW, stacked: false };
          // the header sits beside the panel when one of its variants fits there; else it spans the top
          // (left of the step counter when it reaches the counter's rows) and the panel starts under it.
          // Short screens: the legend is one row, so the dial keeps its height under the headline.
          const compact = H < 800, hdR = A.y0 < CB.y1 ? CB.x0 - 16 : A.x1;
          let ch = pickCwHead(P.x0 - A.x0 - 36, compact), full = false;
          if (ch.wrapped) { full = true; ch = pickCwHead(Math.min(A.w, hdR - A.x0), compact); }
          cwTags(ch, A.x0, A.y0, full ? hdR : P.x0 - 16);
          const headSt = ch.st;
          prime('cwHead', ch.html, headSt);
          const hd = measure('cwHead');
          const gap = clamp(A.w * 0.06, 36, 76);
          const dialW = A.w - panelW - gap;
          const topD = A.y0 + (hd.h || 128) + 18;
          const avH = A.y1 - topD;
          // at least 100 px, unless the column between the controls and the panel cannot hold the dial, its aura and the c label
          const Rcol = (P.x0 - 8 - 292) / 2 - 12 - 22;
          const R = Math.min(Rcol, Math.max(100, Math.min(dialW / 2 - 40, avH / 2 / 1.16 - 4)));
          const aur = clamp(R * 0.12, 12, 30);
          const cy = topD + avH / 2;
          const cx = Math.max(A.x0 + dialW * 0.5 + 6, 292 + R + 4 + aur);
          // table (146; 118 without its q line) and block (120) stack when there is room; otherwise they share one slot
          // (step 2 shows the table, step 3 the training block), or, shorter still, a slot for the block alone (step 2:
          // "why sort"). The two 1-D histograms are the point of step 2, so they keep ≥ 40 px: the table's q line goes
          // first, then the "sliced" row (step 3's block shows the same loss); only then do they shrink, to 30 px.
          // Step 3 keeps its training block, which backs the headline. Both steps share this layout, so nothing jumps
          // between them.
          const FIX0 = 26 + 20 + 32, SLI = 26, TBL = 146, TBLQ = 118, BLK = 120;
          let pTop = A.y0;
          if (P.x1 > CB.x0) pTop = Math.max(pTop, CB.y1);
          if (full) pTop = Math.max(pTop, A.y0 + (hd.h || 128) + 16);
          const avail = bottom - pTop;
          const PLANS = [
            { stack: true, slot: TBL + BLK, sliced: true },
            { slot: TBL, sliced: true },
            { slot: Math.max(TBLQ, BLK), sliced: true, noQ: true },
            { slot: TBL, sliced: false },
            { slot: Math.max(TBLQ, BLK), sliced: false, noQ: true },
            { slot: BLK, noTable: true, sliced: true },
            { slot: BLK, noTable: true, sliced: false },
          ];
          // the gap between the histograms takes a fifth (22–62 px), the histograms the rest (≤ 100 px each)
          const hLOf = r => clamp(r * 0.2, 22, 62), hAOf = r => clamp((r - hLOf(r)) / 2, 30, 100);
          const restOf = o => avail - FIX0 - (o.sliced ? SLI : 0) - o.slot;
          const plan = PLANS.find(o => hAOf(restOf(o)) >= 40) || PLANS.find(o => restOf(o) >= 2 * 30 + 22) || PLANS[PLANS.length - 1];
          const FIX = FIX0 + (plan.sliced ? SLI : 0), slotH = plan.slot, rest = restOf(plan);
          P.stack = !!plan.stack; P.noTable = !!plan.noTable; P.noBlock = false; P.noSlot = false; P.sliced = plan.sliced; P.noQ = !!plan.noQ;
          const hA = hAOf(rest), hL = hLOf(rest);
          // top-aligned with the Cramér–Wold statement (the first art row); spare height stays under the panel
          let y = pTop;
          P.yTitle = y + 8; y += 26;
          P.hA = hA; P.yA = y + hA; y = P.yA;
          P.yB = y + hL; y = P.yB + hA;
          P.yRuler = y + 12; y += 20;
          P.yRead = y + 16; y += plan.sliced ? 58 : 32;
          P.yTbl = y + 4; if (P.stack) y += TBL;
          P.yBlk = P.stack ? y + 8 : P.yTbl;
          L.sl = { A, cx, cy, R, U: R / 3.7, P, aura: aur, headKey: 'cwHead', headSt, headHTML: ch.html };
        } else {
          let headKey, headSt, headHTML, top;
          const small = mob && H < 720; // short phones: lower histograms and a smaller dial so nothing reaches the controls
          const hA = mob ? (small ? 30 : 36) : 46, hL = mob ? (small ? 22 : 26) : 32, rd = mob ? 22 : 26;
          const body = 16 + 14 + hA + hL + hA + 12 + 20 + rd + 10; // panel: title … second readout row
          const fit = (extra, t) => { const outer = (bottom - t - body - extra) / 2; return { outer, R: Math.min((A.w / 2 - 24) / 1.12, (outer - 12) / 1.12) }; };
          let slot = !mob, f;
          if (mob) {
            headKey = 'cwHeadM'; headSt = `max-width:${Math.round(A.w)}px`; headHTML = CW_HEAD_M(); prime(headKey, headHTML, headSt);
            top = A.y0 + (measure(headKey).h || 22) + 10;
            f = fit(0, top);
          } else {
            // the slot under the panel (the table in step 2, the training block in step 3) stays: when the dial would
            // fall under 110 px the Cramér–Wold legend becomes one row, and the slot goes only under 84 px
            const hdR = A.y0 < CB.y1 ? CB.x0 - 16 : A.x1;
            const head = compact => {
              const ch = pickCwHead(Math.min(A.w, hdR - A.x0), compact);
              prime('cwHead', ch.html, ch.st);
              return { ch, top: A.y0 + (measure('cwHead').h || 150) + 10 };
            };
            let hd = head(H < 800);
            f = fit(160, hd.top);
            if (f.R < 110 && H >= 800) { const hc = head(true), fc = fit(160, hc.top); if (fc.R > f.R) { hd = hc; f = fc; } }
            if (f.R < 84) { slot = false; hd = head(H < 800); f = fit(0, hd.top); }
            headKey = 'cwHead'; headSt = hd.ch.st; headHTML = hd.ch.html; top = hd.top;
            prime(headKey, headHTML, headSt);
            cwTags(hd.ch, A.x0, A.y0, hdR);
          }
          if (mob && f.R < 62) {
            // short phones (the headline takes the top): the dial on the left, the projections beside it
            const avH = bottom - top, aur = 12;
            const R = clamp(Math.min((avH - 20) / 2 - aur - 4, A.w * 0.21), 46, 90);
            const cx = A.x0 + R + aur + 4, cy = top + avH / 2, px0 = cx + R + aur + 14;
            const P = { x0: px0, x1: A.x1, w: A.x1 - px0, stacked: true, side: true, stack: false, noSlot: true, noTable: true, noBlock: true };
            const hA2 = clamp((avH - 82) / 2.6, 26, 60), hL2 = Math.round(hA2 * 0.6);
            const used = 82 + 2 * hA2 + hL2; // title, histograms, ruler, two readout rows
            P.yTitle = cy - used / 2 + 8;
            P.hA = hA2; P.yA = P.yTitle + 14 + hA2; P.yB = P.yA + hL2; P.yRuler = P.yB + hA2 + 12; P.yRead = P.yRuler + 20;
            P.yTbl = P.yBlk = P.yRead + 40;
            L.sl = { A, cx, cy, R, U: R / 3.7, P, aura: aur, headKey, headSt, headHTML };
          } else {
            const R = Math.max(small ? 52 : 70, f.R), aur = clamp(R * 0.12, 12, 30);
            const outer = Math.max(f.outer, R * 1.12 + 12);
            const cx = A.cx, cy = top + outer;
            const P = { x0: A.x0, x1: A.x1, w: A.w, stacked: true, stack: false, noSlot: !slot, noTable: !slot, noBlock: !slot };
            P.yTitle = cy + outer + 16;
            P.hA = hA; P.yA = P.yTitle + 14 + hA; P.yB = P.yA + hL; P.yRuler = P.yB + hA + 12; P.yRead = P.yRuler + 20;
            P.yTbl = P.yRead + rd + 30; P.yBlk = P.yTbl;
            L.sl = { A, cx, cy, R, U: R / 3.7, P, aura: aur, headKey, headSt, headHTML };
          }
        }
        const SL = L.sl, P = SL.P;
        SL.sortW = tw('sort, then pair rank by rank') + 2;
        SL.sortW2 = tw('pair by rank') + 2;
        SL.sortW3 = tw('by rank') + 2;
        S.sortI = null;
        // the histogram labels (a knockout pads them 4 px each side): with their word, or the symbol alone
        prime('probe', `${K('c^{\\top}z')}<span> embeddings</span>`); SL.zW = (measure('probe').w || 110) + 8;
        prime('probe', `${K('c^{\\top}y')}<span> target</span>`); SL.yW = (measure('probe').w || 90) + 8;
        prime('probe', K('c^{\\top}z')); SL.symW = (measure('probe').w || 26) + 8;
        // measured (not threshold) choices between long and short words in the panel
        SL.spark = P.w - 150; // sparkline width; the network glyph takes the last 150 px
        SL.lossWord = ['RDMReg loss, log scale', 'RDMReg loss', 'RDMReg'].find(s => tw(s) + tw('0.0000') + 14 <= SL.spark) || 'RDMReg';
        SL.zLong = tw('exact zeros · embeddings 100.0% · target 100.0%') <= P.w;
        SL.trainKick = kw('TOY TRAINING · RDMREG ONLY') + 16 + tw('step 000000') <= P.w ? 'TOY TRAINING · RDMREG ONLY' : 'TOY TRAINING';
        prime('probe', `<div>${K('q=\\Phi_p(-\\mu/\\sigma) =', 14)}<span class="ink"> 0.500</span><span class="dim">  · interior </span>${K('(1-q)^D\\to 0', 14)}</div>`);
        SL.qLong = measure('probe').w <= P.w;
      }

      // step 3 · feature matrix + chart A
      function layDi() {
        const A = L.art, mob = L.mob, H = L.h;
        // desktop: the matrix starts on the content-left, under the kicker; it (and its per-row counts) ends left of
        // the step counter's column
        const right = mob ? A.x1 : Math.min(A.x1 - 40, L.cb.x0 - 8);
        let cols = mob || A.w < 600 ? 32 : 64;
        let readW = mob ? 0 : 54;
        const fitP = rw => Math.min(mob ? 14 : 16, (mob ? A.w : right - A.x0 - rw) / cols);
        let pitch = fitP(readW);
        if (readW && pitch < 13) { readW = 0; pitch = fitP(0); } // per-row counts only when 12px digits get ≥ 13px of row pitch
        if (!mob && cols === 64 && pitch < 9) { cols = 48; pitch = fitP(0); }
        pitch = Math.max(6, pitch);
        // sample rows: the matrix takes about a fifth of the art height (4–16 rows); the chart below is the point of
        // the step. Short art boxes (under the headline on short screens) drop the per-row mean line and carry the
        // figure tag on the kicker row, so the chart keeps its height.
        const rows = clamp(Math.round(((A.h - 120) * 0.22) / pitch), 4, 16);
        const short = A.h < 400;
        const gw = cols * pitch;
        const gx0 = mob ? A.x0 + (A.w - gw) / 2 : A.x0;
        const G = { A, cols, rows, pitch, cell: Math.max(4, pitch - 3), gx0, gw, rowRead: readW > 0, showF: false, meanY: null, legIn: true, legShort: false, legSt: '', ghost: {} };
        G.cx0 = gx0 + (mob ? 24 : 34); G.cx1 = gx0 + gw - (mob ? 10 : 0); // phones: the µ = 1 marker and its ring stay out of the gutter
        const cwid = G.cx1 - G.cx0;
        let y = A.y0 + (mob ? 24 : 22); // desktop: the kicker (gy0 − 14) sits 8 px under the art box top
        G.gy0 = y; y += rows * pitch;
        G.kick = (mob ? `FEATURES · ${rows} × ${cols} OF 2048 DIMS` : `FEATURES · ${rows} SAMPLES × ${cols} OF 2048 DIMS`);
        if (!mob) { // the definition, right-aligned over the matrix, when it clears the kicker
          prime('diF', K('z=\\max(0,\\,\\mu+\\sigma s),\\ \\ s\\sim\\mathrm{GN}_p(0,1)', 14));
          G.showF = gx0 + kw(G.kick) + 24 + (measure('diF').w || 230) <= gx0 + gw;
        }
        if (!mob && !G.rowRead && !short) { G.meanY = y + 17; y += 26; }
        G.tagKick = !mob && short && !G.showF; // the fig. 3 tag right-aligned on the kicker row
        if (!mob) {
          const Xc = v => G.cx0 + ((v + 3) / 4) * cwid;
          prime('diLeg', diLegHTML(0.5, true), '');
          let lg = measure('diLeg');
          const fits = () => G.cx0 + 10 + lg.w <= Xc(-0.35) - 8;
          if (!fits()) { G.legShort = true; prime('diLeg', diLegHTML(0.5, true, true), ''); lg = measure('diLeg'); }
          if (!fits()) { // it would cover the curve or the measured points: move it above the plot
            G.legIn = false; G.legShort = false;
            G.legSt = `max-width:${Math.round(cwid + 30)}px;white-space:normal`;
            prime('diLeg', diLegHTML(0.5, false), G.legSt);
            G.legY = y + 22; y = G.legY + (measure('diLeg').h || 44);
          }
        } else if ((A.y1 - 64) - (y + 40) < 170) {
          // short phone charts: the in-plot legend would cover the Table 13 squares (and push the curve labels under
          // the curves), so it takes one row between the matrix and the plot
          G.legIn = false; G.legRowM = true; G.legSt = `max-width:${Math.round(A.w)}px`;
          prime('diLeg', diLegRowHTML(0.5, true), G.legSt); // the widest form (another shape than the measured p = 1)
          G.legQ = (measure('diLeg').h || 22) <= 26; // one row: keep the "p = 1" note
          if (!G.legQ) prime('diLeg', diLegRowHTML(0.5, false), G.legSt);
          G.legY = y + 8; y = G.legY + (measure('diLeg').h || 22) - 12;
        }
        let cy0 = y + (mob ? 40 : G.tagKick ? 36 : 52);
        let cy1 = Math.max(cy0 + 60, A.y1 - (mob ? 64 : 76)); // (never inverted: landscape phones)
        const asp = H > 1.2 * L.w ? 1.3 : 0.95; // portrait tablets may use the height
        if (!mob && cy1 - cy0 > cwid * asp) { // no towers on tall narrow screens: cap the aspect, centre the chart below the matrix
          const extra = cy1 - cy0 - cwid * asp, dy = Math.round(extra / 2);
          cy1 -= extra; if (!G.legIn) G.legY += dy; cy0 += dy; cy1 += dy;
        }
        G.cy0 = cy0; G.cy1 = cy1;
        if (!mob) { prime('diR', diRoHTML(true, 0.7354)); G.roLong = measure('diR').w <= cwid + 30; }
        L.di = G;
        if (!mob) posTag(tags[3], G.tagKick ? gx0 + gw : G.cx1, G.tagKick ? G.gy0 - 14 : G.cy0 - 30, 1, 0.5);
      }

      // step 4 · Pareto chart + tables (tables only when the chart keeps ≥ 520 px)
      function layPa() {
        const A = L.art, mob = L.mob, H = L.h;
        const tableW = mob ? 0 : clamp(A.w * 0.27, 236, 300);
        const bx0 = A.x0 + (mob ? 30 : 44); // desktop: the kicker sits on the content-left, the tick labels just inside it
        let bx1 = A.x1 - tableW - (mob ? 4 : 48);
        const tables = !mob && bx1 - bx0 >= 520;
        if (!tables) bx1 = A.x1 - (mob ? 4 : 8);
        const cw = bx1 - bx0;
        const G = { bx0, bx1, tableW, tables, tx: tables ? bx1 + 48 : Infinity, pline: !tables, legOut: false, thumbs: !mob && H >= 800 && cw >= 560 };
        const asp = H > 1.2 * L.w ? 1.4 : 1.05; // portrait tablets may use the height
        G.by0 = A.y0 + (mob ? 46 : 44); // desktop: the kicker (by0 − 36) sits 8 px under the art box top
        // the µ row: measured zeros next to the p = 1 target of that run (longest wording that fits)
        G.muV = 2;
        for (let v = mob ? 2 : 0; v <= 2; v++) { prime('paMu', muRowHTML(7, v)); if (measure('paMu').w <= cw + (mob ? 26 : 0)) { G.muV = v; break; } }
        // stack under the plot: tick labels, axis title, µ row, Table 5 line, legend, thumbnails
        G.muDy = mob ? 58 : 60;
        let bottom = mob ? 60 : 80;
        if (G.pline) {
          G.plDy = G.muDy + (mob ? 22 : 24); bottom += mob ? 22 : 24;
          G.plV = 3;
          for (let v = mob ? 2 : 0; v <= 3; v++) { prime('paPl', plineHTML(0.5, v)); if (measure('paPl').w <= cw + (mob ? 26 : 0)) { G.plV = v; break; } }
        }
        // the plot's bottom for a given stack under it (never inverted: landscape phones; the aspect is capped so the
        // chart hangs from the header)
        const plotY1 = b => { const y = Math.max(G.by0 + 80, A.y1 - b); return !mob && y - G.by0 > cw * asp ? G.by0 + cw * asp : y; };
        // narrow desktop charts put the legend under the plot, unless the plot stays tall enough to hold it (portrait
        // tablets keep it inside, like wide desktops); the in-plot spot is checked below
        const legOutAt = b => { G.legDy = b + 16; return b + 70; };
        const thumbsAt = b => { if (G.thumbs) { G.thDy = b + 20; return b + 60; } return b; };
        G.legOut = !mob && cw < 480 && plotY1(thumbsAt(bottom)) - G.by0 < 400;
        const bottom0 = bottom;
        if (G.legOut) bottom = legOutAt(bottom);
        bottom = thumbsAt(bottom);
        G.by1 = plotY1(bottom);
        // short phone charts: the legend would cover the series, so it takes the Table 5 line's row instead
        G.legRow = mob && G.pline && G.by1 - G.by0 < 200;
        if (G.legRow) G.pline = false;
        // the in-plot legend (lower-left, right of the 0 %-zeros column so every dense baseline "+" stays in view): the
        // lowest spot whose box clears both series, their markers and rings and (desktop) the two end notes, and whose
        // knockout stays above the x axis; its baseline line names the methods when that still fits there. Narrow
        // desktop charts without such a spot put the legend under the plot.
        const legLines = ['encoder (linear probe)', 'projector (rectified)'];
        const legDenseV = mob ? ['dense baselines, 0% zeros'] : ['dense: SimCLR, VICReg, LeJEPA', 'dense baselines, 0% zeros'];
        const legWOf = d => Math.max(tw(d), ...legLines.map(s => tw(s)));
        const legSpot = y1 => {
          const X_ = z => bx0 + zf(z) * cw, Y_ = a => y1 - ((a - 55) / 22) * (y1 - G.by0);
          const lx = X_(0) + 14, top = G.by0 + 34;
          const series = [T13.enc, T13.proj].map(v => v.map((a, i) => [X_(ZEROS13[i]), Y_(a)]));
          const notes = [];
          if (!mob) { // right-aligned left of the ~95 % guide (see drawPareto)
            const xr = X_(95) - 10, ye = Y_(T13.enc[8]), yp = Y_(T13.proj[8]);
            notes.push([xr - tw('encoder −3.8 pts at 97.8% zeros') - 4, ye + 17, xr + 4, ye + 51]);
            notes.push([xr - tw('projector −9.7 pts') - 4, yp - 21, xr + 4, yp + 13]);
          }
          const near = (b, x, y, r) => x > b[0] - r && x < b[2] + r && y > b[1] - r && y < b[3] + r;
          const clear = b => {
            for (const s of series) {
              for (let i = 0; i < s.length; i++) {
                if (near(b, s[i][0], s[i][1], 9)) return false; // a marker and the slider's ring (r = 7)
                if (i) for (let k = 1; k < 16; k++) if (near(b, lerp(s[i - 1][0], s[i][0], k / 16), lerp(s[i - 1][1], s[i][1], k / 16), 4)) return false;
              }
            }
            return !notes.some(o => b[0] < o[2] + 10 && b[2] > o[0] - 10 && b[1] < o[3] + 14 && b[3] > o[1] - 14); // (a clear gap: not one stack)
          };
          for (let ly = y1 - 52; ly - 10 >= top; ly -= 4) {
            for (const dense of legDenseV) {
              const w = legWOf(dense);
              if (clear([lx - 4, ly - 10, lx + w + 22, ly + 46])) return { ly, dense, w };
            }
          }
          return null;
        };
        if (!G.legOut && !G.legRow) {
          const s = legSpot(G.by1);
          if (s) { G.legY = s.ly; G.legDense = s.dense; G.legW = s.w; }
          else if (mob) { G.legY = G.by1 - 52; G.legDense = legDenseV[0]; G.legW = legWOf(G.legDense); } // (the knockout keeps guides behind)
          else { G.legOut = true; bottom = thumbsAt(legOutAt(bottom0)); G.by1 = plotY1(bottom); }
        }
        if (G.legOut) { G.legDense = legDenseV[0]; G.legW = legWOf(G.legDense); }
        // short desktops (the taller headline pushes the chart down): a row under the plot that reaches the links
        // column's band (bottom-right) takes a shorter wording that stops short of it, so the two never read as one line
        if (!mob) {
          const lk = linksTL();
          const room = y => (y + 10 >= lk.y - 4 ? Math.min(cw, lk.x - 24 - bx0) : cw);
          const wMu = room(G.by1 + G.muDy);
          if (wMu < cw) for (let v = G.muV; v <= 2; v++) { G.muV = v; prime('paMu', muRowHTML(7, v)); if (measure('paMu').w <= wMu) break; }
          if (G.pline) {
            const wPl = room(G.by1 + G.plDy);
            if (wPl < cw) for (let v = G.plV; v <= 3; v++) { G.plV = v; prime('paPl', plineHTML(0.5, v)); if (measure('paPl').w <= wPl) break; }
          }
        }
        const { by0, by1 } = G;
        G.kx = mob ? bx0 - 26 : A.x0; G.ky = by0 - 36;
        // Tables 1 and 5 (wide desktop): under the step counter; Table 1 goes when both would reach the links column
        // (bottom-right). The fig. 3 tag follows them when there is room, else it sits top-right of the chart.
        let figTop = !mob && !tables;
        if (tables) {
          prime('paT1', t1HTML(1, tableW));
          const t1a = measure('paT1').h || 280;
          prime('paT1', t1HTML(0.5, tableW)); prime('paT5', t5HTML(1, tableW));
          G.t1 = true; G.t1y = Math.max(by0 - 44, L.cb.y1);
          const t1h = Math.max(t1a, measure('paT1').h || 280), t5h = measure('paT5').h || 150; // the taller note variant
          G.t5y = G.t1y + t1h + 26;
          if (G.t5y + t5h > H - 134) { G.t1 = false; G.t5y = G.t1y; } // no room: keep the p-dependent table
          const tagY = G.t5y + t5h + 26;
          if (tagY <= H - 134) posTag(tags[4], G.tx, tagY, 0, 0.5); // above the links column
          else figTop = true;
        }
        const figR = Math.min(bx1, mob ? Infinity : L.cb.x0 - 12);
        if (figTop) posTag(tags[4], figR, G.ky, 1, 0.5);
        // title: the longest kicker that fits beside the honesty tag (and the fig. 3 tag when it shares the row)
        const kx = G.kx;
        prime('paTag', paTagHTML(true));
        const tagW = measure('paTag').w || 160;
        const right = figTop ? figR - 64 - 16 : tables ? G.tx - 24 : bx1;
        const KV = mob ? ['TABLE 13 · VIT-S'] : ['SPARSITY VS ACCURACY · VIT-S · IMAGENET-100 · TABLE 13', 'SPARSITY VS ACCURACY · VIT-S · TABLE 13', 'TABLE 13 · VIT-S · IMAGENET-100', 'TABLE 13 · VIT-S'];
        G.kick = KV[KV.length - 1]; G.tag2 = true;
        for (const k of KV) if (kx + kw(k) + 14 + tagW <= right) { G.kick = k; G.tag2 = false; break; }
        G.tagX = G.tag2 ? kx : kx + kw(G.kick) + 14;
        G.tagY = G.tag2 ? by0 - 17 : G.ky;
        // in-plot top row: y-axis title (left) vs the ~95 % note (right of centre)
        const x95 = bx0 + zf(95) * cw;
        G.ylab = 'linear-probe top-1 %'; G.note95 = !mob;
        // the ~95 % note: two lines on tall charts; one line on short ones, where the encoder series rises into the second
        G.note = by1 - by0 >= 330 ? ['sharp drop only past ~95% zeros', 'CIFAR-100, Fig. 3c'] : ['sharp drop past ~95% · Fig. 3c'];
        if (G.note95) {
          const nw = tw(G.note[0]);
          if (bx0 + 8 + tw(G.ylab) + 16 > x95 - 8 - nw) G.ylab = 'top-1 %';
          if (bx0 + 8 + tw(G.ylab) + 16 > x95 - 8 - nw) G.note95 = false;
        }
        G.thumbY = by1 + (G.thDy || 100);
        // thumbnails near the bottom stop short of the links column (bottom-right)
        G.thR = bx1;
        if (G.thumbs && G.thumbY > H - 135) G.thR = Math.min(bx1, linksTL().x - 16);
        L.pa = G;
      }
      // the top-left corner of the links column (bottom-right; estimated until it first shows)
      function linksTL() {
        let x = L.w - 40 - tw('lpjepa.com ↗', FM(11)) - 6, y = L.h - 132;
        try {
          const g = document.querySelector('.links-group[data-scene="lpjepa"]'), r = g && g.getBoundingClientRect();
          if (r && r.width > 0) { x = Math.min(x, r.left); y = r.top; }
        } catch (e) {}
        return { x, y };
      }

      api.onResize(() => { layout(); });
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout()); } catch (e) {}
      // KaTeX fonts load lazily (the headline's $\mu$, $c$ can arrive after fonts.ready on a slow network): re-lay-out
      // once each late batch lands, so the art follows the headline's final wrap
      let fontT = 0;
      try {
        if (document.fonts && document.fonts.addEventListener) {
          document.fonts.addEventListener('loadingdone', () => { clearTimeout(fontT); fontT = setTimeout(() => { if (L.ready && api.isActive()) { try { layout(); } catch (e) {} } }, 120); });
        }
      } catch (e) {}
      setTimeout(() => { try { layout(); } catch (e) {} }, 1200);

      /* ------------------------------------------------------------ 2-D toy: target, encoder, RDMReg */
      const M = 1600, ND = 420, NR = M, NA = 72, KT = 8; // W₂²(θ) ring on every drawn point (the exact empirical value)
      // stratified uniforms: each coordinate takes every quantile level (k + ½)/M exactly once, in a random order,
      // so both clouds are exact GN_p / RGN_p samples per coordinate (no sampling noise in the marginals)
      function stratU(seed) {
        const r = mulberry32(seed), U = new Float64Array(2 * M), perm = new Int32Array(M);
        for (let c = 0; c < 2; c++) {
          for (let i = 0; i < M; i++) perm[i] = i;
          for (let i = M - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0, t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
          for (let i = 0; i < M; i++) U[2 * i + c] = (perm[i] + 0.5) / M;
        }
        return U;
      }
      const UX = stratU(0x2468ace), UY = stratU(0xc0ffee); // a pair whose couplings leave the optimum at W = I, b = µ for p = ½, 1, 2
      // unit-variance GN_p per coordinate, quantile-coupled across p so shapes morph:
      // gm = target draws (y = max(0, µ + g)), gx = the toy's inputs x ~ GN_p(0, I)
      const gnGen = U => p => { const a = new Float64Array(2 * M), s = sigmaGN(p); for (let i = 0; i < 2 * M; i++) a[i] = s * PhiInv(p, U[i]); return a; };
      const gm = Morph(2 * M, gnGen(UY));
      const gx = Morph(2 * M, gnGen(UX));
      const X = gx.cur;
      const W0 = [0.46, 0.20, 0.10, 0.36], B0 = [1.30, 1.05];
      // hold: reduced motion trains in the background and shows only the final state (the held one until then)
      const net = { W: W0.slice(), b: B0.slice(), m: new Float64Array(6), v: new Float64Array(6), t: 0, k: 0, steps: 0, anim: null, hist: [], ema: 0, dirs: [], lr: 0.025, resolved: false, hold: null };
      const Uu = new Float64Array(2 * M), Z = new Float64Array(2 * M), Y = new Float64Array(2 * M);
      let yMu = NaN, zDirty = true, lastW = '', ringFull = true;

      function forward() {
        gx.update();
        if (gx.changed) zDirty = true;
        const src = net.hold || net, W = src.W, b = src.b;
        const key = W.join(',') + b.join(',');
        if (key === lastW && !zDirty) return false;
        lastW = key; zDirty = false;
        for (let i = 0; i < M; i++) {
          const x1 = X[2 * i], x2 = X[2 * i + 1];
          const u1 = W[0] * x1 + W[1] * x2 + b[0], u2 = W[2] * x1 + W[3] * x2 + b[1];
          Uu[2 * i] = u1; Uu[2 * i + 1] = u2;
          Z[2 * i] = u1 > 0 ? u1 : 0; Z[2 * i + 1] = u2 > 0 ? u2 : 0;
        }
        return true;
      }
      function refreshY() { // target y = max(0, µ + σ_GN(p)·s), s ~ GN_p(0,1) (Algorithm 1), fixed quantiles
        gm.update();
        if (yMu === S.mu && !gm.changed) return false;
        yMu = S.mu;
        const g = gm.cur;
        for (let i = 0; i < 2 * M; i++) { const v = S.mu + g[i]; Y[i] = v > 0 ? v : 0; }
        return true;
      }

      // one full-batch step on RDMReg: (1/M)‖(Zc)↑ − (Yc)↑‖² averaged over KT random directions c (Eq. 16).
      // Minibatches of heavy-tailed samples (p < 1) bias the sliced loss toward lighter tails and the toy drifts;
      // the full batch of drawn points has no such bias, so it converges for every p.
      const tb = { ub: new Float64Array(2 * M), zb: new Float64Array(2 * M), pz: new Float64Array(M), py: new Float64Array(M), key: new Float64Array(M), gz: new Float64Array(2 * M) };
      const simR = mulberry32(0xabc123);
      const KQ = 1048576, KO = 256; // sort keys: the projection quantized to 2⁻²⁰ in the high bits, the sample index in the low 11
      function trainStep() {
        const W = net.W, b = net.b;
        const { ub, zb, pz, py, key, gz } = tb;
        for (let i = 0; i < M; i++) {
          const x1 = X[2 * i], x2 = X[2 * i + 1];
          const u1 = W[0] * x1 + W[1] * x2 + b[0], u2 = W[2] * x1 + W[3] * x2 + b[1];
          ub[2 * i] = u1; ub[2 * i + 1] = u2;
          zb[2 * i] = u1 > 0 ? u1 : 0; zb[2 * i + 1] = u2 > 0 ? u2 : 0;
        }
        gz.fill(0);
        let loss = 0;
        for (let d = 0; d < KT; d++) {
          const th = simR() * TAU, c1 = Math.cos(th), c2 = Math.sin(th);
          if (d === 0 && net.steps % 3 === 0) net.dirs.push({ th, t: S.sceneT });
          for (let i = 0; i < M; i++) {
            const a = c1 * zb[2 * i] + c2 * zb[2 * i + 1];
            pz[i] = a; py[i] = c1 * Y[2 * i] + c2 * Y[2 * i + 1];
            key[i] = Math.round(clamp(a + KO, 0, 2 * KO) * KQ) * 2048 + i;
          }
          key.sort(); py.sort(); // native numeric sorts: the i-th smallest of each are paired (1-D optimal transport)
          for (let r = 0; r < M; r++) {
            const k = key[r] % 2048, df = pz[k] - py[r];
            loss += (df * df) / M;
            gz[2 * k] += (2 * df * c1) / M; gz[2 * k + 1] += (2 * df * c2) / M;
          }
        }
        loss /= KT;
        const g = [0, 0, 0, 0, 0, 0];
        for (let i = 0; i < M; i++) {
          const x1 = X[2 * i], x2 = X[2 * i + 1];
          // ReLU gate. Forward is an exact ReLU; the backward pass lets 5% through for u ≤ 0
          // (a surrogate gradient) so this 6-parameter toy cannot get stuck with dead units.
          const g1 = (ub[2 * i] > 0 ? 1 : 0.05) * gz[2 * i] / KT, g2 = (ub[2 * i + 1] > 0 ? 1 : 0.05) * gz[2 * i + 1] / KT;
          g[0] += g1 * x1; g[1] += g1 * x2; g[2] += g2 * x1; g[3] += g2 * x2; g[4] += g1; g[5] += g2;
        }
        net.t++; net.k++;
        const LR = 0.03, e0 = clamp(net.k / 300, 0, 1);
        const lr = net.k < 300 ? LR * (0.2 + 0.8 * e0 * e0 * (3 - 2 * e0)) : Math.max(LR * 0.3, LR * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (net.k - 300) / 500))));
        net.lr = lr;
        const P = [W[0], W[1], W[2], W[3], b[0], b[1]];
        for (let j = 0; j < 6; j++) { // Adam (bias at 3× the weight learning rate)
          net.m[j] = 0.9 * net.m[j] + 0.1 * g[j];
          net.v[j] = 0.999 * net.v[j] + 0.001 * g[j] * g[j];
          const mh = net.m[j] / (1 - Math.pow(0.9, net.t)), vh = net.v[j] / (1 - Math.pow(0.999, net.t));
          P[j] -= ((j >= 4 ? 3 : 1) * lr * mh) / (Math.sqrt(vh) + 1e-8);
        }
        net.W = [P[0], P[1], P[2], P[3]]; net.b = [P[4], P[5]];
        net.steps++;
        net.hist.push(loss);
        if (net.hist.length > 1800) net.hist.splice(0, 2);
        net.ema = net.steps === 1 ? loss : net.ema * 0.95 + loss * 0.05;
        while (net.dirs.length > 24) net.dirs.shift();
      }
      function resetNet(animated) {
        const from = { W: net.W.slice(), b: net.b.slice() };
        const far = Math.abs(from.b[0] - B0[0]) + Math.abs(from.b[1] - B0[1]) + from.W.reduce((s, x, i) => s + Math.abs(x - W0[i]), 0);
        net.m.fill(0); net.v.fill(0); net.t = 0; net.k = 0; net.steps = 0; net.hist.length = 0; net.ema = 0; net.dirs.length = 0;
        if (animated && !reduced && far > 1e-3) net.anim = { t0: S.sceneT, dur: 0.9, from };
        else { net.W = W0.slice(); net.b = B0.slice(); net.anim = null; ringFull = true; }
        zDirty = true;
      }
      // reduced motion: no training animation. Train in the background (≤ 12 ms per frame, no warm-up) while the
      // held state stays on screen, then show the converged state at once; nothing moves after that.
      function rmTrain(n) {
        if (!net.hold) net.hold = { W: net.W.slice(), b: net.b.slice(), steps: net.steps, n: net.hist.length, ema: net.ema };
        net.k = Math.max(net.k, 300);
        S.rmTrain = n;
      }
      function rmSettle() { // untrained references for the band scale, then a background run to convergence
        net.hold = null; S.rmTrain = 0; S.rmMuAt = 0;
        refreshAll(true);
        S.ring0 = ringMean(); S.ringMax0 = 0; for (let a = 0; a < NA; a++) S.ringMax0 = Math.max(S.ringMax0, ring[a]);
        rmTrain(420);
      }
      function rmStep() {
        const t0 = performance.now();
        while (S.rmTrain > 0 && performance.now() - t0 < 12) { trainStep(); S.rmTrain--; }
        if (S.rmTrain <= 0) { S.rmTrain = 0; net.hold = null; net.dirs.length = 0; zDirty = true; ringFull = true; }
      }

      // projections on the current direction c
      const PZ = new Float64Array(M), PY = new Float64Array(M);
      const NB = 34, TA = -3.5, TB = 5.0, BW = (TB - TA) / NB;
      const hZ = new Float64Array(NB), hY = new Float64Array(NB);
      const proj = { w2: 0, massZ: 0, massY: 0, theta: NaN, dirty: true };
      function cdir(th) {
        const q = th / (Math.PI / 2), r = Math.round(q);
        if (Math.abs(q - r) < 1e-9) { const m = ((r % 4) + 4) % 4; return [[1, 0], [0, 1], [-1, 0], [0, -1]][m]; }
        return [Math.cos(th), Math.sin(th)];
      }
      function projectNow() {
        const [c1, c2] = cdir(S.theta);
        hZ.fill(0); hY.fill(0);
        let zz = 0, zy = 0;
        for (let i = 0; i < M; i++) {
          const a = c1 * Z[2 * i] + c2 * Z[2 * i + 1], b = c1 * Y[2 * i] + c2 * Y[2 * i + 1];
          PZ[i] = a; PY[i] = b;
          if (a === 0) zz++; else { const k = Math.floor((a - TA) / BW); if (k >= 0 && k < NB) hZ[k]++; }
          if (b === 0) zy++; else { const k = Math.floor((b - TA) / BW); if (k >= 0 && k < NB) hY[k]++; }
        }
        PZ.sort(); PY.sort();
        let s = 0;
        for (let i = 0; i < M; i++) { const d = PZ[i] - PY[i]; s += d * d; }
        proj.w2 = s / M; proj.massZ = zz / M; proj.massY = zy / M; proj.theta = S.theta; proj.dirty = false;
      }
      // W₂²(θ) for every direction (round-robin, 8 directions per frame while the embeddings move)
      const ring = new Float64Array(NA), ringShow = new Float64Array(NA);
      const rz = new Float64Array(NR), ry = new Float64Array(NR);
      let ringCur = 0, ringInit = false;
      function ringUpdate(n) {
        for (let j = 0; j < n; j++) {
          const k = ringCur; ringCur = (ringCur + 1) % NA;
          const th = (k * Math.PI) / NA, c1 = Math.cos(th), c2 = Math.sin(th);
          for (let i = 0; i < NR; i++) { rz[i] = c1 * Z[2 * i] + c2 * Z[2 * i + 1]; ry[i] = c1 * Y[2 * i] + c2 * Y[2 * i + 1]; }
          rz.sort(); ry.sort();
          let s = 0;
          for (let i = 0; i < NR; i++) { const d = rz[i] - ry[i]; s += d * d; }
          ring[k] = s / NR;
        }
      }
      const ringMean = () => { let s = 0; for (let k = 0; k < NA; k++) s += ring[k]; return s / NA; };
      function ringAt(th) { // interpolated displayed value at any angle
        const u = ((th % Math.PI) + Math.PI) % Math.PI / Math.PI * NA;
        const k0 = Math.floor(u) % NA, k1 = (k0 + 1) % NA, f = u - Math.floor(u);
        return lerp(ringShow[k0], ringShow[k1], f);
      }
      // shares of the positive-orthant faces
      const share = { z: [0, 0, 0, 0], y: [0, 0, 0, 0], zeroZ: 0, zeroY: 0 };
      function countShares(Arr, out) {
        let o = 0, a1 = 0, a2 = 0, n = 0, zc = 0;
        for (let i = 0; i < M; i++) {
          const u = Arr[2 * i], v = Arr[2 * i + 1];
          if (u === 0 && v === 0) o++; else if (v === 0) a1++; else if (u === 0) a2++; else n++;
          zc += (u === 0) + (v === 0);
        }
        out[0] = o / M; out[1] = a1 / M; out[2] = a2 / M; out[3] = n / M;
        return zc / (2 * M);
      }
      function refreshAll(full) {
        const zc = forward(), yc = refreshY();
        if (zc) share.zeroZ = countShares(Z, share.z);
        if (yc) share.zeroY = countShares(Y, share.y);
        if (zc || yc || proj.theta !== S.theta || proj.dirty) projectNow();
        // every direction is recomputed whenever Z or Y jumped in one frame (reset, batch training, p morph)
        if (!ringInit || yc || full || ringFull) { ringUpdate(NA); ringInit = true; ringShow.set(ring); ringFull = false; return true; }
        if (zc) ringUpdate(8);
        return false;
      }

      /* ------------------------------------------------------------ step 0 · sample rain */
      const rain = { n: 0, zeros: 0, bins: new Float64Array(24), drops: [], nextT: 0, r: mulberry32(0x77), ghost: null };
      const RBW = 4 / 24;
      function rainReset() { rain.n = 0; rain.zeros = 0; rain.bins.fill(0); rain.drops.length = 0; }
      function spawnDrop(delay) { // Algorithm 1: y = max(0, µ + σ·S·(pG)^(1/p))
        const p = S.p, v = S.mu + sigmaGN(p) * stdGN(p, rain.r);
        const d = { v, x: Math.max(0, v), zero: v <= 0, t0: S.sceneT + delay, fall: 0.62, landed: false };
        rain.drops.push(d);
        if (rain.drops.length > 40) rain.drops.shift();
        return d;
      }
      function landDrop(d) {
        d.landed = true;
        rain.n++;
        if (d.zero) rain.zeros++;
        else { const k = Math.floor(d.x / RBW); if (k < 24) rain.bins[k]++; }
      }

      /* ------------------------------------------------------------ step 3 · feature matrix */
      const GR = mulberry32(0x5a5a);
      const GU = new Float64Array(64 * 16);
      for (let i = 0; i < GU.length; i++) GU[i] = 0.0005 + 0.999 * GR();
      // each cell: z = max(0, µ + σ_GN(p)·s), s = Φ_p⁻¹(u) for a fixed u → cells morph with p
      const gg = Morph(GU.length, p => { const a = new Float64Array(GU.length), s = sigmaGN(p); for (let i = 0; i < GU.length; i++) a[i] = s * PhiInv(p, GU[i]); return a; });
      const gridShow = new Float64Array(GU.length);
      // cells switching on/off are coalesced per 8th note (≤ 4 events/s), heard by direction, not one event per cell
      let gridPrevOn = null;
      const flips = { on: 0, off: 0, colOn: 0, colOff: 0 };
      const flipsClear = () => { flips.on = flips.off = flips.colOn = flips.colOff = 0; };
      // Φ_p⁻¹ is monotone, so the order of the uniforms is the order of the draws for every p
      const thumbOrder = Array.from({ length: 32 }, (_, i) => i).sort((x, y) => GU[x] - GU[y]);
      const CURVE = {}; // theory curves Φ_p(µ/σ) on µ ∈ [−3, 1] for the ghost shapes
      P_OPTS.forEach(pp => { const a = new Float64Array(121); for (let i = 0; i <= 120; i++) a[i] = activeFrac(pp, -3 + (4 * i) / 120); CURVE[pp] = a; });
      // pre-compute the quantile-coupled samples for every shape in idle time (first p click stays smooth)
      [[gg, 1], [gg, 0.5], [gm, 1], [gx, 1], [gm, 0.5], [gx, 0.5]].forEach(([mm, pp], j) => setTimeout(() => { try { mm.target(pp); } catch (e) {} }, 900 + j * 240));

      /* ------------------------------------------------------------ sound (low register: D3–A4) */
      let soundOn = false, clockOff = null, cloud = null, cloudT = 0, lastStAt = 0, lastStep = -1;
      const sndOK = () => !!(soundOn && au && au.ready && au.enabled);
      const bus = () => api.bus();
      function pl(name, a1, a2) {
        const f = au && au.play && au.play[name];
        if (typeof f !== 'function') return false;
        try { if (a2 === undefined) f(a1); else f(a1, a2); } catch (e) { /* audio must never break the scene */ }
        return true;
      }
      const withBus = o => Object.assign({ dest: bus() }, o || {});
      const V = {
        tick(m, o) { if (!sndOK()) return; o = withBus(o); pl('tick', m, o) || pl('blip', m, Object.assign({}, o, { dur: 0.03, gain: (o.gain || 0.5) * 0.35 })); },
        click(o) { if (!sndOK()) return; o = withBus(Object.assign({ freq: 2600 }, o)); pl('click', o) || pl('hat', Object.assign({}, o, { decay: 0.012, gain: (o.gain || 0.4) * 0.5 })); },
        bit(m, o) { if (!sndOK()) return; o = withBus(o); pl('bit', m, o) || pl('blip', m, Object.assign({}, o, { dur: 0.04, gain: (o.gain || 0.4) * 0.4 })); },
        grain(m, o) { if (!sndOK()) return; o = withBus(o); pl('grain', m, o) || pl('blip', m, Object.assign({}, o, { dur: o.dur || 0.08, gain: (o.gain || 0.4) * 0.45 })); },
        data(o) {
          if (!sndOK()) return; o = withBus(o);
          if (pl('data', o)) return;
          const t = o.when || au.now();
          for (let i = 0; i < 3; i++) pl('hat', { dest: o.dest, when: t + i * 0.021, decay: 0.01, gain: (o.gain || 0.3) * 0.4 });
        },
        glitch(o) {
          if (!sndOK()) return; o = withBus(o);
          if (pl('glitch', o) || pl('ratchet', o)) return;
          const t = o.when || au.now();
          for (let i = 0; i < 5; i++) pl('hat', { dest: o.dest, when: t + i * 0.028, decay: 0.012, gain: (o.gain || 0.3) * 0.5 * (1 - i * 0.15) });
        },
        ratchet(o) { if (!sndOK()) return; o = withBus(o); pl('ratchet', o) || this.glitch(o); },
        sub(m, o) { if (!sndOK()) return; o = withBus(o); pl('sub', m, o) || pl('bass', m, Object.assign({ bright: 0 }, o, { gain: (o.gain || 0.4) * 0.5 })); },
        kick(o) { if (!sndOK()) return; pl('kick', withBus(o)); },
        hat(o) { if (!sndOK()) return; pl('hat', withBus(o)); },
      };
      const deg = (i, oct) => (au && typeof au.degree === 'function' ? au.degree(i, oct) : 62 + [0, 2, 4, 7, 9][((i % 5) + 5) % 5] + 12 * (Math.floor(i / 5) + (oct || 0)));
      // value → scale degree: pitched events are grains between E3 (52) and A4 (69), always in key; positive
      // values start at G3 so every landing has a 200–400 Hz body that reads on laptop speakers
      const kOf = t => t * 1.8 - 4;
      const pitchOf = t => deg(clamp(Math.round(kOf(t)) + 1, -4, 3), 0);
      // an exact zero always makes the same sound: a short muted D3 bit (square-ish, so its 3rd/5th partials
      // carry on small speakers), only gain and a hair of pan vary. Non-zeros are pitched grains.
      function zeroBit(when, pan, g) {
        V.bit(50, { when, dur: 0.015 + Math.random() * 0.006, gain: g * (0.85 + Math.random() * 0.3), pan: clamp(pan + Math.random() * 0.1 - 0.05, -1, 1) });
      }
      // a direction detent: tuned tick plus a short grain body at the same note
      function detent(m, g, when) {
        V.tick(m, { gain: g, when });
        V.grain(m, { when, dur: 0.05, gain: g * 1.2, bright: 0.2 });
      }
      const rate = { t: 0, n: 0 };
      function limited(maxPerSec) { // rate limiter for interactive one-shots
        const now = performance.now() / 1000;
        if (now - rate.t > 1) { rate.t = now; rate.n = 0; }
        if (rate.n >= maxPerSec) return false;
        rate.n++;
        return true;
      }
      function nowSnap() { try { const c = au && au.clock && au.clock.nextStep ? au.clock.nextStep(1) : null; return c && c.time ? c.time : undefined; } catch (e) { return undefined; } }

      // granular cloud (continuous, low and dark, wide): the continuous part of the law. Falls back to
      // hand-scheduled grains if the engine has none. High-pass at 120 Hz so the D3 grains are not cut.
      let cloudParams = { density: 3, pitch: [55, 57, 62, 64], gain: 0.3, bright: 0.18, spread: 0.8, dur: 0.09, octave: 0.04, detune: 5 };
      function cloudStart() {
        if (cloud || !au || typeof au.granular !== 'function') return;
        try { cloud = au.granular(Object.assign({ dest: bus(), highpass: 120 }, cloudParams)); } catch (e) { cloud = null; }
      }
      function cloudStop() { if (cloud) { try { cloud.stop(0.6); } catch (e) {} cloud = null; } }
      function cloudSet(p) {
        cloudParams = Object.assign(cloudParams, p);
        if (cloud) { try { cloud.set(p, 0.25); } catch (e) {} }
      }
      // the point mass as a sound: a low, narrow (centred) bed of long soft grains on D3 · A3 · D4 whose
      // density and level follow the size of the mass at zero (Φ_p(−µ/σ) in steps 1, 4, 5; the projected
      // target's mass on the current slice in steps 2–3). The scene never drops to silence, and the sparser
      // the code, the fuller the bed.
      let mass = null;
      const massParams = { density: 4, pitch: [50, 57, 62], gain: 0.4, bright: 0.08, spread: 0.2, dur: 0.16, jitter: 0.55, detune: 4, octave: 0 };
      function massStart() {
        if (mass || !au || typeof au.granular !== 'function') return;
        try { mass = au.granular(Object.assign({ dest: bus(), highpass: 110, window: 'tukey', attack: 1.2 }, massParams)); } catch (e) { mass = null; }
      }
      function massStop() { if (mass) { try { mass.stop(0.8); } catch (e) {} mass = null; } }
      function massSet(q, g) {
        q = clamp(q, 0, 1);
        const d = 2 + 12 * q, gn = (0.14 + 0.3 * q) * g;
        if (Math.abs(d - massParams.density) < 0.05 && Math.abs(gn - massParams.gain) < 0.004) return;
        massParams.density = d; massParams.gain = gn;
        if (mass) { try { mass.set({ density: d, gain: gn }, 0.35); } catch (e) {} }
      }

      function stAt(time) { // scene-step time at a given audio time
        const lead = time - (au && au.now ? au.now() : 0);
        return S.sceneT - S.stepT0 + (S.paused ? 0 : lead);
      }

      function onClock(step, time) {
        if (!sndOK() || !api.isActive()) return;
        const b = step & 15;
        const st = stAt(time);
        if (S.step !== lastStep) { lastStep = S.step; lastStAt = st - 0.001; }
        const prev = lastStAt; lastStAt = st;
        const crossed = t => prev < t && st >= t;

        if (!cloud && cloudParams.density > 0 && Math.random() < cloudParams.density * (au.clock.stepDur || 0.127)) {
          const pp = cloudParams.pitch;
          V.grain(pp[(Math.random() * pp.length) | 0], { when: time + Math.random() * 0.1, dur: cloudParams.dur, gain: cloudParams.gain * 0.5, pan: (Math.random() * 2 - 1) * 0.7, bright: cloudParams.bright });
        }
        if (S.paused) return;

        if (S.step === 0) {
          if (!reduced && crossed(0.9)) V.glitch({ when: time, repeats: 6, len: 0.024, midi: 62, gain: 0.26 });
          if (!reduced && crossed(2.3)) { // the point mass lands: clean sub + a D3 · A3 grain body + low tick, louder when more mass collapses
            const q = 1 - activeFrac(S.p, S.mu);
            V.sub(38, { when: time, dur: 0.55, gain: 0.35 + 0.45 * q, harmonic: 0.3 });
            V.grain(50, { when: time, dur: 0.24, gain: 0.45 + 0.3 * q, bright: 0.2 });
            V.grain(57, { when: time + 0.03, dur: 0.2, gain: 0.3 + 0.2 * q, bright: 0.15, pan: 0.15 });
            V.tick(deg(0, 0), { when: time, gain: 0.3 });
          }
          if (st > 3 && !reduced && !rainFull()) { // one sample per 16th: a grain pitched by where it lands, the one zero bit when it collapses
            const lead = Math.max(0, time - au.now());
            const d = spawnDrop(lead);
            if (!d.zero) V.grain(pitchOf(d.x * 1.2), { when: time + d.fall, dur: 0.075, bright: 0.2, gain: 0.5 + 0.2 * Math.min(1, d.x / 2), pan: clamp((d.x - 1.5) / 2.5, -0.8, 0.8) });
            else zeroBit(time + d.fall + 0.2, -0.3, 0.3); // lands in the mass 0.2 s later
          }
          if (b === 0 && (step & 31) === 0) V.sub(38, { when: time, dur: 0.3, gain: 0.2, harmonic: 0.3 });
        } else if (S.step === 1 || S.step === 2) {
          const conv = matchLevel();
          if ((b & 1) === 0 && !proj.dirty && !S.drag) { // sort-and-match pairs: target, then the embedding's (a flam → a unison); zeros as zero bits
            const i = (step >> 1) & 15, idx = Math.min(M - 1, Math.floor(((i + 0.5) / 16) * M));
            const ty = PY[idx], tz = PZ[idx], gap = Math.abs(tz - ty), fl = Math.min(0.06, gap * 0.04);
            if (ty !== 0) V.grain(pitchOf(ty), { when: time, dur: 0.07, bright: 0.16, gain: 0.54, pan: 0.38 });
            else zeroBit(time, 0.38, 0.24);
            if (tz !== 0) V.grain(pitchOf(tz), { when: time + fl, dur: 0.07, bright: 0.16, gain: 0.47, pan: -0.38 });
            else zeroBit(time + fl, -0.38, 0.21);
          }
          if (S.step === 2 && !net.anim && net.steps > 0) {
            const m = 1 - conv;
            if (b === 0 && m > 0.12) V.data({ when: time, dur: 0.22, density: 22 + 40 * m, spread: 0.9, gain: 0.1 + 0.18 * m, pitch: [57, 62, 66] });
            if ((b & 1) === 1 && m > 0.08 && Math.random() < 0.4 * m + 0.05) V.click({ when: time + Math.random() * 0.05, gain: 0.1 + 0.12 * m, pan: Math.random() * 1.6 - 0.8 });
            if (conv > 0.35 && (b === 0 || b === 8)) V.kick({ when: time, gain: 0.25 * conv * conv });
            if (conv > 0.55 && (b & 3) === 2) V.hat({ when: time, gain: 0.2 * conv, decay: 0.03 });
            if (conv > 0.45 && b === 0) V.sub(38, { when: time, dur: 0.45, gain: 0.3 * conv });
            if (conv > 0.85 && b === 14 && ((step >> 4) & 3) === 3) V.ratchet({ when: time, count: 3, gain: 0.14 });
            if (conv > 0.9 && !net.resolved) { // resolved: consonant low grain chord
              net.resolved = true;
              [50, 57, 62, 66, 69].forEach((mm, j) => V.grain(mm, { when: time + j * 0.045, dur: 0.16, gain: 0.28, pan: -0.5 + j * 0.25, bright: 0.2 }));
            }
          } else if (S.step === 1 && b === 0 && ((step >> 4) & 1) === 0) {
            V.sub(38, { when: time, dur: 0.35, gain: 0.16 });
          }
        } else if (S.step === 3) { // arpeggiate the active dimensions of one row: silence = sparsity
          const rowN = L.di ? L.di.rows : 12, r = (step >> 4) % rowN, k = b;
          const nf = flips.on + flips.off;
          if ((b & 1) === 1 && nf > 0) { // the off-beat 16th of each 8th: one event for all flips since the last one
            const nc = L.di ? L.di.cols : 64, act = activeFrac(S.p, S.mu);
            const d0 = clamp(Math.round(act * 6) - 4, -4, 2); // pitch follows the density the dial is at
            if (flips.on >= flips.off) { // net switch-on: a soft low grain rising a step
              const g = 0.22 + 0.2 * Math.min(1, flips.on / 40), pan = -0.7 + 1.4 * (flips.colOn / flips.on) / (nc - 1);
              V.grain(deg(d0, 0), { when: time, dur: 0.07, gain: g, pan, bright: 0.14 });
              V.grain(deg(d0 + 1, 0), { when: time + 0.045, dur: 0.06, gain: g * 0.7, pan, bright: 0.16 });
            } else { // net switch-off: a short muted bit gliding down, quieter (silence is the point)
              const m0 = deg(d0, 0), pan = -0.7 + 1.4 * (flips.colOff / flips.off) / (nc - 1);
              V.bit(m0, { when: time, dur: 0.03, gain: 0.12 + 0.1 * Math.min(1, flips.off / 40), to: m0 - 5, pan });
            }
            flipsClear();
          } else {
            const v = Math.max(0, S.mu + gg.cur[r * 64 + k]);
            if (v > 0) { // active cells of the row, left to right: pitch by column, level by magnitude (E3–A4)
              const mag = Math.min(1, v / 2);
              V.grain(deg(Math.round((k * 7) / 15) - 4, 0), { when: time, dur: 0.07 + 0.07 * mag, gain: 0.36 + 0.3 * mag, pan: -0.7 + 1.4 * (k / 15), bright: 0.16 + 0.14 * mag });
            }
          }
          if ((b & 3) === 0) V.click({ when: time, gain: 0.06, freq: 2400 });
          if (b === 0) V.sub(38, { when: time, dur: 0.38, gain: 0.16 + 0.2 * activeFrac(S.p, S.mu), harmonic: 0.3 });
        } else if (S.step === 4) { // accuracy as pitch while the frontier draws on (encoder above, projector an octave below)
          for (let i = 0; i < 9; i++) {
            const tp = paretoT(i);
            if (crossed(tp)) paretoPair(i, time, 1);
          }
          if (crossed(paretoT(6.1))) { V.glitch({ when: time, repeats: 6, len: 0.026, midi: 57, gain: 0.26 }); V.sub(33, { when: time, dur: 0.6, gain: 0.45, harmonic: 0.3 }); }
          // then the measured row the slider points at (the ringed pair) pulses every half note: move µ
          // and the pulse moves with it, and past ~95% zeros the lower (projector) voice falls
          if (st > 3.2 && (b === 0 || b === 8)) paretoPair(nearRow(), time, 0.8);
          if (st > 4.2 && b === 0 && ((step >> 4) & 1) === 0) V.sub(38, { when: time, dur: 0.3, gain: 0.14, harmonic: 0.3 });
        }
      }
      // one measured Table-13 row as two grains: encoder accuracy above, projector an octave below (brighter, so
      // the A2–F#3 voice keeps some upper partials on small speakers)
      function paretoPair(i, time, g) {
        V.grain(deg(clamp(Math.round(T13.enc[i] - 73.5), -3, 3), 0), { when: time, dur: 0.075, gain: 0.44 * g, bright: 0.18, pan: 0.12 });
        V.grain(deg(clamp(Math.round((T13.proj[i] - 62) / 2.5), -3, 3), -1), { when: time + 0.03, dur: 0.12, gain: 0.46 * g, bright: 0.3, pan: -0.12 });
      }
      function nearRow() { let n = 0; T13.mu.forEach((v, i) => { if (Math.abs(v - S.mu) < Math.abs(T13.mu[n] - S.mu)) n = i; }); return n; }
      function rainFull() { let n = 0; for (const d of rain.drops) if (!d.landed) n++; return n > 14; }
      function matchLevel() { // 0 = far from the target along some directions, 1 = matched within sampling noise
        if (!S.ring0) return 0;
        const m = ringMean(), m0 = S.ring0;
        const floor = 0.0012; // the exact empirical W₂² of two matched 1600-point samples sits well below this
        if (!(m > 0)) return 0;
        return clamp(1 - Math.log(Math.max(m, floor) / floor) / Math.log(Math.max(m0, floor * 2) / floor), 0, 1);
      }
      function updateCloud(dt) {
        cloudT += dt;
        if (cloudT < 0.1) return;
        cloudT = 0;
        if (S.step === 0) { // wide cloud = the continuous part (density ∝ active share); centred bed = the mass
          const act = activeFrac(pNow(), S.mu);
          cloudSet({ density: 1.5 + 6 * act, pitch: [55, 57, 62, 64, 66], gain: 0.26, bright: 0.18, spread: 0.85, dur: 0.1, detune: 5 });
          massSet(1 - act, 1);
        } else if (S.step === 1 || S.step === 2) {
          // scale degrees only; the mismatch between embeddings and target is heard as detune and width
          const conv = matchLevel(), speed = clamp(Math.abs(S.dragVel) / 2.5, 0, 1);
          const qs = [0.1, 0.3, 0.5, 0.7, 0.9].map(q => {
            const i = Math.floor(q * (M - 1));
            return deg(clamp(Math.round(lerp(kOf(PZ[i]), kOf(PY[i]), conv)) - 1, -4, 3), 0);
          });
          const dens = (S.step === 2 ? 3 + 7 * (1 - conv) : 2.5) + 8 * speed;
          cloudSet({ density: dens, pitch: qs, gain: 0.26 + 0.2 * speed + (S.step === 2 ? 0.08 * conv : 0), bright: 0.15 + 0.1 * conv, spread: 0.5 + 0.4 * (1 - conv), detune: 5 + 40 * (1 - conv), dur: 0.08 + 0.06 * conv });
          massSet(proj.massY, 1.1); // the target's point mass on this slice: swells on the axes, thins on diagonals
        } else if (S.step === 3) {
          const act = activeFrac(pNow(), S.mu);
          cloudSet({ density: 1 + 5 * act, pitch: [55, 57, 62, 66], gain: 0.24, bright: 0.15, spread: 0.7, dur: 0.1, detune: 5 });
          massSet(1 - act, 0.9);
        } else {
          cloudSet({ density: 2, pitch: [55, 57, 62, 66], gain: 0.22, bright: 0.18, spread: 0.8, dur: 0.1, detune: 5 });
          massSet(ZEROS13[nearRow()] / 100, 0.8); // the measured zero share of the ringed row
        }
      }

      /* ------------------------------------------------------------ state changes */
      function touch() { S.lastUser = S.sceneT; }
      function togglePause() {
        S.paused = !S.paused; touch();
        api.hint(S.paused ? 'Paused · space to resume' : 'Playing', 1400);
        renderCtr();
      }
      function applyMu(v) {
        v = clamp(v, -3, 1);
        if (v === S.mu) return;
        S.mu = v;
        if (S.step === 0) rainReset();
        if (S.step === 2) {
          net.k = Math.min(net.k, 300); net.resolved = false; // re-warm the learning rate for the new target
          if (reduced) S.rmMuAt = S.rt + 0.3; // reduced motion: retrain once the value settles
        }
        sliderSet(v);
      }
      function glideMu(to) {
        if (reduced) { applyMu(to); return; }
        S.muAnim = { from: S.mu, to, t0: S.rt, dur: 0.8 };
      }
      function changeP(pv, user) {
        if (user) S.pUser = true;
        if (pv === S.p) { renderP(); return; }
        const pf = pNow();
        gm.freeze(); gg.freeze(); gx.freeze();
        PM.from = pf; PM.t0 = reduced ? -1e9 : S.rt; S.p = pv; S.pAt = S.rt;
        renderP(); patchSlider(true);
        if (S.step === 0 && rain.n > 8 && !reduced) rain.ghost = { bins: Float64Array.from(rain.bins), n: rain.n, t0: S.rt };
        rainReset();
        // a new shape is a new target: retrain visibly from the start (the p = 2 optimum is any rotation,
        // the p ≤ 1 ones only signed permutations, so continuing from it would look like drift)
        if (S.step === 2) {
          resetNet(true); S.ring0 = 0; net.resolved = false; S.trainAcc = 0;
          if (reduced) rmSettle();
        }
        if (user && sndOK() && limited(10)) V.bit([deg(-2, 0), deg(0, 0), deg(2, 0)][P_OPTS.indexOf(pv)], { gain: 0.3, dur: 0.03, when: nowSnap() });
      }
      function cycleP() { changeP(P_OPTS[(P_OPTS.indexOf(S.p) + 1) % P_OPTS.length], true); }

      let hintT = 0, hintAt = -1e9;
      function goStep(i, user, force) {
        i = clamp(i | 0, 0, STEPS.length - 1);
        if (i === S.step && !force) return;
        const prevLayer = S.step >= 0 ? LAYER[S.step] : -1;
        const prevStep = S.step;
        S.step = i;
        S.stepT0 = S.sceneT;
        stepper.set(i);
        api.caption(CAPS[i]);
        // the context headline for the step (re-entering the scene replays its word-by-word entrance)
        setHL(i, user === 'silent');
        if (L.arts) L.art = L.arts[LAYER[i]];
        if (S.mouse && S.mouse.touch) S.mouse = null;
        // default shape: Gaussian (p = 2) for the density and the 2-D toy, Laplace (p = 1) where Table 13 is compared
        if (!S.pUser) { const want = i >= 3 ? 1 : 2; if (want !== S.p) changeP(want, false); }
        if (!S.muUser && MU_DEF[i] != null && Math.abs(S.mu - MU_DEF[i]) > 1e-9) glideMu(MU_DEF[i]);
        // leaving the sparsity dial mid-sweep: µ settles where the sweep would have (−1), not at a mid-sweep value
        if (prevStep === 3 && S.sweep && !S.muUser && MU_DEF[i] == null) { S.sweep = null; glideMu(-1); }
        renderCtr();
        renderP();
        patchSlider(true);
        if (i !== 1 && i !== 2) { // a queued or visible dial hint is stale once the dial is gone
          clearTimeout(hintT);
          if (performance.now() - hintAt < 3300) { try { api.hint('', 1); } catch (e) {} hintAt = -1e9; }
        }
        if (i === 0) { rainReset(); rain.ghost = null; }
        if (i !== 2) { net.hold = null; S.rmTrain = 0; S.rmMuAt = 0; } // a background run belongs to step 2 only
        if (i === 1) {
          if (prevLayer !== 1 || force) S.sliceT0 = S.sceneT;
          resetNet(prevLayer === 1 && !force);
          S.rot = { mode: 'hold', t0: S.sceneT + (prevLayer === 1 ? 0 : 2.2), from: S.theta, to: S.theta };
          // the dial hint only where the headline does not already say "drag the line" (the title-only short phones)
          if (user !== 'silent' && !S.hinted && L.hlv[1] === 'n') {
            S.hinted = true;
            clearTimeout(hintT);
            hintT = setTimeout(() => {
              if (!api.isActive() || !(S.step === 1 || S.step === 2) || L.hlv[1] !== 'n') return;
              api.hint('Drag the line to rotate it', 3200); hintAt = performance.now();
            }, 900);
          }
        }
        if (i === 2) {
          if (prevLayer !== 1 || force) S.sliceT0 = S.sceneT - 3;
          resetNet(prevLayer === 1);
          net.resolved = false;
          S.ring0 = 0;
          if (reduced) rmSettle(); // final state only: references from the untrained ring, then a background run
        }
        if ((i === 1 || i === 2) && prevLayer !== 1) ringFull = true;
        if (i === 3) {
          S.sweep = !reduced && S.sceneT - S.lastMuUser > IDLE ? { t0: S.sceneT, from: S.mu } : null;
          if (S.sweep) S.muAnim = null;
          gridPrevOn = null; flipsClear();
        }
        if (prevStep !== -1 && prevStep !== i && sndOK()) {
          V.data({ dur: 0.12, density: 50, spread: 0.9, gain: 0.12, pitch: [62, 66, 69], when: nowSnap() });
        }
      }

      /* ------------------------------------------------------------ pointer */
      function inDial(x, y) {
        if (!(S.step === 1 || S.step === 2) || !L.sl) return false;
        const { cx, cy, R } = L.sl;
        const d = Math.hypot(x - cx, y - cy);
        if (!L.mob && x < 290) return false;
        return d < R + (L.mob ? 30 : 46) && d > 6;
      }
      const angOf = (x, y) => Math.atan2(L.sl.cy - y, x - L.sl.cx);
      function wrapA(a) { a %= TAU; return a < 0 ? a + TAU : a; }
      function setTheta(a, fromUser) {
        let th = wrapA(a);
        const snap = Math.round(th / (Math.PI / 4)) * (Math.PI / 4);
        if (Math.abs(th - snap) < 2.2 * DEG) th = wrapA(snap);
        const prev = S.theta;
        S.theta = th;
        if (fromUser) {
          const det = Math.floor(th / (5 * DEG));
          if (det !== S.detent) {
            S.detent = det;
            const on45 = Math.abs(th - snap) < 1e-9;
            if (on45) detent(deg((Math.round(th / (Math.PI / 4)) % 8) - 3, 0), 0.3, nowSnap());
            else if (limited(8)) V.click({ gain: 0.11, pan: clamp(Math.cos(th) * 0.6, -0.6, 0.6) });
          }
        }
        return th - prev;
      }
      let dragLastT = 0;
      cv.canvas.addEventListener('pointerdown', e => {
        const x = e.clientX, y = e.clientY;
        if (e.pointerType === 'touch') S.mouse = { x, y, touch: true }; // taps reveal the hover details on phones
        if (inDial(x, y)) {
          const a = angOf(x, y);
          const d = Math.abs(((a - S.theta + Math.PI * 3) % TAU) - Math.PI);
          S.drag = { id: e.pointerId, off: d > Math.PI / 2 ? Math.PI : 0 };
          try { cv.canvas.setPointerCapture(e.pointerId); } catch (_) {}
          touch(); S.lastRot = S.sceneT;
          dragLastT = performance.now();
          setTheta(a + S.drag.off, true);
          cv.canvas.style.cursor = 'grabbing';
          e.preventDefault();
        }
      });
      cv.canvas.addEventListener('pointermove', e => {
        const x = e.clientX, y = e.clientY;
        S.mouse = { x, y, touch: e.pointerType === 'touch' };
        if (S.drag && e.pointerId === S.drag.id) {
          const now = performance.now(), dtm = Math.max(1, now - dragLastT) / 1000;
          dragLastT = now;
          const d = setTheta(angOf(x, y) + S.drag.off, true);
          const dd = Math.abs(d) > Math.PI ? 0 : d;
          S.dragVel = lerp(S.dragVel, dd / dtm, 0.35);
          touch(); S.lastRot = S.sceneT;
          return;
        }
        const over = inDial(x, y);
        if (over !== S.hoverDial) { S.hoverDial = over; cv.canvas.style.cursor = over ? 'grab' : ''; }
      });
      const endDrag = e => {
        if (!S.drag || (e && e.pointerId !== S.drag.id)) return;
        S.drag = null;
        try { cv.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
        cv.canvas.style.cursor = S.hoverDial ? 'grab' : '';
      };
      cv.canvas.addEventListener('pointerup', endDrag);
      cv.canvas.addEventListener('pointercancel', endDrag);
      cv.canvas.addEventListener('pointerleave', e => { if (!S.drag && e.pointerType !== 'touch') { S.mouse = null; S.hoverDial = false; cv.canvas.style.cursor = ''; } });
      // keep a dial drag from turning into the shell's horizontal scene swipe
      let touchInDial = false;
      cv.canvas.addEventListener('touchstart', e => { const t = e.touches[0]; touchInDial = !!t && inDial(t.clientX, t.clientY); if (touchInDial) e.stopPropagation(); }, { passive: true });
      cv.canvas.addEventListener('touchend', e => { if (touchInDial) e.stopPropagation(); touchInDial = false; }, { passive: true });

      /* ------------------------------------------------------------ update */
      let slFrame = 0;
      function update(dt) {
        S.rt += dt;
        ensure(LAYER[S.step]);
        const st = S.sceneT - S.stepT0;
        // autoplay
        if (!reduced && !S.paused && S.sceneT - S.lastUser > IDLE && st > DUR[S.step] && !S.drag) {
          goStep((S.step + 1) % STEPS.length, false);
        }
        // layer change: the outgoing layer (canvas and labels) fades out linearly in 150 ms; the incoming one
        // starts only once it is fully gone, so text never sits on text (no double exposure)
        const want = LAYER[S.step];
        if (reduced) { for (let l = 0; l < 4; l++) S.vis[l] = l === want ? 1 : 0; }
        else {
          let others = 0;
          for (let l = 0; l < 4; l++) {
            if (l === want) continue;
            S.vis[l] = Math.max(0, S.vis[l] - dt / 0.15);
            others = Math.max(others, S.vis[l]);
          }
          if (others === 0) S.vis[want] += (1 - S.vis[want]) * (1 - Math.exp(-dt * 7));
        }
        S.dragVel *= S.drag ? 0.92 : 0.85;
        // µ glide to a step's default
        if (S.muAnim) {
          const e = easeIO((S.rt - S.muAnim.t0) / S.muAnim.dur);
          applyMu(e >= 1 ? S.muAnim.to : Math.round(lerp(S.muAnim.from, S.muAnim.to, e) * 100) / 100);
          if (e >= 1) S.muAnim = null;
        }
        // readouts follow the p morph (the slider label every other frame; the header is typeset per draw)
        if (S.rt - PM.t0 < PM_DUR + 0.1 && (++slFrame & 1) === 0) patchSlider(false);
        // smoothed display values for p-dependent data highlights
        const ks = reduced ? 1 : 1 - Math.exp(-dt * 6);
        S.a13 += ((S.p === 1 ? 1 : 0.4) - S.a13) * ks;
        const t5i = T5.p.indexOf(S.p);
        if (t5i >= 0) S.t5y += (T5.l0[t5i] - S.t5y) * ks;

        // steps 1–2: rotation, network, projections
        if (S.vis[1] > 0.01 || LAYER[S.step] === 1) {
          if (!S.drag && !S.paused && S.sceneT - S.lastRot > 9 && !reduced) autoRotate(dt, st);
          if (net.anim) {
            const e = easeIO((S.sceneT - net.anim.t0) / net.anim.dur);
            net.W = net.anim.from.W.map((x, i) => lerp(x, W0[i], e));
            net.b = net.anim.from.b.map((x, i) => lerp(x, B0[i], e));
            if (e >= 1) { net.anim = null; net.W = W0.slice(); net.b = B0.slice(); ringFull = true; }
          } else if (reduced) {
            // reduced motion: background runs only (entering the step, a new p, 'r', or µ once it settles)
            if (S.step === 2 && S.rmMuAt && S.rt >= S.rmMuAt) { S.rmMuAt = 0; rmTrain(300); }
            if (S.step === 2 && S.rmTrain > 0) rmStep();
          } else if (S.step === 2 && !S.paused && st > 0.6) {
            // pace: 20 SGD steps/s while the cloud is moving (so the flow is watchable), then 60/s
            S.trainAcc = (S.trainAcc || 0) + (net.steps < 150 ? 0.34 : net.steps < 320 ? 0.67 : 1);
            while (S.trainAcc >= 1) { S.trainAcc -= 1; trainStep(); }
          }
          const fresh = refreshAll(false);
          if (fresh || !S.ring0) {
            // the references for the band scale and the "converged" beat come from a complete, current ring
            if (!S.ring0 && !net.anim && (S.step === 1 || S.step === 2) && (net.steps === 0 || S.step === 1)) S.ring0 = ringMean();
            if (!net.anim && net.steps === 0) { let mx = 0; for (let a = 0; a < NA; a++) mx = Math.max(mx, ring[a]); S.ringMax0 = mx; }
          }
          const kk = reduced ? 1 : 1 - Math.exp(-dt * 10);
          for (let a = 0; a < NA; a++) ringShow[a] += (ring[a] - ringShow[a]) * kk;
        }
        // step 0: rain without sound (with sound, the clock spawns samples on the 16th grid)
        if (S.step === 0 && !S.paused) {
          if (!sndOK() && st > 3 && !reduced) {
            if (S.sceneT >= rain.nextT) { rain.nextT = S.sceneT + 0.127; if (!rainFull()) spawnDrop(0); }
          }
          for (const d of rain.drops) if (!d.landed && S.sceneT >= d.t0 + d.fall + (d.zero ? 0.2 : 0)) landDrop(d);
          if (reduced && rain.n < 400) { for (let j = 0; j < 400; j++) landDrop(spawnDrop(-1)); rain.drops.length = 0; }
          if (rain.drops.length) rain.drops = rain.drops.filter(d => S.sceneT - d.t0 < d.fall + 1.2);
        }
        if (rain.ghost && S.rt - rain.ghost.t0 > 1.2) rain.ghost = null;
        // step 3: autoplay sweep of µ (stops when the slider is touched): 1 → −3 → −1
        if (S.step === 3 && S.sweep && !S.paused) {
          const t = S.sceneT - S.sweep.t0, f = S.sweep.from;
          let v = f;
          if (t < 1.0) v = f;
          else if (t < 4.2) v = lerp(f, 1, easeIO((t - 1.0) / 3.2));
          else if (t < 9.0) v = lerp(1, -3, easeIO((t - 4.2) / 4.8));
          else if (t < 11.6) v = lerp(-3, -1, easeIO((t - 9.0) / 2.6));
          else { v = -1; S.sweep = null; }
          applyMu(Math.round(v * 100) / 100);
        }
        if (S.vis[2] > 0.01 || LAYER[S.step] === 2 || S.step === 3) gg.update();
        if (S.step === 3 && L.di) gridTick(dt);
        if (sndOK()) updateCloud(dt);
        else cloudT = 0;
      }
      function autoRotate(dt) {
        if (S.step === 1) {
          const R = S.rot;
          if (S.sceneT < R.t0) return;
          if (R.mode === 'hold') {
            if (S.sceneT - R.t0 > 1.0) {
              const q = Math.PI / 4;
              R.mode = 'move'; R.t0 = S.sceneT; R.from = S.theta; R.to = Math.floor(S.theta / q + 1e-6) * q + q;
            }
          } else {
            const e = easeIO((S.sceneT - R.t0) / 1.5);
            S.theta = lerp(R.from, R.to, e);
            if (e >= 1) {
              S.theta = wrapA(R.to); R.mode = 'hold'; R.t0 = S.sceneT;
              detent(deg((Math.round(S.theta / (Math.PI / 4)) % 8) - 3, 0), 0.26, nowSnap());
            }
          }
        } else if (S.step === 2) {
          S.theta = wrapA(S.theta + dt * 9 * DEG);
        }
      }
      function gridTick(dt) { // smooth the displayed magnitudes; queue on/off flips for the clock (sounded on the 16th grid)
        const g = gg.cur, n = L.di.cols, rows = L.di.rows;
        const kk = 1 - Math.exp(-dt * 10);
        const on = gridPrevOn || new Uint8Array(GU.length);
        for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) {
          const i = r * 64 + c, v = Math.max(0, S.mu + g[i]);
          gridShow[i] += (v - gridShow[i]) * kk;
          const o = v > 0 ? 1 : 0;
          if (gridPrevOn && o !== on[i]) { if (o) { flips.on++; flips.colOn += c; } else { flips.off++; flips.colOff += c; } }
          on[i] = o;
        }
        gridPrevOn = on;
        if (!sndOK()) flipsClear();
      }
      // seconds (step time) when point i draws on: ease-out over 1.6 s, so the cliff (last segments) lands by ~2.1 s
      function paretoT(i) { return 0.5 + 1.6 * (1 - Math.sqrt(Math.max(0, 1 - i / 8))); }

      /* ------------------------------------------------------------ draw helpers */
      function text(s, x, y, o) { // canvas mono text; y is the vertical centre
        o = o || {};
        ctx.font = o.font || FM(o.size || 12);
        ctx.fillStyle = o.color || T2;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = o.base || 'middle';
        ctx.fillText(s, x, y);
      }
      function kick(s, x, y, o) { // canvas kicker (see kw)
        const ls = 'letterSpacing' in ctx;
        if (ls) ctx.letterSpacing = KLS;
        text(s, x, y, Object.assign({ color: T3 }, o));
        if (ls) ctx.letterSpacing = '0.2px';
      }
      function line(x1, y1, x2, y2, color, w, dash) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = color; ctx.lineWidth = w || 1;
        if (dash) ctx.setLineDash(dash);
        ctx.stroke();
        if (dash) ctx.setLineDash([]);
      }
      function ktext(s, x, y, o) { // text on a white knockout, for labels that sit over data
        o = o || {};
        ctx.font = o.font || FM(o.size || 12);
        const w = ctx.measureText(s).width, al = o.align || 'left';
        const x0 = al === 'right' ? x - w : al === 'center' ? x - w / 2 : x;
        ctx.fillStyle = C.bg; ctx.fillRect(x0 - 3, y - 8, w + 6, 16);
        text(s, x, y, o);
      }
      const px = v => Math.round(v) + 0.5;
      function plus(x, y, s, color) { ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke(); }
      function diamond(x, y, r, fill, stroke) {
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
      }

      /* ------------------------------------------------------------ layer 0 · Rectify */
      function drawRect(st) {
        const G = L.re, mob = L.mob, p = pNow(), s = sigmaGN(p), mu = S.mu;
        const q = 1 - Phi(p, mu / s);
        const Xp = x => G.x0 + ((x - G.xmin) / (G.xmax - G.xmin)) * G.w;
        const Yd = d => G.base - Math.min(d, G.dmax) * G.k;
        const eDrain = reduced ? 1 : easeIO((st - 0.9) / 1.4);
        const ePost = reduced ? 1 : ease((st - 2.3) / 0.8);
        const x0px = Xp(0);
        let tgnClip = 0;

        lab('reHead', reHeadHTML(G.hv), G.x0, G.top, { ay: 0 });

        // unit ℓp ball inset (Prop. 3.3: max entropy under a fixed E‖x‖ₚᵖ) — morphs with p
        if (!mob) {
          if (G.showBall) {
            const { bx, by, br } = G.ball;
            line(px(bx - br - 8), px(by), px(bx + br + 8), px(by), C.g300, 1);
            line(px(bx), px(by - br - 8), px(bx), px(by + br + 8), C.g300, 1);
            const e2 = 2 / p;
            ctx.beginPath();
            for (let i = 0; i <= 160; i++) {
              const t = (i / 160) * TAU, c = Math.cos(t), sn = Math.sin(t);
              const xx = Math.sign(c) * Math.pow(Math.abs(c), e2), yy = Math.sign(sn) * Math.pow(Math.abs(sn), e2);
              if (i) ctx.lineTo(bx + xx * br, by - yy * br); else ctx.moveTo(bx + xx * br, by - yy * br);
            }
            ctx.strokeStyle = C.g500; ctx.lineWidth = 1; ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i <= 60; i++) {
              const t = (i / 60) * (Math.PI / 2), c = Math.cos(t), sn = Math.sin(t);
              const xx = Math.pow(c, e2), yy = Math.pow(sn, e2);
              if (i) ctx.lineTo(bx + xx * br, by - yy * br); else ctx.moveTo(bx + xx * br, by - yy * br);
            }
            ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.stroke();
            lab('reBall', RE_BALL(), bx - br - 16, by, { ax: 1 });
          }
          if (!G.legBelow) lab(G.legKey, G.legKey === 'reLegN' ? RE_LEG_N() : RE_LEG(), G.x1, G.legY0, { ax: 1, ay: 0 });
        }

        // axis, ticks, guide at 0
        line(Xp(G.xmin), px(G.base), Xp(G.xmax), px(G.base), C.ink, 1);
        for (let x = G.xmin; x <= G.xmax; x++) {
          line(px(Xp(x)), G.base, px(Xp(x)), G.base + 4, C.ink, 1);
          text(fmt(x, 0), Xp(x), G.base + 17, { align: 'center', size: 11, color: TK });
        }
        line(px(x0px), G.base, px(x0px), G.clipY - 6, C.g300, 1, [2, 3]);

        // curve samples
        const N = mob ? 180 : 300, xs = new Float64Array(N + 1), fs = new Float64Array(N + 1);
        for (let i = 0; i <= N; i++) { const x = G.xmin + ((G.xmax - G.xmin) * i) / N; xs[i] = x; fs[i] = gnPdf(p, mu, s, x); }
        const iz = Math.round(((0 - G.xmin) / (G.xmax - G.xmin)) * N);

        // negative mass: shaded, drains into the stem
        if (eDrain < 1) {
          ctx.beginPath();
          ctx.moveTo(Xp(G.xmin * (1 - eDrain)), G.base);
          for (let i = 0; i <= iz; i++) ctx.lineTo(Xp(xs[i] * (1 - eDrain)), Yd(fs[i]));
          ctx.lineTo(x0px, G.base);
          ctx.closePath();
          ctx.fillStyle = acc(0.13 * (1 - 0.6 * eDrain));
          ctx.fill();
          ctx.beginPath();
          for (let i = 0; i <= iz; i++) { const X_ = Xp(xs[i] * (1 - eDrain)), Y_ = Yd(fs[i]); if (i) ctx.lineTo(X_, Y_); else ctx.moveTo(X_, Y_); }
          ctx.strokeStyle = ink(0.45 * (1 - eDrain)); ctx.lineWidth = 1; ctx.stroke();
        }
        // ghost of the pre-rectification density
        if (eDrain > 0) {
          ctx.beginPath();
          for (let i = 0; i <= iz; i++) { const X_ = Xp(xs[i]), Y_ = Yd(fs[i]); if (i) ctx.lineTo(X_, Y_); else ctx.moveTo(X_, Y_); }
          ctx.setLineDash([2, 3]); ctx.strokeStyle = `rgba(153,153,153,${0.9 * eDrain})`; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
        }
        // point-mass label: left of the stem unless the pre-ReLU density (dotted) runs through that spot; then the
        // short form, then lifted clear above the curve, then level with the stem top but left of the curve
        function ghostY(xa, xb) { // screen-y extent of the dotted density over [xa, xb]
          if (eDrain <= 0) return null;
          let top = Infinity, bot = -Infinity;
          for (let i = 0; i <= iz; i++) { const X_ = Xp(xs[i]); if (X_ < xa || X_ > xb) continue; const y = Yd(fs[i]); if (y < top) top = y; if (y > bot) bot = y; }
          if (mu <= 0 && Xp(mu) >= xa && Xp(mu) <= xb) top = Math.min(top, Yd(gnPdf(p, mu, s, mu)));
          return top === Infinity ? null : { top, bot };
        }
        const hits = (xa, ya, xb, yb) => { const g = ghostY(xa, xb); return !!g && g.top <= yb + 3 && g.bot >= ya - 3; };
        function placeMass(yTop) {
          const xr = x0px - 12, wl = (G.massW || 250) + 8, hl = G.massH || 44, ws = G.massWs + 8, hs = G.massHs;
          if (!G.massShort && !hits(xr - wl, yTop - 11, xr, yTop - 11 + hl)) return { short: false, xr, y: yTop - 11 };
          if (!hits(xr - ws, yTop - 10, xr, yTop - 10 + hs)) return { short: true, xr, y: yTop - 10 };
          const g = ghostY(xr - ws, xr), yl = g ? g.top - 8 - hs : yTop - 10, lift = yTop - 10 - yl;
          const liftOK = yl >= G.clipY + 4;
          let xc = null;
          for (let i = 0; i <= iz; i++) if (Yd(fs[i]) <= yTop + hs / 2 + 3) { xc = Xp(xs[i]) - 10; break; }
          const levelOK = xc != null && xc - ws >= G.x0 - 8 && !hits(xc - ws, yTop - hs / 2, xc, yTop + hs / 2);
          if (liftOK && (lift <= 48 || !levelOK)) return { short: true, xr, y: yl, lead: lift > 12 ? [x0px - 9, yl + hs + 2, x0px - 3, yTop - 6] : null };
          if (levelOK) return { short: true, xr: xc, y: yTop - hs / 2, lead: [xc + 4, px(yTop), x0px - 7, px(yTop)] };
          // narrow plots: the formula over its value, level with the stem top, left of the curve
          const wk = G.massWk + 8, hk = G.massHk;
          let xk = null;
          for (let i = 0; i <= iz; i++) if (Yd(fs[i]) <= yTop + hk / 2 + 3) { xk = Xp(xs[i]) - 10; break; }
          if (xk != null && xk - wk >= G.x0 - 8 && !hits(xk - wk, yTop - hk / 2, xk, yTop + hk / 2)) return { short: 'stack', xr: xk, y: yTop - hk / 2, lead: [xk + 4, px(yTop), x0px - 7, px(yTop)] };
          if (!hits(xr - wk, yTop - 10, xr, yTop - 10 + hk)) return { short: 'stack', xr, y: yTop - 10 };
          return { short: true, xr, y: yTop - 10 };
        }
        // continuous part on (0, ∞)
        ctx.beginPath();
        for (let i = iz; i <= N; i++) { const X_ = Xp(Math.max(0, xs[i])), Y_ = Yd(fs[i]); if (i > iz) ctx.lineTo(X_, Y_); else ctx.moveTo(X_, Y_); }
        ctx.strokeStyle = ePost > 0 ? `rgba(0,0,0,${0.45 + 0.55 * ePost})` : ink(0.45);
        ctx.lineWidth = 1 + 0.6 * ePost; ctx.stroke();
        // truncated (renormalised) density — the max-entropy continuous part
        if (ePost > 0 && q < 0.9995) {
          ctx.beginPath();
          for (let i = iz; i <= N; i++) { const X_ = Xp(Math.max(0, xs[i])), Y_ = Yd(fs[i] / (1 - q)); if (i > iz) ctx.lineTo(X_, Y_); else ctx.moveTo(X_, Y_); }
          ctx.setLineDash([4, 3]); ctx.strokeStyle = `rgba(85,85,85,${ePost})`; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
          const f0t = gnPdf(p, mu, s, 0) / (1 - q);
          ctx.save();
          ctx.globalAlpha *= ePost;
          ctx.beginPath(); ctx.arc(x0px, Yd(f0t), 3.2, 0, TAU); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = T3; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
          if (f0t > G.dmax) tgnClip = f0t;
        }
        // clip markers for very peaked shapes, in the empty band above the clip line (never on a flank):
        // the exact peak f(µ) of the density (a cusp for p ≤ 1, so never read off samples), centred over µ,
        // and the truncated density's value at 0⁺, right of the stem
        {
          const peak = gnPdf(p, mu, s, mu), yC = G.clipY - 13;
          let tBox = null;
          if (tgnClip) {
            const lt = `↑ ${tgnClip.toFixed(2)}`, wt = tw(lt);
            tBox = [x0px + 6, x0px + 6 + wt];
            ctx.save(); ctx.globalAlpha *= ePost; ktext(lt, x0px + 6, yC, { color: T3 }); ctx.restore();
          }
          if (peak > G.dmax && mu > G.xmin) {
            const lp = `↑ ${peak.toFixed(2)}`, wp = tw(lp);
            let xc = clamp(Xp(mu), G.x0 + wp / 2, G.x1 - wp / 2);
            if (tBox && xc + wp / 2 + 10 > tBox[0] && xc - wp / 2 - 10 < tBox[1]) xc = Xp(mu) <= x0px ? tBox[0] - 12 - wp / 2 : tBox[1] + 12 + wp / 2;
            ktext(lp, xc, yC, { color: T3, align: 'center' });
          }
        }
        // open circle at 0⁺ on the RGG continuous part
        if (ePost > 0) {
          ctx.beginPath(); ctx.arc(x0px, Yd(gnPdf(p, mu, s, 0)), 3.2, 0, TAU); ctx.fillStyle = C.bg; ctx.fill();
          ctx.strokeStyle = ink(ePost); ctx.lineWidth = 1; ctx.stroke();
        }
        // sample rain: histogram of the positives (and the previous shape's, fading), running zero fraction on the stem
        const histPath = (bins, n) => {
          const den = Math.max(n, 90) * RBW; // bars fill up while the first samples arrive
          ctx.beginPath();
          ctx.moveTo(Xp(0), G.base);
          for (let k = 0; k < 24; k++) {
            const yy = Yd(bins[k] / den);
            ctx.lineTo(Xp(k * RBW), yy); ctx.lineTo(Xp((k + 1) * RBW), yy);
          }
          ctx.lineTo(Xp(24 * RBW), G.base);
        };
        if (rain.ghost) {
          const ga = clamp(1 - (S.rt - rain.ghost.t0) / 1.1, 0, 1);
          histPath(rain.ghost.bins, rain.ghost.n);
          ctx.setLineDash([3, 3]); ctx.strokeStyle = acc(0.45 * ga); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
        }
        if (rain.n > 0) {
          histPath(rain.bins, rain.n);
          ctx.fillStyle = acc(0.05); ctx.fill();
          ctx.strokeStyle = acc(0.5); ctx.lineWidth = 1; ctx.stroke();
          const zf = rain.zeros / rain.n;
          line(x0px - 7, px(Yd(zf)), x0px + 7, px(Yd(zf)), C.ink, 1);
          // the counter carries the same glyph as the tick on the stem (stem + crossbar), so the two read as one
          const a = `samples ${rain.n}`, b = mob ? `zeros ${pct(zf, 0)}` : `zeros ${rain.zeros} (${pct(zf)})`, c = `theory ${pct(q)}`;
          const gap = mob ? tw(' · ') : tw('    '), gw = 18;
          const wa = tw(a), wb = tw(b), wc = tw(c), tot = wa + gap + gw + wb + gap + wc;
          const yM = G.base + (mob ? 40 : 44);
          let xq = mob ? G.x0 : G.x1 - tot;
          text(a, xq, yM, { color: T2 }); xq += wa;
          if (mob) text(' · ', xq, yM, { color: T2 });
          xq += gap;
          line(px(xq + 6), yM - 6, px(xq + 6), yM + 6, C.accent, 2);
          line(xq, px(yM), xq + 12, px(yM), C.ink, 1);
          xq += gw;
          text(b, xq, yM, { color: T2 }); xq += wb;
          if (mob) text(' · ', xq, yM, { color: T2 });
          xq += gap;
          text(c, xq, yM, { color: T2 });
        }
        // the point mass
        if (eDrain > 0) {
          const yTop = G.base - Math.min(q * eDrain, G.dmax) * G.k;
          line(px(x0px), G.base, px(x0px), yTop, C.accent, 2);
          ctx.beginPath(); ctx.arc(x0px, yTop, 4.4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
          if (eDrain > 0.9) {
            const pm = placeMass(yTop), al = ease((eDrain - 0.9) / 0.1);
            if (pm.lead) { ctx.save(); ctx.globalAlpha *= al; line(pm.lead[0], pm.lead[1], pm.lead[2], pm.lead[3], acc(0.7), 1, [2, 3]); ctx.restore(); }
            lab('reMass', massHTML(pm.short, q), pm.xr, pm.y, { ax: 1, ay: 0, color: C.accent, alpha: al, cls: 'ko' });
          }
        }
        // falling samples (start below the legend when they would cross it)
        for (const d of rain.drops) {
          const t = S.sceneT - d.t0;
          if (t < 0 || d.v > G.xmax) continue; // heavy tails can land past the axis: counted, not drawn
          const xStart = Xp(Math.max(G.xmin + 0.05, d.v));
          const yT = xStart >= G.legX0 - 4 ? G.legY1 : G.clipY - 4;
          const f = clamp(t / d.fall, 0, 1);
          let xx = xStart;
          const yy = lerp(yT, G.base - 3, f * f);
          if (d.zero && t > d.fall) { const e = easeIO((t - d.fall) / 0.2); xx = lerp(xStart, x0px, e); }
          const fade = t > d.fall + 0.2 ? clamp(1 - (t - d.fall - 0.2) / 0.5, 0, 1) : clamp(t / 0.12, 0, 1);
          if (f < 1) { const tr = Math.min(4 + 22 * f, yy - yT); if (tr > 3) line(px(xx), yy - tr, px(xx), yy - 3, d.zero ? `rgba(153,153,153,${0.35 * fade})` : ink(0.22 * fade), 1); }
          ctx.beginPath(); ctx.arc(xx, yy, 2, 0, TAU);
          ctx.fillStyle = d.zero ? (t > d.fall ? acc(fade) : `rgba(153,153,153,${fade})`) : ink(0.85 * fade);
          ctx.fill();
          if (t > d.fall && t < d.fall + 0.25 && !d.zero) line(xx - 5, px(G.base), xx + 5, px(G.base), ink(1 - (t - d.fall) / 0.25), 1);
        }

        // definition + sampling rule (desktop) · compact legend (mobile)
        if (!mob) {
          if (G.fLvl === 2) lab('reF', RE_F(G.fInline), G.x0, G.base + 64, { ay: 0, st: G.fSt });
          else if (G.fLvl === 1) lab('reF1', RE_F1(), G.x0, G.base + 64, { ay: 0, st: G.fSt });
          if (G.legBelow) lab('reLeg', RE_LEG(), G.x0, G.base + G.legDy, { ay: 0 });
        } else lab('reLegM', RE_LEG_M(), G.x0, G.base + 58, { ay: 0, st: G.legSt });
      }

      /* ------------------------------------------------------------ layer 1 · Cramér–Wold + training */
      const lineAlpha = (a, th) => { // 0 when a label at angle a sits on the line c (either direction), 1 when clear
        let d = Math.abs(((a - th) % Math.PI + Math.PI) % Math.PI);
        d = Math.min(d, Math.PI - d);
        return clamp((d / DEG - 3) / 6, 0, 1);
      };
      function drawSlice() {
        const SL = L.sl, { cx, cy, R, U } = SL;
        const mob = L.mob;
        const sT = S.sceneT - S.sliceT0;
        const eSnap = reduced ? 1 : easeIO((sT - 0.4) / 1.1);
        const eEmb = reduced ? 1 : ease((sT - 1.4) / 0.8);
        const ePan = reduced ? 1 : ease((sT - 1.0) / 0.9);
        const [c1, c2] = cdir(S.theta);
        const X_ = z => cx + z * U, Y_ = z => cy - z * U;
        const GD = gm.cur;

        // header: Cramér–Wold statement + what the marks mean
        lab(SL.headKey, SL.headHTML, SL.A.x0, SL.A.y0, { ay: 0, st: SL.headSt });

        // dial
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = C.g300; ctx.lineWidth = 1; ctx.stroke();
        for (let d = 0; d < 360; d += 5) {
          const a = d * DEG, l = d % 45 === 0 ? 7 : d % 15 === 0 ? 4 : 2;
          const ca = Math.cos(a), sa = Math.sin(a);
          line(cx + ca * R, cy - sa * R, cx + ca * (R - l), cy - sa * (R - l), d % 45 === 0 ? C.g600 : C.g400, 1);
        }
        if (!mob) { // degree labels step aside when the line c passes over them
          [['0°', cx + R - 12, cy + 15, 'right'], ['180°', cx - R + 12, cy + 15, 'left'], ['90°', cx - 8, cy - R + 18, 'right'], ['270°', cx - 8, cy + R - 14, 'right']].forEach(([s, x, y, al]) => {
            const aL = lineAlpha(Math.atan2(cy - y, x - cx), S.theta);
            if (aL < 0.02) return;
            ctx.save(); ctx.globalAlpha *= aL; text(s, x, y, { align: al, size: 11, color: TG }); ctx.restore();
          });
        }
        // axes: the orthant faces
        line(cx - R, px(cy), cx, px(cy), C.g300, 1);
        line(px(cx), cy, px(cx), cy + R, C.g300, 1);
        line(cx, px(cy), cx + R, px(cy), ink(0.55), 1);
        line(px(cx), cy, px(cx), cy - R, ink(0.55), 1);
        if (R >= 100) { // small phone dials: the legend names y and z; axis names would sit on the data
          lab('z1', K('z_1', 15), cx + R - 30, cy - 14, { ax: 0.5, color: '#333', alpha: lineAlpha(Math.atan2(14, R - 30), S.theta) });
          lab('z2', K('z_2', 15), cx + 16, cy - R + 30, { ax: 0.5, color: '#333', alpha: lineAlpha(Math.atan2(R - 30, 16), S.theta) });
        }
        for (let i = 1; i <= 3; i++) for (let j = 1; j <= 3; j++) plus(X_(i), Y_(j), 2.5, C.g300);

        // W₂²(θ) for every direction: a hairline envelope over light radial ticks (thin, so blue stays for the target)
        const aur = SL.aura, kScale = aur / Math.max(S.ringMax0 || 1, 0.25);
        {
          const r0 = R + 4;
          const env = a => r0 + Math.min(aur, kScale * ringAt(a)) * ePan;
          ctx.beginPath();
          for (let k = 0; k < 36; k++) {
            const a = k * 10 * DEG, rr = env(a);
            if (rr - r0 < 1.5) continue;
            const ca = Math.cos(a), sa = Math.sin(a);
            ctx.moveTo(cx + ca * r0, cy - sa * r0);
            ctx.lineTo(cx + ca * rr, cy - sa * rr);
          }
          ctx.strokeStyle = C.g300; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath();
          for (let k = 0; k <= 288; k++) { const a = (k / 288) * TAU, rr = env(a); if (k) ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr); }
          ctx.strokeStyle = acc(0.5 * ePan); ctx.lineWidth = 1; ctx.stroke();
          [S.theta, S.theta + Math.PI].forEach(a => {
            const rr = env(a), ca = Math.cos(a), sa = Math.sin(a);
            line(cx + ca * r0, cy - sa * r0, cx + ca * Math.max(rr, r0 + 3), cy - sa * Math.max(rr, r0 + 3), acc(0.9 * ePan), 1.5);
          });
        }

        // random directions of the current SGD step (training only; not under reduced motion)
        if (S.step === 2 && !reduced) {
          for (const d of net.dirs) {
            const age = S.sceneT - d.t;
            if (age > 0.4 || age < 0) continue;
            const ca = Math.cos(d.th), sa = Math.sin(d.th), al = 0.2 * (1 - age / 0.4);
            line(cx - ca * R, cy + sa * R, cx + ca * R, cy - sa * R, `rgba(153,153,153,${al})`, 1);
          }
        }

        // c⊥ and the drop lines onto c; everything inside the dial is clipped to it (heavy-tailed p reaches far)
        line(cx + c2 * R, cy + c1 * R, cx - c2 * R, cy - c1 * R, C.g300, 1, [2, 4]);
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TAU); ctx.clip();
        ctx.beginPath();
        for (let i = 0; i < ND; i++) {
          const a = Y[2 * i], b = Y[2 * i + 1];
          const za = lerp(S.mu + GD[2 * i], a, eSnap), zb = lerp(S.mu + GD[2 * i + 1], b, eSnap);
          const t = za * c1 + zb * c2;
          ctx.moveTo(X_(za), Y_(zb)); ctx.lineTo(X_(t * c1), Y_(t * c2));
        }
        ctx.strokeStyle = acc(0.055 * ePan); ctx.lineWidth = 1; ctx.stroke();
        if (eEmb > 0) {
          ctx.beginPath();
          for (let i = 0; i < ND; i++) {
            const a = Z[2 * i], b = Z[2 * i + 1], t = a * c1 + b * c2;
            ctx.moveTo(X_(a), Y_(b)); ctx.lineTo(X_(t * c1), Y_(t * c2));
          }
          ctx.strokeStyle = ink(0.05 * eEmb); ctx.lineWidth = 1; ctx.stroke();
        }
        // target points: interior dots; axis points become ticks on the outer side of each face
        const tickA = ease((eSnap - 0.85) / 0.15);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        for (let i = 0; i < ND; i++) {
          const a = Y[2 * i], b = Y[2 * i + 1];
          const onAxis = (a === 0) !== (b === 0), atO = a === 0 && b === 0;
          if ((onAxis || atO) && tickA >= 1) continue;
          const za = lerp(S.mu + GD[2 * i], a, eSnap), zb = lerp(S.mu + GD[2 * i + 1], b, eSnap);
          ctx.moveTo(X_(za) + 1.6, Y_(zb)); ctx.arc(X_(za), Y_(zb), 1.6, 0, TAU);
        }
        ctx.fill();
        if (tickA > 0) {
          ctx.beginPath();
          for (let i = 0; i < ND; i++) {
            const a = Y[2 * i], b = Y[2 * i + 1];
            if (b === 0 && a > 0) { ctx.moveTo(px(X_(a)), cy + 1); ctx.lineTo(px(X_(a)), cy + 6); }
            else if (a === 0 && b > 0) { ctx.moveTo(cx - 1, px(Y_(b))); ctx.lineTo(cx - 6, px(Y_(b))); }
          }
          ctx.strokeStyle = acc(0.75 * tickA); ctx.lineWidth = 1; ctx.stroke();
        }
        // embeddings: interior dots; axis points as ticks on the inner side
        if (eEmb > 0) {
          ctx.fillStyle = ink(0.88 * eEmb);
          ctx.beginPath();
          for (let i = 0; i < ND; i++) {
            const a = Z[2 * i], b = Z[2 * i + 1];
            if (a === 0 || b === 0) continue;
            ctx.moveTo(X_(a) + 1.35, Y_(b)); ctx.arc(X_(a), Y_(b), 1.35, 0, TAU);
          }
          ctx.fill();
          ctx.beginPath();
          for (let i = 0; i < ND; i++) {
            const a = Z[2 * i], b = Z[2 * i + 1];
            if (b === 0 && a > 0) { ctx.moveTo(px(X_(a)), cy - 1); ctx.lineTo(px(X_(a)), cy - 6); }
            else if (a === 0 && b > 0) { ctx.moveTo(cx + 1, px(Y_(b))); ctx.lineTo(cx + 6, px(Y_(b))); }
          }
          ctx.strokeStyle = ink(0.8 * eEmb); ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
        // exact zeros in both coordinates: squares at the origin, side ∝ √share
        {
          const sy = (3 + 22 * Math.sqrt(share.y[0])) * tickA, sz = (3 + 22 * Math.sqrt(share.z[0])) * eEmb;
          if (share.y[0] > 0 && sy > 0.5) { ctx.fillStyle = C.accent; ctx.fillRect(cx - sy / 2, cy - sy / 2, sy, sy); }
          if (share.z[0] > 0 && sz > 0.5) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(Math.round(cx - sz / 2) + 0.5, Math.round(cy - sz / 2) + 0.5, Math.round(sz), Math.round(sz)); }
        }

        // the direction c
        const hov = S.drag || S.hoverDial;
        line(cx - c1 * R, cy + c2 * R, cx + c1 * R, cy - c2 * R, C.ink, 1);
        {
          const ax = cx + c1 * (R - 1), ay = cy - c2 * (R - 1);
          const nx = -c2, ny = -c1; // perpendicular (screen)
          const bx = cx + c1 * (R - 11), by = cy - c2 * (R - 11);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx + nx * 4, by + ny * 4); ctx.lineTo(bx - nx * 4, by - ny * 4); ctx.closePath();
          ctx.fillStyle = C.ink; ctx.fill();
          const hs = hov ? 9 : 7, hx = cx + c1 * R, hy = cy - c2 * R;
          ctx.fillStyle = hov ? C.accent : C.bg; ctx.strokeStyle = hov ? C.accent : C.ink; ctx.lineWidth = 1;
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); ctx.strokeRect(Math.round(hx - hs / 2) + 0.5, Math.round(hy - hs / 2) + 0.5, hs, hs);
          lab('cLab', K('c', 18), cx + c1 * (R + 19), cy - c2 * (R + 19), { ax: 0.5, color: '#000', cls: 'ko' });
        }

        drawPanel(ePan);
      }

      function drawPanel(pa) {
        const { P } = L.sl, mob = L.mob;
        const tx = t => P.x0 + ((t - TA) / (TB - TA)) * P.w;
        const scaleD = P.hA / 1.25; // px per unit density
        const thDeg = ((S.theta / DEG) % 360 + 360) % 360;
        const pN = pNow();
        const pxPerU = P.w / (TB - TA);
        ctx.save();
        ctx.globalAlpha *= pa;
        lab('pjT', `<span class="kick">${P.side ? 'SLICE' : 'PROJECTION ONTO'} </span>${K('c')}`, P.x0, P.yTitle, { alpha: pa });
        lab('pjTh', `${K('\\theta =')}<span class="ink"> ${thDeg.toFixed(1)}°</span>`, P.x1, P.yTitle, { ax: 1, alpha: pa });

        const barPx = (hh, k) => Math.min((hh[k] / (M * BW)) * scaleD, P.hA + 6);
        const busy = (hh, a, b, lim) => { // does any bar in the data range [a, b] rise above lim px?
          const k0 = clamp(Math.floor((a - TA) / BW), 0, NB - 1), k1 = clamp(Math.floor((b - TA) / BW), 0, NB - 1);
          for (let k = k0; k <= k1; k++) if (barPx(hh, k) > lim) return true;
          return false;
        };
        // histogram: continuous part as a step outline, exact zeros as a stem (a point mass)
        function hist(hh, mass, yAx, dir, color, colorSoft) {
          ctx.beginPath();
          ctx.moveTo(tx(TA), yAx);
          for (let k = 0; k < NB; k++) {
            const yy = yAx - dir * barPx(hh, k);
            ctx.lineTo(tx(TA + k * BW), yy); ctx.lineTo(tx(TA + (k + 1) * BW), yy);
          }
          ctx.lineTo(tx(TB), yAx);
          ctx.fillStyle = colorSoft; ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
          line(P.x0, px(yAx), P.x1, px(yAx), C.ink, 1);
          for (let t = -3; t <= 5; t++) line(px(tx(t)), yAx, px(tx(t)), yAx + dir * 3, C.g500, 1);
          const x0 = tx(0), hgt = Math.min(dir > 0 ? P.hA + 6 : P.hA - 2, mass * scaleD * 1.25); // the lower stem stays clear of the ruler
          if (mass > 0) {
            line(px(x0), yAx, px(x0), yAx - dir * hgt, color, 2);
            ctx.beginPath(); ctx.arc(x0, yAx - dir * hgt, 3, 0, TAU); ctx.fillStyle = color; ctx.fill();
          }
          // the zero-mass label goes on the emptier side of the stem
          const lbl = P.side ? pct(mass) : `zeros ${pct(mass)}`, lw = tw(lbl) + 6, span = lw / pxPerU;
          const yL = yAx - dir * clamp(hgt, 9, P.hA - 8), lim = Math.abs(yAx - yL) - 8;
          const leftBusy = busy(hh, -span - 0.3, -0.01, lim), rightBusy = busy(hh, 0, span + 0.3, lim);
          const onRight = leftBusy && !rightBusy;
          ktext(lbl, x0 + (onRight ? 9 : -9), yL, { align: onRight ? 'left' : 'right', color });
        }
        hist(hZ, proj.massZ, P.yA, 1, C.ink, 'rgba(0,0,0,0.04)');
        hist(hY, proj.massY, P.yB, -1, C.accent, acc(0.06));
        // series labels: right-aligned in the corner, with their word where the histogram's right tail leaves room for
        // it, else the symbol alone; on the left only when even that would sit on the tail (the left side already
        // carries the zero-mass labels)
        {
          const SL = L.sl, lim = P.hA - 16;
          const fitsR = (hh, w) => !busy(hh, TB - w / pxPerU, TB, lim);
          const mode = (hh, w) => (P.side ? (fitsR(hh, SL.symW) ? 'r' : 'l') : fitsR(hh, w) ? 'rw' : fitsR(hh, SL.symW) ? 'r' : 'lw');
          const zm = mode(hZ, SL.zW), ym = mode(hY, SL.yW);
          const R = m => m[0] === 'r', W = m => m.length > 1;
          lab('pjZ', `${K('c^{\\top}z')}${W(zm) ? '<span> embeddings</span>' : ''}`, R(zm) ? P.x1 : P.x0, P.yA - P.hA + 6, { ax: R(zm) ? 1 : 0, alpha: pa, color: '#000', cls: 'ko' });
          lab('pjY', `${K('c^{\\top}y')}${W(ym) ? '<span> target</span>' : ''}`, R(ym) ? P.x1 : P.x0, P.yB + P.hA - 6, { ax: R(ym) ? 1 : 0, alpha: pa, color: C.accent, cls: 'ko' });
        }

        // sort & match: the i-th smallest of each (1-D optimal transport = sorting)
        const NL = mob ? 32 : 48;
        let lo = Infinity, hi = -Infinity;
        for (let j = 0; j < NL; j++) {
          const i = Math.min(M - 1, Math.floor(((j + 0.5) / NL) * M));
          const a = PZ[i], b = PY[i], gap = Math.abs(a - b);
          const xa = tx(clamp(a, TA, TB)), xb = tx(clamp(b, TA, TB));
          lo = Math.min(lo, xa, xb); hi = Math.max(hi, xa, xb);
          line(xa, P.yA + 1, xb, P.yB - 1, gap > 0.3 ? acc(0.7) : 'rgba(153,153,153,0.55)', 1);
        }
        if (!mob) { // the caption goes in the empty part of the gap (short form if needed), never on the links. Where the
          // gap is tight (narrow screens) the left side is taken by the two zero-mass labels, so it goes on the right, in
          // the longest form that fits there ("by rank" at least), and on the left only when nothing fits on the right.
          // Side and wording are sticky, so the label does not flicker as the slice turns.
          const TXS = ['sort, then pair rank by rank', 'pair by rank', 'by rank'], TWS = [L.sl.sortW, L.sl.sortW2, L.sl.sortW3];
          const tight = P.yB - P.yA < 36, n = tight ? 3 : 2;
          const rs = P.x1 - hi, ls = lo - P.x0;
          const pick = room => { for (let k = 0; k < n; k++) if (room >= TWS[k] + 14) return k; return -1; };
          let side = S.sortSide || 'r', ti;
          if (tight) {
            if (side === 'r' && pick(rs) < 0 && pick(ls) >= 0) { side = 'l'; S.sortI = null; }
            else if (side === 'l' && pick(rs - 16) >= 0) { side = 'r'; S.sortI = null; }
            const room = side === 'r' ? rs : ls;
            ti = S.sortI == null ? pick(room) : S.sortI;
            if (ti < 0 || room < TWS[ti] + 14) ti = pick(room);
            else if (ti > 0 && room >= TWS[ti - 1] + 30) ti = pick(room - 16); // a longer form, with 16 px to spare
            S.sortI = ti;
          } else {
            ti = pick(Math.max(rs, ls));
            const need = ti < 0 ? Infinity : TWS[ti] + 14;
            if (side === 'r' && rs < need && ls >= need) side = 'l';
            else if (side === 'l' && ls < need && rs >= need) side = 'r';
            if ((side === 'r' ? rs : ls) < need) ti = -1;
          }
          S.sortSide = side;
          if (ti >= 0) lab('pjSort', TXS[ti], side === 'r' ? P.x1 : P.x0, (P.yA + P.yB) / 2, { ax: side === 'r' ? 1 : 0, alpha: pa, color: T3 });
        }

        // ruler
        for (let t = -3; t <= 5; t++) text(fmt(t, 0), tx(t), P.yRuler, { align: 'center', size: 11, color: TK });

        // readouts
        const w2c = proj.w2 > 0.03 ? C.accent : '#000';
        if (mob) {
          lab('pjW', `${K('W_2^2(\\theta)')}${P.side ? '' : '<span> this slice</span>'}`, P.x0, P.yRead, { alpha: pa });
          lab('pjWv', proj.w2.toFixed(3), P.x1, P.yRead, { ax: 1, alpha: pa, color: w2c });
          const stp = net.hold ? net.hold.steps : net.steps;
          let zl = S.step === 2 ? `step ${String(stp).padStart(5, '0')} · zeros ${pct(share.zeroZ)} · target ${pct(share.zeroY)}` : `exact zeros · embeddings ${pct(share.zeroZ)} · target ${pct(share.zeroY)}`;
          if (tw(zl) > P.w) zl = S.step === 2 ? `step ${stp} · ${pct(share.zeroZ)} vs ${pct(share.zeroY)}` : `zeros · emb ${pct(share.zeroZ)} · target ${pct(share.zeroY)}`;
          if (tw(zl) > P.w) zl = `zeros ${pct(share.zeroZ)} vs ${pct(share.zeroY)}`; // the narrow column beside the dial
          if (tw(zl) <= P.w) text(zl, P.x0, P.yRead + 22, { color: T2 });
          ctx.restore();
          return;
        }
        lab('pjW', K('W_2^2(\\theta)=(1/B)\\,\\|(Zc)_{\\uparrow}-(Yc)_{\\uparrow}\\|^2'), P.x0, P.yRead, { alpha: pa });
        lab('pjWv', proj.w2.toFixed(3), P.x1, P.yRead, { ax: 1, alpha: pa, color: w2c });
        if (P.sliced !== false) { // (short panels drop it: step 3's training block carries the loss)
          text('sliced: mean over 72 directions', P.x0, P.yRead + 26, { color: T2 });
          text(ringMean().toFixed(3), P.x1, P.yRead + 26, { align: 'right', color: '#000' });
        }

        // faces of the positive orthant
        const q = 1 - Phi(pN, S.mu / sigmaGN(pN));
        if (!P.noTable && (P.stack || S.step !== 2)) {
          const th = [q * q, q * (1 - q), q * (1 - q), (1 - q) * (1 - q)];
          const names = ['origin', `${K('+z_1', 14)} axis`, `${K('+z_2', 14)} axis`, 'interior'];
          let t = `<table class="lpj-tbl"><tr><th></th><th>theory</th><th class="acc">target</th><th>embeddings</th></tr>`;
          for (let k = 0; k < 4; k++) t += `<tr><td>${names[k]}</td><td class="dim">${pct(th[k])}</td><td class="acc">${pct(share.y[k])}</td><td class="ink">${pct(share.z[k])}</td></tr>`;
          t += '</table>';
          if (!P.noQ) t += `<div style="margin-top:8px">${K('q=\\Phi_p(-\\mu/\\sigma) =', 14)}<span class="ink"> ${q.toFixed(3)}</span>${L.sl.qLong ? `<span class="dim">  · interior </span>${K('(1-q)^D\\to 0', 14)}` : ''}</div>`;
          lab('pjTbl', t, P.x0, P.yTbl, { ay: 0, alpha: pa });
        }

        // training block / why sort
        if (!P.noBlock && (P.stack || S.step === 2 || P.noTable)) {
          const yT = P.yBlk;
          if (S.step === 2) {
            const hd = net.hold; // reduced motion: the held state until the background run lands
            const steps = hd ? hd.steps : net.steps, nH = hd ? hd.n : net.hist.length, emaV = hd ? hd.ema : net.ema;
            kick(L.sl.trainKick, P.x0, yT + 6);
            text(`step ${String(steps).padStart(6, '0')}`, P.x1, yT + 6, { align: 'right', color: '#000' });
            // loss sparkline (log scale): per-step loss + running mean; the x-domain grows with the run, so it spans the box
            const sx0 = P.x0, sx1 = P.x0 + L.sl.spark, sy0 = yT + 22, sy1 = yT + 62;
            line(sx0, px(sy1), sx1, px(sy1), C.g300, 1);
            line(px(sx0), sy0, px(sx0), sy1, C.g300, 1);
            const lo2 = Math.log(2e-4), hi2 = Math.log(1.5);
            const ly = v => sy1 - ((Math.log(clamp(v, 2e-4, 1.5)) - lo2) / (hi2 - lo2)) * (sy1 - sy0);
            const span = Math.max(60, nH - 1), xOf = i => sx0 + (i / span) * (sx1 - sx0);
            if (nH > 1) {
              ctx.beginPath();
              for (let i = 0; i < nH; i += 2) { const xx = xOf(i); ctx.moveTo(xx, ly(net.hist[i])); ctx.lineTo(xx + 0.8, ly(net.hist[i])); }
              ctx.strokeStyle = 'rgba(153,153,153,0.7)'; ctx.lineWidth = 1; ctx.stroke();
              ctx.beginPath();
              let e = net.hist[0];
              for (let i = 0; i < nH; i++) { e = i ? e * 0.95 + net.hist[i] * 0.05 : e; if (i) ctx.lineTo(xOf(i), ly(e)); else ctx.moveTo(xOf(i), ly(e)); }
              ctx.strokeStyle = C.accent; ctx.lineWidth = 1.25; ctx.stroke();
            }
            text(L.sl.lossWord, sx0, sy1 + 14, { color: T3 });
            text(`${emaV ? emaV.toFixed(4) : '—'}`, sx1, sy1 + 14, { align: 'right', color: C.accent });
            // the network: x → (W, b) → ReLU → z (weights: ink positive, dashed accent negative; boxes fill with P(z_j = 0))
            const nx0 = P.x1 - 126, nx1 = P.x1 - 4, ny = [yT + 26, yT + 62], hx = nx1 - 38;
            const W = (hd || net).W;
            for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
              const w = W[b * 2 + a], al = clamp(Math.abs(w) / 1.1, 0.15, 1);
              line(nx0 + 6, ny[a], hx - 6, ny[b], w >= 0 ? `rgba(0,0,0,${al})` : acc(al), w >= 0 ? 1.25 : 1.1, w >= 0 ? null : [3, 2]);
            }
            ny.forEach((yy, j) => {
              ctx.beginPath(); ctx.arc(nx0, yy, 5, 0, TAU); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
              ctx.beginPath(); ctx.moveTo(hx, yy + 5); ctx.lineTo(hx + 10, yy + 5); ctx.lineTo(hx + 20, yy - 6); ctx.strokeStyle = C.g700; ctx.lineWidth = 1.25; ctx.stroke(); // ReLU hinge
              const zfrac = j === 0 ? share.z[0] + share.z[2] : share.z[0] + share.z[1]; // P(z_j = 0)
              ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(nx1 - 10.5, yy - 5.5, 10, 10);
              ctx.fillStyle = C.accent; const hh = 9 * zfrac; ctx.fillRect(nx1 - 10, yy + 4 - hh, 9, hh);
            });
            lab('trX', K('x', 14), nx0, yT + 84, { ax: 0.5, alpha: pa, color: '#333' });
            lab('trWB', K('W,\\,b', 14), (nx0 + hx) / 2, yT + 84, { ax: 0.5, alpha: pa, color: T2 });
            text('ReLU', hx + 10, yT + 84, { align: 'center', color: T2 });
            text(L.sl.zLong ? `exact zeros · embeddings ${pct(share.zeroZ)} · target ${pct(share.zeroY)}` : `zeros · emb ${pct(share.zeroZ)} · target ${pct(share.zeroY)}`, P.x0, yT + 106, { color: T2 });
          } else {
            lab('pjWhy', WHY(), P.x0, yT, { ay: 0, alpha: pa, st: `width:${Math.round(P.w)}px;white-space:normal` });
          }
        }
        ctx.restore();
      }

      /* ------------------------------------------------------------ layer 2 · Sparsity dial */
      function drawDial() {
        const G = L.di, mob = L.mob, pN = pNow(), mu = S.mu;
        const act = activeFrac(pN, mu);
        const g = gg.cur;
        // feature matrix
        kick(G.kick, mob ? G.A.x0 : G.gx0, G.gy0 - 14); // phones centre the grid; the kicker stays on the shared left edge
        if (G.showF) lab('diF', K('z=\\max(0,\\,\\mu+\\sigma s),\\ \\ s\\sim\\mathrm{GN}_p(0,1)', 14), G.gx0 + G.gw, G.gy0 - 14, { ax: 1 });
        if (G.rowRead) lab('diC', K('\\|z\\|_0', 14), G.gx0 + G.gw + 14, G.gy0 - 14, {});
        const cs = G.cell;
        let hovCell = null, nzAll = 0;
        const m = S.mouse;
        ctx.lineWidth = 1;
        for (let r = 0; r < G.rows; r++) {
          let nz = 0;
          for (let c = 0; c < G.cols; c++) {
            const i = r * 64 + c, v = Math.max(0, mu + g[i]), dv = gridShow[i];
            const x = G.gx0 + c * G.pitch, y = G.gy0 + r * G.pitch;
            if (v > 0) {
              nz++;
              ctx.fillStyle = acc(0.22 + 0.78 * Math.min(Math.max(dv, 0) / 2, 1));
              ctx.fillRect(x, y, cs, cs);
            } else {
              ctx.strokeStyle = dv > 0.02 ? acc(0.5) : C.g300;
              ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, cs - 1, cs - 1);
            }
            if (m && m.x >= x && m.x < x + G.pitch && m.y >= y && m.y < y + G.pitch) hovCell = { r, c, v, x, y };
          }
          nzAll += nz;
          if (G.rowRead) text(`${String(nz).padStart(2, ' ')}/${G.cols}`, G.gx0 + G.gw + 14, G.gy0 + r * G.pitch + cs / 2, { color: nz ? T2 : T3 });
        }
        if (G.meanY) lab('diMean', `${K('\\|z\\|_0', 14)}<span> per row: mean </span><span class="ink">${(nzAll / G.rows).toFixed(1)}</span><span> of ${G.cols} active</span>`, G.gx0, G.meanY, {});
        if (hovCell) {
          const hc = hovCell;
          ctx.strokeStyle = C.ink; ctx.strokeRect(Math.round(hc.x) - 1.5, Math.round(hc.y) - 1.5, cs + 3, cs + 3);
          S.tip = { x: hc.x + cs + 10, y: hc.y - 8, px: hc.x + cs / 2, py: hc.y + cs / 2, html: `<div>sample ${hc.r + 1} · dim ${hc.c + 1}</div><div class="${hc.v > 0 ? 'acc' : 'dim'}">${hc.v > 0 ? 'value ' + hc.v.toFixed(3) : 'exact zero'}</div>` };
        }

        // chart A · fraction active vs µ
        const X_ = v => G.cx0 + ((v + 3) / 4) * (G.cx1 - G.cx0);
        const Y_ = f => G.cy1 - f * (G.cy1 - G.cy0);
        line(G.cx0, px(G.cy1), G.cx1, px(G.cy1), C.ink, 1);
        line(G.cx0, px(G.cy0), G.cx1, px(G.cy0), C.g300, 1, [3, 3]);
        line(px(G.cx0), G.cy0, px(G.cx0), G.cy1, C.ink, 1);
        if (!G.legRowM) text('upper bound 1', G.cx1, G.cy0 - 9, { align: 'right', size: 11, color: TG }); // (short phones: the tick "1" says it)
        for (let v = -3; v <= 1; v++) { line(px(X_(v)), G.cy1, px(X_(v)), G.cy1 + 4, C.ink, 1); text(fmt(v, 0), X_(v), G.cy1 + 16, { align: 'center', size: 11, color: TK }); }
        [0, 0.5, 1].forEach(f => { line(G.cx0 - 4, px(Y_(f)), G.cx0, px(Y_(f)), C.ink, 1); text(f === 0.5 ? '.5' : String(f), G.cx0 - 8, Y_(f), { align: 'right', size: 11, color: TK }); });
        lab('diX', `${K('\\mu')}<span> mean shift</span>`, G.cx1, G.cy1 + 36, { ax: 1 });
        // theory curves: the three shapes as ghosts, the selected one live at pNow() (it glides between them)
        P_OPTS.forEach(pp => {
          const a = CURVE[pp];
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) { const v = -3 + (4 * i) / 120; if (i) ctx.lineTo(X_(v), Y_(a[i])); else ctx.moveTo(X_(v), Y_(a[i])); }
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        });
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) { const v = -3 + (4 * i) / 120, f = activeFrac(pN, v); if (i) ctx.lineTo(X_(v), Y_(f)); else ctx.moveTo(X_(v), Y_(f)); }
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
        // Table 13 (ViT-S, measured at p = 1): dimmed when another shape is selected
        let hovPt = null;
        ctx.save();
        ctx.globalAlpha *= S.a13;
        T13.mu.forEach((v, i) => {
          const xx = X_(v), yy = Y_(T13.active[i]);
          ctx.fillStyle = C.bg; ctx.fillRect(xx - 3.5, yy - 3.5, 7, 7);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(Math.round(xx - 3.5) + 0.5, Math.round(yy - 3.5) + 0.5, 7, 7);
          if (m && Math.hypot(m.x - xx, m.y - yy) < (m.touch ? 16 : 9)) hovPt = { xx, yy, i };
        });
        ctx.restore();
        // Table 5 (CIFAR-100, µ = 0): one measurement per shape; the selected one glides in accent
        const x0c = X_(0);
        T5.p.forEach((pp, i) => diamond(x0c, Y_(T5.l0[i]), 4.5, C.bg, ink(0.45)));
        const t5i = T5.p.indexOf(S.p);
        if (t5i >= 0) diamond(x0c, Y_(S.t5y), 5.5, C.accent);
        if (m) T5.p.forEach((pp, i) => { if (Math.hypot(m.x - x0c, m.y - Y_(T5.l0[i])) < (m.touch ? 12 : 7)) S.tip = { x: x0c + 12, y: Y_(T5.l0[i]) - 20, px: x0c, py: Y_(T5.l0[i]), html: `<div>${K(`p = ${fmtP(pp)}`, 14)} · ${K('\\mu = 0', 14)} · CIFAR-100</div><div>active ${T5.l0[i].toFixed(4)} · theory 0.5000</div>` }; });
        if (hovPt) {
          const i = hovPt.i;
          S.tip = { x: hovPt.xx + 12, y: hovPt.yy - 24, px: hovPt.xx, py: hovPt.yy, html: `<div>${K(`\\mu = ${texNum(T13.mu[i])}`, 14)} · trained ViT-S, ${K('p = 1', 14)}</div><div>active ${T13.active[i].toFixed(4)} · theory ${activeFrac(1, T13.mu[i]).toFixed(4)}</div><div class="dim">trained features sit denser than theory at mid ${K('\\mu', 14)}</div>` };
        }
        // axis label + legend (in the plot's empty upper-left, or above the plot when it would cover data)
        lab('diY', `<span>active fraction </span>${K('\\mathbb{E}\\|z\\|_0/D', 14)}`, G.cx0 + 10, G.cy0 + 12, { cls: 'ko', st: 'padding:3px 4px' });
        if (G.legIn) lab('diLeg', diLegHTML(S.p, true, G.legShort), G.cx0 + 10, G.cy0 + 30, { ay: 0, cls: 'box', st: '' });
        else if (G.legRowM) lab('diLeg', diLegRowHTML(S.p, G.legQ), G.A.x0, G.legY, { ay: 0, st: G.legSt });
        else lab('diLeg', diLegHTML(S.p, false), G.cx0 - 34, G.legY, { ay: 0, st: G.legSt });
        const dy = measure('diY'), lg = G.legIn ? measure('diLeg') : { w: 0, h: 0 };
        const blkX1 = G.cx0 + 10 + Math.max(dy.w, lg.w) + 6, blkY1 = G.legIn ? G.cy0 + 26 + lg.h : G.cy0 + 12 + dy.h / 2;
        // the unselected shapes, named on their own curves (placed once per shape, clear of data and text)
        const gl = ghostLabs(G, X_, Y_, blkX1, blkY1), ga = reduced ? 1 : clamp((S.rt - PM.t0 - PM_DUR) / 0.35, 0, 1);
        // current µ: the guide stops under the axis label and legend instead of running through them, and under a
        // curve label above the dot; a curve label below the dot fades while the guide passes through it
        const xm = X_(mu), ym = Y_(act);
        let gTop = xm >= G.cx0 && xm <= blkX1 ? Math.min(blkY1 + 6, ym - 12) : G.cy0;
        gl.forEach((g, j) => {
          const sz = measure('diG' + j), w = sz.w || 56, hh = sz.h || 18;
          const d = Math.max(g.x - xm, xm - g.x - w); // < 0: the guide's x is inside the label's knockout box
          let a = 1;
          if (d < 4) {
            if (g.y + hh < ym - 12) gTop = Math.max(gTop, Math.min(g.y + hh + 5, ym - 12));
            else a = lerp(0.15, 1, clamp((d + 2) / 4, 0, 1));
          }
          if (g.lead && ga > 0) { ctx.save(); ctx.globalAlpha *= ga * a; line(g.lead[0], g.lead[1], g.lead[2], g.lead[3], C.g500, 1); ctx.restore(); }
          lab('diG' + j, g.html, g.x, g.y, { ay: 0, cls: 'ko', color: T3, alpha: ga * a });
        });
        line(px(xm), gTop, px(xm), G.cy1, acc(0.9), 1);
        ctx.beginPath(); ctx.arc(xm, ym, 4.5, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
        ctx.beginPath(); ctx.arc(xm, ym, 8, 0, TAU); ctx.strokeStyle = acc(0.35); ctx.lineWidth = 1; ctx.stroke();
        // readout
        const ro = mob
          ? `${K('\\mathbb{E}\\|z\\|_0 =', 14)}<span class="ink"> ${Math.round(2048 * act)} of 2048 active</span><span class="dim"> · ${pct(1 - act)} zero</span>`
          : diRoHTML(G.roLong, act);
        lab('diR', ro, mob ? G.cx0 - 24 : G.cx0, G.cy1 + 58, {});
      }

      // labels "p = …" for the two unselected theory curves: the first spot along each curve (right end first),
      // above-left of the top curve or below-right of the bottom one, that clears the other curves, the measured
      // markers, the axis label and legend, and the plot frame
      function ghostLabs(G, X_, Y_, blkX1, blkY1) {
        const key = S.p + ':' + Math.round(blkX1) + ':' + Math.round(blkY1);
        if (G.ghost[key]) return G.ghost[key];
        const out = [], taken = [];
        const cw = G.cx1 - G.cx0, vOf = x => -3 + ((x - G.cx0) / cw) * 4;
        const cy = (pp, v) => { const u = clamp(((v + 3) / 4) * 120, 0, 120), i = Math.min(119, Math.floor(u)), f = u - i; return Y_(lerp(CURVE[pp][i], CURVE[pp][i + 1], f)); };
        const pts = T13.mu.map((v, i) => [X_(v), Y_(T13.active[i]), 6]).concat(T5.l0.map(l => [X_(0), Y_(l), 7]));
        // short phone charts (legend above the plot, no "upper bound 1" note): a label may rise into the gap over the plot
        const topLim = G.legRowM ? G.cy0 - 14 : G.cy0 + 4, ubX = G.legRowM ? Infinity : G.cx1 - tw('upper bound 1', FM(11)) - 8;
        const free = (x0, y0, x1, y1, own) => {
          if (x0 < G.cx0 + 4 || x1 > G.cx1 - 2 || y0 < topLim || y1 > G.cy1 - 4) return false;
          if (y0 < G.cy0 + 2 && x1 > ubX) return false;
          if (x0 < blkX1 + 4 && y0 < blkY1 + 4) return false;
          for (const [px_, py_, r] of pts) if (px_ > x0 - r && px_ < x1 + r && py_ > y0 - r && py_ < y1 + r) return false;
          for (const b of taken) if (x0 < b[2] + 6 && x1 > b[0] - 6 && y0 < b[3] + 4 && y1 > b[1] - 4) return false;
          for (const pp of P_OPTS) {
            if (pp === own) continue;
            let top = Infinity, bot = -Infinity;
            for (let x = x0; x <= x1 + 0.1; x += Math.max(2, (x1 - x0) / 12)) { const y = cy(pp, vOf(Math.min(x, x1))); top = Math.min(top, y); bot = Math.max(bot, y); }
            if (top <= y1 + 2 && bot >= y0 - 2) return false;
          }
          return true;
        };
        P_OPTS.filter(pp => pp !== S.p).forEach((pp, j) => {
          const html = K(`p = ${fmtP(pp)}`, 14);
          prime('diG' + j, html);
          const sz = measure('diG' + j), w = (sz.w || 48) + 8, hh = sz.h || 18;
          // never near µ = 0, where all three curves cross (a label there would be ambiguous). First µ = 0.6 → 0.3: the
          // autoplay sweep (1 → −3 → −1) lingers near its turn at 1 and rests at −1, so the µ guide only flicks
          // through a label there instead of sitting on it
          const vs = [];
          for (let v = 0.6; v >= 0.3; v -= 0.05) vs.push(v);
          for (let v = 0.65; v <= 0.95; v += 0.05) vs.push(v);
          for (let v = -0.3; v >= -0.75; v -= 0.05) vs.push(v); // (further left the curves merge; −1 is where it rests)
          let spot = null;
          for (const v of vs) { // beside the curve, on its outer side
            const x = X_(v), y = cy(pp, v);
            if (free(x - 3 - w, y - 5 - hh, x - 3, y - 5)) { spot = { x: x - 3 - w, y: y - 5 - hh, b: [x - 3 - w, y - 5 - hh, x - 3, y - 5] }; break; }
            if (free(x + 3, y + 5, x + 3 + w, y + 5 + hh)) { spot = { x: x + 3, y: y + 5, b: [x + 3, y + 5, x + 3 + w, y + 5 + hh] }; break; }
          }
          if (!spot) for (const v of vs) { // a middle curve: inline, the label breaks its own dashed line (contour style)
            const x = X_(v), y = cy(pp, v), b = [x - w / 2, y - hh / 2, x + w / 2, y + hh / 2];
            if (free(b[0], b[1], b[2], b[3], pp)) { spot = { x: b[0], y: b[1], b }; break; }
          }
          if (!spot) for (let v = 0.35; v <= 0.8 && !spot; v += 0.05) { // else under all curves, with a hairline leader
            const x = X_(v), y = cy(pp, v), yLow = Math.max(...P_OPTS.map(q => cy(q, v)));
            for (let dy = 26; dy <= 90 && !spot; dy += 8) {
              const b = [x + 18, yLow + dy, x + 18 + w, yLow + dy + hh];
              if (free(b[0], b[1], b[2], b[3])) spot = { x: b[0], y: b[1], b, lead: [x + 1, y + 2, b[0] + 2, b[1] + 2] };
            }
          }
          if (spot) { taken.push(spot.b); out.push({ html, x: spot.x, y: spot.y, lead: spot.lead }); }
        });
        G.ghost[key] = out;
        return out;
      }

      /* ------------------------------------------------------------ layer 3 · Accuracy cliff */
      function drawPareto(st) {
        const G = L.pa, mob = L.mob;
        const X_ = z => G.bx0 + zf(z) * (G.bx1 - G.bx0); // piecewise: 90–100 % zeros stretched ×6
        const Y_ = a => G.by1 - ((a - 55) / 22) * (G.by1 - G.by0);
        const zeros = ZEROS13, a13 = S.a13, off = S.p !== 1;
        // title + honesty tag: Table 13 exists only for p = 1
        kick(G.kick, G.kx, G.ky);
        lab('paTag', paTagHTML(off), G.tagX, G.tagY, {});
        // grid + axes
        for (let a = 55; a <= 75; a += 5) {
          line(G.bx0, px(Y_(a)), G.bx1, px(Y_(a)), a === 55 ? C.ink : C.g200, 1);
          text(String(a), G.bx0 - 8, Y_(a), { align: 'right', size: 11, color: TK });
        }
        [0, 25, 50, 75, 90, 95, 100].forEach(z => { line(px(X_(z)), G.by1, px(X_(z)), G.by1 + 4, C.ink, 1); text(`${z}%`, X_(z), G.by1 + 16, { align: 'center', size: 11, color: TK }); });
        { // axis break at 90 %: the scale changes there
          const xb = X_(ZB) + 0.5, yb = G.by1 + 0.5;
          ctx.fillStyle = C.bg; ctx.fillRect(xb - 3, yb - 3, 6, 6);
          line(xb - 5, yb + 4, xb - 1, yb - 4, C.ink, 1); line(xb + 1, yb + 4, xb + 5, yb - 4, C.ink, 1);
        }
        line(px(G.bx0), G.by0, px(G.bx0), G.by1, C.ink, 1);
        if (mob) text(G.ylab, G.kx, G.by0 - 14, { color: T2 }); // phones: the axis unit sits above the plot, clear of the series
        else text(G.ylab, G.bx0 + 8, G.by0 + 2, { color: T2 });
        lab('paX', mob ? '<span>exact zeros</span><span class="dim"> · ×6 past 90%</span>' : `<span>exact zeros </span>${K('1-\\mathbb{E}\\|z\\|_0/D', 14)}<span class="dim"> · axis ×6 past 90%</span>`, G.bx1, G.by1 + 36, { ax: 1 });
        // ~95% guide
        const x95 = X_(95);
        line(px(x95), G.by0 - 4, px(x95), G.by1, C.g400, 1, [3, 3]);
        if (G.note95) {
          text(G.note[0], x95 - 8, G.by0 + 2, { align: 'right', color: T2 });
          if (G.note[1]) text(G.note[1], x95 - 8, G.by0 + 18, { align: 'right', color: T3 });
        }
        // dense baselines at 0% zeros (named in the legend and on hover)
        BASE13.forEach(b => {
          plus(X_(0), Y_(b.enc), 4, C.g500);
          plus(X_(0), Y_(b.proj), 4, C.g400);
        });
        // series draw-on (marks dimmed when the selected shape is not the measured one; words stay full ink)
        const prog = reduced ? 99 : st;
        const upto = i => clamp((prog - paretoT(i - 1)) / (paretoT(i) - paretoT(i - 1)), 0, 1);
        ctx.save();
        ctx.globalAlpha *= a13;
        function series(vals, color, w, marker) {
          ctx.beginPath();
          ctx.moveTo(X_(zeros[0]), Y_(vals[0]));
          for (let i = 1; i < 9; i++) {
            const f = upto(i);
            if (f <= 0) break;
            ctx.lineTo(lerp(X_(zeros[i - 1]), X_(zeros[i]), f), lerp(Y_(vals[i - 1]), Y_(vals[i]), f));
          }
          if (prog > paretoT(0)) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
          for (let i = 0; i < 9; i++) {
            const age = prog - paretoT(i);
            if (age < 0) continue;
            marker(X_(zeros[i]), Y_(vals[i]), reduced ? 1 : clamp(age / 0.12, 0, 1));
          }
        }
        series(T13.enc, C.ink, 1, (x, y, sc) => { const s = 6 * sc; ctx.fillStyle = C.bg; ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x - s / 2, y - s / 2, s, s); });
        series(T13.proj, C.accent, 1.6, (x, y, sc) => { ctx.beginPath(); ctx.arc(x, y, 3.2 * sc, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); });
        // µ from the slider picks a measured row
        let near = 0;
        T13.mu.forEach((v, i) => { if (Math.abs(v - S.mu) < Math.abs(T13.mu[near] - S.mu)) near = i; });
        if (prog > paretoT(near)) {
          const xn = X_(zeros[near]);
          line(px(xn), G.by0 + 28, px(xn), G.by1, acc(0.5), 1, [2, 3]);
          ctx.beginPath(); ctx.arc(xn, Y_(T13.proj[near]), 7, 0, TAU); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(xn, Y_(T13.enc[near]), 7, 0, TAU); ctx.strokeStyle = C.ink; ctx.stroke();
        }
        ctx.restore();
        // end annotations
        if (prog > 1.8 && !mob) { // the cliff's two notes fade in as the last segment lands
          const e = ease((prog - 1.8) / 0.5);
          ctx.save();
          ctx.globalAlpha *= e;
          // both notes sit left of the ~95% guide, in the empty band below each series' end
          const xe = X_(zeros[8]), ye = Y_(T13.enc[8]), yp = Y_(T13.proj[8]), xr = X_(95) - 10;
          line(xe - 4, ye + 4, xr + 2, ye + 22, C.g500, 1, [2, 3]);
          ktext('encoder −3.8 pts at 97.8% zeros', xr, ye + 26, { align: 'right', color: '#000' });
          ktext('75.44 → 71.64', xr, ye + 42, { align: 'right', color: T2 });
          ktext('projector −9.7 pts', xr, yp - 12, { align: 'right', color: C.accent });
          ktext('67.16 → 57.46', xr, yp + 4, { align: 'right', color: T2 });
          ctx.restore();
        }
        lab('paMu', muRowHTML(near, G.muV), mob ? G.kx : G.bx0, G.by1 + G.muDy, {});
        // Table 5 for the selected shape, one line (phones, narrow desktops)
        if (G.pline) lab('paPl', plineHTML(S.p, G.plV), mob ? G.kx : G.bx0, G.by1 + G.plDy, { cls: S.rt - S.pAt < 1.4 ? 'hi' : '' });
        // legend (in the lower-left of the plot, right of the 0 %-zeros column so every dense baseline "+" stays in
        // view; or under the plot on narrow charts)
        {
          const lx = G.legOut ? G.bx0 - 26 : X_(0) + 14, ly = G.legOut ? G.by1 + G.legDy : G.legY;
          if (G.legRow) { // one row under the µ line
            const yR = G.by1 + G.plDy;
            let x = G.kx;
            ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, yR - 3.5, 6, 6);
            text('encoder', x + 14, yR, { color: T2 }); x += 14 + tw('encoder') + 16;
            ctx.beginPath(); ctx.arc(x + 3.5, yR, 3, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
            text('projector', x + 14, yR, { color: T2 }); x += 14 + tw('projector') + 16;
            plus(x + 3.5, yR, 4, C.g500);
            text('dense baselines', x + 14, yR, { color: T2 });
          } else {
            // knockout: guides pass behind (it never reaches the x axis or its 90 % break mark)
            if (!G.legOut) { ctx.fillStyle = C.bg; ctx.fillRect(lx - 4, ly - 10, G.legW + 26, Math.min(56, G.by1 - 3 - (ly - 10))); }
            ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, ly - 3.5, 6, 6);
            text('encoder (linear probe)', lx + 16, ly, { color: T2 });
            ctx.beginPath(); ctx.arc(lx + 3.5, ly + 18, 3, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
            text('projector (rectified)', lx + 16, ly + 18, { color: T2 });
            plus(lx + 3.5, ly + 36, 4, C.g500);
            text(G.legDense, lx + 16, ly + 36, { color: T2 });
          }
        }
        // hover
        const m = S.mouse;
        if (m) {
          let best = null, bd = m.touch ? 18 : 12;
          for (let i = 0; i < 9; i++) {
            [T13.enc[i], T13.proj[i]].forEach(v => {
              const d = Math.hypot(m.x - X_(zeros[i]), m.y - Y_(v));
              if (d < bd) { bd = d; best = { i, v }; }
            });
          }
          BASE13.forEach(b => [b.enc, b.proj].forEach(v => {
            const d = Math.hypot(m.x - X_(0), m.y - Y_(v));
            if (d < bd) { bd = d; best = { b, v }; }
          }));
          if (best && best.b) {
            const b = best.b;
            S.tip = { x: X_(0) + 12, y: Y_(b.enc) - 34, px: X_(0), py: Y_(best.v), html: `<div>${b.n} · dense, 0% zeros</div><div>encoder ${b.enc.toFixed(2)} · projector ${b.proj.toFixed(2)}</div>` };
          } else if (best) {
            const i = best.i;
            S.tip = { x: X_(zeros[i]) + 12, y: Y_(T13.enc[i]) - 34, px: X_(zeros[i]), py: Y_(best.v), html: `<div>${K(`\\mu = ${texNum(T13.mu[i])}`, 14)} · ${zeros[i].toFixed(1)}% zeros</div><div>encoder ${T13.enc[i].toFixed(2)} · projector ${T13.proj[i].toFixed(2)}</div>` };
          }
        }
        // thumbnails: three measured sparsity levels (cell pattern illustrative)
        if (G.thumbs) {
          const lv = [[2, '0'], [4, '-1'], [7, '-2.5']];
          const tw_ = G.thR - G.bx0; // stops short of the links column
          const NC = 32, pitch = Math.min(6.5, (tw_ - 80) / (3 * NC)), cellW = pitch - 1.6, stripW = NC * pitch;
          const gapX = (tw_ - 3 * stripW) / 2;
          const s1 = gg.target(1);
          text('32 of 2048 dims at the measured zero fraction · pattern illustrative', G.bx0, G.thumbY - 16, { color: T3 });
          lv.forEach(([ti, lab_], j) => {
            const x0 = G.bx0 + j * (stripW + gapX), y0 = G.thumbY;
            const nZero = Math.round(NC * (1 - T13.active[ti]));
            const zeroSet = new Set(thumbOrder.slice(0, nZero));
            ctx.save();
            ctx.globalAlpha *= a13;
            for (let c = 0; c < NC; c++) {
              const x = x0 + c * pitch;
              if (zeroSet.has(c)) { ctx.strokeStyle = C.g300; ctx.strokeRect(Math.round(x) + 0.5, y0 + 0.5, cellW - 1, 9); }
              else { ctx.fillStyle = acc(0.35 + 0.65 * clamp(s1[c] / 1.5, 0, 1)); ctx.fillRect(x, y0, cellW, 10); }
            }
            ctx.restore();
            lab('paTh' + j, `${K(`\\mu = ${lab_}`, 14)}<span class="ink"> · ${zeros[ti].toFixed(1)}% zeros</span>`, x0, y0 + 26, {});
          });
        }
        // Tables 1 and 5 (wide desktop): rows for the selected shape highlighted
        if (G.tables) {
          if (G.t1) lab('paT1', t1HTML(S.p, G.tableW), G.tx, G.t1y, { ay: 0 });
          lab('paT5', t5HTML(S.p, G.tableW), G.tx, G.t5y, { ay: 0 });
        }
      }

      function drawTip() {
        const t = S.tip;
        if (!t) return;
        // this tip's own size (not the previous one's): on phones the box wraps inside the screen
        const st = L.mob ? `max-width:${Math.round(L.w - 32)}px;white-space:normal` : '';
        const r = prime('tip', t.html, st);
        if (r.cls !== 'tipbox') { r.el.className = 'lpj-l tipbox'; r.cls = 'tipbox'; }
        const sz = measure('tip'), w = sz.w || 240, hh = sz.h || 44;
        // flip left before the box would reach the tables (step 5) or the viewport edge, keep it on screen, and when
        // that puts it over its point, move it above the point (below when there is no room above)
        let limit = L.w - 16;
        if (!L.mob && S.step === 4 && L.pa && L.pa.tables) limit = L.pa.tx - 8;
        let x = t.x + w > limit ? t.x - 26 - w : t.x;
        x = clamp(x, 16, Math.max(16, L.w - 16 - w));
        let y = Math.max(70, t.y);
        if (t.px != null && t.px > x - 8 && t.px < x + w + 8 && t.py > y - 8 && t.py < y + hh + 8) {
          y = t.py - 14 - hh;
          if (y < 70) y = t.py + 14;
        }
        lab('tip', t.html, x, y, { ay: 0, cls: 'tipbox', st });
      }

      /* ------------------------------------------------------------ frame */
      function draw() {
        if (!L.ready) return;
        cv.clear();
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.2px';
        S.tip = null;
        const st = S.sceneT - S.stepT0;
        const fns = [drawRect, drawSlice, drawDial, drawPareto];
        for (let l = 0; l < 4; l++) {
          const a = S.vis[l];
          if (a < 0.01) continue;
          ensure(l);
          ctx.save();
          ctx.globalAlpha = a;
          LA = a; LY = a < 0.999 ? (1 - a) * 6 : 0;
          if (LY) ctx.translate(0, LY);
          fns[l](LAYER[S.step] === l ? st : 99);
          ctx.restore();
        }
        LA = 1; LY = 0;
        drawTip();
        labFlush();
        renderCtr();
        // DOM tags: toggle only on change
        for (const tg of tags) {
          const on = tg.steps.includes(S.step) && S.vis[LAYER[S.step]] > 0.6;
          if (on !== tg.on) { tg.on = on; tg.el.classList.toggle('on', on); }
        }
      }

      // one-shot intros (step time, s) finish even when paused, so a paused frame is never half drawn: the drain into
      // the point mass (step 1), the dial and panels drawing on (step 2, from its slice clock) and the frontier (step 5).
      // Pause freezes only what runs after them: autoplay, rain, rotation, training, the µ sweep.
      const INTRO = [3.15, 2.3, 0, 0, 2.35];
      const introLeft = () => (S.step === 1 ? S.sceneT - S.sliceT0 : S.sceneT - S.stepT0) < INTRO[S.step];
      api.loop((t, dt) => {
        if (!L.ready) return;
        if (!S.paused || (!reduced && S.step >= 0 && introLeft())) S.sceneT += dt;
        update(dt);
        draw();
      });

      /* ------------------------------------------------------------ lifecycle */
      function resetAll() {
        S.sceneT = 0; S.paused = false; S.lastUser = -1e9; S.lastRot = -1e9; S.lastMuUser = -1e9;
        S.mu = MU_DEF[0]; S.p = 2; S.pUser = false; S.muUser = false; S.muAnim = null; S.pAt = -1e9;
        PM.from = 2; PM.t0 = -1e9;
        S.theta = 0; S.drag = null; S.sweep = null; S.dragVel = 0; S.mouse = null;
        S.vis = [1, 0, 0, 0];
        S.a13 = 0.4; S.t5y = T5.l0[0];
        sliderSet(S.mu);
        renderP();
        rainReset(); rain.ghost = null;
        resetNet(false);
        yMu = NaN; zDirty = true; ringInit = false; ringFull = true; S.ring0 = 0;
        refreshAll(true);
        gg.update();
        S.step = -1;
        goStep(0, 'silent', true);
      }

      return {
        enter() {
          // the previous scene's timed hint (e.g. "Click the cloud…") does not apply here: back to the resting state
          try { api.hint(''); } catch (e) {}
          L.entering = true; // resetAll sets the headline once (with its entrance); layout only measures
          try { layout(); } finally { L.entering = false; }
          resetAll();
        },
        exit() { S.drag = null; rain.drops.length = 0; S.mouse = null; clearTimeout(hintT); },
        sound(on) {
          soundOn = !!on;
          if (on) {
            lastStep = -1;
            if (!clockOff && au && au.clock && typeof au.clock.on === 'function') clockOff = au.clock.on(onClock);
            cloudStart(); massStart();
          } else {
            if (clockOff) { try { clockOff(); } catch (e) {} clockOff = null; }
            cloudStop(); massStop();
          }
        },
        key(e) {
          const k = e.key;
          if (k === 'ArrowDown') { touch(); goStep(S.step + 1, true); return true; }
          if (k === 'ArrowUp') { touch(); goStep(S.step - 1, true); return true; }
          if (k === ' ' || k === 'Spacebar') { togglePause(); return true; }
          if (k === 'p' || k === 'P') { touch(); cycleP(); return true; }
          if ((k === '[' || k === ',' || k === ']' || k === '.') && (S.step === 1 || S.step === 2)) {
            touch(); S.lastRot = S.sceneT;
            setTheta(S.theta + (k === ']' || k === '.' ? 7.5 : -7.5) * DEG, true);
            return true;
          }
          if ((k === 'r' || k === 'R') && S.step === 2) {
            touch(); resetNet(true); net.resolved = false; S.ring0 = 0; S.stepT0 = S.sceneT; S.trainAcc = 0;
            if (reduced) rmSettle();
            return true;
          }
          return false;
        },
      };
    },
  });
})();
