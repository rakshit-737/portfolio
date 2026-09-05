import { expect, test } from "@playwright/test";
import { BreakerTripped, withBreakerRetry } from "./helpers";

/**
 * P6-perf, item 2: Lamp.tsx's rAF loop now idle-stops —
 * see the "Idle-stop" doc comments on both components. These tests prove
 * the loop itself actually stops scheduling frames, not merely that a
 * sampled CSS custom property happens to hold steady (which a *running*
 * loop would also produce, once its output has converged — a stable
 * `--lamp-x` reading alone can't tell "stopped" from "still ticking but
 * nothing changed" apart). A `requestAnimationFrame` counter installed
 * before any app code runs gives a direct, mechanism-level signal instead.
 *
 * Both components' frame-budget guard (src/lib/motion.ts) can, on a loaded
 * CI runner, independently trip and hold the loop in its own "suspended"
 * fast-path — which (by design, see Lamp.tsx) keeps ticking every
 * frame regardless of idle-stop, so it can notice recovery. That is a real
 * device-performance path, not the idle-stop mechanism under test here, so
 * a trip is retried rather than treated as this test's failure — the same
 * `BreakerTripped`/`withBreakerRetry` shape lamplight.spec.ts uses for the
 * same reason, now shared via ./helpers (E1/E2/E3, final fix wave) rather
 * than each file hand-rolling its own — this file's copy used to retry at
 * a different budget (4 attempts) than lamplight.spec.ts's (5) for no
 * reason either number was more correct than the other.
 */

/** Installs a `window.__rafCount` counter that increments once per real
 *  `requestAnimationFrame` call, before Lamp.tsx ever mounts. */
async function countRaf(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as { __rafCount: number }).__rafCount = 0;
    const raw = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      (window as unknown as { __rafCount: number }).__rafCount++;
      return raw(cb);
    };
  });
}

const rafCount = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __rafCount: number }).__rafCount);

test("the lamp idle-stops after no input and resumes on scroll", async ({ page }) => {
  await withBreakerRetry(async () => {
    await countRaf(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");

    const act = page.locator("[data-act]").first();
    const readX = () =>
      act.evaluate((el) => getComputedStyle(el).getPropertyValue("--lamp-x"));
    const readY = () =>
      act.evaluate((el) => getComputedStyle(el).getPropertyValue("--lamp-y"));

    // Comfortably past Lamp.tsx's IDLE_MS (600ms) with no scroll and no
    // pointer movement anywhere in this test up to here.
    await page.waitForTimeout(1500);
    if ((await page.locator("html").getAttribute("data-lamp")) !== "on") {
      throw new BreakerTripped();
    }
    const countA = await rafCount(page);
    const xA = await readX();

    await page.waitForTimeout(300);
    if ((await page.locator("html").getAttribute("data-lamp")) !== "on") {
      throw new BreakerTripped();
    }
    const countB = await rafCount(page);
    const xB = await readX();

    // The brief's literal check: the observable half of "no per-frame
    // writes" — the custom property itself does not change.
    expect(xB, "--lamp-x changed across an idle window").toBe(xA);
    // The mechanism-level check: the loop is not still scheduling frames
    // that merely produce the same output.
    expect(
      countB,
      "requestAnimationFrame kept being called after the lamp should have idle-stopped",
    ).toBe(countA);

    // A scroll must wake it back up. --lamp-y (not --lamp-x: with no
    // pointer movement in this test, --lamp-x has no scroll-driven term at
    // all — see Lamp.tsx's `x`/`y` formulas — so only --lamp-y is a valid
    // "did the loop actually resume and recompute" signal here).
    const yBefore = await readY();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await page.waitForTimeout(200);
    if ((await page.locator("html").getAttribute("data-lamp")) !== "on") {
      throw new BreakerTripped();
    }
    const yAfter = await readY();
    expect(yAfter, "scrolling after idle-stop did not resume lamp updates").not.toBe(
      yBefore,
    );
    const countC = await rafCount(page);
    expect(
      countC,
      "scrolling after idle-stop did not restart the rAF loop",
    ).toBeGreaterThan(countB);
  });
});
