"use client";

import { useEffect } from "react";

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
    let slowFrames = 0;
    let last = 0;

    const collect = () => {
      // disconnect() fires no final "not intersecting" callback, so any
      // element that leaves the query between collections would otherwise
      // stay in `visible` forever, driven every frame from a detached node.
      visible.clear();
      acts = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
      observer.disconnect();
      for (const act of acts) observer.observe(act);
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

    const tick = (now: number) => {
      // If the page cannot hold a frame budget ten times running, the lamp
      // is costing more than it is worth on this device. Lock it lit.
      if (last && now - last > 32) {
        if (++slowFrames >= 10) {
          root.removeAttribute("data-lamp");
          teardown();
          return;
        }
      } else {
        slowFrames = 0;
      }
      last = now;

      // The lamp has weight. It follows the pointer rather than snapping
      // to it — a held lantern, not a cursor.
      if (fine && pointer.active) {
        smooth.x += (pointer.x - smooth.x) * 0.08;
        smooth.y += (pointer.y - smooth.y) * 0.08;
      }

      const vh = window.innerHeight;
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
