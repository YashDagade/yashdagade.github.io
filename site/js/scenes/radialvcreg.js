/* yashdagade.com v2 — scene [3] Radial-VCReg.
 *
 * Whitening (VCReg) fixes the covariance, but second-order statistics cannot see shape.
 * Radial-VCReg also matches the feature norm ‖z‖ to the chi law χ(d) of a Gaussian.
 *
 * Interactive centrepiece: a 2-D feature cloud the viewer picks (X · ring · student-t · sunshine),
 * clicks to cycle and drags to reshape. Every readout (Σ̂, VCReg terms, kurtosis, W₁ to χ₂, the
 * paper's radial loss) is computed live from the points on screen. Paper numbers come from the
 * research brief (arXiv:2602.14272, figures fig-extracted by the brief).
 *
 * Round 2: all notation is KaTeX (key formula per step, readouts and in-canvas labels via an HTML
 * overlay layer, slider label/ends); text ≥ 12px in #000/#555. Sound: grains, bits, subs and every
 * sustained voice stay in D3–A4; only 2–8 ms ticks (never sustained) reach D4–A5.
 * In-cloud labels are placed by a small cost search (point density + other labels + frame), so they
 * never sit on the data or on each other, whatever shape the viewer picks.
 * Round 4: every step states its point in the shared context headline (api.headline) at the top; the
 * right column keeps the key formula and the readouts, and all the art is laid out under the headline.
 * Each step also sets the bottom-left caption (what to try, and the source or honesty note), and on tall
 * windows the histogram grows up to the section gap under the right column's tallest block.
 */
(function () {
  'use strict';

  /* =================================================================== paper data (from the brief) */

  // Fig. 1b end state: radii of the 100 quantile shells, inside out (brief App. B, fig-extracted).
  const SHELLS = [0.08, 0.161, 0.216, 0.26, 0.299, 0.333, 0.364, 0.393, 0.421, 0.447, 0.472, 0.496, 0.519, 0.541, 0.563, 0.584, 0.605, 0.625, 0.645, 0.665, 0.684, 0.703, 0.721, 0.74, 0.758, 0.776, 0.794, 0.811, 0.829, 0.846, 0.864, 0.881, 0.898, 0.915, 0.932, 0.949, 0.966, 0.983, 1.0, 1.017, 1.033, 1.05, 1.067, 1.084, 1.101, 1.118, 1.135, 1.152, 1.169, 1.187, 1.204, 1.222, 1.239, 1.257, 1.275, 1.293, 1.311, 1.329, 1.348, 1.366, 1.385, 1.404, 1.424, 1.443, 1.463, 1.483, 1.504, 1.525, 1.546, 1.567, 1.589, 1.612, 1.634, 1.658, 1.682, 1.706, 1.732, 1.758, 1.784, 1.812, 1.84, 1.87, 1.901, 1.932, 1.966, 2.001, 2.038, 2.077, 2.118, 2.162, 2.21, 2.262, 2.319, 2.382, 2.454, 2.538, 2.639, 2.769, 2.954, 3.3];

  // Fig. 1b: 300 real optimized positions (3 per shell), used as angle templates (brief App. B).
  const TPL = [-0.02,-0.08,-0.04,0.07,0.07,0.03,0.07,0.15,-0.14,-0.08,0.02,0.16,0.08,0.2,-0.21,0.03,0.19,0.09,-0.26,0.03,0.13,0.23,0.21,0.16,-0.23,0.19,0.28,0.1,0.03,-0.3,0.13,-0.31,-0.3,0.15,-0.16,-0.29,-0.13,-0.34,-0.35,0.11,0.32,-0.17,0.24,-0.31,0.17,0.35,-0.3,-0.26,-0.23,-0.35,-0.29,-0.3,0.41,-0.12,-0.38,-0.24,-0.37,-0.25,-0.44,0.04,-0.4,-0.25,-0.36,0.3,-0.19,-0.43,-0.36,-0.34,0.05,-0.49,-0.27,-0.41,-0.06,-0.52,-0.39,-0.34,0.03,-0.52,-0.35,-0.41,0.16,-0.52,0.53,-0.09,0.56,-0.09,-0.47,0.31,-0.52,0.22,0.41,0.42,-0.58,0.04,0.48,-0.33,-0.01,0.6,-0.4,0.46,0.36,0.48,-0.3,0.55,0.51,0.37,-0.16,0.6,0.23,-0.6,0.43,0.48,0.26,-0.59,-0.66,-0.07,-0.66,-0.03,-0.16,0.64,-0.68,0.01,-0.27,-0.63,0.37,0.58,-0.14,0.69,0.7,0.04,-0.7,0.08,-0.37,0.62,-0.62,-0.37,0.03,-0.72,-0.19,0.72,-0.47,-0.57,0.44,0.6,0.6,-0.46,-0.7,-0.3,0.74,-0.16,-0.77,-0.1,-0.78,-0.02,-0.28,0.72,0.39,-0.69,-0.67,-0.43,-0.79,-0.1,-0.62,-0.52,-0.39,0.71,-0.35,0.73,-0.01,0.83,0.48,0.68,-0.55,-0.62,-0.73,0.42,-0.51,-0.68,0.76,0.36,-0.35,-0.79,0.02,0.86,0.63,-0.59,0.78,0.41,-0.14,0.87,-0.7,-0.53,-0.34,0.83,0.86,-0.27,-0.82,0.36,-0.56,0.73,-0.0,0.91,-0.56,-0.73,-0.23,0.9,-0.83,-0.43,-0.76,-0.54,0.72,-0.62,-0.13,-0.94,-0.77,0.55,0.4,0.88,0.67,0.69,-0.63,0.73,0.88,-0.43,0.93,0.3,-0.54,-0.82,0.73,0.69,0.68,-0.73,-0.89,0.47,0.4,0.94,0.98,0.24,-0.88,-0.5,-0.83,-0.62,-0.8,-0.66,-0.72,0.74,1.03,0.23,0.36,0.99,1.03,0.22,0.79,0.71,-0.13,1.06,0.7,0.81,0.51,-0.96,1.01,0.4,-0.22,-1.06,-0.99,-0.47,0.58,0.94,1.07,-0.24,0.91,0.65,-0.7,0.87,0.94,0.6,-0.7,0.9,-0.62,-0.95,1.04,0.46,1.14,0.2,-0.88,-0.74,-0.09,-1.15,0.77,-0.88,0.4,-1.1,-1.03,-0.55,-1.18,-0.09,-1.08,-0.49,-1.08,-0.48,1.18,0.21,0.27,-1.17,0.51,-1.09,0.38,-1.16,1.08,0.58,0.74,0.97,0.54,1.12,1.23,0.19,1.05,-0.66,0.8,0.97,1.16,0.48,-0.92,-0.86,1.26,0.2,1.25,0.23,0.71,1.06,-0.92,-0.9,1.14,0.6,-1.29,-0.06,-1.3,0.16,-1.27,-0.32,-0.97,-0.88,1.26,-0.42,-0.2,1.31,-0.52,-1.22,-1.29,-0.38,1.33,-0.23,0.56,-1.22,1.3,0.42,0.09,-1.36,0.7,1.17,-0.27,1.36,-1.23,0.64,-1.28,-0.53,-1.37,-0.31,0.79,-1.16,0.97,1.01,-0.65,-1.27,-0.63,1.28,1.04,-0.98,-0.73,-1.25,1.4,-0.37,-0.34,-1.41,1.29,-0.7,0.22,-1.44,-0.2,-1.45,1.05,1.06,-0.82,-1.24,-0.82,1.24,-0.92,1.19,1.43,-0.45,-1.49,0.19,-1.06,-1.1,1.38,0.66,-0.4,-1.47,-0.29,-1.51,0.13,1.54,1.37,0.71,0.54,1.47,-1.57,0.09,1.28,0.9,-1.28,0.94,0.34,-1.55,0.28,1.57,1.57,0.33,-0.93,1.31,0.34,-1.57,0.73,-1.47,1.29,1.0,-0.95,-1.33,1.54,0.61,-0.77,1.47,-1.52,-0.67,1.02,-1.33,1.63,-0.41,1.42,0.9,-0.57,1.61,-1.5,0.81,0.42,-1.65,-1.72,-0.23,-0.69,-1.59,-1.23,-1.22,1.63,0.66,-1.45,-0.99,-1.71,0.42,-1.32,-1.19,-1.66,-0.65,-0.29,1.76,-0.83,1.61,1.24,1.32,-1.27,1.29,-1.34,-1.26,-1.83,-0.14,-0.96,1.57,-1.77,-0.61,1.82,-0.43,-1.52,-1.1,-0.55,1.82,-0.89,1.68,1.5,1.17,-1.71,-0.9,1.91,-0.28,-1.91,-0.27,0.53,1.89,-1.92,0.45,1.17,-1.58,-1.52,-1.29,-1.16,1.63,1.89,0.67,-1.38,-1.49,1.0,1.78,-1.75,1.04,1.2,-1.7,-1.31,1.61,1.89,0.86,2.01,0.67,2.1,0.27,1.87,1.01,1.84,1.13,-1.92,-0.99,1.6,1.46,1.34,1.76,-2.07,0.77,0.37,-2.18,1.1,1.98,1.61,-1.6,-1.71,-1.48,-2.12,-0.94,-2.3,0.29,1.04,2.07,-2.37,0.3,0.48,2.34,0.97,2.18,0.25,-2.44,1.9,1.55,-2.07,1.32,1.26,2.2,-2.16,-1.33,-1.47,-2.07,-0.14,2.64,1.72,2.0,-2.64,0.04,2.2,1.68,1.35,2.41,-1.29,-2.45,2.91,-0.52,-2.9,0.56,0.18,-2.95,-1.18,3.09,3.17,0.9,-3.29,0.28];

  // Chart A — Fig. 1c: Wasserstein distance to N(0, I) vs mixture ratio α (fig-extracted).
  const CA = {
    alpha: [0.01, 0.25, 0.5, 0.75, 0.99],
    data: [0.126, 0.229, 0.373, 0.511, 0.654],
    vcreg: [0.112, 0.223, 0.375, 0.511, 0.654],
    radial: [0.112, 0.150, 0.169, 0.213, 0.289],
  };

  // Chart B — Figs. 2a–c: feature-norm density histograms at d_out = 512 (75 bins of 0.56 over [0, 42]).
  const F2 = [
    { name: 'init', long: 'random init', w1: 17.15, k0: 2,
      v: [0.0014, 0.0059, 0.0321, 0.0845, 0.1657, 0.2475, 0.2821, 0.2693, 0.203, 0.1573, 0.0977, 0.0645, 0.045, 0.04, 0.0316, 0.0207, 0.0191, 0.0098, 0.0059, 0.0025] },
    { name: 'VICReg', long: 'VICReg', w1: 8.17, k0: 3,
      v: [0.0002, 0, 0, 0, 0.0004, 0, 0.0004, 0.0011, 0.0034, 0.0055, 0.0069, 0.016, 0.0244, 0.0307, 0.0327, 0.0413, 0.0478, 0.0556, 0.0541, 0.0581, 0.0569, 0.0628, 0.0556, 0.0522, 0.0508, 0.0541, 0.0499, 0.0482, 0.051, 0.0491, 0.0426, 0.0383, 0.0406, 0.0345, 0.039, 0.0406, 0.0345, 0.0356, 0.0293, 0.0341, 0.024, 0.0238, 0.0297, 0.0234, 0.0213, 0.0244, 0.0183, 0.0211, 0.0198, 0.0221, 0.0225, 0.0189, 0.0166, 0.0171, 0.0204, 0.0181, 0.0147, 0.0131, 0.0147, 0.0112, 0.0129, 0.0112, 0.0099, 0.0084, 0.0128, 0.0101, 0.0086, 0.0093, 0.0078, 0.0078, 0.0072, 0.0067] },
    { name: 'Radial-VICReg', long: 'Radial-VICReg', w1: 0.79, k0: 33,
      v: [0.0018, 0.0025, 0.0075, 0.0339, 0.0627, 0.1343, 0.1993, 0.2484, 0.2913, 0.2986, 0.2379, 0.1439, 0.0686, 0.0295, 0.012, 0.0061, 0.0029, 0.003, 0.0007, 0.0002, 0.0002, 0.0004, 0.0004] },
  ];
  const F2_BINS = 75, F2_W = 0.56;

  // Chart C — Tables 1–3: Top-1 (%) VICReg vs Radial-VICReg, gain in pp (brief §4.4).
  // [label, short label (phones), projector width d, VICReg, Radial-VICReg, gain]
  const CC = [
    ['CIFAR-100 · ResNet-18', 'CIFAR-100 · RN18', 512, 64.23, 65.99, 1.76],
    ['CIFAR-100 · ViT-Tiny', 'CIFAR-100 · ViT', 512, 60.30, 61.33, 1.03],
    ['ImageNet-10 · ResNet-18', 'ImageNet-10 · RN18', 512, 93.20, 94.73, 1.53],
    ['CIFAR-100 · MLP probe', 'CIFAR-100 · MLP', 512, 62.30, 64.11, 1.81],
    ['CIFAR-100 · ResNet-18', 'CIFAR-100 · RN18', 2048, 67.99, 68.25, 0.26],
    ['CIFAR-100 · ViT-Tiny', 'CIFAR-100 · ViT', 2048, 62.28, 62.91, 0.63],
    ['ImageNet-10 · ResNet-18', 'ImageNet-10 · RN18', 2048, 93.53, 93.93, 0.40],
    ['CIFAR-100 · MLP probe', 'CIFAR-100 · MLP', 2048, 65.81, 66.33, 0.52],
    ['ImageNet-10 · ResNet-18', 'ImageNet-10 · RN18', 8192, 93.33, 93.33, 0.00],
  ];

  /* =================================================================== math */

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeSine = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const MINUS = '−';
  function fmt(v, k) {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) < 0.5 * Math.pow(10, -k)) v = 0;
    return v.toFixed(k).replace('-', MINUS);
  }

  function rng(seed) {
    let a = seed >>> 0, spare = null;
    const u = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const n = () => {
      if (spare !== null) { const v = spare; spare = null; return v; }
      const p = u() || 1e-12, q = u(), m = Math.sqrt(-2 * Math.log(p));
      spare = m * Math.sin(TAU * q);
      return m * Math.cos(TAU * q);
    };
    return { u, n };
  }

  const LG = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += LG[i] / (x + i + 1);
    return 0.5 * Math.log(TAU) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  // regularized lower incomplete gamma P(a, x)
  function gammp(a, x) {
    if (x <= 0) return 0;
    const gln = lgamma(a);
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 600; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 600; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  // χ(d): p(r) = r^{d−1} e^{−r²/2} / (2^{d/2−1} Γ(d/2))   (paper Eq. 20)
  const chiLogC = d => -((d / 2 - 1) * Math.LN2 + lgamma(d / 2));
  const chiPdf = (r, d, lc) => (r <= 0 ? 0 : Math.exp(lc + (d - 1) * Math.log(r) - r * r / 2));
  const chiMean = d => Math.SQRT2 * Math.exp(lgamma((d + 1) / 2) - lgamma(d / 2));
  function normInv(p) { // Acklam's rational approximation
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const e = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1); }
    if (p > 0.97575) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  // χ(d) quantile: Wilson–Hilferty start, Newton on the exact CDF P(d/2, r²/2).
  function chiQuant(u, d) {
    if (d === 2) return Math.sqrt(-2 * Math.log(1 - u));
    const k = 2 / (9 * d), z = normInv(u);
    let r = Math.sqrt(Math.max(1e-6, d * Math.pow(Math.max(1e-3, 1 - k + z * Math.sqrt(k)), 3)));
    const lc = chiLogC(d);
    for (let it = 0; it < 8; it++) {
      const f = gammp(d / 2, r * r / 2) - u, p = chiPdf(r, d, lc);
      if (!(p > 1e-300)) break;
      let nr = r - f / p;
      if (nr <= 0) nr = r / 2;
      if (Math.abs(nr - r) < 1e-9) { r = nr; break; }
      r = nr;
    }
    return r;
  }
  // Σ^{1/2} and Σ^{−1/2} of a 2×2 SPD matrix [[a, b], [b, c]] → [m00, m01, m11]
  function sqrtm(a, b, c) {
    const s = Math.sqrt(Math.max(a * c - b * b, 1e-12)), t = Math.sqrt(a + c + 2 * s);
    return [(a + s) / t, b / t, (c + s) / t];
  }
  function isqrtm(a, b, c) {
    const s = Math.sqrt(Math.max(a * c - b * b, 1e-12)), t = Math.sqrt(a + c + 2 * s), k = 1 / (t * s);
    return [(c + s) * k, -b * k, (a + s) * k];
  }

  /* =================================================================== scene constants */

  const N = 1500;
  const M_SP = Math.round(Math.sqrt(N)); // m-spacing window, as in the public code (m = round(√N))
  const SHAPES = [
    { key: 'X', label: 'X' },              // paper Fig. 1a — not elliptical
    { key: 'ring', label: 'ring' },        // uniform on a circle of radius sqrt 2 — elliptical
    { key: 't', label: 'student-t' },      // isotropic student-t, nu = 6 — elliptical
    { key: 'sun', label: 'sunshine' },     // paper Fig. 3a — not elliptical, radius already chi
  ];
  const D_SEQ = [2, 3, 4, 8, 16, 32, 64, 128, 256, 512];
  // Raw "encoder" distortion: symmetric stretch 1.55 × 0.62 along 35°, plus a mean offset.
  const RAW_PHI = 35 * Math.PI / 180, RAW_S1 = 1.55, RAW_S2 = 0.62, MU = [0.32, -0.18];
  const A_RAW = (() => {
    const c = Math.cos(RAW_PHI), s = Math.sin(RAW_PHI);
    return [RAW_S1 * c * c + RAW_S2 * s * s, (RAW_S1 - RAW_S2) * c * s, RAW_S1 * s * s + RAW_S2 * c * c];
  })();

  // Step copy. `hl` is the step's context headline (api.headline, big centred text at the top): `t` states
  // the point of the step in one plain sentence (≈ 100–110 characters: two lines on laptops and at the
  // 420 px headline of ≈ 900 px windows, the reason and the takeaway included, since short windows and short
  // phones show the title alone), `s` names the parts on screen ($…$ is KaTeX), `m` is a one-line sub for
  // phones that can spare the line. The copy holds for every shape a viewer can pick (X · ring · student-t
  // · sunshine), since the headline stays put while the shapes cycle. Typesetting: a formula followed by
  // punctuation takes the mark inside its $…$ (a line never starts with a lone "."), hlText() joins the last
  // words with no-break spaces (no stub of a last line) and makes hyphens in words non-breaking. Each step
  // holds at least as long as its headline takes to read (durOf). Claims and numbers: the brief (§1, §3,
  // Figs. 1–2, Tables 1–3, App. 8.2).
  // The right column keeps only the step's key formula (`eq`, KaTeX display math; `tag` names its source)
  // and the live readouts. Step 1's key formula is live: the definition of Σ̂ and its current value.
  const STEPS = [
    { label: 'Raw features', dur: 7.5, settle: 3.5,
      hl: { t: 'Radial-VCReg is a cheap loss that pulls an encoder’s features toward a Gaussian, the maximum-information prior.',
        s: 'We want encoders with a maximum-information prior, and for a given spread that is the Gaussian. On top of whitening, Radial-VCReg minimizes the KL between the lengths of your features and a Gaussian’s. Raw features, below, are correlated, stretched and not Gaussian.',
        m: 'Below: a 2-D feature cloud and its covariance $\\hat\\Sigma.$' },
      eq: '\\hat\\Sigma = \\frac{1}{N-1}\\sum_i\\,(z_i-\\bar z)(z_i-\\bar z)^{\\top}', live: true, tag: '' },
    { label: 'Whiten (VCReg)', dur: 12.5, settle: 11,
      hl: { t: 'VCReg, the usual remedy, whitens features: variance\u00a01, no correlation. That fixes the spread, not the shape.',
        s: 'The whitened cloud and the gray Gaussian share $\\Sigma = I,$ so VCReg loss is 0 for both: second-order statistics can’t tell them apart. The histogram compares each length $\\|z\\|$ with $\\chi_2,$ the blue curve of Gaussian lengths.',
        m: 'Gray: a true Gaussian sample with the same $\\Sigma.$' },
      eq: 'z \\;\\mapsto\\; \\hat\\Sigma^{-1/2}\\,(z-\\hat\\mu)', tag: 'whitening' },
    { label: 'Chi shell', dur: 10.5, settle: 7.5,
      hl: { t: 'A high-dimensional Gaussian is a thin shell: the length $\\|z\\|$ of its samples follows the chi law.',
        s: 'As $d$ grows from 2 to 512, the histogram’s peak $\\sqrt{d-1}$ moves out while its width stays about 0.7: a thin shell. Checking the length is a 1-D test in any dimension.',
        m: 'The peak $\\sqrt{d-1}$ moves out; the width stays about 0.7.' },
      eq: 'p_{\\chi_d}(r) = \\frac{r^{\\,d-1}\\,e^{-r^2/2}}{2^{\\,d/2-1}\\,\\Gamma(d/2)}', tag: 'Eq. 20' },
    // reduced motion settles on phase B (the mapped X: radius right, angles wrong), the step's last point
    { label: 'Radial map', dur: 14, settle: 4.6, settleRM: 10.5,
      hl: { t: 'Radial-VCReg also matches lengths $\\|z\\|$ to the chi law: elliptical clouds turn Gaussian, an X does not.',
        s: 'Directions stay; only $\\|z\\|$ moves (Prop. 1). A whitened ring becomes $\\mathcal N(0, I).$ An X gets the right lengths but keeps its four arms, so it is still not Gaussian.',
        m: 'Directions stay; only the lengths $\\|z\\|$ move (Prop. 1).' },
      eq: 'T(z) = \\frac{z}{\\|z\\|}\\;F_{\\chi_2}^{-1}\\!\\big(F_{\\|z\\|}(\\|z\\|)\\big)', tag: 'Prop. 1 · $z$ whitened' },
    { label: 'Toy experiment', dur: 12, settle: 7.5,
      hl: { t: 'In the paper’s 2-D test, Radial-VCReg pulls an X-shaped cloud toward a Gaussian; VCReg alone barely moves it.',
        s: 'Chart (Fig. 1c): distance to $\\mathcal N(0, I)$ as the X’s share $\\alpha$ of the data grows. At $\\alpha = 0.99,$ Radial-VCReg more than halves it: 0.289 vs. 0.654 for VCReg.',
        m: 'At $\\alpha = 0.99{:}$ 0.289 with Radial-VCReg vs. 0.654 (Fig. 1c).' },
      eq: '\\mathcal L_{\\mathrm{VCReg}} + D_{\\mathrm{KL}}\\big(p(\\|z\\|)\\,\\big\\|\\,\\chi_2\\big)', tag: 'Eqs. 2, 8' },
    { label: 'Real features', dur: 14, settle: 9,
      hl: { t: 'On real image features, adding the length term puts feature lengths on the chi shell and raises accuracy.',
        s: 'Distance $W_1$ of 512-dim feature lengths to $\\chi_{512}{:}$ 8.17 with VICReg (VCReg plus an invariance term), 0.79 with Radial-VICReg. Probe accuracy (top-1) rises 1.0–1.8 points at $d = 512,$ less at 2048, none at 8192.',
        m: '$W_1$ to $\\chi_{512}{:}$ 8.17 with VICReg, 0.79 with Radial-VICReg.' },
      eq: '\\mathcal L_{\\mathrm{VICReg}}(Z, Z\') + r(Z) + r(Z\')', tag: 'Eq. 8' },
  ];
  // Bottom-left captions (core's caption slot), one per step, in the shared voice of the other scenes: what to
  // try, and the source or the honesty note the headline does not say (≤ 36 characters a line, so phones never
  // re-wrap them). On phones "Click" reads "Tap" (capOf).
  const CAPS = [
    'Illustrative cloud, 1,500 points;\nevery number is computed live. Click\nit for a new shape, drag to reshape.',
    'Gray: a Gaussian, same covariance;\nboth clouds are illustrative. Hover\na bar to light up its points.',
    'Slide d from 2 to 512 or click the\ncloud. Histogram: true chi lengths;\nthe portrait rescales them to fit.',
    'Slide t: lengths move onto the chi\nlaw, directions stay. Click the\nillustrative cloud for a new shape.',
    'End state from paper Fig. 1b (its\n100 circles, 300 real points); the\npath is schematic. Click to replay.',
    'Histograms: paper Fig. 2a–c. Gains:\nTables 1–3. Hover or tap a row for\nthe accuracies behind each gain.',
  ];

  const CSS = `
.scene--radial-vcreg canvas { touch-action: none; }
.scene--radial-vcreg .katex { letter-spacing: 0; }
.scene--radial-vcreg .rv-head { position: absolute; left: 0; top: 0; width: 380px; pointer-events: none; z-index: 2; }
/* phones: the step row of the other scenes, "‹   01 / 06 · Step name   ›": bare chevrons at the gutters
   (44 px targets), the label centred over its progress hairline */
.scene--radial-vcreg .rv-kick { display: flex; align-items: center; justify-content: space-between; height: 44px; }
.scene--radial-vcreg .rv-head.is-desk .rv-kick { display: none; }
.scene--radial-vcreg .rv-kick button { pointer-events: auto; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; font-size: 15px; line-height: 16px; color: var(--ink); -webkit-tap-highlight-color: transparent; }
.scene--radial-vcreg .rv-kick button:active { color: var(--accent); }
/* shared step counter (all scenes): "01 / 06 · Step name", a short progress hairline, the play state.
   Desktop: top-right at the 40 px gutter. Phones: the centre of the step row, between ‹ ›. */
.scene--radial-vcreg .rv-step { position: absolute; right: 40px; top: 72px; z-index: 2; pointer-events: none; text-align: right; font-size: 12px; line-height: 15px; letter-spacing: .02em; color: #555; white-space: nowrap; }
.scene--radial-vcreg .rv-step .rv-prog { display: block; margin: 6px 0 5px auto; }
.scene--radial-vcreg .rv-kick .rv-step { position: static; flex: 1; min-width: 0; text-align: center; padding-top: 5px; }
.scene--radial-vcreg .rv-kick .rv-step .rv-prog { margin: 5px auto 0; }
.scene--radial-vcreg .rv-kick .rv-state { display: inline; }
.scene--radial-vcreg .rv-kick .rv-state::before { content: ' · '; }
.scene--radial-vcreg .rv-prog { position: relative; width: 64px; height: 1px; background: var(--g300); overflow: hidden; }
.scene--radial-vcreg .rv-prog i { position: absolute; inset: 0; background: var(--ink); transform-origin: 0 50%; transform: scaleX(0); transition: background-color .2s ease; }
.scene--radial-vcreg .rv-prog.is-still i { background: var(--g500); }
/* the right column holds the step's key formula (the context headline states the point); cramped
   columns set it smaller, then leave it out (see layoutSide) */
.scene--radial-vcreg .rv-head.is-compact .rv-eq { font-size: 14px; }
.scene--radial-vcreg .rv-head.is-noeq .rv-eq { display: none; }
/* portrait desktop (iPad): the formula continues the centred headline stack */
.scene--radial-vcreg .rv-head.is-center .rv-eq { justify-content: center; }
.scene--radial-vcreg .rv-eq { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-top: 0; font-size: 16px; line-height: 1.2; color: var(--ink); }
.scene--radial-vcreg .rv-eq .rv-eqm .katex-display { margin: 0; }
.scene--radial-vcreg .rv-eq .rv-eqm .katex { font-size: 1.1em; }
.scene--radial-vcreg .rv-eq .rv-eqtag { font-size: 12px; line-height: 15px; color: #555; letter-spacing: .02em; white-space: nowrap; padding-left: 12px; border-left: 1px solid var(--g300); }
.scene--radial-vcreg .rv-eq .rv-eqtag .katex { font-size: 1.2em; line-height: 1; letter-spacing: 0; }
/* a tag that wrapped under its formula starts its own line: no separator bar there */
.scene--radial-vcreg .rv-eq .rv-eqtag.is-wrap { border-left: 0; padding-left: 0; }
.scene--radial-vcreg .rv-eq { transition: opacity .28s ease, transform .28s cubic-bezier(.2,.7,.2,1); }
.scene--radial-vcreg .rv-head.is-swap .rv-eq { opacity: 0; transform: translateY(3px); }
.scene--radial-vcreg .rv-ov { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.scene--radial-vcreg .rv-t { position: absolute; left: 0; top: 0; font-size: 12px; line-height: 16px; letter-spacing: .02em; white-space: nowrap; }
.scene--radial-vcreg .rv-t .katex { font-size: 1.2em; line-height: 1; }
.scene--radial-vcreg .rv-t.halo { text-shadow: 0 0 2px #fff, 0 0 3px #fff, 0 0 4px #fff, 0 0 6px #fff; }
.scene--radial-vcreg .rv-t.tip { background: rgba(255,255,255,.96); border: 1px solid var(--ink); padding: 4px 8px; color: var(--ink); }
.scene--radial-vcreg .rv-t.tag { background: rgba(255,255,255,.95); padding: 1px 4px; }
.scene--radial-vcreg .rv-t.box { background: #fff; box-shadow: 0 0 0 3px #fff; }
.scene--radial-vcreg .rv-t.big { font-size: 13px; }
/* panel eyebrows (shared style): uppercase words, 12 px mono, .06em, #555; notation stays KaTeX */
.scene--radial-vcreg .rv-t.eyb { letter-spacing: .06em; }
.scene--radial-vcreg .rv-t.eyb .katex { letter-spacing: 0; }
.scene--radial-vcreg .rv-opts { position: absolute; left: 0; top: 0; display: flex; align-items: baseline; gap: 16px; font-size: 12px; line-height: 16px; letter-spacing: .02em; white-space: nowrap; transform: translateX(-50%); z-index: 2; transition: opacity .3s ease; }
.scene--radial-vcreg .rv-opts .katex { font-size: 1.2em; line-height: 1; letter-spacing: 0; }
.scene--radial-vcreg .rv-opts .rv-lab { color: #555; }
.scene--radial-vcreg .rv-opts button { color: #555; padding: 5px 0 3px; border-bottom: 1px solid transparent; transition: color .15s ease, border-color .15s ease; }
.scene--radial-vcreg .rv-opts button:hover { color: var(--accent); }
.scene--radial-vcreg .rv-opts button.is-on { color: var(--ink); border-bottom-color: var(--accent); }
.scene--radial-vcreg .rv-opts .rv-fig { color: var(--ink); padding: 5px 0 3px; }
.scene--radial-vcreg .rv-opts .rv-fig span { border-bottom: 1px solid var(--g400); transition: border-color .15s ease; }
.scene--radial-vcreg .rv-opts .rv-fig:hover { color: var(--accent); }
.scene--radial-vcreg .rv-opts .rv-fig:hover span { border-bottom-color: var(--accent); }
.scene--radial-vcreg .rv-opts .rv-div { align-self: center; width: 1px; height: 14px; background: var(--g300); }
@media (prefers-reduced-motion: reduce) {
  .scene--radial-vcreg .rv-eq, .scene--radial-vcreg .rv-opts { transition: none; }
}
/* phones: the head is the step row (‹ counter ›) at the top; the context headline sits under it */
@media (max-width: 800px) {
  .scene--radial-vcreg .rv-opts { gap: 12px; }
  .scene--radial-vcreg .rv-kick .rv-state:empty { display: none; }
}
`;

  Site.register({
    id: 'radial-vcreg',
    n: 6, hidden: true, // menu / Find only (not on keys 1–5)
    title: 'Radial-VCReg',
    path: '/radial-vcreg',
    caption: CAPS[0],

    create(el, api) {
      const COL = api.colors, FONT = api.fonts;
      const ACC = a => `rgba(20,50,245,${a})`;
      const INK = a => `rgba(0,0,0,${a})`;
      // Round-2 type scale: 11px only for axis ticks, 12px for anything read, 13px for panel titles.
      const F11 = `11px ${FONT.mono}`, F12 = `12px ${FONT.mono}`, F13 = `13px ${FONT.mono}`;
      const SEC = '#555';   // secondary text
      const TICK = '#777';  // axis tick numbers

      /* ------------------------------------------------------------ DOM */
      const style = document.createElement('style');
      style.textContent = CSS;
      el.append(style);
      const cv = api.canvas(el);
      const ctx = cv.ctx;
      const cnv = cv.canvas;

      const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

      /* ---- math: KaTeX via the shell (Site.texHTML), memoized; "rich" strings mix prose and $…$ */
      const texCache = new Map();
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      function tex(latex) {
        let s = texCache.get(latex);
        if (s == null) {
          const fb = latex.replace(/\\(mathcal|mathrm|hat|bar|big|Big|left|right|tfrac|frac|textstyle|sqrt)\b/g, '').replace(/\\[,;!]/g, ' ').replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, '');
          s = (window.Site && Site.texHTML) ? Site.texHTML(latex, { fallback: fb }) : esc(fb);
          if (texCache.size > 900) texCache.clear();
          texCache.set(latex, s);
        }
        return s;
      }
      // (punctuation right after a formula stays on its line: a wrap never starts a line with ": …")
      function rich(spec) {
        const p = String(spec).split('$');
        let s = '';
        for (let i = 0; i < p.length; i++) {
          if (!p[i]) continue;
          if (i % 2) {
            const m = /^[:;,.!?)\]’”]+/.exec(p[i + 1] || '');
            if (m) { s += `<span style="white-space:nowrap">${tex(p[i])}${esc(m[0])}</span>`; p[i + 1] = p[i + 1].slice(m[0].length); }
            else s += tex(p[i]);
          } else s += esc(p[i]);
        }
        return s;
      }

      const head = h('div', 'rv-head');
      const kick = h('div', 'rv-kick');   // phones: the step row, ‹ counter ›
      // the shared step counter: "01 / 06 · Step name", progress hairline, play state (placeCounter)
      const stepBox = h('div', 'rv-step');
      const kNum = h('span', null, '01 / 06');
      const kState = h('span', 'rv-state', 'autoplay');
      const prog = h('span', 'rv-prog'); const progBar = h('i'); prog.append(progBar);
      const bPrev = h('button', null, '‹'); bPrev.type = 'button'; bPrev.setAttribute('aria-label', 'Previous step');
      const bNext = h('button', null, '›'); bNext.type = 'button'; bNext.setAttribute('aria-label', 'Next step');
      kick.append(bPrev, bNext);
      // (desktop windows where the centred headline reaches the counter's column, ≈ 834 px: the number
      // alone; the stepper on the left names the step)
      const counterText = () => `0${step + 1} / 0${STEPS.length}` + (L.ctrName === false ? '' : ` · ${STEPS[step].label}`);
      function placeCounter() {
        if (L.mobile) { stepBox.append(kNum, kState, prog); if (stepBox.parentNode !== kick) kick.insertBefore(stepBox, bNext); }
        else { stepBox.append(kNum, prog, kState); if (stepBox.parentNode !== el) el.append(stepBox); }
        kNum.textContent = counterText();
        cueShown = '';
      }
      // widest desktop counter line (its left edge decides whether the head column must start below it)
      let ctrWMemo = 0;
      function ctrWidth() {
        if (!ctrWMemo) STEPS.forEach((s, i) => { const t = `0${i + 1} / 06 · ${s.label}`; ctrWMemo = Math.max(ctrWMemo, textW(t) + 0.24 * t.length); });
        return ctrWMemo + 4;
      }
      const hEq = h('div', 'rv-eq');
      const hEqM = h('div', 'rv-eqm tex-block'), hEqTag = h('span', 'rv-eqtag');
      hEq.append(hEqM, hEqTag);
      head.append(kick, hEq);
      // Step 1's key formula carries the live value: Σ̂ = (1/(N−1)) Σᵢ (zᵢ − z̄)(zᵢ − z̄)ᵀ = [matrix]
      const texNum = v => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2)); // ASCII minus inside KaTeX
      const matTex = () => `\\begin{bmatrix} ${texNum(ST.a)} & ${texNum(ST.b)} \\\\ ${texNum(ST.b)} & ${texNum(ST.c)} \\end{bmatrix}`;
      const SAMPLE_MAT = '\\begin{bmatrix} 0.00 & 0.00 \\\\ 0.00 & 0.00 \\end{bmatrix}';
      // a column too narrow for the definition and the value (≈ 1024–1180 px windows) shows the value alone
      const eqOf = (s, mat) => (s.live ? `${L.eqShort ? '\\hat\\Sigma' : s.eq} = ${mat || SAMPLE_MAT}` : s.eq);
      let eqShown = '', headStep = -1, eqT = 0;
      function setEq(latex) {
        if (latex === eqShown) return;
        eqShown = latex;
        api.tex(hEqM, latex, { display: true, fallback: latex.replace(/\\[a-zA-Z]+|[{}^_&]/g, '') });
      }
      function fillHead(s, mat) {
        setEq(eqOf(s, mat));
        hEqTag.innerHTML = rich(s.tag);
        hEqTag.style.display = s.tag ? '' : 'none';
        headStep = STEPS.indexOf(s);
        tagWrap();
      }
      // the formula's tag drops its hairline separator when it wraps onto a line of its own
      function tagWrap() {
        hEqTag.classList.remove('is-wrap');
        if (hEqTag.style.display !== 'none' && hEqTag.offsetWidth && hEqTag.offsetLeft < hEqM.offsetLeft + hEqM.offsetWidth) hEqTag.classList.add('is-wrap');
      }
      const opts = h('div', 'rv-opts');
      // HTML label layer over the canvas: every label that contains notation is KaTeX here, not canvas text
      const ov = h('div', 'rv-ov');
      el.append(ov, head, opts);

      /* ---- immediate-mode overlay labels: T(key, rich, x, yMid, {a, c, op, cls, rot}) each frame */
      const OVL = new Map();
      let ovFrame = 0;
      function T(key, spec, x, y, o) {
        o = o || {};
        let r = OVL.get(key);
        if (!r) {
          r = { el: h('div', 'rv-t' + (o.cls ? ' ' + o.cls : '')), spec: null, tr: '', c: '', op: -1, on: true, w: 0, hh: 16 };
          ov.append(r.el); OVL.set(key, r);
        }
        r.f = ovFrame;
        if (r.spec !== spec) { if (!r.spec || r.spec.length !== spec.length) r.w = -1; r.el.innerHTML = rich(spec); r.spec = spec; }
        const a = o.a || 'l', ax = a === 'r' ? '-100%' : a === 'c' ? '-50%' : '0';
        const tr = `translate(${Math.round(x)}px,${Math.round(y)}px)${o.rot ? ` rotate(${o.rot}deg)` : ''} translate(${ax},-50%)`;
        if (tr !== r.tr) { r.el.style.transform = tr; r.tr = tr; }
        const c = o.c || COL.ink;
        if (c !== r.c) { r.el.style.color = c; r.c = c; }
        const op = o.op != null ? clamp(o.op, 0, 1) : 1;
        if (Math.abs(op - r.op) > 0.01) { r.el.style.opacity = op.toFixed(3); r.op = op; }
        if (!r.on) { r.el.style.display = ''; r.on = true; }
        return r;
      }
      // width of a label (measured lazily, only when a caller needs it for collision checks)
      const tw = (key) => { const r = OVL.get(key); if (!r) return 0; if (r.w < 0) r.w = r.el.offsetWidth; return r.w; };
      function ovEnd() {
        OVL.forEach(r => { if (r.f !== ovFrame && r.on) { r.el.style.display = 'none'; r.on = false; } });
        ovFrame++;
      }

      /* ------------------------------------------------------------ state */
      const rr = rng(3);
      const Q2 = new Float64Array(N); // χ₂ quantiles at (i + ½)/N
      for (let i = 0; i < N; i++) Q2[i] = Math.sqrt(-2 * Math.log(1 - (i + 0.5) / N));

      function whitenInPlace(x, y) {
        let mx = 0, my = 0;
        for (let i = 0; i < N; i++) { mx += x[i]; my += y[i]; }
        mx /= N; my /= N;
        let a = 0, b = 0, c = 0;
        for (let i = 0; i < N; i++) { const dx = x[i] - mx, dy = y[i] - my; a += dx * dx; b += dx * dy; c += dy * dy; }
        a /= N - 1; b /= N - 1; c /= N - 1;
        const W = isqrtm(a, b, c);
        for (let i = 0; i < N; i++) { const dx = x[i] - mx, dy = y[i] - my; x[i] = W[0] * dx + W[1] * dy; y[i] = W[1] * dx + W[2] * dy; }
      }
      function genShape(k) {
        const R = rng([7, 21, 7, 7][k] + 101 * k);
        const x = new Float64Array(N), y = new Float64Array(N);
        if (k === 0) { // X (paper code): t ~ U(−√3, √3), half at (t, t), half at (t, −t).
          // Stratified t with antithetic pairs on each arm, (t, t) (−t, −t) and (t, −t) (−t, t): the sample
          // mean is exactly 0 and the cross term cancels, so the whitened arms cross at the origin and stay
          // straight under the radial map, with no holes along them. Marginals stay uniform (kurtosis 1.8).
          const a = Math.sqrt(3), q = N / 4;
          for (let j = 0; j < q; j++) {
            const t = a * (j + 0.5 + 0.3 * (R.u() - 0.5)) / q, i = 4 * j;
            x[i] = t; y[i] = t; x[i + 1] = -t; y[i + 1] = -t;
            x[i + 2] = t; y[i + 2] = -t; x[i + 3] = -t; y[i + 3] = t;
          }
        } else if (k === 1) { // ring of radius √2 (Σ = I), stratified angles, 2% radial jitter
          for (let i = 0; i < N; i++) {
            const th = TAU * (i + R.u()) / N, r = Math.SQRT2 * (1 + 0.02 * R.n());
            x[i] = r * Math.cos(th); y[i] = r * Math.sin(th);
          }
        } else if (k === 2) { // isotropic student-t, ν = 6
          for (let i = 0; i < N; i++) {
            let w = 0; for (let j = 0; j < 6; j++) { const z = R.n(); w += z * z; }
            const s = Math.sqrt(6 / w); x[i] = R.n() * s; y[i] = R.n() * s;
          }
        } else { // sunshine (paper code): N(0, I) cut into 16 slices, even slices rotated by −22.5°
          const Wd = TAU / 16;
          for (let i = 0; i < N; i++) {
            const a = R.n(), b = R.n(); let th = Math.atan2(b, a); if (th < 0) th += TAU;
            const r = Math.hypot(a, b); if (Math.floor(th / Wd) % 2 === 0) th -= Wd;
            x[i] = r * Math.cos(th); y[i] = r * Math.sin(th);
          }
        }
        whitenInPlace(x, y);
        return { x, y };
      }
      const pristine = [0, 1, 2, 3].map(genShape);

      // Reference N(0, I) sample: ghost cloud, portrait angles φᵢ and uniforms uᵢ = F_χ₂(|gᵢ|).
      const gx = new Float64Array(N), gy = new Float64Array(N);
      { const R = rng(5); for (let i = 0; i < N; i++) { gx[i] = R.n(); gy[i] = R.n(); } whitenInPlace(gx, gy); }
      const PHI = new Float64Array(N), UU = new Float64Array(N);
      for (let i = 0; i < N; i++) { PHI[i] = Math.atan2(gy[i], gx[i]); UU[i] = clamp(1 - Math.exp(-(gx[i] * gx[i] + gy[i] * gy[i]) / 2), 1e-6, 1 - 1e-6); }
      const RANDORD = new Float64Array(N); for (let i = 0; i < N; i++) RANDORD[i] = rr.u();

      // χ(d) portrait cache: r (χ_d radius) per point, coupled by the same uᵢ across d. The ten preset
      // dimensions (autoplay, the d = buttons, the slider's ends) get exact quantiles (Newton on the incomplete
      // gamma), computed ahead in idle time; the in-between d a slider sweep passes get the Wilson–Hilferty
      // closed form (one normInv and one pow per point; visually identical from d = 5 up), so a sweep never
      // stalls a frame. At most 16 dimensions are kept (the presets always).
      const D_EXACT = new Set(D_SEQ);
      const chiCache = new Map();
      function chiRadii(d) {
        let c = chiCache.get(d);
        if (c) { if (!D_EXACT.has(d)) { chiCache.delete(d); chiCache.set(d, c); } return c; }
        c = new Float64Array(N);
        if (D_EXACT.has(d)) for (let i = 0; i < N; i++) c[i] = chiQuant(UU[i], d);
        else {
          const k = 2 / (9 * d), sk = Math.sqrt(k);
          for (let i = 0; i < N; i++) c[i] = Math.sqrt(d * Math.pow(Math.max(1e-3, 1 - k + normInv(UU[i]) * sk), 3));
        }
        chiCache.set(d, c);
        if (chiCache.size > 16) for (const key of chiCache.keys()) if (!D_EXACT.has(key)) { chiCache.delete(key); break; }
        return c;
      }
      {
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 60));
        const todo = D_SEQ.slice();
        const next = () => { const d = todo.shift(); if (d == null) return; chiRadii(d); idle(next); };
        idle(next);
      }
      const chiInfo = d => { const m = chiMean(d); return { mode: Math.sqrt(d - 1), mean: m, sd: Math.sqrt(Math.max(0, d - m * m)), lc: chiLogC(d) }; };

      // Fig. 2 portrait radii (inverse CDF of each histogram; illustrative angles)
      const f2Dens = F2.map(f => { const a = new Float64Array(F2_BINS); f.v.forEach((v, j) => { if (f.k0 + j < F2_BINS) a[f.k0 + j] = v; }); return a; });
      const f2Radii = f2Dens.map(dens => {
        const cdf = new Float64Array(F2_BINS + 1);
        for (let k = 0; k < F2_BINS; k++) cdf[k + 1] = cdf[k] + dens[k] * F2_W;
        const tot = cdf[F2_BINS], out = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          const u = UU[i] * tot; let k = 0;
          while (k < F2_BINS - 1 && cdf[k + 1] < u) k++;
          const f = dens[k] > 0 ? (u - cdf[k]) / (dens[k] * F2_W) : 0.5;
          out[i] = (k + clamp(f, 0, 1)) * F2_W;
        }
        return out;
      });

      // Working copy of the current shape (the viewer can smudge it)
      let shape = 0, userPicked = false;
      const zx = new Float64Array(N), zy = new Float64Array(N);
      function loadShape(k) { shape = k; zx.set(pristine[k].x); zy.set(pristine[k].y); }
      loadShape(0);

      // Toy-experiment end state (paper Fig. 1b): rank block k of the X → shell k, angles from real neighbours.
      const bloom = (() => {
        const X = pristine[0], r = new Float64Array(N), idx = new Int32Array(N);
        for (let i = 0; i < N; i++) { r[i] = Math.hypot(X.x[i], X.y[i]); idx[i] = i; }
        idx.sort((a, b) => r[a] - r[b]);
        // Angles: the 12-sector histogram of the real Fig. 1b sample (brief §6; sector k = [30k°, 30k + 30°)),
        // matched to the start angles shell by shell so every point takes the shortest path.
        const SECT = [851, 1192, 801, 712, 831, 761, 816, 1173, 716, 641, 807, 700], SSUM = SECT.reduce((a, b) => a + b, 0);
        const R = rng(99), per = N / 100;
        const sR = new Float64Array(N), sT = new Float64Array(N), eR = new Float64Array(N), eT = new Float64Array(N), rank = new Float64Array(N);
        const norm = a => ((a % TAU) + TAU) % TAU;
        const adist = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, TAU - d); };
        for (let j = 0; j < N; j++) { const i = idx[j]; rank[i] = j / N; sR[i] = r[i]; sT[i] = Math.atan2(X.y[i], X.x[i]); eR[i] = SHELLS[Math.min(99, Math.floor(j / per))]; }
        for (let k = 0; k < 100; k++) {
          const mem = Array.from(idx.slice(k * per, (k + 1) * per)).sort((a, b) => norm(sT[a]) - norm(sT[b]));
          const tg = [];
          for (let q = 0; q < per; q++) { let u = R.u() * SSUM, s = 0; while (s < 11 && u > SECT[s]) { u -= SECT[s]; s++; } tg.push((s + R.u()) * Math.PI / 6); }
          tg.sort((a, b) => a - b);
          let best = 0, bestC = Infinity;
          for (let o = 0; o < per; o++) { let c = 0; for (let m = 0; m < per; m++) c += adist(sT[mem[m]], tg[(m + o) % per]); if (c < bestC) { bestC = c; best = o; } }
          mem.forEach((i, m) => { let dT = tg[(m + best) % per] - sT[i]; dT -= Math.round(dT / TAU) * TAU; eT[i] = sT[i] + dT; });
        }
        return { sR, sT, eR, eT, rank };
      })();

      // Point buffers (data units)
      const px = new Float64Array(N), py = new Float64Array(N);   // displayed
      const tx = new Float64Array(N), ty = new Float64Array(N);   // step target
      const sx = new Float64Array(N), sy = new Float64Array(N);   // transition snapshot
      const wx = new Float64Array(N), wy = new Float64Array(N);   // whitened (live)
      const rad = new Float64Array(N), srt = new Float64Array(N); // displayed radii, sorted
      const ridx = new Int32Array(N), rrank = new Float64Array(N);
      const appearAt = new Float64Array(N);                       // sprinkle order
      const splitR = new Float64Array(N), splitT = new Float64Array(N), splitA = new Float64Array(N);
      let trans = null;

      // Step machine
      let step = 0, stepT = 0, clockT = 0, paused = false, auto = true, hold = false;
      // A viewer's choice (shape, drag, slider, option) holds the timeline on that step. The counter says so,
      // Space resumes it, and it resumes by itself after HOLD_S seconds without input.
      let holdT = 0, cueShown = '';
      const HOLD_S = 14;
      const holdNow = () => { hold = true; holdT = clockT; };
      const settleOf = s => (api.reduced && s.settleRM) || s.settle;
      let uParam = null;     // viewer-set parameter for the current step (slider)
      let sprinkle = false, splitDone = false, splitCount = 0;
      let lastPhaseB = false, mapArrived = false, bloomArrived = false, whitenDone = false;
      let dPrev = 2, dCur = 2, dT0 = 0, visitedD = new Set([2]);
      let f2Prev = 0, f2Cur = 0, f2T0 = -9;
      let rmaxCur = 5.5, lastSV = -1;

      // Stats (from displayed points)
      const ST = { mx: 0, my: 0, a: 1, b: 0, c: 1, s1: 1, s2: 1, ang: 0, v: 0, cz: 0, kx: 3, ky: 3, w1: 0, loss: 0, tv: 0, beyond: 0, rbeyond: 0 };
      const HX = new Float64Array(28), HY = new Float64Array(28); // marginals over [−3.5, 3.5], 0.25 bins
      const RH = new Float64Array(128);                          // radius histogram (densities)
      const RH2 = new Float64Array(128);                         // radius histogram previous (S5 tween)
      const shown = { ghost: 0, hist: 0, marg: 1, shells: 0, readW: 0, v6: 0 };

      // Pointer
      const P = { x: -1, y: -1, over: null, down: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, moved: false, touch: false, inside: false, near: -1, bin: -1, col: -1, row: -1, stick: -9 };
      let probe = { i: 0, t: -9, step: -1 };
      let figHover = false;  // the fig. 3b card is open: labels under its caption line step aside
      let enterT = 0, readyAt = -1;

      /* ------------------------------------------------------------ layout */
      const L = { headH: 60, headMode: '', hlTop: null, hlRes: 0, hlVar: 1 };
      const RNEED = 126; // px the desktop readout block wants between the head and the histogram title
      const CTR_BOTTOM = 114; // desktop step counter (top-right: line, hairline, state from y = 72)
      // phones: the step row (‹ counter ›, 44 px targets) from y = 50; the headline starts under it at 94 px,
      // the phone headline top of the other scenes with a step row
      const KICK_Y = 50, KICK_H = 44;

      /* ---- context headline (api.headline): the point of each step, big and centred at the top. The art
         is laid out under the TALLEST of the six headlines at this viewport (measured on a hidden twin of
         the shell's headline in the shell's own layer), so nothing moves when the step changes. */
      // The last words of a line of copy joined by no-break spaces while the joined tail is short (< 12
      // characters, at most four words: "an X does not."), when they are plain words (the shell sets each word
      // and each formula as its own inline block: a formula can't be glued to a word). Hyphens inside words
      // become non-breaking (U+2011, which Newsreader has): "second-order" never breaks at its hyphen, also
      // when reduced motion sets the words as plain inline text.
      function glue(text) {
        const p = String(text).split(/(\$[^$]+\$)/g), k = p.length - 1;
        for (let i = 0; i <= k; i += 2) p[i] = p[i].replace(/(\w)-(?=\w)/g, '$1\u2011');
        for (let n = 0; n < 3; n++) {
          const m = /(\S)[ \t\n]+([^ \t\n]+)$/.exec(p[k]);   // (\s would also match the no-break space)
          if (!m || (n && m[2].length >= 12)) break;
          p[k] = p[k].slice(0, m.index + 1) + '\u00a0' + m[2];
        }
        return p.join('');
      }
      // headline variants: 0 = the title alone, 1 = title + sub (`s`), 2 = title + the one-line phone sub (`m`)
      const hlText = (i, v) => { const s = STEPS[i].hl; return [glue(s.t), v === 1 ? glue(s.s) : v === 2 ? glue(s.m) : null]; };
      // Autoplay holds a step at least as long as its headline takes to read: ≈ 2 s for the words to fade in
      // plus 3.8 words/s (≈ 230 wpm; a formula counts as one word). The animation timelines are unchanged,
      // only the settled state stays longer. Title-only headlines (phones, short windows) keep `dur`.
      const readMemo = new Map();
      function durOf(i) {
        const k = i * 3 + L.hlVar;
        if (!readMemo.has(k)) {
          const [t, s] = hlText(i, L.hlVar);
          const words = `${t} ${s || ''}`.replace(/\$[^$]+\$/g, 'M').split(/\s+/).filter(Boolean).length;
          readMemo.set(k, Math.max(STEPS[i].dur, 2 + words / 3.8));
        }
        return readMemo.get(k);
      }
      function showHeadline() {
        if (!api.headline) return;
        const [t, s] = hlText(step, L.hlVar);
        api.headline(t, s, { key: `rv|${step}|${L.hlVar}|${L.mobile ? 1 : 0}` });
      }
      // the step's caption (bottom left); phones tap where desktops click and hover
      const capOf = i => (L.mobile ? CAPS[i].replace(/\bClick\b/g, 'Tap').replace(/\bclick\b/g, 'tap').replace(/\bHover(\s+)a\b/g, 'Tap$1a') : CAPS[i]);
      let capShown = CAPS[0];
      function showCaption() { const c = capOf(step); if (c !== capShown) { capShown = c; api.caption(c); } }
      // the shell's typesetting of a headline, to the letter: $…$ → KaTeX, each word a span (inline-blocks
      // while they fade in; a no-break space stays inside its word)
      const hlHTMLMemo = new Map();
      function hlHTML(text) {
        let s = hlHTMLMemo.get(text);
        if (s == null) { s = hlTypeset(text); if (window.katex) hlHTMLMemo.set(text, s); }
        return s;
      }
      function hlTypeset(text) {
        const cls = api.reduced ? 'w' : 'w hl-in';
        return String(text).split(/(\$[^$]+\$)/g).map(seg => {
          if (seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$') {
            const k = window.Site && Site.texHTML ? Site.texHTML(seg.slice(1, -1)) : esc(seg);
            return api.reduced ? k : k.replace(/^<span class="katex"/, '<span class="katex hl-in"');
          }
          const d = document.createElement('span');
          d.textContent = seg;
          return d.innerHTML.split(/(\s+)/).map(w => (/^\s+$/.test(w) || !w) ? w : `<span class="${cls}">${w}</span>`).join('');
        }).join('');
      }
      // (the headline wraps by width only: the shell sizes its type and its column in vw. During a drag-resize
      // it is measured at most every 150 ms, as the heads are: the last bottom of that variant holds meanwhile,
      // then one re-layout; the live headline is a floor under it in layout())
      const hlMemo = new Map();
      let hlT = -1e9, hlTimer = 0, hlPass = -1;
      function hlReserve(v) {
        const key = `${L.w}|${v}|${L.hlTop}`;
        if (hlMemo.has(key)) { const m = hlMemo.get(key); L.hlRight = m[1]; return m[0]; }
        const now = performance.now(), prev = hlMemo.get('last|' + v);
        if (prev && hlPass !== layoutPass && now - hlT < 150) {
          clearTimeout(hlTimer);
          hlTimer = setTimeout(() => { if (api.isActive()) layout(); }, 160);
          L.hlRight = prev[1]; return prev[0];
        }
        const live = api.headline && document.querySelector(`.headline-group[data-scene="${api.id}"]`);
        if (!live || !live.parentNode) { L.hlRight = 0; return 0; }
        hlT = now; hlPass = layoutPass;
        const pr = live.cloneNode(false);
        pr.removeAttribute('data-scene'); pr.removeAttribute('data-key');
        pr.setAttribute('aria-hidden', 'true');
        pr.classList.add('is-active', 'has-text');
        pr.style.visibility = 'hidden';
        live.parentNode.append(pr);
        let bottom = 0;
        STEPS.forEach((s, i) => {
          const [t, sb] = hlText(i, v);
          pr.innerHTML = `<p class="hl-title">${hlHTML(t)}</p>` + (sb ? `<p class="hl-sub">${hlHTML(sb)}</p>` : '');
          bottom = Math.max(bottom, pr.getBoundingClientRect().bottom);
        });
        L.hlRight = pr.getBoundingClientRect().right;   // the headline's column (the counter stays clear of it)
        pr.remove();
        bottom = Math.ceil(bottom);
        if (hlMemo.size > 60) hlMemo.clear();
        hlMemo.set(key, [bottom, L.hlRight]); hlMemo.set('last|' + v, [bottom, L.hlRight]);
        return bottom;
      }

      // Head modes (the head is the step's key formula; on phones the step row). Desktop: 'full'; cramped
      // columns set the formula smaller ('compact'), then leave it out ('noeq'). Phones: 'mobile', or 'slim'
      // (short phones: the honesty tag and the readout row give their lines to the cloud).
      function headClasses(node, mode) {
        const desk = mode !== 'mobile' && mode !== 'slim';
        node.classList.toggle('is-desk', desk);
        node.classList.toggle('is-compact', mode === 'compact');
        node.classList.toggle('is-noeq', !desk || mode === 'noeq');
        node.classList.toggle('is-center', desk && !!L.portrait);
      }
      // Tallest head (the key formula; the step row on phones) over all steps at the current column width
      // and mode, so the readouts under it never jump between steps. 0 when the head is empty (desktop 'noeq').
      function measureHeads(width, mode) {
        const probe = head.cloneNode(true);
        headClasses(probe, mode);
        probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;width:${width}px`;
        const pE = probe.querySelector('.rv-eq'), pM = probe.querySelector('.rv-eqm'), pG = probe.querySelector('.rv-eqtag');
        const withEq = !probe.classList.contains('is-noeq');
        pG.classList.remove('is-wrap');
        el.append(probe);
        let mx = 0, short = false;
        const keep = L.eqShort;
        if (withEq) {
          // does the live Σ̂ formula (definition = value) fit on one line at this width?
          L.eqShort = false;
          api.tex(pM, eqOf(STEPS[0]), { display: true }); pG.style.display = 'none';
          short = L.eqShort = pE.scrollWidth > pE.clientWidth + 1;
        }
        // (hs: each step's own head height, for the readout block under it)
        const hs = STEPS.map(() => 0);
        for (let i = 0; i < STEPS.length; i++) {
          const s = STEPS[i];
          if (withEq) { api.tex(pM, eqOf(s), { display: true }); pG.innerHTML = rich(s.tag); pG.style.display = s.tag ? '' : 'none'; }
          hs[i] = probe.offsetHeight;
          mx = Math.max(mx, hs[i]);
          if (!withEq) { hs.fill(hs[0]); break; }
        }
        L.eqShort = keep;
        probe.remove();
        return { h: mx, short, hs };
      }
      // Typesetting six heads is the costly part of a layout: cache it per column width and mode, and
      // during a drag-resize measure at most every 150 ms (the last height of that mode holds meanwhile,
      // then one re-layout).
      const headMemo = new Map();
      let headT = -1e9, headTimer = 0, headPass = -1, layoutPass = 0;
      function headHeight(width, mode) {
        const key = `${Math.round(width)}|${mode}`;
        if (headMemo.has(key)) return headMemo.get(key);
        const now = performance.now(), prev = headMemo.get('last|' + mode);
        // (several modes measured in one layout pass are one measurement, not a drag)
        if (prev && headPass !== layoutPass && now - headT < 150) {
          clearTimeout(headTimer);
          headTimer = setTimeout(() => { if (api.isActive()) layout(); }, 160);
          return prev;
        }
        if (headMemo.size > 80) headMemo.clear();
        const m = measureHeads(width, mode);
        headMemo.set(key, m); headMemo.set('last|' + mode, m);
        headT = now; headPass = layoutPass;
        return m;
      }
      // fonts arrived: measure the heads and the headlines again
      const relayout = () => { headMemo.clear(); hlMemo.clear(); ctrWMemo = 0; layout(); };

      // Height the desktop right-column block of step s wants under its formula (see drawReadouts): readout
      // rows (18 px; the Σ̂ matrix row 46), Fig. 1c at a 96 px plot, or Tables 1–3 with every row at 19 px.
      const SECTION_GAP = 44;   // lowest block content → histogram eyebrow (line middle)
      function blockNeed(s, ccg) {
        switch (s) {
          case 0: return 3 * 18;
          case 1: return 46 + 5 * 18;
          case 2: return 4 * 18;
          case 3: return 46 + 4 * 18;
          case 4: return 2 + 24 + 96 + 22;
          default: return ccdH(ccg, 4, 19, true);
        }
      }
      // Desktop, landscape: controls | cloud | right column (key formula, readouts, histogram panel), all
      // under the context headline (top0 = its tallest bottom + 20 px).
      function layoutSide(w, hh, top0) {
        const CR = L.CR;
        // the cloud's stack runs from its top labels (cy − 4.45u − 21) to the note under its frame
        // (cy + 3.5u + 54): it fits between the headline and the bottom chrome (and the centred hint)
        const bot = hh - 84, uV = (bot - top0 - 75) / 7.95;
        // narrow windows: a smaller cloud keeps the right column ≥ 280 px wide
        const uF = Math.min(0.069 * hh, 0.043 * w, (w - 341 - CR) / 8.95, (0.57 * w - 320) / 4.5, uV);
        const u = Math.max(26, uF);
        L.u = u; L.uF = uF; L.uV = uV; L.uMin = 26;
        L.cx = Math.max(0.43 * w, CR + 21 + 4.45 * u);   // left marginal clear of the control column
        // in the band under the headline, nearer its top: the art stays connected to the headline on tall
        // screens (≈ 40–50 px apart at 1440–1680) instead of floating mid-band
        const cyMin = top0 + 4.45 * u + 21, cyMax = bot - 3.5 * u - 54;
        L.cy = Math.round(cyMax > cyMin ? cyMin + 0.25 * (cyMax - cyMin) : cyMin);
        L.ox = Math.max(0.625 * w, L.cx + 4.5 * u);
        L.pw = Math.min(5.5 * u, w - 84 - L.ox);
        L.headX = L.ox; L.headW = Math.min(390, w - L.ox - 40);
        const oy0 = L.cy + 3.5 * u;                          // R-panel baseline aligned with the cloud frame
        const oyMax = Math.max(oy0, hh - 160);               // lowest: its note clears the links
        const dp0 = hh * clamp(0.24 + 0.06 * (hh - 720) / 180, 0.24, 0.3);
        // the head column starts under the headline, and under the step counter when the two share x
        const topMin = Math.max(top0, L.headX + L.headW > w - 40 - ctrWidth() - 16 ? CTR_BOTTOM + 8 : 76);
        // formula + 20 px + the histogram title must fit above the plot: first by lowering the panel a
        // little and shortening it (≤ 20 %), then with a smaller formula, then without the formula
        let pick = null;
        for (const [mode, move] of [['full', 0], ['full', 1], ['compact', 1], ['noeq', 1]]) {
          const m = headHeight(L.headW, mode);
          const room = (oy, dp) => oy - 0.66 * dp - 53 - topMin - (m.h ? m.h + 20 : 0) + 20;
          let oy = oy0, dp = dp0;
          if (move && room(oy, dp) < 0) oy = Math.min(oyMax, oy - room(oy, dp));
          if (room(oy, dp) < 0) dp = Math.max(0.8 * dp0, dp + room(oy, dp) / 0.66);
          pick = { mode, m, oy, dp };
          if (room(oy, dp) >= 0) break;
        }
        applyHeadMode(pick);
        L.oy = pick.oy; L.dp = pick.dp;
        L.ptY = L.oy - 0.66 * L.dp - 22;                     // histogram title (line middle)
        // head top: aligned with the cloud's marginal when the column has room, higher when it doesn't
        const cloudTop = L.cy - 3.5 * u - 0.95 * u - 17;
        L.headY = Math.round(clamp(L.ptY - 24 - RNEED - L.headH, topMin, Math.max(topMin, cloudTop)));
        L.infoX = L.ox; L.infoW = L.headW;
        // Tall windows: the histogram (the step's result) grows upward from its baseline on the cloud frame's
        // bottom, up to the section gap under the tallest right-column block of any step (formula + readouts,
        // Fig. 1c, Tables 1–3), and to at most 0.65 × the frame's height. One position per viewport: nothing
        // moves between steps. Short windows keep the size above (never smaller).
        // (grown, the block ends a section gap above the histogram eyebrow: a chart that fills its block
        // never crowds the eyebrow)
        let grown = false;
        {
          const hs = pick.m.hs || [], ccg = ccdGeom(L.infoW);
          let need = 0;
          for (let s = 0; s < STEPS.length; s++) need = Math.max(need, (hs[s] ? hs[s] + 20 : 0) + blockNeed(s, ccg));
          const dpWant = Math.min(0.65 * 7 * u, L.oy - 22 - (L.headY + need + SECTION_GAP)) / 0.66;
          if (dpWant > L.dp) { L.dp = dpWant; L.ptY = L.oy - 0.66 * L.dp - 22; grown = true; }
        }
        L.infoB = L.ptY - (grown ? SECTION_GAP : 22);
        L.pt = 1.5; L.row = 18;
        L.tagMax = L.ox - 16;
        const optsLeft = L.cy + 3.5 * u + 12 < 0.7 * hh + 4 ? CR + 8 : 16;
        L.optsMax = 2 * Math.max(0, Math.min(L.ox - 16 - L.cx, L.cx - optsLeft));
      }
      // Desktop, portrait (iPad): under the headline the key formula, then the cloud, then the histogram.
      function layoutPortrait(w, hh, top0) {
        const CR = L.CR;
        // the key formula continues the centred headline stack: its column is centred on the page axis and
        // the formula centred in it (.is-center), whatever its width at this step
        L.headW = Math.min(560, w - 80); L.headX = Math.round((w - L.headW) / 2);
        const topMin = Math.max(top0, L.headX + L.headW > w - 40 - ctrWidth() - 16 ? CTR_BOTTOM + 8 : 76);
        const dp = clamp(0.14 * hh, 110, 150);
        const uW = (w - 67 - CR - 21) / 7.95;  // left marginal clear of the controls, z₁ inside the gutter
        // from the cloud's top labels to the note under the histogram: 7.95 u + 174 + 0.66 dp; that note
        // stays above the caption, the links and the (wrapped, several-line) interaction hint (hh − 140)
        let pick = null;
        for (const mode of ['full', 'compact', 'noeq']) {
          const m = headHeight(L.headW, mode);
          const avail = hh - 140 - (topMin + (m.h ? m.h + 18 : 0)) - 174 - 0.66 * dp;
          pick = { mode, m, avail, u: Math.min(uW, 58, avail / 7.95) };
          if (pick.u >= 40) break;
        }
        applyHeadMode(pick);
        const u = Math.max(26, pick.u);
        L.u = u; L.uF = pick.u; L.uV = pick.avail / 7.95; L.uMin = 26; L.dp = dp;
        L.headY = topMin;
        // spare height: live readouts under the head (≥ 2 rows), the rest centres the stack
        let slack = Math.max(0, pick.avail - 7.95 * u);
        const R = slack >= 50 ? Math.min(slack - 14, 118) : 0;
        if (R) slack -= R + 14;
        const hd = L.headH ? L.headH + 20 : 0;
        // readouts (a left-aligned table) keep clear of the control column
        L.infoX = Math.max(L.headX, CR + 10); L.infoW = Math.min(560, w - 40 - L.infoX);
        L.infoB = R ? topMin + hd + R : -1;   // no block: no readout rows at all
        L.pt = 1.5; L.row = 18;
        const labelTop = topMin + (L.headH ? L.headH + 18 : 0) + (R ? R + 14 : 0) + slack / 2;
        L.cy = labelTop + 4.45 * u + 21;
        // right end of its range: the frame lines up with the head's right edge, and the left marginal's
        // kurtosis label under it stays clear of the controls
        L.cx = Math.max(CR + 21 + 4.45 * u, w - 67 - 3.5 * u);
        L.ox = L.cx - 3.5 * u;
        L.pw = Math.min(7 * u - 50, w - 84 - L.ox);
        L.ptY = L.cy + 3.5 * u + 89;
        L.oy = L.ptY + 22 + 0.66 * dp;
        L.tagMax = w - 40;
        const optsLeft = L.cy + 3.5 * u + 12 < 0.7 * hh + 4 ? CR + 8 : 16;
        L.optsMax = 2 * Math.max(0, Math.min(w - 40 - L.cx, L.cx - optsLeft));
      }
      // Phones: the step row at the top, the headline under it (top0 = its tallest bottom + 14 px), then one
      // column laid out bottom-up from the slider the shell places above the caption.
      function layoutMobile(w, hh, top0) {
        let sliderTop = hh - 104 - 62;
        try { const r = slider.el.getBoundingClientRect(); if (r.height > 20 && r.top > hh * 0.5) sliderTop = r.top; } catch (_) { /* hidden */ }
        L.headX = 4; L.headY = KICK_Y; L.headW = w - 8;   // the step row spans the screen: ‹ › at the gutters
        L.dp = clamp(0.1 * hh, 70, 96);
        L.row = 17; L.pt = 1.25;
        // box bottom: opts row + honesty tag + one live readout row above the panel title; on short
        // phones ('slim') the tag and the readout row give their lines to the cloud
        const ptYOf = extra => sliderTop - 34 - extra - 0.66 * L.dp - 16;
        const boxB = (slim, extra) => (slim ? ptYOf(extra) - 44 : ptYOf(extra) - 17 - L.row - 60);
        const slimOf = extra => (boxB(false, extra) - top0) / 7 < 30;
        // tall phones: the panel's r ticks stay clear of a (two-line) hint, which the shell puts just above
        // the controls. Short phones keep that room for the cloud (this scene's own hint is skipped there),
        // except while the shell's sound invite rests there and the cloud can spare it (update() lays out
        // again once the first gesture has cleared the invite).
        const a = AU();
        let extra = hh >= 740 ? 32 : 0;
        L.invite = false;
        if (!extra && !(a && a.ready) && slimOf(32) === slimOf(0) && (boxB(slimOf(32), 32) - top0) / 7 >= (slimOf(32) ? 21 : 24)) { extra = 32; L.invite = true; }
        L.oy = sliderTop - 34 - extra;
        L.ox = 16; L.pw = w - 34;
        L.ptY = ptYOf(extra);
        L.infoX = 16; L.infoW = w - 32;
        let pick = { mode: 'mobile', m: headHeight(L.headW, 'mobile') };
        if (slimOf(extra)) pick = { mode: 'slim', m: headHeight(L.headW, 'slim') };
        applyHeadMode(pick);
        L.slim = pick.mode === 'slim';
        L.infoB = L.ptY - 17;
        L.infoY = L.slim ? L.infoB : L.infoB - L.row;
        const boxBottom = boxB(L.slim, extra), top = top0;
        L.uV = (boxBottom - top) / 7; L.uF = Math.min((w - 40) / 7.2, L.uV); L.uMin = L.slim ? 19 : 22;
        L.u = Math.max(L.uMin, L.uF);
        L.cx = w / 2;
        L.cy = boxBottom - 3.5 * L.u;
        L.tagMax = w - 8;
        L.optsMax = w - 24;
      }
      function applyHeadMode(pick) {
        headClasses(head, pick.mode);
        L.headMode = pick.mode; L.headH = pick.m.h; L.hs = pick.m.hs;
        L.eqShort = pick.m.short;
      }
      // desktop readouts flow right under the current step's formula (none when the column has no formula)
      function syncInfoY() {
        if (L.mobile) return;
        L.headCur = head.offsetHeight;
        L.infoY = L.headY + (L.headCur ? L.headCur + 20 : 0);
      }
      function layout() {
        const w = cv.w, hh = cv.h;
        layoutPass++;
        L.w = w; L.h = hh; L.mobile = w < 800;
        L.portrait = !L.mobile && hh > 1.15 * w;
        L.CR = w < 1100 ? 250 : 280;   // the shell's control column (x < CR between 30 % and 70 % height)
        if (L.wasMobile !== L.mobile) placeCounter();
        // phones: the step row (‹ counter ›) holds the top and the headline sits right under it
        const hlTop = L.mobile ? KICK_Y + KICK_H : null;
        if (hlTop !== L.hlTop && api.headlineTop) { L.hlTop = hlTop; hlMemo.clear(); api.headlineTop(hlTop); }
        // The live headline is a floor under the twin's measure: if it ever sets taller than the twin (a shell
        // markup or CSS change, late metrics), the art still starts under it. (Only for the variant on screen.)
        const shownVar = L.hlShown ? L.hlVar : null;
        const run = v => {
          L.slim = false;
          const live = api.isActive() && v === shownVar && api.headlineBottom ? api.headlineBottom() : 0;
          const b = Math.max(hlReserve(v), live);
          const top0 = L.mobile ? (b ? b + 14 : KICK_Y + KICK_H + 14) : Math.max(76, b ? b + 20 : 0);
          if (L.mobile) layoutMobile(w, hh, top0); else if (L.portrait) layoutPortrait(w, hh, top0); else layoutSide(w, hh, top0);
          return { u: L.u, uF: L.uF, uV: L.uV, uMin: L.uMin, b, slim: L.slim };
        };
        // The headline's sub (desktop: the parts on screen; phones: one line) stays unless it would cost the art
        // more than 12 % of its size (desktop: while the cloud stays at least as large as at 1280 × 720 it may
        // cost more), or a phone its readout row and source note, or it leaves the cloud less height than its
        // smallest size. Sizes are compared before the floor clamps them (two clamped sizes look equal).
        // Short windows and short phones: the one-sentence point alone is the headline.
        const vSub = L.mobile ? 2 : 1;
        const withSub = run(vSub), noSub = run(0);
        const subOK = (withSub.uF >= 0.88 * noSub.uF || (!L.mobile && withSub.u >= 43)) && withSub.slim === noSub.slim && withSub.uV >= withSub.uMin;
        L.hlVar = subOK ? vSub : 0;
        L.hlRes = (subOK ? run(vSub) : noSub).b;
        showHeadline();
        L.hlShown = true;
        showCaption();
        const ctrName = L.mobile || !L.hlRight || w - 40 - ctrWidth() >= L.hlRight + 10;
        if (ctrName !== L.ctrName) { L.ctrName = ctrName; kNum.textContent = counterText(); }
        // right edge of the shell's control column (stepper, slider), for labels that sit beside it
        // (the stepper's items are full-width buttons: measure their words)
        L.ctrlR = L.CR - 8;
        try {
          let r = slider.el.getBoundingClientRect().right;
          const rg = document.createRange();
          stepper.el.querySelectorAll('.stepper__item').forEach(b => { rg.selectNodeContents(b); r = Math.max(r, rg.getBoundingClientRect().right); });
          if (r > 0) L.ctrlR = r;
        } catch (_) { /* hidden */ }
        L.box = 3.5 * L.u;
        L.margH = 0.95 * L.u;
        L.optsY = L.cy + L.box + (L.mobile ? 3 : 12);
        L.tagY = L.cy + L.box + (L.mobile ? 39 : 46);
        head.style.left = L.headX + 'px'; head.style.top = L.headY + 'px'; head.style.width = L.headW + 'px';
        tagWrap();
        syncInfoY();
        // the scene's links (bottom-right, desktop): notes in the panel stop short of them
        L.linkBox = null;
        if (!L.mobile && linkEls && linkEls.length) {
          let l = Infinity, t = Infinity, b = -Infinity;
          linkEls.forEach(a => { const r = a.getBoundingClientRect(); if (r.width) { l = Math.min(l, r.left); t = Math.min(t, r.top); b = Math.max(b, r.bottom); } });
          if (l < Infinity) L.linkBox = { left: l, top: t, bottom: b };
        }
        // Real features on a landscape desktop whose right column cannot hold Tables 1–3 under the formula
        // (≈ 900 px windows; decided with that step's own formula height, so the decision never flips while
        // the formula swaps): the chart takes the cloud's slot, top-aligned with the formula (its eyebrow on
        // the formula's first line), and the options row moves up under it, onto the histogram eyebrow's line.
        L.c6 = null; L.cc6side = false;
        if (!L.mobile && !L.portrait) {
          const g = ccdGeom(L.infoW), hs5 = (L.hs && L.hs[5]) || 0;
          L.cc6side = L.infoB - (L.headY + (hs5 ? hs5 + 20 : 0)) + 8 < ccdNeed(g);
          if (L.cc6side) {
            const top = L.headY + 7, x6 = chartC6X(), need = ccdNeed(ccdGeom(x6[1] - x6[0]));
            let oy6 = Math.round(L.ptY - 13);                 // the options row's words on the eyebrow's line
            if (oy6 - 10 - top < need) oy6 = Math.round(top + need + 10);
            oy6 = Math.min(oy6, Math.round(L.optsY));
            L.c6 = { top, bottom: oy6 - 10, optsY: oy6 };
          }
        }
        opts.style.left = L.cx + 'px'; L.optsTop = null; placeOpts();
        if (L.wasMobile !== L.mobile) { L.wasMobile = L.mobile; if (headStep >= 0) fillHead(STEPS[headStep]); }
        // the options row is rebuilt at full length, then trims itself to the room it has
        optMode = ''; buildOpts();
        L.optsW = opts.offsetWidth || 0;
        L.u0 = L.u; L.cy0 = L.cy;
        portraitView(0);
        if (api.isActive()) rewordHint();
      }
      // the options row: under the cloud frame, or under Chart C when that takes the cloud's slot (above)
      function placeOpts() {
        const y = Math.round(step === 5 && L.c6 ? L.c6.optsY : L.optsY);
        if (y !== L.optsTop) { L.optsTop = y; opts.style.top = y + 'px'; }
      }
      // Chart C's x range when it takes the cloud's slot on a landscape desktop: a small frame (narrow windows)
      // lends it the left marginal's strip (hidden in this step), never the control column; its right end stays
      // clear of the histogram's density numbers
      function chartC6X() {
        let cx0 = L.cx - L.box + 4;
        if (2 * L.box - 4 < 300) cx0 = Math.min(cx0, Math.max(L.CR + 12, L.cx - L.box - L.margH - 9));
        return [cx0, Math.min(L.cx + L.box, L.ox - 44)];
      }
      // Portrait (iPad), Real features: Chart C takes the slot under the head, and the cloud frame shrinks to
      // make that room (its bottom edge stays, so the options row and the note under it never move). Other
      // steps and layouts keep the frame of layout(). Blended over ~0.6 s with the step change.
      function portraitView(dt) {
        L.cc6 = false;
        let u6 = L.u0;
        if (L.portrait && !L.mobile) {
          const hC = ccdH(ccdGeom(L.infoW), 4, 19, true), top = L.headY + (L.headCur ? L.headCur + 20 : 0);
          const box6 = (L.cy0 + 3.5 * L.u0 - (top + hC + 18)) / 2;
          if (box6 >= 0.7 * 3.5 * L.u0) { L.cc6 = true; L.cc6H = hC; u6 = Math.min(L.u0, box6 / 3.5); }
        }
        const tgt = L.cc6 && step === 5 ? 1 : 0;
        shown.v6 += (tgt - shown.v6) * Math.min(1, (api.reduced ? 1 : 0) + dt * 5);
        if (Math.abs(tgt - shown.v6) < 0.003) shown.v6 = tgt;
        L.u = lerp(L.u0, u6, easeSine(shown.v6));
        L.box = 3.5 * L.u; L.margH = 0.95 * L.u;
        L.cy = L.cy0 + 3.5 * (L.u0 - L.u);
      }
      const X = dx => L.cx + dx * L.u;
      const Y = dy => L.cy - dy * L.u;

      /* ------------------------------------------------------------ sound */
      const AU = () => api.audio || (window.Site && window.Site.audio) || null;
      let soundOn = false, clockOff = null, hinted = false, hintAt = -1, hintWide = '';
      // the interaction hint: short on phones and ≤ 1100 px windows (the shell puts hints under the wordmark
      // there, right above the headline). A resize across 1100 px while it shows re-words it for the time left.
      const hintWording = () => (L.mobile ? 'Tap the cloud: new shape · drag to reshape'
        : L.w <= 1100 ? 'Click the cloud: new shape · drag to reshape'
        : 'Click the cloud to change its shape · drag to reshape · arrow keys step · space pauses');
      function rewordHint() {
        if (hintAt < 0 || clockT - hintAt > 4.4) return;
        const s = hintWording();
        if (s !== hintWide) { hintWide = s; api.hint(s, Math.round((4.6 - (clockT - hintAt)) * 1000)); }
      }
      const lastT = {};
      function limit(key, ms) {
        const now = performance.now();
        if (lastT[key] && now - lastT[key] < ms) return false;
        lastT[key] = now; return true;
      }
      function au() { const a = AU(); return a && a.ready && soundOn ? a : null; }
      function withBus(o) { const b = api.bus(); return Object.assign({ dest: b || undefined }, o || {}); }
      // Microsound vocabulary with graceful fallbacks while the engine is being re-voiced.
      const S = {
        call(name, midi, o) {
          const a = au(); if (!a || !api.bus()) return false;
          const p = a.play || {};
          try {
            if (typeof p[name] === 'function') { midi == null ? p[name](withBus(o)) : p[name](midi, withBus(o)); return true; }
          } catch (e) { /* audio must never break visuals */ }
          return false;
        },
        click(o) { if (!S.call('click', null, o)) S.call('hat', null, { gain: (o && o.gain || 0.4) * 0.5, decay: 0.012, pan: o && o.pan, when: o && o.when }); },
        tick(m, o) { if (!S.call('tick', m, o)) S.call('blip', m, Object.assign({}, o, { dur: 0.03, gain: (o && o.gain || 0.4) * 0.7 })); },
        bit(m, o) { if (!S.call('bit', m, o)) S.call('blip', m, Object.assign({}, o, { dur: 0.045, gain: (o && o.gain || 0.4) * 0.7 })); },
        grain(m, o) { if (!S.call('grain', m, o)) S.call('blip', m, Object.assign({}, o, { dur: (o && o.dur) || 0.08, gain: (o && o.gain || 0.4) * 0.8 })); },
        sub(m, o) { S.call('sub', m, o); },
        kick(o) { S.call('kick', null, o); },
        hat(o) { S.call('hat', null, o); },
        noise(o) { S.call('noise', null, o); },
        data(o) {
          if (S.call('data', null, o)) return;
          const a = au(); if (!a) return;
          const n = Math.min(10, Math.round((o.density || 40) * (o.dur || 0.25))), t0 = (o.when || a.now());
          for (let i = 0; i < n; i++) S.bit((o.pitch || [86])[i % (o.pitch || [86]).length], { when: t0 + Math.random() * (o.dur || 0.25), gain: (o.gain || 0.4) * 0.7, pan: (Math.random() * 2 - 1) * (o.spread || 0.6) });
        },
        glitch(o) {
          if (S.call('glitch', null, o)) return;
          const a = au(); if (!a) return;
          const n = (o && o.repeats) || 5, len = (o && o.len) || 0.03, t0 = (o && o.when) || a.now();
          for (let i = 0; i < n; i++) S.click({ when: t0 + i * len, gain: ((o && o.gain) || 0.4) * (1 - i / n) });
        },
        ratchet(o) {
          if (S.call('ratchet', null, o)) return;
          const a = au(); if (!a) return;
          const n = (o && o.count) || 4, span = (o && o.span) || 0.12, t0 = (o && o.when) || a.now();
          for (let i = 0; i < n; i++) S.hat({ when: t0 + i * span / n, gain: ((o && o.gain) || 0.3) * (0.6 + 0.4 * i / n) });
        },
      };
      const nextT = (mult) => { const a = au(); if (!a) return 0; try { return a.clock.nextStep(mult || 1).time; } catch (e) { return a.now(); } };
      const nextS = (mult) => { const a = au(); if (!a) return null; try { return a.clock.nextStep(mult || 1); } catch (e) { return { step: -1, time: a.now() }; } };
      const deg = (i, o) => { const a = AU(); return a && a.degree ? a.degree(i, o) : 62 + [0, 2, 4, 7, 9][((i % 5) + 5) % 5] + 12 * (Math.floor(i / 5) + (o || 0)); };
      // Round-2 sound rule: tonal fundamentals stay in D3–A4 (≈147–440 Hz); clicks are short and quiet.
      const CHORD = [50, 54, 57, 62, 66, 69]; // D3 F♯3 A3 D4 F♯4 A4 — the consonant target
      const bandPitch = r => CHORD[clamp(Math.floor(r / 0.55), 0, CHORD.length - 1)];
      const rawPitch = r => 50 + clamp(r, 0, 3.6) * 5.2; // continuous, un-quantized: farther = higher (≤ A4)
      const clickHz = () => 1100 + Math.random() * 1500;  // dull, low clicks instead of 2–9 kHz sparkle
      const ratioPitch = ratio => 62 + clamp((ratio - 1) * 20, -10, 7);

      // Sound state (updated per frame, read by the clock callback)
      const SND = { match: 0, ang: 0, gauss: 0, beat: 0, shellSpread: 1, bloom: 0, dStep: -1, hush: -9 };
      const hush = () => { SND.hush = clockT + 1.2; }; // a chord or burst is sounding: ambient layers wait
      // Event sounds that come from the animation (chart points, table rows) wait in a short queue and
      // leave it one per even 16th, so a burst of new marks becomes a clean run of notes, never a stack.
      const sq = [];
      function enqueue(fn) { if (!au()) return; sq.push(fn); while (sq.length > 6) sq.shift(); }
      // split landings (step 2): counted per frame, sounded at most once per odd 16th
      const land = { n: 0, r: 1, pan: 0 };
      function pickPoint() {
        const i = (Math.random() * N) | 0;
        const x = px[i], y = py[i], r = Math.hypot(x, y) || 1e-6;
        return { i, r, pan: clamp(x / r, -1, 1) * 0.8 };
      }
      let bed = null, bedT = 0;
      function bedParams() {
        const m = SND.match, pool = [];
        for (let j = 0; j < 6; j++) {
          const p = pickPoint();
          let midi;
          if (step === 2) { const ci = chiInfo(dCur); midi = ratioPitch(chiRadii(dCur)[p.i] / ci.mean); }
          else if (step === 5) midi = ratioPitch(f2Radii[f2Cur][p.i] / 22.62);
          else midi = m > 0.5 ? bandPitch(p.r) : rawPitch(p.r);
          pool.push(midi);
        }
        return {
          pitch: pool,
          density: step === 2 ? 3.5 + 4.5 * clamp(Math.log2(dCur) / 9, 0, 1) : 3 + 4 * m,
          detune: step === 2 ? 4 : 60 * (1 - m),
          jitter: 0.85 - 0.55 * m,
          spread: 0.2 + 0.7 * SND.ang,
          bright: 0.06 + 0.1 * m,
          octave: 0,
          gain: 0.5,
        };
      }
      function onClock(s, time) {
        if (!soundOn || !api.isActive()) return;
        const a = au(); if (!a || !api.bus()) return;
        const sd = a.clock.stepDur, i16 = s % 16, m = SND.match, g = SND.beat;
        // While meaningful marks are sounding (chart points, table rows, the bloom, a new d), the ambient
        // layers (cloud grains, dust clicks, off-beat hats) step back: ≤ ~12 events/s in every step.
        const busy = sq.length > 0 || SND.bloom > 0 || clockT < SND.hush || (step === 2 && clockT - dT0 < 0.7);
        // 1 · the cloud speaking: one grain = one sampled point (radius → pitch, direction → pan)
        if (busy) { /* marks carry the sound */ }
        else if (step === 2 || step === 5) {
          // (never on the 16th a new d already sounded: the chi-shell step stays under ~12 events/s)
          if (i16 % 2 === 0 && s !== SND.dStep && Math.random() < 0.45) {
            const p = pickPoint();
            let ratio = 1;
            if (step === 2) { const ci = chiInfo(dCur); ratio = chiRadii(dCur)[p.i] / ci.mean; }
            else { ratio = f2Radii[f2Cur][p.i] / 22.62; }
            S.grain(ratioPitch(ratio), { when: time + (1 - g) * Math.random() * sd * 0.4, dur: 0.05 + 0.04 * Math.random(), gain: 0.4, pan: p.pan, bright: 0.2 });
          }
        } else if (m > 0.55) {
          if (i16 % 2 === 0 && Math.random() < 0.5) {
            const p = pickPoint();
            S.grain(bandPitch(p.r), { when: time, dur: 0.05 + 0.04 * Math.random(), gain: 0.38, pan: p.pan, bright: 0.18 });
          }
        } else if (Math.random() < 0.24) {
          const p = pickPoint();
          S.grain(rawPitch(p.r) + (Math.random() - 0.5) * 0.7, { when: time + Math.random() * sd * 0.45, dur: 0.03 + 0.04 * Math.random(), gain: 0.34, pan: p.pan, bright: 0.12 });
        }
        // 2 · digital dust: loose clicks that lock to the grid as the cloud becomes Gaussian
        if (busy) { /* no dust under the marks */ }
        else if (g < 0.5) {
          if (Math.random() < 0.2 * (1 - g)) S.click({ freq: clickHz(), when: time + Math.random() * sd * 0.6, gain: 0.14 + 0.12 * Math.random(), pan: Math.random() * 1.6 - 0.8 });
        } else if (i16 % 4 === 3) S.click({ freq: clickHz(), when: time, gain: 0.12, pan: (i16 & 4 ? 0.35 : -0.35) });
        // 3 · the steady, clean beat — earned by Gaussianity
        if (g > 0.04) {
          if (i16 % 4 === 0) S.kick({ when: time, gain: 0.55 * g });
          if (i16 % 4 === 2) S.hat({ when: time, gain: 0.24 * g, pan: 0.18 });
          if (!busy && g > 0.7 && (i16 === 7 || i16 === 13)) S.hat({ when: time, gain: 0.09 * g, pan: -0.25 });
          if (i16 === 0 && (s >> 4) % 2 === 0) S.sub(38, { when: time, dur: 0.5, gain: 0.5 * g });
          if (g > 0.75 && s % 64 === 60) S.ratchet({ when: time, count: 4, span: sd, gain: 0.16 * g });
        }
        // 4 · marks drawn by the animation (chart points, table rows): one per even 16th
        if (i16 % 2 === 0 && sq.length) { const f = sq.shift(); try { f(time, sd); } catch (e) { /* never break */ } }
        // 5 · samples landing in the histogram (whitening step) and the toy bloom: at most one per odd 16th
        if (i16 % 2 === 1) {
          if (step === 1 && land.n > 0) { S.tick(bandPitch(land.r) + 12, { when: time, gain: 0.16, pan: land.pan }); land.n = 0; }
          else if (step === 4 && SND.bloom > 0 && !sq.length && i16 % 4 === 1 && Math.random() < 0.9 * SND.bloom) {
            const p = pickPoint();
            S.bit(rawPitch(p.r), { when: time, gain: 0.13, pan: p.pan });
          }
        }
      }

      /* ------------------------------------------------------------ controls */
      const stepper = api.stepper({ items: STEPS.map(s => s.label), onSelect: i => goStep(i, true) });
      const slider = api.slider({ min: 0, max: 1, step: 0, value: 0, label: sliderLabel, left: 'raw', right: 'whitened', onInput: v => onSlider(v) });
      const sliderEnds = slider.el.querySelector('.slider__ends');
      const sliderLab = slider.el.querySelector('.slider__label');
      // After a drag the track would keep keyboard focus and swallow ↑↓ (the step keys): hand focus back.
      const sliderTrack = slider.el.querySelector('.slider__track');
      if (sliderTrack) {
        const letGo = () => { try { if (document.activeElement === sliderTrack) sliderTrack.blur(); } catch (_) { /* ignore */ } };
        sliderTrack.addEventListener('pointerup', letGo);
        sliderTrack.addEventListener('pointercancel', letGo);
      }
      const linkEls = api.links([
        { label: 'paper', href: 'https://arxiv.org/abs/2602.14272' },
        { label: 'code', href: 'https://github.com/YilunKuang/RadialVCReg' },
        { label: 'UniReps', href: 'https://openreview.net/forum?id=pQ2LZnZDDp' },
      ]);

      const dOfV = v => Math.round(Math.pow(2, 1 + 8 * clamp(v, 0, 1)));
      const vOfD = d => (Math.log2(d) - 1) / 8;
      // The shell writes the label as plain text (also the accessible value); we then re-typeset it
      // with KaTeX (sliderRich), wrapped at 13px so formulas render ≥ 14px.
      function sliderLabel(v) {
        switch (step) {
          case 0: case 1: return `whitening ${fmt(v, 2)}`;
          case 2: return `dimension d = ${dOfV(v)}`;
          case 3: return `radial map t = ${fmt(v, 2)}`;
          case 4: return `optimization ${Math.round(v * 100)}% (schematic)`;
          default: return `norms after ${F2[Math.round(v * 2)].long}`;
        }
      }
      const K13 = s => `<span style="font-size:13px">${s}</span>`;
      function sliderRich(v) {
        switch (step) {
          case 0: case 1: return `whitening ${K13(tex('\\hat\\Sigma^{-1/2}'))} · ${fmt(v, 2)}`;
          case 2: return `dimension ${K13(tex(`d = ${dOfV(v)}`))}`;
          case 3: return `radial map ${K13(tex(`t = ${fmt(v, 2)}`))}`;
          case 4: return `optimization ${Math.round(v * 100)}% · schematic`;
          default: return `${K13(tex('\\|z\\|'))} after ${esc(F2[Math.round(v * 2)].long)}`;
        }
      }
      let sliderHTML = '';
      function decorateSlider() {
        if (!sliderLab) return;
        const s = sliderRich(slider.get());
        const ours = sliderLab.firstChild && sliderLab.firstChild.nodeType === 1 && sliderLab.firstChild.getAttribute('data-rv');
        // fixed line box: a plain-text label (step 5) and a KaTeX one are the same height, so the
        // control column never jumps between steps
        if (s !== sliderHTML || !ours) { sliderLab.innerHTML = `<span data-rv="1" style="display:inline-block;min-height:18px;line-height:18px;vertical-align:top">${s}</span>`; sliderHTML = s; }
      }
      function setSlider(v) { slider.set(v); decorateSlider(); }
      const ENDS = [['raw', 'whitened'], ['raw', 'whitened'], ['$d = 2$', '$d = 512$'], ['whitened', '$\\|z\\| \\sim \\chi_2$'], ['Fig. 1a', 'Fig. 1b'], ['init', 'Radial']];
      function syncSliderMode() {
        const e = ENDS[step];
        if (sliderEnds && sliderEnds.children.length === 2) {
          const r = s => rich(s).replace(/<span class="katex">/g, '<span class="katex" style="font-size:14px">');
          sliderEnds.children[0].innerHTML = r(e[0]); sliderEnds.children[1].innerHTML = r(e[1]);
        }
        lastSV = currentParam();
        setSlider(lastSV);
      }
      function onSlider(v) {
        if (step === 0) { goStep(1, true); }
        uParam = v; holdNow();
        if (step === 2) { const d = dOfV(v); if (d !== dCur) setD(d, true); }
        if (step === 5) { const k = Math.round(v * 2); if (k !== f2Cur) setF2(k); }
        decorateSlider();
      }

      // Options row under the cloud: shapes / d presets / replay / Fig. 2 states
      let optBtns = [], optMode = '';
      let figLink = null, figDetach = null;
      function buildOpts() {
        const mode = step === 2 ? 'd' : step === 4 ? 'toy' : step === 5 ? 'real' : 'shape';
        if (mode === optMode) { markOpts(); return; }
        optMode = mode;
        opts.textContent = ''; optBtns = [];
        if (figDetach) { figDetach(); figDetach = null; }
        const add = (label, fn) => {
          const b = h('button', null, label); b.type = 'button';
          b.addEventListener('click', e => { e.stopPropagation(); fn(); });
          b.addEventListener('pointerdown', e => e.stopPropagation());
          opts.append(b); optBtns.push(b); return b;
        };
        figHover = false;
        figLink = null;
        if (mode === 'shape') {
          // the paper figure link sits at the LEFT end (its hover card then opens up over the cloud, not
          // over the readouts), marked as a link (↗, as in the other scenes) and set apart from the shape
          // group by a hairline so it never reads as a fifth shape
          figLink = h('a', 'rv-fig');
          figLink.append(h('span', null, 'fig. 3b'), ' ↗');
          figLink.href = 'https://arxiv.org/abs/2602.14272';
          figLink.target = '_blank'; figLink.rel = 'noopener';
          figLink.addEventListener('pointerdown', e => e.stopPropagation());
          const on = () => { figHover = true; }, off = () => { figHover = false; };
          figLink.addEventListener('pointerenter', on); figLink.addEventListener('focus', on);
          figLink.addEventListener('pointerleave', off); figLink.addEventListener('blur', off);
          const div = h('span', 'rv-div');
          opts.append(figLink, div);
          opts.append(h('span', 'rv-lab', 'shape'));
          SHAPES.forEach((s, k) => add(s.label, () => { setShape(k, true); }));
          figDetach = api.reveal(figLink, { src: 'site/img/projects/radialvcreg.jpg', title: 'Fig. 3b · sunshine', meta: 'never Gaussian', href: 'https://arxiv.org/abs/2602.14272' });
          fitOpts();
        } else if (mode === 'd') {
          const lab = h('span', 'rv-lab'); lab.innerHTML = tex('d =');
          opts.append(lab);
          [2, 8, 64, 512].forEach(d => add(String(d), () => { uParam = vOfD(d); holdNow(); setD(d, true); setSlider(uParam); }));
        } else if (mode === 'toy') {
          add('replay', replayToy);
        } else {
          const lab = h('span', 'rv-lab'); lab.innerHTML = tex('\\|z\\|');
          opts.append(lab);
          F2.forEach((f, k) => add(L.mobile && k === 0 ? 'init' : f.long, () => { uParam = k / 2; holdNow(); setF2(k); setSlider(uParam); }));
          fitOpts();
        }
        L.optsW = -1; // re-measured lazily
        markOpts();
      }
      // The options row trims itself to L.optsMax (centred on the cloud, clear of the histogram panel and
      // the controls): shape mode drops "paper", then (desktop) the "shape" word, then the fig. 3b link;
      // the Fig. 2 row says "init" for "random init", then drops its ‖z‖ label.
      function fitOpts() {
        const over = () => opts.offsetWidth > (L.optsMax || 1e9);
        const dropLab = () => { const lb = opts.querySelector('.rv-lab'); if (lb) lb.remove(); };
        if (optMode === 'shape') {
          const sp = figLink && figLink.firstChild;
          if (sp) { sp.textContent = !L.mobile && L.w >= 1200 ? 'paper fig. 3b' : 'fig. 3b'; if (over()) sp.textContent = 'fig. 3b'; }
          if (!L.mobile && over()) dropLab();
          if (figLink && over()) {
            if (figDetach) { figDetach(); figDetach = null; }
            const d = figLink.nextSibling;
            figLink.remove();
            if (d && d.classList && d.classList.contains('rv-div')) d.remove();
            figLink = null; figHover = false;
          }
        } else if (optMode === 'real') {
          if (over() && optBtns[0]) optBtns[0].textContent = 'init';
          if (over()) dropLab();
        }
        L.optsW = -1;
      }
      function replayToy() {
        stepT = api.reduced ? STEPS[4].settle : 0.3;
        uParam = null; hold = false; bloomArrived = false; chartPts = -1; sq.length = 0;
        startTransition(0.5);
      }
      function markOpts() {
        optBtns.forEach((b, k) => {
          let on = false;
          if (optMode === 'shape') on = k === shape;
          else if (optMode === 'd') on = [2, 8, 64, 512][k] === dCur;
          else if (optMode === 'real') on = k === f2Cur;
          b.classList.toggle('is-on', on);
        });
      }

      /* ------------------------------------------------------------ step machine */
      // reduced motion: every change snaps to its end state
      function startTransition(dur) { if (api.reduced) { trans = null; return; } sx.set(px); sy.set(py); trans = { t: 0, dur }; }

      function setShape(k, fromUser) {
        if (fromUser) { userPicked = true; holdNow(); }
        loadShape(k);
        startTransition(0.8);
        markOpts();
        mapArrived = false;
        // sound: glitch + a data burst pitched by the new radii (rate-limited: fast clicking never stacks)
        const a = au();
        if (a && limit('shape', 200)) {
          hush();
          const t0 = nextT(1), pitches = [];
          for (let j = 0; j < 6; j++) { const i = (Math.random() * N) | 0; pitches.push(rawPitch(Math.hypot(zx[i], zy[i]))); }
          S.glitch({ when: t0, repeats: 5, len: 0.026, gain: 0.28 });
          S.data({ when: t0 + 0.05, dur: 0.28, density: 36, pitch: pitches, spread: 0.9, gain: 0.24, clicks: 0.3, bits: 0.5 });
        }
      }
      function setD(d, fromUser) {
        if (d === dCur) return;
        dPrev = dCur; dCur = d; dT0 = api.reduced ? -9 : clockT; visitedD.add(d);
        markOpts();
        const a = au();
        if (a) {
          const k = D_SEQ.indexOf(d), i = k >= 0 ? k : Math.round(Math.log2(d));
          const ns = nextS(1), t0 = ns ? ns.time : 0;
          SND.dStep = ns ? ns.step : -1;
          S.tick(deg(i - 3, 0), { when: t0, gain: 0.34, pan: -0.2 + 0.04 * i }); // F♯3–E5
          S.noise({ when: t0, type: 'pink', filter: 'bandpass', freq: 294, q: 0.7 * Math.sqrt(d), dur: 0.14, attack: 0.01, release: 0.25, gain: 0.3 });
          if (d === 512) S.grain(62, { when: t0 + 0.12, dur: 0.16, gain: 0.34, bright: 0.2 });
        }
        if (fromUser) holdNow();
      }
      function setF2(k) {
        if (k === f2Cur) return;
        f2Prev = f2Cur; f2Cur = k; f2T0 = api.reduced ? -9 : clockT;
        RH2.set(RH);
        startTransition(0.9);
        markOpts();
        const t0 = nextT(4);
        if (au()) { hush(); S.sub(38, { when: t0, dur: 0.45, gain: 0.45 }); S.click({ freq: clickHz(), when: t0, gain: 0.24 }); S.tick(k === 2 ? 74 : k === 1 ? 69 : 62, { when: t0, gain: 0.26 }); }
      }

      function goStep(i, fromUser, opt) {
        opt = opt || {};
        const prev = step;
        step = clamp(i | 0, 0, STEPS.length - 1);
        stepT = api.reduced ? settleOf(STEPS[step]) : 0;
        uParam = null; hold = false;
        mapArrived = false; bloomArrived = false; whitenDone = false; lastPhaseB = false;
        // event-sound bookkeeping restarts with the step (never inside the frame loop)
        sq.length = 0; chartPts = -1; rowsShown = -1; land.n = 0;
        probe.t = -9; PL.mem = {};
        P.bin = -1; P.row = -1; P.col = -1; P.stick = -9; // a hover belongs to the step it was made in
        if (opt.sprinkle) {
          sprinkle = true;
          const ord = new Int32Array(N);
          for (let k = 0; k < N; k++) { ord[k] = k; rad[k] = Math.hypot(zx[k], zy[k]); }
          ord.sort((a, b) => rad[a] - rad[b]);
          for (let k = 0; k < N; k++) appearAt[ord[k]] = 0.15 + 1.05 * (k / N);
          if (api.reduced) appearAt.fill(0);
        } else if (prev !== step || opt.force) startTransition(0.85);
        if (step === 1) { splitDone = false; splitCount = 0; initSplit(); }
        if (step === 2) { dPrev = dCur = 2; dT0 = -9; visitedD = new Set(api.reduced ? D_SEQ : [2]); }
        if (step === 3 && !userPicked && shape !== 1) loadShape(1);
        if (step === 4 && shape !== 0 && !userPicked) loadShape(0);
        if (step === 5) { f2Prev = f2Cur = 0; f2T0 = -9; }
        stepper.set(step);
        swapHead();
        showCaption();
        buildOpts();
        placeOpts();
        syncSliderMode();
        if (fromUser && prev !== step) { /* core ticks for stepper clicks; keys tick below */ }
        else if (!fromUser && au()) { const t0 = nextT(4); S.click({ freq: clickHz(), when: t0, gain: 0.22 }); S.tick(deg(step, 0), { when: t0, gain: 0.2, pan: 0.3 }); }
      }
      let swapTimer = 0, fontTimer = 0;
      function swapHead() {
        const s = STEPS[step];
        kNum.textContent = counterText();
        showHeadline();
        head.classList.add('is-swap');
        clearTimeout(swapTimer);
        swapTimer = setTimeout(() => { fillHead(s, s.live ? matTex() : ''); head.classList.remove('is-swap'); }, api.reduced ? 0 : 200);
      }

      function initSplit() {
        // polar split: each whitened point sends a copy that swings to angle 0 and drops into its radius bin
        const perm = new Int32Array(N);
        for (let k = 0; k < N; k++) perm[k] = k;
        const R = rng(17 + shape);
        for (let k = N - 1; k > 0; k--) { const j = (R.u() * (k + 1)) | 0; const t = perm[k]; perm[k] = perm[j]; perm[j] = t; }
        // the split starts after the gray N(0, I) comparison has been on screen for ~4 s
        for (let k = 0; k < N; k++) splitT[perm[k]] = SPLIT0 + 2.6 * (k / N);
        splitR.fill(-1);
      }
      const SPLIT0 = 6.5;

      // Parameter of the current step: viewer value, or the autoplay timeline.
      function currentParam() {
        if (uParam != null) return uParam;
        const t = stepT;
        switch (step) {
          case 0: return 0;
          case 1: return easeSine(seg(t, 0.4, 2.0));
          case 2: return vOfD(dCur);
          case 3: {
            if (!userPicked && t >= 6.0) return ease(seg(t, 7.0, 10.0));
            return ease(seg(t, 0.9, 3.9));
          }
          case 4: return seg(t, 0.8, 5.6);
          default: return f2Cur / 2;
        }
      }

      /* ------------------------------------------------------------ per-frame update */
      function whitenLive(ax, ay) {
        // live VCReg-style whitening of the raw features: Σ̂^{−1/2}(x − μ̂)
        let mx = 0, my = 0;
        for (let i = 0; i < N; i++) { mx += ax[i]; my += ay[i]; }
        mx /= N; my /= N;
        let a = 0, b = 0, c = 0;
        for (let i = 0; i < N; i++) { const dx = ax[i] - mx, dy = ay[i] - my; a += dx * dx; b += dx * dy; c += dy * dy; }
        a /= N - 1; b /= N - 1; c /= N - 1;
        const W = isqrtm(a, b, c);
        for (let i = 0; i < N; i++) { const dx = ax[i] - mx, dy = ay[i] - my; wx[i] = W[0] * dx + W[1] * dy; wy[i] = W[1] * dx + W[2] * dy; }
      }
      const rawX = new Float64Array(N), rawY = new Float64Array(N);
      function computeRaw() {
        for (let i = 0; i < N; i++) {
          rawX[i] = A_RAW[0] * zx[i] + A_RAW[1] * zy[i] + MU[0];
          rawY[i] = A_RAW[1] * zx[i] + A_RAW[2] * zy[i] + MU[1];
        }
      }

      function computeTargets() {
        const v = currentParam();
        if (step === 0 || step === 1) {
          computeRaw();
          if (step === 0 && v <= 0) { tx.set(rawX); ty.set(rawY); return; }
          whitenLive(rawX, rawY);
          for (let i = 0; i < N; i++) { tx[i] = lerp(rawX[i], wx[i], v); ty[i] = lerp(rawY[i], wy[i], v); }
          return;
        }
        if (step === 2) {
          const e = dT0 < 0 ? 1 : easeSine(seg(clockT - dT0, 0, 0.32));
          const r0 = chiRadii(dPrev), r1 = chiRadii(dCur);
          const s0 = Math.sqrt(2 / dPrev), s1 = Math.sqrt(2 / dCur);
          for (let i = 0; i < N; i++) {
            const rho = lerp(r0[i] * s0, r1[i] * s1, e);
            tx[i] = rho * Math.cos(PHI[i]); ty[i] = rho * Math.sin(PHI[i]);
          }
          return;
        }
        if (step === 3) {
          computeRaw(); whitenLive(rawX, rawY);
          for (let i = 0; i < N; i++) { rad[i] = Math.hypot(wx[i], wy[i]); ridx[i] = i; }
          ridx.sort((a, b) => rad[a] - rad[b]);
          for (let j = 0; j < N; j++) rrank[ridx[j]] = j;
          for (let i = 0; i < N; i++) {
            const r = rad[i] || 1e-9, q = Q2[rrank[i]], nr = lerp(r, q, v);
            tx[i] = wx[i] / r * nr; ty[i] = wy[i] / r * nr;
          }
          return;
        }
        if (step === 4) {
          const D = 0.3, B = bloom;
          for (let i = 0; i < N; i++) {
            const p = easeSine(clamp((v - D * B.rank[i]) / (1 - D), 0, 1));
            const r = lerp(B.sR[i], B.eR[i], p), th = lerp(B.sT[i], B.eT[i], p);
            tx[i] = r * Math.cos(th); ty[i] = r * Math.sin(th);
          }
          return;
        }
        // step 5: portrait of the Fig. 2 feature norms (radius · √(2/512), angle random)
        const R1 = f2Radii[f2Cur], s = Math.sqrt(2 / 512);
        for (let i = 0; i < N; i++) { const rho = R1[i] * s; tx[i] = rho * Math.cos(PHI[i]); ty[i] = rho * Math.sin(PHI[i]); }
      }

      function computeStats() {
        let mx = 0, my = 0;
        for (let i = 0; i < N; i++) { mx += px[i]; my += py[i]; }
        mx /= N; my /= N;
        let a = 0, b = 0, c = 0, a4 = 0, c4 = 0;
        HX.fill(0); HY.fill(0);
        let beyond = 0, ang = new Float64Array(32);
        for (let i = 0; i < N; i++) {
          const x = px[i], y = py[i], dx = x - mx, dy = y - my, dx2 = dx * dx, dy2 = dy * dy;
          a += dx2; b += dx * dy; c += dy2; a4 += dx2 * dx2; c4 += dy2 * dy2;
          const r = Math.hypot(x, y); rad[i] = r; srt[i] = r;
          if (r > 3.5) beyond++;
          const kx = Math.floor((x + 3.5) / 0.25), ky = Math.floor((y + 3.5) / 0.25);
          if (kx >= 0 && kx < 28) HX[kx]++;
          if (ky >= 0 && ky < 28) HY[ky]++;
          let th = Math.atan2(y, x); if (th < 0) th += TAU;
          ang[Math.min(31, (th / TAU * 32) | 0)]++;
        }
        const m2x = a / N, m2y = c / N;
        ST.mx = mx; ST.my = my; ST.a = a / (N - 1); ST.b = b / (N - 1); ST.c = c / (N - 1);
        ST.kx = (a4 / N) / (m2x * m2x); ST.ky = (c4 / N) / (m2y * m2y);
        // VCReg terms (paper Eq. 1, γ = 1): variance hinge on the std, squared off-diagonal covariance
        ST.v = 0.5 * (Math.max(0, 1 - Math.sqrt(ST.a + 1e-4)) + Math.max(0, 1 - Math.sqrt(ST.c + 1e-4)));
        ST.cz = ST.b * ST.b; // (1/d) Σ_{i≠j} C_ij² with d = 2
        // principal standard deviations σ₁ ≥ σ₂ of Σ̂ and the major-axis angle
        { const tr = ST.a + ST.c, det = ST.a * ST.c - ST.b * ST.b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
          ST.s1 = Math.sqrt(tr / 2 + disc); ST.s2 = Math.sqrt(Math.max(0, tr / 2 - disc)); ST.ang = 0.5 * Math.atan2(2 * ST.b, ST.a - ST.c); }
        ST.beyond = beyond;
        srt.sort();
        // W₁(‖z‖, χ₂) and the radial loss r(Z) with β₁ = β₂ = 1 (Eq. 7): CE − m-spacing entropy
        let w1 = 0, ce = 0, H = 0;
        for (let i = 0; i < N; i++) { const r = srt[i]; w1 += Math.abs(r - Q2[i]); ce += r * r / 2 - Math.log(Math.max(r, 1e-9)); }
        for (let i = 0; i < N - M_SP; i++) H += Math.log((N + 1) / M_SP * Math.max(srt[i + M_SP] - srt[i], 1e-9));
        ST.w1 = w1 / N; ST.loss = ce / N - H / (N - M_SP);
        let tv = 0; for (let k = 0; k < 32; k++) tv += Math.abs(ang[k] / N - 1 / 32);
        ST.tv = tv / 2;
        for (let k = 0; k < 28; k++) { HX[k] /= N * 0.25; HY[k] /= N * 0.25; }
      }

      function histFromRadii(src, binW, rmax, weights) {
        const nb = Math.min(RH.length, Math.ceil(rmax / binW));
        RH.fill(0);
        let tot = 0;
        for (let i = 0; i < N; i++) {
          if (weights && !weights[i]) continue;
          const r = src[i], k = Math.floor(r / binW);
          if (k >= 0 && k < nb) RH[k]++;
          tot++;
        }
        const s = 1 / (N * binW);
        for (let k = 0; k < nb; k++) RH[k] *= s;
        return nb;
      }

      function update(dt) {
        clockT += dt;
        // reduced motion: the timeline stays at the step's settled state
        if (!paused && !api.reduced) stepT += dt;

        // autoplay parameter side-effects
        if (step === 2 && uParam == null) {
          const k = clamp(Math.floor((stepT - 1.0) / 0.62), 0, D_SEQ.length - 1);
          if (stepT >= 1.0 && D_SEQ[k] !== dCur) setD(D_SEQ[k], false);
        }
        if (step === 3 && !userPicked && uParam == null) {
          const phaseB = stepT >= 6.0;
          if (phaseB && !lastPhaseB) { loadShape(0); startTransition(0.8); mapArrived = false; markOpts(); }
          lastPhaseB = phaseB;
        }
        if (step === 5 && uParam == null) {
          const k = stepT < 2.8 ? 0 : stepT < 5.3 ? 1 : 2;
          if (k !== f2Cur) setF2(k);
        }

        computeTargets();
        if (trans) {
          trans.t += dt;
          const e = ease(clamp(trans.t / trans.dur, 0, 1));
          for (let i = 0; i < N; i++) { px[i] = lerp(sx[i], tx[i], e); py[i] = lerp(sy[i], ty[i], e); }
          if (trans.t >= trans.dur) trans = null;
        } else { px.set(tx); py.set(ty); }

        computeStats();
        if (STEPS[step].live && headStep === step && !L.mobile && clockT - eqT > 0.1) { eqT = clockT; setEq(eqOf(STEPS[step], matTex())); }

        // step-specific events
        const v = currentParam();
        if (uParam == null && Math.abs(v - lastSV) > 0.004) { lastSV = v; setSlider(v); }
        if (step === 1) {
          if (!whitenDone && v >= 0.999) {
            whitenDone = true;
            if (au()) { const t0 = nextT(1); S.tick(74, { when: t0, gain: 0.3 }); S.sub(50, { when: t0, dur: 0.3, gain: 0.35 }); }
          }
          if (stepT > 0.4 && stepT - dt <= 0.4 && uParam == null && au()) S.noise({ when: nextT(1), type: 'pink', filter: 'bandpass', freq: 180, freqTo: 1800, q: 1.3, dur: 1.1, attack: 0.3, release: 0.5, gain: 0.28 });
          // the "same Σ" moment: one open fifth (D4 + A4), heard again for the Gaussian — VCReg hears no difference
          if (stepT > 2.5 && stepT - dt <= 2.5 && au()) { const t0 = nextT(2); S.grain(62, { when: t0, dur: 0.24, gain: 0.3, pan: -0.3, bright: 0.15 }); S.grain(69, { when: t0, dur: 0.24, gain: 0.28, pan: 0.3, bright: 0.15 }); }
          updateSplit(dt);
        }
        if (step === 3) {
          if (!mapArrived && v >= 0.995) {
            mapArrived = true;
            if (au()) {
              const t0 = nextT(4), sp = looksGaussian();
              hush();
              S.sub(38, { when: t0, dur: 0.6, gain: 0.45 });
              [57, 62, 66, 69].forEach((m, j) => { const p = pickPoint(); S.grain(m, { when: t0 + j * 0.02, dur: 0.26, gain: 0.3, pan: p.pan, bright: 0.2 }); });
              if (!sp) S.glitch({ when: t0 + 0.5, repeats: 3, len: 0.03, gain: 0.16 });
            }
          }
          if (v < 0.95) mapArrived = false;
        }
        if (step === 4) {
          if (!bloomArrived && v >= 0.999) {
            // reduced motion: the shells have already faded and the real points are in
            bloomArrived = true; shown.shellsT = api.reduced ? clockT - 10 : clockT;
            if (au()) { hush(); const t0 = nextT(4); S.sub(38, { when: t0, dur: 0.6, gain: 0.45 }); [57, 62, 69].forEach((m, j) => { const p = pickPoint(); S.grain(m, { when: t0 + j * 0.03, dur: 0.28, gain: 0.28, pan: p.pan, bright: 0.2 }); }); }
          }
          // bloom speed for the clock (bits are scheduled on the grid there, not from the frame loop)
          const moving = v > 0.05 && v < 0.98 && Math.abs(v - lastBloomV) > 1e-5;
          SND.bloom = moving ? 0.3 + 0.7 * Math.sin(Math.PI * v) : 0;
          lastBloomV = v;
          chartSounds();
        } else SND.bloom = 0;
        if (step === 5) rowSounds();
        if (P.touch && P.stick > 0 && clockT > P.stick) { P.stick = -9; P.bin = -1; P.row = -1; P.col = -1; }
        // short phones: the sound invite is gone once audio unlocks, and so is the room kept for it
        if (L.mobile && L.invite) { const a = AU(); if (a && a.ready) layout(); }
        // interaction hint, once per session, as soon as the first gesture has unlocked audio (sound on or off).
        // Short wording on phones and ≤ 1100 px windows (the shell puts hints under the wordmark there, right
        // above the headline); none on short phones, where it would cover the histogram's axis (the options
        // row and ‹ › already show the controls).
        if (!hinted && clockT - enterT > 1.5) {
          const a = AU();
          if (a && a.ready) {
            if (readyAt < 0) readyAt = clockT;
            else if (clockT - readyAt > 0.5) {
              hinted = true;
              if (!L.slim) { hintAt = clockT; hintWide = hintWording(); api.hint(hintWide, 4600); }
            }
          }
        }

        // visibility blends (reduced motion: snap)
        const snap = api.reduced ? 1 : 0;
        // step 2: the gray N(0, I) sample holds for ~4 s beside the whitened cloud, then stays faintly
        const tgtGhost = step !== 1 ? 0 : api.reduced ? 1 : seg(stepT, 2.3, 2.9) * (1 - 0.72 * seg(stepT, SPLIT0 - 0.3, SPLIT0 + 0.4));
        shown.ghost += (tgtGhost - shown.ghost) * Math.min(1, snap + dt * 10);
        const tgtMarg = step === 2 || step === 5 ? 0 : 1;
        shown.marg += (tgtMarg - shown.marg) * Math.min(1, snap + dt * 6);
        const tgtHist = step === 0 ? 0 : 1;
        shown.hist += (tgtHist - shown.hist) * Math.min(1, snap + dt * 6);
        const rmaxT = step === 2 ? 30 : step === 5 ? 42 : 5.5;
        rmaxCur += (rmaxT - rmaxCur) * Math.min(1, snap + dt * 5);
        if (Math.abs(rmaxT - rmaxCur) < 0.01) rmaxCur = rmaxT;

        // probe point: auto-wanders unless hovered (reduced motion: one per step). A point off the axes and
        // well inside the frame, so its label has room; preferably one whose label has a spot clear of the
        // other labels (small frames), else the first such point. On the chi shell, a point from the middle of
        // the shell: it stays in the ring's middle as d grows, so a label clear of the ring stays clear.
        if (P.near < 0 && (api.reduced ? probe.step !== step : clockT - probe.t > 2.6)) {
          let i = (Math.random() * N) | 0, alt = -1;
          for (let k = 0; k < 160; k++) {
            const j = (Math.random() * N) | 0, x = px[j], y = py[j], r = Math.hypot(x, y);
            if (Math.abs(x) < 2.4 && Math.abs(y) > 0.35 && y < 2.3 && y > -2.2 && r > 0.8 && r < 2.3 && (step !== 2 || Math.abs(UU[j] - 0.5) < 0.2)) {
              if (alt < 0) alt = j;
              if (probeFree(j)) { alt = -1; i = j; break; }
            }
          }
          if (alt >= 0) i = alt;
          probe.i = i; probe.t = clockT; probe.step = step; delete PL.mem.probe;
          probe.fresh = !probe.retry; probe.retry = false;
        }

        // sound state
        let match, angN;
        if (step === 2) { match = 1; angN = 1; }
        else if (step === 5) { match = Math.exp(-F2[f2Cur].w1 / 3); angN = 1; }
        else { match = Math.exp(-ST.w1 / 0.04); angN = clamp(1 - (ST.tv - 0.06) / 0.35, 0, 1); }
        SND.match = match; SND.ang = angN; SND.gauss = match * angN;
        const tgtBeat = SND.gauss > 0.35 ? clamp((SND.gauss - 0.35) / 0.45, 0, 1) : 0;
        SND.beat += (tgtBeat - SND.beat) * Math.min(1, dt * (tgtBeat > SND.beat ? 0.6 : 1.2));
        if (bed && soundOn && clockT - bedT > 0.35) { bedT = clockT; try { bed.set(bedParams(), 0.3); } catch (e) { /* never break visuals */ } }

        // progress + autoplay advance. A hold lifts itself after HOLD_S s without input; the timeline also
        // waits while the pointer rests on something being read (fig. 3b card, a bin, a chart row or column).
        const dur = durOf(step);
        progBar.style.transform = `scaleX(${clamp(stepT / dur, 0, 1).toFixed(4)})`;
        if (hold && !P.down && clockT - holdT > HOLD_S) hold = false;
        // play state under the counter, in the shared wording of scenes 1 and 3: 'autoplay', 'interactive'
        // (a viewer's input holds the step, or reduced motion), 'paused · [space]'. Phones (the step row also
        // names the step, beside ‹ ›) name only a paused timeline; the gray hairline says the rest
        const cue = api.reduced ? 'r' : paused ? 'p' : hold ? 'h' : 'a';
        const cueKey = cue + (L.mobile ? 'm' : '');
        if (cueKey !== cueShown) {
          cueShown = cueKey;
          kState.textContent = L.mobile
            ? ({ p: 'paused' })[cue] || ''
            : ({ r: 'interactive', p: 'paused · [space]', h: 'interactive', a: 'autoplay' })[cue];
          prog.classList.toggle('is-still', cue !== 'a');
        }
        // (a mouse resting on the context headline reads as someone reading it: the step waits, for up to
        // twice its time, so a pointer left there never stalls the loop)
        const reading = !P.touch && P.inside && stepT < 2 * dur && overHeadline();
        const hovering = figHover || P.bin >= 0 || P.row >= 0 || P.col >= 0 || reading;
        if (auto && !paused && !hold && !hovering && !api.reduced && stepT >= dur) {
          if (step === STEPS.length - 1) {
            if (!userPicked) loadShape((shape + 1) % 4);
            goStep(0, false, { sprinkle: true });
          } else goStep(step + 1, false);
        }
        if (sprinkle && stepT > 1.4) sprinkle = false;
      }

      function updateSplit() {
        if (splitDone) return;
        let landed = 0, anyNew = -1;
        for (let i = 0; i < N; i++) {
          const t0 = splitT[i];
          if (stepT < t0) continue;
          if (splitR[i] < 0) splitR[i] = rad[i];
          if (stepT >= t0 + 0.9) {
            landed++;
            if (splitA[i] !== 1) { splitA[i] = 1; anyNew = i; }
          } else splitA[i] = 0;
        }
        splitCount = landed;
        // the clock sounds the latest landing on the next odd 16th (a tick pitched by its bin)
        if (anyNew >= 0 && !api.reduced) { land.n++; land.r = splitR[anyNew]; land.pan = Math.cos(Math.atan2(py[anyNew], px[anyNew])) * 0.7; }
        if (landed >= N) { splitDone = true; land.n = 0; if (au()) { const t0 = nextT(2); S.click({ freq: clickHz(), when: t0, gain: 0.22 }); } }
      }

      // Chart A points (15) and Chart C rows (9) each get one note, queued for the clock. chartPts / rowsShown
      // are reset only when a step starts or the toy replays, never from the frame loop. A backlog (reduced
      // motion, or a jump) sounds only its last mark.
      let chartPts = -1, lastBloomV = 0;
      function chartSounds() {
        const pr = seg(stepT, 1.6, 5.6), n = pr > 0 ? Math.min(14, Math.floor(pr * 15)) : -1;
        if (n <= chartPts) return;
        const from = api.reduced || n - chartPts > 3 ? n : chartPts + 1;
        for (let k = from; k <= n; k++) {
          const s = Math.floor(k / 5), j = k % 5, W = [CA.data, CA.vcreg, CA.radial][s][j];
          const i = Math.round((W - 0.1) / 0.1);
          enqueue((t, sd) => {
            S.bit(deg(i, -1), { when: t, gain: s === 2 ? 0.24 : 0.18, pan: (j - 2) * 0.3 }); // D3–E4
            // (the bloom's arrival chord closes the chart; no extra grain on its last point)
          });
        }
        chartPts = n;
      }
      let rowsShown = -1;
      function rowSounds() {
        const n = stepT < 1.4 ? -1 : Math.min(CC.length - 1, Math.floor((stepT - 1.4) / 0.508));
        if (n <= rowsShown) return;
        const from = api.reduced || n - rowsShown > 3 ? n : rowsShown + 1;
        for (let k = from; k <= n; k++) {
          const g = CC[k][5];
          enqueue((t, sd) => {
            S.tick(deg(Math.round(g / 0.35), 0), { when: t, gain: k < 4 ? 0.26 : 0.16, pan: (k % 3 - 1) * 0.3 });
            if (k === 3) S.grain(deg(3, 0), { when: t + sd, dur: 0.24, gain: 0.26, bright: 0.2 });
          });
        }
        rowsShown = n;
      }

      /* ------------------------------------------------------------ drawing helpers */
      function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      const px5 = v => Math.round(v) + 0.5;
      function plus(x, y, s) { x = px5(x); y = px5(y); line(x - s, y, x + s, y); line(x, y - s, x, y + s); }
      let curFont = '';
      function setFont(f) { if (f !== curFont) { ctx.font = f; curFont = f; } }
      // Canvas text is only used for plain words and numbers — anything with notation goes through T() (KaTeX).
      // y is the vertical middle of the line (textBaseline = 'middle').
      function text(str, x, y, color, align, font, halo) {
        setFont(font || F12);
        ctx.textAlign = align || 'left';
        if (halo) { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(str, x, y); ctx.lineWidth = 1; }
        ctx.fillStyle = color || COL.ink; ctx.fillText(str, x, y);
      }
      const textW = (str, font) => { setFont(font || F12); return ctx.measureText(str).width; };
      let hoverLine = ''; // phones: a hovered histogram bin replaces the one-line readout

      /* ---- label placement inside the cloud frame.
         Every frame: a coarse density grid of what is drawn (points, contour, axes, probe line) plus the
         boxes of labels already placed. A label picks the cheapest of a few candidate spots, and keeps its
         spot unless another one is clearly better (no flicker while the cloud moves). */
      const PG = 8;
      const PL = { x0: 0, y0: 0, nc: 0, grid: new Float32Array(0), rects: [], mem: {}, clipped: 0, probeI: -1 };
      function plPt(sx, sy, w) {
        const c = Math.floor((sx - PL.x0) / PG), r = Math.floor((sy - PL.y0) / PG);
        if (c >= 0 && r >= 0 && c < PL.nc && r < PL.nc) PL.grid[r * PL.nc + c] += w;
      }
      function plSeg(x1, y1, x2, y2, w) {
        const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 5));
        for (let j = 0; j <= n; j++) plPt(lerp(x1, x2, j / n), lerp(y1, y2, j / n), w);
      }
      function plRect(x, y, w, hh) { PL.rects.push(x, y, w, hh); }
      // left x of the "+N outside" count: the frame's top-right corner, or its top-left one when a small
      // frame would put it on the boxed z₂ label
      function outsideX(w) { const b = L.box, xr = L.cx + b - 8; return xr - w >= L.cx + 36 ? xr - w : L.cx - b + 8; }
      const outsideS = n => (L.box < 110 ? `+${n} out` : `+${n} outside`);
      function plBegin() {
        const b = L.box;
        PL.x0 = L.cx - b; PL.y0 = L.cy - b;
        PL.nc = Math.ceil(2 * b / PG) + 1;
        const n = PL.nc * PL.nc;
        if (PL.grid.length < n) PL.grid = new Float32Array(n); else PL.grid.fill(0, 0, n);
        PL.rects.length = 0;
        let clipped = 0;
        for (let i = 0; i < N; i++) {
          if (sprinkle && stepT < appearAt[i]) continue;
          const x = px[i], y = py[i];
          if (Math.abs(x) > 3.5 || Math.abs(y) > 3.5) { clipped++; continue; }
          plPt(X(x), Y(y), 1);
        }
        if (shown.ghost > 0.2) for (let i = 0; i < N; i += 2) plPt(X(gx[i]), Y(gy[i]), 0.8);
        if (realAlpha() > 0.3) for (let j = 0; j < TPL.length; j += 2) plPt(X(TPL[j]), Y(TPL[j + 1]), 1.5);
        PL.clipped = clipped;
        if (clipped) { const w = textW(outsideS(clipped)); plRect(outsideX(w), L.cy - b + 5, w, 16); }
      }
      function plCost(x, y, w, hh) {
        const b = L.box;
        let c = 0;
        if (x < L.cx - b + 3 || y < L.cy - b + 3 || x + w > L.cx + b - 3 || y + hh > L.cy + b - 3) c += 600;
        const R = PL.rects;
        for (let i = 0; i < R.length; i += 4) if (x < R[i] + R[i + 2] + 3 && x + w + 3 > R[i] && y < R[i + 1] + R[i + 3] + 2 && y + hh + 2 > R[i + 1]) c += 1000;
        const nc = PL.nc;
        const c0 = Math.max(0, Math.floor((x - PL.x0) / PG)), c1 = Math.min(nc - 1, Math.floor((x + w - PL.x0) / PG));
        const r0 = Math.max(0, Math.floor((y - PL.y0) / PG)), r1 = Math.min(nc - 1, Math.floor((y + hh - PL.y0) / PG));
        for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) c += PL.grid[r * nc + q];
        return c;
      }
      // density around a screen point: its cell plus half of each of the 8 neighbours, so a path that
      // grazes a dense line pays for it, not only one that crosses it
      function plDens(x, y) {
        const nc = PL.nc, q = Math.floor((x - PL.x0) / PG), r = Math.floor((y - PL.y0) / PG);
        let c = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const rr2 = r + dr;
          if (rr2 < 0 || rr2 >= nc) continue;
          for (let dq = -1; dq <= 1; dq++) {
            const qq = q + dq;
            if (qq >= 0 && qq < nc) c += PL.grid[rr2 * nc + qq] * (dq || dr ? 0.5 : 1);
          }
        }
        return c;
      }
      // Cost of a leader polyline [x0, y0, x1, y1, …]: dilated density along it plus the density in two
      // bands 10 px either side. A leader that runs beside an arm of the X pays the whole way along it,
      // so it can no longer read as a second arm. The first 10 px (on the contour itself) are free.
      function plPathCost(pts) {
        let c = 0, len = 0;
        for (let s = 0; s + 3 < pts.length; s += 2) {
          const x1 = pts[s], y1 = pts[s + 1], x2 = pts[s + 2], y2 = pts[s + 3], l0 = Math.hypot(x2 - x1, y2 - y1);
          if (l0 < 1) continue;
          const nx = -(y2 - y1) / l0, ny = (x2 - x1) / l0, n = Math.ceil(l0 / 5);
          for (let j = 0; j <= n; j++) {
            if (len + l0 * j / n < 10) continue;
            const x = lerp(x1, x2, j / n), y = lerp(y1, y2, j / n);
            c += plDens(x, y) + 0.35 * (plDens(x + nx * 10, y + ny * 10) + plDens(x - nx * 10, y - ny * 10))
              + 0.15 * (plDens(x + nx * 18, y + ny * 18) + plDens(x - nx * 18, y - ny * 18));
          }
          len += l0;
        }
        return c + 0.02 * len;
      }
      // does the segment (x1, y1)–(x2, y2) pass through the box? (sampled every 3 px, last 3 px excluded)
      function segHitsBox(sg, x, y, w, hh) {
        const l0 = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), n = Math.floor((l0 - 3) / 3);
        for (let j = 0; j <= n; j++) {
          const f = j * 3 / (l0 || 1), px0 = lerp(sg[0], sg[2], f), py0 = lerp(sg[1], sg[3], f);
          if (px0 > x - 2 && px0 < x + w + 2 && py0 > y - 2 && py0 < y + hh + 2) return true;
        }
        return false;
      }
      // does a box meet a label already placed this frame (the first n rect entries only, if given)?
      function plHitsRect(x, y, w, hh, n) {
        const R = PL.rects, e = n == null ? R.length : n;
        for (let i = 0; i < e; i += 4) if (x < R[i] + R[i + 2] + 3 && x + w + 3 > R[i] && y < R[i + 1] + R[i + 3] + 2 && y + hh + 2 > R[i + 1]) return true;
        return false;
      }
      // cands: [x, yMid, anchor 'l'|'r'|'c', bias]; o.seg: a leader the label must not sit on;
      // o.optional: when every spot would cover a label already placed, the label is left out this frame
      function plPlace(key, spec, cands, o) {
        o = o || {};
        T(key, spec, -9999, -9999, Object.assign({}, o, { a: cands[0][2] }));
        const w = tw(key) + 1, hh = o.cls === 'tag' ? 18 : 16;
        const bx = cd => (cd[2] === 'r' ? cd[0] - w : cd[2] === 'c' ? cd[0] - w / 2 : cd[0]);
        let best = 0, bestC = Infinity;
        const cost = cands.map((cd, i) => {
          let v = plCost(bx(cd), cd[1] - hh / 2, w, hh) + (cd[3] || 0);
          if (o.seg && segHitsBox(o.seg, bx(cd), cd[1] - hh / 2, w, hh)) v += 1000;
          if (o.optional && plHitsRect(bx(cd), cd[1] - hh / 2, w, hh)) v += 1e6;
          if (v < bestC) { bestC = v; best = i; }
          return v;
        });
        if (o.optional && bestC >= Math.min(1e6, o.maxCost || Infinity)) { OVL.get(key).f = -1; delete PL.mem[key]; return false; }
        const prev = PL.mem[key];
        if (prev != null && prev < cands.length && cost[prev] <= bestC * 1.35 + 3) best = prev;
        PL.mem[key] = best;
        const cd = cands[best];
        T(key, spec, cd[0], cd[1], Object.assign({}, o, { a: cd[2] }));
        plRect(bx(cd), cd[1] - hh / 2, w, hh);
        return true;
      }

      // steps 3 and 6 draw a rescaled portrait (radius ‖z‖·√(2/d)), so data ticks and axis names would lie there
      const isPortrait = () => step === 2 || step === 5;
      function drawCloudFrame() {
        const b = L.box, x0 = L.cx - b, y0 = L.cy - b, x1 = L.cx + b, y1 = L.cy + b;
        // the fig. 3b card's caption line runs along the frame bottom while it is open: that edge, its
        // corner crosses and the lower z₂ axis step aside (the card covers that area anyway)
        const open = figHover;
        ctx.lineWidth = 1;
        // dashed bounding square with corner crosses
        ctx.strokeStyle = COL.g400; ctx.setLineDash([2, 4]);
        if (open) { ctx.beginPath(); ctx.moveTo(px5(x0), px5(y1)); ctx.lineTo(px5(x0), px5(y0)); ctx.lineTo(px5(x1), px5(y0)); ctx.lineTo(px5(x1), px5(y1)); ctx.stroke(); }
        else ctx.strokeRect(px5(x0), px5(y0), Math.round(x1 - x0), Math.round(y1 - y0));
        ctx.setLineDash([]);
        ctx.strokeStyle = COL.ink;
        (open ? [[x0, y0], [x1, y0]] : [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]).forEach(([x, y]) => plus(x, y, 4));
        // crosshair axes + unit ticks
        ctx.strokeStyle = COL.g200;
        line(px5(x0), px5(L.cy), px5(x1), px5(L.cy)); line(px5(L.cx), px5(y0), px5(L.cx), px5(open ? L.cy + 0.45 * b : y1));
        // the axes count as ink for label and leader placement (a leader must not shadow an axis either)
        plSeg(x0, L.cy, x1, L.cy, 0.6); plSeg(L.cx, y0, L.cx, y1, 0.6);
        if (isPortrait()) return;
        ctx.strokeStyle = COL.g400;
        for (let k = -3; k <= 3; k++) {
          if (!k) continue;
          line(px5(X(k)), px5(L.cy) - 2, px5(X(k)), px5(L.cy) + 3);
          if (!open || k > -2) line(px5(L.cx) - 2, px5(Y(k)), px5(L.cx) + 3, px5(Y(k)));
        }
        // axis names: z₁ just outside the frame on its axis; z₂ boxed at the top of its axis (the top
        // marginal lives above the frame). Narrow windows, where the right column's panel title shares the
        // axis line a few px to the right, would read "z₁  HISTOGRAM  target χ₂" as one phrase: z₁ then
        // steps off that line, inside the frame above the axis (title level or lower) or under the axis
        // end (title higher), as the ±3 numbers are.
        const titleNear = !L.mobile && !L.portrait && Math.abs(L.ptY - L.cy) < 16 && L.ox - (x1 + 21) < 44;
        if (x1 + 24 >= L.w - 4 || (titleNear && L.ptY >= L.cy - 4)) { T('ax1i', '$z_1$', x1 - 6, L.cy - 13, { a: 'r', c: SEC, cls: 'tag' }); plRect(x1 - 28, L.cy - 22, 24, 18); }
        else if (titleNear) T('ax1b', '$z_1$', x1 + 7, L.cy + 13, { c: SEC });
        else { T('ax1', '$z_1$', x1 + 7, L.cy, { c: SEC }); plRect(x1 + 5, L.cy - 9, 22, 18); }
        T('ax2', '$z_2$', L.cx + 6, y0 + 13, { c: SEC, cls: 'tag' });
        plRect(L.cx + 4, y0 + 4, 26, 18);
        // ±3 numbers: reserved now, drawn on top of the points later (drawFrameTicks)
        plRect(X(-3) - 12, L.cy + 6, 24, 14); plRect(X(3) - 8, L.cy + 6, 16, 14);
      }
      function drawFrameTicks() {
        if (isPortrait()) return;
        text(MINUS + '3', X(-3), L.cy + 13, TICK, 'center', F11, true);
        text('3', X(3), L.cy + 13, TICK, 'center', F11, true);
      }

      function ellipsePath(m, cx0, cy0, prog, k) {
        // x = μ + k·Σ^{1/2}(cos, sin): the k-σ contour of covariance Σ
        const S2 = sqrtm(m.a, m.b, m.c), steps = 96, end = Math.max(1, Math.round(steps * prog));
        ctx.beginPath();
        for (let j = 0; j <= end; j++) {
          const th = (j / steps) * TAU + Math.PI * 0.25, c = Math.cos(th) * k, s = Math.sin(th) * k;
          const ex = cx0 + S2[0] * c + S2[1] * s, ey = cy0 + S2[1] * c + S2[2] * s;
          j ? ctx.lineTo(X(ex), Y(ey)) : ctx.moveTo(X(ex), Y(ey));
        }
        ctx.stroke();
      }

      function drawMarginals(alpha) {
        if (alpha < 0.02 || L.mobile) return;
        const b = L.box, mh = L.margH, base = L.cy - b - 9, left = L.cx - b - 9;
        const sc = mh / 0.62; // px per unit density
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        // x marginal (above)
        ctx.fillStyle = COL.g100; ctx.strokeStyle = INK(0.7);
        ctx.beginPath(); ctx.moveTo(X(-3.5), base);
        for (let k = 0; k < 28; k++) { const hgt = Math.min(mh, HX[k] * sc); ctx.lineTo(X(-3.5 + k * 0.25), base - hgt); ctx.lineTo(X(-3.25 + k * 0.25), base - hgt); }
        ctx.lineTo(X(3.5), base); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = COL.g300; line(X(-3.5), px5(base), X(3.5), px5(base));
        // y marginal (left)
        ctx.strokeStyle = INK(0.7);
        ctx.beginPath(); ctx.moveTo(left, Y(-3.5));
        for (let k = 0; k < 28; k++) { const hgt = Math.min(mh, HY[k] * sc); ctx.lineTo(left - hgt, Y(-3.5 + k * 0.25)); ctx.lineTo(left - hgt, Y(-3.25 + k * 0.25)); }
        ctx.lineTo(left, Y(3.5)); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = COL.g300; line(px5(left), Y(-3.5), px5(left), Y(3.5));
        // moment-matched Gaussian references (dashed)
        ctx.strokeStyle = COL.g500; ctx.setLineDash([2, 2]);
        const g = (x, m, v) => Math.exp(-(x - m) * (x - m) / (2 * v)) / Math.sqrt(TAU * v);
        ctx.beginPath();
        for (let j = 0; j <= 70; j++) { const x = -3.5 + j * 0.1; const yy = base - Math.min(mh, g(x, ST.mx, ST.a) * sc); j ? ctx.lineTo(X(x), yy) : ctx.moveTo(X(x), yy); }
        ctx.stroke();
        ctx.beginPath();
        for (let j = 0; j <= 70; j++) { const y = -3.5 + j * 0.1; const xx = left - Math.min(mh, g(y, ST.my, ST.c) * sc); j ? ctx.lineTo(xx, Y(y)) : ctx.moveTo(xx, Y(y)); }
        ctx.stroke();
        ctx.setLineDash([]);
        // kurtosis of each marginal (a Gaussian has 3). Both horizontal: the top one at its right end, the
        // left one under the left marginal, shifted left to clear the options row; if that spot would reach
        // the controls or the screen edge, on the top marginal's label row instead, ending just left of the
        // left marginal (it pairs with p(z₁) and the top kurtosis there, above the control column).
        const yTop = base - mh - 4;
        text(`kurtosis ${fmt(ST.kx, 2)}`, X(3.5), yTop, SEC, 'right');
        if (L.optsW < 0) L.optsW = opts.offsetWidth || 0;
        const ks = `kurtosis ${fmt(ST.ky, 2)}`, kw = textW(ks), yb = Y(-3.5) + 15;
        const xr = Math.min(left, L.cx - L.optsW / 2 - 14);
        const clearOfControls = yb - 8 > 0.7 * L.h + 12 || xr - kw > (L.ctrlR || L.CR - 8) + 16;
        // (and ≥ 24 px above the caption's top, three 14 px lines from 62 px up: it never reads as part of it)
        const clearOfCaption = yb + 8 <= L.h - 104 - 24;
        // (a wide options row under a small frame pushes it a little further left, not up to the top row)
        if (xr >= left - mh - 44 && xr - kw >= 16 && clearOfControls && clearOfCaption) text(ks, xr, yb, SEC, 'right');
        else text(ks, left - mh - 6, yTop, SEC, 'right');
        ctx.globalAlpha = 1;
        T('pz1', '$p(z_1)$', X(-3.5), base - mh - 4, { c: SEC, op: alpha });
      }

      // A hovered histogram bin, as the radii it covers in the cloud (the linked view)
      function binHighlight() {
        if (P.bin < 0 || shown.hist < 0.5 || step === 0 || (step === 1 && !splitDone)) return null;
        const binW = step === 5 ? F2_W : step === 2 ? 0.5 : 0.2, a = P.bin * binW;
        if (step === 2) return { a, b: a + binW, s: Math.sqrt(2 / dCur), src: chiRadii(dCur) };
        if (step === 5) return { a, b: a + binW, s: Math.sqrt(2 / 512), src: f2Radii[f2Cur] };
        return { a, b: a + binW, s: 1, src: rad };
      }

      function drawPoints() {
        const b = L.box, rClip = 3.5, pr = L.pt;
        ctx.fillStyle = INK(0.74 - 0.5 * realAlpha());
        ctx.beginPath();
        const flash = [];
        for (let i = 0; i < N; i++) {
          if (sprinkle && stepT < appearAt[i]) continue;
          const x = px[i], y = py[i];
          if (Math.abs(x) > rClip || Math.abs(y) > rClip) continue;
          if (sprinkle && stepT < appearAt[i] + 0.18) { flash.push(i); continue; }
          const sx0 = X(x), sy0 = Y(y);
          ctx.moveTo(sx0 + pr, sy0); ctx.arc(sx0, sy0, pr, 0, TAU);
        }
        ctx.fill();
        if (flash.length) {
          ctx.fillStyle = COL.accent; ctx.beginPath();
          for (const i of flash) { const sx0 = X(px[i]), sy0 = Y(py[i]); ctx.moveTo(sx0 + pr + 0.4, sy0); ctx.arc(sx0, sy0, pr + 0.4, 0, TAU); }
          ctx.fill();
        }
        // linked view: the hovered bin's points light up as an annulus
        const hb = binHighlight();
        if (hb) {
          ctx.strokeStyle = ACC(0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
          [hb.a, hb.b].forEach(r => { const R = r * hb.s * L.u; if (R > 0.5 && R < b * 1.42) { ctx.beginPath(); ctx.arc(L.cx, L.cy, R, 0, TAU); ctx.stroke(); } });
          ctx.setLineDash([]);
          ctx.fillStyle = COL.accent; ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const r = hb.src[i];
            if (r < hb.a || r >= hb.b) continue;
            const x = px[i], y = py[i];
            if (Math.abs(x) > rClip || Math.abs(y) > rClip) continue;
            const sx0 = X(x), sy0 = Y(y);
            ctx.moveTo(sx0 + pr + 0.3, sy0); ctx.arc(sx0, sy0, pr + 0.3, 0, TAU);
          }
          ctx.fill();
        }
        // points outside the frame: one short perpendicular tick per 4 px of frame edge, plus a count
        if (PL.clipped) {
          const e0 = X(-rClip), e1 = X(rClip), f0 = Y(rClip), f1 = Y(-rClip), seen = new Set();
          ctx.strokeStyle = COL.g400; ctx.lineWidth = 1; ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const x = px[i], y = py[i];
            if (Math.abs(x) <= rClip && Math.abs(y) <= rClip) continue;
            const s = rClip / Math.max(Math.abs(x), Math.abs(y));
            const side = Math.abs(x) >= Math.abs(y) ? (x > 0 ? 0 : 1) : (y > 0 ? 2 : 3);
            const pos = side < 2 ? Y(y * s) : X(x * s), bin = Math.round(pos / 4), key = side * 100000 + bin;
            if (seen.has(key)) continue;
            seen.add(key);
            const q = px5(bin * 4);
            if (side === 0) { ctx.moveTo(px5(e1), q); ctx.lineTo(px5(e1) + 4, q); }
            else if (side === 1) { ctx.moveTo(px5(e0), q); ctx.lineTo(px5(e0) - 4, q); }
            else if (side === 2) { ctx.moveTo(q, px5(f0)); ctx.lineTo(q, px5(f0) - 4); }
            else { ctx.moveTo(q, px5(f1)); ctx.lineTo(q, px5(f1) + 4); }
          }
          ctx.stroke();
          const os = outsideS(PL.clipped);
          text(os, outsideX(textW(os)), L.cy - b + 13, SEC, 'left', F12, true);
        }
      }

      function drawGhost(alpha) {
        // the reference N(0, I) sample: same Σ = I as the whitened cloud, different shape
        if (alpha < 0.02) return;
        ctx.globalAlpha = 0.58 * alpha;
        ctx.fillStyle = COL.g500;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const x = gx[i], y = gy[i];
          if (Math.abs(x) > 3.5 || Math.abs(y) > 3.5) continue;
          ctx.rect(X(x) - 0.75, Y(y) - 0.75, 1.5, 1.5);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const LEAD_TH = [0.35, 0.1, -0.15, -0.4, -0.65, -0.9, -1.15, -1.4, -1.65, -1.9];
      // the Σ̂ callout (steps 1–2): its two tags and their spot, lx = the leader's end, ly = the Σ̂ line
      // (the corr line sits 19 px below). The lower-left cloud label reads it to stay clear.
      function covCallout() {
        const isI = Math.abs(ST.a - 1) < 0.01 && Math.abs(ST.c - 1) < 0.01 && Math.abs(ST.b) < 0.01;
        const covSpec = isI ? '$\\hat\\Sigma = I$' : '$\\hat\\Sigma \\neq I$';
        const corrSpec = `corr ${fmt(ST.b / Math.sqrt(ST.a * ST.c), 2)}`;
        T('cov', covSpec, -999, -999, { cls: 'tag' }); T('corr', corrSpec, -999, -999, { cls: 'tag' });
        const wmax = Math.max(tw('cov'), tw('corr'));
        const bx1 = L.cx + L.box, by1 = L.cy + L.box;
        const lx = Math.min(L.cx + (L.mobile ? 1.35 : 1.9) * L.u, bx1 - 8 - 12 - wmax);
        const ly = Math.min(L.cy + 2.4 * L.u, by1 - 8 - 27) - coLift;
        return { covSpec, corrSpec, wmax, lx, ly };
      }
      let coLift = 0; // px the callout rises this frame to leave the bottom row to the gray-sample note
      function drawCovariance() {
        // live covariance contour of the displayed points (1σ), dashed; unit circle reference
        ctx.lineWidth = 1;
        const isI = Math.abs(ST.a - 1) < 0.01 && Math.abs(ST.c - 1) < 0.01 && Math.abs(ST.b) < 0.01;
        if (step <= 1) {
          const prog = step === 0 ? easeOut(seg(stepT, 0.5, 1.5)) : 1;
          ctx.strokeStyle = COL.ink; ctx.setLineDash([3, 3]);
          ellipsePath(ST, ST.mx, ST.my, prog, 1);
          ctx.setLineDash([]);
          const S2 = sqrtm(ST.a, ST.b, ST.c);
          const cpt = th => { const c = Math.cos(th), s = Math.sin(th); return [X(ST.mx + S2[0] * c + S2[1] * s), Y(ST.my + S2[1] * c + S2[2] * s)]; };
          if (prog > 0.5) for (let j = 0; j < 64; j++) { const p = cpt(j / 64 * TAU); plPt(p[0], p[1], 3); }
          // principal axes of Σ̂ (hairline) in the raw state
          const ca = Math.cos(ST.ang), sa = Math.sin(ST.ang), s1 = ST.s1, s2 = ST.s2;
          const axes = !isI && prog > 0.99;
          if (axes) {
            ctx.strokeStyle = COL.g500;
            const A = [X(ST.mx - ca * s1), Y(ST.my - sa * s1), X(ST.mx + ca * s1), Y(ST.my + sa * s1)];
            const B = [X(ST.mx + sa * s2), Y(ST.my - ca * s2), X(ST.mx - sa * s2), Y(ST.my + ca * s2)];
            line(A[0], A[1], A[2], A[3]); line(B[0], B[1], B[2], B[3]);
            plSeg(A[0], A[1], A[2], A[3], 2); plSeg(B[0], B[1], B[2], B[3], 2);
          }
          const pulse = step === 1 ? seg(stepT, 2.5, 2.8) * (1 - seg(stepT, 3.6, 4.4)) : 0;
          if (pulse > 0.01) { ctx.strokeStyle = ACC(pulse); ctx.lineWidth = 1.5; ellipsePath(ST, ST.mx, ST.my, 1, 1); ctx.lineWidth = 1; }
          if (prog > 0.99 && !figHover) {
            // callout in the frame's lower-right: kept 8 px inside the box; its dashed leader leaves the
            // contour where it crosses the fewest points, so it never reads as an arm of the cloud
            const { covSpec, corrSpec, wmax, lx, ly } = covCallout();
            // Candidate leaders from 10 points on the contour, as elbows (straight down, then across): a
            // vertical + horizontal leader can never read as a diagonal arm of the cloud. A straight leader
            // is only a fallback when no elbow fits. The elbow that crosses and runs beside the fewest points
            // wins, and keeps winning unless another is clearly better (no flicker while the cloud moves).
            const cands = [];
            LEAD_TH.forEach((th, j) => {
              const p = cpt(th);
              if (p[0] < lx - 14 && p[1] < ly - 14) cands.push({ k: 'e' + j, pts: [p[0], p[1], p[0], ly, lx, ly] });
            });
            if (!cands.length) LEAD_TH.forEach((th, j) => { const p = cpt(th); cands.push({ k: 's' + j, pts: [p[0], p[1], lx, ly] }); });
            let best = 0, bestC = Infinity, memI = -1;
            cands.forEach((cd, j) => {
              cd.c = plPathCost(cd.pts);
              if (cd.c < bestC) { bestC = cd.c; best = j; }
              if (cd.k === PL.mem.lead) memI = j;
            });
            if (memI >= 0 && cands[memI].c <= bestC * 1.3 + 2) best = memI;
            PL.mem.lead = cands[best].k;
            const lp = cands[best].pts;
            ctx.strokeStyle = COL.ink; ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(lp[0], lp[1]);
            for (let j = 2; j < lp.length; j += 2) ctx.lineTo(lp[j], lp[j + 1]);
            ctx.stroke(); ctx.setLineDash([]);
            line(lx, ly, lx + 8, ly);
            for (let j = 0; j + 3 < lp.length; j += 2) plSeg(lp[j], lp[j + 1], lp[j + 2], lp[j + 3], 2);
            T('cov', covSpec, lx + 10, ly, { c: isI ? COL.accent : COL.ink, cls: 'tag' });
            T('corr', corrSpec, lx + 10, ly + 19, { c: SEC, cls: 'tag' });
            plRect(lx, ly - 9, 14 + wmax, 38);
          }
          // σ₁ / σ₂ glyphs beyond the tips of their axes (values live in the readout), each at the
          // emptiest of a few spots: either end, pushed further out along the axis, or nudged sideways
          if (axes && !figHover) {
            [[ca, sa, s1, 'sg1', '$\\sigma_1$'], [-sa, ca, s2, 'sg2', '$\\sigma_2$']].forEach(([dx, dy, s, key, spec]) => {
              T(key, spec, -999, -999, { cls: 'tag' });
              const w = tw(key) + 1, hh = 18, cands = [];
              [1, -1].forEach((sg, e) => {
                const ux = sg * dx, uy = -sg * dy, ex = X(ST.mx + sg * dx * s), ey = Y(ST.my + sg * dy * s);
                const ext = Math.abs(ux) * w / 2 + Math.abs(uy) * hh / 2 + 5;
                [0, 14, 30].forEach((more, j) => cands.push([ex + ux * (ext + more), ey + uy * (ext + more), 'c', e * 2 + j * 3]));
                cands.push([ex + ux * ext - uy * 13, ey + uy * ext + ux * 13, 'c', 4 + e * 2]);
                cands.push([ex + ux * ext + uy * 13, ey + uy * ext - ux * 13, 'c', 4 + e * 2]);
              });
              plPlace(key, spec, cands, { c: SEC, cls: 'tag' });
            });
          }
        } else if (step === 3 || step === 4) {
          ctx.strokeStyle = COL.g300; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(L.cx, L.cy, L.u, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      function drawProbe() {
        if (step === 5 || step === 0 || sprinkle) return;
        const i = P.near >= 0 ? P.near : probe.i;
        const x = px[i], y = py[i];
        if (Math.abs(x) > 3.5 || Math.abs(y) > 3.5) return;
        const r = Math.hypot(x, y);
        const age = P.near >= 0 || api.reduced ? 1 : clamp((clockT - probe.t) / 0.35, 0, 1);
        const sx0 = X(x), sy0 = Y(y);
        // accent only on the point itself (and its tick on the r-axis); the radius leader is an ink hairline
        ctx.globalAlpha = age;
        ctx.strokeStyle = INK(0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        line(L.cx, L.cy, sx0, sy0);
        ctx.setLineDash([]);
        ctx.fillStyle = COL.accent;
        ctx.fillRect(Math.round(sx0) - 2.5, Math.round(sy0) - 2.5, 5, 5);
        ctx.globalAlpha = 1;
        PL.nPre = PL.rects.length;
        plSeg(L.cx, L.cy, sx0, sy0, 3);
        const val = step === 2 ? chiRadii(dCur)[i] : r;
        const spec = `$\\|z\\| = ${val.toFixed(2)}$`;
        if (PL.probeI !== i) { delete PL.mem.probe; PL.probeI = i; }
        if (figHover) return; // the fig. 3b card covers the cloud
        // the white box is opaque from the first frame; only the glyphs fade in, so nothing ever shows
        // through the label, and it never sits on its own leader. With no spot clear of the labels placed
        // before it (small frames), or, on a thin chi shell, none clear of the shell, the probe keeps only its
        // point and leader.
        const placed = plPlace('probe', spec, probeCands(sx0, sy0), { cls: 'tag', c: `rgba(0,0,0,${age.toFixed(2)})`, seg: [L.cx, L.cy, sx0, sy0], optional: true, maxCost: step === 2 && dCur >= 64 && P.near < 0 ? 40 : Infinity });
        // a wandering probe picked while the cloud was still moving (a step change) may have no clear spot
        // now: pick once more shortly, from the settled points
        if (!placed && P.near < 0 && probe.fresh) {
          probe.fresh = false; probe.retry = true;
          probe.t = clockT - 2.6 + Math.max(0.3, trans ? trans.dur - trans.t + 0.15 : 0) + (step === 2 && dT0 >= 0 ? Math.max(0, dT0 + 0.45 - clockT) : 0);
          if (api.reduced) probe.step = -1;
        }
      }
      // Label spots for the probe at screen (sx0, sy0): radially outward first (the empty side of a ring or
      // a cloud), then above / below, then inward. Chi shell: every point is on a thin ring with an empty
      // inside, so the label may also sit in the ring beside its leader (preferred on small frames, where a
      // label outside the ring tends to cut through it).
      function probeCands(sx0, sy0) {
        const ul = Math.hypot(sx0 - L.cx, sy0 - L.cy) || 1, dx = (sx0 - L.cx) / ul, dy = (sy0 - L.cy) / ul;
        const sg = dx >= 0 ? 1 : -1, out = sg > 0 ? 'l' : 'r', inn = sg > 0 ? 'r' : 'l';
        const c = [
          [sx0 + dx * 12 + sg * 2, sy0 + dy * 12, out],
          [sx0 + dx * 28 + sg * 2, sy0 + dy * 28, out, 3],
          [sx0 + sg * 9, sy0 - 14, out, 2],
          [sx0 + sg * 9, sy0 + 14, out, 2],
          [sx0 - sg * 9, sy0 - 14, inn, 5],
          [sx0 - sg * 9, sy0 + 14, inn, 5],
        ];
        // a point near the top or bottom: also centred straight above / below it (fits small frames)
        if (Math.abs(dy) > 0.8) c.push([sx0 + dx * 14, sy0 + dy * 14 + (dy < 0 ? -4 : 4), 'c', 1]);
        if (step === 2) {
          // (only spots whose whole box stays inside the ring's inner edge: a wide shell at small d has none)
          const ci = chiInfo(dCur), rin = (ci.mean - 2.5 * ci.sd) * Math.sqrt(2 / dCur) * L.u - 3;
          const bias = L.box < 150 ? 0 : 4, hw = ((tw('probe') || 80) + 1) / 2;
          const mx = (L.cx + sx0) / 2, my = (L.cy + sy0) / 2, off = Math.abs(dy) * (hw + 6) + Math.abs(dx) * 14;
          [[mx - dy * off, my + dx * off, 'c', bias], [mx + dy * off, my - dx * off, 'c', bias],
            [L.cx, L.cy - 14, 'c', bias + 1], [L.cx, L.cy + 14, 'c', bias + 1]].forEach(cd => {
            if (Math.hypot(Math.abs(cd[0] - L.cx) + hw, Math.abs(cd[1] - L.cy) + 9) <= rin) c.push(cd);
          });
        }
        return c;
      }
      // is some label spot of point j clear of the labels placed before the probe (last frame)? On the chi
      // shell also clear of the ring's points, so the label's box never cuts the shell (small frames).
      function probeFree(j) {
        // (the chi shell's values grow with d: judge the spots at the widest value's width)
        if (step === 2) T('probeW', '$\\|z\\| = 22.00$', -9999, -9999, { cls: 'tag' });
        const sx0 = X(px[j]), sy0 = Y(py[j]), w = Math.max(tw('probe') || 80, step === 2 ? tw('probeW') : 0) + 1, hh = 18, b = L.box;
        return probeCands(sx0, sy0).some(cd => {
          const x = cd[2] === 'r' ? cd[0] - w : cd[2] === 'c' ? cd[0] - w / 2 : cd[0], y = cd[1] - hh / 2;
          return x > L.cx - b + 3 && y > L.cy - b + 3 && x + w < L.cx + b - 3 && y + hh < L.cy + b - 3 && !plHitsRect(x, y, w, hh, PL.nPre)
            && (step !== 2 || plCost(x, y, w, hh) < 12);
        });
      }

      // Text the split flyers pass on their way to the histogram: inside these boxes they dim to a trace,
      // so no label is ever struck through. Phones: the whole band of text between the cloud and the panel.
      function flyZones() {
        // phones and portrait windows (the panel sits under the cloud): the whole band of text between them
        if (L.mobile || L.portrait) { const t = L.cy + L.box + 2; return [0, t, L.w, L.ptY + 11 - t]; }
        const b = L.box, dp = L.dp, z = [];
        z.push(L.cx + b + 3, L.cy - 10, 28, 20);                      // z₁
        z.push(X(3) - 9, L.cy + 5, 18, 16);                           // the "3" tick
        z.push(L.ox - 36, L.oy - 0.62 * dp - 9, 34, 0.44 * dp + 18);  // density ticks 0.6 · 0.4 · 0.2
        z.push(L.ox - 6, L.ptY - 11, L.pw + 12, 22);                  // panel title + target label
        z.push(L.infoX - 6, L.infoY - 6, L.w - L.infoX, L.infoB - L.infoY + 12); // readouts
        z.push(L.ox - 10, L.oy + 5, L.pw + 20, 17);                   // r ticks
        return z;
      }
      function drawSplitFlyers() {
        if (step !== 1 || splitDone) return;
        const sc = L.pw / rmaxCur, Z = flyZones(), faint = [];
        const inZ = (x, y) => { for (let j = 0; j < Z.length; j += 4) if (x >= Z[j] && x <= Z[j] + Z[j + 2] && y >= Z[j + 1] && y <= Z[j + 1] + Z[j + 3]) return true; return false; };
        ctx.fillStyle = ACC(0.7);
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const t0 = splitT[i];
          if (stepT < t0 || stepT >= t0 + 0.9) continue;
          const r = splitR[i] >= 0 ? splitR[i] : rad[i];
          const f = stepT - t0;
          let x, y;
          if (f < 0.55) {
            const th0 = Math.atan2(py[i], px[i]), e = easeSine(f / 0.55);
            let dth = -th0; dth -= Math.round(dth / TAU) * TAU;
            const th = th0 + dth * e;
            x = L.cx + Math.cos(th) * r * L.u; y = L.cy - Math.sin(th) * r * L.u;
          } else {
            const e = easeSine((f - 0.55) / 0.35);
            const x0 = L.cx + r * L.u, y0 = L.cy;
            const k = Math.floor(r / 0.2), x1 = L.ox + (k + 0.5) * 0.2 * sc, y1 = L.oy - Math.min(0.62, RH[k] || 0) * L.dp;
            x = lerp(x0, x1, e); y = lerp(y0, y1, e) - Math.sin(Math.PI * e) * 18;
          }
          if (inZ(x, y)) { faint.push(x, y); continue; }
          ctx.rect(x - 0.9, y - 0.9, 1.8, 1.8);
        }
        ctx.fill();
        if (faint.length) {
          ctx.fillStyle = ACC(0.1); ctx.beginPath();
          for (let j = 0; j < faint.length; j += 2) ctx.rect(faint[j] - 0.9, faint[j + 1] - 0.9, 1.8, 1.8);
          ctx.fill();
        }
      }

      function drawShells() {
        if (step !== 4 || !bloomArrived) return;
        const f = clockT - shown.shellsT;
        const a = seg(f, 0, 0.8) * (1 - seg(f, 2.0, 2.8));
        if (a < 0.01) return;
        ctx.strokeStyle = `rgba(0,0,0,${0.13 * a})`; ctx.lineWidth = 1;
        for (let k = 0; k < SHELLS.length; k++) { ctx.beginPath(); ctx.arc(L.cx, L.cy, SHELLS[k] * L.u, 0, TAU); ctx.stroke(); }
        // a fact about the figure (the m-spacing reason is an inference, so it is not stated). An opaque
        // HTML tag above the canvas: the points drawn later can never show through it.
        const s = L.box < 165 ? '100 circles, as in Fig. 1b' : 'Fig. 1b: points sit on 100 circles';
        T('shl', s, L.cx + L.box - 4, L.cy + L.box - 12, { a: 'r', cls: 'tag', op: a });
        if (a > 0.3) { const w = tw('shl'); plRect(L.cx + L.box - 6 - w, L.cy + L.box - 22, w + 2, 20); }
      }
      // the real optimized samples (300 of the paper's 10,000) as + markers
      function realAlpha() { return step === 4 && bloomArrived ? seg(clockT - shown.shellsT, 2.8, 3.8) : 0; }
      function drawRealSample() {
        const a = realAlpha();
        if (a < 0.01) return;
        ctx.strokeStyle = INK(0.85 * a); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < TPL.length; j += 2) {
          const x = Math.round(X(TPL[j])) + 0.5, y = Math.round(Y(TPL[j + 1])) + 0.5;
          ctx.moveTo(x - 2.5, y); ctx.lineTo(x + 2.5, y); ctx.moveTo(x, y - 2.5); ctx.lineTo(x, y + 2.5);
        }
        ctx.stroke();
        const s = L.box < 165 ? '+ 300 real pts' : '+  300 real points';
        T('rpl', s, L.cx + L.box - 4, L.cy + L.box - 12, { a: 'r', cls: 'tag', op: a });
        if (a > 0.3) { const w = tw('rpl'); plRect(L.cx + L.box - 6 - w, L.cy + L.box - 22, w + 2, 20); }
      }

      // angles uniform (32-sector TV) and both marginal kurtoses near 3
      const looksGaussian = () => ST.tv < 0.09 && Math.abs(ST.kx - 3) < 0.35 && Math.abs(ST.ky - 3) < 0.35;
      // state line in the frame's lower-left (an HTML label, so it sits above the points)
      function drawCloudLabels() {
        if (figHover) return; // the fig. 3b card's caption line runs along the frame bottom
        const b = L.box, x0 = L.cx - b + 8, yb = L.cy + b - 12;
        const v = currentParam();
        let spec = '', c = COL.ink, op = 1, maxW = 2 * b - 14;
        coLift = 0;
        // (variants, longest first: the first that fits inside the frame is shown)
        if (step === 1 && shown.ghost > 0.3) {
          // the caption fades with the gray sample it names (which dims once the polar split starts)
          c = SEC; op = clamp((shown.ghost - 0.3) / 0.45, 0, 1);
          const vs = L.mobile ? ['gray: $\\mathcal N(0, I)$, same $\\Sigma$', 'gray: $\\mathcal N(0, I)$']
            : ['gray: $\\mathcal N(0, I)$ · same $\\Sigma$, different shape', 'gray: $\\mathcal N(0, I)$, same $\\Sigma$', 'gray: $\\mathcal N(0, I)$'];
          // it shares the bottom row with the Σ̂ callout on small frames: it ends 8 px before the callout's
          // leader, in a shorter wording if need be; when even that does not fit, the callout rises a row
          const co = covCallout();
          const shared = yb - 10 < co.ly + 19 + 11, cap = shared ? co.lx - 4 - x0 : Infinity;
          const wOf = j => { T('cl_' + j, vs[j], -9999, -9999, { c, op, cls: 'tag' }); return tw('cl_' + j); };
          let j = vs.findIndex((s, k) => wOf(k) <= Math.min(maxW, cap));
          if (j < 0) {
            coLift = 19 * clamp(op * 2, 0, 1);
            j = vs.findIndex((s, k) => wOf(k) <= maxW);
            if (j < 0) j = vs.length - 1;
          }
          T('cl_' + j, vs[j], x0 - 4, yb, { c, op, cls: 'tag' });
          if (op > 0.3) plRect(x0 - 6, yb - 10, tw('cl_' + j) + 4, 20);
          return;
        } else if (step === 3 && v > 0.97) {
          if (looksGaussian()) { spec = '$\\to\\ \\mathcal N(0, I)$'; c = COL.accent; }
          else spec = L.mobile ? 'angles wrong: not Gaussian' : ['radius right · angles wrong · not Gaussian', 'angles wrong: not Gaussian'];
        } else if (step === 2) {
          const ci = chiInfo(dCur), mo = ci.mode.toFixed(2), sd = fmt(ci.sd, 2);
          spec = [`shell $\\sqrt{d-1} = ${mo}$ · width ${sd}`, `$\\sqrt{d-1} = ${mo}$ · width ${sd}`, `shell ${mo} · width ${sd}`];
        } else if (step === 4) {
          // the end state is named by the honesty tag under the frame
          spec = v > 0.99 ? '' : v > 0.01 ? 'optimizing…' : 'start: paper Fig. 1a';
        } else if (step === 5) spec = F2[f2Cur].long;
        if (!spec || op < 0.02) return;
        const vs = Array.isArray(spec) ? spec : [spec];
        let key = 'cl';
        for (let j = 0; j < vs.length; j++) {
          key = j ? 'cl_' + j : 'cl'; spec = vs[j];
          if (j === vs.length - 1) break;
          T(key, spec, -9999, -9999, { c, op, cls: 'tag' });
          if (tw(key) <= 2 * b - 14) break;
        }
        // an opaque box (not a halo): no point ever shows between the glyphs; −4 px keeps the text at x0
        T(key, spec, x0 - 4, yb, { c, op, cls: 'tag' });
        if (op > 0.3) plRect(x0 - 6, yb - 10, tw(key) + 4, 20);
      }

      function drawTag() {
        if (L.slim) return; // short phones: the honesty tag gives its line to the cloud
        const m = L.mobile, x = m ? L.cx : L.cx - L.box;
        if (m) {
          if (step === 2) { T('tag', 'portrait: random angle, radius $\\|z\\|\\sqrt{2/d}$', x, L.tagY, { a: 'c', c: SEC }); return; }
          const t = step === 4 ? 'end state Fig. 1b · path schematic'
            : step === 5 ? 'bars: paper Fig. 2a–c, Tables 1–3' : 'illustrative · 1,500 samples · live';
          text(t, x, L.tagY, SEC, 'center');
          return;
        }
        // Desktop: the step's caption (bottom left) carries the honesty note and the source ("illustrative",
        // "end state from paper Fig. 1b", "Tables 1–3"), and the chi-shell and real-feature portraits are named
        // by their eyebrow above the frame, so no note line sits under the options row (on ≤ 1100 px windows it
        // shared the caption's first line). One case keeps it: a portrait window's Real features step, whose
        // cloud has Chart C right above it instead of an eyebrow.
        if (!(L.portrait && step === 5 && !chartCInCloud())) return;
        noteAt('tag', ['portrait: lengths from Fig. 2 · angles illustrative', 'lengths from Fig. 2 · angles illustrative', 'angles illustrative'], x, L.tagY, SEC, L.tagMax);
      }
      // Steps without marginals (Chi shell, Real features) title their panel in the p(z₁) row above the frame,
      // in the shared eyebrow style (as the histogram's): what the portrait shows, and how it is drawn.
      // (Not when Chart C takes the cloud's place, nor on a portrait window, where Chart C sits right above.)
      const hasEyebrow = () => !L.mobile && (step === 2 || (step === 5 && !chartCInCloud() && !L.portrait));
      function drawPanelEyebrow() {
        if (!hasEyebrow()) return;
        const vs = step === 2
          ? ['PORTRAIT OF $\\mathcal N(0, I_d)$: RANDOM ANGLE, RADIUS $\\|z\\|\\sqrt{2/d}$', 'PORTRAIT OF $\\mathcal N(0, I_d)$ · RADIUS $\\|z\\|\\sqrt{2/d}$', 'PORTRAIT OF $\\mathcal N(0, I_d)$']
          : ['FEATURE LENGTHS $\\|z\\|$ FROM FIG. 2 · ANGLES ILLUSTRATIVE', 'LENGTHS $\\|z\\|$ FROM FIG. 2 · ILLUSTRATIVE', 'LENGTHS FROM FIG. 2'];
        // (it takes over from the fading p(z₁) label at the same spot)
        noteAt('peb', vs, L.cx - L.box, L.cy - L.box - 13 - L.margH, SEC, L.cx + L.box, 'eyb', clamp(1 - 1.6 * shown.marg, 0, 1));
      }

      /* ---------------- R-panel: radius histogram vs χ curve */
      // Toy step: Fig. 1c (Chart A) is the step's result. It lives in the readout block when that is tall
      // enough, else (phones, ~1024 px windows) it takes the histogram's place, so it never disappears.
      const chartAInPanel = () => L.mobile || L.infoB - L.infoY < 92;
      // Real features: Chart C (Tables 1–3) is the step's result. It sits in the readout block (its top 8 px
      // closer to the head on this step) when that holds its four benchmark rows; else (≈ 900 px windows) it
      // takes the cloud's place, top-aligned with the formula (layout: L.c6), as on phones (that portrait is
      // illustrative). Portrait windows (iPad) make the room under the head by shrinking the cloud frame on
      // this step (portraitView).
      const infoTop = () => L.infoY - (step === 5 && !L.mobile && !L.portrait && L.infoB - L.infoY < ccdNeed(ccdGeom(L.infoW)) ? 8 : 0);
      const chartCInCloud = () => L.mobile || (L.portrait ? !L.cc6 : L.cc6side);
      function drawRPanel() {
        hoverLine = '';
        if (step === 4 && chartAInPanel()) {
          if (L.mobile) { drawChartA(16, L.ptY - 4, L.oy + 22, L.w - 32 - 134); return; }
          const short = L.infoW < 340;
          drawChartA(L.ox, L.ptY - 4, L.oy + 22, Math.min(L.pw, L.w - 40 - L.ox - 34 - 10 - (short ? 92 : 142)));
          return;
        }
        const rmax = rmaxCur, sc = L.pw / rmax, dp = L.dp;
        const RX = r => L.ox + r * sc, RY = d => L.oy - d * dp;
        ctx.lineWidth = 1;
        const dNow = step === 2 ? dCur : step === 5 ? 512 : 2;
        const sub = `\\chi_{${dNow}}`;
        // until the first sample lands the panel only holds the target curve, and says so
        const empty = shown.hist < 0.5 || (step === 1 && !splitDone && splitCount === 0);
        if (empty) T('rpt0', `target $${sub}$`, L.ox, L.ptY, { c: COL.accent, cls: 'big' });
        else {
          // panel eyebrow (shared style) on the left, the blue target key on the right
          T('rpg', `target $${sub}$`, L.ox + L.pw, L.ptY, { a: 'r', c: COL.accent, cls: 'big' });
          noteAt('rpt', ['HISTOGRAM OF $\\|z\\|$', 'HISTOGRAM'], L.ox, L.ptY, SEC, L.ox + L.pw - tw('rpg') - 12, 'eyb');
        }
        // axes
        ctx.strokeStyle = COL.ink;
        line(px5(L.ox), px5(L.oy), px5(L.ox + L.pw), px5(L.oy));
        ctx.strokeStyle = COL.g300; line(px5(L.ox), px5(L.oy), px5(L.ox), px5(L.oy - 0.66 * dp));
        // ticks
        const tStep = rmax <= 7 ? 1 : rmax <= 27 ? 5 : 10;
        ctx.strokeStyle = COL.ink;
        for (let r = 0; r <= rmax + 1e-6; r += tStep) {
          const x = px5(RX(r)); line(x, px5(L.oy), x, px5(L.oy) + 3);
          text(String(r), x, L.oy + 13, TICK, 'center', F11);
        }
        if (!L.mobile) T('rax', '$r = \\|z\\|$', L.ox + L.pw + 18, L.oy + 13, { c: SEC });
        // density tick numbers; one that would meet the cloud frame's corner crosses or the z₁ label (narrow
        // windows, where the panel sits close to the frame) is left out
        const besideFrame = !L.portrait && L.ox - 30 < L.cx + L.box + 8;
        [0.2, 0.4, 0.6].forEach(d => {
          const y = px5(RY(d)); ctx.strokeStyle = COL.g300; line(px5(L.ox) - 3, y, px5(L.ox), y);
          const hit = besideFrame && [L.cy - L.box, L.cy, L.cy + L.box].some(fy => Math.abs(y - fy) < 13);
          if (!L.mobile && !hit) text(d.toFixed(1), L.ox - 7, y, TICK, 'right', F11);
        });

        // histogram
        let binW = 0.2, nb = 0;
        if (step === 5) {
          binW = F2_W; nb = F2_BINS;
          const e = easeSine(seg(clockT - f2T0, 0, 0.9));
          const A1 = f2Dens[f2Prev], B1 = f2Dens[f2Cur];
          for (let k = 0; k < nb; k++) RH[k] = lerp(A1[k], B1[k], e);
        } else if (step === 2) {
          binW = 0.5; nb = histFromRadii(chiRadii(dCur), binW, rmax);
          if (dT0 >= 0 && clockT - dT0 < 0.32) {
            const e = easeSine(seg(clockT - dT0, 0, 0.32)), r0 = chiRadii(dPrev), r1 = chiRadii(dCur), tmp = new Float64Array(N);
            for (let i = 0; i < N; i++) tmp[i] = lerp(r0[i], r1[i], e);
            nb = histFromRadii(tmp, binW, rmax);
          }
        } else if (step === 1 && !splitDone) {
          binW = 0.2; nb = histFromRadii(splitR, binW, 5.6, splitA);
        } else {
          binW = 0.2; nb = histFromRadii(rad, binW, 5.6);
        }
        const hAlpha = shown.hist;
        const cap = 0.62;
        if (hAlpha > 0.01 && nb > 0) {
          ctx.globalAlpha = hAlpha;
          ctx.fillStyle = COL.g100; ctx.strokeStyle = INK(0.8);
          ctx.beginPath(); ctx.moveTo(RX(0), L.oy);
          let last = 0;
          for (let k = 0; k < nb; k++) {
            const x0 = RX(k * binW), x1 = RX((k + 1) * binW);
            if (x0 > L.ox + L.pw) break;
            const hgt = Math.min(cap, RH[k]);
            ctx.lineTo(x0, RY(hgt)); ctx.lineTo(Math.min(x1, L.ox + L.pw), RY(hgt));
            last = Math.min(x1, L.ox + L.pw);
          }
          ctx.lineTo(last, L.oy); ctx.closePath(); ctx.fill(); ctx.stroke();
          // clipped bars: a tick on each; the tallest value sits clear of the last clipped bar
          let kMax = -1, kLast = -1;
          ctx.strokeStyle = COL.ink;
          for (let k = 0; k < nb; k++) {
            if (RH[k] <= cap) continue;
            const xm = px5(RX((k + 0.5) * binW));
            line(xm, RY(cap) - 5, xm, RY(cap) - 1);
            if (kMax < 0 || RH[k] > RH[kMax]) kMax = k;
            kLast = k;
          }
          // (phones: 2 px lower, clear of the panel eyebrow right above it)
          if (kMax >= 0 && hAlpha > 0.3) T('clip', `$\\uparrow$ ${fmt(RH[kMax], 1)}`, Math.min(RX((kLast + 1) * binW), L.ox + L.pw) + 10, RY(cap) - (L.mobile ? 1 : 3), { c: COL.ink, op: hAlpha });
          // hovered bin
          if (P.bin >= 0 && P.bin < nb) {
            const x0 = RX(P.bin * binW), x1 = RX((P.bin + 1) * binW);
            ctx.fillStyle = ACC(0.14); ctx.fillRect(x0, RY(cap), x1 - x0, L.oy - RY(cap));
            ctx.strokeStyle = COL.accent; ctx.strokeRect(px5(x0), px5(RY(Math.min(cap, RH[P.bin]))), Math.round(x1 - x0), Math.round(Math.min(cap, RH[P.bin]) * dp));
          }
          ctx.globalAlpha = 1;
        }
        // target curve(s): the blue one is the current target (named by the title); gray ones are earlier d
        if (step === 2) {
          ctx.strokeStyle = COL.g300; ctx.lineWidth = 1;
          visitedD.forEach(d => { if (d !== dCur) chiCurve(d, rmax, RX, RY, 1); });
        }
        ctx.strokeStyle = COL.accent; ctx.lineWidth = 1.5;
        const drawProg = step === 0 ? easeOut(seg(stepT, 0.2, 1.4)) : 1;
        chiCurve(dNow, rmax, RX, RY, drawProg);
        ctx.lineWidth = 1;
        // probe marker on the axis
        if (step !== 0 && step !== 5 && !sprinkle) {
          const i = P.near >= 0 ? P.near : probe.i;
          const r = step === 2 ? chiRadii(dCur)[i] : rad[i];
          if (r <= rmax) { ctx.fillStyle = COL.accent; ctx.fillRect(Math.round(RX(r)) - 0.5, L.oy - 7, 1.5, 7); }
        }
        // one-line note under the axis (desktop; on phones the slider sits right below the panel)
        const noteY = L.oy + 34;
        let binMsg = '';
        if (P.bin >= 0 && P.bin < nb && hAlpha > 0.5) {
          const a = P.bin * binW, bb = (P.bin + 1) * binW;
          if (step === 5) binMsg = `$r \\in [${a.toFixed(2)}, ${bb.toFixed(2)})$ · density ${fmt(RH[P.bin], 3)}`;
          else {
            const cnt = Math.round(RH[P.bin] * N * binW);
            if (dNow === 2) binMsg = `$r \\in [${a.toFixed(1)}, ${bb.toFixed(1)})$: ${cnt} pts · $\\chi_2$ expects ${Math.round(N * (Math.exp(-a * a / 2) - Math.exp(-bb * bb / 2)))}`;
            else binMsg = `$r \\in [${a.toFixed(1)}, ${bb.toFixed(1)})$: ${cnt} pts`;
          }
        }
        hoverLine = L.mobile ? binMsg : '';
        if (!L.mobile && binMsg) T('rnote', binMsg, L.ox, noteY, { c: COL.accent });
        else if (!L.mobile) {
          if (step === 0) noteAt('rnote', '$\\|z\\|$ of $z \\sim \\mathcal N(0, I_2)$ follows $\\chi_2$', L.ox, noteY);
          else if (step === 2) noteAt('rnote', ['spherical $+\\ \\chi_d$ radius $\\Rightarrow\\ \\mathcal N(0, I)$ · Lemma 2', 'spherical $+\\ \\chi_d$ radius $\\Rightarrow\\ \\mathcal N(0, I)$'], L.ox, noteY);
          else if (step === 5) noteAt('rnote', `$W_1(\\|z\\|, \\chi_{512}) = ${F2[f2Cur].w1.toFixed(2)}$`, L.ox, noteY, COL.ink);
          // the toy's end radii ARE the Fig. 1b shell radii, so the match is by construction: say so
          else if (step === 4) {
            // the payoff (W₁) in blue; why it matches Fig. 1b in gray after it
            T('rnote', `$W_1(\\|z\\|, \\chi_2) = ${ST.w1.toFixed(3)}$`, L.ox, noteY, { c: ST.w1 < 0.03 ? COL.accent : COL.ink });
            noteAt('rnote2', ['· radii from Fig. 1b’s 100 circles', '· radii from Fig. 1b'], L.ox + tw('rnote') + 8, noteY);
          }
          else if (step === 1 && !splitDone && stepT > SPLIT0 - 0.2) noteAt('rnote', 'each sample drops its $\\|z\\|$ here', L.ox, noteY);
          else if ((step === 1 && splitDone) || step === 3) noteAt('rnote', 'hover a bar to find its points', L.ox, noteY);
        }
      }
      // A note (or a list of variants, longest first): the first that fits before the right edge is drawn,
      // none if none fits. KaTeX variants are measured once off-screen, then cached.
      // `cls` (an overlay class, e.g. 'eyb') sends plain variants to the overlay too.
      // right edge for a note on line y: never past the chrome's gutter (40 px on desktop, 16 px on phones),
      // and never under the scene's links, bottom-right
      function noteRight(y, maxX) {
        let right = Math.min(maxX || Infinity, L.w - (L.mobile ? 16 : 40));
        const lb = L.linkBox;
        if (lb && y + 9 > lb.top && y - 9 < lb.bottom) right = Math.min(right, lb.left - 14);
        return right;
      }
      // does the shortest variant of a note fit at (x, y)? (measured as noteAt measures it)
      function noteFits(key, variants, x, y, cls) {
        const vs = Array.isArray(variants) ? variants : [variants];
        const j = vs.length - 1, s = vs[j], k = j ? key + '_' + j : key;
        let w;
        if (cls || s.indexOf('$') >= 0) { T(k, s, -9999, -9999, { c: SEC, cls }); w = tw(k); } else w = textW(s);
        return x + w <= noteRight(y);
      }
      function noteAt(key, variants, x, y, c, maxX, cls, op) {
        const vs = Array.isArray(variants) ? variants : [variants];
        const right = noteRight(y, maxX);
        if (op != null && op < 0.02) return false;
        for (let j = 0; j < vs.length; j++) {
          const s = vs[j], k = j ? key + '_' + j : key, isTex = !!cls || s.indexOf('$') >= 0;
          let w;
          if (isTex) { T(k, s, -9999, -9999, { c: c || SEC, cls }); w = tw(k); } else w = textW(s);
          if (x + w <= right) {
            if (isTex) T(k, s, x, y, { c: c || SEC, cls, op }); else text(s, x, y, c || SEC);
            return true;
          }
        }
        return false;
      }
      function chiCurve(d, rmax, RX, RY, prog) {
        const ci = chiInfo(d), lo = Math.max(0, ci.mode - 6), hi = Math.min(rmax, ci.mode + 6), n = 120;
        const end = lo + (hi - lo) * prog;
        ctx.beginPath();
        for (let j = 0; j <= n; j++) {
          const r = lo + (end - lo) * (j / n), y = RY(chiPdf(r, d, ci.lc));
          j ? ctx.lineTo(RX(r), y) : ctx.moveTo(RX(r), y);
        }
        ctx.stroke();
      }

      /* ---------------- readouts (right column on desktop; one line under the cloud on phones) */
      function drawReadouts() {
        if (L.mobile) { drawMobileReadout(); return; }
        const x = L.infoX, rh = L.row, top = infoTop(), bottom = L.infoB;
        const vx = x + 142, nx = x + 250;
        let yTop = top;
        // Values stay ink; one that has reached its target gets a small accent dot. Blue is kept for the χ
        // target and the one payoff label of each step. Notes: each in the longest wording that fits, and all
        // or none: when one row's shortest note doesn't fit, the column has no notes (a lone note beside the
        // table reads as a stray label).
        let notesOn = true;
        const row = (key, label, value, reached, note) => {
          const y = yTop + rh / 2;
          if (label.indexOf('$') >= 0) T('rl' + key, label, x, y, { c: SEC }); else text(label, x, y, SEC);
          text(value, vx, y, COL.ink);
          if (reached) { ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.arc(vx - 8, y, 2.5, 0, TAU); ctx.fill(); }
          if (note && notesOn) noteAt('rn' + key, note, nx, y);
          yTop += rh;
        };
        // keep the rows that fit, dropping the lowest priority first; draw them in their natural order.
        // A row's `n` is its note (its longest possible wording when that changes with the state).
        const fit = rows => {
          const keep = rows.slice();
          let tot = keep.reduce((s, r) => s + r.h, 0);
          while (tot > bottom - top && keep.length > 0) {
            let lo = 0;
            keep.forEach((r, i) => { if (r.p < keep[lo].p) lo = i; });
            tot -= keep[lo].h; keep.splice(lo, 1);
          }
          let y = top;
          notesOn = keep.every(r => { const ok = !r.n || noteFits(r.k + '~', r.n, nx, y + (r.ny || rh / 2)); y += r.h; return ok; });
          keep.forEach(r => r.d());
        };
        if (step === 2) {
          const ci = chiInfo(dCur);
          fit([
            { h: rh, p: 3, d: () => row('d', 'dimension $d$', String(dCur), false) },
            { h: rh, p: 5, k: 'mo', n: 'where $\\|z\\|$ peaks', d: () => row('mo', 'mode $\\sqrt{d-1}$', fmt(ci.mode, 2), false, 'where $\\|z\\|$ peaks') },
            { h: rh, p: 4, k: 'ms', n: 'width stays $O(1)$', d: () => row('ms', 'mean · sd', `${fmt(ci.mean, 2)} · ${fmt(ci.sd, 2)}`, false, 'width stays $O(1)$') },
            { h: rh, p: 2, k: 'rel', n: 'relative width $\\to 0$', d: () => row('rel', 'sd / mean', fmt(ci.sd / ci.mean, 3), false, 'relative width $\\to 0$') },
          ]);
          return;
        }
        if (step === 5) {
          if (chartCInCloud()) return;
          // portrait: the slot the shrinking frame opens under the head (drawn once the frame is nearly there)
          if (L.portrait) { if (shown.v6 > 0.85) drawChartCD(x, top, top + L.cc6H, L.infoW); }
          else drawChartCD(x, top, bottom, L.infoW);
          return;
        }
        // the toy experiment: the paper's Fig. 1c gets the whole block (W₁ sits under the histogram,
        // kurtosis on the marginals); when the block is short, Fig. 1c takes the panel and W₁ comes here
        if (step === 4) {
          if (!chartAInPanel()) { drawChartA(x, top + 2, bottom, Math.min(L.infoW - 150, 250)); return; }
          if (bottom - top < rh) return; // no room under the head: the chart in the panel carries the step
          const w = fmt(ST.w1, 3);
          T('rlw1', '$W_1(\\|z\\|, \\chi_2)$', x, yTop + rh / 2, { c: SEC });
          text(w, vx, yTop + rh / 2, ST.w1 < 0.03 ? COL.accent : COL.ink);
          noteAt('rnw1', ['· radii from Fig. 1b', '· Fig. 1b radii'], vx + textW(w) + 10, yTop + rh / 2);
          return;
        }
        const v = currentParam();
        const whiteOK = Math.abs(ST.a - 1) < 0.01 && Math.abs(ST.c - 1) < 0.01 && Math.abs(ST.b) < 0.01;
        const nearI = Math.abs(ST.a - 1) < 0.06 && Math.abs(ST.c - 1) < 0.06 && Math.abs(ST.b) < 0.06;
        const vcOK = ST.v < 5e-4 && ST.cz < 5e-4;
        const kOK = Math.abs(ST.kx - 3) < 0.2 && Math.abs(ST.ky - 3) < 0.2;
        const sgOK = Math.abs(ST.s1 - 1) < 0.01 && Math.abs(ST.s2 - 1) < 0.01;
        const showR = step !== 0 && (step !== 1 || splitDone);
        const tIn = step === 1 ? easeOut(seg(stepT, SPLIT0 + 3.4, SPLIT0 + 4.1)) : 1;
        const w1 = showR ? fmt(ST.w1 * tIn, 3) : '—', ls = showR ? fmt(ST.loss * tIn, 3) : '—';
        const rOK = showR && ST.w1 < 0.01;
        const rows = [];
        // step 1 shows Σ̂ live in its key formula; later steps keep it here (in ink: the matrix is not a verdict)
        if (step !== 0) rows.push({ h: 46, p: 9, k: 'sig', n: 'near identity (noise)', ny: 20, d: () => {
          const y = yTop + 20;
          T('sig', `$\\hat\\Sigma = ${matTex()}$`, x, y, { c: COL.ink });
          // while the whitening or the radius map is still animating, the gap from I is the interpolation,
          // not sampling noise
          const mid = (step === 1 || step === 3) && v > 0.01 && v < 0.99;
          const corr = Math.abs(ST.b) / Math.sqrt(ST.a * ST.c), aniso = ST.s1 / Math.max(ST.s2, 1e-6);
          if (notesOn) noteAt('rnsig', whiteOK ? 'identity: whitened' : nearI ? (mid ? 'near identity' : 'near identity (noise)')
            : corr > 0.1 || aniso > 1.12 ? 'correlated, stretched' : 'isotropic, not unit', nx, y);
          yTop += 46;
        } });
        // what each step is about keeps its row when the column is short (step 1: σ; step 2: VCReg terms → 0).
        // Step 1 has no histogram yet, so no radius rows either (fewer, larger words on the opening frame).
        const pr = step === 0 ? { vc: 6, ku: 5 } : step === 1 ? { vc: 8, ku: 2, w1: 7, rl: 6 } : { vc: 4, ku: 3, w1: 7, rl: 6 };
        if (step <= 1) rows.push({ h: rh, p: step === 0 ? 8 : 3, k: 'sg', n: 'principal axes of $\\hat\\Sigma$', d: () => row('sg', '$\\sigma_1\\,\\cdot\\,\\sigma_2$', `${fmt(ST.s1, 2)} · ${fmt(ST.s2, 2)}`, sgOK, 'principal axes of $\\hat\\Sigma$') });
        rows.push(
          { h: rh, p: pr.vc, k: 'vc', n: 'VCReg terms, Eq. 1', d: () => row('vc', '$v(Z)\\,\\cdot\\,c(Z)$', `${fmt(ST.v, 3)} · ${fmt(ST.cz, 3)}`, vcOK, 'VCReg terms, Eq. 1') },
          { h: rh, p: pr.ku, k: 'ku', n: 'a Gaussian has 3', d: () => row('ku', 'kurtosis', `${fmt(ST.kx, 2)} · ${fmt(ST.ky, 2)}`, kOK, 'a Gaussian has 3') },
        );
        if (step !== 0) rows.push(
          { h: rh, p: pr.w1, k: 'w1', n: 'radius vs. chi law', d: () => row('w1', '$W_1(\\|z\\|, \\chi_2)$', w1, rOK, 'radius vs. chi law') },
          // the m-spacing entropy estimate is biased at finite N: an exact χ₂ sample still scores ≈ 0.05
          { h: rh, p: pr.rl, k: 'rl', n: 'Eq. 7', d: () => row('rl', 'radial loss $r(Z)$', ls, false, [`Eq. 7 · $\\approx 0$ up to estimator bias`, `Eq. 7, $m = ${M_SP}$`, 'Eq. 7']) },
        );
        fit(rows);
      }
      function drawMobileReadout() {
        if (L.slim) return; // short phones: no readout row (the cloud keeps its size)
        const y = L.infoY + L.row / 2, x = L.infoX;
        // one line, in ink: the step's payoff (Σ̂ = I, → N(0, I)) is named in blue inside the cloud already
        let spec, col = COL.ink;
        if (hoverLine) { spec = hoverLine; col = COL.accent; }
        else if (step === 2) { const ci = chiInfo(dCur); spec = `$d = ${dCur}$ · mode $\\sqrt{d-1} = ${ci.mode.toFixed(2)}$ · sd ${fmt(ci.sd, 2)}`; }
        else if (step === 4) {
          // the payoff in blue, the reason in gray after it
          T('mro', `$W_1(\\|z\\|, \\chi_2) = ${ST.w1.toFixed(3)}$`, x, y, { c: ST.w1 < 0.03 ? COL.accent : COL.ink });
          noteAt('mro2', ['· radii from Fig. 1b', ''], x + tw('mro') + 8, y);
          return;
        }
        else if (step === 5) spec = `$W_1(\\|z\\|, \\chi_{512}) = ${F2[f2Cur].w1.toFixed(2)}$`;
        else if (step === 0 || (step === 1 && !splitDone)) spec = `$\\hat\\Sigma$: variances ${fmt(ST.a, 2)}, ${fmt(ST.c, 2)} · corr ${fmt(ST.b / Math.sqrt(ST.a * ST.c), 2)}`;
        else spec = `$W_1(\\|z\\|, \\chi_2) = ${ST.w1.toFixed(3)}$ · $r(Z) = ${ST.loss.toFixed(3)}$`;
        T('mro', spec, x, y, { c: col });
      }

      /* ---------------- Chart A (Fig. 1c): title at `top`, x labels end near `bottom` */
      function drawChartA(lx, top, bottom, w) {
        const x0 = lx + 34, y0 = top + 24, hgt = clamp(bottom - y0 - 22, 44, 130), yb = y0 + hgt;
        const CX = a => x0 + a * w, CY = W => yb - (W - 0.1) / 0.6 * hgt;
        ctx.lineWidth = 1;
        const pr = seg(stepT, 1.6, 5.6), hot = P.col >= 0 && pr > 0.99 ? P.col : -1;
        // the hovered α's three values, shortest wording that stays inside the gutter
        if (hot >= 0) {
          const al = CA.alpha[hot], dv = CA.data[hot].toFixed(3), vv = CA.vcreg[hot].toFixed(3), rv = CA.radial[hot].toFixed(3);
          noteAt('cath', [`$\\alpha = ${al}$: data ${dv} · VCReg ${vv} · Radial ${rv}`, `$\\alpha = ${al}$: VCReg ${vv} · Radial ${rv}`, `$\\alpha$ ${al} · ${vv} · ${rv}`], lx, top + 6, COL.accent);
        }
        // panel eyebrow (shared style): the longest wording that fits the chart's width
        else noteAt('cat', ['DISTANCE $W$ TO $\\mathcal N(0, I)$ VS. MIXTURE $\\alpha$ · FIG. 1C', 'FIG. 1C · $W$ TO $\\mathcal N(0, I)$ VS. $\\alpha$', 'FIG. 1C'], lx, top + 6, SEC, x0 + w + (L.mobile ? 134 : 150), 'eyb');
        ctx.strokeStyle = COL.ink; line(px5(x0), px5(yb), px5(x0 + w), px5(yb));
        ctx.strokeStyle = COL.g300; line(px5(x0), px5(yb), px5(x0), px5(y0));
        (hgt < 72 ? [0.1, 0.4, 0.7] : [0.1, 0.3, 0.5, 0.7]).forEach(W => { const y = px5(CY(W)); ctx.strokeStyle = COL.g300; line(px5(x0) - 3, y, px5(x0), y); text(W.toFixed(1), x0 - 7, y, TICK, 'right', F11); });
        [0, 0.5, 1].forEach(a => { const x = px5(CX(a)); ctx.strokeStyle = COL.ink; line(x, px5(yb), x, px5(yb) + 3); text(String(a), x, yb + 13, TICK, 'center', F11); });
        T('caa', '$\\alpha$', x0 + w + 12, yb + 1, { c: SEC });
        const short = L.mobile || L.infoW < 340;
        const series = [[CA.data, COL.g500, [2, 2], 'o'], [CA.vcreg, COL.ink, [], 's'], [CA.radial, COL.accent, [], 't']];
        series.forEach(([arr, col, dash, mk], s) => {
          const p = clamp(pr * 3 - s, 0, 1);
          if (p <= 0) return;
          const nPts = arr.length, upto = p * (nPts - 1);
          ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.lineWidth = s === 2 ? 1.5 : 1;
          ctx.beginPath();
          for (let j = 0; j <= Math.floor(upto); j++) { const x = CX(CA.alpha[j]), y = CY(arr[j]); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          const jf = Math.floor(upto);
          if (jf < nPts - 1) { const f = upto - jf; ctx.lineTo(lerp(CX(CA.alpha[jf]), CX(CA.alpha[jf + 1]), f), lerp(CY(arr[jf]), CY(arr[jf + 1]), f)); }
          ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
          for (let j = 0; j <= jf; j++) {
            const x = CX(CA.alpha[j]), y = CY(arr[j]);
            ctx.fillStyle = COL.bg; ctx.strokeStyle = col;
            ctx.beginPath();
            if (mk === 'o') ctx.arc(x, y, 2.5, 0, TAU);
            else if (mk === 's') ctx.rect(x - 2.5, y - 2.5, 5, 5);
            else { ctx.moveTo(x, y - 3.2); ctx.lineTo(x + 3, y + 2.2); ctx.lineTo(x - 3, y + 2.2); ctx.closePath(); }
            ctx.fill(); ctx.stroke();
          }
          if (p >= 1) {
            const ex = CX(CA.alpha[nPts - 1]) + 10;
            if (s === 1) text(short ? `VCReg ${arr[nPts - 1].toFixed(3)}` : `VCReg · data  ${arr[nPts - 1].toFixed(3)}`, ex, CY(arr[nPts - 1]), COL.ink);
            if (s === 2) text(short ? `Radial ${arr[nPts - 1].toFixed(3)}` : `Radial-VCReg  ${arr[nPts - 1].toFixed(3)}`, ex, CY(arr[nPts - 1]), COL.accent);
          }
        });
        if (hot >= 0) { const x = px5(CX(CA.alpha[hot])); ctx.strokeStyle = COL.accent; ctx.setLineDash([2, 2]); line(x, y0 - 4, x, yb); ctx.setLineDash([]); }
        L.chartA = { x0, w, y0, yb, CX };
      }

      /* ---------------- Chart C (Tables 1–3): Top-1 gain over VICReg */
      // Phones: grouped rows by projector width d, drawn over the cloud's area (all nine runs).
      function drawChartC(x, top, bottom, width) {
        const m = L.mobile || width < 360, rh = 17;
        const labW = m ? 146 : 188, ppx = Math.min(62, (width - labW - 60) / 2), bx0 = x + labW;
        const full = bottom - top - 26 >= (CC.length + 3) * rh + 8;
        const fitRows = clamp(Math.floor((bottom - top - 30 - (L.mobile ? 0 : 20)) / rh) + 1, 0, 4);
        if (!full && fitRows < 2) { L.chartC = { ys: [], x, w: 0 }; return; }
        const hotRow = P.row >= 0 && P.row < CC.length ? CC[P.row] : null;
        if (hotRow) T('ccth', `Top-1 %: VICReg ${hotRow[3].toFixed(2)} $\\to$ Radial ${hotRow[4].toFixed(2)}`, x, top + 6, { c: COL.accent });
        else noteAt('cctm', full ? ['TOP-1 GAIN OVER VICREG, PP · TABLES 1–3', 'TOP-1 GAIN OVER VICREG, PP'] : ['TOP-1 GAIN OVER VICREG AT $d = 512$, PP', 'TOP-1 GAIN AT $d = 512$, PP'], x, top + 6, SEC, x + width, 'eyb');
        const nRows = full ? CC.length : fitRows;
        const shownRows = clamp(Math.floor((stepT - 1.4) / 0.508) + 1, 0, nRows);
        const y0 = top + 30;
        const yEnd = y0 + (nRows - 1 + (full ? 3 : 0)) * rh + (full ? 8 : 0);
        ctx.lineWidth = 1; ctx.strokeStyle = COL.g200; ctx.setLineDash([1, 3]);
        [1, 2].forEach(k => { const xx = px5(bx0 + k * ppx); line(xx, y0 - 8, xx, yEnd + 8); });
        ctx.setLineDash([]); ctx.strokeStyle = COL.g300;
        line(px5(bx0), y0 - 8, px5(bx0), yEnd + 8);
        let y = y0, lastD = 0;
        const ys = [];
        for (let k = 0; k < shownRows; k++) {
          const [lab, labS, d, , , g] = CC[k];
          if (full && d !== lastD) {
            if (lastD) y += 4;
            T('ccd' + d, `$d = ${d}$`, x, y, { c: d === 512 ? COL.accent : SEC });
            y += rh; lastD = d;
          }
          const d512 = d === 512, col = d512 ? COL.accent : SEC, hot = P.row === k;
          text(m ? labS : lab, x, y, hot ? COL.accent : d512 ? COL.ink : SEC);
          const age = clamp((stepT - 1.4 - k * 0.508) / 0.35, 0, 1);
          const bx1 = bx0 + g * ppx * easeOut(age);
          ctx.strokeStyle = col; ctx.lineWidth = d512 ? 1.5 : 1;
          line(bx0, px5(y), Math.max(bx0 + 0.5, bx1), px5(y));
          ctx.lineWidth = 1;
          ctx.fillStyle = col; ctx.fillRect(Math.round(bx1) - 1.5, Math.round(y) - 1.5, 3, 3);
          text(`+${g.toFixed(2)}`, bx1 + 8, y, col);
          ys.push({ k, y });
          y += rh;
        }
        if (!full && nRows === 4 && shownRows >= nRows) T('ccn', 'gains shrink at $d = 2048$ and $8192$', x, y + 3, { c: SEC });
        L.chartC = { ys, x, w: labW + 2 * ppx + 60 };
      }
      // Desktop: paired lollipops from zero per benchmark. Blue = d 512, gray = d 2048, so each bar's length
      // is that run's Top-1 gain (as on the phone chart) and the gray one shows the gain shrinking at the
      // wider projector. Then the single d = 8192 run. Rows arrive one per beat in table order: the four
      // d = 512 gains, the four d = 2048 gains, then d = 8192.
      const DB_LAB = ['CIFAR-100 · RN18', 'CIFAR-100 · ViT-Tiny', 'ImageNet-10 · RN18', 'CIFAR-100 · MLP probe'];
      function lolli(xa, xb, y, blue) {
        const yy = px5(y);
        if (blue) {
          ctx.strokeStyle = COL.accent; ctx.lineWidth = 1.5; line(xa, yy, xb, yy); ctx.lineWidth = 1;
          ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.arc(xb, yy, 3, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = COL.g500; line(xa, yy, xb, yy);
          ctx.fillStyle = COL.bg; ctx.strokeStyle = SEC; ctx.beginPath(); ctx.arc(xb, yy, 2.5, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      // Chart C's horizontal geometry for a width (memoized per layout pass): widths: full labels and both
      // value columns; else short labels; else the d = 512 values only (the gray lollipops stay, and a row
      // hover gives every number). The legend sits at the right end of the title line when both fit.
      const CC_TITLE = 'TOP-1 GAIN OVER VICREG, PP';
      const ccdMemo = new Map();
      function ccdGeom(width) {
        const key = Math.round(width);
        if (ccdMemo.pass !== layoutPass) { ccdMemo.clear(); ccdMemo.pass = layoutPass; }
        let g = ccdMemo.get(key);
        if (g) return g;
        const valW = textW('+0.00'), labMax = arr => Math.max.apply(null, arr.map(s => textW(s)));
        const need = (lw, both) => lw + 2 * 36 + 16 + valW + (both ? 14 + valW : 0) + 2;
        let labs = DB_LAB, labW = labMax(DB_LAB) + 14, both = true;
        if (need(labW, true) > width) { labs = CC.slice(0, 4).map(r => r[1]); labW = labMax(labs) + 14; }
        if (need(labW, true) > width) both = false;
        const ppx = clamp((width - (labW + 16 + valW + (both ? 14 + valW : 0) + 2)) / 2, 26, 52);
        const xr0 = labW + 2 * ppx + 16 + valW + (both ? 14 + valW : 0);   // the chart's width
        T('ccl1', '$d = 512$', -9999, -9999, { c: COL.ink }); T('ccl2', '$d = 2048$', -9999, -9999, { c: SEC });
        T('cctt', CC_TITLE, -9999, -9999, { c: SEC, cls: 'eyb' });   // panel eyebrow (shared style)
        T('ccts', CC_TITLE_S, -9999, -9999, { c: SEC, cls: 'eyb' });
        const legW = 20 + tw('ccl1') + 16 + 20 + tw('ccl2');
        g = { valW, labs, labW, both, ppx, xr0, legW, oneLine: tw('cctt') + 18 + legW <= xr0, oneLineS: tw('ccts') + 18 + legW <= xr0 };
        ccdMemo.set(key, g);
        return g;
      }
      // (a short column: the eyebrow without its unit, so the legend shares its line; pp is on the axis)
      const CC_TITLE_S = 'TOP-1 GAIN VS. VICREG';
      // heights: header, n benchmark rows of r px, the d = 8192 row, the pp axis
      const ccdH = (g, n, r, w8) => (g.oneLine ? 29 : 49) + (n - 1) * r + (w8 ? r + 2 : 0) + (r - 1) + 7;
      // the least height that shows all four benchmarks (the short eyebrow if that saves the legend's line)
      const ccdNeed = g => Math.min(ccdH(g, 4, 17, false), g.oneLineS ? ccdH({ oneLine: true }, 4, 17, false) : Infinity);
      function drawChartCD(x, top, bottom, width) {
        const avail = bottom - top;
        let g = ccdGeom(width), TITLE = CC_TITLE;
        if (!g.oneLine && g.oneLineS && ccdH(g, 4, 17, false) > avail) { g = Object.assign({}, g, { oneLine: true }); TITLE = CC_TITLE_S; }
        const { valW, labs, labW, both, ppx, legW, oneLine } = g;
        const bx0 = x + labW;
        const c1 = bx0 + 2 * ppx + 16, c2 = c1 + valW + 14;   // value columns: d = 512, d = 2048
        const xr = x + g.xr0;                                  // right edge of the chart
        const H = (n, r, w8) => ccdH(g, n, r, w8);
        let rh = 21;
        if (H(4, rh, true) > avail) rh = 19;
        if (H(4, rh, false) > avail) rh = 17;
        if (H(2, rh, false) > avail) { L.chartC = { ys: [], x, w: 0 }; return; }
        let nRows = 4;
        while (nRows > 2 && H(nRows, rh, false) > avail) nRows--;
        // the d = 8192 run gets a row only when its note can say which d it is; else the axis row names it
        T('cc8m', '+0.00 at $d = 8192$', -9999, -9999, { c: SEC });
        const with8192 = nRows === 4 && H(4, rh, true) <= avail && bx0 + 10 + tw('cc8m') <= Math.min(x + width, L.w - (L.mobile ? 16 : 40));
        const age = k => clamp((stepT - 1.4 - k * 0.508) / 0.35, 0, 1);
        const yt = top + 6, yh = oneLine ? yt : top + 27, y0 = oneLine ? top + 29 : yh + 22;
        const yRow8 = y0 + 4 * rh + 2, yLastRow = with8192 ? yRow8 : y0 + (nRows - 1) * rh, yAx = yLastRow + rh - 1;
        const hot = P.row, hotOK = (hot >= 0 && hot < nRows) || (hot === 8 && with8192);
        const pair = r => `$d = ${r[2]}$: ${r[3].toFixed(2)} $\\to$ ${r[4].toFixed(2)}`;
        ctx.lineWidth = 1;
        if (hotOK && (oneLine || hot === 8)) {
          // the hovered benchmark's runs on the title line, each named by its d (VICReg → Radial-VICReg, Top-1 %)
          noteAt('cctp', hot === 8 ? [`Top-1 %: ${pair(CC[8])}`, pair(CC[8])] : [`Top-1 %: ${pair(CC[hot])} · ${pair(CC[hot + 4])}`, `${pair(CC[hot])} · ${pair(CC[hot + 4])}`, pair(CC[hot])], x, yt, COL.accent, x + width);
        } else if (hotOK) {
          T('cct0', 'Top-1 %', x, yt, { c: COL.accent });
          const hx = x + tw('cct0') + 14;
          T('cct', pair(CC[hot]), hx, yt, { c: COL.accent });
          T('cct2', pair(CC[hot + 4]), hx, yh, { c: SEC });
        } else {
          T(TITLE === CC_TITLE ? 'cctt' : 'ccts', TITLE, x, yt, { c: SEC, cls: 'eyb' });
          let lx = oneLine ? xr - legW : x;
          lolli(lx, lx + 14, yh, true);
          T('ccl1', '$d = 512$', lx + 20, yh, { c: COL.ink });
          lx += 20 + tw('ccl1') + 16;
          lolli(lx, lx + 14, yh, false);
          T('ccl2', '$d = 2048$', lx + 20, yh, { c: SEC });
        }
        // guides at 0 / 1 / 2 pp (the dotted ones stop above the d = 8192 row, whose note runs across
        // that band), and the scale under the rows
        ctx.strokeStyle = COL.g200; ctx.setLineDash([1, 3]);
        [1, 2].forEach(k => { const xx = px5(bx0 + k * ppx); line(xx, y0 - 10, xx, with8192 ? yRow8 - 11 : yAx - 8); });
        ctx.setLineDash([]); ctx.strokeStyle = COL.g300;
        line(px5(bx0), y0 - 10, px5(bx0), yAx - 8);
        [0, 1, 2].forEach(k => text(String(k), bx0 + k * ppx, yAx, TICK, 'center', F11));
        text('pp', bx0 + 2 * ppx + 9, yAx, TICK, 'left', F11);
        const ys = [];
        for (let k = 0; k < nRows; k++) {
          const a1 = age(k), a2 = age(k + 4);
          if (a1 <= 0) break;
          const y = y0 + k * rh, g1 = CC[k][5], g2 = CC[k + 4][5];
          const x1 = bx0 + g1 * ppx * easeOut(a1), x2 = bx0 + g2 * ppx * easeOut(a2);
          text(labs[k], x, y, hot === k ? COL.accent : COL.ink);
          lolli(bx0, Math.max(bx0 + 0.5, x1), Math.round(y) - 4, true);
          if (a2 > 0) lolli(bx0, Math.max(bx0 + 0.5, x2), Math.round(y) + 3, false);
          ctx.globalAlpha = a1; text(`+${g1.toFixed(2)}`, c1, y, COL.accent); ctx.globalAlpha = 1;
          if (both && a2 > 0) { ctx.globalAlpha = a2; text(`+${g2.toFixed(2)}`, c2, y, SEC); ctx.globalAlpha = 1; }
          ys.push({ k, y });
        }
        if (with8192 && age(8) > 0) {
          const y = yRow8, a = age(8);
          ctx.globalAlpha = a;
          text('ImageNet-10 · RN18', x, y, hot === 8 ? COL.accent : SEC);
          ctx.fillStyle = COL.bg; ctx.strokeStyle = SEC; ctx.beginPath(); ctx.rect(px5(bx0) - 3, px5(y) - 3, 6, 6); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 1;
          T('cc8', '+0.00 at $d = 8192$', bx0 + 10, y, { c: SEC });
          ys.push({ k: 8, y });
        }
        // the axis row: under the labels the source, the d = 8192 run when it has no row, and, once every
        // row is in, the invitation to hover one; what does not fit there goes right of the pp scale
        const room = bx0 - x - 14, rx0 = bx0 + 2 * ppx + 9 + textW('pp', F11) + 14, rRoom = Math.min(x + width, L.w - (L.mobile ? 16 : 40)) - rx0;
        const wOf = (s, k) => { if (s.indexOf('$') < 0) return textW(s); T(k, s, -9999, -9999, { c: SEC }); return tw(k); };
        const put = (s, k, xx) => { if (s.indexOf('$') >= 0) T(k, s, xx, yAx, { c: SEC }); else text(s, xx, yAx, SEC); };
        const D8 = '$d = 8192$: +0.00', SRC = 'Tables 1–3';
        const src = !with8192 && age(8) > 0 ? [[`${D8} · ${SRC}`, ''], [D8, SRC], [SRC, D8]]
          : age(8) >= 1 && !hotOK ? [['Tables 1–3 · hover a row', ''], [SRC, '']] : [[SRC, '']];
        for (let j = 0; j < src.length; j++) {
          const [s, rest] = src[j];
          if (wOf(s, 'ccsrc' + j) > room) continue;
          put(s, 'ccsrc' + j, x);
          if (rest && wOf(rest, 'ccsrr' + j) <= rRoom) put(rest, 'ccsrr' + j, rx0);
          break;
        }
        L.chartC = { ys, x, w: xr + 4 - x };
      }

      /* ------------------------------------------------------------ main draw */
      // The fig. 3b card (core) has no background under its caption line, which lands on the frame bottom:
      // paint the canvas white under it. Read at the start of a frame, before this frame writes any style.
      function revealCaptionRect() {
        if (!figHover) return null;
        const m = document.querySelector('.reveal-card.is-visible .reveal-card__meta');
        if (!m) return null;
        const r = m.getBoundingClientRect(), c = cnv.getBoundingClientRect();
        return r.width ? [r.left - c.left - 5, r.top - c.top - 3, r.width + 10, r.height + 6] : null;
      }
      function draw() {
        const capR = revealCaptionRect();
        cv.clear();
        curFont = '';
        ctx.textBaseline = 'middle';
        if (step === 5 && chartCInCloud()) {
          // phones and short desktop columns: the results chart takes the cloud's place (the portrait is
          // illustrative anyway)
          if (L.mobile) drawChartC(16, L.cy - L.box + 2, L.cy + L.box, L.w - 32);
          else if (L.c6) { const [cx0, cx1] = chartC6X(); drawChartCD(cx0, L.c6.top, L.c6.bottom, cx1 - cx0); }
          else {
            // portrait windows whose head slot is too short: the chart in the frame
            let cx0 = L.cx - L.box + 4;
            if (2 * L.box - 4 < 300) cx0 = Math.min(cx0, Math.max(L.CR + 12, L.cx - L.box - L.margH - 9));
            drawChartCD(cx0, L.cy - 0.62 * L.box, L.cy + L.box, L.cx + L.box - cx0);
          }
        } else {
          // fixed labels reserve their boxes first; σ glyphs, the callout and the probe label then fit around them
          plBegin();
          drawCloudFrame();
          drawCloudLabels();
          drawMarginals(shown.marg);
          drawPanelEyebrow();
          drawShells();
          drawGhost(shown.ghost);
          drawCovariance();
          drawPoints();
          drawRealSample();
          drawFrameTicks();
          drawProbe();
        }
        drawTag();
        drawRPanel();
        drawSplitFlyers();
        drawReadouts();
        // brush ring while reshaping
        if (P.over === 'cloud' && !P.touch && brushable()) {
          ctx.strokeStyle = P.down && P.moved ? COL.accent : COL.g400; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(P.x, P.y, BRUSH * L.u, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }
        if (capR) { ctx.fillStyle = COL.bg; ctx.fillRect(capR[0], capR[1], capR[2], capR[3]); }
        ovEnd();
      }

      /* ------------------------------------------------------------ pointer interaction */
      const BRUSH = 0.6;
      const brushable = () => step === 0 || step === 1 || step === 3;
      function region(x, y) {
        const inC = () => L.chartC && L.chartC.ys.length && y >= L.chartC.ys[0].y - 10 && y <= L.chartC.ys[L.chartC.ys.length - 1].y + 10;
        if (step === 5 && chartCInCloud() && inC() && (L.mobile || (x >= L.chartC.x - 4 && x <= L.chartC.x + L.chartC.w))) return 'chartC';
        if (L.mobile && step === 4 && L.chartA && y >= L.chartA.y0 - 6 && y <= L.chartA.yb + 6) return 'chartA';
        // (no cloud while Chart C holds its slot on a landscape desktop)
        if (!(step === 5 && L.c6) && Math.abs(x - L.cx) <= L.box + 4 && Math.abs(y - L.cy) <= L.box + 4) return 'cloud';
        // Chart A before the panel: on short desktop columns it is drawn in the panel's place
        if (step === 4 && L.chartA && x >= L.chartA.x0 - 20 && x <= L.chartA.x0 + L.chartA.w + 20 && y >= L.chartA.y0 - 6 && y <= L.chartA.yb + 6) return 'chartA';
        const top = L.oy - 0.66 * L.dp - 4;
        if (x >= L.ox - 2 && x <= L.ox + L.pw + 2 && y >= top && y <= L.oy + 6) return 'panel';
        if (step === 5 && inC() && x >= L.chartC.x - 4 && x <= L.chartC.x + L.chartC.w) return 'chartC';
        return null;
      }
      // desktop: the pointer rests on the context headline (centred column from top 74 px to its live bottom)
      function overHeadline() {
        if (L.mobile || !L.hlLive || !L.hlRight) return false;
        return P.y >= 66 && P.y <= L.hlLive + 4 && Math.abs(P.x - L.w / 2) <= L.hlRight - L.w / 2 + 8;
      }
      function hoverUpdate(x, y) {
        P.over = region(x, y);
        let near = -1, bin = -1, col = -1, row = -1;
        if (P.over === 'cloud' && step !== 5) {
          let best = (L.mobile ? 22 : 14) ** 2;
          for (let i = 0; i < N; i++) {
            const dx = X(px[i]) - x, dy = Y(py[i]) - y, d2 = dx * dx + dy * dy;
            if (d2 < best) { best = d2; near = i; }
          }
        } else if (P.over === 'panel' && shown.hist > 0.5) {
          const binW = step === 5 ? F2_W : step === 2 ? 0.5 : 0.2;
          bin = Math.floor(((x - L.ox) / L.pw * rmaxCur) / binW);
          if (bin < 0) bin = -1;
        } else if (P.over === 'chartA') {
          let best = 1e9;
          CA.alpha.forEach((a, j) => { const d = Math.abs(L.chartA.CX(a) - x); if (d < best) { best = d; col = j; } });
        } else if (P.over === 'chartC') {
          let best = 9;
          L.chartC.ys.forEach(r => { const d = Math.abs(r.y - y); if (d < best) { best = d; row = r.k; } });
        }
        if (near !== P.near && near >= 0 && au() && limit('probe', 70)) {
          const r = Math.hypot(px[near], py[near]);
          S.click({ freq: 700 + r * 300, gain: 0.1, pan: clamp(px[near] / 3.5, -1, 1) * 0.7 });
        }
        if (bin !== P.bin && bin >= 0 && au() && limit('bin', 60)) S.tick(bandPitch(bin * (step === 2 ? 0.1 : 0.2)) + 12, { gain: 0.13 });
        if ((row !== P.row && row >= 0) || (col !== P.col && col >= 0)) { if (au() && limit('chartHover', 60)) S.tick(deg(row >= 0 ? row : col, 0), { gain: 0.12 }); }
        P.near = near; P.bin = bin; P.col = col; P.row = row;
        cnv.style.cursor = P.over === 'cloud' ? (brushable() ? 'crosshair' : 'pointer') : P.over ? 'crosshair' : '';
      }
      function smudge(x, y, dxp, dyp) {
        // move nearby points with the pointer (Gaussian falloff), in base feature space
        const cxd = (x - L.cx) / L.u, cyd = -(y - L.cy) / L.u;
        let ddx = dxp / L.u, ddy = -dyp / L.u;
        if (step === 0) { // displayed = A z + μ → Δz = A⁻¹ Δp
          const [a, b, c] = A_RAW, det = a * c - b * b;
          const nx = (c * ddx - b * ddy) / det, ny = (-b * ddx + a * ddy) / det; ddx = nx; ddy = ny;
        }
        const s2 = 2 * (BRUSH * 0.55) ** 2;
        let moved = 0, rsum = 0;
        for (let i = 0; i < N; i++) {
          const dx = px[i] - cxd, dy = py[i] - cyd, d2 = dx * dx + dy * dy;
          if (d2 > BRUSH * BRUSH * 2.2) continue;
          const wgt = 0.55 * Math.exp(-d2 / s2);
          zx[i] += ddx * wgt; zy[i] += ddy * wgt;
          moved++; rsum += Math.hypot(px[i], py[i]);
        }
        if (moved && au() && limit('smudge', 75)) {
          const r = rsum / moved;
          S.bit(rawPitch(r) + (Math.random() - 0.5), { gain: 0.12 + Math.min(0.1, moved / 800), pan: clamp(cxd / 3.5, -1, 1) * 0.7 });
          if (Math.random() < 0.25) S.click({ freq: clickHz(), gain: 0.12, pan: clamp(cxd / 3.5, -1, 1) * 0.6 });
        }
        if (moved) { holdNow(); userPicked = true; if (step === 3) mapArrived = false; }
      }
      function clickAction(x, y) {
        const where = region(x, y);
        if (where === 'cloud') {
          if (step === 0 || step === 1 || step === 3) setShape((shape + 1) % SHAPES.length, true);
          else if (step === 2) { const k = D_SEQ.indexOf(dCur), nd = D_SEQ[(k + 1) % D_SEQ.length]; uParam = vOfD(nd); holdNow(); setD(nd, true); setSlider(uParam); }
          else if (step === 4) replayToy();
          else { const k = (f2Cur + 1) % 3; uParam = k / 2; holdNow(); setF2(k); setSlider(uParam); }
        }
      }
      cnv.addEventListener('pointerdown', e => {
        P.touch = e.pointerType === 'touch';
        P.x = e.clientX; P.y = e.clientY;
        P.moved = false; // a new gesture: no drag yet, wherever it starts (the touchend guard reads this)
        hoverUpdate(P.x, P.y);
        // phones: a tap on the histogram or a chart keeps its highlight for a few seconds
        if (P.touch && P.over && P.over !== 'cloud') P.stick = clockT + 3;
        if (P.over !== 'cloud') return;
        P.down = true; P.id = e.pointerId; P.sx = P.lx = e.clientX; P.sy = P.ly = e.clientY; P.moved = false;
        try { cnv.setPointerCapture(e.pointerId); } catch (_) {}
      });
      cnv.addEventListener('pointermove', e => {
        P.x = e.clientX; P.y = e.clientY;
        P.inside = e.pointerType !== 'touch';
        if (hold) holdT = clockT; // still exploring: the hold stays
        if (P.down && e.pointerId === P.id) {
          const dx = e.clientX - P.lx, dy = e.clientY - P.ly;
          if (!P.moved && Math.hypot(e.clientX - P.sx, e.clientY - P.sy) > 6) P.moved = true;
          if (P.moved && brushable()) smudge(e.clientX, e.clientY, dx, dy);
          P.lx = e.clientX; P.ly = e.clientY;
          P.over = 'cloud';
          return;
        }
        hoverUpdate(P.x, P.y);
      });
      const endPtr = e => {
        if (!P.down || e.pointerId !== P.id) return;
        P.down = false;
        try { cnv.releasePointerCapture(e.pointerId); } catch (_) {}
        if (!P.moved && e.type === 'pointerup') clickAction(e.clientX, e.clientY);
        if (P.touch) { P.over = null; P.near = -1; }
      };
      cnv.addEventListener('pointerup', endPtr);
      cnv.addEventListener('pointercancel', endPtr);
      cnv.addEventListener('pointerleave', () => {
        P.inside = false;
        if (P.down) return;
        P.over = null; P.near = -1; cnv.style.cursor = '';
        if (!(P.touch && P.stick > clockT)) { P.bin = -1; P.col = -1; P.row = -1; }
      });
      // a drag on the cloud must not be read by the shell as a scene swipe. The drag flag belongs to one
      // gesture: touchend (after pointerup, so the click test above still saw it) consumes it, and later
      // swipes elsewhere on the scene reach the shell again.
      const stopIfCloud = e => { const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]); if (t && region(t.clientX, t.clientY) === 'cloud') e.stopPropagation(); };
      cnv.addEventListener('touchstart', stopIfCloud, { passive: true });
      cnv.addEventListener('touchend', e => {
        const drag = P.moved && P.touch;
        P.moved = false;
        const t = e.changedTouches && e.changedTouches[0];
        if (drag || (t && region(t.clientX, t.clientY) === 'cloud')) e.stopPropagation();
      }, { passive: true });

      bPrev.addEventListener('click', () => { goStep((step + STEPS.length - 1) % STEPS.length, true); tickUI(); });
      bNext.addEventListener('click', () => { goStep((step + 1) % STEPS.length, true); tickUI(); });
      const tickUI = () => { const a = au(); if (a && a.ui && a.ui.tick) { try { a.ui.tick(); } catch (_) {} } };

      /* ------------------------------------------------------------ lifecycle */
      L.mobile = (cv.w || innerWidth) < 800;
      fillHead(STEPS[0]);
      layout();
      // A hidden scene does no layout work on resize: enter() lays out again, and so does the frame loop when
      // the canvas size changes.
      api.onResize(() => { if (api.isActive()) layout(); });
      // the live headline outgrew the room reserved for it (web fonts or KaTeX arrived late): measure again.
      // The live bottom is a floor in layout(), so this runs once per change, not on every notification.
      // (A hidden scene's headline reads 0: ignored, and read again on enter.)
      if (api.onHeadline) api.onHeadline(b => { if (!api.isActive()) return; L.hlLive = b; if (b > L.hlRes + 1) relayout(); });
      // KaTeX / webfont metrics change the head's height once they load: re-measure then (hidden: only drop
      // the measurements, enter() measures again)
      const forget = () => { headMemo.clear(); hlMemo.clear(); ctrWMemo = 0; };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (api.isActive()) relayout(); else forget(); });
      if (window.ResizeObserver) {
        new ResizeObserver(() => {
          tagWrap();
          syncInfoY();
        }).observe(head);
      }
      api.loop((t, dt) => { if (cv.w !== L.w || cv.h !== L.h) layout(); update(dt); portraitView(dt); draw(); });
      // inspection hook (tests / screenshots): jump to step i at time t
      el.__rv = { ST, L, get step() { return step; }, get stepT() { return stepT; }, get hold() { return hold; }, get passes() { return layoutPass; }, P, seek(i, t) { goStep(i, true); stepT = t || 0; } };

      return {
        enter() {
          shown.v6 = 0;
          layout();
          requestAnimationFrame(() => { if (api.isActive()) { layout(); decorateSlider(); L.hlLive = api.headlineBottom ? api.headlineBottom() : 0; } });
          // KaTeX webfonts arrive lazily with the first formula: settle the column once they have (skipped
          // once every face is in; one pending timer at most)
          clearTimeout(fontTimer);
          const fontsIn = document.fonts && document.fonts.status === 'loaded' && document.fonts.check('16px KaTeX_Main') && document.fonts.check('italic 16px KaTeX_Math');
          if (!fontsIn) fontTimer = setTimeout(() => { if (api.isActive()) relayout(); }, 1400);
          userPicked = false; paused = false; auto = true; hold = false;
          enterT = clockT;
          cueShown = '';
          loadShape(0);
          trans = null;
          goStep(0, false, { sprinkle: true, force: true });
          computeTargets(); px.set(tx); py.set(ty); computeStats();
          draw();
        },
        exit() {
          P.down = false; P.over = null; P.near = -1; P.bin = -1; P.col = -1; P.row = -1; P.moved = false; P.inside = false;
          clearTimeout(swapTimer); clearTimeout(fontTimer);
        },
        sound(on) {
          const a = AU();
          if (on) {
            soundOn = true;
            if (a && a.clock && !clockOff) clockOff = a.clock.on(onClock);
            if (a && typeof a.granular === 'function' && !bed) {
              try { bed = a.granular(Object.assign(bedParams(), { dur: 0.07, attack: 1.2, highpass: 110, dest: api.bus() || undefined })); } catch (e) { bed = null; }
            }
            // (the interaction hint is shown from the frame loop once audio is unlocked, sound on or off)
          } else {
            soundOn = false;
            if (clockOff) { clockOff(); clockOff = null; }
            if (bed) { try { bed.stop(0.5); } catch (e) { /* ignore */ } bed = null; }
            // a mute is a hard stop: also kill one-shots already scheduled up to a bar ahead
            sq.length = 0; land.n = 0;
            try { const b = api.bus(); if (a && typeof a.stopAll === 'function' && b) a.stopAll(b, 0.05); } catch (e) { /* ignore */ }
          }
        },
        key(e) {
          const k = e.key;
          if (k === ' ' || k === 'Spacebar') {
            // held by an interaction: Space resumes the timeline; otherwise it toggles pause
            if (hold && !paused) hold = false;
            else { paused = !paused; if (!paused) hold = false; }
            tickUI();
            return true;
          }
          if (k === 'ArrowDown') { goStep((step + 1) % STEPS.length, true); tickUI(); return true; }
          if (k === 'ArrowUp') { goStep((step + STEPS.length - 1) % STEPS.length, true); tickUI(); return true; }
          if (k === 'c' || k === 'C') { if (step === 0 || step === 1 || step === 3) { setShape((shape + 1) % SHAPES.length, true); return true; } }
          if (k === 'r' || k === 'R') { loadShape(shape); startTransition(0.6); tickUI(); return true; }
          return false;
        },
      };
    },
  });
})();
