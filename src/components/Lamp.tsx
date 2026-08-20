"use client";

import { useEffect } from "react";
import { POINTER_LERP, createFrameBudgetGuard } from "@/lib/motion";

/**
 * The one moving part on the site.
 *
 * A single rAF loop, one passive pointermove listener, one
 * IntersectionObserver. Each frame it writes three custom properties per
 * visible act: `--p` (0→1 linear progress through the act) and `--lamp-x` /
 * `--lamp-y` (the light's position as a percentage of the act box).
 * Everything visual is CSS reading those properties — no React state, no
 * re-renders on scroll.
 *
 * The same tick also ignites `.ignite` metrics: a CSS `mask-image` can't do
 * this (a mask's `at var(--lamp-x) var(--lamp-y)` percentages resolve
 * against the masked element's OWN box, and a metric's box is nothing like
 * the act's — see the comment on `.ignite` in globals.css for the bug that
 * produced. So it's done here in real pixels instead: each visible act's
 * `.ignite` elements are enumerated once per `collect()` (the set is small
 * and stable — this is not a per-frame query), and every tick compares each
 * one's `getBoundingClientRect()` centre against the lamp's own pixel
 * position (the act's rect plus the same fractional `x`/`y` this tick
 * already computes for `--lamp-x`/`--lamp-y`), toggling `.is-lit` — spec
 * §4.1: "no per-element observers".
 *
 * The default, JS-free state is "fully lit". This component switches the
 * page into masked mode by setting `data-lamp="on"`, so a no-JS visitor and
 * a reduced-motion visitor both get a handsome static painted page rather
 * than a black one.
 *
 * Idle-stop: the loop is not unconditional. With no scroll and no pointer
 * movement for IDLE_MS, and the pointer-lerp chase already settled to
 * within CHASE_EPS of its target (so stopping never freezes a visibly
 * mid-flight lamp), `tick` simply declines to schedule its own next frame
 * instead of calling `requestAnimationFrame` again — a genuinely idle tab
 * costs nothing per frame rather than one rect-read + write per visible
 * act, forever. `wake()` is the single place that restarts it: called from
 * every input the loop needs to react to (scroll, pointermove, resize), it
 * timestamps the activity and, if the loop had stopped, resets `last` to 0
 * before requesting a new frame — `last = 0` matters because
 * `guard.sample` reads `now - last` as the frame's own dt, and a stale
 * `last` from before the idle gap would otherwise read as one huge,
 * spuriously "slow" frame. The frame-budget guard itself needs no other
 * accommodation: it already only mutates its rolling window from inside
 * `sample`, which simply isn't called while the loop is stopped, so
 * `startedAt`/`tripped`/`tripCount`/`latched` all sit exactly where idle-
 * stop found them and resume from there — "persisted across stop/start" is
 * the guard's default behaviour, not something this component has to ask
 * for.
 */
export default function Lamp() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine)").matches;
    // Captured once on mount: on narrow screens the copy sits at the
    // bottom of the frame rather than the left, so the bias below swaps
    // from "push the light right" to "push the light up".
    const narrow = window.matchMedia("(max-width: 48rem)").matches;

    let acts: HTMLElement[] = [];
    const visible = new Set<HTMLElement>();
    const pointer = { x: 0.5, y: 0.5, active: false };
    // The lamp trails the pointer rather than snapping to it — a held
    // lantern, not a cursor. Seeded at centre so the first frame doesn't
    // lurch in from wherever `pointer` happens to start.
    const smooth = { x: 0.5, y: 0.5 };
    let frame = 0;
    let last = 0;
    // Whether the frame-budget guard has shed this effect's work. While
    // suspended the page falls back to the default, JS-free "fully lit"
    // rendering (`data-lamp` absent) rather than a frozen mid-reveal frame.
    let suspended = false;
    // Idle-stop: how long the loop may go with no scroll and no pointer
    // movement before it stops scheduling its own next frame. ~600ms is
    // long enough that ordinary reading pauses (a beat between scroll
    // gestures) don't thrash it on and off, short enough that a reader who
    // has actually stopped isn't still paying a per-frame cost a second
    // later.
    const IDLE_MS = 600;
    // The pointer-lerp chase (`smooth` below) must have visibly converged
    // on the pointer's raw position before the loop is allowed to stop —
    // otherwise stopping mid-chase would freeze the lamp partway through
    // its glide toward the cursor instead of at rest. In the same
    // viewport-fraction space `smooth`/`pointer` already use; 0.0008 is
    // well under a visible pixel at any realistic viewport width.
    const CHASE_EPS = 0.0008;
    let lastActivity = 0;
    let stopped = false;
    // Each act's `.ignite` elements, gathered once per collect() rather
    // than queried inside the per-frame loop — see the class doc comment.
    const igniteByAct = new Map<HTMLElement, HTMLElement[]>();

    const collect = () => {
      // disconnect() fires no final "not intersecting" callback, so any
      // element that leaves the query between collections would otherwise
      // stay in `visible` forever, driven every frame from a detached node.
      visible.clear();
      acts = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
      observer.disconnect();
      igniteByAct.clear();
      for (const act of acts) {
        observer.observe(act);
        igniteByAct.set(act, Array.from(act.querySelectorAll<HTMLElement>(".ignite")));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            visible.add(el);
            // One authored beat per act, on first arrival, never replayed:
            // the attribute is only ever added, never removed, so the
            // copy-reveal CSS it gates never re-triggers on a later pass.
            if (!el.hasAttribute("data-seen")) el.setAttribute("data-seen", "");
          } else {
            visible.delete(el);
            // An act that stops intersecting also stops being ticked, so
            // any `.is-lit` its metrics already picked up would otherwise
            // freeze lit forever — clear it here, once, on the way out.
            const igniteEls = igniteByAct.get(el);
            if (igniteEls) {
              for (const ig of igniteEls) ig.classList.remove("is-lit");
            }
          }
        }
      },
      { rootMargin: "10% 0px" },
    );

    /** Timestamps the activity and, if the loop had actually stopped,
     *  restarts it. `last = 0` before restarting is deliberate — see the
     *  "Idle-stop" doc comment above the component for why a stale `last`
     *  from before the idle gap would otherwise read as one spuriously
     *  slow frame to the guard. */
    const wake = (now: number) => {
      lastActivity = now;
      if (stopped) {
        stopped = false;
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.active = true;
      wake(e.timeStamp);
    };

    const onScroll = () => wake(performance.now());

    // Suspends rather than tears down: a device that can't hold frame
    // budget gets the lamp turned off (the page falls back to the default
    // fully-lit rendering), but the rAF loop below keeps running and keeps
    // feeding this guard real timestamps either way, so it notices the
    // device recovering from a transient stall and re-arms on its own — the
    // first time. A second trip in the same session latches the guard and
    // it stays off for the rest of the visit rather than oscillating
    // between armed and suspended every few seconds. See src/lib/motion.ts
    // (FRAME_BUDGET, createFrameBudgetGuard) for the rolling-window numbers
    // and why they replace the old "10 consecutive frames over 32ms →
    // teardown()" breaker, which fired on ordinary scrolling and, once
    // tripped, never recovered for the rest of the session — the exact bug
    // this guard exists to fix. Shares the guard's
    // shape (not its instance) with Torch.tsx: each effect judges its own
    // frame budget independently, the same way each already kept its own
    // separate `slowFrames` counter before this fix.
    const guard = createFrameBudgetGuard(
      () => {
        suspended = true;
        root.removeAttribute("data-lamp");
      },
      () => {
        suspended = false;
        root.setAttribute("data-lamp", "on");
      },
    );

    const tick = (now: number) => {
      guard.sample(now, last);
      last = now;

      // Suspended: skip the per-frame work the guard exists to shed, but
      // keep the loop alive — `guard.sample` above still runs every tick,
      // which is what lets the lamp re-arm once frame budget is healthy
      // again.
      if (suspended) {
        frame = requestAnimationFrame(tick);
        return;
      }

      // The lamp has weight. It follows the pointer rather than snapping
      // to it — a held lantern, not a cursor. Shares POINTER_LERP with
      // Torch.tsx: the lamp's pool and the torch's beam are one light,
      // and a different smoothing constant would make them visibly drift
      // apart at different rates.
      if (fine && pointer.active) {
        smooth.x += (pointer.x - smooth.x) * POINTER_LERP;
        smooth.y += (pointer.y - smooth.y) * POINTER_LERP;
      }

      const vh = window.innerHeight;
      // 1vmax in px — used to turn the plate mask's `--lamp-r` formula
      // (globals.css: `26vmax + min(p, 1-p) * 30vmax`) into a real pixel
      // radius for the ignite comparison below. Computed once per tick,
      // not per act — window size doesn't change mid-frame.
      const vmax = Math.max(window.innerWidth, vh) / 100;
      for (const act of visible) {
        const r = act.getBoundingClientRect();
        // 0 when the act's top hits the viewport bottom, 1 when its
        // bottom leaves the top.
        const span = r.height + vh;
        const p = Math.min(1, Math.max(0, (vh - r.top) / span));

        const rawX = Number(act.dataset.lampX ?? 0.5);
        const rawY = Number(act.dataset.lampY ?? 0.5);
        // The painting's light source is where the lamp *wants* to sit,
        // but the text column owns the left of the frame on wide screens
        // and the bottom of the frame on narrow ones — push the rest
        // position into whichever half is actually open.
        const restX = narrow ? rawX : Math.max(0.52, rawX);
        const restY = narrow ? Math.min(0.38, rawY) : rawY;

        // Scroll walks the light down the frame around its rest position;
        // the pointer nudges it, but never takes it over.
        let x = restX;
        let y = restY - 0.22 + p * 0.44;
        if (fine && pointer.active) {
          x += (smooth.x - 0.5) * 0.28;
          y += (smooth.y - 0.5) * 0.18;
        }

        act.style.setProperty("--p", p.toFixed(4));
        act.style.setProperty("--lamp-x", `${(x * 100).toFixed(2)}%`);
        act.style.setProperty("--lamp-y", `${(y * 100).toFixed(2)}%`);

        // Critical 1: the lamp's real pixel position — `x`/`y` above are
        // fractions of THIS act's box (that's what `--lamp-x`/`--lamp-y`
        // need to be, since `.plate-lit`'s mask resolves against the same
        // box), so converting to a viewport pixel point takes the act's own
        // rect, not the viewport's. Matches the mask's own radius formula
        // (globals.css `--lamp-r`) so the ignite pool and the plate's lit
        // pool agree on how big the light is.
        const igniteEls = igniteByAct.get(act);
        if (igniteEls && igniteEls.length > 0) {
          const lampPxX = r.left + x * r.width;
          const lampPxY = r.top + y * r.height;
          const lampR = (26 + Math.min(p, 1 - p) * 30) * vmax;
          // The plate mask is fully opaque out to 46% of `--lamp-r` and
          // fades to nothing by 88%; a metric either reads as bone or as
          // ember, not fractionally in between, so it ignites at a single
          // radius rather than reproducing that whole falloff — picked at
          // the middle of the fade band so a metric lights up roughly when
          // the plate under it is roughly half-revealed, not only once
          // it's fully in the opaque core.
          const litRadius = lampR * 0.67;
          const litRadiusSq = litRadius * litRadius;
          for (const el of igniteEls) {
            const er = el.getBoundingClientRect();
            const ex = er.left + er.width / 2;
            const ey = er.top + er.height / 2;
            const dx = ex - lampPxX;
            const dy = ey - lampPxY;
            el.classList.toggle("is-lit", dx * dx + dy * dy <= litRadiusSq);
          }
        }
      }

      // Idle-stop: no scroll/pointer activity for IDLE_MS, and the
      // pointer-lerp chase (if it applies at all on this device) has
      // visibly settled — both required, so stopping never freezes the
      // lamp mid-glide. `wake()` above is the only path back in; it is
      // called from every input this loop reacts to (scroll, pointermove,
      // resize).
      const idle = now - lastActivity > IDLE_MS;
      const chaseSettled =
        !fine ||
        !pointer.active ||
        (Math.abs(pointer.x - smooth.x) < CHASE_EPS &&
          Math.abs(pointer.y - smooth.y) < CHASE_EPS);
      if (idle && chaseSettled) {
        stopped = true;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const onResize = () => {
      collect();
      wake(performance.now());
    };

    const teardown = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };

    root.setAttribute("data-lamp", "on");
    collect();
    lastActivity = performance.now();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      teardown();
      root.removeAttribute("data-lamp");
    };
  }, []);

  return null;
}
