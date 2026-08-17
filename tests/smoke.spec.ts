import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("index renders with hero and evidence", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Rakshit Rameshbabu" }),
  ).toBeVisible();
  // Proof above the fold: the hero stat strip.
  await expect(page.getByText("45,432").first()).toBeVisible();
});

test("command palette opens with Ctrl+K or / and jumps to a section", async ({
  page,
}) => {
  await page.goto("/");
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

test("section anchors navigate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ledger", exact: true }).click();
  await expect(page).toHaveURL(/#ledger$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Skills" }),
  ).toBeVisible();
});

test("résumé link resolves", async ({ page, request }) => {
  await page.goto("/");
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
    const res = await page.goto(`/projects/${id}/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "back to the index" }).first(),
    ).toBeVisible();
  });
}

test("llms.txt and sitemap emit", async ({ request }) => {
  expect((await request.get("/llms.txt")).status()).toBe(200);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/favicon.ico")).status()).toBe(200);
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
  const res = await request.get("/favicon.ico");
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
  await page.goto("/");
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
  await page.goto("/", { waitUntil: "networkidle" });
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
  await page.goto("/");
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
    await page.goto(path);
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
