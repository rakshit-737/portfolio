import { expect, test } from "@playwright/test";
import { FRAME_BUDGET, createFrameBudgetGuard } from "../src/lib/motion";

/**
 * Unit tests for the shared frame-budget circuit breaker (`Lamp.tsx` and
 * `Torch.tsx` each build their own guard from this one factory). Pure and
 * synchronous — every timestamp is injected, so these run with no
 * browser, no rAF, and no real clock, unlike the rest of this suite.
 * `FRAME_BUDGET` is exported from `src/lib/motion.ts` specifically so a
 * test can reason about the numbers instead of hard-coding a duplicate
 * copy of them (see that file's own comment) — this is that test.
 *
 * Why this can't be an e2e test: Playwright's `toHaveAttribute` polls for
 * up to 5s by default, which a *recovering* breaker satisfies even if it
 * recovered on the wrong schedule, or shouldn't have recovered at all
 * (the latch bug this file guards). Only calling `sample()` directly and
 * inspecting exactly which tick each callback fired on can pin trip,
 * recover, the hysteresis gap, warmup, and the latch.
 */

/** One fresh guard plus a fake, caller-driven clock, seeded to sit exactly
 *  at the warmup boundary with nothing yet counted — every test below
 *  starts from here rather than re-deriving warmup-crossing arithmetic
 *  itself. Mirrors the real tick loops' own shape: `sample(now, last)`
 *  once per frame, `last` always the previous call's `now`. */
function makeHarness() {
  const trips: true[] = [];
  const recovers: true[] = [];
  const guard = createFrameBudgetGuard(
    () => trips.push(true),
    () => recovers.push(true),
  );

  // Seeds `startedAt` at a nonzero value — always a no-op (`now -
  // startedAt` is 0, well inside warmup). Deliberately not `0`: the guard
  // treats `startedAt === null` as "not yet seeded", not `!startedAt`, so
  // 0 is a perfectly ordinary value here now — but this harness avoids it
  // anyway, on the theory that a test pinning exact behaviour shouldn't
  // lean on a real timestamp value real rAF callbacks never actually
  // produce, however the guard currently treats it.
  const SEED = 1;
  guard.sample(SEED, 0);
  // Jumps straight to the warmup boundary in one step. `last` is
  // deliberately the literal `0` here, not a tracked previous `now` —
  // exactly the shape a real tick loop's `let last = 0` seed gives "the
  // first tick after warmup" — so this jump is itself never counted
  // (`if (!last) return`) regardless of its size. Net effect: the guard
  // sits at `now === SEED + WARMUP_MS` with zero samples in its window, a
  // clean starting line every test below can build on without re-deriving
  // it.
  let now: number = SEED + FRAME_BUDGET.WARMUP_MS;
  guard.sample(now, 0);
  let last = now;

  return {
    trips,
    recovers,
    /** Feeds one frame `dt` ms after the previous one. */
    frame(dt: number) {
      now += dt;
      guard.sample(now, last);
      last = now;
      return now;
    },
  };
}

/** Unmistakably over/under SLOW_FRAME_MS (50) — margin wide enough that
 *  the exact threshold value never has to be reasoned about per call. */
const SLOW = FRAME_BUDGET.SLOW_FRAME_MS + 10;
const FAST = 16;

test("warmup: a slow sample taken before WARMUP_MS elapses is never counted", () => {
  const trips: true[] = [];
  const guard = createFrameBudgetGuard(
    () => trips.push(true),
    () => {},
  );
  guard.sample(0, 0); // seeds startedAt at 0

  // WINDOW unmistakably slow samples (a 300ms gap, 6x SLOW_FRAME_MS), fed
  // with `now` pinned at 500 — comfortably inside the WARMUP_MS (1000)
  // window. A window this size, this uniformly slow, trips the breaker
  // immediately once warmup has genuinely elapsed (see the "trip" test
  // below) — real rAF timestamps could never produce WINDOW samples with
  // a >50ms gap inside a 1000ms warmup window in the first place (that
  // needs 3000ms of real elapsed time), so this isolates the warmup gate
  // itself rather than testing something realistic timing could ever
  // construct on its own.
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) guard.sample(500, 200);

  expect(
    trips,
    "slow samples taken during warmup must never trip the breaker",
  ).toEqual([]);
});

test("trip: fires once a full window's slow ratio reaches TRIP_RATIO, not before", () => {
  const h = makeHarness();
  for (let i = 0; i < FRAME_BUDGET.WINDOW - 1; i++) h.frame(SLOW);
  expect(h.trips, "must not trip before a full window is sampled").toEqual([]);

  h.frame(SLOW);
  expect(
    h.trips.length,
    "a 100% slow window clears TRIP_RATIO and must trip, exactly once",
  ).toBe(1);
});

test("recover: fires once the rolling ratio falls back to RECOVER_RATIO", () => {
  const h = makeHarness();
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(SLOW);
  expect(h.trips.length).toBe(1);

  // Roll the window over with fast frames, each evicting the oldest slow
  // one, until the slow share is exactly RECOVER_RATIO.
  const slowToKeep = Math.round(FRAME_BUDGET.WINDOW * FRAME_BUDGET.RECOVER_RATIO);
  for (let i = 0; i < FRAME_BUDGET.WINDOW - slowToKeep; i++) h.frame(FAST);

  expect(h.recovers.length, "ratio at RECOVER_RATIO must recover").toBe(1);
});

test("hysteresis: a ratio between RECOVER_RATIO and TRIP_RATIO neither re-trips nor recovers", () => {
  const h = makeHarness();
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(SLOW);
  expect(h.trips.length).toBe(1);

  // Roll the window down to a ratio strictly between the two thresholds
  // (0.6 and 0.25) — below where it would trip again, but still above
  // where it would recover. Without the gap between TRIP_RATIO and
  // RECOVER_RATIO, a ratio sitting anywhere near the boundary would flap
  // on/off every time one sample rolls out of the window; this is the
  // test that would catch RECOVER_RATIO drifting up to meet TRIP_RATIO.
  const midRatio = (FRAME_BUDGET.TRIP_RATIO + FRAME_BUDGET.RECOVER_RATIO) / 2;
  const slowToKeep = Math.round(FRAME_BUDGET.WINDOW * midRatio);
  for (let i = 0; i < FRAME_BUDGET.WINDOW - slowToKeep; i++) h.frame(FAST);

  expect(
    h.recovers,
    "a mid-band ratio must not recover — it's still above RECOVER_RATIO",
  ).toEqual([]);
  expect(
    h.trips.length,
    "a mid-band ratio must not re-trip either — it's below TRIP_RATIO and the guard was already tripped",
  ).toBe(1);
});

test("latch: a second trip in the same session stops recovery for good", () => {
  const h = makeHarness();

  // First trip, then a full, genuine recovery — behaves exactly like the
  // dedicated trip/recover tests above.
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(SLOW);
  expect(h.trips.length).toBe(1);
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(FAST);
  expect(h.recovers.length).toBe(1);

  // Second trip.
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(SLOW);
  expect(h.trips.length).toBe(2);

  // The exact same fully-clean window that recovered it the first time
  // must NOT recover it now — FRAME_BUDGET.LATCH_AFTER_TRIPS (2) latches
  // the guard for the rest of its life once the second trip fires. This
  // is the regression this whole file exists to pin: the pre-fix guard
  // recovered here every time, which is the ~3s trip/recover oscillation
  // the finding reported (both effects flapping between masked/lit and
  // bone/ember on a steady, unrecovering device).
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(FAST);
  expect(
    h.recovers.length,
    "a second trip must latch — no further recovery this session",
  ).toBe(1);

  // A third trip-worthy burst doesn't even re-fire onTrip: `tripped` never
  // cleared (recover is what clears it, and recover is exactly what's
  // latched out), so `!tripped` stays false. Documents the latch's actual
  // mechanism rather than asserting a second, independent requirement.
  for (let i = 0; i < FRAME_BUDGET.WINDOW; i++) h.frame(SLOW);
  expect(h.trips.length).toBe(2);
});
