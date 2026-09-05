import { expect, test } from "@playwright/test";

/**
 * The first-interaction gate under a hostile autoplay policy. The
 * engine never attempts playback before a real gesture (see sound.ts's
 * "pending" status — a perf ruling as much as a policy one), and a
 * real gesture satisfies every policy; this file pins that the gate
 * holds even against a policy that would have refused a load-time
 * attempt, and that nothing — not waiting, not assertion polling —
 * starts the hearth without a genuine interaction.
 *
 * Real Chromium autoplay flags are unusable as a test substrate here:
 * Playwright's own `evaluate` calls (which every polling `expect` uses)
 * can carry transient user activation. So this file installs a
 * deterministic policy double instead, mirroring Chromium's documented
 * semantics precisely: the context reports "suspended" and `resume()`
 * stays pending until the first REAL pointer gesture on the page,
 * after which the (genuine) context resumes normally. The engine under
 * test is unmodified and cannot tell the difference.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __audioBlocked: boolean };
    w.__audioBlocked = true;
    // The lift: exactly what Chromium does — the first real user
    // gesture ends the embargo. Capture phase, so it beats every
    // page listener including the engine's own first-interaction start.
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

test("pending until first real interaction, then on — no attempt without a gesture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  // No amount of waiting — or of assertion polling — flips it without
  // a gesture:
  await page.waitForTimeout(1200);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.mouse.click(200, 300);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test("the first keystroke lights the hearth AND taps the palette — exactly one honest event", async ({ page }) => {
  // Ctrl+K as the very first interaction. The engine's
  // first-interaction listener (armed before the palette's, in layout
  // order) builds the context and starts a gesture-borne resume; the
  // palette's listener then calls playUi("tap") on that same
  // keystroke. Because a gesture-initiated start is in flight, the tap
  // is allowed to schedule — the gesture guarantees it sounds moments
  // later — so exactly one event fires, and only one (finding 1's
  // phantom guard: with no such start in flight, a suspended context
  // refuses and no event lies about silence).
  await page.addInitScript(() => {
    (window as unknown as { __ui: string[] }).__ui = [];
    window.addEventListener("night-archive:ui-sound", (e) =>
      (window as unknown as { __ui: string[] }).__ui.push(
        (e as CustomEvent<{ kind: string }>).detail.kind,
      ),
    );
    // Keyboard lift for the double (keydown, like Chromium).
    window.addEventListener(
      "keydown",
      () => {
        (window as unknown as { __audioBlocked: boolean }).__audioBlocked = false;
      },
      { capture: true },
    );
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { __ui: string[] }).__ui),
  ).toEqual(["tap"]);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
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
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.keyboard.press("Tab");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});
