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
static file server, e.g. `npm run start` (a pinned local `serve`) or
`npx serve out`.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Local dev server at `http://localhost:3000` |
| `npm run build` | Static export to `./out` (zero type errors required) |
| `npm run start` | Serve the built `./out` with the pinned local `serve` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Playwright smoke + axe scan against `./out` (build first) |
| `npm run budget` | Gzipped-JS and landing-page media weight ceilings (`scripts/check-budget.mjs`) |
| `npm run art` | Fetches and crops the eight plates from Wikimedia Commons into `public/art/`, and writes `src/lib/art.lock.json` |
| `npm run check:art` | Verifies every committed plate file's sha256 against the lockfile — this is the CI gate |

`public/art/` (the plate stills) and `src/lib/art.lock.json`
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
  ceiling for the landing page's paintings (`scripts/check-budget.mjs`)
- `npm run check:links` — crawls every emitted `out/*.html` file and resolves
  every internal href/src/srcset to a real export file, correctly under
  either deploy's basePath shape (derived from the build's own `_next` URLs,
  not assumed); external GitHub links get a non-blocking HEAD check
  (`scripts/check-links.mjs`)
- `npm run check:content` — the stranger test, encoded: fails if an insider
  term (`dispatch instants`, `SDSC SP2`, `TOST`) renders on the index
  outside the `#scheduler`/`#research` acts that actually explain it
  (`scripts/check-content-lint.mjs`)
- `npm test` — Playwright smoke tests against `./out` (page renders, ⌘K
  palette opens and jumps, anchors navigate, résumé resolves, case-study
  routes 200, internal links resolve, plate credits render, the lamp turns
  on and moves with scroll) plus an axe accessibility scan that must report
  zero violations
- `tests/seo.spec.ts` — per-page title/description/canonical, OG/Twitter
  cards (real 1200×630 PNGs, absolute URLs), JSON-LD (`Person` + `WebSite`
  on `/`, `SoftwareSourceCode` per case study), sitemap/robots correctness
  under `site.url`, the GitHub Pages 404/deep-link export shape, and both
  résumé paths
- `tests/hirepath.spec.ts` — the thirty-second recruiter path: land on `/`,
  the hero states who this is in one click's reach of the Warden case file,
  the résumé resolves as a real PDF, and a `mailto:` contact link exists —
  gated on interaction count, not wall-clock (CI timing is noisy; DOM-ready
  timing is still logged, non-blocking)
- `scripts/check-lighthouse.mjs` — Lighthouse category minimums (mobile +
  desktop) and a CLS cap; thresholds are a ratchet, raised as numbers
  improve, never lowered to pass.

A second, additive CI job builds the export a second time with
`NEXT_PUBLIC_BASE_PATH`/`NEXT_PUBLIC_SITE_URL` set exactly the way
`deploy-pages.yml` computes them for this repo (the GitHub Pages sub-path
shape), then runs `npm run check:links` and the Playwright smoke suite
against that build specifically — the root-shape job above tests the Vercel
deploy shape and stays the primary gate.

## Editing content

All copy lives in [`src/content.ts`](src/content.ts) — bio, projects, act
statements, achievements, certifications, skills, education, links, and the
closing line. Components only render what that file exports, so text edits never
touch markup.

Two conventions worth knowing before editing it:

- **`acts`** holds one display line per act, plus which painting the act is set
  in. Every statement is a quotation or faithful condensation of copy that
  already exists elsewhere in the file — that is deliberate, so no claim on the
  site's largest type is unsourced.
- **`certifications`** carries the credential itself (issuer, date, registration
  number, and an optional scan under `public/certificates/`), while
  `achievements` carries the one-line result. An entry whose `image` file is
  absent renders its text alone rather than breaking the build.

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
  alpha is reserved for rules and the lamp's own gradients.
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
  It is the only light: the pool falls off softly (opaque to 30% of its
  radius, gone by 100%) and carries a faint ember core, so it reads as a
  held candle rather than a spotlight. A second rendering of it — a
  page-wide cursor torch that dimmed everything outside its own pool — was
  removed on 2026-09-05 at the owner's request for a single, premium lamp.
  **The default, JavaScript-free state is fully lit** —
  the reveal mask only exists once the client turns the lamp on, so a no-JS or
  reduced-motion visitor gets a painted page, never a black one.
- The night archive is the sound of the room the paintings hang in: an
  authored medieval tune — D Dorian on a physically modelled plucked
  string, over a drone fifth, with room tone and sparse hearth crackle
  beneath (all synthesized, composed in `src/lib/sound.ts`) at 22%, on
  by default behind an honest first-interaction gate, muted by one
  visible control ("Soundscape: on/off", rail and menu). Four interface sounds
  exist — wood for the panels, brass for the switch, wax for the seal —
  and no fifth; sound never carries a confirmation alone. On a fine
  pointer the cursor is a bone compass needle with a lens ring
  (pure CSS, inline SVG, no ember — it is a graphic); coarse pointers,
  text, form fields and forced-colors keep their native cursors.
- The lamp has a **frame-budget breaker** that sheds the effect on a device
  that genuinely cannot hold it — judged over a rolling window, and
  **recoverable**: it suspends rather than destroys, and restores itself once
  frames are healthy again. An earlier version tripped after ten consecutive
  sub-31fps frames and tore the listeners down permanently, which meant the
  light died on the first real scroll and never returned. A regression test now
  scrolls the page through every act and asserts the lamp is still alive.
- Controls (`Bracket.tsx`) are **wax-seal cartouches**: a doubled hairline frame
  with a small seal mark at the leading edge and letterspaced Newsreader caps.
  Ember appears only on hover and focus, never at rest — it has the least
  contrast headroom on this palette, so it is an accent and not a text colour.
  Focus is styled distinctly from hover so keyboard state is never ambiguous.
- Every act is a still painting — no zoom, no push-in, no scroll-scrubbed
  video. An earlier build carried a short scroll-scrubbed clip on four of
  the eight acts and a slight scroll-driven push-in on all eight; the owner
  saw the shipped effect live and asked for the zoom to go, so it was
  removed entirely (2026-08-20) — the lamp's light is the only thing that
  still moves.
- Type: Newsreader carries one display line per act (and the seal
  monogram's "R"); Manrope carries the small uppercase labels; Chivo Mono
  carries everything else, including every measured number at every size;
  Chivo (sans) is used only for reading passages. All loaded with
  `next/font`.
- The nav carries the seal monogram (also the favicon and Apple icon —
  one geometry in `src/lib/mark.ts`) and a live clock in the owner's own
  time zone beside the name.
- Provenance: every act and every record still carries a mono provenance
  line (date · status · stack · repo · tests/CI), augmented at build time
  with live GitHub data via `src/lib/github.ts` — the footer fetches this
  repo itself, so the record carries its own verification. Every act's line
  now also credits its painting (artist, title, year, Commons link) — art is
  sourced the same way code is.
- Motion: one reveal per act, playing once on first scroll arrival and never
  replayed on scroll-back — the act's copy fades into place and its
  statement lands word by word inside that same beat — plus the lamp's
  continuous drive and the benchmark bars growing once on approach. No per-section entrance
  animations beyond the one-per-act reveal, and no motion on the paintings
  themselves; everything has a `prefers-reduced-motion` fallback.
- Case files open with a static, non-interactive painted header — no
  scroll-scrubbing, but still lit by a static, centred lamp mask (there's
  no `[data-act]` ancestor for the scroll-driven one to scrub) — and
  otherwise keep the previous grammar: a sticky left title rail
  against the record on the right (problem → approach + pipeline diagram →
  decisions → evidence → outcome). The evidence table's rows are plain bold
  tabular numbers, not inverted or ignited — case files have no `[data-act]`
  for the lamp to scrub, so ignition is a landing-page-only device.
- Print: tokens flip to black-on-white, every painting is
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

- More achievements and certifications (hackathons, CTFs, rankings) — the
  ledger lists what exists today; add real ones to `content.ts` only, and drop
  any accompanying scan into `public/certificates/`.
- Optional headshot — not currently used by the design; if wanted, add to
  `public/` and extend the About section.

## Known open items

Recorded rather than hidden:

- **The *Alchemist* plate (the About act) reads weak on phones.** Every crop in
  the set is landscape while a phone viewport is tall, so `object-fit: cover` is
  height-bound and vertical framing has no slack to use. A portrait
  `cropNarrow` was added for it, which helps but does not fully solve it; a
  tighter narrow crop is the real fix.
