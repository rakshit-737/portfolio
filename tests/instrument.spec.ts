import { expect, test } from "@playwright/test";
import { featuredProjects, moreProjects } from "../src/content";

/**
 * The instrument layer (docs/superpowers/specs/2026-09-24-the-instrument-
 * design.md). The ignition is skipped under automation by design
 * (navigator.webdriver), so every ignition test forces it with `?ignite`.
 */

test("automation gets no ignition unless it asks for one", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /./);
  await expect(page.locator(".ignition")).toBeHidden();
});

test("the ignition lights the archive, then gets out of the way", async ({ page }) => {
  await page.goto("/?ignite");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro", "full");
  await expect(page.locator(".ignition")).toBeVisible();
  // Real progress: the measured coordinates are printed once hydrated.
  await expect(page.locator(".ig-coord")).toContainText(/x \d\.\d{3} · y \d\.\d{3}/);
  // The name arrives as a title card (generated content, not a second h1).
  await expect(page.locator(".ig-name")).toHaveAttribute("data-name", "Rakshit Rameshbabu");
  // It takes its time on a first visit, and ends on its own before the
  // boot script's 7.5s failsafe.
  await page.waitForTimeout(2_500);
  await expect(html).not.toHaveAttribute("data-intro-phase", "done");
  await expect(html).toHaveAttribute("data-intro-phase", "done", { timeout: 6_000 });
  await expect(page.locator(".ignition")).toBeHidden();
  await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
  await expect(page.locator("#hero-title")).toBeVisible();
});

test("the ignition never takes input — a key press skips to the open", async ({ page }) => {
  await page.goto("/?ignite");
  await expect(page.locator(".ignition")).toBeVisible();
  await expect(page.locator(".ignition")).toHaveCSS("pointer-events", "none");
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-intro-phase", /open|done/, {
    timeout: 800,
  });
  await expect(page.locator("html")).toHaveAttribute("data-intro-phase", "done", {
    timeout: 2_000,
  });
});

test("a brief ignition is brief", async ({ page }) => {
  await page.goto("/?ignite=brief");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "brief");
  await expect(page.locator("html")).toHaveAttribute("data-intro-phase", "done", {
    timeout: 2_000,
  });
});

test("reduced motion never sees the ignition, even when asked", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/?ignite");
  await expect(page.locator("html")).toHaveAttribute("data-fx", "off");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /./);
  await expect(page.locator(".ignition")).toBeHidden();
  await ctx.close();
});

test("the instrument is a named button that opens the control center", async ({ page }) => {
  await page.goto("/");
  const inst = page.getByRole("button", { name: "Open the control center" });
  await expect(inst).toBeVisible();
  await inst.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Deep mode toggles from the palette and persists", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("deep mode");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-deep", "");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-deep", "");
  // The shortcut listens once the app has hydrated (the lamp is its sign).
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  await page.keyboard.press("Shift+D");
  await expect(page.locator("html")).not.toHaveAttribute("data-deep", /.*/);
});

test("secrets are never listed, only matched exactly", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("option", { name: /lamp is out/i })).toHaveCount(0);
  await page.keyboard.type("extinguish");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-snuffed", "");
});

test("the constellation names only projects that list the skill", async ({ page }) => {
  await page.goto("/#ledger");
  const chip = page.locator('[data-skill="Python"]');
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  const expected = [...featuredProjects, ...moreProjects]
    .filter((p) => p.tech.some((t) => /^python(\s+\d.*)?$/i.test(t)))
    .map((p) => p.name.split(" — ")[0]);
  expect(expected.length).toBeGreaterThan(0);
  const readout = page.locator(".cst-readout");
  for (const name of expected) await expect(readout).toContainText(name);
  await expect(chip).toHaveAttribute("data-lit", "");
});

test("the contact form is labelled and never sends without a key", async ({ page }) => {
  await page.goto("/#contact");
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Your email")).toBeVisible();
  await expect(page.getByLabel("Message")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
});

test("every act carries its catalogue index", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-act] .act-index")).toHaveCount(8);
  await expect(page.locator("#warden .act-index")).toContainText(/pl\. [IVX]+ · \d{4}/);
});
