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

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Local dev server at `http://localhost:3000` |
| `npm run build` | Static export to `./out` (zero type errors required) |
| `npm run start` | Serve the built `./out` with `npx serve` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Playwright smoke + axe scan against `./out` (build first) |
| `npm run budget` | Gzipped-JS and landing-page media weight ceilings (`scripts/check-budget.mjs`) |
| `npm run art` | Fetches, crops, and encodes the eight plates from Wikimedia Commons into `public/art/`, and writes `src/lib/art.lock.json` |
| `npm run check:art` | Verifies every committed plate file's sha256 against the lockfile — this is the CI gate |

`public/art/` (the plate images and motion clips) and `src/lib/art.lock.json`
are **committed to the repo**. `npm run art` is never run in CI — it hits
the Wikimedia Commons API and is slow and network-dependent. It's a manual,
occasional step: run it locally, review the output, and commit the result
when a plate's crop or framing changes. CI only ever runs `npm run
check:art`, which checks the committed files against the lockfile and never
touches the network.

## Quality gates

CI (`.github/workflows/ci.yml`) enforces, on every push and PR:

- `npm run check:art` — every committed plate file matches its lockfile
  entry; the build never contacts Wikimedia
- `npm run typecheck` and `npm run lint` — zero errors
- `npm run budget` — gzipped-JS ceiling per exported page plus a media-weight
  ceiling for the landing page's paintings and scroll-scrubbed video clips
  (`scripts/check-budget.mjs`)
- `npm test` — Playwright smoke tests against `./out` (page renders, ⌘K
  palette opens and jumps, anchors navigate, résumé resolves, case-study
  routes 200, internal links resolve, plate credits render, the lamp turns
  on and moves with scroll) plus an axe accessibility scan that must report
  zero violations
- `scripts/check-lighthouse.mjs` — Lighthouse category minimums (mobile +
  desktop) and a CLS cap; thresholds are a ratchet, raised as numbers
  improve, never lowered to pass.

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

Concept: **“Lamplight”** — a scroll-driven, candlelit portfolio built on
eight public-domain paintings, where a moving light source reveals both the
art and the metrics. Nothing is asserted outright; only what the light
reaches is proven. `DESIGN.md` holds the full system, including a table of
all eight paintings with their Commons sources; tokens live in
`src/app/globals.css` `@theme`.

- Palette: `#08070A` ground, `#F2EDE3` bone signal, `#E8A33D` ember, and
  nothing else. **There is no grey and no second accent.** Ember is the
  rarest mark on the site — it lights a measured number under the lamp's
  mask and nothing else; it never touches prose or a control. Fractional
  alpha is reserved for rules and the lamp/torch's own gradients.
- Emphasis is light, not inversion. The previous design's page-wide
  `.negative` flip is gone; a control like `Bracket` or a nav link swaps its
  own two colours on hover, but nothing swaps a whole region's ground and
  mark anymore. A number "ignites" — bone signal becomes ember — only once
  the lamp's pool actually reaches it: `Lamp.tsx` compares each metric's
  real screen position against the lamp's, every rAF tick, and toggles the
  ember state directly, rather than masking the metric the way the
  painting itself is masked.
- Eight full-bleed acts (`Act.tsx`), each set in a painting fetched from
  Wikimedia Commons, cropped, and committed to `public/art/` with a sha256
  lockfile so CI never touches the network. They sit in normal document
  flow — not pinned, not scroll-jacked — with one exception: the ledger
  act's background painting is `position: sticky` so it stays visible behind
  its own long-scrolling list of archive rows.
- The lamp (`Lamp.tsx`) is the one moving part: a single rAF loop reads
  scroll position and pointer position and writes CSS custom properties onto
  each visible act; everything visual is CSS reading them, not React state.
  A desktop-only cursor torch (`Torch.tsx`) shares the same pointer and
  smoothing constant, so the two read as one light rather than two.
  **The default, JavaScript-free state is fully lit** — the reveal mask only
  exists once the client turns the lamp on, so a no-JS or reduced-motion
  visitor gets a painted page, never a black one.
- Four of the eight acts (hero, warden, scheduler, plantpal) also carry a
  short scroll-scrubbed video, seeked by scroll position and never played on
  a timer; the other four ship stills only, to hold the media budget.
- Type: Newsreader carries one display line per act; Chivo Mono carries
  everything else, including every number at every size; Chivo (sans) is
  used only for reading passages. All loaded with `next/font`.
- Provenance: every act and every record still carries a mono provenance
  line (date · status · stack · repo · tests/CI), augmented at build time
  with live GitHub data via `src/lib/github.ts` — the footer fetches this
  repo itself, so the record carries its own verification. Every act's line
  now also credits its painting (artist, title, year, Commons link) — art is
  sourced the same way code is.
- Motion: one reveal per act, playing once on first scroll arrival and never
  replayed on scroll-back, plus the lamp/torch's continuous drive and the
  benchmark bars growing once on approach. No per-section entrance
  animations beyond the one-per-act reveal; everything has a
  `prefers-reduced-motion` fallback that also removes any motion video from
  the DOM outright.
- Case files open with a static, non-interactive painted header (no lamp
  mask) and otherwise keep the previous grammar: a sticky left title rail
  against the record on the right (problem → approach + pipeline diagram →
  decisions → evidence → outcome). The evidence table's highlighted rows now
  ignite instead of inverting.
- Print: tokens flip to black-on-white, every painting and the torch are
  dropped, act copy is forced visible regardless of scroll state, and link
  targets are printed after their text.

### Deviations from the brief

- The scheduler study stays in **Featured work**; the separate **Research**
  act carries the constructive-takeaway pull quote and the benchmark chart,
  so the two don't duplicate each other.
- The ⌘K command palette from the previous design is unchanged and remains
  the fastest way to jump a section, open a repository, or copy the contact
  email.

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
