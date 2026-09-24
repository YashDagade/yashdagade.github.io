/* ==========================================================================
   site/js/audio.js — Site.audio, the sound engine for yashdagade.com v2
   --------------------------------------------------------------------------
   Aesthetic: modern, minimal, high-tech industrial. Glitch-ambient /
   microsound (clicks, bits, tiny digital transients as texture), granular
   clouds for "neural" connections, minimal-techno / IDM percussion, and warm
   but restrained glassy tones underneath. Negative space; airy and wide.
   Never piano / EP / music-box / saw walls / big reverb washes.

   One musical system for the whole site: D major pentatonic, 118 BPM.
   Everything is synthesized (no samples) and routed through one master chain:

     bus(name) ─┬─ [duck] ─────────────────────────┐
                ├─ reverbSend ─► reverb ─┐          │
                └─ delaySend ──► delay ──┴─► master ─► HP 30 Hz ─► de-harsh bell
                                   ─► high shelf (−3 dB) ─► glue comp ─► trim ─► limiter
                                   ─► soft-clip ─► out (on/off fade) ─► speakers

   Round 2 (owner: "a little too much high-pitched noise … the flute whistle can go"):
   sustained / tonal material folds down in octaves above A5 (MIDI 81, ~880 Hz) unless a
   call passes { allowHigh: true }; ticks and bits fold above A6 (MIDI 93); clicks, hats and
   bits are ~3 dB quieter, shorter and centred lower; grains, keys, plucks and bells are darker;
   the master rolls off 3 dB above ~6.5 kHz and the reverb and delay returns are darker.

   Registers (round 3, for scene authors): sustained / tonal material ≤ A4 (MIDI 69: clouds,
   pads, keys, drones), tonal one-shots ≤ A5 (81), ticks and bits ≤ A6 (93). The engine folds
   continuous grain clouds above A4, tonal one-shots above A5 and ticks/bits above A6.
   Round 3 also: micro hats have no presence boost, a 9 kHz lowpass and a lower, quieter edge
   click; the master starts through a short compressor bypass (Chrome's DynamicsCompressor
   starts in a heavily-reducing state, which swallowed the first ~100 ms after unlock); voices
   can route their reverb/delay sends through a caller's own chain ({ sendTo }).

   Round 4 (small speakers): laptop and phone speakers barely reproduce anything below ~150 Hz, and
   most of the scenes' energy sat there (clean sine subs, bass and kick), so on a MacBook those parts
   were close to silent. sub, bass, kick and impact now carry a quiet "body": harmonics 2–5 of their
   own oscillator (a Chebyshev waveshaper, so it follows every pitch glide), band-passed to ~150–450 Hz,
   12–15 dB under the fundamental in energy (the kick's is a quieter knock that rises over 16 ms and
   decays in ~30 ms). The ear hears the note's pitch from those harmonics (the missing fundamental),
   the true sine sub is unchanged for headphones, and nothing sustained reaches ~900 Hz. Opt out per
   call with { body: 0 } (or scale it, 0–2), or per engine with createEngine(ctx, { body: 0 }) — the
   check pages render both to measure before / after (SMALL SPEAKER in audio-check.html and
   build-score-check.html).

   The graph is built by createEngine(ctx) so the exact same sound can be
   rendered in an OfflineAudioContext (see site/audio-check.html; offline
   engines are "pumped" manually with E.pump()).
   Classic script — attaches to window.Site.audio. Every public call is a
   silent no-op before unlock() or while disabled, and never throws.
   ========================================================================== */
(function () {
  'use strict';

  var Site = (window.Site = window.Site || {});

  /* ------------------------------------------------------------ utilities */

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function midiToHz(m) { return 440 * Math.pow(2, (num(m, 69) - 69) / 12); }
  function dbToGain(db) { return Math.pow(10, db / 20); }
  function expRand() { return -Math.log(1 - Math.random() * 0.995); } // mean ≈ 1
  function list(x) {
    var a = Array.isArray(x) ? x : [x], out = [];
    for (var i = 0; i < a.length; i++) if (typeof a[i] === 'number' && isFinite(a[i])) out.push(a[i]);
    return out;
  }
  // evenly distributed k onsets in n steps (Bjorklund-equivalent), rotated by rot
  function euclid(k, n, rot) {
    var p = [];
    for (var i = 0; i < n; i++) p.push(((i * k) % n) < k);
    rot = ((rot || 0) % n + n) % n;
    return p.slice(n - rot).concat(p.slice(0, n - rot));
  }

  var KEY = { root: 62, scale: [0, 2, 4, 7, 9] };

  // Pitch ceilings (round 2). Tonal / sustained voices (grains, clouds, keys, pluck, bell, lead,
  // blip, pad shimmer) fold down in octaves above TONAL_MAX, so fundamentals stay at or below
  // ~880 Hz; micro-transients (tick, bit, data, riser ticks) fold above TICK_MAX (~1.76 kHz).
  // Any instrument call can opt out with { allowHigh: true }.
  // Round 3: continuous grain clouds (granular(), drone shimmer, pad shimmer) fold above A4 (MIDI 69,
  // 440 Hz): a folded 880 Hz sine-grain cloud still reads as a flute.
  var TONAL_MAX = 81, TICK_MAX = 93, CLOUD_MAX = 69;
  function fold(m, max) {
    var g = 0;
    while (m > max && g++ < 10) m -= 12;
    return m;
  }
  function foldIf(m, o, max) { return o && o.allowHigh ? m : fold(m, max); }
  // Darken a click / resonance frequency: unchanged up to 2 kHz, compressed above
  // (3 kHz → 2.7k, 6 kHz → 4.7k, 9 kHz → 6.5k), never above 7 kHz.
  function darkHz(f) { return f <= 2000 ? f : Math.min(7000, 2000 * Math.pow(f / 2000, 0.78)); }

  // i-th degree of KEY.scale above KEY.root (wraps octaves, negative ok) → MIDI
  function degree(i, octave) {
    var sc = KEY.scale && KEY.scale.length ? KEY.scale : [0, 2, 4, 7, 9];
    var n = sc.length;
    i = Math.round(num(i, 0));
    var o = Math.floor(i / n), k = i - o * n;
    return num(KEY.root, 62) + sc[k] + 12 * (o + Math.round(num(octave, 0)));
  }
  // all in-key MIDI notes in [lo, hi]
  function scaleNotes(lo, hi) {
    var sc = KEY.scale && KEY.scale.length ? KEY.scale : [0, 2, 4, 7, 9], out = [];
    for (var m = Math.ceil(lo); m <= hi; m++) {
      var pc = (((m - num(KEY.root, 62)) % 12) + 12) % 12;
      if (sc.indexOf(pc) >= 0) out.push(m);
    }
    return out;
  }

  /* ---- static curves (plain Float32Arrays, shareable across contexts) */
  function tanhCurve(k, n) {
    n = n || 2048;
    var c = new Float32Array(n), norm = Math.tanh(k);
    for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
    return c;
  }
  // Transparent below -1.5 dBFS, smooth knee above, never exceeds ~0.956 (-0.4 dBFS).
  function softClipCurve() {
    var n = 8193, c = new Float32Array(n), T = 0.84, L = 0.985;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1, ax = Math.abs(x);
      var y = ax <= T ? ax : T + (L - T) * Math.tanh((ax - T) / (L - T));
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }
  // Bit-depth reduction: mid-tread staircase quantizer with 2^(bits-1) steps per polarity.
  function stairCurve(bits) {
    var n = 4096, c = new Float32Array(n), L = Math.pow(2, bits - 1);
    for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * L) / L; }
    return c;
  }
  // grain windows
  function hannCurve(n) {
    var c = new Float32Array(n);
    for (var i = 0; i < n; i++) c[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    return c;
  }
  function tukeyCurve(n, a) {
    var c = new Float32Array(n), e = a * (n - 1) / 2;
    for (var i = 0; i < n; i++) {
      var k = Math.min(i, n - 1 - i);
      c[i] = k >= e ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * k / e);
    }
    return c;
  }
  // Small-speaker body (round 4): Chebyshev polynomials turn a unit-amplitude sine into exact harmonics
  // (T_n(sin θ) = ±cos/sin nθ), so this curve on an oscillator's own output gives its 2nd 0.75, 3rd 1,
  // 4th 0.75 and 5th 0.4 and nothing else — no aliasing, and it follows any pitch glide. T2 + T4 = 8x⁴ − 6x²
  // and the odd T3, T5 vanish at 0, so a silent (unstarted / stopped) input gives no DC step.
  function bodyCurve() {
    var n = 4097, c = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1, x2 = x * x;
      var t2 = 2 * x2 - 1, t3 = x * (4 * x2 - 3), t4 = 8 * x2 * x2 - 8 * x2 + 1, t5 = x * (16 * x2 * x2 - 20 * x2 + 5);
      c[i] = -0.75 * (t2 + t4) - t3 + 0.4 * t5;
    }
    return c;
  }
  var CURVE_SOFT = softClipCurve();
  var CURVE_WARM = tanhCurve(1.4);
  var CURVE_BODY = bodyCurve();
  var CURVE_CRUSH4 = stairCurve(4);
  var CURVE_CRUSH3 = stairCurve(3);
  var WIN_HANN = hannCurve(64);
  var WIN_TUKEY = tukeyCurve(64, 0.55);
  function scaledCurve(base, amp) {
    var c = new Float32Array(base.length);
    for (var i = 0; i < base.length; i++) c[i] = base[i] * amp;
    return c;
  }

  /* ---- pre-rendered source material (per sample rate, cached as raw data) */
  var GRAIN_REF = 74;                        // grain buffers are pitched at D5
  var STEP_LEN = 96;                         // samples per cycle of the "bit" step waves
  var DATA_PITCH = [81, 83, 86, 88, 90, 93]; // A5 B5 D6 E6 F#6 A6 (round 2: was D6–D7)
  var srcCache = {};

  function normalize(d, peak) {
    var mean = 0, i, p = 0;
    for (i = 0; i < d.length; i++) mean += d[i];
    mean /= d.length;
    for (i = 0; i < d.length; i++) { d[i] -= mean; p = Math.max(p, Math.abs(d[i])); }
    var s = peak / (p || 1);
    for (i = 0; i < d.length; i++) d[i] *= s;
    return d;
  }
  function fadeEdges(d, a, b, n) {
    for (var i = 0; i < n && a + i < b; i++) { var g = i / n; d[a + i] *= g; d[b - 1 - i] *= g; }
  }

  function renderSources(sr) {
    if (srcCache[sr]) return srcCache[sr];
    var TAU = 2 * Math.PI, f0 = midiToHz(GRAIN_REF), dt = 1 / sr, i, t;

    // 1) grain buffers, 3 s at D5. "pure": two slightly detuned sines + faint 2nd/3rd partial
    //    with a slow shimmer. "glass": soft FM (ratio 2 → odd partials, ratio 3 → even) whose
    //    indices drift slowly, so every grain taken from a random offset has its own colour.
    var n = Math.floor(sr * 3), pure = new Float32Array(n), glass = new Float32Array(n);
    var w0 = TAU * f0, wd = w0 * Math.pow(2, 3.5 / 1200), wg = w0 * Math.pow(2, -4 / 1200);
    for (i = 0; i < n; i++) {
      t = i * dt;
      var p1 = w0 * t, p2 = wd * t, pg = wg * t;
      var h2 = 0.04 * (0.6 + 0.4 * Math.sin(TAU * 0.37 * t)) * Math.sin(2 * p1 + 0.9);
      pure[i] = (0.6 * Math.sin(p1) + 0.4 * Math.sin(p2) + h2 + 0.012 * Math.sin(3 * p1 + 0.3)) *
        (0.88 + 0.12 * Math.sin(TAU * 0.53 * t + 1.1));
      // round 2: FM indices roughly halved (0.12–0.54 / 0.04–0.18): "glass" is now a soft
      // colour change on the sine, not a bright metallic edge
      var I1 = 0.12 + 0.42 * (0.5 + 0.5 * Math.sin(TAU * 0.23 * t)) * (0.55 + 0.45 * Math.sin(TAU * 0.61 * t + 1.3));
      var I2 = 0.04 + 0.14 * (0.5 + 0.5 * Math.sin(TAU * 0.17 * t + 2.1));
      glass[i] = 0.62 * Math.sin(p1 + I1 * Math.sin(2 * p1 + 0.4)) + 0.38 * Math.sin(pg + I2 * Math.sin(3 * pg)) +
        0.008 * Math.sin(4 * p2);
    }
    normalize(pure, 0.9); normalize(glass, 0.9);

    // 2) single-cycle step waves for "bits" (sample-and-hold / bit-reduced tones)
    function stepWave(vals) {
      var d = new Float32Array(STEP_LEN), spp = STEP_LEN / vals.length;
      for (var k = 0; k < STEP_LEN; k++) d[k] = 0.78 * vals[Math.floor(k / spp)];
      return d;
    }
    var s8 = [], s16 = [];
    for (i = 0; i < 8; i++) s8.push(Math.round(Math.sin(TAU * (i + 0.5) / 8) * 2) / 2);
    for (i = 0; i < 16; i++) s16.push(Math.round(Math.sin(TAU * (i + 0.5) / 16) * 3) / 3);
    var steps = {
      s4: stepWave([0, 1, 0, -1]),
      s8: stepWave(s8),
      s16: stepWave(s16),
      pulse: stepWave([1, 1, -1 / 3, -1 / 3, -1 / 3, -1 / 3, -1 / 3, -1 / 3])
    };

    // 3) glitch texture: four 0.2 s segments — [0] chattering 8-step bit tone at D5,
    //    [1] metallic FM data chirp at D5, [2] decimated + bit-reduced noise bursts,
    //    [3] irregular click train over a faint D6.
    var gl = Math.floor(sr * 0.8), g = new Float32Array(gl), seg = Math.floor(sr * 0.2), a, b, gate, next;
    a = 0; b = seg; gate = 1; next = 0;
    for (i = a; i < b; i++) {
      if (i >= next) { gate = Math.random() < 0.72 ? 1 : 0.25; next = i + Math.floor(sr * rand(0.006, 0.014)); }
      var ph = (i * dt * f0) % 1;
      g[i] = gate * s8[Math.floor(ph * 8)];
    }
    a = seg; b = 2 * seg;
    for (i = a; i < b; i++) {
      t = (i - a) * dt;
      var idx = 0.9 + 0.7 * Math.sin(TAU * 37 * t);
      g[i] = 0.8 * Math.sin(w0 * t + idx * Math.sin(3.5 * w0 * t));
    }
    a = 2 * seg; b = 3 * seg; var hold = 0; gate = 1; next = a;
    for (i = a; i < b; i++) {
      if (i >= next) { gate = Math.random() < 0.6 ? 1 : 0; next = i + Math.floor(sr * rand(0.005, 0.02)); }
      if ((i & 7) === 0) hold = Math.round((Math.random() * 2 - 1) * 8) / 8;
      g[i] = gate * hold * 0.7;
    }
    a = 3 * seg; b = gl; next = a;
    for (i = a; i < b; i++) {
      t = (i - a) * dt;
      g[i] = 0.12 * Math.sin(2 * w0 * t);
      if (i >= next) {
        var amp = rand(0.5, 1) * (Math.random() < 0.5 ? 1 : -1);
        for (var k = 0; k < 6 && i + k < b; k++) g[i + k] += amp * Math.pow(0.45, k) * (k % 2 ? -1 : 1);
        next = i + Math.floor(sr * rand(0.002, 0.009));
      }
    }
    for (var sgi = 0; sgi < 4; sgi++) {
      var s0 = sgi * seg, s1 = sgi === 3 ? gl : (sgi + 1) * seg;
      var sub = g.subarray(s0, s1), pk = 0;
      for (i = 0; i < sub.length; i++) pk = Math.max(pk, Math.abs(sub[i]));
      for (i = 0; i < sub.length; i++) sub[i] *= 0.8 / (pk || 1);
      fadeEdges(g, s0, s1, Math.floor(sr * 0.002));
    }

    return (srcCache[sr] = { pure: pure, glass: glass, steps: steps, glitch: g, seg: 0.2 });
  }

  /* ================================================================ ENGINE */
  /* createEngine(ctx) builds the whole graph + instruments on any BaseAudioContext
     (AudioContext or OfflineAudioContext). Site.audio wraps one realtime engine. */

  function createEngine(ctx, opts) {
    opts = opts || {};
    var E = { ctx: ctx, bpm: num(opts.bpm, 118) };
    var sr = ctx.sampleRate, NYQ = sr * 0.45;
    var OFFLINE = opts.offline != null ? !!opts.offline : typeof ctx.startRendering === 'function';
    E.offline = OFFLINE;
    E.now = function () { return ctx.currentTime; };

    /* ---- node helpers */
    function G(v) { var g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; }
    function F(type, freq, q) {
      var f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = clamp(freq, 10, NYQ);
      if (q != null) f.Q.value = q;
      return f;
    }
    function O(type, freq, detune) {
      var o = ctx.createOscillator();
      o.type = type; o.frequency.value = clamp(freq, 0.01, NYQ);
      if (detune) o.detune.value = detune;
      return o;
    }
    var HAS_PAN = typeof ctx.createStereoPanner === 'function';
    function PAN(v) {
      if (HAS_PAN) { var p = ctx.createStereoPanner(); p.pan.value = clamp(num(v, 0), -1, 1); return p; }
      return G(1);
    }
    function SHAPER(curve) { var s = ctx.createWaveShaper(); s.curve = curve; return s; }
    function comp(thr, knee, ratio, atk, rel) {
      var c = ctx.createDynamicsCompressor();
      c.threshold.value = thr; c.knee.value = knee; c.ratio.value = ratio;
      c.attack.value = atk; c.release.value = rel;
      return c;
    }
    function chain() {
      for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]);
      return arguments[arguments.length - 1];
    }
    function hold(param, t) {
      if (typeof param.cancelAndHoldAtTime === 'function') {
        try { param.cancelAndHoldAtTime(t); return; } catch (e) { /* fall through */ }
      }
      var v = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(v, t);
    }
    function rampTo(param, v, sec) {
      var t = ctx.currentTime;
      hold(param, t);
      if (sec > 0.001) param.linearRampToValueAtTime(v, t + sec); else param.setValueAtTime(v, t);
    }
    function glideTo(param, v, sec) {
      var t = ctx.currentTime;
      hold(param, t);
      param.setTargetAtTime(v, t, Math.max(0.004, num(sec, 0.1) / 3));
    }
    // percussive envelope: linear attack a → peak, exponential decay (time-constant tau). returns a safe stop time
    function perc(param, t, a, tau, peak) {
      param.setValueAtTime(0, t);
      param.linearRampToValueAtTime(peak, t + a);
      param.setTargetAtTime(0, t + a, tau);
      return t + a + tau * 7.5;
    }
    E.helpers = { G: G, F: F, O: O, PAN: PAN, rampTo: rampTo, glideTo: glideTo, euclid: euclid, scaleNotes: scaleNotes };

    /* ---- master chain */
    var master = G(1);
    var hpf = F('highpass', 30, 0.707);
    var deharsh = F('peaking', 4000, 1.0); deharsh.gain.value = -1.5; // silky, not spiky, presence
    var air = F('highshelf', 6500); air.gain.value = -3;               // round 2: gentle roll-off of the fizz above ~6.5 kHz
    var glue = comp(-14, 8, 2.5, 0.010, 0.25);
    // Chrome/WebKit compressors apply automatic make-up gain (~+6.5 dB with these settings);
    // this trim gives it back so quiet material passes at ~unity and only loud passages are glued.
    var trim = G(dbToGain(num(opts.trimDb, -4.8)));
    var limiter = comp(-2, 0, 20, 0.001, 0.09);
    var clip = SHAPER(CURVE_SOFT);
    var out = G(opts.muted ? 0 : 1);
    // Warm-up (round 3): a freshly created DynamicsCompressor starts in a heavily-reducing state and
    // releases it over ~0.2 s (a -24 dBFS tone came out at -37 dBFS in its first 50 ms), so the first
    // sound after unlock was ~12 dB quiet. For the first 0.2 s the signal takes a bypass (delayed by
    // the two compressors' 6 ms look-ahead each, so the 60 ms crossfade does not comb) and the
    // compressor path fades in once it has settled. Quiet start-up material passes at unity either way.
    var t0w = ctx.currentTime, WARM = 0.2, XF = 0.06;
    var compOut = G(0), bypass = G(1), bypassDelay = ctx.createDelay(0.05);
    bypassDelay.delayTime.value = 0.012;
    compOut.gain.setValueAtTime(0, t0w);
    compOut.gain.setValueAtTime(0, t0w + WARM);
    compOut.gain.linearRampToValueAtTime(1, t0w + WARM + XF);
    bypass.gain.setValueAtTime(1, t0w);
    bypass.gain.setValueAtTime(1, t0w + WARM);
    bypass.gain.linearRampToValueAtTime(0, t0w + WARM + XF);
    chain(master, hpf, deharsh, air, glue, trim, limiter, compOut, clip, out, ctx.destination);
    chain(air, bypassDelay, bypass, clip);
    E.warmUntil = t0w + WARM + XF;
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    out.connect(analyser);
    E.master = master; E.out = out; E.analyser = analyser;
    E.glue = glue; E.limiter = limiter; E.deharsh = deharsh; E.shelf = air;

    /* ---- shared buffers (generated once) */
    function makeWhite(sec) {
      var len = (sr * sec) | 0, b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    function makePink(sec) {
      // Paul Kellet's refined pink filter, then normalized to peak 0.95
      var len = (sr * sec) | 0, b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, peak = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        var y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
        d[i] = y;
      }
      // remove DC, crossfade loop seam, normalize
      var mean = 0; for (i = 0; i < len; i++) mean += d[i]; mean /= len;
      for (i = 0; i < len; i++) d[i] -= mean;
      var xf = (sr * 0.05) | 0;
      for (i = 0; i < xf; i++) { var g = i / xf; d[i] = d[i] * g + d[len - xf + i] * (1 - g); }
      for (i = 0; i < len - xf; i++) peak = Math.max(peak, Math.abs(d[i]));
      var s = 0.95 / (peak || 1), b2len = len - xf;
      var nb = ctx.createBuffer(1, b2len, sr), nd = nb.getChannelData(0);
      for (i = 0; i < b2len; i++) nd[i] = d[i] * s;
      return nb;
    }
    function fromData(d) {
      var b = ctx.createBuffer(1, d.length, sr);
      if (b.copyToChannel) b.copyToChannel(d, 0); else b.getChannelData(0).set(d);
      return b;
    }
    var WHITE = makeWhite(2.5), PINK = makePink(6);
    var IMP = ctx.createBuffer(1, Math.floor(sr * 0.1), sr);
    IMP.getChannelData(0)[0] = 1; // unit impulse (+ 0.1 s of silence so filters can ring out)
    var SRC = renderSources(sr);
    var GB = { pure: fromData(SRC.pure), glass: fromData(SRC.glass) };
    var STEPW = { s4: fromData(SRC.steps.s4), s8: fromData(SRC.steps.s8), s16: fromData(SRC.steps.s16), pulse: fromData(SRC.steps.pulse) };
    var BIT_KINDS = ['s8', 's8', 's4', 's16', 'pulse'];
    var GLITCH = fromData(SRC.glitch);
    E.noiseBuffers = { white: WHITE, pink: PINK };
    E.buffers = { impulse: IMP, grainPure: GB.pure, grainGlass: GB.glass, steps: STEPW, glitch: GLITCH };
    function noiseSrc(buf) {
      var s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true; // always stopped explicitly; looping makes any offset/duration safe
      s._offset = Math.random() * buf.duration * 0.8;
      return s;
    }

    /* ---- reverb: generated stereo IR (short, damped plate), energy-normalized */
    function makeIR(seconds, preDelay) {
      var len = (sr * seconds) | 0, pre = (sr * preDelay) | 0;
      var buf = ctx.createBuffer(2, len, sr);
      var rt60 = seconds * 0.9;
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch), l1 = 0, l2 = 0, energy = 0;
        for (var i = pre; i < len; i++) {
          var t = (i - pre) / sr;
          var env = Math.exp((-6.9 * t) / rt60) * Math.min(1, t / 0.012);
          // damping: brightness decays faster than level (8 kHz → 1.5 kHz; round 2: darker)
          var fc = 1500 + 6500 * Math.exp(-t / 0.33);
          var a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
          l1 += a * (Math.random() * 2 - 1 - l1);
          l2 += a * (l1 - l2);
          var y = l2 * env;
          d[i] = y; energy += y * y;
        }
        var fade = (sr * 0.1) | 0; // tidy tail
        for (i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
        var sc = 1 / Math.sqrt(energy || 1);
        for (i = 0; i < len; i++) d[i] *= sc;
      }
      return buf;
    }
    var reverb = G(1);
    var rvHP = F('highpass', 320, 0.6), rvLP = F('lowpass', 5600, 0.5);
    var conv = ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = makeIR(num(opts.reverbSeconds, 2.2), 0.018);
    var rvRet = G(0.7);
    chain(reverb, rvHP, conv, rvLP, rvRet, master);
    E.reverb = reverb; E.reverbReturn = rvRet;

    /* ---- delay: tempo-synced ping-pong (dotted 8th), filtered in the loop */
    var delay = G(1);
    var dlHP = F('highpass', 420, 0.6);
    var dL = ctx.createDelay(3), dR = ctx.createDelay(3);
    var fb1 = G(0.3), fb2 = G(0.3), dlLP = F('lowpass', 3600, 0.5);
    var pL = PAN(-0.75), pR = PAN(0.75), dlRet = G(0.75), dlToRv = G(0.16);
    var dlInLP = F('lowpass', 4800, 0.5);
    chain(delay, dlHP, dlInLP, dL);
    chain(dL, fb1, dlLP, dR);
    chain(dR, fb2, dL);
    chain(dL, pL, dlRet); chain(dR, pR, dlRet);
    dlRet.connect(master); dlRet.connect(dlToRv); dlToRv.connect(reverb);
    E.delay = delay; E.delayReturn = dlRet;
    E.setBpm = function (b) {
      E.bpm = clamp(num(b, 118), 40, 240);
      var dt = (60 / E.bpm) * 0.75;
      var t = ctx.currentTime;
      [dL.delayTime, dR.delayTime].forEach(function (p) { hold(p, t); p.setTargetAtTime(dt, t, 0.05); });
    };
    dL.delayTime.value = dR.delayTime.value = (60 / E.bpm) * 0.75;
    E.stepDur = function () { return 60 / E.bpm / 4; };

    /* ---- buses + ducking */
    var buses = {};
    var duckTargets = [];
    function isNode(d) { return d && typeof d.connect === 'function' && d.context === ctx; }
    function validDest(d) { return isNode(d) ? d : master; }
    function addDuck(b, depth) {
      if (b.duckGain) { b.duckDepth.depth = depth; return; }
      var dg = G(1);
      try { b.disconnect(); } catch (e) {}
      b.connect(dg);
      dg.connect(master);
      if (b.reverbSend) dg.connect(b.reverbSend);
      if (b.delaySend) dg.connect(b.delaySend);
      b.duckGain = dg;
      b.duckDepth = { g: dg.gain, depth: depth };
      duckTargets.push(b.duckDepth);
    }
    E.bus = function (name, o) {
      name = String(name == null ? 'default' : name);
      o = o || {};
      var b = buses[name];
      if (!b) {
        b = G(num(o.gain, 1));
        b.busName = name;
        b.reverbSend = G(num(o.reverb, 0.12));
        b.delaySend = G(num(o.delay, 0.06));
        b.connect(master);
        b.connect(b.reverbSend); b.reverbSend.connect(reverb);
        b.connect(b.delaySend); b.delaySend.connect(delay);
        buses[name] = b;
      }
      if (o.duck) addDuck(b, o.duck === true ? 1 : clamp(num(o.duck, 1), 0, 1));
      return b;
    };
    E.buses = buses;
    E.fadeBus = function (name, v, sec) {
      var b = E.bus(name);
      rampTo(b.gain, Math.max(0, num(v, 1)), Math.max(0, num(sec, 0.3)));
    };
    E.addDuckTarget = function (gainNode, depth) {
      var d = { g: gainNode.gain, depth: num(depth, 1) };
      duckTargets.push(d);
      return function () { var i = duckTargets.indexOf(d); if (i >= 0) duckTargets.splice(i, 1); };
    };
    // Sidechain feel: dip every ducked bus by `amount` at `when`, recover over ~dur.
    E.duck = function (amount, when, dur) {
      var now = ctx.currentTime;
      var a = clamp(num(amount, 0.5), 0, 0.95);
      var t = Math.max(num(when, now), now);
      var d = Math.max(0.05, num(dur, (60 / E.bpm) * 0.9));
      for (var i = 0; i < duckTargets.length; i++) {
        var g = duckTargets[i].g, depth = duckTargets[i].depth;
        g.cancelScheduledValues(t);
        g.setTargetAtTime(1 - a * depth, t, 0.0035);
        g.setTargetAtTime(1, t + 0.025, d * 0.3);
      }
    };

    /* ---- voices (one-shot notes): lifecycle, cleanup, polyphony cap */
    var voices = [];
    var MAX_VOICES = num(opts.maxVoices, 56);
    function Voice(o, def) {
      o = o || {};
      var now = ctx.currentTime;
      var t = Math.max(num(o.when, now), now);
      var v = { t: t, end: t, nodes: [], srcs: [], live: 0, dead: false, gone: false, prio: def.prio || 0 };
      var outG = G(Math.max(0, num(o.gain, 1)) * def.level);
      var dest = validDest(o.dest);
      var pan = PAN(num(o.pan, def.pan || 0));
      outG.connect(pan); pan.connect(dest);
      v.nodes.push(outG, pan);
      var isBus = !!dest.reverbSend;
      var rv = num(o.reverb, isBus ? 0 : def.reverb || 0);
      var dl = num(o.delay, isBus ? 0 : def.delay || 0);
      // { sendTo: { reverb, delay } }: the sends feed the caller's own nodes (which lead on to the
      // engine's reverb / delay) instead of the globals, so a caller's group processing (level,
      // filters, ducking, mute) reaches the wet signal too (round 3; used by build-score.js).
      var st = o.sendTo || {};
      var rTo = isNode(st.reverb) ? st.reverb : reverb, dTo = isNode(st.delay) ? st.delay : delay;
      if (rv > 0) { var rs = G(rv); pan.connect(rs); rs.connect(rTo); v.nodes.push(rs); }
      if (dl > 0) { var ds = G(dl); pan.connect(ds); ds.connect(dTo); v.nodes.push(ds); }
      v.out = outG; v.pan = pan; v.dest = dest;
      v.n = function (node) { v.nodes.push(node); return node; };
      v.src = function (s, start, stop) {
        v.nodes.push(s); v.srcs.push(s); v.live++;
        s.onended = onEnd;
        if (s._offset != null) s.start(start, s._offset); else s.start(start);
        s.stop(stop);
        if (stop > v.end) v.end = stop;
        return s;
      };
      // register a source that the caller already started (grains)
      v.adopt = function (s, end) {
        v.nodes.push(s); v.srcs.push(s); v.live++;
        s.onended = onEnd;
        if (end > v.end) v.end = end;
      };
      function onEnd() { if (--v.live <= 0) v.cleanup(); }
      v.cleanup = function () {
        if (v.gone) return;
        v.gone = v.dead = true;
        for (var i = 0; i < v.nodes.length; i++) { try { v.nodes[i].disconnect(); } catch (e) {} }
        v.nodes.length = 0; v.srcs.length = 0;
        var k = voices.indexOf(v);
        if (k >= 0) voices.splice(k, 1);
      };
      v.kill = function (fade) {
        if (v.dead) return;
        v.dead = true;
        var n = ctx.currentTime, f = Math.max(0.005, num(fade, 0.03));
        try { hold(outG.gain, n); outG.gain.linearRampToValueAtTime(0, n + f); } catch (e) {}
        for (var i = 0; i < v.srcs.length; i++) {
          try { v.srcs[i].stop(Math.max(n, v.t) + f + 0.01); } catch (e) {}
        }
        v.end = Math.min(v.end, Math.max(n, v.t) + f + 0.01);
      };
      v.commit = function () {
        if (!v.srcs.length) { v.cleanup(); return v; } // nothing scheduled (e.g. every grain was capped)
        voices.push(v); enforceCap(); return v;
      };
      return v;
    }
    // A voice counts as active if it sounds within the next 250 ms (notes scheduled
    // further ahead don't count yet, so pre-scheduled phrases are never culled early).
    function enforceCap() {
      var now = ctx.currentTime, horizon = now + 0.25, live = [];
      for (var i = voices.length - 1; i >= 0; i--) {
        var v = voices[i];
        if (v.end < now - 0.5) { v.cleanup(); continue; } // missed 'ended' (e.g. suspended ctx)
        if (!v.dead && v.end > now && v.t <= horizon) live.push(v);
      }
      var excess = live.length - MAX_VOICES;
      if (excess <= 0) return;
      live.sort(function (a, b) { return a.prio - b.prio || a.t - b.t; });
      for (i = 0; i < excess; i++) live[i].kill(0.02);
    }
    E.voiceCount = function () {
      var now = ctx.currentTime, c = 0;
      for (var i = 0; i < voices.length; i++) if (!voices[i].dead && voices[i].end > now) c++;
      return c;
    };
    E.stopAll = function (dest, fade) {
      var arr = voices.slice();
      for (var i = 0; i < arr.length; i++) if (!dest || arr[i].dest === dest) arr[i].kill(num(fade, 0.05));
    };

    /* ---- pumps: lookahead schedulers for continuous grain clouds.
       Realtime engines run their own 30 ms timer; offline engines are driven by E.pump(). */
    var pumps = [], pumpTimer = null, PUMP_LOOK = 0.16;
    E.pump = function (ahead) {
      var h = ctx.currentTime + Math.max(0.01, num(ahead, PUMP_LOOK));
      var arr = pumps.slice();
      for (var i = 0; i < arr.length; i++) { try { arr[i](h); } catch (e) { /* keep others alive */ } }
    };
    function addPump(fn) {
      pumps.push(fn);
      if (!OFFLINE && !pumpTimer && typeof setInterval === 'function') {
        pumpTimer = setInterval(function () { E.pump(PUMP_LOOK); }, 30);
      }
      return function () {
        var i = pumps.indexOf(fn);
        if (i >= 0) pumps.splice(i, 1);
        if (!pumps.length && pumpTimer) { clearInterval(pumpTimer); pumpTimer = null; }
      };
    }
    E.pumpCount = function () { return pumps.length; };

    /* ================================================================ MICRO BUILDING BLOCKS */

    // small classic building blocks
    function tone(v, to, type, f, t, a, tau, peak, fFrom, glide, detune) {
      var s = O(type, fFrom || f, detune || 0);
      if (fFrom) {
        s.frequency.setValueAtTime(clamp(fFrom, 1, NYQ), t);
        s.frequency.exponentialRampToValueAtTime(clamp(f, 1, NYQ), t + glide);
      }
      var g = v.n(G(0));
      var stop = perc(g.gain, t, a, tau, peak);
      s.connect(g); g.connect(to);
      v.src(s, t, stop);
      return s;
    }
    function burst(v, to, buf, ftype, freq, q, t, a, tau, peak) {
      var s = noiseSrc(buf);
      var f = v.n(F(ftype, freq, q)), g = v.n(G(0));
      var stop = perc(g.gain, t, a, tau, peak);
      s.connect(f); f.connect(g); g.connect(to);
      v.src(s, t, Math.min(stop, t + buf.duration * 0.19));
      return f;
    }
    function panTo(v, node, pan, to) {
      if (pan != null && HAS_PAN) { var p = v.n(PAN(pan)); node.connect(p); p.connect(to); } else node.connect(to);
    }

    // Small-speaker body (round 4). src must be a unit-amplitude oscillator BEFORE its envelope: its
    // harmonics 2–5 (CURVE_BODY) → 150–450 Hz band (2-pole each side) → gain `level` (× the engine's
    // { body } and the call's { body }, 0–2). Returns that gain node for the caller to connect into the
    // voice's envelope, or null when the body is off. level is the 3rd harmonic's amplitude re the
    // fundamental; 2nd and 4th sit 2.5 dB under it, 5th 8 dB (before the band).
    var BODY = clamp(num(opts.body, 1), 0, 2);
    E.body = BODY;
    function bodyInto(v, src, level, o) {
      var k = BODY * clamp(num(o && o.body, 1), 0, 2) * level;
      if (!(k > 0)) return null;
      var sh = v.n(SHAPER(CURVE_BODY)), hp = v.n(F('highpass', 150, 0.707)), lp = v.n(F('lowpass', 450, 0.707)), g = v.n(G(k));
      src.connect(sh); sh.connect(hp); hp.connect(lp); lp.connect(g);
      return g;
    }
    // register weight: full body up to ~80 Hz fundamentals, less as the fundamental itself reaches the
    // speaker band (98 Hz 0.86, 147 Hz 0.48, ≥ 200 Hz 0.3), so higher notes do not get brighter
    function bodyReg(f) { return clamp((210 - f) / 130, 0.3, 1); }
    // body levels per voice (3rd-harmonic amplitude re the fundamental, see bodyInto)
    // (kick / impact: the knock rises over 16 / 15 ms, so it sits behind the attack's peak. The kick's is kept
    // low: its energy is what the master glue reacts to in the scene-5 drops, +0.3 dB of reduction at 0.14)
    var BODY_LV = { sub: 0.13, bass: 0.15, kick: 0.14, impact: 0.15 };

    // Exact peak of the RBJ band-pass impulse response (Web Audio uses the same biquad),
    // so clicks/ticks can be specified by their true output peak.
    var bpCache = {};
    function bpPeak(freq, q) {
      var key = Math.round(freq) + ':' + Math.round(q * 20);
      var c = bpCache[key];
      if (c) return c;
      var w = (2 * Math.PI * freq) / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      var b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
      var x1 = 0, x2 = 0, y1 = 0, y2 = 0, pk = 0;
      for (var n = 0; n < 512; n++) {
        var x = n === 0 ? 1 : 0, y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        if (Math.abs(y) > pk) pk = Math.abs(y);
      }
      return (bpCache[key] = Math.max(pk, 1e-4));
    }
    // One digital click: a unit impulse through a band-pass (resonant ping at high q).
    function clickInto(v, to, t, freq, q, amp, pan) {
      freq = clamp(freq, 60, NYQ);
      q = clamp(q, 0.3, Math.max(0.5, Math.PI * freq * 0.012)); // ring ≤ ~12 ms (round 2: was 18)
      var s = ctx.createBufferSource(); s.buffer = IMP;
      var f = v.n(F('bandpass', freq, q)), g = v.n(G(amp / bpPeak(freq, q)));
      s.connect(f); f.connect(g);
      panTo(v, g, pan, to);
      v.src(s, t, t + IMP.duration);
    }
    // Tuned micro tick: resonant ping at the note, ring time ≈ dur.
    function tickInto(v, to, t, midi, dur, amp, pan) {
      var f = midiToHz(midi), d = clamp(dur, 0.0015, 0.008);
      clickInto(v, to, t, f, clamp((Math.PI * f * d) / 3, 1.5, 90), amp, pan);
    }
    // Bit: a looped sample-and-hold step wave (bit-reduced tone), hard-gated like data.
    function bitInto(v, to, t, midi, dur, amp, pan, kind, toMidi, lpHz) {
      var buf = STEPW[kind] || STEPW.s8, base = sr / STEP_LEN;
      dur = Math.max(0.004, dur);
      var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      var r0 = clamp(midiToHz(midi) / base, 0.02, 48);
      s.playbackRate.setValueAtTime(r0, t);
      if (isFinite(toMidi)) s.playbackRate.exponentialRampToValueAtTime(clamp(midiToHz(toMidi) / base, 0.02, 48), t + dur);
      var g = v.n(G(0));
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.0006);
      g.gain.setValueAtTime(amp, t + dur - 0.0015);
      g.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(g);
      var last = g;
      if (lpHz !== 0) { var lp = v.n(F('lowpass', num(lpHz, 5200), 0)); g.connect(lp); last = lp; }
      panTo(v, last, pan, to);
      v.src(s, t, t + dur + 0.004);
    }
    // Micro hat: high-passed white noise, 5–25 ms. Round 2: a gentler high-pass (smaller resonant
    // bump at the corner). Round 3: no presence boost (the +2 dB peak at 1.3× the corner is now a
    // -1.5 dB dip that flattens the high-pass bump) and the lowpass moves from one 12 kHz pole pair to
    // 9 kHz + 10.35 kHz, so the 5–10 kHz plateau of the drops comes down instead of the corner moving
    // into 2.5–5 kHz.
    function hatInto(v, to, t, dec, hpF, amp, lpHz) {
      var s = noiseSrc(WHITE);
      var hp = v.n(F('highpass', hpF, 1.2)), pk = v.n(F('peaking', Math.min(hpF * 1.3, 12000), 1.1));
      pk.gain.value = -1.5;
      var lf = clamp(num(lpHz, 9000), 3000, 14000);
      var lp = v.n(F('lowpass', lf, 0.6)), lp2 = v.n(F('lowpass', Math.min(lf * 1.15, NYQ), 0.5)); // ≈ 4-pole top
      var g = v.n(G(0));
      var stop = perc(g.gain, t, 0.0003, dec / 3.5, amp);
      s.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(lp2); lp2.connect(g); g.connect(to);
      v.src(s, t, Math.min(stop, t + dec * 2.4 + 0.012));
    }

    // Grains: global budget per 100 ms bucket (deterministic, works offline too).
    var grainBuckets = {}, grainCount = 0, GRAIN_CAP = num(opts.grainCap, 16);
    function grainOK(t) {
      var k = Math.floor(t * 10), c = grainBuckets[k] || 0;
      if (c >= GRAIN_CAP) return false;
      grainBuckets[k] = c + 1;
      if (++grainCount % 512 === 0) {
        var lim = Math.floor(ctx.currentTime * 10) - 20;
        for (var key in grainBuckets) if (+key < lim) delete grainBuckets[key];
      }
      return true;
    }
    // One windowed grain read from a random offset of a pre-rendered buffer.
    // Pitch = playbackRate relative to D5. If a voice is given, the grain is owned by it.
    function spawnGrain(to, t, midi, dur, amp, pan, glass, win, v) {
      if (!(amp > 0)) return null;
      t = Math.max(t, ctx.currentTime + 0.002);
      if (!grainOK(t)) return null;
      var buf = glass ? GB.glass : GB.pure;
      var rate = Math.pow(2, (midi - GRAIN_REF) / 12);
      if (midi > 76) amp *= Math.pow(2, -(midi - 76) / 24); // round 2: higher grains recede (−3 dB / octave above E5)
      dur = clamp(dur, 0.008, 1.5);
      var span = dur * rate;
      if (span > buf.duration - 0.05) { dur = (buf.duration - 0.05) / rate; span = dur * rate; }
      var off = Math.random() * (buf.duration - span - 0.02);
      var s = ctx.createBufferSource();
      s.buffer = buf; s.playbackRate.value = rate;
      var g = ctx.createGain(); g.gain.value = 0;
      g.gain.setValueCurveAtTime(scaledCurve(win || WIN_HANN, amp), t, dur);
      var p = PAN(pan);
      s.connect(g); g.connect(p); p.connect(to);
      s.start(t, off);
      s.stop(t + dur + 0.004);
      if (v) { v.n(g); v.n(p); v.adopt(s, t + dur + 0.004); }
      else s.onended = function () { try { s.disconnect(); g.disconnect(); p.disconnect(); } catch (e) {} };
      return s;
    }

    // Grain cloud scheduler (shared by granular(), drone(), and the groove's bed).
    var CLOUD_LIM = { density: [0, 90], dur: [0.012, 0.6], spread: [0, 1], bright: [0, 1], jitter: [0, 1], detune: [0, 100], octave: [0, 1], amp: [0, 4] };
    var CLOUD_DEF = { density: 16, dur: 0.07, spread: 0.7, bright: 0.5, jitter: 0.8, detune: 5, octave: 0.12, amp: 1 };
    // maxM: pitch ceiling. Pool notes above it fold down in octaves, and the random octave jump
    // goes down instead of up when an upward jump would cross it (Infinity = no ceiling).
    function Cloud(to, prm, pool, win, maxM) {
      prm = prm || {};
      var P = {}, ramps = {}, k, MX = maxM === Infinity ? Infinity : num(maxM, TONAL_MAX);
      function ceil(arr) { return MX === Infinity ? arr : arr.map(function (m) { return fold(m, MX); }); }
      for (k in CLOUD_DEF) P[k] = clamp(num(prm[k], CLOUD_DEF[k]), CLOUD_LIM[k][0], CLOUD_LIM[k][1]);
      var cur = ceil(list(pool)); if (!cur.length) cur = ceil([74, 76, 78, 81, 83, 86]);
      var prev = null, pt0 = 0, pt1 = 0;
      var cl = { P: P, nextT: ctx.currentTime, endT: Infinity, count: 0 };
      function val(name, t) {
        var r = ramps[name];
        if (!r) return P[name];
        if (t >= r.t1) { P[name] = r.b; delete ramps[name]; return r.b; }
        if (t <= r.t0) return r.a;
        return r.a + ((r.b - r.a) * (t - r.t0)) / (r.t1 - r.t0);
      }
      cl.val = val;
      cl.set = function (p, t0, r) {
        for (var name in CLOUD_LIM) {
          if (!isFinite(p[name])) continue;
          var b = clamp(p[name], CLOUD_LIM[name][0], CLOUD_LIM[name][1]);
          if (r > 0.001) ramps[name] = { a: val(name, t0), b: b, t0: t0, t1: t0 + r };
          else { P[name] = b; delete ramps[name]; }
        }
      };
      cl.setPool = function (np, t0, r) {
        np = ceil(list(np));
        if (!np.length) return;
        prev = cur; cur = np; pt0 = t0; pt1 = t0 + Math.max(0.001, num(r, 0));
      };
      function pitchAt(t) {
        var src = cur;
        if (prev && t < pt1 && Math.random() > (t - pt0) / (pt1 - pt0)) src = prev;
        var m = pick(src);
        if (Math.random() < val('octave', t)) m += Math.random() < 0.65 && m + 12 <= MX ? 12 : -12;
        return m;
      }
      cl.pump = function (h) {
        var now = ctx.currentTime, guard = 0, lim = Math.min(h, cl.endT);
        if (cl.nextT < now) cl.nextT = now + 0.004;
        while (cl.nextT < lim && guard++ < 400) {
          var t = cl.nextT, d = val('density', t);
          if (d < 0.05) { cl.nextT = t + 0.05; continue; }
          var gd = val('dur', t), jit = val('jitter', t), sp = val('spread', t);
          var a = (val('amp', t) * rand(0.5, 1)) / Math.sqrt(Math.max(1, d * gd));
          var m = pitchAt(t) + (rand(-1, 1) * val('detune', t)) / 100;
          spawnGrain(to, t, m, gd * rand(0.8, 1.25), a, rand(-sp, sp), Math.random() < val('bright', t), win);
          cl.count++;
          cl.nextT = t + Math.max(0.002, (1 / d) * (1 - jit + jit * expRand()));
        }
      };
      return cl;
    }
    E.Cloud = Cloud;

    /* ================================================================ INSTRUMENTS */
    var P = {};

    /* ---------------- microsound / granular: the core vocabulary */

    // One digital click / "bit" of texture. { freq (Hz, default random 1.8–5.6 kHz), q, gain, pan }
    // Round 2: −2.5 dB (≈ −4 dB peak at the output), and a requested freq above 2 kHz is centred
    // lower (darkHz: 9 kHz → 6.5 kHz). Still crisp: this is the typing sound.
    P.click = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.112, reverb: 0, delay: 0.04 });
      var f = isFinite(o.freq) ? (o.allowHigh ? o.freq : darkHz(o.freq)) : rand(1800, 5600);
      clickInto(v, v.out, v.t, f, num(o.q, rand(1.4, 3.5)), 1);
      v.commit();
    };

    // Tuned micro tick (2–8 ms resonant burst). Use degree(i, 0..1) (D4–A5); pitches above A6
    // (MIDI 93) fold down an octave (round 2), and the tick is −3 dB and a little shorter.
    P.tick = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.105, reverb: 0.03, delay: 0.08 });
      tickInto(v, v.out, v.t, foldIf(midi, o, TICK_MAX) + rand(-0.03, 0.03), num(o.dur, 0.004), 1);
      // a whisper of broadband edge so it reads as a "tick", not a tone
      clickInto(v, v.out, v.t, 4800, 0.9, 0.1);
      v.commit();
    };

    // Tiny bit-reduced square-ish bleep (10–40 ms): the "data" sound.
    // { dur, steps: 's8'|'s4'|'s16'|'pulse' (or 4/8/16), to (glide target midi), crush }
    P.bit = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.092, reverb: 0.02, delay: 0.06 });
      var kind = o.steps === 4 ? 's4' : o.steps === 16 ? 's16' : STEPW[o.steps] ? o.steps : 's8';
      var to = v.out, m = foldIf(midi, o, TICK_MAX), toM = num(o.to, NaN);
      if (isFinite(toM)) toM += m - midi; // a glide keeps its interval when the start note folds
      if (o.crush) { var sh = v.n(SHAPER(CURVE_CRUSH3)), pre = v.n(G(0.9)); pre.connect(sh); sh.connect(v.out); to = pre; }
      bitInto(v, to, v.t, m, clamp(num(o.dur, 0.022), 0.005, 0.2), 1, null, kind, toM);
      v.commit();
    };

    // Scatter of bits/clicks/ticks. { dur=0.25, density=40 (events/s), pitch:[midis], spread 0..1, gain }
    P.data = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.072, reverb: 0.03, delay: 0.07 });
      var t = v.t, dur = clamp(num(o.dur, 0.25), 0.01, 8), dens = clamp(num(o.density, 40), 1, 160);
      var pool = list(o.pitch); if (!pool.length) pool = DATA_PITCH;
      var hi = !!o.allowHigh;
      pool = pool.map(function (m) { return hi ? m : fold(m, TICK_MAX); });
      var sp = clamp(num(o.spread, 0.8), 0, 1);
      var pc = clamp(num(o.clicks, 0.5), 0, 1), pb = clamp(num(o.bits, 0.33), 0, 1);
      var lp = v.n(F('lowpass', 5200, 0)); lp.connect(v.out);
      var tt = t + rand(0, 0.4 / dens), n = 0;
      while (tt < t + dur && n++ < 320) {
        var x = (tt - t) / dur, w = Math.max(0, Math.min(1, x / 0.15, (1 - x) / 0.15));
        var a = rand(0.45, 1) * (0.35 + 0.65 * w), pan = rand(-sp, sp), r = Math.random();
        if (r < pc) clickInto(v, v.out, tt, rand(1900, 5600), rand(1.4, 4.5), a, pan);
        else if (r < pc + pb) bitInto(v, lp, tt, pick(pool), rand(0.006, 0.018), a * 0.85, pan, pick(BIT_KINDS), NaN, 0);
        else tickInto(v, v.out, tt, hi ? pick(pool) + 12 : fold(pick(pool) + 12, TICK_MAX), rand(0.003, 0.005), a, pan);
        tt += Math.max(0.003, expRand() / dens);
      }
      v.commit();
    };

    // One windowed glassy grain (15–120 ms). { dur, bright 0..1, gain, pan, allowHigh }
    // Round 2: folds above A5, and the lowpass is darker (1.3–4.2 kHz, and at most ~5× the pitch).
    P.grain = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.18, reverb: 0.12, delay: 0.1 });
      var t = v.t, dur = clamp(num(o.dur, 0.06), 0.012, 0.4), br = clamp(num(o.bright, 0.5), 0, 1);
      var m = foldIf(midi, o, TONAL_MAX);
      var lp = v.n(F('lowpass', Math.min(1300 * Math.pow(3.2, br), Math.max(1000, midiToHz(m) * 5)), 0));
      lp.connect(v.out);
      var win = dur > 0.1 ? WIN_TUKEY : WIN_HANN;
      spawnGrain(lp, t, m, dur, 1 - br * 0.5, 0, false, win, v);
      if (br > 0.02) spawnGrain(lp, t, m, dur, br * 0.6, 0, true, win, v);
      v.commit();
    };

    // Stutter / buffer-repeat artifact. { repeats=6, len=0.03, midi?, factor (0.8 = accelerating),
    //   shape: 'shrink'|'grow'|'even', crush, gain, pan }
    P.glitch = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.17, reverb: 0.03, delay: 0.08 });
      var t = v.t, reps = clamp(Math.round(num(o.repeats, 6)), 1, 32), len = clamp(num(o.len, 0.03), 0.004, 0.25);
      var shape = o.shape === 'grow' ? 1.22 : o.shape === 'even' ? 1 : 0.8;
      var fac = clamp(num(o.factor, shape), 0.5, 1.6);
      var pitched = isFinite(o.midi), rate = pitched ? Math.pow(2, (foldIf(o.midi, o, TICK_MAX) - GRAIN_REF) / 12) : 1;
      var segs = pitched ? [0, 1] : [0, 1, 2, 3], sg = pick(segs), seg = SRC.seg;
      var maxSpan = len * rate * Math.max(1, Math.pow(fac, reps - 1));
      var off = sg * seg + rand(0.003, Math.max(0.004, seg - Math.min(seg - 0.01, maxSpan) - 0.004));
      var to = v.out;
      if (o.crush) { var sh = v.n(SHAPER(CURVE_CRUSH4)); sh.connect(v.out); to = sh; }
      var lp = v.n(F('lowpass', 5500, 0)); lp.connect(to);
      var tt = t, l = len;
      for (var k = 0; k < reps; k++) {
        var s = ctx.createBufferSource(); s.buffer = GLITCH; s.playbackRate.value = rate;
        var g = v.n(G(0)), a = shape > 1 ? 0.55 + 0.45 * (k / Math.max(1, reps - 1)) : 1 - 0.45 * (k / Math.max(1, reps - 1));
        var L = Math.max(0.004, l);
        g.gain.setValueAtTime(0, tt);
        g.gain.linearRampToValueAtTime(a, tt + 0.0006);
        g.gain.setValueAtTime(a, tt + L - 0.0012);
        g.gain.linearRampToValueAtTime(0, tt + L);
        s.connect(g);
        panTo(v, g, clamp((k % 2 ? 1 : -1) * (0.12 + 0.35 * k / reps) + num(o.pan, 0), -1, 1), lp);
        s._offset = Math.min(off, GLITCH.duration - L * rate - 0.002);
        v.src(s, tt, tt + L + 0.002);
        tt += L;
        l *= fac;
      }
      v.commit();
    };

    // Micro-hat roll. { count=4, span=stepDur, gain, dir:'up'|'down', pan }
    P.ratchet = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.1, pan: rand(-0.25, 0.25), reverb: 0, delay: 0.05 });
      var t = v.t, n = clamp(Math.round(num(o.count, 4)), 2, 16), span = clamp(num(o.span, E.stepDur()), 0.02, 2);
      var up = o.dir !== 'down', f0 = rand(5400, 6400);
      for (var k = 0; k < n; k++) {
        var x = k / (n - 1), a = up ? 0.35 + 0.65 * x : 1 - 0.65 * x;
        hatInto(v, v.out, t + (k * span) / n, 0.007 + 0.003 * (up ? x : 1 - x), f0 * (1 + 0.2 * x), a);
      }
      v.commit();
    };

    // Clean sine sub pulse (+ a hint of 2nd harmonic, { harmonic } = its level, default 0.1).
    // { dur, body (small-speaker body 0–2, default 1) }. Round 4: + the small-speaker body (bodyInto).
    P.sub = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.5, reverb: 0, delay: 0 });
      var t = v.t, f = midiToHz(midi), dur = clamp(num(o.dur, 0.25), 0.04, 4);
      var s = O('sine', f), h = O('sine', f * 2);
      s.frequency.setValueAtTime(f * 1.035, t);
      s.frequency.exponentialRampToValueAtTime(f, t + 0.02);
      var hg = v.n(G(num(o.harmonic, 0.1))), amp = v.n(G(0));
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(1, t + 0.0025);
      amp.gain.setValueAtTime(1, t + dur * 0.35);
      amp.gain.setTargetAtTime(0, t + dur * 0.35, dur * 0.22);
      var stop = t + dur * 0.35 + dur * 0.22 * 7;
      s.connect(amp); h.connect(hg); hg.connect(amp); amp.connect(v.out);
      var bd = bodyInto(v, s, BODY_LV.sub * bodyReg(f), o);
      if (bd) bd.connect(amp);
      v.src(s, t, stop); v.src(h, t, stop);
      v.commit();
    };

    /* ---------------- minimal techno / IDM kit */

    // Tight clicky kick: short sine drop, 1–2 ms click, clean low end.
    // Round 4: + a small-speaker knock — the body's own harmonics (bodyInto) under a 16 ms attack that
    // decays with decay/6.5 (~28 ms): the attack click stays the first thing heard, and the knock sits
    // behind the first cycles' peak (+0.2 dB peak). { body } scales it.
    P.kick = function (o) {
      o = o || {};
      var v = Voice(o, { level: 1.05, reverb: 0, delay: 0 });
      var t = v.t, dec = clamp(num(o.decay, 0.18), 0.06, 1.2);
      var hi = num(o.pitch, 170), lo = num(o.low, 48);
      var body = O('sine', hi);
      body.frequency.setValueAtTime(hi, t);
      body.frequency.exponentialRampToValueAtTime(lo * 1.3, t + 0.03);
      body.frequency.exponentialRampToValueAtTime(lo, t + 0.13);
      var bg = v.n(G(0)), sh = v.n(SHAPER(CURVE_WARM)), post = v.n(G(0.95));
      bg.gain.setValueAtTime(0, t);
      bg.gain.linearRampToValueAtTime(1, t + 0.001);
      bg.gain.setValueAtTime(1, t + 0.006);
      bg.gain.setTargetAtTime(0, t + 0.006, dec / 4.5);
      var stop = t + 0.006 + dec * 1.7;
      body.connect(bg); bg.connect(sh); sh.connect(post); post.connect(v.out);
      var kb = bodyInto(v, body, BODY_LV.kick, o);
      if (kb) {
        var ke = v.n(G(0));
        ke.gain.setValueAtTime(0, t);
        ke.gain.linearRampToValueAtTime(1, t + 0.016);
        ke.gain.setTargetAtTime(0, t + 0.016, dec / 6.5);
        kb.connect(ke); ke.connect(v.out);
      }
      v.src(body, t, stop);
      var c = clamp(num(o.click, 1), 0, 2);
      if (c > 0) {
        clickInto(v, v.out, t, 3400, 0.8, 0.28 * c);           // the punch (kept)
        clickInto(v, v.out, t + 0.0004, 6200, 1.2, 0.045 * c); // the edge (round 2: 9.5 kHz → 6.2 kHz, −5 dB)
      }
      v.commit();
    };

    // Micro hat: 5–20 ms high-passed noise with randomized colour and pan. {open:true} ≈ 55–80 ms.
    // Round 2: corner 4.2–6.4 kHz (was 4.8–7.6), gentler resonance, 10% shorter.
    // Round 3: flat top + 9 kHz lowpass (hatInto), and the digital edge click moves from 3.8–5.4 kHz
    // at 0.3 to 2.8–3.6 kHz at 0.2. `tone` < 1 lowers the corner, i.e. adds 2.5–5 kHz presence
    // (the most sensitive band) — prefer tone ≥ 1, a lower gain and { lp } (lowpass Hz, default 9000)
    // for a darker hat.
    P.hat = function (o) {
      o = o || {};
      var open = !!o.open;
      var v = Voice(o, { level: open ? 0.12 : 0.2, pan: rand(-0.3, 0.3), reverb: open ? 0.04 : 0, delay: 0 });
      var dec = clamp(num(o.decay, open ? rand(0.06, 0.09) : rand(0.01, 0.02)), 0.004, 0.5) * 0.9;
      hatInto(v, v.out, v.t, dec, rand(4200, 6400) * num(o.tone, 1), 1, o.lp);
      clickInto(v, v.out, v.t, rand(2800, 3600), rand(2, 3.5), open ? 0.12 : 0.2); // digital edge
      v.commit();
    };

    // Clicky rim / glitch snare: short noise + tuned "tock", occasionally bit-crushed.
    // { decay, midi (tone, default E5), crush (bool | probability, default 0.2) }
    P.snare = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.22, reverb: 0.06, delay: 0.03 });
      var t = v.t, dec = clamp(num(o.decay, 0.042), 0.015, 0.4);
      var cr = o.crush === true ? 1 : o.crush === false ? 0 : num(o.crush, 0.2);
      var mix = v.n(G(1)), to = mix;
      if (Math.random() < cr) {
        var sh = v.n(SHAPER(CURVE_CRUSH3)), lpc = v.n(F('lowpass', 6500, 0));
        mix.connect(sh); sh.connect(lpc); lpc.connect(v.out);
      } else mix.connect(v.out);
      var s = noiseSrc(WHITE), hp = v.n(F('highpass', 1700, 0)), bp = v.n(F('peaking', 3000, 1.1));
      bp.gain.value = 2;
      var nlp = v.n(F('lowpass', 8000, 0.5)); // round 3: the noise had no top roll-off (fizz to 10 kHz+)
      var ng = v.n(G(0));
      var stop = perc(ng.gain, t, 0.0005, dec / 3.2, 0.55);
      s.connect(hp); hp.connect(bp); bp.connect(nlp); nlp.connect(ng); ng.connect(to);
      v.src(s, t, stop);
      var f = midiToHz(num(o.midi, 76));
      tone(v, to, 'triangle', f, t, 0.0006, 0.011, 0.8, f * 1.25, 0.006);
      tone(v, to, 'sine', f * 1.68, t, 0.0004, 0.006, 0.35);
      clickInto(v, to, t, 4200, 1.3, 0.28);
      v.commit();
    };

    // Tight clap: four quick noise bursts + a short tail.
    P.clap = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.5, reverb: 0.08, delay: 0.02 });
      var t = v.t, dec = clamp(num(o.decay, 0.06), 0.02, 0.4);
      var s = noiseSrc(WHITE), hp = v.n(F('highpass', 900, 0)), bp = v.n(F('bandpass', 1700, 1.2));
      var eg = v.n(G(0)), g = eg.gain;
      var gaps = [0, 0.0065, 0.013, 0.0205];
      g.setValueAtTime(0, t);
      for (var i = 0; i < gaps.length; i++) {
        var tg = t + gaps[i] + (i ? rand(-0.0006, 0.0006) : 0);
        g.setValueAtTime(0.9, tg);
        g.setTargetAtTime(0.05, tg + 0.0003, 0.0022);
      }
      var tt = t + 0.026;
      g.setValueAtTime(0.6, tt);
      g.setTargetAtTime(0, tt, dec / 3);
      var stop = tt + dec * 2.6;
      s.connect(hp); hp.connect(bp); bp.connect(eg); eg.connect(v.out);
      v.src(s, t, stop);
      v.commit();
    };

    // Subtle shaker: band-passed noise with a soft swell.
    P.shaker = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.082, pan: -0.22, reverb: 0.03, delay: 0 });
      var t = v.t, dec = Math.max(0.01, num(o.decay, 0.03)), atk = Math.max(0.002, num(o.attack, 0.006));
      var s = noiseSrc(WHITE);
      var bp = v.n(F('bandpass', 5600 * rand(0.93, 1.07), 1.3)), hp = v.n(F('highpass', 3600, 0));
      var g = v.n(G(0));
      var stop = perc(g.gain, t, atk, dec / 3, rand(0.8, 1));
      s.connect(bp); bp.connect(hp); hp.connect(g); g.connect(v.out);
      v.src(s, t, stop);
      v.commit();
    };

    /* ---------------- tonal (glassy / granular; use sparingly) */

    // Soft glassy pluck: sine + triangle, a tiny FM "tink" on the attack, short lowpassed tail.
    // Round 2: folds above A5, smaller FM "tink", darker lowpass, 3 ms attack.
    P.pluck = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.26, reverb: 0.1, delay: 0.12 });
      var t = v.t, f = midiToHz(foldIf(midi, o, TONAL_MAX)), dec = Math.max(0.05, num(o.dur, 0.32));
      var br = clamp(num(o.bright, 0.6), 0, 1);
      var car = O('sine', f), tri = O('triangle', f, 3), mod = O('sine', f * 3), mg = v.n(G(0));
      mg.gain.setValueAtTime(f * 3 * (0.25 + 0.6 * br), t);
      mg.gain.setTargetAtTime(0, t, 0.005 + 0.008 * (1 - br));
      mod.connect(mg); mg.connect(car.frequency);
      var gc = v.n(G(0.74)), gt = v.n(G(0.22));
      var lp = v.n(F('lowpass', 1000, 0));
      lp.frequency.setValueAtTime(Math.min(f * (2.5 + 3.5 * br), 4500), t);
      lp.frequency.setTargetAtTime(Math.max(f * 1.6, 600), t + 0.003, 0.04 + dec * 0.1);
      var amp = v.n(G(0));
      var stop = perc(amp.gain, t, 0.003, dec * 0.3, 1);
      car.connect(gc); tri.connect(gt); gc.connect(lp); gt.connect(lp); lp.connect(amp); amp.connect(v.out);
      v.src(car, t, stop); v.src(tri, t, stop); v.src(mod, t, stop);
      v.commit();
    };

    // Soft crystalline ping: short, low-index FM, grain-like attack, quiet.
    // Round 2: folds above A5, FM index 0.4 (was 0.6), lowpass ≤ 4× pitch / 3.8 kHz, 6 ms attack,
    // and the octave partial is quieter (and halved again when it would sit above 1.2 kHz).
    P.bell = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.14, reverb: 0.16, delay: 0.1, prio: 1 });
      var t = v.t, f = midiToHz(foldIf(midi, o, TONAL_MAX)), dec = clamp(num(o.dur, 1.1), 0.1, 6);
      var ratio = num(o.ratio, 3), idx = num(o.index, 0.4);
      var car = O('sine', f), mod = O('sine', f * ratio), mg = v.n(G(0));
      mg.gain.setValueAtTime(f * ratio * idx, t);
      mg.gain.setTargetAtTime(f * ratio * idx * 0.1, t, 0.05);
      mod.connect(mg); mg.connect(car.frequency);
      var amp = v.n(G(0));
      var stop = perc(amp.gain, t, 0.006, dec / 5, 1);
      var lp = v.n(F('lowpass', Math.min(3800, f * 4), 0));
      car.connect(amp); amp.connect(lp); lp.connect(v.out);
      tone(v, lp, 'sine', f * 2, t, 0.004, dec / 14, f * 2 > 1200 ? 0.03 : 0.06, 0, 0, 3);
      v.src(car, t, stop); v.src(mod, t, stop);
      v.commit();
    };

    // Warm, muted "IDM keys": two sines (slightly detuned) with gentle 1:1 FM that settles to
    // near-pure; soft attack, lowpassed, a faint digital click on the onset. No tine bark, no tremolo.
    // Round 2: folds above A5, gentler FM (0.2–0.5 settling to 0.06), darker lowpass, 8 ms attack,
    // and a lower, quieter onset click.
    P.keys = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.2, reverb: 0.12, delay: 0.1 });
      var t = v.t, f = midiToHz(foldIf(midi, o, TONAL_MAX)), dur = Math.max(0.05, num(o.dur, 0.9));
      var vel = clamp(num(o.vel, 0.8), 0, 1);
      var car = O('sine', f), car2 = O('sine', f, 6), mod = O('sine', f), mg = v.n(G(0));
      mg.gain.setValueAtTime(f * (0.2 + 0.3 * vel), t);
      mg.gain.setTargetAtTime(f * 0.06, t, 0.12);
      mod.connect(mg); mg.connect(car.frequency); mg.connect(car2.frequency);
      var g1 = v.n(G(0.62)), g2 = v.n(G(0.38)), amp = v.n(G(0));
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(1, t + 0.008);
      amp.gain.setTargetAtTime(0, t + 0.008, 0.6 * Math.pow(440 / f, 0.3));
      amp.gain.setTargetAtTime(0, t + dur, 0.08);
      var stop = t + dur + 0.6;
      var lp = v.n(F('lowpass', 1000, 0)), hp = v.n(F('highpass', 140, 0));
      lp.frequency.setValueAtTime(Math.min(f * 3.5, 2800), t);
      lp.frequency.setTargetAtTime(Math.min(f * 2.2, 1700), t, 0.2);
      car.connect(g1); car2.connect(g2); g1.connect(amp); g2.connect(amp);
      amp.connect(lp); lp.connect(hp); hp.connect(v.out);
      v.src(car, t, stop); v.src(car2, t, stop); v.src(mod, t, stop);
      if (o.click !== false) clickInto(v, v.out, t, rand(2200, 3400), 2, 0.035 * vel);
      v.commit();
    };

    // Airy pad: sine + triangle per note through a slowly breathing lowpass, plus a shimmer of
    // Tukey-windowed grains an octave or two above. { dur, attack, release, cutoff, grains (/s), bright,
    // width (stereo spread multiplier, default 1) }. Round 3: the shimmer folds above A4 like clouds.
    P.pad = function (midis, o) {
      o = o || {}; var notes = list(midis); if (!notes.length) return;
      var v = Voice(o, { level: 0.2, reverb: 0.18, delay: 0.05, prio: 2 });
      var t = v.t, dur = Math.max(0.05, num(o.dur, 4));
      var atk = Math.max(0.005, num(o.attack, 0.9)), rel = Math.max(0.02, num(o.release, 1.6));
      var cutoff = clamp(num(o.cutoff, 1400), 200, 12000);
      var norm = 1 / Math.sqrt(notes.length);
      var stop = t + dur + rel * 1.8 + 0.05;
      var amp = v.n(G(0)), hp = v.n(F('highpass', num(o.highpass, 150), 0));
      amp.gain.setValueAtTime(0, t);
      amp.gain.setTargetAtTime(1, t, atk / 3);
      amp.gain.setTargetAtTime(0, t + dur, rel / 4.5);
      var lp = v.n(F('lowpass', cutoff * 0.5, 0));
      lp.frequency.setValueAtTime(cutoff * 0.5, t);
      lp.frequency.setTargetAtTime(cutoff, t, atk * 0.5);
      lp.frequency.setTargetAtTime(cutoff * 0.6, t + dur, rel * 0.4);
      var lfo = O('sine', rand(0.08, 0.14)), lg = v.n(G(cutoff * 0.16));
      lfo.connect(lg); lg.connect(lp.frequency);
      v.src(lfo, t, stop);
      var wid = clamp(num(o.width, 1), 0, 1.6);
      for (var i = 0; i < notes.length; i++) {
        var fq = midiToHz(notes[i]), side = clamp((i % 2 ? 1 : -1) * (0.25 + (0.4 * i) / notes.length) * wid, -1, 1);
        var s = O('sine', fq, -4), tr = O('triangle', fq, 5);
        var gs = v.n(G(0.55 * norm)), gt = v.n(G(0.3 * norm)), p = v.n(PAN(side));
        s.connect(gs); tr.connect(gt); gs.connect(p); gt.connect(p); p.connect(lp);
        v.src(s, t + rand(0, 0.01), stop); v.src(tr, t + rand(0, 0.01), stop);
      }
      lp.connect(amp); amp.connect(hp); hp.connect(v.out);
      var gd = clamp(num(o.grains, 9), 0, 40);
      if (gd > 0) {
        var gg = v.n(G(num(o.shimmer, 0.3)));
        gg.connect(amp);
        var tt = t + rand(0, 1 / gd), endG = t + dur + rel * 0.5, count = 0, br = clamp(num(o.bright, 0.4), 0, 1);
        while (tt < endG && count++ < 240) {
          var m = foldIf(pick(notes) + (Math.random() < 0.7 ? 12 : 24), o, CLOUD_MAX);
          spawnGrain(gg, tt, m, rand(0.09, 0.16), rand(0.4, 1) * norm, rand(-0.8, 0.8), Math.random() < br, WIN_TUKEY);
          tt += (1 / gd) * (0.3 + 1.4 * Math.random());
        }
      }
      v.commit();
    };

    // Clean sine sub bass with a hint of 2nd harmonic; optional glide from o.from.
    // Round 4: + the small-speaker body (bodyInto; follows the glide). { body } scales it.
    P.bass = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.44, reverb: 0, delay: 0 });
      var t = v.t, f = midiToHz(midi), dur = Math.max(0.03, num(o.dur, 0.4));
      var glide = Math.max(0.005, num(o.glide, 0.045));
      var sub = O('sine', f), h2 = O('sine', f * 2);
      if (isFinite(o.from)) {
        var f0 = midiToHz(o.from);
        sub.frequency.setValueAtTime(f0, t); sub.frequency.exponentialRampToValueAtTime(f, t + glide);
        h2.frequency.setValueAtTime(f0 * 2, t); h2.frequency.exponentialRampToValueAtTime(f * 2, t + glide);
      }
      var hg = v.n(G(clamp(num(o.bright, 0.5), 0, 1) * 0.3)), amp = v.n(G(0));
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(1, t + 0.004);
      amp.gain.setTargetAtTime(0.82, t + 0.004, 0.15);
      amp.gain.setTargetAtTime(0, t + dur, 0.02);
      var stop = t + dur + 0.16;
      sub.connect(amp); h2.connect(hg); hg.connect(amp); amp.connect(v.out);
      var bd = bodyInto(v, sub, BODY_LV.bass * bodyReg(f), o);
      if (bd) bd.connect(amp);
      tone(v, v.out, 'sine', f * 3, t, 0.001, 0.012, 0.07);
      v.src(sub, t, stop); v.src(h2, t, stop);
      v.commit();
    };

    // Lead: sine + soft triangle with gentle FM, delayed shallow vibrato, portamento from o.from.
    // Round 2: folds above A5 (a glide keeps its interval), FM 0.16, default cutoff 2 kHz.
    P.lead = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.24, reverb: 0.14, delay: 0.16, prio: 1 });
      var m = foldIf(midi, o, TONAL_MAX);
      var t = v.t, f = midiToHz(m), dur = Math.max(0.05, num(o.dur, 0.5));
      var glide = Math.max(0.005, num(o.glide, 0.08));
      var a = O('sine', f), b = O('triangle', f, 4), mod = O('sine', f), mg = v.n(G(f * 0.16));
      if (isFinite(o.from)) {
        var f0 = midiToHz(o.from + m - midi);
        [a, b, mod].forEach(function (x) {
          x.frequency.setValueAtTime(f0, t);
          x.frequency.exponentialRampToValueAtTime(f, t + glide);
        });
      }
      mod.connect(mg); mg.connect(a.frequency);
      var stop = t + dur + 0.4;
      var lfo = O('sine', num(o.vibRate, 5.2)), vg = v.n(G(0));
      vg.gain.setValueAtTime(0, t);
      vg.gain.setValueAtTime(0, t + Math.min(0.18, dur * 0.4));
      vg.gain.linearRampToValueAtTime(num(o.vibrato, 8), t + Math.min(0.5, dur * 0.9) + 0.01);
      lfo.connect(vg); vg.connect(a.detune); vg.connect(b.detune);
      var cut = clamp(num(o.cutoff, 2000), 300, 12000);
      var lp = v.n(F('lowpass', cut, 0));
      lp.frequency.setValueAtTime(cut, t);
      lp.frequency.setTargetAtTime(cut * 0.7, t + 0.05, 0.3);
      var ga = v.n(G(0.7)), gb = v.n(G(0.3)), amp = v.n(G(0));
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(1, t + 0.012);
      amp.gain.setTargetAtTime(0.8, t + 0.012, 0.15);
      amp.gain.setTargetAtTime(0, t + dur, 0.06);
      a.connect(ga); b.connect(gb); ga.connect(lp); gb.connect(lp); lp.connect(amp); amp.connect(v.out);
      v.src(a, t, stop); v.src(b, t, stop); v.src(mod, t, stop); v.src(lfo, t, stop);
      v.commit();
    };

    // Filtered noise burst/bed. { dur, attack, release, filter, freq, freqTo (sweep over the whole
    // note), q, type, level0 (level the attack starts from, 0..1: resuming a swell mid-way) }
    P.noise = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.5, reverb: 0.08, delay: 0 });
      var t = v.t, dur = Math.max(0, num(o.dur, 0.5));
      var atk = Math.max(0.001, num(o.attack, 0.01)), rel = Math.max(0.005, num(o.release, 0.2));
      var ftype = /^(lowpass|highpass|bandpass|notch|allpass|peaking|lowshelf|highshelf)$/.test(o.filter) ? o.filter : 'lowpass';
      var s = noiseSrc(o.type === 'white' ? WHITE : PINK);
      var f0 = clamp(num(o.freq, 2000), 10, NYQ);
      var f = v.n(F(ftype, f0, num(o.q, 0.7)));
      // round 3: anchor the sweep at the note's start (without it the ramp ran from the call time)
      f.frequency.setValueAtTime(f0, t);
      if (isFinite(o.freqTo)) f.frequency.exponentialRampToValueAtTime(clamp(o.freqTo, 20, NYQ), t + atk + dur + rel);
      var g = v.n(G(0));
      g.gain.setValueAtTime(clamp(num(o.level0, 0), 0, 1), t);
      g.gain.linearRampToValueAtTime(1, t + atk);
      g.gain.setValueAtTime(1, t + atk + dur);
      g.gain.setTargetAtTime(0, t + atk + dur, rel / 4.5);
      var stop = t + atk + dur + rel * 1.7;
      s.connect(f); f.connect(g); g.connect(v.out);
      v.src(s, t, stop);
      v.commit();
    };

    // Riser: band-passed noise sweep + an accelerating stream of tuned micro-ticks climbing
    // the pentatonic scale (rhythmic micro-sounds evolving into the downbeat).
    // { dur, midi, octaves, freq (sweep start, default 400 Hz), phase (0..1) }
    // `phase` resumes a riser part-way (round 3): `dur` is then the REMAINING length, and the sweep,
    // the swell, the pan and the tick climb continue from where an uninterrupted riser would be.
    P.riser = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.22, reverb: 0.12, delay: 0.1, prio: 1 });
      var ph = clamp(num(o.phase, 0), 0, 0.98);
      var t = v.t, dur = clamp(num(o.dur, 2), 0.05, 16), end = t + dur;
      var total = dur / (1 - ph), ts = t - ph * total;           // the uninterrupted riser's start
      var base = num(o.midi, KEY.root + 12), oct = clamp(num(o.octaves, 1.5), 0.25, 4);
      var fA = clamp(num(o.freq, 400), 60, 4000), fB = o.allowHigh ? 7000 : 4800;
      var s = noiseSrc(WHITE), bp = v.n(F('bandpass', fA, 1.6)), ng = v.n(G(0));
      bp.frequency.setValueAtTime(fA * Math.pow(fB / fA, ph), t);
      bp.frequency.exponentialRampToValueAtTime(fB, end);
      ng.gain.setValueAtTime(0.0001 * Math.pow(5000, ph), t);
      ng.gain.exponentialRampToValueAtTime(0.5, end);
      ng.gain.setValueAtTime(0.5, end);
      ng.gain.linearRampToValueAtTime(0, end + 0.01);
      s.connect(bp); bp.connect(ng); ng.connect(v.out);
      v.src(s, t, end + 0.03);
      if (HAS_PAN) { v.pan.pan.setValueAtTime(-0.4 + 0.8 * ph, t); v.pan.pan.linearRampToValueAtTime(0.4, end); }
      var notes = scaleNotes(base, base + 12 * oct);
      if (!notes.length) notes = [base];
      var tt = ts, iv = Math.min(0.14, total / 6), k = 0, times = [];
      while (tt < end - 0.012 && k++ < 200) { times.push(tt); tt += iv; iv = Math.max(0.018, iv * 0.88); }
      for (var i = 0; i < times.length; i++) {
        if (times[i] < t - 1e-4) continue;
        var x = times.length > 1 ? i / (times.length - 1) : 1;
        var m = notes[Math.min(notes.length - 1, Math.floor(x * notes.length))];
        tickInto(v, v.out, times[i], foldIf(m + 12, o, TICK_MAX), 0.004, 0.25 + 0.6 * x, (i % 2 ? 1 : -1) * 0.5 * x);
      }
      v.commit();
    };

    // Impact: clean sub thump + damped noise + click + a short downward grain spray.
    // Round 4: + the small-speaker body of the thump (bodyInto, decaying faster). { body } scales it.
    P.impact = function (o) {
      o = o || {};
      var v = Voice(o, { level: 0.62, reverb: 0.22, delay: 0, prio: 1 });
      var t = v.t, dec = clamp(num(o.decay, 1.2), 0.2, 6);
      var sub = O('sine', 100), sg = v.n(G(0)), sh = v.n(SHAPER(CURVE_WARM));
      sub.frequency.setValueAtTime(100, t);
      sub.frequency.exponentialRampToValueAtTime(44, t + 0.26);
      sub.frequency.exponentialRampToValueAtTime(36, t + dec);
      var stop = perc(sg.gain, t, 0.002, dec * 0.2, 1);
      sub.connect(sg); sg.connect(sh); sh.connect(v.out);
      var ib = bodyInto(v, sub, BODY_LV.impact, o);
      if (ib) { var ie = v.n(G(0)); perc(ie.gain, t, 0.015, dec * 0.1, 1); ib.connect(ie); ie.connect(v.out); }
      v.src(sub, t, stop);
      var s = noiseSrc(WHITE), lp = v.n(F('lowpass', 4500, 0)), ng = v.n(G(0));
      lp.frequency.setValueAtTime(4500, t);
      lp.frequency.setTargetAtTime(280, t, dec * 0.18);
      var nstop = perc(ng.gain, t, 0.0015, dec * 0.12, 0.3);
      s.connect(lp); lp.connect(ng); ng.connect(v.out);
      v.src(s, t, nstop);
      clickInto(v, v.out, t, 2600, 0.9, 0.35);
      [81, 78, 74, 69, 66].forEach(function (m, i) { // round 2: was D7 → D5
        spawnGrain(v.out, t + 0.02 + i * 0.03, m, 0.06, 0.12 * (1 - i * 0.12), (i % 2 ? 1 : -1) * 0.4, i % 2 === 0, WIN_HANN, v);
      });
      v.commit();
    };

    // Tiny sine blip with a small pitch drop (data points, particles).
    // Round 2: folds above A5, 4 ms attack, a darker and quieter onset click.
    P.blip = function (midi, o) {
      o = o || {}; midi = num(midi, NaN); if (midi !== midi) return;
      var v = Voice(o, { level: 0.18, reverb: 0.08, delay: 0.08 });
      var t = v.t, f = midiToHz(foldIf(midi, o, TONAL_MAX)), dur = Math.max(0.02, num(o.dur, 0.1));
      tone(v, v.out, 'sine', f, t, 0.004, dur / 3.5, 1, f * 1.03, 0.025);
      clickInto(v, v.out, t, darkHz(f * 3), 2, 0.05);
      v.commit();
    };

    E.play = P;

    /* ================================================================ UI SOUNDS */
    // Microsound UI: short, quiet, clinical. Peaks ≈ −35…−28 dBFS (round 2: ~1.5 dB lower, darker).
    var UI = {};
    function uiBus() { return E.bus('ui', { reverb: 0.1, delay: 0 }); }
    function uv(o, level, pan) {
      o = o || {};
      return Voice({ when: o.when, gain: num(o.gain, 1), pan: num(o.pan, pan || 0), dest: uiBus(), reverb: o.reverb, delay: o.delay }, { level: level });
    }

    // single tiny high click, randomized so repeats never sound identical
    UI.hover = function (o) {
      var v = uv(o, 1, rand(-0.35, 0.35)), t = v.t;
      clickInto(v, v.out, t, rand(3000, 5600), rand(2, 4), 0.029 * rand(0.82, 1.1));
      if (Math.random() < 0.3) clickInto(v, v.out, t + rand(0.006, 0.013), rand(4400, 6200), 3, 0.008);
      v.commit();
    };
    // crisp detent: a 1–2 ms click pair
    UI.tick = function (o) {
      var v = uv(o, 1, 0), t = v.t;
      clickInto(v, v.out, t, 2800, 1.8, 0.038, -0.08);
      clickInto(v, v.out, t + 0.0095, 4800, 2.4, 0.019, 0.1);
      v.commit();
    };
    // two quick digital bits, upward
    UI.select = function (o) {
      var v = uv(o, 1, 0), t = v.t;
      bitInto(v, v.out, t, 81, 0.016, 0.04, -0.12, 's8', NaN, 4600);
      bitInto(v, v.out, t + 0.048, 86, 0.02, 0.037, 0.12, 's8', NaN, 4600);
      clickInto(v, v.out, t, 5000, 2, 0.012);
      v.commit();
    };
    // short upward spray of grains
    UI.open = function (o) {
      o = o || {};
      var v = uv(o, 1, 0), t = v.t, ms = [66, 69, 74, 78, 81];
      if (o.reverb == null) { var rs = v.n(G(0.14)); v.pan.connect(rs); rs.connect(reverb); }
      for (var i = 0; i < ms.length; i++) {
        spawnGrain(v.out, t + i * 0.027 + rand(0, 0.004), ms[i], rand(0.04, 0.055), 0.056 * (1 - i * 0.1), -0.45 + (0.9 * i) / (ms.length - 1), i % 2 === 1, WIN_HANN, v);
      }
      clickInto(v, v.out, t, 4200, 2, 0.01, -0.3);
      v.commit();
    };
    // short downward spray
    UI.close = function (o) {
      var v = uv(o, 1, 0), t = v.t, ms = [81, 76, 71, 66];
      for (var i = 0; i < ms.length; i++) {
        spawnGrain(v.out, t + i * 0.03 + rand(0, 0.004), ms[i], rand(0.04, 0.05), 0.045 * (1 - i * 0.12), 0.35 - (0.7 * i) / (ms.length - 1), i % 2 === 0, WIN_HANN, v);
      }
      v.commit();
    };
    // one keystroke: mechanical micro-click + faint digital bit
    UI.type = function (o) {
      var v = uv(o, 1, rand(-0.2, 0.2)), t = v.t, a = rand(0.75, 1.1);
      clickInto(v, v.out, t, rand(2200, 3700), rand(1.1, 1.8), 0.027 * a);
      var th = rand(160, 210);
      tone(v, v.out, 'sine', th, t + rand(0, 0.0015), 0.0008, rand(0.004, 0.007), 0.017 * a, th * 1.5, 0.006);
      if (Math.random() < 0.4) bitInto(v, v.out, t + rand(0.008, 0.016), pick([86, 88, 90, 93]), rand(0.006, 0.01), 0.006 * a, rand(-0.3, 0.3), pick(BIT_KINDS), NaN, 4600);
      v.commit();
    };
    // two low bitcrushed bleeps
    UI.error = function (o) {
      var v = uv(o, 1, 0), t = v.t;
      // crush at full scale, then drop to UI level
      var sh = v.n(SHAPER(CURVE_CRUSH3)), pre = v.n(G(0.95)), lp = v.n(F('lowpass', 2200, 0)), post = v.n(G(0.05));
      pre.connect(sh); sh.connect(lp); lp.connect(post); post.connect(v.out);
      bitInto(v, pre, t, 57, 0.06, 1, -0.05, 's4', 55, 0);
      bitInto(v, pre, t + 0.095, 50, 0.075, 1, 0.05, 's4', 48, 0);
      v.commit();
    };
    // Scene change: filtered swish + grain spray + soft sub thump, voiced on scene n (1..5)
    // Round 2: each spray is seven rising notes at or below A5 (was up to A7).
    var SCENE_VOICING = {
      1: { root: 38, up: [62, 66, 69, 74, 76, 78, 81] },   // D add9
      2: { root: 35, up: [59, 62, 66, 69, 71, 74, 78] },   // Bm7
      3: { root: 31, up: [59, 62, 66, 69, 74, 78, 81] },   // Gmaj9 (B D F# A over G)
      4: { root: 33, up: [57, 59, 64, 69, 71, 76, 81] },   // A sus2
      5: { root: 38, up: [64, 66, 69, 74, 76, 78, 81] }    // D, open
    };
    UI.transition = function (n, o) {
      o = o || {};
      var sc = SCENE_VOICING[clamp(Math.round(num(n, 1)), 1, 5)] || SCENE_VOICING[1];
      var g = num(o.gain, 1), now = ctx.currentTime, t = Math.max(num(o.when, now), now);
      var v = uv({ when: t, gain: g }, 1, 0);
      // swish
      var s = noiseSrc(PINK), bp = v.n(F('bandpass', 600, 1.3)), wg = v.n(G(0)), sp = v.n(PAN(-0.5));
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(3600, t + 0.22);
      bp.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
      wg.gain.setValueAtTime(0, t);
      wg.gain.setTargetAtTime(0.025, t, 0.05);
      wg.gain.setTargetAtTime(0, t + 0.17, 0.08);
      if (HAS_PAN) { sp.pan.setValueAtTime(-0.5, t); sp.pan.linearRampToValueAtTime(0.5, t + 0.5); }
      s.connect(bp); bp.connect(wg); wg.connect(sp); sp.connect(v.out);
      v.src(s, t, t + 0.75);
      // grain spray: the scene's chord, rising
      var rs = v.n(G(0.16)); v.pan.connect(rs); rs.connect(reverb);
      for (var i = 0; i < 7; i++) {
        spawnGrain(v.out, t + 0.06 + i * 0.034 + rand(0, 0.006), sc.up[i], rand(0.05, 0.08), 0.02 * (1 - i * 0.05), -0.5 + i / 6, i % 2 === 1, WIN_HANN, v);
      }
      // soft sub thump on the scene root
      tone(v, v.out, 'sine', midiToHz(sc.root + 12), t + 0.06, 0.003, 0.07, 0.031, midiToHz(sc.root + 12) * 1.4, 0.03);
      // landing tick
      tickInto(v, v.out, t + 0.06 + 7 * 0.034 + 0.02, fold(sc.up[6] + 12, TICK_MAX), 0.004, 0.011, 0.35);
      v.commit();
    };
    E.ui = UI;

    /* ================================================================ CONTINUOUS SOURCES */
    // Each returns { set(params, rampSec), stop(releaseSec) }.
    function Continuous(o, level) {
      var c = { srcs: [], nodes: [], stopped: false };
      var dest = validDest(o.dest);
      c.out = G(0);
      c.level = level;
      c.out.connect(dest);
      c.nodes.push(c.out);
      var isBus = !!dest.reverbSend;
      var rv = num(o.reverb, isBus ? 0 : num(o.defReverb, 0.2));
      if (rv > 0) { var rs = G(rv); c.out.connect(rs); rs.connect(reverb); c.nodes.push(rs); }
      c.n = function (x) { c.nodes.push(x); return x; };
      c.t = Math.max(num(o.when, ctx.currentTime), ctx.currentTime);
      c.src = function (s) {
        c.nodes.push(s); c.srcs.push(s);
        if (s._offset != null) s.start(c.t, s._offset); else s.start(c.t);
        return s;
      };
      c.fadeIn = function (sec) { c.out.gain.setValueAtTime(0, c.t); c.out.gain.setTargetAtTime(c.level, c.t, Math.max(0.01, sec / 3)); };
      c.dispose = function () {
        for (var j = 0; j < c.nodes.length; j++) { try { c.nodes[j].disconnect(); } catch (e) {} }
      };
      c.stop = function (rel) {
        if (c.stopped) return;
        c.stopped = true;
        var t = ctx.currentTime, r = Math.max(0.02, num(rel, 1));
        hold(c.out.gain, t);
        c.out.gain.setTargetAtTime(0, t, r / 5);
        var end = t + r * 1.4 + 0.05;
        c.endT = end;
        for (var i = 0; i < c.srcs.length; i++) { try { c.srcs[i].stop(end); } catch (e) {} }
        if (c.srcs[0]) c.srcs[0].onended = c.dispose;
      };
      return c;
    }
    // cloud lowpass vs `bright` (round 2: 1.0–3.5 kHz, was 1.8–16 kHz)
    function brightHz(b) { return 1000 * Math.pow(3.5, clamp(b, 0, 1)); }

    // Evolving grain cloud. { density (grains/s ≤ 90), pitch:[midis], dur (grain s), spread, bright,
    //   gain, jitter, detune (cents), octave (prob. of ±12), highpass, attack, dest, reverb, allowHigh }
    // Round 2: pitches above A5 fold down in octaves (the paused-scene "flute" came from sustained
    // sine grains at 1.2–3.5 kHz) unless allowHigh. Round 3: the ceiling is A4 (CLOUD_MAX = 69).
    var GRAN_LEVEL = 0.3;
    E.granular = function (o) {
      o = o || {};
      var c = Continuous({ dest: o.dest, when: o.when, reverb: o.reverb, defReverb: 0.14 }, GRAN_LEVEL * Math.max(0, num(o.gain, 1)));
      var lp = c.n(F('lowpass', brightHz(num(o.bright, 0.5)), 0));
      var hp = c.n(F('highpass', clamp(num(o.highpass, 180), 20, 4000), 0));
      lp.connect(hp); hp.connect(c.out);
      var cl = Cloud(lp, o, o.pitch || o.midis, o.window === 'tukey' ? WIN_TUKEY : WIN_HANN, o.allowHigh ? Infinity : CLOUD_MAX);
      cl.nextT = c.t;
      c.fadeIn(Math.max(0.02, num(o.attack, 0.6)));
      var unpump = addPump(function (h) {
        if (c.stopped && ctx.currentTime > c.endT + 0.3) { unpump(); c.dispose(); return; }
        cl.pump(h);
      });
      cl.pump(ctx.currentTime + PUMP_LOOK);
      return {
        set: function (p, ramp) {
          if (c.stopped || !p) return;
          var r = Math.max(0, num(ramp, 0.5)), t0 = ctx.currentTime;
          cl.set(p, t0, r);
          if (isFinite(p.bright)) glideTo(lp.frequency, brightHz(p.bright), r);
          if (p.pitch || p.midis) cl.setPool(p.pitch || p.midis, t0, r);
          if (isFinite(p.gain)) { c.level = GRAN_LEVEL * Math.max(0, p.gain); glideTo(c.out.gain, c.level, r); }
        },
        stop: function (rel) {
          if (c.stopped) return;
          c.stop(Math.max(0.02, num(rel, 1)));
          cl.endT = c.endT;
        },
        get grains() { return cl.count; }
      };
    };

    // Quiet evolving drone: per note a sine + triangle pair (split L/R) with slow swells and
    // drifting detune through a breathing lowpass, plus a sparse Tukey-grain shimmer above.
    // { gain, cutoff, attack, grains (/s, default 5), dest, reverb }; set({ midis, cutoff, gain, grains })
    E.drone = function (midis, o) {
      o = o || {};
      var notes = list(midis);
      if (!notes.length) notes = [KEY.root - 12, KEY.root - 5, KEY.root];
      var c = Continuous({ dest: o.dest, when: o.when, reverb: o.reverb, defReverb: 0.25 }, 0.16 * Math.max(0, num(o.gain, 1)));
      var cutoff = clamp(num(o.cutoff, 900), 150, 8000);
      var lp = c.n(F('lowpass', cutoff, 0)), hp = c.n(F('highpass', 90, 0));
      var lfoC = O('sine', 0.045), lgC = c.n(G(cutoff * 0.3));
      lfoC.connect(lgC); lgC.connect(lp.frequency); c.src(lfoC);
      lp.connect(hp); hp.connect(c.out);
      var norm = 1 / Math.sqrt(notes.length);
      var voicesArr = notes.map(function (m, i) {
        var f = midiToHz(m), side = i % 2 ? 1 : -1;
        var s1 = O('sine', f, -5), s2 = O('triangle', f, 5);
        var ng = c.n(G(0.75 * norm)), la = O('sine', rand(0.05, 0.12)), lag = c.n(G(0.25 * norm));
        la.connect(lag); lag.connect(ng.gain);
        var ld = O('sine', rand(0.07, 0.15)), ldg = c.n(G(4));
        ld.connect(ldg); ldg.connect(s1.detune);
        var p1 = c.n(PAN(0.5 * side)), p2 = c.n(PAN(-0.5 * side));
        var g1 = c.n(G(0.62)), g2 = c.n(G(0.45));
        s1.connect(g1); g1.connect(p1); p1.connect(ng);
        s2.connect(g2); g2.connect(p2); p2.connect(ng);
        ng.connect(lp);
        [s1, s2, la, ld].forEach(c.src);
        return [s1, s2];
      });
      var ggain = c.n(G(0.55)), ghp = c.n(F('highpass', 300, 0)), glp = c.n(F('lowpass', 2200, 0));
      ggain.connect(ghp); ghp.connect(glp); glp.connect(c.out);
      function grainPool(ns) { return ns.map(function (m) { return m + 12; }).concat(ns.map(function (m) { return m + 24; })); }
      var cl = Cloud(ggain, { density: num(o.grains, 5), dur: 0.2, spread: 0.85, bright: 0.25, jitter: 1, detune: 6, octave: 0.05 }, grainPool(notes), WIN_TUKEY, o.allowHigh ? Infinity : CLOUD_MAX);
      cl.nextT = c.t;
      var unpump = addPump(function (h) {
        if (c.stopped && ctx.currentTime > c.endT + 0.3) { unpump(); return; }
        cl.pump(h);
      });
      cl.pump(ctx.currentTime + PUMP_LOOK);
      c.fadeIn(Math.max(0.05, num(o.attack, 3)));
      return {
        set: function (p, ramp) {
          if (c.stopped || !p) return;
          var r = Math.max(0, num(ramp, 0.5));
          if (isFinite(p.gain)) { c.level = 0.16 * Math.max(0, p.gain); glideTo(c.out.gain, c.level, r); }
          if (isFinite(p.cutoff)) { var cf = clamp(p.cutoff, 150, 8000); glideTo(lp.frequency, cf, r); glideTo(lgC.gain, cf * 0.3, r); }
          if (isFinite(p.grains)) cl.set({ density: p.grains }, ctx.currentTime, r);
          if (p.midis) {
            var nm = list(p.midis);
            if (nm.length) {
              voicesArr.forEach(function (oscs, i) {
                var f = midiToHz(nm[i % nm.length]);
                oscs.forEach(function (x) { glideTo(x.frequency, f, r); });
              });
              cl.setPool(grainPool(nm), ctx.currentTime, r);
            }
          }
        },
        stop: function (rel) { c.stop(num(rel, 2.5)); cl.endT = c.endT; }
      };
    };

    // Wind: two decorrelated pink-noise chains (L/R) through modulated band-pass + lowpass,
    // incommensurate slow LFOs make irregular gusts; a faint resonant whistle rides on top.
    E.wind = function (o) {
      o = o || {};
      var I = clamp(num(o.intensity, 0.5), 0, 1), gmul = Math.max(0, num(o.gain, 1));
      function lvl() { return (0.16 + 0.8 * I) * gmul; }
      var c = Continuous({ dest: o.dest, when: o.when, reverb: o.reverb, defReverb: 0.1 }, lvl());
      function bpF() { return 320 + 780 * I; }
      function lpF() { return 800 + 2400 * I; }
      var sides = [[-0.6, 0.071, 0.113, 0.047], [0.6, 0.083, 0.127, 0.039]].map(function (cfg, k) {
        var s = noiseSrc(PINK);
        s._offset = k * PINK.duration * 0.45 + rand(0, 0.3);
        var bp = c.n(F('bandpass', bpF(), 0.55)), lp = c.n(F('lowpass', lpF(), 0.5));
        var gust = c.n(G(0.6)), p = c.n(PAN(cfg[0]));
        var l1 = O('sine', cfg[1]), l2 = O('sine', cfg[2]), l3 = O('sine', cfg[3]), l4 = O('sine', 0.37 + 0.06 * k);
        var fdep = c.n(G(bpF() * 0.3)), gdep = c.n(G(0.26 + 0.1 * I)), gdep2 = c.n(G(0.16)), gdep3 = c.n(G(0.06));
        l1.connect(fdep); l2.connect(fdep); fdep.connect(bp.frequency);
        l2.connect(gdep); gdep.connect(gust.gain); l3.connect(gdep2); gdep2.connect(gust.gain);
        l4.connect(gdep3); gdep3.connect(gust.gain); // faster flutter
        s.connect(bp); bp.connect(lp); lp.connect(gust); gust.connect(p); p.connect(c.out);
        [s, l1, l2, l3, l4].forEach(c.src);
        return { bp: bp, lp: lp, fdep: fdep, gdep: gdep };
      });
      // the resonant "whistle" (round 2: lower, 560–940 Hz, wider and quieter)
      var ws = noiseSrc(PINK), wbp = c.n(F('bandpass', 560 + 380 * I, 6)), wg = c.n(G(0.16 * I));
      var wl = O('sine', 0.061), wld = c.n(G(140));
      wl.connect(wld); wld.connect(wbp.frequency);
      ws.connect(wbp); wbp.connect(wg); wg.connect(c.out);
      [ws, wl].forEach(c.src);
      c.fadeIn(Math.max(0.05, num(o.attack, 2)));
      return {
        set: function (p, ramp) {
          if (c.stopped || !p) return;
          var r = Math.max(0, num(ramp, 1));
          if (isFinite(p.intensity)) I = clamp(p.intensity, 0, 1);
          if (isFinite(p.gain)) gmul = Math.max(0, p.gain);
          c.level = lvl();
          glideTo(c.out.gain, c.level, r);
          sides.forEach(function (sd) {
            glideTo(sd.bp.frequency, bpF(), r); glideTo(sd.lp.frequency, lpF(), r);
            glideTo(sd.fdep.gain, bpF() * 0.3, r); glideTo(sd.gdep.gain, 0.26 + 0.1 * I, r);
          });
          glideTo(wbp.frequency, 560 + 380 * I, r); glideTo(wg.gain, 0.16 * I, r);
        },
        stop: function (rel) { c.stop(num(rel, 2)); }
      };
    };

    // Mechanical hum / turbine whirr: detuned triangles + octave sine → lowpass → amplitude-
    // modulated at o.rate Hz (blade-pass) with a peaky periodic LFO; plus a band-passed swish.
    var BLADE_WAVE = null;
    E.hum = function (midi, o) {
      o = o || {};
      var m = num(midi, KEY.root - 24), rate = clamp(num(o.rate, 1.2), 0.05, 60);
      var c = Continuous({ dest: o.dest, when: o.when, reverb: o.reverb, defReverb: 0.08 }, 0.3 * Math.max(0, num(o.gain, 1)));
      var f = midiToHz(m);
      var s1 = O('triangle', f, -6), s2 = O('triangle', f, 6), tr = O('sine', f * 2, 0), s3 = O('triangle', f * 3, 2);
      var lp = c.n(F('lowpass', clamp(num(o.cutoff, 700), 100, 8000), 1.2));
      var mix = c.n(G(0.45)), g3 = c.n(G(0.4)), g4 = c.n(G(0.12)), hp1 = c.n(PAN(-0.35)), hp2 = c.n(PAN(0.35));
      s1.connect(hp1); hp1.connect(mix); s2.connect(hp2); hp2.connect(mix);
      tr.connect(g3); g3.connect(mix); s3.connect(g4); g4.connect(mix); mix.connect(lp);
      if (!BLADE_WAVE) BLADE_WAVE = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.5, 0.25, 0.12]));
      var lfo = ctx.createOscillator();
      lfo.setPeriodicWave(BLADE_WAVE);
      lfo.frequency.value = rate;
      var am = c.n(G(0.62)), amd = c.n(G(0.34));
      lfo.connect(amd); amd.connect(am.gain);
      lp.connect(am); am.connect(c.out);
      var ns = noiseSrc(PINK), nbp = c.n(F('bandpass', 750, 1.3)), sw = c.n(G(0.3)), swd = c.n(G(0.3));
      lfo.connect(swd); swd.connect(sw.gain);
      ns.connect(nbp); nbp.connect(sw); sw.connect(c.out);
      [s1, s2, tr, s3, lfo, ns].forEach(c.src);
      c.fadeIn(Math.max(0.05, num(o.attack, 1.5)));
      return {
        set: function (p, ramp) {
          if (c.stopped || !p) return;
          var r = Math.max(0, num(ramp, 0.5));
          if (isFinite(p.rate)) glideTo(lfo.frequency, clamp(p.rate, 0.05, 60), r);
          if (isFinite(p.gain)) { c.level = 0.3 * Math.max(0, p.gain); glideTo(c.out.gain, c.level, r); }
          if (isFinite(p.cutoff)) glideTo(lp.frequency, clamp(p.cutoff, 100, 8000), r);
          if (isFinite(p.midi)) {
            var nf = midiToHz(p.midi);
            glideTo(s1.frequency, nf, r); glideTo(s2.frequency, nf, r); glideTo(tr.frequency, nf * 2, r); glideTo(s3.frequency, nf * 3, r);
          }
        },
        stop: function (rel) { c.stop(num(rel, 1.5)); }
      };
    };

    /* ================================================================ GROOVE */
    // Minimal techno / IDM, 118 BPM, 8 bars in D: D – Bm – G – A (2 bars each), pentatonic voicings.
    // First pass: bars 1–2 are micro-sounds only (tuned ticks, clicks, a data burst, the grain bed
    // fading in); the clicky kick, micro-hats and sub pulses lock in at bar 3; rim/clap backbeat,
    // ratchets and glitch ornaments from bar 5. Later passes keep the steady beat throughout.
    var GV = {
      roots: [38, 35, 31, 33],                                                                // D2 B1 G1 A1
      pads: [[50, 57, 62, 64, 69], [47, 54, 57, 62, 66], [43, 50, 57, 59, 66], [45, 52, 57, 59, 64]],
      // round 2: bed voicings, tick lattices and the keys motif all sit lower (bed ≤ A5, ticks ≤ A6)
      clouds: [[69, 74, 76, 78, 81], [66, 71, 74, 78, 81], [66, 69, 71, 74, 78], [64, 69, 71, 76, 81]],
      ticks: [[81, 86, 88, 90, 93], [78, 83, 86, 90, 93], [78, 83, 86, 88, 90], [76, 81, 83, 88, 93]],
      // sparse glassy-keys motif: bar → [[step, midi, lengthInSteps]]
      keys: {
        0: [[3, 78, 3], [6, 74, 3], [10, 81, 5]],
        1: [[2, 76, 3], [8, 74, 7]],
        2: [[3, 78, 3], [6, 76, 3], [10, 74, 5]],
        3: [[2, 71, 3], [8, 74, 7]],
        4: [[3, 78, 3], [6, 81, 3], [10, 76, 5]],
        5: [[2, 81, 3], [9, 78, 6]],
        6: [[3, 76, 3], [6, 78, 3], [10, 81, 5]],
        7: [[2, 76, 3], [8, 81, 4]]
      }
    };
    var EU5 = euclid(5, 16, 0), EU7 = euclid(7, 16, 1), EU3 = euclid(3, 16, 2), RIM = euclid(5, 16, 3);

    E.makeGroove = function (dest, o) {
      o = o || {};
      var gout = G(Math.max(0, num(o.gain, 1)) * 1.3);
      gout.connect(validDest(dest));
      // per-part level multipliers (0 = part silent). Scenes can arrange live with setPart().
      var parts = { kick: 1, hats: 1, perc: 1, sub: 1, bed: 1, keys: 1, micro: 1 };
      function setPart(k, v) { if (k in parts) parts[k] = Math.max(0, num(v, 1)); }
      if (o.parts) for (var pk in o.parts) setPart(pk, o.parts[pk]);
      var drums = G(1), low = G(1), micro = G(1), bed = G(1), light = G(1);
      var bedD = G(1), lightD = G(1);
      drums.connect(gout); low.connect(gout); micro.connect(gout);
      bed.connect(bedD); bedD.connect(gout); light.connect(lightD); lightD.connect(gout);
      var unBed = E.addDuckTarget(bedD, 1), unLight = E.addDuckTarget(lightD, 0.45);
      // granular bed: grains → highpass → bed (sends: light reverb + delay on the bed only)
      var cin = G(1), chp = F('highpass', 220, 0), bedRv = G(0.12), bedDl = G(0.07);
      cin.connect(chp); chp.connect(bed);
      bed.connect(bedRv); bedRv.connect(reverb); bed.connect(bedDl); bedDl.connect(delay);
      var BED_AMP = 0.2;
      var cloud = Cloud(cin, { density: 5, dur: 0.12, spread: 0.85, bright: 0.4, jitter: 0.9, detune: 4, octave: 0.2, amp: BED_AMP }, GV.clouds[0], WIN_HANN);
      // sparkle: a quiet, sparse shimmer of tiny grains (A5–D6) — the "bits" in the air.
      // Round 2: capped at D6 (was up to A7 plus octave jumps), shorter, quieter, lowpassed.
      var sin_ = G(1), shp = F('highpass', 700, 0), slp = F('lowpass', 3200, 0);
      sin_.connect(shp); shp.connect(slp); slp.connect(micro);
      var SPARK_AMP = 0.2;
      var spark = Cloud(sin_, { density: 4, dur: 0.022, spread: 0.95, bright: 0.25, jitter: 1, detune: 3, octave: 0.12, amp: SPARK_AMP }, GV.ticks[0], WIN_HANN, 86);
      var lastCh = -1, stopped = false;

      function step(s, t) {
        if (stopped) return;
        var sd = 60 / E.bpm / 4, bar = Math.floor(s / 16) % 8, i = s % 16, cyc = Math.floor(s / 128), ch = bar >> 1;
        var intro = cyc === 0 && bar < 2, full = cyc > 0 || bar >= 4, last = bar === 7;
        var R = GV.roots[ch], tk = GV.ticks[ch];
        var pm = parts.micro, pb = parts.bed, ph = parts.hats, pp = parts.perc;

        // --- granular bed: follows the progression, thickens with the arrangement
        if (ch !== lastCh) { cloud.setPool(GV.clouds[ch], t, 0.35); spark.setPool(GV.ticks[ch], t, 0.2); lastCh = ch; }
        if (s === 0) { bed.gain.setValueAtTime(0.25, t); bed.gain.linearRampToValueAtTime(1, t + sd * 12); }
        cloud.P.density = intro ? (bar === 0 ? 7 : 10) : full ? 13 : 11;
        cloud.P.bright = full ? 0.65 : 0.5;
        cloud.P.amp = BED_AMP * pb;
        if (cloud.nextT < t) cloud.nextT = t;
        if (pb > 0) cloud.pump(t + sd); else cloud.nextT = t + sd;
        spark.P.density = intro ? 3 + (s / 32) * 8 : full ? 11 : 8;
        spark.P.amp = SPARK_AMP * pm;
        if (spark.nextT < t) spark.nextT = t;
        if (pm > 0) spark.pump(t + sd); else spark.nextT = t + sd;

        // --- sustained pad layer (sine/triangle, no saws) every 2 bars once the beat is in
        if (pb > 0 && i === 0 && bar % 2 === 0 && !intro) {
          P.pad(GV.pads[ch], { when: t, dur: sd * 32 - 0.12, attack: 0.5, release: 0.9, cutoff: 1300, grains: 0, dest: bed, gain: 0.42 * pb, highpass: 170, reverb: 0, delay: 0 });
        }

        // --- micro-sounds: tuned ticks (euclidean), clicks, bits — texture, not melody
        if (pm > 0) {
          if (intro) {
            var pat = bar === 0 ? EU5 : EU7;
            if (pat[i]) P.tick(tk[(s * 3 + (s >> 3)) % tk.length], { when: t, dest: micro, gain: pm * (1 + 0.3 * (i % 4 === 0)), pan: ((s * 7) % 9) / 4 - 1, dur: 0.004 + 0.003 * Math.random() });
            if (Math.random() < (bar === 0 ? 0.22 : 0.36)) P.click({ when: t + sd * rand(0, 0.5), dest: micro, gain: pm * rand(0.5, 0.95), freq: rand(1400, 3200), pan: rand(-0.8, 0.8) });
            if (bar === 1 && i === 12) P.data({ when: t, dur: sd * 2.5, density: 55, pitch: tk, dest: micro, gain: pm * 1.1 });
          } else {
            if ((full ? EU5 : EU3)[i] && i % 4 !== 0) P.tick(tk[(s * 5 + bar) % tk.length], { when: t, dest: micro, gain: pm, pan: ((s * 5) % 9) / 4 - 1, dur: rand(0.006, 0.01) });
            if (i % 4 !== 0 && Math.random() < 0.1) P.bit(pick(tk), { when: t + sd * 0.5 * Math.random(), dest: micro, gain: pm * rand(0.7, 1), pan: rand(-0.8, 0.8), dur: rand(0.01, 0.022), steps: pick(BIT_KINDS) });
            if (Math.random() < 0.18) P.click({ when: t + sd * rand(0, 0.6), dest: micro, gain: pm * rand(0.5, 0.9), freq: rand(1400, 3200), pan: rand(-0.9, 0.9) }); // round 3: below the hats
          }
          // glitch ornaments
          if (bar === 3 && i === 13) P.glitch({ when: t, midi: 81, repeats: 5, len: 0.028, dest: micro, gain: pm * 0.55 });
          if (bar === 5 && i === 10) { P.bit(86, { when: t, dest: micro, gain: pm * 0.6, pan: -0.3, dur: 0.018 }); P.bit(93, { when: t + sd * 0.5, dest: micro, gain: pm * 0.55, pan: 0.3, dur: 0.02 }); }
          if (last && i === 12) P.glitch({ when: t, repeats: 7, len: 0.04, factor: 0.78, crush: true, dest: micro, gain: pm * 0.6 });
          if (last && i === 8) P.data({ when: t, dur: sd * 3.5, density: 50, pitch: tk, dest: micro, gain: pm * 0.85 });
          if (last && i === 0 && cyc > 0) P.riser({ when: t, dur: sd * 16 - 0.02, dest: micro, gain: pm * 0.35, midi: 74, octaves: 1.5 });
        }
        // intro: the first low hints and hats, then a ratchet into the beat
        if (intro && bar === 1) {
          if (i === 0 && parts.sub > 0) P.sub(R, { when: t, dur: sd * 3, dest: low, gain: 0.55 * parts.sub });
          if (i === 8 && parts.sub > 0) P.sub(R, { when: t, dur: sd * 2, dest: low, gain: 0.45 * parts.sub });
          if (i === 14 && ph > 0) P.ratchet({ when: t, count: 4, span: sd * 2, dest: drums, gain: 0.9 * ph });
          if (i >= 4 && i % 2 === 1 && ph > 0 && Math.random() < 0.4) P.hat({ when: t, dest: drums, gain: 0.45 * ph });
        }
        if (intro) return;

        // --- kick: tight, clicky four-on-the-floor with a gentle duck; drops out before the loop
        if (i % 4 === 0 && !(last && i === 12) && parts.kick > 0) {
          P.kick({ when: t, dest: drums, gain: 0.78 * parts.kick });
          E.duck(0.32, t, sd * 2.6);
        }
        // --- micro-hats: offbeat 8ths + probabilistic 16th ghosts, randomized colour/pan
        if (ph > 0) {
          // round 3: darker (7–7.5 kHz lowpass), ~3 dB quieter (they owned the 5–8 kHz band), lighter shaker
          if (i % 4 === 2) { var op = i === 14 && bar % 2 === 1 && !last; P.hat({ when: t, dest: drums, gain: ph * 0.56, lp: op ? 7500 : 7000, open: op, decay: op ? undefined : rand(0.024, 0.036) }); }
          else if (i % 2 === 1 && Math.random() < (full ? 0.62 : 0.45)) P.hat({ when: t, dest: drums, gain: ph * rand(0.18, 0.32), lp: 7000 });
          else if (full && i % 4 === 0 && Math.random() < 0.15) P.hat({ when: t, dest: drums, gain: ph * 0.26, lp: 7000 });
          if (full && i % 4 !== 0) P.shaker({ when: t, dest: drums, gain: ph * [0, 0.3, 0.46, 0.6][i % 4] * rand(0.85, 1.1), pan: 0.3 });
          if ((bar === 3 && i === 15) || (bar === 5 && i === 7)) P.ratchet({ when: t, count: bar === 3 ? 3 : 4, span: sd, dest: drums, gain: 0.8 * ph });
          if (last && i === 14) P.ratchet({ when: t, count: 6, span: sd * 2, dest: drums, gain: ph });
        }
        // --- rim (euclidean) + tight backbeat once the groove is full
        if (pp > 0) {
          if (full && RIM[i] && i % 4 !== 0) P.snare({ when: t, dest: drums, gain: pp * (i === 11 ? 1 : 0.78), pan: 0.22, midi: i === 11 ? 81 : 76, crush: 0.15 });
          if (full && (i === 4 || i === 12) && !(last && i === 12)) {
            P.clap({ when: t, dest: drums, gain: 1.1 * pp });
            P.snare({ when: t, dest: drums, gain: 0.75 * pp, crush: 0.1 });
          }
          if (!full && (i === 4 || i === 12)) P.snare({ when: t, dest: drums, gain: 0.55 * pp, crush: 0 });
        }

        // --- clean sub pulses on the offbeats (root; fifth on the last one of odd bars)
        if (parts.sub > 0) {
          if (i % 4 === 2) {
            var bn = i === 14 && bar % 2 === 1 ? R + 7 : R;
            P.sub(bn, { when: t, dur: sd * 1.4, dest: low, gain: parts.sub * (i === 2 ? 0.72 : 0.6) });
          }
          if (full && i === 11 && bar % 2 === 0) P.sub(R + 12, { when: t, dur: sd * 0.8, dest: low, gain: 0.26 * parts.sub });
        }

        // --- sparse glassy keys motif (dotted-8th ping-pong fills the gaps)
        var km = GV.keys[bar];
        if (km && parts.keys > 0 && (cyc > 0 || bar >= 2)) for (var j = 0; j < km.length; j++) {
          if (km[j][0] === i) P.keys(km[j][1], { when: t, dur: sd * km[j][2], dest: light, gain: parts.keys * (j === 0 ? 0.72 : 0.6), vel: 0.6, pan: j % 2 ? 0.2 : -0.2, delay: 0.2, reverb: 0.08 });
        }
      }
      return {
        step: step,
        out: gout,
        cloud: cloud,
        spark: spark,
        parts: parts,
        setPart: setPart,
        buses: { drums: drums, low: low, deep: low, micro: micro, bed: bed, light: light },
        stop: function (fade) {
          if (stopped) return;
          stopped = true;
          var f = Math.max(0.02, num(fade, 0.25)), t = ctx.currentTime;
          hold(gout.gain, t); gout.gain.linearRampToValueAtTime(0, t + f);
          unBed(); unLight();
          cloud.endT = t; spark.endT = t;
          [drums, low, micro, bed, light].forEach(function (b) { E.stopAll(b, f); });
          if (typeof setTimeout === 'function') setTimeout(function () { try { gout.disconnect(); } catch (e) {} }, (f + 3) * 1000);
        }
      };
    };

    return E;
  }

  /* ================================================================ FACADE: Site.audio */

  var E = null;            // realtime engine (after unlock)
  var bpm = 118;
  var listeners = [];
  var readyQueue = [];
  var unlockPromise = null;
  var errCount = 0;

  function loadEnabled() {
    try { var v = window.localStorage.getItem('yd-sound'); return v === null ? true : v !== '0' && v !== 'off' && v !== 'false'; }
    catch (e) { return true; }
  }
  function saveEnabled(on) { try { window.localStorage.setItem('yd-sound', on ? '1' : '0'); } catch (e) {} }
  function report(e) {
    errCount++;
    A.errors.push(String((e && e.message) || e));
    if (A.errors.length > 20) A.errors.shift();
    if (errCount <= 3 && window.console && console.warn) console.warn('[audio]', e);
  }
  function live() { return !!(E && A.ready); }
  // Wrap an engine call: silent no-op before unlock or while disabled; never throws.
  function wrap(get, needsEnabled) {
    return function () {
      if (!live() || (needsEnabled && !A.enabled)) return undefined;
      try { var fn = get(); return fn ? fn.apply(null, arguments) : undefined; } catch (e) { report(e); }
      return undefined;
    };
  }

  var A = {
    key: KEY,
    ready: false,
    enabled: loadEnabled(),
    ctx: null,
    master: null,
    reverb: null,
    delay: null,
    analyser: null,
    errors: [],
    midiToHz: midiToHz,
    degree: degree,
    scaleNotes: scaleNotes,
    euclid: euclid,
    // pitch ceilings (MIDI) above which the engine folds down in octaves (round 3; see the header)
    ceilings: { cloud: CLOUD_MAX, tonal: TONAL_MAX, tick: TICK_MAX },
    createEngine: createEngine // for OfflineAudioContext rendering (audio-check.html)
  };
  Object.defineProperty(A, 'bpm', {
    enumerable: true,
    get: function () { return bpm; },
    set: function (v) { bpm = clamp(num(v, 118), 40, 240); if (E) { try { E.setBpm(bpm); } catch (e) {} } }
  });

  A.now = function () { return A.ctx ? A.ctx.currentTime : 0; };

  function markReady() {
    if (!E || A.ready) return;
    if (A.ctx.state !== 'running') return;
    A.ready = true;
    var q = readyQueue.splice(0);
    for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) { report(e); } }
    clockEnsure();
  }

  A.unlock = function () {
    try {
      if (!A.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return Promise.resolve(false);
        var ctx;
        try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
        E = createEngine(ctx, { bpm: bpm, muted: !A.enabled, offline: false });
        A.ctx = ctx; A.master = E.master; A.reverb = E.reverb; A.delay = E.delay; A.analyser = E.analyser;
        A.engine = E;
        ctx.onstatechange = function () { if (ctx.state === 'running') markReady(); };
        // iOS: a silent buffer started inside the gesture fully unlocks output
        try { var b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
        document.addEventListener('visibilitychange', onVisibility);
      }
      var c = A.ctx;
      if (c.state === 'running') { markReady(); return Promise.resolve(true); }
      if (!unlockPromise) {
        var p = c.resume ? c.resume() : null;
        unlockPromise = Promise.resolve(p).then(function () { unlockPromise = null; markReady(); return A.ready; },
          function () { unlockPromise = null; return false; });
      }
      return unlockPromise;
    } catch (e) { report(e); return Promise.resolve(false); }
  };

  var hiddenSuspended = false;
  function onVisibility() {
    var c = A.ctx;
    if (!c) return;
    try {
      if (document.hidden) {
        if (c.state === 'running') { hiddenSuspended = true; c.suspend(); }
      } else if (hiddenSuspended) {
        hiddenSuspended = false;
        c.resume();
      }
    } catch (e) {}
  }

  A.setEnabled = function (on) {
    on = !!on;
    var changed = on !== A.enabled;
    A.enabled = on;
    saveEnabled(on);
    if (E) { try { E.helpers.rampTo(E.out.gain, on ? 1 : 0, 0.15); } catch (e) { report(e); } }
    if (changed) for (var i = 0; i < listeners.length; i++) { try { listeners[i](on); } catch (e) { report(e); } }
    return on;
  };
  A.toggle = function () { return A.setEnabled(!A.enabled); };
  A.onChange = function (fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  };
  A.onReady = function (fn) {
    if (typeof fn !== 'function') return;
    if (A.ready) { try { fn(); } catch (e) { report(e); } } else readyQueue.push(fn);
  };

  A.bus = function (name, o) {
    if (!E) return null;
    try { return E.bus(name, o); } catch (e) { report(e); return null; }
  };
  A.fadeBus = wrap(function () { return E.fadeBus; });
  A.duck = wrap(function () { return E.duck; });
  A.stopAll = wrap(function () { return E.stopAll; });
  A.voiceCount = function () { return E ? E.voiceCount() : 0; };
  A.makeGroove = wrap(function () { return E.makeGroove; });

  // Instruments & UI: generated wrappers (no-op before unlock / while disabled)
  A.play = {};
  ['click', 'tick', 'bit', 'data', 'grain', 'glitch', 'ratchet', 'sub',
    'kick', 'hat', 'snare', 'clap', 'shaker',
    'pluck', 'keys', 'bell', 'pad', 'lead', 'bass', 'noise', 'riser', 'impact', 'blip']
    .forEach(function (n) { A.play[n] = wrap(function () { return E.play[n]; }, true); });
  A.ui = {};
  ['hover', 'tick', 'select', 'open', 'close', 'type', 'transition', 'error']
    .forEach(function (n) { A.ui[n] = wrap(function () { return E.ui[n]; }, true); });

  // Continuous sources: return a handle immediately. If called before unlock, the source
  // starts automatically once audio is unlocked (with any params set() in the meantime).
  function deferredSource(kind, args) {
    var real = null, stopped = false, pending = {};
    function realize() {
      if (stopped || real || !E) return;
      try {
        var a = args.slice(), oi = kind === 'wind' || kind === 'granular' ? 0 : 1, o = {}, k;
        var src = a[oi] || {};
        for (k in src) o[k] = src[k];
        for (k in pending) o[k] = pending[k];
        if (kind === 'drone' && pending.midis) a[0] = pending.midis;
        if (kind === 'hum' && isFinite(pending.midi)) a[0] = pending.midi;
        a[oi] = o;
        real = E[kind].apply(null, a);
      } catch (e) { report(e); }
    }
    var h = {
      set: function (p, ramp) {
        if (!p) return;
        if (real) { try { real.set(p, ramp); } catch (e) { report(e); } return; }
        for (var k in p) pending[k] = p[k];
      },
      stop: function (rel) {
        if (stopped) return;
        stopped = true;
        if (real) { try { real.stop(rel); } catch (e) { report(e); } }
      },
      get active() { return !!real && !stopped; }
    };
    if (live()) realize(); else readyQueue.push(realize);
    return h;
  }
  A.granular = function (o) { return deferredSource('granular', [o]); };
  A.drone = function (midis, o) { return deferredSource('drone', [midis, o]); };
  A.wind = function (o) { return deferredSource('wind', [o]); };
  A.hum = function (midi, o) { return deferredSource('hum', [midi, o]); };

  /* ---------------------------------------------------------------- clock */
  var LOOKAHEAD = 0.12, TICK_MS = 25;
  var subs = [], explicit = false, timer = null;
  var nextIndex = 0, nextTime = 0, origin = null;

  function stepDur() { return 60 / bpm / 4; }
  function tick() {
    if (!E) return;
    var now = A.ctx.currentTime;
    if (nextTime < now - 0.08) { // fell behind (throttled tab): skip ahead instead of bursting
      var skip = Math.ceil((now - nextTime) / stepDur());
      nextIndex += skip; nextTime += skip * stepDur();
    }
    var guard = 0;
    while (nextTime < now + LOOKAHEAD && guard++ < 64) {
      var fns = subs.slice();
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](nextIndex, nextTime); } catch (e) { report(e); }
      }
      nextIndex++;
      nextTime += stepDur();
    }
  }
  function clockStart() {
    if (A.clock.running || !E || !A.ready) return;
    A.clock.running = true;
    nextIndex = 0;
    nextTime = origin = A.ctx.currentTime + 0.06;
    tick();
    timer = setInterval(tick, TICK_MS);
  }
  function clockHalt() {
    if (timer) clearInterval(timer);
    timer = null;
    A.clock.running = false;
  }
  function clockEnsure() {
    if (subs.length || explicit) clockStart(); else clockHalt();
  }

  A.clock = {
    running: false,
    get bpm() { return bpm; },
    set bpm(v) { A.bpm = v; },
    get stepDur() { return stepDur(); },
    start: function () { explicit = true; clockEnsure(); },
    stop: function () { explicit = false; clockHalt(); },
    on: function (fn) {
      if (typeof fn !== 'function') return function () {};
      subs.push(fn);
      clockEnsure();
      return function () {
        var i = subs.indexOf(fn);
        if (i >= 0) subs.splice(i, 1);
        if (!subs.length && !explicit) clockHalt();
      };
    },
    // { step, time } of the next 16th that is a multiple of `multiple` (4 = next beat, 16 = next bar)
    nextStep: function (multiple) {
      var m = Math.max(1, Math.round(num(multiple, 1)));
      if (!E) return { step: 0, time: 0 };
      var now = A.ctx.currentTime + 0.005, sd = stepDur(), refI, refT;
      if (A.clock.running) { refI = nextIndex; refT = nextTime; }
      else if (origin !== null) { refI = 0; refT = origin; }
      else { refI = 0; refT = now; }
      var k = refI + Math.ceil((now - refT) / sd - 1e-9);
      k = Math.ceil(k / m) * m;
      var time = refT + (k - refI) * sd;
      while (time < now) { k += m; time += m * sd; }
      return { step: k, time: time };
    }
  };

  /* ---------------------------------------------------------------- demo groove */
  // Site.audio.demoGroove(dest?, {gain}) → { stop(fade) }. Starts on the next bar of the
  // shared clock (immediately if the clock is idle). Safe before unlock: starts once unlocked.
  A.demoGroove = function (dest, o) {
    var g = null, off = null, stopped = false, pos = -1;
    function start() {
      if (stopped || !E) return;
      try {
        g = E.makeGroove(dest || E.master, o);
        var s0 = null;
        off = A.clock.on(function (step, time) {
          if (s0 === null) { if (step % 16 !== 0) return; s0 = step; }
          pos = step - s0;
          g.step(pos, time);
        });
      } catch (e) { report(e); }
    }
    if (live()) start(); else readyQueue.push(start);
    return {
      stop: function (fade) {
        if (stopped) return;
        stopped = true;
        if (off) off();
        if (g) { try { g.stop(fade); } catch (e) { report(e); } }
      },
      get groove() { return g; },
      get step() { return pos; }
    };
  };

  Site.audio = A;
})();
