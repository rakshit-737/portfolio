import { defineConfig } from "@playwright/test";

/**
 * F2 (final fix wave): CI's root-shape job (`playwright.config.ts`) builds
 * and serves `out/` at the origin root — the Vercel deploy shape. GitHub
 * Pages, the fallback deploy, serves the same export under `/<repo>/`
 * instead (`deploy-pages.yml`'s "Compute Pages URLs" step), and nothing
 * before this config ever built or served that shape in CI — every
 * internal link, asset reference, and `withBase()` call could regress
 * under a sub-path and no gate would notice.
 *
 * Only `tests/smoke.spec.ts` runs against this config — see the CI job
 * ("sub-path shape") that builds with `NEXT_PUBLIC_BASE_PATH` set before
 * this config's webServer ever starts; `scripts/serve-subpath.mjs` mounts
 * that build under the same sub-path locally so the served URLs match
 * production exactly, rather than serving `out/` at the root the way the
 * primary config does.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "smoke.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Deliberately the bare origin, no `/basePath` suffix: Playwright
    // resolves a leading-slash navigation (`page.goto("/")`,
    // `request.get("/llms.txt")`) against a `baseURL` by REPLACING its
    // entire path (WHATWG URL semantics) — a `baseURL` that already
    // carried `/portfolio` would be silently discarded by every such call.
    // `tests/smoke.spec.ts` prefixes its own literal paths with `BASE`
    // (`NEXT_PUBLIC_BASE_PATH`) instead, so the full absolute path — origin
    // AND sub-path — comes from the call site every time.
    baseURL: "http://localhost:4576",
  },
  webServer: {
    command: "node scripts/serve-subpath.mjs",
    url: `http://localhost:4576${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
