"use client";

import { useEffect } from "react";

/**
 * The one moving part on the site.
 *
 * A single rAF loop, one passive scroll listener, one passive pointermove
 * listener. Each frame it writes three custom properties per visible act:
 * `--p` (0→1 progress through the act) and `--lamp-x` / `--lamp-y` (the
 * light's position as a percentage of the act box). Everything visual is
 * CSS reading those properties — no React state, no re-renders on scroll.
 *
 * The default, JS-free state is "fully lit". This component switches the
 * page into masked mode by setting `data-lamp="on"`, so a no-JS visitor
 * and a reduced-motion visitor both get a handsome static painted page
 * rather than a black one.
 */
export default function Lamp() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine)").matches;

    let acts: HTMLElement[] = [];
    const visible = new Set<HTMLElement>();
    const pointer = { x: 0.5, y: 0.5, active: false };
    let frame = 0;
    let slowFrames = 0;
    let last = 0;

    const collect = () => {
      acts = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
      observer.disconnect();
      for (const act of acts) observer.observe(act);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visible.add(el);
          else visible.delete(el);
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

      const vh = window.innerHeight;
      for (const act of visible) {
        const r = act.getBoundingClientRect();
        // 0 when the act's top hits the viewport bottom, 1 when its
        // bottom leaves the top.
        const span = r.height + vh;
        const p = Math.min(1, Math.max(0, (vh - r.top) / span));

        const restX = Number(act.dataset.lampX ?? 0.5);
        const restY = Number(act.dataset.lampY ?? 0.5);

        // Scroll walks the light down the frame around its rest position;
        // the pointer nudges it, but never takes it over.
        let x = restX;
        let y = restY - 0.22 + p * 0.44;
        if (fine && pointer.active) {
          x += (pointer.x - 0.5) * 0.28;
          y += (pointer.y - 0.5) * 0.18;
        }

        act.style.setProperty("--p", p.toFixed(4));
        act.style.setProperty("--lamp-x", `${(x * 100).toFixed(2)}%`);
        act.style.setProperty("--lamp-y", `${(y * 100).toFixed(2)}%`);
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
