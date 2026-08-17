# Lamplight — design spec

**Date:** 2026-08-16
**Status:** approved in brainstorming, pending spec review
**Replaces:** the Datamatics Field visual system (`DESIGN.md`, `AGENTS.md` §"the data field")

---

## 1. Premise

The reference is the **Pear** agency site: a scroll-driven cinematic page where
full-bleed painted imagery is the ground and type sits on top, sparingly. Its
effect comes from three things — bespoke painterly art, one saturated palette,
and scroll that drives image state rather than merely revealing sections.

This site takes that grammar and changes its subject. Pear sells an ancient
marketplace, so it paints neoclassical figures. This portfolio's subject is
**verification** — supply-chain analysis, adversarial input, a proven negative
result — so it is painted in **candlelit experiment**: Joseph Wright of Derby
and Rembrandt. Figures in the dark, examining an instrument, deciding whether
something is true.

The whole site is built on one sentence, which is also its interaction model:

> Nothing here is asserted. Only what is lit is proven.

### Non-goals

- Not a Pear clone. No blue, no gold, no togas, no `APPLY` pill.
- Not an ad. Every claim on the current site survives, in full, somewhere.
- No animation library, no UI kit, no CMS. Dependencies added: none.

---

## 2. Decisions taken (locked)

| Decision | Choice |
|---|---|
| Scope | **Replace** Datamatics Field. It survives only in git history. |
| Art source | **Public domain paintings** from Wikimedia Commons, credited. |
| Structure | **Cinematic landing + dense case files.** `/projects/[id]` keeps every word. |
| Art register | **Candlelit experiment** — Wright of Derby, Rembrandt. |
| Motion | **Lamplight signature** + scroll-scrubbed sticky acts. |
| Display face | **Newsreader** (variable, self-hosted, subset). |
| Page weight | **~3MB landing ceiling**, maximum fidelity. |

---

## 3. Visual system

### 3.1 Colour

Three tokens. Declared in `src/app/globals.css` `@theme`, replacing
`--color-field` / `--color-signal` / `--color-rule` / `--color-rule-soft`.

| Token | Value | Role |
|---|---|---|
| `--color-ground` | `#08070A` | The dark. Page background, unlit plate, all scrims. |
| `--color-signal` | `#F2EDE3` | Bone white. All text, all rules, all controls. |
| `--color-ember` | `#E8A33D` | Lamplight. **Only** the single strongest metric inside a lit region, and the lamp's own core. |

Rules:

- **Ember is not a text colour for prose.** It marks numbers, one per act,
  and only while lit. Ember on ground computes to ≈9.2:1 — clears AA for body
  text, not merely large text. The exact ratio is asserted by test rather than
  trusted; if a future palette tweak drops it below 4.5:1 the build fails.
- **No greys.** Depth comes from the paintings, which supply their own
  midtones. UI chrome stays bone or ground. Rules are bone at 12%/24% alpha —
  those are graphics, not language, same carve-out as the old system.
- **Text never sits on painted midtone.** Every copy block renders over a
  scrim: `linear-gradient(to right, ground 0%, ground 42%, transparent 100%)`
  (or `to top` for bottom-anchored blocks). Bone on scrimmed ground measures
  ≥15:1 at the text's own coordinates. This is the accessibility contract and
  a Playwright test asserts it per act.
- **Inversion is retired.** The old `.negative` mechanism has no meaning here —
  emphasis now comes from light, not from flipping ground.

### 3.2 Typography

| Face | Use |
|---|---|
| **Newsreader** (variable, opsz + wght) | Act statements only. Five to eight lines on the entire site. `clamp(2.2rem, 6.5vw, 5.5rem)`, weight 400, opsz max, tracking `-0.015em`, leading `0.98`. |
| **Chivo** (sans) | Reading passages — `about.paragraphs`, case-study prose. Unchanged from today. |
| **Chivo Mono** | Everything else: labels, `Provenance`, `Rail`, tech lists, `Bracket` controls, and **every number**. |

Numbers stay mono at every size. That is the deliberate through-line to the
old site: the paintings change, but a measured quantity still looks like an
instrument readout, never like a headline.

Newsreader is self-hosted via `next/font/local`, subset to Latin + the
punctuation actually used, `font-display: swap`. Budget: ≤34KB woff2.

### 3.3 Plates

Eight paintings. All public domain (`PD-old-100`), all sourced from Wikimedia
Commons, all ≥2500px on the long edge (verified 2026-08-16).

| # | Act | File (Commons) | Native | Why this painting |
|---|---|---|---|---|
| 1 | Hero | `An Experiment on a Bird in an Air Pump by Joseph Wright of Derby, 1768.jpg` | 5639×4226 | A room watching an experiment decide. The site's thesis as a picture. |
| 2 | About | `Joseph Wright of Derby The Alchemist.jpg` | 4724×6126 | Working alone at night on a hard problem. |
| 3 | Warden | `Joseph Wright - An Iron Forge - Google Art Project.jpg` | 2801×2572 | A defense hammered into shape; heat held under control. |
| 4 | Scheduler | `Wright of Derby, The Orrery.jpg` | 6527×4581 | A machine that models the world — literally a simulator. |
| 5 | PlantPal+ | `Joseph Wright of Derby. Two Girls Dressing a Kitten by Candlelight. c. 1768-70.jpg` | 2000×2641 | The daily loop, domestic, repeated. |
| 6 | Research | `Rembrandt - The Anatomy Lesson of Dr Nicolaes Tulp.jpg` | 6000×4520 | Cutting it open to show what is actually there — the negative result. |
| 7 | Archive | `Joseph Wright of Derby - Dovedale by Moonlight - Google Art Project.jpg` | 2400×2021 | A dim wall of older records. |
| 8 | Contact | `Joseph Wright of Derby - Academy by Lamplight - Google Art Project.jpg` | 4926×6268 | Lamp full up, people gathered around it. |

**Resolution rule.** Delivered width is `min(2560, native crop width)`. Plates
5 (2000px wide) and 7 (2400px wide) therefore cap below the 2560 tier and
their largest srcset entry is their native crop width — never upscaled. The
fetch script refuses to emit any variant wider than the source crop and fails
the build if asked to. Both capped plates are lazily loaded and are viewed
under a lamp mask that reveals at most ~40% of the frame at once, so the
shortfall is not visible at typical viewport sizes. Neither is ever the eager
above-the-fold plate.

Every plate carries a visible credit — artist, title, year, "public domain,
Wikimedia Commons" — in the act's `Provenance` line. Art gets the same
provenance treatment as code. That is not decoration; it is the same rule
`AGENTS.md` already applies to claims.

---

## 4. The lamplight mechanic

### 4.1 Behaviour

Each plate renders at `filter: brightness(0.18) saturate(0.7)` — effectively
black. A second copy of the same image renders at full brightness above it,
masked by a radial gradient:

```
mask-image: radial-gradient(
  circle var(--lamp-r) at var(--lamp-x) var(--lamp-y),
  #000 0%, #000 38%, transparent 78%
);
```

`--lamp-x` / `--lamp-y` / `--lamp-r` are CSS custom properties on the act
element. They are driven by:

- **Scroll** — the act's own progress `--p` (0→1, from the moment its top
  crosses the viewport bottom to the moment its bottom crosses the viewport
  top) moves the lamp vertically and grows `--lamp-r` from `18vmax` to
  `34vmax` at mid-act, then contracts.
- **Cursor** — on pointer-fine devices only, the pointer offsets the lamp by
  up to ±14vmin from its scroll position, eased. Touch devices get scroll only.

Metrics inside the lit radius transition to ember over 240ms and back to bone
when the light leaves. Implemented by comparing each metric's centre against
the lamp coordinates in the same rAF tick — no per-element observers.

### 4.2 Implementation constraints

- **One** rAF loop for the whole page, one `scroll` listener (passive), one
  `pointermove` listener (passive). Both write to a single mutable object; the
  rAF tick reads it and writes CSS custom properties. No React state, no
  re-renders during scroll.
- Acts outside the viewport are skipped by an `IntersectionObserver` gate.
- Budget: ≤4KB gzipped for `Lamp` + `Act` combined.

### 4.3 Reduced motion

`@media (prefers-reduced-motion: reduce)`:

- Plates render **fully lit and static** — the masked layer gets
  `mask-image: none`, the dark layer is removed.
- All metrics render ember immediately, permanently.
- No scrub, no push-in, no scroll listener attached at all (feature-detected
  in JS, not just CSS — the listener is never registered).

The reduced-motion site is not a degraded site. It is the same page with the
lamp already on.

### 4.4 No-JS

Server-rendered HTML ships plates fully lit (the dark layer and mask are added
by the client on mount). A no-JS visitor sees a handsome static painted page
with all text and all links. This is asserted by a Playwright test with
JavaScript disabled.

---

## 5. Page architecture

### 5.1 Landing (`/`)

Eight acts, each a `position: sticky` full-bleed viewport section. Structure of
an act is fixed:

```
<Act>
  <Plate/>                    ← two-layer painting + lamp mask
  <div scrim>
    <p class="label">…</p>    ← mono eyebrow, e.g. "act 03 — warden"
    <h2 class="statement">…</h2>  ← Newsreader, one line, from content.ts
    <Rail/>                   ← headlineNumbers, mono, ember when lit
    <p class="prose-field">…</p>  ← one short passage, existing copy
    <Provenance/>             ← evidence segments + live GitHub + plate credit
    <BracketLink/>            ← one link out
  </div>
</Act>
```

| Act | Content source |
|---|---|
| 1 · Hero | `hero`, `heroStats`, `links` — name, role, provenance, résumé/email/GitHub |
| 2 · About | `about.paragraphs`, `about.interests` |
| 3 · Warden | `featuredProjects[0]` — statement, headlineNumbers, oneLiner, evidence, → case file |
| 4 · Scheduler | `featuredProjects[1]` |
| 5 · PlantPal+ | `featuredProjects[2]` |
| 6 · Research | `researchSpotlight`, `benchmarkChart` — chart redrawn as bone hairlines on ground, the two highlighted rows in ember |
| 7 · Ledger | `moreProjects`, `archive`, `achievements`, `skills`, `education` — a single lamp-lit ledger; the lamp travels down it and the rows under the light brighten |
| 8 · Contact | `contact`, `links`, `SineLattice` repurposed as a constellation over the lamp |

Act 7 is the density valve. Everything the cinematic form cannot carry lives
there, in mono, as a long ruled table. It is scannable in ten seconds.

### 5.2 Case files (`/projects/[id]`)

Unchanged in content and near-unchanged in structure. Changes:

- New palette and type scale.
- Header gets the act's plate as a 60vh banner, lamp static and centred.
- `DiagramFlow`, `BenchmarkChart`, evidence tables restyled to bone-on-ground.
- No scroll mechanics. These pages are for reading.

### 5.3 Navigation

`Nav` keeps its current behaviour (in-page anchors, `withBase`), restyled: bone
hairline, mono, ground scrim. `CommandPalette` survives unchanged — it is the
fastest path for anyone who wants facts and no cinema.

---

## 6. Components

### New

| Component | Responsibility | Depends on |
|---|---|---|
| `src/lib/art.ts` | Plate registry: id, artist, title, year, Commons file, license, crop box, lamp origin, alt text. Pure data. | — |
| `scripts/fetch-art.mjs` | Fetch originals from Commons, crop, emit AVIF + WebP at 1280/1920/2560, write `art.lock.json` (sha256 per output). Run manually, output committed. | `sharp` (devDependency — justification: only way to produce AVIF at build; not shipped to client) |
| `src/components/Plate.tsx` | Two-layer `<picture>`, srcset, alt, priority flag, credit passthrough. | `art.ts`, `withBase` |
| `src/components/Lamp.tsx` | The single rAF loop, listeners, and CSS-variable writer. Client component, mounted once in `layout.tsx`. | — |
| `src/components/Act.tsx` | Sticky section shell, progress var `--p`, IntersectionObserver gate, scrim. | `Lamp` context |
| `src/components/Statement.tsx` | Newsreader display line with per-word reveal tied to `--p`. | — |

### Retired

`BarField`, `BitMatrix`, and the hero field/sine load animation. Their code is
deleted, not left dead. `src/lib/field.ts` is deleted with them.

### Repurposed

`SineLattice` → the contact-act constellation: same seeded geometry, drawn as
points of light rather than a curve.

### Survives unchanged

`Provenance`, `Metric`, `Bracket`, `CommandPalette`, `Rail`, `SectionHead`,
`CopyEmailButton`, `DiagramFlow`, `BenchmarkChart` (restyled only),
`src/lib/base.ts`, `src/lib/github.ts`, OG image routes, `llms.txt`, sitemap,
robots.

---

## 7. Content

`src/content.ts` remains the single source of truth. **One addition:** each act
needs a `statement` — a single display line. Nothing in the file is currently
written as a one-line claim.

These will be drafted strictly from existing copy and repo facts, presented to
the owner for approval, and only then written into `content.ts` as a new
`acts` export. No line ships without approval. The `AGENTS.md` rule stands
unchanged: never invent facts.

Additionally, `content.ts` gains a `plates` cross-reference mapping act ids to
`art.ts` entries, so the credit line is data, not markup.

---

## 8. Performance & budget

| Asset | Ceiling |
|---|---|
| Landing page total | 3.0MB |
| Above-the-fold (act 1 only) | 700KB |
| JS, gzipped | current budget + 4KB |
| Fonts | ≤34KB (Newsreader) + existing Chivo/Chivo Mono |

Delivery:

- Plate 1: eager, `fetchpriority=high`, 2560w AVIF.
- Plates 2–8: `loading=lazy`, `decoding=async`, preceded by a 24px LQIP
  inlined as a base64 background (≤400 bytes each).
- AVIF primary, WebP fallback, no JPEG fallback (AVIF+WebP covers every
  browser that also supports `mask-image`).
- `scripts/check-budget.mjs` extended with an image-weight assertion so the
  ceiling is enforced by CI, not by intention.

---

## 9. Accessibility

Non-negotiables carried over verbatim, plus what this design adds:

- Contrast: bone on scrimmed ground ≥15:1. Ember metrics: **AA's 4.5:1 is the
  binding requirement the gate enforces** — ≥7.6:1 was the pure-ember-on-pure-
  ground reference figure (ember at ≥18.66px semibold, directly on
  `--color-ground`, nothing else in the frame), not an achievable per-act
  requirement once a painting sits behind the text. Task 20 finish review:
  shipped ember measured 6.90–7.63:1 fully lit and lower yet under the torch
  before its idle-disarm fix (see below); the gate was amended to hold the
  line at 4.5:1, never weakened below it, and the fix that raises real-world
  ember contrast is the torch fading back out on pointer idle/pointerleave
  rather than freezing its dimming wash on page-wide, permanently, after one
  mouse nudge. A Playwright test samples the rendered pixel behind each text
  block per act and asserts the computed ratio — the scrim is verified, not
  assumed.
- Every plate has meaningful `alt` describing the painting, sourced from
  `art.ts`. Decorative-only is not used; these images carry the credit.
- Full keyboard path, visible bone focus ring on ground, correct landmarks,
  heading order `h1` → `h2` per act.
- Reduced motion per §4.3, no-JS per §4.4.
- Sticky acts do not trap scroll. No scroll hijacking, no `scroll-snap` that
  overrides intent — acts stick, the page scrolls at native speed.
- axe scan stays at **zero violations**.
- Print stylesheet: plates drop to nothing, scrims drop, all text prints black
  on white in mono/serif. Every act's content prints in document order.

---

## 10. Static export & deployment

Unchanged constraints:

- `next build` → `./out`, zero type errors.
- Both deploy targets keep working: Vercel (root) and GitHub Pages sub-path.
- All plate URLs go through `withBase`. The existing export-prefetch smoke test
  is extended to assert plate `src` values carry the base path.
- Art is committed to `public/art/`, so CI never contacts Wikimedia. The
  `art.lock.json` hash file makes the export byte-stable.

---

## 11. Testing

| Test | Asserts |
|---|---|
| smoke (existing, extended) | every act renders, every internal link resolves under basePath |
| axe (existing) | zero violations, all acts |
| contrast (new) | rendered text-over-scrim ratio ≥ threshold, per act |
| no-JS (new) | plates lit, all text and links present with JS disabled |
| reduced-motion (new) | no scroll listener registered, plates static and lit |
| art integrity (new) | every `art.ts` entry has a committed file whose sha256 matches `art.lock.json`; every plate has credit + alt |
| budget (existing, extended) | JS gzip ceiling + landing image-weight ceiling |

---

## 12. Migration order

1. Palette, type, tokens (`globals.css`, fonts) — site still renders in old layout, new colours.
2. `art.ts` + `fetch-art.mjs` + committed plates + art integrity test.
3. `Lamp`, `Act`, `Plate`, `Statement` — built and tested in isolation on a scratch route.
4. Statement copy drafted → owner approval → into `content.ts`.
5. Landing page rewritten act by act, acts 1–8.
6. Case files restyled.
7. Retire `BarField`, `BitMatrix`, `field.ts`; repurpose `SineLattice`.
8. `DESIGN.md` and `AGENTS.md` rewritten to describe what actually shipped.
9. Full gate: build, lint, typecheck, tests, budget, Lighthouse.

Each step leaves the site building and deployable.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| 3MB landing hurts mobile Lighthouse | Only act 1 is eager; LQIP + lazy for the rest. If throttled-mobile performance lands below 75, drop plates 2–8 to 1920w — a one-line change in `fetch-art.mjs`. |
| Paintings overwhelm the evidence | Act 7 ledger is dense and mono; `CommandPalette` jumps straight to any section; case files unchanged. |
| Lamp mask performance on low-end devices | `mask-image` on a static image is GPU-composited; the rAF loop writes two custom properties per frame. Fallback: if a frame budget of 16ms is missed 10× consecutively, the lamp locks to full-lit and detaches. |
| `mask-image` support | Baseline in all evergreen browsers; unsupported browsers fall through to the fully-lit layer, which is the no-JS state — still correct. |
| Statement lines drift toward invention | Owner approves each line before it enters `content.ts`. |
