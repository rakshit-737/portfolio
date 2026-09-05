import { expect, test, type Page } from "@playwright/test";
import { mobileContext } from "./helpers";

/**
 * The key and the lock — the night archive's cursor. Pure CSS: inline
 * data-URI SVGs under `(pointer: fine) and (hover: hover)` — a 40px
 * key (original artwork; the owner's downloaded Sweezy pack is
 * license-barred from redistribution, see the rulings doc) as the
 * default, the padlock it opens over anything clickable, with the
 * `auto`/`pointer` keywords as declared fallbacks (a browser that
 * refuses SVG cursors falls straight through to its native cursor; a
 * data URI has no request to 404). These tests pin the contracts: fine
 * pointers get key and lock (with hotspots and fallbacks declared),
 * text surfaces keep their I-beam, coarse pointers never see any of
 * it, and forced-colors users get their platform cursor back.
 */

const rootCursor = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).cursor);

test("fine pointers get the key, with hotspot and native fallback declared", async ({ page }) => {
  await page.goto("/");
  const cursor = await rootCursor(page);
  expect(cursor).toContain("data:image/svg+xml");
  // The hotspot pair and the trailing fallback keyword survive into the
  // computed value — losing either regresses to a mispointing or
  // fallback-less cursor.
  expect(cursor).toMatch(/5[\s\S]*5[\s\S]*auto/);
});

test("clickable surfaces show the lock; text keeps its I-beam", async ({ page }) => {
  await page.goto("/");
  const linkCursor = await page
    .locator("a")
    .first()
    .evaluate((el) => getComputedStyle(el).cursor);
  // The lock, not the key — and `pointer` declared as its fallback.
  expect(linkCursor).toContain("data:image/svg+xml");
  expect(linkCursor).toContain("pointer");
  expect(linkCursor).not.toBe(await rootCursor(page));
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
