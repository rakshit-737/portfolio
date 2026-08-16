# Rakshit Rameshbabu — Portfolio

Personal portfolio for **Rakshit Rameshbabu — Software & Security Engineer**.
Built with Next.js (App Router) + TypeScript + Tailwind CSS, fully statically
exported — no server runtime. One index page plus three case-study pages at
`/projects/[id]` (`warden`, `scheduler`, `plantpal`).

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build (static export)

```bash
npm run build      # outputs the static site to ./out
```

The build must complete with zero type errors. Preview the export with any
static file server, e.g. `npx serve out`.

## Quality gates

CI (`.github/workflows/ci.yml`) enforces, on every push and PR:

- `npm run typecheck` and `npm run lint` — zero errors
- `npm run budget` — gzipped-JS ceiling per exported page
  (`scripts/check-budget.mjs`; ceiling 210 kB, baseline ≈ 192 kB — the
  Next 16 + React 19 hydration runtime dominates)
- `npm test` — Playwright smoke tests against `./out` (page renders, ⌘K
  palette opens and jumps, anchors navigate, résumé resolves, case-study
  routes 200, internal links resolve) plus an axe accessibility scan that
  must report zero violations
- `scripts/check-lighthouse.mjs` — Lighthouse category minimums (mobile +
  desktop) and a CLS cap; thresholds are a ratchet, raised as numbers
  improve, never lowered to pass. Mobile performance is tracked honestly
  at the framework-hydration baseline rather than gamed.

## Editing content

All copy lives in [`src/content.ts`](src/content.ts) — bio, projects,
achievements, skills, education, links. Components only render what that file
exports, so text edits never touch markup.

## Deployment

### Vercel (primary)

Zero-config: import the repo in Vercel. The static export is detected
automatically. Optionally set `NEXT_PUBLIC_SITE_URL` to the production URL so
Open Graph tags, `sitemap.xml`, and `robots.txt` emit absolute URLs for the
right domain.

### GitHub Pages (fallback)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
builds the export and deploys it with the official Pages actions on every push
to `main`. Enable it once in the repo settings: **Settings → Pages → Source →
GitHub Actions**. The workflow computes `NEXT_PUBLIC_BASE_PATH` and
`NEXT_PUBLIC_SITE_URL` from the repo name, so project pages
(`user.github.io/repo`) work without edits.

## Environment variables (build-time, all optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin used in OG tags, sitemap, robots | `https://rakshit-737.github.io` |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path prefix when not served from the domain root | empty |

## Design notes

Concept: **“the data field”** — an engineer’s record rendered as a data
field, where the numbers are the page at the scale of the thing they measure.
`DESIGN.md` holds the full system; tokens live in `src/app/globals.css`
`@theme`.

- Palette: `#000` field, `#fff` signal, and nothing else. **There is no grey.**
  Hierarchy comes from scale, tracking and density rather than from dimmed
  text, so every text pair on the site sits at 21:1. Fractional alpha is
  reserved for rules and bar fields, which are graphics, not language.
- Inversion is the only emphasis device: `.negative` re-declares the four
  colour tokens and flips a whole region to white ground. The Research
  section (the negative result) and the Contact close are inverted; so is the
  evidence table on every case file. The class is deliberately *not* called
  `invert` — Tailwind ships an `invert` filter utility that would cancel it.
- Type: Chivo Mono at every size, with Chivo (sans) used only for reading
  passages, loaded with `next/font`.
- Materials: hairline bar fields, a sine lattice, binary matrices, bracketed
  controls with barcode end-caps. Field geometry is generated deterministically
  at build time from a seeded PRNG (`src/lib/field.ts`), so the export is
  byte-stable and nothing ships to the client. A bar field measures nothing;
  every rendered *number* traces to `content.ts` or to live GitHub data.
- Provenance: every record carries a mono provenance line (date · status ·
  stack · repo · tests/CI), augmented at build time with live GitHub data
  (stars, head sha → commit link, CI conclusion → Actions link) via
  `src/lib/github.ts`. The footer fetches this repo itself, so the record
  carries its own verification. A project’s binary matrix is cut from its
  head commit SHA — change the commit and the pattern changes.
- Motion: **one authored moment.** On load, the hero field resolves left to
  right and the sine draws. The only other motion is the benchmark bars
  growing once when scrolled to. No per-section entrance animations, no hover
  effects; everything has a `prefers-reduced-motion` fallback.
- Case files follow the same grammar: the section title sits in a left rail,
  the record on the right (problem → approach + pipeline diagram → decisions →
  evidence → outcome), with the evidence table inverted.
- Print: tokens flip to black-on-white, full-bleed fields are dropped, and
  link targets are printed after their text.

### Deviations from the brief

- The 🥇 in the achievements copy is not rendered — the achievement is stated
  as a record row, respecting the “no emoji” ban while keeping the “First
  Prize” content intact.
- The scheduler study stays in **Featured work**; the separate **Research**
  section carries the constructive-takeaway pull quote and the benchmark
  chart, so the two don’t duplicate each other.
- The `~` evidence shell from the previous design was dropped: a terminal
  window is the one thing this world cannot contain without becoming the
  developer-portfolio cliché it exists to refuse. The ⌘K index remains.

## Discoverability

- `llms.txt` — machine-readable summary generated from `content.ts` at build
  time.
- JSON-LD: `Person` + `WebSite` on the index, `SoftwareSourceCode` per case
  study.
- Per-page metadata and OG cards styled as evidence strips (`/og.png` and
  `/projects/[id]/og.png`), rendered at build time with real brand fonts
  fetched from Google Fonts (graceful fallback when offline).

## Still to fill in

- `CERTIFICATE_URL` — set `certificateUrl` on the Cyber Secure 360 achievement
  in [`src/content.ts`](src/content.ts).
- More achievements (hackathons, CTFs, certifications, rankings) — the
  section currently lists two items; add real ones to `content.ts` only.
- Optional headshot — not currently used by the design; if wanted, add to
  `public/` and extend the About section.
