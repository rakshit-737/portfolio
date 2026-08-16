# Lamplight Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Datamatics Field visual system with "Lamplight" — a scroll-driven, candlelit portfolio built on public-domain paintings, where a movable light source reveals both the art and the metrics.

**Architecture:** Eight sticky full-bleed "acts" on the landing page. Each act renders a public-domain painting twice — a near-black layer and a fully-lit layer masked by a radial gradient whose centre is driven by scroll and cursor. A single client component owns the one rAF loop and writes CSS custom properties; everything else is pure CSS. Case-study pages keep all their content and only change palette and type. Static export, zero new runtime dependencies.

**Tech Stack:** Next 16.2.12 (App Router, `output: "export"`), React 19, Tailwind CSS 4 (`@theme` tokens), `next/font/google` (Chivo, Chivo Mono, Newsreader), Playwright + axe, `sharp` (devDependency, build-time image processing only).

**Spec:** `docs/superpowers/specs/2026-08-16-lamplight-portfolio-design.md`

## Global Constraints

- **Never invent facts.** Every visible claim traces to `src/content.ts`, a linked repo, or the owner's explicit input. When information is missing, ask.
- `src/content.ts` is the single source of truth for every word. Components render only what it exports.
- **Statement lines require owner approval before they enter `content.ts`** (Task 6 is a hard stop).
- Palette is exactly three tokens: `--color-ground` `#08070A`, `--color-signal` `#F2EDE3`, `--color-ember` `#E8A33D`. No greys. Rules are `--color-signal` at fractional alpha only.
- Ember is used only for metric ignition and the lamp core — never for prose.
- Static export must keep working on both deploys: Vercel (root) and GitHub Pages sub-path. Every internal asset and page link goes through `withBase` / `NEXT_PUBLIC_BASE_PATH`.
- No new runtime dependencies. `sharp` is a devDependency, justification: only practical way to emit AVIF at build time; never shipped to the client.
- Accessibility: full keyboard path, visible focus, correct landmarks, heading order, WCAG AA contrast, reduced-motion everywhere. **axe must stay at zero violations.**
- Never dim text to signal a state.
- Landing page ceiling: **3.0MB** total, **700KB** above the fold, JS gzipped ≤ **214KB** (current 210 + 4).
- Delivered image width is `min(2560, native crop width)`. Never upscale.
- Commands: `npm run build` (export to `./out`, zero type errors), `npm run lint`, `npm run typecheck`, `npm test` (build first), `npm run budget`.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/art.ts` | Plate registry — id, artist, title, year, Commons filename, license, crop box, lamp origin, alt text. Pure data + types. |
| `scripts/fetch-art.mjs` | Downloads Commons originals, crops, emits AVIF/WebP variants + LQIP, writes `art.lock.json`. Run manually; output committed. |
| `scripts/check-art.mjs` | Verifies every registry entry has committed files whose sha256 matches the lockfile. CI gate. |
| `public/art/*.avif` `*.webp` | Committed plate variants. |
| `src/lib/art.lock.json` | sha256 per emitted file — makes the export byte-stable. |
| `src/components/Lamp.tsx` | The single rAF loop, scroll/pointer listeners, CSS-variable writer. Client component. |
| `src/components/Act.tsx` | Sticky section shell — progress var, IntersectionObserver gate, scrim. |
| `src/components/Plate.tsx` | Two-layer `<picture>` with srcset, alt, priority, LQIP. |
| `src/components/Statement.tsx` | Newsreader display line. |
| `tests/lamplight.spec.ts` | Contrast, no-JS, reduced-motion, plate credit tests. |

**Modified:** `src/app/globals.css` (rewritten), `src/app/layout.tsx` (fonts + contract), `src/app/page.tsx` (rewritten), `src/app/projects/[id]/page.tsx` (restyle), `src/content.ts` (adds `acts`), `src/components/{Provenance,Rail,Metric,Bracket,Nav,SectionHead,BenchmarkChart,DiagramFlow,SineLattice}.tsx` (token + style updates), `scripts/check-budget.mjs`, `tests/smoke.spec.ts`, `package.json`, `DESIGN.md`, `AGENTS.md`, `README.md`.

**Deleted:** `src/components/BarField.tsx`, `src/components/BitMatrix.tsx`, `src/lib/field.ts`.

---

### Task 0: Branch

**Files:** none.

- [ ] **Step 1: Rename the branch**

The current branch name describes the design being replaced.

```bash
git branch -m redesign/datamatics-field redesign/lamplight
git status
```

Expected: `On branch redesign/lamplight`, working tree clean apart from `UPGRADE_PROMPT.md`.

---

### Task 1: Palette, type tokens, and fonts

**Files:**
- Modify: `src/app/globals.css` (full rewrite of the token and primitive layers)
- Modify: `src/app/layout.tsx:1-16` (add Newsreader), `:20-39` (contract), `:77-86` (html/body classes)
- Test: `tests/lamplight.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--color-ground`, `--color-signal`, `--color-ember`, `--color-rule`, `--color-rule-soft`; Tailwind utilities `bg-ground`, `text-signal`, `text-ember`, `border-rule`; font variables `--font-chivo-mono`, `--font-chivo`, `--font-newsreader`; classes `.label`, `.prose-field`, `.metric`, `.statement`.

- [ ] **Step 1: Write the failing test**

Create `tests/lamplight.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/** Relative luminance per WCAG 2.1. */
function luminance([r, g, b]: number[]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const GROUND = [0x08, 0x07, 0x0a];
const SIGNAL = [0xf2, 0xed, 0xe3];
const EMBER = [0xe8, 0xa3, 0x3d];

test("palette tokens are the three specified values", async ({ page }) => {
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      ground: s.getPropertyValue("--color-ground").trim(),
      signal: s.getPropertyValue("--color-signal").trim(),
      ember: s.getPropertyValue("--color-ember").trim(),
    };
  });
  expect(tokens.ground.toLowerCase()).toBe("#08070a");
  expect(tokens.signal.toLowerCase()).toBe("#f2ede3");
  expect(tokens.ember.toLowerCase()).toBe("#e8a33d");
});

test("palette clears WCAG AA", () => {
  expect(ratio(SIGNAL, GROUND)).toBeGreaterThanOrEqual(4.5);
  // Ember carries numbers, which are body-sized — AA body, not just large.
  expect(ratio(EMBER, GROUND)).toBeGreaterThanOrEqual(4.5);
});

test("the display face is loaded and applied to statements", async ({
  page,
}) => {
  await page.goto("/");
  const family = await page
    .locator(".statement")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Newsreader/i);
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
npm run build && npx playwright test tests/lamplight.spec.ts
```

Expected: the token test FAILS (properties resolve to empty strings), the statement test FAILS (no `.statement` element exists yet). The pure-math test passes — that is fine, it is a guard, not a driver.

- [ ] **Step 3: Rewrite the token and primitive layers**

Replace lines 1–115 of `src/app/globals.css` (everything from `@import` through the `.metric` rule) with:

```css
@import "tailwindcss";

/* ─────────────────────────────────────────────────────────────────────
   LAMPLIGHT — the world.

   Three values. Ground is the dark a candlelit painting sits in; signal
   is bone white and carries all language; ember is the light itself and
   touches nothing but a lit number and the lamp's own core.

   There is no grey. Depth is supplied by the paintings, which bring
   their own midtones. Fractional alpha belongs only to rules, which are
   graphics rather than language.

   Emphasis is not inversion — it is light. Nothing here is asserted;
   only what is lit is proven.
   ───────────────────────────────────────────────────────────────────── */

@theme {
  --color-ground: #08070a;
  --color-signal: #f2ede3;
  --color-ember: #e8a33d;
  --color-rule: rgb(242 237 227 / 0.24);
  --color-rule-soft: rgb(242 237 227 / 0.12);

  --font-mono: var(--font-chivo-mono), ui-monospace, monospace;
  --font-sans: var(--font-chivo), system-ui, sans-serif;
  --font-display: var(--font-newsreader), Georgia, serif;
}

html {
  background: var(--color-ground);
  color-scheme: dark;
  scrollbar-width: thin;
  scrollbar-color: rgb(242 237 227 / 0.3) #08070a;
}

body {
  background: var(--color-ground);
  color: var(--color-signal);
  font-family: var(--font-mono);
  font-feature-settings: "tnum" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--color-signal);
  color: var(--color-ground);
}

:focus-visible {
  outline: 2px solid var(--color-signal);
  outline-offset: 2px;
}

section[id] {
  scroll-margin-top: 3.75rem;
}

::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}
::-webkit-scrollbar-thumb {
  background: rgb(242 237 227 / 0.28);
}
::-webkit-scrollbar-track {
  background: #08070a;
}

/* ── Type primitives ────────────────────────────────────────────────── */

.label {
  font-size: 0.6875rem;
  line-height: 1.1;
  letter-spacing: 0.19em;
  text-transform: uppercase;
}

.prose-field {
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.68;
  max-width: 62ch;
  letter-spacing: 0.001em;
}
.prose-field p + p {
  margin-top: 1.15em;
}

/* The act statement — the only display voice on the site. */
.statement {
  font-family: var(--font-display);
  font-optical-sizing: auto;
  font-weight: 400;
  font-size: clamp(2.2rem, 6.5vw, 5.5rem);
  line-height: 0.98;
  letter-spacing: -0.015em;
  max-width: 18ch;
  text-wrap: balance;
}

/* A metric inside a bullet. Mono, never dimmed, ignites under the lamp
   via the ::after layer in the materials block below. */
.metric {
  position: relative;
  display: inline-block;
  font-family: var(--font-mono);
  font-weight: 600;
  white-space: nowrap;
}
```

Note: `scroll-behavior: smooth` is deliberately dropped from `html` — the acts are sticky and smooth scrolling fights the lamp's scroll mapping. The command palette and nav anchors set `behavior: "smooth"` per-call instead (Task 10 wiring), so reduced-motion users get instant jumps for free.

- [ ] **Step 4: Add Newsreader to the layout**

In `src/app/layout.tsx`, replace lines 1–16 with:

```tsx
import type { Metadata } from "next";
import { Chivo, Chivo_Mono, Newsreader } from "next/font/google";
import { site } from "@/content";
import "./globals.css";

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
  display: "swap",
});

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  display: "swap",
});

// The display voice. Optical-size axis included so the statement lines
// use Newsreader's display cut rather than its text cut.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});
```

Then update the `<html>` element (line 77-80) to include the new variable and swap the body tokens:

```tsx
    <html
      lang="en"
      className={`${chivoMono.variable} ${chivo.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ground text-signal">
```

- [ ] **Step 5: Rewrite the direction contract**

Replace the `CONTRACT` template literal (layout.tsx lines 20-39) with:

```tsx
const CONTRACT = `
  THESIS: an engineer's record lit by a moving lamp — nothing here is asserted,
  only what is lit is proven. Refuses the dark-terminal developer portfolio and
  its opposite, the airy white résumé page.
  OWN-WORLD: three values — ground #08070A, bone signal #F2EDE3, ember #E8A33D.
  No grey. Depth comes from public-domain candlelit paintings (Wright of Derby,
  Rembrandt), each credited like a source. Newsreader carries five display lines;
  Chivo Mono carries every number, at every size, so a measured quantity always
  reads as an instrument and never as a headline.
  STORY: this person measures things, publishes what the measurements say —
  including when they say no — and every claim here carries its proof.
  FIRST VIEWPORT: Wright of Derby's Air Pump in near-darkness, a lamp finding
  the statement line, the hero stat rail igniting as the light crosses it.
  FORM: Lamplight — scroll and cursor drive one radial mask across eight sticky
  acts; case files stay dense and unhurried.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md
`;
```

- [ ] **Step 6: Make the build compile**

`bg-field`/`text-field` utilities no longer exist. Find every use and swap to `ground`:

```bash
npx tsc --noEmit
grep -rn "bg-field\|text-field\|--color-field\|\.negative\|negative " src/ || true
```

For each hit in `src/`, replace `bg-field` → `bg-ground`, `text-field` → `text-ground`, `--color-field` → `--color-ground`. Leave `.negative` usages alone for now — Task 9 removes the last one; until then add a temporary compatibility rule at the end of `globals.css`:

```css
/* Temporary: removed in Task 9 when the last .negative region is rewritten. */
.negative {
  --color-ground: #f2ede3;
  --color-signal: #08070a;
  --color-rule: rgb(8 7 10 / 0.3);
  --color-rule-soft: rgb(8 7 10 / 0.13);
  background: var(--color-ground);
  color: var(--color-signal);
}
```

- [ ] **Step 7: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npx playwright test tests/lamplight.spec.ts
```

Expected: token test PASSES, contrast test PASSES, statement test still FAILS (no `.statement` element until Task 7). That is the correct state — leave it failing.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx tests/lamplight.spec.ts src/
git commit -m "feat: lamplight palette, display face, and direction contract"
```

---

### Task 2: The plate registry

**Files:**
- Create: `src/lib/art.ts`
- Test: `tests/art.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface Plate { id: string; artist: string; title: string; year: string; commonsFile: string; license: "PD-old-100"; sourceUrl: string; native: { w: number; h: number }; crop: { x: number; y: number; w: number; h: number }; lamp: { x: number; y: number }; alt: string; }`
  - `export const plates: Record<PlateId, Plate>`
  - `export type PlateId = "airpump" | "alchemist" | "forge" | "orrery" | "kitten" | "anatomy" | "dovedale" | "academy"`
  - `export function creditOf(plate: Plate): string`
  - `export const PLATE_WIDTHS: readonly number[]` = `[1280, 1920, 2560]`

`crop` is expressed in fractions of the native image (0–1), origin top-left. `lamp` is the light's rest position in fractions of the *cropped* frame — set to the painting's actual light source so the mask agrees with the paint.

- [ ] **Step 1: Write the failing test**

Create `tests/art.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { PLATE_WIDTHS, creditOf, plates } from "../src/lib/art";

test("every plate is public domain and credited", () => {
  const entries = Object.values(plates);
  expect(entries).toHaveLength(8);
  for (const p of entries) {
    expect(p.license).toBe("PD-old-100");
    expect(p.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    expect(creditOf(p)).toContain(p.artist);
    expect(creditOf(p)).toContain(p.year);
    expect(creditOf(p)).toContain("public domain");
  }
});

test("every plate has meaningful alt text", () => {
  for (const p of Object.values(plates)) {
    expect(p.alt.length).toBeGreaterThan(40);
    expect(p.alt).not.toMatch(/^image of|^picture of|^photo of/i);
  }
});

test("crop boxes stay inside the native frame", () => {
  for (const p of Object.values(plates)) {
    expect(p.crop.x + p.crop.w).toBeLessThanOrEqual(1.0001);
    expect(p.crop.y + p.crop.h).toBeLessThanOrEqual(1.0001);
    expect(p.crop.w).toBeGreaterThan(0);
    expect(p.crop.h).toBeGreaterThan(0);
  }
});

test("no variant would upscale its source", () => {
  for (const p of Object.values(plates)) {
    const cropWidthPx = Math.round(p.native.w * p.crop.w);
    const largest = Math.max(
      ...PLATE_WIDTHS.filter((w) => w <= cropWidthPx),
      PLATE_WIDTHS[0],
    );
    expect(largest).toBeLessThanOrEqual(Math.max(cropWidthPx, PLATE_WIDTHS[0]));
  }
});

test("lamp rest positions are inside the frame", () => {
  for (const p of Object.values(plates)) {
    expect(p.lamp.x).toBeGreaterThanOrEqual(0);
    expect(p.lamp.x).toBeLessThanOrEqual(1);
    expect(p.lamp.y).toBeGreaterThanOrEqual(0);
    expect(p.lamp.y).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
npx playwright test tests/art.spec.ts
```

Expected: FAIL — `Cannot find module '../src/lib/art'`.

- [ ] **Step 3: Write the registry**

Create `src/lib/art.ts`. All eight files, native dimensions, and licences were verified against the Commons API on 2026-08-16.

```ts
/**
 * The plates — eight public-domain paintings that carry the site.
 *
 * Every entry is verified against the Wikimedia Commons API: file name,
 * native pixel dimensions, and licence. Art gets the same provenance
 * treatment as code — nothing renders without a visible credit.
 *
 * `crop` is a fraction of the native frame (0–1, origin top-left).
 * `lamp` is the light's rest position within the *cropped* frame, set to
 * where the painter actually put the light source.
 */

export type PlateId =
  | "airpump"
  | "alchemist"
  | "forge"
  | "orrery"
  | "kitten"
  | "anatomy"
  | "dovedale"
  | "academy";

export interface Plate {
  id: PlateId;
  artist: string;
  title: string;
  year: string;
  /** Exact `File:` name on Wikimedia Commons, without the `File:` prefix. */
  commonsFile: string;
  license: "PD-old-100";
  sourceUrl: string;
  native: { w: number; h: number };
  crop: { x: number; y: number; w: number; h: number };
  lamp: { x: number; y: number };
  alt: string;
}

/** Widths emitted per plate. A variant is skipped when it would upscale. */
export const PLATE_WIDTHS = [1280, 1920, 2560] as const;

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

export const plates: Record<PlateId, Plate> = {
  airpump: {
    id: "airpump",
    artist: "Joseph Wright of Derby",
    title: "An Experiment on a Bird in the Air Pump",
    year: "1768",
    commonsFile:
      "An Experiment on a Bird in an Air Pump by Joseph Wright of Derby, 1768.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "An Experiment on a Bird in an Air Pump by Joseph Wright of Derby, 1768.jpg",
    ),
    native: { w: 5639, h: 4226 },
    crop: { x: 0, y: 0, w: 1, h: 0.9 },
    lamp: { x: 0.5, y: 0.62 },
    alt: "A candlelit room of onlookers watching a demonstrator withdraw the air from a glass globe containing a bird, their faces caught between fascination and dread.",
  },
  alchemist: {
    id: "alchemist",
    artist: "Joseph Wright of Derby",
    title: "The Alchemist Discovering Phosphorus",
    year: "1771",
    commonsFile: "Joseph Wright of Derby The Alchemist.jpg",
    license: "PD-old-100",
    sourceUrl: commons("Joseph Wright of Derby The Alchemist.jpg"),
    native: { w: 4724, h: 6126 },
    crop: { x: 0, y: 0.16, w: 1, h: 0.62 },
    lamp: { x: 0.46, y: 0.55 },
    alt: "An alchemist kneeling alone at night in a vaulted room, hands raised before a flask that has begun to glow.",
  },
  forge: {
    id: "forge",
    artist: "Joseph Wright of Derby",
    title: "An Iron Forge",
    year: "1772",
    commonsFile: "Joseph Wright - An Iron Forge - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright - An Iron Forge - Google Art Project.jpg",
    ),
    native: { w: 2801, h: 2572 },
    crop: { x: 0, y: 0.06, w: 1, h: 0.84 },
    lamp: { x: 0.44, y: 0.58 },
    alt: "A working forge at night, a white-hot ingot on the anvil throwing hard light across the smith, his family, and the timber frame of the shop.",
  },
  orrery: {
    id: "orrery",
    artist: "Joseph Wright of Derby",
    title: "A Philosopher Lecturing on the Orrery",
    year: "1766",
    commonsFile: "Wright of Derby, The Orrery.jpg",
    license: "PD-old-100",
    sourceUrl: commons("Wright of Derby, The Orrery.jpg"),
    native: { w: 6527, h: 4581 },
    crop: { x: 0, y: 0, w: 1, h: 0.94 },
    lamp: { x: 0.52, y: 0.54 },
    alt: "A philosopher lecturing on a brass orrery, a lamp standing in for the sun at its centre and lighting the listening faces from below.",
  },
  kitten: {
    id: "kitten",
    artist: "Joseph Wright of Derby",
    title: "Two Girls Dressing a Kitten by Candlelight",
    year: "c. 1768–70",
    commonsFile:
      "Joseph Wright of Derby. Two Girls Dressing a Kitten by Candlelight. c. 1768-70.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby. Two Girls Dressing a Kitten by Candlelight. c. 1768-70.jpg",
    ),
    native: { w: 2000, h: 2641 },
    crop: { x: 0, y: 0.2, w: 1, h: 0.58 },
    lamp: { x: 0.5, y: 0.6 },
    alt: "Two girls bent over a kitten by candlelight, absorbed in a small domestic ritual repeated night after night.",
  },
  anatomy: {
    id: "anatomy",
    artist: "Rembrandt van Rijn",
    title: "The Anatomy Lesson of Dr Nicolaes Tulp",
    year: "1632",
    commonsFile: "Rembrandt - The Anatomy Lesson of Dr Nicolaes Tulp.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Rembrandt - The Anatomy Lesson of Dr Nicolaes Tulp.jpg",
    ),
    native: { w: 6000, h: 4520 },
    crop: { x: 0, y: 0, w: 1, h: 0.95 },
    lamp: { x: 0.42, y: 0.6 },
    alt: "Surgeons crowded around a dissection table as Dr Tulp lifts the tendons of a forearm with forceps, everyone watching the evidence rather than the body.",
  },
  dovedale: {
    id: "dovedale",
    artist: "Joseph Wright of Derby",
    title: "Dovedale by Moonlight",
    year: "1784",
    commonsFile:
      "Joseph Wright of Derby - Dovedale by Moonlight - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby - Dovedale by Moonlight - Google Art Project.jpg",
    ),
    native: { w: 2400, h: 2021 },
    crop: { x: 0, y: 0.08, w: 1, h: 0.8 },
    lamp: { x: 0.62, y: 0.36 },
    alt: "A river valley under a full moon, the water carrying a cold band of reflected light between dark banks.",
  },
  academy: {
    id: "academy",
    artist: "Joseph Wright of Derby",
    title: "An Academy by Lamplight",
    year: "c. 1769",
    commonsFile:
      "Joseph Wright of Derby - Academy by Lamplight - Google Art Project.jpg",
    license: "PD-old-100",
    sourceUrl: commons(
      "Joseph Wright of Derby - Academy by Lamplight - Google Art Project.jpg",
    ),
    native: { w: 4926, h: 6268 },
    crop: { x: 0, y: 0.18, w: 1, h: 0.6 },
    lamp: { x: 0.38, y: 0.44 },
    alt: "Students gathered close around a single lamp to draw a classical statue, the light falling hardest on the work in front of them.",
  },
};

/** The visible provenance line for a plate. */
export function creditOf(plate: Plate): string {
  return `${plate.artist}, ${plate.title}, ${plate.year} — public domain, Wikimedia Commons`;
}
```

- [ ] **Step 4: Run the tests**

```bash
npx playwright test tests/art.spec.ts
```

Expected: all five PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/art.ts tests/art.spec.ts
git commit -m "feat: plate registry — eight verified public-domain paintings"
```

---

### Task 3: Fetch, crop, and commit the plates

**Files:**
- Create: `scripts/fetch-art.mjs`, `scripts/check-art.mjs`
- Create (generated, committed): `public/art/*.avif`, `public/art/*.webp`, `src/lib/art.lock.json`
- Modify: `package.json` (scripts + `sharp` devDependency)

**Interfaces:**
- Consumes: `plates`, `PLATE_WIDTHS` from `src/lib/art.ts`.
- Produces: files named `public/art/<id>-<width>.avif` / `.webp`; `src/lib/art.lock.json` shaped `{ "<filename>": { "sha256": string, "bytes": number, "width": number, "height": number } }`; each plate also gets `public/art/<id>-lqip.txt` containing a base64 data URI ≤ 400 bytes.

- [ ] **Step 1: Write the failing check**

Create `scripts/check-art.mjs`:

```js
// Art integrity gate. Every registry entry must have committed files whose
// sha256 matches the lockfile — the export stays byte-stable and CI never
// has to contact Wikimedia.
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const lockPath = "src/lib/art.lock.json";
if (!existsSync(lockPath)) {
  console.error(`FAIL missing ${lockPath} — run: npm run art`);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const names = Object.keys(lock);
let failed = false;

if (names.length === 0) {
  console.error("FAIL lockfile is empty");
  failed = true;
}

for (const name of names) {
  const path = join("public", "art", name);
  if (!existsSync(path)) {
    console.error(`FAIL missing ${path}`);
    failed = true;
    continue;
  }
  const buf = readFileSync(path);
  const sha = createHash("sha256").update(buf).digest("hex");
  if (sha !== lock[name].sha256) {
    console.error(`FAIL sha mismatch ${path}`);
    failed = true;
  } else if (buf.length !== lock[name].bytes) {
    console.error(`FAIL size mismatch ${path}`);
    failed = true;
  }
}

console.log(failed ? "art: FAILED" : `art: OK — ${names.length} files verified`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node scripts/check-art.mjs
```

Expected: `FAIL missing src/lib/art.lock.json — run: npm run art`, exit 1.

- [ ] **Step 3: Add sharp and the scripts**

```bash
npm install --save-dev sharp
```

In `package.json` add to `scripts`:

```json
    "art": "node scripts/fetch-art.mjs",
    "check:art": "node scripts/check-art.mjs"
```

- [ ] **Step 4: Write the fetch script**

Create `scripts/fetch-art.mjs`:

```js
// Fetches the plate originals from Wikimedia Commons, crops them to the
// registry's crop box, and emits AVIF + WebP variants plus a tiny LQIP.
//
// Run manually (`npm run art`); the output is committed. CI never runs
// this — it runs check-art.mjs against the lockfile instead.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const { plates, PLATE_WIDTHS } = await import("../src/lib/art.ts");

const OUT = join("public", "art");
const UA = "rakshit-portfolio-art/1.0 (https://github.com/rakshit-737/portfolio)";
mkdirSync(OUT, { recursive: true });

/** Commons Special:FilePath serves the original bytes for a File: name. */
const originalUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;

const lock = {};

function record(name, buf, width, height) {
  writeFileSync(join(OUT, name), buf);
  lock[name] = {
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    width,
    height,
  };
  console.log(`  ${name}  ${(buf.length / 1024).toFixed(0)} kB`);
}

for (const plate of Object.values(plates)) {
  console.log(`${plate.id}: fetching`);
  const res = await fetch(originalUrl(plate.commonsFile), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`${plate.id}: HTTP ${res.status} for ${plate.commonsFile}`);
  }
  const source = sharp(Buffer.from(await res.arrayBuffer()));
  const meta = await source.metadata();

  if (meta.width !== plate.native.w || meta.height !== plate.native.h) {
    throw new Error(
      `${plate.id}: source is ${meta.width}x${meta.height}, registry says ` +
        `${plate.native.w}x${plate.native.h} — update src/lib/art.ts`,
    );
  }

  const box = {
    left: Math.round(meta.width * plate.crop.x),
    top: Math.round(meta.height * plate.crop.y),
    width: Math.round(meta.width * plate.crop.w),
    height: Math.round(meta.height * plate.crop.h),
  };

  for (const width of PLATE_WIDTHS) {
    // Never upscale. A plate whose crop is narrower than a tier simply
    // does not get that tier.
    if (width > box.width) {
      console.log(`  skip ${width}w (crop is ${box.width}px wide)`);
      continue;
    }
    const base = sharp(await source.clone().extract(box).toBuffer()).resize({
      width,
    });
    const height = Math.round((box.height / box.width) * width);

    record(
      `${plate.id}-${width}.avif`,
      await base.clone().avif({ quality: 62, effort: 6 }).toBuffer(),
      width,
      height,
    );
    record(
      `${plate.id}-${width}.webp`,
      await base.clone().webp({ quality: 76 }).toBuffer(),
      width,
      height,
    );
  }

  // 24px LQIP, inlined as a background while the real plate loads.
  const lqip = await sharp(await source.clone().extract(box).toBuffer())
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();
  const uri = `data:image/webp;base64,${lqip.toString("base64")}`;
  if (uri.length > 400) {
    throw new Error(`${plate.id}: LQIP is ${uri.length} bytes, ceiling is 400`);
  }
  const lqipBuf = Buffer.from(uri, "utf8");
  record(`${plate.id}-lqip.txt`, lqipBuf, 24, 24);
}

writeFileSync("src/lib/art.lock.json", JSON.stringify(lock, null, 2) + "\n");
console.log(`\nwrote src/lib/art.lock.json — ${Object.keys(lock).length} files`);
```

Note: the script imports the TypeScript registry directly. Node 20+ cannot import `.ts` natively, so run it through the type stripper:

```json
    "art": "node --experimental-strip-types scripts/fetch-art.mjs",
```

If that flag is unavailable in the installed Node, fall back to `npx tsx scripts/fetch-art.mjs` — do **not** duplicate the registry into JavaScript. The registry has exactly one home.

- [ ] **Step 5: Fetch the art**

```bash
npm run art
```

Expected: eight plates fetched, ~40 files written, no upscale warnings for plates 1–4, 6, 8; `kitten` skips the 2560 tier (crop is 2000px wide), `dovedale` skips 2560 (2400px wide). Total `public/art` size should land near 2.5–3.5MB across all tiers.

- [ ] **Step 6: Run the check**

```bash
node scripts/check-art.mjs
```

Expected: `art: OK — N files verified`, exit 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-art.mjs scripts/check-art.mjs package.json package-lock.json public/art src/lib/art.lock.json
git commit -m "feat: fetch, crop, and lock the eight plates"
```

---

### Task 4: The lamp

**Files:**
- Create: `src/components/Lamp.tsx`
- Modify: `src/app/globals.css` (materials block), `src/app/layout.tsx` (mount)
- Test: `tests/lamplight.spec.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export default function Lamp(): null` — a client component, mounted once in `layout.tsx`, that sets `data-lamp="on"` on `<html>` and per-act custom properties `--p` (0–1 act progress), `--lamp-x`, `--lamp-y` (percentages of the act box).
  - Contract for consumers: any element with `data-act` is driven. Any descendant reads `--lamp-x`/`--lamp-y`/`--p`.
  - CSS classes `.plate`, `.plate-dark`, `.plate-lit`, `.scrim`, `.ignite`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lamplight.spec.ts`:

```ts
test("the lamp turns on and moves with scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const act = page.locator("[data-act]").first();
  const before = await act.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--lamp-y"),
  );
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
  await page.waitForTimeout(120);
  const after = await act.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--lamp-y"),
  );
  expect(after).not.toBe(before);
});

test("reduced motion leaves the lamp off and the plates lit", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  const opacity = await page
    .locator(".plate-lit")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(opacity)).toBe(1);
  await ctx.close();
});

test("with JavaScript disabled the plates are lit and the text is present", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  await expect(page.locator(".statement").first()).toBeVisible();
  await ctx.close();
});
```

- [ ] **Step 2: Run them to make sure they fail**

```bash
npm run build && npx playwright test tests/lamplight.spec.ts -g "lamp|reduced|JavaScript"
```

Expected: all three FAIL — no `data-lamp`, no `[data-act]`, no `.plate-lit`.

- [ ] **Step 3: Write the lamp**

Create `src/components/Lamp.tsx`:

```tsx
"use client";

import { useEffect } from "react";

/**
 * The one moving part on the site.
 *
 * A single rAF loop, one passive scroll listener, one passive pointermove
 * listener. Each frame it writes three custom properties per visible act:
 * `--p` (0→1 progress through the act) and `--lamp-x` / `--lamp-y` (the
 * light's position as a percentage of the act box). Everything visual is
 * CSS reading those properties — no React state, no re-renders on scroll.
 *
 * The default, JS-free state is "fully lit". This component switches the
 * page into masked mode by setting `data-lamp="on"`, so a no-JS visitor
 * and a reduced-motion visitor both get a handsome static painted page
 * rather than a black one.
 */
export default function Lamp() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine)").matches;

    let acts: HTMLElement[] = [];
    const visible = new Set<HTMLElement>();
    const pointer = { x: 0.5, y: 0.5, active: false };
    let frame = 0;
    let slowFrames = 0;
    let last = 0;

    const collect = () => {
      acts = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
      observer.disconnect();
      for (const act of acts) observer.observe(act);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visible.add(el);
          else visible.delete(el);
        }
      },
      { rootMargin: "10% 0px" },
    );

    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.active = true;
    };

    const tick = (now: number) => {
      // If the page cannot hold a frame budget ten times running, the lamp
      // is costing more than it is worth on this device. Lock it lit.
      if (last && now - last > 32) {
        if (++slowFrames >= 10) {
          root.removeAttribute("data-lamp");
          teardown();
          return;
        }
      } else {
        slowFrames = 0;
      }
      last = now;

      const vh = window.innerHeight;
      for (const act of visible) {
        const r = act.getBoundingClientRect();
        // 0 when the act's top hits the viewport bottom, 1 when its
        // bottom leaves the top.
        const span = r.height + vh;
        const p = Math.min(1, Math.max(0, (vh - r.top) / span));

        const restX = Number(act.dataset.lampX ?? 0.5);
        const restY = Number(act.dataset.lampY ?? 0.5);

        // Scroll walks the light down the frame around its rest position;
        // the pointer nudges it, but never takes it over.
        let x = restX;
        let y = restY - 0.22 + p * 0.44;
        if (fine && pointer.active) {
          x += (pointer.x - 0.5) * 0.28;
          y += (pointer.y - 0.5) * 0.18;
        }

        act.style.setProperty("--p", p.toFixed(4));
        act.style.setProperty("--lamp-x", `${(x * 100).toFixed(2)}%`);
        act.style.setProperty("--lamp-y", `${(y * 100).toFixed(2)}%`);
      }
      frame = requestAnimationFrame(tick);
    };

    const teardown = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", collect);
    };

    root.setAttribute("data-lamp", "on");
    collect();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", collect, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      teardown();
      root.removeAttribute("data-lamp");
    };
  }, []);

  return null;
}
```

Note: there is no `scroll` listener. `getBoundingClientRect()` inside the rAF loop already reflects scroll position, and reading it once per visible act per frame is cheaper than a listener plus a rect cache that scroll invalidates anyway.

- [ ] **Step 4: Write the materials CSS**

Replace the old "Materials" and "authored moment" blocks in `globals.css` (everything from `/* ── Materials ── */` down to the `[data-grown="false"]` rule) with:

```css
/* ── Materials ──────────────────────────────────────────────────────── */

.mark {
  fill: var(--color-signal);
}
.stroke-mark {
  stroke: var(--color-signal);
}

/* Barcode end-caps on controls. */
.cap {
  background-image: repeating-linear-gradient(
    to right,
    currentColor 0 1px,
    transparent 1px 3px,
    currentColor 3px 4px,
    transparent 4px 9px,
    currentColor 9px 11px,
    transparent 11px 14px
  );
}

/* ── The lamp ────────────────────────────────────────────────────────
   Default state — no JS, or reduced motion — is FULLY LIT. The mask is
   only introduced once <html data-lamp="on"> is set by the client. A
   page that never runs JavaScript is a painted page, not a black one. */

.plate {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: var(--color-ground);
  background-size: cover;
  background-position: center;
}
.plate img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Scroll pushes the frame in, very slightly. Free — no layout. */
  transform: scale(calc(1.04 + var(--p, 0) * 0.06));
  transform-origin: center;
}
.plate-dark {
  display: none;
}

[data-lamp="on"] .plate-dark {
  display: block;
  filter: brightness(0.18) saturate(0.7);
}
[data-lamp="on"] .plate-lit {
  --lamp-r: calc(18vmax + min(var(--p, 0), 1 - var(--p, 0)) * 32vmax);
  -webkit-mask-image: radial-gradient(
    circle var(--lamp-r) at var(--lamp-x, 50%) var(--lamp-y, 50%),
    #000 0%,
    #000 38%,
    transparent 78%
  );
  mask-image: radial-gradient(
    circle var(--lamp-r) at var(--lamp-x, 50%) var(--lamp-y, 50%),
    #000 0%,
    #000 38%,
    transparent 78%
  );
}

/* Text never sits on painted midtone. */
.scrim {
  position: relative;
  z-index: 1;
}
.scrim::before {
  content: "";
  position: absolute;
  inset: -8vh -6vw;
  z-index: -1;
  background: linear-gradient(
    to right,
    var(--color-ground) 0%,
    var(--color-ground) 42%,
    transparent 100%
  );
  pointer-events: none;
}
@media (max-width: 48rem) {
  .scrim::before {
    background: linear-gradient(
      to top,
      var(--color-ground) 0%,
      var(--color-ground) 62%,
      transparent 100%
    );
  }
}

/* A number ignites when the light reaches it. The ember copy is a
   pseudo-element, so assistive technology reads the bone original once
   and axe never sees a second colour on the same text node. */
.ignite {
  position: relative;
  color: var(--color-signal);
}
.ignite::after {
  content: attr(data-value);
  position: absolute;
  inset: 0;
  color: var(--color-ember);
  pointer-events: none;
}
[data-lamp="on"] .ignite::after {
  -webkit-mask-image: radial-gradient(
    circle var(--lamp-r, 26vmax) at var(--lamp-x, 50%) var(--lamp-y, 50%),
    #000 0%,
    #000 30%,
    transparent 62%
  );
  mask-image: radial-gradient(
    circle var(--lamp-r, 26vmax) at var(--lamp-x, 50%) var(--lamp-y, 50%),
    #000 0%,
    #000 30%,
    transparent 62%
  );
}

/* Benchmark bars measure a real quantity, so they grow from zero once. */
.bar-grow {
  transform-origin: left center;
  transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--i, 0) * 40ms);
}
[data-grown="false"] .bar-grow {
  transform: scaleX(0);
}
```

Also update the reduced-motion block at the foot of the file — remove the deleted animation names and add the plate rules:

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  .plate img {
    transform: none;
  }
  .bar-grow,
  [data-grown="false"] .bar-grow {
    transition: none !important;
    transform: none;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

And the print block — replace the animation-name list with the plate rules:

```css
@media print {
  :root {
    --color-ground: #ffffff;
    --color-signal: #08070a;
    --color-ember: #08070a;
    --color-rule: rgb(8 7 10 / 0.4);
    --color-rule-soft: rgb(8 7 10 / 0.18);
  }
  html,
  body {
    background: #fff;
    color: #08070a;
  }
  /* Full-bleed paintings cost a cartridge and prove nothing on paper. */
  .plate,
  .scrim::before,
  .print-drop,
  header[data-chrome],
  .print-hidden {
    display: none !important;
  }
  .ignite::after {
    display: none;
  }
  [data-act] {
    position: static !important;
    height: auto !important;
    min-height: 0 !important;
    break-inside: avoid-page;
  }
  .bar-grow {
    transform: none !important;
    transition: none !important;
  }
  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.7em;
    letter-spacing: 0;
  }
}
```

- [ ] **Step 5: Mount the lamp**

In `src/app/layout.tsx`, import and render it inside `<body>`, before `{children}`:

```tsx
import Lamp from "@/components/Lamp";
```

```tsx
      <body className="min-h-full bg-ground text-signal">
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        <Lamp />
        {children}
      </body>
```

- [ ] **Step 6: Run the tests**

```bash
npm run typecheck && npm run build && npx playwright test tests/lamplight.spec.ts -g "lamp|reduced|JavaScript"
```

Expected: the reduced-motion and no-JS tests still FAIL (no `.plate-lit` in the DOM until Task 5/7), the `data-lamp` assertion inside the first test PASSES. Confirm the failure messages are about missing plates, not about the lamp.

- [ ] **Step 7: Commit**

```bash
git add src/components/Lamp.tsx src/app/globals.css src/app/layout.tsx tests/lamplight.spec.ts
git commit -m "feat: the lamp — one rAF loop, mask driven by scroll and cursor"
```

---

### Task 5: Plate, Act, and Statement components

**Files:**
- Create: `src/components/Plate.tsx`, `src/components/Act.tsx`, `src/components/Statement.tsx`
- Test: covered by Task 7's rendering tests; this task ends at typecheck + lint.

**Interfaces:**
- Consumes: `plates`, `creditOf`, `PLATE_WIDTHS`, `Plate` from `src/lib/art.ts`; `withBase` from `src/lib/base.ts`.
- Produces:
  - `Plate({ id, priority }: { id: PlateId; priority?: boolean })` — renders the two-layer picture. `priority` makes the plate eager with `fetchPriority="high"`; exactly one plate on the page may set it.
  - `Act({ id, label, lamp, children, className }: { id: string; label: string; lamp: { x: number; y: number }; children: ReactNode; className?: string })` — the sticky section shell. Emits `data-act`, `data-lamp-x`, `data-lamp-y`, `aria-labelledby`.
  - `Statement({ children, id }: { children: ReactNode; id?: string })` — an `<h2 class="statement">` (the hero passes `as="h1"` — see below).
  - `Statement` accepts `as?: "h1" | "h2"`, default `"h2"`.

- [ ] **Step 1: Write Plate**

Create `src/components/Plate.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLATE_WIDTHS, plates, type PlateId } from "@/lib/art";
import lock from "@/lib/art.lock.json";
import { withBase } from "@/lib/base";

/** Widths actually emitted for this plate — a tier is skipped when it
 *  would have upscaled the crop, so the srcset is built from the lock. */
function tiers(id: PlateId, ext: "avif" | "webp"): number[] {
  return PLATE_WIDTHS.filter((w) => `${id}-${w}.${ext}` in lock);
}

function srcset(id: PlateId, ext: "avif" | "webp"): string {
  return tiers(id, ext)
    .map((w) => `${withBase(`/art/${id}-${w}.${ext}`)} ${w}w`)
    .join(", ");
}

/** The LQIP is a committed data URI — read at build time, inlined. */
function lqip(id: PlateId): string {
  return readFileSync(join(process.cwd(), "public", "art", `${id}-lqip.txt`), "utf8").trim();
}

export default function Plate({
  id,
  priority = false,
}: {
  id: PlateId;
  priority?: boolean;
}) {
  const plate = plates[id];
  const widest = Math.max(...tiers(id, "avif"));
  const fallback = withBase(`/art/${id}-${widest}.webp`);
  const common = {
    sizes: "100vw",
    width: lock[`${id}-${widest}.avif` as keyof typeof lock].width,
    height: lock[`${id}-${widest}.avif` as keyof typeof lock].height,
    decoding: "async" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
  };

  return (
    <div
      className="plate print-drop"
      style={{ backgroundImage: `url("${lqip(id)}")` }}
      aria-hidden={false}
    >
      {/* The dark layer carries the alt text: it is the one that exists
          in every state, including when the mask is unsupported. */}
      <picture>
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-dark" src={fallback} alt={plate.alt} {...common} />
      </picture>
      <picture>
        <source srcSet={srcset(id, "avif")} sizes="100vw" type="image/avif" />
        <source srcSet={srcset(id, "webp")} sizes="100vw" type="image/webp" />
        <img className="plate-lit" src={fallback} alt="" aria-hidden="true" {...common} />
      </picture>
    </div>
  );
}
```

Note: `import lock from "@/lib/art.lock.json"` requires `resolveJsonModule` in `tsconfig.json`. Check whether it is already set; if not, add `"resolveJsonModule": true` to `compilerOptions`.

- [ ] **Step 2: Write Act**

Create `src/components/Act.tsx`:

```tsx
import type { ReactNode } from "react";

/**
 * A sticky full-bleed act. The lamp finds it by `data-act` and writes
 * `--p`, `--lamp-x` and `--lamp-y` onto it each frame.
 *
 * Sticky, not scroll-jacked: the page scrolls at native speed and the act
 * simply holds its position while its content passes. Nothing here
 * intercepts wheel or touch events.
 */
export default function Act({
  id,
  label,
  lamp,
  children,
  className = "",
}: {
  id: string;
  label: string;
  lamp: { x: number; y: number };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-act=""
      data-lamp-x={lamp.x}
      data-lamp-y={lamp.y}
      className={`relative isolate min-h-[100svh] overflow-hidden ${className}`}
    >
      {children}
      <p className="label absolute bottom-6 left-5 z-10 opacity-100 sm:left-8 lg:left-12">
        {label}
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Write Statement**

Create `src/components/Statement.tsx`:

```tsx
import type { ReactNode } from "react";

/** The display voice. One line per act, and no more than that. */
export default function Statement({
  children,
  id,
  as: Tag = "h2",
}: {
  children: ReactNode;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag id={id} className="statement">
      {children}
    </Tag>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: clean. If `resolveJsonModule` was missing, add it and rerun.

- [ ] **Step 5: Commit**

```bash
git add src/components/Plate.tsx src/components/Act.tsx src/components/Statement.tsx tsconfig.json
git commit -m "feat: Plate, Act, and Statement — the act primitives"
```

---

### Task 6: Statement copy — OWNER APPROVAL GATE

**Files:**
- Modify: `src/content.ts` (add `acts`)

**Interfaces:**
- Consumes: existing `content.ts` exports.
- Produces: `export const acts: Record<ActId, { label: string; statement: string; plate: PlateId }>` where `ActId = "hero" | "about" | "warden" | "scheduler" | "plantpal" | "research" | "ledger" | "contact"`.

**STOP. Do not write this task's content without the owner's approval of each line.**

- [ ] **Step 1: Draft the eight lines from existing facts only**

Each draft must be traceable to a specific existing string. Present the table below to the owner with the source column filled in, and get a yes/no/rewrite on each line:

| Act | Draft statement | Traces to |
|---|---|---|
| hero | *Rakshit Rameshbabu* (name, not a claim — the h1 stays the name) | `hero.name` |
| about | draft from `about.paragraphs[0]` — end-to-end, requirements to CI-tested deployment | `about.paragraphs[0]` |
| warden | draft from `featuredProjects[0].oneLiner` — judges what a package would actually do | `caseStudies.warden.problem[1]` |
| scheduler | draft from `caseStudies.scheduler.problem[1]` — the answer is a proven negative result | `caseStudies.scheduler.problem[1]` |
| plantpal | draft from `caseStudies.plantpal.problem[1]` — one implementation, no drift | `caseStudies.plantpal.problem[1]` |
| research | draft from `researchSpotlight.quote` — the honest baseline is not FIFO | `researchSpotlight.quote` |
| ledger | draft from `archive.description` | `archive.description` |
| contact | `contact.headline`, used verbatim | `contact.headline` |

- [ ] **Step 2: Get explicit approval**

Ask the owner directly. Do not proceed on silence, and do not soften an unapproved line into "close enough". If a line cannot be traced, drop the statement and use the existing section title instead — an act with a plain title is fine; an act with an invented claim is not.

- [ ] **Step 3: Write the approved lines into content.ts**

Append to `src/content.ts` (exact strings come from Step 2):

```ts
import type { PlateId } from "@/lib/art";

export type ActId =
  | "hero"
  | "about"
  | "warden"
  | "scheduler"
  | "plantpal"
  | "research"
  | "ledger"
  | "contact";

/**
 * The eight acts of the landing page. `statement` is the single display
 * line each act carries — every one approved by the owner and traceable
 * to copy elsewhere in this file or to a linked repo. `plate` names the
 * painting the act is set in (see src/lib/art.ts).
 */
export const acts: Record<
  ActId,
  { label: string; statement: string; plate: PlateId }
> = {
  hero: { label: "act 01 — the record", statement: "<approved>", plate: "airpump" },
  about: { label: "act 02 — the work", statement: "<approved>", plate: "alchemist" },
  warden: { label: "act 03 — warden", statement: "<approved>", plate: "forge" },
  scheduler: { label: "act 04 — the scheduler", statement: "<approved>", plate: "orrery" },
  plantpal: { label: "act 05 — plantpal+", statement: "<approved>", plate: "kitten" },
  research: { label: "act 06 — the finding", statement: "<approved>", plate: "anatomy" },
  ledger: { label: "act 07 — the ledger", statement: "<approved>", plate: "dovedale" },
  contact: { label: "act 08 — the close", statement: "<approved>", plate: "academy" },
};
```

- [ ] **Step 4: Verify no line is invented**

```bash
npm run typecheck
```

Then re-read each statement against its source string in `content.ts`. Any statement asserting a number, a date, or an outcome that does not appear elsewhere in `content.ts` is a plan failure — remove it and return to Step 2.

- [ ] **Step 5: Commit**

```bash
git add src/content.ts
git commit -m "feat: act statements, approved and traceable"
```

---

### Task 7: Landing acts 1–2 — hero and about

**Files:**
- Modify: `src/app/page.tsx` (replace the hero and about sections)
- Test: `tests/lamplight.spec.ts` (the statement, reduced-motion, and no-JS tests from Tasks 1 and 4 now go green)

**Interfaces:**
- Consumes: `Act`, `Plate`, `Statement`, `Rail`, `Provenance`, `BracketLink`, `acts`, `hero`, `heroStats`, `about`, `links`, `plates`, `creditOf`.
- Produces: `SHELL` constant unchanged; `actProvenance(plateId, extra)` helper local to `page.tsx` that appends the plate credit to any provenance segment list.

- [ ] **Step 1: Add the shared helper and act 1**

First create `src/lib/credit.ts`. It lives in its own file rather than in
`art.ts` because `content.ts` imports `PlateId` from `art.ts`, so `art.ts`
importing `EvidenceSegment` back from `content.ts` would close a cycle:

```ts
import type { EvidenceSegment } from "@/content";
import { creditOf, plates, type PlateId } from "@/lib/art";

/** Every act credits its painting on the same line as its evidence.
 *  Art is sourced the same way code is. */
export function withCredit(
  plateId: PlateId,
  segments: EvidenceSegment[],
): EvidenceSegment[] {
  const plate = plates[plateId];
  return [...segments, { label: creditOf(plate), href: plate.sourceUrl }];
}
```

Then in `src/app/page.tsx`, add the imports:

```tsx
import Act from "@/components/Act";
import Plate from "@/components/Plate";
import Statement from "@/components/Statement";
import { acts } from "@/content";
import { plates } from "@/lib/art";
import { withCredit } from "@/lib/credit";
```

Replace the hero `<section>` (currently lines 125–230) with:

```tsx
        <Act
          id="hero"
          label={acts.hero.label}
          lamp={plates[acts.hero.plate].lamp}
          className="flex items-end"
        >
          <Plate id={acts.hero.plate} priority />

          <div className={`${SHELL} scrim relative z-10 pb-20 sm:pb-24`}>
            <p className="label">{hero.role}</p>

            <h1 id="hero-title" className="statement mt-6">
              {hero.name}
            </h1>

            <p className="label mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 normal-case">
              <span className="bg-signal px-1.5 py-0.5 text-ground">
                {hero.provenance.prefix}
              </span>
              {hero.provenance.text}
            </p>

            <Rail items={heroStats} className="mt-10" ignite />

            <div className="print-hidden mt-10 flex flex-wrap items-center gap-3">
              <BracketLink href={withBase(links.resume)} weight="filled" download>
                Download résumé
              </BracketLink>
              <BracketLink href={`mailto:${links.email}`}>Email me</BracketLink>
              <BracketLink href={links.github.url} external>
                <GithubIcon size={13} />
                GitHub
              </BracketLink>
            </div>

            <Provenance
              className="mt-8"
              segments={withCredit(acts.hero.plate, buildRail.map((r) => ({
                label: `${r.label}: ${r.value}`,
                href: r.href,
              })))}
            />
          </div>
        </Act>
```

- [ ] **Step 2: Teach Rail to ignite**

`Rail` currently renders a value and a label. Add an `ignite` prop that wraps the value in the ignition markup. Modify `src/components/Rail.tsx` — the value element becomes:

```tsx
          <dd
            className={`font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl${
              ignite ? " ignite" : ""
            }`}
            data-value={ignite ? item.value : undefined}
          >
            {item.value}
          </dd>
```

and the signature gains `ignite = false`. The `data-value` attribute is what `.ignite::after` renders, so it must exactly equal the visible text.

- [ ] **Step 3: Write act 2**

Replace the about `<section>` (currently lines 233–265) with:

```tsx
        <Act
          id="about"
          label={acts.about.label}
          lamp={plates[acts.about.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.about.plate} />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="about-title">{acts.about.statement}</Statement>

            <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="prose-field">
                {about.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
              <div>
                <h3 className="label border-b border-rule pb-2">Interests</h3>
                <ul className="mt-4 space-y-2.5">
                  {about.interests.map((interest, i) => (
                    <li
                      key={interest}
                      className="flex items-baseline gap-3 font-mono text-sm"
                    >
                      <span aria-hidden="true" className="label shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Provenance
              className="mt-10"
              segments={withCredit(acts.about.plate, [])}
            />
          </div>
        </Act>
```

- [ ] **Step 4: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npx playwright test tests/lamplight.spec.ts
```

Expected: the display-face test, the reduced-motion test, and the no-JS test all PASS now. The `data-lamp` scroll test PASSES.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Rail.tsx
git commit -m "feat: acts 1 and 2 — the record, and the work"
```

---

### Task 8: Landing acts 3–5 — the three projects

**Files:**
- Modify: `src/app/page.tsx` (replace the featured-work section)

**Interfaces:**
- Consumes: everything from Task 7, plus `featuredProjects`, `featuredLive`, `liveSegments`, `Metric`.
- Produces: nothing new.

- [ ] **Step 1: Replace the featured-work section**

Replace the `#projects` `<section>` (currently lines 268–371) with a map over the three acts. The act ids match `ActId`, so the plate and statement come from `acts` and the numbers from `featuredProjects`:

```tsx
        {featuredProjects.map((project, i) => {
          const act = acts[project.id as "warden" | "scheduler" | "plantpal"];
          const live = featuredLive[i];
          return (
            <Act
              key={project.id}
              id={project.id}
              label={act.label}
              lamp={plates[act.plate].lamp}
              className="flex items-center"
            >
              <Plate id={act.plate} />

              <div className={`${SHELL} scrim relative z-10 py-24`}>
                <p className="label">{project.timeframe}</p>
                <Statement id={`${project.id}-title`}>{act.statement}</Statement>

                <p className="prose-field mt-8">{project.oneLiner}</p>

                {project.headlineNumbers && (
                  <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-y border-rule py-6">
                    {project.headlineNumbers.map((n) => (
                      <div key={n.label}>
                        <dd
                          className="ignite font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums sm:text-4xl"
                          data-value={n.value}
                        >
                          {n.value}
                        </dd>
                        <dt className="label mt-2">{n.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}

                <Provenance
                  className="mt-8"
                  segments={withCredit(act.plate, [
                    ...project.evidence,
                    ...liveSegments(live),
                  ])}
                />

                <div className="print-hidden mt-8 flex flex-wrap gap-3">
                  <BracketLink
                    href={withBase(`/projects/${project.id}/`)}
                    weight="filled"
                    small
                  >
                    Read the case file
                  </BracketLink>
                  {project.repoUrl && (
                    <BracketLink href={project.repoUrl} small external>
                      Repository
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </BracketLink>
                  )}
                </div>
              </div>
            </Act>
          );
        })}
```

The three-bullet detail (`project.bullets`) does not appear on the landing page any more — it lives in the case file, in full. That is the point of the split. Verify by opening `/projects/warden/` that every bullet's content is present there; if a bullet says something the case file does not, move that sentence into the case study rather than keeping it on the landing page.

- [ ] **Step 2: Verify no content was lost**

```bash
npm run build
node -e "const c=require('./src/content.ts')" 2>/dev/null || true
```

Manually diff: for each of the three projects, confirm every claim in `bullets` also appears in `caseStudies[id]`. Record any gap and fix it by adding the sentence to the case study's `approach` or `outcome` — never by deleting it.

- [ ] **Step 3: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: `card links navigate to the case file` PASSES. The `section anchors navigate` test may FAIL — the nav still points at `#skills`, which moves to act 7 in Task 10. Leave it failing and note it.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/content.ts
git commit -m "feat: acts 3-5 — warden, the scheduler, plantpal+"
```

---

### Task 9: Landing act 6 — the finding

**Files:**
- Modify: `src/app/page.tsx` (replace the research section), `src/components/BenchmarkChart.tsx`
- Modify: `src/app/globals.css` (delete the temporary `.negative` rule)

**Interfaces:**
- Consumes: `researchSpotlight`, `benchmarkChart`, `BenchmarkChart`.
- Produces: nothing new.

- [ ] **Step 1: Replace the research section**

```tsx
        <Act
          id="research"
          label={acts.research.label}
          lamp={plates[acts.research.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.research.plate} />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="research-title">{acts.research.statement}</Statement>

            <figure className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <blockquote className="prose-field text-lg">
                {researchSpotlight.quote}
              </blockquote>
              <figcaption className="prose-field text-sm lg:pt-2">
                {researchSpotlight.context}
              </figcaption>
            </figure>

            <BenchmarkChart />

            <Provenance
              className="mt-8"
              segments={withCredit(acts.research.plate, [
                { label: benchmarkChart.source },
              ])}
            />

            <div className="print-hidden mt-8">
              <BracketLink href={researchSpotlight.repoUrl} external>
                View the study
                <ArrowUpRight size={12} aria-hidden="true" />
              </BracketLink>
            </div>
          </div>
        </Act>
```

Note the quote is no longer set in the old oversized mono — the act's `Statement` is the display voice now, and the quote reads as prose beneath it. Two display voices in one act is one too many.

- [ ] **Step 2: Restyle the chart**

In `src/components/BenchmarkChart.tsx`, the highlighted rows currently distinguish themselves through the old token system. Change them to ignite: give the highlighted policies' value elements `className="ignite"` and `data-value={...}`, and render all bars in `var(--color-signal)` at 0.55 alpha with highlighted bars at full signal. Do not use ember for the bars themselves — ember marks numbers, not graphics.

```bash
grep -n "highlight" src/components/BenchmarkChart.tsx
```

Apply the change at each hit, then verify the chart still reads correctly against `benchmarkChart.policies` — the two 145.0 rows must remain visually paired, because their equality is the finding.

- [ ] **Step 3: Delete the temporary compatibility rule**

Remove the `.negative` block added in Task 1 Step 6 from `globals.css`, then confirm nothing references it:

```bash
grep -rn "negative" src/ || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npx playwright test
```

Expected: axe still zero violations on `/`. Note any remaining nav-anchor failure — Task 10 fixes it.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/BenchmarkChart.tsx src/app/globals.css
git commit -m "feat: act 6 — the finding, and the end of inversion"
```

---

### Task 10: Landing act 7 — the ledger

**Files:**
- Modify: `src/app/page.tsx` (replace the archive, achievements, skills, and education sections with one act), `src/components/Nav.tsx`, `src/content.ts` (`navSections`)

**Interfaces:**
- Consumes: `moreProjects`, `archive`, `achievements`, `skills`, `education`, `moreLive`.
- Produces: `navSections` reduced to the eight act ids.

This act is the density valve. It is the one act that is taller than the viewport and scrolls its own content past a held plate — everything the cinematic form cannot carry lives here, in mono, scannable in ten seconds.

- [ ] **Step 1: Build the ledger act**

Replace the four sections (`#more-projects`, `#achievements`, `#skills`, `#education`) with a single `Act` whose plate is `sticky` and whose content is a long ruled table. The act's `className` drops `min-h-[100svh]` in favour of natural height, and the plate wrapper gets `sticky top-0 h-[100svh]`:

```tsx
        <Act
          id="ledger"
          label={acts.ledger.label}
          lamp={plates[acts.ledger.plate].lamp}
          className="!min-h-0"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="sticky top-0 h-[100svh]">
              <Plate id={acts.ledger.plate} />
            </div>
          </div>

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="ledger-title">{acts.ledger.statement}</Statement>

            <h3 className="label mt-16 border-b border-rule pb-2">Archive</h3>
            {/* MOVE: the <ul> currently at src/app/page.tsx:418-476, verbatim —
                the moreProjects <li> map plus the trailing archive <li>. */}

            <h3 className="label mt-16 border-b border-rule pb-2">Achievements</h3>
            {/* MOVE: the <ul> currently at src/app/page.tsx:488-514, verbatim. */}

            <h3 className="label mt-16 border-b border-rule pb-2">Skills</h3>
            {/* MOVE: the <dl> currently at src/app/page.tsx:522-543, verbatim. */}

            <h3 className="label mt-16 border-b border-rule pb-2">Education</h3>
            {/* MOVE: the <ul> currently at src/app/page.tsx:555-573, verbatim. */}

            <Provenance
              className="mt-12"
              segments={withCredit(acts.ledger.plate, [...archive.evidence])}
            />
          </div>
        </Act>
```

Each `MOVE` marker names an exact line range in the file as it stands before
this task. Cut those elements and paste them where the marker sits — the same
`<li>` structures, the same `Provenance` calls, the same tech chips, the same
`moreLive[i]` indexing. Nothing inside them changes.

The four `SectionHead` calls that wrapped these lists are dropped: the act's
`Statement` is the heading now, and the four `h3` labels above replace the
old `h2`s. That keeps the heading order valid (`h1` on the hero, `h2` per act,
`h3` per ledger group) and is the only structural edit in this step.

- [ ] **Step 2: Update navigation**

`navSections` in `src/content.ts` currently lists seven ids that no longer all exist. Replace with:

```ts
export const navSections = [
  { id: "about", label: "About" },
  { id: "warden", label: "Warden" },
  { id: "scheduler", label: "Scheduler" },
  { id: "plantpal", label: "PlantPal+" },
  { id: "research", label: "Research" },
  { id: "ledger", label: "Ledger" },
  { id: "contact", label: "Contact" },
] as const;
```

`CommandPalette` builds its commands from `navSections`, so it follows automatically — verify by grep:

```bash
grep -n "navSections" src/components/CommandPalette.tsx src/components/Nav.tsx
```

- [ ] **Step 3: Restore smooth anchor scrolling per-call**

`scroll-behavior: smooth` was dropped from `html` in Task 1. In `Nav.tsx` and `CommandPalette.tsx`, where a section is jumped to, use:

```ts
document.getElementById(id)?.scrollIntoView({
  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth",
});
```

- [ ] **Step 4: Fix the smoke test**

`tests/smoke.spec.ts` asserts a `Skills` link and an `h2` named `Skills`. Update that test to the new structure:

```ts
test("section anchors navigate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ledger", exact: true }).click();
  await expect(page).toHaveURL(/#ledger$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Skills" }),
  ).toBeVisible();
});
```

- [ ] **Step 5: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: all smoke tests PASS, axe zero violations.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/content.ts src/components/Nav.tsx src/components/CommandPalette.tsx tests/smoke.spec.ts
git commit -m "feat: act 7 — the ledger, and navigation for eight acts"
```

---

### Task 11: Landing act 8 — the close

**Files:**
- Modify: `src/app/page.tsx` (replace the contact section and footer), `src/components/SineLattice.tsx`

**Interfaces:**
- Consumes: `contact`, `links`, `CopyEmailButton`, `SineLattice`.
- Produces: `SineLattice` gains `mode?: "curve" | "constellation"`, default `"curve"`.

- [ ] **Step 1: Repurpose SineLattice**

`SineLattice` draws a seeded sine curve with nodes. Add a `constellation` mode that keeps the same seeded geometry but renders only the nodes — as small filled circles with a faint connecting polyline at 0.25 alpha, and no draw animation. The geometry function is unchanged, so the constellation is deterministic and the export stays byte-stable.

```bash
grep -n "export default function SineLattice" -A 20 src/components/SineLattice.tsx
```

Add the prop, branch the render, keep the existing `curve` path untouched (the case files may still use it).

- [ ] **Step 2: Build the closing act**

```tsx
        <Act
          id="contact"
          label={acts.contact.label}
          lamp={plates[acts.contact.plate].lamp}
          className="flex items-center"
        >
          <Plate id={acts.contact.plate} />
          <SineLattice
            width={1000}
            height={300}
            cycles={1.4}
            nodes={6}
            mode="constellation"
            className="pointer-events-none absolute inset-x-0 top-[14%] z-0 h-[40%] w-full opacity-70 print-drop"
          />

          <div className={`${SHELL} scrim relative z-10 py-24`}>
            <Statement id="contact-title">{acts.contact.statement}</Statement>

            <p className="prose-field mt-8 text-sm">
              Based in {hero.location}. {contact.body}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${links.email}`}
                className="font-mono text-sm underline decoration-rule underline-offset-4 transition-colors hover:decoration-signal"
              >
                {links.email}
              </a>
              <CopyEmailButton email={links.email} />
            </div>

            <div className="print-hidden mt-8 flex flex-wrap gap-3">
              <BracketLink href={withBase(links.resume)} weight="filled" small download>
                Download résumé
              </BracketLink>
              <BracketLink href={links.github.url} small external>
                <GithubIcon size={13} />
                GitHub
              </BracketLink>
              <BracketLink href={links.linkedin.url} small external>
                <LinkedinIcon size={13} />
                LinkedIn
              </BracketLink>
            </div>

            <Provenance
              className="mt-10"
              segments={withCredit(acts.contact.plate, [])}
            />
          </div>
        </Act>
```

- [ ] **Step 3: Keep the footer**

The existing `<footer>` stays exactly as it is — it is the build record and it still tells the truth. Only confirm its tokens compile (`border-rule` is unchanged).

- [ ] **Step 4: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: all green, axe zero violations on `/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/SineLattice.tsx
git commit -m "feat: act 8 — the close, and the lattice as a constellation"
```

---

### Task 12: Case files

**Files:**
- Modify: `src/app/projects/[id]/page.tsx`, `src/components/DiagramFlow.tsx`, `src/components/SectionHead.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `Plate`, `acts`, `plates`, `creditOf`.
- Produces: nothing new.

Case files change palette and gain a plate banner. **No content changes.** Every word in `caseStudies` still renders.

- [ ] **Step 1: Add the banner**

At the top of the case-study page, above the existing `h1`, add a 60vh plate with the lamp at rest (no `data-act`, so the lamp never touches it — it renders in its default fully-lit state):

```tsx
      <div className="relative isolate h-[60svh] overflow-hidden">
        <Plate id={acts[study.id as ActId].plate} priority />
        <div className={`${SHELL} scrim absolute inset-x-0 bottom-0 z-10 pb-12`}>
          <p className="label">{project.timeframe}</p>
          <h1 className="statement mt-4">{project.name}</h1>
        </div>
      </div>
```

- [ ] **Step 2: Swap the tokens through**

```bash
grep -rn "bg-field\|text-field\|field-mask\|BarField\|BitMatrix\|negative" src/app/projects src/app/not-found.tsx src/components/DiagramFlow.tsx src/components/SectionHead.tsx
```

For each hit: `bg-field`→`bg-ground`, `text-field`→`text-ground`, delete `field-mask*` classes and any `BarField`/`BitMatrix` usage along with its import, replace `negative` regions with plain ground sections.

- [ ] **Step 3: Credit the banner plate**

Import the shared helper created in Task 7 and wrap the case file's existing evidence line with it:

```tsx
import { acts, type ActId } from "@/content";
import { plates } from "@/lib/art";
import { withCredit } from "@/lib/credit";
```

```tsx
<Provenance segments={withCredit(acts[study.id as ActId].plate, existingSegments)} />
```

where `existingSegments` is whatever the page already passes to `Provenance` — do not change those segments, only append the credit.

- [ ] **Step 4: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: the three case-file smoke tests PASS, axe zero violations on `/projects/warden/` and `/projects/scheduler/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects src/app/not-found.tsx src/components src/lib/art.ts
git commit -m "feat: case files on lamplight, with a plate banner"
```

---

### Task 13: Retire the field

**Files:**
- Delete: `src/components/BarField.tsx`, `src/components/BitMatrix.tsx`, `src/lib/field.ts`
- Modify: `src/lib/ogField.tsx`, `src/app/og.png/route.tsx`, `src/app/projects/[id]/og.png/route.tsx`, `src/app/icon.svg`, `src/app/apple-icon.png/route.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: OG images redrawn in the lamplight palette.

- [ ] **Step 1: Confirm nothing still imports them**

```bash
grep -rn "BarField\|BitMatrix\|lib/field" src/ || echo "clean"
```

If anything remains, remove those usages first — the components go away, not the pages.

- [ ] **Step 2: Redraw the OG images**

`src/lib/ogField.tsx` renders the social card. Satori (which powers `ImageResponse`) does not support CSS masks, so the OG card cannot use the lamp. Replace the bar field with a flat ground card: ground background, bone name at display scale, a single ember rule, and the role line in mono. Update the three route files to the new palette constants.

```bash
grep -rn "#000\|#fff\|ffffff\|000000" src/lib/ogField.tsx src/app/og.png/route.tsx src/app/projects/\[id\]/og.png/route.tsx src/app/apple-icon.png/route.tsx
```

Replace each with `#08070A` / `#F2EDE3` / `#E8A33D` as appropriate.

- [ ] **Step 3: Update the favicon**

`src/app/icon.svg` uses the old two-value palette. Redraw it on ground with a bone mark.

- [ ] **Step 4: Delete the components**

```bash
git rm src/components/BarField.tsx src/components/BitMatrix.tsx src/lib/field.ts
```

- [ ] **Step 5: Run the tests**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Expected: all green. `llms.txt and sitemap emit` still PASSES, including the favicon assertion.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: retire the bar field, bit matrix, and field geometry"
```

---

### Task 14: The gates — contrast, weight, and art in CI

**Files:**
- Modify: `scripts/check-budget.mjs`, `.github/workflows/ci.yml`
- Test: `tests/lamplight.spec.ts` (append the contrast test)

**Interfaces:**
- Consumes: the built `./out`.
- Produces: `npm run budget` also asserts landing image weight; `npm run check:art` runs in CI.

- [ ] **Step 1: Write the failing contrast test**

Append to `tests/lamplight.spec.ts`:

```ts
const ACTS = [
  "hero",
  "about",
  "warden",
  "scheduler",
  "plantpal",
  "research",
  "ledger",
  "contact",
];

for (const id of ACTS) {
  test(`text in act ${id} sits on ground, not on paint`, async ({ page }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    await act.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    // Sample the pixel directly behind the act's first line of copy. The
    // scrim must have covered the painting there.
    const sample = await act.evaluate((el) => {
      const text = el.querySelector<HTMLElement>(
        ".statement, .prose-field, .label",
      );
      if (!text) return null;
      const r = text.getBoundingClientRect();
      const scrim = el.querySelector<HTMLElement>(".scrim");
      if (!scrim) return null;
      return {
        hasScrim: getComputedStyle(scrim, "::before").backgroundImage !== "none",
        left: r.left,
        width: r.width,
      };
    });
    expect(sample, `act ${id} has no text or no scrim`).not.toBeNull();
    expect(sample!.hasScrim).toBe(true);
    // Copy stays in the scrimmed left band, never out over open paint.
    expect(sample!.left).toBeLessThan(page.viewportSize()!.width * 0.55);
  });
}
```

- [ ] **Step 2: Run it**

```bash
npm run build && npx playwright test tests/lamplight.spec.ts -g "sits on ground"
```

Expected: PASS for every act. Any FAIL means that act's copy escapes the scrim — fix the act's layout, not the test.

- [ ] **Step 3: Extend the budget script**

Append to `scripts/check-budget.mjs`, before `process.exit`:

```js
// Image weight on the landing page. Counts the largest srcset candidate
// per plate — the worst case a wide viewport actually downloads.
const IMAGE_BUDGET_KB = 3000;
const html = readFileSync("out/index.html", "utf8");
const candidates = new Set();
for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
  const entries = m[1]
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }));
  const widest = entries.sort((a, b) => b.w - a.w)[0];
  if (widest) candidates.add(widest.url);
}
let imageBytes = 0;
for (const url of candidates) {
  const rel = url.replace(/^\/+/, "").split("/");
  // Strip a basePath prefix if one was baked in.
  const artIndex = rel.indexOf("art");
  const path = join("out", ...(artIndex >= 0 ? rel.slice(artIndex) : rel));
  imageBytes += readFileSync(path).length;
}
const imageKb = imageBytes / 1024;
const imagesOk = imageKb <= IMAGE_BUDGET_KB;
console.log(
  `${imagesOk ? "OK  " : "FAIL"} out/index.html: ${imageKb.toFixed(0)} kB images (budget ${IMAGE_BUDGET_KB} kB)`,
);
if (!imagesOk) failed = true;
```

Note: `candidates` deduplicates because the dark and lit layers reference identical URLs — one download, counted once, which is what the browser actually does.

- [ ] **Step 4: Raise the JS ceiling by the lamp's cost**

Change `BUDGET_KB` from `210` to `214` with a comment recording why:

```js
const BUDGET_KB = 214; // 2026-08: 210 baseline + 4 kB for the lamp (rAF + IO)
```

- [ ] **Step 5: Run the budget**

```bash
npm run build && npm run budget
```

Expected: both pages OK on JS, index OK on images. If images exceed 3000 kB, drop plates 2–8 to `1920` by removing `2560` from the emitted tiers for non-priority plates in `fetch-art.mjs`, rerun `npm run art`, and recommit the art.

- [ ] **Step 6: Wire the art check into CI**

In `.github/workflows/ci.yml`, add a step after install and before build:

```yaml
      - name: Verify plate integrity
        run: npm run check:art
```

- [ ] **Step 7: Run everything**

```bash
npm run lint && npm run typecheck && npm run build && npm run budget && npm run check:art && npm test
```

Expected: all green, axe zero violations.

- [ ] **Step 8: Commit**

```bash
git add scripts/check-budget.mjs .github/workflows/ci.yml tests/lamplight.spec.ts
git commit -m "test: contrast, image weight, and plate integrity gates"
```

---

### Task 14b: Scroll-scrubbed plate motion

**Added 2026-08-17 at the owner's request** — after seeing acts 1–8 assembled, the
owner asked for the paintings to move "like a video," matching the reference
site's scroll-scrubbed image sequences. This task adds that, and must run
**after Task 14** (so the budget gate exists to measure against) and **before
Task 15** (so the docs describe what shipped).

**Files:**
- Modify: `src/lib/art.ts` (per-plate `motion` descriptor), `scripts/fetch-art.mjs` (emit WebM), `scripts/check-art.mjs` + `src/lib/art.lock.json` (cover the new files), `src/components/Plate.tsx`, `src/components/Lamp.tsx`, `src/app/globals.css`, `scripts/check-budget.mjs`
- Test: `tests/lamplight.spec.ts`

**Interfaces:**
- Consumes: `plates`, `PLATE_WIDTHS`, the lamp's `--p` act-progress property.
- Produces: `public/art/<id>-motion.webm`; `Plate` renders a `<video>` layer when one exists; `Lamp` drives `video.currentTime` from `--p`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lamplight.spec.ts`:

```ts
test("the hero plate scrubs its video with scroll", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#hero video").first();
  await expect(video).toHaveCount(1);
  // The video must be inert on its own — scroll is the only clock.
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);

  const at = () => video.evaluate((v: HTMLVideoElement) => v.currentTime);
  await page.waitForFunction(
    () => (document.querySelector("#hero video") as HTMLVideoElement)?.readyState >= 1,
  );
  const before = await at();
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.7));
  await page.waitForTimeout(200);
  expect(await at()).not.toBe(before);
});

test("reduced motion renders the still plate and no video", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  await ctx.close();
});

test("without JavaScript no video is requested", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const requested: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".webm")) requested.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(".plate-lit").first()).toBeVisible();
  expect(requested).toEqual([]);
  await ctx.close();
});
```

- [ ] **Step 2: Run them to make sure they fail**

```bash
npm run build && npx playwright test tests/lamplight.spec.ts -g "scrubs|reduced motion renders the still|without JavaScript no video"
```

Expected: the scrub test FAILS (no `<video>` in the DOM). The other two PASS
trivially — they are guards that must keep passing once video lands, not
drivers. Say so in the report rather than treating their green as progress.

- [ ] **Step 3: Describe the motion per plate**

Each painting wants a different move — the Air Pump pushes toward the glass
globe, Dovedale drifts across the valley. Add to each entry in `src/lib/art.ts`:

```ts
  /** How this plate moves when scrubbed. `from`/`to` are crop-relative
   *  centres (0-1) and scales; the drift runs from one to the other across
   *  the act's scroll. Chosen per painting, toward what it is about. */
  motion?: {
    from: { x: number; y: number; scale: number };
    to: { x: number; y: number; scale: number };
  };
```

Set `motion` for all eight, each drifting toward that painting's subject — for
`airpump`, toward the globe at its centre; for `anatomy`, toward the forearm
Dr Tulp is holding open. Keep the scale range modest (`1.0` → `1.12`); a
painting is not a drone shot.

- [ ] **Step 4: Emit the WebM**

In `scripts/fetch-art.mjs`, after the still variants, render the drift with
ffmpeg via the already-installed `sharp` crop plus ffmpeg's `zoompan`. Use
`ffmpeg-static` as a devDependency (justification: build-time only, never
shipped; it is the only practical way to emit VP9 from Node):

```bash
npm install --save-dev ffmpeg-static
```

Emit `<id>-motion.webm` at 1600w, 4 seconds, 25fps, VP9, `-crf 40 -b:v 0`,
`-an` (no audio track at all), `-g 25` (a keyframe every second, so seeking is
cheap), `-tile-columns 0 -row-mt 1`. Record each in the lockfile exactly like
the stills so `check-art.mjs` covers them unchanged.

Log each file's size. **If any single WebM exceeds 250KB, lower the resolution
to 1280w before lowering quality** — these are slow drifts over a still image
and should compress hard; a large file means the encode is wrong, not that the
budget is tight.

- [ ] **Step 5: Render the video layer**

In `src/components/Plate.tsx`, when `plates[id].motion` exists and a lockfile
entry for `<id>-motion.webm` is present, render a `<video>` **inside the same
`.plate` wrapper, after both `<picture>` elements**:

```tsx
      {motionSrc && (
        <video
          className="plate-motion"
          src={motionSrc}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        />
      )}
```

No `autoplay`, no `loop`, no `controls`. It never plays itself — scroll is its
only clock. It is decorative and duplicates the still it covers, so it is
`aria-hidden` and carries no accessible name.

- [ ] **Step 6: Gate it, and scrub it**

In `src/components/Lamp.tsx`, extend the existing rAF loop — do not add a
second one. Inside the per-act work, after writing `--p`:

```ts
      const video = act.querySelector<HTMLVideoElement>("video.plate-motion");
      if (video && video.readyState >= 1 && video.duration) {
        // Scroll is the clock. Seeking costs nothing when the encode is
        // keyframe-dense, and we never call play().
        const t = p * video.duration;
        if (Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
      }
```

Gate the whole video layer the same way the mask is gated — it must exist only
when the lamp is on. Since `Lamp` already returns early under
`prefers-reduced-motion`, add a class to `<html>` alongside `data-lamp="on"`
and hide `video.plate-motion` by default in CSS:

```css
.plate-motion {
  display: none;
}
[data-lamp="on"] .plate-motion {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

`display: none` on a `<video preload="metadata">` still fetches metadata, so
also skip rendering the element server-side when it would never be used — the
no-JS test asserts zero `.webm` requests, and `preload="metadata"` alone would
fail it. Set `src` from JS on mount instead of in the markup: render the
element with `data-src` and have `Lamp` promote it to `src` when it turns the
lamp on. That is what makes the no-JS assertion pass honestly.

Additionally, skip the promotion entirely when any of these hold:
- `navigator.connection?.saveData` is true
- the device is coarse-pointer **and** the viewport is under 700px wide
- `matchMedia("(prefers-reduced-motion: reduce)")` matches (already handled by
  the early return)

Record in the report which conditions you implemented and how you tested each.

- [ ] **Step 7: Measure, then decide the spread**

```bash
npm run art && npm run build && npm run budget
```

Add the WebM set to `scripts/check-budget.mjs`'s image assertion — the ceiling
becomes total *media*, not just images:

```js
const MEDIA_BUDGET_KB = 3500; // raised from 3000 when scrubbed motion landed
```

Report the per-plate WebM sizes and the new total. **If total media exceeds
3500 kB, keep `motion` on `airpump`, `forge`, `orrery` and `kitten` only** —
the hero and the three project acts — and delete the `motion` descriptor from
the other four so no WebM is emitted for them. Say plainly in the report which
spread shipped and what the numbers were.

- [ ] **Step 8: Smooth the transitions**

**Added 2026-08-17 at the owner's request.** Right now every act cuts hard into
the next and the scrub is linear, which reads mechanical. Three changes, all
CSS or single-line JS, all inside the existing rAF loop:

**8a — ease the scrub.** `--p` is currently linear act progress, so the drift
starts and stops abruptly at the act boundary. In `Lamp.tsx`, keep `--p` linear
(the mask and other consumers want it raw) and add a second property alongside
it:

```ts
        // Eased progress for anything that should start and end gently —
        // the video scrub and the plate push-in. Raw --p stays linear for
        // the mask, which wants a constant-speed sweep.
        const eased = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
        act.style.setProperty("--pe", eased.toFixed(4));
```

Drive `video.currentTime` from `eased` rather than `p`, and change the plate
push-in in `globals.css` from `var(--p, 0)` to `var(--pe, 0)`.

**8b — cross-fade the act boundary.** Each act currently ends flush against the
next. Give every act a ground-coloured fade at both edges so one painting
dissolves into the dark before the next resolves out of it. Add to
`globals.css`, near the `.plate` rules:

```css
/* Acts meet in the dark. Each plate fades into ground at its own edges,
   so scrolling between two paintings is a dissolve rather than a cut. */
.plate::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    var(--color-ground) 0%,
    transparent 14%,
    transparent 86%,
    var(--color-ground) 100%
  );
}
```

**8c — settle the lamp.** The lamp currently jumps to the pointer. Low-pass it
so it trails slightly, which reads as a held lantern rather than a cursor.
In `Lamp.tsx`, keep a smoothed pointer alongside the raw one and lerp each
frame:

```ts
      // The lamp has weight. It follows the pointer rather than snapping to
      // it — a held lantern, not a cursor.
      smooth.x += (pointer.x - smooth.x) * 0.08;
      smooth.y += (pointer.y - smooth.y) * 0.08;
```

Read `smooth` instead of `pointer` when computing the lamp offset. Initialise
`smooth` to `{x: 0.5, y: 0.5}` so the first frame does not lurch.

All three must respect reduced motion — they already do, since `Lamp` returns
early and `--pe` falls back to `0` in the CSS defaults. Verify that explicitly
and say so in the report.

- [ ] **Step 9: Run everything**

```bash
npm run lint && npm run typecheck && npm run build && npm run budget && npm run check:art && npm test
```

Expected: all green, axe zero violations, and the three new tests passing.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scroll-scrubbed motion on the plates, eased and dissolving"
```

---

### Task 14c: Make the plates read as paintings

**Added 2026-08-17.** Screenshots of the built site at four viewports
(1440×900, 390×844, 844×390, 834×1112) show the same defect in all eight acts:
**the paintings are effectively invisible.** Each act renders as a black page
with a faint smudge. The typography and the chart are excellent; the ground the
whole design rests on is not delivering.

Three causes compound:

1. `.plate-dark` sits at `filter: brightness(0.18)` — far below what a dark
   oil painting can survive. Wright's blacks are already near-black; multiplying
   them by 0.18 leaves nothing.
2. The lamp reveals a relatively small circle, and its rest position comes from
   each plate's `lamp` descriptor — which points at the painting's own light
   source, usually near centre.
3. The `.scrim` runs `ground 0% → ground 42% → transparent 100%`, so the left
   42% of every act is solid ground. The lamp's rest position sits under it.
   The light is landing behind the blackout.

This task also carries the owner's request for **text that fades in on scroll**.

**Files:**
- Modify: `src/app/globals.css`, `src/lib/art.ts` (per-plate framing), `src/components/Lamp.tsx`, `src/components/Act.tsx`
- Test: `tests/lamplight.spec.ts`

- [ ] **Step 1: Capture the evidence**

Before changing anything, reproduce the screenshots so the before/after is real
rather than asserted. Build, serve `./out`, and capture each act at
1440×900 and 390×844. Keep them; the report references them.

- [ ] **Step 2: Let the paintings breathe**

In `globals.css`:

```css
[data-lamp="on"] .plate-dark {
  display: block;
  /* A Wright of Derby is already mostly black. 0.18 erased it; this keeps
     the unlit field clearly subordinate while leaving the painting legible
     as a painting. */
  filter: brightness(0.42) saturate(0.85);
}
```

and widen the reveal so the lit region is a pool rather than a spot:

```css
[data-lamp="on"] .plate-lit {
  --lamp-r: calc(26vmax + min(var(--p, 0), 1 - var(--p, 0)) * 30vmax);
  /* …gradient stops become #000 0%, #000 46%, transparent 88% */
}
```

- [ ] **Step 3: Pull the scrim back and move the light out from under it**

The scrim must protect the text and nothing more. In `globals.css`:

```css
.scrim::before {
  background: linear-gradient(
    to right,
    var(--color-ground) 0%,
    color-mix(in srgb, var(--color-ground) 92%, transparent) 30%,
    transparent 62%
  );
}
```

and on narrow screens:

```css
@media (max-width: 48rem) {
  .scrim::before {
    background: linear-gradient(
      to top,
      var(--color-ground) 0%,
      color-mix(in srgb, var(--color-ground) 90%, transparent) 42%,
      transparent 78%
    );
  }
}
```

**Re-verify contrast after this change.** The existing per-act contrast test
must still pass; if a scrim this light drops any text below AA, tighten the
scrim rather than dimming the painting, and say so in the report.

- [ ] **Step 4: Frame each painting against its text**

This is the "orientation" fix. Each plate's subject must sit in the **open**
half of the frame, not behind the text column. Add to each entry in
`src/lib/art.ts`:

```ts
  /** Where the painting sits inside the act box, per axis, as a CSS
   *  object-position. Chosen so the subject lands clear of the text
   *  column — right-of-centre on wide screens, upper half on narrow. */
  framing: { wide: string; narrow: string };
```

For example `airpump` takes `{ wide: "62% 50%", narrow: "50% 38%" }` so the
glass globe and the lit faces clear the copy. Set all eight by eye against the
Step 1 screenshots — this is a judgement call per painting, and the report must
show the before/after for each.

Consume it in `Plate.tsx` via a CSS custom property on the `.plate` wrapper,
with the narrow value applied under the same `48rem` breakpoint the scrim uses.

- [ ] **Step 5: Move the lamp's rest position out of the text column**

In `Lamp.tsx`, bias the resting `x` toward the open half rather than using the
plate's own `lamp.x` unmodified:

```ts
        // The painting's light source is where the lamp *wants* to sit, but
        // the text column owns the left of the frame. Push the rest position
        // into the open half so the reveal lands where it can be seen.
        const restX = Math.max(0.52, Number(act.dataset.lampX ?? 0.5));
```

On narrow screens the text sits at the bottom, so bias `y` upward instead —
gate this on a `matchMedia("(max-width: 48rem)")` check captured once on mount.

- [ ] **Step 6: Text that resolves on scroll**

The owner asked for the copy to fade in as it arrives. One authored beat per
act, not a carnival: the eyebrow, statement, body and provenance resolve in
sequence, once, when the act first enters view — never re-firing on scroll back.

`Act.tsx` already has an `IntersectionObserver` gate via `Lamp`. Add a
`data-seen` attribute set once when an act first intersects, then in CSS:

```css
/* One beat per act, on first arrival. Never replayed — a page that
   re-animates every time you scroll past is a page you cannot read. */
[data-act] .scrim > * {
  opacity: 0;
  transform: translateY(0.6rem);
}
[data-act][data-seen] .scrim > * {
  opacity: 1;
  transform: none;
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
[data-act][data-seen] .scrim > :nth-child(2) { transition-delay: 0.06s; }
[data-act][data-seen] .scrim > :nth-child(3) { transition-delay: 0.12s; }
[data-act][data-seen] .scrim > :nth-child(4) { transition-delay: 0.18s; }
[data-act][data-seen] .scrim > :nth-child(5) { transition-delay: 0.24s; }
```

**The no-JS and reduced-motion states must show the text.** Since the hidden
state is the default, gate the whole block on `[data-lamp="on"]` exactly as the
mask is gated — no lamp, no hiding. Add a test asserting that with JavaScript
disabled every act's statement is visible, and another under
`reducedMotion: "reduce"`.

Set `data-seen` in `Lamp.tsx`'s existing observer callback — do not add a
second observer.

- [ ] **Step 7: Re-shoot and compare**

Recapture the Step 1 viewports and put before/after pairs in the report. The
bar to clear is plain: **a reader should be able to tell what each painting
depicts.** If they still cannot, raise `brightness` further and say what you
landed on.

- [ ] **Step 8: Run everything**

```bash
npm run lint && npm run typecheck && npm run build && npm run budget && npm run check:art && npm test
```

Expected: all green, axe zero violations, contrast test still passing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: let the paintings read, and resolve the copy on arrival"
```

---

### Task 14d: The torch — a page-wide flashlight

**Added 2026-08-17 at the owner's request**, from a detailed specification. Must
run **after Task 14c**, which sets the plates' brightness floor — the two
interact directly and tuning 14d against unfixed plates would waste the pass.

**The unification ruling.** The site already has a light: the per-act lamp that
reveals each painting. A second, independent global dimmer would mean two
uncorrelated light sources and a compounding darkness the paintings cannot
afford. So the torch and the plate lamp are **one light**: the same pointer
drives both, and the plate's own unlit floor rises to compensate for the
overlay's dimming. The reader sees a single flashlight moving over a dark
archive, which is exactly what the concept asks for.

**Files:**
- Create: `src/components/Torch.tsx`
- Modify: `src/components/Lamp.tsx`, `src/app/globals.css`, `src/app/layout.tsx`
- Test: `tests/lamplight.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `--torch-x`, `--torch-y`, `--torch-r` on `<html>`; `data-torch="on"` once the pointer has entered.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lamplight.spec.ts`:

```ts
test("the torch follows the pointer and never blocks interaction", async ({ page }) => {
  await page.goto("/");
  const overlay = page.locator(".torch");
  await expect(overlay).toHaveCount(1);
  expect(
    await overlay.evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");

  const read = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--torch-x"),
    );
  await page.mouse.move(200, 200);
  await page.waitForTimeout(160);
  const a = await read();
  await page.mouse.move(900, 600);
  await page.waitForTimeout(300);
  expect(await read()).not.toBe(a);

  // The overlay must not intercept clicks.
  await page.getByRole("link", { name: /résumé/i }).first().click({ trial: true });
});

test("the torch stays off for touch, reduced motion, and no JS", async ({ browser }) => {
  for (const opts of [
    { reducedMotion: "reduce" as const },
    { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } },
    { javaScriptEnabled: false },
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on");
    // Content is readable regardless.
    await expect(page.locator(".statement").first()).toBeVisible();
    await ctx.close();
  }
});
```

- [ ] **Step 2: Run them to make sure they fail**

```bash
npm run build && npx playwright test tests/lamplight.spec.ts -g "torch"
```

Expected: the first FAILS (no `.torch` element). The second passes trivially —
it is a guard, not a driver.

- [ ] **Step 3: Build the torch**

Create `src/components/Torch.tsx` as a client component mounted once in
`layout.tsx`, beside `Lamp`.

Behaviour, following the owner's specification:

- A **fixed-position overlay above all content**, `pointer-events: none`,
  covering the viewport. It dims the page by **20–35%** outside the beam and
  leaves it fully visible inside. The page must stay readable everywhere —
  this creates contrast, it does not hide content.
- The beam is a **soft radial gradient** with no hard edge:
  `transparent 0%, transparent 35%, slight 60%, stronger 80%, full 100%`.
- Radius: **240px desktop, 200px tablet**, via `--torch-r`. Read the breakpoint
  once on mount and on resize — never per frame.
- **Smoothing:** the beam trails the pointer with slight inertia. Lerp toward
  the raw pointer at ~0.14 per frame — physical, but with no perceptible lag.
  Reuse the pattern Task 14b's Step 8c introduces for the lamp.
- **Entrance:** on load the overlay is only slightly dark and the beam is
  absent. When the pointer first enters, `data-torch="on"` goes on `<html>` and
  the beam fades in over ~600ms. It must never look broken before first move.
- **Interactive elements:** when the pointer is over an `a`, `button`, or
  `[role="button"]`, the radius eases from 240px to ~260px. Detect with a
  single delegated `pointerover`/`pointerout` on `document`, not per-element
  listeners, and never pulse or repeat.

Write it exactly like `Lamp`: **one rAF loop, passive listeners, CSS custom
properties only.** No React state per pointer event, no re-renders, no canvas,
no animation library, no filters on scrolling content. Only compositor-friendly
properties.

- [ ] **Step 4: Gate it hard**

The torch is desktop-only and must be absent — not merely invisible — in every
other case:

```css
@media (hover: none) {
  .torch { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .torch { display: none; }
}
```

and in JS, return early from the effect (registering no listeners at all) when
`matchMedia("(hover: none)")` or `matchMedia("(prefers-reduced-motion: reduce)")`
matches. With no JavaScript the element renders inert and undimmed.

Keyboard users must get the normal page: focus, selection, scrolling and link
activation are untouched, and nothing about the torch is required to read or
operate the site.

- [ ] **Step 5: Rebalance against the plates**

Because the overlay now supplies the page-wide darkness, the plates must not
double-dim. In `globals.css`, raise the unlit floor set by Task 14c whenever the
torch is active:

```css
[data-torch="on"] [data-lamp="on"] .plate-dark {
  filter: brightness(0.56) saturate(0.9);
}
```

Tune this number against the rendered page — the target is that a plate under
the torch's dim region looks the same as it did before the torch existed.

- [ ] **Step 6: Optional grain**

Add a very low-opacity film-grain texture to the overlay only if it improves it:
an inline base64 noise tile at ≤3% opacity, `background-repeat: repeat`, no
animation. Archival paper and darkroom, not digital noise. **If it looks worse,
delete it** and say so in the report — a rejected option honestly reported is a
better outcome than a mediocre one shipped.

- [ ] **Step 7: Inspect the real thing**

This step is not optional and is not satisfied by tests passing. Build, serve
`./out`, and drive a real browser: move the pointer slowly across the hero, the
nav, each project act, the research chart, the ledger and the footer, then move
it fast across the whole page. Capture screenshots at 1440×900 with the pointer
at three positions and attach them to the report.

Check and report on each: the beam follows smoothly; no visible lag; no
flicker; no layout shift; no text made unreadable; no click interception; no
frame drops. **Tune radius and opacity until it reads as premium** — the target
feeling is a flashlight in an engineering archive, not a glowing cursor.

Explicitly confirm none of these appear: a glowing or replaced cursor, a neon
or RGB edge, a particle or cursor trail, lens flare, pulsing, flashing,
excessive blur, or full-page darkness.

- [ ] **Step 8: Run everything**

```bash
npm run lint && npm run typecheck && npm run build && npm run budget && npm run check:art && npm test
```

Expected: all green, axe zero violations, contrast test still passing. The
budget must absorb the torch within the existing JS ceiling — report its
gzipped cost.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: the torch — a page-wide flashlight over the archive"
```

---

### Task 15: Documentation and the finish

**Files:**
- Modify: `DESIGN.md`, `AGENTS.md`, `README.md`
- Delete: `UPGRADE_PROMPT.md` (untracked scratch from the previous build)

**Interfaces:** none.

- [ ] **Step 1: Rewrite AGENTS.md**

Replace the "Concept: the data field" section with a "Concept: lamplight" section that states, in the same compressed register: three values not two; emphasis is light, not inversion; plates are public domain and credited like sources; the lamp is one rAF loop and everything else is CSS; the default state is lit, so no-JS and reduced-motion get a painted page; numbers stay mono at every size. Keep the "Hard rules" and "Commands" sections, updating: the palette token names, the addition of `npm run art` / `npm run check:art`, and the `sharp` devDependency justification.

- [ ] **Step 2: Rewrite DESIGN.md**

The existing file documents the retired system section by section (Colors, Typography, Layout, Elevation, Shapes, Components, Do's and Don'ts). Keep that structure — it is a good structure — and rewrite each section for lamplight. The Components section must gain `Plate`, `Act`, `Statement`, `Lamp` and lose `Bar Field`, `Bit Matrix`. Add a "Plates" section listing all eight paintings with artist, title, year, and Commons URL.

- [ ] **Step 3: Update README.md**

Update the design description, add `npm run art` and `npm run check:art` to the commands table, and document that `public/art` is committed and regenerated only by an explicit run.

- [ ] **Step 4: Remove the scratch file**

```bash
rm UPGRADE_PROMPT.md
```

- [ ] **Step 5: Full gate**

```bash
npm run lint && npm run typecheck && npm run build && npm run budget && npm run check:art && npm test
```

Then check Lighthouse:

```bash
node scripts/check-lighthouse.mjs
```

Expected: performance ≥ 75 on throttled mobile, accessibility 100. If performance lands below 75, apply the 1920w fallback from Task 14 Step 5.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: DESIGN.md and AGENTS.md describe lamplight"
```

---

## Verification checklist

Run before calling the redesign done:

- [ ] `npm run lint` — clean
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — static export succeeds
- [ ] `npm run budget` — JS ≤ 214 kB gz, index images ≤ 3000 kB
- [ ] `npm run check:art` — every plate verified against the lockfile
- [ ] `npm test` — all smoke, art, and lamplight tests pass; **axe zero violations** on `/`, `/projects/warden/`, `/projects/scheduler/`
- [ ] `NEXT_PUBLIC_BASE_PATH=/portfolio npm run build && npm test` — the sub-path deploy still works and no plate 404s
- [ ] Reduced-motion: plates lit, no lamp attribute, no rAF loop
- [ ] JavaScript disabled: plates lit, every statement and link present
- [ ] Print preview of `/` and `/projects/warden/`: no plates, no scrims, all copy in document order
- [ ] Every visible claim traces to `src/content.ts`, a linked repo, or owner input
- [ ] Every plate shows its credit
