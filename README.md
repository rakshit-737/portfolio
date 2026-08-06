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

Concept: **“the evidence file”** — the site reads like a precise researcher’s
record. Tokens (defined in `src/app/globals.css` `@theme`):

- Palette: graphite `#101418` background, surface `#171C22`, text `#E8EAED`,
  muted `#98A2AD`, **verdict amber** `#E0A83C` (signature element and key
  numbers only — hero stats, headline numbers, bolded bullet metrics, the
  chart's tie rows, evidence-table values), **steel** `#7FB4D9`
  (links/interactive), pass/fail `#4CAF7D`/`#D26B6B` inside metadata chips
  only and only for verifiable outcomes (tests, CI) — never status labels.
  `--color-bar #507087` exists solely for presentational chart bars.
- Type: Archivo (display), Public Sans (body), IBM Plex Mono (all metadata,
  numbers, labels), loaded with `next/font`.
- Signature element: the **evidence strip** — a mono provenance line
  (date · status · stack · repo · tests/CI) heading every project card, echoed
  by the typed `verified:` line under the hero name (typed once on load;
  `prefers-reduced-motion` renders it instantly). Strips are augmented at
  build time with live GitHub data (stars, head sha → commit link, CI
  conclusion → Actions link) via `src/lib/github.ts`; the footer fetches this
  repo itself, so the record carries its own verification.
- Proof above the fold: a mono hero stat strip (CGPA · tests in CI · dispatch
  instants), every number sourced from `content.ts`.
- Motion inventory (all with reduced-motion fallbacks): hero page-load
  reveal, typed provenance line, scroll reveals per section, sliding nav
  scroll-spy indicator, cursor-tracked hairline glow on cards, benchmark
  bars growing on first reveal. Nothing else.
- Case-study pages follow the same grammar: numbered sections (problem →
  approach + inline SVG pipeline diagram → decisions → evidence table →
  outcome), evidence strip header, amber reserved for the numbers.
- Print: theme tokens flip to a light record-on-paper palette; interactive
  chrome is hidden.
- Easter egg: `~` opens a read-only "evidence shell" (`help`, `whoami`,
  `ls projects`, `cat resume.txt`, `open <section>`); all output comes from
  `content.ts`.

### Deviations from the brief

- The 🥇 in the achievements copy is rendered as an amber award icon
  (lucide) instead of the emoji, to respect the "no emoji noise" design ban
  while keeping the "First Prize" content intact.
- The scheduler study stays in **Featured Projects** (it is Featured 2, with
  its headline-numbers strip on the card); the separate **Research Spotlight**
  section carries the constructive-takeaway pull quote, so the two sections
  don't duplicate each other.
- The original "one reveal in the hero, nothing else" motion rule grew into
  the inventory above — each addition is deliberate, quiet, and disabled
  under `prefers-reduced-motion`.

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
