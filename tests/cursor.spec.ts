import { expect, test, type Page } from "@playwright/test";
import { mobileContext } from "./helpers";

/**
 * The compass cursor — the night archive's one visual addition. It is
 * pure CSS: an inline data-URI SVG on `html` under
 * `(pointer: fine) and (hover: hover)`, with the `auto` keyword as the
 * declared fallback (a browser that refuses SVG cursors falls straight
 * through to its native arrow; a data URI has no request to 404). These
 * tests pin the four contracts: fine pointers get it (with the hotspot
 * and fallback both declared), interactive and text surfaces keep their
 * native cursors, coarse pointers never see it, and forced-colors users
 * get their platform cursor back.
 */

const rootCursor = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).cursor);

test("fine pointers get the compass, with hotspot and native fallback declared", async ({ page }) => {
  await page.goto("/");
  const cursor = await rootCursor(page);
  expect(cursor).toContain("data:image/svg+xml");
  // The hotspot pair and the trailing fallback keyword survive into the
  // computed value — losing either regresses to a mispointing or
  // fallback-less cursor.
  expect(cursor).toMatch(/3[\s\S]*3[\s\S]*auto/);
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
