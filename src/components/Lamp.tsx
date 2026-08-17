"use client";

import { useEffect } from "react";
import { POINTER_LERP, createFrameBudgetGuard } from "@/lib/motion";

/**
 * The one moving part on the site.
 *
 * A single rAF loop, one passive pointermove listener, one
 * IntersectionObserver. Each frame it writes four custom properties per
 * visible act: `--p` (0→1 linear progress through the act), `--pe` (the
 * same progress eased, for anything that should start and end gently),
 * and `--lamp-x` / `--lamp-y` (the light's position as a percentage of the
 * act box). Everything visual is CSS reading those properties — no React
 * state, no re-renders on scroll. The same loop also drives each act's
 * motion video, if it has one: `video.currentTime` is set from `--pe`, so
 * scroll — not time — is the video's only clock; it is never played.
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
 * The default, JS-free state is "fully lit", with no video at all. This
 * component switches the page into masked mode by setting `data-lamp="on"`,
 * so a no-JS visitor and a reduced-motion visitor both get a handsome
 * static painted page rather than a black one.
 */
export default function Lamp() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      // The video is decorative and duplicates the still beneath it — under
      // reduced motion it must be absent, not merely hidden. Nothing else
      // in this component runs, so this is a one-time sweep, not a second
      // observer or loop.
      for (const v of document.querySelectorAll<HTMLVideoElement>("video.plate-motion")) {
        v.remove();
      }
      return;
    }

    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine)").matches;
    // Captured once on mount: on narrow screens the copy sits at the
    // bottom of the frame rather than the left, so the bias below swaps
    // from "push the light right" to "push the light up".
    const narrow = window.matchMedia("(max-width: 48rem)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // A metered connection, or a small touch device, is exactly where a
    // 4-second video loop per act costs the most and is seen the least —
    // skip promoting any video's `src` at all rather than fetch it unseen.
    const saveData =
      (navigator as unknown as { connection?: { saveData?: boolean } }).connection
        ?.saveData === true;
    const motionAllowed = !saveData && !(coarse && window.innerWidth < 700);

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

    // Promotes `data-src` to `src` on every plate's motion video, once —
    // that is the entire difference between "no request happens without
    // JavaScript" (the markup carries no `src`) and "the video actually
    // plays" (JS decides to fetch it). Guarded by `!v.src` so a later
    // `collect()` call (e.g. on resize) never re-triggers a load.
    const promoteVideos = () => {
      if (!motionAllowed) return;
      for (const v of document.querySelectorAll<HTMLVideoElement>(
        "video.plate-motion[data-src]",
      )) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
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

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.active = true;
    };

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
        // Eased progress for anything that should start and end gently —
        // the video scrub and the plate push-in. Raw `--p` stays linear
        // for the mask, which wants a constant-speed sweep.
        const eased = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;

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
        act.style.setProperty("--pe", eased.toFixed(4));
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

        // Scroll is the video's only clock — it is never played. Seeking
        // is cheap because the encode is keyframe-dense (Task 14b).
        const video = act.querySelector<HTMLVideoElement>("video.plate-motion");
        if (video && video.readyState >= 1 && video.duration) {
          const t = eased * video.duration;
          if (Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    const teardown = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", collect);
    };

    root.setAttribute("data-lamp", "on");
    collect();
    promoteVideos();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", collect, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      teardown();
      root.removeAttribute("data-lamp");
    };
  }, []);

  return null;
}
