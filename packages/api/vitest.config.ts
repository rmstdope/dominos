import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each test file starts its own in-memory PGlite, which takes a moment to boot.
    hookTimeout: 30_000,
  },
});
