import { expect, test } from "@playwright/test";
import sharp from "sharp";

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
const CONTRAST_LUMINANCE_CEILING = 0.12;

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
