/**
 * The mark: a seal monogram. A Newsreader "R" — the site's own display
 * voice, at its display optical size — set inside the same square,
 * doubled-hairline frame the wax-seal cartouche (`Bracket.tsx`) draws
 * around every control. Bone on ground, and nothing else: a mark is a
 * graphic, so it never carries ember (DESIGN.md, Ember Is Rare).
 *
 * One geometry, four renderings: `Mark.tsx` (inline SVG in the nav, in
 * `currentColor` so the brand link's hover inversion carries it),
 * `src/app/icon.svg` (the favicon Next links from `<head>`),
 * `public/favicon.ico` (`scripts/gen-favicon.mjs`, rasterised from
 * icon.svg with a hand-pixelled 16px frame) and `apple-icon.png`
 * (`src/app/apple-icon.png/route.tsx`, drawn by Satori). icon.svg is a
 * static file and cannot import this module, so it carries a verbatim
 * copy of `MARK_PATH`; `tests/brand.spec.ts` fails the build if the two
 * ever drift.
 *
 * `MARK_PATH` is the glyph's real outline, traced with fontTools from the
 * Newsreader variable font at `opsz` 72 (the display cut `.statement`
 * uses) and fitted to a 64-unit box: 30 units tall, centred on (32, 32).
 * Everything here is in that 64-unit space.
 */
export const MARK_VIEWBOX = 64;

/** Outer frame: the control's own rule. */
export const MARK_OUTER = { x: 2, y: 2, size: 60, stroke: 2.5 } as const;
/** Inner frame: the rule around the chamber, a gutter in from the outer. */
export const MARK_INNER = { x: 9, y: 9, size: 46, stroke: 1.5 } as const;

export const MARK_PATH =
  "M34.11 30.83Q36.62 30.83 38.49 29.81Q40.36 28.78 41.40 26.97Q42.44 25.17 42.44 22.85Q42.44 20.43 41.02 19.26Q39.60 18.09 36.26 18.09H30.91L31.25 17.00H37.43Q40.59 17.00 42.53 17.75Q44.47 18.50 45.38 19.82Q46.29 21.14 46.29 22.83Q46.29 25.31 44.99 27.23Q43.70 29.14 41.21 30.24Q38.73 31.35 35.13 31.46V31.41Q36.62 31.41 37.62 31.87Q38.62 32.33 39.30 33.26Q39.98 34.19 40.48 35.63L43.05 43.03Q43.57 44.49 43.92 45.15Q44.26 45.81 44.76 45.97Q45.27 46.14 46.21 46.14L45.98 46.87Q44.10 47.04 42.92 46.99Q41.73 46.94 41.01 46.56Q40.29 46.18 39.84 45.41Q39.40 44.64 38.98 43.36L36.51 35.76Q35.95 34.00 35.53 33.19Q35.11 32.38 34.65 32.15Q34.19 31.92 33.44 31.92H26.67L27.01 30.83ZM25.63 45.62 29.01 46.45 28.91 46.87H17.71L17.84 46.45L21.56 45.62L29.89 18.25L26.49 17.42L26.61 17.00H34.34Z";
