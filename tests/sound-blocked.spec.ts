import { expect, test } from "@playwright/test";

/**
 * The autoplay gate under a blocking policy. Real Chromium autoplay
 * flags are unusable as a test substrate here: Playwright's own
 * `evaluate` calls (which every polling `expect` uses) can carry
 * transient user activation, which resolves a policy-pending
 * `resume()` from inside the assertion that was checking it stayed
 * blocked — the observer unblocking the observed. So this file
 * installs a deterministic policy double instead, mirroring Chromium's
 * documented semantics precisely: the context reports "suspended" and
 * `resume()` stays pending until the first REAL pointer gesture on the
 * page, after which the (genuine) context resumes normally. The engine
 * under test is unmodified and cannot tell the difference — which is
 * the point: it must not bypass, mock around, or retry-loop past a
 * policy that behaves exactly like this.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __audioBlocked: boolean };
    w.__audioBlocked = true;
    // The lift: exactly what Chromium does — the first real user
    // gesture ends the embargo. Capture phase, so it beats every
    // page listener including the engine's own retry.
    window.addEventListener(
      "pointerdown",
      () => {
        w.__audioBlocked = false;
      },
      { capture: true },
    );
    const RealAudioContext = window.AudioContext;
    window.AudioContext = class extends RealAudioContext {
      get state(): AudioContextState {
        return w.__audioBlocked ? "suspended" : super.state;
      }
      resume(): Promise<void> {
        if (w.__audioBlocked) return new Promise<void>(() => {});
        return super.resume();
      }
    };
  });
});

test("blocked until first real interaction, then on — no retry loop", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
  // No amount of waiting — or of assertion polling — flips it without
  // a gesture:
  await page.waitForTimeout(1200);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
  await page.mouse.click(200, 300);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test("no phantom ui-sound event while blocked (adversarial review, finding 1)", async ({ page }) => {
  // Ctrl+K as the very first interaction: the palette's own keydown
  // listener calls playUi("tap") synchronously, while the context is
  // still suspended and the engine's gesture retry hasn't yet resumed
  // it. The engine must not dispatch "night-archive:ui-sound" for that
  // silent schedule — the event's contract is "a sound really played".
  await page.addInitScript(() => {
    (window as unknown as { __ui: string[] }).__ui = [];
    window.addEventListener("night-archive:ui-sound", (e) =>
      (window as unknown as { __ui: string[] }).__ui.push(
        (e as CustomEvent<{ kind: string }>).detail.kind,
      ),
    );
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { __ui: string[] }).__ui),
  ).toEqual([]);
});

test("keyboard is a valid first interaction too", async ({ page }) => {
  await page.addInitScript(() => {
    // Keyboard lift for this test's double (keydown, like Chromium).
    window.addEventListener(
      "keydown",
      () => {
        (window as unknown as { __audioBlocked: boolean }).__audioBlocked = false;
      },
      { capture: true },
    );
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "blocked");
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});
