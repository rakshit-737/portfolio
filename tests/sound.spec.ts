import { expect, test } from "@playwright/test";

/** The hearth's boot is real audio work — creating the AudioContext,
 *  building the string and the drone — behind a real user gesture. Under
 *  a full-suite run (eight parallel browsers on a busy machine) that has
 *  twice lost Playwright's default 5s wait and reported `pending`, while
 *  passing every time the same tests run alone. The behaviour under test
 *  is "a gesture starts the hearth", not "it starts within five seconds",
 *  so these waits get room; nothing about the product changed, and every
 *  other assertion here keeps the default. */
const HEARTH_BOOT = { timeout: 20_000 } as const;

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

test("on by default — pending at load, playing at the first touch", async ({ page }) => {
  await page.goto("/");
  // No opt-in anywhere, and yet no sound infrastructure at load either:
  // the hearth waits for the first real interaction (which also settles
  // every autoplay policy), then starts unprompted.
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.mouse.click(400, 400);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
});

test("no AudioContext exists before the first interaction (the perf gate)", async ({ page }) => {
  // `new AudioContext()` measured 72ms of real main thread in headless
  // Chromium — ~290ms at Lighthouse's 4× mobile throttling, which took
  // CI's mobile TBT from 84ms to 276ms and failed the perf ratchet.
  // The engine must not build one at load, only on the first gesture.
  await installUiLog(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  const ctxCount = () =>
    page.evaluate(() => (window as unknown as { __ctx: number }).__ctx);
  expect(await ctxCount()).toBe(0);
  await page.mouse.click(400, 400);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
  expect(await ctxCount()).toBe(1);
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
  await page.mouse.click(400, 400); // the first touch starts the hearth
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
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
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
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
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.mouse.click(400, 400);
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
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

// The square switch (CollectUI Phase 2). It is decoration on top of the
// text state: the knob moves with the toggle, and the accessible name —
// asserted above — never gains a second word from it.
test("the square switch tracks the toggle and never joins the accessible name", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Soundscape: on$/ }).first();
  await expect(toggle).toBeVisible();
  const knob = () =>
    toggle
      .locator(".sound-switch")
      .evaluate((el) => getComputedStyle(el, "::after").transform);
  // On: the knob sits at the far end of the track.
  // Default viewport is 1280 wide — `lg` and up, where the track shows.
  await expect(toggle.locator(".sound-switch")).toBeVisible();
  const onX = await knob();
  expect(onX).toContain("10");
  expect(await toggle.locator(".sound-switch").getAttribute("aria-hidden")).toBe("true");
  await toggle.click();
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
  // Off: it has travelled back to the start (identity, or "none").
  await expect
    .poll(async () =>
      page
        .locator(".sound-switch")
        .first()
        .evaluate((el) => getComputedStyle(el, "::after").transform),
    )
    .toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
});

test("interface sounds fire on the sanctioned events and never on hover or scroll", async ({ page }) => {
  await installUiLog(page);
  await page.goto("/");
  // Wait for the shim to have hydrated (it writes "pending" from its own
  // effect, which is where the gesture listeners are armed) before
  // clicking — the same order the two tests above use. Clicking straight
  // after `goto` raced hydration: `goto` resolves on `load`, and how far
  // ahead of `load` hydration finishes depends on how much the page had
  // left to fetch, so trimming an unused 144 kB font from the preload set
  // was enough to flip this test from passing to failing with no change
  // to the sound layer at all.
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "pending");
  await page.mouse.click(400, 400); // the first touch starts the hearth (and is itself silent)
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
  const kinds = () =>
    page.evaluate(() => (window as unknown as { __ui: string[] }).__ui);

  // Hover and scroll: silence.
  await page.mouse.move(300, 300);
  await page.mouse.move(600, 500);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(300);
  expect(await kinds()).toEqual([]);

  // Palette open + close: two wood taps.
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  expect(await kinds()).toEqual(["tap", "tap"]);
});

test("copying the email presses the seal", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await installUiLog(page);
  await page.goto("/#contact");
  await page.getByRole("button", { name: /copy email address/i }).click();
  const copied = page.getByRole("button", { name: /^Copied/ });
  await expect(copied).toBeVisible();
  // The morph (MorphLabel.tsx) swaps the visible word mid-flight — the
  // confirmation must still land as real text, never only as ARIA.
  await expect(copied).toContainText("Copied");
  // And the polite live region still fires its announcement.
  await expect(
    page.locator('[aria-live="polite"]', { hasText: /copied to clipboard/i }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as unknown as { __ui: string[] }).__ui),
  ).toEqual(["seal"]);
});

test("reduced motion swaps labels instantly — the morph never runs", async ({ page, context }) => {
  // MorphLabel is WAAPI, which globals.css's reduced-motion block cannot
  // zero — the component checks the preference itself and swaps in place.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#contact");
  await page.getByRole("button", { name: /copy email address/i }).click();
  await expect(page.getByRole("button", { name: /^Copied/ })).toContainText(
    "Copied",
  );
  const toggle = page.getByRole("button", { name: /^Soundscape: on$/ }).first();
  await toggle.click();
  await expect(
    page.getByRole("button", { name: /^Soundscape: off$/ }).first(),
  ).toBeVisible();
  // Both words changed; nothing may be animating — not the morph (skipped
  // in JS), not the Check's stamp-in (pinned in the reduced-motion block).
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
    )
    .toBe(0);
});

test("interface sounds obey the global setting", async ({ page }) => {
  await installUiLog(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("night-archive:sound", "off");
  });
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as unknown as { __ui: string[] }).__ui),
  ).toEqual([]);
});

test("an unvoiced button chimes; a voiced one keeps its single voice", async ({ page }) => {
  await installUiLog(page);
  await page.goto("/");
  await page.mouse.click(400, 400); // first touch: starts the hearth, silently
  await expect(page.locator("html")).toHaveAttribute("data-soundscape", "on", HEARTH_BOOT);
  const kinds = () =>
    page.evaluate(() => (window as unknown as { __ui: string[] }).__ui);
  expect(await kinds()).toEqual([]);

  // Any plain button — the certificate lightbox trigger in the ledger —
  // gets the chime from the delegated listener.
  await page
    .locator("button:not([data-voice])")
    .first()
    .click();
  expect(await kinds()).toEqual(["chime"]);
  // That button opened the certificate lightbox (a modal dialog that
  // would swallow every later click) — close it before moving on.
  await page.keyboard.press("Escape");

  // A voiced button never doubles up: the toggle turning OFF is silent
  // by design (the text change is the confirmation), and turning back
  // ON speaks brass once — no chime either way, because it is marked
  // data-voice.
  const toggle = page.getByRole("button", { name: /^Soundscape: on$/ }).first();
  await toggle.click();
  expect(await kinds()).toEqual(["chime"]);
  await page.getByRole("button", { name: /^Soundscape: off$/ }).first().click();
  expect(await kinds()).toEqual(["chime", "click"]);
});

test("palette carries the soundscape action", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("sound");
  await expect(
    page.getByRole("option", { name: /Soundscape: turn off/ }),
  ).toBeVisible();
});
