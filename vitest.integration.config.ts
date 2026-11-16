import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(".env");
} catch {
  // CI sets the variables directly.
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false, // every file shares one database
    // Code under test reads DATABASE_URL; point it at the test database.
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
  },
});
