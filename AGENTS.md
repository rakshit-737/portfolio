<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo conventions

## Concept: "lamplight"

A scroll-driven, candlelit portfolio built on public-domain paintings, where
a movable light source reveals both the art and the metrics. `DESIGN.md` is
the authority on the visual system; this is the short version.

- **Three values, no fourth.** `--color-ground` `#08070A`, `--color-signal`
  `#F2EDE3` (bone), `--color-ember` `#E8A33D`. There is no grey. Ember marks
  a lit number and nothing else — never prose, never a graphic. Rules
  (`--color-rule`, `--color-rule-soft`) are `--color-signal` at fractional
  alpha only. Tokens live in `src/app/globals.css` `@theme`.
- **Emphasis is light, not inversion.** The old `.negative` region-flip is
  gone entirely — nothing here swaps a whole surface's ground and mark. A
  number ignites (`Ignite.tsx` — one element whose `color` transitions
  from bone to ember; never a second copy of the text) when the lamp's
  pool actually reaches it — `Lamp.tsx` compares each visible act's `.ignite` elements'
  real screen centres against the lamp's own pixel position every rAF
  tick and toggles a `.is-lit` class, which CSS fades over 240ms
  (`globals.css`). Deliberately not a second `mask-image`: a mask's
  percentages resolve against the masked element's own box, which is
  correct for `.plate-lit` (which fills the act) and meaningless for a
  few-character-wide metric. A control (`Bracket`, `Nav` link) swaps its
  own two colours on hover, which is a local device, not a resurrection of
  the old mechanism. Never name an inversion-like class `invert` —
  Tailwind ships an `invert` filter utility and the two silently cancel.
- **Eight full-bleed acts** (`Act.tsx`, `data-act`), each set in a
  public-domain painting (`src/lib/art.ts`) fetched from Wikimedia Commons,
  cropped, and committed to `public/art/` with a sha256 lockfile
  (`src/lib/art.lock.json`) so CI never contacts Wikimedia — `npm run
  check:art` verifies every file against it. Acts are **not** pinned or
  scroll-jacked; the page scrolls at native speed. Only the ledger act's
  background plate is `position: sticky`, so it stays visible behind its own
  long scrolling archive. Every plate carries a visible credit
  (`creditOf()` / `withCredit()`, `src/lib/credit.ts`) — art is sourced the
  way code is.
- **The lamp** (`Lamp.tsx`) is the one moving part: a single rAF loop, an
  `IntersectionObserver`, and a pointermove listener, writing `--p` /
  `--lamp-x` / `--lamp-y` onto each visible act; everything visual is CSS
  reading those properties. **The default, JS-free state is fully lit** —
  the mask exists only once the client sets `data-lamp="on"` on `<html>`, so
  a no-JS or reduced-motion visitor gets a painted page, not a black one.
- **One light.** The lamp is the only light source on the site. A second
  rendering of it — the torch (`Torch.tsx`), a desktop-only page-wide
  cursor flashlight that dimmed nav, copy and chart outside its own pool —
  was removed 2026-09-05 at the owner's request ("a single, premium lamp").
  Its `POINTER_LERP` and frame-budget guard live on in `src/lib/motion.ts`
  for the lamp alone. The lamp's pool has a long, soft falloff (opaque to
  30% of `--lamp-r`, gone by 100%) and a faint ember core (12%, on the
  plate's top layer) — the one graphic ember is allowed to touch.
- **The paintings themselves never move.** Every plate is a still image;
  there is no push-in, no zoom, and no scroll-scrubbed video anywhere on
  the site — removed 2026-08-20 (`feat: the light is the only moving thing
  — remove every zoom`) after the owner saw the shipped zoom/push-in live
  and asked for it gone, keeping only the lamp's light as a moving part.
  All eight acts ship stills only.
- Fonts: Newsreader carries the eight act statements (`Statement.tsx`,
  `.statement`) and the seal monogram's "R" (`src/lib/mark.ts`); Manrope
  600 carries every small uppercase tracked line (`.label` — eyebrows,
  provenance, nav links, chips, the clock); Chivo Mono carries everything
  else, **including every measured number at every size**; Chivo (sans)
  carries reading passages (`.prose-field`). No emoji.
- **One authored moment per act, once.** An act's copy resolves into place
  on its first intersection (`data-seen`, set once, never replayed on
  scroll-back), and within that same beat the statement's words land one
  after another (`Statement.tsx` wraps them as `.word`; a case-file
  header plays the same beat on load via `data-reveal`). There are no
  other entrance animations.
- **The night archive** (`src/lib/sound.ts`, the engine; `Soundscape.tsx`,
  its boot shim; `SoundToggle.tsx`, its one control) is the sound layer:
  a candlelit chamber — an authored D-Dorian tune on a Karplus–Strong
  plucked string (composed IN `src/lib/sound.ts`, not sourced), over a
  drone fifth, room tone and sparse crackle — at 22% volume (raised from
  12% at the owner's request, 2026-09-05), on by
  default but never against the browser or the load: **no AudioContext
  exists until the page's first real interaction** (`new AudioContext()`
  alone measured 72ms of real main thread — ~290ms of simulated mobile
  TBT, a whole CI perf-gate failure), so `<html data-soundscape>` reads
  `pending` at load and the first touch starts the hearth unprompted —
  which also satisfies every autoplay policy; attempts only ever run on
  a gesture, never a loop. Paused when the tab hides; persisted under
  `night-archive:sound`. **Every sound is synthesized at
  runtime — there is no audio file in this repo and no audio request
  anywhere** (a rights ruling as much as a perf one; see the night-archive
  plan). Interface sounds, all via `playUi()` (which gates on the global
  setting itself): palette open/close and mobile-menu toggle (wood tap),
  soundscape toggle (brass click), email-copy success (wax seal), and —
  owner request 2026-09-05, overriding the original
  never-on-ordinary-clicks clause — a chime (a small minor harp
  flourish) on EVERY other button, wired as one delegated click
  listener in `initSoundscape`; a button with a dedicated sound marks
  itself `data-voice` so nothing ever plays two sounds for one press.
  Hover and scroll stay silent, and a sound is never the only
  confirmation. The
  cursor is the key and the lock (globals.css, pure CSS, 40px): a
  medieval key as the default, the padlock it opens over anything
  clickable — both ORIGINAL drawings (the owner's downloaded cursor pack
  was license-barred from redistribution; rulings doc, 2026-09-05) —
  shown only under `(pointer: fine) and (hover: hover)`, bone-on-ground
  (no ember — graphics), text keeps its I-beam, `auto`/`pointer`
  fallbacks declared, and the whole thing yields under forced-colors.
  Browsers cannot animate a CSS cursor; no script may drive one.
- **Document order is paint order** in the three-layer plate stack
  (`.plate-dark` → `.plate-lit` → `.plate::after`, all `position: absolute`
  with no `z-index`). Reordering these layers makes the lamp invisible —
  a structural and a behavioural test both guard it.

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
  dependencies need a one-line justification. `sharp` is a devDependency —
  the art pipeline (`scripts/fetch-art.mjs`) uses it to crop plates at
  build time only; it never ships to the client.
- Accessibility non-negotiable: full keyboard path, visible focus, correct
  landmarks/heading order, WCAG AA contrast (ember included — it carries
  body-sized numbers, not just large text), reduced-motion everywhere. The
  axe scan in CI must stay at zero violations. Never dim text to signal a
  state — this palette has no contrast headroom to spend.
- A `[data-a] [data-b]` selector is a descendant combinator, not a compound
  one. `data-lamp` lives on `<html>`, which has no ancestor: any rule that
  needs it together with another `<html>` attribute must be written
  `[data-a][data-b]` with no space.
- Satori (the OG image renderer) cannot do CSS masks, so OG cards never use
  the lamp, and it has no glyph for the superscript minus — run any
  superscript-bearing string through `ogText()` (`src/lib/ogFonts.ts`)
  before it reaches an OG card. On the page itself, Chivo Mono has no
  glyphs for ⁰ or ⁴–⁹ either: keep writing exponents as Unicode
  superscripts in `content.ts` (readable there and in `llms.txt`) and
  render them through `Metric`, which turns each run into a `<sup>` of
  plain digits in the brand font — never emit a raw superscript run
  straight into JSX.
- In card bullets, `**text**` marks the single strongest metric — rendered
  by `Metric` as a bold mono chip (`.metric`). One per bullet, sparingly.
  This is a static emphasis, not an ignition: only measurements driven
  through `.ignite` (rail values, headline numbers, benchmark highlights)
  carry ember.

## Commands

- `npm run build` — static export to `./out` (zero type errors required)
- `npm run lint` / `npm run typecheck`
- `npm test` — Playwright smoke + axe against `./out` (build first)
- `npm run budget` — gzipped-JS and media-weight ceilings
  (`scripts/check-budget.mjs`)
- `npm run art` — fetches and crops the eight plates from Wikimedia Commons
  into `public/art/`; run manually and commit the result, never in CI
- `npm run check:art` — verifies every committed plate file's sha256 against
  `src/lib/art.lock.json`; this is the CI gate, not `npm run art`
- CI: `.github/workflows/ci.yml` (quality gate) and `deploy-pages.yml`
  (GitHub Pages deploy; computes basePath from repo name)
