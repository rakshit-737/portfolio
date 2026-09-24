import type { ReactNode } from "react";
import { plates, type PlateId } from "@/lib/art";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/**
 * A full-viewport act. The lamp finds it by `data-act` and writes `--p`
 * (the act's own scroll progress), `--lamp-x` and `--lamp-y` onto it each
 * frame; the light's travel comes from that progress, not from pinning.
 *
 * Not scroll-jacked: the page scrolls at native speed and nothing here
 * intercepts wheel or touch events.
 */
export default function Act({
  id,
  label,
  lamp,
  children,
  className = "",
  overflow = "hidden",
  plate,
}: {
  /** The act's painting — printed as a catalogue index at the top right:
   *  plate number, title and year, and the lamp's rest point (art.ts). */
  plate?: PlateId;
  id: string;
  label: string;
  lamp: { x: number; y: number };
  children: ReactNode;
  className?: string;
  /** Critical 2 fix: `overflow-hidden` turns the act into a scroll
   *  container, which traps a `position: sticky` descendant to a
   *  scrollport that never scrolls — it can never pin. Every act except
   *  the ledger holds its own painting directly (nothing inside it needs
   *  to pin against anything past the act's own edges), so `"hidden"` is
   *  the right default there: it clips any scrim bleed (the plate itself
   *  has carried no push-in or zoom of any kind since 2026-08-20 — see
   *  AGENTS.md/DESIGN.md — so this is no longer also clipping a scale
   *  effect). The ledger's plate wrapper genuinely is
   *  sticky (page.tsx), so it needs a real scrolling ancestor further up
   *  the tree (the document) to pin against — `"visible"` clips only the
   *  horizontal axis (`overflow-x-clip`), so the scrim's own bleed can't
   *  open a horizontal scrollbar, while leaving the vertical axis truly
   *  `visible` rather than `hidden`/`auto`, which is what keeps this act
   *  from becoming a scroll container in the first place. */
  overflow?: "hidden" | "visible";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-act=""
      data-lamp-x={lamp.x}
      data-lamp-y={lamp.y}
      className={`relative isolate min-h-[100svh] ${overflow === "hidden" ? "overflow-hidden" : "overflow-x-clip overflow-y-visible"} ${className}`}
    >
      {children}
      {plate && (
        <div aria-hidden="true" className="act-index print-drop">
          <span className="label">
            pl. {ROMAN[Object.keys(plates).indexOf(plate)]} · {plates[plate].year}
          </span>
          <br />
          <span className="font-mono font-normal tracking-normal normal-case">
            lamp {lamp.x.toFixed(2)} / {lamp.y.toFixed(2)}
          </span>
        </div>
      )}
      <p className="label absolute bottom-6 left-5 z-10 opacity-100 sm:left-8 lg:left-12">
        {label}
      </p>
    </section>
  );
}
