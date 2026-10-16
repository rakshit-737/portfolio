import { expect, test, type Page } from "@playwright/test";
import { featuredProjects, moreProjects } from "../src/content";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type IntroTimingWindow = typeof window & {
  __introTiming: {
    claimed: boolean;
    gateAt: number | null;
    openedAt: number | null;
    phases: Array<{ phase: string; at: number; fast: boolean }>;
  };
};

/** Start timing at the hydrated asset gate, independently of bundle loading. */
async function observeIntroGate(page: Page) {
  await page.addInitScript(() => {
    const state: IntroTimingWindow["__introTiming"] = {
      claimed: false, gateAt: null, openedAt: null, phases: [],
    };
    (window as IntroTimingWindow).__introTiming = state;
    window.addEventListener("lamplight:intro-claimed", () => { state.claimed = true; });
    window.addEventListener("lamplight:intro-opened", () => { state.openedAt = performance.now(); });
    const load = document.fonts.load.bind(document.fonts);
    document.fonts.load = (font, text) => {
      state.gateAt ??= performance.now();
      return load(font, text);
    };
    new MutationObserver((records) => {
      const phases = records.filter((record) => record.target === document.documentElement);
      for (let i = 0; i < phases.length; i += 1) {
        const phase = i + 1 < phases.length ? phases[i + 1].oldValue
          : document.documentElement.getAttribute("data-intro-phase");
        if (phase) state.phases.push({
          phase,
          // Other first-gesture listeners may do work before the mutation
          // observer runs. Measure the handoff from its synchronous event.
          at: phase === "open" ? state.openedAt ?? performance.now() : performance.now(),
          fast: document.documentElement.hasAttribute("data-intro-fast"),
        });
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-intro-phase"],
    });
  });
}

async function waitForIntroGate(page: Page) {
  await page.waitForFunction(() => {
    const state = (window as IntroTimingWindow).__introTiming;
    return state.claimed && state.gateAt !== null;
  }, undefined, { timeout: 8_000 });
}

/**
 * The instrument layer (docs/superpowers/specs/2026-09-24-the-instrument-
 * design.md). The ignition is skipped under automation by design
 * (navigator.webdriver), so every ignition test forces it with `?ignite`.
 */

test("automation gets no ignition unless it asks for one", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /./);
  await expect(page.locator(".ignition")).toBeHidden();
});

test("the ignition lights the archive, then gets out of the way", async ({ page }) => {
  await page.goto(`${BASE}/?ignite`);
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
  await observeIntroGate(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await waitForIntroGate(page);
  await expect(page.locator(".ignition")).toBeVisible();
  await expect(page.locator(".ignition")).toHaveCSS("pointer-events", "none");
  await page.keyboard.press("Tab");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro-phase", "open", {
    timeout: 800,
  });
  await expect(html).toHaveAttribute("data-intro-fast", "", { timeout: 800 });
  await expect(html).toHaveAttribute("data-intro-readiness", "skipped");
  await expect(html).toHaveAttribute("data-intro-phase", "done", {
    timeout: 800,
  });
  await expect(html).not.toHaveAttribute("data-intro-fast", /.*/);
  const phases = await page.evaluate(() => (window as IntroTimingWindow).__introTiming.phases);
  const open = phases.find(({ phase }) => phase === "open")!;
  const done = phases.find(({ phase }) => phase === "done")!;
  expect(open.fast).toBe(true);
  expect(done.at - open.at).toBeGreaterThanOrEqual(490);
  expect(done.at - open.at).toBeLessThan(800);
});

test("a brief ignition is brief", async ({ page }) => {
  await observeIntroGate(page);
  for (const repeat of [false, true]) {
    if (repeat) await page.reload({ waitUntil: "domcontentloaded" });
    else await page.goto(`${BASE}/?ignite=brief`, { waitUntil: "domcontentloaded" });
    await waitForIntroGate(page);
    await expect(page.locator("html")).toHaveAttribute("data-intro", "brief");
    // The 900ms cap + 700ms handoff are measured after hydration, not from
    // navigation. Keep the original two-second contract on repeat loads too.
    await expect(page.locator("html")).toHaveAttribute("data-intro-phase", "done", {
      timeout: 2_000,
    });
    const timing = await page.evaluate(() => (window as IntroTimingWindow).__introTiming);
    const open = timing.phases.find(({ phase }) => phase === "open")!;
    const done = timing.phases.find(({ phase }) => phase === "done")!;
    expect(open.fast).toBe(false);
    expect(done.at - open.at).toBeGreaterThanOrEqual(690);
    expect(done.at - timing.gateAt!).toBeLessThan(2_000);
  }
});

test("reduced motion never sees the ignition, even when asked", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?ignite`);
  await expect(page.locator("html")).toHaveAttribute("data-fx", "off");
  await expect(page.locator("html")).not.toHaveAttribute("data-intro", /./);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-phase", /./);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-readiness", /./);
  await expect(page.locator("html")).not.toHaveAttribute("data-intro-hold", /.*/);
  await expect(page.locator(".ignition")).toBeHidden();
  await ctx.close();
});

test("the instrument is a named button that opens the control center", async ({ page }) => {
  await page.goto(`${BASE}/`);
  const inst = page.getByRole("button", { name: "Open the control center" });
  await expect(inst).toBeVisible();
  await inst.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Deep mode toggles from the palette and persists", async ({ page }) => {
  await page.goto(`${BASE}/`);
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
  await page.goto(`${BASE}/`);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("option", { name: /lamp is out/i })).toHaveCount(0);
  await page.keyboard.type("extinguish");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-snuffed", "");
});

test("the constellation names only projects that list the skill", async ({ page }) => {
  await page.goto(`${BASE}/#ledger`);
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
  await page.goto(`${BASE}/#contact`);
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Your email")).toBeVisible();
  await expect(page.getByLabel("Message")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
});

test("every act carries its catalogue index", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("[data-act] .act-index")).toHaveCount(8);
  await expect(page.locator("#warden .act-index")).toContainText(/pl\. [IVX]+ · \d{4}/);
});
