/**
 * Shared inertia for every pointer-follow effect on the page.
 *
 * The lamp (Lamp.tsx, the per-act painting reveal) and the torch
 * (Torch.tsx, the page-wide dimmer) are one light with two renderings —
 * the same pointer drives both. If they trail the cursor at different
 * relative rates, a viewer sees two pools of light drifting apart instead
 * of one flashlight, which undercuts the whole premise. Exported from one
 * place so the two components' lerp factors cannot quietly diverge again.
 *
 * The lerp itself — `smooth += (raw - smooth) * POINTER_LERP` per frame —
 * is a fraction of the *remaining* gap, so it converges at the same
 * relative rate regardless of whether the quantity being smoothed is in
 * viewport-fraction space (Lamp) or pixel space (Torch): both close ~63%
 * of the gap in `1 / POINTER_LERP` frames.
 */
export const POINTER_LERP = 0.1;

/**
 * Tuning for the shared frame-budget breaker below. Exported so a test can
 * reason about the numbers without hard-coding a duplicate copy of them.
 *
 * WINDOW / SLOW_FRAME_MS / TRIP_RATIO: judged over a rolling window of the
 * last WINDOW rAF callbacks (not a consecutive-miss streak — one good
 * frame mid-scroll used to reset the old counter to zero, and one bad
 * streak used to kill the effect for the rest of the session). 60 frames
 * is about a second of real content at 60fps: long enough to average out
 * a single scroll-and-decode burst (this page seeks a WebM and decodes
 * multi-megapixel AVIFs while scrolling — both components do that
 * routinely, on healthy hardware), short enough to react to genuine,
 * sustained jank within a second or two. A frame is "slow" past
 * SLOW_FRAME_MS = 50, i.e. ~20fps — well past a single missed-60fps frame
 * (16.7ms) and past the old breaker's 32ms (~30fps) threshold, which is
 * exactly the pacing ordinary scrolling on this page produces and is why
 * the old breaker fired on healthy machines. TRIP_RATIO = 0.6 requires a
 * clear majority of the window to be slow, not a bare one — an even split
 * between fine and slow frames, which a bursty-but-fine device produces
 * constantly, never trips it.
 *
 * RECOVER_RATIO: lower than TRIP_RATIO on purpose (hysteresis) — without a
 * gap, a ratio sitting right at the boundary would flap the effect
 * on/off every time one sample rolls out of the window, which is worse
 * than staying off. 0.25 asks for slow frames to be back down to a small
 * minority — most of the window healthy — before the effect re-arms.
 *
 * WARMUP_MS: the first second after mount is layout, image/video decode,
 * and hydration settling, none of which says anything about steady-state
 * performance — frames in that window are never sampled at all, so
 * startup cost can never contribute toward a trip.
 */
export const FRAME_BUDGET = {
  WINDOW: 60,
  SLOW_FRAME_MS: 50,
  TRIP_RATIO: 0.6,
  RECOVER_RATIO: 0.25,
  WARMUP_MS: 1000,
} as const;

/**
 * A rolling frame-budget watcher shared by Lamp.tsx and Torch.tsx, so the
 * two circuit breakers cannot quietly diverge again (they already did
 * once: both hand-rolled an identical "10 consecutive frames over 32ms"
 * counter).
 *
 * Call `sample(now, last)` once per rAF tick with the callback's own
 * timestamp and the previous tick's (0 on the very first tick, before
 * there is a `last` to diff against). The guard fires `onTrip` once a
 * clear majority of the last WINDOW frames were slow, and `onRecover`
 * once that ratio falls back to a small minority — see FRAME_BUDGET above
 * for the exact numbers and their justification.
 *
 * Tripping is a suspension, not a teardown: the guard keeps sampling
 * every tick regardless of its own state, so it notices the device
 * recovering from a transient stall (a burst of video-seek-and-decode
 * jank, a background tab catching up) and re-arms the effect on its own.
 * Callers are expected to do the same — stop the expensive per-frame work
 * on `onTrip` but keep the rAF loop alive and keep calling `sample` every
 * tick, rather than cancelling it — or recovery can never be observed.
 */
export function createFrameBudgetGuard(onTrip: () => void, onRecover: () => void) {
  const slow = new Uint8Array(FRAME_BUDGET.WINDOW);
  let count = 0; // samples written so far, caps at WINDOW
  let cursor = 0;
  let slowCount = 0;
  let startedAt = 0;
  let tripped = false;

  return {
    sample(now: number, last: number) {
      if (!startedAt) startedAt = now;
      if (now - startedAt < FRAME_BUDGET.WARMUP_MS) return;
      if (!last) return; // no dt yet — first tick after warmup

      const wasSlow = now - last > FRAME_BUDGET.SLOW_FRAME_MS ? 1 : 0;
      if (count === FRAME_BUDGET.WINDOW) {
        slowCount -= slow[cursor];
      } else {
        count++;
      }
      slow[cursor] = wasSlow;
      slowCount += wasSlow;
      cursor = (cursor + 1) % FRAME_BUDGET.WINDOW;

      if (count < FRAME_BUDGET.WINDOW) return; // not enough data yet

      const ratio = slowCount / FRAME_BUDGET.WINDOW;
      if (!tripped && ratio >= FRAME_BUDGET.TRIP_RATIO) {
        tripped = true;
        onTrip();
      } else if (tripped && ratio <= FRAME_BUDGET.RECOVER_RATIO) {
        tripped = false;
        onRecover();
      }
    },
  };
}
