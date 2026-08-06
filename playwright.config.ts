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
    command: "npx serve out -l 4573",
    url: "http://localhost:4573",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
