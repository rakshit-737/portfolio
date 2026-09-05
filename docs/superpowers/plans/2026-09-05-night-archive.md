# Night Archive Interaction Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A default-on, maximally restrained sound + cursor layer: one synthesized hearth soundscape at 12% volume, three tiny interface sounds on exactly four events, and a desktop-only custom cursor — all failing gracefully to the current silent, native-cursor site.

**Architecture:** One framework-free audio engine (`src/lib/sound.ts`, module singleton) owns preference persistence, the autoplay gate, the Web Audio graph, and a `data-soundscape` status attribute on `<html>`; two thin client components (`Soundscape.tsx` boot shim, `SoundToggle.tsx` button) and four one-line `playUi()` call sites consume it. The cursor is pure CSS: an inline data-URI SVG under pointer-capability media queries. **Everything is synthesized at runtime — zero audio assets, zero audio network requests, zero new dependencies.**

**Tech Stack:** Web Audio API (native), CSS `cursor` + `@media (pointer:fine) and (hover:hover)` / `(forced-colors: active)`, localStorage (try/catch), Page Visibility API, Playwright.

**Spec:** The owner's "night archive" prompt (this plan's parent conversation). Key spec lines this plan argues from, verbatim in spirit:
- ambient sound ON by default, "never bypass or trick browser autoplay policies"; if blocked, "start after the first valid user interaction"; no retry loops
- volume "low by default (10–15%)"; visible keyboard-accessible control "Soundscape: on/off" in nav or palette; persist explicit preference; lazy-load audio only when playback will begin; pause when tab hidden; never resume unexpectedly
- audio "supplied by the site owner, or … verified CC0/public-domain — never scraped, hotlinked, or copyrighted"
- interface sounds ONLY on: palette open/close, mobile nav open/close, email-copy success, soundscape toggle; "small physical sounds (a wood tap, a brass click, a wax-seal press)"; never on hover/scroll/every click; sound never the only confirmation
- cursor: desktop only, brass-compass/inspection-lens/wax-seal metaphor, lightweight local SVG via native CSS `cursor`, correct hotspot, native fallback; native cursor kept for text selection, form fields, coarse pointers, keyboard nav; respect forced-colors/high-contrast/reduced-motion
- tests: defaults/persistence/autoplay-gating/no-early-audio-request/keyboard/SR state/tab-hidden pause; cursor fine-vs-coarse/text-selection/focus/asset-failure fallback; a11y no-regression; no idle loops; no layout shift; budgets intact
- "Default-on does not mean aggressive."

## Rulings (recorded here; copy into the rulings doc in Task 6)

1. **All audio is synthesized in-repo at runtime (Web Audio), not a recorded file.** Cost-if-wrong: soundscape reads as cheap. Why ruled anyway: (a) rights — a synthesized graph authored in this repo is owner-supplied in the strongest sense; every "verified CC0" early-music recording still carries performer/label risk this session cannot verify to the spec's bar; (b) the spec's own performance clauses (lazy-load, no early request, budgets intact) are satisfied absolutely by zero assets; (c) "candlelit loop" is honestly met by a hearth — low room tone plus sparse crackle — which suits the archive better than music competing with reading. Escape hatch: the engine takes its ambient from one builder function; swapping in an owner-supplied file later is a one-function change.
2. **The toggle is the mute control.** Spec asks for a toggle AND "a volume or mute control" — one on/off control satisfies both ("or mute"); a volume slider would be the layer's least restrained element. Volume fixed at `AMBIENT_GAIN = 0.12` (inside 10–15%).
3. **No ember in the cursor.** AGENTS.md: ember marks a lit number, never a graphic. Cursor is bone stroke over ground fill — legible on both dark ground and lit painting.
4. **Tab-visible resume is not "unexpected resume."** Hidden→suspend, visible→resume only if the user's setting is on and it was playing when hidden. The clause guards against resuming after an explicit "off," which the state machine makes impossible (off tears the graph down).
5. **Toggle placement: nav rail (md+), mobile menu row, plus one palette action.** The palette is the site's keyboard surface and already the sound spec's subject; one action there is discoverability, not a second instrument.
6. **`AudioContext` missing → the whole sound layer is absent** (status `unavailable`, toggle renders null). A control that does nothing is worse than no control.

## Global Constraints

- Three colours only; ember never on a graphic (so: not on the cursor, not anywhere new).
- `src/content.ts` is the single source of truth for every visible word — toggle label strings live there.
- No new dependencies. No audio files. No layout shift (nav row height stays `h-14`).
- JS budget 214 kB gz per page (`npm run budget`); axe zero on all four routes; Lighthouse thresholds are a ratchet.
- Static export must keep working at root AND `/Portfolio` sub-path (nothing here may fetch a path — hence data-URI cursor, no audio URLs).
- Default JS-free state: silent page, native cursor via media-query fallback — already the graceful floor.
- Reduced motion: the soundscape is not motion and stays; the cursor is static (no animation to reduce).
- Playwright on this machine: run with `--workers=3`; re-run stragglers `--workers=1 -g "<name>"`.
- Commits: plain messages, no attribution lines.

---

### Task 1: The engine's pure core — preference, status machine, subscription

**Files:**
- Create: `src/lib/sound.ts`
- Test: `tests/sound-unit.spec.ts`

**Interfaces (Produces):**
```ts
export const SOUND_PREF_KEY = "night-archive:sound";
export const AMBIENT_GAIN = 0.12;
export type SoundStatus = "unavailable" | "off" | "blocked" | "on" | "paused";
export type UiSound = "tap" | "click" | "seal";
export function readSoundPref(read: () => string | null): boolean; // pure; default true
export function isSoundEnabled(): boolean;
export function setSoundEnabled(v: boolean): void;
export function getSoundStatus(): SoundStatus;
export function subscribeSound(cb: (s: SoundStatus) => void): () => void;
export function initSoundscape(): void;  // Task 2 fills the audio side
export function playUi(kind: UiSound): void; // Task 2 fills the audio side
```
`setSoundEnabled` persists via try/catch localStorage, updates status, notifies subscribers, and (from Task 2 on) starts/stops the graph. All `window` access happens inside functions, never at module top level (SSR-safe).

- [x] **Step 1: failing unit test** — `tests/sound-unit.spec.ts`, motion.spec.ts's Node-pure pattern:

```ts
import { expect, test } from "@playwright/test";
import { readSoundPref, SOUND_PREF_KEY } from "../src/lib/sound";

test.describe("readSoundPref (pure)", () => {
  test("absent preference defaults ON", () => {
    expect(readSoundPref(() => null)).toBe(true);
  });
  test('"off" is the one persisted value that disables', () => {
    expect(readSoundPref(() => "off")).toBe(false);
  });
  test('"on" enables', () => {
    expect(readSoundPref(() => "on")).toBe(true);
  });
  test("garbage falls back to default ON", () => {
    expect(readSoundPref(() => "loud")).toBe(true);
  });
  test("a throwing storage read (blocked localStorage) defaults ON", () => {
    expect(
      readSoundPref(() => {
        throw new Error("denied");
      }),
    ).toBe(true);
  });
  test("key is namespaced like the palette's", () => {
    expect(SOUND_PREF_KEY).toBe("night-archive:sound");
  });
});
```

- [x] **Step 2: run, verify FAIL** — `npx playwright test tests/sound-unit.spec.ts --workers=1` → module not found.
- [x] **Step 3: implement the pure core** (persistence write, status store, subscriber set; `initSoundscape`/`playUi` as documented stubs that only manage status until Task 2).
- [x] **Step 4: run, verify PASS.** Also `npm run typecheck`.
- [x] **Step 5: commit** — `feat: the night archive's switch — preference, status, subscription`

### Task 2: The hearth and the three sounds — Web Audio graph, autoplay gate, visibility

**Files:**
- Modify: `src/lib/sound.ts`
- Create: `src/components/Soundscape.tsx`
- Modify: `src/app/layout.tsx` (mount `<Soundscape />` beside `<Lamp />`)
- Test: `tests/sound.spec.ts`

**Interfaces (Consumes):** Task 1's exports. **(Produces):** `<html data-soundscape="...">` live status for tests/CSS; CustomEvents `night-archive:ctx-created` (once, when the AudioContext is first built) and `night-archive:ui-sound` (detail `{ kind }`, only when a UI sound actually plays) — observability for the test suite, dispatched on `window`.

Engine behaviour to implement:
- `initSoundscape()` (called once from `Soundscape.tsx` mount): no `AudioContext` global → status `unavailable`, done. Pref off → status `off`, done — **no context is ever created**. Pref on → build context + graph (dispatch `ctx-created`), `ctx.resume()`; if `ctx.state === "running"` → `on`; else → `blocked` + one-time `pointerdown`/`keydown`/`touchend` listeners (`{ once: true }` semantics shared through a single retry function that removes all three) which retry `resume()` exactly once — never a loop.
- Ambient graph (all values are constants at top of file): 4-second brown-noise `AudioBuffer` (leaky integrator `last = (last + 0.02 * white) / 1.02`, normalized, first/last 4000 samples crossfaded to kill the loop seam) → looping `AudioBufferSourceNode` → lowpass 220 Hz → gain 0.5, plus a 0.05 Hz sine LFO (±20% depth via gain into the room-tone gain's AudioParam — audio-rate, no JS timer) → master gain `AMBIENT_GAIN` → destination. Crackles: a `setTimeout` scheduler (random 240–900 ms apart, **only armed while status is `on`**) plays a 30 ms bandpass-filtered (2.4 kHz, Q 0.9) noise burst at random gain 0.015–0.06 through the same master gain.
- `setSoundEnabled(false)` → stop sources, clear the crackle timer, `ctx.suspend()`, status `off`. `setSoundEnabled(true)` → (re)build/resume — this call always comes from a user gesture (the toggle), so autoplay cannot block it; status `on`.
- Visibility: `document.visibilitychange` → hidden while `on`: clear crackle timer, `ctx.suspend()`, status `paused`; visible while `paused`: `ctx.resume()`, re-arm crackles, status `on`. Hidden in any other status: no-op.
- `playUi(kind)`: no-op unless status is `on` or `paused`-adjacent enabled states — precisely: unless `isSoundEnabled()` **and** a context exists **and** `ctx.state === "running"`. When it plays, dispatch `night-archive:ui-sound`. Synths (each ≤ 20 lines, envelopes via `gain.exponentialRampToValueAtTime`, peak gain 0.18, every node stopped/disconnected on end):
  - `tap` (wood): 160 Hz sine, 60 ms decay + one 30 ms 1.2 kHz bandpass noise burst.
  - `click` (brass): 2.1 kHz + 2.7 kHz triangles, 35 ms decay, shared highpass 900 Hz.
  - `seal` (wax): 90 Hz sine, 15 ms attack, 180 ms decay + 300 Hz-lowpassed noise thud.
- `Soundscape.tsx`: `"use client"`, `useEffect(() => initSoundscape(), [])` plus a subscription writing `document.documentElement.dataset.soundscape = status`, returns `null`.

- [x] **Step 1: failing e2e tests** — `tests/sound.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("soundscape is on by default (autoplay permitted here)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test("no audio file is ever requested", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (r) => {
    if (/\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?|$)/i.test(r.url()))
      audioRequests.push(r.url());
  });
  await page.goto("/");
  await page.mouse.click(400, 400);
  await page.waitForTimeout(500);
  expect(audioRequests).toEqual([]);
});

test("a persisted off preference builds no AudioContext at all", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("night-archive:sound", "off");
    (window as never as { __ctx: number }).__ctx = 0;
    window.addEventListener("night-archive:ctx-created", () => {
      (window as never as { __ctx: number }).__ctx++;
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  expect(await page.evaluate(() => (window as never as { __ctx: number }).__ctx)).toBe(0);
});

test("hidden tab pauses; visible resumes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test.describe("with autoplay blocked (real policy, not a mock)", () => {
  test.use({ launchOptions: { args: ["--autoplay-policy=user-gesture-required"] } });

  test("blocked until first real interaction, then on — no retry loop", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
    // No amount of waiting flips it without a gesture:
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
    await page.mouse.click(200, 300);
    await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
  });
});

test("blocked localStorage still yields a working default-on soundscape", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("denied");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});
```

- [x] **Step 2: run, verify FAIL** (`data-soundscape` never set).
- [x] **Step 3: implement engine + Soundscape + layout mount** per behaviour block above.
- [x] **Step 4: run tests + typecheck; verify PASS** (build first: `npm run build`).
- [x] **Step 5: commit** — `feat: the hearth — a synthesized soundscape behind an honest autoplay gate`

### Task 3: The switch made visible — SoundToggle, nav, palette, content strings

**Files:**
- Modify: `src/content.ts` (UI strings)
- Create: `src/components/SoundToggle.tsx`
- Modify: `src/components/Nav.tsx` (desktop cluster + mobile menu row)
- Modify: `src/components/CommandPalette.tsx` (one action)
- Test: extend `tests/sound.spec.ts`; a11y covered by existing `tests/a11y.spec.ts` run

**Interfaces (Consumes):** `isSoundEnabled/setSoundEnabled/getSoundStatus/subscribeSound/playUi` from Task 1/2. **(Produces):** `soundscape` export in content.ts: `{ label: "Soundscape", on: "on", off: "off" }`; `<SoundToggle className?>` rendering `Soundscape: on|off`, `null` when status `unavailable`.

`SoundToggle.tsx`:

```tsx
"use client";

import { useSyncExternalStore } from "react";
import {
  getSoundStatus,
  isSoundEnabled,
  playUi,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";
import { soundscape } from "@/content";

/**
 * The soundscape's one control — a toggle, which is also the mute
 * control (see the night-archive plan's rulings). The visible text
 * carries the state ("Soundscape: on"), so no aria-pressed: a changing
 * accessible name and a pressed state would announce twice, disagreeing
 * the moment one updates before the other.
 */
export default function SoundToggle({ className = "" }: { className?: string }) {
  const status = useSyncExternalStore(subscribeSound, getSoundStatus, () => "off" as const);
  if (status === "unavailable") return null;
  const on = isSoundEnabled();
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!on);
        playUi("click");
      }}
      className={`label transition-colors hover:bg-signal hover:text-ground ${className}`}
    >
      {soundscape.label}: {on ? soundscape.on : soundscape.off}
    </button>
  );
}
```

(Note `playUi` after `setSoundEnabled`: turning ON clicks audibly — the context is running by then; turning OFF is silent because `playUi` gates on the now-false setting. The visual text change is the confirmation either way — sound is never the only one. `getServerSnapshot` returns `"off"`, whose render output equals the client's pre-init default, avoiding a hydration mismatch.)

Nav: in the `hidden … md:flex` cluster, before the ctrl-K button: `<SoundToggle className="border border-rule px-2.5 py-2 hover:border-signal" />` (drop hover:bg — match the ctrl-K button's border treatment exactly). In the mobile menu: `<SoundToggle className="border-b border-rule-soft px-2 py-4 text-left" />` between the clock row and the section links.

Palette action (in the actions block, after `linkedin`):

```tsx
{
  id: "soundscape",
  group: "actions" as const,
  label: `Soundscape: turn ${isSoundEnabled() ? "off" : "on"}`,
  keywords: "sound audio mute ambient quiet hearth",
  run: () => {
    setSoundEnabled(!isSoundEnabled());
    playUi("click");
  },
},
```
(The `commands` memo currently has `[]` deps; give this label live state by adding the subscribed status to the dependency array via a `useSyncExternalStore` value in the component — the memo recomputes on toggle, nothing else changes.)

- [x] **Step 1: failing tests** appended to `tests/sound.spec.ts`:

```ts
test("the toggle is visible, keyboard-operable, persists, and survives reload", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Soundscape: on$/ }).first();
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  expect(
    await page.evaluate(() => window.localStorage.getItem("night-archive:sound")),
  ).toBe("off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
});

test("palette carries the soundscape action", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("sound");
  await expect(page.getByRole("option", { name: /Soundscape: turn off/ })).toBeVisible();
});
```
(Adjust the combobox/option roles to the palette's real ARIA — it uses `role="listbox"`/options; read the file before writing selectors.)

- [x] **Step 2: run, verify FAIL.**
- [x] **Step 3: implement** content strings + component + both nav spots + palette action.
- [x] **Step 4: build; run sound.spec + a11y.spec + smoke.spec; verify PASS** (axe must stay zero with the new button).
- [x] **Step 5: commit** — `feat: the soundscape's switch, on the rail and in the index`

### Task 4: Four sounds, four sites — and provably nowhere else

**Files:**
- Modify: `src/components/CommandPalette.tsx` (open → `playUi("tap")`, close → `playUi("tap")`)
- Modify: `src/components/Nav.tsx` (mobile menu open/close → `playUi("tap")`)
- Modify: `src/components/CopyEmailButton.tsx` (copy success only, inside the `try` after `writeText` resolves → `playUi("seal")`)
- Modify: `src/components/CommandPalette.tsx` copy-email action success → `playUi("seal")` (same event class: email copied)
- Test: extend `tests/sound.spec.ts`

**Interfaces (Consumes):** `playUi` + the `night-archive:ui-sound` CustomEvent from Task 2. Toggle already plays `click` (Task 3).

Placement rules: palette — in the open-effect and in `close()` (one call each; Escape, backdrop, and command-run all funnel through `close()`). Nav — in the menu button's `onClick` and in the close paths that represent the user closing it (button toggle); the outside-click/focus-out auto-closes stay silent (not a user action on the menu control).

- [x] **Step 1: failing tests:**

```ts
test("interface sounds fire on the four sanctioned events and never on hover or scroll", async ({ page }) => {
  await page.goto("/");
  await page.addInitScript; // (kinds log installed via init script below)
  // install log
  await page.evaluate(() => {
    (window as never as { __ui: string[] }).__ui = [];
    window.addEventListener("night-archive:ui-sound", (e) =>
      (window as never as { __ui: string[] }).__ui.push(
        (e as CustomEvent<{ kind: string }>).detail.kind,
      ),
    );
  });
  const kinds = () => page.evaluate(() => (window as never as { __ui: string[] }).__ui);

  // hover + scroll: silence
  await page.mouse.move(300, 300);
  await page.mouse.move(600, 500);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(300);
  expect(await kinds()).toEqual([]);

  // palette open + close: two taps
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  expect(await kinds()).toEqual(["tap", "tap"]);
});

test("copying the email presses the seal", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#contact");
  await page.evaluate(() => {
    (window as never as { __ui: string[] }).__ui = [];
    window.addEventListener("night-archive:ui-sound", (e) =>
      (window as never as { __ui: string[] }).__ui.push(
        (e as CustomEvent<{ kind: string }>).detail.kind,
      ),
    );
  });
  await page.getByRole("button", { name: /copy email address/i }).click();
  await expect(page.getByRole("button", { name: /^Copied/ })).toBeVisible();
  expect(
    await page.evaluate(() => (window as never as { __ui: string[] }).__ui),
  ).toEqual(["seal"]);
});

test("sounds obey the global setting", async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("night-archive:sound", "off"),
  );
  await page.goto("/");
  await page.evaluate(() => {
    (window as never as { __ui: string[] }).__ui = [];
    window.addEventListener("night-archive:ui-sound", (e) =>
      (window as never as { __ui: string[] }).__ui.push(
        (e as CustomEvent<{ kind: string }>).detail.kind,
      ),
    );
  });
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => (window as never as { __ui: string[] }).__ui)).toEqual([]);
});
```
(Delete the stray `await page.addInitScript;` line when writing the real file — shown here to flag that the log must be installed before the interactions it observes.)

- [x] **Step 2: run, verify FAIL.**
- [x] **Step 3: wire the four sites** (each is one `playUi(...)` line; import added).
- [x] **Step 4: build; run the file; verify PASS.**
- [x] **Step 5: commit** — `feat: four small sounds — wood for the panels, wax for the seal, brass for the switch`

### Task 5: The compass cursor — CSS only, desktop only

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/cursor.spec.ts`

**(Produces):** custom cursor on fine-pointer/hover devices only; everything else untouched.

CSS to append (single block, after the print styles; the SVG below is authored here and URL-encoded inline — bone `#F2EDE3` stroke, ground `#08070A` fill, a compass needle pointing at the hotspot with a small inspection-lens ring at its tail; 28×28, hotspot `3 3`):

```css
/* ————— the compass cursor (night archive) —————
   Desktop only: a fine pointer that can hover. The needle points at the
   declared 3 3 hotspot; the trailing ring is the inspection lens. Bone
   over ground — legible on the dark ground and on a lit plate alike; no
   ember (ember marks a lit number, never a graphic). Inline data URI: no
   request to fail or basePath to resolve, and the trailing `auto` keeps
   the native cursor wherever a browser refuses SVG cursors (Safari).
   Interactive and text surfaces below re-assert their native cursors —
   `cursor` inherits, and with `auto` overridden at the root the UA would
   otherwise show the compass over links and prose too. */
@media (pointer: fine) and (hover: hover) {
  html {
    cursor:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M3 3l11.5 4.5-4.9 2.1-2.1 4.9z' fill='%2308070A' stroke='%23F2EDE3' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='18.5' cy='18.5' r='5.2' fill='none' stroke='%23F2EDE3' stroke-width='1.4'/%3E%3Ccircle cx='18.5' cy='18.5' r='1.1' fill='%23F2EDE3'/%3E%3C/svg%3E")
        3 3,
      auto;
  }
  a,
  button,
  [role="button"],
  summary,
  select,
  label[for] {
    cursor: pointer;
  }
  input,
  textarea,
  [contenteditable="true"],
  p,
  li,
  blockquote,
  dd,
  .statement,
  .prose-field {
    cursor: text;
  }
  input[type="checkbox"],
  input[type="radio"],
  input[type="range"] {
    cursor: pointer;
  }
}
/* High-contrast / forced-colors users get their platform cursor —
   a themed cursor is exactly the authored colour these modes exist to
   override. */
@media (forced-colors: active) {
  html {
    cursor: auto;
  }
}
```

- [x] **Step 1: failing tests** — `tests/cursor.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { mobileContext } from "./helpers";

const rootCursor = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).cursor);

test("fine pointers get the compass, with hotspot and native fallback declared", async ({ page }) => {
  await page.goto("/");
  const cursor = await rootCursor(page);
  expect(cursor).toContain("data:image/svg+xml");
  expect(cursor).toMatch(/3.*3.*auto/s); // hotspot pair, then the fallback keyword
});

test("interactive and text surfaces keep their native cursors", async ({ page }) => {
  await page.goto("/");
  const linkCursor = await page
    .locator("a")
    .first()
    .evaluate((el) => getComputedStyle(el).cursor);
  expect(linkCursor).toBe("pointer");
  const proseCursor = await page
    .locator("p")
    .first()
    .evaluate((el) => getComputedStyle(el).cursor);
  expect(proseCursor).toBe("text");
  await page.keyboard.press("Control+k");
  const inputCursor = await page
    .locator("input")
    .first()
    .evaluate((el) => getComputedStyle(el).cursor);
  expect(inputCursor).toBe("text");
});

test("coarse pointers never see it", async ({ browser }) => {
  const context = await mobileContext(browser);
  const page = await context.newPage();
  await page.goto("/");
  expect(await rootCursor(page)).toBe("auto");
  await context.close();
});

test("forced colors restore the platform cursor", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  expect(await rootCursor(page)).toBe("auto");
});
```
(`mobileContext` may return a context or need `await` — check `tests/helpers.ts:136` signature before writing.)

- [x] **Step 2: run, verify FAIL.**
- [x] **Step 3: append the CSS block.**
- [x] **Step 4: build; run cursor.spec + lamplight paint-order tests; verify PASS.**
- [x] **Step 5: commit** — `feat: a compass for a fine pointer — the cursor joins the archive`

### Task 6: The whole instrument still plays — full gates, docs, rulings

**Files:**
- Modify: `AGENTS.md` (a "night archive" paragraph in the concept section: soundscape default-on behind the autoplay gate, synthesized in-repo — no audio assets ever; four UI sounds and their sites, closed list; compass cursor rules), `DESIGN.md` (same, in its voice), `README.md` (one feature line)
- Modify: `docs/superpowers/plans/2026-08-16-lamplight-rulings.md` (append the six rulings above, with cost-if-wrong)
- Test: everything

- [x] **Step 1: full verification** —
```
npm run lint && npm run typecheck && npm run build
npm run budget && npm run check:art && npm run check:links && npm run check:content
npx playwright test --workers=3
```
Expected: all green; budget delta from this feature ≈ +2–3 kB gz JS, 0 kB media. Any straggler: `--workers=1 -g "<name>"`.
- [x] **Step 2: break-and-restore evidence for the new gates** (a test never observed failing is not a gate): comment out the `initSoundscape()` call → sound.spec fails; restore. Delete the cursor CSS block's `, auto` fallback → the hotspot/fallback assertion fails; restore. Note both observations in the commit body.
- [x] **Step 3: docs + rulings edits.**
- [x] **Step 4: re-run lint (docs lint if any) + the two spec files once more.**
- [x] **Step 5: commit** — `docs: the night archive enters the record` (body carries the break-and-restore evidence). Push, watch CI.

## Self-review (run before execution)

- Spec coverage: default-on ✓ (T1 default + T2 attr), autoplay-honest ✓ (T2 real-policy project), 10–15% ✓ (constant 0.12), visible keyboard toggle ✓ (T3), persistence ✓ (T3 test), lazy audio ✓ (T2 off-pref test proves no context), tab-hidden ✓ (T2), no unexpected resume ✓ (ruling 4 + state machine), rights ✓ (ruling 1 — synthesized), four-events-only ✓ (T4 closed list + silence tests), sound-never-sole-confirmation ✓ (every site has visible state; noted in T3/T4), cursor desktop-only/hotspot/fallback/text/form/forced-colors ✓ (T5), asset-failure fallback ✓ (data URI + `auto` keyword — nothing to 404), a11y no-regression ✓ (T3 axe + T6 full), no idle loops ✓ (crackle timer only while `on`; LFO is an audio node; no rAF), no layout shift ✓ (toggle inside fixed-height rail; T6 Lighthouse CLS ratchet), budgets ✓ (T6).
- Placeholders: T3's palette selector note and T4's init-script note are deliberate read-before-write flags, not TBDs; all code blocks are complete.
- Type consistency: `SoundStatus`/`UiSound` names match across tasks; `playUi("click"|"tap"|"seal")` sites match the `UiSound` union.
