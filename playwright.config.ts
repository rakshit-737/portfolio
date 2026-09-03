import { defineConfig } from "@playwright/test";

/**
 * Smoke tests run against the static export in ./out — the same artifact
 * both deploys serve. `npm run build` must run first.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4573",
  },
  webServer: {
    // F3/F4: `serve` is a pinned devDependency now (package.json) — a bare
    // command name resolves it from `node_modules/.bin` (npm prepends that
    // to PATH for anything it spawns, this webServer command included), so
    // this always runs the exact pinned version rather than `npx` silently
    // fetching whatever "serve" happens to publish next.
    command: "serve out -l 4573",
    url: "http://localhost:4573",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
