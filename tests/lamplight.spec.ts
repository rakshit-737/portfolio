import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import {
  BreakerTripped,
  CONTRAST_LUMINANCE_CEILING,
  desktopAt,
  expectRevealed,
  hasNearBonePixel,
  luminance,
  mobileContext,
  ratio,
  withBreakerRetry,
} from "./helpers";

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

/** Pulls the resolved `at X% Y%` position out of a computed radial-gradient
 *  mask string. Scroll drives both the gradient's radius (via `--p`) and its
 *  position (via `--lamp-y`) — asserting only that the whole string changed
 *  cannot tell those apart, so this isolates the position channel. */
function positionOf(mask: string): { x: number; y: number } | null {
  const m = mask.match(/at\s+([\d.]+)%\s+([\d.]+)%/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

test("the mask on .plate-lit consumes the lamp's CSS variables on scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const plateLit = page.locator(".plate-lit").first();
  const readMask = () =>
    plateLit.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.maskImage || s.webkitMaskImage;
    });

  const before = await readMask();
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
  await page.waitForTimeout(120);
  const after = await readMask();

  expect(after).not.toBe(before);

  // The discriminating assertion: the resolved gradient position (which
  // reads --lamp-x/--lamp-y) must itself move, not just the radius (--p).
  const beforePos = positionOf(before);
  const afterPos = positionOf(after);
  expect(beforePos).not.toBeNull();
  expect(afterPos).not.toBeNull();
  expect(afterPos!.y).not.toBe(beforePos!.y);
});

test("plates keep a non-empty accessible name under reduced motion and with no JavaScript", async ({
  browser,
}) => {
  const reducedCtx = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await reducedCtx.newPage();
  await reducedPage.goto("/");
  const reducedAlt = await reducedPage
    .locator(".plate-lit")
    .first()
    .getAttribute("alt");
  expect(reducedAlt?.trim()).toBeTruthy();
  await expect(reducedPage.getByRole("img").first()).toHaveAccessibleName(
    /.+/,
  );
  await reducedCtx.close();

  const noJsCtx = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsCtx.newPage();
  await noJsPage.goto("/");
  const noJsAlt = await noJsPage
    .locator(".plate-lit")
    .first()
    .getAttribute("alt");
  expect(noJsAlt?.trim()).toBeTruthy();
  await expect(noJsPage.getByRole("img").first()).toHaveAccessibleName(/.+/);
  await noJsCtx.close();
});

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

// Task 14c: the copy fades in once per act, gated on `[data-lamp="on"]` —
// the exact same gate the mask itself uses. No JS, or reduced motion, means
// `data-lamp` is never set, so the hidden (`opacity: 0`) state in
// globals.css never applies and the copy is simply present from first
// paint. Playwright's `toBeVisible()` does not inspect opacity, so these
// assert the actual computed value rather than trusting visibility alone.
test("with JavaScript disabled every act's copy is opaque from first paint", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  for (const id of ACTS) {
    const statement = page.locator(`#${id} .statement`).first();
    const opacity = await statement.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      Number(opacity),
      `act ${id} statement is not opaque with JavaScript disabled`,
    ).toBe(1);
  }
  await ctx.close();
});

test("reduced motion shows every act's copy immediately, with no beat to wait for", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  for (const id of ACTS) {
    const statement = page.locator(`#${id} .statement`).first();
    const opacity = await statement.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      Number(opacity),
      `act ${id} statement is not opaque under reduced motion`,
    ).toBe(1);
  }
  await ctx.close();
});

// One authored beat per act, on first arrival, never replayed. Lamp.tsx
// sets `data-seen` in its existing IntersectionObserver callback and never
// removes it, so scrolling an act out of view and back does not re-hide or
// re-fade its copy.
test("the copy reveal fires once and does not replay on scrolling back", async ({
  page,
}) => {
  await page.goto("/");
  const act = page.locator("#warden");
  const statement = act.locator(".statement").first();

  await act.scrollIntoViewIfNeeded();
  await expect(act).toHaveAttribute("data-seen", "");
  await expect(statement).toHaveCSS("opacity", "1");

  // Scroll back to the top, away from the act, then return to it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  // `data-seen` persists — the attribute is only ever added, never removed.
  await expect(act).toHaveAttribute("data-seen", "");

  await act.scrollIntoViewIfNeeded();
  // Still opaque, immediately — no re-fade from opacity 0 on the return
  // pass. (If the beat had replayed, this would still resolve to 1 once
  // the transition finished, so the meaningful guard is `data-seen` above:
  // its persistence is what proves the CSS gate can't re-fire.)
  await expect(statement).toHaveCSS("opacity", "1");
});

for (const id of ACTS) {
  // Layout guard, not a contrast measurement: confirms the `.scrim` rule
  // is present and that the act's copy stays inside the band it covers.
  // It proves nothing about what colour actually renders behind the
  // text — see the "clears AA contrast" loop below for that.
  test(`text in act ${id} stays inside the scrimmed band`, async ({ page }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    await act.scrollIntoViewIfNeeded();
    // The copy fades in on first arrival (Task 14c) — wait for the beat to
    // resolve rather than sampling it mid-transition.
    await expect(
      act.locator(".statement, .prose-field, .label").first(),
    ).toHaveCSS("opacity", "1");

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

// The real contrast gate. Screenshots each act clipped to its statement's
// own bounding box and measures the mean rendered colour behind it, then
// runs that mean through the same WCAG relative-luminance function used
// above for the palette check — not axe, which returns "incomplete" (not
// "fail") for text over an image and so never actually checks this.
//
// The sampled region includes the statement's own glyphs (bone-on-ground),
// which pulls the mean lighter than the true background alone — so this is
// a conservative test: it can only be harder to pass than measuring the
// bare background would be, never easier.
//
// THRESHOLD (0.12) was set during the 14c fix round, after correcting the
// bug the first 14c pass was unknowingly calibrated against: `Plate.tsx`
// rendered `.plate-lit` before `.plate-dark` in the DOM, and with neither
// layer carrying a `z-index`, the later (opaque, `brightness()`-dimmed)
// element always painted over the masked one — the lamp's reveal was never
// actually visible, on any build before this fix. Once the paint order was
// corrected (`.plate-dark` first, `.plate-lit` second) the plate brightness
// floor was re-tuned down (`.plate-dark` 0.42 → 0.32 — 0.42 was calibrated
// against a reveal that did nothing, so it read as "fine" for the wrong
// reason) and the narrow scrim was changed from percentage-of-box stops to
// fixed vh stops (see the media query above) so a few long acts (about,
// research) don't stretch the protected band across their whole,
// content-driven height.
//
// Re-ran this over the corrected, re-tuned build four times back to back —
// every act's real region measured byte-identical each run: 0.021
// (research) to 0.099 (ledger). 0.12 is ~1.2x the worst real act, not the
// ~8-10x headroom an under-tuned threshold would carry — deliberately
// tight. Verified this threshold actually gates something: disabling
// `.scrim::before`'s background (both the wide and narrow rules) and
// rebuilding raised every act's measured luminance (e.g. ledger
// 0.099 → 0.156, hero 0.050 → 0.065, scheduler 0.041 → 0.052) — with the
// paint order fixed, the scrim is now doing real, measurable work, and at
// 0.12 the break trips this gate (ledger's 0.156 fails; see
// task-14c-report.md for the full break-and-restore log). A run-to-run
// reproducibility note: the copy fades in once per act (Task 14c, gated on
// `data-seen`); the tests above wait for `opacity: 1` before sampling, or a
// statement caught mid-fade reads as noisy, occasionally spiking the
// measured luminance well above its settled value — that mechanism, not
// the plate itself, was the earlier source of run-to-run variance during
// development.
//
// `CONTRAST_LUMINANCE_CEILING` itself now lives in ./helpers (E1/E2/E3,
// final fix wave) — this file, a11y.spec.ts, and idle-stop.spec.ts had
// each hand-duplicated it (and `luminance`/`ratio`/the retry-wrapper
// shape) before that, which is how two different retry budgets (4 vs 5
// attempts) drifted from each other with no reason either was more
// correct.

// Task 14c fix round (2): the paint order (`.plate-dark` beneath
// `.plate-lit`) is the entire mechanism behind the lamp's reveal — both
// layers are `position: absolute; inset: 0` with no `z-index`, so document
// order IS paint order. This inverted once already (an accessibility fix
// swapped the two elements' `className`s instead of just their `alt`/
// `aria-hidden`), and nothing before this test would have caught it: the
// contrast gate below measures luminance behind the *text*, and a
// re-invert makes the whole visible field uniformly dim rather than
// brighter, so it does not cross CONTRAST_LUMINANCE_CEILING either way (see
// task-14c-report.md's fix-round-2 section for the measured proof). This
// structural check is the direct, mechanical guard: it fails the instant
// the DOM order regresses, independent of what shade of dim the images
// happen to render as.
//
// p0-remove-motion: the plate stack used to carry a third layer,
// `.plate-motion` (a scroll-scrubbed video baked from a zoompan drift),
// which this test also asserted always painted last. The owner asked for
// every zoom removed — the video's entire content was zoom — so Plate.tsx
// no longer renders it at all; the assertion below is scoped back down to
// the two stills it originally guarded.
test("every plate paints the dark layer beneath the lit one", async ({ page }) => {
  await page.goto("/");
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll(".plate")]
      .map((plate, i) => {
        const layers = [...plate.querySelectorAll("img")];
        const dark = layers.findIndex((n) => n.classList.contains("plate-dark"));
        const lit = layers.findIndex((n) => n.classList.contains("plate-lit"));
        const darkAfterLit = dark > -1 && lit > -1 && dark > lit;
        return darkAfterLit ? i : -1;
      })
      .filter((i) => i > -1),
  );
  // Both stills are position:absolute with no z-index, so document order IS
  // paint order. Dark must come first or it covers the lamp's reveal
  // entirely — the exact bug this task's second pass existed to fix.
  expect(broken).toEqual([]);
});

// The behavioural counterpart to the structural check above: proves the
// reveal is actually *visible*, not just correctly ordered in the DOM, so
// this survives a refactor that changes how the layering is achieved (e.g.
// a future z-index-based approach). Uses `warden`'s plate (Wright of
// Derby's "An Iron Forge") because its subject — a white-hot ingot on the
// anvil — is the single brightest, most unambiguous light source in the
// set, giving the biggest possible signal for this measurement.
//
// Round 1 fix (p12-copy review): this test used to sample the literal
// `--lamp-x`/`--lamp-y` point after only a 250ms wait. Two compounding
// problems, root-caused with ad hoc Playwright/sharp probes (not committed):
// (1) that point sits inside Warden's `Exhibit` — a real `<figure>` with an
// opaque `bg-ground` chamber that is deliberately never masked by the lamp
// (Exhibit.tsx's doc comment: "the lamp dramatizes the record, it does not
// gate it"), so at steady state the literal lamp coordinate reads as dark
// as the far corner regardless of any content change — averaging a bigger
// centred patch doesn't help, because the exhibit's own footprint (~670px
// wide) swallows it. (2) at only 250ms, `.scrim > *`'s one-shot reveal fade
// (globals.css, 0.7s + up to 0.24s per-child stagger, capped at
// `:nth-child(5)`) is still mid-transition, so the exhibit figure — however
// many scrim children now precede it — is caught partway from transparent
// to opaque; that transient state, not the painting, is what the old
// 250ms/21x-margin measurement actually captured, and it silently flips
// whenever a scrim gains or loses a child ahead of the figure (as the P12
// kicker did) and shifts which `:nth-child` stagger the figure inherits.
// Fixed on both axes: wait out the full transition before sampling (below),
// and sample beside the exhibit's real on-screen bounds — clear of its
// opaque chamber, on the open plate the lamp actually reveals — rather than
// a single raw mask-percentage point. Falls back to the old centre-based
// point if a future redesign removes the figure.
test("the lamp's reveal pool is measurably brighter than the frame's far edge", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

  const act = page.locator("#warden");
  await act.scrollIntoViewIfNeeded();
  // Let Lamp.tsx's rAF loop write fresh --lamp-x/--lamp-y/--p for the new
  // scroll position, AND let every `.scrim > *` opacity/transform
  // transition fully settle (0.7s duration + up to 0.24s stagger, see
  // globals.css) before sampling — sampling mid-transition is what made
  // this test flip on an unrelated copy change (see comment above).
  await page.waitForTimeout(1100);

  const viewport = page.viewportSize()!;
  // --lamp-x/--lamp-y are percentages of the act's own box (mask-image
  // position resolves against the element it's applied to, which fills the
  // act via inset: 0), so the on-screen point is the act's rect plus that
  // fraction — not a fraction of the viewport.
  const geometry = await act.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      lampX: parseFloat(style.getPropertyValue("--lamp-x")),
      lampY: parseFloat(style.getPropertyValue("--lamp-y")),
    };
  });

  const centerX = geometry.left + (geometry.lampX / 100) * geometry.width;
  const centerY = geometry.top + (geometry.lampY / 100) * geometry.height;

  // Sample offset from the literal lamp point, not the point itself: the
  // literal point sits inside Warden's exhibit figure (a real opaque
  // `bg-ground` chamber, deliberately never masked by the lamp — see
  // Exhibit.tsx's doc comment), so it reads dark regardless of whether the
  // reveal is working. (85, 20) with a wide 160px averaging patch was
  // chosen empirically, break-and-restore verified against this exact
  // build: with the lamp mask genuinely disabled (`.plate-lit` forced to
  // the same unmasked `brightness(0.38)` ambient floor as `.plate-dark`,
  // simulating a fully broken reveal), this point
  // reads only ~2.5x the far corner — comfortably under `REVEAL_MARGIN`
  // below — while the real, working build reads ~13x, a >2x margin clear
  // on both sides of the threshold. A point closer to the
  // exhibit's edge (e.g. immediately beside it) lands on the plate's single
  // brightest highlight and stays bright even with the reveal disabled,
  // which silently defeated an earlier version of this fix — this offset
  // and patch size were picked specifically to avoid that trap.
  const sampleX = centerX + 85;
  const sampleY = centerY + 20;

  // Far edge: the on-screen corner farthest from the sample point above.
  // Restricted to the right-hand corners because the lamp's rest position
  // is deliberately biased right of the text column on wide screens
  // (Lamp.tsx: `restX = max(0.52, rawX)`), and the left-hand corners sit
  // under the scrim's protected band — sampling there would measure the
  // scrim's own gradient, not the plate.
  const corners = [
    { x: viewport.width - 16, y: 16 },
    { x: viewport.width - 16, y: viewport.height - 16 },
  ];
  const farCorner = corners.reduce((best, c) => {
    const d = (c.x - sampleX) ** 2 + (c.y - sampleY) ** 2;
    const bestD = (best.x - sampleX) ** 2 + (best.y - sampleY) ** 2;
    return d > bestD ? c : best;
  });

  // The lit patch is wide (160px, not 48) specifically to average across
  // the exhibit's edge rather than land in either the exhibit's chamber or
  // the plate's single hottest highlight — see the comment above `sampleX`.
  // The corner patch stays small: the far corner has no analogous edge to
  // average across, and a small patch keeps that reading a tight measure
  // of the frame's actual dark floor.
  const litPatch = 160;
  const edgePatch = 48;
  const clamp = (v: number, patch: number, max: number) =>
    Math.min(Math.max(v, 0), max - patch);

  const litClip = {
    x: clamp(sampleX - litPatch / 2, litPatch, viewport.width),
    y: clamp(sampleY - litPatch / 2, litPatch, viewport.height),
    width: litPatch,
    height: litPatch,
  };
  const edgeClip = {
    x: clamp(farCorner.x - edgePatch / 2, edgePatch, viewport.width),
    y: clamp(farCorner.y - edgePatch / 2, edgePatch, viewport.height),
    width: edgePatch,
    height: edgePatch,
  };

  const litBuf = await page.screenshot({ clip: litClip });
  const edgeBuf = await page.screenshot({ clip: edgeClip });

  const litLum = luminance(
    (await sharp(litBuf).stats()).channels.map((c) => c.mean),
  );
  const edgeLum = luminance(
    (await sharp(edgeBuf).stats()).channels.map((c) => c.mean),
  );

  const REVEAL_MARGIN = 6;
  expect(
    litLum,
    `lamp pool (L=${litLum.toFixed(4)}) is not at least ${REVEAL_MARGIN}x brighter than the frame's far edge (L=${edgeLum.toFixed(4)}) — the reveal may not be visible`,
  ).toBeGreaterThan(edgeLum * REVEAL_MARGIN);
});

// ── No-black-viewport guard ─────────────────────────────────────────────
// P1 floor lock (audit prompt pack): the published audit claimed "100%
// pure black" viewports on a no-pointer scroll through the page. A probe
// against the real build (context.md's own measured baseline, reproduced
// again here as this test's own thresholds) disproved that — no black
// viewport exists anywhere on either tested viewport — but nothing before
// this test locked that fact into CI, so a future change could silently
// regress it (e.g. dropping `[data-lamp="on"] .plate-dark`'s floor back to
// its pre-P1 value, or lower) without any gate noticing. This is that
// lock: a deliberately conservative floor set well under the measured
// baseline (6% mean / 0.5% bright-pixel share vs. a measured worst case of
// ~9%/3.5% desktop, ~9.4%/5.6% mobile — see the P1 floor report for the
// full per-step table), so it fails a genuine regression with real margin
// rather than flapping on ordinary rendering variance.
//
// Deliberately no pointer movement anywhere in this test (the entire point
// — an idle-pointer scroll is the reading pattern most likely to hit a
// void, since the torch's own dimming wash never engages) and a screenshot
// taken every 700px rather than once per act, so a dead band that doesn't
// happen to land on an act's own contrast-gate sample point (the
// statement, or a `.prose-field` row) still gets caught.
//
// Two greyscale measures per step, both required: mean luminance (a
// uniformly grey-but-non-black frame could still read as "void" to a
// reader) and the fraction of pixels above mid-grey (a frame that's mostly
// nearly-black with one bright corner could pass a mean-luminance-only
// check while still reading as void everywhere else) — text or a lit
// patch of paint has to be genuinely present, not just averaged in.
//
// Break-and-restore, documented in full in the P1 floor report: the
// brief that produced this test named a specific break —
// `[data-lamp="on"] .plate-dark` set to `brightness(0.05)` — and expected
// it to fail both assertions. Tried it, rebuilt, measured: it does NOT
// fail either one, on either viewport (desktop worst case moved from
// L=9.06%/3.46% to L=8.37%/3.13% — a real, measured drop, but nowhere
// near either floor). Root cause, measured directly: `.plate-dark` is
// only ever the UNMASKED region of a plate — the nav bar, every act's own
// `.label`, `.statement`, and body copy are un-gated by this filter
// entirely, and that bone-on-ground text alone already clears both floors
// with wide margin at every single scroll step, painting or no painting.
// This is not a defect in the test: it correctly proves the thing the
// published audit's "100% pure black" claim actually needed to be false —
// text is unconditionally present at every scroll position (nothing on
// this page waits for a scroll-triggered reveal before rendering; see the
// reveal-model verification in the P1 floor report) — but it does mean
// these two floors are a "the page is never textless-and-paintless" guard
// foremost, not a `.plate-dark`-brightness regression guard specifically.
// Confirmed the gate is not vacuous with a second, combined break: the
// same `brightness(0.05)` plate PLUS every `.statement`/`.label`/
// `.prose-field`/`dd`/`dt`/`p` forced to `opacity: 0` (simulating "the
// copy reveal never fires" on top of a near-black plate) fails the mean-
// luminance assertion at several steps on both viewports (worst: desktop
// L=5.25% at y=2800, mobile L=4.88% at y=11900 — both genuinely under the
// 6% floor). Restored both breaks and rebuilt — passes again on both
// viewports. Reported, not tuned around: see the P1 floor report for the
// full negative-result writeup rather than silently swapping in a break
// that "worked."
const NO_VOID_MEAN_LUMINANCE_FLOOR = 0.06;
const NO_VOID_BRIGHT_PIXEL_SHARE_FLOOR = 0.005;
const NO_VOID_STEP_PX = 700;
const NO_VOID_SETTLE_MS = 350;

async function assertNoVoidAcrossScroll(
  page: import("@playwright/test").Page,
  viewportLabel: string,
) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  // Never moves the pointer for the rest of this test — see the comment
  // above: an idle-pointer scroll is exactly the reading pattern this
  // guard exists to check, and moving the pointer would arm the torch,
  // which only ever adds MORE light (never a hidden risk of less — see
  // task-14d-report.md's contrast-ratio-under-dimming analysis), masking
  // the one thing this test is supposed to catch.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = page.viewportSize()!.height;

  for (let y = 0; y < height; y += NO_VOID_STEP_PX) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    // Lazy-decoded AVIFs need a beat to settle before a screenshot
    // reflects the real, settled frame.
    await page.waitForTimeout(NO_VOID_SETTLE_MS);

    const buf = await page.screenshot();
    const { data } = await sharp(buf).greyscale().raw().toBuffer({
      resolveWithObject: true,
    });
    let sum = 0;
    let bright = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      if (data[i] > 128) bright += 1;
    }
    const meanLum = sum / data.length / 255;
    const brightShare = bright / data.length;

    expect(
      meanLum,
      `${viewportLabel} y=${y}: mean luminance ${(meanLum * 100).toFixed(2)}% is below the ${(NO_VOID_MEAN_LUMINANCE_FLOOR * 100).toFixed(0)}% no-void floor — this viewport reads as void`,
    ).toBeGreaterThanOrEqual(NO_VOID_MEAN_LUMINANCE_FLOOR);
    expect(
      brightShare,
      `${viewportLabel} y=${y}: only ${(brightShare * 100).toFixed(2)}% of pixels clear mid-grey (need ${(NO_VOID_BRIGHT_PIXEL_SHARE_FLOOR * 100).toFixed(1)}%) — no text or lit paint appears present`,
    ).toBeGreaterThanOrEqual(NO_VOID_BRIGHT_PIXEL_SHARE_FLOOR);
  }

  // Sanity: the loop above ran at least once and actually reached the
  // bottom of the page, not just the first viewport-height.
  expect(height).toBeGreaterThan(viewportHeight);
}

test("no viewport goes void on an idle-pointer scroll — 1440x900", async ({
  page,
}) => {
  await desktopAt(page, { width: 1440, height: 900 });
  await assertNoVoidAcrossScroll(page, "desktop 1440x900");
});

// E3 (final fix wave): this used to resize the default desktop `page`
// fixture to a phone's CSS pixel dimensions rather than using a genuine
// touch/mobile context — a real phone reports `(pointer: coarse)`/
// `(hover: none)`, which this resized-desktop context never did, leaving
// the torch just as eligible to arm here as on an actual desktop, even
// though this test's own no-pointer-movement design (see the comment
// inside `assertNoVoidAcrossScroll`) means the torch was never actually
// armed by anything this test itself does. Switched to `mobileContext`
// for a faithful phone emulation regardless — see the implementer's
// report for the before/after floor numbers.
test("no viewport goes void on an idle-pointer scroll — 390x844", async ({
  browser,
}) => {
  const ctx = await mobileContext(browser);
  const page = await ctx.newPage();
  await assertNoVoidAcrossScroll(page, "mobile 390x844");
  await ctx.close();
});

for (const id of ACTS) {
  test(`text in act ${id} clears AA contrast behind its statement`, async ({
    page,
  }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    const statement = act.locator(".statement").first();
    await statement.scrollIntoViewIfNeeded();
    // The copy fades in on first arrival (Task 14c) — wait for the beat to
    // resolve fully before sampling, or the mid-transition, partially
    // transparent glyphs make this measurement noisy and occasionally
    // spike well above the settled value.
    await expect(statement).toHaveCSS("opacity", "1");

    const box = await statement.boundingBox();
    expect(box, `act ${id} has no statement to sample`).not.toBeNull();

    const buf = await page.screenshot({ clip: box! });
    const { channels } = await sharp(buf).stats();
    const lum = luminance(channels.map((c) => c.mean));

    expect(
      lum,
      `act ${id} background too bright behind its statement (L=${lum.toFixed(3)})`,
    ).toBeLessThan(CONTRAST_LUMINANCE_CEILING);
  });
}

// Task 20 fix: none of the contrast gates above ever sample an act's OWN
// label (`Act.tsx`'s "ACT 0N — …" caption, bottom-left of every act) —
// they only ever look at `.statement` and `.prose-field`. That's how the
// ledger act's `.scrim::before` bleed (see globals.css's `#ledger .scrim
// ::before` fix) went undetected for as long as it did: on wide viewports,
// at every scroll position, it painted straight over the *research* act's
// label, and axe never saw it either — axe reads declared colours, not
// paint occlusion. This is a different kind of check than the luminance
// gates above (which measure "is the background too bright"): occlusion
// paints solid, opaque ground directly over the text, so the failure mode
// is "zero surviving glyph pixels anywhere in the box", not "the mean
// crept up". A mean-luminance check over the whole label box would be far
// too easy to pass even when fully occluded (most of a label's box is
// letter-spaced whitespace between glyphs, keeping the mean low either
// way) — so this asserts on a genuine per-pixel search for at least one
// surviving near-bone pixel instead.
//
// The selector is `#${id} > .label`, a direct child of the section — the
// act's own caption is the one `.label` element that isn't nested inside
// its `.scrim` content column (unlike, say, hero's role line or a rail
// caption), so this can't accidentally sample the wrong label.
//
// Break-and-restore (task-20-report.md has the full log): with the
// ledger's scrim bleed unclipped again (`#ledger .scrim::before { inset:
// -8vh -6vw }`, matching every other act), the research act's label
// region measured mean [8.5, 7.6, 10.5], max [17, 16, 18] — no channel
// anywhere in the box gets within 160 of bone (242, 237, 227), so this
// test fails there, correctly. Fixed, it measures mean [34.2, 32.7, 34.2],
// max [242, 237, 227] — a full-strength bone glyph pixel, well past the
// threshold below.
for (const id of ACTS) {
  test(`act ${id}'s own label is not occluded`, async ({ page }) => {
    await page.goto("/");
    const label = page.locator(`#${id} > .label`);
    await label.scrollIntoViewIfNeeded();
    await page.waitForTimeout(50);

    const box = await label.boundingBox();
    expect(box, `act ${id} has no own label to sample`).not.toBeNull();

    // `hasNearBonePixel` (./helpers, E4/E5, final fix wave) — the shared
    // per-pixel near-bone check this test originated (a comfortable margin
    // below full bone (242, 237, 227) and well above what the occluded
    // measurement above ever reached (17, 16, 18): anti-aliased glyph
    // edges won't hit full bone, but a real glyph's interior clears this
    // easily, and nothing this dark could be mistaken for one).
    const buf = await page.screenshot({ clip: box! });
    expect(
      await hasNearBonePixel(buf),
      `act ${id}'s own label has no near-bone pixel anywhere in its box — the text may be occluded`,
    ).toBe(true);
  });
}

// Task 20 fix: the two loops immediately below (and the ignite-contrast
// loop further down) both silently `return` when an act carries zero
// matching elements — a necessary escape hatch (hero has no
// `.prose-field`; several acts carry no `.ignite`), but it also means a
// change that quietly deleted every `.ignite` or every `.prose-field` on
// the page would leave both loops green with nothing actually checked —
// three of the eight ignite-contrast tests and one of the eight body-copy
// tests were already unreachable no-ops before this fix, silently. This
// test locks down which acts are SUPPOSED to carry each class, so a
// mismatch in either direction — present where it shouldn't be, missing
// where it should — fails loudly instead of a loop below going quiet.
const ACTS_WITH_IGNITE = ["hero", "warden", "scheduler", "plantpal"];
const ACTS_WITH_PROSE = ACTS.filter((id) => id !== "hero");

test("the declared set of acts carrying .ignite and .prose-field matches the built page", async ({
  page,
}) => {
  await page.goto("/");
  for (const id of ACTS) {
    const igniteCount = await page.locator(`#${id} .ignite`).count();
    const expectIgnite = ACTS_WITH_IGNITE.includes(id);
    expect(
      igniteCount > 0,
      `act ${id} ${expectIgnite ? "should" : "should not"} carry .ignite (found ${igniteCount})`,
    ).toBe(expectIgnite);

    const proseCount = await page.locator(`#${id} .prose-field`).count();
    const expectProse = ACTS_WITH_PROSE.includes(id);
    expect(
      proseCount > 0,
      `act ${id} ${expectProse ? "should" : "should not"} carry .prose-field (found ${proseCount})`,
    ).toBe(expectProse);
  }
});

// Task 14d fix round (finding 3, from the reviewer's own screenshot): the
// gate above only ever samples `.statement` — a heading, never what a
// visitor actually reads. The ledger act's reading text is a long body
// column (`.prose-field`, the archive list's description cells) the gate
// never looked at, so it passed while real body copy sat on the bright
// moonlit sky/river of `dovedale` at close to bone-on-light — measured
// directly, L=0.188 against the same 0.12 ceiling, before the fix below.
//
// Every act except hero carries at least one `.prose-field` element
// (hero has only the label/statement/stat rail — no body prose to
// sample). Each one is scrolled into view individually rather than
// relying on the statement's scroll position, since a long act's body
// copy does not all fit in one viewport alongside its heading.
for (const id of ACTS) {
  test(`body copy in act ${id} clears AA contrast`, async ({ page }) => {
    await page.goto("/");
    const act = page.locator(`#${id}`);
    const paras = act.locator(".prose-field");
    const count = await paras.count();
    if (count === 0) {
      // hero: no body prose exists to sample. Not a skip — there is
      // nothing this test could fail to check here.
      return;
    }
    for (let i = 0; i < count; i++) {
      const para = paras.nth(i);
      await para.scrollIntoViewIfNeeded();
      // The reveal fades the scrim's direct children; `.prose-field` sits
      // one level deeper inside the about act's grid, so wait on the
      // whole ancestor chain (./helpers) rather than on `para` alone.
      await expectRevealed(para);

      const box = await para.boundingBox();
      if (!box || box.width < 1 || box.height < 1) continue;

      const buf = await page.screenshot({ clip: box });
      const { channels } = await sharp(buf).stats();
      const lum = luminance(channels.map((c) => c.mean));

      expect(
        lum,
        `act ${id} body copy #${i} background too bright (L=${lum.toFixed(3)})`,
      ).toBeLessThan(CONTRAST_LUMINANCE_CEILING);
    }
  });
}

// Task 14d: the torch — a page-wide flashlight, unified with the plate lamp
// so the page never carries two uncorrelated light sources.
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

// Task 20 fix: `active` used to be a one-way latch — set on the first
// `pointermove` and never cleared — so a reader who nudged the mouse once
// and then read the rest of the page by wheel or keyboard scroll spent the
// whole rest of the visit under the torch's dimming wash, with the lit
// pool frozen wherever the cursor last stopped (bone dropped from ~17:1 to
// ~8.8:1 and ember from ~9:1 to ~5.7:1, page-wide). Torch.tsx now clears
// `active` after a short pointer-idle timeout and fades the beam back out
// over the existing 0.6s opacity transition. This waits past that timeout
// with no further pointer movement — no wheel, no keyboard, nothing —
// exactly the scenario the finding reported, and asserts both halves of
// the fix: `data-torch` is gone, AND — the part that actually matters to a
// reader — the plate's unlit floor drops back to its un-torched value
// rather than staying raised at the torch's brighter compound filter.
test("the torch fades back out after the pointer goes idle", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300); // let startup settle, as elsewhere in this file

  const plateDark = page.locator(".plate-dark").first();
  const baseFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);

  await page.mouse.move(700, 450, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });
  const armedFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  expect(armedFilter, "arming the torch must actually change the filter").not.toBe(
    baseFilter,
  );

  // Past the idle timeout plus the fade transition, comfortably, not to a
  // hair's width — with no pointer movement at all in between.
  await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on", {
    timeout: 4000,
  });
  await expect(page.locator(".torch")).toHaveCSS("opacity", "0");

  const idleFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  expect(
    idleFilter,
    "the plate's unlit floor must drop back once the torch disarms, not stay raised",
  ).toBe(baseFilter);
});

test("the torch re-arms on the next real pointer move after going idle", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(300); // let startup settle, as elsewhere in this file
  await page.mouse.move(700, 450, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on", {
    timeout: 4000,
  });

  await page.mouse.move(300, 300, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });
});

// Important 6 fix round: the original version of this loop never moved the
// pointer, and `data-torch="on"` is only ever set inside Torch.tsx's
// `onPointer` handler — so the assertion held in every context it ran in,
// including a plain desktop one with a fully working torch, because
// nothing here ever gave the torch a chance to arm. Deleting Torch.tsx's
// `reduce.matches || hover.matches` early-return left this test green.
// `page.mouse.move` gives every context a real chance to arm the torch;
// the three contexts below must still suppress it — reduced motion and
// no-JS never run Torch.tsx at all, and Playwright's touch emulation
// reports `(hover: none)`, which Torch.tsx's own guard checks.
test("the torch stays off for touch, reduced motion, and no JS", async ({ browser }) => {
  for (const newCtx of [
    () => browser.newContext({ reducedMotion: "reduce" }),
    // The touch-emulation entry, via the shared factory (E1/E2/E3, final
    // fix wave) rather than a third inline copy of the same options.
    () => mobileContext(browser),
    () => browser.newContext({ javaScriptEnabled: false }),
  ]) {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    await page.goto("/");
    await page.mouse.move(400, 400, { steps: 5 });
    await page.waitForTimeout(200);
    await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on");
    // Content is readable regardless.
    await expect(page.locator(".statement").first()).toBeVisible();
    await ctx.close();
  }
});

// Regression guard: both attributes land on <html> (Lamp.tsx sets
// data-lamp, Torch.tsx sets data-torch), so the rebalance rule MUST be a
// compound selector (`[data-torch="on"][data-lamp="on"]`) rather than a
// descendant combinator (`[data-torch="on"] [data-lamp="on"]`) — a
// descendant combinator requires data-lamp on a different element nested
// inside one carrying data-torch, and html has no ancestor, so it can
// never match. No existing test caught this because none of them move
// the pointer, which is the only thing that arms the torch.
test("the plate's unlit floor rises once the torch arms", async ({
  page,
}) => {
  await page.goto("/");
  // Let startup cost (hydration, image decode) settle before interacting.
  // Torch.tsx shares Lamp.tsx's frame-budget circuit breaker
  // (src/lib/motion.ts's createFrameBudgetGuard): a rolling window of the
  // last 60 frames, tripped once a clear majority run slower than 50ms.
  // Under heavy parallel-worker load, one-time page-load jank can still
  // fill enough of that window to trip it before the pointer ever gets a
  // chance to move, which is a real characteristic of the shared
  // circuit-breaker shape, not something this test is trying to verify.
  // Settling first keeps that startup cost from being mistaken for "this
  // device can't hold the torch".
  await page.waitForTimeout(500);

  const plateDark = page.locator(".plate-dark").first();

  const baseFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  await expect(page.locator("html")).not.toHaveAttribute("data-torch", "on");

  await page.mouse.move(700, 450, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });

  const armedFilter = await plateDark.evaluate((el) => getComputedStyle(el).filter);
  expect(armedFilter).not.toBe(baseFilter);
});

// Critical 1 fix: `.ignite`'s CSS mask used to read `--lamp-x`/`--lamp-y`
// exactly like `.plate-lit` does, but those percentages resolve against
// the masked element's OWN box — correct for `.plate-lit` (which fills the
// act) and meaningless for a few-character-wide metric, whose ignition
// therefore tracked its own layout width, never the lamp. The two tests
// below prove the fix the way the task asked: a real metric's rendered
// colour, sampled with `getComputedStyle` and a pixel screenshot, changes
// as the lamp crosses it — not just that a class toggles with no visible
// effect.
//
// Deliberately scroll-only, no pointer: `--lamp-x` moves by a *smoothed*
// pointer term (`POINTER_LERP`, Lamp.tsx), which only reaches a given
// target after enough animation frames actually run. Under this suite's
// default parallelism that convergence is not guaranteed within any fixed
// wait — an earlier version of this test drove the lamp by computing a
// pointer position and waiting for it to arrive, and intermittently caught
// the lerp mid-flight (see task-17-report.md for the measured pattern).
// `--p` (scroll progress), by contrast, is read directly from
// `getBoundingClientRect()` every tick with no smoothing at all, so a
// given scroll position always produces the same lamp position on the
// first frame after it — deterministic, not just probabilistically likely.
//
// Break-and-restore: reverting `.ignite::after` to the original
// `mask-image` rule (and removing Lamp.tsx's per-element comparison) with
// these tests left in place fails the first one — the metric that should
// be lit never turns ember, because the mask centres on the metric's own
// ~90×32px box, not the lamp's actual, much larger position. See
// task-17-report.md for the captured failure output.

// `BreakerTripped`/`withBreakerRetry` now live in ./helpers (E1/E2/E3,
// final fix wave), imported above — this file's own copy (`withLampRetry`,
// a 5-attempt budget) and idle-stop.spec.ts's separate copy
// (`withRetry`, a 4-attempt budget) had already drifted from each other
// with no reason either number was more correct; one shared budget now.
// Raised to 5 originally during Task 20: "the torch and lamp survive a
// normal scroll through every act" (which retries its whole act-by-act
// loop through this helper, not just the initial arm) occasionally
// exhausted a smaller budget under this suite's own heaviest parallel
// load — it passed reliably every time run in isolation, confirming that
// was retry budget, not a logic defect.

/** The scheduler act's headline numbers (`dl.flex.flex-wrap`): three
 *  `.ignite` values in one row, at increasing x — "0" (far left), "45,432"
 *  (middle), and "p = 2.6×10⁻¹⁶" (the widest label, pushed furthest
 *  right by the two items ahead of it in the flex row). The lamp's rest
 *  x (`restX`, Lamp.tsx) sits at 52% of the act's width — 665.6px on a
 *  1280px-wide viewport — and only item 2's centre lands close enough to
 *  that (~553px, a 112.6px horizontal gap) to fall inside the lamp's
 *  radius once the act is scrolled to roughly its own mid-point, where the
 *  radius is largest (max 351.6px on this viewport).
 *
 *  Task 20 correction: an earlier version of this comment claimed only
 *  item 0 (far left, "0") never lights, on the reasoning that its
 *  distance from `restX` alone exceeds the radius's maximum. Measured
 *  directly against the built site (1280×720, this suite's default
 *  viewport), item 1 ("45,432") is unreachable the exact same way: its
 *  horizontal-only distance from the lamp's pixel x is ~365.4px, already
 *  past the 351.6px ceiling before any vertical component (which can only
 *  add, never subtract) is even considered — so it is unlit at every
 *  scroll position too, not just item 0. (This is a wide-viewport-only
 *  effect: at a narrow, ~390px viewport, `restX` and the row's layout both
 *  shift enough that all three items measure well inside the radius at
 *  some scroll position — nothing here contradicts the CRITICAL fix that
 *  dropped `.ignite` from the *benchmark chart's* values over in the
 *  research act, a fully separate element on wide viewports specifically.)
 *  Item 0 is still the right "never lit" reference for the pixel
 *  comparison below — it never lights either, just for the same reason as
 *  item 1 rather than a unique one — and item 2 is still the only one of
 *  the three that reliably differs from it. */
async function schedulerHeadlineNumbers(page: import("@playwright/test").Page) {
  const act = page.locator("#scheduler");
  return {
    act,
    // Item 0: the metric that should never ignite — the reference for
    // "still bone" in the pixel comparison.
    neverLit: act.locator(".ignite").nth(0),
    // Item 2: the metric this pair of tests exercises.
    metric: act.locator(".ignite").nth(2),
  };
}

/** Scrolls so the scheduler act is not yet intersecting the viewport, but
 *  is still just inside the `10% 0px` `IntersectionObserver` margin
 *  Lamp.tsx uses to pre-arm acts — so it *is* in Lamp.tsx's `visible` set
 *  and genuinely being evaluated every tick, not simply never reached.
 *  `--p`'s formula (`(vh - top) / (height + vh)`, clamped to `[0, 1]`)
 *  is negative before the act's top reaches the viewport's bottom edge,
 *  so it clamps to exactly `0` across that whole pre-entry range — not a
 *  single hair-trigger scroll offset, a wide, stable plateau, confirmed
 *  directly against the built site: every scroll position with the act's
 *  top 0–90px below the viewport bottom reads `--p: 0` and the metric
 *  unlit, byte-identical (`opacity: "0"`), not a near-miss float. */
async function scrollScheduerJustBeforeEntry(page: import("@playwright/test").Page) {
  const actTop = await page.evaluate(
    () => document.getElementById("scheduler")!.getBoundingClientRect().top + window.scrollY,
  );
  const vh = await page.evaluate(() => window.innerHeight);
  // Act's top lands 200px below the viewport's bottom edge — outside the
  // 10%-margin pre-arm zone (10% of a typical viewport is 65–90px).
  await page.evaluate(
    (y) => window.scrollTo(0, Math.max(0, y)),
    actTop - (vh + 200),
  );
}

test("a metric ignites as the lamp crosses it", async ({ page }) => {
  await withBreakerRetry(async () => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    const { neverLit, metric } = await schedulerHeadlineNumbers(page);
    const readState = (el: import("@playwright/test").Locator) =>
      el.evaluate((e) => ({
        lampOn: document.documentElement.getAttribute("data-lamp"),
        isLit: e.classList.contains("is-lit"),
        emberOpacity: getComputedStyle(e, "::after").opacity,
      }));

    // Before the act has ever been on screen: both metrics are stone-cold
    // — never observed, never evaluated, exactly the no-JS/reduced-motion
    // default (bone, `opacity: 0` on the ember layer).
    await scrollScheduerJustBeforeEntry(page);
    await page.waitForTimeout(300);
    const before = await readState(metric);
    if (before.lampOn !== "on") throw new BreakerTripped();
    expect(before.isLit, "metric should not be lit before the act has ever been in view").toBe(
      false,
    );
    expect(Number(before.emberOpacity)).toBeLessThan(0.05);

    // Scroll the act into its natural view — its own scroll progress
    // (`--p`) now sits mid-act, where the lamp's radius is largest and
    // the third headline number falls inside it.
    await metric.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const afterNeverLit = await readState(neverLit);
    const afterMetric = await readState(metric);
    if (afterMetric.lampOn !== "on") throw new BreakerTripped();
    expect(afterMetric.isLit, "metric should be lit once its act is scrolled into view").toBe(
      true,
    );
    await expect
      .poll(
        async () => {
          const state = await readState(metric);
          if (state.lampOn !== "on") throw new BreakerTripped();
          return Number(state.emberOpacity);
        },
        { timeout: 2_000 },
      )
      .toBeGreaterThan(0.9);
    expect(
      afterNeverLit.isLit,
      "the far-left metric should still be unlit at the same scroll position — it never enters the lamp's radius",
    ).toBe(false);

    // The rendered colour itself, not just the class or the opacity:
    // screenshot both metrics in the same frame and confirm the lit one
    // reads meaningfully more ember (red-heavy relative to blue) than the
    // one that never ignites — a spatial comparison, not a before/after
    // of one element, so it needs no particular lerp state to be
    // meaningful; both are sampled at the exact same instant.
    const sample = async (el: import("@playwright/test").Locator) => {
      const box = (await el.boundingBox())!;
      const buf = await page.screenshot({ clip: box });
      const { channels } = await sharp(buf).stats();
      return channels.map((c) => c.mean); // [R, G, B]
    };
    const [litR, , litB] = await sample(metric);
    const [darkR, , darkB] = await sample(neverLit);
    const litGap = litR - litB;
    const darkGap = darkR - darkB;
    expect(
      litGap,
      `lit metric's rendered colour is not meaningfully more ember than the never-lit one (lit R-B=${litGap.toFixed(1)}, never-lit R-B=${darkGap.toFixed(1)})`,
    ).toBeGreaterThan(darkGap + 15);
  });
});

// The reverse direction: the same element, scrolled back out. Its own
// test (a fresh page) rather than a third scroll tacked onto the one
// above, matching the shape "the plate's unlit floor rises once the
// torch arms" already uses — keeps each test's own retry loop cheap.
test("a metric fades back to bone once the lamp leaves it", async ({ page }) => {
  await withBreakerRetry(async () => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    const { metric } = await schedulerHeadlineNumbers(page);
    const readState = () =>
      metric.evaluate((el) => ({
        lampOn: document.documentElement.getAttribute("data-lamp"),
        isLit: el.classList.contains("is-lit"),
        emberOpacity: getComputedStyle(el, "::after").opacity,
      }));

    await metric.scrollIntoViewIfNeeded();
    await expect
      .poll(
        async () => {
          const state = await readState();
          if (state.lampOn !== "on") throw new BreakerTripped();
          return state.isLit;
        },
        { timeout: 2_000 },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          const state = await readState();
          if (state.lampOn !== "on") throw new BreakerTripped();
          return Number(state.emberOpacity);
        },
        { timeout: 2_000 },
      )
      .toBeGreaterThan(0.9);

    // Scroll back to just before the act enters — the lamp moves off the
    // metric (in fact, the act itself leaves Lamp.tsx's tracked `visible`
    // set for a moment on the way past, then re-enters at `--p: 0`, which
    // is genuinely the pre-entry state, not a frozen leftover of the lit
    // one).
    await scrollScheduerJustBeforeEntry(page);
    await expect
      .poll(
        async () => {
          const state = await readState();
          if (state.lampOn !== "on") throw new BreakerTripped();
          return state.isLit;
        },
        {
          timeout: 2_000,
          message: "metric should fade back to bone once the lamp scrolls away from it",
        },
      )
      .toBe(false);
    await expect
      .poll(
        async () => {
          const state = await readState();
          if (state.lampOn !== "on") throw new BreakerTripped();
          return Number(state.emberOpacity);
        },
        { timeout: 2_000 },
      )
      .toBeLessThan(0.05);
  });
});

// Important 3 fix, amended Task 20: the contrast gate above only ever
// sampled `.statement` and `.prose-field` — never `.ignite`, the one
// colour on the site with the least contrast headroom. The original
// version of this gate (superseded below) compared a glyph+background
// MEAN against a threshold derived as a pure BACKGROUND ceiling — two
// different quantities wearing one number. That happened to work almost
// everywhere except a heavy number: Warden's "0–100" sits on a background
// measuring L=0.0020 (9.36:1 against ground — essentially a perfect
// background) yet the old glyph+background mix measured 0.0401–0.0480,
// 69–83% of the old 0.058 ceiling, purely from ink coverage. A heavier
// number could fail that gate behind a flawless background; a lighter one
// could pass it behind a mediocre one — the gate was measuring how much
// of the box was covered in ink, not how bright the paint behind the text
// was.
//
// Task 20 fix: mask the glyph out of the sample (the metric element is
// set `visibility: hidden` for one screenshot — that removes both the
// bone base text and the ember pseudo-element without moving anything,
// unlike `display: none`, which would also collapse the layout the
// already-read box coordinates depend on) for a genuine background-only
// sample, then compute the real WCAG ratio against the actual
// `--color-ember` token (`ratio()`/`EMBER`, the same helper this file
// already uses for the palette check) instead of a second, indirect
// luminance-ceiling derivation tuned to one "typical" glyph weight. That
// is the correct WCAG shape in the first place — a declared foreground
// colour against a measured background — and it sidesteps a rabbit hole
// two earlier versions of this fix went down trying to also reconstruct
// "the real rendered ink colour" from screenshot pixels (first the single
// brightest pixel, then a gain-weighted average of every pixel): both
// failed on real metrics for reasons that turned out to be about
// screenshot anti-aliasing, not accessibility — a small glyph (Warden's
// single-digit "6") never puts a fully-saturated colour in any individual
// pixel at all, so hunting for "the true ink colour" pixel-by-pixel
// chases a moving target that has nothing to do with whether a reader can
// actually read the number. `getComputedStyle` reads the CSS engine's own
// resolved colour directly — no anti-aliasing involved — which is exactly
// what EMBER already stands in for here.
//
// A background-only comparison alone can't tell "ember doesn't render
// here" from "ember renders and is legible here" — both would pass the
// same token-vs-background check, since that check never looks at
// whether anything actually painted. The second assertion below is a
// sanity check for exactly that — but NOT a pixel one: an earlier version
// compared the lit screenshot's mean luminance against the masked one,
// which chased the same anti-aliasing noise floor the glyph-colour
// attempts above did (a short digit's genuine contribution to a WHOLE-BOX
// mean is tiny — measured well under 0.001 on some real, correctly-
// rendering metrics — and, under this suite's own heavy parallel load, a
// mid-test frame-budget-breaker trip could occasionally make it read as
// exactly zero). `getComputedStyle` reads the CSS engine's own resolved
// `opacity`, not a screenshot — no anti-aliasing, no paint-to-paint
// jitter between two captures, and it directly answers the one question
// that matters here: is the ember layer's opacity actually 1 right now.
//
// The spec's amended ruling (docs/superpowers/specs/…, "Ruling on the
// spec's ember number") makes AA's 4.5:1 the binding number the gate
// enforces — 7.6:1 was the pure-ember-on-pure-ground reference figure,
// not an achievable per-act one once a painting sits behind the text.
const EMBER_AA_MIN = 4.5;

/** Reads `metric`'s ember pseudo-element's resolved opacity, then
 *  screenshots the box once with the glyph masked out via `visibility:
 *  hidden` (layout-preserving, unlike `display: none`, so the box
 *  coordinates already read stay valid) for a genuine background-only
 *  sample. Returns the WCAG ratio between the real `--color-ember` token
 *  and that measured background, plus the resolved opacity a caller can
 *  use as a "something actually rendered" sanity check (see the comment
 *  above). `null` for a zero-size box (nothing to sample), the same
 *  escape hatch the rest of this file's per-element loops use. */
async function sampleIgniteContrast(
  page: import("@playwright/test").Page,
  metric: import("@playwright/test").Locator,
) {
  await metric.scrollIntoViewIfNeeded();
  const box = await metric.boundingBox();
  if (!box || box.width < 1 || box.height < 1) return null;

  const afterOpacity = await metric.evaluate(
    (el) => getComputedStyle(el, "::after").opacity,
  );

  await metric.evaluate((el) => {
    (el as HTMLElement).style.visibility = "hidden";
  });
  const bgBuf = await page.screenshot({ clip: box });
  await metric.evaluate((el) => {
    (el as HTMLElement).style.visibility = "";
  });

  const bg = (await sharp(bgBuf).stats()).channels.map((c) => c.mean);

  return {
    tokenRatio: ratio(EMBER, bg),
    afterOpacity,
  };
}

const FORCE_IGNITE_ATTR = "data-force-lit-test";

/** Forces `metric`'s ember pseudo-element to full opacity via a scoped,
 *  `!important` style rule keyed to a unique attribute — not
 *  `classList.add("is-lit")` alone, which Lamp.tsx's still-running rAF
 *  loop immediately reverts on the next tick for any element its own
 *  geometry check says isn't actually lit (see the call site's comment).
 *  The injected `<style>` element is reused across calls (idempotent to
 *  insert twice), only the attribute moves. Pair with `unforceIgnite`. */
async function forceIgnite(
  page: import("@playwright/test").Page,
  metric: import("@playwright/test").Locator,
) {
  await metric.evaluate((el, attr) => {
    if (!document.querySelector(`style[${attr}-style]`)) {
      const style = document.createElement("style");
      style.setAttribute(`${attr}-style`, "");
      style.textContent = `[${attr}]::after { opacity: 1 !important; }`;
      document.head.appendChild(style);
    }
    el.setAttribute(attr, "");
  }, FORCE_IGNITE_ATTR);
  // The pseudo-element's own opacity transition (240ms, globals.css)
  // still has to run before a screenshot reflects the forced state.
  await page.waitForTimeout(300);
}

/** Removes the force applied by `forceIgnite`, leaving the style element
 *  in place (harmless, and saves re-inserting it for the next metric). */
async function unforceIgnite(page: import("@playwright/test").Page) {
  await page.evaluate((attr) => {
    document.querySelector(`[${attr}]`)?.removeAttribute(attr);
  }, FORCE_IGNITE_ATTR);
}

/** Runs `sampleIgniteContrast` and asserts on what it returns: the ember
 *  pseudo-element's resolved opacity must actually be 1 (proof something
 *  is genuinely rendering, so a passing token ratio can't be vacuous —
 *  see the comment above EMBER_AA_MIN), and the real ember-token-vs-
 *  background WCAG ratio must clear EMBER_AA_MIN. Shared by the with-JS
 *  (armed-torch) pass and the reduced-motion pass below — the only
 *  difference between them is what state the page is in when `metric` is
 *  sampled. */
async function expectIgniteClearsAA(
  page: import("@playwright/test").Page,
  metric: import("@playwright/test").Locator,
  label: string,
) {
  const sample = await sampleIgniteContrast(page, metric);
  if (!sample) return;
  expect(
    sample.afterOpacity,
    `${label}: the ember pseudo-element's resolved opacity is ${sample.afterOpacity}, not 1 — nothing is actually rendering here`,
  ).toBe("1");
  expect(
    sample.tokenRatio,
    `${label}: ember token vs measured background is ${sample.tokenRatio.toFixed(2)}:1, need ≥${EMBER_AA_MIN}:1`,
  ).toBeGreaterThanOrEqual(EMBER_AA_MIN);
}

/** Navigates fresh and arms the torch — the worst-case brightness *while
 *  the lamp effect is running*: `.plate-dark`'s filter rises from
 *  brightness(0.38) to brightness(0.65) once
 *  `[data-torch="on"][data-lamp="on"]` (globals.css; P1 floor lock
 *  re-derived both values from the pre-existing 0.32/0.56 pair — see the
 *  comment on that rule in globals.css), the brightest the
 *  unlit floor ever gets in the with-JS, motion-on experience. Task 20
 *  fix: this is NOT the brightest background a `.ignite` element can ever
 *  sit on overall, as an earlier version of this comment claimed — that's
 *  the reduced-motion/no-JS default, covered by its own pass further
 *  down, where the mask never applies at all and `.plate-lit` renders
 *  completely unmasked at full native brightness. Both are real
 *  populations of readers and both are gated now; this one just isn't the
 *  absolute ceiling.
 *
 *  Retries via a fresh navigation (not another pointer move on the same
 *  page) up to 3 times: a fresh `page.goto` always starts a brand-new,
 *  un-latched frame-budget guard (src/lib/motion.ts), which sidesteps
 *  whatever tripped it rather than waiting out an in-session recovery
 *  that — after a second trip in the same session — no longer happens at
 *  all (`createFrameBudgetGuard`'s latch; see tests/motion.spec.ts). An
 *  earlier version of this comment claimed the opposite, that a page
 *  which already dropped `data-torch` "won't pick it back up" — recovery
 *  (the first time) is now the entire point of the breaker. */
async function gotoWithTorchArmed(page: import("@playwright/test").Page) {
  for (let i = 0; i < 3; i++) {
    await page.goto("/");
    await page.mouse.move(900, 500, { steps: 5 });
    try {
      await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
        timeout: 2000,
      });
      return;
    } catch (e) {
      if (i === 2) throw e;
    }
  }
}

test("ember contrast: arming the torch first", async ({ page }) => {
  await gotoWithTorchArmed(page);
});

// Regression guard: the reported bug. The old circuit breaker (an inline
// counter in both Torch.tsx and Lamp.tsx) counted 10 CONSECUTIVE rAF
// callbacks slower than 32ms and, once tripped, called teardown() —
// cancelling the rAF loop and removing every listener for the rest of the
// session. 32ms is under 31fps, and at the time this bug was reported the
// page also sought four scroll-scrubbed WebM clips while scrolling (since
// removed entirely in the zoom-removal pass, 2026-08-20 — see AGENTS.md/
// DESIGN.md); today's equivalent load is every plate decoding
// multi-megapixel AVIFs while scrolling, on top of a second rAF loop for
// the other component — completely ordinary scrolling reaches ten such
// frames trivially either way, and once it does, there is no path back: the
// torch (and the lamp) goes dark for the rest of the visit, exactly as the
// owner reported ("visible on the first page" and never again after
// scrolling).
//
// This test scrolls through every act the way a reader actually would —
// not a single scrollIntoViewIfNeeded — specifically to give that load a
// real chance to happen, then asserts the torch and lamp are BOTH still
// alive afterward. Confirmed this fails against the pre-fix breaker: with
// the old "10 consecutive frames > 32ms → teardown()" logic restored in
// Torch.tsx/Lamp.tsx, this test fails reliably under load, exactly
// reproducing the report; see task-18-report.md for the captured failing
// run. The fix (src/lib/motion.ts's createFrameBudgetGuard) is a
// rolling-window, hysteresis breaker that can suspend and recover — the
// first time; a second trip in the same session latches it, deliberately
// (see tests/motion.spec.ts's "latch" test) — not something this
// particular test is trying to exercise.
//
// Task 20: this test started failing once the torch's idle-disarm fix
// landed (`Torch.tsx`, same task) — measured directly, `data-torch` drops
// to absent right around t+2.1s into the act-by-act loop below, while
// `data-lamp` stays "on" throughout every run. That is the idle timeout
// firing correctly, not the frame-budget breaker: eight
// `scrollIntoViewIfNeeded` + 200ms waits, with no pointer movement at all
// in between, comfortably outlasts the torch's ~2s idle window — a real
// reader who scrolls without touching the mouse again is now supposed to
// read the rest of the page with the torch off, which is the entire point
// of that fix. This test's actual concern is the frame-budget breaker
// recovering from real decode/seek jank, not idle-disarm, so a small
// pointer nudge accompanies each act — enough to keep resetting the idle
// timer without doing anything close to the smoothing/positioning the
// dedicated torch-tracking tests above already cover.
test("the torch and lamp survive a normal scroll through every act", async ({
  page,
}) => {
  await withBreakerRetry(async () => {
    await gotoWithTorchArmed(page);
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    for (const id of ACTS) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      // Resets the torch's idle timer (Task 20) so this test measures the
      // frame-budget breaker, not idle-disarm — see the comment above.
      await page.mouse.move(600, 400, { steps: 2 });
      // A reader lingers on each act rather than teleporting through them
      // — long enough for the act's own AVIF-decode work (the load that
      // used to trip the old breaker) to actually happen.
      await page.waitForTimeout(200);
    }

    const torchOn = await page.locator("html").getAttribute("data-torch");
    const lampOn = await page.locator("html").getAttribute("data-lamp");
    if (torchOn !== "on" || lampOn !== "on") throw new BreakerTripped();

    await expect(page.locator(".torch")).toHaveCSS("opacity", "1");
  });
});

for (const id of ACTS) {
  test(`ignite metrics in act ${id} clear ember-appropriate AA contrast (armed torch)`, async ({
    page,
  }) => {
    // The whole body retries via a fresh navigation on a mid-test breaker
    // trip, the same reasoning "the torch and lamp survive a normal
    // scroll" above already applies: this loop's several screenshots per
    // metric take long enough, under this suite's own heavily parallel
    // load, that the frame-budget breaker can genuinely trip between the
    // initial arm and a later metric's sample — confirmed directly, with
    // `data-lamp` absent mid-loop reproducing byte-identical background
    // samples run over run, not noise. A dropped `data-lamp` mid-sample
    // means this test is no longer measuring "while the lamp effect is
    // running" at all, so retrying (not adjusting a threshold) is the
    // correct response.
    await withBreakerRetry(async () => {
      // Arm the torch first — the worst-case brightness floor while the
      // lamp effect is running (see gotoWithTorchArmed above) — before
      // scrolling to and sampling this act.
      await gotoWithTorchArmed(page);

      const act = page.locator(`#${id}`);
      const metrics = act.locator(".ignite");
      const count = await metrics.count();
      if (count === 0) {
        // Declared and enforced by "the declared set of acts carrying
        // .ignite and .prose-field" above — about, research, ledger, and
        // contact carry no `.ignite` metric, so there is nothing this
        // test could fail to check here.
        return;
      }
      for (let i = 0; i < count; i++) {
        if ((await page.locator("html").getAttribute("data-lamp")) !== "on") {
          throw new BreakerTripped();
        }
        const metric = metrics.nth(i);
        // Force the lit state rather than trusting whatever the lamp's
        // real scroll/pointer position happens to produce at this
        // instant. The point of this gate is "when this metric IS
        // rendering ember, is it still readable" — not "did the lamp
        // happen to reach it during this particular test run", which
        // several metrics on wide viewports never do at all (see the
        // CRITICAL fix that dropped `.ignite` from the benchmark chart's
        // values, and the reconciled comment on `schedulerHeadlineNumbers`
        // above).
        //
        // Setting `.is-lit` via `classList.add` alone does not survive:
        // Lamp.tsx's rAF loop is still running and re-evaluates every
        // visible act's `.ignite` elements every frame, immediately
        // toggling `.is-lit` back off on the very next tick for any
        // metric the lamp's real geometry doesn't actually reach — an
        // earlier version of this test did exactly that and failed on
        // every project act's item 0 with glyphRatio ≈ 1.0 (i.e. "found
        // no ink at all"), because it was sampling right after Lamp.tsx
        // undid the forced class. A scoped `!important` style survives
        // the ongoing toggle regardless of which class is present.
        await forceIgnite(page, metric);
        await expectIgniteClearsAA(page, metric, `act ${id} ignite metric #${i}`);
        await unforceIgnite(page);
      }
    });
  });
}

// Task 20 fix: the pass above (armed torch) is the worst case *while the
// lamp effect is running* — it is not the brightest a `.ignite`
// element's background can ever get overall, despite an earlier version
// of this file's own comment claiming exactly that. That honour goes to
// the reduced-motion (and, identically for this purpose, no-JS) default:
// `data-lamp` is never set, so `[data-lamp="on"] .plate-lit`'s mask CSS
// never applies at all and the full-brightness still renders completely
// unmasked — no dimmed floor anywhere in the frame — while
// `.ignite::after`'s own base rule (unconditional, un-gated on
// `data-lamp`) renders ember at full opacity with no scroll or pointer
// involved at all. No earlier version of this suite measured contrast in
// this state; this is that test. The reviewer's own manual measurement
// here (task-20-report.md) found AA holds regardless — ember-vs-
// background ranged 6.90:1–9.32:1 and real glyph-vs-background 4.94:1–
// 11.72:1 across every `.ignite` element on the page — so this is about
// making the gate measure what it claims to measure, not chasing a live
// failure.
for (const id of ACTS) {
  test(`ignite metrics in act ${id} clear ember-appropriate AA contrast (reduced motion)`, async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");

    const act = page.locator(`#${id}`);
    const metrics = act.locator(".ignite");
    const count = await metrics.count();
    if (count === 0) {
      await ctx.close();
      return;
    }
    for (let i = 0; i < count; i++) {
      await expectIgniteClearsAA(
        page,
        metrics.nth(i),
        `act ${id} ignite metric #${i} (reduced motion)`,
      );
    }
    await ctx.close();
  });
}

// P8 review fix: the ledger's certificate lightbox (CertificateLightbox.tsx)
// shipped with no automated coverage of its focus contract or its
// "full-res loads only on open" claim, despite the brief requiring both.
// These tests exercise the Azure Fundamentals certification row — the
// leading entry in `leadCertifications`, so it's the first thumbnail
// trigger in document order and needs no extra scrolling to reach.
const AZURE_TRIGGER_LABEL =
  'View the "Microsoft Certified: Azure Fundamentals" certificate scan';
const AZURE_SCAN_URL_RE = /\/certificates\/azure-fundamentals\.png$/;

test("the certificate lightbox opens focused, loads the full scan only on open, and Escape closes it with focus returned", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (r) => {
    if (AZURE_SCAN_URL_RE.test(r.url())) requested.push(r.url());
  });

  await page.goto("/");
  const trigger = page.getByRole("button", { name: AZURE_TRIGGER_LABEL });
  await trigger.scrollIntoViewIfNeeded();

  // The thumbnail (AVIF/WebP) is page-load cost; the full-res PNG must not
  // have been requested before the dialog opens.
  expect(requested).toEqual([]);

  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /Azure Fundamentals/i });
  await expect(dialog).toBeVisible();

  // Focus contract: focus moved inside the dialog, not left on the page
  // body or stranded on the trigger.
  const closeButton = dialog.getByRole("button", { name: "Close certificate" });
  await expect(closeButton).toBeFocused();

  // The full-res scan is only requested once the dialog is actually open.
  await expect(dialog.getByRole("img")).toBeVisible();
  expect(requested).toEqual([expect.stringMatching(AZURE_SCAN_URL_RE)]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // Escape must not have fired a second, redundant fetch of the scan.
  expect(requested).toHaveLength(1);
});

test("the certificate lightbox closes on a backdrop click and returns focus to the trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: AZURE_TRIGGER_LABEL });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /Azure Fundamentals/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img")).toBeVisible();

  // A click landing on the dialog's own ::backdrop resolves its target to
  // the dialog element itself — click near the viewport corner, well
  // outside the centred, size-capped dialog box.
  await page.mouse.click(2, 2);

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("axe: no violations on / with a certificate lightbox open", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: AZURE_TRIGGER_LABEL });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /Azure Fundamentals/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
