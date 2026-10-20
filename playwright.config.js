import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run a real browser against a running app + database. See docs/TESTING.md.
//   E2E_BASE_URL     default http://localhost:3100
//   E2E_ADMIN_EMAIL  / E2E_ADMIN_PASSWORD  an existing administrator (the seed creates one)
// The tests only create uniquely named SYNTHETIC records and never touch real data.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 860 } } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next dev -p 3100", url: "http://localhost:3100/api/health", reuseExistingServer: true, timeout: 120_000 },
});
