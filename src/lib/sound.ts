/**
 * The night archive's sound engine — the one place the site touches
 * audio. Framework-free on purpose (Nav, the palette, and the copy
 * button all need it without sharing a React tree): a module singleton
 * holding the preference, a small status machine, and (from
 * initSoundscape on) the Web Audio graph.
 *
 * Everything audible here is synthesized at runtime. There is no audio
 * file in this repository and no audio network request anywhere — a
 * deliberate ruling (see docs/superpowers/plans/2026-09-05-night-archive.md):
 * a graph authored in-repo is owner-supplied in the strongest sense,
 * where even a "verified CC0" recording still carries performer/label
 * rights this project cannot verify to its own bar. Swapping in an
 * owner-supplied recording later is a one-function change
 * (buildAmbient below).
 *
 * The status machine, which tests read from `<html data-soundscape>`:
 *
 *   unavailable — no AudioContext constructor; the layer is absent and
 *                 the toggle renders nothing.
 *   off         — the user's persisted choice (or a toggle this visit).
 *                 No AudioContext is ever built in this state.
 *   blocked     — preference is on but the browser's autoplay policy
 *                 refused; one-time gesture listeners wait for the
 *                 first real interaction, then retry exactly once.
 *                 Never a retry loop.
 *   on          — the hearth is playing.
 *   paused      — tab hidden while on; visibility back restores on.
 *
 * Defaulting ON is the owner's call, but never against the browser:
 * the gate above is honest — a blocked attempt stays silent until the
 * visitor actually touches the page.
 */

export const SOUND_PREF_KEY = "night-archive:sound";

/** Ambient master volume — the spec's "low by default (10–15%)". */
export const AMBIENT_GAIN = 0.12;

export type SoundStatus = "unavailable" | "off" | "blocked" | "on" | "paused";

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

/**
 * The toggle. Always called from a user gesture (the button, the
 * palette action), so a turn-on can never be autoplay-blocked.
 */
export function setSoundEnabled(v: boolean): void {
  enabled = v;
  persist(v);
  if (status === "unavailable") return;
  // Audio start/stop lands in initSoundscape's era (Task 2); the status
  // machine already tells the truth about the preference.
  setStatus(v ? "on" : "off");
}

/**
 * Boot, called once from Soundscape.tsx on mount. Reads the persisted
 * preference and, if on, will start the hearth behind the autoplay
 * gate. (Audio graph lands in Task 2 — until then this only settles
 * status.)
 */
export function initSoundscape(): void {
  if (typeof window === "undefined") return;
  if (typeof window.AudioContext !== "function") {
    setStatus("unavailable");
    return;
  }
  enabled = readSoundPref(() => window.localStorage.getItem(SOUND_PREF_KEY));
  setStatus(enabled ? "on" : "off");
}

/**
 * One physical sound, gated on the global setting — the four call sites
 * never check it themselves. (Synthesis lands in Task 2.)
 */
export function playUi(kind: UiSound): void {
  void kind;
  if (!enabled) return;
}
