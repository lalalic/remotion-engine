import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests can be slow — 5 min timeout per test
    testTimeout: 600_000,
    hookTimeout: 600_000,
    // Don't run tests in parallel — rendering is resource-intensive
    pool: "forks",
    fileParallelism: false,
    // Print detailed output
    reporters: ["verbose"],
    // Pass through environment
    env: {
      CI: "true",
    },
  },
});
