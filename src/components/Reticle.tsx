"use client";

import { useEffect, useRef } from "react";
import { experience } from "@/content";
import { getTier } from "@/lib/fx";

type State = "" | "inspect" | "measure" | "view" | "depart";

/**
 * The cursor's annotation — context, beside the owner's key and lock
 * (which stay exactly as drawn; a6ba23b). A 24px hairline mark that
 * names what the pointer is over:
 *   inspect  — a project specimen: an inspection lens
 *   measure  — a lit measurement (`.ignite`): two measuring brackets
 *   view     — open painting, nothing else under the pointer: an aperture
 *   depart   — a link that leaves the site: a departure tag
 * Fine pointers only, never under reduced motion, reduced effects or
 * forced colours (CSS). Decoration: aria-hidden, no focus, no events.
 * Position is written on pointermove directly (no loop); the state only
 * on pointerover — the target changes far less often than the position.
 */
export default function Reticle() {
  const ref = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let state: State = "";
    const set = (s: State) => {
      if (s === state) return;
      state = s;
      el.dataset.state = s;
      if (label.current) label.current.textContent = s ? experience.reticle[s] : "";
    };

    const classify = (t: Element): State => {
      const link = t.closest<HTMLAnchorElement>("a[href]");
      if (link) {
        const external = /^https?:/.test(link.getAttribute("href") ?? "") && link.host !== location.host;
        return external ? "depart" : "";
      }
      if (t.closest(".ignite")) return "measure";
      if (t.closest("button, input, [role='option'], [role='dialog']")) return "";
      if (t.closest("[data-specimen]")) return "inspect";
      // Open painting: the pointer is on the act or its plate, not on copy.
      if (t.closest(".plate") || t.matches("[data-act], .scrim")) return "view";
      return "";
    };

    const onOver = (e: PointerEvent) => {
      if (getTier() === "off" || !(e.target instanceof Element)) return set("");
      set(classify(e.target));
    };
    const onMove = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    const onLeave = () => set("");

    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="reticle" data-state="" aria-hidden="true">
      <span className="ret-a" />
      <span className="ret-b" />
      <span ref={label} className="ret-label label" />
    </div>
  );
}
