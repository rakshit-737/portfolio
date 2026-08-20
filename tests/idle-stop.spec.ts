import { expect, test } from "@playwright/test";

/**
 * P6-perf, item 2: Lamp.tsx's and Torch.tsx's rAF loops now idle-stop —
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
 * fast-path — which (by design, see Lamp.tsx/Torch.tsx) keeps ticking every
 * frame regardless of idle-stop, so it can notice recovery. That is a real
 * device-performance path, not the idle-stop mechanism under test here, so
 * a trip is retried rather than treated as this test's failure — the same
 * shape lamplight.spec.ts already uses for the same reason (see its
 * `BreakerTripped`/`withLampRetry`).
 */
class BreakerTripped extends Error {}

async function withRetry(fn: () => Promise<void>) {
  for (let i = 0; i < 4; i++) {
    try {
      await fn();
      return;
    } catch (e) {
      if (!(e instanceof BreakerTripped) || i === 3) throw e;
    }
  }
}

/** Installs a `window.__rafCount` counter that increments once per real
 *  `requestAnimationFrame` call, before Lamp.tsx/Torch.tsx ever mount. */
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
  await withRetry(async () => {
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

test("the torch idle-stops once disarmed and resumes on the next pointer move", async ({
  page,
}) => {
  await countRaf(page);
  await page.goto("/");
  // Never armed in this test (no pointer movement yet) — Torch.tsx starts
  // `!active`, so its own loop idle-stops almost immediately rather than
  // after the 2s idle timeout (that timeout only applies once armed; see
  // Torch.tsx's own "Idle-stop" doc comment: `!active` alone, once the
  // radius chase has settled, is enough). The counter installed above is
  // global, though — it also counts Lamp.tsx's independent rAF loop, which
  // keeps ticking for its own IDLE_MS (600ms) after mount before it
  // idle-stops too. Waiting past that first lets this assertion isolate
  // "is anything still calling requestAnimationFrame at all" to the state
  // where both loops should already be stopped, rather than catching Lamp
  // mid-settle and misreading it as a Torch regression.
  await page.waitForTimeout(1500);
  const countA = await rafCount(page);
  await page.waitForTimeout(300);
  const countB = await rafCount(page);
  expect(
    countB - countA,
    "some rAF loop kept scheduling frames after both the lamp and torch should be idle-stopped",
  ).toBeLessThanOrEqual(2); // small slack for one in-flight frame at the sample boundary

  await page.mouse.move(700, 450, { steps: 5 });
  await expect(page.locator("html")).toHaveAttribute("data-torch", "on", {
    timeout: 3000,
  });
  const countC = await rafCount(page);
  expect(
    countC,
    "a real pointer move did not restart the torch's rAF loop",
  ).toBeGreaterThan(countB);
});
