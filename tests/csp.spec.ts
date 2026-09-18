import { expect, test, type Page } from "@playwright/test";
import { SECURITY_HEADERS } from "../scripts/csp.mjs";
import { featuredProjects } from "../src/content";

/**
 * Runs only under playwright.csp.config.ts, which serves ./out with the
 * committed vercel.json headers applied (scripts/serve-with-headers.mjs).
 * The main config ignores this file: `serve out` sends no headers, so the
 * first test here would fail there by construction.
 *
 * The signal is the browser's own: every `securitypolicyviolation` event
 * the page fires is recorded from the first byte (an init script runs
 * before any page script), and the suite fails on any at all, so a policy
 * that silently blocks one inline style or one script shows up here even
 * when the page still looks fine.
 */

async function recordViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || "(inline)"} at ${e.sourceFile}:${e.lineNumber}`);
    });
  });
  const refused: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy|Refused to/i.test(msg.text())) {
      refused.push(msg.text());
    }
  });
  return async () => {
    const events = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    return [...events, ...refused];
  };
}

test("every response carries the committed security headers", async ({ request }) => {
  for (const path of ["/", "/projects/warden/", "/og.png", "/llms.txt"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const headers = res.headers();
    for (const { key, value } of SECURITY_HEADERS) {
      const got = headers[key.toLowerCase()];
      expect(got, `${key} on ${path}`).toBe(value);
    }
  }
});

test("the index hydrates, lights, and plays under the policy with zero violations", async ({ page }) => {
  const violations = await recordViolations(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // The lamp turning on is client code running: hydration survived.
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  // The first real gesture starts the sound engine (AudioContext) and the
  // palette's wood tap; the cursor scripts load on a fine pointer.
  await page.mouse.move(720, 450);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("combobox", { name: "Search the field" })).toBeFocused();
  await page.keyboard.press("Escape");
  // Every act, so every plate, every lazy image and every ignition runs.
  for (let y = 0; y < 12; y++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(120);
  }
  expect(await violations()).toEqual([]);
});

test("a case file renders under the policy with zero violations", async ({ page }) => {
  const violations = await recordViolations(page);
  await page.goto(`/projects/${featuredProjects[0].id}/`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  expect(await violations()).toEqual([]);
});
