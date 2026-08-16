<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo conventions

## Concept: "the data field"

The record rendered as a data field — the numbers are the page, at the scale
of the thing they measure. `DESIGN.md` is the authority on the visual system;
this is the short version.

- **Two values, no third.** `#000` and `#fff`. There is no grey in this
  palette: hierarchy comes from scale, tracking and density, never from
  dimmed text. Fractional alpha belongs only to rules and bar fields, which
  are graphics rather than language. Tokens live in `src/app/globals.css`
  `@theme` as `--color-field`, `--color-signal`, `--color-rule`,
  `--color-rule-soft`.
- **Inversion is the emphasis mechanism.** `.negative` re-declares those four
  tokens and flips a whole region to white ground. Never call the class
  `invert` — Tailwind ships an `invert` filter utility and the two cancel out.
- Signature materials: hairline bar fields (`BarField`), the sine lattice
  (`SineLattice`), binary matrices cut from real commit SHAs (`BitMatrix`),
  bracketed controls with barcode end-caps (`Bracket`), and the provenance
  line (`Provenance`), augmented at build time with live GitHub
  stars/head-sha/CI (`src/lib/github.ts`).
- Field geometry is deterministic (`src/lib/field.ts`, seeded) so the export
  is byte-stable. A bar field encodes no measurement; anything rendered as a
  *number* comes from `src/content.ts` or live GitHub data.
- Fonts: Chivo Mono everywhere; Chivo (sans) only for reading passages
  (`.prose-field`). No emoji.
- **One authored moment:** the hero field resolves left-to-right and the sine
  draws, once, on load. No per-section entrance animations. Every animation
  has a `prefers-reduced-motion` fallback.

## Hard rules

- **Never invent facts.** Every visible claim traces to `src/content.ts`, a
  linked repo, or the owner's explicit input. When information is missing,
  ask — do not fabricate.
- `src/content.ts` is the single source of truth for every word on the site.
  Components only render what it exports.
- Static export must keep working on both deploys: Vercel (root) and GitHub
  Pages sub-path. Internal assets and internal page links go through
  `withBase` / `NEXT_PUBLIC_BASE_PATH` (Next 16's export prefetch 404s on
  `next/link` here; a smoke test guards it).
- No heavy dependencies (no UI kits, no animation frameworks). New
  dependencies need a one-line justification.
- Accessibility non-negotiable: full keyboard path, visible focus, correct
  landmarks/heading order, WCAG AA contrast, reduced-motion everywhere. The
  axe scan in CI must stay at zero violations. Never dim text to signal a
  state — this palette has no contrast headroom to spend.
- In card bullets, `**text**` marks the single strongest metric — rendered by
  `Metric` as an inverted chip. One per bullet, sparingly.

## Commands

- `npm run build` — static export to `./out` (zero type errors required)
- `npm run lint` / `npm run typecheck`
- `npm test` — Playwright smoke + axe against `./out` (build first)
- `npm run budget` — gzipped-JS ceiling (`scripts/check-budget.mjs`)
- CI: `.github/workflows/ci.yml` (quality gate) and `deploy-pages.yml`
  (GitHub Pages deploy; computes basePath from repo name)
