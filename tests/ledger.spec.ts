import { expect, test, type Locator } from "@playwright/test";
import { mobileContext } from "./helpers";

/**
 * The ledger's one marker glides between records (CollectUI brief, item
 * 6 — ref @noechague, @RachitThakur146): a single aria-hidden 6px seal
 * square per list (`.row-marker`, RowMarker.tsx / CommandPalette.tsx)
 * travels to the hovered or focused row — `--row-y` written once per
 * event, the transform transitioned 200ms in CSS — instead of each row
 * lighting independently. Rows keep their border-b grammar with no
 * background fill; below `md` the marker never renders; in the palette
 * it rides the existing selection state as an extra beat. Reduced
 * motion keeps the landing and loses the glide.
 */

const ARCHIVE_LIST = 'section[aria-labelledby="ledger-archive-heading"] > ul';

/** The marker's translateY — the transform is the whole glide, so its
 *  vertical component is where the marker currently sits. */
const markerY = (marker: Locator) =>
  marker.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);

/** Where the marker must land for a row: its centre, computed exactly
 *  the way the component reads it (offsetTop plus half the height). */
const rowCentre = (row: Locator) =>
  row.evaluate((el) => {
    const h = el as HTMLElement;
    return h.offsetTop + h.offsetHeight / 2;
  });

test("hovering the next archive row carries the one marker to it", async ({ page }) => {
  await page.goto("/");
  const list = page.locator(ARCHIVE_LIST);
  await list.scrollIntoViewIfNeeded();
  const marker = list.locator(".row-marker");
  const rows = list.locator(":scope > li:not(.row-marker)");

  // One marker per list, decorative, resting invisible until a row is
  // entered — never a mark on a page nobody is pointing at.
  await expect(marker).toHaveCount(1);
  expect(await marker.getAttribute("aria-hidden")).toBe("true");
  expect(await marker.getAttribute("data-on")).toBeNull();
  expect(await marker.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");

  await rows.nth(0).hover();
  await expect(marker).toHaveAttribute("data-on", "");
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(rows.nth(0)), 1);

  // The second row does not light up on its own — the marker's
  // transform moves to meet it, and the row itself keeps no fill (the
  // glide is the only hover device on these rows).
  await rows.nth(1).hover();
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(rows.nth(1)), 1);
  expect(
    await rows.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");

  // Leaving the list dismisses it instantly — no stray mark lingers.
  await page.locator("#ledger-archive-heading").hover();
  await expect.poll(() => marker.getAttribute("data-on")).toBeNull();
});

test("Tab into a row moves the marker — focus is a row entry too", async ({ page }) => {
  await page.goto("/");
  const list = page.locator(ARCHIVE_LIST);
  await list.scrollIntoViewIfNeeded();
  const marker = list.locator(".row-marker");
  const rows = list.locator(":scope > li:not(.row-marker)");

  // Focus lands inside the first row (its repo receipt link): the
  // marker appears at that row without any pointer involved.
  await rows.nth(0).locator("a").first().focus();
  await expect(marker).toHaveAttribute("data-on", "");
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(rows.nth(0)), 1);

  // Tab reaches the next row's link; :focus-within carries the marker.
  // A row carries a variable number of receipt links — a build that
  // reaches the GitHub API renders head-SHA/CI segments a local build
  // omits — so Tab until focus actually leaves the first row rather
  // than assuming one focusable per row.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const inFirst = await rows
      .nth(0)
      .evaluate((el) => el.contains(document.activeElement));
    if (!inFirst) break;
  }
  expect(
    await rows.nth(1).evaluate((el) => el.contains(document.activeElement)),
    "after leaving the first row, focus lands in the second",
  ).toBe(true);
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(rows.nth(1)), 1);
});

test("at 390x844 the marker does not exist", async ({ browser }) => {
  const context = await mobileContext(browser);
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#ledger").scrollIntoViewIfNeeded();
  // Below `md` RowMarker renders nothing at all — no element, no
  // listeners — rather than a hidden square waiting for a hover that
  // touch can never produce.
  await expect(page.locator(".row-marker")).toHaveCount(0);
  await context.close();
});

test("reduced motion leaves no transition running — the marker simply lands", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  const list = page.locator(ARCHIVE_LIST);
  await list.scrollIntoViewIfNeeded();
  const marker = list.locator(".row-marker");
  const rows = list.locator(":scope > li:not(.row-marker)");

  await rows.nth(1).hover();
  await expect(marker).toHaveAttribute("data-on", "");
  // The global reduced-motion block zeroes the glide's one transition —
  // the marker is a transition, not a state transform, so zeroed means
  // both instant and finished…
  expect(
    await marker.evaluate((el) =>
      parseFloat(getComputedStyle(el).transitionDuration),
    ),
  ).toBeLessThan(0.05);
  // …so it is already at the row, with nothing animating.
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(rows.nth(1)), 1);
  expect(await marker.evaluate((el) => el.getAnimations().length)).toBe(0);
  await ctx.close();
});

test("in the palette the marker rides the selection as an extra beat", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const listbox = page.locator("#palette-list");
  await expect(listbox).toBeVisible();
  const marker = listbox.locator(".row-marker");
  await expect(marker).toHaveCount(1);
  expect(await marker.getAttribute("aria-hidden")).toBe("true");

  // The first option is selected on open; the marker sits at its centre.
  const selectedRow = listbox.locator('[aria-selected="true"]');
  await expect(marker).toHaveAttribute("data-on", "");
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(selectedRow), 1);

  // Arrowing down moves the accessible selection — the bg-signal swap
  // stays the state — and the marker follows it as decoration.
  const before = await markerY(marker);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => markerY(marker)).toBeGreaterThan(before);
  await expect
    .poll(() => markerY(marker))
    .toBeCloseTo(await rowCentre(selectedRow), 1);
  expect(
    (
      await selectedRow.evaluate((el) => getComputedStyle(el).backgroundColor)
    ).replace(/\s/g, ""),
    // rgb(242, 237, 227) === --color-signal: the selection swap is
    // untouched by the marker's arrival.
  ).toBe("rgb(242,237,227)");
  await page.keyboard.press("Escape");
});
