import { expect, test } from "@playwright/test";
import { mobileContext } from "./helpers";

/**
 * P11-mobile: touch-viewport (390x844) journeys. The rest of the suite
 * either runs at the default desktop viewport or spins up its own
 * mobile context via `mobileContext` (./helpers, E1/E2/E3, final fix
 * wave — the constant this file used to define locally as `MOBILE` moved
 * there so every touch-emulation call site in the suite shares one
 * definition); this file is the dedicated home for the two full mobile
 * flows the brief asks for, so they're not buried inside a file about
 * something else.
 *
 * `hasTouch: true, isMobile: true` is what makes Playwright report
 * `(hover: none)`/`(pointer: coarse)`, which is what the touch-only
 * affordances below actually key off of.
 */

test("case-file navigation journey on a touch viewport: index → warden → back via breadcrumb", async ({
  browser,
}) => {
  const ctx = await mobileContext(browser);
  const page = await ctx.newPage();

  await page.goto("/");
  await page.locator("#warden").scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: "Read the case file" }).first().tap();
  await expect(page).toHaveURL(/\/projects\/warden\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Warden/ }),
  ).toBeVisible();

  // The breadcrumb ("the record · act 03") — a touch-sized link (P11: ≥44px
  // tap target) back to the index act itself, not the generic header link.
  const breadcrumb = page.getByRole("link", { name: /the record/ });
  await expect(breadcrumb).toBeVisible();
  const box = await breadcrumb.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await breadcrumb.tap();
  await expect(page).toHaveURL(/\/#warden$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();

  await ctx.close();
});

test("command palette opens via the visible search button and jumps — touch viewport", async ({
  browser,
}) => {
  const ctx = await mobileContext(browser);
  const page = await ctx.newPage();

  await page.goto("/");

  // On touch there is no Ctrl+K to press — the nav's search icon button
  // (`md:hidden`) is the only affordance, and it must both be visible and
  // meet the 44px tap-target floor (Nav.tsx).
  const searchButton = page.getByRole("button", { name: "Search the field" });
  await expect(searchButton).toBeVisible();
  const box = await searchButton.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await searchButton.tap();
  const input = page.getByRole("combobox", { name: "Search the field" });
  await expect(input).toBeFocused();

  await input.fill("research");
  const option = page.getByRole("option", { name: /Research/ }).first();
  await expect(option).toBeVisible();
  const optionBox = await option.boundingBox();
  expect(optionBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await option.tap();

  await expect(page).toHaveURL(/#research$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await ctx.close();
});
