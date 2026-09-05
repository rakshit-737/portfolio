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

/** Ambient master volume — the spec's "low by default (10–15%)". */
export const AMBIENT_GAIN = 0.12;

export type SoundStatus = "unavailable" | "off" | "pending" | "on" | "paused";

/** The three physical sounds, and the closed list of them: wood for a
 *  panel (palette, mobile menu), brass for the switch (the soundscape
 *  toggle), wax for the seal (email copied). Nothing plays on hover,
 *  scroll, or ordinary clicks. */
export type UiSound = "tap" | "click" | "seal";

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
 * The hearth: looping brown noise lowpassed to a room tone, breathing
 * on a 20-second LFO (an audio-rate node, not a JS timer), plus the
 * crackle scheduler. Everything routes through `master`
 * (gain AMBIENT_GAIN) — the whole soundscape stays at 12%.
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
  roomGain.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.1; // ±20% of the 0.5 room tone
  lfo.connect(lfoDepth).connect(roomGain.gain);
  room.connect(low).connect(roomGain).connect(master);
  room.start();
  lfo.start();
  ambientSources = [
    { stop: () => room.stop(), disconnect: () => room.disconnect() },
    { stop: () => lfo.stop(), disconnect: () => lfoDepth.disconnect() },
  ];
  armCrackles();
}

function stopAmbientGraph() {
  disarmCrackles();
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
  // The tab-hidden pause, and its symmetric resume — resuming what the
  // visitor already had playing is the expected behaviour; the state
  // machine makes resuming past an explicit "off" impossible (off tears
  // the graph down and this handler ignores every status but on/paused).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && status === "on") {
      disarmCrackles();
      void ctx?.suspend();
      setStatus("paused");
    } else if (document.visibilityState === "visible" && status === "paused" && enabled) {
      void ctx?.resume().then(() => {
        armCrackles();
        setStatus("on");
      });
    }
  });
}

// ————— the three physical sounds —————

function uiOut(ac: AudioContext): GainNode {
  // UI sounds share the context but not the ambient master — they sit a
  // touch above the room tone, still quiet.
  const g = ac.createGain();
  g.gain.value = 0.18;
  g.connect(ac.destination);
  window.setTimeout(() => g.disconnect(), 600);
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

const UI_SYNTHS: Record<UiSound, (ac: AudioContext) => void> = {
  tap,
  click,
  seal,
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
