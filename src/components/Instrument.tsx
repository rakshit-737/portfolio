"use client";

import { useEffect, useRef } from "react";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { experience } from "@/content";
import type { InstrumentHandle } from "@/lib/instrumentGL";
import { getTier } from "@/lib/fx";
import { onLampFrame } from "@/lib/lampBus";

/** Fired by Experience.tsx on the visitor's first real movement. */
export const WAKE_EVENT = "lamplight:wake";
/** Fired by the Konami secret and by seven quick presses. */
export const EXPLODE_EVENT = "lamplight:explode";

const TICKS = Array.from({ length: 60 }, (_, i) => i);

/**
 * The instrument — the lamp's body, in the corner of every page.
 *
 * A real button (it opens the control center — the palette), drawn first
 * as an SVG gimbal so it exists for every visitor, then — after the wake,
 * on a hardware GPU, with effects on — overlaid by its WebGL body
 * (src/lib/instrumentGL.ts), which the page's own lamp lights. The SVG
 * is also the ignition's landing point: the calibration dial flies here
 * and becomes it (Ignition.tsx).
 *
 * `data-voice`: the palette's own wood tap already voices the press, so
 * the delegated chime must not add a second sound (one sound per press).
 */
export default function Instrument() {
  const ref = useRef<HTMLButtonElement>(null);
  const handle = useRef<InstrumentHandle | null>(null);
  const presses = useRef<number[]>([]);
  const engraving = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let cancelled = false;
    let exploded = false;

    const setExploded = (on: boolean) => {
      exploded = on;
      host.toggleAttribute("data-exploded", on);
      handle.current?.explode(on);
    };
    const onExplode = () => setExploded(!exploded);

    const onWake = () => {
      if (getTier() !== "full" || handle.current) return;
      void import("@/lib/instrumentGL").then(({ mountInstrument }) => {
        if (cancelled || handle.current) return;
        const h = mountInstrument(host.querySelector<HTMLElement>(".inst-stage")!);
        if (h) {
          handle.current = h;
          host.setAttribute("data-gl", "");
        }
      });
    };

    // The engraving on the exploded view is real telemetry: how many
    // frames the page's one loop has drawn this visit.
    let frames = 0;
    const offFrames = onLampFrame(() => {
      frames++;
      if (exploded && engraving.current) {
        engraving.current.textContent = `${experience.instrument.exploded} · ${frames} frames`;
      }
      return false;
    });

    window.addEventListener(WAKE_EVENT, onWake);
    window.addEventListener(EXPLODE_EVENT, onExplode);
    if (document.documentElement.hasAttribute("data-awake")) onWake();
    return () => {
      cancelled = true;
      offFrames();
      window.removeEventListener(WAKE_EVENT, onWake);
      window.removeEventListener(EXPLODE_EVENT, onExplode);
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  const onClick = () => {
    const now = performance.now();
    presses.current = [...presses.current.filter((t) => now - t < 2500), now];
    if (presses.current.length >= 7) {
      presses.current = [];
      window.dispatchEvent(new Event(EXPLODE_EVENT));
      return;
    }
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
  };

  return (
    <button
      ref={ref}
      type="button"
      data-voice
      data-instrument
      aria-label={experience.instrument.label}
      aria-keyshortcuts="Control+K"
      onClick={onClick}
      className="instrument print-drop"
    >
      <span className="inst-stage" aria-hidden="true">
        <svg className="inst-svg" viewBox="-50 -50 100 100">
          <g className="inst-scale">
            <circle r="44" className="inst-line" />
            {TICKS.map((i) => (
              <line
                key={i}
                x1="0"
                y1={i % 5 === 0 ? -44 : -44}
                x2="0"
                y2={i % 5 === 0 ? -38 : -41}
                transform={`rotate(${i * 6})`}
                className="inst-line"
              />
            ))}
          </g>
          <ellipse rx="34" ry="12" className="inst-line inst-gimbal-a" />
          <ellipse rx="12" ry="34" className="inst-line inst-gimbal-b" />
          <circle r="25" className="inst-line inst-inner" />
          <circle r="11" className="inst-lens" />
          <circle r="4" className="inst-core" />
        </svg>
      </span>
      <span ref={engraving} className="inst-engraving label" aria-hidden="true" />
    </button>
  );
}
