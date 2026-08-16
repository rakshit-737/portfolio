---
name: Rakshit Rameshbabu — Portfolio
description: An engineer's record rendered as a data field — absolute black and white, monospace at every size, and every number carrying its proof.
colors:
  field: "#000000"
  signal: "#ffffff"
  rule: "rgb(255 255 255 / 0.26)"
  rule-soft: "rgb(255 255 255 / 0.11)"
  rule-negative: "rgb(0 0 0 / 0.3)"
  rule-soft-negative: "rgb(0 0 0 / 0.13)"
typography:
  display:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "clamp(2.6rem, 9.2vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.88
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "clamp(1.9rem, 5.4vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 0.97
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  number:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum 1"
  body:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  prose:
    fontFamily: "Chivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.68
    letterSpacing: "0.001em"
  label:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.19em"
rounded:
  none: "0px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  gutter: "1.25rem"
  gutter-md: "2rem"
  gutter-lg: "3rem"
  column-gap: "3rem"
  record-row: "2.25rem"
  section: "4rem"
  section-lg: "6rem"
components:
  bracket-filled:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.field}"
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
    textColor: "{colors.field}"
  bracket-small:
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.625rem"
  chip-pass:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.field}"
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
    backgroundColor: "{colors.signal}"
    textColor: "{colors.field}"
    rounded: "{rounded.none}"
    padding: "0.05em 0.32em"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.625rem"
  nav-link-active:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.field}"
  palette-dialog:
    backgroundColor: "{colors.field}"
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

**Creative North Star: "The Datamatics Field"**

This is an engineer's record rendered as a data field. The numbers are the page, printed at the scale of the thing they measure, and the ground they sit on is a field of hairline bars — the visual language of an instrument readout rather than of a résumé. The world refuses both of the defaults available to a developer portfolio: the dark terminal with its green-on-black nostalgia, and the airy white page with its generous grey type. What is left is two values and nothing between them.

The palette is absolute: `#000000` and `#ffffff`, with no third value and no grey. Because every surface utility resolves through four custom properties, an entire region can flip its ground by re-declaring them — inversion is used as a structural beat that marks the two moments the record wants read hardest (the research finding, the evidence table), never as a decorative filter. Hierarchy is therefore carried by scale, tracking and density: display type is enormous and negatively tracked, labels are tiny and tracked wide open at 0.19em, and nothing is ever dimmed to make it rank lower. There is no contrast headroom in this palette to spend on dimming.

The type is monospace at every size — Chivo Mono for headings, data, labels, chrome and running copy — with a single stated exception: reading passages take its proportional sibling, Chivo, because a case study is read rather than scanned. Materials are drawn, not applied: seeded bar fields, one sine curve with square node markers, and binary matrices cut from real commit SHAs. Motion is a single authored moment on load, and one growth of the benchmark bars on approach; nothing else moves.

**Key Characteristics:**
- Two absolute values, no grey, no accent hue.
- Inversion as structure — a whole section flips ground, using the same components unchanged.
- Monospace everywhere; one sans exception for reading passages.
- Zero radius, zero shadow; hairline rules and drawn fields carry all the structure.
- Numbers set in tabular figures at display scale, sourced only from real data.
- One motion moment on load, one on scroll, and a `prefers-reduced-motion` path out of both.

## Colors

Two values and the alphas of a technical drawing — the palette is a pen on paper, not a scheme.

### Primary
- **Signal White** (`{colors.signal}`): every mark on the page — type, strokes, bar fields, node squares, filled controls. In an inverted region it becomes the ground instead, without any component knowing.

### Neutral
- **Field Black** (`{colors.field}`): the ground. Set on `html` as a hard `#000` so no flash of another colour is possible during load, and on `body` through the token so `.negative` can invert it.
- **Rule** (`{colors.rule}`): every hairline divider, border, underline decoration and section edge. This is a graphic, so it may carry fractional alpha; type may not.
- **Rule Soft** (`{colors.rule-soft}`): the quieter divider used inside dense lists — benchmark table rows, mobile menu items, command-palette group headers — where a full-strength rule would read as a table grid.
- **Rule (negative)** / **Rule Soft (negative)** (`{colors.rule-negative}`, `{colors.rule-soft-negative}`): the same two rules re-declared for black-on-white regions, nudged slightly heavier (0.3 / 0.13) because a black hairline on white reads lighter than its inverse.

### Named Rules

**The Two Values Rule.** The palette is `#000000` and `#ffffff`. There is no third value, no grey, and no accent hue. A new surface that "needs a colour" needs a different device — scale, inversion, or a rule.

**The Negative Rule.** The inversion class is `.negative`, deliberately **not** `.invert`. Tailwind ships an `invert` filter utility; the two stack and cancel, and whole sections silently render un-inverted. Never rename it, and never add a second inversion mechanism.

**The No-Dimming Rule.** Text is never dimmed, faded, or set at partial opacity to signal a state. A pending item is marked by a dashed outline; an inactive nav item simply lacks its inverted ground. Fractional alpha belongs only to rules, bar fields and barcode end-caps, which are graphics rather than language.

**The Inverted Emphasis Rule.** Emphasis is inversion. The strongest metric in a bullet, a passing CI chip, the active nav item, the highlighted benchmark rows, the verdict stage of a diagram — all are the same move: swap the ground and the mark. Nothing on this site is emphasised by hue, weight alone, or a glow.

## Typography

**Display Font:** Chivo Mono (fallback `ui-monospace, monospace`)
**Body Font:** Chivo Mono — the default voice of the whole site
**Reading Font:** Chivo (fallback `system-ui, sans-serif`), scoped to `.prose-field` only
**Label/Mono Font:** Chivo Mono at 0.6875rem, 0.19em tracking, uppercase

**Character:** A grotesque monospace with squared terminals and even colour, used well outside its usual station — at 6rem it reads as machine-set signage, at 0.6875rem as an instrument caption. Its proportional sibling shares the skeleton exactly, so the one sans passage reads as the same voice slowing down rather than as a second typeface.

Tabular figures are on globally (`font-feature-settings: "tnum" 1`), so every number column in the record aligns without per-element opt-in.

### Hierarchy
- **Display** (600, `clamp(2.6rem, 9.2vw, 6rem)`, line-height 0.88, tracking -0.03em): the owner's name in the index hero, and the 404 statement at -0.05em. Set on two lines, left-aligned, sitting over the masked bar field.
- **Headline** (600, `clamp(1.9rem, 5.4vw, 3.5rem)`, line-height 0.97): the case-file title. The contact statement (`clamp(1.7rem, 4.6vw, 3.25rem)`, tracking -0.04em) and the inverted research pull-quote (`clamp(1.35rem, 3.1vw, 2.35rem)`, line-height 1.18, tracking -0.035em) are the same register — a sentence set large enough to be the surface.
- **Title** (600, 1.25rem rising to 1.5rem at `sm`, line-height 1, tracking -0.03em): section headings and project names. Case-file section titles sit one step down at 1.125rem.
- **Number** (600, 1.5rem rising to 1.875rem, tabular): headline metrics under a project, in `<dd>` above their `<dt>` label — the value reads first, its name second.
- **Body** (400, 0.875rem, monospace): the site's default voice — rail values, tech lists, nav, chips, tables, chrome.
- **Prose** (400, 1rem, line-height 1.68, max-width 68ch, sans): `.prose-field`. About copy, project one-liners, bullet bodies, case-study passages, captions.
- **Label** (0.6875rem, tracking 0.19em, uppercase): `.label`. Every caption, metadata key, rail label, chip, nav item, control text and provenance segment. This is the system's caption voice and it is used everywhere; where a label must keep its source casing (an email, a SHA, a stack name) it takes `normal-case` and keeps the tracking.

### Named Rules

**The Monospace Default Rule.** Chivo Mono is the default for the entire site, including body copy. The proportional face appears only inside `.prose-field`, and only for passages a visitor reads rather than scans. A new surface does not get to introduce a third face, and it does not get to make the sans the default.

**The Scale-Is-Hierarchy Rule.** Rank is expressed by size, tracking and caps — nothing else. Tracking runs inverse to size: display type is tracked in to -0.03em/-0.05em, labels are tracked out to 0.19em. If two things need to rank differently, change their size or their case, never their opacity.

**The Number-First Rule.** A measurement is set larger than the words describing it, in tabular figures, with its label beneath it in `.label`. Numbers are the page.

## Layout

The site is a single wide column of full-bleed sections stacked on a rhythm of 4rem padding, opening to 6rem at `sm`. Every section is bounded by a hairline rule rather than by a card, a panel or a background change; the only background changes in the system are the two inverted sections.

**Shell.** A centred container at `max-width: 100rem` on the index and `88rem` on case files (the narrower measure keeps case-study prose from running long), with gutters of 1.25rem, 2rem at `sm`, and 3rem at `lg`. The sticky top rail runs wider still, at `110rem`, so the chrome reads as spanning the whole instrument.

**The flanked hero.** The index hero is a three-track grid at `lg` — `10.5rem` rail, fluid name column, `12rem` rail — with the name at display scale in the middle and real measurements stacked down both flanks. Below `lg` the tracks stack and the order is re-declared so the name comes first and the rails follow. Case files use the two-track version of the same idea: content column plus a right rail at `13rem`.

**Records, not cards.** Every list on the site — featured work, archive, achievements, skills, education — is a grid of rows separated by `border-b border-rule`. Rows are two-track at `lg` (a metadata column of `13rem`–`22rem` against a fluid content column) and single-track below it, with a 3rem column gap and a row rhythm of 2.25rem to 3rem of vertical padding.

**Case files.** Each section is a two-track grid, `13rem` title column against fluid content, with the title `position: sticky` at `top: 6rem` so it stays beside its own material through a long read. Anchored sections carry `scroll-margin-top: 3.75rem` to clear the sticky rail.

**Breakpoints.** Tailwind's defaults, used at three thresholds: `sm` (640px) turns on the horizontal rhythm and the fields inside section heads, `md` (768px) turns on the desktop chrome controls, `lg` (1024px) turns on every multi-track grid.

**Print.** The medium is treated as a third ground rather than as an afterthought: the tokens flip to black-on-white at `:root`, `.negative` is neutralised so an inverted section does not print as a black slab, every bar field and matrix (`.print-drop`) and all chrome and controls (`header[data-chrome]`, `.print-hidden`) are removed, animations are cancelled, external link hrefs are appended in parentheses, and sections avoid breaking across pages.

### Named Rules

**The Rule-Not-Card Rule.** Records are separated by hairlines. There are no cards, no panels, no filled containers and no rounded boxes anywhere in this system; a bordered box appears only around a control, a chip, or a diagram stage.

**The Flank Rule.** Verifiable measurements live in rails on the flanks of a header, not in the header's centre. The centre carries identity and statement; the flanks carry evidence.

## Elevation & Depth

The system is absolutely flat. There is no shadow token, no `box-shadow` anywhere in the stylesheet or the components, no blur, no gradient fill and no translucent panel except the command palette's scrim. Depth is entirely graphic: the hairline rule that separates one record from the next, the density of the bar field behind a header, the mask that fades that field out where display type crosses it, and the inversion that lifts an entire section out of the page. The sticky top rail sits on a solid `bg-field` with a bottom rule — no shadow, no backdrop blur — so it reads as a fixed edge of the instrument rather than as a floating bar.

The only stacked surface is the command palette, which uses an 85% `field` scrim over the page and a solid dialog bordered in full-strength `signal`. Even there, the separation is a border, not a shadow.

### Named Rules

**The Zero-Shadow Rule.** Nothing in this system casts a shadow. If a surface needs to read as separate, give it a rule, a mask, or an inversion — never elevation.

**The Field-Mask Rule.** Display type never competes with a bar field for contrast. Any field sitting behind large type takes a mask: `.field-mask` for the index hero, `.field-mask-wide` for case files (their content column runs wider, so the field must stay clear of it for longer), `.field-mask-soft` for the 404. Add a field behind new display type and you add its mask in the same commit.

## Shapes

Everything is square. Radius is `0px` at every scale — controls, chips, inputs, dialogs, table cells, diagram stages, the node markers on the sine. There is no radius scale to choose from, and there is no exception.

The form language is drawn in three strokes:

- **The hairline.** A 1px rule at `rule` or `rule-soft`, used as divider, border, underline decoration, diagram connector, and the short 12px dash that opens every bullet in place of a marker glyph.
- **The bracket.** The world's control silhouette: a 1px `signal` border around a label, with a barcode end-cap (`.cap`, a repeating hard-stop gradient in `currentColor`) on each flank at 70% opacity. It is a control because it looks machined, not because it looks clickable.
- **The square mark.** Bar-field rects, 6px sine nodes, 8px bit-matrix cells, the 6px diagram node. Every graphic primitive in the system is an axis-aligned rectangle.

### Named Rules

**The Square Corner Rule.** Radius is zero everywhere, on everything. `rounded-*` utilities do not belong in this codebase.

**The Deterministic Field Rule.** All field geometry (`src/lib/field.ts`) is seeded and generated at build time — a mulberry32 PRNG plus an FNV-1a string seed — so the same seed yields the same marks on every build, the static export stays byte-stable, and no geometry code ships to the client. Give every new field a stable string seed; never randomise at runtime.

**The Graphics-Aren't-Claims Rule.** A bar field encodes no measurement. Bit matrices are the exception that proves it: they are cut from a repo's real head SHA, so the pattern *is* the commit. Every rendered *number* traces to `src/content.ts` or to the build-time GitHub fetch — never to the geometry layer.

## Components

### Buttons (Bracket controls)
- **Shape:** square (0px), 1px `signal` border, barcode end-caps at 70% opacity flanking a `.label` centre.
- **Filled:** inverted ground — `signal` background, `field` text. Exactly one filled control per surface: the résumé download in the hero and the contact block, "Read the case file" on a project record, "Return to the index" on the 404.
- **Outline:** transparent ground, `signal` text and border.
- **Hover / Focus:** both weights resolve by swapping ground and mark (`transition-colors`); the filled control empties, the outline control fills. Focus is a 2px `signal` outline at 2px offset, applied globally through `:focus-visible`.
- **Sizes:** default `0.75rem 1rem`, small `0.5rem 0.75rem`.
- **Disabled:** the label keeps its place in the record, wrapped in a dashed `rule` border rather than being dimmed or removed.

### Chips
- **Metadata chip** (tech lists, skills): 1px `rule` border, transparent ground, `.label` at source casing.
- **Provenance chip:** a verified outcome is a filled chip (`signal` ground, `field` text) with a drawn check; a failing outcome is an outlined chip with a drawn cross. Both carry the word as well as the mark — nothing is signalled by shape or hue alone.
- **Pending chip:** dashed `rule` border, full-contrast text.

### Records (in place of cards)
- **Corner style:** none — records are not boxes.
- **Separator:** `border-b border-rule` between rows; headline-number strips get `border-y`.
- **Internal padding:** 2.25rem–4rem vertical, 3rem column gap; no horizontal padding, because a record is not a container.
- **Structure:** metadata column (bit matrix, timeframe, stack) against a content column (title, one-liner, headline numbers, bullets, provenance, controls).

### Inputs
- Only one input exists: the command palette's search field. Transparent ground, no border of its own (the dialog's bottom rule serves), 3.25rem tall, monospace, with a `.label`-styled placeholder at full opacity — a placeholder is instruction, not a dimmed hint.
- **Focus:** the field is focused on open and shows no separate focus ring; the dialog itself is the focused surface. Every other interactive element in the system takes the global `:focus-visible` outline.

### Navigation
- Sticky top rail, 3.5rem tall, solid `field` ground, bottom `rule`, `z-50`. Wordmark on the left preceded by a barcode cap; `.label` section links in the centre; a bordered search affordance showing `ctrl K` and a bordered résumé link on the right.
- **Active state:** the scroll-spied section inverts — `signal` ground, `field` text — the same device the page uses everywhere else, which means nothing has to be measured or animated at runtime. No underline, no sliding indicator.
- **Hover:** the same inversion, applied on hover.
- **Mobile:** search and menu reduce to icon buttons; the open menu is a full-width panel under the rail with `rule-soft` dividers and a filled résumé control at the foot.

### Command Palette
An 85% `field` scrim over the page, a dialog at `max-width: 36rem` bordered in `signal`, opened at 12vh. Group headings in `.label` on `rule-soft` dividers; the selected option inverts. A footer rail spells out the arrow, enter and escape affordances in `.label`. No radius, no shadow, no blur.

### Provenance line
The system's signature component and the reason it exists: a wrapping list of `.label` segments — date, status, stack, repo, and (when the build reached GitHub) head SHA and CI conclusion, each deep-linked to its own proof. Segments are divided by a 3rem gap and a 12px hairline that **trails** its item rather than leading the next, so a wrapped line never starts with an orphaned separator. Links are underlined in `rule` at 4px offset and resolve to `signal` on hover.

### Rail
A `<dl>` of measurements: `.label` key above a monospace tabular value, 1rem apart, 1.5rem between rows, optionally right-aligned for a right flank. A rail row is always a real quantity someone can check; if the datum is absent, the row is absent.

### Bar Field
The ground material. A seeded field of hairline rects across a 1000-unit viewBox, mostly 0.5–1.9px wide at 0.08–0.58 opacity with occasional 2–7px blocks at up to 1.0, and density surges where bars crowd together. Rendered at 35–85% opacity behind headers and section heads, always `aria-hidden`, always masked where display type crosses it, always removed in print.

### Sine Lattice
The world's one curve: a single 1.25px stroke sampled at 96 points, with 6px square node markers. Laid out **in flow, in its own band** wherever an overlay would cross copy or a rail — this is why the case-file header and the mobile hero both put the curve below the name instead of behind it.

### Bit Matrix
A grid of 8px squares cut from a repo's head commit SHA (hex nibbles to bits, falling back to the project id's characters when no SHA was fetched). 8×6 on index records, 6×8 on case-file headers. Decorative by rendering, factual by source.

### Benchmark Chart
A real table (`<caption>`, `<th scope>`, screen-reader header row) styled as a chart: `.label` axis ticks above a `rule` baseline, a 10px track at 12% `currentColor` with a solid `currentColor` bar inside, and a tabular value column. The two rows that carry the finding are pulled out by inversion. Bars grow from `scaleX(0)` once, on approach, with a 40ms per-row stagger; the grown flag is a DOM attribute rather than React state, so the transition never costs a re-render.

### Diagram Flow
A pipeline in the field's grammar: bordered stages on a hairline rail with a 6px node above each, horizontal at `lg` and vertical below it, reading order unchanged. The verdict stage is inverted (`signal` ground) rather than coloured.

### Metric
Inline emphasis for the single strongest number in a bullet: `**text**` in `src/content.ts` renders as an inverted inline chip at weight 600, `white-space: nowrap`, 0.05em/0.32em padding. One per bullet, sparingly.

### Social cards
The OG cards are the same world at 1200×630: absolute black, one bar field at 32% opacity, the provenance line as an inverted prefix chip plus text along the top, the name at 96px/-4 tracking, and real measurements along a bottom hairline. Superscript characters must be passed through `ogText()` — Satori has no glyph for U+207B and shipped `2.6×10□¹⁶` on every share until they were flattened to caret exponents.

### Named Rules

**The One Moment Rule.** The site has exactly one authored entrance: the hero bar field resolves left-to-right (1.15s) while the sine draws behind the name (1.6s), its nodes landing on a 90ms stagger, and the hero's own text rises 0.45em into place. Benchmark bars grow once when scrolled to. That is the entire motion budget. There are no per-section entrance animations, no scroll-linked parallax, and no hover motion anywhere — hover states resolve by colour swap only. All easing is `cubic-bezier(0.16, 1, 0.3, 1)`.

**The Reduced-Motion Rule.** Under `prefers-reduced-motion: reduce`, the moment is simply already over: every keyframe animation and bar transition is cancelled to its end state, the sine's dash array is cleared, and smooth scrolling is turned off. Every animation added to this system ships its fallback in the same commit.

## Do's and Don'ts

### Do:
- **Do** use `.negative` for inversion — never `.invert`, which collides with Tailwind's filter utility and silently cancels.
- **Do** express emphasis, state and selection by swapping ground and mark. It is the only emphasis this palette has.
- **Do** set every measurement in tabular monospace, larger than its `.label`, sourced from `src/content.ts` or the build-time GitHub fetch.
- **Do** give every new bar field a stable string seed and generate it at build time (`src/lib/field.ts`).
- **Do** mask any field that sits behind display type: `.field-mask` on the index, `.field-mask-wide` on case files, `.field-mask-soft` on the 404.
- **Do** lay the sine out in flow, in its own band, whenever an overlay would cross copy or a rail.
- **Do** separate records with `border-b border-rule` and let them breathe on the 4rem/6rem section rhythm.
- **Do** keep exactly one filled bracket control per surface; everything else is outline.
- **Do** carry a provenance line on every record, with each claim deep-linked to its own proof.
- **Do** pair every state mark with a word — a check or cross chip always carries its label.
- **Do** ship a `prefers-reduced-motion` fallback and a print behaviour (`print-drop` / `print-hidden`) with every new visual element.
- **Do** keep new work inside the export constraints the world already satisfies: internal assets through `withBase`, the 210 kB gzipped-JS ceiling, and axe at zero violations.

### Don't:
- **Don't** introduce a third colour value — no grey, no accent hue, no tinted surface. If something needs to rank differently, change its size, case or ground.
- **Don't** dim text to signal a state. Pending is a dashed border; inactive is the absence of an inverted ground. Fractional alpha is for rules, fields and barcode caps only.
- **Don't** add a radius. `rounded-*` has no place in this system.
- **Don't** add a shadow, blur, gradient or glass panel. The system is flat and its depth is graphic.
- **Don't** make the proportional face the default. Chivo appears only inside `.prose-field`, for passages that are read rather than scanned.
- **Don't** add per-section entrance animations, scroll-linked motion, or hover transforms. One moment on load, one on approach, and nothing else.
- **Don't** wrap records in cards, panels or filled containers; a bordered box is for a control, a chip or a diagram stage.
- **Don't** let a bar field or matrix imply a measurement — geometry is a graphic, and numbers come only from real data.
- **Don't** use an eyebrow, kicker or section numbering above a heading. The heading carries itself; the bar field beside it does the rest.
- **Don't** emit raw superscript characters into an OG card without `ogText()`; Satori renders them as tofu.
- **Don't** use emoji anywhere in the interface, in copy or in content.
