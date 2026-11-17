import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env");
} catch {
  // CI sets the variables directly.
}

const PORT = 3217; // unusual on purpose: common dev ports are often taken
// The app under test and tests/e2e/helpers.ts must use a test database, and not the one the integration tests empty before every test
// (E2E_DATABASE_URL), so the two suites can never wipe each other. CI runs them one after the other and may use one database for both.
// Workers re-evaluate this file with the already-switched environment, hence the marker.
if (!process.env.FG_E2E) {
  const testDb = process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? "";
  if (!testDb || testDb === process.env.DATABASE_URL) throw new Error("E2E_DATABASE_URL (or TEST_DATABASE_URL) must be set and differ from DATABASE_URL");
  process.env.DATABASE_URL = testDb;
  process.env.ADMIN_SECRET ??= "e2e-admin-secret";
  process.env.SESSION_SECRET ??= "e2e-session-secret-0123456789abcdefgh";
  process.env.FG_E2E = "1";
}

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1, // one shared database
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    // A page that needs no database, so a brand new e2e database (tables are created by globalSetup) does not stop the server being "ready".
    url: `http://localhost:${PORT}/robots.txt`,
    timeout: 300_000,
    reuseExistingServer: false,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
