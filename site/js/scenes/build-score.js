/* ==========================================================================
   site/js/scenes/build-score.js — the soundtrack of scene 5: "Bits & Atoms"
   --------------------------------------------------------------------------
   Round 4. 44 bars at 118 BPM (89.49 s) over the film of "Here's to the builders", D major pentatonic.
   The theme stays (the chords, the rolling bass, the muted keys hook, the arc of the film); the drum kit
   is gone. Its place is taken by micro-foley percussion from Site.audio's "Bits & Atoms" family:
     bits    mechanical keyboard switches (play.key: press / space / backspace / enter), compile ticks,
             UI pings, terminal chimes
     atoms   relays, metallic snap-fits, micro-servo whirs, robot-arm glides, pneumatic puffs and hisses,
             and a server-fan whir underneath (Site.audio.fan, a continuous bed)
   Keystrokes become the hats and the snare (a space bar clack on 2 and 4, over a relay and a puff of air),
   relays and snap-fits are the rims and the percussion, servo whirs and arm glides are the risers, and the
   kick is a deep space-bar "thock" on a clean kick body. Registers (round 3): sustained tonal material ≤ A4 (bass
   G1–D3, pads / keys / grains / arm glides ≤ A4), one-shots ≤ A5 (the pings and chimes), ticks ≤ A6; no flute, no
   sustained high tone. While a line types on screen (score.typing), the typing is the percussion: the key hats step
   aside and the rims, snaps and ticks play ~5–6 dB softer (TYPED), so every typed key stays on top.

   Arc (bars; the section boundaries are the film's, so the picture stays in sync):
     1–4    Intro         near silence: one keystroke, one servo, the joint latches (the film's bench types
                          its command, the score answers with the latch); then a sub "thunk" as Enter commits,
                          the pad and the fan come up, and the machine spins up into bar 5
     5–8    Build I       the keystrokes find the grid: thock on 1 and 3, key hats on the offbeats, relay rims,
                          compile ticks; UI pings on each slammed word; four servo steps turn the axis (bar 8)
     9–16   Build II–III  bass and the ping arp (dotted 8ths: 3 against 4); snap-fits on a 3-3-2, the space-bar
                          snare; the fan spins up under the turbines (11–12); bar 16 the hex dump (relay chatter)
     17–20  Riser         keys stabs; then two bars of servo whirs climbing per beat → per 8th, an arm glide,
                          and a key roll accelerating 8ths → 16ths → 32nds into …
     21–27  Drop          the full micro-foley groove, rolling bass, the keys hook
     28     Silence       the machines power down (a servo spin-down); only the typing and a pad tail
     29–32  Half-time     "high bar for quality"
     33–36  Breakdown     "and they yearn to build": arm glides breathing, the keys motif; riser into …
     37–40  Final drop    + a 3-against-4 line of Enter keys, the ping arp, wider keys and pad
     41–42  Assembly engine  the Enter line accelerates (a geometric accelerando: dotted 8ths → 32nds, landing
                          exactly on the bar-43 downbeat, so the picture's bar lines never move) while the
                          groove tightens to 32nd hats over an A pedal; build.js's twelve-part engine rides the
                          line (BuildScore.accel): a ram fires on one keystroke and a part seats on the next,
                          then a part seats on every keystroke (a space-bar clack under each shell)
     43–44  Resolve       "system active / compile success" on the bar-43 downbeat: the engine stops, a rising
                          chime (A4·D5 → F#5 → A5) over a D(add9) pad that blossoms, a plagal G/D sigh, D6/9 home;
                          a soft low chime as the frame settles (bar 44 beat 4), then the fan spins down and the
                          last grains thin out on the chill bed's pitches while build.js brings that bed in
                          (1.2 s after the settle): the crossfade

   Handoff (build.js): Site.BuildScore.resolves = true, so build.js leaves the "system active" chime to the score
   (it still plays its relay + compile ticks on the same downbeat). Times: activeAt (bar 43), settleAt (bar 44
   beat 4 = build.js SETTLE_AT), handoffAt (settleAt + 1.2 s, when build.js's startBed() enters). Cues fire
   for each: onCue(c) gets { type: 'active' | 'settle' | 'handoff', t, time }. The score rings out until
   duration + tail; build.js fades whatever is left from settle + 4.5 s over 3 s.

   Interface (used by build.js):
     Site.BuildScore = { bpm, bars, duration, tail, sections: [{ name, bar, bars }], resolves, activeAt,
                         settleAt, handoffAt, accel: [film s], create(audio, dest, opts), events() }
     create(audio, dest, opts?) → {
       play(fromSec), stop(fadeSec = 0.3), playing, onCue(fn), pump(),
       position()       film seconds at the audio clock (ctx.currentTime). Use it (or timeAt) to
                        SCHEDULE sounds: when = timeAt(filmSec) = audio.now() + (filmSec − position()).
       heardPosition()  film seconds the listener hears right now = position() − output latency
                        (getOutputTimestamp, else outputLatency + baseLatency): drives the PICTURE.
       latency()        that output latency (s); timeAt(filmSec) → context time of a film second
       typing(times)    film seconds of on-screen keystrokes and machine events: the score's key hats
                        (and its cursor ticks) step aside around them and its rims / snaps / ticks play
                        softer, so the typing owns those 16ths
     }
     opts: { parts: { group: gain }, typing: [sec], latency: sec (override, for tests),
             filter(e) → bool and onFire(e, when) (test hooks: solo / log events by e.r role),
             typed: { role: gain } (test hook: override how far a role yields inside typing windows) }
   `audio` is Site.audio (realtime) or a raw engine from Site.audio.createEngine(ctx) (offline check,
   see site/build-score-check.html; offline, the page drives pump() itself).
   The arrangement is compiled once into a sorted event list (film seconds); play(from) maps film time onto
   the audio clock (T = t0 + t − from) and a 25 ms lookahead scheduler hands events to the engine ~160 ms
   ahead. Sustained layers (pad, bass, keys, risers, servo / arm glides, the fan) that started before `from`
   are re-entered at their current phase, and filter automation is evaluated at `from`, so a restart mid-bar
   sounds as if it had been playing all along. No drift: every event time comes from its step index.
   Mix: each group (drums, low, micro, bed, keys, fx) is a chain — trim → filter lane → sidechain duck —
   and every voice's reverb / delay send goes through a copy of its group's chain (Voice { sendTo }).
   The fan is a continuous source on the bed chain (no send), started / steered / stopped by bed events.
   ========================================================================== */
(function () {
  'use strict';

  var Site = (window.Site = window.Site || {});

  /* ------------------------------------------------------------ timing */
  var BPM = 118, SD = 60 / BPM / 4, BAR = 16 * SD, BARS = 44, DUR = BARS * BAR;
  var TAIL = 4.8;           // the last chord, the fan spin-down and the last grains ring on after bar 44
  var LOOK = 0.16;          // scheduler horizon (s)
  var TICK_MS = 25;         // scheduler period (ms)
  function T(bar, step) { return ((bar - 1) * 16 + (step || 0)) * SD; }
  var ACTIVE_AT = T(43);            // "system active": the engine's last part is placed, the chime
  var SETTLE_AT = T(44, 12);        // build.js SETTLE_AT = lb(44, 4): the frame dissolves into the poem
  var HANDOFF_AT = SETTLE_AT + 1.2; // build.js starts its settled (chill) bed 1.2 s after the settle
  // group trims (mix) and the score's output level
  var TRIM = { drums: 1, low: 1.15, micro: 1.5, bed: 1.8, keys: 2.7, fx: 0.85 };
  var GROUPS = ['drums', 'low', 'micro', 'bed', 'keys', 'fx'];
  var OUT_DB = -0.4, OUT = Math.pow(10, OUT_DB / 20);
  // Inside a typing window (score.typing: the film's on-screen keystrokes and machine events) the typing is the
  // percussion: the key hats and the cursor taps step aside (0), and the rest of the micro-percussion, which sits
  // in the same 1–5 kHz band on the same 16ths, plays ~5–6 dB softer, so every typed key is heard. Between lines
  // it fills back in: the film and the score answer each other.
  var TYPED = { hat: 0, cursor: 0, rim: 0.5, snap: 0.5, tock: 0.55, ohat: 0.6, poly: 0.5 };

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
    { name: 'Final drop', bar: 37, bars: 4 },
    { name: 'Assembly engine', bar: 41, bars: 2 },
    { name: 'Resolve', bar: 43, bars: 2 }
  ];

  /* ------------------------------------------------------------ harmony (film timeline) */
  // pad: sustained voicing · t: chord tones for keys / arps / pings / tuned ticks (all ≤ A4 = 69)
  var CH = {
    Dadd9: { r: 38, pad: [50, 57, 64, 66], t: [50, 57, 62, 64, 66, 69] },
    D69:   { r: 38, pad: [50, 57, 59, 64, 66], t: [50, 57, 59, 62, 64, 66] },  // the last chord: D6/9, home
    D:     { r: 38, pad: [50, 57, 62, 66], t: [50, 54, 57, 62, 66, 69] },
    GD:    { r: 38, pad: [50, 55, 59, 62, 64], t: [50, 55, 59, 62, 64, 67] }, // G(add9)/D: the plagal sigh over the pedal
    Bm7:   { r: 35, pad: [47, 54, 57, 62], t: [47, 54, 57, 62, 66, 69] },
    Bm:    { r: 35, pad: [47, 54, 59, 62], t: [47, 54, 59, 62, 66, 69] },
    G:     { r: 31, pad: [43, 50, 59, 62, 64], t: [43, 50, 55, 59, 62, 64] },
    Gmaj7: { r: 31, pad: [43, 50, 54, 59], t: [43, 50, 54, 59, 62, 66] },
    Asus4: { r: 33, pad: [45, 52, 57, 62], t: [45, 52, 57, 62, 64, 69] },
    A:     { r: 33, pad: [45, 52, 59, 62], t: [45, 52, 57, 59, 64, 69] },   // A(sus2, add4): open, pentatonic
    Amaj:  { r: 33, pad: [45, 52, 57, 61, 64], t: [45, 52, 57, 61, 64, 69] } // the C#: bar 36 beat 3 and bar 42 beat 3
  };
  var PROG = ('Dadd9 Dadd9 Bm7 Asus4  D Bm G A  D Bm G A  D Bm G A  G A Bm A  D Bm G A  D Bm G A  ' +
    'G A D D  Bm G Gmaj7 Asus4  D Bm G A  D Asus4 Dadd9 D69').split(/\s+/);
  function chordAt(bar, step) {
    if ((bar === 36 || bar === 42) && step >= 8) return CH.Amaj;   // the dominant resolves, twice
    if (bar === 43 && step >= 8) return CH.GD;
    return CH[PROG[bar - 1]];
  }

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
    rush:    'x...x...x...x6x7'
  };
  // the snare: a space-bar clack over a relay and a puff of air; velocities ≤ 0.4 are ghost taps
  var SNARE = {
    bb:      '....x.......x...',
    bbG:     '....x......3x..3',
    bbFill:  '....x.......x.78',
    half:    '........x.......',
    halfG:   '........x.....3.',
    light:   '....6.......6...'
  };
  // key hats (bright key presses); velocities ≤ 0.4 are ghosts (kept with probability `ghost`)
  var HAT = {
    off8:    '..x...x...x...x.',
    drive:   '.3x3.3x3.3x3.3x3',
    sixteen: '45x545x545x545x5',
    rise:    '3434565667788999',
    lone:    '..........x.....',
    three:   '..x...x...x.....'
  };
  // snap-fits: the tresillo (3-3-2) of the assembly line, and a sparse half-time figure
  var SNAP = {
    tres:  '7..5..7.6..5..7.',
    tres2: '7..5..7.6..5.57.',
    halfS: '.......6..5.....'
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
  // the engine's ostinato (bar 42): 16th pulses on the dominant, octave-hopping in the second half
  BASS.engine = [];
  for (var bi = 0; bi < 16; bi++) BASS.engine.push([bi, bi >= 8 && bi % 2 ? 12 : 0, 0.8, 0.58 + 0.028 * bi]);
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
  var ARP_ORDER = [1, 3, 2, 4, 3, 5]; // dotted-8th ping arp over chord tones (3 against the 4 of the beat)

  /* ------------------------------------------------------------ arrangement (data) */
  // Rows [firstBar, lastBar, spec] are applied in order; a later row adds to / overrides earlier ones.
  // kick / snare / hat / snap: [pattern, gain(, ghost prob)] · rim / tock: [k (euclid pulses of 16), rotation, gain]
  // bass / sub / keys: [pattern, gain] · arp, ohat, cursor, poly: gain · pad: [gain, cutoff] · grain: [per s, gain]
  // duck: depth · wide: 1 (keys and pad open out)
  var ARR = [
    [2, 2, { pad: [0.28, 700] }],
    [3, 4, { pad: [0.3, 750], sub: ['bar', 0.26], grain: [2, 0.36] }],
    [4, 4, { sub: ['bar2', 0.3], tock: [3, 2, 0.8] }],

    [5, 8, { kick: ['half', 0.9], duck: 0.25, sub: ['off', 0.46], hat: ['off8', 0.8], rim: [3, 2, 0.7], tock: [3, 2, 0.9], pad: [0.26, 950], grain: [3, 0.36] }],
    [6, 8, { snare: ['light', 0.6], rim: [4, 1, 0.75], tock: [4, 2, 0.95] }],
    [7, 8, { hat: ['drive', 0.85, 0.2], tock: [5, 1, 1] }],

    [9, 16, { kick: ['broken', 1], duck: 0.28, bass: ['build', 0.85], hat: ['drive', 0.9, 0.28], rim: [3, 5, 0.85], tock: [4, 1, 0.9], arp: 0.3, pad: [0.25, 1050], grain: [4, 0.36] }],
    [11, 12, { kick: ['lift', 0.9] }],
    [13, 16, { snare: ['bb', 0.72], rim: [5, 3, 0.9], hat: ['drive', 0.95, 0.38], tock: [7, 1, 0.95], snap: ['tres', 0.55], bass: ['build', 0.92], grain: [5, 0.38] }],
    [15, 15, { ohat: 0.6 }],
    [16, 16, { kick: ['stutter', 0.9], hat: ['rise', 0.9], bass: ['stutter', 0.78], snare: ['half', 0.66], arp: 0, tock: [5, 2, 0.9], snap: null }],

    [17, 20, { kick: ['broken2', 1.02], duck: 0.28, snare: ['bb', 0.8], hat: ['drive', 0.9, 0.4], rim: [5, 3, 0.9], tock: [5, 1, 0.9], snap: ['tres', 0.6], bass: ['build', 1.08], keys: ['stab', 0.36], pad: [0.34, 1200], grain: [5, 0.38] }],
    [19, 20, { kick: ['four', 0.85], snare: null, bass: ['rise', 0.82], keys: null, hat: ['rise', 0.75], rim: null, snap: null, tock: [3, 1, 0.8] }],
    [19, 19, { keys: ['cluster', 0.3] }],
    [20, 20, { kick: ['fourGap', 0.85], bass: ['hold', 0.85], tock: null }],

    [21, 27, { kick: ['four', 1.24], duck: 0.32, snare: ['bbG', 0.95], hat: ['drive', 0.95, 0.5], ohat: 0.7, rim: [5, 3, 0.95], tock: [7, 1, 1.05], snap: ['tres', 0.68], bass: ['roll', 1.6], keys: ['hook', 0.4], pad: [0.4, 1300], grain: [5, 0.38] }],
    [24, 24, { snare: ['bbFill', 0.95] }],
    [27, 27, { snap: ['tres2', 0.7] }],
    [28, 28, { pad: [0.3, 800], grain: [2, 0.3], sub: ['bar', 0.3] }],

    [29, 32, { kick: ['halfT', 1.05], duck: 0.28, snare: ['halfG', 0.95], hat: ['off8', 0.85], rim: [3, 6, 0.8], tock: [5, 2, 0.95], snap: ['halfS', 0.6], bass: ['half', 0.86], keys: ['stab', 0.3], pad: [0.3, 1200], grain: [4, 0.38] }],
    [31, 31, { tock: [3, 2, 0.8] }],
    [32, 32, { kick: ['half', 0.8], keys: null, hat: ['three', 0.9], snap: null }],

    [33, 34, { kick: ['one', 0.6], duck: 0.2, bass: ['hold', 0.4], tock: [3, 2, 0.8], keys: ['motif', 0.36], pad: [0.34, 1000], grain: [4, 0.36] }],
    [35, 35, { pad: [0.4, 900], keys: ['chord', 0.32], cursor: 0.5, sub: ['bar', 0.3], grain: [3, 0.36] }],
    [36, 36, { kick: ['four', 0.72], duck: 0.2, hat: ['rise', 0.75], bass: ['rise', 0.56], pad: [0.3, 1100], grain: [4, 0.38] }],

    [37, 40, { kick: ['four', 1.26], duck: 0.33, snare: ['bbG', 0.98], hat: ['drive', 1, 0.6], ohat: 0.75, rim: [5, 3, 1], tock: [7, 1, 1.05], snap: ['tres', 0.72], poly: 0.42,
      bass: ['roll2', 1.65], keys: ['answer', 0.42], pad: [0.44, 1300], grain: [5, 0.38], arp: 0.2, wide: 1 }],
    [40, 40, { snare: ['bbFill', 0.98] }],
    [41, 41, { kick: ['four', 1.28], duck: 0.34, snare: ['bbG', 1], hat: ['sixteen', 0.95, 1], ohat: 0.8, rim: [7, 1, 1], tock: [7, 1, 1.05], snap: ['tres2', 0.78], poly: 0,
      bass: ['roll2', 1.68], keys: ['answer', 0.42], pad: [0.46, 1400], grain: null, arp: 0.2, wide: 1 }],
    // the engine bar: the groove goes to rolls over the dominant (patterns in the one-off section below)
    [42, 42, { kick: ['rush', 1.28], duck: 0.3, bass: ['engine', 1.45], keys: ['stab', 0.34], pad: [0.5, 1500], arp: 0, wide: 1 }]
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
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  // The accelerando of bars 41–42: onsets whose gaps shrink geometrically from a dotted 8th (3 16ths) so that
  // the next onset after the last one lands exactly on the bar-43 downbeat. Returns film seconds.
  function accelTimes(t0, t1, first, n) {
    var span = (t1 - t0) / SD, lo = 0.5, hi = 1;
    for (var it = 0; it < 60; it++) { // bisection on the ratio r: first·(1 − rⁿ)/(1 − r) = span
      var r = (lo + hi) / 2, sum = first * (1 - Math.pow(r, n)) / (1 - r);
      if (sum > span) hi = r; else lo = r;
    }
    var q = (lo + hi) / 2, out = [], t = t0, g = first;
    for (var k = 0; k < n; k++) { out.push(t); t += g * SD; g *= q; }
    return out;
  }
  // The Enter line's accelerando (it picks up the 3-against-4 line's phase: bar 41 step 2). Exported as
  // BuildScore.accel: build.js times the assembly engine on its bar-42 onsets, so every part the gantry places
  // (and every ram it fires) lands on one of these keystrokes.
  var ACCEL = accelTimes(T(41, 2), ACTIVE_AT, 3, 22);

  /* ------------------------------------------------------------ compile → events */
  // event: { t (film s), k: 'play' | 'duck' | 'cue' | 'bed', i (instrument), m (midi | [midis]), o (options),
  //          g (group), s (sustain s), r (role: 'kick' | 'thock' | 'snare' | 'hat' | 'rim' | 'snap' | 'tock' | 'poly' |
  //          'accel' | 'roll' | 'engine' | 'ping' | 'arp' | 'servo' | 'arm' | 'chime' | …; the typing filter and the
  //          check page's solo tests use it) }
  var EVENTS = null, SUSTAINED = null, LANES = null, FAN = null;

  function compile() {
    var ev = [], r = rng(20260924);
    function add(bar, step, i, m, o, g, s, role) { ev.push({ t: T(bar, step), k: 'play', i: i, m: m, o: o || {}, g: g, s: s || 0, r: role || i }); }
    function duck(bar, step, a) { ev.push({ t: T(bar, step), k: 'duck', a: a, d: SD * 2.4 }); }
    function cue(t, c) { ev.push({ t: t, k: 'cue', c: c }); }
    function pick(a) { return a[Math.floor(r() * a.length) % a.length]; }
    function pan(w) { return (r() * 2 - 1) * w; }

    /* ---- the kit: every piece is a few engine voices, layered */
    // kick: the clean kick body (no click) under a deep space-bar thock, the tactile attack
    function kick(bar, step, g) {
      add(bar, step, 'kick', null, { gain: 0.72 * g, click: 0, decay: 0.17 }, 'drums', 0, 'kick');
      add(bar, step, 'key', null, { kind: 'space', tone: 0.04, vel: clamp(0.62 + 0.3 * g, 0, 1), up: 0, room: 0.1, gain: 0.52 * g, pan: pan(0.05) }, 'drums', 0, 'thock');
    }
    // a thock alone (the intro / breakdown heartbeat): no kick body, a little sub under it
    function thock(bar, step, g, root) {
      add(bar, step, 'key', null, { kind: 'space', tone: 0.02, vel: 0.9, up: 0.12, room: 0.14, gain: 0.7 * g, pan: pan(0.05) }, 'drums', 0, 'thock');
      if (root) add(bar, step, 'sub', root, { gain: 0.3 * g, dur: 0.22 }, 'low', 0, 'sub');
    }
    // snare: the space-bar clack (bits), a relay 2–4 ms behind it (atoms) and a puff of air for the tail
    function snare(bar, step, g, ghost) {
      var gh = !!ghost;
      add(bar, step, 'key', null, { kind: 'space', tone: gh ? 0.7 : 0.55, vel: gh ? 0.5 : 0.95, up: gh ? 0 : 0.3, hold: 0.07 + 0.03 * r(), room: 0.2, gain: 0.95 * g, pan: pan(0.08) }, 'drums', 0, 'snare');
      if (gh) return;
      add(bar, step + 0.02 + 0.012 * r(), 'relay', null, { size: 0.28, gain: 0.9 * g, pan: 0.1 + pan(0.05), room: 0.16 }, 'drums', 0, 'snare');
      add(bar, step, 'pneumatic', null, { kind: 'puff', dur: 0.055, pressure: 0.3, gain: 0.55 * g, room: 0.12, pan: pan(0.1) }, 'drums', 0, 'snare');
    }
    // key hat: a bright key press (the "clack"), its upstroke a faint ghost after it
    function hat(bar, step, v, g, role) {
      add(bar, step, 'key', null, { kind: 'press', tone: 0.82 + 0.12 * r(), vel: v, up: 0.08 + 0.1 * v, hold: SD * (0.42 + 0.14 * r()), room: 0.08, gain: 0.98 * g, pan: pan(0.35) }, 'drums', 0, role || 'hat');
    }
    function ohat(bar, step, g) { add(bar, step, 'pneumatic', null, { kind: 'puff', dur: 0.1 + 0.03 * r(), pressure: 0.48, gain: 1.33 * g, room: 0.14, pan: 0.25 + pan(0.1) }, 'drums', 0, 'ohat'); }
    function relay(bar, step, g, size, role, kind) {
      add(bar, step, 'relay', null, { kind: kind || (r() < 0.3 ? 'off' : 'on'), size: num(size, 0.15 + 0.35 * r()), gain: 0.9 * g, pan: pan(0.7) }, 'drums', 0, role || 'rim');
    }
    function snap(bar, step, g, size, role, p) {
      add(bar, step, 'snap', null, { size: num(size, 0.2 + 0.3 * r()), metal: 0.55 + 0.2 * r(), double: r() < 0.6, gain: 1.35 * g, pan: num(p, pan(0.6)) }, 'drums', 0, role || 'snap');
    }
    function tick(bar, step, midi, g, role) { add(bar, step, 'compile', null, { midi: midi, count: 1, gain: g, pan: pan(0.7) }, 'micro', 0, role || 'tock'); }
    function run(bar, step, count, g, prog, gap) { add(bar, step, 'compile', null, { count: count, gap: gap || 0.028, progress: num(prog, 0.1), gain: g, pan: pan(0.3) }, 'micro', 0, 'run'); }
    function ping(bar, step, midi, g, o, role) { add(bar, step, 'ping', midi, assign({ gain: g, dur: 0.18, pan: pan(0.3), delay: 0.14, reverb: 0.05 }, o || {}), 'keys', 0, role || 'ping'); }
    function servo(bar, step, dur, from, to, g, o) { add(bar, step, 'servo', null, assign({ dur: dur, from: from, to: to, load: 0.25, settle: 0.3, gain: 1.45 * g, pan: pan(0.4) }, o || {}), 'fx', dur, 'servo'); }
    function arm(bar, step, dur, from, to, g, o) { add(bar, step, 'arm', null, assign({ dur: dur, from: from, to: to, gain: 1.4 * g, pan: pan(0.3) }, o || {}), 'fx', dur, 'arm'); }
    function backRoll(bar, step, n, every, g0, g1) { // a held backspace: auto-repeat, 32nds
      for (var k = 0; k < n; k++) add(bar, step + k * every, 'key', null, { kind: 'backspace', tone: 0.45, vel: g0 + (g1 - g0) * (n > 1 ? k / (n - 1) : 1), up: 0, room: 0.1, gain: 0.8, pan: 0.25 }, 'drums', 0, 'roll');
    }

    // per-bar specs
    var spec = [];
    for (var b = 1; b <= BARS; b++) spec[b] = {};
    ARR.forEach(function (row) { for (var b2 = row[0]; b2 <= row[1]; b2++) assign(spec[b2], row[2]); });

    var lastPad = null;
    for (var bar = 1; bar <= BARS; bar++) {
      var S = spec[bar], i;

      // --- kick (+ sidechain duck on the bed and keys)
      if (S.kick) {
        var kp = KICK[S.kick[0]];
        for (i = 0; i < 16; i++) {
          var kv = vel(kp[i]);
          if (!kv) continue;
          if (bar >= 33 && bar <= 34) thock(bar, i, 0.9, chordAt(bar, i).r); // the breakdown's heartbeat: a thock, no kick body
          else kick(bar, i, S.kick[1] * kv);
          if (S.duck && kv > 0.5) duck(bar, i, S.duck * kv);
        }
      }
      // --- the space-bar snare
      if (S.snare) {
        var sp = SNARE[S.snare[0]];
        for (i = 0; i < 16; i++) { var sv = vel(sp[i]); if (sv) snare(bar, i, S.snare[1] * sv, sv <= 0.4); }
      }
      // --- key hats (ghosts are probabilistic); the typing owns them inside its windows (TYPED)
      if (S.hat) {
        var hp = HAT[S.hat[0]], gp = num(S.hat[2], 1);
        for (i = 0; i < 16; i++) {
          var hv = vel(hp[i]);
          if (!hv) continue;
          if (hv <= 0.4 && S.hat[0] !== 'rise' && r() > gp) continue;
          hat(bar, i, 0.28 + 0.55 * hv, S.hat[1] * (0.55 + 0.45 * hv));
        }
      }
      // --- open "hat": a pneumatic puff on the last offbeat of every other bar
      if (S.ohat && bar % 2 === 0) ohat(bar, 14, S.ohat);
      // --- relay rims (euclidean, never on the beat)
      if (S.rim) {
        var rp = euclid(S.rim[0], 16, S.rim[1]);
        for (i = 0; i < 16; i++) if (rp[i] && i % 4) relay(bar, i, S.rim[2] * (0.75 + 0.25 * r()));
      }
      // --- snap-fits on the 3-3-2
      if (S.snap) {
        var np = SNAP[S.snap[0]];
        for (i = 0; i < 16; i++) { var nv = vel(np[i]); if (nv) snap(bar, i, S.snap[1] * nv); }
      }
      // --- tuned compile ticks: chord tones an octave up (A4–A5, ≤ 880 Hz)
      if (S.tock) {
        var tp = euclid(S.tock[0], 16, S.tock[1]);
        for (i = 0; i < 16; i++) {
          if (!tp[i]) continue;
          var ct = chordAt(bar, i).t;
          tick(bar, i, ct[2 + Math.floor(r() * 4)] + 12, S.tock[2] * (0.7 + 0.3 * r()));
        }
      }
      // --- the cursor: a soft key tap on each beat (under the typing, which owns it while a line types)
      if (S.cursor) for (i = 0; i < 16; i += 4) add(bar, i, 'key', null, { kind: 'press', tone: 0.15, vel: 0.4, up: 0, room: 0.12, gain: S.cursor * (i ? 0.8 : 1), pan: 0 }, 'drums', 0, 'cursor');
      // --- 3 against 4: Enter keys on every third 16th, counted from bar 37 (a phase that walks across the bar)
      if (S.poly) {
        for (i = 0; i < 16; i++) {
          if (((bar - 37) * 16 + i) % 3) continue;
          add(bar, i, 'key', null, { kind: 'enter', tone: 0.45, vel: 0.55 + 0.25 * (i % 4 === 2 ? 1 : 0), up: 0.15, hold: SD * 1.1, room: 0.14, gain: S.poly, pan: -0.3 + pan(0.1) }, 'drums', 0, 'poly');
        }
      }

      // --- bass (clean sine + a hint of 2nd harmonic + the small-speaker body) / sub pulses
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

      // --- keys (warm, muted; the delay does the dub-techno space): the theme
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
      // --- dotted-8th ping arp (UI pings on the chord tones: 3 against 4)
      if (S.arp) {
        for (var ai = 0; ai * 3 < 16; ai++) {
          var as = ai * 3;
          ping(bar, as, chordAt(bar, as).t[ARP_ORDER[(ai + bar) % ARP_ORDER.length]], S.arp * (as === 0 ? 1 : 0.8),
            { dur: 0.16, pan: ((ai % 3) - 1) * (S.wide ? 0.55 : 0.35), delay: 0.14, reverb: 0.04 }, 'arp');
        }
      }

      // --- pad: one per chord, re-voiced at each bar (sine/triangle through a breathing lowpass)
      if (S.pad && bar < 43) {
        var padBars = 1, key = PROG[bar - 1];
        if (bar === 36 || bar === 42) {
          add(bar, 0, 'pad', CH.Asus4.pad, { gain: S.pad[0], dur: 8 * SD - 0.05, attack: 0.3, release: 0.5, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08, width: S.wide ? 1.45 : 1 }, 'bed', 8 * SD);
          add(bar, 8, 'pad', CH.Amaj.pad, { gain: S.pad[0] * (bar === 42 ? 1.12 : 1), dur: 8 * SD - 0.05, attack: bar === 42 ? 0.5 : 0.15, release: 0.6, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08, width: S.wide ? 1.45 : 1 }, 'bed', 8 * SD);
        } else if (!(lastPad && lastPad.key === key && lastPad.until > bar)) {
          while (bar + padBars <= 42 && PROG[bar + padBars - 1] === key && padBars < 2 && spec[bar + padBars].pad) padBars++;
          var pd = padBars * BAR - 0.06, first = bar === 2;
          add(bar, 0, 'pad', CH[key].pad, { gain: S.pad[0], dur: pd, attack: first ? 3.0 : 0.35, release: 0.8, cutoff: S.pad[1], grains: 0, highpass: 90, reverb: 0.08, width: S.wide ? 1.45 : 1 }, 'bed', pd);
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
            add(bar, i + r() * 0.9, 'grain', pick(tones), { gain: S.grain[1] * (0.55 + 0.45 * r()), dur: 0.08 + r() * 0.12, bright: 0.06 + 0.06 * r(), pan: pan(0.75), reverb: 0.1, delay: r() < 0.25 ? 0.12 : 0 }, 'bed');
          }
        }
      }
    }

    /* ---- one-off events: the bench, risers, impacts, fills, the engine, the resolution */
    function noiseRiser(bar, step, bars, gain, lo, hi) {
      var d = bars * BAR - step * SD;
      add(bar, step, 'noise', null, { dur: 0.02, attack: d, release: 0.08, filter: 'bandpass', freq: lo || 260, freqTo: hi || 2400, q: 1.3, type: 'pink', gain: gain, reverb: 0.1 }, 'fx', d, 'riser-noise');
    }
    // a mechanical impact: a heavy latch slams, the valve dumps its air, a low boom under it
    function impact(bar, g) {
      add(bar, 0, 'impact', null, { gain: g * 0.55, decay: 1.1, reverb: 0.08 }, 'fx', 0, 'impact');
      add(bar, 0, 'pneumatic', null, { kind: 'release', dur: 0.45, pressure: 0.55, gain: g * 0.8, room: 0.2, pan: -0.15 }, 'fx', 0, 'air');
      add(bar, 0.03, 'snap', null, { size: 1, metal: 0.8, double: true, gain: g * 0.95, pan: 0.2 }, 'drums', 0, 'latch');
    }
    // a key roll that accelerates: [fromStep, toStep, every] segments (or a list of steps), velocities ramping
    // v0 → v1, alternating the space bar (bits) and a relay (atoms); spaceOnly: space bars only (where the
    // relays come from elsewhere)
    function keyRoll(bar, segs, v0, v1, g, spaceOnly) {
      var all = [];
      segs.forEach(function (sg) { if (typeof sg === 'number') all.push(sg); else for (var s = sg[0]; s < sg[1] - 1e-6; s += sg[2]) all.push(s); });
      all.forEach(function (s, k) {
        var x = all.length > 1 ? k / (all.length - 1) : 1, v = v0 + (v1 - v0) * x;
        if (k % 2 === 0 || spaceOnly) add(bar, s, 'key', null, { kind: 'space', tone: 0.5 + 0.3 * x, vel: v, up: 0, room: 0.14, gain: g * (0.7 + 0.3 * x), pan: -0.2 + pan(0.1) }, 'drums', 0, 'roll');
        else add(bar, s, 'relay', null, { size: 0.45 - 0.35 * x, gain: g * (0.8 + 0.4 * x), pan: 0.2 + pan(0.1) }, 'drums', 0, 'roll');
      });
    }
    var LOWBITS = [74, 76, 78, 81];

    // Intro. Bar 1: near silence; the bench (build.js) types one key, wakes the arm's joint (a servo, steps 6–8),
    // and the joint LATCHES: one dry snap-fit, the score's first sound. Bar 2: Enter commits the command (a sub
    // "thunk"), the pad and the fan come up. Bar 3: the unit powers on (a soft thock); 'builders' inks (a low keys
    // dyad). Bar 4: the machine spins up: a servo whir climbing and relays accelerating quarter → 8th → 16th.
    snap(1, 8, 0.6, 0.35, 'latch', 0.35);
    add(2, 0, 'sub', 38, { gain: 0.34, dur: 0.6 }, 'low', 0, 'sub');
    thock(3, 0, 0.55, null);
    add(3, 8, 'keys', 62, { gain: 0.4, dur: 6 * SD, vel: 0.5, pan: -0.2, delay: 0.24, reverb: 0.08 }, 'keys', 6 * SD);
    add(3, 8.04, 'keys', 69, { gain: 0.3, dur: 6 * SD, vel: 0.45, pan: 0.2, delay: 0.24, reverb: 0.08, click: false }, 'keys', 6 * SD);
    servo(4, 8, 8 * SD, 50, 62, 0.3, { load: 0.2, settle: 0, pan: 0.25 });
    noiseRiser(4, 0, 1, 0.14, 240, 1600);
    [[8, 0.5, 0.6], [12, 0.55, 0.45], [14, 0.6, 0.3], [15, 0.68, 0.2]].forEach(function (x) { relay(4, x[0], x[1], x[2], 'rim', 'on'); });
    backRoll(4, 15, 2, 0.5, 0.45, 0.6);

    // Build I: a UI ping on each slammed word; four servo steps as the projection axis turns (bar 8), a compile
    // run, a backspace auto-repeat into bar 9
    [[5, 0, 74], [5, 8, 78], [6, 0, 71]].forEach(function (p) { ping(p[0], p[1], p[2], 0.34, { pan: 0 }); });
    [[55, 57], [57, 59], [59, 62], [62, 64]].forEach(function (m, k) { servo(8, k * 4, 0.12, m[0], m[1], 0.3, { load: 0.15, settle: 0, pan: (k - 1.5) * 0.3 }); });
    run(8, 12, 6, 0.8, 0.1);
    backRoll(8, 14, 4, 0.5, 0.4, 0.6);

    // Build II: the turbines rise (bars 11–12): a long arm glide under the fan's spin-up; a ratchet into bar 13
    arm(11, 0, 3.9, 43, 55, 0.3, { pan: 0 });
    backRoll(12, 14, 4, 0.5, 0.45, 0.7);
    run(12, 15, 5, 0.8, 0.3);

    // Build III: 'laws of physics' (a mechanical impact); bar 16, the hex dump: relay chatter in 32nds
    impact(13, 0.4);
    add(16, 8, 'noise', null, { dur: 0.02, attack: 8 * SD, release: 0.06, filter: 'bandpass', freq: 300, freqTo: 1600, q: 1.2, type: 'pink', gain: 0.12 }, 'fx', 8 * SD, 'riser-noise');
    for (var hx = 0; hx < 8; hx++) relay(16, 12 + hx * 0.5, 0.45 + 0.05 * hx, 0.5 - 0.05 * hx, 'roll', hx % 3 ? 'on' : 'off');

    // Riser: the dense frame snaps to sparse (bar 19) → the lit cells (pings) → two bars that spin the machine up:
    // servo whirs per beat, then per 8th, climbing; an arm glide; a key roll 8ths → 16ths → 32nds; air pressure
    ping(19, 4, 78, 0.3); ping(19, 8, 74, 0.28); ping(19, 12, 71, 0.28);
    for (var sv = 0; sv < 4; sv++) servo(19, sv * 4, 0.16, 50 + sv * 2, 55 + sv * 2, 0.26 + 0.03 * sv, { load: 0.3, settle: 0 });
    for (sv = 0; sv < 7; sv++) servo(20, sv * 2, 0.11, 57 + sv, 62 + sv, 0.34 + 0.02 * sv, { load: 0.35, settle: 0 });
    arm(19, 0, 4.0, 45, 62, 0.3, { pan: 0 });
    noiseRiser(19, 0, 2, 0.22, 220, 2400);
    keyRoll(19, [[0, 16, 2]], 0.35, 0.55, 0.5);
    keyRoll(20, [[0, 8, 1], [8, 14, 0.5]], 0.55, 0.95, 0.62);
    add(20, 0, 'pneumatic', null, { kind: 'hiss', dur: 1.3, attack: 1.2, pressure: 0.35, gain: 0.3, pan: 0 }, 'fx', 0, 'air');

    // Drop: impact on the downbeat, pings (bar 22), fills at the ends of phrases, a servo riser across bar 26,
    // 'no limits' (bar 27): an impact and a compile burst, then the silence of bar 28
    impact(21, 0.72);
    ping(22, 7, 76, 0.3, { pan: -0.3 }); ping(22, 7.5, 81, 0.26, { pan: 0.3 });
    backRoll(24, 14, 4, 0.5, 0.5, 0.75);
    run(24, 15, 5, 0.8, 0.35);
    servo(26, 0, BAR, 50, 64, 0.3, { load: 0.25, settle: 0.6 });
    noiseRiser(26, 0, 1, 0.14, 280, 2200);
    impact(27, 0.5);
    run(27, 0, 10, 0.9, 0.2, 0.024);
    for (hx = 0; hx < 4; hx++) relay(27, 15 + hx * 0.25, 0.5, 0.3 - 0.06 * hx, 'roll', 'on');

    // Silence (bar 28, "they often move in silence"): the machines power down — a servo spinning down — then a
    // lone relay letting go and one compile tick; the typing carries the bar
    servo(28, 0, 0.7, 64, 47, 0.3, { load: 0.1, settle: 0, pan: 0.2 });
    relay(28, 10, 0.55, 0.3, 'rim', 'off');
    tick(28, 12, 81, 0.9, 'tock');

    // Half-time: 'excellence' (bar 32 beat 1) → a soft D(add9) keys chord with echoes; a backspace roll, a run
    CH.Dadd9.t.slice(1, 5).forEach(function (m, k) { add(32, k * 0.05, 'keys', m, { gain: 0.3, dur: 8 * SD, vel: 0.5, pan: (k - 1.5) * 0.3, delay: 0.26, reverb: 0.08, click: k === 0 }, 'keys', 8 * SD); });
    backRoll(32, 12, 4, 0.5, 0.4, 0.62);
    run(32, 14, 6, 0.8, 0.3);

    // Breakdown: arm glides breathing (bars 33, 35); bar 36 spins back up: servo riser, key roll, the C#
    arm(33, 0, 3.6, 45, 52, 0.26, { pan: -0.2 });
    arm(35, 0, 3.6, 47, 54, 0.22, { pan: 0.2 });
    servo(36, 0, BAR, 50, 64, 0.3, { load: 0.25, settle: 0 });
    noiseRiser(36, 0, 1, 0.16, 240, 2200);
    keyRoll(36, [[0, 8, 2], [8, 12, 1], [12, 16, 0.5]], 0.3, 0.7, 0.5);
    [61, 64].forEach(function (m, k) { add(36, 8 + k * 0.05, 'keys', m, { gain: 0.34, dur: 6 * SD, vel: 0.5, pan: (k - 0.5) * 0.4, delay: 0.2, reverb: 0.06, click: k === 0 }, 'keys', 6 * SD); });

    // Final drop: impact on 37, a ping (bar 38), a riser across bar 40
    impact(37, 0.76);
    ping(38, 7, 78, 0.3, { pan: 0.3 });
    servo(40, 0, BAR, 52, 64, 0.28, { load: 0.3, settle: 0 });
    noiseRiser(40, 0, 1, 0.15, 280, 2400);
    backRoll(40, 14, 4, 0.5, 0.5, 0.8);

    // The assembly engine (bars 41–42). The Enter line (3 against 4 since bar 37) accelerates — gaps shrinking
    // geometrically from a dotted 8th to a 32nd — so its next onset would land exactly on the bar-43 downbeat;
    // from bar 42 relays (atoms) join it. Bar 42: the key hats go to 32nds, the bass to 16th pulses on the dominant,
    // a servo and an arm climb the whole bar, the air pressure builds. build.js times its assembly engine on the
    // Enter line (BuildScore.accel): in bar 42 the gantry fires its ram on one keystroke and seats a part on the
    // next, then (from step 10) seats a part on every keystroke, so the picture accelerates with the sound; then
    // "system active" on the downbeat the line was aiming at.
    impact(41, 0.8);
    var AC = ACCEL;
    AC.forEach(function (t, k) {
      var x = k / (AC.length - 1), st = t / SD - 40 * 16;
      add(41, st, 'key', null, { kind: 'enter', tone: 0.4 + 0.35 * x, vel: 0.55 + 0.4 * x, up: 0, room: 0.14, gain: 0.5 + 0.25 * x, pan: -0.35 + 0.7 * x }, 'drums', 0, 'accel');
      if (t >= T(42, 8)) add(41, st + 0.03, 'relay', null, { size: 0.4 - 0.3 * x, gain: 0.35 + 0.45 * x, pan: 0.3 - 0.6 * x }, 'drums', 0, 'accel');
    });
    // bar 42: the space-bar snare on beats 2 and 3 (with the kick); from step 10, where build.js seats a part on
    // every onset of the Enter line, a space-bar clack on every other one: the shells, the heavier latch as each
    // unit comes online (the Enter line's relays and the film's are the atoms). The key hats are role 'engine': the
    // machine events of build.js fill the whole bar, so the typing filter must not take them.
    snare(42, 4, 0.95); snare(42, 8, 0.6);
    keyRoll(42, AC.filter(function (t) { return t >= T(42, 10) - 1e-6; }).filter(function (t, k) { return k % 2 === 0; })
      .map(function (t) { return t / SD - 41 * 16; }), 0.62, 1, 0.9, true);
    for (var e8 = 0; e8 < 16; e8++) {
      hat(42, e8, e8 % 4 === 2 ? 0.8 : e8 % 2 ? 0.42 : 0.55, 0.75 + 0.02 * e8, 'engine');
      if (e8 >= 12) hat(42, e8 + 0.5, 0.5, 0.8, 'engine');
    }
    servo(42, 0, BAR - 0.08, 45, 64, 0.34, { load: 0.4, settle: 0, pan: 0 });
    arm(42, 0, BAR - 0.05, 45, 64, 0.3, { pan: 0.2 });
    noiseRiser(42, 0, 1, 0.2, 300, 2800);
    add(42, 4, 'pneumatic', null, { kind: 'hiss', dur: 1.3, attack: 1.2, pressure: 0.45, gain: 0.3, pan: 0 }, 'fx', 0, 'air');
    run(42, 12, 8, 0.85, 0.4, 0.03);

    // Resolve. Bar 43 downbeat, "system active / compile success": the engine stops. A low thunk (sub + thock),
    // the valve exhales, a servo spins down, and the chime rises A4·D5 → F#5 → A5 over a D(add9) pad that
    // blossoms (bed lowpass opens). Beat 3: the plagal sigh (G/D). Bar 44: D6/9, home; the keys chord.
    // Bar 44 beat 4 (the settle): a soft low chime; the frame's dissolve spray; the fan spins down; the last
    // grains thin out on the chill bed's own pitches (D3 F#3 G3 A3 D4) while build.js brings the bed in.
    add(43, 0, 'sub', 38, { gain: 0.46, dur: 2.2 }, 'low', 2.0);
    add(43, 0, 'kick', null, { gain: 0.7, click: 0, decay: 0.34 }, 'drums', 0, 'kick');
    thock(43, 0, 0.75, null);
    add(43, 0, 'pneumatic', null, { kind: 'hiss', dur: 0.9, attack: 0.01, pressure: 0.4, gain: 0.3, pan: -0.1 }, 'fx', 0, 'air');
    servo(43, 0.25, 0.7, 64, 47, 0.24, { load: 0.1, settle: 0, pan: 0.3 });
    add(43, 0, 'pad', CH.Dadd9.pad.concat([69]), { gain: 0.46, dur: 8 * SD - 0.05, attack: 0.18, release: 0.9, cutoff: 1500, grains: 0, highpass: 80, reverb: 0.12, width: 1.4 }, 'bed', 8 * SD);
    add(43, 8, 'pad', CH.GD.pad, { gain: 0.4, dur: 8 * SD - 0.05, attack: 0.35, release: 0.9, cutoff: 1300, grains: 0, highpass: 80, reverb: 0.12, width: 1.3 }, 'bed', 8 * SD);
    add(43, 0, 'chime', 69, { dur: 1.1, vel: 0.68, bright: 0.4, gain: 0.43, pan: -0.2, reverb: 0.1, delay: 0.1 }, 'keys', 0, 'chime');
    add(43, 0.02, 'chime', 74, { dur: 1.1, vel: 0.74, bright: 0.45, gain: 0.46, pan: 0.05, reverb: 0.1, delay: 0.1 }, 'keys', 0, 'chime');
    add(43, 1, 'chime', 78, { dur: 1.0, vel: 0.7, bright: 0.4, gain: 0.41, pan: 0.25, reverb: 0.1, delay: 0.1 }, 'keys', 0, 'chime');
    add(43, 2, 'chime', 81, { dur: 1.2, vel: 0.74, bright: 0.3, gain: 0.39, pan: 0.1, reverb: 0.12, delay: 0.12 }, 'keys', 0, 'chime');
    [55, 59, 62].forEach(function (m, k) { add(43, 8 + k * 0.05, 'keys', m, { gain: 0.26, dur: 7 * SD, vel: 0.45, pan: (k - 1) * 0.3, delay: 0.22, reverb: 0.1, click: k === 0 }, 'keys', 7 * SD); });
    add(44, 0, 'pad', CH.D69.pad, { gain: 0.46, dur: 2.4, attack: 0.25, release: 2.6, cutoff: 1000, grains: 0, highpass: 70, reverb: 0.12, width: 1.3 }, 'bed', 2.4);
    add(44, 0, 'sub', 38, { gain: 0.42, dur: 2.6 }, 'low', 2.2);
    [50, 57, 64, 66].forEach(function (m, k) { add(44, k * 0.06, 'keys', m, { gain: 0.28, dur: 2.2, vel: 0.42, pan: (k - 1.5) * 0.3, delay: 0.2, reverb: 0.1, click: k === 0 }, 'keys', 2.2); });
    add(44, 12, 'chime', 62, { dur: 1.2, vel: 0.5, bright: 0.15, gain: 0.36, pan: -0.15, reverb: 0.14, delay: 0.1 }, 'keys', 0, 'chime');
    add(44, 12.1, 'chime', 69, { dur: 1.2, vel: 0.45, bright: 0.15, gain: 0.28, pan: 0.2, reverb: 0.14, delay: 0.1 }, 'keys', 0, 'chime');
    [69, 66, 62, 57, 50].forEach(function (m, k) { add(44, 12 + k * 0.28, 'grain', m, { gain: 0.32, dur: 0.12, bright: 0.05, pan: (k % 2 ? 1 : -1) * 0.4, reverb: 0.12 }, 'bed', 0, 'dissolve'); });
    var BEDP = [50, 54, 55, 57, 62];
    for (var gk = 0; gk < 24; gk++) {
      var gt = gk * 0.21 + r() * 0.12;
      ev.push({ t: T(44, 0) + 0.1 + gt, k: 'play', i: 'grain', m: pick(BEDP), o: { gain: 0.4 * Math.pow(1 - gk / 26, 1.3), dur: 0.14 + r() * 0.1, bright: 0.05, pan: pan(0.7), reverb: 0.12 }, g: 'bed', s: 0, r: 'final-grain' });
    }

    /* ---- the server fan: a continuous bed (Site.audio.fan) steered by keyframes [film s, speed, gain] */
    FAN = {
      on: T(2), off: SETTLE_AT, release: 2.6,
      keys: [[T(2), 0.12, 0.35], [T(5), 0.3, 0.55], [T(9), 0.4, 0.65], [T(11), 0.42, 0.65], [T(13), 0.78, 1.05], [T(14), 0.5, 0.75],
        [T(17), 0.5, 0.75], [T(21) - 0.05, 0.85, 1.2], [T(21), 0.5, 0.75], [T(28), 0.5, 0.75], [T(28) + 0.45, 0.15, 0.45],
        [T(29), 0.42, 0.7], [T(33), 0.3, 0.6], [T(36), 0.3, 0.6], [T(37), 0.78, 1.1], [T(37) + 0.05, 0.52, 0.8],
        [T(41), 0.75, 1.1], [ACTIVE_AT, 1, 1.4], [SETTLE_AT, 0.12, 0.35]]
    };
    ev.push({ t: FAN.on, k: 'bed', op: 'on', r: 'fan', g: 'bed' });
    for (var fk = 0; fk + 1 < FAN.keys.length; fk++) {
      var a0 = FAN.keys[fk], a1 = FAN.keys[fk + 1];
      if (a0[1] === a1[1] && a0[2] === a1[2]) continue;
      ev.push({ t: a0[0], k: 'bed', op: 'set', p: { speed: a1[1], gain: a1[2] }, ramp: Math.max(0.05, a1[0] - a0[0]), r: 'fan', g: 'bed' });
    }
    ev.push({ t: FAN.off, k: 'bed', op: 'off', rel: FAN.release, r: 'fan', g: 'bed' });

    // cues (sections + hits + the handoff) for anything that wants to sync to the music
    SECTIONS.forEach(function (s) { cue(T(s.bar), { type: 'section', name: s.name, bar: s.bar }); });
    [13, 21, 27, 37, 41].forEach(function (b) { cue(T(b), { type: 'impact', name: 'impact', bar: b }); });
    cue(ACTIVE_AT, { type: 'active', name: 'system active', bar: 43 });
    cue(T(44), { type: 'final', name: 'final chord', bar: 44 });
    cue(SETTLE_AT, { type: 'settle', name: 'settle', bar: 44 });
    cue(HANDOFF_AT, { type: 'handoff', name: 'chill bed', bar: 44 });

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
        [T(41), 2400, 'set'], [ACTIVE_AT - 0.01, 3400, 'exp'], [ACTIVE_AT, 2800, 'set'], [T(44), 1800, 'exp'],
        [SETTLE_AT, 1300, 'exp'], [DUR + TAIL, 450, 'exp']]
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
  // the fan's [speed, gain] at film second x (linear between keyframes), and the next keyframe after x
  function fanAt(x) {
    var K = FAN.keys;
    if (x <= K[0][0]) return { speed: K[0][1], gain: K[0][2], next: K[1] };
    for (var i = 0; i + 1 < K.length; i++) {
      if (x < K[i + 1][0]) {
        var u = (x - K[i][0]) / Math.max(1e-9, K[i + 1][0] - K[i][0]);
        return { speed: K[i][1] + (K[i + 1][1] - K[i][1]) * u, gain: K[i][2] + (K[i + 1][2] - K[i][2]) * u, next: K[i + 1] };
      }
    }
    var L = K[K.length - 1];
    return { speed: L[1], gain: L[2], next: null };
  }

  // Overrides that re-enter a sustained event `el` seconds into it, with `rem` seconds left.
  function resumeOpts(e, el, rem) {
    var o = e.o, u = clamp(el / Math.max(1e-6, e.s), 0, 1);
    switch (e.i) {
      case 'pad': return { dur: rem, attack: Math.min(num(o.attack, 0.5), 0.3) };
      case 'keys': return rem > 0.18 ? { dur: rem, click: false, vel: num(o.vel, 0.6) * 0.8 } : null;
      case 'bass': return rem > 0.1 ? { dur: rem } : null;
      case 'sub': return rem > 0.15 ? { dur: rem } : null;
      // glides continue from the pitch they had reached (the servo's glide is linear in pitch, the arm's an S-curve)
      case 'servo': return rem > 0.15 ? { dur: rem, from: o.from + (o.to - o.from) * u, settle: 0 } : null;
      case 'arm': return rem > 0.3 ? { dur: rem, from: o.from + (o.to - o.from) * sstep(u) } : null;
      case 'noise': {
        var atk = num(o.attack, 0.01), d = num(o.dur, 0), rel = num(o.release, 0.2), tot = atk + d + rel;
        // a swell resumes from the level its linear attack had reached
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
    var typed = assign(assign({}, TYPED), opts.typed || {});               // test hook: how far each role yields to the typing
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

    // The fan bed: one continuous source per session, on the bed chain (dry only; its own reverb is off). Its set()
    // glides the output gain from the current value and cancels anything scheduled later, its fade-in included, so a
    // set() is held back until the fade-in is done (s.fanReady) and then glides to the keyframe target by its time.
    function fanStart(s, when, p, attack) {
      if (s.fan || typeof eng.fan !== 'function') return;
      if (filter && !filter({ r: 'fan', i: 'fan', g: 'bed' })) return;
      try { s.fan = eng.fan({ speed: p.speed, gain: p.gain, attack: attack, when: when, dest: s.gr.g.bed, reverb: 0 }) || null; } catch (err) { s.fan = null; }
      s.fanReady = when + attack + 0.02; s.fanNext = null;
      if (onFire && s.fan) { try { onFire({ r: 'fan', i: 'fan', g: 'bed', k: 'bed', t: p.t }, when); } catch (err) {} }
    }
    function fanStop(s, rel) { if (s.fan) { try { s.fan.stop(rel); } catch (err) {} s.fan = null; s.fanNext = null; } }
    function fanSet(s, p, by) { // glide to p, arriving at context time `by`; deferred while the fan fades in
      if (!s.fan) return;
      if (now() < s.fanReady) { s.fanNext = { p: p, by: by }; return; }
      s.fanNext = null;
      try { s.fan.set(p, Math.max(0.05, by - now())); } catch (err) {}
    }
    function fireBed(s, e, when) {
      if (e.op === 'on') fanStart(s, when, { speed: FAN.keys[0][1], gain: FAN.keys[0][2], t: e.t }, 2.5);
      else if (e.op === 'set') fanSet(s, e.p, when + e.ramp);
      else if (e.op === 'off') fanStop(s, e.rel);
    }

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
      if (e.k === 'bed') { fireBed(s, e, when); return; }
      if (filter && !filter(e)) return;
      var yield_ = typed[e.r] != null && typingWin && inTyping(e.t) ? typed[e.r] : 1; // the on-screen typing owns this 16th
      if (!yield_) return;
      var f = A.play[e.i];
      if (typeof f !== 'function') return;
      var o = assign({}, e.o);
      if (over) assign(o, over);
      if (yield_ < 1) o.gain = num(o.gain, 1) * yield_;
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
      if (s.fanNext && n0 >= s.fanReady) fanSet(s, s.fanNext.p, s.fanNext.by);
      while (s.i < EVENTS.length) {
        var e = EVENTS[s.i], at = s.t0 + (e.t - s.from);
        if (at >= horizon) break;
        s.i++;
        if (at < n0 - 0.04 && e.k !== 'bed') continue;  // missed (throttled timer): skip rather than burst (beds always apply)
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
      fanStop(s, 0.6);
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
    // where it works (Chrome, Firefox), else outputLatency + baseLatency. Smoothed (currentTime moves in
    // render-callback steps) and capped at 0.5 s.
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
      fanStop(s, f);
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
      var s = { from: from, t0: t0, i: 0, gr: graph(), tEnd: t0 + (DUR - from) + TAIL, dead: false, fan: null };
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
        // the fan, at its current speed, then on toward its next keyframe
        if (from > FAN.on + 1e-4 && from < FAN.off - 1e-4) {
          var fa = fanAt(from);
          fanStart(s, t0, { speed: fa.speed, gain: fa.gain, t: from }, 0.4);
          if (fa.next) fanSet(s, { speed: fa.next[1], gain: fa.next[2] }, t0 + (fa.next[0] - from));
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
    title: 'Bits & Atoms',
    bpm: BPM,
    bars: BARS,
    duration: DUR,
    stepDur: SD,
    barDur: BAR,
    tail: TAIL,
    outDb: OUT_DB,
    trim: assign({}, TRIM),
    sections: SECTIONS.map(function (s) { return { name: s.name, bar: s.bar, bars: s.bars }; }),
    // the resolution is the score's: build.js leaves its "system active" chime to it (see scoreResolves())
    resolves: true,
    activeAt: ACTIVE_AT,     // bar 43 downbeat: "system active / compile success" (cue { type: 'active' })
    settleAt: SETTLE_AT,     // bar 44 beat 4 = build.js SETTLE_AT (cue { type: 'settle' })
    handoffAt: HANDOFF_AT,   // when build.js's chill bed comes in (settle + 1.2 s; cue { type: 'handoff' })
    // the Enter line's accelerando (film seconds, bar 41 step 2 → the last 32nd before bar 43): build.js times the
    // assembly engine's rams and snap-fits on its bar-42 onsets
    accel: ACCEL.slice(),
    // the compiled arrangement (copies), for checks: [{ t, i (instrument), r (role), g (group), m, s, gain }]
    events: function () {
      if (!EVENTS) compile();
      return EVENTS.filter(function (e) { return e.k === 'play'; })
        .map(function (e) { return { t: e.t, i: e.i, r: e.r, g: e.g, m: e.m, s: e.s, gain: e.o.gain }; });
    },
    // the fan bed's keyframes [film s, speed, gain] and its on / off times, for checks
    fan: function () { if (!EVENTS) compile(); return { on: FAN.on, off: FAN.off, keys: FAN.keys.map(function (k) { return k.slice(); }) }; },
    create: create
  };
})();
