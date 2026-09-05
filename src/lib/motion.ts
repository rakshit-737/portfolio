/**
 * Shared inertia for every pointer-follow effect on the page.
 *
 * The lamp (Lamp.tsx, the per-act painting reveal) is the site's one
 * light. (A second rendering of it — the torch, a page-wide cursor
 * dimmer — was removed 2026-09-05 at the owner's request: one lamp.) —
 * the same pointer drives both. If they trail the cursor at different
 * relative rates, a viewer sees two pools of light drifting apart instead
 * of one flashlight, which undercuts the whole premise. Exported from one
 * place so the two components' lerp factors cannot quietly diverge again.
 *
 * The lerp itself — `smooth += (raw - smooth) * POINTER_LERP` per frame —
 * is a fraction of the *remaining* gap, so it converges at the same
 * relative rate regardless of whether the quantity being smoothed is in
 * viewport-fraction space: it closes ~63%
 * of the gap in `1 / POINTER_LERP` frames.
 */
export const POINTER_LERP = 0.1;

/**
 * The lamp pool's radius geometry (C2, final fix wave). Lamp.tsx is now
 * the single writer of `--lamp-r`: it computes this formula once per
 * visible act per tick (in real px) and writes it directly onto the act,
 * the same way it already writes `--p`/`--lamp-x`/`--lamp-y`. `.plate-lit`
 * in globals.css just consumes `var(--lamp-r, …)`, falling back to this
 * same formula (in vmax, CSS-computed from `--p`) only for an act the tick
 * loop hasn't reached yet — an off-screen act, or the brief window before
 * the first tick. Before this fix the formula was hand-duplicated in both
 * places (globals.css's `--lamp-r` custom property and Lamp.tsx's own
 * `lampR` local for the ignite hit-test), kept in sync only by both
 * literally repeating `26 + min(p, 1-p) * 30` correctly — exactly the kind
 * of duplication a future edit to one and not the other silently
 * desyncs.
 *
 * LAMP_R_BASE_VMAX / LAMP_R_SPREAD_VMAX: the pool's radius in vmax units —
 * `BASE + min(p, 1-p) * SPREAD`, largest at an act's vertical centre
 * (p≈0.5) and smallest at its top/bottom edges, so the light visibly
 * gathers into a pool mid-act rather than staying a fixed-size disc.
 *
 * LAMP_MASK_OPAQUE_STOP / LAMP_MASK_TRANSPARENT_STOP: `.plate-lit`'s own
 * mask-image gradient stops (globals.css) — fully opaque out to
 * OPAQUE_STOP (30%) of `--lamp-r`, fading to nothing by TRANSPARENT_STOP
 * (100%), through a mid-stop at 62% — a candle's falloff, not a rim. Documented here as the canonical numbers even though CSS has no
 * mechanism to import a JS constant, so globals.css's gradient still
 * spells them out as literal `30%`/`100%` — this is the one place in the
 * unification a cross-language boundary keeps a second copy of a number,
 * unavoidably, not by oversight.
 *
 * LAMP_LIT_FRACTION: a `.ignite` metric reads as bone or ember, never
 * fractionally in between, so it ignites at a single radius rather than
 * reproducing the mask's whole opaque→transparent falloff — picked at the
 * middle of that fade band (OPAQUE_STOP + (TRANSPARENT_STOP - OPAQUE_STOP)
 * / 2 ≈ 0.67) so a metric lights up roughly when the plate under it is
 * roughly half-revealed, not only once it's fully in the opaque core.
 */
export const LAMP_R_BASE_VMAX = 26;
export const LAMP_R_SPREAD_VMAX = 30;
export const LAMP_MASK_OPAQUE_STOP = 0.3;
export const LAMP_MASK_TRANSPARENT_STOP = 1;
export const LAMP_LIT_FRACTION =
  LAMP_MASK_OPAQUE_STOP + (LAMP_MASK_TRANSPARENT_STOP - LAMP_MASK_OPAQUE_STOP) / 2;

/**
 * Tuning for the shared frame-budget breaker below. Exported so a test can
 * reason about the numbers without hard-coding a duplicate copy of them.
 *
 * WINDOW / SLOW_FRAME_MS / TRIP_RATIO: judged over a rolling window of the
 * last WINDOW rAF callbacks (not a consecutive-miss streak — one good
 * frame mid-scroll used to reset the old counter to zero, and one bad
 * streak used to kill the effect for the rest of the session). 60 frames
 * is about a second of real content at 60fps: long enough to average out
 * a single scroll-and-decode burst (this page decodes multi-megapixel
 * AVIFs while scrolling — every plate does that routinely, on healthy
 * hardware; the four scroll-scrubbed WebM clips this comment used to also
 * cite were removed entirely in the zoom-removal pass, 2026-08-20 — see
 * AGENTS.md/DESIGN.md), short enough to react to genuine, sustained jank
 * within a second or two. A frame is "slow" past
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
 *
 * LATCH_AFTER_TRIPS: on the exact population this breaker exists for — a
 * device that genuinely cannot hold frame budget in steady state, not
 * just through one bursty scroll — trip and recover are not a single
 * event but a stable oscillation: post-warmup, the window fills with slow
 * frames and trips; both components then skip their per-frame work, which
 * makes frames cheap again, so the slow-frame count drains out of the
 * rolling window and it recovers in ~0.75s (`RECOVER_RATIO · WINDOW`
 * frames' worth of window turnover); the per-frame work resumes, the
 * device is still slow, and it trips again ~2s later. Recovering is the
 * right call the FIRST time — most trips are a genuine transient stall
 * (a scroll-and-decode burst, a backgrounded tab catching up) and
 * deserve a chance to resume. It stops being the right call once the
 * pattern repeats: a second trip in the same session is evidence of the
 * steady-state case, not a second unrelated transient, and recovering
 * again just re-arms `data-lamp` for another ~2s before the
 * same oscillation trips a third time — every plate flipping between
 * masked and fully-lit and every `.ignite` between bone and ember on a
 * ~3s cycle for the rest of the visit. Latching after the second trip
 * (never calling `onRecover` again for this guard's lifetime) trades
 * that oscillation for one clean, permanent fallback to the fully-lit
 * default — which is what the whole no-JS/reduced-motion design already
 * treats as the safe, always-legible state.
 */
export const FRAME_BUDGET = {
  WINDOW: 60,
  SLOW_FRAME_MS: 50,
  TRIP_RATIO: 0.6,
  RECOVER_RATIO: 0.25,
  WARMUP_MS: 1000,
  LATCH_AFTER_TRIPS: 2,
} as const;

/**
 * A rolling frame-budget watcher for Lamp.tsx (a factory, so any future
 * effect can own its own instance), so the
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
 * jank, a background tab catching up) and re-arms the effect on its own —
 * the FIRST time. A second trip in the same session latches the guard:
 * `onRecover` is never called again after it, and the effect stays off
 * for the rest of the visit instead of oscillating between armed and
 * suspended every ~3s (see FRAME_BUDGET.LATCH_AFTER_TRIPS above for why).
 * Callers are expected to keep the rAF loop alive and keep calling
 * `sample` every tick regardless of trip/latch state, rather than
 * cancelling it on `onTrip` — that's what lets the first-trip recovery
 * path be observed at all, and costs nothing once latched (`sample`
 * below is O(1) either way).
 */
export function createFrameBudgetGuard(onTrip: () => void, onRecover: () => void) {
  const slow = new Uint8Array(FRAME_BUDGET.WINDOW);
  let count = 0; // samples written so far, caps at WINDOW
  let cursor = 0;
  let slowCount = 0;
  // `null`, not `0`: a real rAF timestamp is never exactly 0, but a test
  // harness driving `sample()` with injected timestamps can legitimately
  // want to start its clock there — a `0`-as-"unset" sentinel would treat
  // every call before the first *nonzero* `now` as still unstarted and
  // silently re-seed `startedAt` on each of them. `null` has no such
  // collision with a real timestamp value. See tests/motion.spec.ts.
  let startedAt: number | null = null;
  let tripped = false;
  let tripCount = 0;
  let latched = false;

  return {
    sample(now: number, last: number) {
      if (startedAt === null) startedAt = now;
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
        tripCount++;
        if (tripCount >= FRAME_BUDGET.LATCH_AFTER_TRIPS) latched = true;
        onTrip();
      } else if (tripped && !latched && ratio <= FRAME_BUDGET.RECOVER_RATIO) {
        tripped = false;
        onRecover();
      }
    },
  };
}
