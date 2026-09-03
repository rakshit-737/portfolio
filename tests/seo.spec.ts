import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { caseStudies, certifications, featuredProjects, site } from "../src/content";

/**
 * P13 verification: per-page metadata, OG/Twitter cards, JSON-LD, sitemap/
 * robots correctness, and the GitHub Pages deep-link/404 contract. Most of
 * this already existed before P13 — these tests exist to keep it that way,
 * not to add new behavior.
 */

const OUT = join(process.cwd(), "out");
const caseIds = featuredProjects
  .filter((p) => caseStudies[p.id])
  .map((p) => p.id);

// The export's site.url is baked in at build time from NEXT_PUBLIC_SITE_URL
// (see src/content.ts); this suite runs against a build with that unset, so
// site.url is the documented GitHub Pages fallback — including its
// "/portfolio" sub-path. Every absolute-URL assertion below is anchored to
// this same `site.url` the page code itself used (not `new URL(...).origin`,
// which would silently drop that sub-path and desync from what the pages
// actually emit), so it stays correct under either build.
const origin = site.url;

function readPngDims(buf: Buffer): { width: number; height: number } {
  // PNG signature (8 bytes) + IHDR chunk: 4-byte length, "IHDR", then
  // 4-byte width, 4-byte height, both big-endian.
  expect(buf.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function jsonLdBlocks(page: import("@playwright/test").Page) {
  const raw = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
  return raw.map((r) => JSON.parse(r));
}

test.describe("per-page metadata", () => {
  const titles = new Map<string, string>();

  test("index: title, ≤155-char description, canonical", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    titles.set("/", title);

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeLessThanOrEqual(155);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toBe(`${origin}/`);
  });

  for (const id of caseIds) {
    test(`/projects/${id}/: title, ≤155-char description, canonical`, async ({
      page,
    }) => {
      await page.goto(`/projects/${id}/`);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      titles.set(id, title);

      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(description).toBeTruthy();
      expect(description!.length).toBeLessThanOrEqual(155);
      // The one-liner it's sourced from, verbatim — never a rewritten string.
      expect(description).toBe(
        featuredProjects.find((p) => p.id === id)!.oneLiner,
      );

      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(canonical).toBe(`${origin}/projects/${id}/`);
    });
  }

  test("every page's title is unique", async ({ page }) => {
    // Re-fetch fresh (test order across describe blocks isn't guaranteed)
    // rather than depend on the `titles` map above having been filled by
    // sibling tests.
    const collected: string[] = [];
    for (const path of ["/", ...caseIds.map((id) => `/projects/${id}/`)]) {
      await page.goto(path);
      collected.push(await page.title());
    }
    expect(new Set(collected).size).toBe(collected.length);
  });
});

test.describe("OG and Twitter cards", () => {
  test("index: /og.png is a real 1200x630 PNG, referenced absolutely", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const twImage = await page
      .locator('meta[name="twitter:image"]')
      .getAttribute("content");
    expect(ogImage).toBe(`${origin}/og.png`);
    expect(twImage).toBe(`${origin}/og.png`);

    const ogWidth = await page
      .locator('meta[property="og:image:width"]')
      .getAttribute("content");
    const ogHeight = await page
      .locator('meta[property="og:image:height"]')
      .getAttribute("content");
    expect(ogWidth).toBe("1200");
    expect(ogHeight).toBe("630");

    const res = await request.get("/og.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const dims = readPngDims(await res.body());
    expect(dims).toEqual({ width: 1200, height: 630 });
  });

  for (const id of caseIds) {
    test(`/projects/${id}/: og.png is a real 1200x630 PNG, referenced absolutely`, async ({
      page,
      request,
    }) => {
      await page.goto(`/projects/${id}/`);
      const ogImage = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(ogImage).toBe(`${origin}/projects/${id}/og.png`);

      const res = await request.get(`/projects/${id}/og.png`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
      const dims = readPngDims(await res.body());
      expect(dims).toEqual({ width: 1200, height: 630 });
    });
  }
});

test.describe("JSON-LD", () => {
  test("index carries a valid Person and a valid WebSite", async ({
    page,
  }) => {
    await page.goto("/");
    const blocks = await jsonLdBlocks(page);
    expect(blocks.length).toBeGreaterThanOrEqual(2);

    const person = blocks.find((b) => b["@type"] === "Person");
    expect(person).toBeTruthy();
    expect(person["@context"]).toBe("https://schema.org");
    expect(typeof person.name).toBe("string");
    expect(person.name.length).toBeGreaterThan(0);
    expect(person.url).toBe(origin);
    expect(person.email).toMatch(/^mailto:.+@.+/);

    const webSite = blocks.find((b) => b["@type"] === "WebSite");
    expect(webSite).toBeTruthy();
    expect(webSite["@context"]).toBe("https://schema.org");
    expect(typeof webSite.name).toBe("string");
    expect(webSite.url).toBe(`${origin}/`);
  });

  for (const id of caseIds) {
    test(`/projects/${id}/ carries a valid SoftwareSourceCode`, async ({
      page,
    }) => {
      await page.goto(`/projects/${id}/`);
      const blocks = await jsonLdBlocks(page);
      const code = blocks.find((b) => b["@type"] === "SoftwareSourceCode");
      expect(code).toBeTruthy();
      expect(code["@context"]).toBe("https://schema.org");
      expect(typeof code.name).toBe("string");
      expect(code.name.length).toBeGreaterThan(0);
      expect(code.url).toBe(`${origin}/projects/${id}/`);
      expect(code.author?.["@type"]).toBe("Person");
      expect(typeof code.author?.name).toBe("string");
      // Every featured project in this repo ships a repo URL — assert the
      // real shape rather than treating the field as always-optional.
      const project = featuredProjects.find((p) => p.id === id)!;
      if (project.repoUrl) {
        expect(code.codeRepository).toBe(project.repoUrl);
      }
    });
  }
});

test.describe("sitemap, robots, discoverability", () => {
  test("sitemap.xml lists every route once, as an absolute URL under site.url", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = [
      `${site.url}/`,
      ...caseIds.map((id) => `${site.url}/projects/${id}/`),
    ];
    expect(locs.sort()).toEqual(expected.sort());
    // Every entry resolves.
    for (const loc of locs) {
      const path = loc.slice(origin.length);
      const pageRes = await request.get(path);
      expect(pageRes.status(), `sitemap entry ${loc}`).toBe(200);
    }
  });

  test("robots.txt allows all and points at the real sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Allow:\s*\//);
    expect(body).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  });
});

test.describe("GitHub Pages export shape", () => {
  test("each case file is a real directory with its own index.html", () => {
    for (const id of caseIds) {
      const file = join(OUT, "projects", id, "index.html");
      expect(existsSync(file), file).toBe(true);
    }
  });

  test("a 404.html is emitted for GitHub Pages' unknown-route fallback", () => {
    const file = join(OUT, "404.html");
    expect(existsSync(file)).toBe(true);
    const body = readFileSync(file, "utf8");
    // The real not-found page, not an empty stub or a redirect shim — no
    // invented SPA fallback, just Next's own static 404.
    expect(body).toContain("Nothing measured");
  });

  test("an unknown path 404s at the server, not a soft 200", async ({
    request,
  }) => {
    const res = await request.get("/this-page-does-not-exist/");
    expect(res.status()).toBe(404);
  });
});

test.describe("the résumé file", () => {
  test("the renamed résumé and the original path both serve as a PDF", async ({
    request,
  }) => {
    for (const path of ["/rakshit-rameshbabu-resume.pdf", "/resume.pdf"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toBe("application/pdf");
    }
    // Byte-identical: this is a copy, never a second authored document.
    const [renamed, original] = await Promise.all([
      request.get("/rakshit-rameshbabu-resume.pdf").then((r) => r.body()),
      request.get("/resume.pdf").then((r) => r.body()),
    ]);
    expect(renamed.equals(original)).toBe(true);
  });

  test("the on-site résumé link points at the renamed file", async ({
    page,
  }) => {
    await page.goto("/");
    const href = await page
      .getByRole("link", { name: /résumé/i })
      .first()
      .getAttribute("href");
    expect(href).toMatch(/rakshit-rameshbabu-resume\.pdf$/);
  });
});

// F7 (final fix wave): cheap generated-asset drift coverage, on the same
// principle as the favicon's own ICO-parsing test (tests/smoke.spec.ts) —
// a 200 status alone doesn't prove a file is a real image, and neither
// does mere existsSync: `gen-certificate-thumb.mjs` is a manual, run-and-
// commit step (like `npm run art`), so it's entirely possible to add a
// `certifications[].image` entry and forget to run it, leaving the page
// falling back to the oversized full scan silently (`certificateThumb()`,
// src/app/page.tsx) with nothing in CI to notice. Driven directly from
// `certifications` so a future certificate is automatically covered with
// no second list to keep in sync — no new lockfile machinery, per the
// brief's "cheap version only".
test.describe("certificate scans and thumbnails", () => {
  const withImage = certifications.filter(
    (c): c is typeof c & { image: string } => Boolean(c.image),
  );

  for (const cert of withImage) {
    const stem = cert.image.replace(/\.[^./]+$/, "");
    const files = [
      { path: cert.image, label: "full-resolution scan" },
      { path: `${stem}-thumb.avif`, label: "AVIF thumbnail" },
      { path: `${stem}-thumb.webp`, label: "WebP thumbnail" },
    ];

    for (const { path, label } of files) {
      test(`${cert.title} — ${cert.reason} — ${label} (${path}) exists and decodes as a real image`, async ({
        request,
      }) => {
        const res = await request.get(path);
        expect(res.status(), path).toBe(200);

        const buf = await res.body();
        // sharp fully decodes the file rather than just checking a magic
        // number — a truncated or corrupt file fails here, not silently.
        const meta = await sharp(buf).metadata();
        expect(meta.width, `${path} width`).toBeGreaterThan(0);
        expect(meta.height, `${path} height`).toBeGreaterThan(0);
      });
    }
  }
});
