import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { MARK_PATH } from "../src/lib/mark";
import { CLOCK_PLACEHOLDER } from "../src/components/LiveClock";
import { navSections, site } from "../src/content";

// Same convention as tests/smoke.spec.ts: empty for the root-shape gate,
// the sub-path for the GitHub Pages leg.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The brand surface: the seal monogram, the favicon it becomes, the live
 * clock beside the name, and the word-by-word statement reveal.
 */

test("the head links a real favicon, and it resolves", async ({ page, request }) => {
  // Before this existed the page shipped only an apple-touch-icon, so
  // browsers fell back to /favicon.ico at the origin root — a 404 under
  // the GitHub Pages sub-path, i.e. no favicon at all on the live site.
  await page.goto(`${BASE}/`);
  const icons = page.locator('link[rel="icon"]');
  expect(await icons.count()).toBeGreaterThanOrEqual(1);
  for (const href of await icons.evaluateAll((els) =>
    els.map((el) => (el as HTMLLinkElement).href),
  )) {
    // Absolute, at the deployed origin (`site.url`, sub-path included) —
    // the same rule the OG image URLs follow, so the sub-path survives.
    expect(href, "icon href is absolute at site.url").toMatch(
      new RegExp(`^${site.url.replace(/[.*+?^${}()|[\]\/]/g, "\$&")}/`),
    );
    // Fetch the same file from the server under test.
    const path = href.slice(site.url.length);
    const res = await request.get(`${BASE}${path}`);
    expect(res.status(), `${BASE}${path} resolves`).toBe(200);
  }
});

test("icon.svg carries the same monogram outline as src/lib/mark.ts", async () => {
  // icon.svg is a static file and cannot import the module, so it holds a
  // verbatim copy of the path — this is the drift guard.
  const svg = readFileSync("src/app/icon.svg", "utf8");
  expect(svg).toContain(`d="${MARK_PATH}"`);
});

test("the nav carries the monogram, decorative, inside the brand link", async ({ page }) => {
  await page.goto("/");
  const brand = page.getByRole("link", { name: "Rakshit Rameshbabu" }).first();
  await expect(brand).toBeVisible();
  const svg = brand.locator("svg");
  await expect(svg).toHaveCount(1);
  expect(await svg.getAttribute("aria-hidden")).toBe("true");
});

test("the clock beside the name shows Chennai time and ticks", async ({ browser }) => {
  // Wide enough that the nav has room for it alongside the section links.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/");
  const clock = page.locator("[data-clock]");
  await expect(clock).toBeVisible();
  const pattern = /^\d{2} [A-Za-z]{3} · \d{2}:\d{2}:\d{2} IST$/;
  await expect(clock).not.toHaveText(CLOCK_PLACEHOLDER);
  const first = (await clock.textContent()) ?? "";
  expect(first).toMatch(pattern);
  // A real clock: the reading changes within a couple of seconds.
  await expect.poll(async () => clock.textContent(), { timeout: 3_000 }).not.toBe(first);
  expect(await clock.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  await ctx.close();
});

// The rail must hold everything it shows at every width — and the clock
// must be on it from `md` up. At 1024px the seven section links alone
// overflowed the rail by 54px before they moved to `xl`; the clock
// (~150px with its gap) has to fit beside the name wherever it shows;
// and the soundscape toggle's 144px then overflowed the 1280px rail by
// 47px, which pushed the links out again, to `min-[90rem]` (1440) —
// this sweep's 1280/1366 rows are the widths that catch exactly that.
for (const width of [768, 1024, 1263, 1280, 1366, 1440]) {
  test(`at ${width}px the rail fits its content and carries the clock`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 700 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    await expect(page.locator("[data-clock]")).toBeVisible();
    const { scrollWidth, clientWidth } = await page
      .locator("header nav")
      .evaluate((nav) => ({ scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth }));
    expect(
      scrollWidth,
      `rail content ${scrollWidth}px overflows its ${clientWidth}px width`,
    ).toBeLessThanOrEqual(clientWidth);
    // A way to reach a section exists at every width: links or the menu.
    const links = await page.locator("header nav a[href='#about']:visible").count();
    const menu = await page.getByRole("button", { name: "Open menu" }).count();
    expect(links + menu, "no section links and no menu button").toBeGreaterThan(0);
    await ctx.close();
  });
}

// The act rail (CollectUI Phase 2): eight notches at the right edge from
// `lg` up, reading the nav's own scroll-spy state — no second observer.
test("the act rail marks the current act, is reachable, and is absent below lg", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const rail = page.getByRole("navigation", { name: "Acts" });
  const notches = rail.locator("a");
  await expect(notches).toHaveCount(8);
  // At the top of the page the first act is the current one.
  await expect(notches.first()).toHaveAttribute("aria-current", "location");
  // Every notch is a real target, not a 10px square.
  for (const box of await notches.all()) {
    const size = await box.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(24);
    expect(size!.height).toBeGreaterThanOrEqual(24);
  }
  // The spy moves it: jumping to a section marks that act instead.
  await page.locator("#ledger").scrollIntoViewIfNeeded();
  await expect
    .poll(async () => rail.locator("a[aria-current]").getAttribute("href"))
    .toBe("#ledger");
  await ctx.close();

  const narrow = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const small = await narrow.newPage();
  await small.goto(`${BASE}/`);
  await expect(
    small.getByRole("navigation", { name: "Acts" }),
  ).not.toBeVisible();
  await narrow.close();
});

test("below 768px the clock lives in the menu", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator("[data-clock]")).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).tap();
  const clock = page.locator("#mobile-menu [data-clock]");
  await expect(clock).toBeVisible();
  await expect(clock).toHaveText(/\d{2}:\d{2}:\d{2} IST$/);
  await ctx.close();
});

test("a statement resolves word by word once its act arrives, and reads whole", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lamp", "on");
  const about = page.locator("#about");
  const words = about.locator(".statement .word");
  expect(await words.count()).toBeGreaterThan(3);

  // The heading's accessible name is the whole line, spaces intact.
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "End to end, from written requirements to CI-tested deployments.",
    }),
  ).toHaveCount(1);

  // Later words carry later indices — the stagger is in the markup.
  const last = words.last();
  expect(await last.evaluate((el) => el.style.getPropertyValue("--i"))).toBe(
    String((await words.count()) - 1),
  );

  await about.scrollIntoViewIfNeeded();
  await expect(about).toHaveAttribute("data-seen", "");
  // Every word lands at full opacity once the beat has played.
  await expect.poll(
    async () =>
      words.evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).opacity === "1"),
      ),
    { timeout: 5_000 },
  ).toBe(true);
});

test("under reduced motion the words are simply present", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-lamp", "on");
  const hidden = await page
    .locator(".statement .word")
    .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== "1").length);
  expect(hidden).toBe(0);
  await ctx.close();
});

/**
 * The cartouche's press and arrow lead (CollectUI brief, item 1 — ref
 * @turaluix, @RalconStudio): `:active` is a transform, never a colour
 * swap — the inner chamber dips 1px and the wax square compresses once
 * (`seal-press`, globals.css) — and an external cartouche's lucide
 * arrow leads +2px,−2px on hover/focus and returns. Everything rests at
 * `none`, and reduced motion pins the whole device to rest — a state
 * transform survives zeroed durations, so "instant" is not enough.
 */

test("the cartouche rests unpressed — bone seal, no transform — and presses as a transform", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Read the Warden case file" });
  const chamber = cta.locator(".cartouche-label");
  const wax = cta.locator(".seal > span");

  // At rest — the pointer has not moved, so nothing here is hover: the
  // seal's wax square is bone (ember is hover/focus only, never rest)
  // and the label chamber carries no transform.
  expect(
    (await wax.evaluate((el) => getComputedStyle(el).backgroundColor)).replace(/\s/g, ""),
    // rgb(242, 237, 227) === --color-signal (bone).
  ).toBe("rgb(242,237,227)");
  expect(await chamber.evaluate((el) => getComputedStyle(el).transform)).toBe("none");

  // Pressed: the chamber dips exactly 1px and the wax square carries
  // the seal-press keyframe. The audit wave's interim `group-active`
  // colour swap is gone — hover's swap is the chamber's only swap.
  // The release below completes a real click on a real link — swallow
  // it, or the navigation races the released-state poll (it won on a
  // loaded machine, and the poll then queried a detached page).
  await page.evaluate(() =>
    addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true }),
  );
  await cta.hover();
  await page.mouse.down();
  expect(await chamber.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "matrix(1, 0, 0, 1, 0, 1)",
  );
  expect(await wax.evaluate((el) => getComputedStyle(el).animationName)).toBe("seal-press");
  await page.mouse.up();
  // Released: the press returns fully.
  await expect
    .poll(async () => chamber.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
});

test("an external cartouche's arrow leads on hover — and only the arrow", async ({ page }) => {
  await page.goto("/");
  const study = page.getByRole("link", { name: "View the study" });
  await study.scrollIntoViewIfNeeded();
  const arrow = study.locator("svg.lucide-arrow-up-right");
  await expect(arrow).toHaveCount(1);
  expect(await arrow.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  await study.hover();
  await expect
    .poll(async () => arrow.evaluate((el) => getComputedStyle(el).transform))
    .toBe("matrix(1, 0, 0, 1, 2, -2)");

  // The scoping cannot catch a non-arrow svg: the GitHub cartouche's
  // brand icon (icons.tsx, no lucide class) never moves on hover.
  // Scoped to the contact act with an exact name: a CI build reaches the
  // GitHub API, so `liveSegments` renders provenance anchors a local
  // build omits — one of them ("github.com/…") substring-matches a bare
  // { name: "GitHub" } and trips strict mode only on CI.
  const github = page
    .locator("#contact")
    .getByRole("link", { name: "GitHub", exact: true });
  await github.scrollIntoViewIfNeeded();
  await github.hover();
  expect(
    await github
      .locator("svg")
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
});

test("reduced motion pins the press and the arrow to rest in every state", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Read the Warden case file" });
  // The release completes a real click on a real link — swallow it so
  // the arrow assertions below still run against the index.
  await page.evaluate(() =>
    addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true }),
  );
  await cta.hover();
  await page.mouse.down();
  expect(
    await cta.locator(".cartouche-label").evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
  expect(
    await cta.locator(".seal > span").evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.mouse.up();

  const study = page.getByRole("link", { name: "View the study" });
  await study.scrollIntoViewIfNeeded();
  await study.hover();
  expect(
    await study
      .locator("svg.lucide-arrow-up-right")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
  await ctx.close();
});

/**
 * The carried nav highlight (CollectUI brief, item 3 — ref @JerryDizs,
 * @kail_designs, @SwamiMalode): at min-[90rem] the active link's
 * bg-signal block travels between links via the View Transitions API —
 * only the active link carries `view-transition-name: nav-active`
 * (`data-nav-active`, Nav.tsx), so the browser animates the group box
 * and nothing measures a link's position in JS. `aria-current` stays
 * the source of truth, and Nav.tsx never calls `startViewTransition`
 * under reduced motion or below the links' own breakpoint — the spy
 * below counts real calls, so "never" is measured, not inferred.
 */

function armViewTransitionSpy(page: import("@playwright/test").Page) {
  return page.addInitScript(() => {
    (window as unknown as { __vtCount: number }).__vtCount = 0;
    const raw = document.startViewTransition.bind(document);
    document.startViewTransition = ((
      cb?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      (window as unknown as { __vtCount: number }).__vtCount++;
      return raw(cb);
    }) as typeof document.startViewTransition;
  });
}

const vtCount = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __vtCount: number }).__vtCount);

test("the scroll-spy carries aria-current through every section — and the highlight travels", async ({
  browser,
}) => {
  // 1600px: past min-[90rem], so the section links are on the rail.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await armViewTransitionSpy(page);
  await page.goto(`${BASE}/`);
  for (const s of navSections) {
    await page.locator(`#${s.id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`header nav a[href="#${s.id}"]`)).toHaveAttribute(
      "aria-current",
      "location",
    );
  }
  // Exactly one link carries the travelling name at a time — the
  // decoration; the state asserted above is aria-current, never this.
  const carrier = page.locator("header nav a[data-nav-active]");
  await expect(carrier).toHaveCount(1);
  expect(
    await carrier.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("view-transition-name"),
    ),
  ).toBe("nav-active");
  // The travel is real: this Chromium supports the API, so walking all
  // seven sections started at least one transition (arrivals mid-flight
  // coalesce to plain swaps, so the count may be under 7 — never 0).
  expect(await vtCount(page)).toBeGreaterThan(0);
  // Scrolling home still resets the spy — the hero carries no link, so
  // every aria-current (and the travelling name with it) clears.
  await page.locator("#hero").scrollIntoViewIfNeeded();
  await expect(page.locator("header nav a[aria-current]")).toHaveCount(0);
  await expect(carrier).toHaveCount(0);
  await ctx.close();
});

test("under reduced motion the spy still walks every section and no view transition ever starts", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await armViewTransitionSpy(page);
  await page.goto(`${BASE}/`);
  for (const s of navSections) {
    await page.locator(`#${s.id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`header nav a[href="#${s.id}"]`)).toHaveAttribute(
      "aria-current",
      "location",
    );
  }
  expect(await vtCount(page)).toBe(0);
  await ctx.close();
});

test("below min-[90rem] the swap stays plain — no snapshot for a rail without links", async ({
  browser,
}) => {
  // 1280px sits under the links' breakpoint: the spy state still moves
  // (the act counter reads it), but no view transition ever starts.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await armViewTransitionSpy(page);
  await page.goto(`${BASE}/`);
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(page.locator("header nav")).toContainText("02/08");
  expect(await vtCount(page)).toBe(0);
  await ctx.close();
});

/**
 * The odometer (CollectUI brief, item 4 — ref @thecuvii, @ahmetloca):
 * the clock and the NN/08 act counter render every glyph in its own
 * inline-block span (Odometer.tsx — real text, no aria-hidden twin),
 * and only a changed glyph turns, one WAAPI animation per span with a
 * fill that releases. The lingering check is scoped to each
 * instrument's subtree, not document.getAnimations() whole: the sine's
 * own draw (`sine-draw`/`node-in`, fill `both`) stays relevant
 * page-wide forever by design, and the guard here is that the
 * *odometer* leaves nothing behind between ticks.
 */

test("the clock turns like an instrument — per-glyph spans, few wheels, none lingering", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const clock = page.locator("[data-clock]");
  await expect(clock).toBeVisible();
  await expect(clock).not.toHaveText(CLOCK_PLACEHOLDER);

  // The spans concatenate to exactly formatClock()'s shape — splitting
  // the reading never changed the text.
  const reading = (await clock.textContent()) ?? "";
  expect(reading).toMatch(/^\d{2} [A-Za-z]{3} · \d{2}:\d{2}:\d{2} IST$/);
  // One span per glyph, each its own inline-block wheel, and no
  // aria-hidden anywhere inside — the accessible name is the reading.
  const wheels = clock.locator(":scope > span > span");
  await expect(wheels).toHaveCount(reading.length);
  expect(await wheels.first().evaluate((el) => getComputedStyle(el).display)).toBe(
    "inline-block",
  );
  await expect(clock.locator("[aria-hidden]")).toHaveCount(0);

  // Watch ~2.6s (at least two ticks): some wheel turns, never more than
  // 3 at once, and after the window the subtree drains to zero within
  // one tick's ~820ms still stretch — finished turns must not persist.
  const report = await clock.evaluate(
    (el) =>
      new Promise<{ saw: boolean; max: number; drained: boolean }>((resolve) => {
        let saw = false;
        let max = 0;
        const t0 = performance.now();
        const sample = () => {
          const n = el.getAnimations({ subtree: true }).length;
          saw = saw || n > 0;
          max = Math.max(max, n);
          if (performance.now() - t0 < 2600) {
            requestAnimationFrame(sample);
            return;
          }
          const t1 = performance.now();
          const drain = () => {
            if (el.getAnimations({ subtree: true }).length === 0) {
              resolve({ saw, max, drained: true });
            } else if (performance.now() - t1 > 900) {
              resolve({ saw, max, drained: false });
            } else {
              requestAnimationFrame(drain);
            }
          };
          drain();
        };
        sample();
      }),
  );
  expect(report.saw, "a passing second turns at least one wheel").toBe(true);
  expect(report.max, "at most 3 wheels turn per tick").toBeLessThanOrEqual(3);
  expect(report.drained, "between ticks no animation persists").toBe(true);
  await ctx.close();
});

test("the act counter pads to two digits and tracks aria-current, wheel by wheel", async ({
  browser,
}) => {
  // 1600px: past min-[90rem], so the section links (the aria-current
  // carriers the counter must track) are on the rail beside it.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const counter = page.locator("[data-act-counter]");
  await expect(counter).toHaveText("01/08");
  // Five glyphs, five wheels. (The wrapper's aria-hidden is the
  // indicator's own pre-odometer state — the position it shows is
  // announced by aria-current on the matching link — not a text twin.)
  await expect(counter.locator(":scope > span > span")).toHaveCount(5);
  for (const [i, s] of navSections.entries()) {
    await page.locator(`#${s.id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`header nav a[href="#${s.id}"]`)).toHaveAttribute(
      "aria-current",
      "location",
    );
    // navSections[i] is act i+2 (`acts` opens with the hero) — always
    // two padded digits, tracking the same spy state as aria-current.
    await expect(counter).toHaveText(`${String(i + 2).padStart(2, "0")}/08`);
  }
  // The hero reset reads 01/08 again, exactly as before the odometer.
  await page.locator("#hero").scrollIntoViewIfNeeded();
  await expect(counter).toHaveText("01/08");
  await ctx.close();
});

test("under reduced motion the digits simply change — no odometer animation ever runs", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const clock = page.locator("[data-clock]");
  await expect(clock).not.toHaveText(CLOCK_PLACEHOLDER);
  const before = await clock.textContent();
  // Watch across at least two ticks: no Animation ever appears in the
  // clock's subtree — WAAPI sits outside the CSS reduced-motion block,
  // so Odometer.tsx checks matchMedia itself; this measures that.
  const saw = await clock.evaluate(
    (el) =>
      new Promise<boolean>((resolve) => {
        let saw = false;
        const t0 = performance.now();
        const sample = () => {
          if (el.getAnimations({ subtree: true }).length > 0) saw = true;
          if (performance.now() - t0 < 2200) requestAnimationFrame(sample);
          else resolve(saw);
        };
        sample();
      }),
  );
  expect(saw).toBe(false);
  // The swap is instant, not suppressed: the reading still ticked.
  expect(await clock.textContent()).not.toBe(before);
  // The act counter likewise: the state moves, nothing animates.
  await page.locator("#about").scrollIntoViewIfNeeded();
  const counter = page.locator("[data-act-counter]");
  await expect(counter).toHaveText("02/08");
  expect(
    await counter.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await ctx.close();
});
