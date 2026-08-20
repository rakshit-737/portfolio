---
name: Rakshit Rameshbabu — Portfolio
description: An engineer's record lit by a moving lamp — eight public-domain paintings, three tokens, and every measurement carrying its proof.
colors:
  ground: "#08070A"
  signal: "#F2EDE3"
  ember: "#E8A33D"
  rule: "rgb(242 237 227 / 0.24)"
  rule-soft: "rgb(242 237 227 / 0.12)"
  ground-print: "#ffffff"
  signal-print: "#08070A"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.2rem, 6.5vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.015em"
    maxWidth: "18ch"
  title:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  number:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum 1"
  body:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "tnum 1"
  prose:
    fontFamily: "Chivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.68
    letterSpacing: "0.001em"
    maxWidth: "62ch"
  label:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.19em"
rounded:
  none: "0px"
components:
  bracket-filled:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  bracket-filled-hover:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
  bracket-outline:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  bracket-outline-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ground}"
  bracket-small:
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  chip-pass:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.125rem 0.375rem"
  chip-fail:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.125rem 0.375rem"
  metric:
    fontWeight: 600
    typography: "{typography.body}"
  ignite:
    color: "{colors.signal}"
    colorLit: "{colors.ember}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.625rem"
  nav-link-active:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ground}"
  palette-dialog:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.signal}"
    rounded: "{rounded.none}"
    width: "36rem"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "3.25rem"
    padding: "0 1rem"
---

# Design System: Rakshit Rameshbabu — Portfolio

## Overview

**Creative North Star: "Lamplight"**

This is an engineer's record lit by a moving lamp. Eight public-domain
paintings — Joseph Wright of Derby's scenes of instruments, forges and
demonstrations, and Rembrandt's *Anatomy Lesson* — carry the site's landing
page, each shown near-black until a light finds it. The light is one thing:
a lamp that travels down each painting with scroll, and a cursor-driven
torch layered above it on desktop. Nothing on the page is asserted outright;
only what the light reaches is proven. The world refuses both of the
defaults available to a developer portfolio — the dark terminal with its
green-on-black nostalgia, and the airy white résumé page — by refusing to be
either lit uniformly or dark uniformly.

The palette is three values: `#08070A` ground, `#F2EDE3` bone signal, and
`#E8A33D` ember. There is no grey and no other hue. Ember is the rarest mark
on the site — it touches a lit number and the lamp's own core, and nothing
else. Emphasis is no longer carried by inverting a region (the previous
system's mechanism); it is carried by light itself, which means it can only
ever fall on one thing at a time, the way a real lamp does. Depth is
supplied by the paintings' own midtones rather than by a synthetic shadow or
gradient scale, so the system stays flat everywhere the paint isn't.

Newsreader, a display serif, carries the site's eight act statements and
nothing else — one line per act, set large. Chivo Mono is the working voice
everywhere: body copy, labels, chrome, and — without exception — every
number at every size, so a measured quantity always reads as an instrument
reading rather than a headline. Chivo, its proportional sibling, is reserved
for the passages a reader actually reads rather than scans. Motion is a
single moving part — the lamp's rAF loop, shared with the torch — plus one
per-act copy reveal that plays once on first arrival. The paintings
themselves never move: an earlier build pushed each plate in slightly on
scroll and scrubbed four of the eight acts through a baked zoompan video;
the owner saw both live and asked for the zoom to go, so as of 2026-08-20
every act is a still and the lamp's light is the only thing that moves.

**Key Characteristics:**
- Three values — ground, bone signal, ember — no grey, no other hue.
- Emphasis is light: a number ignites once the lamp's pool actually
  reaches it; nothing inverts a whole region anymore.
- Newsreader for eight display statements; Chivo Mono everywhere else,
  including all numbers; Chivo only for reading passages.
- Eight full-bleed acts, each set in a credited public-domain painting, in
  normal document flow — not pinned, not scroll-jacked.
- One rAF loop drives the lamp and (via a shared pointer and lerp constant)
  the torch; everything else is CSS reading custom properties.
- The default, JavaScript-free state is fully lit, so no-JS and
  reduced-motion visitors see a painted page, never a black one.

## Colors

Three values and the alphas of a hairline rule — the palette is a lamp in a
dark room, not a scheme.

### Primary
- **Signal Bone** (`{colors.signal}`, `#F2EDE3`): every mark of language on
  the page — type, strokes, rules, control borders, the sine's nodes. It is
  also what a lit number looks like before the lamp's pool reaches it.
- **Ember** (`{colors.ember}`, `#E8A33D`): the light itself. It appears in
  exactly two places — the pseudo-element that lights an `.ignite` number
  once the lamp's pool actually reaches it, and nowhere else. It never
  touches prose, never touches a graphic, never fills a control.

### Neutral
- **Ground** (`{colors.ground}`, `#08070A`): the dark a candlelit painting
  sits in. Set on `html` and `body` so no flash of another colour is
  possible during load.
- **Rule** (`{colors.rule}`): every hairline divider, border, underline
  decoration and control edge — `--color-signal` at 24% alpha. This is a
  graphic, so it may carry fractional alpha; type may not.
- **Rule Soft** (`{colors.rule-soft}`): the quieter divider used inside
  dense lists — the ledger's archive rows, the mobile nav menu, the palette
  group headers — `--color-signal` at 12% alpha.

### Named Rules

**The Three Values Rule.** The palette is `#08070A`, `#F2EDE3`, `#E8A33D`.
There is no fourth value, no grey, and no second accent. A new surface that
"needs a colour" needs a different device — light, scale, or a rule.

**The Ember-Is-Rare Rule.** Ember marks a lit measurement, the lamp's own
core, and — its one exception, added with the wax-seal cartouche — a
Bracket control's seal mark on hover or focus, never at rest. It still
never sets a headline, a control's resting colour, a link, or a passage
of prose. If something needs to stand out and it is not a number the lamp
can reach or that one seal, it does not get ember — it gets scale, or
nothing.

**The No-Inversion Rule.** The previous system's region-flip (`.negative`)
does not exist here. Nothing on this site swaps a whole surface's ground and
mark to signal emphasis. A control (`Bracket`, a nav link) may swap its own
two colours on hover or when active — a local, self-contained device — but
that is not a resurrection of the old mechanism, and no new one should be
built. Never name a class `invert` — Tailwind ships an `invert` filter
utility, and the two silently cancel.

**The No-Dimming Rule.** Text is never dimmed, faded, or set at partial
opacity to signal a state. A pending achievement is a dashed outline
(`BracketDisabled`, the pending-certificate row), not low-contrast text.
Fractional alpha belongs only to rules and the lamp/torch's own gradients,
which are graphics rather than language.

## Typography

**Display Font:** Newsreader (fallback `Georgia, serif`), optical-size axis
loaded, weight fixed at 400 by `.statement` — the variable font's normal and
italic styles are both loaded, but nothing on the site currently sets
italic.
**Body Font:** Chivo Mono — the default voice of the whole site.
**Reading Font:** Chivo (fallback `system-ui, sans-serif`), scoped to
`.prose-field` only.
**Label/Mono Font:** Chivo Mono at 0.6875rem, 0.19em tracking, uppercase.

**Character:** Newsreader is the one serif on the site and it appears in
exactly one place — the statement line each act carries — so it reads as a
single authored voice rather than a general heading font. Everything else,
at every scale from a 0.6875rem label to a 5.5rem statement's neighbour, is
the same grotesque monospace doing different jobs.

Tabular figures are on globally (`font-feature-settings: "tnum" 1`), so
every number column aligns without per-element opt-in.

### Hierarchy
- **Display / Statement** (400, `clamp(2.2rem, 6.5vw, 5.5rem)`, line-height
  0.98, tracking -0.015em, max-width 18ch, `text-wrap: balance`): the single
  display line each of the eight acts carries — the owner's name in the
  hero, and one sentence per act after it (`Statement.tsx`, `.statement`).
  Never more than one line's worth of thought.
- **Title** (600, Chivo Mono, tracking -0.025em): case-file section titles
  (1.125rem, `lg:sticky`), and — one step smaller, at 1rem — every record
  title: ledger archive names, achievement titles, education degrees, the
  benchmark chart's own heading.
- **Number** (600, Chivo Mono, 1.5rem rising to 1.875rem at `sm`, tabular,
  line-height none): a measurement the lamp can light — hero rail values,
  a project's headline numbers, the benchmark chart's highlighted rows.
  Driven through `.ignite` with `data-value` so the bone original and its
  ember twin are the same text, read once by assistive tech.
- **Body** (400, 0.875rem, monospace): the site's default voice — rail
  values that are not ignited, nav, chips, tables, chrome, footer.
- **Prose** (400, 1rem, line-height 1.68, max-width 62ch, Chivo): about
  copy, project one-liners, the research pull-quote, bullet bodies, case
  study passages.
- **Label** (0.6875rem, tracking 0.19em, uppercase): `.label`. Every act
  label ("act 01 — the record"), caption, metadata key, chip, nav item and
  provenance segment. Where a label must keep source casing (an email, a
  SHA, a stack name) it takes `normal-case` and keeps the tracking.

### Named Rules

**The Monospace Default Rule.** Chivo Mono is the default for the entire
site, including body copy and every number. The proportional face appears
only inside `.prose-field`; the display serif appears only inside
`.statement`. A new surface does not get to introduce a fourth face.

**The Number-Is-Mono Rule.** Every rendered quantity, at every size from a
label to a headline number, is Chivo Mono with tabular figures — this is
absolute and did not change from the palette's monospace ancestor. A number
never appears in Newsreader or Chivo.

**The One-Statement Rule.** `.statement` is used exactly once per act — the
single display line that act is allowed. It never duplicates as a card
title, a nav item, or a repeated heading; case-study pages reuse the class
for the project name once, in the same register.

## Layout

The landing page is eight full-bleed acts (`Act.tsx`, `min-h-[100svh]`) in
normal document flow. **They are not pinned or scroll-jacked** — the page
scrolls at native speed, and the lamp's travel comes from reading each act's
own scroll progress, not from holding it in place. The one exception is the
ledger act: its background plate is `position: sticky` inside the act so it
stays visible behind the long list of archive rows, achievements, skills
and education that scrolls past it — every other act's plate scrolls with
its content like any other background.

**Shell.** A centred container at `max-width: 100rem` on the index and
`88rem` on case files, with gutters of 1.25rem, 2rem at `sm`, 3rem at `lg` —
unchanged from the previous system. The sticky top nav runs wider still, at
`110rem`.

**Acts.** Most acts centre their content vertically (`flex items-center`)
inside the viewport-height section, with 6rem of vertical padding
(`py-24`); the hero anchors to the bottom instead, so its statement sits
just above the fold. Each act's content sits inside `.scrim`, a gradient
that guards text from the painted midtone behind it — a left-to-right guard
on wide screens, top-to-bottom on narrow ones (`≤48rem`), widened
(`.scrim-wide`) for a reading column that runs wider than the standard
band: the ledger's own capped-width entries column (see Ledger below), and
the scheduler act, whose
widest headline number ("p = 2.6×10⁻¹⁶") pushes its `headlineNumbers` row
past the standard scrim's protected zone (measured directly: L=0.086 lit,
against the ember contrast gate's L≤0.058 ceiling, before `.scrim-wide`).

**The kicker (P12).** Five of the eight acts (about, warden, scheduler,
plantpal, research) open with a `kicker` — one plain-English `.label` line,
directly above `.statement`, that a non-engineer parses in three seconds
before reaching the poetic/technical statement below it. Every kicker is a
condensation of copy already in `src/content.ts` (`acts[id].kicker`, cited
at its own entry) — never a new claim. Three acts carry none, deliberately:
hero already gets its plain-English line from `hero.role`/`hero.positioning`
(see below) and a second kicker would duplicate it; ledger and contact each
have only one candidate source sentence in this file, and that sentence is
already fully spent by the act's own statement or its immediately-following
body copy — a kicker drawn from it would just repeat something the act
already says. A new act that wants a kicker needs a real second sentence to
condense, not a restatement of its own statement.

**The hero, specifically.** Stacked top to bottom: the kicker (`hero.role`,
`.label`), the name (`.statement`, Newsreader), one plain-English
positioning line (`hero.positioning`, mono default voice — not
`.prose-field`, which is reserved for the acts with body prose and stays at
zero on hero — ≤14 words condensed from `about.paragraphs[0]` — no number,
no proper noun, parseable in three seconds), the VERIFIED strip, the stat
rail, then exactly two CTAs — a
filled "Read the Warden case file" and an outline "Résumé". The VERIFIED
strip is not a badge: every token (`hero.provenance.tokens`,
`src/content.ts`) is its own link to a real receipt — the Warden case
file's Outcome section, this repo's Actions history, this repo's README —
each carrying a screen-reader-only proof (`aria-describedby`) alongside
its visible underline. A claim that stops having a receipt gets deleted
from the strip, not kept as decoration. At `≤48rem` two responsive
collapses hold the hero to one screen without a second markup branch:
the strip becomes a single "verified record ↗" link at the CI receipt
(`sm:hidden` / `hidden sm:flex`, same tokens, same DOM), and the stat rail
keeps only its middle value (9.07, the CGPA) visible via `nth-child`,
`display:none` rather than a conditional render — the other two stats
stay in the DOM and still ignite once the lamp reaches them at wider
viewports.

**Case files.** A static, non-interactive plate (`Plate` at `h-[60svh]`)
opens each case study as a fixed painted header, credited exactly like a
landing-page act. It still carries the lamp's mask — `data-lamp="on"` is
global, set once on `<html>` for the whole site — but with no `[data-act]`
ancestor for Lamp.tsx's rAF loop to find and scrub, every custom property
the mask reads sits at its unset default: a static pool centred at 50%/50%
with `--lamp-r`'s literal fallback (26vmax), exactly the "lamp static and
centred" the spec asks for (§5.2). Below it, sections follow the previous
system's grammar unchanged: a `13rem` sticky title column
(`lg:sticky lg:top-24`) against a fluid content column, separated by
`border-t border-rule`, `3rem`–`4rem` of vertical padding.

**Breakpoints.** Tailwind's defaults, at the same three thresholds as
before: `sm` (640px) turns on the wider gutter, `md` (768px) turns on the
desktop nav controls, `lg` (1024px) turns on multi-track grids and the
sticky case-file titles. `48rem` (768px) is also where the lamp's own bias
and the plates' narrow crops switch in — text moves from the frame's left to
its bottom, and some plates swap to a portrait-friendly crop.

**Print.** The medium is still a third ground: tokens flip to black-on-white
at `:root`, every plate, the torch, the scrim gradients and all chrome are
dropped, act copy is forced visible (an act below the fold may never have
intersected before printing, so nothing waits on a scroll event that paper
doesn't have), motion is cancelled, and external link hrefs are appended in
parentheses.

### Named Rules

**The Not-Pinned Rule.** Acts hold their height and let the page scroll
through them at native speed. Only the ledger's plate is sticky, and only
because its content genuinely outruns one viewport. A new act does not get
scroll-jacking or a sticky content column — it gets `min-h-[100svh]` like
every other one.

**The Scrim-Guards-Text Rule.** Content sitting over a plate always sits
inside `.scrim` (or `.scrim-wide` for a column wider than the standard
band). A new act's text column is measured against the painting under it
before shipping — `.scrim`'s stops are tuned to the standard column width,
not to an arbitrary fraction of the viewport.

## Elevation & Depth

The system is still flat in the literal sense — there is no `box-shadow`
anywhere in the stylesheet or the components, no blur, no filled panel
except the command palette's scrim. But depth is no longer purely graphic
the way the previous system's hairlines and bar fields were: it is supplied
by the paintings' own values, and revealed by two masks. The lamp's radial
mask (`--lamp-r`, `--lamp-x`, `--lamp-y`) uncovers a pool of full brightness
inside an act; the torch's wider, softer mask dims everything else on the
page — nav, copy, chart, footer — outside a pool around the cursor on
desktop. The two are one light, driven by the same pointer and the same
lerp constant (`POINTER_LERP`), so they never visibly drift apart.

The only stacked surface is the command palette: an 85%-opacity `ground`
scrim over the page and a solid dialog bordered in full-strength `signal`.
As before, the separation is a border, never a shadow.

### Named Rules

**The Zero-Shadow Rule.** Nothing in this system casts a shadow. A surface
that needs to read as separate gets a rule, a mask, or (for a control) a
colour swap — never elevation.

**The One-Light Rule.** The lamp and the torch are a single light rendered
twice, not two independent effects. A new light-driven surface must read
its position from the same pointer and the same `POINTER_LERP` constant
(`src/lib/motion.ts`) the existing two share, or it will visibly drift
against them.

## Shapes

Everything is still square. Radius is `0px` at every scale — controls,
chips, the command palette dialog, table cells, diagram stages, the sine's
node markers. There is no exception anywhere in the codebase.

The form language is drawn in the same three strokes as before, now on a
lit ground instead of a flat one:

- **The hairline.** A 1px rule at `rule` or `rule-soft`, used as divider,
  border, underline decoration, and diagram connector.
- **The bracket.** Nav's active-section marker keeps the original
  silhouette: a 1px `signal` border around a label, with a barcode
  end-cap (`.cap`) on each flank at 70% opacity. Buttons themselves
  moved to the wax-seal cartouche (below) — a doubled hairline frame and
  a seal mark, not a barcode.
- **The square mark.** The sine's 6px node squares, the diagram flow's 6px
  stage node, the benchmark chart's growing bars. Every graphic primitive
  that isn't a painting is an axis-aligned rectangle.

### Named Rules

**The Square Corner Rule.** Radius is zero everywhere. `rounded-*`
utilities have no place in this codebase.

**The Plates-Are-The-Only-Imagery Rule.** The eight committed paintings are
the only photographic or painted imagery on the site. Every other graphic
primitive — rules, brackets, the sine, diagram nodes, benchmark bars — is
drawn geometry, generated or laid out at build/render time, never a second
kind of stock image.

## Components

### Buttons (wax-seal cartouche, `Bracket.tsx`)
The barcode-flanked bracket was the redesign's one surviving element of
the previous system; it is gone now, replaced by an ornate cartouche the
owner asked for directly — a doubled hairline frame around a
letterspaced serif label, with a small seal-like mark at the leading
edge. Square geometry throughout, matching the rest of the world: the
seal is a bordered square holding a solid square, never a circle.
- **Shape:** an outer 1px `signal` rule on the control itself, a 3px
  gutter, then an inner 1px `signal` rule around the label — two
  concentric hairlines, not one. The seal sits in its own bordered
  chamber before the label, `aria-hidden` and never part of the
  control's accessible name (that comes from the label text alone).
- **Label typography:** Newsreader (`.cartouche-label`), the display
  font's only other home besides `.statement` — uppercase, letterspaced,
  sized as a control's label, never approaching statement scale. This is
  a deliberate, narrow exception to the Monospace Default Rule above,
  scoped to exactly one component.
- **Filled:** `signal` background, `ground` text on the inner chamber.
  Exactly one filled control per surface — "Read the Warden case file" in
  the hero, the résumé download at the contact close, "Read the case
  file" on a project act.
- **Outline:** transparent inner chamber, `signal` text and borders.
- **Hover:** the inner chamber swaps its own ground and mark
  (`transition-colors`) — the established local device, not a region-wide
  inversion — and the seal warms from bone to ember.
- **Focus:** the global 2px `signal` outline at 2px offset
  (`:focus-visible`), and the seal also warms to ember. The outline never
  appears on hover and the chamber's fill never swaps on focus alone, so
  the two states stay visually distinct even though both may carry the
  ember seal.
- **Ember exception:** the seal is the one place ember appears on a
  control — hover/focus only, never at rest. This narrows the
  Ember-Is-Rare Rule above by exactly one component; ember still never
  touches prose, a graphic, or a control's resting state anywhere else.
- **Disabled** (`BracketDisabled`): the label keeps its place; only the
  outer ring goes dashed and `rule`-toned rather than the control
  dimming or disappearing, and the seal never carries `group` hover/focus
  wiring, so it can't be coaxed into looking interactive.
- **Touch target:** every weight and size keeps a minimum 44×44px hit
  area (`min-h-11` plus the doubled frame's own padding), even where the
  visible label is smaller (`small`).
- **Print:** every call site already sits inside a `.print-hidden`
  wrapper, but the component also neutralises itself directly — filled
  backgrounds drop, the seal is removed — so a Bracket that ever prints
  costs nothing but its own hairlines, never a solid block.

### Chips
- **Pass / fail chip** (`Provenance`): a verified outcome is a filled chip
  (`signal` ground, `ground` text) with a drawn check; a failing outcome is
  an outlined chip with a drawn cross. Both carry the word as well as the
  mark.
- **Pending chip:** dashed `rule` border, full-contrast text.
- **Metadata chip** (tech lists, skills): 1px `rule` border, transparent
  ground, `.label` at source casing.

### Records (in place of cards)
- Unchanged in principle from the previous system: no boxes, no fills.
  Every list — the ledger's archive, achievements, skills, education — is a
  set of rows separated by `border-b border-rule`.

### Command Palette
An 85% `ground` scrim over the page, a dialog at `max-width: 36rem` bordered
in `signal`, opened at 12vh. Group headings in `.label` on `rule-soft`
dividers; the selected option swaps to `signal` ground / `ground` text. A
footer rail spells out the arrow, enter and escape affordances in `.label`.
No radius, no shadow, no blur — unchanged.

### Navigation
Sticky top rail, 3.5rem tall, solid `ground`, bottom `rule`. The active
section swaps to `signal` ground / `ground` text on scroll-spy — the same
per-control colour swap `Bracket` uses, not a page-region flip. Beside the
brand link, at `lg` and up, a small `NN/08` act indicator (`.label`,
tabular figures) reads off the same scroll-spy state — no second
`IntersectionObserver`. Purely presentational: `aria-hidden`, since the
position it states is already announced by `aria-current="location"` on
the matching section link.

### Case-file cross-links
Every case file (`/projects/[id]/`) opens with a breadcrumb — "← the
record · act 0N", the numeral read straight off `acts[id].label` — back
to its own act on the index (`/#<id>`, not just `/`). It closes with two
distinct devices, both cycling `featuredProjects`' own declared order
(Warden → Scheduler → PlantPal → Warden) so neither can drift from a
second, literal ordering: a prev/next rail in the footer for reading the
record straight through, and a "Next: the other case files" block naming
whichever two studies aren't the current page, for a reader who arrived
on one case file directly and wants the others. A one-line teaser
(`caseStudies[id].teaser`, `src/content.ts`) sits under each project act's
"Read the case file" button on the index — condensed verbatim from that
study's own `outcome[0]`, never a new claim; every entry's source
sentence is named in a comment beside it. The command palette carries the
same three case files as deep links, one per `CaseSection` (Problem /
Approach / Decisions / Evidence / Outcome), so a reader can jump straight
to a section from anywhere on the site. The three case-file routes also
carry a `<link rel="prefetch">` each, emitted from the index — a
body-ok link type, unlike the `next/link` prefetch this Next.js version's
static export can't serve (a smoke test guards that 404).

### Provenance line
Unchanged in role: every act and every record carries one — date, status,
stack, repo, and (when the build reaches GitHub) head SHA and CI conclusion.
Every act's line now also carries its painting's credit
(`withCredit()`/`creditOf()`, `src/lib/credit.ts`) — art is sourced the same
way code is, on the same line as the rest of the evidence.

### Rail
A `<dl>` of measurements, unchanged in structure. Optionally `ignite`: the
value renders through the ember pseudo-element (`data-value` + `.ignite`),
so it lights once the lamp's pool actually reaches it and simply reads as
bone signal under reduced motion or no JS.

### Sine Lattice
The world's one curve, unchanged: a single stroke sampled at 96 points with
square node markers, drawn once as part of page load. `mode="constellation"`
reuses the same seeded nodes as a static field of points behind the closing
act. Geometry comes from `src/lib/field.ts`, seeded and generated at build
time so the export stays byte-stable — the previous system's bar fields and
bit-matrix component are gone, but the sine's deterministic-geometry
approach carries over unchanged.

### Benchmark Chart
A real table styled as a chart, structurally unchanged: `.label` axis ticks,
a track at 12% `currentColor` with a solid bar inside, a tabular value
column. The two rows that carry the finding are marked by bar weight alone
— full-opacity `bg-signal`, against every other row's 0.55 — deliberately
not `.ignite`: the value column sits far enough right in the widened
`.scrim-wide` column (x≈1196px, measured) that the lamp's pinned rest x
(666px) can never close the gap within its own maximum lit radius (352px),
at any scroll position on either viewport, so the class would only ever
render bone-with-JS or ember-without — a standing contradiction, never
emphasis. Bars grow from `scaleX(0)` once, on approach, via a DOM attribute
rather than React state.

### Exhibit
A framed "museum plate" for real evidence (`Exhibit.tsx`): a doubled bone
hairline frame — an outer `rule` border, a 3px gutter, then an inner
`rule-soft` border around an opaque `ground` chamber, the same doubled-rule
grammar the wax-seal cartouche and the provenance line already use — holds
the artifact itself, with a mono `.label` caption underneath carrying a
provenance line for it. Always a child of an act's `.scrim` content layer
(rendered by the call site, same as `Statement`/`Rail`/`Provenance`),
sitting above the plate stack — never inserted into `Plate.tsx`'s own
four-layer stack, so an exhibit stays ambiently visible on first paint and
is never masked by the lamp. Capped at `max-w-2xl` by default so it can't
grow past a standard act's `.scrim` protected band; `wide` opts a specific
exhibit out of that cap for content that already sits safely at full width
inside its own act's scrim (only the scheduler's chart currently does).

Three exhibits ship: Warden's typed terminal (mono text on a `ground`
chamber, composed at render time from real rows in
`caseStudies.warden.evidence` via `exhibits.warden.rows` — never hand-typed
— with the block verdict's `100` carrying `.ignite`, zero image assets);
the scheduler's `BenchmarkChart`, reframed with `wide` and no change to its
data, semantics, or accessible table structure, its former title/unit/
source figcaption now the exhibit's own caption
(`exhibits.scheduler.caption`); and PlantPal+'s screenshot gallery, which
renders nothing until the owner supplies real AVIF/WebP captures under
`public/exhibits/` (see that folder's `README.md`) — the same
pending-asset convention a certificate scan with no scan yet already uses.

### Ledger
The seventh act (P8) is a dense instrument rather than a flat run of lists:
its content sits in a capped-width left column (`md:grid-cols-[minmax(0,46rem)_1fr]`,
`md` = 48rem) with the sticky `dovedale` plate showing through the open
right track, collapsing to one stacked column below `md` — the same
breakpoint `.scrim-wide`'s own narrow-viewport gradient already switches
at. Content, top to bottom:

1. **Capability matrix** — `skills`' six groups (Languages, Core CS,
   Backend & Frameworks, Databases & Infra, Security, AI-Native Workflow)
   as grouped text chips in a `sm:grid-cols-2` matrix, not images, so the
   whole set scans (and ctrl-Fs) in roughly one screen. Leads the act.
2. **Achievements** — Cyber Secure 360's First Prize already leads in
   `content.ts`; presentation follows.
3. **Education.**
4. **Certifications** — Azure Fundamentals leads (a render-order split
   only, `leadCertifications`/`courseworkCertifications` in `page.tsx`,
   commented at the split); the three Anthropic course completions (AI
   Fluency, Claude 101, Claude Code in Action) render together under a
   lighter "Coursework" subheading (`border-rule-soft`, not a fourth
   heading level) so they don't dilute the two awarded/verified
   credentials above them.
5. **Archive** (Taintwall, SentinelCore, Web App Security Suite, then the
   "Full archive" GitHub tile) — last, and the one group whose rows are
   genuinely compact: a mono date, the title, a one-line description
   (never rewritten — the source copy is unchanged), then the existing
   tech-chip list and `Provenance` grammar. The description is
   CSS-`truncate`d to one line *only* when it carries no `**metric**`
   span — Taintwall's row (`measured **43% → 0% exfiltration**`) skips
   truncation and wraps instead, so the single-line cutoff can never land
   mid-clause and hide the exact number `**text**` exists to headline
   (AGENTS.md's "marks the single strongest metric" rule). Rows without a
   metric keep the one-line truncated grammar.

Every group is a `<section aria-labelledby>` naming its own `h3`; every
record inside a group — an achievement, a degree, a certification, an
archive project — is an `h4`, not a second `h3`. This replaces the flat
h3-only outline the act previously shipped (every record and every group
heading at the same level) with a real two-level structure, still legal
under axe and under the "act statement is h2, groups are h3" rule.

Certificate thumbnails (`CertificateLightbox.tsx`) open the full-resolution
scan in a native `<dialog>` instead of navigating to a bare PNG: `showModal()`
supplies focus-trapping and Escape-to-close for free, a click on the
dialog's own backdrop area closes it, and focus returns to the triggering
thumbnail on close via the dialog's native `close` event — no new
dependency. The full-resolution `<img>` is only mounted once the dialog is
actually open, so the thumbnail stays the only certificate-image cost paid
at page load. No radius, no shadow: a single hairline `border-rule` frame,
the same grammar as every other bordered surface on the site.

### Diagram Flow
A pipeline on a hairline rail, structurally unchanged. The verdict stage is
now marked with a `signal` fill and `ground` text — the same local
colour-swap device as a filled `Bracket`, not the retired region inversion.

### Plate
The three-layer painting (`Plate.tsx`): a dimmed still (`.plate-dark`) and
a full-brightness still masked to the lamp's pool (`.plate-lit`) — every
act, no exceptions; there is no motion layer any more (removed
2026-08-20, the owner asked the zoom to go). **Document order is paint
order** — all three layers (the third being the act-edge dissolve,
`.plate::after`) are `position: absolute` with no `z-index`, so whichever
is later in the markup paints on top; the dark layer must precede the lit
layer or the lamp's reveal is invisible underneath it. The lit layer
carries the plate's alt text — it is the layer present in every state,
including no-JS.
Ships AVIF/WebP srcsets per plate, a landscape crop by default and a
portrait `cropNarrow` where the subject needs it below 48rem, and an
inlined base64 LQIP as a background while the real image loads.

### Act
The full-bleed section shell (`Act.tsx`). Emits `data-act`,
`data-lamp-x`/`data-lamp-y` (the painting's own light-source rest position,
from `src/lib/art.ts`), and an `aria-labelledby` pointing at the act's
statement. Not sticky, not scroll-jacking — see the Layout section above.

### Statement
The display voice (`Statement.tsx`): an `<h2>` (the hero and each case
study's own title use `as="h1"`) carrying `.statement`. One per act, never
more.

### Lamp
The one client component with a moving part (`Lamp.tsx`): a single rAF
loop, one `IntersectionObserver`, one passive pointermove listener. Writes
`--p` (linear act progress), `--lamp-x`, `--lamp-y` onto every visible act.
Sets `data-lamp="on"` on `<html>` — the mask CSS is entirely gated on that
attribute, so the unstyled default is fully lit. The same tick also drives
ignition: each visible act's `.ignite` elements are gathered once (not
re-queried every frame), and every tick compares each one's real screen
centre against the lamp's own pixel position, toggling `.is-lit` — not a
second `mask-image`, since a mask's percentages resolve against the masked
element's own box, which is right for `.plate-lit` (which fills the act)
and meaningless for a few-character-wide metric. A shared circuit breaker
(`src/lib/motion.ts`, `createFrameBudgetGuard`) judges a rolling window of
the last 60 frames rather than a consecutive-miss streak, so one good frame
mid-scroll can't reset it and one bad streak can't kill it outright: it
suspends the lamp (removes `data-lamp`, falling back to the fully-lit
default) once a clear majority of that window is slow, and re-arms it once
the ratio falls back to a small minority — the first time. A second trip in
the same session latches the guard, so a device that genuinely can't hold
frame budget in steady state gets one clean, permanent fallback rather than
an unrecovering ~3s oscillation between masked and fully-lit.

### Torch
The page-wide cursor flashlight (`Torch.tsx`), desktop-only
(`hover: none` and reduced motion both disable it outright, not just
visually). Shares `POINTER_LERP` with `Lamp.tsx` so the two pools of light
move together. Sets `data-torch="on"` on `<html>` only once a real pointer
has moved, and clears it again — fading the beam back out over the same
0.6s transition — on a genuine `pointerleave` off the document or a short
pointer-idle timeout, so a reader who nudges the mouse once and then reads
the rest of the page by wheel or keyboard scroll doesn't spend the visit
under a frozen pool and a permanent dimming wash. The next real
`pointermove` re-arms it exactly like the first ever move. Raises the
plate's unlit floor while active
(`[data-torch="on"][data-lamp="on"] .plate-dark`) so the torch's dimming
wash and the lamp's own unlit floor don't compound into a darker painting
than either produces alone — this selector must be compound (no space);
`data-lamp` and `data-torch` are both on `<html>`, which has no ancestor, so
a descendant-combinator version of this rule can never match.

### Social cards
The OG cards are 1200×630, styled in the same mono/provenance grammar as
before but rendered on the new tokens. Satori (the renderer) cannot
evaluate a CSS mask, so OG cards never attempt the lamp effect, and it has
no glyph for the superscript minus (U+207B) — any superscript run is passed
through `ogText()` (`src/lib/ogFonts.ts`), which flattens it to a caret
exponent before it reaches the card.

### Named Rules

**The Museum-Plate Rule.** An exhibit presents the actual product — a real
terminal capture, a real chart, a real screenshot — never a recreation or
a mockup standing in for one; an exhibit with no real capture yet (a
raster shot the owner hasn't supplied) renders nothing, the same
convention `certificateImage()`/`certificateThumb()` already use for a
certificate scan that hasn't arrived. If a future exhibit's raster assets
ever push an act over the media budget, evidence outranks atmosphere: drop
or shrink a plate's still tiers before shrinking or dropping the exhibit.

**The One Moment (Per Act) Rule.** An act's copy resolves into place —
opacity and a small translate — the first time it intersects the viewport,
gated by `data-seen`, which is set once and never removed. Scrolling back
past an act never re-triggers its reveal. The benchmark chart's bars still
grow once, on approach, exactly as before.

**The Reduced-Motion Rule.** Under `prefers-reduced-motion: reduce`, the
lamp and torch never initialise (`Lamp.tsx`/`Torch.tsx` return early), and
the act-reveal transition never gates the copy in the first place, since
it only exists once `data-lamp="on"` is set. A reduced-motion visitor
sees exactly the same fully-lit, fully-present page a no-JS visitor does —
and, since no plate carries motion any more, exactly the same page a
full-motion visitor sees too.

**The Lamp-Dramatizes-Never-Gates Rule.** The lamp dramatizes the record;
it never gates it — an idle-pointer scroll (no cursor movement at all,
just scrolling) must read every act. Nothing on the page is ever
withheld until the pointer finds it: `data-seen` (the one thing that
gates copy visibility) is set purely by scroll intersection
(`Lamp.tsx`'s `IntersectionObserver` callback), never by pointer
position, and the lamp's masked pool is strictly additive on top of an
always-visible dimmed ambient layer (`[data-lamp="on"] .plate-dark`,
`globals.css`) — never a second gate a reader has to find the light to
get past. The ambient floor is `brightness(0.38)` (`brightness(0.65)`
once the torch's own page-wide dimming wash is also active, re-derived
to hold the same brightness parity the un-torched floor has), raised
from an original 0.32 during the P1 floor lock once a no-pointer scroll
probe measured the site's darkest bands too close to the edge. Two CI
tests (`tests/lamplight.spec.ts`, "no viewport goes void on an
idle-pointer scroll") lock this in at both 1440×900 and 390×844: every
700px scroll step must clear 6% mean greyscale luminance and put at
least 0.5% of pixels above mid-grey, with no pointer ever moving during
the check — a scrolling-only reader is the exact population this rule
protects, and the exact population the published audit's disproven
"100% pure black" claim would have affected if it had been true.

## Do's and Don'ts

### Do:
- **Do** keep the palette to exactly three values: ground, signal, ember.
  A new surface that needs a fourth colour needs a different device.
- **Do** reserve ember for a lit number and the lamp's own core — never
  prose, never a graphic, never a control fill.
- **Do** express a control's own emphasis (hover, active, selected) by
  swapping its own ground and mark, the way `Bracket` and `Nav` already do —
  never resurrect a page-region `.negative`/`invert` mechanism.
- **Do** set every measurement in tabular Chivo Mono, and drive a genuinely
  lit one through `.ignite` + `data-value` so it degrades to plain signal
  text with no JS or reduced motion.
- **Do** credit every plate on its act's provenance line via `withCredit()`
  — art is sourced the same way code is.
- **Do** keep new acts in normal document flow (`min-h-[100svh]`, not
  sticky, not scroll-jacked) unless the content genuinely outruns one
  viewport the way the ledger's does.
- **Do** guard any text sitting over a plate with `.scrim` (or
  `.scrim-wide`), measured against the actual column width, not a fixed
  viewport fraction.
- **Do** drive any new pointer-follow effect off the same `POINTER_LERP`
  constant the lamp and torch already share.
- **Do** ship a `prefers-reduced-motion` fallback, a no-JS fallback (fully
  lit, not merely styled differently), and a print behaviour with every new
  visual element.
- **Do** keep new work inside the export constraints the world already
  satisfies: internal assets through `withBase`, the JS and media budgets in
  `scripts/check-budget.mjs`, `npm run check:art`, and axe at zero
  violations.

### Don't:
- **Don't** introduce a fourth colour value, a grey, or a second accent hue.
- **Don't** dim text to signal a state. Pending is a dashed border;
  fractional alpha is for rules and the lamp/torch's own gradients only.
- **Don't** add a radius, a shadow, a blur, or a filled panel.
- **Don't** make the proportional face the default, or let Newsreader
  appear anywhere but a `.statement`.
- **Don't** let a number render in anything but Chivo Mono, at any size.
- **Don't** pin or scroll-jack a new act, and don't add a second sticky
  content column beyond the case-file title rail and the ledger's plate.
- **Don't** write a `[data-lamp] [data-torch]`-shaped selector with a space
  — both attributes land on `<html>`, so only the compound form
  (`[data-lamp="on"][data-torch="on"]`) can ever match.
- **Don't** attempt the lamp's mask inside an OG card — Satori can't
  evaluate it — and don't emit a raw superscript character into one without
  routing it through `ogText()` first.
- **Don't** use emoji anywhere in the interface, in copy or in content.

## Plates

The eight public-domain paintings that carry the landing page, verified
against the Wikimedia Commons API and registered in `src/lib/art.ts`. Every
plate is licensed `PD-old-100` and its credit line
(`Artist, Title, Year — public domain, Wikimedia Commons`) is generated by
`creditOf()` and shown on its act's provenance line.

| Act | Artist | Title | Year | Commons source |
| --- | --- | --- | --- | --- |
| hero | Joseph Wright of Derby | The Blacksmith's Shop | 1771 | https://commons.wikimedia.org/wiki/File:Joseph%20Wright%20of%20Derby%20-%20The%20Blacksmith%27s%20Shop%20-%20Google%20Art%20Project.jpg |
| about | Joseph Wright of Derby | The Alchemist Discovering Phosphorus | 1771 | https://commons.wikimedia.org/wiki/File:Joseph%20Wright%20of%20Derby%20The%20Alchemist.jpg |
| warden | Joseph Wright of Derby | An Iron Forge | 1772 | https://commons.wikimedia.org/wiki/File:Joseph%20Wright%20-%20An%20Iron%20Forge%20-%20Google%20Art%20Project.jpg |
| scheduler | Joseph Wright of Derby | A Philosopher Lecturing on the Orrery | 1766 | https://commons.wikimedia.org/wiki/File:Wright%20of%20Derby%2C%20The%20Orrery.jpg |
| plantpal | Joseph Wright of Derby | Two Girls Dressing a Kitten by Candlelight | c. 1768–70 | https://commons.wikimedia.org/wiki/File:Joseph%20Wright%20of%20Derby.%20Two%20Girls%20Dressing%20a%20Kitten%20by%20Candlelight.%20c.%201768-70.jpg |
| research | Rembrandt van Rijn | The Anatomy Lesson of Dr Nicolaes Tulp | 1632 | https://commons.wikimedia.org/wiki/File:Rembrandt%20-%20The%20Anatomy%20Lesson%20of%20Dr%20Nicolaes%20Tulp.jpg |
| ledger | Joseph Wright of Derby | Dovedale by Moonlight | 1784 | https://commons.wikimedia.org/wiki/File:Joseph%20Wright%20of%20Derby%20-%20Dovedale%20by%20Moonlight%20-%20Google%20Art%20Project.jpg |
| contact | Georges de La Tour | The Education of the Virgin | c. 1650 | https://commons.wikimedia.org/wiki/File:Georges%20de%20La%20Tour%20L%27Education%20de%20la%20Vierge%20The%20Frick%20Collection.jpg |

Each plate's `lamp` field in `src/lib/art.ts` is the light source's rest
position as the painter actually placed it, so the CSS mask agrees with the
paint. All eight plates ship stills only — four of them (hero/blacksmith,
warden/forge, scheduler/orrery, plantpal/kitten) used to also carry a
`motion` descriptor and a scrubbed zoompan video clip; that layer was
removed entirely (2026-08-20) after the owner saw it live and asked for
the zoom to go, so `src/lib/art.ts` no longer has a `motion` field at all.
