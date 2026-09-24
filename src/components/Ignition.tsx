"use client";

import { useEffect, useRef } from "react";
import { experience } from "@/content";

const PHASES = ["ember", "kindle", "label", "lit", "open", "done"] as const;
type Phase = (typeof PHASES)[number];

/** Dispatched once the archive is lit and the veil is gone. */
export const IGNITED_EVENT = "lamplight:ignited";

const DIAL_TICKS = Array.from({ length: 72 }, (_, i) => i);

/**
 * The ignition — "the website wasn't loaded, it was illuminated".
 *
 * Server-rendered, so it exists at first paint; shown only when the head
 * boot script (src/lib/fx.ts) set `data-intro` on <html> — first visit
 * `full`, later visits `brief`, nothing within a session, under reduced
 * motion, reduced effects, or automation. A dark veil holds a single
 * ember at the lamp's rest point; it opens outward from that point,
 * revealing the painting, then the name (the hero's real h1, held by
 * `data-intro-hold` until now), then the nav, which sits farthest from
 * the light. The calibration dial flies to the corner instrument and
 * becomes it.
 *
 * Progress is only ever real: hydration extends the crosshair and prints
 * the ember's measured coordinates; `document.fonts.ready` resolves the
 * index label; the plate's `decode()` closes the dial and warms the
 * ember, and the veil's pinhole widens a step at each, so the painting is
 * literally revealed as its pieces arrive. It opens as soon as both have
 * landed and the full sequence has had its minimum beat (a first visit
 * only); a slow network is capped, never waited on. Any scroll, key or
 * press skips straight to the open. The veil never takes input
 * (`pointer-events: none`), is `aria-hidden`, and the boot script's own
 * 4s timer removes it even if this component never runs.
 */
export default function Ignition({
  target,
  credit,
  lamp,
}: {
  /** Where the light is: the hero act's lamp, or a case file's plate. */
  target: "hero" | "case";
  /** The plate's credit line — the provenance notation under the index. */
  credit: string;
  /** The plate's lamp rest point (fractions of the frame), for first paint. */
  lamp: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const coord = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    const mode = root.getAttribute("data-intro");
    if (!el || !mode || root.getAttribute("data-intro-phase") === "done") return;
    const full = mode === "full";
    let current = 0;
    const phase = (p: Phase) => {
      const i = PHASES.indexOf(p);
      if (i <= current) return;
      current = i;
      root.setAttribute("data-intro-phase", p);
    };

    // Measure the real lamp point (Lamp.tsx's own rest formula).
    const narrow = window.matchMedia("(max-width: 48rem)").matches;
    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    const act = document.getElementById("hero");
    const plate = (act ?? document).querySelector<HTMLElement>(".plate");
    if (target === "hero" && act) {
      const r = act.getBoundingClientRect();
      const x = narrow ? lamp.x : Math.max(0.52, lamp.x);
      const y = narrow ? Math.min(0.38, lamp.y) : lamp.y;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
      px = r.left + x * r.width;
      py = r.top + (y - 0.22 + p * 0.44) * r.height;
    } else if (plate) {
      const r = plate.getBoundingClientRect();
      px = r.left + r.width / 2;
      py = r.top + r.height / 2;
    }
    el.style.setProperty("--ig-x", `${px.toFixed(1)}px`);
    el.style.setProperty("--ig-y", `${py.toFixed(1)}px`);
    if (coord.current) {
      coord.current.textContent = `x ${(px / window.innerWidth).toFixed(3)} · y ${(py / window.innerHeight).toFixed(3)}`;
    }
    phase("kindle");

    const start = performance.now();
    const minBeat = full ? 1300 : 0;
    const cap = full ? 2600 : 700;
    let fontsIn = false;
    let plateIn = false;
    let opened = false;
    const timers: number[] = [];

    const open = (fast: boolean) => {
      if (opened) return;
      opened = true;
      // The dial flies to the instrument and becomes it.
      const inst = document.querySelector<HTMLElement>("[data-instrument]");
      const dial = el.querySelector<SVGElement>(".ig-dial");
      if (inst && dial) {
        const a = dial.getBoundingClientRect();
        const b = inst.getBoundingClientRect();
        el.style.setProperty("--fly-x", `${(b.left + b.width / 2 - (a.left + a.width / 2)).toFixed(1)}px`);
        el.style.setProperty("--fly-y", `${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(1)}px`);
        el.style.setProperty("--fly-s", (b.width / Math.max(1, a.width)).toFixed(3));
      }
      if (fast) root.setAttribute("data-intro-fast", "");
      root.removeAttribute("data-intro-hold");
      phase("open");
      const dur = fast ? 420 : full ? 1250 : 520;
      timers.push(
        window.setTimeout(() => {
          phase("done");
          root.removeAttribute("data-intro-fast");
          window.dispatchEvent(new Event(IGNITED_EVENT));
        }, dur),
      );
    };
    const maybeOpen = () => {
      if (!fontsIn || !plateIn) return;
      phase("lit");
      const wait = Math.max(0, minBeat - (performance.now() - start));
      timers.push(window.setTimeout(() => open(false), wait));
    };

    void document.fonts?.ready.then(() => {
      fontsIn = true;
      phase("label");
      maybeOpen();
    });
    const img = plate?.querySelector<HTMLImageElement>("img.plate-lit");
    const decoded = img ? img.decode().catch(() => undefined) : Promise.resolve();
    void decoded.then(() => {
      plateIn = true;
      maybeOpen();
    });
    timers.push(window.setTimeout(() => open(false), Math.max(0, cap - (performance.now() - start))));

    // Never make anyone wait: any intent skips to the open.
    const skip = () => open(true);
    const events = ["wheel", "pointerdown", "keydown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, skip, { passive: true, once: true });
    return () => {
      for (const t of timers) window.clearTimeout(t);
      for (const e of events) window.removeEventListener(e, skip);
    };
  }, [target, lamp.x, lamp.y]);

  const x = target === "hero" ? Math.max(0.52, lamp.x) : 0.5;
  return (
    <div
      ref={ref}
      className="ignition print-drop"
      aria-hidden="true"
      data-target={target}
      style={
        {
          "--ig-x0": `${(x * 100).toFixed(2)}vw`,
          "--ig-y0":
            target === "hero"
              ? `calc(3.5rem + ${(lamp.y * 100).toFixed(2)}svh)`
              : "calc(3.5rem + 30svh)",
          "--ig-x0n": `${((target === "hero" ? lamp.x : 0.5) * 100).toFixed(2)}vw`,
          "--ig-y0n":
            target === "hero"
              ? `calc(3.5rem + ${(Math.min(0.38, lamp.y) * 100).toFixed(2)}svh)`
              : "calc(3.5rem + 30svh)",
        } as React.CSSProperties
      }
    >
      <div className="ig-veil" />
      <span className="ig-cross ig-cross-h" />
      <span className="ig-cross ig-cross-v" />
      <svg className="ig-dial" viewBox="-60 -60 120 120">
        <circle r="54" className="ig-ring" pathLength={100} />
        <g className="ig-ticks">
          {DIAL_TICKS.map((i) => (
            <line
              key={i}
              x1="0"
              y1="-54"
              x2="0"
              y2={i % 6 === 0 ? -47 : -51}
              transform={`rotate(${i * 5})`}
            />
          ))}
        </g>
        <ellipse rx="40" ry="14" className="ig-ring ig-gimbal" pathLength={100} />
        <circle r="30" className="ig-ring ig-inner" pathLength={100} />
      </svg>
      <span className="ig-ember" />
      <span className="ig-corner ig-tl" />
      <span className="ig-corner ig-tr" />
      <span className="ig-corner ig-bl" />
      <span className="ig-corner ig-br" />
      <div className="ig-caption">
        <p className="ig-index label">{experience.indexMark}</p>
        {/* The credit as generated content: it already renders, as real
            text, on the act's own provenance line — this is its echo. */}
        <p className="ig-credit label normal-case" data-credit={credit} />
        <p className="ig-coord label">
          {experience.calibrating} · <span ref={coord}>—</span>
        </p>
      </div>
    </div>
  );
}
