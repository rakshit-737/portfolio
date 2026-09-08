import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// F2 (final fix wave): empty for the primary (root-shape/Vercel) gate —
// every literal path below is unchanged from before this constant existed.
// `playwright.subpath.config.ts`'s CI leg sets `NEXT_PUBLIC_BASE_PATH` to
// the same sub-path the build itself used (see that config's own comment
// on why `baseURL` there is the bare origin, not a `/basePath`-suffixed
// one), so every navigation below still resolves under the GitHub Pages
// shape without a second copy of this file.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

test("index renders with hero and evidence", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();
  // Proof above the fold: the hero stat strip.
  await expect(page.locator("#hero").getByText("9.07")).toBeVisible();
});

test("command palette opens with Ctrl+K or / and jumps to a section", async ({
  page,
}) => {
  await page.goto(`${BASE}/`);
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", {
    name: "Search the field",
  });
  await expect(input).toBeFocused();
  await input.fill("research");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#research$/);
  // Escape must close it again.
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Power user shortcut: '/' opens when not focused in an input
  await page.keyboard.press("/");
  await expect(input).toBeFocused();
  await input.fill("Hero");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#top$/);
});

// CollectUI Phase 2: case-file rows carry hairline metadata chips, and
// the list's clipped edges fade only while there is genuinely more list
// behind them (never a standing dim over text).
test("palette rows carry metadata chips and fade only a real clipped edge", async ({
  page,
}) => {
  await page.goto(`${BASE}/`);
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Search the field" });
  await input.fill("warden outcome");
  const row = page.locator('#palette-list [role="option"]').first();
  await expect(row).toBeVisible();
  // The act's own number and the project's first stack entry, both from
  // content.ts — and decoration, so the announced option ignores them.
  const chips = row.locator(".palette-chip");
  await expect(chips.first()).toHaveText(/^act \d\d$/);
  await expect(chips).toHaveCount(2);
  expect(
    await row.locator(".palette-chip").first().evaluate((el) =>
      el.closest("[aria-hidden='true']") !== null,
    ),
  ).toBe(true);

  // A short result set does not clip, so nothing is masked.
  const list = page.locator("#palette-list");
  await expect(list).not.toHaveAttribute("data-clip", /./);
  // The unfiltered list does clip at the bottom, and only there.
  await input.fill("");
  await expect(list).toHaveAttribute("data-clip", "bottom");
});

test("section anchors navigate", async ({ page }) => {
  // The rail's section links wait for 90rem (1440px) since the soundscape
  // toggle joined the rail — below that they live in the menu (the
  // brand.spec.ts width sweep gates that a path always exists). This test
  // exercises the rail links themselves, so it needs the wide rail.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: "Ledger", exact: true }).click();
  await expect(page).toHaveURL(/#ledger$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Skills" }),
  ).toBeVisible();
});

test("résumé link resolves", async ({ page, request }) => {
  await page.goto(`${BASE}/`);
  const href = await page
    .getByRole("link", { name: /résumé/i })
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.status()).toBe(200);
});

for (const id of ["warden", "scheduler", "plantpal"]) {
  test(`case file /projects/${id}/ serves and links back`, async ({
    page,
  }) => {
    const res = await page.goto(`${BASE}/projects/${id}/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "back to the index" }).first(),
    ).toBeVisible();
  });
}

test("llms.txt and sitemap emit", async ({ request }) => {
  expect((await request.get(`${BASE}/llms.txt`)).status()).toBe(200);
  expect((await request.get(`${BASE}/sitemap.xml`)).status()).toBe(200);
  expect((await request.get(`${BASE}/favicon.ico`)).status()).toBe(200);
});

test("favicon.ico is a genuine multi-resolution icon, not a stub", async ({
  request,
}) => {
  // A 200 alone doesn't prove the file is a real image — a 1-byte stub
  // serves 200 too, which is exactly how that regression shipped
  // unnoticed before. Parse the actual .ico container: an ICONDIR header,
  // one ICONDIRENTRY per frame, then (for a modern icon) a raw PNG per
  // frame — and confirm each declared frame really is a PNG of the
  // declared size, not just that bytes were returned.
  const res = await request.get(`${BASE}/favicon.ico`);
  const buf = await res.body();

  expect(buf.length).toBeGreaterThan(500);
  expect(buf.readUInt16LE(0)).toBe(0); // ICONDIR.reserved
  expect(buf.readUInt16LE(2)).toBe(1); // ICONDIR.type — 1 = icon

  const count = buf.readUInt16LE(4);
  expect(count).toBeGreaterThanOrEqual(2); // genuinely multi-resolution

  const sizes: number[] = [];
  const PNG_SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    const width = buf[off] === 0 ? 256 : buf[off];
    const height = buf[off + 1] === 0 ? 256 : buf[off + 1];
    const bytesInRes = buf.readUInt32LE(off + 8);
    const imageOffset = buf.readUInt32LE(off + 12);

    expect(width).toBe(height); // every frame here is square
    sizes.push(width);

    const frame = buf.subarray(imageOffset, imageOffset + bytesInRes);
    expect(frame.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    // PNG IHDR: 4-byte length, "IHDR", then 4-byte width, 4-byte height —
    // the frame's own declared pixel dimensions must match the ICO
    // directory entry's, not just exist.
    expect(frame.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(frame.readUInt32BE(16)).toBe(width);
    expect(frame.readUInt32BE(20)).toBe(height);
  }

  // The three sizes a real favicon needs across browser chrome/tabs/PWA
  // shortcuts.
  expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48]);
});

test("internal links on the index resolve", async ({ page, request }) => {
  await page.goto(`${BASE}/`);
  const hrefs = await page
    .locator('a[href^="/"]:not([href^="//"])')
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  const unique = [...new Set(hrefs)];
  for (const href of unique) {
    const res = await request.get(href);
    expect(res.status(), `broken internal link: ${href}`).toBe(200);
  }
});

test("no failed requests on the index (prefetch, assets)", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 450) {
      window.scrollTo(0, y);
      await new Promise((res) => setTimeout(res, 60));
    }
  });
  await page.waitForTimeout(800);
  expect(failures).toEqual([]);
});

test("card links navigate to the case file", async ({ page }) => {
  await page.goto(`${BASE}/`);
  // The warden act — the first of the three featured-project acts, and
  // where "Read the case file" first appears in document order — sits
  // below the fold. `#projects` is not an id anything in this design
  // renders (there's no single "projects" section; each project is its
  // own full-bleed act, `#warden`/`#scheduler`/`#plantpal`), so scroll to
  // the act itself rather than a selector that has never matched anything
  // since the Lamplight rewrite.
  await page.locator("#warden").scrollIntoViewIfNeeded();
  await page
    .getByRole("link", { name: "Read the case file" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/projects\/warden\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Warden/ }),
  ).toBeVisible();
});

for (const path of [
  "/",
  "/projects/warden/",
  "/projects/scheduler/",
  "/projects/plantpal/",
]) {
  test(`axe: no violations on ${path}`, async ({ page }) => {
    await page.goto(`${BASE}${path}`);
    // Let reveals settle so axe sees the final DOM.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo(0, 0);
    });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

// The two Phase 2 rails are server-rendered markup with plain anchors, so
// a visitor with no JavaScript gets a working index of the page — not an
// empty gutter. The lamp's own no-JS stance (fully lit) is covered in
// lamplight.spec.ts; this is the chrome beside it.
test("without JavaScript both rails still render, read the first entry, and link", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const acts = page.getByRole("navigation", { name: "Acts" });
  await expect(acts.locator("a")).toHaveCount(8);
  await expect(acts.locator("a[aria-current]")).toHaveAttribute("href", "#hero");

  const casePage = await ctx.newPage();
  await casePage.goto(`${BASE}/projects/warden/`);
  const sections = casePage.getByRole("navigation", { name: "Sections" });
  await expect(sections.locator("a")).toHaveCount(5);
  await expect(sections.locator("a[aria-current]")).toHaveAttribute("href", "#problem");
  // A plain anchor still navigates with the scripting gone.
  await sections.locator('a[href="#outcome"]').click();
  await expect(casePage).toHaveURL(/#outcome$/);
  await ctx.close();
});
