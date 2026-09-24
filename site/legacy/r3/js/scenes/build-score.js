/* ==========================================================================
   site/js/scenes/build-score.js — the soundtrack of scene 5, "Here's to the builders"
   --------------------------------------------------------------------------
   44 bars at 118 BPM (89.49 s), D major pentatonic. Minimal techno / IDM made only from
   Site.audio voices: clicky kick, micro hats, rim ticks, wooden tuned ticks, clean sub bass,
   and a warm LOW bed (sine/triangle pad + dark grains, D3–A4) with muted "IDM keys" stabs.
   Tonal material stays in D2–A4; bright ornaments (bits, glitches, data bursts) are short
   and quiet. build.js layers its on-screen foley (typing clicks, slams, card jumps) on the
   same 16th grid, so the micro-percussion here stays sparse, a register below the typing and
   (round 3) ~11 dB quieter than before: with build.js's typing at gain 0.65 the keystrokes sit
   ~+6 dB over the click row (it was ~15 dB under). The euclidean click row also steps aside
   while a line types (opts.typing / score.typing()).

   Arc (bars):
     1–4    Intro       cursor ticks and sub pulses under the typed title, the bed fades in
     5–16   Build       euclidean clicks + sub pulses + hats → broken kick, bass, dotted-8th arp
                        (bar 16: the hex dump — the kick stutters, hats go to 16ths)
     17–20  Riser       first chord stabs, then a 2-bar riser (rim roll, drums high-passed)
     21–27  Drop        clean four-on-the-floor, rolling offbeat bass, keys hook (the montage)
     28     Silence     "they often move in silence": one hat and a pad tail
     29–32  Half-time   "high bar for quality"
     33–36  Breakdown   "and they yearn to build": drums out, pad + keys; riser into …
     37–42  Final drop  busier bass, the keys hook answered; the dotted-8th arp returns under it and
                        the keys and pad open out wider (round 3: bigger by a new element, not by level)
     43–44  Outro       plagal G → D(add9): a soft low chord rings out as the page settles

   Interface (used by build.js):
     Site.BuildScore = { bpm, bars, duration, sections: [{ name, bar, bars }], create(audio, dest), events() }
     create(audio, dest, opts?) → {
       play(fromSec), stop(fadeSec = 0.3), playing, onCue(fn), pump(),
       position()       film seconds at the audio clock (ctx.currentTime). Use it (or timeAt) to
                        SCHEDULE sounds: when = timeAt(filmSec) = audio.now() + (filmSec − position()).
       heardPosition()  film seconds the listener hears right now = position() − output latency
                        (getOutputTimestamp, else outputLatency + baseLatency). Use it to drive the
                        PICTURE: ~10–40 ms on wired output, 150–250 ms on Bluetooth headphones.
       latency()        that output latency (s); timeAt(filmSec) → context time of a film second
       typing(times)    film seconds of on-screen keystrokes: the score's euclidean click row is
                        dropped around them so the typing foley owns those 16ths (also opts.typing)
     }
     opts: { parts: { group: gain }, typing: [sec], latency: sec (override, for tests),
             filter(e) → bool and onFire(e, when) (test hooks: solo / log events by e.r role) }
   `audio` is Site.audio (realtime) or a raw engine from Site.audio.createEngine(ctx) (offline check,
   see site/build-score-check.html; offline, the page drives pump() itself).
   The arrangement is compiled once into a sorted event list (film seconds); play(from) maps film
   time onto the audio clock (T = t0 + t − from) and a 25 ms lookahead scheduler hands events to
   the engine ~160 ms ahead. Sustained layers (pad, bass, keys, swells, risers) that started before
   `from` are re-entered with their remaining length (risers and sweeps at their current phase), and
   filter automation is evaluated at `from`, so a restart mid-bar sounds as if it had been playing
   all along. No drift: every event time is computed from the step index, never accumulated.
   Mix (round 3): each group (drums, low, micro, bed, keys, fx) is a chain — trim → filter lane →
   sidechain duck — and every voice's reverb / delay send goes through a copy of its group's chain
   (Voice { sendTo }), so the riser high-pass, the bed lowpass, the duck and parts{} reach the wet
   signal too. The whole score sits OUT_DB under the old level so the master glue only kisses
   the drops (≤ ~3 dB) instead of pumping the whole site mix.
   ========================================================================== */
(function () {
  'use strict';

  var Site = (window.Site = window.Site || {});

  /* ------------------------------------------------------------ timing */
  var BPM = 118, SD = 60 / BPM / 4, BAR = 16 * SD, BARS = 44, DUR = BARS * BAR;
  var TAIL = 4.6;           // the last chord rings on after bar 44
  var LOOK = 0.16;          // scheduler horizon (s)
  var TICK_MS = 25;         // scheduler period (ms)
  // group trims (mix). Round 3: micro 3 → 1.5 (its clicks and cursor ticks sat 19–23 dB over the
  // on-screen typing on the same bus), and the whole score comes down OUT_DB (it hit the master
  // glue at +5 dBFS peaks and pumped the site mix by 4.5 dB on average through the drops).
  var TRIM = { drums: 1, low: 1.08, micro: 1.5, bed: 1.7, keys: 2.4, fx: 0.85 };
  var GROUPS = ['drums', 'low', 'micro', 'bed', 'keys', 'fx'];
  var OUT_DB = -5, OUT = Math.pow(10, OUT_DB / 20);
  function T(bar, step) { return ((bar - 1) * 16 + (step || 0)) * SD; }

  var SECTIONS = [
    { name: 'Intro', bar: 1, bars: 4 },
    { name: 'Build I', bar: 5, bars: 4 },
    { name: 'Build II', bar: 9, bars: 4 },
    { name: 'Build III', bar: 13, bars: 4 },
    { name: 'Riser', bar: 17, bars: 4 },
    { name: 'Drop', bar: 21, bars: 7 },
    { name: 'Silence', bar: 28, bars: 1 },
    { name: 'Half-time', bar: 29, bars: 4 },
    { name: 'Breakdown', bar: 33, bars: 4 },
    { name: 'Final drop', bar: 37, bars: 6 },
    { name: 'Outro', bar: 43, bars: 2 }
  ];

  /* ------------------------------------------------------------ harmony (film timeline) */
  // pad: sustained voicing · t: chord tones for keys / arps / grains / tuned ticks (all ≤ A4 = 69)
  var CH = {
    Dadd9: { r: 38, pad: [50, 57, 64, 66], t: [50, 57, 62, 64, 66, 69] },
    D:     { r: 38, pad: [50, 57, 62, 66], t: [50, 54, 57, 62, 66, 69] },
    Bm7:   { r: 35, pad: [47, 54, 57, 62], t: [47, 54, 57, 62, 66, 69] },
    Bm:    { r: 35, pad: [47, 54, 59, 62], t: [47, 54, 59, 62, 66, 69] },
    G:     { r: 31, pad: [43, 50, 59, 62, 64], t: [43, 50, 55, 59, 62, 64] },
    Gmaj7: { r: 31, pad: [43, 50, 54, 59], t: [43, 50, 54, 59, 62, 66] },
    Asus4: { r: 33, pad: [45, 52, 57, 62], t: [45, 52, 57, 62, 64, 69] },
    A:     { r: 33, pad: [45, 52, 59, 62], t: [45, 52, 57, 59, 64, 69] },   // A(sus2, add4): open, pentatonic
    Amaj:  { r: 33, pad: [45, 52, 57, 61, 64], t: [45, 52, 57, 61, 64, 69] } // the one C#: bar 36, into the final drop
  };
  var PROG = ('Dadd9 Dadd9 Bm7 Asus4  D Bm G A  D Bm G A  D Bm G A  G A Bm A  D Bm G A  D Bm G A  ' +
    'G A D D  Bm G Gmaj7 Asus4  D Bm G A  D Bm G Dadd9').split(/\s+/);
  function chordAt(bar, step) { return bar === 36 && step >= 8 ? CH.Amaj : CH[PROG[bar - 1]]; }

  /* ------------------------------------------------------------ patterns (data) */
  // 16 steps per bar: 'x' = full, '1'–'9' = velocity 0.1–0.9, '.' = rest
  var KICK = {
    one:     'x...............',
    half:    'x.......x.......',
    broken:  'x.....x.....x...',
    broken2: 'x.....x...x.....',
    lift:    'x.........x.....',
    four:    'x...x...x...x...',
    fourGap: 'x...x...x.......',
    stutter: 'x..5..x.x.55.x.5',
    halfT:   'x......4..x.....',
    outro:   'x.......6.......'
  };
  var CLAP = {
    bb:     '....x.......x...',
    bbFill: '....x.......x.78',
    half:   '........x.......',
    rim:    '....x.......x...'
  };
  // closed hats; velocities ≤ 0.4 are ghosts (kept with probability `ghost`)
  var HAT = {
    off8:  '..x...x...x...x.',
    drive: '.3x3.3x3.3x3.3x3',
    rise:  '3434565667788999',
    lone:  '..........x.....',
    three: '..x...x...x.....'
  };
  // bass / sub: [step, semitones above root, length (steps), velocity]
  var BASS = {
    build:   [[2, 0, 2, 1], [10, 0, 2, 0.95], [14, 7, 1.5, 0.8]],
    roll:    [[2, 0, 2.2, 1], [6, 12, 1.5, 0.8], [10, 0, 2.2, 0.95], [14, 7, 1.5, 0.8]],
    roll2:   [[2, 0, 1, 1], [3, 0, 1.6, 0.66], [6, 12, 1.6, 0.8], [10, 0, 1, 0.95], [11, 0, 1.6, 0.66], [14, 7, 1.6, 0.8]],
    half:    [[0, 0, 5, 1], [10, 0, 2, 0.85], [14, 7, 1.5, 0.75]],
    hold:    [[0, 0, 14, 0.9]],
    stutter: [[0, 0, 2, 1], [3, 0, 1, 0.7], [6, 0, 2, 0.9], [8, 12, 1, 0.7], [10, 0, 1, 0.8], [11, 0, 1, 0.7], [13, 7, 2, 0.8]],
    rise:    [[0, 0, 7, 0.9], [8, 0, 7, 0.9]]
  };
  var SUB = {
    bar:  [[0, 0, 12, 1]],
    bar2: [[0, 0, 7, 1], [8, 0, 6, 0.8]],
    off:  [[2, 0, 3, 1], [10, 0, 3, 0.9]]
  };
  // keys: [step, chord-tone indices, length (steps), velocity]
  var KEYS = {
    stab:    [[3, [2, 3, 4], 1.5, 0.6], [10, [2, 3, 4], 1.5, 0.55]],
    hook:    [[0, [2, 4], 1.5, 0.5], [3, [2, 3, 4], 1.5, 0.6], [6, [3], 1, 0.45], [10, [2, 3, 4], 2, 0.55], [13, [4], 1, 0.42]],
    hookB:   [[3, [2, 3, 4], 1.5, 0.6], [6, [5], 1, 0.4], [8, [2, 4], 3, 0.5], [14, [3], 1, 0.4]],
    answer:  [[0, [2, 3, 4], 1.5, 0.55], [3, [2, 3, 4], 1.5, 0.6], [6, [5], 1, 0.48], [7, [4], 1, 0.42], [10, [2, 3, 4], 2, 0.55], [12, [5], 1, 0.44], [14, [4], 1.5, 0.42]],
    answerB: [[3, [2, 3, 4], 1.5, 0.6], [5, [5], 1, 0.44], [6, [4], 1, 0.4], [8, [2, 4], 3, 0.5], [12, [3], 1, 0.42], [14, [5], 1.5, 0.44]],
    motif:   [[0, [3], 4, 0.5], [6, [2], 3, 0.45], [10, [4], 5, 0.45]],
    chord:   [[0, [1, 2, 3, 4], 12, 0.42]],
    cluster: [[0, [0, 1, 2, 3, 4, 5], 3, 0.36]]
  };
  var ARP_ORDER = [1, 3, 2, 4, 3, 5]; // dotted-8th pluck arp over chord tones

  /* ------------------------------------------------------------ arrangement (data) */
  // Rows [firstBar, lastBar, spec] are applied in order; a later row adds to / overrides earlier ones.
  // kick/clap/hat: [pattern, gain(, ghost prob)] · rim/tock/click: [k (euclid pulses of 16), rotation, gain]
  // bass/sub/keys: [pattern, gain] · arp, cursor, ohat: gain · pad: [gain, cutoff] · grain: [per s, gain] · duck: depth
  var ARR = [
    [1, 4, { pad: [0.3, 750], grain: [3, 0.42], cursor: 0.45, sub: ['bar', 0.28] }],
    [2, 3, { tock: [3, 1, 0.9], grain: [4.5, 0.42] }],
    [4, 4, { tock: [5, 1, 1], hat: ['off8', 0.32], sub: ['bar2', 0.32], cursor: 0, grain: [5.5, 0.42] }],

    [5, 8, { kick: ['half', 0.95], duck: 0.25, sub: ['off', 0.48], hat: ['off8', 0.4], click: [5, 0, 0.9], tock: [3, 2, 0.9], pad: [0.26, 950], grain: [5, 0.4] }],
    [6, 8, { clap: ['rim', 0.34], click: [4, 1, 0.9], tock: [4, 2, 0.95] }],
    [7, 8, { hat: ['drive', 0.42, 0.2], tock: [5, 1, 1] }],

    [9, 16, { kick: ['broken', 1], duck: 0.28, bass: ['build', 0.85], hat: ['drive', 0.45, 0.28], rim: [3, 5, 0.34], tock: [4, 1, 0.9], click: [3, 3, 0.8], arp: 0.3, pad: [0.25, 1050], grain: [6, 0.4] }],
    [11, 12, { kick: ['lift', 0.9] }],
    [13, 16, { clap: ['bb', 0.55], rim: [5, 3, 0.4], hat: ['drive', 0.64, 0.38], tock: [7, 1, 0.95], bass: ['build', 0.92], grain: [7, 0.42] }],
    [16, 16, { kick: ['stutter', 0.9], hat: ['rise', 0.62], bass: ['stutter', 0.78], clap: ['half', 0.5], arp: 0, tock: [5, 2, 0.9] }],

    [17, 20, { kick: ['broken2', 1.02], duck: 0.28, clap: ['bb', 0.58], hat: ['drive', 0.6, 0.4], rim: [5, 3, 0.4], tock: [5, 1, 0.9], click: [3, 5, 0.8], bass: ['build', 1.08], keys: ['stab', 0.36], pad: [0.34, 1200], grain: [8, 0.42] }],
    [19, 20, { kick: ['four', 0.85], clap: null, bass: ['rise', 0.82], keys: null, hat: ['rise', 0.55], rim: null, click: null }],
    [19, 19, { keys: ['cluster', 0.3] }],
    [20, 20, { kick: ['fourGap', 0.85], bass: ['hold', 0.85] }], // round 3: bar 20 no longer dips under the build

    [21, 27, { kick: ['four', 1.24], duck: 0.32, clap: ['bb', 0.95], hat: ['drive', 0.66, 0.5], ohat: 0.26, rim: [5, 3, 0.46], tock: [7, 1, 1.05], click: [3, 5, 0.75], bass: ['roll', 1.6], keys: ['hook', 0.4], pad: [0.4, 1300], grain: [10, 0.42] }],
    [24, 24, { clap: ['bbFill', 0.95] }],
    [28, 28, { hat: ['lone', 0.45], pad: [0.3, 800], grain: [3, 0.36], sub: ['bar', 0.32] }],

    [29, 32, { kick: ['halfT', 1.05], duck: 0.28, clap: ['half', 0.78], hat: ['off8', 0.38], rim: [3, 6, 0.36], tock: [5, 2, 0.95], bass: ['half', 0.86], keys: ['stab', 0.3], pad: [0.3, 1200], grain: [7, 0.42] }],
    [31, 31, { tock: [3, 2, 0.8], click: null }],
    [32, 32, { kick: ['half', 0.8], keys: null, hat: ['three', 0.44] }],

    [33, 34, { kick: ['one', 0.62], duck: 0.2, bass: ['hold', 0.4], tock: [3, 2, 0.8], keys: ['motif', 0.36], pad: [0.34, 1000], grain: [6, 0.42] }],
    [35, 35, { pad: [0.4, 900], keys: ['chord', 0.32], cursor: 0.4, sub: ['bar', 0.3], grain: [4, 0.4] }],
    [36, 36, { kick: ['four', 0.72], duck: 0.2, hat: ['rise', 0.5], bass: ['rise', 0.56], pad: [0.3, 1100], grain: [6, 0.42] }],

    [37, 42, { kick: ['four', 1.26], duck: 0.33, clap: ['bb', 0.98], hat: ['drive', 0.72, 0.6], ohat: 0.28, rim: [5, 3, 0.48], tock: [7, 1, 1.05], click: [3, 5, 0.75], bass: ['roll2', 1.65], keys: ['answer', 0.42], pad: [0.44, 1300], grain: [11, 0.42],
      arp: 0.2, wide: 1 }], // the climax: the dotted-8th arp returns under the answer, keys and pad open out
    [40, 40, { clap: ['bbFill', 0.98], kick: ['four', 1.24] }],

    [43, 43, { kick: ['outro', 0.72], duck: 0.2, hat: ['off8', 0.36], bass: ['hold', 0.6], keys: ['chord', 0.34], tock: [3, 2, 0.8], pad: [0.34, 1000], grain: [5, 0.4] }]
  ];

  /* ------------------------------------------------------------ small helpers */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function euclid(k, n, rot) {
    var p = [];
    for (var i = 0; i < n; i++) p.push(((i * k) % n) < k);
    rot = ((rot || 0) % n + n) % n;
    return p.slice(n - rot).concat(p.slice(0, n - rot));
  }
  function vel(ch) { return ch === 'x' ? 1 : ch >= '1' && ch <= '9' ? (ch.charCodeAt(0) - 48) / 10 : 0; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  /* ------------------------------------------------------------ compile → events */
  // event: { t (film s), k: 'play'|'duck'|'cue', i (instrument), m (midi | [midis]), o (options), g (group),
  //          s (sustain s), r (role: the instrument name, or 'cursor' | 'tock' | 'click' | 'rim' | 'roll' |
  //          'arp' | 'dissolve' | …, used by the typing filter and the check page's solo tests) }
  var EVENTS = null, SUSTAINED = null, LANES = null;

  function compile() {
    var ev = [], r = rng(20260924);
    function add(bar, step, i, m, o, g, s, role) { ev.push({ t: T(bar, step), k: 'play', i: i, m: m, o: o || {}, g: g, s: s || 0, r: role || i }); }
    function duck(bar, step, a) { ev.push({ t: T(bar, step), k: 'duck', a: a, d: SD * 2.4 }); }
    function cue(bar, step, c) { ev.push({ t: T(bar, step), k: 'cue', c: c }); }
    function pick(a) { return a[Math.floor(r() * a.length) % a.length]; }

    // per-bar specs
    var spec = [];
    for (var b = 1; b <= BARS; b++) spec[b] = {};
    ARR.forEach(function (row) { for (var b2 = row[0]; b2 <= row[1]; b2++) assign(spec[b2], row[2]); });

    var lastPad = null;
    for (var bar = 1; bar <= BARS; bar++) {
      var S = spec[bar];

      // --- kick (+ sidechain duck on the bed and keys)
      if (S.kick) {
        var kp = KICK[S.kick[0]];
        for (var i = 0; i < 16; i++) {
          var kv = vel(kp[i]);
          if (!kv) continue;
          add(bar, i, 'kick', null, { gain: S.kick[1] * kv, click: 0.8 }, 'drums');
          if (S.duck && kv > 0.5) duck(bar, i, S.duck * kv);
        }
      }
      // --- clap backbeat (a quiet rim layer under it); 'rim' pattern = rim alone
      if (S.clap) {
        var cp = CLAP[S.clap[0]], rimOnly = S.clap[0] === 'rim';
        for (i = 0; i < 16; i++) {
          var cv = vel(cp[i]);
          if (!cv) continue;
          if (!rimOnly) add(bar, i, 'clap', null, { gain: S.clap[1] * cv, reverb: 0.06 }, 'drums');
          add(bar, i, 'snare', null, { gain: S.clap[1] * cv * (rimOnly ? 1 : 0.55), midi: rimOnly ? 69 : 71, decay: 0.036, crush: 0.08, reverb: 0.04 }, 'drums');
        }
      }
      // --- closed micro hats (ghosts are probabilistic). Round 3: tone 1 (the engine's corner, 4.2–6.4 kHz):
      // tone 0.8 moved the corner into the 2.5–5 kHz presence band (+5–7 dB there), not darker. Darker
      // here means the top comes off instead: a 7 kHz lowpass (the engine default is 9 kHz).
      if (S.hat) {
        var hp = HAT[S.hat[0]], gp = num(S.hat[2], 1);
        for (i = 0; i < 16; i++) {
          var hv = vel(hp[i]);
          if (!hv) continue;
          if (hv <= 0.4 && S.hat[0] !== 'rise' && r() > gp) continue;
          add(bar, i, 'hat', null, { gain: S.hat[1] * hv, tone: 1, lp: 7000, decay: hv > 0.6 ? 0.022 : 0.011, pan: (r() - 0.5) * 0.5 }, 'drums');
        }
      }
      // --- open hat on the last offbeat of every other bar
      if (S.ohat && bar % 2 === 0) add(bar, 14, 'hat', null, { open: true, gain: S.ohat, tone: 1, lp: 7500, decay: 0.07, pan: 0.2 }, 'drums', 0, 'ohat');
      // --- euclidean rim ticks (never on the beat)
      if (S.rim) {
        var rp = euclid(S.rim[0], 16, S.rim[1]);
        for (i = 0; i < 16; i++) if (rp[i] && i % 4) add(bar, i, 'snare', null, { gain: S.rim[2] * (0.75 + 0.25 * r()), midi: pick([69, 71, 74]), decay: 0.024, crush: 0.15, pan: (r() - 0.5) * 0.6 }, 'drums', 0, 'rim');
      }
      // --- wooden tuned ticks: chord tones an octave up (D5–A5, ≤ 880 Hz), dotted-8th echo
      if (S.tock) {
        var tp = euclid(S.tock[0], 16, S.tock[1]);
        for (i = 0; i < 16; i++) {
          if (!tp[i]) continue;
          var ct = chordAt(bar, i).t, m = ct[2 + Math.floor(r() * 4)] + 12;
          add(bar, i, 'tick', m, { gain: S.tock[2] * (0.7 + 0.3 * r()), dur: 0.004 + 0.003 * r(), pan: (r() * 2 - 1) * 0.7, delay: 0.12 }, 'micro', 0, 'tock');
        }
      }
      // --- keystroke-like clicks, a register below build.js's typing. Round 3: the micro trim and the
      //     score's output level put them ~11 dB lower than before (the typing foley at 0.65 sits
      //     ~+5 dB over them), and they are dropped around on-screen keystrokes (typing())
      if (S.click) {
        var cl = euclid(S.click[0], 16, S.click[1]);
        for (i = 0; i < 16; i++) if (cl[i]) add(bar, i + (r() < 0.3 ? 0.5 : 0), 'click', null, { gain: S.click[2] * (0.6 + 0.4 * r()), freq: 1100 + r() * 1500, q: 2 + r() * 2, pan: (r() * 2 - 1) * 0.8 }, 'micro', 0, 'click');
      }
      // --- the typing cursor: a soft tock on each beat (round 3: half the level, under the typing)
      if (S.cursor) for (i = 0; i < 16; i += 4) add(bar, i, 'tick', i === 0 ? 69 : 62, { gain: S.cursor * (i === 0 ? 1 : 0.8), dur: 0.005, pan: 0, delay: 0.1 }, 'micro', 0, 'cursor');

      // --- bass (clean sine + a hint of 2nd harmonic) / sub pulses
      if (S.bass) {
        var bp = BASS[S.bass[0]].slice();
        if (S.bass[0] === 'roll') bp.push(bar % 2 ? [7, 0, 0.7, 0.45] : [15, 12, 0.7, 0.5]);
        if (S.bass[0] === 'roll2' && bar % 2 === 0) bp.push([15, 12, 0.7, 0.55]);
        bp.forEach(function (n) {
          var root = chordAt(bar, n[0]).r, d = n[2] * SD;
          add(bar, n[0], 'bass', root + n[1], { gain: S.bass[1] * n[3], dur: d, bright: 0.8 }, 'low', d);
        });
      }
      if (S.sub) {
        SUB[S.sub[0]].forEach(function (n) {
          var d = n[2] * SD;
          add(bar, n[0], 'sub', chordAt(bar, n[0]).r + n[1], { gain: S.sub[1] * n[3], dur: d }, 'low', d * 0.9);
        });
      }

      // --- keys (warm, muted; delay does the dub-techno space)
      if (S.keys) {
        var pat = S.keys[0];
        if (pat === 'hook' && bar % 2 === 0) pat = 'hookB';
        if (pat === 'answer' && bar % 2 === 0) pat = 'answerB';
        KEYS[pat].forEach(function (n) {
          var ch = chordAt(bar, n[0]), d = n[2] * SD;
          n[1].forEach(function (ix, j) {
            add(bar, n[0] + j * 0.04, 'keys', ch.t[ix], { gain: S.keys[1] * n[3], dur: d, vel: 0.5, pan: (j - 1) * (S.wide ? 0.42 : 0.25), delay: 0.16, reverb: 0.05, click: j === 0 }, 'keys', d);
          });
        });
      }
      // --- dotted-8th pluck arp (the build)
      if (S.arp) {
        for (var ai = 0; ai * 3 < 16; ai++) {
          var as = ai * 3;
          add(bar, as, 'pluck', chordAt(bar, as).t[ARP_ORDER[(ai + bar) % ARP_ORDER.length]], { gain: S.arp * (as === 0 ? 1 : 0.8), dur: 0.26, bright: S.wide ? 0.22 : 0.28, pan: ((ai % 3) - 1) * (S.wide ? 0.55 : 0.35), delay: 0.14 }, 'keys', 0, 'arp');
        }
      }

      // --- pad: one per chord, re-voiced at each bar (sine/triangle through a breathing lowpass)
      if (S.pad) {
        var padBars = 1, key = PROG[bar - 1];
        if (bar === 36) {
          add(bar, 0, 'pad', CH.Asus4.pad, { gain: S.pad[0], dur: 8 * SD - 0.05, attack: 0.3, release: 0.5, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08 }, 'bed', 8 * SD);
          add(bar, 8, 'pad', CH.Amaj.pad, { gain: S.pad[0], dur: 8 * SD - 0.05, attack: 0.15, release: 0.6, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08 }, 'bed', 8 * SD);
        } else if (!(lastPad && lastPad.key === key && lastPad.until > bar)) {
          while (bar + padBars <= BARS && PROG[bar + padBars - 1] === key && padBars < 2 && spec[bar + padBars].pad) padBars++;
          var pd = padBars * BAR - 0.06, first = bar === 1;
          add(bar, 0, 'pad', CH[key].pad, { gain: S.pad[0], dur: pd, attack: first ? 3.2 : 0.35, release: 0.8, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08, width: S.wide ? 1.45 : 1 }, 'bed', pd);
          lastPad = { key: key, until: bar + padBars };
        }
      }
      // --- dark grain bed on chord tones (D3–A4), rhythmically loose around the 16ths
      if (S.grain) {
        var per = S.grain[0] * SD;
        for (i = 0; i < 16; i++) {
          var n = Math.floor(per) + (r() < per - Math.floor(per) ? 1 : 0);
          for (var q = 0; q < n; q++) {
            var tones = chordAt(bar, i).t.filter(function (x) { return x >= 50; });
            add(bar, i + r() * 0.9, 'grain', pick(tones), { gain: S.grain[1] * (0.55 + 0.45 * r()), dur: 0.08 + r() * 0.12, bright: 0.06 + 0.06 * r(), pan: (r() * 2 - 1) * 0.75, reverb: 0.1, delay: r() < 0.25 ? 0.12 : 0 }, 'bed');
          }
        }
      }
    }

    /* ---- one-off events: risers, impacts, fills, ornaments, the final chord */
    function riser(bar, step, bars, gain, lo, hi) {
      var d = bars * BAR - step * SD;
      add(bar, step, 'noise', null, { dur: 0.02, attack: d, release: 0.08, filter: 'bandpass', freq: lo || 260, freqTo: hi || 2400, q: 1.3, type: 'pink', gain: gain, reverb: 0.1 }, 'fx', d, 'riser-noise');
      add(bar, step, 'riser', null, { dur: d, midi: 55, octaves: 1, gain: gain * 1.6, reverb: 0.06, delay: 0.05 }, 'fx', d, 'riser');
    }
    function roll(bar, from, to, every, g0, g1, m0, m1) { // clicky rim roll, accelerating by `every` steps
      for (var s = from, k = 0; s < to - 1e-6; s += every, k++) {
        var x = (s - from) / Math.max(1e-6, to - from);
        add(bar, s, 'snare', null, { gain: g0 + (g1 - g0) * x, midi: Math.round(m0 + (m1 - m0) * x), decay: 0.022, crush: 0.05, pan: (k % 2 ? 1 : -1) * 0.2 }, 'drums', 0, 'roll');
      }
    }
    function impact(bar, gain) { add(bar, 0, 'impact', null, { gain: gain, decay: 1.4, reverb: 0.1 }, 'fx'); }
    var LOWBITS = [62, 64, 66, 69, 71];

    // Intro: a data bit answers the first bar; 'builders' inks (bar 3 beat 3) → a low keys dyad
    add(1, 14, 'bit', 69, { gain: 0.5, dur: 0.016, steps: 's8', pan: 0.4, delay: 0.14 }, 'micro');
    add(2, 14, 'bit', 66, { gain: 0.42, dur: 0.014, steps: 's4', pan: -0.4, delay: 0.14 }, 'micro');
    add(3, 8, 'keys', 62, { gain: 0.4, dur: 6 * SD, vel: 0.5, pan: -0.2, delay: 0.24, reverb: 0.08 }, 'keys', 6 * SD);
    add(3, 8.04, 'keys', 69, { gain: 0.3, dur: 6 * SD, vel: 0.45, pan: 0.2, delay: 0.24, reverb: 0.08, click: false }, 'keys', 6 * SD);
    add(3, 14, 'hat', null, { gain: 0.3, tone: 1, lp: 7000, decay: 0.02 }, 'drums');
    riser(4, 0, 1, 0.2, 240, 1800);
    add(4, 14, 'ratchet', null, { count: 3, span: SD * 2, gain: 0.45 }, 'drums');
    add(4, 15, 'glitch', null, { midi: 62, repeats: 4, len: 0.024, gain: 0.3, pan: 0.2 }, 'micro');

    // Build I: a pluck on each slammed word, four plucks as the axis turns (bar 8)
    [[5, 0, 62], [5, 8, 66], [6, 0, 59]].forEach(function (p) { add(p[0], p[1], 'pluck', p[2], { gain: 0.38, dur: 0.3, bright: 0.25, delay: 0.18 }, 'keys'); });
    [57, 59, 62, 64].forEach(function (m, k) { add(8, k * 4, 'pluck', m, { gain: 0.36, dur: 0.3, bright: 0.25, pan: (k - 1.5) * 0.3, delay: 0.18 }, 'keys'); });
    add(8, 12, 'data', null, { dur: 0.36, density: 42, pitch: LOWBITS, clicks: 0.25, bits: 0.5, spread: 0.8, gain: 0.55 }, 'micro');
    add(8, 14, 'glitch', null, { midi: 57, repeats: 5, len: 0.026, gain: 0.3 }, 'micro');

    // Build II: wind under the turbines (bars 11–12), a ratchet into bar 13
    add(11, 0, 'noise', null, { dur: BAR, attack: BAR, release: 1.2, filter: 'lowpass', freq: 380, freqTo: 900, q: 0.5, type: 'pink', gain: 0.24, reverb: 0.08 }, 'fx', 2 * BAR);
    add(12, 14, 'ratchet', null, { count: 4, span: SD * 2, gain: 0.5 }, 'drums');
    add(12, 15, 'glitch', null, { midi: 62, repeats: 4, len: 0.022, gain: 0.28, pan: -0.2 }, 'micro');

    // Build III: 'laws of physics'; bar 16 hex dump
    impact(13, 0.34);
    add(15, 14, 'hat', null, { open: true, gain: 0.26, tone: 1, lp: 7500, decay: 0.07 }, 'drums', 0, 'ohat');
    add(16, 4, 'data', null, { dur: 0.5, density: 36, pitch: LOWBITS, clicks: 0.2, bits: 0.6, spread: 0.9, gain: 0.5 }, 'micro');
    add(16, 12, 'glitch', null, { repeats: 7, len: 0.034, factor: 0.8, crush: true, gain: 0.34 }, 'micro');
    add(16, 8, 'noise', null, { dur: 0.02, attack: 8 * SD, release: 0.06, filter: 'bandpass', freq: 300, freqTo: 1600, q: 1.2, type: 'pink', gain: 0.14 }, 'fx', 8 * SD);

    // Riser: the dense frame snaps to sparse (bar 19) → a two-bar riser into the drop
    add(19, 4, 'pluck', 66, { gain: 0.34, dur: 0.3, bright: 0.25, delay: 0.16 }, 'keys');
    add(19, 8, 'pluck', 62, { gain: 0.3, dur: 0.3, bright: 0.25, delay: 0.16 }, 'keys');
    add(19, 12, 'pluck', 59, { gain: 0.3, dur: 0.3, bright: 0.25, delay: 0.16 }, 'keys');
    riser(19, 0, 2, 0.3, 220, 2600);
    roll(19, 0, 16, 2, 0.22, 0.36, 64, 69);
    roll(20, 0, 8, 1, 0.36, 0.48, 69, 72);
    roll(20, 8, 14, 0.5, 0.48, 0.62, 72, 76);
    add(20, 8, 'data', null, { dur: 0.6, density: 30, pitch: LOWBITS, clicks: 0.2, bits: 0.6, spread: 0.9, gain: 0.42 }, 'micro');

    // Drop: impact on the downbeat, fills at the ends of phrases, a riser across bar 26,
    // 'no limits' bursts at bar 27, then the silence of bar 28
    impact(21, 0.72);
    add(22, 7, 'bit', 64, { gain: 0.5, dur: 0.018, steps: 's8', pan: -0.3, delay: 0.12 }, 'micro');
    add(22, 7.5, 'bit', 69, { gain: 0.45, dur: 0.02, steps: 's8', pan: 0.3, delay: 0.12 }, 'micro');
    add(24, 14, 'ratchet', null, { count: 4, span: SD * 1.6, gain: 0.5 }, 'drums');
    add(24, 15, 'glitch', null, { midi: 62, repeats: 5, len: 0.022, gain: 0.3 }, 'micro');
    riser(26, 0, 1, 0.17, 280, 2200);
    impact(27, 0.5);
    add(27, 0, 'data', null, { dur: 0.6, density: 64, pitch: LOWBITS, clicks: 0.2, bits: 0.55, spread: 1, gain: 0.55 }, 'micro');
    add(27, 15, 'glitch', null, { midi: 57, repeats: 6, len: 0.03, factor: 0.78, gain: 0.3 }, 'micro');
    add(28, 12, 'tick', 69, { gain: 0.8, dur: 0.005, delay: 0.2 }, 'micro');

    // Half-time: 'excellence' (bar 32 beat 1) → a soft D(add9) chord with echoes
    CH.Dadd9.t.slice(1, 5).forEach(function (m, k) { add(32, k * 0.05, 'keys', m, { gain: 0.3, dur: 8 * SD, vel: 0.5, pan: (k - 1.5) * 0.3, delay: 0.26, reverb: 0.08, click: k === 0 }, 'keys', 8 * SD); });
    add(32, 12, 'ratchet', null, { count: 3, span: SD * 2, gain: 0.4 }, 'drums');
    add(32, 14, 'glitch', null, { midi: 62, repeats: 5, len: 0.026, gain: 0.28 }, 'micro');

    // Breakdown → riser, the rim roll, the C# at beat 3 of bar 36
    riser(36, 0, 1, 0.2, 240, 2300);
    roll(36, 0, 8, 2, 0.16, 0.26, 64, 67);
    roll(36, 8, 12, 1, 0.28, 0.36, 67, 71);
    roll(36, 12, 16, 0.5, 0.36, 0.5, 71, 76);
    [61, 64].forEach(function (m, k) { add(36, 8 + k * 0.05, 'keys', m, { gain: 0.34, dur: 6 * SD, vel: 0.5, pan: (k - 0.5) * 0.4, delay: 0.2, reverb: 0.06, click: k === 0 }, 'keys', 6 * SD); });

    // Final drop: impacts on 37 and 41, a riser across bar 40
    impact(37, 0.78);
    add(38, 7, 'bit', 66, { gain: 0.48, dur: 0.018, steps: 's8', pan: 0.3, delay: 0.12 }, 'micro');
    riser(40, 0, 1, 0.18, 280, 2400);
    add(40, 14, 'ratchet', null, { count: 5, span: SD * 2, gain: 0.5 }, 'drums');
    impact(41, 0.8);
    add(41, 0, 'data', null, { dur: 0.32, density: 60, pitch: LOWBITS, clicks: 0.2, bits: 0.55, spread: 1, gain: 0.5 }, 'micro');
    add(42, 12, 'ratchet', null, { count: 4, span: SD * 2, gain: 0.42, dir: 'down' }, 'drums');
    add(42, 14, 'glitch', null, { midi: 57, repeats: 6, len: 0.03, factor: 0.8, gain: 0.3 }, 'micro');

    // Outro: plagal G → D(add9). The last chord: pad + keys + sub, grains thinning out as the page settles
    var FIN = CH.Dadd9;
    add(44, 0, 'pad', FIN.pad, { gain: 0.46, dur: 2.4, attack: 0.25, release: 2.6, cutoff: 900, grains: 0, highpass: 70, reverb: 0.12 }, 'bed', 2.4);
    add(44, 0, 'sub', 38, { gain: 0.46, dur: 2.6 }, 'low', 2.2);
    [50, 57, 64, 66].forEach(function (m, k) { add(44, k * 0.06, 'keys', m, { gain: 0.3, dur: 2.2, vel: 0.42, pan: (k - 1.5) * 0.3, delay: 0.2, reverb: 0.1, click: k === 0 }, 'keys', 2.2); });
    add(44, 0, 'tick', 62, { gain: 0.9, dur: 0.006, delay: 0.2 }, 'micro');
    for (var gk = 0; gk < 22; gk++) {
      var gt = gk * 0.2 + r() * 0.12;
      ev.push({ t: T(44, 0) + 0.1 + gt, k: 'play', i: 'grain', m: pick([50, 57, 62, 64, 66]), o: { gain: 0.4 * (1 - gk / 24), dur: 0.1 + r() * 0.1, bright: 0.05, pan: (r() * 2 - 1) * 0.7, reverb: 0.12 }, g: 'bed', s: 0, r: 'final-grain' });
    }
    // the frame dissolves into the poem at bar 44 beat 4 (build.js SETTLE_AT = lb(44, 4)): a short
    // downward spray of low grains starts with it (round 3: was beat 3, a beat early)
    [69, 66, 62, 57, 50].forEach(function (m, k) { add(44, 12 + k * 0.28, 'grain', m, { gain: 0.34, dur: 0.12, bright: 0.05, pan: (k % 2 ? 1 : -1) * 0.4, reverb: 0.12 }, 'bed', 0, 'dissolve'); });

    // cues (sections + hits) for anything that wants to sync to the music
    SECTIONS.forEach(function (s) { cue(s.bar, 0, { type: 'section', name: s.name, bar: s.bar }); });
    [13, 21, 27, 37, 41].forEach(function (b) { cue(b, 0, { type: 'impact', name: 'impact', bar: b }); });
    cue(44, 0, { type: 'final', name: 'final chord', bar: 44 });

    ev.sort(function (a, b) { return a.t - b.t; });
    EVENTS = ev;
    SUSTAINED = ev.filter(function (e) { return e.s > 0; });

    // filter automation lanes: [film s, value, 'set' | 'lin' | 'exp']
    LANES = {
      drumsHP: [[0, 20, 'set'], [T(19), 20, 'set'], [T(21) - 0.01, 380, 'exp'], [T(21), 20, 'set'],
        [T(36), 20, 'set'], [T(37) - 0.01, 320, 'exp'], [T(37), 20, 'set'],
        [T(40), 20, 'set'], [T(41) - 0.01, 200, 'exp'], [T(41), 20, 'set']],
      bedLP: [[0, 420, 'set'], [T(5), 1800, 'exp'], [T(17), 1800, 'set'], [T(21) - 0.01, 3200, 'exp'], [T(21), 2400, 'set'],
        [T(28), 2400, 'set'], [T(28, 2), 900, 'exp'], [T(29), 900, 'set'], [T(29, 4), 2000, 'exp'],
        [T(33), 2000, 'set'], [T(35), 1000, 'exp'], [T(36), 1000, 'set'], [T(37) - 0.01, 2800, 'exp'], [T(37), 2400, 'set'],
        [T(43), 2400, 'set'], [T(44), 1200, 'exp'], [DUR + TAIL, 450, 'exp']]
    };
  }

  function laneAt(lane, x) {
    var v = lane[0][1];
    for (var i = 0; i < lane.length; i++) {
      var p = lane[i];
      if (p[0] <= x) { v = p[1]; continue; }
      if (p[2] === 'set') return v;
      var q = lane[i - 1], u = (x - q[0]) / Math.max(1e-9, p[0] - q[0]);
      return p[2] === 'exp' ? v * Math.pow(p[1] / v, u) : v + (p[1] - v) * u;
    }
    return v;
  }


  // Overrides that re-enter a sustained event `el` seconds into it, with `rem` seconds left.
  function resumeOpts(e, el, rem) {
    var o = e.o;
    switch (e.i) {
      case 'pad': return { dur: rem, attack: Math.min(num(o.attack, 0.5), 0.3) };
      case 'keys': return rem > 0.18 ? { dur: rem, click: false, vel: num(o.vel, 0.6) * 0.8 } : null;
      case 'bass': return rem > 0.1 ? { dur: rem } : null;
      case 'sub': return rem > 0.15 ? { dur: rem } : null;
      // round 3: the sweep, the swell and the tick climb continue from the riser's current phase
      // (it used to restart at 400 Hz and the bottom of the scale with the remaining length)
      case 'riser': return rem > 0.2 ? { dur: rem, phase: clamp(el / Math.max(1e-6, e.s), 0, 0.98) } : null;
      case 'noise': {
        var atk = num(o.attack, 0.01), d = num(o.dur, 0), rel = num(o.release, 0.2), tot = atk + d + rel;
        // a swell resumes from the level its linear attack had reached (round 3; it restarted from 0)
        var r = el < atk ? { attack: atk - el, dur: d, level0: el / atk } : { attack: 0.04, dur: Math.max(0, d - (el - atk)) };
        if (isFinite(o.freqTo)) r.freq = o.freq * Math.pow(o.freqTo / o.freq, clamp(el / tot, 0, 1));
        return r;
      }
      default: return null;
    }
  }

  /* ------------------------------------------------------------ player */
  function create(audio, dest, opts) {
    if (!EVENTS) compile();
    opts = opts || {};
    var A = audio, ctx = A && A.ctx;
    if (!ctx || !A.play) throw new Error('BuildScore.create: audio engine is not ready');
    var eng = A.engine || A;                          // Site.audio facade → its engine; offline → the engine itself
    var offline = !!eng.offline;
    var partGain = opts.parts || {};
    var filter = typeof opts.filter === 'function' ? opts.filter : null;   // test hook: solo events
    var onFire = typeof opts.onFire === 'function' ? opts.onFire : null;   // test hook: log events
    var cues = [];
    var S = null;                                      // the current session (one per play)
    var timer = null, lastPos = 0;
    var typingWin = null;                              // merged [t0, t1] film-second windows of on-screen typing

    function now() { return typeof A.now === 'function' ? A.now() : ctx.currentTime; }
    function G(v) { var g = ctx.createGain(); g.gain.value = v; return g; }

    // One chain per group: trim (× parts) → filter lane → sidechain duck → `to`. It is built for the dry
    // signal and again for each send (reverb, delay), so the wet signal is shaped like the dry one.
    function graph() {
      var out = G(0), wetR = G(0), wetD = G(0);
      out.connect(dest && dest.context === ctx ? dest : A.master);
      var rvIn = eng.reverb, dlIn = eng.delay;
      var wet = !!(rvIn && dlIn && rvIn.context === ctx && dlIn.context === ctx);
      if (wet) { wetR.connect(rvIn); wetD.connect(dlIn); }
      var n = [out, wetR, wetD], lanes = { drumsHP: [], bedLP: [] }, ducks = [];
      function F(type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; n.push(x); return x; }
      function chainFor(name, to) {
        var inp = G(num(partGain[name], 1) * TRIM[name]), node = inp;
        n.push(inp);
        if (name === 'drums') { var hp = F('highpass', 20, 0.6); node.connect(hp); node = hp; lanes.drumsHP.push(hp.frequency); }
        if (name === 'bed') { var lp = F('lowpass', 1800, 0.5); node.connect(lp); node = lp; lanes.bedLP.push(lp.frequency); }
        if (name === 'bed' || name === 'keys') { var d = G(1); n.push(d); node.connect(d); node = d; ducks.push([d, name === 'bed' ? 1 : 0.5]); }
        node.connect(to);
        return inp;
      }
      var g = {}, sr = {}, sd = {};
      GROUPS.forEach(function (name) {
        g[name] = chainFor(name, out);
        if (wet && name !== 'low') { sr[name] = chainFor(name, wetR); sd[name] = chainFor(name, wetD); }
      });
      var un = [];
      if (typeof eng.addDuckTarget === 'function') {
        try { ducks.forEach(function (d) { un.push(eng.addDuckTarget(d[0], d[1])); }); }
        catch (e) { un.forEach(function (u) { try { u(); } catch (e2) {} }); un = []; }
      }
      return { out: out, outs: [out, wetR, wetD], g: g, sr: sr, sd: sd, nodes: n, lanes: lanes, un: un, duckOK: un.length > 0, ducks: ducks };
    }

    /* typing windows: keystrokes ≤ 2.5 16ths apart form one window, padded by ¾ of a 16th */
    function setTyping(times) {
      var a = [];
      (Array.isArray(times) ? times : []).forEach(function (x) { x = +x; if (isFinite(x)) a.push(x); });
      a.sort(function (x, y) { return x - y; });
      var w = [];
      for (var i = 0; i < a.length; i++) {
        var last = w[w.length - 1];
        if (last && a[i] - last[1] <= 2.5 * SD) last[1] = a[i]; else w.push([a[i], a[i]]);
      }
      typingWin = w.length ? w.map(function (x) { return [x[0] - 0.75 * SD, x[1] + 0.75 * SD]; }) : null;
      return typingWin ? typingWin.length : 0;
    }
    function inTyping(t) {
      var lo = 0, hi = typingWin.length - 1;
      while (lo <= hi) {
        var m = (lo + hi) >> 1, x = typingWin[m];
        if (t < x[0]) hi = m - 1; else if (t > x[1]) lo = m + 1; else return true;
      }
      return false;
    }
    if (opts.typing) setTyping(opts.typing);

    function fire(s, e, when, over) {
      if (e.k === 'duck') {
        if (s.gr.duckOK && typeof A.duck === 'function') { try { A.duck(e.a, when, e.d); } catch (err) {} }
        else { // no engine duck targets: shape our own sidechain dip
          s.gr.ducks.forEach(function (p) {
            var gp = p[0].gain;
            gp.setTargetAtTime(1 - e.a * p[1], when, 0.0035);
            gp.setTargetAtTime(1, when + 0.025, e.d * 0.3);
          });
        }
        return;
      }
      if (e.k === 'cue') { emit(e.c, when, e.t); return; }
      if (filter && !filter(e)) return;
      if (e.r === 'click' && typingWin && inTyping(e.t)) return; // the on-screen typing owns this 16th
      var f = A.play[e.i];
      if (typeof f !== 'function') return;
      var o = assign({}, e.o);
      if (over) assign(o, over);
      o.when = when;
      o.dest = s.gr.g[e.g] || s.gr.out;
      var rv = num(o.reverb, 0), dl = num(o.delay, 0);
      if (s.gr.sr[e.g]) {
        // the sends run through a copy of the group's chain, which carries the group trim: divide it
        // out so the wet / dry balance the arrangement was voiced with stays exactly the same
        o.reverb = rv / TRIM[e.g]; o.delay = dl / TRIM[e.g];
        o.sendTo = { reverb: s.gr.sr[e.g], delay: s.gr.sd[e.g] };
      } else { o.reverb = rv; o.delay = dl; }
      if (onFire) { try { onFire(e, when); } catch (err) {} }
      try { if (e.m == null) f(o); else f(e.m, o); } catch (err) { /* one voice never stops the score */ }
    }

    function emit(c, when, ft) {
      if (!cues.length) return;
      var payload = assign({ t: ft, time: when }, c), fns = cues.slice();
      function run() { for (var i = 0; i < fns.length; i++) { try { fns[i](payload); } catch (err) {} } }
      if (offline || typeof setTimeout !== 'function') run();
      else setTimeout(run, Math.max(0, (when - now()) * 1000));
    }

    function pump() {
      var s = S;
      if (!s) return;
      var n0 = now(), horizon = n0 + LOOK;
      while (s.i < EVENTS.length) {
        var e = EVENTS[s.i], at = s.t0 + (e.t - s.from);
        if (at >= horizon) break;
        s.i++;
        if (at < n0 - 0.04) continue;               // missed (throttled timer): skip rather than burst
        fire(s, e, Math.max(at, n0 + 0.001));
      }
      if (n0 > s.tEnd) finish(s);
    }

    function fadeOuts(s, n0, sec) {
      s.gr.outs.forEach(function (x) {
        try { var gp = x.gain; gp.cancelScheduledValues(n0); gp.setValueAtTime(gp.value, n0); gp.linearRampToValueAtTime(0, n0 + sec); } catch (e) {}
      });
    }
    function finish(s) {
      if (S === s) { lastPos = DUR; S = null; stopTimer(); }
      fadeOuts(s, now(), 0.6);         // the last chord is ~-45 dB by now: fade what is left, then let go of the graph
      teardown(s, 0.6);
    }
    function teardown(s, after) {
      if (s.dead) return;
      s.dead = true;
      var kill = function () {
        s.gr.un.forEach(function (u) { try { u(); } catch (e) {} });
        s.gr.nodes.forEach(function (x) { try { x.disconnect(); } catch (e) {} });
      };
      if (offline || typeof setTimeout !== 'function') return; // offline: leave the graph; the render ends anyway
      setTimeout(kill, Math.max(0, after) * 1000 + 600);
    }
    function startTimer() { if (!offline && !timer && typeof setInterval === 'function') timer = setInterval(pump, TICK_MS); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    // Film position at the audio clock: what is being SCHEDULED now (sounds for film second x go at timeAt(x)).
    function position() {
      if (!S) return lastPos;
      return clamp(S.from + Math.max(0, now() - S.t0), 0, DUR);
    }
    // Output latency: context time scheduled now minus context time audible now. getOutputTimestamp()
    // where it works (Chrome, Firefox; lpwm.js uses the same mapping), else outputLatency + baseLatency.
    // Smoothed (currentTime moves in render-callback steps) and capped at 0.5 s.
    var latSm = null, latAt = -1;
    function latency() {
      if (typeof opts.latency === 'number' && isFinite(opts.latency)) return Math.max(0, opts.latency);
      if (offline) return 0;
      var raw = null;
      try {
        if (typeof ctx.getOutputTimestamp === 'function' && typeof performance !== 'undefined') {
          var ts = ctx.getOutputTimestamp();
          if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
            var v = ctx.currentTime - (ts.contextTime + (performance.now() - ts.performanceTime) / 1000);
            if (v >= 0 && v < 1) raw = v;
          }
        }
      } catch (e) { raw = null; }
      if (raw == null) raw = Math.max(0, num(ctx.outputLatency, 0)) + Math.max(0, num(ctx.baseLatency, 0));
      var pn = typeof performance !== 'undefined' ? performance.now() : 0;
      if (latSm == null || Math.abs(raw - latSm) > 0.12 || pn - latAt > 2000) latSm = raw;
      else latSm += (raw - latSm) * 0.05;
      latAt = pn;
      return clamp(latSm, 0, 0.5);
    }
    // Film position the listener HEARS now: drive the picture with this, so it is never ahead of the sound.
    function heardPosition() {
      if (!S) return lastPos;
      return clamp(S.from + Math.max(0, now() - latency() - S.t0), 0, DUR);
    }
    function timeAt(sec) { return S ? S.t0 + (num(sec, 0) - S.from) : NaN; }

    function stop(fade) {
      var s = S;
      if (!s) return;
      lastPos = position();
      S = null;
      stopTimer();
      var n0 = now(), f = Math.max(0.01, num(fade, 0.3));
      fadeOuts(s, n0, f);
      // voices already handed to the engine (≤ LOOK ahead) are faded too, sends included
      if (typeof A.stopAll === 'function') {
        for (var k in s.gr.g) { try { A.stopAll(s.gr.g[k], f); } catch (e) {} }
      }
      teardown(s, f);
    }

    function play(fromSec) {
      var from = clamp(num(fromSec, 0), 0, DUR);
      if (S && Math.abs(position() - from) < 0.08 && now() < S.tEnd) return; // idempotent
      if (S) stop(0.04);
      var n0 = now(), t0 = n0 + (offline ? 0.01 : 0.03);
      var s = { from: from, t0: t0, i: 0, gr: graph(), tEnd: t0 + (DUR - from) + TAIL, dead: false };
      // fade the session in (a little longer mid-track, so re-entered layers never click)
      s.gr.outs.forEach(function (x) {
        var og = x.gain;
        og.setValueAtTime(0, n0);
        og.setValueAtTime(0, t0);
        og.linearRampToValueAtTime(OUT, t0 + (from > 0.05 ? 0.04 : 0.006));
      });
      // automation lanes from `from` on (every copy of a lane's filter gets the same curve)
      Object.keys(LANES).forEach(function (name) {
        var lane = LANES[name];
        s.gr.lanes[name].forEach(function (p) {
          p.cancelScheduledValues(0);
          p.setValueAtTime(laneAt(lane, from), n0);
          for (var i = 0; i < lane.length; i++) {
            var bp = lane[i];
            if (bp[0] <= from) continue;
            var at = t0 + (bp[0] - from);
            if (bp[2] === 'set') p.setValueAtTime(bp[1], at);
            else if (bp[2] === 'exp') p.exponentialRampToValueAtTime(bp[1], at);
            else p.linearRampToValueAtTime(bp[1], at);
          }
        });
      });
      // first event at or after `from` (binary search)
      var lo = 0, hi = EVENTS.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (EVENTS[mid].t < from - 1e-4) lo = mid + 1; else hi = mid; }
      s.i = lo;
      S = s;
      // re-enter what should already be sounding
      if (from > 0) {
        for (var j = 0; j < SUSTAINED.length; j++) {
          var e = SUSTAINED[j];
          if (e.t >= from - 1e-4) break;
          var el = from - e.t, rem = e.s - el;
          if (rem < 0.1) continue;
          var ov = resumeOpts(e, el, rem);
          if (ov) fire(s, e, t0, ov);
        }
        var sec = SECTIONS[0];
        for (var q = 0; q < SECTIONS.length; q++) if (from >= T(SECTIONS[q].bar) - 1e-4) sec = SECTIONS[q];
        emit({ type: 'section', name: sec.name, bar: sec.bar, resumed: true }, t0, from);
      }
      pump();
      startTimer();
    }

    return {
      play: play,
      stop: stop,
      position: position,
      heardPosition: heardPosition,
      latency: latency,
      timeAt: timeAt,
      typing: setTyping,
      get playing() { return !!S && now() < S.tEnd; },
      onCue: function (fn) {
        if (typeof fn !== 'function') return function () {};
        cues.push(fn);
        return function () { var i = cues.indexOf(fn); if (i >= 0) cues.splice(i, 1); };
      },
      pump: pump,                      // offline renders drive the scheduler themselves
      get events() { return EVENTS.length; }
    };
  }

  Site.BuildScore = {
    bpm: BPM,
    bars: BARS,
    duration: DUR,
    stepDur: SD,
    barDur: BAR,
    tail: TAIL,
    outDb: OUT_DB,
    trim: assign({}, TRIM),
    sections: SECTIONS.map(function (s) { return { name: s.name, bar: s.bar, bars: s.bars }; }),
    // the compiled arrangement (copies), for checks: [{ t, i (instrument), r (role), g (group), m, s, gain }]
    events: function () {
      if (!EVENTS) compile();
      return EVENTS.filter(function (e) { return e.k === 'play'; })
        .map(function (e) { return { t: e.t, i: e.i, r: e.r, g: e.g, m: e.m, s: e.s, gain: e.o.gain }; });
    },
    create: create
  };
})();
