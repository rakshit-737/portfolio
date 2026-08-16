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
