import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { MARK_PATH } from "../src/lib/mark";
import { CLOCK_PLACEHOLDER } from "../src/components/LiveClock";
import { site } from "../src/content";

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
