import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const HERO = ["hero-dark", "hero-lit", "mark"] as const;
type GateKey = (typeof HERO)[number] | "fonts";
type ControlKey = GateKey | `plate:${string}:${"dark" | "lit"}`;

type Slot = { released: boolean; calls: number; settled: number };
type Controls = {
  slots: Record<string, Slot>;
  decodes: Array<{
    key: string;
    source: string;
    original: boolean;
    connected: boolean;
    priority: string;
    loading: string;
  }>;
  fontLoads: Array<{ font: string; text: string | undefined }>;
  claimedAt: number | null;
  opened: number;
  ignited: number;
  phases: Array<{ phase: string; at: number }>;
  watchdogCleared: boolean;
  fireWatchdog: () => void;
  release: (keys: string[]) => void;
  hold: (keys: string[]) => void;
};
type ControlledWindow = typeof window & { __readiness: Controls };

/**
 * Keep real requests, responsive picture selection, native decode and font
 * loading. Only their completion receipts are held. A released slot stays
 * released for future calls, including calls arriving after the release.
 * The paused browser clock controls floors/caps; native network promises are
 * awaited before advancing it, so a slow worker cannot consume the beat.
 */
async function controlReadiness(
  page: Page,
  options: { hold?: GateKey[]; reject?: GateKey[]; holdWarmup?: boolean } = {},
) {
  const epoch = new Date("2026-10-01T00:00:00Z");
  await page.clock.install({ time: epoch });
  // Pause before navigation. Use a future instant relative to the installed
  // clock, so an IPC round trip cannot make pauseAt() target the past.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1_000);
  await page.addInitScript(
    ({ held, rejected, holdWarmup }) => {
      const waiting = new Map<string, Array<() => void>>();
      const state: Controls = {
        slots: {},
        decodes: [],
        fontLoads: [],
        claimedAt: null,
        opened: 0,
        ignited: 0,
        phases: [],
        watchdogCleared: false,
        fireWatchdog: () => { throw new Error("boot watchdog was not captured"); },
        release(keys) {
          for (const key of keys) {
            slot(key).released = true;
            for (const resolve of waiting.get(key) ?? []) resolve();
            waiting.delete(key);
          }
        },
        hold(keys) {
          for (const key of keys) slot(key).released = false;
        },
      };
      (window as ControlledWindow).__readiness = state;
      function slot(key: string): Slot {
        return state.slots[key] ??= {
          released: !held.includes(key as GateKey) && !(holdWarmup && key.startsWith("plate:")),
          calls: 0,
          settled: 0,
        };
      }
      function controlled<T>(key: string, work: Promise<T>): Promise<T> {
        const entry = slot(key);
        entry.calls += 1;
        return work.then(async (value) => {
          if (!entry.released) {
            await new Promise<void>((resolve) => {
              const queue = waiting.get(key) ?? [];
              queue.push(resolve);
              waiting.set(key, queue);
            });
          }
          if (rejected.includes(key as GateKey)) throw new Error(`controlled decode failure: ${key}`);
          return value;
        }).then(
          (value) => { entry.settled += 1; return value; },
          (error: unknown) => { entry.settled += 1; throw error; },
        );
      }

      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
        const layer = this.classList.contains("plate-dark") ? "dark" : "lit";
        const plate = this.closest("[data-plate]");
        const key = this.matches("header img") ? "mark"
          : this.closest("#hero") ? `hero-${layer}`
          : plate ? `plate:${plate.getAttribute("data-plate")}:${layer}` : "other";
        const selector = key === "mark" ? "header img"
          : key.startsWith("hero-") ? `#hero img.plate-${layer}`
          : plate ? `[data-plate="${plate.getAttribute("data-plate")}"] img.plate-${layer}` : "";
        state.decodes.push({
          key,
          source: this.currentSrc || this.src,
          original: !!selector && document.querySelector(selector) === this,
          connected: this.isConnected,
          priority: this.fetchPriority,
          loading: this.loading,
        });
        return controlled(key, decode.call(this));
      };
      const load = document.fonts.load.bind(document.fonts);
      document.fonts.load = (font, text) => {
        state.fontLoads.push({ font, text });
        return controlled("fonts", load(font, text));
      };

      window.addEventListener("lamplight:intro-claimed", () => {
        state.claimedAt = performance.now();
      });
      window.addEventListener("lamplight:intro-opened", () => { state.opened += 1; });
      window.addEventListener("lamplight:ignited", () => { state.ignited += 1; });
      new MutationObserver((records) => {
        const phases = records.filter((record) => record.target === document.documentElement);
        for (let i = 0; i < phases.length; i += 1) {
          // Reconstruct intermediate values when multiple writes share a task.
          const phase = i + 1 < phases.length ? phases[i + 1].oldValue
            : document.documentElement.getAttribute("data-intro-phase");
          if (phase) state.phases.push({ phase, at: performance.now() });
        }
      }).observe(document, {
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["data-intro-phase"],
      });

      // Capture the real 7500ms callback, without shortening its deadline.
      const set = window.setTimeout.bind(window);
      const clear = window.clearTimeout.bind(window);
      let watchdog: number | undefined;
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const id = set(handler, timeout, ...args);
        if (timeout === 7500 && typeof handler === "function") {
          watchdog = id;
          state.fireWatchdog = () => {
            if (state.watchdogCleared) throw new Error("boot watchdog already released");
            handler(...args);
          };
        }
        return id;
      }) as typeof window.setTimeout;
      window.clearTimeout = ((id?: number) => {
        if (watchdog !== undefined && id === watchdog) state.watchdogCleared = true;
        clear(id);
      }) as typeof window.clearTimeout;
    },
    {
      held: options.hold ?? [...HERO, "fonts"],
      rejected: options.reject ?? [],
      holdWarmup: options.holdWarmup ?? false,
    },
  );
}

async function release(page: Page, keys: readonly ControlKey[] = [...HERO, "fonts"]) {
  await page.evaluate((keys) => (window as ControlledWindow).__readiness.release(keys), [...keys]);
}

async function counts(page: Page) {
  return page.evaluate(() => Object.fromEntries(
    Object.entries((window as ControlledWindow).__readiness.slots)
      .map(([key, value]) => [key, value.calls]),
  ));
}

async function settled(page: Page, keys: readonly ControlKey[]) {
  await expect.poll(() => page.evaluate((keys) => {
    const slots = (window as ControlledWindow).__readiness.slots;
    return keys.every((key) => slots[key]?.calls > 0 && slots[key].settled === slots[key].calls);
  }, [...keys])).toBe(true);
}

async function gateStarted(page: Page, images = true) {
  await expect.poll(async () => {
    // Next may close an already-loaded Flight stream on a zero-delay task.
    // Release startup tasks/frames while waiting for the actual claim event.
    await page.clock.runFor(16);
    return page.evaluate(() => (window as ControlledWindow).__readiness.claimedAt);
  }, { timeout: 8_000 }).not.toBeNull();
  // prepare() starts on a frame, after the hydrated skip listeners exist.
  await page.clock.runFor(32);
  await expect.poll(() => page.evaluate(
    () => (window as ControlledWindow).__readiness.fontLoads.length,
  ), { timeout: 8_000 }).toBeGreaterThan(0);
  if (images) {
    await expect.poll(() => counts(page), { timeout: 8_000 }).toMatchObject({
      "hero-dark": 1, "hero-lit": 1, mark: 1,
    });
  }
}

/** Full-mode t0 and the claim share a synchronous task on the paused clock. */
async function at(page: Page, elapsed: number) {
  const now = await page.evaluate(() => {
    const start = (window as ControlledWindow).__readiness.claimedAt;
    if (start === null) throw new Error("intro has not claimed input");
    return performance.now() - start;
  });
  expect(now, "the test must not move its clock backwards").toBeLessThanOrEqual(elapsed);
  await page.clock.runFor(elapsed - now);
}

async function ready(page: Page) {
  await release(page);
  await settled(page, [...HERO, "fonts"]);
  await page.clock.runFor(32); // layout + paint opportunity after native promises settle
  await expect(page.locator("html")).toHaveAttribute("data-intro-assets", "ready");
}

async function sealed(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-intro-hold", "");
  await expect(page.locator(".ig-veil")).toHaveCSS("--ig-open", "0px");
  await expect(page.locator(".ig-veil")).toHaveCSS("mask-image", "none");
}

async function aperture(page: Page, vmax: number) {
  const actual = await page.locator(".ig-veil").evaluate((veil) => {
    // Finish the CSS transition explicitly; its wall-clock duration is not a
    // readiness receipt and must not introduce sleeps into the assertion.
    getComputedStyle(veil).getPropertyValue("--ig-open");
    for (const animation of veil.getAnimations()) animation.finish();
    return {
      radius: parseFloat(getComputedStyle(veil).getPropertyValue("--ig-open")),
      unit: Math.max(innerWidth, innerHeight) / 100,
      mask: getComputedStyle(veil).maskImage,
    };
  });
  expect(actual.radius).toBeCloseTo(actual.unit * vmax, 1);
  expect(actual.mask).not.toBe("none");
}

async function terminal(page: Page, readiness: string) {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro-phase", "done");
  await expect(html).toHaveAttribute("data-intro-readiness", readiness);
  await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
  await expect(html).not.toHaveAttribute("data-intro-fast", /.*/);
  await expect(page.locator(".ignition")).toBeHidden();
  const phases = await page.evaluate(() => (window as ControlledWindow).__readiness.phases);
  const done = phases.findIndex(({ phase }) => phase === "done");
  expect(done).toBeGreaterThanOrEqual(0);
  expect(phases.slice(done).map(({ phase }) => phase)).toEqual(["done"]);
}

test("a warm cached hero preserves every full floor and never reopens after done", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.locator("#hero img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    await document.fonts.ready;
  });
  await controlReadiness(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  await ready(page);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro-fonts", "ready");
  await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
  for (const [before, floor, previous, phase, radius] of [
    [499, 500, "ember", "kindle", 3],
    [1499, 1500, "kindle", "label", 7],
    [2699, 2700, "label", "lit", 13],
  ] as const) {
    await at(page, before);
    await expect(html).toHaveAttribute("data-intro-phase", previous);
    await at(page, floor);
    await expect(html).toHaveAttribute("data-intro-phase", phase);
    await aperture(page, radius);
  }
  await at(page, 3999);
  await expect(html).toHaveAttribute("data-intro-phase", "lit");
  await at(page, 4000);
  await expect(html).toHaveAttribute("data-intro-phase", "open");
  await expect(html).toHaveAttribute("data-intro-readiness", "ready");
  await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
  expect(await page.evaluate(() => (window as ControlledWindow).__readiness.watchdogCleared)).toBe(true);
  await at(page, 6199);
  await expect(html).toHaveAttribute("data-intro-phase", "open");
  await at(page, 6200);
  await terminal(page, "ready");
  await at(page, 8000);
  await terminal(page, "ready");
  expect(await page.evaluate(() => {
    const { opened, ignited } = (window as ControlledWindow).__readiness;
    return { opened, ignited };
  })).toEqual({ opened: 1, ignited: 1 });
});

for (const delayed of HERO) {
  test(`the individual ${delayed} receipt holds the aperture beyond the full beat`, async ({ page }) => {
    await controlReadiness(page, { hold: [delayed] });
    await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
    await gateStarted(page);
    await settled(page, [...HERO, "fonts"].filter((key) => key !== delayed) as GateKey[]);
    const html = page.locator("html");
    await at(page, 500);
    await expect(html).toHaveAttribute("data-intro-phase", "kindle");
    await sealed(page);
    await at(page, 4100);
    await expect(html).toHaveAttribute("data-intro-phase", "label");
    await expect(html).toHaveAttribute("data-intro-assets", "pending");
    await expect(html).toHaveAttribute("data-intro-fonts", "ready");
    await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
    await expect(page.locator(".ig-caption")).toHaveCSS("visibility", "visible");
    await sealed(page);
    await ready(page);
    await expect(html).toHaveAttribute("data-intro-readiness", "ready");
    await expect(html).toHaveAttribute("data-intro-phase", "open");
    expect(await counts(page)).toMatchObject({ "hero-dark": 1, "hero-lit": 1, mark: 1 });
  });
}

test("viewport fonts hold captions and assets pending beyond the full beat", async ({ page }) => {
  await controlReadiness(page, { hold: ["fonts"] });
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  await settled(page, HERO);
  await at(page, 4100);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro-phase", "kindle");
  await expect(html).toHaveAttribute("data-intro-assets", "pending");
  await expect(html).toHaveAttribute("data-intro-fonts", "pending");
  await expect(page.locator(".ig-caption")).toHaveCSS("visibility", "hidden");
  await sealed(page);
  await ready(page);
  await expect(html).toHaveAttribute("data-intro-fonts", "ready");
  await expect(html).toHaveAttribute("data-intro-readiness", "ready");
  await expect(page.locator(".ig-caption")).toHaveCSS("visibility", "visible");
});

for (const failure of ["request", "decode"] as const) {
  test(`a failed ${failure} opens explicitly degraded instead of reporting ready`, async ({ page }) => {
    await controlReadiness(page, {
      hold: [],
      reject: failure === "decode" ? ["hero-lit"] : [],
    });
    let failedRequests = 0;
    if (failure === "request") {
      page.on("requestfailed", (request) => {
        if (new URL(request.url()).pathname.startsWith(`${BASE}/art/blacksmith-`)) failedRequests += 1;
      });
      await page.route(
        (url) => url.pathname.startsWith(`${BASE}/art/blacksmith-`),
        (route) => route.abort("failed"),
      );
    }
    await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
    await gateStarted(page, failure !== "request");
    await settled(page, failure === "request" ? ["mark", "fonts"] : [...HERO, "fonts"]);
    if (failure === "request") {
      await expect.poll(() => failedRequests).toBeGreaterThan(0);
      await expect.poll(() => page.locator("#hero img").evaluateAll((images) => images.every(
        (image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0,
      ))).toBe(true);
    }
    await page.clock.runFor(32);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-intro-assets", "degraded");
    await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
    await at(page, 3999);
    await sealed(page);
    await expect(html).not.toHaveAttribute("data-intro-phase", /open|done/);
    await at(page, 4000);
    await expect(html).toHaveAttribute("data-intro-readiness", "degraded");
    await expect(html).toHaveAttribute("data-intro-phase", "open");
    await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
    await at(page, 6200);
    await terminal(page, "degraded");
  });
}

for (const [mode, cap, handoff] of [["full", 5000, 2200], ["brief", 900, 700]] as const) {
  test(`${mode} caps stalled utility work as timed-out, including after a late decode`, async ({ page }) => {
    await controlReadiness(page, { hold: ["hero-lit"] });
    await page.goto(`${BASE}/?ignite${mode === "brief" ? "=brief" : ""}`, {
      waitUntil: "domcontentloaded",
    });
    await gateStarted(page);
    await settled(page, ["hero-dark", "mark", "fonts"]);
    const html = page.locator("html");
    await at(page, cap - 1);
    await expect(html).toHaveAttribute("data-intro-assets", "pending");
    await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
    await sealed(page);
    await at(page, cap);
    await expect(html).toHaveAttribute("data-intro-phase", "open");
    await expect(html).toHaveAttribute("data-intro-assets", "timed-out");
    await expect(html).toHaveAttribute("data-intro-readiness", "timed-out");
    // Let the utilities' own deadlines settle too, before releasing the
    // underlying native decode. Neither late path may rewrite the cap result.
    await at(page, cap + 32);
    await release(page, ["hero-lit"]);
    await settled(page, HERO);
    await page.clock.runFor(32);
    await expect(html).toHaveAttribute("data-intro-assets", "timed-out");
    await expect(html).toHaveAttribute("data-intro-readiness", "timed-out");
    await at(page, cap + handoff - 1);
    await expect(html).toHaveAttribute("data-intro-phase", "open");
    await at(page, cap + handoff);
    await terminal(page, "timed-out");
    await at(page, 8000);
    await terminal(page, "timed-out");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("the captured head failsafe is terminal even after hydration starts", async ({ page }) => {
  await controlReadiness(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  await expect(page.locator("html")).toHaveAttribute("data-intro-assets", "pending");
  await page.evaluate(() => (window as ControlledWindow).__readiness.fireWatchdog());
  await terminal(page, "timed-out");
  await release(page);
  await settled(page, [...HERO, "fonts"]);
  await at(page, 8000);
  await terminal(page, "timed-out");
  expect(await page.evaluate(() => {
    const { opened, watchdogCleared } = (window as ControlledWindow).__readiness;
    return { opened, watchdogCleared };
  })).toEqual({ opened: 0, watchdogCleared: true });
});

test("pre-hydration input stays done when the held bundles are released", async ({ page }) => {
  await controlReadiness(page);
  let releaseBundles!: () => void;
  const bundles = new Promise<void>((resolve) => { releaseBundles = resolve; });
  let heldBundles = 0;
  await page.route(
    (url) => url.pathname.startsWith(`${BASE}/_next/static/`) && url.pathname.endsWith(".js"),
    async (route) => {
      heldBundles += 1;
      await bundles;
      await route.continue();
    },
  );
  try {
    // DOMContentLoaded may itself wait for a held bundle. The inline head
    // boot and server-rendered veil are enough to exercise early input.
    await page.goto(`${BASE}/?ignite`, { waitUntil: "commit" });
    await expect(page.locator(".ignition")).toBeVisible();
    await expect.poll(() => heldBundles).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as ControlledWindow).__readiness.claimedAt)).toBeNull();
    await page.keyboard.press("Tab");
    await terminal(page, "skipped");
    releaseBundles();
    await page.waitForLoadState("load");
    // This proves that the released application actually hydrated, rather
    // than only checking an inert page whose scripts were aborted forever.
    await expect.poll(async () => {
      await page.clock.runFor(16);
      return page.locator("html").getAttribute("data-lamp");
    }).toBe("on");
    await page.clock.runFor(8000);
    await terminal(page, "skipped");
    expect(await page.evaluate(() => (window as ControlledWindow).__readiness.claimedAt)).toBeNull();
  } finally {
    releaseBundles();
  }
});

test("hydrated input keeps the fast open for exactly 500ms and late receipts cannot reopen it", async ({ page }) => {
  await controlReadiness(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  const html = page.locator("html");
  await page.keyboard.press("Tab");
  await expect(html).toHaveAttribute("data-intro-phase", "open");
  await expect(html).toHaveAttribute("data-intro-fast", "");
  await expect(html).toHaveAttribute("data-intro-readiness", "skipped");
  await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
  expect(await page.evaluate(() => (window as ControlledWindow).__readiness.watchdogCleared)).toBe(true);
  await page.clock.runFor(499);
  await expect(html).toHaveAttribute("data-intro-phase", "open");
  await expect(html).toHaveAttribute("data-intro-fast", "");
  await page.clock.runFor(1);
  await terminal(page, "skipped");
  await release(page);
  await settled(page, [...HERO, "fonts"]);
  await at(page, 8000);
  await terminal(page, "skipped");
});

test("resize revokes lit receipts immediately and re-decodes the newly selected crop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await controlReadiness(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  await ready(page);
  await at(page, 3000);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-intro-phase", "lit");
  await aperture(page, 13);
  const before = await page.locator("#hero img.plate-lit").evaluate(
    (image) => (image as HTMLImageElement).currentSrc,
  );
  await page.evaluate((keys) => (window as ControlledWindow).__readiness.hold(keys), [...HERO, "fonts"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(html).toHaveAttribute("data-intro-assets", "pending");
  await expect(html).toHaveAttribute("data-intro-fonts", "pending");
  await expect(html).toHaveAttribute("data-intro-phase", "lit");
  await sealed(page);
  await expect.poll(() => page.locator("#hero img").evaluateAll((images) => images.every((image) => {
    const img = image as HTMLImageElement;
    return img.currentSrc.includes("blacksmith-narrow-") && img.complete &&
      img.naturalWidth > 0 && img.naturalHeight > 0;
  }))).toBe(true);
  await page.clock.runFor(32);
  await expect.poll(() => counts(page)).toMatchObject({ "hero-dark": 2, "hero-lit": 2, mark: 2 });
  const after = await page.locator("#hero img.plate-lit").evaluate((image) => ({
    source: (image as HTMLImageElement).currentSrc,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  expect(after.source).not.toBe(before);
  expect(after.source).toContain("blacksmith-narrow-");
  expect(after.width).toBeGreaterThan(0);
  await at(page, 4100);
  await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
  await sealed(page);
  await ready(page);
  await expect(html).toHaveAttribute("data-intro-readiness", "ready");
  await expect(html).toHaveAttribute("data-intro-phase", "open");
});

test("turning reduced motion on during the gate releases the hold terminally", async ({ page }) => {
  await controlReadiness(page);
  await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
  await gateStarted(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(16);
  await terminal(page, "skipped");
  await release(page);
  await settled(page, [...HERO, "fonts"]);
  await at(page, 8000);
  await terminal(page, "skipped");
});

test("JavaScript-disabled forced ignition stays usable on first and repeat loads", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const repeat of [false, true]) {
      if (repeat) await page.reload();
      else await page.goto(`${BASE}/?ignite`);
      const html = page.locator("html");
      await expect(html).not.toHaveAttribute("data-intro", /./);
      await expect(html).not.toHaveAttribute("data-intro-phase", /./);
      await expect(html).not.toHaveAttribute("data-intro-readiness", /./);
      await expect(html).not.toHaveAttribute("data-intro-assets", /./);
      await expect(html).not.toHaveAttribute("data-intro-fonts", /./);
      await expect(html).not.toHaveAttribute("data-intro-hold", /.*/);
      await expect(html).not.toHaveAttribute("data-intro-fast", /.*/);
      await expect(page.locator(".ignition")).toBeHidden();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

for (const [shape, viewport] of [
  ["narrow", { width: 390, height: 844 }],
  ["wide", { width: 1280, height: 900 }],
] as const) {
  test(`${shape} warm-up decodes seven original low-priority pairs with only their selected requests`, async ({
    browser, baseURL,
  }) => {
    const page = await browser.newPage({ baseURL, viewport, deviceScaleFactor: 1 });
    try {
      await controlReadiness(page, { holdWarmup: true });
      const requests = new Map<string, number>();
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith(`${BASE}/art/`)) {
          requests.set(request.url(), (requests.get(request.url()) ?? 0) + 1);
        }
      });
      await page.goto(`${BASE}/?ignite`, { waitUntil: "domcontentloaded" });
      await gateStarted(page);
      const html = page.locator("html");
      const plates = await page.locator("[data-plate]").evaluateAll((plates) => plates
        .filter((plate) => !plate.closest("#hero"))
        .map((plate) => plate.getAttribute("data-plate")!));
      expect(plates).toHaveLength(7);
      expect(Object.keys(await counts(page)).filter((key) => key.startsWith("plate:"))).toEqual([]);
      await expect(html).not.toHaveAttribute("data-plate-warmup", /./);

      // A resolved dark layer alone cannot start warming. The original hero
      // image work, including the actual header mark, must first settle.
      await release(page, ["hero-dark"]);
      await settled(page, ["hero-dark"]);
      await page.clock.runFor(1);
      await expect(html).not.toHaveAttribute("data-plate-warmup", /./);
      await release(page, ["hero-lit"]);
      await settled(page, ["hero-lit"]);
      await page.clock.runFor(1);
      await expect(html).not.toHaveAttribute("data-plate-warmup", /./);
      await release(page, ["mark"]);
      await settled(page, HERO);
      await expect(html).toHaveAttribute("data-plate-warmup", "warming");

      for (let i = 0; i < plates.length; i += 1) {
        const id = plates[i];
        const dark: ControlKey = `plate:${id}:dark`;
        const lit: ControlKey = `plate:${id}:lit`;
        await page.clock.runFor(1); // explicit release of the queue's zero-delay yield
        await expect.poll(() => counts(page)).toMatchObject({ [dark]: 1, [lit]: 1 });
        const current = await counts(page);
        for (const later of plates.slice(i + 1)) {
          expect(current[`plate:${later}:dark`] ?? 0).toBe(0);
          expect(current[`plate:${later}:lit`] ?? 0).toBe(0);
        }
        const layers = page.locator(`[data-plate="${id}"] img`);
        await expect(layers).toHaveCount(2);
        expect(await layers.evaluateAll((images) => images.every((image) => {
          const img = image as HTMLImageElement;
          return img.isConnected && img.closest("picture") !== null && img.loading === "eager" &&
            img.fetchPriority === "low" && img.naturalWidth > 0 && img.naturalHeight > 0;
        }))).toBe(true);
        await release(page, [dark]);
        await settled(page, [dark]);
        await page.clock.runFor(1);
        await expect(html).toHaveAttribute("data-plate-warmup", "warming");
        if (i + 1 < plates.length) {
          const next = plates[i + 1];
          expect((await counts(page))[`plate:${next}:dark`] ?? 0).toBe(0);
        }
        await release(page, [lit]);
        await settled(page, [lit]);
      }
      await expect(html).toHaveAttribute("data-plate-warmup", "ready");
      // Warm ready certifies those pairs, not fonts or unrelated certificates.
      await expect(html).toHaveAttribute("data-intro-fonts", "pending");
      await expect(html).toHaveAttribute("data-intro-assets", "pending");
      await sealed(page);
      await ready(page);

      const selected = await page.locator("[data-plate]").evaluateAll((plates) => plates.map((plate) => ({
        id: plate.getAttribute("data-plate"),
        layers: Array.from(plate.querySelectorAll<HTMLImageElement>("img")).map((image) => ({
          source: image.currentSrc,
          width: image.naturalWidth,
          height: image.naturalHeight,
          candidates: Array.from(image.closest("picture")!.querySelectorAll("source"))
            .filter((source) => !source.media || matchMedia(source.media).matches)
            .flatMap((source) => source.srcset.split(",")
              .map((candidate) => new URL(candidate.trim().split(/\s+/)[0], location.href).href)),
        })),
      })));
      expect(selected).toHaveLength(8);
      const expectedRequests = new Set<string>();
      for (const plate of selected) {
        expect(plate.layers).toHaveLength(2);
        expect(plate.layers[0].source).toBe(plate.layers[1].source);
        for (const layer of plate.layers) {
          expect(layer.source).toBeTruthy();
          expect(layer.width).toBeGreaterThan(0);
          expect(layer.height).toBeGreaterThan(0);
          expect(layer.candidates).toContain(layer.source);
          expect(new URL(layer.source).pathname.startsWith(`${BASE}/art/`)).toBe(true);
          expect(requests.get(layer.source), `one request for ${layer.source}`).toBe(1);
          expectedRequests.add(layer.source);
        }
        if (plate.id === "blacksmith" || plate.id === "alchemist") {
          expect(plate.layers[0].source.includes(`${plate.id}-narrow-`)).toBe(shape === "narrow");
        }
      }
      // Exact equality catches unmatched crops, alternate formats, widest
      // <img src> fallbacks, speculative probes, and duplicate layer requests.
      expect([...requests.keys()].sort()).toEqual([...expectedRequests].sort());
      expect([...requests.values()]).toEqual(Array(8).fill(1));
      const calls = await counts(page);
      expect(calls).toMatchObject({ "hero-dark": 1, "hero-lit": 1, mark: 1 });
      for (const id of plates) {
        expect(calls[`plate:${id}:dark`]).toBe(1);
        expect(calls[`plate:${id}:lit`]).toBe(1);
      }
      const decodes = await page.evaluate(() => (window as ControlledWindow).__readiness.decodes);
      const artDecodes = decodes.filter(({ source }) =>
        new URL(source, page.url()).pathname.startsWith(`${BASE}/art/`));
      expect(artDecodes).toHaveLength(16);
      expect(artDecodes.every(({ original, connected }) => original && connected)).toBe(true);
      expect(decodes.filter(({ key }) => key === "mark")).toMatchObject([
        { original: true, connected: true },
      ]);
      expect(decodes.filter(({ source }) =>
        new URL(source, page.url()).pathname.startsWith(`${BASE}/certificates/`))).toEqual([]);
      expect(artDecodes.filter(({ key }) => key.startsWith("plate:"))).toHaveLength(14);
      expect(artDecodes.filter(({ key }) => key.startsWith("plate:"))
        .every(({ priority, loading }) => priority === "low" && loading === "eager")).toBe(true);
    } finally {
      await page.close();
    }
  });
}
