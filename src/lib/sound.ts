/**
 * The night archive's sound engine — the one place the site touches
 * audio. Framework-free on purpose (Nav, the palette, and the copy
 * button all need it without sharing a React tree): a module singleton
 * holding the preference, a small status machine, and the Web Audio
 * graph.
 *
 * Everything audible here is synthesized at runtime. There is no audio
 * file in this repository and no audio network request anywhere — a
 * deliberate ruling (see docs/superpowers/plans/2026-09-05-night-archive.md):
 * a graph authored in-repo is owner-supplied in the strongest sense,
 * where even a "verified CC0" recording still carries performer/label
 * rights this project cannot verify to its own bar. Swapping in an
 * owner-supplied recording later is a one-function change
 * (startAmbient below).
 *
 * The status machine, which tests read from `<html data-soundscape>`:
 *
 *   unavailable — no AudioContext constructor; the layer is absent and
 *                 the toggle renders nothing.
 *   off         — the user's persisted choice (or a toggle this visit).
 *                 No AudioContext is ever built in this state.
 *   pending     — preference is on and the hearth is waiting for the
 *                 page's first real interaction. No AudioContext exists
 *                 yet: `new AudioContext()` measured 72ms of real main
 *                 thread in headless Chromium (~290ms at Lighthouse's
 *                 4× mobile throttling — the whole of a CI perf-gate
 *                 failure, TBT 84→276ms), so the context is never built
 *                 at load. The first gesture builds it — and a gesture
 *                 also satisfies every autoplay policy, so the old
 *                 allowed/blocked split collapses into this one state.
 *                 One-time listeners, removed on first fire; an attempt
 *                 can only ever run on a user gesture — never a loop.
 *   on          — the hearth is playing.
 *   paused      — tab hidden while on; visibility back restores on.
 *
 * Defaulting ON is the owner's call, but never against the browser and
 * never against the load: no sound infrastructure exists until the
 * visitor actually touches the page (a scroll, a key, a tap), at which
 * point the hearth starts unprompted — still on by default, without an
 * opt-in, and without competing with the first paint.
 *
 * Observability (tests listen on window; both events are dispatched
 * only when the thing they name actually happened):
 *   "night-archive:ctx-created"  — the AudioContext was built (once).
 *   "night-archive:ui-sound"     — a UI sound really played,
 *                                  detail: { kind }.
 */

export const SOUND_PREF_KEY = "night-archive:sound";

/** Ambient master volume. The original spec said 10–15%; the owner
 *  asked for more on 2026-09-05 ("increase the sound") — 22% now,
 *  still well under conversational level. */
export const AMBIENT_GAIN = 0.22;

export type SoundStatus = "unavailable" | "off" | "pending" | "on" | "paused";

/** The four physical sounds: wood for a panel (palette, mobile menu),
 *  brass for the switch (the soundscape toggle), wax for the seal
 *  (email copied), and a chime — a small minor-arpeggio harp flourish —
 *  for every other button on the site (owner request 2026-09-05,
 *  overriding the original "never on ordinary clicks" clause; wired as
 *  one delegated listener in initSoundscape, skipping any button marked
 *  `data-voice` because it already speaks for itself). Hover and scroll
 *  stay silent. */
export type UiSound = "tap" | "click" | "seal" | "chime";

/**
 * The preference, read through an injected getter so the default is
 * testable without a browser (tests/sound-unit.spec.ts). Only the
 * explicit persisted value "off" disables; anything else — absence,
 * garbage, or a storage read that throws because localStorage itself is
 * blocked — falls back to the default: on.
 */
export function readSoundPref(read: () => string | null): boolean {
  try {
    return read() !== "off";
  } catch {
    return true;
  }
}

let enabled = true;
let status: SoundStatus = "off";
let initialized = false;
const subscribers = new Set<(s: SoundStatus) => void>();

function setStatus(next: SoundStatus) {
  if (status === next) return;
  status = next;
  for (const cb of subscribers) cb(status);
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function getSoundStatus(): SoundStatus {
  return status;
}

/** Subscribe to status changes; returns the unsubscriber. Shaped for
 *  React's useSyncExternalStore but usable from anything. */
export function subscribeSound(cb: (s: SoundStatus) => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function persist(v: boolean) {
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, v ? "on" : "off");
  } catch {
    // Storage unavailable — the choice still holds for this visit.
  }
}

// ————— the graph —————

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let white: AudioBuffer | null = null;
let ambientSources: { stop(): void; disconnect(): void }[] = [];
let crackleTimer: number | null = null;
let musicTimer: number | null = null;
let melodyOut: GainNode | null = null;
let songStart = 0;
let scheduledUntil = 0;

/** Four seconds of brown noise (a leaky integrator over white noise),
 *  normalized, with the loop seam crossfaded away — the hearth's room
 *  tone once lowpassed. Built lazily, kept for the session. */
function brownNoiseBuffer(ac: AudioContext): AudioBuffer {
  const seconds = 4;
  const rate = ac.sampleRate;
  const buf = ac.createBuffer(1, seconds * rate, rate);
  const data = buf.getChannelData(0);
  let last = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const whiteSample = Math.random() * 2 - 1;
    last = (last + 0.02 * whiteSample) / 1.02;
    data[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  for (let i = 0; i < data.length; i++) data[i] /= peak || 1;
  // Crossfade the tail into the head so the 4s loop has no click.
  const fade = 4000;
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[data.length - fade + i] =
      data[data.length - fade + i] * (1 - t) + data[i] * t;
  }
  return buf;
}

/** One second of white noise, reused (with random offsets) by every
 *  crackle and by the tap/seal transients. */
function whiteNoiseBuffer(ac: AudioContext): AudioBuffer {
  if (white) return white;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  white = buf;
  return buf;
}

function buildContext(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = AMBIENT_GAIN;
  master.connect(ctx.destination);
  window.dispatchEvent(new Event("night-archive:ctx-created"));
  return ctx;
}

/** One crackle: a 30ms bandpassed burst from the white buffer, at a
 *  small random gain. Scheduled by armCrackles below — never from any
 *  per-frame loop. */
function crackle(ac: AudioContext, out: GainNode) {
  const src = ac.createBufferSource();
  src.buffer = whiteNoiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 0.9;
  const g = ac.createGain();
  const level = 0.015 + Math.random() * 0.045;
  const t = ac.currentTime;
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  src.connect(band).connect(g).connect(out);
  src.start(t, Math.random() * 0.9, 0.05);
  src.onended = () => {
    src.disconnect();
    band.disconnect();
    g.disconnect();
  };
}

// ————— the tune —————
//
// An authored piece, composed for this site (owner request 2026-09-05:
// "ancient medieval themed music but with a good tune") — the rights
// ruling is unchanged because the melody itself is written here, in
// this file, not sourced. D Dorian, the workhorse mode of medieval
// monophony: sixteen bars in an A–B arch, stepwise with arch contours,
// the raised sixth (B natural) giving the Dorian colour, every phrase
// cadencing home to D. Played on a physically modelled plucked string
// (Karplus–Strong — a delay line of the string's period, excited with
// smoothed noise and damped by averaging, the standard lute/harp
// model), over a drone fifth (D–A, the mediaeval bourdon) and the
// hearth's own room tone and crackle.

const TEMPO_BPM = 70;
const SECONDS_PER_BEAT = 60 / TEMPO_BPM;
const LOOP_BEATS = 64;

/** [startBeat, midiNote] — durations are the string's own ring-out. */
const SCORE: [number, number][] = [
  // A — first statement
  [0, 62], [1, 64], [2, 65], [3, 67],
  [4, 69], [6, 67], [7, 65],
  [8, 64], [9, 65], [10, 64], [11, 60],
  [12, 62],
  // A — answer, reaching the Dorian sixth
  [16, 65], [17, 67], [18, 69], [19, 71],
  [20, 72], [22, 71], [23, 69],
  [24, 67], [25, 69], [26, 65], [27, 64],
  [28, 62],
  // B — the high phrase
  [32, 69], [33.5, 69], [34, 72], [35, 74],
  [36, 72], [38, 69],
  [40, 71], [41, 72], [42, 71], [43, 67],
  [44, 69],
  // B — descent and final cadence
  [48, 74], [49, 72], [50, 69], [51, 72],
  [52, 71], [53, 69], [54, 67], [55, 65],
  [56, 64], [57, 65], [58, 67], [59, 64],
  [60, 62],
];

/** Beats on which the lute doubles the note an octave below — phrase
 *  downbeats only, a light thickening rather than harmony. */
const OCTAVE_BEATS = new Set([0, 16, 32, 48, 12, 28, 44, 60]);

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * One plucked string, rendered offline into a buffer (Karplus–Strong).
 * A per-pitch cache: each pitch is computed once per visit (<1ms of
 * plain-array work) and replayed thereafter — never on the load path,
 * only after the first gesture has started the hearth.
 */
const pluckCache = new Map<number, AudioBuffer>();
function pluckBuffer(ac: AudioContext, midi: number): AudioBuffer {
  const cached = pluckCache.get(midi);
  if (cached) return cached;
  const freq = midiHz(midi);
  const period = Math.round(ac.sampleRate / freq);
  const length = Math.floor(ac.sampleRate * 2);
  const buf = ac.createBuffer(1, length, ac.sampleRate);
  const out = buf.getChannelData(0);
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  // Soften the excitation twice — a gut string under a fingertip, not
  // a wire under a plectrum.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < period; i++) {
      ring[i] = (ring[i] + ring[(i + 1) % period]) / 2;
    }
  }
  let idx = 0;
  for (let n = 0; n < length; n++) {
    const cur = ring[idx];
    const nxt = ring[(idx + 1) % period];
    out[n] = cur;
    ring[idx] = 0.998 * 0.5 * (cur + nxt);
    idx = (idx + 1) % period;
  }
  // The buffer truncates the ring-out; fade the last 150ms so the cut
  // can never click.
  const fade = Math.floor(ac.sampleRate * 0.15);
  for (let i = 0; i < fade; i++) {
    out[length - fade + i] *= 1 - i / fade;
  }
  pluckCache.set(midi, buf);
  return buf;
}

function scheduleNote(
  ac: AudioContext,
  outNode: GainNode,
  midi: number,
  when: number,
  gain: number,
) {
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(ac, midi);
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(outNode);
  src.start(when);
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
}

/**
 * The tune's scheduler: the standard Web Audio lookahead pattern — a
 * timeout every 300ms schedules the notes falling in the next ~0.9s of
 * context time, anchored to `songStart`. Because a suspended context's
 * clock freezes, the tab-hidden pause resumes the melody mid-phrase for
 * free. Armed and disarmed in exactly the crackle scheduler's states:
 * nothing runs while off, paused, or pending.
 */
function armMusic() {
  if (musicTimer !== null || !ctx || !melodyOut) return;
  const loopDur = LOOP_BEATS * SECONDS_PER_BEAT;
  const tick = () => {
    if (status !== "on" || !ctx || !melodyOut) {
      musicTimer = null;
      return;
    }
    const horizon = ctx.currentTime + 0.9;
    if (scheduledUntil < ctx.currentTime) scheduledUntil = ctx.currentTime;
    let k = Math.floor((scheduledUntil - songStart) / loopDur);
    if (k < 0) k = 0;
    for (; songStart + k * loopDur < horizon; k++) {
      for (const [beat, midi] of SCORE) {
        const t = songStart + k * loopDur + beat * SECONDS_PER_BEAT;
        if (t < scheduledUntil || t >= horizon) continue;
        // Humanize: a few ms of timing slack, a little touch variance.
        const when = t + (Math.random() - 0.5) * 0.012;
        const touch = 0.65 * (0.85 + Math.random() * 0.3);
        scheduleNote(ctx, melodyOut, midi, when, touch);
        if (OCTAVE_BEATS.has(beat)) {
          scheduleNote(ctx, melodyOut, midi - 12, when + 0.008, touch * 0.45);
        }
      }
    }
    scheduledUntil = horizon;
    musicTimer = window.setTimeout(tick, 300);
  };
  musicTimer = window.setTimeout(tick, 50);
}

function disarmMusic() {
  if (musicTimer !== null) {
    window.clearTimeout(musicTimer);
    musicTimer = null;
  }
}

/** The crackle scheduler: one pending timeout at a time, re-armed only
 *  while the hearth is "on" — nothing runs in any other state, so an
 *  idle (off/paused/blocked) page holds no timers at all. */
function armCrackles() {
  if (crackleTimer !== null || !ctx || !master) return;
  const tick = () => {
    if (status !== "on" || !ctx || !master) {
      crackleTimer = null;
      return;
    }
    crackle(ctx, master);
    crackleTimer = window.setTimeout(tick, 240 + Math.random() * 660);
  };
  crackleTimer = window.setTimeout(tick, 240 + Math.random() * 660);
}

function disarmCrackles() {
  if (crackleTimer !== null) {
    window.clearTimeout(crackleTimer);
    crackleTimer = null;
  }
}

/**
 * The chamber: the tune (above) on its plucked string, a drone fifth
 * (D3–A3, triangle waves lowpassed to a bowed hum, faded in over four
 * seconds), and the hearth — looping brown noise lowpassed to a room
 * tone, breathing on a 20-second LFO (an audio-rate node, not a JS
 * timer), plus the crackle scheduler. Everything routes through
 * `master` (gain AMBIENT_GAIN) — one knob, one soundscape.
 */
function startAmbientGraph() {
  if (!ctx || !master || ambientSources.length > 0) return;
  const room = ctx.createBufferSource();
  room.buffer = brownNoiseBuffer(ctx);
  room.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 220;
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.3; // under the tune now, not the whole show
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.06; // ±20% of the 0.3 room tone
  lfo.connect(lfoDepth).connect(roomGain.gain);
  room.connect(low).connect(roomGain).connect(master);
  room.start();
  lfo.start();

  // The bourdon: D3 and A3, the open fifth every medieval drone holds.
  const droneLow = ctx.createBiquadFilter();
  droneLow.type = "lowpass";
  droneLow.frequency.value = 320;
  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 4);
  droneLow.connect(droneGain).connect(master);
  const droneOscs = [midiHz(50), midiHz(57)].map((f) => {
    const osc = ctx!.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    osc.connect(droneLow);
    osc.start();
    return osc;
  });

  // The lute's own channel into the master.
  melodyOut = ctx.createGain();
  melodyOut.gain.value = 1;
  melodyOut.connect(master);
  songStart = ctx.currentTime + 0.4;
  scheduledUntil = songStart;

  ambientSources = [
    { stop: () => room.stop(), disconnect: () => room.disconnect() },
    { stop: () => lfo.stop(), disconnect: () => lfoDepth.disconnect() },
    ...droneOscs.map((osc) => ({
      stop: () => osc.stop(),
      disconnect: () => osc.disconnect(),
    })),
    {
      stop: () => {},
      disconnect: () => {
        droneGain.disconnect();
        melodyOut?.disconnect();
        melodyOut = null;
      },
    },
  ];
  armCrackles();
  armMusic();
}

function stopAmbientGraph() {
  disarmCrackles();
  disarmMusic();
  for (const s of ambientSources) {
    try {
      s.stop();
    } catch {
      // Already stopped — stopping twice throws, and either way it's gone.
    }
    s.disconnect();
  }
  ambientSources = [];
}

/** Attempt to run the hearth; reports honestly. Autoplay policies act
 *  on the context's state, so the check is `ctx.state` after resume —
 *  never a bypass, never a second attempt from here. */
async function tryStartAmbient(): Promise<"on" | "blocked"> {
  buildContext();
  // A blocked Chromium context leaves resume() PENDING forever rather
  // than rejecting (observed under Playwright's default policy), so an
  // unraced await here would hang the status machine on "off" for the
  // whole visit. Race it against a short timeout and let ctx.state be
  // the single source of truth either way.
  const resumed = ctx!.resume().catch(() => {
    // A rejected resume() and a still-suspended context mean the same
    // thing to the state check below.
  });
  await Promise.race([resumed, new Promise((r) => window.setTimeout(r, 250))]);
  if (ctx!.state !== "running") return "blocked";
  startAmbientGraph();
  return "on";
}

/** The first-interaction start: armed only while "pending", removed on
 *  first fire. Every attempt this arms runs on a real user gesture, so
 *  it can never loop against a policy — and in the vanishingly odd case
 *  a gesture-borne attempt still reports blocked, it re-arms for the
 *  next gesture rather than spinning. */
function armGestureStart() {
  const start = () => {
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
    window.removeEventListener("touchend", start);
    if (!enabled || status !== "pending") return;
    userStartPending = true;
    void tryStartAmbient().then((r) => {
      userStartPending = false;
      if (r === "blocked") {
        setStatus("pending");
        armGestureStart();
      } else {
        setStatus(r);
      }
    });
  };
  window.addEventListener("pointerdown", start);
  window.addEventListener("keydown", start);
  window.addEventListener("touchend", start);
}

/**
 * True while a gesture-initiated start (the toggle, or the pending
 * state's first-interaction listener) is still in flight — the one
 * window where playUi may schedule on a still-suspended context,
 * because the gesture guarantees the resume lands and the scheduled
 * nodes sound moments later. (The same first click that starts the
 * hearth can also be the click that copies the email — its seal must
 * not be swallowed by the race.) Outside it, a suspended context makes
 * no sound, and scheduling there would dispatch a "sound really
 * played" event for silence (adversarial review, finding 1).
 */
let userStartPending = false;

/**
 * The toggle. Always called from a user gesture (the button, the
 * palette action), so a turn-on can never be autoplay-blocked.
 */
export function setSoundEnabled(v: boolean): void {
  enabled = v;
  persist(v);
  if (status === "unavailable") return;
  if (v) {
    userStartPending = true;
    void tryStartAmbient().then((r) => {
      userStartPending = false;
      // A gesture-borne attempt can't realistically be refused, but the
      // type says it can — map it back to waiting rather than lying "on".
      setStatus(r === "blocked" ? "pending" : r);
    });
  } else {
    stopAmbientGraph();
    void ctx?.suspend();
    setStatus("off");
  }
}

/**
 * Boot, called once from Soundscape.tsx on mount (idempotent — dev
 * strict mode runs effects twice). Deliberately cheap: it reads the
 * persisted preference and arms listeners, and NEVER builds an
 * AudioContext — that waits for the first real interaction (see the
 * "pending" status above for the measured why). With the preference
 * off, no listener is even armed — the "lazy-load only when playback
 * will begin" requirement, satisfied absolutely.
 */
export function initSoundscape(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (typeof window.AudioContext !== "function") {
    setStatus("unavailable");
    return;
  }
  enabled = readSoundPref(() => window.localStorage.getItem(SOUND_PREF_KEY));
  if (!enabled) {
    setStatus("off");
  } else {
    // Always via the first-interaction listener — even when
    // `navigator.userActivation.hasBeenActive` says a gesture already
    // happened. A fast-path on that flag was tried and dropped: script
    // injection (Playwright's init scripts, and anything else that
    // evaluates with user gesture semantics) leaves it sticky-true, so
    // the "attempt now" branch fired in exactly the environments trying
    // to verify it wouldn't — and a real visitor who interacted before
    // boot interacts again within moments anyway.
    setStatus("pending");
    armGestureStart();
  }
  // Every button on the site chimes (owner request 2026-09-05) — one
  // delegated listener rather than a call site per component. Buttons
  // that already carry a dedicated sound mark themselves `data-voice`
  // and are skipped, so nothing ever plays two sounds for one press.
  // Registered unconditionally but voiced through playUi, which gates
  // on the global setting like every other sound.
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest("button, [role='button']");
    if (btn && !btn.hasAttribute("data-voice")) playUi("chime");
  });

  // The tab-hidden pause, and its symmetric resume — resuming what the
  // visitor already had playing is the expected behaviour; the state
  // machine makes resuming past an explicit "off" impossible (off tears
  // the graph down and this handler ignores every status but on/paused).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && status === "on") {
      disarmCrackles();
      disarmMusic();
      void ctx?.suspend();
      setStatus("paused");
    } else if (document.visibilityState === "visible" && status === "paused" && enabled) {
      void ctx?.resume().then(() => {
        armCrackles();
        armMusic();
        setStatus("on");
      });
    }
  });
}

// ————— the three physical sounds —————

function uiOut(ac: AudioContext): GainNode {
  // UI sounds share the context but not the ambient master — they sit a
  // touch above the room tone, still quiet. The teardown timer outlives
  // the longest tail (the chime's halo, ~700ms).
  const g = ac.createGain();
  g.gain.value = 0.18;
  g.connect(ac.destination);
  window.setTimeout(() => g.disconnect(), 1100);
  return g;
}

/** Wood tap: a low sine knock plus a tiny bright transient — a panel
 *  opening or closing. */
function tap(ac: AudioContext) {
  const out = uiOut(ac);
  const t = ac.currentTime;
  const knock = ac.createOscillator();
  knock.frequency.value = 160;
  const kg = ac.createGain();
  kg.gain.setValueAtTime(0.9, t);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  knock.connect(kg).connect(out);
  knock.start(t);
  knock.stop(t + 0.08);
  const burst = ac.createBufferSource();
  burst.buffer = whiteNoiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1200;
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0.25, t);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  burst.connect(band).connect(bg).connect(out);
  burst.start(t, Math.random() * 0.9, 0.04);
}

/** Brass click: two short high partials — the switch. */
function click(ac: AudioContext) {
  const out = uiOut(ac);
  const t = ac.currentTime;
  const high = ac.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 900;
  high.connect(out);
  for (const f of [2100, 2700]) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(g).connect(high);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

/** Wax-seal press: a soft low push with a dull thud — the copy landing. */
function seal(ac: AudioContext) {
  const out = uiOut(ac);
  const t = ac.currentTime;
  const press = ac.createOscillator();
  press.frequency.value = 90;
  const pg = ac.createGain();
  pg.gain.setValueAtTime(0.0001, t);
  pg.gain.exponentialRampToValueAtTime(0.8, t + 0.015);
  pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  press.connect(pg).connect(out);
  press.start(t);
  press.stop(t + 0.2);
  const thud = ac.createBufferSource();
  thud.buffer = whiteNoiseBuffer(ac);
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 300;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.3, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  thud.connect(low).connect(tg).connect(out);
  thud.start(t, Math.random() * 0.8, 0.1);
}

/** The chime: a quick D-minor harp flourish (D5–F5–A5, the site's own
 *  plucked string an octave up) under a faint sine halo — the
 *  "something happened" sound for any button without a voice of its
 *  own. Minor, so it stays mysterious rather than triumphant; the same
 *  string model as the tune, so it belongs to this room. */
function chime(ac: AudioContext) {
  const out = uiOut(ac);
  const t = ac.currentTime;
  const flourish: [number, number, number][] = [
    [74, 0, 0.5], // D5
    [77, 0.07, 0.45], // F5
    [81, 0.14, 0.55], // A5
  ];
  for (const [midi, dt, vel] of flourish) {
    const src = ac.createBufferSource();
    src.buffer = pluckBuffer(ac, midi);
    const g = ac.createGain();
    g.gain.value = vel;
    src.connect(g).connect(out);
    src.start(t + dt);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
  }
  const halo = ac.createOscillator();
  halo.frequency.value = midiHz(86); // D6, a thin shimmer over the top
  const hg = ac.createGain();
  hg.gain.setValueAtTime(0.12, t + 0.14);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  halo.connect(hg).connect(out);
  halo.start(t + 0.14);
  halo.stop(t + 0.8);
}

const UI_SYNTHS: Record<UiSound, (ac: AudioContext) => void> = {
  tap,
  click,
  seal,
  chime,
};

/**
 * One physical sound, gated on the global setting — the four call
 * sites never check it themselves, and sound is never the only
 * confirmation (each site already shows its state visibly). The
 * observability event fires only when a sound really plays.
 */
export function playUi(kind: UiSound): void {
  if (!enabled || !ctx) return;
  // A suspended context makes no sound: scheduling on it would dispatch
  // the "really played" event for silence. The one exception is a
  // user-initiated resume still in flight (userStartPending) — the
  // gesture guarantees it lands, and the nodes sound the moment it does.
  if (ctx.state !== "running" && !userStartPending) return;
  UI_SYNTHS[kind](ctx);
  window.dispatchEvent(
    new CustomEvent("night-archive:ui-sound", { detail: { kind } }),
  );
}
