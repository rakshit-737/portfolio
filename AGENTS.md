<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo conventions

## Concept: "the evidence file"

The site reads like a precise researcher's record. Signature elements, in
order of importance:

- **Evidence strip** (`EvidenceStrip`): mono provenance line on every card,
  augmented at build time with live GitHub stars/head-sha/CI (`src/lib/github.ts`).
- Typed `verified:` line under the hero name (`TypedLine`).
- Palette (tokens in `src/app/globals.css` `@theme`): graphite bg, **verdict
  amber `--color-amber` for key numbers ONLY**, steel `--color-steel` for
  interactive only, pass/fail greens/reds only inside metadata chips for
  verifiable outcomes (tests, CI) — never for status labels.
- Fonts: Archivo (display), Public Sans (body), IBM Plex Mono (ALL metadata,
  numbers, labels). No emoji. Minimal deliberate motion, every animation has
  a `prefers-reduced-motion` fallback.

## Hard rules

- **Never invent facts.** Every visible claim traces to `src/content.ts`, a
  linked repo, or the owner's explicit input. When information is missing,
  ask — do not fabricate.
- `src/content.ts` is the single source of truth for every word on the site.
  Components only render what it exports.
- Static export must keep working on both deploys: Vercel (root) and GitHub
  Pages sub-path. Internal assets go through `withBase` /
  `NEXT_PUBLIC_BASE_PATH`; internal page links use `next/link` (basePath is
  applied automatically).
- No heavy dependencies (no UI kits, no animation frameworks). New
  dependencies need a one-line justification.
- Accessibility non-negotiable: full keyboard path, visible focus, correct
  landmarks/heading order, WCAG AA contrast, reduced-motion everywhere. The
  axe scan in CI must stay at zero violations.
- In card bullets, `**text**` marks the single strongest metric — rendered
  amber by the `Metric` component. One per bullet, sparingly.

## Commands

- `npm run build` — static export to `./out` (zero type errors required)
- `npm run lint` / `npm run typecheck`
- `npm test` — Playwright smoke + axe against `./out` (build first)
- `npm run budget` — gzipped-JS ceiling (`scripts/check-budget.mjs`)
- CI: `.github/workflows/ci.yml` (quality gate) and `deploy-pages.yml`
  (GitHub Pages deploy; computes basePath from repo name)
