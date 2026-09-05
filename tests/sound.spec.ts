import { expect, test } from "@playwright/test";

/**
 * The night archive's soundscape, end to end: default-on behind an
 * honest autoplay gate, persistence, the tab-hidden pause, and the
 * hard guarantees — no audio file is ever requested (everything is
 * synthesized in-repo; see src/lib/sound.ts), and a persisted "off"
 * never builds an AudioContext at all.
 *
 * Status is read from `<html data-soundscape>`, which Soundscape.tsx
 * mirrors from the engine — the one observable surface the engine
 * keeps for tests and CSS alike.
 */

// This file models the browser that PERMITS autoplay (a returning
// visitor with media-engagement history, or a user's explicit site
// permission) — the flag makes that stance explicit, because Playwright's
// default Chromium blocks Web Audio on real pages. The blocked stance
// lives in tests/sound-blocked.spec.ts. launchOptions is worker-scoped,
// hence file-level.
test.use({
  launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
});

/** Install the observability log before any page script runs. */
const installUiLog = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __ui: string[]; __ctx: number };
    w.__ui = [];
    w.__ctx = 0;
    window.addEventListener("night-archive:ui-sound", (e) =>
      w.__ui.push((e as CustomEvent<{ kind: string }>).detail.kind),
    );
    window.addEventListener("night-archive:ctx-created", () => {
      w.__ctx++;
    });
  });

test("soundscape is on by default (autoplay permitted here)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test("no audio file is ever requested", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (r) => {
    if (/\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?|$)/i.test(r.url()))
      audioRequests.push(r.url());
  });
  await page.goto("/");
  await page.mouse.click(400, 400);
  await page.waitForTimeout(500);
  expect(audioRequests).toEqual([]);
});

test("a persisted off preference builds no AudioContext at all", async ({ page }) => {
  await installUiLog(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("night-archive:sound", "off");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  expect(
    await page.evaluate(() => (window as unknown as { __ctx: number }).__ctx),
  ).toBe(0);
});

test("hidden tab pauses; visible resumes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

test("blocked localStorage still yields a working default-on soundscape", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("denied");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on");
});

// The autoplay-blocked path needs its own deterministic policy double
// (Playwright's own evaluate calls can carry user activation, unblocking
// the thing under test) — it lives in tests/sound-blocked.spec.ts.

test("the toggle is visible, keyboard-operable, persists, and survives reload", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Soundscape: on$/ }).first();
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  expect(
    await page.evaluate(() => window.localStorage.getItem("night-archive:sound")),
  ).toBe("off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "off");
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
});

test("palette carries the soundscape action", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("sound");
  await expect(
    page.getByRole("option", { name: /Soundscape: turn off/ }),
  ).toBeVisible();
});
