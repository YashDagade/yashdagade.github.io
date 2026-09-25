/* Robot — scene [4] (#robot · yashdagade.com/robot): Yash's biped, from its CAD.
 *
 * A three.js technical drawing (flat white faces with a soft key light, 1 px silhouette + crease lines computed on the
 * GPU, the part in focus in deep blue) under an SVG layer of dimension lines, leaders and joint axes. Seven steps:
 *   Assembled (turntable) · Every part (explode, rebuild) · Brain & power ·
 *   Joints (the kinematic chain, one joint at a time) · Dimensions (front + side, to scale) · Walk · In hand (the photo, with the model at its scale).
 * three.js (UMD r149, jsDelivr) and the model (site/robot/biped.json + biped.bin, via site/robot/biped-loader.js) load
 * only when this scene is first created; until then the front blueprint from biped-2d.json is drawn.
 *
 * Render mode (stills for other pages): index.html?render=robot-<view> with view = front | side | back | 34 | 34r |
 * exploded | walk | top (&labels=1 adds leader labels to "exploded", &pad=0.06 sets the margin). It draws one frame
 * on white with no chrome and sets window.__robotReady = true. Exports live in site/img/robot/renders/, all shot
 * headless at a 600 × 750 CSS px viewport, DPR 2 (→ 1200 × 1500 PNG; ≤ 800 px wide, so labels are the one-line
 * phone style), once __robotReady is set:
 *   robot-front.png          ?render=robot-front
 *   robot-three-quarter.png  ?render=robot-34
 *   robot-exploded.png       ?render=robot-exploded&pad=0.04&labels=1
 *
 * Facts: biped.json → dims (CAD, rectified), the biped repo README (HiWonder LX-16A serial bus servos driven from
 * Python), the LX-16A datasheet, and the Notion build log (goals). No number here is invented.
 */
(function () {
  'use strict';

  const RM = /[?&]render=robot-([a-z0-9-]+)/i.exec(location.search);
  const RENDER = RM ? RM[1].toLowerCase() : null;
  const RQ = new URLSearchParams(location.search);
  // Render mode needs this scene to be the one core opens: point the hash at it before boot (no DOM access).
  if (RENDER && location.hash.replace(/^#\/?/, '').toLowerCase() !== 'robot') {
    try { history.replaceState(null, '', location.pathname + location.search + '#robot'); } catch (e) { /* ignore */ }
  }

  const THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
  const BASE = 'site/robot/';
  const IMG = 'site/img/robot/';
  const NOTION = 'https://yashdagade.notion.site/Biped-Progress-32c594257a308057b712d59506adc5bc';
  const NB = ' ';
  const D2R = Math.PI / 180;
  const TOP = 446.2;          // dims.overall.height
  const TORSO = { x0: -99.57, x1: 60.43, y0: -82.49, y1: 82.51, z0: 345.92, z1: 425.92 };

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const eio = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const ein = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);
  const wrap180 = a => ((((a + 180) % 360) + 360) % 360) - 180;
  const kf = (k, dt) => 1 - Math.exp(-k * dt);
  const fmt = (v, d) => (v < -0.05 ? '−' : v > 0.05 ? '+' : '±') + Math.abs(v).toFixed(d == null ? 1 : d);

  /* --------------------------------------------------------------------------------------------- the story */
  const STEPS = [
    {
      id: 'assembled', label: 'Assembled', dur: 14,
      head: `My biped robot.`,
      sub: `I built it to play with modern robot policies: JEPA-based world models, VLAs, WAMs and others. It is a custom-embodiment biped with eight degrees of freedom. Drag to turn it; hover any part for its size.`,
      subT: `I built it to play with modern robot policies: JEPA-based world models, VLAs, WAMs and others. It is a custom-embodiment biped with eight degrees of freedom. Drag to turn it; tap any part for its size.`,
      ms: `Built to play with modern robot policies: JEPA-based world models, VLAs, WAMs. A custom 8-DOF biped.`,
      cap: 'Biped robot · the CAD assembly\nDrag to turn · hover a part',
      capT: 'Biped robot · the CAD assembly\nDrag to turn · tap a part',
    },
    {
      id: 'parts', label: 'Every part', dur: 17,
      head: `30 parts, and the ten printed ones come from just five designs.`,
      sub: `Hover any part for its name and size.`,
      ms: `Tap any part for its name and size.`,
      cap: 'Exploded along each part’s axis,\nthen rebuilt',
    },
    {
      id: 'brain', label: 'Brain & power', dur: 13,
      head: `I built this biped to run modern policies, including JEPA-based ones, on top of it.`,
      sub: `A Raspberry${NB}Pi with Wi-Fi and Bluetooth drives the eight servos over one serial bus. It can run inference locally and talk to a larger model over the network for global inference.`,
      ms: `A Raspberry${NB}Pi with Wi-Fi and Bluetooth: local inference on board, a larger model over the network.`,
      cap: 'Electronics lifted off the deck.\nThe torso box is open at the front',
    },
    {
      id: 'joints', label: 'Joints', dur: 17,
      head: `Each leg has four joints: hip yaw, hip pitch, knee and ankle.`,
      sub: `Eight servos, eight degrees of freedom. The three pitch axes are parallel, 127${NB}mm apart; the ankle axis sits 46.4${NB}mm above the sole. Each LX-16A turns 0–240°, up to 17${NB}kg·cm at 6${NB}V.`,
      ms: `Eight servos. Pitch axes 127${NB}mm apart; ankle axis 46.4${NB}mm above the sole. Each turns 0–240°.`,
      cap: 'Per leg: torso → hip yaw → hip pitch →\nknee → ankle → foot',
    },
    {
      id: 'dims', label: 'Dimensions', dur: 14,
      head: `Front and side, to scale: 446.2${NB}mm tall, 165${NB}mm wide, 160${NB}mm deep.`,
      sub: `The hip-pitch axis is 300.4${NB}mm above the floor; thigh and shin are 127${NB}mm axis to axis. Each foot is 77${NB}×${NB}55${NB}mm, about 38${NB}cm² of sole.`,
      ms: `Hip-pitch axis 300.4${NB}mm up; thigh and shin 127${NB}mm; feet 77${NB}×${NB}55${NB}mm.`,
      cap: 'Orthographic projections in mm,\nfrom the CAD (rest pose)',
    },
    {
      id: 'walk', label: 'Walk', dur: 14,
      head: `One rule keeps the foot flat: the ankle cancels the hip and the knee.`,
      sub: `$\\theta_{\\text{ankle}} = -(\\theta_{\\text{hip}} + \\theta_{\\text{knee}})$. This gait is scripted; next come a MuJoCo digital twin, reinforcement learning and sim-to-real.`,
      ms: `$\\theta_{\\text{ankle}} = -(\\theta_{\\text{hip}} + \\theta_{\\text{knee}})$. Scripted for now; next: MuJoCo, RL, sim-to-real.`,
      cap: 'A scripted walk in place: the floor\nmoves with the stance foot',
    },
    {
      id: 'hand', label: 'In hand', dur: 16,
      head: `The goal: my sparse JEPA world model learning online on this robot.`,
      sub: `The CAD model beside the real robot, at the same scale. Next comes a MuJoCo digital twin, then learning on the hardware itself.`,
      ms: `The CAD model beside the real robot, at the same scale.`,
      cap: 'Dashed guides carry the model’s\nground and top across to the photo',
    },
  ];
  // while paused the step clock still runs up to here, so a step opened while paused shows its drawn-on state
  // (the same times the reduced-motion path jumps to); autoplay and continuous motion stay stopped
  const SETTLE = { assembled: 3, parts: 5, brain: 5, joints: 5.1, dims: 9, walk: 0, hand: 5 };
  const SI = {};
  STEPS.forEach((s, i) => { SI[s.id] = i; });

  // the one photo on the page ("In hand"), 1120 × 1400 (4:5)
  const PHOTO = { id: 'robot-held-inspecting', w: 1120, h: 1400, title: 'Checking it over', alt: 'Yash Dagade looking down at his bipedal robot, holding it by the feet with one hand on the battery box' };

  const JN = { hip_yaw: 'hip yaw', hip_pitch: 'hip pitch', knee: 'knee', ankle: 'ankle' };
  const JOINTS = ['hip_yaw_R', 'hip_pitch_R', 'knee_R', 'ankle_R', 'hip_yaw_L', 'hip_pitch_L', 'knee_L', 'ankle_L'];

  // hover label for a part: [name, size line]
  function partInfo(p) {
    const side = p.side === 'R' ? ' · right' : p.side === 'L' ? ' · left' : '';
    const id = p.id;
    if (id === 'torso_frame') return ['Torso frame', `165 × 160 × 80${NB}mm · printed`];
    if (id === 'deck') return ['Deck', `3.5${NB}mm printed plate`];
    if (id === 'pi') return ['Raspberry Pi', `85 × 56${NB}mm board`];
    if (id === 'battery') return ['Battery pack', `109.5 × 63 × 24.1${NB}mm`];
    if (id === 'buck') return ['Step-down converter', `61 × 27 × 23.5${NB}mm`];
    if (id === 'busboard') return ['Servo bus board', `40 × 25 × 13${NB}mm`];
    const j = /^(servo|horn)_(hip_yaw|hip_pitch|knee|ankle)_/.exec(id);
    if (j) {
      const n = JN[j[2]];
      const N = n[0].toUpperCase() + n.slice(1);
      return j[1] === 'servo' ? [`${N} servo${side}`, `LX-16A · 45.2 × 24.7 × 35.5${NB}mm · 52${NB}g`]
        : [`${N} horn${side}`, `servo output horn · Ø19.5${NB}mm`];
    }
    if (/^yoke_/.test(id)) return [`Hip yoke${side}`, `56.5 × 56.5 × 42.5${NB}mm · printed`];
    if (/^thigh_/.test(id)) return [`Thigh${side}`, `Ø59.1 × 121.4${NB}mm · printed`];
    if (/^shin_/.test(id)) return [`Shin${side}`, `Ø59.1 × 121.4${NB}mm · printed`];
    if (/^foot_/.test(id)) return [`Foot${side}`, `77 × 55 × 57.1${NB}mm · 38${NB}cm² of sole`];
    return [p.name, ''];
  }

  // palette: the drawing is white PLA and black servos; electronics become greys (no CAD colours on this page)
  function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function matColor(id, hex) {
    if (id === 'pla') return [0.99, 0.99, 0.985];
    if (id === 'servo') return [0.15, 0.15, 0.16];
    if (id === 'plug') return [0.92, 0.92, 0.91];
    if (id === 'pin' || id === 'screw') return [0.55, 0.55, 0.57];
    if (id === 'horn') return [0.82, 0.83, 0.85];
    if (id === 'horn_insert') return [0.7, 0.7, 0.7];
    const c = hexRgb(hex), l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], g = 0.2 + 0.74 * l;
    return [g, g, g];
  }
  function creaseDeg(role) { return role === 'pla' ? 36 : role === 'servo' ? 48 : 52; }

  /* --------------------------------------------------------------------------------------------- shaders */
  const FACE_VS = `
    attribute vec3 aCol;
    varying vec3 vCol;
    varying vec3 vN;
    void main() {
      vCol = aCol;
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const FACE_FS = `
    uniform vec3 uAcc;
    uniform float uTint;
    uniform float uFade;
    uniform vec3 uL;
    varying vec3 vCol;
    varying vec3 vN;
    void main() {
      vec3 n = normalize(vN);
      if (!gl_FrontFacing) n = -n;
      float d = max(dot(n, uL), 0.0);
      float lum = dot(vCol, vec3(0.299, 0.587, 0.114));
      float sh = mix(0.83, 1.0, d) * mix(0.955, 1.0, 0.5 + 0.5 * n.y);
      vec3 c = vCol * sh + (1.0 - lum) * 0.13 * d;
      vec3 accL = mix(uAcc, vec3(1.0), 0.8) * mix(0.9, 1.0, d);
      vec3 accD = uAcc * mix(0.78, 1.12, d);
      c = mix(c, mix(accD, accL, smoothstep(0.3, 0.8, lum)), uTint);
      c = mix(c, vec3(1.0), uFade);
      gl_FragColor = vec4(c, 1.0);
    }`;
  // Crease + silhouette lines on the GPU: every mesh edge carries its two face normals; an edge that is not a crease
  // is drawn only where one face looks at the (orthographic) camera and the other looks away.
  const LINE_VS = `
    attribute vec3 nA;
    attribute vec3 nB;
    attribute float feat;
    uniform vec2 uRes;
    uniform vec2 uPx;
    void main() {
      vec3 a = normalMatrix * nA;
      vec3 b = normalMatrix * nB;
      if (feat < 0.5 && a.z * b.z > 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      p.xy += uPx * 2.0 / uRes * p.w;
      gl_Position = p;
    }`;
  const LINE_FS = `
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }`;
  // floor for the walk: cross-ties that scroll with the stance foot and fade out at both ends
  const FLOOR_VS = `
    uniform float uScroll;
    uniform vec2 uRes;
    uniform vec2 uPx;
    varying float vF;
    void main() {
      vec3 q = position;
      q.x = mod(q.x + uScroll + 420.0, 840.0) - 420.0;
      vF = smoothstep(210.0, 380.0, abs(q.x + 20.0));
      vec4 p = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
      p.xy += uPx * 2.0 / uRes * p.w;
      gl_Position = p;
    }`;
  const FLOOR_FS = `
    uniform vec3 uColor;
    uniform float uOp;
    varying float vF;
    void main() { gl_FragColor = vec4(mix(uColor, vec3(1.0), max(vF, 1.0 - uOp)), 1.0); }`;

  const CSS = `
    .scene--robot { cursor: grab; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .scene--robot.is-dragging { cursor: grabbing; }
    .scene--robot .rb-stage { position: absolute; inset: 0; overflow: hidden; }
    .scene--robot .rb-gl { position: absolute; left: 0; top: 0; display: block; opacity: 0; transition: opacity .8s ease; touch-action: none; }
    .scene--robot .rb-gl.is-on { opacity: 1; }
    .scene--robot .rb-ov { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    /* labels: flat mono text, no stroke halos; where a label can sit on the drawing it gets an opaque white plate */
    .scene--robot .rb-ov text { font-family: var(--mono); font-size: 12px; font-weight: 400; letter-spacing: .02em; fill: #000;
      stroke: none; font-variant-numeric: tabular-nums; text-rendering: geometricPrecision; }
    .scene--robot .rb-ov text.s { fill: #555; }
    .scene--robot .rb-ov text.cap { fill: #555; letter-spacing: .06em; }
    .scene--robot .rb-ov text.a { fill: var(--accent); stroke: none; }
    .scene--robot .rb-ov rect.pl { fill: #fff; stroke: none; }
    .scene--robot .rb-ov line, .scene--robot .rb-ov polyline, .scene--robot .rb-ov circle, .scene--robot .rb-ov rect.o,
    .scene--robot .rb-ov path.o { fill: none; stroke: #000; stroke-width: 1px; }
    .scene--robot .rb-ov .g { stroke: #9a9a9a; }
    .scene--robot .rb-ov .l { stroke: #c9c9c9; }
    .scene--robot .rb-ov .d { stroke-dasharray: 2 3; }
    .scene--robot .rb-ov .dd { stroke-dasharray: 9 3 2 3; }
    .scene--robot .rb-ov .a { stroke: var(--accent); }
    .scene--robot .rb-ov rect.f { fill: #000; stroke: none; }
    .scene--robot .rb-ov rect.fa { fill: var(--accent); stroke: none; }
    .scene--robot .rb-ov rect.w { fill: #fff; stroke: #000; stroke-width: 1px; }
    /* a leader's end square keeps a 1 px white ring, so it still reads where it lands on a black servo or board */
    .scene--robot .rb-ov rect.lq { stroke: #fff; stroke-width: 1px; }
    .scene--robot .rb-bp { transition: opacity .7s ease; }
    .scene--robot .rb-bp path { stroke: #000; stroke-width: 1px; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    .scene--robot .rb-load { position: absolute; left: 0; top: 0; font: 11px/14px var(--mono); letter-spacing: .02em; color: #555;
      white-space: nowrap; transform: translateX(-50%); transition: opacity .4s ease; pointer-events: none; font-variant-numeric: tabular-nums; }
    .scene--robot .rb-head { position: absolute; right: 40px; top: 72px; width: 230px; text-align: right; font: 12px/15px var(--mono);
      letter-spacing: .02em; color: #555; cursor: pointer; z-index: 3; }
    .scene--robot .rb-head:hover .st { color: var(--accent); }
    .scene--robot .rb-head .bar { position: absolute; right: 0; top: 20px; width: 64px; height: 1px; background: var(--g300); }
    .scene--robot .rb-head .bar i { position: absolute; inset: 0; background: #000; transform-origin: 0 0; transform: scaleX(0); }
    .scene--robot .rb-head.is-paused .bar i { background: var(--g500); }
    .scene--robot .rb-head .st { position: absolute; right: 0; top: 27px; white-space: nowrap; transition: color .15s ease; }
    .scene--robot .rb-mnav { display: none; position: absolute; left: 50%; top: 46px; transform: translateX(-50%); align-items: center;
      font: 12px/15px var(--mono); letter-spacing: .02em; white-space: nowrap; z-index: 4; }
    .scene--robot .rb-mnav button { min-width: 44px; min-height: 44px; padding: 12px 14px; color: var(--ink); display: inline-flex;
      align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
    .scene--robot .rb-mnav button:active { color: var(--accent); }
    .scene--robot .rb-mnav .t { position: relative; min-width: 214px; padding: 12px 8px; color: #555; font-variant-numeric: tabular-nums; }
    .scene--robot .rb-mnav .pg { position: absolute; left: 50%; bottom: 8px; width: 64px; height: 1px; margin-left: -32px; background: var(--g300); }
    .scene--robot .rb-mnav .pg i { position: absolute; inset: 0; background: #000; transform-origin: 0 0; transform: scaleX(0); }
    .scene--robot .rb-mnav .t.is-paused .pg i { background: var(--g500); }
    .scene--robot .rb-panel { position: absolute; left: 0; top: 0; opacity: 0; visibility: hidden; z-index: 2;
      transition: opacity .5s ease, visibility 0s linear .5s; font: 12px/15px var(--mono); letter-spacing: .02em; color: #000; }
    .scene--robot .rb-panel.is-on { opacity: 1; visibility: visible; transition: opacity .6s ease .15s, visibility 0s; }
    .scene--robot .rb-eyebrow { font-size: 12px; line-height: 15px; letter-spacing: .06em; color: #555; text-transform: uppercase; margin-bottom: 10px; }
    .scene--robot .rb-photo { margin: 0; }
    .scene--robot .rb-photo .fr { position: relative; background: var(--g100); overflow: hidden; }
    .scene--robot .rb-photo img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 55% 50%;
      clip-path: inset(100% 0 0 0); transition: clip-path 1.1s cubic-bezier(.65, 0, .35, 1); }
    .scene--robot .rb-photo img.is-in { clip-path: inset(0 0 0 0); }
    .scene--robot .rb-photo figcaption { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; line-height: 15px;
      color: #555; margin-top: 10px; white-space: nowrap; }
    .scene--robot .rb-photo figcaption b { font-weight: 400; color: #555; text-transform: uppercase; letter-spacing: .06em; }
    /* corner ticks on the photo, like registration marks on a drawing sheet */
    .scene--robot .rb-photo .tk { position: absolute; width: 9px; height: 9px; border: 0 solid #000; pointer-events: none; }
    .scene--robot .rb-photo .tk.a { left: -6px; top: -6px; border-left-width: 1px; border-top-width: 1px; }
    .scene--robot .rb-photo .tk.b { right: -6px; top: -6px; border-right-width: 1px; border-top-width: 1px; }
    .scene--robot .rb-photo .tk.c { left: -6px; bottom: -6px; border-left-width: 1px; border-bottom-width: 1px; }
    .scene--robot .rb-photo .tk.d { right: -6px; bottom: -6px; border-right-width: 1px; border-bottom-width: 1px; }
    .scene--robot .rb-photo .frw { position: relative; }
    .scene--robot .rb-bus svg { display: block; overflow: visible; }
    .scene--robot .rb-bus text { font-family: var(--mono); font-size: 12px; letter-spacing: .02em; fill: #000; font-variant-numeric: tabular-nums; }
    .scene--robot .rb-bus text.s { fill: #555; }
    .scene--robot .rb-bus text.a { fill: var(--accent); }
    .scene--robot .rb-bus .bx { fill: #fff; stroke: #000; stroke-width: 1px; }
    .scene--robot .rb-bus .ln { fill: none; stroke: #000; stroke-width: 1px; }
    .scene--robot .rb-bus .ln.g { stroke: #9a9a9a; stroke-dasharray: 2 3; }
    .scene--robot .rb-bus .sv { fill: #1d1d1f; stroke: none; transition: fill .18s ease; }
    .scene--robot .rb-bus .sv.is-on { fill: var(--accent); }
    .scene--robot .rb-bus .pk { fill: var(--accent); }
    .scene--robot .rb-read .row { display: flex; gap: 12px; padding: 5px 0; border-top: 1px solid var(--g200); transition: color .25s ease; font-variant-numeric: tabular-nums; }
    .scene--robot .rb-read .row:last-of-type { border-bottom: 1px solid var(--g200); }
    .scene--robot .rb-read .row .n { flex: 1; }
    .scene--robot .rb-read .row .ax { width: 14px; color: #555; }
    .scene--robot .rb-read .row .v { width: 58px; text-align: right; }
    .scene--robot .rb-read .row.is-on { color: var(--accent); }
    .scene--robot .rb-read .row.is-on .ax { color: var(--accent); }
    .scene--robot .rb-read .foot { margin-top: 12px; font-size: 12px; line-height: 16px; color: #555; }
    .scene--robot .rb-read .check { margin-top: 12px; font-size: 12px; color: #000; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .scene--robot .rb-read .check b { font-weight: 400; color: var(--accent); }
    .scene--robot .rb-photo figcaption .bl { display: inline-block; width: 0; height: 0; vertical-align: baseline; }
    @media (max-width: 800px) {
      .scene--robot .rb-head { display: none; }
      .scene--robot .rb-mnav { display: flex; }
      .scene--robot .rb-photo figcaption { margin-top: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .scene--robot .rb-photo img, .scene--robot .rb-panel, .scene--robot .rb-gl, .scene--robot .rb-bp { transition: none; }
    }
    .scene--robot.rb-still { position: fixed; inset: 0; z-index: 9999; background: #fff; cursor: default; }
    .scene--robot.rb-still .rb-gl { transition: none; }
  `;

  /* --------------------------------------------------------------------------------------------- the scene */
  Site.register({
    id: 'robot', n: 4, title: 'Robot', path: '/robot',
    caption: STEPS[0].cap,
    create(el, api) {
      const STILL = !!RENDER;
      const REDUCED = !!api.reduced;
      const A = () => api.audio || window.Site.audio || null;

      /* ---------------------------------------------------------------- DOM */
      const mk = (tag, cls, parent, attrs) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.append(n);
        return n;
      };
      const style = mk('style', null, el);
      style.textContent = CSS;
      let host = el;
      if (STILL) { host = mk('div', 'scene--robot rb-still', document.body); }
      const stage = mk('div', 'rb-stage', host);
      const glCanvas = mk('canvas', 'rb-gl', stage, { 'aria-hidden': 'true' });
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'rb-ov');
      svg.setAttribute('aria-hidden', 'true');
      stage.append(svg);
      const gBP = document.createElementNS(NS, 'g'); gBP.setAttribute('class', 'rb-bp'); svg.append(gBP);
      const gLn = document.createElementNS(NS, 'g'); svg.append(gLn);
      const gPl = document.createElementNS(NS, 'g'); svg.append(gPl);   // white plates under labels
      const gTx = document.createElementNS(NS, 'g'); svg.append(gTx);
      const gHv = document.createElementNS(NS, 'g'); svg.append(gHv);   // the hover card, above every other label
      const loadEl = mk('div', 'rb-load', stage);
      loadEl.textContent = 'loading model · 0%';
      stage.setAttribute('role', 'img');
      stage.setAttribute('aria-label', 'Yash Dagade’s biped robot, drawn from its CAD model');

      // step header (desktop): "01 / 07 · Step", a progress hairline and the play state; click = pause / play
      const head = mk('div', 'rb-head', STILL ? null : el, { role: 'button', tabindex: '0' });
      const headLab = mk('div', 'lab', head);
      const headBar = mk('div', 'bar', head); const headBarI = mk('i', null, headBar);
      const headSt = mk('div', 'st', head);
      // phones: ‹ 01 / 07 · Step › under the wordmark; the label pauses / plays
      const mnav = mk('div', 'rb-mnav', STILL ? null : el);
      const mPrev = mk('button', null, mnav, { type: 'button', 'aria-label': 'Previous step' }); mPrev.textContent = '‹';
      const mLab = mk('button', 't', mnav, { type: 'button' });
      const mTxt = mk('span', null, mLab);
      const mPg = mk('span', 'pg', mLab); const mPgI = mk('i', null, mPg);
      const mNext = mk('button', null, mnav, { type: 'button', 'aria-label': 'Next step' }); mNext.textContent = '›';

      // right-hand panels
      // Brain & power: the one serial bus, Pi → USB → bus board → eight servos in a daisy chain; a command packet
      // walks down the chain and only the servo with its ID answers (IDs 1–8 from label.py; which joint is which is unknown)
      const pBrain = mk('div', 'rb-panel rb-read rb-bus', stage);
      mk('div', 'rb-eyebrow', pBrain).textContent = 'One serial bus';
      const BUS = { W: 210, x0: 16, pitch: 25, sq: 16, yChain: 150, svs: [], ids: [] };
      const busSvg = document.createElementNS(NS, 'svg');
      busSvg.setAttribute('width', String(BUS.W)); busSvg.setAttribute('height', '186');
      busSvg.setAttribute('viewBox', `0 0 ${BUS.W} 186`);
      busSvg.setAttribute('aria-hidden', 'true');
      pBrain.append(busSvg);
      const sv = (tag, a, text) => {
        const n = document.createElementNS(NS, tag);
        for (const k in a) n.setAttribute(k, a[k]);
        if (text != null) n.textContent = text;
        busSvg.append(n);
        return n;
      };
      {
        const x = BUS.x0 + 0.5, W0 = BUS.W - 0.5;
        sv('rect', { class: 'bx', x: 0.5, y: 0.5, width: W0 - 0.5, height: 34 });
        sv('text', { x: 12, y: 22 }, 'Raspberry Pi');
        sv('text', { x: W0 - 10, y: 22, class: 's', 'text-anchor': 'end' }, 'Python');
        sv('line', { class: 'ln', x1: x, y1: 35, x2: x, y2: 66 });
        sv('text', { x: x + 12, y: 55, class: 's' }, 'USB');
        sv('rect', { class: 'bx', x: 0.5, y: 66.5, width: W0 - 0.5, height: 34 });
        sv('text', { x: 12, y: 88 }, 'Servo bus board');
        sv('line', { class: 'ln', x1: x, y1: 101, x2: x, y2: BUS.yChain });
        sv('text', { x: x + 12, y: 125, class: 's' }, 'serial · 115200 baud');
        const xe = BUS.x0 + 7 * BUS.pitch;
        sv('line', { class: 'ln', x1: x, y1: BUS.yChain + 0.5, x2: xe + 0.5, y2: BUS.yChain + 0.5 });
        for (let k = 0; k < 8; k++) {
          const cx = BUS.x0 + k * BUS.pitch;
          BUS.svs.push(sv('rect', { class: 'sv', x: cx - BUS.sq / 2, y: BUS.yChain - BUS.sq / 2 + 0.5, width: BUS.sq, height: BUS.sq }));
          BUS.ids.push(sv('text', { x: cx, y: BUS.yChain + 29, 'text-anchor': 'middle', class: 's' }, String(k + 1)));
        }
        BUS.pk = sv('rect', { class: 'pk', x: 0, y: 0, width: 6, height: 6, opacity: 0 });
      }
      const busFoot = mk('div', 'foot', pBrain);
      busFoot.textContent = 'Eight servos share one wire.\nEach command carries an ID;\nonly that servo answers.';
      busFoot.style.whiteSpace = 'pre-line';

      const pJoint = mk('div', 'rb-panel rb-read', stage);
      mk('div', 'rb-eyebrow', pJoint).textContent = 'Joints · each leg';
      const jRows = {};
      [['hip_yaw', 'z'], ['hip_pitch', 'y'], ['knee', 'y'], ['ankle', 'y']].forEach(([j, ax]) => {
        const r = mk('div', 'row', pJoint);
        mk('span', 'n', r).textContent = JN[j];
        mk('span', 'ax', r).textContent = ax;
        const v = mk('span', 'v', r); v.textContent = '±0.0°';
        jRows[j] = { r, v, last: '' };
      });
      const jFoot = mk('div', 'foot', pJoint);
      jFoot.textContent = `8 × LX-16A on one bus.\n0–240°, home 120°.\n17${NB}kg·cm at 6${NB}V · 52${NB}g each.`;
      jFoot.style.whiteSpace = 'pre-line';

      const pWalk = mk('div', 'rb-panel rb-read', stage);
      mk('div', 'rb-eyebrow', pWalk).textContent = 'Right leg · live';
      const wRows = {};
      [['hip_pitch', 'hip'], ['knee', 'knee'], ['ankle', 'ankle']].forEach(([j, n]) => {
        const r = mk('div', 'row', pWalk);
        mk('span', 'n', r).textContent = n;
        const v = mk('span', 'v', r); v.textContent = '±0.0°';
        wRows[j] = { r, v, last: '' };
      });
      wRows.ankle.r.classList.add('is-on');
      const wCheck = mk('div', 'check', pWalk);
      const wFoot = mk('div', 'foot', pWalk);
      wFoot.textContent = 'Legs half a cycle apart.\nThe knee lifts only while\nthe leg swings forward.';
      wFoot.style.whiteSpace = 'pre-line';

      // In hand: the one photo, large, beside the turning CAD model
      const pHand = mk('div', 'rb-panel', stage);
      const figHand = mk('figure', 'rb-photo', pHand);
      const frwHand = mk('div', 'frw', figHand);
      const frHand = mk('div', 'fr', frwHand);
      const imgHand = mk('img', null, frHand, { alt: PHOTO.alt, decoding: 'async', width: String(PHOTO.w), height: String(PHOTO.h) });
      ['a', 'b', 'c', 'd'].forEach(c => mk('i', 'tk ' + c, frwHand));
      const capHand = mk('figcaption', null, figHand);
      const capB = mk('b', null, capHand);
      capB.textContent = 'Photo · ' + PHOTO.title;
      const capBL = mk('i', 'bl', capB);   // zero-size probe on the caption's baseline ("CAD MODEL" shares it)
      [pBrain, pJoint, pWalk, pHand, mnav, head].forEach(n => {
        ['pointerdown', 'touchstart', 'touchend'].forEach(ev => n.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
      });

      /* ---------------------------------------------------------------- state */
      const S = { step: 0, t: 0, paused: false, lastInteract: -1e9, spin: 0, phase: 0, entered: false,
        orbitAz: 0, orbitEl: 0, orbitDecay: false, stanceX: null, stance: null, lastJointPhase: -1, lastLift: 0 };
      const L = { W: 0, H: 0 };
      let W = 0, H = 0;
      let meta = null, model = null, d2 = null, NP = 0, PI = {};
      const G = { ready: false, failed: false };
      const TG = { ex: [], fade: [], tint: [], ang: {}, dual: 0, floor: 0, ring: 0 };
      const CU = { ex: [], fade: [], tint: [], ang: {}, dual: 0, floor: 0, ring: 0 };
      JOINTS.forEach(j => { TG.ang[j] = 0; CU.ang[j] = 0; });
      const mkView = az => ({ az, el: 0, T: [-12, 0, 0], s: 1, cx: 0, cy: 0, B: null });
      const V1 = mkView(0), V2 = mkView(-90), T1 = mkView(0), T2 = mkView(-90);
      let fitted = false;
      let hover = null;          // { i, x, y, pinned }
      let pointer = { in: false, x: 0, y: 0, down: false, id: -1, sx: 0, sy: 0, moved: 0, type: 'mouse', az0: 0, el0: 0, spin0: 0 };
      let pickQueued = false;

      /* ---------------------------------------------------------------- camera math */
      function basis(az, el) {
        const a = az * D2R, e = el * D2R, ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
        return { d: [ce * ca, ce * sa, se], r: [-sa, ca, 0], u: [-se * ca, -se * sa, ce] };
      }
      function prep(V) { V.B = basis(V.az, V.el); return V; }
      function proj(V, x, y, z) {
        const B = V.B || prep(V).B, dx = x - V.T[0], dy = y - V.T[1], dz = z - V.T[2];
        return { x: V.cx + V.s * (dx * B.r[0] + dy * B.r[1]), y: V.cy - V.s * (dx * B.u[0] + dy * B.u[1] + dz * B.u[2]),
          z: dx * B.d[0] + dy * B.d[1] + dz * B.d[2] };
      }
      const projP = (V, p) => proj(V, p[0], p[1], p[2]);
      // extents (mm, relative to T) of world points seen from az/el
      function extOf(pts, az, el, T, e) {
        const B = basis(az, el);
        e = e || { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
        for (let i = 0; i < pts.length; i += 3) {
          const dx = pts[i] - T[0], dy = pts[i + 1] - T[1], dz = pts[i + 2] - T[2];
          const x = dx * B.r[0] + dy * B.r[1], y = dx * B.u[0] + dy * B.u[1] + dz * B.u[2];
          if (x < e.x0) e.x0 = x; if (x > e.x1) e.x1 = x; if (y < e.y0) e.y0 = y; if (y > e.y1) e.y1 = y;
        }
        return e;
      }
      function extRange(pts, azs, el, T) { let e = null; for (const a of azs) e = extOf(pts, a, el, T, e); return e; }
      function fitTo(e, r, pad) {
        const w = Math.max(1, e.x1 - e.x0), h = Math.max(1, e.y1 - e.y0);
        const rw = Math.max(40, r.x1 - r.x0 - pad.l - pad.r), rh = Math.max(40, r.y1 - r.y0 - pad.t - pad.b);
        const s = Math.min(rw / w, rh / h, pad.max || 3);
        const cx = (r.x0 + pad.l + r.x1 - pad.r) / 2, cy = (r.y0 + pad.t + r.y1 - pad.b) / 2;
        return { s, cx: cx - (s * (e.x0 + e.x1)) / 2, cy: cy + (s * (e.y0 + e.y1)) / 2 };
      }
      // world points (bbox corners) of parts, with an explode amount per part (fn → number | false)
      function pts(fn) {
        const out = [];
        meta.parts.forEach((p, i) => {
          const k = fn ? fn(p, i) : 0;
          if (k === false) return;
          const b = p.bbox, x = p.explode, e = k || 0;
          for (const X of [b.min[0], b.max[0]]) for (const Y of [b.min[1], b.max[1]]) for (const Z of [b.min[2], b.max[2]]) {
            out.push(X + x[0] * e, Y + x[1] * e, Z + x[2] * e);
          }
        });
        return out;
      }
      const azRange = (a0, a1, n) => { const r = []; for (let i = 0; i <= n; i++) r.push(a0 + ((a1 - a0) * i) / n); return r; };

      /* ---------------------------------------------------------------- layout */
      function layout() {
        const sz = api.size();
        W = L.W = sz.w; H = L.H = sz.h;
        L.m = W <= 800;
        const hb = STILL ? 0 : api.headlineBottom();
        L.hb = hb || (L.m ? 190 : 170);
        L.gut = L.m ? 16 : 40;
        L.left = L.m ? 16 : W > 1100 ? 292 : 276;
        L.top = STILL ? 0 : L.hb + (L.m ? 14 : 22);
        L.bottom = STILL ? H : H - (L.m ? 112 : 86);
        // phones: until the first gesture core's "tap for sound" invite sits just above the controls: keep the art above it
        L.invite = !STILL && L.m && inviteUp();
        if (L.invite) {
          const hr = hintRect();
          if (hr) L.bottom = Math.min(L.bottom, Math.round(hr.top - 10));
        }
        L.touch = L.m || coarse;
        L.panelW = L.m ? 0 : clamp(Math.round(W * 0.19), 210, 290);
        // right-hand readout panels only where the drawing keeps ≥ 420 px beside them (not on tablets / narrow windows)
        L.side = !STILL && !L.m && W - L.gut - L.panelW - 44 - L.left >= 420;
        // wide screens: a step without a side panel centres its drawing on the headline's axis (W / 2)
        L.sym = !STILL && !L.m && W > 1100;
        L.clipB = STILL ? 0 : L.m ? 96 : 70;
        if (STILL) { L.left = 0; L.gut = 0; }
        const hlTop = STILL ? null : L.m ? 94 : null;
        if (!STILL && hlTop !== L.hlTop) { L.hlTop = hlTop; api.headlineTop(hlTop); }
        // (801–1100 px: where the headline box ends, for the step header; read on resize / headline change only)
        L.hlRight = 0;
        if (!STILL && !L.m && W <= 1100) {
          const g = document.querySelector('.headline-group[data-scene="robot"]');
          const r = g && g.getBoundingClientRect();
          if (r && r.width) L.hlRight = r.right;
        }
      }
      const coarse = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
      const hintEl = () => document.getElementById('hint');
      function inviteUp() {
        const au = A();
        const h = hintEl();
        return !!(h && h.classList.contains('is-visible') && !(au && au.ready));
      }
      function hintRect() { const h = hintEl(); if (!h) return null; const r = h.getBoundingClientRect(); return r.height ? r : null; }
      const artRect = (panel, extraR) => {
        const withPanel = panel && L.side;
        const x1 = withPanel ? W - L.gut - L.panelW - 44 : L.sym ? W - L.left : W - L.gut;
        return { x0: L.left, x1: x1 - (extraR || 0), y0: L.top, y1: L.bottom };
      };
      // Brain & power without the side panel: every label in one column at the right. The bus panel only where the
      // drawing keeps ≥ 260 px between its two label columns (≈ 1180 px wide and up).
      const brainCol = () => L.m || !L.side || (artRect(true).x1 - artRect(true).x0 - 360 < 260);
      const brainColW = () => (L.m ? nameW(BRAIN_LABELS) : labW(BRAIN_LABELS));

      // Per-step framing (targets for the smoothed camera). Called on step change, resize and headline change.
      function refit() {
        if (!meta) return;
        layout();
        ancGen++;   // (the view changes: find the leaders' visible points again)
        const id = STILL ? 'still' : STEPS[S.step].id;
        const T = [-12, 0, 0];
        T1.T = T; T2.T = T;
        let f;
        // Brain & power: the faded legs dissolve toward the bottom instead of ending on the canvas's straight edge
        setFadeBottom(id === 'brain');
        if (id === 'still') return fitStill();
        if (id === 'assembled') {
          T1.el = 9;
          const e = extRange(pts(), azRange(0, 345, 23), T1.el, T);
          f = fitTo(e, artRect(false), { l: 30, r: L.m ? 64 : 110, t: L.m ? 40 : 54, b: 16 });
          TG.dual = 0;
        } else if (id === 'parts') {
          T1.el = 14;
          const e = extRange(pts((p) => 1).concat(pts()), azRange(18, 46, 6), T1.el, T);
          f = fitTo(e, artRect(false, L.m ? 118 : 210), { l: 10, r: 20, t: 20, b: 6 });   // (t: room for the Pi's leader above the battery)
        } else if (id === 'brain') {
          T1.el = 13;
          const keep = new Set(['torso_frame', 'deck', 'pi', 'battery', 'buck', 'busboard', 'servo_hip_yaw_R', 'servo_hip_yaw_L']);
          const e = extRange(pts((p) => (keep.has(p.id) ? BRAIN_LIFT[p.id] || 0 : false)), azRange(BRAIN_AZ - 8, BRAIN_AZ + 8, 4), T1.el, T);
          const rc = { x0: L.left, x1: W - L.gut - brainColW() - (L.m ? 26 : 56), y0: L.top, y1: L.bottom };
          f = brainCol() ? fitTo(e, rc, { l: L.m ? 4 : 20, r: 4, t: 20, b: L.m ? 60 : 90, max: 2.6 })
            : fitTo(e, artRect(true), { l: 190, r: 170, t: 20, b: 110, max: 2.6 });
          // phones (width-bound): the electronics sit right under the headline and the faded legs take the height below,
          // instead of a blank band above the drawing
          if (L.m) f.cy = Math.min(f.cy, rc.y0 + 16 + f.s * e.y1);
        } else if (id === 'joints') {
          T1.el = 7;
          const e = extOf(pts(), -58, T1.el, T);
          e.x0 -= 40; e.x1 += 40;
          f = fitTo(e, artRect(true), { l: L.m ? 96 : L.side ? 190 : 150, r: L.m ? 20 : 60, t: 10, b: 14 });
        } else if (id === 'dims') {
          return fitDims();
        } else if (id === 'walk') {
          T1.el = 9;
          const e = extOf(pts(), -74, T1.el, T);
          e.x0 -= 70; e.x1 += 70; e.y0 -= 14;
          f = fitTo(e, artRect(true), { l: 20, r: 20, t: 10, b: 24 });
        } else if (id === 'hand') {
          // the model at the photo's scale: its ground and top line up with the robot's soles and deck top in the photo
          T1.el = 6;
          placeHand();
          const hd = L.hand;
          f = { s: hd.s, cx: hd.mx, cy: hd.yb };
          // (compact: the model stands closer to the photo than the turntable's radius, so no ring)
          TG.ring = hd.dim ? 1 : 0;
        }
        if (f) { T1.s = f.s; T1.cx = f.cx; T1.cy = f.cy; }
        if (id !== 'dims') TG.dual = 0;
        placePanels();
        if (!fitted) snapView();
      }

      let fadeB = '';
      function setFadeBottom(on) {
        const y1 = Math.round(H - (L.clipB || 0)), y0 = y1 - (L.m ? 70 : 90);
        const v = on && !STILL ? `linear-gradient(to bottom, #000 ${y0}px, rgba(0,0,0,0) ${y1}px)` : '';
        if (v === fadeB) return;
        fadeB = v;
        glCanvas.style.webkitMaskImage = v; glCanvas.style.maskImage = v;
      }

      // Dimensions: front (az 0) and side (az −90) orthographic views at one scale, side by side; phones: one at a time
      function fitDims() {
        const T = [-12, 0, 0];
        const P = pts();
        const eF = extOf(P, 0, 0, T), eS = extOf(P, -90, 0, T);
        const r = artRect(false);
        // side by side unless that halves the drawing (tall tablets): then one view at a time, like phones
        const pad = L.m ? { l: 58, r: 58, t: 34, b: 50 } : { l: 84, r: 84, t: 44, b: 62 };
        const s1 = Math.min(fitTo(eF, r, pad).s, fitTo(eS, r, pad).s);
        // side by side: the two padded views sit a fixed gap apart, the pair centred in the art area
        const pF = { l: 70, r: 50, t: 40, b: 58 }, pS = { l: 64, r: 76, t: 40, b: 58 }, GAP = 24;
        const wF = eF.x1 - eF.x0, wS = eS.x1 - eS.x0;
        let s2 = 0;
        if (!L.m) {
          const rw = r.x1 - r.x0 - (pF.l + pF.r + pS.l + pS.r + GAP), rh = r.y1 - r.y0 - pF.t - pF.b;
          s2 = Math.min(rw / (wF + wS), rh / Math.max(eF.y1 - eF.y0, eS.y1 - eS.y0), 2.2);
        }
        L.dimsAlt = L.m || s2 < 0.72 * Math.min(s1, 2.2);
        if (L.dimsAlt) {
          const fF = fitTo(eF, r, pad), fS = fitTo(eS, r, pad);
          const s = Math.min(fF.s, fS.s, 2.2);
          const a = fitTo(eF, r, Object.assign({ max: s }, pad)), b = fitTo(eS, r, Object.assign({ max: s }, pad));
          Object.assign(T1, { az: 0, el: 0, s, cx: a.cx, cy: a.cy });
          Object.assign(T2, { az: -90, el: 0, s, cx: b.cx, cy: b.cy });
          L.dimsSide = { x: 0 };
          TG.dual = 0;
        } else {
          const s = s2;
          const fw = pF.l + wF * s + pF.r, sw = pS.l + wS * s + pS.r;
          const xs = Math.round((r.x0 + r.x1) / 2 - (fw + GAP + sw) / 2);
          const rF = { x0: xs, x1: xs + fw, y0: r.y0, y1: r.y1 }, rS = { x0: xs + fw + GAP, x1: xs + fw + GAP + sw, y0: r.y0, y1: r.y1 };
          const a = fitTo(eF, rF, Object.assign({ max: s }, pF)), b = fitTo(eS, rS, Object.assign({ max: s }, pS));
          Object.assign(T1, { az: 0, el: 0, s, cx: a.cx, cy: a.cy });
          Object.assign(T2, { az: -90, el: 0, s, cx: b.cx, cy: b.cy });
          L.split = Math.round(rF.x1 + GAP / 2);
          TG.dual = 1;
        }
        placePanels();
        if (!fitted) snapView();
      }

      function fitStill() {
        const v = RENDER;
        const pad = RQ.has('pad') ? clamp(+RQ.get('pad'), 0, 0.4) : 0.06;
        const r = { x0: 0, x1: W, y0: 0, y1: H };
        const pp = { l: W * pad, r: W * pad, t: H * pad, b: H * pad };
        const T = [-12, 0, 0];
        const VIEWS = { front: [0, 0], side: [-90, 0], back: [180, 0], '34': [32, 14], '34r': [-32, 14], exploded: [30, 14], walk: [-74, 8], top: [0, 88] };
        const [az, elv] = VIEWS[v] || VIEWS['34'];
        let P = v === 'exploded' ? pts(() => 1) : pts();
        if (v === 'exploded' && RQ.get('labels') === '1') pp.r = Math.max(pp.r, 220);
        const e = extOf(P, az, elv, T);
        if (v === 'walk') { e.x0 -= 40; e.x1 += 40; }
        const f = fitTo(e, r, pp);
        Object.assign(T1, { az, el: elv, T, s: f.s, cx: f.cx, cy: f.cy });
        snapView();
      }

      function snapView() {
        Object.assign(V1, { az: T1.az, el: T1.el, s: T1.s, cx: T1.cx, cy: T1.cy, T: T1.T.slice() });
        Object.assign(V2, { az: T2.az, el: T2.el, s: T2.s, cx: T2.cx, cy: T2.cy, T: T2.T.slice() });
        CU.dual = TG.dual;
        fitted = true;
      }

      // panels: right column (desktop), vertically centred on the art area
      function placePanels() {
        if (STILL) return;
        const id = STEPS[S.step].id;
        const x = W - L.gut - L.panelW;
        const live = !G.lost;
        const on = { brain: !brainCol() && id === 'brain', joints: live && L.side && id === 'joints', walk: live && L.side && id === 'walk', hand: id === 'hand' };
        pBrain.classList.toggle('is-on', on.brain);
        pJoint.classList.toggle('is-on', on.joints);
        pWalk.classList.toggle('is-on', on.walk);
        pHand.classList.toggle('is-on', on.hand);
        for (const p of [pBrain, pJoint, pWalk]) p.style.width = L.panelW + 'px';
        const place = (p) => {
          const h = p.offsetHeight || 200;
          const y = clamp(Math.round((L.top + L.bottom) / 2 - h / 2), L.top, Math.max(L.top, L.bottom - h));
          p.style.transform = `translate(${Math.round(x)}px, ${y}px)`;
        };
        if (on.brain) place(pBrain);
        if (on.joints) place(pJoint);
        if (on.walk) place(pWalk);
        if (on.hand) placeHand();
      }

      // In hand: the photo is the hero (right); the CAD model stands left of it at the photo's scale, so its ground and
      // top meet the real robot's soles and deck top along two hairline guides.
      const PH_TOP = 718 / 1400, PH_BOT = 1352 / 1400;    // the robot in the photo: top of the Pi … soles (image px)
      const RING_R = 158;                                  // turntable radius incl. its ticks (mm)
      const TICK = 6;                                      // the photo's corner ticks stand 6 px outside its frame
      // model px per mm, per px of photo HEIGHT (the frame never crops the photo vertically, so the robot always spans
      // PH_TOP…PH_BOT of the frame's height)
      const KH = (PH_BOT - PH_TOP) / (TOP * Math.cos(6 * D2R));
      // where the stepper's labels end (desktop / tablet): compact layouts may use the room up to it
      // (the items are full-width blocks: measure their text)
      function stepperRight() {
        try {
          const root = stepper && stepper.el;
          if (!root) return 0;
          const rg = document.createRange();
          let x = 0;
          root.querySelectorAll('.stepper__item').forEach(b => {
            const t = b.firstChild;
            if (t && t.nodeType === 3) { rg.selectNodeContents(t); const rc = rg.getBoundingClientRect(); if (rc.width) x = Math.max(x, rc.right); }
          });
          return x;
        } catch (e) { return 0; }
      }
      function placeHand() {
        const r = artRect(false);
        const capH = 25;
        const ah = r.y1 - r.y0, hAvail = Math.min(700, ah - capH - 8);
        // left bound: the art column, or (tablets, narrow windows) 24 px right of the stepper's labels; right bound: the
        // gutter less the ticks' overhang
        const sr = L.m ? 0 : stepperRight();
        const xL = sr ? Math.min(r.x0, Math.round(sr + 24)) : r.x0;
        const xR = (L.sym ? r.x1 : W - L.gut) - TICK;
        const aw = xR - xL;
        const dimW = 84;                                    // room for the 446.2 mm dimension left of the model
        const gapN = Math.round(clamp(aw * 0.07, 48, 110)), gapC = L.m ? 14 : 32;
        // photo width for a frame of aspect a (h / w), the model beside it with half-width R mm (+ `lead` px before it)
        const pwFor = (a, R, gap, lead) => Math.min(hAvail / a, Math.floor((aw - lead - gap) / (1 + 2 * R * KH * a)));
        // with the turntable and the dimension line …
        const pwN = pwFor(1.25, RING_R, gapN, dimW);
        // … or compact (phones, tablets): the model without its turntable, right beside the photo
        const pwC = pwFor(1.25, maxRadius(), gapC, 0);
        const compact = L.m || pwN < 0.9 * pwC;
        // compact and width-bound: a taller 2:3 frame (it crops only wall from the photo's sides) when that makes the
        // photo, and the robot in it, clearly bigger
        let a = 1.25, pw = compact ? pwC : pwN;
        if (compact) { const p2 = pwFor(1.5, maxRadius(), gapC, 0); if (1.5 * p2 > 1.06 * 1.25 * pwC) { a = 1.5; pw = p2; } }
        pw = Math.max(120, Math.floor(pw));
        const ph = Math.round(pw * a);
        const yt0 = PH_TOP * ph, yb0 = PH_BOT * ph;
        const s = KH * ph;
        const mR = (compact ? maxRadius() : RING_R) * s;    // the model's half-width on screen
        const gap = compact ? gapC : gapN;
        const lead = compact ? 0 : dimW;
        const total = lead + 2 * mR + gap + pw;
        // the pair is centred on the viewport's axis (the headline's), kept between the bounds
        const x0 = clamp(W / 2 - total / 2, xL, Math.max(xL, xR - total));
        const x = Math.round(x0 + lead + 2 * mR + gap);
        const mx = Math.round(x - gap - mR);
        const totalH = ph + capH;
        const y = Math.round(clamp((r.y0 + r.y1) / 2 - totalH / 2, r.y0, Math.max(r.y0, r.y1 - totalH)));
        pHand.style.width = pw + 'px';
        frHand.style.height = ph + 'px';
        pHand.style.transform = `translate(${Math.round(x)}px, ${y}px)`;
        // "CAD MODEL" sits on the photo caption's measured baseline
        let capY = y + ph + 25;
        try { const b = capBL.getBoundingClientRect(), sr2 = stage.getBoundingClientRect(); if (b.bottom) capY = Math.round(b.bottom - sr2.top); } catch (e) { /* ok */ }
        L.hand = { x, y, w: pw, h: ph, s, mx, mR, yt: y + yt0, yb: y + yb0, dim: !compact, capY };
      }

      /* ---------------------------------------------------------------- photo */
      function ensureImg(img, id) {
        const src = IMG + id + '.jpg';
        if (img.getAttribute('src') !== src) {
          img.classList.remove('is-in');
          img.onload = () => { requestAnimationFrame(() => img.classList.add('is-in')); };
          img.setAttribute('src', src);
          if (img.complete && img.naturalWidth) requestAnimationFrame(() => img.classList.add('is-in'));
        } else if (img.complete && img.naturalWidth) img.classList.add('is-in');
      }
      // warm the photo's cache once the model is up, so the last step never waits for it
      // (through the step's own hidden <img>, so the photo is fetched and decoded once; stepEnter replays its wipe)
      function preloadPhoto() { try { if (!imgHand.getAttribute('src')) ensureImg(imgHand, PHOTO.id); } catch (e) { /* ok */ } }

      /* ---------------------------------------------------------------- SVG overlay (retained, keyed per frame) */
      const pool = new Map();
      let used = new Set();
      // pooled SVG nodes, keyed by tag + key (two draws may share a key but never an element)
      function node(key, tag, layer) {
        const pk = tag + ':' + key;
        let n = pool.get(pk);
        if (!n) { n = document.createElementNS(NS, tag); n._a = {}; (layer || gLn).append(n); pool.set(pk, n); }
        if (n._hid) { n.style.display = ''; n._hid = false; }
        used.add(pk);
        return n;
      }
      function at(n, k, v) { if (n._a[k] !== v) { n._a[k] = v; n.setAttribute(k, v); } }
      function endOv() {
        for (const [k, n] of pool) if (!used.has(k) && !n._hid) { n.style.display = 'none'; n._hid = true; }
        used = new Set();
      }
      const rr = v => Math.round(v * 10) / 10;
      const cr = v => Math.round(v) + 0.5;  // crisp 1 px line on a pixel centre
      function ln(key, x1, y1, x2, y2, cls, op) {
        const n = node(key, 'line');
        at(n, 'x1', rr(x1)); at(n, 'y1', rr(y1)); at(n, 'x2', rr(x2)); at(n, 'y2', rr(y2));
        at(n, 'class', cls || ''); at(n, 'opacity', op == null ? '1' : String(Math.round(op * 100) / 100));
      }
      function pl(key, P, cls, op) {
        const n = node(key, 'polyline');
        at(n, 'points', P.map(p => rr(p[0]) + ',' + rr(p[1])).join(' '));
        at(n, 'class', cls || ''); at(n, 'opacity', op == null ? '1' : String(Math.round(op * 100) / 100));
      }
      function ci(key, x, y, r, cls, op) {
        const n = node(key, 'circle');
        at(n, 'cx', rr(x)); at(n, 'cy', rr(y)); at(n, 'r', String(r));
        at(n, 'class', cls || ''); at(n, 'opacity', op == null ? '1' : String(Math.round(op * 100) / 100));
      }
      function sq(key, x, y, w, cls, op) {
        const n = node(key, 'rect', gTx);
        at(n, 'x', rr(x - w / 2)); at(n, 'y', rr(y - w / 2)); at(n, 'width', String(w)); at(n, 'height', String(w));
        at(n, 'class', cls || 'f'); at(n, 'opacity', op == null ? '1' : String(Math.round(op * 100) / 100));
      }
      // Text is flat ink (or accent) with no stroke; an opaque white plate sits under it so a label that lands on a
      // line or on the drawing stays crisp (the plate breaks the line, as on a drawing sheet).
      // (plateOp: the plate's own opacity, when it must stay solid while the text fades, so no line shows through a
      // half-faded label)
      function tx(key, x, y, str, cls, anchor, op, plateOp) {
        const o = op == null ? '1' : String(Math.round(op * 100) / 100);
        const po = plateOp == null ? o : String(Math.round(plateOp * 100) / 100);
        const a = anchor || 'start', w = tw(str) + 8;
        const x0 = a === 'middle' ? x - w / 2 : a === 'end' ? x - w + 4 : x - 4;
        const p = node(key + '_p', 'rect', gPl);
        at(p, 'x', rr(x0)); at(p, 'y', rr(y - 11)); at(p, 'width', rr(w)); at(p, 'height', '15');
        at(p, 'class', 'pl'); at(p, 'opacity', po);
        const n = node(key, 'text', gTx);
        if (n._t !== str) { n._t = str; n.textContent = str; }
        at(n, 'x', rr(x)); at(n, 'y', rr(y)); at(n, 'text-anchor', a);
        at(n, 'class', cls || ''); at(n, 'opacity', o);
      }
      // Geist Mono: 0.6 em advance + .02 em tracking
      const tw = (str, px) => str.length * (px || 12) * 0.62;

      // A dimension between world points A and B, offset along world direction `dir` by `off` px (3D-aligned, works in any
      // view): extension lines, the dimension line with 45° ticks, the value centred on the line. k = draw-on 0..1.
      function dim3(key, V, A, B, dir, off, label, k, o) {
        o = o || {};
        if (k <= 0) return;
        const mm = off / V.s, g = (o.gap == null ? 5 : o.gap) / V.s, ov = 7 / V.s;
        const at3 = (P, d) => [P[0] + dir[0] * d, P[1] + dir[1] * d, P[2] + dir[2] * d];
        const a0 = projP(V, at3(A, g)), a1 = projP(V, at3(A, mm + ov)), b0 = projP(V, at3(B, g)), b1 = projP(V, at3(B, mm + ov));
        const a = projP(V, at3(A, mm)), b = projP(V, at3(B, mm));
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const trueLen = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) * V.s;
        let op = (o.op == null ? 1 : o.op) * clamp((len / Math.max(1, trueLen) - 0.28) / 0.22, 0, 1);
        if (len < 18) op = 0;
        if (op <= 0.01) return;
        const cls = o.cls || '';
        const ke = sstep(k / 0.4), kd = sstep((k - 0.25) / 0.6), kt = sstep((k - 0.6) / 0.4);
        if (!o.noExt) {
          ln(key + 'ea', a0.x, a0.y, lerp(a0.x, a1.x, ke), lerp(a0.y, a1.y, ke), 'g ' + cls, op);
          ln(key + 'eb', b0.x, b0.y, lerp(b0.x, b1.x, ke), lerp(b0.y, b1.y, ke), 'g ' + cls, op);
        }
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (kd > 0) {
          ln(key + 'd', lerp(mx, a.x, kd), lerp(my, a.y, kd), lerp(mx, b.x, kd), lerp(my, b.y, kd), cls, op);
          const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
          const tx0 = (ux - uy) * 0.7071 * 4.5, ty0 = (uy + ux) * 0.7071 * 4.5;
          if (kd > 0.98) {
            ln(key + 'ta', a.x - tx0, a.y - ty0, a.x + tx0, a.y + ty0, cls, op);
            ln(key + 'tb', b.x - tx0, b.y - ty0, b.x + tx0, b.y + ty0, cls, op);
          }
        }
        if (kt > 0 && label) {
          const pos = o.labelAt || 'on';
          if (pos === 'on') {
            // The value only while the line reads as a dimension: it goes (the line stays, faded) as the edge turns
            // end-on, or once the line is too short to show on both sides of it. Its plate stays solid while it
            // fades, so the line never runs through the digits.
            const lv = kt * sstep((op - 0.6) / 0.25) * sstep((len - tw(label) - 16) / 10);
            if (lv > 0.01) tx(key + 'l', mx, my + 4, label, o.tcls || '', 'middle', lv, Math.min(1, lv * 4));
          } else {
            // beside the line, away from the object (screen direction of `dir`)
            const q = projP(V, at3(A, mm + 10 / V.s)), sx = Math.sign(q.x - a.x) || 1;
            tx(key + 'l', mx + sx * 7, my + 4, label, o.tcls || '', sx > 0 ? 'start' : 'end', op * kt);
          }
        }
      }

      // Screen-space dimension for the orthographic sheet: vertical (between the y of A and B at x = xl) or horizontal
      // (between the x of A and B at y = yl), with extension lines from the features.
      function dimV(key, V, A, B, xl, label, k, side, beside) {
        if (k <= 0) return;
        const a = projP(V, A), b = projP(V, B), x = cr(xl), s = side || Math.sign(xl - a.x) || 1;
        const ke = sstep(k / 0.4), kd = sstep((k - 0.25) / 0.6), kt = sstep((k - 0.6) / 0.4);
        const ya = cr(a.y), yb = cr(b.y);
        ln(key + 'ea', a.x + s * 4, ya, lerp(a.x + s * 4, x + s * 7, ke), ya, 'g');
        ln(key + 'eb', b.x + s * 4, yb, lerp(b.x + s * 4, x + s * 7, ke), yb, 'g');
        const my = (ya + yb) / 2;
        if (kd > 0) {
          ln(key + 'd', x, lerp(my, ya, kd), x, lerp(my, yb, kd));
          if (kd > 0.98) { ln(key + 'ta', x - 4, ya + 4, x + 4, ya - 4); ln(key + 'tb', x - 4, yb + 4, x + 4, yb - 4); }
        }
        if (kt > 0) {
          if (Math.abs(yb - ya) > 34 && !beside) tx(key + 'l', x, my + 4, label, '', 'middle', kt);
          else tx(key + 'l', x + s * 9, my + 4, label, '', s > 0 ? 'start' : 'end', kt);
        }
      }
      function dimH(key, V, A, B, yl, label, k) {
        if (k <= 0) return;
        const a = projP(V, A), b = projP(V, B), y = cr(yl), s = Math.sign(yl - a.y) || 1;
        const ke = sstep(k / 0.4), kd = sstep((k - 0.25) / 0.6), kt = sstep((k - 0.6) / 0.4);
        const xa = cr(a.x), xb = cr(b.x);
        ln(key + 'ea', xa, a.y + s * 4, xa, lerp(a.y + s * 4, y + s * 7, ke), 'g');
        ln(key + 'eb', xb, b.y + s * 4, xb, lerp(b.y + s * 4, y + s * 7, ke), 'g');
        const mx = (xa + xb) / 2;
        if (kd > 0) {
          ln(key + 'd', lerp(mx, xa, kd), y, lerp(mx, xb, kd), y);
          if (kd > 0.98) { ln(key + 'ta', xa - 4, y + 4, xa + 4, y - 4); ln(key + 'tb', xb - 4, y + 4, xb + 4, y - 4); }
        }
        if (kt > 0 && label) {
          if (Math.abs(xb - xa) > tw(label) + 14) tx(key + 'l', mx, y + 4, label, '', 'middle', kt);
          // (too short for its value: the value goes just past the right-hand tick, on the line's row, not under it
          // where the view's caption sits)
          else tx(key + 'l', Math.max(xa, xb) + 9, y + 4, label, '', 'start', kt);
        }
      }

      // A leader's anchor on a point of part i that the camera can actually see. Candidates run from the part's centre
      // toward its screen-left (side −1) or screen-right (side +1) edge by the fractions fs, each at three heights; each
      // is tested by picking (≤ a few ray casts per frame, spread over frames) and the first that hits part i itself is
      // kept as a point on the part, so the leader stays on it as the part moves. Re-checked every couple of seconds.
      const ANC = {};
      let ancBudget = 0, ancGen = 0;
      function anchorOf(key, i, side, fs) {
        const V = V1, b = meta.parts[i].bbox, c = centerOf(i);
        let A = ANC[key];
        if (!A || A.gen !== ancGen) A = ANC[key] = { gen: ancGen, n: 0, lp: null, f: 0 };
        A.f++;
        if (A.lp) {
          const q = projP(V, wp(i, A.lp));
          // re-check now and then (the camera sways; a moving part can pass in front)
          if (A.f % 120 === 0 && ancBudget > 0 && G.ready) { ancBudget--; if (pickAt(q.x, q.y) !== i) { A.lp = null; A.n = 0; } }
          if (A.lp) return { x: q.x, y: q.y };
        }
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const X of [b.min[0], b.max[0]]) for (const Y of [b.min[1], b.max[1]]) for (const Z of [b.min[2], b.max[2]]) {
          const q = projP(V, wp(i, [X, Y, Z]));
          x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
        }
        const cc = projP(V, wp(i, c)), ex = side > 0 ? x1 : x0, hy = (y1 - y0) / 2;
        const cand = n => { const f = fs[Math.floor(n / 3)], dy = [0, -0.3, 0.3][n % 3]; return { x: lerp(cc.x, ex, f), y: cc.y + dy * hy }; };
        const N = fs.length * 3;
        while (A.n < N && ancBudget > 0 && G.ready) {
          ancBudget--;
          const p = cand(A.n++), o = {};
          if (pickAt(p.x, p.y, o) === i && o.v === 1) { A.lp = o.lp; return p; }
        }
        return cand(0);
      }

      // Leader labels: anchors (screen) sorted by y, spread to a minimum gap, drawn as a square + dashed elbow + text
      const leaderY = {};
      function leaders(key, items, colX, align, k, lh) {
        lh = lh || 30;
        // (it.ly, when given, is where the label row wants to be; the leader still starts at the live anchor it.a)
        const ly = it => (it.ly == null ? it.a.y : it.ly);
        const list = items.filter(it => it.a).sort((p, q) => ly(p) - ly(q));
        if (!list.length) return;
        // spread: forward pass then backward pass within [L.top, L.bottom]; when the column is too short for the
        // stack, tighten the gap and drop the size lines (never let a label climb into the headline)
        const yTop = L.top + 11, yBot = L.bottom - (list.some(it => it.sub) ? 22 : 8);
        let subs = true;
        if (list.length > 1 && (list.length - 1) * lh > yBot - yTop) {
          lh = (yBot - yTop) / (list.length - 1);
          if (lh < 31) { subs = false; lh = Math.max(lh, 16); }
        }
        const y = list.map(ly), n = y.length;
        y[0] = Math.max(y[0], yTop);
        for (let i = 1; i < n; i++) y[i] = Math.max(y[i], y[i - 1] + lh);
        if (y[n - 1] > yBot) {
          y[n - 1] = yBot;
          for (let i = n - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] - lh);
          if (y[0] < yTop) { y[0] = yTop; for (let i = 1; i < n; i++) y[i] = Math.max(y[i], y[i - 1] + lh); }
        }
        list.forEach((it, i) => {
          const kk = key + it.id;
          const prev = leaderY[kk];
          const yy = prev == null || Math.abs(prev - y[i]) > 80 ? y[i] : lerp(prev, y[i], 0.25);
          leaderY[kk] = yy;
          const ki = sstep((k - (it.delay || 0)) / 0.35);
          if (ki <= 0) return;
          const cls = it.acc ? 'a' : '';
          const sgn = align === 'end' ? -1 : 1;
          const ex = colX - sgn * 10;
          sq(kk + 'q', it.a.x, it.a.y, 5, it.acc ? 'fa lq' : 'f lq', ki);
          // (it.up: straight up to the label's row, then across: one bend, clear of whatever sits beside the part)
          const P = it.up ? [[it.a.x, it.a.y], [it.a.x, lerp(it.a.y, yy - 4, ki)], [lerp(it.a.x, colX - sgn * 2, ki), lerp(it.a.y, yy - 4, ki)]]
            : [[it.a.x, it.a.y], [lerp(it.a.x, ex, ki), lerp(it.a.y, yy - 4, ki)], [lerp(it.a.x, colX - sgn * 2, ki), lerp(it.a.y, yy - 4, ki)]];
          pl(kk + 'p', P, 'd ' + (it.acc ? 'a' : 'g'), ki);
          tx(kk + 't', colX, yy, it.name, it.acc ? 'a' : '', align, sstep((ki - 0.4) / 0.6));
          if (it.sub && subs) tx(kk + 's', colX, yy + 15, it.sub, 's', align, sstep((ki - 0.5) / 0.5));
        });
      }

      /* ---------------------------------------------------------------- blueprint (first paint, before WebGL) */
      let bpDrawn = false;
      function drawBlueprint() {
        if (bpDrawn || !d2 || !meta || G.ready) return;
        bpDrawn = true;
        const V = d2.views.front;
        const role = {};
        meta.parts.forEach(p => { role[p.id] = p.role; });
        const n = V.order.length;
        V.order.forEach((id, k) => {
          const p = V.parts[id];
          if (!p) return;
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', p.d);
          path.setAttribute('fill-rule', 'evenodd');
          path.setAttribute('fill', role[id] === 'servo' ? '#1d1d1f' : '#fff');
          path.setAttribute('pathLength', '1');
          if (!REDUCED) {
            path.style.strokeDasharray = '1 1';
            path.style.strokeDashoffset = '1';
            path.style.fillOpacity = '0';
            path.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.65,0,.35,1) ${(k / n) * 0.7}s, fill-opacity .6s ease ${0.6 + (k / n) * 0.7}s`;
          }
          gBP.append(path);
        });
        placeBlueprint();
        if (!REDUCED) requestAnimationFrame(() => requestAnimationFrame(() => {
          gBP.querySelectorAll('path').forEach(p => { p.style.strokeDashoffset = '0'; p.style.fillOpacity = '1'; });
        }));
      }
      function placeBlueprint() {
        if (!bpDrawn) return;
        // front view (az 0, el 0): screen x = cx + s (Y − T.y), screen y = cy − s (Z − T.z); the 2D paths are (Y, −Z)
        const V = V1;
        gBP.setAttribute('transform', `translate(${rr(V.cx - V.s * V.T[1])} ${rr(V.cy + V.s * V.T[2])}) scale(${V.s.toFixed(4)})`);
      }

      /* ---------------------------------------------------------------- loading */
      function loadScript(src, test) {
        if (test()) return Promise.resolve();
        return new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = src; s.async = true;
          s.onload = () => (test() ? res() : rej(new Error('script ' + src)));
          s.onerror = () => rej(new Error('script ' + src));
          document.head.append(s);
        });
      }
      function fetchJSON(url) { return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }); }
      // (total(): the byte length from biped.json once it has landed, else the response's own length when it is not
      // compressed; the two downloads run side by side)
      async function fetchBin(url, total, onProg) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(url + ' ' + r.status);
        if (!r.body || !r.body.getReader) return r.arrayBuffer();
        const cl = r.headers.get('content-encoding') ? 0 : +r.headers.get('content-length') || 0;
        const rd = r.body.getReader(), chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          chunks.push(value); got += value.length;
          onProg(Math.min(1, got / (total() || cl || 1.2e6)));
        }
        const out = new Uint8Array(got);
        let o = 0;
        for (const c of chunks) { out.set(c, o); o += c.length; }
        return out.buffer;
      }
      let prog = { bin: 0, three: 0 };
      function showProgress(phase) {
        if (G.failed || G.ready) return;
        const p = Math.round((prog.bin * 0.86 + prog.three * 0.14) * 100);
        loadEl.textContent = phase || `loading model · ${p}%`;
      }
      function placeLoad() {
        // (before the model's size is known: where it will sit, under the robot's feet)
        if (!meta) { const r = artRect(false); loadEl.style.left = Math.round((r.x0 + r.x1) / 2) + 'px'; loadEl.style.top = Math.round(L.bottom - 4) + 'px'; return; }
        const g = proj(V1, -12, 0, 0);
        loadEl.style.left = Math.round(g.x) + 'px';
        loadEl.style.top = Math.round(Math.min(L.bottom - 4, g.y + 28)) + 'px';   // (above core's hint row)
      }

      function startLoad() {
        const tLoad = performance.now();
        const pMeta = fetchJSON(BASE + 'biped.json');
        const p2d = fetchJSON(BASE + 'biped-2d.json').catch(() => null);
        const pThree = loadScript(THREE_SRC, () => !!window.THREE).then(() => { prog.three = 1; showProgress(); });
        const pLoader = loadScript(BASE + 'biped-loader.js', () => !!(window.Site && window.Site.biped));
        const pBin = fetchBin(BASE + 'biped.bin', () => (meta ? meta.binary.byteLength : 0), f => { prog.bin = f; showProgress(); });
        // (any can fail before Promise.all below is attached: the failure is handled there, not unhandled here)
        pThree.catch(() => {}); pLoader.catch(() => {}); pBin.catch(() => {});
        pMeta.then(m => {
          meta = m; NP = m.parts.length;
          m.parts.forEach((p, i) => { PI[p.id] = i; });
          for (const k of ['ex', 'fade', 'tint']) { TG[k] = new Array(NP).fill(0); CU[k] = new Array(NP).fill(0); }
          refit();
          if (STEPS[S.step] && !STILL) stepEnter(S.step);
          placeLoad();
          // the blueprint only if the 3D model is not already close
          p2d.then(j => { d2 = j; setTimeout(() => { if (!G.ready) drawBlueprint(); }, Math.max(0, 220 - (performance.now() - tLoad))); });
          return Promise.all([pBin, pThree, pLoader]);
        }).then(([buf]) => {
          model = window.Site.biped.decode(meta, buf);
          showProgress('preparing model');
          return buildThree();
        }).then(ok => {
          if (!ok) throw new Error('WebGL unavailable');
          G.ready = true;
          bindContextLoss();
          loadEl.style.opacity = '0';
          frame(performance.now() / 1000, 0, true);
          glCanvas.classList.add('is-on');
          if (bpDrawn) gBP.style.opacity = '0';
          setTimeout(() => { gBP.textContent = ''; }, 900);
          if (!STILL) setTimeout(preloadPhoto, 600);
          S.pickN = 0;
          if (STILL) finishStill();
        }).catch(err => {
          console.warn('[robot] 3D view unavailable:', err && err.message ? err.message : err);
          G.failed = true;
          if (!STILL) preloadPhoto();
          loadEl.textContent = '3D view unavailable · showing the front drawing';
          if (d2) drawBlueprint();
          // (said once; then out of the way of the captions and core's hint, with the drawing standing in)
          if (!STILL) setTimeout(() => { loadEl.style.opacity = '0'; }, 4500);
          if (STILL) { window.__robotReady = true; }
        });
      }

      // WebGL context loss (iOS backgrounding, a GPU reset): show the front drawing until the context comes back, then
      // restore the white clear colour (three.js resets it to black) and the size, and draw again
      function bindContextLoss() {
        if (G.ctxBound || STILL) return;
        G.ctxBound = true;
        glCanvas.addEventListener('webglcontextlost', e => {
          e.preventDefault();
          if (!G.ready) return;
          G.ready = false; G.lost = true;
          glCanvas.classList.remove('is-on');
          placePanels();                            // (no live joint readouts beside a drawing that does not move)
          hover = null;
          endOv();                                  // (no dimension lines hanging over an empty canvas)
          bpDrawn = false; gBP.textContent = ''; gBP.style.opacity = '';
          drawBlueprint();
        });
        glCanvas.addEventListener('webglcontextrestored', () => {
          if (!G.lost) return;
          G.lost = false;
          const r = G.renderer;
          r.setClearColor(0xffffff, 1);
          r.autoClear = false;
          r.setPixelRatio(G.dpr);
          r.setSize(W, H);
          G.res.value.set(W * G.dpr, H * G.dpr);
          G.ready = true;
          placePanels();
          frame(performance.now() / 1000, 0, true);
          glCanvas.classList.add('is-on');
          if (bpDrawn) gBP.style.opacity = '0';
          setTimeout(() => { if (G.ready) { gBP.textContent = ''; bpDrawn = false; } }, 900);
        });
      }

      /* ---------------------------------------------------------------- three.js */
      const tick0 = () => new Promise(r => setTimeout(r, 0));
      async function buildThree() {
        const T3 = window.THREE;
        let renderer;
        try {
          renderer = new T3.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false, preserveDrawingBuffer: STILL, powerPreference: 'default' });
        } catch (e) { return false; }
        if (!renderer.getContext()) return false;
        renderer.setClearColor(0xffffff, 1);
        renderer.autoClear = false;
        const dpr = STILL ? (window.devicePixelRatio || 1) : Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H);
        G.renderer = renderer; G.dpr = dpr;
        const scene = new T3.Scene();
        const root = new T3.Group();
        root.matrixAutoUpdate = false;
        root.matrix.set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1); // (x3, y3, z3) = (Y, Z, X): the robot is Z-up
        root.matrixWorldNeedsUpdate = true;
        scene.add(root);
        G.scene = scene; G.root = root;
        G.cam = new T3.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
        G.cam2 = new T3.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
        const res = { value: new T3.Vector2(W * dpr, H * dpr) };
        G.res = res;
        // 1 CSS px lines on HiDPI: the line set is drawn with 1-device-px offsets
        G.passes = dpr >= 1.5 ? [[0, 0], [1, 0], [0, 1]] : [[0, 0]];
        const acc = new T3.Color(0x1432F5);
        const light = new T3.Vector3(-0.42, 0.62, 0.66).normalize();
        G.objs = []; G.meshes = [];
        let tChunk = performance.now();
        for (let i = 0; i < model.parts.length; i++) {
          const p = model.parts[i];
          const face = faceGeometry(p);
          const geo = new T3.BufferGeometry();
          geo.setAttribute('position', new T3.BufferAttribute(face.pos, 3));
          geo.setAttribute('normal', new T3.BufferAttribute(face.nor, 3));
          geo.setAttribute('aCol', new T3.BufferAttribute(face.col, 3));
          geo.computeBoundingSphere();
          geo.computeBoundingBox();   // (lets a pick ray skip a part's triangles unless it crosses the part's box)
          const fu = { uAcc: { value: acc }, uTint: { value: 0 }, uFade: { value: 0 }, uL: { value: light } };
          const fm = new T3.ShaderMaterial({ uniforms: fu, vertexShader: FACE_VS, fragmentShader: FACE_FS, side: T3.DoubleSide,
            polygonOffset: true, polygonOffsetFactor: 1.2, polygonOffsetUnits: 1.5 });
          const mesh = new T3.Mesh(geo, fm);
          mesh.matrixAutoUpdate = false;
          mesh.userData.i = i;
          root.add(mesh);
          const eg = edgeGeometry(p, T3);
          const lc = { value: new T3.Color(0, 0, 0) };
          const lines = G.passes.map(([ox, oy]) => {
            const lm = new T3.ShaderMaterial({ uniforms: { uColor: lc, uRes: res, uPx: { value: new T3.Vector2(ox, oy) } },
              vertexShader: LINE_VS, fragmentShader: LINE_FS, depthWrite: false });
            const ls = new T3.LineSegments(eg, lm);
            ls.matrixAutoUpdate = false;
            ls.renderOrder = 1;
            root.add(ls);
            return ls;
          });
          G.objs.push({ mesh, lines, fu, lc: lc.value, vis: true });
          G.meshes.push(mesh);
          if (performance.now() - tChunk > 14) { await tick0(); tChunk = performance.now(); }
        }
        // turntable ring (steps 1 and 7) and the walking floor
        {
          const R = 150, n = 120, P = [];
          for (let k = 0; k < n; k++) {
            const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
            if (k % 2) continue; // dashed
            P.push(-12 + R * Math.cos(a0), R * Math.sin(a0), 0, -12 + R * Math.cos(a1), R * Math.sin(a1), 0);
          }
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2;
            P.push(-12 + (R - 8) * Math.cos(a), (R - 8) * Math.sin(a), 0, -12 + (R + 8) * Math.cos(a), (R + 8) * Math.sin(a), 0);
          }
          G.ring = plainLines(new Float32Array(P), T3, 0.72);
        }
        {
          const P = [];
          // a floor of hairline cross-ties, 40 mm apart across the feet's track, that scrolls with the stance foot (seen
          // from 9° above, + marks foreshortened into grey squiggles; ties stay clean lines)
          for (let x = -420; x < 420; x += 40) P.push(x, -96, 0, x, 110, 0);
          G.floorU = { uColor: { value: new T3.Color(0.72, 0.72, 0.72) }, uOp: { value: 0 }, uScroll: { value: 0 }, uRes: res };
          const geo = new T3.BufferGeometry();
          geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(P), 3));
          G.floor = G.passes.map(([ox, oy]) => {
            const m = new T3.ShaderMaterial({ uniforms: Object.assign({ uPx: { value: new T3.Vector2(ox, oy) } }, G.floorU),
              vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, depthWrite: false });
            const ls = new T3.LineSegments(geo, m);
            ls.frustumCulled = false; ls.renderOrder = 1; ls.visible = false;
            root.add(ls);
            return ls;
          });
        }
        G.ray = new T3.Raycaster();
        G.ndc = new T3.Vector2();
        return true;
      }
      function plainLines(P, T3, grey) {
        const geo = new T3.BufferGeometry();
        const n = P.length / 3;
        geo.setAttribute('position', new T3.BufferAttribute(P, 3));
        geo.setAttribute('nA', new T3.BufferAttribute(new Float32Array(n * 3), 3));
        geo.setAttribute('nB', new T3.BufferAttribute(new Float32Array(n * 3), 3));
        geo.setAttribute('feat', new T3.BufferAttribute(new Float32Array(n).fill(1), 1));
        const col = { value: new T3.Color(grey, grey, grey) };
        const objs = G.passes.map(([ox, oy]) => {
          const m = new T3.ShaderMaterial({ uniforms: { uColor: col, uRes: G.res, uPx: { value: new T3.Vector2(ox, oy) } },
            vertexShader: LINE_VS, fragmentShader: LINE_FS, depthWrite: false });
          const ls = new T3.LineSegments(geo, m);
          ls.renderOrder = 1; ls.visible = false;
          G.root.add(ls);
          return ls;
        });
        return { objs, col: col.value, grey };
      }

      // Non-indexed faces with crease-aware smooth normals (shells shade smoothly, box edges stay crisp)
      function faceGeometry(p) {
        const Pp = p.positions, I = p.indices, nT = I.length / 3, nV = p.vertexCount;
        const fn = new Float32Array(nT * 3);
        for (let t = 0; t < nT; t++) {
          const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
          const ux = Pp[b] - Pp[a], uy = Pp[b + 1] - Pp[a + 1], uz = Pp[b + 2] - Pp[a + 2];
          const vx = Pp[c] - Pp[a], vy = Pp[c + 1] - Pp[a + 1], vz = Pp[c + 2] - Pp[a + 2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const l = Math.hypot(nx, ny, nz) || 1;
          fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l;
        }
        const start = new Uint32Array(nV + 1);
        for (let k = 0; k < I.length; k++) start[I[k] + 1]++;
        for (let v = 0; v < nV; v++) start[v + 1] += start[v];
        const fill = start.slice(0, nV), adj = new Uint32Array(I.length);
        for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const v = I[3 * t + k]; adj[fill[v]++] = t; }
        const cosC = Math.cos(creaseDeg(p.role) * D2R);
        const triCol = new Array(nT);
        for (const g of p.groups) { const c = matColor(g.material, g.color); for (let t = g.start; t < g.start + g.count; t++) triCol[t] = c; }
        const pos = new Float32Array(nT * 9), nor = new Float32Array(nT * 9), col = new Float32Array(nT * 9);
        for (let t = 0; t < nT; t++) {
          const fx = fn[3 * t], fy = fn[3 * t + 1], fz = fn[3 * t + 2];
          const c = triCol[t] || [0.9, 0.9, 0.9];
          for (let k = 0; k < 3; k++) {
            const v = I[3 * t + k], o = 9 * t + 3 * k;
            let sx = 0, sy = 0, sz = 0;
            for (let j = start[v]; j < start[v + 1]; j++) {
              const f = adj[j], gx = fn[3 * f], gy = fn[3 * f + 1], gz = fn[3 * f + 2];
              if (fx * gx + fy * gy + fz * gz >= cosC) { sx += gx; sy += gy; sz += gz; }
            }
            const l = Math.hypot(sx, sy, sz) || 1;
            pos[o] = Pp[3 * v]; pos[o + 1] = Pp[3 * v + 1]; pos[o + 2] = Pp[3 * v + 2];
            nor[o] = sx / l; nor[o + 1] = sy / l; nor[o + 2] = sz / l;
            col[o] = c[0]; col[o + 1] = c[1]; col[o + 2] = c[2];
          }
        }
        return { pos, nor, col };
      }
      // Every edge with its two face normals (+ a crease flag); coplanar interior edges are dropped
      function edgeGeometry(p, T3) {
        const e = window.Site.biped.edges(p, creaseDeg(p.role));
        const fn = e.faceNormals, Pp = p.positions, m = e.feature.length;
        const pos = [], na = [], nb = [], ft = [];
        for (let i = 0; i < m; i++) {
          const fa = e.faceA[i], fb = e.faceB[i] < 0 ? fa : e.faceB[i];
          const ax = fn[3 * fa], ay = fn[3 * fa + 1], az = fn[3 * fa + 2], bx = fn[3 * fb], by = fn[3 * fb + 1], bz = fn[3 * fb + 2];
          if (!e.feature[i] && ax * bx + ay * by + az * bz > 0.99995) continue;
          const a = e.pairs[2 * i] * 3, b = e.pairs[2 * i + 1] * 3;
          pos.push(Pp[a], Pp[a + 1], Pp[a + 2], Pp[b], Pp[b + 1], Pp[b + 2]);
          na.push(ax, ay, az, ax, ay, az);
          nb.push(bx, by, bz, bx, by, bz);
          const f = e.feature[i] ? 1 : 0;
          ft.push(f, f);
        }
        const geo = new T3.BufferGeometry();
        geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('nA', new T3.BufferAttribute(new Float32Array(na), 3));
        geo.setAttribute('nB', new T3.BufferAttribute(new Float32Array(nb), 3));
        geo.setAttribute('feat', new T3.BufferAttribute(new Float32Array(ft), 1));
        geo.computeBoundingSphere();
        return geo;
      }

      function setCam(cam, V) {
        const B = V.B, T = V.T;
        const t3 = [T[1], T[2], T[0]], d3 = [B.d[1], B.d[2], B.d[0]], u3 = [B.u[1], B.u[2], B.u[0]];
        cam.position.set(t3[0] + d3[0] * 2500, t3[1] + d3[1] * 2500, t3[2] + d3[2] * 2500);
        cam.up.set(u3[0], u3[1], u3[2]);
        cam.lookAt(t3[0], t3[1], t3[2]);
        cam.left = -V.cx / V.s; cam.right = (W - V.cx) / V.s; cam.top = V.cy / V.s; cam.bottom = -(H - V.cy) / V.s;
        cam.near = 1; cam.far = 5000;
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld(true);
      }

      /* ---------------------------------------------------------------- pose */
      let mats = null, rootShift = 0, restMats = null;
      function poseMats(ang) {
        const B = window.Site.biped;
        let m0 = B.pose(model, ang);
        const sh = B.groundShift(model, m0);
        if (Math.abs(sh) > 0.01) {
          const R = B.mat4.ident(); R[14] = sh;
          m0 = B.pose(model, ang, { root: R });
        }
        return { m: m0, sh };
      }
      function computePose() {
        if (!window.Site.biped || !model) return;
        const p = poseMats(CU.ang);
        mats = p.m; rootShift = p.sh;
      }
      // a joint's pivot in the rest pose (all angles 0)
      function restJoint(jid) {
        if (!restMats) { const z = {}; JOINTS.forEach(j => { z[j] = 0; }); restMats = poseMats(z).m; }
        const j = model.joints[jid];
        return mulP(restMats[j.parent], j.pivot);
      }
      const mulP = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]];
      const mulD = (M, p) => [M[0] * p[0] + M[4] * p[1] + M[8] * p[2], M[1] * p[0] + M[5] * p[1] + M[9] * p[2], M[2] * p[0] + M[6] * p[1] + M[10] * p[2]];
      // world position of a rest-pose point on part i (link transform + explode)
      function wp(i, p) {
        const P = meta.parts[i], q = mats ? mulP(mats[P.link], p) : p.slice(), e = CU.ex[i] || 0, x = P.explode;
        return [q[0] + x[0] * e, q[1] + x[1] * e, q[2] + x[2] * e];
      }
      // screen y of the top of part i's (posed, exploded) bounding box in view V1
      function topOf(i) {
        const b = meta.parts[i].bbox;
        let y = 1e9;
        for (const X of [b.min[0], b.max[0]]) for (const Y of [b.min[1], b.max[1]]) for (const Z of [b.min[2], b.max[2]]) y = Math.min(y, projP(V1, wp(i, [X, Y, Z])).y);
        return y;
      }
      const centerOf = i => { const b = meta.parts[i].bbox; return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; };
      function jointWorld(jid) {
        const j = model.joints[jid], M = mats[j.parent];
        return { p: mulP(M, j.pivot), a: mulD(M, j.axis) };
      }

      /* ---------------------------------------------------------------- sound */
      // The bed: a low grain cloud (D3–A4, the site's shared texture) over the electronics' fan, level-matched to the
      // other scenes' opening steps (an analyser on the master, 1440 × 900: Assembled −27.7 dB RMS, lpwm's opening −27.6;
      // the other steps −28.7 … −32.7). The steps with their own event sounds (snaps, servos, footsteps) duck it; the two turntable
      // steps add sparse clock-quantised foley: a tuned tick on most other beats and, every two bars, the turntable
      // servo nudging.
      let soundOn = false, fan = null, bed = null, offClock = null;
      //            [bed gain, fan speed, fan gain]
      const MIX = { assembled: [1.7, 0.3, 0.75], parts: [1.3, 0.22, 0.45], brain: [1.1, 0.45, 0.9], joints: [0.9, 0.22, 0.4],
        dims: [1.25, 0.22, 0.5], walk: [0.35, 0.22, 0.3], hand: [1.7, 0.3, 0.75] };
      const lastSfx = {};
      function sfx(name, a, b, gap) {
        if (!soundOn || STILL) return;
        const now = performance.now();
        if (gap && lastSfx[name] && now - lastSfx[name] < gap) return;
        lastSfx[name] = now;
        const au = A(), bus = api.bus();
        if (!au || !au.play || !au.play[name] || !bus) return;
        try {
          if (typeof a === 'number') au.play[name](a, Object.assign({ dest: bus }, b || {}));
          else au.play[name](Object.assign({ dest: bus }, a || {}));
        } catch (e) { /* sound must never break the page */ }
      }
      function uiSfx(name, o) { if (!soundOn || STILL) return; try { const au = A(); au && au.ui && au.ui[name] && au.ui[name](o); } catch (e) { /* ok */ } }
      function fanLevel(id) {
        const m = MIX[id] || MIX.assembled;
        if (fan) try { fan.set({ speed: m[1], gain: m[2] }, 1.6); } catch (e) { /* ok */ }
        if (bed) try { bed.set({ gain: m[0] }, 1.4); } catch (e) { /* ok */ }
      }
      const pick = arr => arr[Math.floor(Math.random() * arr.length)];
      function onClock(step, time) {
        if (!soundOn || S.paused) return;
        const id = STEPS[S.step].id, au = A();
        if ((id !== 'assembled' && id !== 'hand') || !au || !au.degree) return;
        const r = Math.random;
        if (step % 8 === 0 && r() < 0.62) sfx('tick', au.degree(pick([0, 1, 2, 3, 4]), 1), { when: time, gain: 0.16 + r() * 0.08, pan: (r() * 2 - 1) * 0.55 });
        if (step % 32 === 20) sfx('servo', { when: time, from: 50 + pick([0, 2]), to: 55, dur: 0.34, load: 0.25, gain: 0.3 + r() * 0.08 });
      }
      function startBed() {
        stopBed();
        const au = A(), bus = api.bus();
        if (!au || !bus) return;
        const m = MIX[STEPS[S.step].id] || MIX.assembled, d = (i, o) => au.degree(i, o);
        try { fan = au.fan({ speed: m[1], gain: m[2], attack: 3, dest: bus }); } catch (e) { fan = null; }
        try { bed = au.granular({ density: 2.4, pitch: [d(0, -1), d(2, -1), d(4, -1), d(0, 0), d(3, 0)], dur: 0.1, spread: 0.9, bright: 0.1, octave: 0, jitter: 0.8, detune: 6, gain: m[0], attack: 1.6, dest: bus }); } catch (e) { bed = null; }
        try { if (au.clock && typeof au.clock.on === 'function') offClock = au.clock.on(onClock); } catch (e) { offClock = null; }
      }
      function stopBed() {
        if (offClock) { try { offClock(); } catch (e) { /* ok */ } offClock = null; }
        if (fan) { try { fan.stop(0.5); } catch (e) { /* ok */ } fan = null; }
        if (bed) { try { bed.stop(0.8); } catch (e) { /* ok */ } bed = null; }
      }

      /* ---------------------------------------------------------------- steps */
      const focus = (ids, tint) => {
        for (let i = 0; i < NP; i++) { TG.fade[i] = ids && !ids(meta.parts[i]) ? 0.86 : 0; TG.tint[i] = 0; }
        if (tint) for (let i = 0; i < NP; i++) if (tint(meta.parts[i])) TG.tint[i] = 1;
      };
      const zeroAng = () => JOINTS.forEach(j => { TG.ang[j] = 0; });

      function stepEnter(i) {
        if (!meta) return;
        const id = STEPS[i].id;
        S.orbitDecay = true;
        S.stanceX = null; S.stance = null; S.lastJointPhase = -1; S.lastDock = 0; S.chimed = false; S.lifted = false; S.dimsShown = 0;
        S.keyN = 0; S.keysDone = false; S.dimsSide = undefined; S.dimsT0 = 0; S.jActive = null; S.busN = -1;
        hover = null;   // (a label pinned on the last step would float over this one)
        ancGen++;
        for (let k = 0; k < NP; k++) TG.ex[k] = 0;
        zeroAng(); focus(null);
        TG.ring = 0; TG.floor = 0;
        if (id === 'assembled') { TG.ring = 1; }
        if (id === 'brain') {
          const keep = new Set(['torso_frame', 'deck', 'pi', 'battery', 'buck', 'busboard', 'servo_hip_yaw_R', 'servo_hip_yaw_L', 'horn_hip_yaw_R', 'horn_hip_yaw_L']);
          focus(p => keep.has(p.id));
        }
        if (id === 'joints') focus(p => p.group !== 'torso' && p.group !== 'electronics');
        if (id === 'walk') TG.floor = 1;
        if (id === 'hand') {
          TG.ring = 1;
          // replay the photo's wipe each time the step opens
          if (!imgHand.getAttribute('src')) ensureImg(imgHand, PHOTO.id);
          else {
            imgHand.classList.remove('is-in');
            setTimeout(() => { if (STEPS[S.step].id === 'hand' && imgHand.complete && imgHand.naturalWidth) imgHand.classList.add('is-in'); }, 120);
          }
        }
        fanLevel(id);
        refit();
        placePanels();
      }

      function goStep(i, fromUser) {
        i = ((i % STEPS.length) + STEPS.length) % STEPS.length;
        const changed = i !== S.step || !S.entered;
        S.step = i; S.t = 0; S.entered = true;
        if (fromUser) touch();
        if (!STILL) {
          stepper.set(i);
          stepText();
        }
        if (changed) stepEnter(i);
        updHead(true);
      }
      // the step's headline (phones get the short sub) and caption (touch screens: "tap", not "hover")
      function stepText() {
        const st = STEPS[S.step];
        L.textM = L.m; L.textT = L.touch;
        // (touch tablets ≥ 800 px get the full sub with "tap" for "hover")
    const sub = L.m ? st.ms || st.sub : L.touch && st.subT ? st.subT : st.sub;
    api.headline(st.head, sub, { key: st.id + (L.m ? ':m' : L.touch ? ':t' : '') });
        api.caption(L.touch && st.capT ? st.capT : st.cap);
      }
      function touch() { S.lastInteract = performance.now() / 1000; }

      // Per-step animation: sets targets (TG, T1/T2) from the step clock t. dt is the paused-aware frame time.
      function stepFrame(t, dt) {
        const id = STEPS[S.step].id;
        if (id === 'assembled') {
          // (front-on while the blueprint is showing, so the model appears exactly where the drawing was)
          if (!S.paused && !pointer.down && !REDUCED && G.ready) S.spin += 7 * dt;
          T1.az = G.ready ? 24 + S.spin : 0;
          T1.el = G.ready ? 9 : 0;
        } else if (id === 'parts') {
          const tt = REDUCED ? 5 : t;
          T1.az = 32 + (REDUCED ? 0 : 7 * Math.sin(tt * 0.32));
          let dockNow = 0;
          for (let i = 0; i < NP; i++) {
            const st = meta.parts[i].assemblyStep || 1;
            const o0 = 0.55 + (16 - st) * 0.035;
            const dock = 9.9 + (st - 1) * 0.24;
            let e;
            if (tt < 9.4) e = eio((tt - o0) / 1.5);
            else e = 1 - ein((tt - (dock - 0.36)) / 0.36);
            TG.ex[i] = e;
            if (tt >= dock && S.lastDock < st) dockNow = Math.max(dockNow, st);
          }
          if (!REDUCED) {
            if (t > 0.5 && !S.lifted) { S.lifted = true; sfx('pneumatic', { kind: 'release', dur: 0.5, pressure: 0.35, gain: 0.45 }); }
            if (dockNow > S.lastDock) {
              S.lastDock = dockNow;
              sfx('snap', { size: 0.25 + 0.03 * (16 - dockNow), metal: 0.45, gain: 0.7 });
            }
            const tc = 9.9 + 15 * 0.24 + 0.28;
            if (t > tc && !S.chimed) {
              S.chimed = true;
              sfx('chime', 69, { dur: 0.9, vel: 0.5, gain: 0.45 });
              sfx('chime', 74, { dur: 1.0, vel: 0.55, gain: 0.45, when: (A() && A().now ? A().now() : 0) + 0.09 });
            }
          }
        } else if (id === 'brain') {
          T1.az = BRAIN_AZ + (REDUCED ? 0 : 6 * Math.sin(t * 0.3));
          const lift = REDUCED ? 1 : eio((t - 0.5) / 1.3);
          for (const id in BRAIN_LIFT) TG.ex[PI[id]] = BRAIN_LIFT[id] * lift;
          if (!S.lifted && t > 0.5 && !REDUCED) { S.lifted = true; sfx('arm', { dur: 1.1, to: 57, from: 45, gain: 0.35 }); }
        } else if (id === 'joints') {
          T1.az = -58;
          jointsFrame(REDUCED ? 5.1 : t);
        } else if (id === 'dims') {
          // dims draw on in sequence (see drawDims); phones and tablets alternate front and side
          if (L.dimsAlt) {
            const side = !REDUCED && t > STEPS[S.step].dur * 0.5;
            if (side !== S.dimsSide) { S.dimsSide = side; S.dimsT0 = t; }
            const src = side ? T2 : T1;
            V1._target = { az: src.az, el: src.el, s: src.s, cx: src.cx, cy: src.cy };
          }
        } else if (id === 'walk') {
          T1.az = -74;
          if (!S.paused && !REDUCED) S.phase += dt * 0.55;
          const ph = REDUCED ? 0.18 : S.phase;
          const g = window.Site.biped.gait(ph, { hip: 18, knee: 35, crouch: 8 });
          JOINTS.forEach(j => { TG.ang[j] = g[j] || 0; });
        } else if (id === 'hand') {
          T1.az = 20 + (REDUCED ? 0 : 26 * Math.sin(t * 0.33));
        }
      }

      // joints: hip yaw, hip pitch, knee, ankle one at a time (both legs), then a foot-flat squat
      const JSEQ = [
        { j: 'hip_yaw', m: 59, f: u => 15 * Math.sin(2 * Math.PI * u) },
        { j: 'hip_pitch', m: 52, f: u => { const s = Math.sin(2 * Math.PI * u); return s >= 0 ? -30 * s : -25 * s; } },
        { j: 'knee', m: 57, f: u => 45 * Math.sin(Math.PI * u) },
        { j: 'ankle', m: 62, f: u => 30 * Math.sin(2 * Math.PI * u) },
        { j: 'squat', m: 50, f: u => 50 * Math.sin(Math.PI * u) },
      ];
      const JPH = 2.8, J0 = 0.8;
      function jointsFrame(t) {
        let k = Math.floor((t - J0) / JPH);
        const u = clamp(((t - J0) % JPH) / JPH, 0, 1);
        zeroAng();
        for (let i = 0; i < NP; i++) TG.tint[i] = 0;
        if (t < J0 || k >= JSEQ.length) { S.jActive = null; if (k >= JSEQ.length) k = -1; if (k < 0) return; }
        const q = JSEQ[k];
        S.jActive = q.j;
        const v = q.f(u);
        for (const sd of ['R', 'L']) {
          if (q.j === 'squat') {
            TG.ang['knee_' + sd] = v; TG.ang['hip_pitch_' + sd] = -v / 2; TG.ang['ankle_' + sd] = -v / 2;
          } else TG.ang[q.j + '_' + sd] = v;
        }
        // the moving servos (and their horns) in blue
        const re = q.j === 'squat' ? /^(servo|horn)_(hip_pitch|knee|ankle)_/ : new RegExp('^(servo|horn)_' + q.j + '_');
        for (let i = 0; i < NP; i++) if (re.test(meta.parts[i].id)) TG.tint[i] = 1;
        // a whir per stroke: at the start of the phase and at the turn
        const turn = q.j === 'knee' || q.j === 'squat' ? 0.5 : 0.25;
        const mark = k * 4 + (u >= turn ? 1 : 0) + (u >= 0.75 && turn === 0.25 ? 1 : 0);
        if (mark !== S.lastJointPhase && !REDUCED) {
          const first = S.lastJointPhase < 0 || Math.floor(S.lastJointPhase / 4) !== k;
          S.lastJointPhase = mark;
          const up = (mark % 2) === 0;
          sfx('servo', { from: up ? q.m : q.m + 5, to: up ? q.m + 5 : q.m, dur: JPH * (q.j === 'knee' || q.j === 'squat' ? 0.42 : 0.22), load: 0.35, gain: first ? 0.7 : 0.55 });
        }
      }

      /* ---------------------------------------------------------------- overlay per step */
      function drawOverlay(t) {
        if (!meta || !mats) { endOv(); return; }
        const id = STILL ? 'still' : STEPS[S.step].id;
        S.hvLabel = false;
        ancBudget = STILL ? 1e4 : 3;
        if (id === 'assembled') drawAssembled(t);
        else if (id === 'parts') drawParts(REDUCED ? 5 : t);
        else if (id === 'brain') drawBrain(REDUCED ? 5 : t);
        else if (id === 'joints') drawJoints(REDUCED ? 5 : t);
        else if (id === 'dims') drawDims(REDUCED ? 9 : t);
        else if (id === 'walk') drawWalk();
        else if (id === 'hand') drawHand(REDUCED ? 5 : t);
        else if (id === 'still' && RENDER === 'exploded' && RQ.get('labels') === '1') drawParts(5, true);
        if (hover && !STILL) drawHover();
        endOv();
      }

      function drawAssembled(t) {
        const V = V1, k = clamp((t - 0.7) / 1.4, 0, 1), k2 = clamp((t - 1.3) / 1.4, 0, 1);
        const R = maxRadius();
        // overall height: screen-space, right of the turntable's silhouette
        const g = proj(V, V.T[0], 0, 0), tp = proj(V, V.T[0], 0, TOP);
        const x = V.cx + V.s * R + (L.m ? 22 : 34);
        dimVraw('h', x, g.y, tp.y, `446.2${NB}mm`, k);
        // width and depth on the torso's top edges, whichever face the camera, drawn above the whole model: the
        // extension lines start clear of the Pi and the battery (their tops are 20 mm over the rim, and the Pi's ports
        // sit further back, so they look higher still) and the dimension lines run over empty paper
        const a = V.az * D2R;
        const gap = (TOP - TORSO.z1 + 20) * V.s, off = gap + (L.m ? 16 : 22);
        const xe = Math.cos(a) >= 0 ? TORSO.x1 : TORSO.x0, ye = Math.sin(a) >= 0 ? TORSO.y1 : TORSO.y0;
        dim3('w', V, [xe, TORSO.y0, TORSO.z1], [xe, TORSO.y1, TORSO.z1], [0, 0, 1], off, '165', k2, { gap });
        dim3('dp', V, [TORSO.x0, ye, TORSO.z1], [TORSO.x1, ye, TORSO.z1], [0, 0, 1], off, '160', k2, { gap });
      }
      // vertical dimension with short horizontal extension ticks toward the robot
      function dimVraw(key, x, y0, y1, label, k, dir) {
        if (k <= 0) return;
        const X = cr(x), ya = cr(y0), yb = cr(y1), my = (ya + yb) / 2, sd = dir || -1;
        const ke = sstep(k / 0.4), kd = sstep((k - 0.25) / 0.6), kt = sstep((k - 0.6) / 0.4);
        ln(key + 'ea', X + sd * 16 * ke, ya, X - sd * 7, ya, 'g');
        ln(key + 'eb', X + sd * 16 * ke, yb, X - sd * 7, yb, 'g');
        if (kd > 0) {
          ln(key + 'd', X, lerp(my, ya, kd), X, lerp(my, yb, kd));
          if (kd > 0.98) { ln(key + 'ta', X - 4, ya + 4, X + 4, ya - 4); ln(key + 'tb', X - 4, yb + 4, X + 4, yb - 4); }
        }
        // the value on the line at mid-height, on its white plate (the line clears the legs there)
        if (kt > 0) tx(key + 'l', X, my + 4, label, '', 'middle', kt);
      }
      let maxR = 0;
      function maxRadius() {
        if (maxR) return maxR;
        if (!meta) return 121;
        const P = pts();
        for (let i = 0; i < P.length; i += 3) maxR = Math.max(maxR, Math.hypot(P[i] + 12, P[i + 1]));
        return maxR;
      }

      // Every part: one label per design, with its count (1+1+1+1+2+2+8+8+2+2+2 = the 30 parts); `m` matches the parts
      // a label stands for (hovering any of them turns that label blue instead of opening a card)
      const PART_LABELS = [
        { id: 'pi', m: /^pi$/, name: 'Raspberry Pi', sub: `85 × 56${NB}mm board` },
        { id: 'battery', m: /^battery$/, name: 'Battery pack', sub: `109.5 × 63 × 24.1${NB}mm` },
        { id: 'deck', m: /^deck$/, name: 'Deck', sub: `3.5${NB}mm plate` },
        { id: 'torso_frame', m: /^torso_frame$/, name: 'Torso frame', sub: `165 × 160 × 80${NB}mm` },
        { id: 'buck', m: /^(buck|busboard)$/, name: 'Converter, bus board', sub: 'one each, in the torso' },
        { id: 'yoke_L', m: /^yoke_/, name: `Hip yoke ×${NB}2`, sub: `56.5 × 56.5 × 42.5${NB}mm` },
        { id: 'servo_hip_pitch_L', m: /^servo_/, name: `LX-16A servo ×${NB}8`, sub: `four per leg, 52${NB}g each` },
        { id: 'horn_knee_L', m: /^horn_/, name: `Servo horn ×${NB}8`, sub: 'one per servo' },
        { id: 'thigh_L', m: /^thigh_/, name: `Thigh ×${NB}2`, sub: `Ø59.1 × 121.4${NB}mm`, acc: true },
        { id: 'shin_L', m: /^shin_/, name: `Shin ×${NB}2`, sub: `Ø59.1 × 121.4${NB}mm`, acc: true },
        { id: 'foot_L', m: /^foot_/, name: `Foot ×${NB}2`, sub: `77 × 55 × 57.1${NB}mm` },
      ];
      // (phones show every label too, one line each, so the counts still add up to 30; a tapped part opens its size card)
      function drawParts(t, still) {
        const k = still ? 1 : clamp((t - 2.3) / 1.2, 0, 1) * (1 - clamp((t - 9.1) / 0.4, 0, 1));
        if (k <= 0) return;
        const items = [];
        const hvId = hover && hover.i != null && k > 0.5 ? meta.parts[hover.i].id : null;
        PART_LABELS.forEach((d, j) => {
          const i = PI[d.id];
          if (i == null) return;
          // on a visible point of the part, toward its right-hand side (the Pi's right edge, for one, is behind the
          // battery: its leader starts on the Pi's left half and climbs above the battery before it turns right)
          const isPi = d.id === 'pi';
          const a = isPi ? anchorOf('plpi', i, -1, [0.45, 0.25, 0.65]) : anchorOf('pl' + d.id, i, 1, [0.72, 0.5, 0.3, 0.1]);
          const on = !!(hvId && d.m.test(hvId) && !still);
          if (on && !L.m) S.hvLabel = true;
          const it = { id: d.id, a, name: d.name, sub: L.m ? '' : d.sub, acc: d.acc || on, delay: still ? 0 : j * 0.045 };
          if (isPi && PI.battery != null) { it.up = true; it.ly = Math.min(a.y, topOf(PI.battery) - 12); }
          items.push(it);
        });
        let colX = 0;
        items.forEach(it => { colX = Math.max(colX, it.a.x); });
        const nw = L.m ? items.reduce((m, it) => Math.max(m, tw(it.name)), 0) + 4 : 190;
        colX = Math.min(colX + (L.m ? 22 : 46), W - L.gut - Math.max(L.m ? 96 : 190, nw));
        leaders('pl', items, colX, 'start', k, L.m ? 22 : 34);
        if (!still && !REDUCED && k > 0 && !S.keysDone) {
          const n = Math.floor(k / 0.07);
          if (n > (S.keyN || 0)) { S.keyN = n; sfx('key', { kind: 'press', vel: 0.3, gain: 0.35 }, null, 60); }
          if (k >= 1) S.keysDone = true;
        }
      }

      // explode amounts for Brain & power: the Pi and battery lift 72 mm, the deck 38 mm (see parts[].explode)
      const BRAIN_LIFT = { pi: 0.48, battery: 0.48, deck: 0.38 };
      // (splay: a min-area fit of each hip-yaw servo body in biped.bin is 45.0 × 25.0 mm at ±25.0°)
      // left column: the parts left of the torso's centre at BRAIN_AZ; the rest on the right
      const BRAIN_LABELS = [
        { id: 'pi', name: 'Raspberry Pi', sub: `85 × 56${NB}mm board`, acc: true, left: true },
        { id: 'busboard', name: 'Servo bus board', sub: 'to all 8 servos', acc: true, left: true },
        { id: 'buck', name: 'Step-down converter', sub: `61 × 27 × 23.5${NB}mm` },
        { id: 'battery', name: 'Battery pack', sub: 'switch + DC jack' },
        { id: 'deck', name: 'Deck', sub: `3.5${NB}mm plate` },
        { id: 'servo_hip_yaw_R', name: 'Hip-yaw servos', sub: 'upright, splayed ±25°', left: true },
        { id: 'torso_frame', name: 'Torso frame', sub: `165 × 160 × 80${NB}mm` },
      ];
      // Brain & power looks in through the open front from the robot's front-left, so the bus board (back right, on
      // the box floor) shows between the two hip-yaw servos
      const BRAIN_AZ = 36;
      const labW = list => list.reduce((m, d) => Math.max(m, tw(d.name), tw(d.sub || '')), 0);
      const nameW = list => list.reduce((m, d) => Math.max(m, tw(d.name)), 0);
      function drawBrain(t) {
        const k = clamp((t - 1.4) / 1.6, 0, 1);
        if (k <= 0) return;
        const left = [], right = [];
        BRAIN_LABELS.forEach((d, j) => {
          const i = PI[d.id];
          if (i == null) return;
          // a visible point of the part, from its centre toward its label's side
          const a = anchorOf('b' + d.id, i, d.left && !brainCol() ? -1 : 1, [0, 0.3, 0.55, 0.8]);
          const it = { id: d.id, a, name: d.name, sub: L.m ? '' : d.sub, acc: d.acc, delay: j * 0.06 };
          (d.left ? left : right).push(it);
        });
        if (brainCol()) {
          leaders('bl', left.concat(right), W - L.gut - brainColW(), 'start', k, L.m ? 20 : 34);
          return;
        }
        // column edges: just outside the torso's projected box
        let x0 = 1e9, x1 = -1e9;
        for (const X of [TORSO.x0, TORSO.x1]) for (const Y of [TORSO.y0, TORSO.y1]) for (const Z of [TORSO.z0, TORSO.z1 + 60]) {
          const q = proj(V1, X, Y, Z); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
        }
        leaders('bl', left, Math.max(L.left + labW(left) + 4, x0 - 36), 'end', k, 34);
        leaders('br', right, Math.min(x1 + 36, W - L.gut - L.panelW - 44 - labW(right) - 8), 'start', k, 34);
      }

      function drawJoints(t) {
        const kk = clamp((t - 0.3) / 1.2, 0, 1);
        if (kk <= 0) return;
        const act = S.jActive;
        const sides = ['R', 'L'];
        // axis markers on both legs; labels on the near (right) leg
        const js = ['hip_yaw', 'hip_pitch', 'knee', 'ankle'];
        const labs = [];
        sides.forEach(sd => {
          js.forEach(j => {
            const w = jointWorld(j + '_' + sd);
            const on = act === j || (act === 'squat' && j !== 'hip_yaw');
            const p = projP(V1, w.p);
            const L0 = j === 'hip_yaw' ? 30 : 46;
            const pa = projP(V1, [w.p[0] - w.a[0] * L0, w.p[1] - w.a[1] * L0, w.p[2] - w.a[2] * L0]);
            const pb = projP(V1, [w.p[0] + w.a[0] * L0, w.p[1] + w.a[1] * L0, w.p[2] + w.a[2] * L0]);
            const cls = on ? 'dd a' : 'dd g';
            const op = kk * (sd === 'R' ? 1 : 0.75);
            ln('ja' + j + sd, pa.x, pa.y, pb.x, pb.y, cls, op);
            ci('jc' + j + sd, p.x, p.y, 4.5, on ? 'a' : '', op);
            ln('jx' + j + sd, p.x - 7, p.y, p.x + 7, p.y, on ? 'a' : '', op);
            ln('jy' + j + sd, p.x, p.y - 7, p.x, p.y + 7, on ? 'a' : '', op);
            if (sd === 'R') {
              // the label column and the label rows come from the rest pose, so they hold still while the joints move
              const r0 = projP(V1, restJoint(j + '_' + sd));
              labs.push({ id: j, a: { x: p.x, y: p.y }, r0, ly: r0.y, name: JN[j], sub: '', acc: on });
            }
          });
        });
        // labels to the left of the near leg
        let minX = 1e9;
        labs.forEach(l => { minX = Math.min(minX, l.r0.x); });
        const colX = Math.max(L.left + (L.m ? 64 : 80), minX - (L.m ? 70 : 124));
        leaders('jl', labs, colX, 'end', kk, L.m ? 20 : 26);
        // chain dimensions on the far side of the right leg: hip pitch → knee → ankle → sole
        const hp = jointWorld('hip_pitch_R').p, kn = jointWorld('knee_R').p, an = jointWorld('ankle_R').p;
        const sole = [an[0], an[1], an[2] - 46.42];
        const fw = mulD(mats.foot_R, [0, 0, -1]);
        sole[0] = an[0] + fw[0] * 46.42; sole[1] = an[1] + fw[1] * 46.42; sole[2] = an[2] + fw[2] * 46.42;
        const kd = clamp((t - 0.9) / 1.2, 0, 1);
        // offset direction: screen-left perpendicular in the sagittal plane (backwards in X)
        const off = L.m ? 44 : 58;
        dim3('c1', V1, hp, kn, perpBack(hp, kn), off, '127.0', kd, { labelAt: 'side', gap: 34 });
        dim3('c2', V1, kn, an, perpBack(kn, an), off, '127.0', kd, { labelAt: 'side', gap: 34 });
        // (phones: the ankle's 46.4 would sit on the ankle label; the headline carries it)
        if (!L.m) dim3('c3', V1, an, sole, perpBack(an, sole), off, '46.4', kd, { labelAt: 'side', gap: 34 });
      }
      // unit vector perpendicular to AB in the robot's sagittal plane, pointing backward (−X side)
      function perpBack(A, B) {
        const dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz) || 1;
        let px = -dz / l, pz = dx / l;
        if (px > 0) { px = -px; pz = -pz; }
        return [px, 0, pz];
      }

      function drawDims(t) {
        const pr = i => clamp((t - 0.7 - i * 0.3) / 0.7, 0, 1);
        const views = [];
        if (L.dimsAlt) views.push({ V: V1, kind: S.dimsSide ? 'side' : 'front', t0: S.dimsT0 || 0 });
        else { views.push({ V: V1, kind: 'front', t0: 0 }); if (CU.dual > 0.6) views.push({ V: V2, kind: 'side', t0: 0 }); }
        let n = 0;
        const capEdge = {};
        for (const { V, kind, t0 } of views) {
          const q = i => pr(i) * (L.dimsAlt ? clamp((t - t0) / 0.6, 0, 1) : 1);
          const g0 = proj(V, 0, 0, 0);
          const gx0 = proj(V, kind === 'front' ? 0 : -110, kind === 'front' ? -100 : 0, 0).x;
          const gx1 = proj(V, kind === 'front' ? 0 : 75, kind === 'front' ? 100 : 0, 0).x;
          ln(kind + 'gnd', gx0 - 16, cr(g0.y), gx1 + 16, cr(g0.y), 'g');
          const lab = proj(V, 0, 0, 0);
          const capS = kind === 'front' ? 'FRONT' : 'SIDE · RIGHT', capX = (gx0 + gx1) / 2;
          tx(kind + 'cap', capX, lab.y + (L.m ? 44 : 48), capS, 'cap', 'middle', q(0));
          capEdge[kind] = kind === 'front' ? capX + tw(capS) / 2 : capX - tw(capS) / 2;
          if (kind === 'front') {
            const pi = meta.parts[PI.pi].bbox, fR = meta.parts[PI.foot_R].bbox, fL = meta.parts[PI.foot_L].bbox;
            const xl = proj(V, 0, TORSO.y0, 0).x - (L.m ? 26 : 34);
            dimV('fh', V, [0, pi.min[1], TOP], [0, fR.min[1], 0], xl, '446.2', q(0), -1);
            const yt = proj(V, 0, 0, TOP).y - (L.m ? 18 : 24);
            dimH('fw', V, [0, TORSO.y0, TORSO.z1], [0, TORSO.y1, TORSO.z1], yt, '165', q(1));
            const xr = proj(V, 0, TORSO.y1, 0).x + (L.m ? 20 : 26);
            dimV('ft', V, [0, TORSO.y1, TORSO.z1], [0, TORSO.y1, TORSO.z0], xr, '80', q(2), 1);
            const yb = g0.y + (L.m ? 18 : 22);
            dimH('ff', V, [0, fL.min[1], 0], [0, fL.max[1], 0], yb, '55', q(3));
            // hip-yaw axes: centre lines through the torso floor
            for (const y of [-41.37, 41.37]) {
              const a = proj(V, 0, y, 312), b = proj(V, 0, y, 372);
              ln('fc' + y, cr(a.x), a.y, cr(b.x), b.y, 'dd g', q(4));
            }
            const hy = proj(V, 0, 0, 318).y;
            dimH('fs', V, [0, -41.37, 318], [0, 41.37, 318], hy, '', q(4));
            // The value sits under the line, centred in the white gap between the two hip-pitch servos (≈ 37 mm), clear
            // of both. Where that gap is narrower than the value (phones), the line runs on past the right leg and the
            // value stands outside it, as on a drawing when a dimension is too tight for its text.
            if (q(4) > 0.6) {
              const kv = sstep((q(4) - 0.6) / 0.4);
              if (37 * V.s >= tw('82.7') + 14) tx('fsl', proj(V, 0, -1.5, 0).x, hy + 15, '82.7', '', 'middle', kv);
              else {
                const xe = proj(V, 0, 41.37, 0).x, xo = proj(V, 0, 74, 0).x + 4;
                ln('fsx', xe, cr(hy), lerp(xe, xo, kv), cr(hy), '', kv);
                tx('fsl', xo + 6, hy + 4, '82.7', '', 'start', kv);
              }
            }
          } else {
            const fR = meta.parts[PI.foot_R].bbox;
            const yt = proj(V, 0, 0, TOP).y - (L.m ? 18 : 24);
            dimH('sd', V, [TORSO.x0, 0, TORSO.z1], [TORSO.x1, 0, TORSO.z1], yt, '160', q(0));
            const hp = 300.42, kn = 173.42, an = 46.42;
            const xr = proj(V, TORSO.x1, 0, 0).x + (L.m ? 18 : 30);
            const fx = 14; // the servo's front face at each pitch axis
            dimV('s1', V, [fx, 0, hp], [fx, 0, kn], xr, '127.0', q(1), 1);
            dimV('s2', V, [fx, 0, kn], [fx, 0, an], xr, '127.0', q(2), 1);
            dimV('s3', V, [fx, 0, an], [fR.max[0], 0, 0], xr, '46.4', q(3), 1);
            const xl = proj(V, -20.2, 0, 0).x - (L.m ? 20 : 30);
            // (its value beside the line, on the open paper under the torso, not on a plate over the shin)
            dimV('s0', V, [-30, 0, hp], [-20.2, 0, 0], xl, '300.4', q(4), -1, true);
            const yb = g0.y + (L.m ? 18 : 22);
            dimH('sf', V, [fR.min[0], 0, 0], [fR.max[0], 0, 0], yb, '77', q(5));
            // pivots
            [hp, kn, an].forEach((z, j) => {
              const p = proj(V, 0, 0, z);
              ci('sp' + j, p.x, p.y, 4.5, 'a', q(1 + j));
              ln('spx' + j, p.x - 8, p.y, p.x + 8, p.y, 'a', q(1 + j));
              ln('spy' + j, p.x, p.y - 8, p.x, p.y + 8, 'a', q(1 + j));
            });
          }
          n++;
        }
        // compile ticks as each dimension lands
        if (!REDUCED) {
          const c = Math.floor((t - 0.7) / 0.3) + 1;
          if (c > (S.dimsShown || 0) && c <= 7 && t > 0.9) { S.dimsShown = c; sfx('compile', { progress: c / 7, gain: 0.55 }, null, 70); }
        }
        // scale bar (desktop): 100 mm, between the two view captions: its value beside it when that fits, else above it
        if (!L.m && CU.dual > 0.6 && capEdge.front != null && capEdge.side != null) {
          const s = V1.s, bw = 100 * s, y = proj(V1, 0, 0, 0).y + 48, lab = `100${NB}mm`;
          const a0 = capEdge.front + 16, a1 = capEdge.side - 16;
          const k = pr(6);
          const beside = bw + 8 + tw(lab) <= a1 - a0;
          if (k > 0 && (beside || bw <= a1 - a0)) {
            const x0 = beside ? (a0 + a1) / 2 - (bw + 8 + tw(lab)) / 2 : (a0 + a1) / 2 - bw / 2;
            ln('sb', cr(x0), cr(y), cr(x0 + bw), cr(y), '', k);
            for (let m = 0; m <= 100; m += 50) ln('sbt' + m, cr(x0 + m * s), cr(y) - (m === 50 ? 3 : 5), cr(x0 + m * s), cr(y) + (m === 50 ? 3 : 5), '', k);
            if (beside) tx('sbl', x0 + bw + 8, y + 4, lab, 's', 'start', k);
            else tx('sbl', x0 + bw / 2, y - 10, lab, 's', 'middle', k);
          }
        }
        void n;
      }

      function drawWalk() {
        // the stance foot's sole in blue (level on the floor); the swinging foot's in light grey, so it never reads as a
        // blue line drawn through the other foot
        for (const sd of ['R', 'L']) {
          const i = PI['foot_' + sd], b = meta.parts[i].bbox;
          const a = projP(V1, wp(i, [b.min[0], b.min[1] + 3, b.min[2]])), c = projP(V1, wp(i, [b.max[0], b.min[1] + 3, b.min[2]]));
          const st = (S.stance || 'R') === sd;
          ln('sole' + sd, a.x, a.y, c.x, c.y, st ? 'a' : 'l', st ? 1 : 0.4);
        }
        // ankle pivot marker (right leg)
        const an = projP(V1, jointWorld('ankle_R').p);
        ci('wan', an.x, an.y, 4.5, 'a');
        ln('wanx', an.x - 8, an.y, an.x + 8, an.y, 'a');
        ln('wany', an.x, an.y - 8, an.x, an.y + 8, 'a');
      }

      // In hand: two hairline guides carry the model's ground and top across to the robot in the photo
      function drawHand(t) {
        const hd = L.hand;
        if (!hd) return;
        const k = clamp((t - 1.1) / 1.4, 0, 1);
        if (k <= 0) return;
        // (compact: the model stands right beside the photo, so the guides start at its far side, like extension lines)
        const x0 = hd.dim ? hd.mx + hd.mR + 8 : hd.mx - hd.mR, x1 = hd.x - 12, kg = sstep(k);
        for (const [key, y] of [['hgt', hd.yt], ['hgb', hd.yb]]) {
          ln(key, cr(x0), cr(y), cr(lerp(x0, x1, kg)), cr(y), 'g d');
          sq(key + 'q', x1 + 5, cr(y), 3, 'f', sstep((k - 0.7) / 0.3));
        }
        if (hd.dim) dimVraw('hdm', hd.mx - hd.mR - 30, hd.yb, hd.yt, `446.2${NB}mm`, clamp((t - 1.6) / 1.4, 0, 1), 1);
        // its caption on the photo caption's baseline; phones: above the model (the two captions would run together
        // on one baseline there, the model being narrower than its caption)
        if (L.m) tx('hcap', hd.mx, hd.yt - 16, 'CAD MODEL', 'cap', 'middle', sstep((k - 0.3) / 0.7));
        else tx('hcap', hd.mx, hd.capY, 'CAD MODEL', 'cap', 'middle', sstep((k - 0.3) / 0.7));
      }

      // the size line, broken at " · " into lines no wider than maxW (size first)
      function wrapDots(str, maxW) {
        if (!str) return [];
        const out = [];
        let cur = '';
        for (const seg of str.split(' · ')) {
          const next = cur ? cur + ' · ' + seg : seg;
          if (cur && tw(next) > maxW) { out.push(cur); cur = seg; } else cur = next;
        }
        if (cur) out.push(cur);
        return out;
      }
      function drawHover() {
        const h = hover;
        if (!h || h.i == null || S.hvLabel) return;
        const p = meta.parts[h.i];
        const [name, sub] = partInfo(p);
        let x = h.x, y = h.y;
        // a pinned (tapped) label follows the point it was pinned to as the robot turns
        if (h.pinned && h.lp) { const q = projP(h.v === 2 ? V2 : V1, wp(h.i, h.lp)); x = q.x; y = q.y; }
        const lines = [name].concat(wrapDots(sub, L.m ? Math.min(250, W - 2 * L.gut - 12) : 420));
        const w = lines.reduce((m, s) => Math.max(m, tw(s)), 0);
        const bw = w + 12, bh = 20 + 15 * (lines.length - 1);
        // beside the point (right, or left when that runs off the screen), then clamped inside the gutters
        const dir = x + 34 + bw > W - L.gut ? -1 : 1;
        const lx = x + dir * 22;
        let ly = y - 22;
        const yMin = (L.m ? L.top : 70) + 11, yMax = H - (L.m ? 104 : 76) - bh + 11;
        if (ly < yMin) ly = Math.min(y + 30, yMax); else if (ly > yMax) ly = yMax;
        const bx = clamp(dir > 0 ? lx + 6 : lx - 6 - bw, L.gut - 6, W - L.gut - bw + 6);
        let by = ly - 11;
        let path;
        if (x > bx - 10 && x < bx + bw + 10) {
          // too wide to sit beside the point (phones): the card goes above it (below, near the top), leader straight up / down
          by = y - 20 - bh;
          if (by < yMin - 11) by = Math.min(y + 20, yMax - 11);
          ly = by + 11;
          path = [[x, y], [x, by > y ? by : by + bh]];
        } else {
          // leader: from the point to the card's near edge, along the first line
          path = [[x, y], [lx, ly], [dir > 0 ? Math.max(bx, lx) : Math.min(bx + bw, lx), ly]];
        }
        // an opaque white card (on top of the leaders) with the name in accent and the size in grey
        const bg = node('hvbg', 'rect', gHv);
        at(bg, 'x', rr(bx)); at(bg, 'y', rr(by)); at(bg, 'width', rr(bw)); at(bg, 'height', String(bh)); at(bg, 'class', 'pl');
        const q = node('hvq', 'rect', gHv);
        at(q, 'x', rr(x - 2.5)); at(q, 'y', rr(y - 2.5)); at(q, 'width', '5'); at(q, 'height', '5'); at(q, 'class', 'fa');
        const l = node('hvl', 'polyline', gHv);
        at(l, 'points', path.map(p => rr(p[0]) + ',' + rr(p[1])).join(' ')); at(l, 'class', 'a');
        lines.forEach((s, j) => {
          const t = node('hvt' + j, 'text', gHv);
          if (t._t !== s) { t._t = s; t.textContent = s; }
          at(t, 'x', rr(bx + 6)); at(t, 'y', rr(ly + 4 + 15 * j)); at(t, 'text-anchor', 'start'); at(t, 'class', j ? 's' : 'a');
        });
        // labels the card lands on are hidden while it shows (no half-covered glyphs peeking out from under it)
        const m = 5, cx0 = bx - m, cx1 = bx + bw + m, cy0 = by - m, cy1 = by + bh + m;
        for (const pk of used) {
          if (pk.slice(0, 5) !== 'rect:' || pk.slice(-2) !== '_p') continue;
          const pn = pool.get(pk), a = pn._a;
          const px0 = +a.x, py0 = +a.y, px1 = px0 + +a.width, py1 = py0 + +a.height;
          if (px1 < cx0 || px0 > cx1 || py1 < cy0 || py0 > cy1) continue;
          const tn = pool.get('text:' + pk.slice(5, -2));
          for (const n of [pn, tn]) if (n && !n._hid) { n.style.display = 'none'; n._hid = true; }
        }
      }

      /* ---------------------------------------------------------------- per-frame update + render */
      function smoothViews(dt) {
        const k = kf(STILL ? 1e3 : 4.2, dt), kz = kf(STILL ? 1e3 : 3.6, dt);
        if (S.orbitDecay && !pointer.down) {
          S.orbitAz *= 1 - kf(2.2, dt); S.orbitEl *= 1 - kf(2.2, dt);
          if (Math.abs(S.orbitAz) < 0.05 && Math.abs(S.orbitEl) < 0.05) { S.orbitAz = 0; S.orbitEl = 0; S.orbitDecay = false; }
        }
        const t1 = V1._target || T1;
        V1._target = null;
        const az = t1.az + S.orbitAz, el = clamp(t1.el + S.orbitEl, -12, 70);
        V1.az += wrap180(az - V1.az) * k;
        V1.el += (el - V1.el) * k;
        V1.s += (t1.s - V1.s) * kz; V1.cx += (t1.cx - V1.cx) * kz; V1.cy += (t1.cy - V1.cy) * kz;
        V2.az += wrap180(T2.az - V2.az) * k; V2.el += (T2.el - V2.el) * k;
        V2.s += (T2.s - V2.s) * kz; V2.cx += (T2.cx - V2.cx) * kz; V2.cy += (T2.cy - V2.cy) * kz;
        prep(V1); prep(V2);
        CU.dual += (TG.dual - CU.dual) * kf(3, dt);
        if (Math.abs(TG.dual - CU.dual) < 0.002) CU.dual = TG.dual;
      }
      function smoothParts(dt) {
        const id = STILL ? '' : STEPS[S.step].id;
        const ke = kf(STILL ? 1e3 : id === 'parts' ? 22 : 7, dt), kc = kf(STILL ? 1e3 : 6, dt), ka = kf(STILL ? 1e3 : 13, dt);
        for (let i = 0; i < NP; i++) {
          CU.ex[i] += (TG.ex[i] - CU.ex[i]) * ke;
          CU.fade[i] += (TG.fade[i] - CU.fade[i]) * kc;
          const ht = hover && hover.i === i ? 1 : 0;
          const tt = Math.max(TG.tint[i], ht);
          CU.tint[i] += (tt - CU.tint[i]) * kf(ht ? 16 : 7, dt);
        }
        JOINTS.forEach(j => { CU.ang[j] += (TG.ang[j] - CU.ang[j]) * ka; });
        CU.ring += (TG.ring - CU.ring) * kc;
        CU.floor += (TG.floor - CU.floor) * kc;
      }
      function applyParts() {
        const acc = [20 / 255, 50 / 255, 245 / 255];
        for (let i = 0; i < NP; i++) {
          const P = meta.parts[i], o = G.objs[i], M = mats[P.link], e = CU.ex[i], x = P.explode;
          const m = o.mesh.matrix.elements;
          for (let k = 0; k < 16; k++) m[k] = M[k];
          m[12] += x[0] * e; m[13] += x[1] * e; m[14] += x[2] * e;
          const hv = hover && hover.i === i;
          const fade = hv ? 0 : CU.fade[i], tint = CU.tint[i];
          const vis = fade < 0.985;
          o.mesh.visible = vis;
          o.mesh.matrixWorldNeedsUpdate = true;
          o.fu.uTint.value = tint; o.fu.uFade.value = fade;
          const g = lerp(0, 0.84, fade);
          o.lc.setRGB(lerp(g, acc[0], tint), lerp(g, acc[1], tint), lerp(g, acc[2], tint));
          for (const ls of o.lines) { ls.matrix.copy(o.mesh.matrix); ls.matrixWorldNeedsUpdate = true; ls.visible = vis; }
        }
        // ring + floor
        const rOn = CU.ring > 0.01;
        G.ring.objs.forEach(o => { o.visible = rOn; });
        G.ring.col.setScalar(lerp(1, G.ring.grey, CU.ring));
        const fOn = CU.floor > 0.01;
        G.floor.forEach(o => { o.visible = fOn; });
        G.floorU.uOp.value = CU.floor;
      }
      function render() {
        const r = G.renderer;
        setCam(G.cam, V1);
        r.setScissorTest(false);
        r.clear(true, true, true);
        r.setScissorTest(true);
        const clipB = L.clipB || 0;
        const hh = H - clipB;
        if (CU.dual > 0.002) {
          const split = L.split || W / 2;
          const cut = Math.round(lerp(W, split, eio(CU.dual)));
          r.setScissor(0, clipB, cut, hh);
          r.render(G.scene, G.cam);
          setCam(G.cam2, V2);
          r.clearDepth();
          r.setScissor(cut, clipB, W - cut, hh);
          r.render(G.scene, G.cam2);
        } else {
          r.setScissor(0, clipB, W, hh);
          r.render(G.scene, G.cam);
        }
      }

      // Render only when something on the canvas changed (the camera, a part's pose / explode / fade / tint, the ring,
      // the floor, the hover): a paused or settled drawing costs no GPU time.
      const sigBuf = new Float64Array(256), sigLast = new Float64Array(256);
      let sigN = 0, forceRender = true;
      function canvasChanged() {
        let n = 0;
        const put = v => { if (n < 256) sigBuf[n++] = v; };
        for (const V of [V1, V2]) { put(V.az); put(V.el); put(V.s); put(V.cx); put(V.cy); }
        put(CU.dual); put(CU.ring); put(CU.floor); put(G.floorU ? G.floorU.uScroll.value : 0);
        put(W); put(H); put(L.clipB || 0); put(L.split || 0); put(hover ? hover.i : -1);
        for (let i = 0; i < NP; i++) { put(CU.ex[i]); put(CU.fade[i]); put(CU.tint[i]); }
        for (const j of JOINTS) put(CU.ang[j]);
        let diff = forceRender || n !== sigN;
        for (let k = 0; !diff && k < n; k++) if (Math.abs(sigBuf[k] - sigLast[k]) > 1e-4) diff = true;
        if (diff) { sigLast.set(sigBuf.subarray(0, n)); sigN = n; }
        forceRender = false;
        return diff;
      }

      let frameN = 0;
      function frame(t, dt, force) {
        if (!meta) return;
        if (force) forceRender = true;
        // phones: re-lay out once core's sound invite goes away (the first tap), so the art uses that room again
        if (!STILL && L.m && ++frameN % 20 === 0 && inviteUp() !== L.invite) refit();
        if (!STILL && S.entered) {
          const sid = STEPS[S.step].id;
          // (phones show Dimensions one view at a time: a paused visitor gets the finished front view)
          if (!S.paused || S.t < (sid === 'dims' && L.dimsAlt ? 5 : SETTLE[sid])) S.t += dt;
          // autoplay
          const st = STEPS[S.step];
          if (!REDUCED && !S.paused && S.t > st.dur && performance.now() / 1000 - S.lastInteract > 6 && !(hover && pointer.in) && !pointer.down) {
            goStep(S.step + 1, false);
          }
          stepFrame(S.t, S.paused ? 0 : dt);
        }
        smoothViews(dt);
        smoothParts(dt);
        if (G.ready && model) {
          computePose();
          walkFloor();
          if (canvasChanged()) { applyParts(); render(); }
        } else if (model || meta) {
          placeBlueprint();
          placeLoad();
        }
        if (G.ready) drawOverlay(S.t);
        // the part under a still pointer changes as the robot turns: re-pick now and then
        if (G.ready && pointer.in && !pointer.down && !(hover && hover.pinned) && (S.pickN = (S.pickN || 0) + 1) % 12 === 0) schedulePick();
        updHead(false);
        updReadouts();
        void t;
      }
      // walk: the floor moves with the stance foot; a footstep sound when the stance changes
      function walkFloor() {
        if (!G.ready) return;
        if (STEPS[S.step].id !== 'walk' || STILL) { S.stanceX = null; return; }
        const zR = mats.foot_R[14], zL = mats.foot_L[14];
        const st = zR <= zL ? 'R' : 'L';
        const x = mats['foot_' + st][12];
        if (S.stance === st && S.stanceX != null) G.floorU.uScroll.value += x - S.stanceX;
        if (S.stance && S.stance !== st && !S.paused) {
          sfx('sub', 45, { dur: 0.14, gain: 0.5 }, null, 200);
          sfx('tick', 81, { gain: 0.35, pan: st === 'R' ? -0.2 : 0.2 });
          sfx('servo', { from: 52, to: 56, dur: 0.22, load: 0.5, gain: 0.3 }, null, 300);
        }
        S.stance = st; S.stanceX = x;
      }

      /* ---------------------------------------------------------------- header, readouts */
      const pad2 = n => String(n).padStart(2, '0');
      const stepLabel = i => `${pad2(i + 1)} / ${pad2(STEPS.length)} · ${STEPS[i].label}`;
      let headK = -1, headTxt = '';
      // 801–1100 px: the headline box is at least 420 px wide and can reach under the step header; there the header
      // drops the step name (the stepper beside the art shows it) rather than run into the headline's first line
      function headFits(txt) { return !L.hlRight || L.hlRight + 14 <= W - 40 - tw(txt); }
      function updHead(force) {
        if (STILL) return;
        const full = stepLabel(S.step);
        const txt = L.m || headFits(full) ? full : `${pad2(S.step + 1)} / ${pad2(STEPS.length)}`;
        const stt = S.paused ? 'paused · [space]' : REDUCED ? '↑ ↓ to step' : 'autoplay';
        if (force || txt + stt !== headTxt) {
          headTxt = txt + stt;
          headLab.textContent = txt;
          headSt.textContent = stt;
          head.classList.toggle('is-paused', S.paused);
          mTxt.textContent = txt + (S.paused ? ' · paused' : '');
          mLab.classList.toggle('is-paused', S.paused);
          mLab.setAttribute('aria-label', `Step ${S.step + 1} of ${STEPS.length}, ${STEPS[S.step].label}. ${S.paused ? 'Paused: tap to play' : 'Playing: tap to pause'}`);
          head.setAttribute('aria-label', `${txt}. ${S.paused ? 'Paused. Click to play' : 'Playing. Click to pause'}`);
        }
        const p = REDUCED ? 1 : clamp(S.t / STEPS[S.step].dur, 0, 1);
        const k = Math.round(p * 200);
        if (k !== headK) { headK = k; const s = `scaleX(${(k / 200).toFixed(3)})`; headBarI.style.transform = s; mPgI.style.transform = s; }
      }
      // Brain & power: a command packet leaves the Pi, crosses the bus board and runs down the chain to servo k;
      // only servo k lights (IDs 1…8 in turn). One quiet bit per reply.
      const BUS_T0 = 1.6, BUS_C = 1.35, BUS_GO = 0.52;
      function busFrame(t) {
        let on = -1, px = -10, py = -10, show = false;
        if (!REDUCED && t >= BUS_T0) {
          const n = Math.floor((t - BUS_T0) / BUS_C), u = ((t - BUS_T0) % BUS_C) / BUS_C, k = n % 8;
          const x = BUS.x0 + 0.5, xk = BUS.x0 + k * BUS.pitch;
          const segs = [[x, 35, x, 66], [x, 66, x, 101], [x, 101, x, BUS.yChain + 0.5], [x, BUS.yChain + 0.5, xk, BUS.yChain + 0.5]];
          const lens = segs.map(q => Math.hypot(q[2] - q[0], q[3] - q[1]));
          const D = lens.reduce((a, b) => a + b, 0);
          if (u < BUS_GO) {
            let d = eio(u / BUS_GO) * D, j = 0;
            while (j < segs.length - 1 && d > lens[j]) { d -= lens[j]; j++; }
            const q = segs[j], f = lens[j] ? Math.min(1, d / lens[j]) : 1;
            px = lerp(q[0], q[2], f); py = lerp(q[1], q[3], f);
            show = j !== 1;                      // inside the bus board: hidden
          } else {
            on = k;
            if (S.busN !== n) { S.busN = n; sfx('bit', 69 + [0, 2, 4, 7, 9, 12, 14, 16][k], { gain: 0.16, pan: (k - 3.5) * 0.08 }); }
          }
        }
        if (BUS.on !== on) {
          BUS.on = on;
          BUS.svs.forEach((r, j) => r.classList.toggle('is-on', j === on));
          BUS.ids.forEach((r, j) => r.setAttribute('class', j === on ? 'a' : 's'));
        }
        if (BUS.show !== show) { BUS.show = show; BUS.pk.setAttribute('opacity', show ? '1' : '0'); }
        if (show) { BUS.pk.setAttribute('x', (px - 3).toFixed(1)); BUS.pk.setAttribute('y', (py - 3).toFixed(1)); }
      }
      function setRow(row, v) { const s = fmt(v) + '°'; if (row.last !== s) { row.last = s; row.v.textContent = s; } }
      const r1 = v => Math.round(v * 10) / 10;
      function updReadouts() {
        if (STILL || !meta || G.lost) return;
        const id = STEPS[S.step].id;
        if (id === 'joints' && L.side) {
          for (const j of ['hip_yaw', 'hip_pitch', 'knee', 'ankle']) {
            setRow(jRows[j], CU.ang[j + '_R']);
            const on = S.jActive === j || (S.jActive === 'squat' && j !== 'hip_yaw');
            if (jRows[j].on !== on) { jRows[j].on = on; jRows[j].r.classList.toggle('is-on', on); }
          }
        }
        if (id === 'brain' && !brainCol()) busFrame(S.t);
        if (id === 'walk' && L.side) {
          // the rows are rounded first and the ankle is worked out from the rounded values, so the check line adds up
          // (the gait keeps ankle = −(hip + knee) exactly)
          const h = r1(CU.ang.hip_pitch_R), k = r1(CU.ang.knee_R), a = r1(-(h + k));
          setRow(wRows.hip_pitch, h); setRow(wRows.knee, k); setRow(wRows.ankle, a);
          const eq = `−(${fmt(h)} ${k >= 0 ? '+' : '−'} ${Math.abs(k).toFixed(1)}) = `;
          const pre = tw('ankle = ' + eq + '+00.0°') <= L.panelW ? 'ankle = ' : '';
          const s = `${pre}${eq}<b>${fmt(a)}°</b>`;
          if (wCheck._s !== s) { wCheck._s = s; wCheck.innerHTML = s; }
        }
      }

      /* ---------------------------------------------------------------- interaction */
      // the part under screen point (x, y); `out` (optional) receives the hit point in the part's own rest frame (lp)
      // and the view it was picked in, so a pinned label can follow that point as the robot turns
      function pickAt(x, y, out) {
        if (!G.ready) return null;
        let cam = G.cam;
        if (CU.dual > 0.5 && x > (L.split || W / 2)) cam = G.cam2;
        G.ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
        G.ray.setFromCamera(G.ndc, cam);
        const hits = G.ray.intersectObjects(G.meshes, false);
        for (const hh of hits) {
          const i = hh.object.userData.i;
          if (CU.fade[i] > 0.6 || !hh.object.visible) continue;
          if (out) {
            const q = hh.object.worldToLocal(hh.point.clone());
            out.lp = [q.x, q.y, q.z]; out.v = cam === G.cam2 ? 2 : 1;
          }
          return i;
        }
        return null;
      }
      function schedulePick() {
        if (pickQueued) return;
        pickQueued = true;
        requestAnimationFrame(() => {
          pickQueued = false;
          if (!pointer.in || pointer.down || (hover && hover.pinned)) return;
          const i = pickAt(pointer.x, pointer.y);
          const prev = hover ? hover.i : null;
          hover = i == null ? null : { i, x: pointer.x, y: pointer.y };
          // (rate-limited: a sweep across the model is a few clicks, not a buzz)
          const now = performance.now();
          if (i != null && i !== prev && now - (S.lastHoverSfx || 0) >= 90) { S.lastHoverSfx = now; uiSfx('hover', { gain: 0.6 }); }
        });
      }
      const orbitable = () => STEPS[S.step].id !== 'dims';
      function localXY(e) { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      glCanvas.addEventListener('pointerdown', e => {
        const [x, y] = localXY(e);
        pointer = Object.assign(pointer, { down: true, id: e.pointerId, sx: x, sy: y, x, y, moved: 0, type: e.pointerType, az0: S.orbitAz, el0: S.orbitEl, spin0: S.spin });
        try { glCanvas.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
        el.classList.add('is-dragging');
        touch();
      });
      glCanvas.addEventListener('pointermove', e => {
        const [x, y] = localXY(e);
        pointer.x = x; pointer.y = y; pointer.in = true;
        if (pointer.down && e.pointerId === pointer.id) {
          const dx = x - pointer.sx, dy = y - pointer.sy;
          pointer.moved = Math.max(pointer.moved, Math.hypot(dx, dy));
          if (pointer.moved > 4 && orbitable()) {
            S.orbitDecay = false;
            if (STEPS[S.step].id === 'assembled') { S.spin = pointer.spin0 - dx * 0.45; S.orbitAz = pointer.az0; }
            else S.orbitAz = pointer.az0 - dx * 0.45;
            S.orbitEl = clamp(pointer.el0 + dy * 0.3, -20, 60);
            hover = null;   // (a pinned label too: the part it named is moving away)
            touch();
          }
          return;
        }
        schedulePick();
      });
      const endDrag = e => {
        if (!pointer.down || e.pointerId !== pointer.id) return;
        pointer.down = false;
        el.classList.remove('is-dragging');
        try { glCanvas.releasePointerCapture(e.pointerId); } catch (_) { /* ok */ }
        if (pointer.moved <= 4 && e.type === 'pointerup') {
          // tap / click: pin the part's label (touch), or clear it
          const o = {};
          const i = pickAt(pointer.x, pointer.y, o);
          if (i != null) { hover = { i, x: pointer.x, y: pointer.y, pinned: pointer.type !== 'mouse', lp: o.lp, v: o.v }; uiSfx('select', { gain: 0.6 }); }
          else hover = null;
        }
        touch();
      };
      glCanvas.addEventListener('pointerup', endDrag);
      glCanvas.addEventListener('pointercancel', endDrag);
      glCanvas.addEventListener('pointerleave', () => { pointer.in = false; if (hover && !hover.pinned) hover = null; });
      // horizontal drags orbit the robot here, not change the scene
      ['touchstart', 'touchend'].forEach(ev => glCanvas.addEventListener(ev, e => e.stopPropagation(), { passive: true }));

      head.addEventListener('click', () => { uiSfx('tick'); togglePause(); });
      head.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); uiSfx('tick'); togglePause(); } });
      mPrev.addEventListener('click', e => { e.stopPropagation(); uiSfx('tick'); goStep(S.step - 1, true); });
      mNext.addEventListener('click', e => { e.stopPropagation(); uiSfx('tick'); goStep(S.step + 1, true); });
      mLab.addEventListener('click', e => { e.stopPropagation(); uiSfx('tick'); togglePause(); });
      function togglePause() {
        S.paused = !S.paused;
        touch();
        api.hint(S.paused ? 'Paused' : 'Playing', 1100);
        S.hintAt = performance.now();
        updHead(true);
      }

      const stepper = STILL ? { set() {}, el: null } : api.stepper({
        items: STEPS.map(s => s.label),
        onSelect: (i) => goStep(i, true),
      });
      if (!STILL) api.links([{ label: 'Leg video & build log', href: NOTION }]);

      /* ---------------------------------------------------------------- lifecycle */
      layout();
      if (!STILL) {
        api.onResize(() => {
          layout();
          if (G.ready) { G.renderer.setSize(W, H); G.res.value.set(W * G.dpr, H * G.dpr); }
          forceRender = true;
          // across the 800 px breakpoint the headline's sub (full / short) and the caption change with it
          if (S.entered && api.isActive() && (L.textM !== L.m || L.textT !== L.touch)) stepText();
          refit();
          placeBlueprint(); placeLoad();
        });
        api.onHeadline(() => { const hb = L.hb; layout(); if (Math.abs(L.hb - hb) > 1) refit(); placePanels(); });
        api.loop((t, dt) => frame(t, dt));
      }
      placeLoad();
      startLoad();

      // render mode: one still, no chrome, no motion
      function finishStill() {
        const v = RENDER;
        for (let i = 0; i < NP; i++) { TG.ex[i] = CU.ex[i] = v === 'exploded' ? 1 : 0; TG.fade[i] = CU.fade[i] = 0; TG.tint[i] = CU.tint[i] = 0; }
        if (v === 'walk') { const g = window.Site.biped.gait(0.18, { hip: 18, knee: 35, crouch: 8 }); JOINTS.forEach(j => { TG.ang[j] = CU.ang[j] = g[j] || 0; }); }
        layout();
        G.renderer.setSize(W, H); G.res.value.set(W * G.dpr, H * G.dpr);
        fitStill();
        prep(V1); prep(V2);
        computePose(); applyParts(); render();
        drawOverlay(0);
        window.__robotReady = true;
        document.documentElement.setAttribute('data-robot-ready', '1');
      }
      if (STILL) {
        window.addEventListener('resize', () => { if (G.ready) finishStill(); });
      }

      return {
        enter() {
          if (STILL) return;
          S.entered = false;
          S.paused = false;
          api.hint('');   // (a timed hint from the scene before, e.g. lpwm's, would outlive it here)
          goStep(0, false);
          S.lastInteract = -1e9;
          // (no extra centre hint: the headline's sub and the caption already say "drag to turn, hover a part")
        },
        exit() {
          if (performance.now() - (S.hintAt || -1e9) < 1300) api.hint('');   // (our Paused / Playing hint stays with us)
          pointer.down = false; pointer.in = false; hover = null;
          el.classList.remove('is-dragging');
        },
        sound(on) {
          soundOn = !!on;
          if (on && !STILL) startBed(); else stopBed();
        },
        key(e) {
          if (STILL) return false;
          if (e.key === 'ArrowDown') { uiSfx('tick'); goStep(S.step + 1, true); return true; }
          if (e.key === 'ArrowUp') { uiSfx('tick'); goStep(S.step - 1, true); return true; }
          if (e.key === ' ' || e.code === 'Space') { togglePause(); return true; }
          return false;
        },
      };
    },
  });
})();
