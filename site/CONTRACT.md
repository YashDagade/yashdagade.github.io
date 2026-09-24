# yashdagade.com v2 — build contract

A Paradigm.xyz-inspired personal site. One full-viewport "stage" that swaps between five
animated scenes with keyboard shortcuts `1`–`5`. Vanilla HTML/CSS/JS, no frameworks, no build
step, classic `<script>` tags (no ES modules), served statically (GitHub Pages).

Local server: `http://127.0.0.1:8766/` (preview server rooted at the worktree; already running — never start another).
Worktree root: `/Users/yd211/Documents/GitHub/yashdagade.github.io/.claude/worktrees/paradigm-redesign`

## Reference aesthetic (paradigm.xyz, measured)

- Pure white background, black ink, hairline 1px strokes, lots of empty space. Visualizations are
  precise, mathematical line drawings (thin black lines, dashed guides, `+` markers, small squares,
  dots) with ONE accent color used sparingly for "the thing that matters".
- Paradigm's accent is `#00ff00`. **Ours is deep blue** (`--accent: #1432F5`). Use it the same way:
  sparse highlights, active states, energy/flow, the one line you want the eye on.
- Type: serif wordmark top-center (38px, letter-spacing -0.03em). Everything else is a small
  semi-mono: 12px UI (letter-spacing 0.02em, line-height 15px) and 10px captions/annotations
  (line-height 12.5px). Serif body text 16–18px where prose is needed.
- Chrome: `[M]` pill top-right (menu), `Find [F]` pill bottom-center, scene index bottom-left
  `[1] [2] [3] [4] [5]` where the CURRENT scene renders as `[ ]` (empty brackets), a 2–3 line
  10px caption above the index describing the current visualization, and a left-middle control
  (a vertical stepper list with a tick marker on the active item, or a hairline slider with
  small labels under each end).
- Pills: background `#eeeeee`, radius 14px, 12px mono, padding 6px 12px. Hover → `#dddddd`.
- Motion: calm, precise, continuous. Things draw on (stroke-dashoffset), count up, tick. No bouncy
  easing, no drop shadows, no gradients except very subtle ones in data.

## Design tokens (defined in `site/css/site.css`, mirrored in `Site.colors` / `Site.fonts`)

```
--bg: #ffffff        --ink: #000000       --ink-75: rgba(0,0,0,.75)
--g100: #f6f6f6      --g200: #eeeeee      --g300: #dddddd    --g400: #cccccc
--g500: #999999      --g600: #666666      --g700: #333333
--accent: #1432F5    (deep blue)          --accent-soft: rgba(20,50,245,.12)
--accent-2: #7F93FF  (light blue, secondary series only)
--serif: 'Newsreader', Georgia, 'Times New Roman', serif
--mono:  'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace
```
Fonts are loaded from Google Fonts in `index.html` (Newsreader 400/500 + italic, Geist Mono 300/400/500).
Canvas text: use `Site.fonts.mono` / `Site.fonts.serif` strings.

## Files

```
index.html                     shell markup + script tags (owned by core)
site/css/site.css              tokens + shell + shared component styles (owned by core)
site/js/audio.js               window.Site.audio — sound engine (owned by the audio agent)
site/js/core.js                window.Site — router, keyboard, chrome, palette, menu, scene API (owned by core)
site/js/scenes/lpwm.js         scene 1  (id 'lpwm')
site/js/scenes/lpjepa.js       scene 2  (id 'lpjepa')
site/js/scenes/radialvcreg.js  scene 3  (id 'radial-vcreg')
site/js/scenes/skywindfarm.js  scene 4  (id 'skywindfarm')
site/js/scenes/build.js        scene 5  (id 'build')  (+ optional build-score.js for its music)
site/img/...                   optimized images (JPG/PNG ≤ 1400px wide, ideally ≤ 350 KB)
```
Script load order in index.html: audio.js → core.js → scenes/*.js → `Site.boot()` runs on
DOMContentLoaded. A scene file must ONLY call `Site.register({...})` at top level and must not touch
the DOM until `create()` is called. Scene-private CSS: inject a `<style>` tag inside `create()` with
all selectors prefixed by `.scene--<id>` (never style global elements).

## Scene registration

```js
Site.register({
  id: 'lpwm',                 // slug; URL hash is '#lpwm'
  n: 1,                       // keyboard shortcut / index position
  title: 'LpWM',              // shown in Find palette
  path: '/lpwm',              // shown right-aligned in Find palette
  caption: 'Sparse world models plan further:\nfew active dimensions, stable\nlong-horizon rollouts.',
  create(el, api) {
    // Build DOM/canvas inside `el` (position:absolute; inset:0; class "scene scene--lpwm").
    // Return lifecycle hooks:
    return {
      enter() {},   // scene became visible: (re)start the animation timeline
      exit() {},    // scene hidden: stop timers (api.loop callbacks stop automatically)
      sound(on) {}, // on=true: scene is active AND audio is unlocked AND enabled → start beds, clock subscriptions,
                    //   continuous sources (wind/hum/drone), the scene-5 soundtrack, etc.
                    // on=false: stop ALL of them (called before exit(), and when the user mutes).
                    // Core guarantees ordering: enter() → sound(true) … sound(false) → exit().
                    // sound(true) may arrive long after enter() (audio only unlocks on the first user gesture),
                    // so sync music to the CURRENT timeline position, not to t=0.
                    // One-shot event sounds (a blip when a point lands) can be fired any time from the
                    // animation; they are silent no-ops until audio is ready.
      key(e) { return false }, // optional: handle a keydown not consumed by core; return true if handled
    };
  },
});
```
- `create` is called lazily the first time a scene is shown. `enter` is called every time it is shown
  (including the first). Scenes must be re-enterable: calling exit() then enter() replays cleanly.
- Keys core consumes: `1`–`5`, `ArrowLeft`/`ArrowRight` (prev/next scene), `f` (Find), `m` (menu),
  `s` (sound toggle), `?` (shortcuts), `Escape`. Everything else (Space, ArrowUp/Down, letters,
  Enter) is forwarded to `scene.key(e)`. Convention: Space = pause/play the scene timeline,
  ArrowUp/ArrowDown = previous/next step in the stepper.

## `api` given to `create(el, api)`

```js
api.id, api.n                      // scene id and index
api.el                             // same as el
api.colors                         // { bg, ink, ink75, g100..g700, accent, accentSoft, accent2 }
api.fonts                          // { serif, mono }  (CSS font-family strings)
api.reduced                        // true if prefers-reduced-motion
api.audio                          // === Site.audio
api.bus                            // this scene's audio GainNode getter: api.bus() (null until audio unlocked)
api.isActive()                     // bool
api.loop(fn)                       // fn(t, dt) every animation frame WHILE ACTIVE (t, dt in seconds). returns unsubscribe
api.onResize(fn)                   // fn(w, h) on viewport resize. returns unsubscribe
api.size()                         // { w, h } current stage size in CSS px
api.canvas(parent = el, { z } = {})  // HiDPI canvas filling parent; returns
                                   //   { canvas, ctx, w, h, dpr, clear() } (w/h kept current; ctx pre-scaled by dpr)
api.stepper({ items, onSelect(i, fromUser), index = 0 })
                                   // renders the Paradigm left-middle stepper. returns { set(i), get(), el }
                                   // set(i) moves the tick marker WITHOUT calling onSelect. Clicking an item calls onSelect(i, true)
api.slider({ min, max, step, value, label(v) -> string, left, right, onInput(v) })
                                   // renders the Paradigm left-middle hairline slider with label above
                                   // and `left` / `right` small labels under the ends. returns { set(v), get(), el }
                                   // A scene may use stepper AND slider: slider stacks under stepper.
api.caption(text)                  // replace the bottom-left caption (use \n for line breaks)
api.links([{ label, href }])       // renders a small mono link list, bottom-right above the sound toggle
api.reveal(target, { src, title, meta, href })
                                   // hover (and focus) on `target` shows a floating "real photo" card that
                                   // follows the cursor: image + 10px mono title/meta. Plays audio.ui.hover().
                                   // target may be an HTML element or an SVG element. returns detach()
api.hint(text)                     // transient 10px mono hint near bottom-center (e.g. "Hover the drawing")
```
Stage geometry: the scene `el` covers the full viewport. Keep these zones clear of scene art:
top 64px (wordmark + [M]), bottom 72px (index, Find pill, sound toggle), and the left control
column `x < 280px` between y=30% and y=70% (stepper/slider live there). The visual "center of mass"
of a scene should sit at roughly x = 50–58% of the viewport width, y = 50%.
Mobile (< 800px wide): chrome compacts; scenes must still render something sensible
(scale drawings to fit `min(w, h)`), and the left control column moves above the caption.

## Sound — `Site.audio` (implemented in site/js/audio.js)

Sound is a first-class part of this site. Everything must sound polished, musical and consistent.

### Sound aesthetic (from the site owner — authoritative; supersedes anything below that conflicts)
A **modern, minimal, high-tech industrial soundscape**, like the audio of Paradigm's "Fourth Fund" film:
- **Glitch-ambient / microsound:** clicks, tiny digital transients and "bits" used as *texture*, not melody.
- **Granular synthesis:** shimmering, evolving, "neuron-like" grain clouds for connections/activations.
- **Minimal techno / IDM:** clinical, clicky, precisely programmed percussion, with warm but restrained
  melodic synth tones underneath.
- **Negative space / airy soundstage:** sparse and uncluttered, lots of room between sounds, wide stereo,
  high-fidelity, "expensive". Clinical, transparent, intelligent. Rhythmic micro-sounds that evolve into a
  steady, clean beat.
- **Explicitly NOT:** piano, electric piano, music-box, bells/chimes as a main voice, bright saw leads,
  EDM supersaws, big reverb washes. The owner heard an earlier piano-like palette and rejected it.
Default sonic vocabulary for scenes: `click`, `tick`, `bit`, `data`, `grain`, `granular()` clouds,
`glitch`, micro `hat`/`ratchet`, clean `sub` pulses and a clicky `kick`. Use `pluck`/`keys`/`bell`/`pad`
only sparingly (they are re-voiced as glassy/granular tones, never piano-like).

One global musical system so all scenes feel like one piece:
- Key: D major pentatonic-leaning, bright and uplifting. `Site.audio.key.root = 62` (D4) and
  `Site.audio.key.scale = [0, 2, 4, 7, 9]` (major pentatonic) — scenes quantize pitches to this.
- Tempo: `Site.audio.bpm = 118`. A shared lookahead clock drives all rhythmic scheduling.
- Browsers block audio until a user gesture. core calls `Site.audio.unlock()` on the first
  pointerdown/keydown/touchstart. Before that, every audio call must be a silent no-op (never throw).
- `S` key and a speaker icon bottom-right toggle sound (persisted in localStorage `yd-sound`, default ON).

```js
Site.audio.unlock()                 // create/resume AudioContext (idempotent)
Site.audio.ready                    // true once the context is running
Site.audio.enabled                  // master on/off
Site.audio.setEnabled(bool) / toggle()   // smooth 150ms master fade
Site.audio.onChange(fn)             // fn(enabled) — core uses it to update the speaker icon
Site.audio.ctx                      // AudioContext | null
Site.audio.now()                    // ctx.currentTime (0 before unlock)
Site.audio.master                   // master input GainNode (→ glue compressor → limiter → destination)
Site.audio.reverb                   // send GainNode into a generated-IR convolution reverb (returns to master)
Site.audio.delay                    // send GainNode into a tempo-synced ping-pong delay (returns to master)
Site.audio.bus(name)                // get-or-create a named GainNode → master (+ reverb/delay sends). One per scene.
Site.audio.fadeBus(name, value, seconds)
Site.audio.midiToHz(m)
Site.audio.degree(i, octave = 0)    // i-th degree of key.scale above key.root (wraps octaves; negative ok) → MIDI note

// UI sounds (microsound: short, quiet, clinical; all accept optional {gain, pan, when})
Site.audio.ui.hover()      // single tiny high click (randomized so repeats never sound identical)
Site.audio.ui.tick()       // crisp detent: 1–2 ms click pair
Site.audio.ui.select()     // two quick digital bits, upward
Site.audio.ui.open()       // short upward spray of 4–6 grains
Site.audio.ui.close()      // short downward spray
Site.audio.ui.type()       // one keystroke: mechanical micro-click + faint digital bit
Site.audio.ui.transition(n)  // scene change: filtered-noise swish + grain spray + soft sub thump, voiced on scene n (1..5)
Site.audio.ui.error()      // two low bitcrushed bleeps

// Instruments — every call: (midi or opts, { when, dur, gain, pan, dest, ... }) → schedules and returns nothing.
// `when` defaults to now; `dest` defaults to master (pass api.bus() to route to the scene bus).
// --- microsound / granular (the core vocabulary) ---
Site.audio.play.click(o)           // one digital click / "bit" of texture { freq (Hz, default random 2–9 kHz), q, gain, pan }
Site.audio.play.tick(midi, o)      // tuned micro tick (2–8 ms resonant burst) — use high octaves (degree(i, 2..3))
Site.audio.play.bit(midi, o)       // tiny bitcrushed square bleep (10–40 ms): the "data" sound
Site.audio.play.data(o)            // scatter of bits/clicks { dur=0.25, density=40 (events/s), pitch:[midis], spread (stereo 0..1), gain }
Site.audio.play.grain(midi, o)     // one windowed glassy grain (15–120 ms) { dur, bright 0..1, gain, pan }
Site.audio.play.glitch(o)          // stutter/retrigger artifact { repeats=6, len=0.03, midi?, gain }
Site.audio.play.ratchet(o)         // micro-hat roll { count=4, span=clock.stepDur, gain }
Site.audio.play.sub(midi, o)       // clean sine sub pulse { dur }
// --- minimal techno / IDM kit ---
Site.audio.play.kick(o)            // tight clicky kick (short, clean, not boomy)
Site.audio.play.hat(o = {open:false}), .snare(o) /* clicky rim/snare */, .clap(o), .shaker(o)
// --- tonal (re-voiced glassy/granular; use sparingly) ---
Site.audio.play.pluck(midi, o), .keys(midi, o), .bell(midi, o), .lead(midi, o), .bass(midi, o)
Site.audio.play.pad(midis[], o)    // granular/airy pad chord (never a saw wall)
Site.audio.play.noise(o)           // filtered noise burst/bed { dur, type:'white'|'pink', filter, freq, q, attack, release }
Site.audio.play.riser(o), .impact(o), .blip(midi, o)

// Continuous sources → return a handle { set(params, rampSec), stop(releaseSec) }
Site.audio.granular(o)             // evolving grain cloud { density (grains/s), pitch:[midis], dur (grain s), spread, bright, gain }
Site.audio.drone(midis[], o)       // quiet evolving drone (granular-leaning)
Site.audio.wind(o)                 // pink-noise wind with slow gusts { intensity 0..1 }
Site.audio.hum(midi, o)            // mechanical hum / turbine whirr { rate } (amplitude-modulated)

// Transport (shared clock). step = 16th-note index since clock start.
Site.audio.clock.start() / stop() / running
Site.audio.clock.bpm                     // mirrors Site.audio.bpm
Site.audio.clock.on(fn)                  // fn(step, time) for each 16th, scheduled ~100ms ahead; returns unsubscribe
Site.audio.clock.stepDur                 // seconds per 16th
Site.audio.clock.nextStep(multiple = 1)  // { step, time } of the next 16th that is a multiple of `multiple` (e.g. 4 = next beat, 16 = next bar)
```
Rules for scene sound: route everything through `api.bus()`; always schedule with `when` for
rhythmic material (quantize interactive notes to the next 16th via `clock.nextStep()`); keep levels
modest (UI < -24 dBFS, scene beds around -18 dBFS; music peaks ≤ -3 dBFS after the limiter);
stop everything in `exit()` (core also fades the bus to 0 over 0.4s on exit and back to 1 on enter).
Sonify *meaning*, not decoration: e.g. sparse activations = a few crisp tuned ticks with silence
between them (negative space), dense = a smeared `data` scatter; a sample landing in a histogram = a
tick pitched by its bin; energy arriving at the ground = a clean `sub` pulse + a bright `tick`.
Rate-limit event sounds (no machine-gun spam; ≤ ~12 events/s per scene unless it is a deliberate
`data` texture) and vary them (pitch/pan/gain jitter) so minutes of listening never fatigue.

## Quality bar
- 60fps on a MacBook; no layout thrash; canvas for many particles, SVG for crisp diagrams.
- No console errors. Works in Chrome and Safari. `prefers-reduced-motion`: skip to final states.
- Accurate content: numbers, formulas and claims must come from the papers/briefs, not invented.
- Every scene must look finished at first paint (no blank screen while "waiting" — draw the frame,
  then animate).

## v2 revisions (owner feedback, round 2) — these override anything above

**Scene order** (keys 1–5): 1 `lpwm` · 2 `skywindfarm` · 3 `lpjepa` · 4 `radial-vcreg` · 5 `build`.

**Typography — bigger and darker (the owner found in-scene text too small and too light):**
- Minimum sizes inside scenes: 11px only for tertiary tick labels/guides; 12px for labels, readouts and
  annotations people should read; 13–14px for panel titles; formulas ≥ 14px (key formulas 16–20px).
- Colors for readable text: primary `#000`, secondary `#444`–`#555`. Use `#999`/`#bbb` only for decorative
  guides and axis ticks, never for sentences someone is meant to read.
- Prefer fewer, larger words. If space is tight, cut text rather than shrinking it.
- No overlapping text anywhere: check 1440×900, 1280×720 and 390×844.
- The shell token `--fs-xs` is now 11px / 14px line-height (caption, stepper, slider, links).

**Math:** never hand-build notation out of Unicode in the mono font (it renders badly: ẑ, ϕ, ‖·‖,
subscripts). Use KaTeX (loaded with `defer` from jsDelivr in index.html):
```js
api.tex(targetEl, '\\hat z_{t+1} = g_\\phi(z_t, a_t)', { display: false, fallback: 'ẑ = g(z, a)' })
Site.texHTML(latex, opts) // → HTML string
```
For canvas scenes, put formulas in absolutely-positioned HTML overlays (class `tex-block` for display
math) that you reposition on resize. Short variable names inside mono prose (e.g. "z_t") should also be
KaTeX spans rather than Unicode approximations.

**Shared art:** `Site.art` is a registry for pure drawing helpers that other scenes can reuse. A scene
file may, at top level, assign pure functions to `Site.art` (no DOM access at top level). Example:
`Site.art.swfUnit(ctx, x, y, scale, t, opts)` exported by skywindfarm.js and reused by build.js.

**Attribution (always credit):** the menu shows "Design inspired by paradigm.xyz". The build poem must
show its attribution line: "Inspired by Think Different, Apple; Ethos of Sequoia; Against the Odds,
James Dyson, and many other builders." Any borrowed idea/figure should carry a discreet source note.

**Menu:** Work (1–5) · About · then links: X, LinkedIn, GitHub, Scholar, Email, Resume · credit line.
Press and Writing stay reachable from Find [F] but are not in the menu.

**Wordmark:** core types/deletes between "Yash Dagade" and "Energy and Intelligence" every few seconds.

**Sound, round 2:** the owner loves the direction ("typing and discrete sounds and drums") but there is
too much high-pitched content. Specifically, a sustained "flute/whistle" tone (glassy sine grains around
1–1.5 kHz and above, e.g. the build page's settled/paused granular bed) must mostly go away. Keep grains
and tonal material mostly below ~900 Hz fundamentals (D3–A4 range), lowpass bright layers, keep clicks
short and lower in level, and avoid sustained high sines entirely.

## Round 3 notes

**Shared step header (all scenes):** step counter "01 / 0N · Step name" in 12px Geist Mono #555,
top-right (right edge on the 40 px gutter): label baseline ≈ 83 px, 1 px progress hairline at ≈ 92 px,
play-state line ("autoplay" / "paused · [space]") baseline ≈ 110 px. Eyebrows: UPPERCASE 11–12px mono,
letter-spacing .06em, #555. Thesis/title content-left x = 300 px from 1100 px wide, 260 px below.
(Future: a shared `Site.counter()` component in core would remove the remaining 1–3 px differences.)

**Viewports every scene must pass:** 1440×900, 1680×1050, 1280×720, 1100×700, 1024×640, 900×620,
834×1112, 390×844, 375×667. Between 801 and 1100 px wide the core hint sits under the wordmark.

**Audio additions:** `play.sub / bass / kick / impact` carry a quiet "small-speaker body" (harmonics 2–5
of the voice's own oscillator, band-passed to 150–450 Hz, 12–15 dB under the fundamental) so low
material reads on laptops and phones. Per-call `{ body: 0–2 }` (0 = the pre-round-3 voice) and
`createEngine(ctx, { body })`. `play.sub({ harmonic })` sets the unfiltered 2nd-harmonic level (default 0.1).
Pitched events that must be heard on phones should sit at E3 (165 Hz) or higher. Registers: sustained
tonal ≤ A4, tonal one-shots ≤ A5, ticks/bits ≤ A6 (the engine folds anything higher; `{ allowHigh: true }`
only with a reason). Core applies per-scene bus trims (BUS_TRIM in core.js) to level-match scenes.
`audio-check.html` and `build-score-check.html` include SMALL SPEAKER before/after sections.

**Reveal cards:** opts `{ fit: 'contain', maxHeight, anchor: 'above' }`; the caption bar is opaque and part
of the card; the card re-places itself when its image loads and stays above the bottom chrome.
**Phones:** a scene's bottom-right links appear in the [M] menu under "On this page".

## Round 4 (owner feedback) — overrides earlier sections where they conflict

**Scene order (reverted):** 1 `lpwm` · 2 `lpjepa` · 3 `radial-vcreg` · 4 `skywindfarm` · 5 `build`.
**Wordmark cycle:** Yash Dagade → Energy and Intelligence → Models and Robots.

**Context headline (required on every step of scenes 1–4; optional on 5):** visitors must understand what
they are looking at within seconds. Use the shared component — do not hand-roll a header:
```js
api.headline(title, sub, { key })   // big centered serif text at the top (title ≈ 19–25 px, sub ≈ 14–16.5 px #444)
                                     // $…$ spans are typeset with KaTeX; words fade in one by one; stays until changed
api.headline(null)                   // clear
api.headlineBottom()                 // → px (viewport y) of the headline's bottom edge, 0 if none
api.onHeadline(fn)                   // fn(bottomPx) whenever it changes (text, resize, fonts) → re-layout your art
api.headlineTop(px)                  // phones only: put the headline under your own step navigation
```
- One short title sentence (≤ ~120 characters) that states the point of the step in plain English, plus
  an optional sub (≤ ~220 characters) that explains the parts. It replaces a scene's own thesis/title line
  at the top (remove duplicates). Accurate: numbers and claims only from the briefs/papers.
- Desktop: the headline is centered at top 74 px, width min(900 px, 100vw − 600 px) (100vw − 520 px below
  1100 px). The step counter stays top-right. Lay the art out below `api.headlineBottom() + 20 px`.
- Phones: the headline is left-aligned from top 58 px (17 px / 13.5 px). Scenes with their own step nav
  either place it under the headline (read `api.headlineBottom()`) or move the headline below the nav
  with `api.headlineTop(px)`. Hints on phones now sit above the controls, not at the top.

**Sound, round 4 — "micro-foley IDM":** the owner's references (Paradigm's Fourth Fund film; OpenAI's
Super Bowl spot) replace drum kits with tactile hardware and software sounds: mechanical keyboard switches
(press, spacebar clack, backspace), relay snaps, metallic latches/snap-fits, micro-servo actuations,
terminal chimes, UI pings; the build starts with isolated dry clicks in near silence and accelerates into
a fast, syncopated, polyrhythmic "assembly engine"; sub hums, server-fan whirs and a warm pad swell under
it; it resolves with a clean "compile success" chime and crossfades into the chill background bed.
Keep the round-2/3 rules (no flute, registers, small-speaker body).

**New pages (menu only, not 1–5):** `books.html` (Books read).
**Build soundtrack:** "Bits & Atoms" (`build-score.js`) is the chosen score. Earlier versions (round-1
microsound bed, round-3 first composed score) and a comparison page were archived in commit 2c59e57
and then removed from the tree.

## Round 5

**Scene order (latest):** 1 `lpwm` · 2 `lpjepa` · 3 `skywindfarm` · 4 `robot` · 5 `build`. `radial-vcreg` is a
hidden page (n: 6, hidden: true): reachable from the [M] menu, Find and `#radial-vcreg`, not from keys 1–5.
Page-mode pages (me, books, press) register the same list for the menu/Find.
**Wordmark:** always "Yash Dagade"; each click types the next phrase (Energy and Intelligence → Models and
Robots → Yash Dagade).
