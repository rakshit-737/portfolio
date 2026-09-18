import { defineConfig } from "@playwright/test";

/**
 * The production-headers run. vercel.json's Content-Security-Policy and
 * friends only exist on Vercel: `next dev` ignores vercel.json and the main
 * config's `serve out` sends none of them, so a policy that blocked an
 * inline hydration script, the cursor's injected <style> or the lamp's
 * inline custom properties would pass every other test and break only in
 * production. scripts/serve-with-headers.mjs serves ./out with the
 * committed vercel.json applied, and this config re-runs the three suites
 * that exercise hydration, the lamp and the sound engine under it, plus
 * tests/csp.spec.ts, which fails on any CSP violation event at all.
 * A real response header, not a <meta>: that is what Vercel sends, and a
 * meta policy would silently ignore frame-ancestors.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: ["smoke.spec.ts", "lamplight.spec.ts", "sound.spec.ts", "csp.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4577",
  },
  webServer: {
    command: "node scripts/serve-with-headers.mjs",
    url: "http://localhost:4577/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
