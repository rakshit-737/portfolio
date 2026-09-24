/**
 * The lamp's frame bus. Lamp.tsx stays the site's ONE rAF loop; every
 * other moving layer (the instrument, the atmosphere, the telemetry)
 * subscribes here and renders on the lamp's own tick. A subscriber
 * returns `true` while it still has motion to settle (a spring, a fade),
 * which keeps the loop from idle-stopping under it; once every
 * subscriber returns false and the lamp itself is idle, the loop stops
 * exactly as before — an idle tab still costs nothing per frame.
 */

export interface LampAct {
  el: HTMLElement;
  /** Lamp position as a fraction of the act box. */
  x: number;
  y: number;
  /** Lamp radius in px, and the act's scroll progress. */
  r: number;
  p: number;
  rect: DOMRect;
}

export interface LampFrame {
  now: number;
  acts: LampAct[];
  pointer: { x: number; y: number; active: boolean };
  vw: number;
  vh: number;
}

type Sub = (f: LampFrame) => boolean | void;

const subs = new Set<Sub>();
let waker: (() => void) | null = null;
let lastFrame: LampFrame | null = null;

export function onLampFrame(cb: Sub): () => void {
  subs.add(cb);
  waker?.();
  return () => {
    subs.delete(cb);
  };
}

/** Ask the loop to run (a subscriber just started moving). */
export function wakeLamp() {
  waker?.();
}

export function lastLampFrame(): LampFrame | null {
  return lastFrame;
}

/** Lamp.tsx only. */
export function registerLampWaker(fn: (() => void) | null) {
  waker = fn;
}

/** Lamp.tsx only: publish a frame; true if any subscriber is still busy. */
export function emitLampFrame(f: LampFrame): boolean {
  lastFrame = f;
  let busy = false;
  for (const s of subs) {
    try {
      if (s(f)) busy = true;
    } catch {
      subs.delete(s);
    }
  }
  return busy;
}

/** The lamp's strength — the snuffing secret and the wake flare scale
 *  the pool through this one number. Lamp.tsx eases toward the target on
 *  its own tick and folds it straight into the `--lamp-r` it already
 *  writes per act, so nothing restyles the whole document to animate it
 *  (an animated inherited property on <html> did, and starved frames). */
let kindleTarget = 1;
let kindleNow = 1;
let flareAt = -1;
export function setKindle(k: number) {
  kindleTarget = k;
  waker?.();
}
/** The wake: one swell of the pool, ~1.4s, then back to rest. */
export function flareLamp() {
  flareAt = performance.now();
  waker?.();
}
export function getKindle() {
  return kindleNow;
}
/** Lamp.tsx only: advance one frame; returns [kindle, stillMoving]. */
export function stepKindle(now: number): [number, boolean] {
  kindleNow += (kindleTarget - kindleNow) * 0.09;
  let k = kindleNow;
  let moving = Math.abs(kindleTarget - kindleNow) > 0.002;
  if (flareAt >= 0) {
    const t = (now - flareAt) / 1400;
    if (t >= 1) flareAt = -1;
    else {
      k *= 1 + 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t);
      moving = true;
    }
  }
  return [k, moving];
}
