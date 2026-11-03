import { defineConfig, devices } from "@playwright/test";

// Runs against the real stack (db + api with the synced data). Start the site first, or let
// webServer start `npm run start` after `npm run build`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // Each browser renders heavy pages on this one machine; more than 4 at once makes navigations slow and tests flaky.
  workers: 4,
  // Same reason: under that load a client navigation can take a few seconds. Site speed is measured separately.
  expect: { timeout: 10_000 },
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000" },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000/en",
    reuseExistingServer: true,
  },
});
