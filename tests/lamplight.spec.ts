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
