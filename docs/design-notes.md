<!-- Moved from the README on 2026-09-18 so the README can open with what
the site is. DESIGN.md is the authority on the visual system; these notes
are the narrative of how it got here, dated where a change was dated. Two
lines were corrected in the move: the cursor does carry ember (its gem),
and the seal is the owner's carved plate, not the traced monogram. -->

# Design notes

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
  visible control ("Soundscape: on/off", rail and menu). The interface speaks
  in small physical sounds — wood for the panels, brass for the switch,
  wax for the seal, and a minor harp chime for every other button —
  never on hover or scroll, and never as the only confirmation. On a fine
  pointer the cursor is a medieval key, anything clickable shows the
  padlock it opens, and reading text shows an I-beam key (original
  drawings in bone-toned metal with a small ember gem; source and build in
  `docs/design/cursors/`). The static CSS images are the baseline for
  every visitor; with scripting on and motion allowed, `Cursor.tsx` lays
  an animated rendering over them. Coarse pointers and forced-colors keep
  their native cursors.
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
- Type: Newsreader carries one display line per act; Manrope carries the small uppercase labels; Chivo Mono
  carries everything else, including every measured number at every size;
  Chivo (sans) is used only for reading passages. All loaded with
  `next/font`.
- The nav carries the seal — a carved-stone plate supplied by the owner
  (`public/icon.png`; `public/mark.png` in the nav, also the favicon and
  Apple icon) — and a live clock in the owner's own time zone beside the
  name. It replaced a traced Newsreader monogram (`src/lib/mark.ts`,
  deleted 2026-09-08).
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

## Deviations from the brief

- The scheduler study stays in **Featured work**; the separate **Research**
  act carries the constructive-takeaway pull quote and the benchmark chart,
  so the two don't duplicate each other.
- The ⌘K command palette from the previous design is unchanged and remains
  the fastest way to jump a section, open a repository, or copy the contact
  email.
