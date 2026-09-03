import type { ReactNode } from "react";

/**
 * A framed "exhibit" — real evidence presented like a museum plate laid
 * over an act's painting, not a pasted web screenshot. A doubled bone
 * hairline frame (an outer `rule` border, a 3px gutter, then an inner
 * `rule-soft` border around an opaque `ground` chamber) holds the artifact
 * itself — the same doubled-rule grammar the wax-seal cartouche
 * (`Bracket.tsx`) and the provenance line already use — with a mono
 * `.label` caption underneath carrying a provenance line for it.
 *
 * Always a child of an act's `.scrim` content layer (rendered by the call
 * site, same as `Statement`/`Rail`/`Provenance`), sitting above the plate
 * stack. Never insert this into `Plate.tsx`'s own three-layer stack
 * (`.plate-dark` → `.plate-lit` → `.plate::after`) — an exhibit must stay
 * ambiently visible on first paint and never masked by the lamp: the lamp
 * dramatizes the record, it does not gate it (see DESIGN.md's
 * Lamp-Dramatizes-Never-Gates Rule).
 */
export default function Exhibit({
  caption,
  children,
  wide = false,
}: {
  caption: string;
  children: ReactNode;
  /** Opts out of the default `max-w-2xl` cap for content that already sits
   *  safely inside its own act's `.scrim` protected band at full width
   *  (the scheduler's `BenchmarkChart`, unchanged from its pre-exhibit
   *  width). Every other exhibit keeps the cap so it can't grow past the
   *  standard (non-`.scrim-wide`) act's protected band — see the
   *  `.scrim-wide` comment in `src/app/page.tsx` for why that band is
   *  scoped to the scheduler act alone. */
  wide?: boolean;
}) {
  // `className` was a prop here until B4/B5/B6/B8 (final fix wave) dropped
  // it — none of the three call sites (page.tsx's warden/plantpal
  // exhibits, BenchmarkChart.tsx's scheduler one) ever passed one.
  return (
    <figure className={`mt-12 ${wide ? "" : "max-w-2xl"}`}>
      <div className="border border-rule p-[3px]">
        <div className="border border-rule-soft bg-ground p-4 sm:p-6">
          {children}
        </div>
      </div>
      <figcaption className="label mt-3 normal-case">{caption}</figcaption>
    </figure>
  );
}
