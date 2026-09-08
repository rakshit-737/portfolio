import { expect, test, type Page } from "@playwright/test";
import { mobileContext } from "./helpers";

/**
 * The key and the lock — the night archive's cursor. Two layers, and the
 * tests pin both.
 *
 * The baseline is pure CSS: inline data-URI SVGs under `(pointer: fine)
 * and (hover: hover)` — the key as the default, the padlock it opens over
 * anything clickable, the I-beam key over text — each with a native
 * keyword (`auto`/`pointer`/`text`) declared after it, so a browser that
 * refuses SVG cursors falls straight through and a data URI never 404s.
 * All three are ORIGINAL drawings (the owner's downloaded Sweezy pack is
 * license-barred from redistribution, see the rulings doc), generated
 * from `lamplight-cursor-art.js`.
 *
 * On top of that, `Cursor.tsx` mounts the animated rendering on a fine
 * pointer, which hides the native cursor (`cursor: none`) and draws the
 * key itself. So the CSS contract is asserted with JavaScript disabled —
 * which is also exactly the state a no-JS visitor sees — and a separate
 * test proves the overlay takes over when scripting is on. Coarse
 * pointers and forced colours get their platform cursor either way.
 */

const rootCursor = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).cursor);

test.describe("the static cursors (the baseline, and the whole cursor with JS off)", () => {
  test.use({ javaScriptEnabled: false });

  test("fine pointers get the key, with hotspot and native fallback declared", async ({
    page,
  }) => {
    await page.goto("/");
    const cursor = await rootCursor(page);
    expect(cursor).toContain("data:image/svg+xml");
    // The hotspot pair (the key's tip, 7 7) and the trailing fallback
    // keyword survive into the computed value — losing either regresses
    // to a mispointing or a fallback-less cursor.
    expect(cursor).toMatch(/7[\s\S]*7[\s\S]*auto/);
  });

  test("clickable surfaces show the lock; text shows the I-beam key", async ({
    page,
  }) => {
    await page.goto("/");
    const linkCursor = await page
      .locator("a")
      .first()
      .evaluate((el) => getComputedStyle(el).cursor);
    // The lock, not the key — and `pointer` declared as its fallback.
    expect(linkCursor).toContain("data:image/svg+xml");
    expect(linkCursor).toContain("pointer");
    expect(linkCursor).not.toBe(await rootCursor(page));
    // Prose gets the I-beam key — a third image, not the key again —
    // with `text` behind it.
    const proseCursor = await page
      .locator("p")
      .first()
      .evaluate((el) => getComputedStyle(el).cursor);
    expect(proseCursor).toContain("data:image/svg+xml");
    expect(proseCursor).toContain("text");
    expect(proseCursor).not.toBe(linkCursor);
  });
});

test("with scripting on, the animated rendering takes the cursor over", async ({
  page,
}) => {
  await page.goto("/");
  // Mounting is deferred to an effect and two script loads; the contract
  // is that it arrives, not that it arrives synchronously.
  await expect
    .poll(() => rootCursor(page))
    .toBe("none");
  // It draws into its own fixed layer, which never intercepts a click.
  const layer = page.locator(".lcp");
  await expect(layer).toHaveCount(1);
  expect(
    await layer.evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");
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
