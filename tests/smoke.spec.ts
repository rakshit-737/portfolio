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

test("command palette opens with Ctrl+K and jumps to a section", async ({
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
