import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "web",
            environment: "jsdom",
            // Staff type dates in local time; pin it so the times sent to the API are predictable.
            env: { TZ: "Europe/Stockholm" },
            globals: true,
            setupFiles: ["./src/test/setup.ts"],
            include: ["src/**/*.test.{ts,tsx}"],
          },
        },
        // Has its own config: Node instead of jsdom, and none of the React setup.
        "packages/api",
      ],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
        exclude: [
          "src/main.tsx",
          "src/test/**",
          "packages/*/src/test/**",
          "packages/api/src/main.ts",
          "packages/api/src/cli/**",
        ],
      },
    },
  }),
);
